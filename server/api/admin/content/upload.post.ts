import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { promises as fs } from 'fs'
import path from 'path'

export default defineEventHandler(async (event) => {
  // Note: This endpoint is whitelisted in auth middleware, so no authentication required
  const form = await readMultipartFormData(event)
  const filePart = form?.find((f: any) => f.name === 'image' || f.filename)
  if (!filePart || !filePart.data) throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })

  const uploadDir = path.resolve(process.cwd(), 'public', 'uploads')
  await fs.mkdir(uploadDir, { recursive: true })
  const filename = `${Date.now()}_${filePart.filename || 'upload'}`.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filePath = path.join(uploadDir, filename)
  await fs.writeFile(filePath, filePart.data as Buffer)

  const publicUrl = `/uploads/${filename}`
  return { url: publicUrl }
})


