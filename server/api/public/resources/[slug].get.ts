import { createError } from 'h3'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default defineEventHandler(async (event) => {
  const slug = event.context.params?.slug
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'Missing slug' })

  const resource = await prisma.marketingResource.findFirst({
    where: { publicSlug: slug, published: true },
    select: {
      id: true,
      title: true,
      description: true,
      publicSlug: true,
      thankYouMessage: true,
      mimeType: true,
      originalFileName: true,
      admin: {
        select: {
          tenantSiteSettings: {
            select: {
              logoUrl: true,
              businessName: true,
              primaryColor: true,
            },
          },
        },
      },
    },
  })

  if (!resource) {
    throw createError({ statusCode: 404, statusMessage: 'Resource not found' })
  }

  const settings = resource.admin?.tenantSiteSettings

  return {
    id: resource.id,
    title: resource.title,
    description: resource.description,
    publicSlug: resource.publicSlug,
    thankYouMessage: resource.thankYouMessage,
    mimeType: resource.mimeType,
    originalFileName: resource.originalFileName,
    logoUrl: settings?.logoUrl || '/images/logos/deelbot.png',
    businessName: settings?.businessName || 'DeelBot',
    brandColor: settings?.primaryColor || '#1976D2',
  }
})
