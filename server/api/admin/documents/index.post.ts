import { H3Event } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event: H3Event) => {
  try {
    const user = await requireAdmin(event)

    const form = formidable({
      uploadDir: path.join(process.cwd(), 'public', 'uploads', 'documents'),
      keepExtensions: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      filename: (name, ext, part) => {
        const timestamp = Date.now()
        const random = Math.floor(Math.random() * 10000)
        return `doc_${timestamp}_${random}${ext}`
      }
    })

    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(event.node.req, (err, fields, files) => {
        if (err) reject(err)
        else resolve([fields, files])
      })
    })

    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file
    if (!uploadedFile) {
      throw createError({ statusCode: 400, message: 'No file uploaded' })
    }

    const fileType = uploadedFile.originalFilename?.split('.').pop()?.toLowerCase() || ''
    const allowedTypes = ['pdf', 'docx', 'doc']
    
    if (!allowedTypes.includes(fileType)) {
      // Delete the uploaded file
      fs.unlinkSync(uploadedFile.filepath)
      throw createError({ 
        statusCode: 400, 
        message: 'Invalid file type. Only PDF and DOCX files are allowed.' 
      })
    }

    const document = await prisma.document.create({
      data: {
        userId: user.id,
        name: path.basename(uploadedFile.filepath),
        originalName: uploadedFile.originalFilename || 'Untitled',
        type: fileType,
        fileSize: uploadedFile.size,
        filePath: `/uploads/documents/${path.basename(uploadedFile.filepath)}`,
        status: 'draft',
        metadata: {
          uploadedAt: new Date().toISOString(),
          mimetype: uploadedFile.mimetype
        }
      }
    })

    return {
      success: true,
      document
    }
  } catch (error: any) {
    console.error('Document upload error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to upload document'
    })
  }
})

