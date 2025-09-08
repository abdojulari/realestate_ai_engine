import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { promises as fs } from 'fs'
import path from 'path'

export default defineEventHandler(async (event) => {
  // Note: This endpoint is whitelisted in auth middleware, so no authentication required

  const form = await readMultipartFormData(event)
  if (!form || form.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No files uploaded' })
  }

  const uploadDir = path.resolve(process.cwd(), 'public', 'images', 'about')
  await fs.mkdir(uploadDir, { recursive: true })

  const uploadedImages: string[] = []

  // Process each file in the form
  for (const filePart of form) {
    if (filePart.filename && filePart.data) {
      const cleanName = filePart.filename.replace(/[^a-zA-Z0-9._-]/g, '_')
      const extension = path.extname(cleanName).toLowerCase()
      
      // Validate file type
      if (!['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(extension)) {
        throw createError({ statusCode: 400, statusMessage: `Invalid file type: ${extension}` })
      }
      
      const nameWithoutExt = path.basename(cleanName, extension)
      const filename = `${nameWithoutExt}_${Date.now()}${extension}`
      const filePath = path.join(uploadDir, filename)
      
      await fs.writeFile(filePath, filePart.data as Buffer)
      uploadedImages.push(`../../images/about/${filename}`)
    }
  }

  if (uploadedImages.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No valid image files found' })
  }

  return { images: uploadedImages }
})