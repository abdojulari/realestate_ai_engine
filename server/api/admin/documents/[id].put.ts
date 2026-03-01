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

    const id = parseInt(event.context.params?.id || '0')
    if (!id) {
      throw createError({ statusCode: 400, message: 'Invalid document ID' })
    }

    // Check if document exists and belongs to user
    const existingDoc = await prisma.document.findFirst({
      where: {
        id,
        userId: user.id
      }
    })

    if (!existingDoc) {
      throw createError({ statusCode: 404, message: 'Document not found' })
    }

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
    
    let updateData: any = {}

    // If a new file is uploaded, replace the old one
    if (uploadedFile) {
      const fileType = uploadedFile.originalFilename?.split('.').pop()?.toLowerCase() || ''
      
      // Delete old file
      const oldFilePath = path.join(process.cwd(), 'public', existingDoc.filePath)
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath)
      }

      updateData = {
        name: path.basename(uploadedFile.filepath),
        originalName: uploadedFile.originalFilename || 'Untitled',
        type: fileType,
        fileSize: uploadedFile.size,
        filePath: `/uploads/documents/${path.basename(uploadedFile.filepath)}`,
        metadata: {
          ...(existingDoc.metadata as any),
          lastModified: new Date().toISOString(),
          mimetype: uploadedFile.mimetype
        }
      }
    }

    // Handle metadata updates from fields
    if (fields.status) {
      updateData.status = Array.isArray(fields.status) ? fields.status[0] : fields.status
    }

    if (fields.isSigned !== undefined) {
      const isSigned = Array.isArray(fields.isSigned) ? fields.isSigned[0] : fields.isSigned
      updateData.isSigned = isSigned === 'true' || (isSigned as any) === true
    }

    if (fields.watermarkApplied !== undefined) {
      const watermarkApplied = Array.isArray(fields.watermarkApplied) ? fields.watermarkApplied[0] : fields.watermarkApplied
      updateData.watermarkApplied = watermarkApplied === 'true' || (watermarkApplied as any) === true
    }

    if (fields.signatureData) {
      updateData.signatureData = JSON.parse(
        (Array.isArray(fields.signatureData) ? fields.signatureData[0] : fields.signatureData) as any
      )
    }

    const document = await prisma.document.update({
      where: { id },
      data: updateData
    })

    return {
      success: true,
      document
    }
  } catch (error: any) {
    console.error('Update document error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to update document'
    })
  }
})

