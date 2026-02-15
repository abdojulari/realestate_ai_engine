import { defineEventHandler } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../utils/auth'
import { getTenantFilter } from '../../../../utils/tenant'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)

  try {
    const templates = await prisma.emailTemplate.findMany({
      where: {
        isActive: true,
        ...tenantFilter
      },
      orderBy: {
        name: 'asc'
      }
    })

    return templates
  } catch (error: any) {
    console.error('❌ Failed to load email templates:', error)
    return []
  }
})
