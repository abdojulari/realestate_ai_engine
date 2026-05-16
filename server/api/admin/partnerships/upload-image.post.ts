import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { requireAdmin } from '../../../utils/auth'
import { getTenantAdminId } from '../../../utils/tenant'

const MAX_BYTES = 8 * 1024 * 1024 // 8MB — profile / storefront photos
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

function fail(statusCode: number, code: string, message: string) {
  return createError({
    statusCode,
    statusMessage: message,
    data: { code, message, maxBytes: MAX_BYTES },
  })
}

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantId = getTenantAdminId(user)
  if (tenantId == null) {
    throw createError({ statusCode: 403, statusMessage: 'Tenant scope missing' })
  }

  let formData
  try {
    formData = await readMultipartFormData(event)
  } catch (err: unknown) {
    console.error('[partnerships/upload-image] multipart parse failed:', err)
    throw fail(
      413,
      'PAYLOAD_TOO_LARGE',
      `Image too large. Maximum size is ${Math.round(MAX_BYTES / (1024 * 1024))}MB.`,
    )
  }

  if (!formData?.length) {
    throw fail(400, 'NO_FILE', 'No file was attached.')
  }

  const file = formData.find((f) => f.name === 'image' || f.name === 'file')
  if (!file?.data) {
    throw fail(400, 'NO_FILE', 'No image file found.')
  }

  if (!ALLOWED_TYPES.includes(file.type || '')) {
    throw fail(
      415,
      'INVALID_TYPE',
      `Unsupported format${file.type ? ` (${file.type})` : ''}. Use JPEG, PNG, GIF, or WebP.`,
    )
  }

  if (file.data.length > MAX_BYTES) {
    const sizeMb = (file.data.length / (1024 * 1024)).toFixed(1)
    throw fail(413, 'PAYLOAD_TOO_LARGE', `Image is ${sizeMb}MB. Maximum is ${Math.round(MAX_BYTES / (1024 * 1024))}MB.`)
  }

  try {
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'partnerships')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const ext = (file.filename?.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 10)
    const filename = `t${tenantId}-${timestamp}-${randomStr}.${ext}`

    await writeFile(join(uploadDir, filename), file.data)

    return {
      success: true,
      url: `/uploads/partnerships/${filename}`,
      filename,
      bytes: file.data.length,
    }
  } catch (err: unknown) {
    console.error('[partnerships/upload-image] write failed:', err)
    throw fail(500, 'WRITE_FAILED', 'Could not save image.')
  }
})
