import { createError } from 'h3'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma
export default defineEventHandler(async (event) => {
  const slug = event.context.params?.slug
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'Missing form slug' })

  const form = await prisma.leadForm.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      description: true,
      fields: true,
      disclaimerText: true,
      privacyText: true,
      thankYouMessage: true,
      brandColor: true,
      status: true,
      admin: {
        select: {
          tenantSiteSettings: {
            select: { logoUrl: true, businessName: true },
          },
        },
      },
    },
  })

  if (!form || form.status !== 'active') {
    throw createError({ statusCode: 404, statusMessage: 'Form not found or inactive' })
  }

  const settings = (form.admin as any)?.tenantSiteSettings || {}

  return {
    id: form.id,
    title: form.title,
    description: form.description,
    fields: form.fields,
    disclaimerText: form.disclaimerText,
    privacyText: form.privacyText,
    thankYouMessage: form.thankYouMessage,
    brandColor: form.brandColor,
    logoUrl: settings.logoUrl || '/images/logos/deelbot.png',
    businessName: settings.businessName || 'DeelBot',
  }
})
