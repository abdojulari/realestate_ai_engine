import { requireAdmin } from '../../../../utils/auth'
import { getAdminIdForCreate } from '../../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const body = await readBody(event)

    const {
      name,
      email,
      role,
      salaryType,
      hourlyRate,
      fixedSalary,
      province,
      isSelf,
    } = body

    if (!name) {
      throw createError({ statusCode: 400, message: 'Employee name is required' })
    }

    if (!salaryType || !['hourly', 'fixed'].includes(salaryType)) {
      throw createError({ statusCode: 400, message: 'salaryType must be "hourly" or "fixed"' })
    }

    const employee = await prisma.bkEmployee.create({
      data: {
        name,
        email: email || null,
        role: role || null,
        salaryType,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        fixedSalary: fixedSalary ? parseFloat(fixedSalary) : null,
        province: province || 'ON',
        isSelf: isSelf === true,
        isActive: true,
        adminId: getAdminIdForCreate(user),
      },
    })

    return { success: true, employee }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || error.message || 'Internal server error',
    })
  }
})
