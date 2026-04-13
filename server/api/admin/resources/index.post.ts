import { createError } from 'h3'
import crypto from 'crypto'
import formidable from 'formidable'
import fs from 'fs/promises'
import path from 'path'
import { requireAdmin } from '../../../utils/auth'
import { getAdminIdForCreate } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'
import {
  isAllowedMarketingResourceMime,
  mimeFromFilename,
  MARKETING_RESOURCE_DIR,
  ensureMarketingResourceDir,
  newStorageKey,
} from '../../../utils/marketingResourceStorage'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

const MAX_BYTES = 25 * 1024 * 1024

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const adminId = getAdminIdForCreate(user)

  await ensureMarketingResourceDir()

  const form = formidable({
    uploadDir: MARKETING_RESOURCE_DIR,
    keepExtensions: true,
    maxFileSize: MAX_BYTES,
    filename: (_name, ext) => {
      return `${crypto.randomUUID()}${ext}`
    },
  })

  let fields: formidable.Fields
  let files: formidable.Files
  try {
    ;[fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(event.node.req, (err, f, fi) => {
        if (err) reject(err)
        else resolve([f, fi])
      })
    })
  } catch (e: any) {
    console.error('[resources] formidable parse failed:', e.message || e)
    const msg = String(e.message || '')
    if (msg.includes('maxFileSize')) {
      throw createError({ statusCode: 413, statusMessage: 'File must be 25 MB or smaller' })
    }
    throw createError({ statusCode: 400, statusMessage: `Upload failed: ${msg || 'parse error'}` })
  }

  const title = String(
    Array.isArray(fields.title) ? fields.title[0] : fields.title || ''
  ).trim()
  if (!title) {
    throw createError({ statusCode: 400, statusMessage: 'Title is required' })
  }

  const description =
    String(Array.isArray(fields.description) ? fields.description[0] : fields.description || '').trim() || null
  const thankYouMessage =
    String(Array.isArray(fields.thankYouMessage) ? fields.thankYouMessage[0] : fields.thankYouMessage || '').trim() ||
    'Thank you! Your download is ready below.'
  const publishedRaw = String(
    Array.isArray(fields.published) ? fields.published[0] : fields.published || ''
  ).toLowerCase()
  const published = publishedRaw === 'true' || publishedRaw === '1' || publishedRaw === 'on'

  const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file
  if (!uploadedFile) {
    throw createError({ statusCode: 400, statusMessage: 'A PDF or image file is required' })
  }

  const mime = mimeFromFilename(uploadedFile.originalFilename || '', (uploadedFile.mimetype || '').toLowerCase())
  if (!isAllowedMarketingResourceMime(mime)) {
    await fs.unlink(uploadedFile.filepath).catch(() => {})
    throw createError({
      statusCode: 400,
      statusMessage: 'Only PDF, JPG, and PNG files are allowed',
    })
  }

  const storageKey = newStorageKey(mime)
  const destPath = path.join(MARKETING_RESOURCE_DIR, storageKey)
  try {
    await fs.rename(uploadedFile.filepath, destPath)
  } catch {
    await fs.copyFile(uploadedFile.filepath, destPath)
    await fs.unlink(uploadedFile.filepath).catch(() => {})
  }

  const publicSlug = crypto.randomBytes(12).toString('base64url')

  try {
    const resource = await prisma.marketingResource.create({
      data: {
        adminId,
        publicSlug,
        title,
        description,
        storageKey,
        originalFileName: uploadedFile.originalFilename || 'resource',
        mimeType: mime,
        fileSize: uploadedFile.size || 0,
        published,
        thankYouMessage,
      },
    })

    return resource
  } catch (e: any) {
    console.error('[resources] prisma.marketingResource.create failed:', e.message || e)
    await fs.unlink(destPath).catch(() => {})
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to save resource: ${e.message || 'database error'}`,
    })
  }
})
