import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  try {
    await requireAdmin(event)
    const formData = await readMultipartFormData(event)
    const file = formData?.[0]
    if (!file || !file.filename || !file.data) {
      throw createError({ statusCode: 400, message: 'No file uploaded' })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    const fileType = file.type || 'application/octet-stream'
    if (!allowedTypes.includes(fileType)) {
      throw createError({ statusCode: 400, message: 'Only image files are allowed' })
    }

    const maxSize = 10 * 1024 * 1024 // 10MB for high-quality property photos
    if (file.data.length > maxSize) {
      throw createError({ statusCode: 400, message: 'File size exceeds 10MB limit' })
    }

    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'listing-templates')
    await mkdir(uploadsDir, { recursive: true })

    const timestamp = Date.now()
    const sanitizedFilename = file.filename.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filename = `${timestamp}-${sanitizedFilename}`
    const filepath = join(uploadsDir, filename)

    await writeFile(filepath, file.data)

    const rawType = formData.find(f => f.name === 'type')?.data?.toString() || 'gallery'
    const imageType = ['gallery', 'floorplan', 'branding'].includes(rawType) ? rawType : 'gallery'

    return {
      success: true,
      filename,
      originalName: file.filename,
      url: `/uploads/listing-templates/${filename}`,
      type: imageType,
      mimeType: fileType,
      size: file.data.length
    }
  } catch (error: any) {
    console.error('Error uploading listing image:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
