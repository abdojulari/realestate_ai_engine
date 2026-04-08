/**
 * Verdocs webhook — configure this URL in the Verdocs dashboard.
 * Platform events use envelope_* / recipient_* names (e.g. envelope_completed, recipient_submitted).
 */
import { readBody } from 'h3'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const payload = body as Record<string, unknown>

  const rawId =
    (payload.envelope_id as string) ||
    (payload.envelopeId as string) ||
    (payload.document_id as string) ||
    (payload.documentId as string) ||
    (payload as any)?.data?.envelope_id ||
    (payload as any)?.data?.document_id ||
    (payload as any)?.data?.id

  const docId = rawId != null && rawId !== '' ? String(rawId) : ''

  const eventType = (payload.event as string) || (payload.type as string) || 'unknown'

  if (docId) {
    const documents = await prisma.document.findMany({
      where: {
        OR: [
          { metadata: { path: ['verdocs', 'envelopeId'], equals: docId } },
          { metadata: { path: ['verdocs', 'documentId'], equals: docId } },
        ],
      },
      select: { id: true, metadata: true, status: true },
    })

    for (const d of documents) {
      const meta = (d.metadata as Record<string, unknown>) || {}
      const verdocs = { ...((meta.verdocs as Record<string, unknown>) || {}) }
      verdocs.lastWebhookAt = new Date().toISOString()
      verdocs.lastEvent = eventType

      let status = d.status
      if (/envelope_completed|completed|fully_signed|executed/i.test(eventType)) {
        status = 'signed'
        verdocs.status = 'completed'
      } else if (/recipient_submitted|recipient_signed|signed/i.test(eventType) && status !== 'signed') {
        verdocs.status = 'partially_signed'
      } else if (/viewed|opened|recipient_opened/i.test(eventType)) {
        verdocs.status = verdocs.status || 'viewed'
      }

      await prisma.document.update({
        where: { id: d.id },
        data: {
          metadata: { ...meta, verdocs },
          ...(status !== d.status ? { status, isSigned: status === 'signed' } : {}),
        },
      })
    }
  }

  return { received: true }
})
