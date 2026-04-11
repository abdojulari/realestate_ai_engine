import { createError, readMultipartFormData } from 'h3'
import crypto from 'crypto'
import { requireAdmin } from '../../../utils/auth'
import { getAdminIdForCreate } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'
import {
  isAllowedMarketingResourceMime,
  mimeFromFilename,
  newStorageKey,
  writeMarketingResourceFile,
} from '../../../utils/marketingResourceStorage'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma
const MAX_BYTES = 25 * 1024 * 1024

/** Multipart text fields rarely set `type` to the string "text" (often undefined or text/plain). */
function fieldText(parts: any[], name: string): string {
  const p = parts.find(
    (x) => x.name === name && x.data?.length && !x.filename
  )
  if (!p?.data) return ''
  return p.data.toString('utf8').trim()
}

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const adminId = getAdminIdForCreate(user)

  const parts = await readMultipartFormData(event)
  if (!parts?.length) {
    throw createError({ statusCode: 400, statusMessage: 'Multipart body required' })
  }

  const title = fieldText(parts, 'title')
  if (!title) {
    throw createError({ statusCode: 400, statusMessage: 'Title is required' })
  }

  const description = fieldText(parts, 'description') || null
  const thankYouMessage =
    fieldText(parts, 'thankYouMessage') || 'Thank you! Your download is ready below.'
  const publishedRaw = fieldText(parts, 'published').toLowerCase()
  const published = publishedRaw === 'true' || publishedRaw === '1' || publishedRaw === 'on'

  const file = parts.find((x) => x.name === 'file' && x.filename && x.data)
  if (!file?.data) {
    throw createError({ statusCode: 400, statusMessage: 'A PDF or image file is required' })
  }

  const mime = mimeFromFilename(file.filename, (file.type || '').toLowerCase())
  if (!isAllowedMarketingResourceMime(mime)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only PDF, JPG, and PNG files are allowed',
    })
  }

  if (file.data.length > MAX_BYTES) {
    throw createError({ statusCode: 400, statusMessage: 'File must be 25MB or smaller' })
  }

  const storageKey = newStorageKey(mime)
  await writeMarketingResourceFile(storageKey, file.data)

  const publicSlug = crypto.randomBytes(12).toString('base64url')

  const resource = await prisma.marketingResource.create({
    data: {
      adminId,
      publicSlug,
      title,
      description,
      storageKey,
      originalFileName: file.filename || 'resource',
      mimeType: mime,
      fileSize: file.data.length,
      published,
      thankYouMessage,
    },
  })

  return resource
})
