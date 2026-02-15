import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../utils/auth'
import { getTenantFilter } from '../../../../utils/tenant'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const tenantFilter = getTenantFilter(user)
    const id = parseInt(event.context.params?.id || '0')

    if (!id) {
      throw createError({ statusCode: 400, message: 'Invalid campaign ID' })
    }

    const campaign = await prisma.newsletter.findFirst({
      where: { id, ...tenantFilter },
      include: {
        template: true,
        _count: { select: { sentNewsletters: true } }
      }
    })

    if (!campaign) {
      throw createError({ statusCode: 404, message: 'Campaign not found' })
    }

    return campaign
  } catch (error: any) {
    console.error('Error fetching campaign:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
