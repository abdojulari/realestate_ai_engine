import { defineEventHandler, readMultipartFormData } from 'h3'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { requireAdmin } from '../../../utils/auth'

/**
 * Upload Blog Image
 * POST /api/admin/blog/upload-image
 *
 * Handles image uploads for blog posts (cover images, inline images).
 * Requires admin authentication.
 *
 * Limits & errors are intentionally returned with `data.code` so the UI can
 * surface human-readable feedback (e.g. "your image is too large") instead of
 * a generic "failed to upload".
 */

const MAX_BYTES = 15 * 1024 * 1024 // 15MB — matches the most common phone-camera output
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

function fail(statusCode: number, code: string, message: string) {
  return createError({
    statusCode,
    statusMessage: message,
    data: { code, message, maxBytes: MAX_BYTES },
  })
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  let formData
  try {
    formData = await readMultipartFormData(event)
  } catch (err: any) {
    // h3 throws here when the request body exceeds nitro.bodyLimit
    console.error('[Blog Upload] Multipart parse failed:', err?.message || err)
    throw fail(
      413,
      'PAYLOAD_TOO_LARGE',
      `The image is too large to upload. Maximum size is ${Math.round(MAX_BYTES / (1024 * 1024))}MB.`,
    )
  }

  if (!formData || formData.length === 0) {
    throw fail(400, 'NO_FILE', 'No file was attached to the request.')
  }

  const file = formData.find(f => f.name === 'image' || f.name === 'file')
  if (!file || !file.data) {
    throw fail(400, 'NO_FILE', 'No image file was found in the upload.')
  }

  if (!ALLOWED_TYPES.includes(file.type || '')) {
    throw fail(
      415,
      'INVALID_TYPE',
      `Unsupported image format${file.type ? ` (${file.type})` : ''}. Use JPEG, PNG, GIF, or WebP.`,
    )
  }

  if (file.data.length > MAX_BYTES) {
    const sizeMb = (file.data.length / (1024 * 1024)).toFixed(1)
    const maxMb = Math.round(MAX_BYTES / (1024 * 1024))
    throw fail(
      413,
      'PAYLOAD_TOO_LARGE',
      `Image is ${sizeMb}MB. Maximum allowed is ${maxMb}MB — please compress or resize before uploading.`,
    )
  }

  try {
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'blog')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const ext = (file.filename?.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const filename = `blog-${timestamp}-${randomStr}.${ext}`

    const filePath = join(uploadDir, filename)
    await writeFile(filePath, file.data)

    return {
      success: true,
      url: `/uploads/blog/${filename}`,
      filename,
      bytes: file.data.length,
    }
  } catch (err: any) {
    console.error('[Blog Upload] Write failed:', err)
    throw fail(500, 'WRITE_FAILED', 'Could not save the uploaded image. Please try again.')
  }
})
