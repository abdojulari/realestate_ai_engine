import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter } from '../../../utils/tenant'

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const tenantFilter = getTenantFilter(user)
    const formData = await readMultipartFormData(event)
    const file = formData?.[0]
    if (!file || !file.filename || !file.data) {
      throw createError({ statusCode: 400, message: 'No file uploaded' })
    }

    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const fileType = file.type || 'application/octet-stream'
    
    if (!allowedTypes.includes(fileType)) {
      throw createError({ statusCode: 400, message: 'File type not allowed' })
    }

    const maxSize = 5 * 1024 * 1024
    if (file.data.length > maxSize) {
      throw createError({ statusCode: 400, message: 'File size exceeds 5MB limit' })
    }

    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'newsletter-attachments')
    await mkdir(uploadsDir, { recursive: true })

    const timestamp = Date.now()
    const sanitizedFilename = file.filename.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filename = `${timestamp}-${sanitizedFilename}`
    const filepath = join(uploadsDir, filename)

    await writeFile(filepath, file.data)

    return {
      success: true,
      filename,
      originalName: file.filename,
      path: `/uploads/newsletter-attachments/${filename}`,
      type: fileType,
      size: file.data.length
    }
  } catch (error: any) {
    console.error('Error uploading attachment:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
