import { H3Event } from 'h3'
import path from 'path'
import fs from 'fs'
import { requireAdmin } from '../../../../utils/auth'
import { requireFeatureForUser, FEATURES } from '../../../../utils/license'
import { extractTextFromPdf } from '../../../../utils/pdf-text'
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

// --------------- Groq helpers ---------------

const CHUNK_SIZE = 4000  // chars per chunk — stays well under Groq body limit
const MODEL = 'llama-3.1-8b-instant'

function getGroqConfig() {
  const config = useRuntimeConfig()
  const groqApiKey = (config.groqApiKey as string) || process.env.GROQ_API_KEY || ''
  const groqApiUrl = (config.groqApiUrl as string) || process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1'
  if (!groqApiKey) {
    throw createError({ statusCode: 500, statusMessage: 'GROQ_API_KEY is not configured.' })
  }
  return { groqApiKey, groqApiUrl: String(groqApiUrl).replace(/\/$/, '') }
}

/** Single Groq chat completion with retry on 429. */
async function groqChat(
  apiKey: string,
  apiUrl: string,
  system: string,
  user: string,
  retries = 3
): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await $fetch<{ choices?: Array<{ message?: { content?: string } }> }>(
        `${apiUrl}/chat/completions`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: { model: MODEL, temperature: 0.2, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] },
        }
      )
      return res.choices?.[0]?.message?.content?.trim() || '{}'
    } catch (e: any) {
      const status = e?.status || e?.statusCode || 0
      if (status === 429 && attempt < retries) {
        const wait = 2000 * (attempt + 1) // 2s, 4s, 6s backoff
        console.log(`[legal-review] Groq 429 — waiting ${wait}ms before retry ${attempt + 1}/${retries}`)
        await new Promise(r => setTimeout(r, wait))
        continue
      }
      throw e
    }
  }
  return '{}'
}

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

async function runGroqLegalReview(
  documentText: string,
  partyRepresenting: 'buyer' | 'seller' | null
): Promise<LegalReviewResult> {
  const { groqApiKey, groqApiUrl } = getGroqConfig()

  const partyHint = partyRepresenting
    ? ` The user represents the ${partyRepresenting}.`
    : ''

  // Normalize fragmented AREA form dates before chunking
  const normalizedText = normalizeDatesInText(documentText)
  const chunks = chunkText(normalizedText, CHUNK_SIZE)
  console.log(`[legal-review] Document: ${documentText.length} chars → normalized ${normalizedText.length} chars → ${chunks.length} chunk(s)`)

  // Phase 1 — extract facts from each chunk (sequential to avoid rate limits)
  const allRedFlags: string[] = []
  const allNotes: string[] = []
  const allDates: Array<{ label: string; date: string; context?: string }> = []

  for (let i = 0; i < chunks.length; i++) {
    const raw = await groqChat(
      groqApiKey,
      groqApiUrl,
      EXTRACT_SYSTEM,
      `Section ${i + 1} of ${chunks.length}:\n\n${chunks[i]}`
    )
    const parsed = safeParse(raw)
    if (parsed) {
      if (Array.isArray(parsed.redFlags)) allRedFlags.push(...parsed.redFlags)
      if (Array.isArray(parsed.importantNotes)) allNotes.push(...parsed.importantNotes)
      if (Array.isArray(parsed.importantDates)) allDates.push(...parsed.importantDates)
    }
    // Longer pause between chunks to respect Groq rate limits
    if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 2000))
  }

  // Phase 2 — final consolidation + summary
  const factsPayload = JSON.stringify({
    redFlags: allRedFlags,
    importantNotes: allNotes,
    importantDates: allDates,
  })

  const raw = await groqChat(
    groqApiKey,
    groqApiUrl,
    SUMMARIZE_SYSTEM + partyHint,
    `Here are the extracted facts from the full contract (${chunks.length} sections):\n\n${factsPayload}`
  )

  const result = safeParse(raw)
  if (!result) {
    throw createError({ statusCode: 500, statusMessage: 'Compliance review could not parse the AI response. Please try again.' })
  }

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

  const result = await runGroqLegalReview(text, partyRepresenting)

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
