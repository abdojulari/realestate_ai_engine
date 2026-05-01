import { H3Event } from 'h3'
import path from 'path'
import fs from 'fs'
import { requireAdmin } from '../../../../utils/auth'
import { requireFeatureForUser, FEATURES } from '../../../../utils/license'
import { extractTextFromPdf } from '../../../../utils/pdf-text'
import { callLlm } from '../../../../utils/llm'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


interface LegalReviewResult {
  redFlags: string[]
  importantNotes: string[]
  importantDates: Array<{ label: string; date: string; context?: string }>
  legalSummary: string
  buyerImpact: string
  sellerImpact: string
}

// --------------- Pipeline tuning ---------------

// Bigger chunks = fewer LLM round-trips. 8k chars (~2k tokens) is well within
// every model's context window in our chain (Groq 8b: 128k; Cerebras 120b:
// 128k; OpenRouter llama 3.3 70b: 128k) and keeps each call fast.
const CHUNK_SIZE = 8000

// How many extract-phase calls we run in parallel. Stays under Groq's free
// tier 30 RPM ceiling at the steady state (2 in flight × ~5s/call ≈ 24 RPM)
// and lets us fall through to Cerebras/OpenRouter on 429 without re-tuning.
const EXTRACT_CONCURRENCY = 2

// Hard ceiling on the whole pipeline. Most reverse proxies (nginx, CF, ALB)
// time out somewhere between 60s and 100s, returning an opaque 504. We'd
// rather respond ourselves with a clear, debuggable 408 below that line.
const PIPELINE_BUDGET_MS = 80_000

/** Split text into chunks of roughly `size` characters, breaking at sentence boundaries when possible. */
function chunkText(text: string, size: number): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    let end = Math.min(start + size, text.length)
    // Try to break at a sentence boundary (. or \n) within last 20% of chunk
    if (end < text.length) {
      const lookback = Math.max(start, end - Math.floor(size * 0.2))
      const slice = text.slice(lookback, end)
      const lastPeriod = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('.\n'), slice.lastIndexOf('\n\n'))
      if (lastPeriod > 0) end = lookback + lastPeriod + 1
    }
    chunks.push(text.slice(start, end))
    start = end
  }
  return chunks
}

function safeParse(raw: string): any {
  // Strip markdown fences if present
  let cleaned = raw.trim()
  if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '').trim()
  try { return JSON.parse(cleaned) } catch { return null }
}

// --------------- Date normalization ---------------

/** Pre-process extracted text to normalize fragmented AREA form dates.
 *  e.g. "November\t28\t25" → "November 28, 2025"
 *       "3\tp\tNovember\t03\t25" → "3 p.m. on November 03, 2025"
 */
function normalizeDatesInText(text: string): string {
  const months = '(?:January|February|March|April|May|June|July|August|September|October|November|December)'

  // Pattern: Month\tDD\tYY  →  Month DD, 20YY
  text = text.replace(
    new RegExp(`(${months})\\s*\\t\\s*(\\d{1,2})\\s*\\t\\s*(\\d{2})(?!\\d)`, 'g'),
    (_m, month, day, yr) => `${month} ${day}, 20${yr}`
  )

  // Pattern: DD\tMonth\tYY  →  Month DD, 20YY  (less common but possible)
  text = text.replace(
    new RegExp(`(?<![\\d])(\\d{1,2})\\s*\\t\\s*(${months})\\s*\\t\\s*(\\d{2})(?!\\d)`, 'g'),
    (_m, day, month, yr) => `${month} ${day}, 20${yr}`
  )

  // Pattern: N\tp\t → N p.m. (time fragments before dates)
  text = text.replace(
    /(\d{1,2})\s*\t\s*p(?:\.?m\.?)?\s*(?:\t|\s*on\s*)/gi,
    (_m, hour) => `${hour} p.m. on `
  )

  // Pattern: N\ta\t → N a.m. (time fragments)
  text = text.replace(
    /(\d{1,2})\s*\t\s*a(?:\.?m\.?)?\s*(?:\t|\s*on\s*)/gi,
    (_m, hour) => `${hour} a.m. on `
  )

  return text
}

// --------------- Chunked legal review ---------------

const EXTRACT_SYSTEM = `You are a legal assistant extracting key information from a section of a Canadian real estate contract.
Respond with valid JSON only — no markdown, no explanation. Use this structure:
{
  "redFlags": ["concerning clauses or terms"],
  "importantNotes": ["key things to note"],
  "importantDates": [{"label": "description", "date": "YYYY-MM-DD", "context": "brief context"}]
}

CRITICAL DATE PARSING RULES:
- This is an Alberta (AREA) real estate form. Dates appear as tab-separated fragments, e.g. "November\\t28\\t25" means November 28, 2025.
- The form pre-prints "20" before a blank for the year, so a two-digit number like "25" at the end of a date means the year 2025 (i.e. prefix with "20").
- Times may appear as separate tokens like "9\\tp" meaning 9 p.m., often on a line before or after the date tokens.
- Common patterns: "Month\\tDD\\tYY", "DD\\tMonth\\tYY", or "Month DD, 20YY". Always output full ISO dates as YYYY-MM-DD.
- Look for dates near keywords like "Completion Day", "Condition Day", "deposit", "signed and dated", "on or before".
- If the year is truly absent, assume the year that makes sense for the transaction context. Do NOT default to the current calendar year if a two-digit year is provided — always interpret it as 20XX.
If a field has nothing relevant in this section, return an empty array.`

const SUMMARIZE_SYSTEM = `You are a legal assistant writing a final legal review of a Canadian real estate contract.
You will receive consolidated extracted facts (red flags, notes, dates) from the full document.
Respond with valid JSON only — no markdown. Use this exact structure:
{
  "redFlags": ["consolidated list — deduplicate and keep the most important"],
  "importantNotes": ["consolidated list — deduplicate"],
  "importantDates": [{"label": "description", "date": "YYYY-MM-DD", "context": "brief"}],
  "legalSummary": "2-4 paragraph plain-English summary of the contract.",
  "buyerImpact": "What matters most for the buyer and potential risks.",
  "sellerImpact": "What matters most for the seller and potential risks."
}`

/**
 * Concurrency-limited parallel map. Keeps at most `limit` promises in flight
 * at once. Preserves input order in the output array.
 */
async function pMapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const idx = cursor++
      if (idx >= items.length) return
      results[idx] = await fn(items[idx]!, idx)
    }
  })
  await Promise.all(workers)
  return results
}

async function runComplianceReview(
  documentText: string,
  partyRepresenting: 'buyer' | 'seller' | null,
): Promise<LegalReviewResult> {
  const startedAt = Date.now()
  const remainingMs = () => PIPELINE_BUDGET_MS - (Date.now() - startedAt)
  const checkBudget = (where: string) => {
    if (remainingMs() <= 0) {
      // `where` is logged for our debugging, NOT included in the user-visible
      // statusMessage — the client just needs an actionable, plain-English msg.
      console.warn(`[compliance-review] Budget exceeded at: ${where}`)
      throw createError({
        statusCode: 408,
        statusMessage:
          'This contract is unusually large and is taking too long to review. Try splitting it into shorter PDFs and uploading each section separately.',
      })
    }
  }

  const partyHint = partyRepresenting
    ? ` The user represents the ${partyRepresenting}.`
    : ''

  // Normalize fragmented AREA form dates before chunking so the LLM sees
  // recognisable date strings rather than tab-separated fragments.
  const normalizedText = normalizeDatesInText(documentText)
  const chunks = chunkText(normalizedText, CHUNK_SIZE)
  console.log(
    `[compliance-review] Document: ${documentText.length} chars → normalized ${normalizedText.length} chars → ${chunks.length} chunk(s)`,
  )

  const allRedFlags: string[] = []
  const allNotes: string[] = []
  const allDates: Array<{ label: string; date: string; context?: string }> = []

  // Phase 1 — extract facts from each chunk in parallel (concurrency-capped).
  // We tolerate per-chunk parse failures so one bad chunk doesn't sink the
  // whole review; the final summary call still gets the rest.
  await pMapLimit(chunks, EXTRACT_CONCURRENCY, async (chunk, i) => {
    checkBudget(`extract chunk ${i + 1}/${chunks.length}`)
    try {
      const raw = await callLlm({
        phase: 'extract',
        system: EXTRACT_SYSTEM,
        user: `Section ${i + 1} of ${chunks.length}:\n\n${chunk}`,
      })
      const parsed = safeParse(raw)
      if (parsed) {
        if (Array.isArray(parsed.redFlags)) allRedFlags.push(...parsed.redFlags)
        if (Array.isArray(parsed.importantNotes)) allNotes.push(...parsed.importantNotes)
        if (Array.isArray(parsed.importantDates)) allDates.push(...parsed.importantDates)
      }
    } catch (e: any) {
      // Don't fail the whole review on a single bad chunk — log it and move on.
      // Final summary will still produce something useful from the surviving
      // chunks. Hard auth/config errors (4xx) bubble up via callLlm itself,
      // which throws non-retryable errors immediately.
      console.warn(`[compliance-review] Chunk ${i + 1} extract failed:`, e?.statusMessage || e?.message || e)
    }
  })

  checkBudget('between phases')

  // Phase 2 — final consolidation + summary. One call, smarter model preferred.
  const factsPayload = JSON.stringify({
    redFlags: allRedFlags,
    importantNotes: allNotes,
    importantDates: allDates,
  })

  const raw = await callLlm({
    phase: 'summarize',
    system: SUMMARIZE_SYSTEM + partyHint,
    user: `Here are the extracted facts from the full contract (${chunks.length} sections):\n\n${factsPayload}`,
  })

  const result = safeParse(raw)
  if (!result) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Compliance review could not parse the AI response. Please try again.',
    })
  }

  console.log(`[compliance-review] Done in ${Date.now() - startedAt}ms`)

  return {
    redFlags: Array.isArray(result.redFlags) ? result.redFlags : allRedFlags,
    importantNotes: Array.isArray(result.importantNotes) ? result.importantNotes : allNotes,
    importantDates: Array.isArray(result.importantDates) ? result.importantDates : allDates,
    legalSummary: typeof result.legalSummary === 'string' ? result.legalSummary : '',
    buyerImpact: typeof result.buyerImpact === 'string' ? result.buyerImpact : '',
    sellerImpact: typeof result.sellerImpact === 'string' ? result.sellerImpact : '',
  }
}

export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAdmin(event)
  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, role: true, subscriptionTier: true, adminId: true },
  })
  if (!fullUser) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  await requireFeatureForUser(FEATURES.DOCUMENTS_LEGAL_REVIEW, fullUser, event)

  const id = parseInt(event.context.params?.id || '0')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid document ID' })
  }

  const body = await readBody(event).catch(() => ({}))
  const partyRepresenting = (body.partyRepresenting as 'buyer' | 'seller') || null
  const extractedText = typeof body.extractedText === 'string' ? body.extractedText.trim() : null

  const document = await prisma.document.findFirst({
    where: { id, userId: user.id },
  })

  if (!document) {
    throw createError({ statusCode: 404, statusMessage: 'Document not found' })
  }

  let text: string
  if (extractedText && extractedText.length >= 50) {
    // Use client-provided OCR/extracted text – slim payload, works for scanned docs
    text = extractedText
  } else {
    const ext = (document.type || '').toLowerCase()
    if (ext !== 'pdf') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Compliance review is only supported for PDF documents. Please convert to PDF first.',
      })
    }

    const absolutePath = path.join(process.cwd(), 'public', document.filePath)
    if (!fs.existsSync(absolutePath)) {
      throw createError({ statusCode: 404, statusMessage: 'Document file not found on server' })
    }

    const buffer = fs.readFileSync(absolutePath)
    text = await extractTextFromPdf(buffer)
    if (!text || text.length < 50) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Could not extract enough text from the PDF. The file may be scanned or image-only; run OCR in the editor and try again.',
      })
    }
  }

  const result = await runComplianceReview(text, partyRepresenting)

  // Persist to DB if the DocumentLegalReview table exists (migration may not have run yet)
  let savedReview: any = null
  try {
    savedReview = await (prisma as any).documentLegalReview.upsert({
      where: { documentId: id },
      create: {
        documentId: id,
        redFlags: result.redFlags,
        importantNotes: result.importantNotes,
        importantDates: result.importantDates,
        legalSummary: result.legalSummary,
        buyerImpact: result.buyerImpact,
        sellerImpact: result.sellerImpact,
        partyRepresenting,
      },
      update: {
        redFlags: result.redFlags,
        importantNotes: result.importantNotes,
        importantDates: result.importantDates,
        legalSummary: result.legalSummary,
        buyerImpact: result.buyerImpact,
        sellerImpact: result.sellerImpact,
        partyRepresenting,
        reviewedAt: new Date(),
      },
    })
  } catch (e) {
    console.warn('[legal-review] Could not persist review to DB (migration may be pending):', (e as Error).message)
  }

  return {
    success: true,
    review: {
      id: savedReview?.id || 0,
      redFlags: result.redFlags,
      importantNotes: result.importantNotes,
      importantDates: result.importantDates,
      legalSummary: result.legalSummary,
      buyerImpact: result.buyerImpact,
      sellerImpact: result.sellerImpact,
      partyRepresenting,
      reviewedAt: savedReview?.reviewedAt || new Date(),
    },
  }
})
