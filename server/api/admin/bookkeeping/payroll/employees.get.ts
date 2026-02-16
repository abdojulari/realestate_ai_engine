import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../utils/auth'
import { getTenantFilter } from '../../../../utils/tenant'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const tenantFilter = getTenantFilter(user)
    const query = getQuery(event)

    const isActive = query.isActive as string

    const where: any = { ...tenantFilter }

    if (isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true'
    }

    const employees = await prisma.bkEmployee.findMany({
      where,
      orderBy: { name: 'asc' },
    })

    return { employees }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error',
    })
  }
})
