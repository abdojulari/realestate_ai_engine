import { requireAdmin } from '../../../../utils/auth'
import { getAdminIdForCreate } from '../../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const body = await readBody(event)
    const {
      name,
      subject,
      content,
      plainTextContent,
      previewText,
      category,
      isActive = true
    } = body

    if (!name || !subject || !content) {
      throw createError({ statusCode: 400, message: 'Name, subject, and content are required' })
    }

    const template = await prisma.newsletterTemplate.create({
      data: {
        name,
        subject,
        content,
        plainTextContent,
        previewText,
        category,
        isActive,
        createdBy: user.id,
        adminId: getAdminIdForCreate(user)
      }
    })

    return {
      success: true,
      message: 'Template created successfully',
      template
    }
  } catch (error: any) {
    console.error('Error creating template:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
