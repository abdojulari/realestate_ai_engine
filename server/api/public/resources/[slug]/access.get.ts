import { createError, getCookie } from 'h3'
import { PrismaClient } from '@prisma/client'
import {
  cookieNameForResourceSlug,
  verifyResourceAccessToken,
} from '../../../../utils/marketingResourceStorage'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default defineEventHandler(async (event) => {
  const slug = event.context.params?.slug
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'Missing slug' })

  const resource = await prisma.marketingResource.findFirst({
    where: { publicSlug: slug, published: true },
    select: { id: true },
  })
  if (!resource) {
    throw createError({ statusCode: 404, statusMessage: 'Resource not found' })
  }

  const token = getCookie(event, cookieNameForResourceSlug(slug))
  const unlocked = Boolean(token && verifyResourceAccessToken(token, slug, resource.id))

  return { unlocked }
})
