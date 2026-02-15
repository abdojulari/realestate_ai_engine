import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  try {
    await requireAdmin(event)
    const formData = await readMultipartFormData(event)
    const file = formData?.find(f => f.name === 'file') || formData?.[0]
    if (!file || !file.filename || !file.data) {
      throw createError({ statusCode: 400, message: 'No file uploaded' })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const fileType = file.type || 'application/octet-stream'
    if (!allowedTypes.includes(fileType)) {
      throw createError({ statusCode: 400, message: 'Only image files (JPG, PNG, GIF, WEBP) are allowed' })
    }

    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.data.length > maxSize) {
      throw createError({ statusCode: 400, message: 'File size exceeds 10MB limit' })
    }

    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'properties')
    await mkdir(uploadsDir, { recursive: true })

    const timestamp = Date.now()
    const sanitizedFilename = file.filename.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filename = `${timestamp}-${sanitizedFilename}`
    const filepath = join(uploadsDir, filename)

    await writeFile(filepath, file.data)

    return {
      success: true,
      url: `/uploads/properties/${filename}`,
      filename,
      originalName: file.filename,
      mimeType: fileType,
      size: file.data.length,
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Upload failed',
    })
  }
})
