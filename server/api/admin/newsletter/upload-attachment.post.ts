import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomBytes } from 'crypto'
import { requireAdmin } from '../../../utils/auth'
import { getTenantAdminId } from '../../../utils/tenant'

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]
const MAX_SIZE_BYTES = 5 * 1024 * 1024

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const adminId = getTenantAdminId(user)
    if (adminId == null) {
      throw createError({ statusCode: 403, message: 'No tenant context for upload' })
    }

    const formData = await readMultipartFormData(event)
    const file = formData?.[0]
    if (!file || !file.filename || !file.data) {
      throw createError({ statusCode: 400, message: 'No file uploaded' })
    }

    const fileType = file.type || 'application/octet-stream'
    if (!ALLOWED_TYPES.includes(fileType)) {
      throw createError({ statusCode: 400, message: 'File type not allowed' })
    }

    if (file.data.length > MAX_SIZE_BYTES) {
      throw createError({ statusCode: 400, message: 'File size exceeds 5MB limit' })
    }

    // Tenant-scoped directory + unguessable random component in the filename.
    // Files are still served from /public (so nodemailer can attach them by
    // path and so admins can preview them in the editor), but the URL can't
    // be guessed by enumerating timestamps, and the tenant segment lets us
    // audit/clean up per-tenant.
    const sanitizedFilename = file.filename.replace(/[^a-zA-Z0-9.\-_]/g, '_')
    const random = randomBytes(12).toString('hex')
    const filename = `${random}-${sanitizedFilename}`

    const tenantDir = String(adminId)
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'newsletter-attachments', tenantDir)
    await mkdir(uploadsDir, { recursive: true })

    const filepath = join(uploadsDir, filename)
    await writeFile(filepath, file.data)

    return {
      success: true,
      filename,
      originalName: file.filename,
      path: `/uploads/newsletter-attachments/${tenantDir}/${filename}`,
      type: fileType,
      size: file.data.length,
    }
  } catch (error: any) {
    console.error('Error uploading attachment:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error',
    })
  }
})
