import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const query = getQuery(event)
    const isActive = query.isActive !== undefined ? query.isActive === 'true' : undefined

    const where: any = {}
    if (isActive !== undefined) {
      where.isActive = isActive
    }

    const automations = await prisma.newsletterAutomation.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })

    return { automations }
  } catch (error: any) {
    console.error('Error fetching automations:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
