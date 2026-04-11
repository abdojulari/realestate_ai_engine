import { createError } from 'h3'
import { requireAdmin } from '../../../../utils/auth'
import { getTenantFilter } from '../../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)
  const id = Number(event.context.params?.id)

  const existing = await prisma.leadForm.findFirst({ where: { id, ...tenantFilter } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Form not found' })

  await prisma.leadForm.delete({ where: { id } })

  return { success: true }
})
