import { createError, getCookie, setHeader, getQuery } from 'h3'
import { readFile, stat } from 'fs/promises'
import { PrismaClient } from '@prisma/client'
import {
  absolutePathForStorageKey,
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
  })
  if (!resource) {
    throw createError({ statusCode: 404, statusMessage: 'Resource not found' })
  }

  const cookieName = cookieNameForResourceSlug(slug)
  const token = getCookie(event, cookieName)
  if (!token || !verifyResourceAccessToken(token, slug, resource.id)) {
    throw createError({ statusCode: 403, statusMessage: 'Please submit the form to access this file' })
  }

  const absPath = absolutePathForStorageKey(resource.storageKey)
  let st
  try {
    st = await stat(absPath)
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'File not found' })
  }

  const query = getQuery(event)
  const forceDownload = query.download === '1' || query.download === 'true'

  const mime = resource.mimeType || 'application/octet-stream'
  setHeader(event, 'Content-Type', mime)
  setHeader(event, 'Cache-Control', 'private, no-store')
  // Allow same-origin PDF preview in <iframe> on /resources/r/[slug] (avoid global DENY on this response).
  setHeader(event, 'X-Frame-Options', 'SAMEORIGIN')

  const encoded = encodeURIComponent(resource.originalFileName || 'download')
  setHeader(
    event,
    'Content-Disposition',
    `${forceDownload ? 'attachment' : 'inline'}; filename="${encoded}"`
  )
  setHeader(event, 'Content-Length', st.size.toString())

  return readFile(absPath)
})
