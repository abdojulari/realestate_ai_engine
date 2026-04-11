import { readBody, createError } from 'h3'
import fs from 'fs/promises'
import path from 'path'
import { createEnvelope, DEFAULT_FIELD_HEIGHTS, DEFAULT_FIELD_WIDTHS } from '@verdocs/js-sdk'
import { requireAdmin } from '../../../../../utils/auth'
import { PrismaClient } from '@prisma/client'
import {
  buildVerdocsDirectFields,
  buildVerdocsManualEnvelopeFields,
  enrichEnvelopeSigningLinks,
  extractSigningPayload,
  formatVerdocsAxiosError,
  getVerdocsEndpoint,
  isVerdocsConfigured,
  isVerdocsPdfParseError,
  splitSignerName,
  type VerdocsFieldPlacementMode,
  type VerdocsManualFieldInput,
  type VerdocsSignerInput,
} from '../../../../../utils/verdocs'
import { normalizePdfBufferForVerdocs } from '../../../../../utils/pdfNormalize'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma
function absoluteDocPath(filePath: string): string {
  const rel = filePath.replace(/^\//, '')
  return path.join(process.cwd(), 'public', rel)
}

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const id = Number(event.context.params?.id)
  if (!Number.isFinite(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid document id' })
  }

  if (!isVerdocsConfigured()) {
    throw createError({
      statusCode: 503,
      statusMessage:
        'Verdocs is not configured. Set VERDOCS_CLIENT_ID and VERDOCS_CLIENT_SECRET (and optionally VERDOCS_API_BASE).',
    })
  }

  const body = await readBody(event)
  const placementRaw = String(body?.fieldPlacement || '')
  const placement: VerdocsFieldPlacementMode =
    placementRaw === 'signer_places'
      ? 'signer_places'
      : placementRaw === 'on_document'
        ? 'on_document'
        : 'fixed_first_page'
  const includeInitial = body?.includeInitial !== false
  const includeDateSigned = body?.includeDateSigned !== false
  const includePrefilledNameEmail =
    body?.includePrefilledNameEmail === true && placement === 'fixed_first_page'

  const signersRaw = body?.signers as VerdocsSignerInput[] | undefined
  if (!Array.isArray(signersRaw) || signersRaw.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'At least one signer (name + email) is required' })
  }

  const signers: VerdocsSignerInput[] = signersRaw.map((s) => ({
    name: String(s.name || '').trim(),
    email: String(s.email || '').trim().toLowerCase(),
    phone: s.phone ? String(s.phone).trim() : undefined,
  }))

  for (const s of signers) {
    if (!s.name || !s.email) {
      throw createError({ statusCode: 400, statusMessage: 'Each signer needs a name and email' })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) {
      throw createError({ statusCode: 400, statusMessage: `Invalid email: ${s.email}` })
    }
  }

  const document = await prisma.document.findFirst({
    where: { id, userId: user.id },
  })
  if (!document) {
    throw createError({ statusCode: 404, statusMessage: 'Document not found' })
  }
  if (document.type !== 'pdf') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Remote signing via Verdocs is only available for PDF files.',
    })
  }

  const abs = absoluteDocPath(document.filePath)
  let buf: Buffer
  try {
    buf = await fs.readFile(abs)
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Document file missing on server' })
  }

  const docTitle = document.originalName || document.name || 'Document'

  const senderName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email

  const recipients = signers.map((s, i) => {
    const { first_name, last_name } = splitSignerName(s.name)
    return {
      type: 'signer' as const,
      role_name: `Signer_${i + 1}`,
      first_name,
      last_name,
      email: s.email,
      ...(s.phone ? { phone: s.phone } : {}),
      sequence: i + 1,
      order: i + 1,
      delegator: false,
    }
  })

  const baseY = 640
  const rowGap = 112

  const manualTypes = new Set(['signature', 'initial', 'timestamp'])

  let fields: Array<Record<string, unknown>> = []

  if (placement === 'on_document') {
    const raw = body?.manualFields
    if (!Array.isArray(raw) || raw.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Click “Place on PDF” fields on the document (at least one signature per signer), then try again.',
      })
    }

    const manual: VerdocsManualFieldInput[] = []
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue
      const signerIndex = Number((item as any).signerIndex)
      const page = Number((item as any).page)
      const x = Number((item as any).x)
      const y = Number((item as any).y)
      const type = String((item as any).type || '')
      if (
        !Number.isInteger(signerIndex) ||
        signerIndex < 0 ||
        signerIndex >= signers.length ||
        !Number.isInteger(page) ||
        page < 1 ||
        page > 500 ||
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        !manualTypes.has(type)
      ) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid manual field entry (signer, page, type, or coordinates).',
        })
      }
      manual.push({
        signerIndex,
        type: type as VerdocsManualFieldInput['type'],
        page,
        x,
        y,
      })
    }

    if (manual.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'No valid manual fields were sent.' })
    }

    const sigBySigner = new Set(manual.filter((m) => m.type === 'signature').map((m) => m.signerIndex))
    for (let i = 0; i < signers.length; i++) {
      if (!sigBySigner.has(i)) {
        throw createError({
          statusCode: 400,
          statusMessage: `Each signer needs at least one Signature field on the PDF (missing for signer ${i + 1}).`,
        })
      }
    }

    fields = [...buildVerdocsManualEnvelopeFields(manual)]
  } else {
    fields = [
      ...buildVerdocsDirectFields(signers.length, {
        placement,
        includeInitial,
        includeDateSigned,
      }),
    ]
  }

  if (includePrefilledNameEmail) {
    for (let i = 0; i < signers.length; i++) {
      const role = `Signer_${i + 1}`
      const s = signers[i]!
      const y = baseY - i * rowGap + 36
      fields.push({
        document_id: 0,
        name: `name_${role}`,
        role_name: role,
        type: 'textbox',
        page: 1,
        x: 392,
        y,
        width: DEFAULT_FIELD_WIDTHS.textbox,
        height: DEFAULT_FIELD_HEIGHTS.textbox,
        required: false,
        readonly: true,
        label: 'Name',
        default: s.name,
      })
      fields.push({
        document_id: 0,
        name: `email_${role}`,
        role_name: role,
        type: 'textbox',
        page: 1,
        x: 392,
        y: y - 34,
        width: DEFAULT_FIELD_WIDTHS.textbox,
        height: DEFAULT_FIELD_HEIGHTS.textbox,
        required: false,
        readonly: true,
        label: 'Email',
        default: s.email,
      })
    }
  }

  let envelope
  let endpoint
  try {
    endpoint = await getVerdocsEndpoint()
  } catch (e: unknown) {
    console.error('[Verdocs] authenticate failed:', e)
    throw createError({
      statusCode: 502,
      statusMessage: formatVerdocsAxiosError(e),
    })
  }

  const envelopePayload = (dataBase64: string) => ({
    name: docTitle,
    sender_name: senderName,
    sender_email: user.email,
    initial_reminder: 0,
    followup_reminders: 0,
    data: { sourceDocumentId: document.id },
    recipients,
    documents: [
      {
        data: dataBase64,
        name: docTitle.replace(/\.pdf$/i, '') || 'document',
        mime: 'application/pdf' as const,
      },
    ],
    fields,
  })

  try {
    // Prefer original bytes so signers see full content. Verdocs-only rewrite runs if they reject the parser.
    envelope = await createEnvelope(endpoint, envelopePayload(buf.toString('base64')))
  } catch (e: unknown) {
    if (!isVerdocsPdfParseError(e)) {
      console.error('[Verdocs] createEnvelope failed:', (e as any)?.response?.data || e)
      throw createError({
        statusCode: 502,
        statusMessage: formatVerdocsAxiosError(e),
      })
    }
    console.warn('[Verdocs] Raw PDF rejected by parser; retrying with rewritten PDF (save-first, preserves visuals)')
    let pdfBytes: Buffer
    try {
      pdfBytes = await normalizePdfBufferForVerdocs(buf)
    } catch (normErr: unknown) {
      const msg = normErr instanceof Error ? normErr.message : String(normErr)
      console.error('[Verdocs] PDF rewrite failed:', msg)
      throw createError({
        statusCode: 400,
        statusMessage:
          'This PDF could not be prepared for e-signing (invalid, encrypted, or unsupported). Try exporting it again as PDF from your editor or use Print to PDF, then re-upload.',
      })
    }
    try {
      envelope = await createEnvelope(endpoint, envelopePayload(pdfBytes.toString('base64')))
    } catch (e2: unknown) {
      console.error('[Verdocs] createEnvelope failed after rewrite:', (e2 as any)?.response?.data || e2)
      throw createError({
        statusCode: 502,
        statusMessage: formatVerdocsAxiosError(e2),
      })
    }
  }

  let merged
  try {
    merged = await enrichEnvelopeSigningLinks(endpoint, envelope)
  } catch (e: unknown) {
    console.error('[Verdocs] enrichEnvelopeSigningLinks failed:', e)
    merged = extractSigningPayload(envelope)
  }
  const envelopeId = merged.envelopeId || merged.verdocsDocumentId || envelope.id

  const prevMeta = (document.metadata as Record<string, unknown> | null) || {}
  const verdocsStored: Record<string, unknown> = {
    envelopeId: String(envelopeId),
    documentId: String(envelopeId),
    fieldPlacement: placement,
    includeInitial,
    includeDateSigned,
    includePrefilledNameEmail,
    status: 'sent',
    sentAt: new Date().toISOString(),
    signers: signers.map((s) => ({ name: s.name, email: s.email, phone: s.phone || null })),
    signingUrl: merged.signingUrl ?? null,
    embeddedUrl: merged.embeddedUrl ?? null,
    signerLinks: merged.signerLinks || [],
  }
  if (placement === 'on_document') {
    verdocsStored.manualFieldCount = fields.length
  }

  await prisma.document.update({
    where: { id: document.id },
    data: {
      status: document.status === 'draft' ? 'pending' : document.status,
      metadata: {
        ...prevMeta,
        verdocs: verdocsStored,
      },
    },
  })

  return {
    success: true,
    verdocsDocumentId: envelopeId,
    envelopeId,
    signingUrl: merged.signingUrl,
    embeddedUrl: merged.embeddedUrl,
    signerLinks: merged.signerLinks,
  }
})
