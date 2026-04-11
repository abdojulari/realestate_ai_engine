import { requireAdmin } from '../../../../utils/auth'
import { getTenantFilter } from '../../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const tenantFilter = getTenantFilter(user)
    const id = parseInt(event.context.params?.id || '0')
    const body = await readBody(event)

    if (!id) {
      throw createError({ statusCode: 400, message: 'Invalid template ID' })
    }

    // Verify tenant ownership before updating
    const existing = await prisma.newsletterTemplate.findFirst({
      where: { id, ...tenantFilter }
    })

    if (!existing) {
      throw createError({ statusCode: 404, message: 'Template not found' })
    }

    const {
      name,
      subject,
      content,
      plainTextContent,
      previewText,
      category,
      isActive
    } = body

    const template = await prisma.newsletterTemplate.update({
      where: { id },
      data: {
        name,
        subject,
        content,
        plainTextContent,
        previewText,
        category,
        isActive
      }
    })

    return {
      success: true,
      message: 'Template updated successfully',
      template
    }
  } catch (error: any) {
    console.error('Error updating template:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
