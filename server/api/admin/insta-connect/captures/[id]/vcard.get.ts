import { defineEventHandler, getRouterParam, createError, setHeader } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../../utils/auth'
import { requireTenantAccess } from '../../../../../utils/tenant'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

/**
 * Stream a vCard 3.0 file for a captured client so the admin can save them
 * to their phone contacts directly from the lead-generation tab.
 *
 * Tenant-scoped: only the admin that owns the capture (or a super_admin
 * within the same tenant) can fetch it.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const id = parseInt(String(getRouterParam(event, 'id') || '0'), 10)
  if (!id || Number.isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid capture id' })
  }

  const capture = await prisma.instaConnectCapture.findUnique({
    where: { id },
    select: {
      adminId: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      company: true,
      interest: true,
      message: true,
    },
  })
  if (!capture) {
    throw createError({ statusCode: 404, statusMessage: 'Capture not found' })
  }

  requireTenantAccess(user as any, capture.adminId)

  const escape = (s: string | null | undefined) =>
    String(s || '')
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')

  const lines: string[] = ['BEGIN:VCARD', 'VERSION:3.0']
  lines.push(`N:${escape(capture.lastName)};${escape(capture.firstName)};;;`)
  lines.push(`FN:${escape(`${capture.firstName} ${capture.lastName}`.trim())}`)
  if (capture.company) lines.push(`ORG:${escape(capture.company)}`)
  if (capture.phone) lines.push(`TEL;TYPE=CELL,VOICE:${escape(capture.phone)}`)
  if (capture.email) lines.push(`EMAIL;TYPE=INTERNET:${escape(capture.email)}`)
  // Capture extra context as a NOTE so it's visible in the contact card.
  const noteParts = [
    capture.interest ? `Interest: ${capture.interest}` : null,
    capture.message ? `Message: ${capture.message}` : null,
    'Source: InstaConnect',
  ].filter(Boolean)
  if (noteParts.length) lines.push(`NOTE:${escape(noteParts.join(' | '))}`)
  lines.push('END:VCARD')

  const body = lines.join('\r\n') + '\r\n'
  const safeName = `${capture.firstName}-${capture.lastName}`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+$/, '') || 'contact'

  setHeader(event, 'content-type', 'text/vcard; charset=utf-8')
  setHeader(event, 'content-disposition', `attachment; filename="${safeName}.vcf"`)
  setHeader(event, 'cache-control', 'no-store')
  return body
})
