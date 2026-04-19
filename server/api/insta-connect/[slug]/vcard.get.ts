import { defineEventHandler, getRouterParam, createError, setHeader } from 'h3'
import { PrismaClient } from '@prisma/client'
import { parseBranding } from '../../../utils/instaConnect'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

/**
 * Stream a vCard 3.0 file so visitors can save the agent to their phone contacts.
 * Browsers/iOS Safari handle text/vcard natively.
 */
export default defineEventHandler(async (event) => {
  const slug = (getRouterParam(event, 'slug') || '').trim().toLowerCase()
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing slug' })
  }

  const user = await prisma.user.findFirst({
    where: { instaConnectSlug: slug, instaConnectEnabled: true },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      adminId: true,
      id: true,
      bio: true,
      instaConnectBranding: true,
    },
  })

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'InstaConnect card not found' })
  }

  const tenantAdminId = user.role === 'user' ? user.adminId : user.id
  const tenant = tenantAdminId
    ? await prisma.tenantSettings.findUnique({
        where: { adminId: tenantAdminId },
        select: { businessName: true, brokerageName: true, address: true, city: true, province: true, postalCode: true },
      })
    : null

  const branding = parseBranding(user.instaConnectBranding)
  const company = branding.company || tenant?.brokerageName || tenant?.businessName || ''

  const escape = (s: string | null | undefined) =>
    String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

  const lines: string[] = ['BEGIN:VCARD', 'VERSION:3.0']
  lines.push(`N:${escape(user.lastName)};${escape(user.firstName)};;;`)
  lines.push(`FN:${escape(`${user.firstName || ''} ${user.lastName || ''}`.trim())}`)
  if (company) lines.push(`ORG:${escape(company)}`)
  if (user.bio) lines.push(`TITLE:${escape(branding.headline || user.bio)}`)
  if (user.phone) lines.push(`TEL;TYPE=CELL,VOICE:${escape(user.phone)}`)
  if (user.email) lines.push(`EMAIL;TYPE=INTERNET:${escape(user.email)}`)

  const addressParts = [tenant?.address, tenant?.city, tenant?.province, tenant?.postalCode].filter(Boolean)
  if (addressParts.length) {
    lines.push(`ADR;TYPE=WORK:;;${addressParts.map(escape).join(';')}`)
  }

  lines.push('END:VCARD')

  const body = lines.join('\r\n') + '\r\n'
  const filename = `${(user.firstName || 'contact').toLowerCase()}-${(user.lastName || '').toLowerCase()}.vcf`.replace(
    /-+$/,
    '',
  )

  setHeader(event, 'content-type', 'text/vcard; charset=utf-8')
  setHeader(event, 'content-disposition', `attachment; filename="${filename}"`)
  setHeader(event, 'cache-control', 'no-store')
  return body
})
