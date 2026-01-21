import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const id = parseInt(event.context.params?.id || '0')

    if (!id) {
      throw createError({ statusCode: 400, message: 'Invalid automation ID' })
    }

    await prisma.newsletterAutomation.delete({ where: { id } })

    return {
      success: true,
      message: 'Automation deleted successfully'
    }
  } catch (error: any) {
    console.error('Error deleting automation:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
