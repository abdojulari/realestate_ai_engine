import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const id = parseInt(event.context.params?.id || '0')
    const body = await readBody(event)

    if (!id) {
      throw createError({ statusCode: 400, message: 'Invalid template ID' })
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
