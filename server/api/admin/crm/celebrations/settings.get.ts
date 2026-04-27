import { requireAdmin } from '../../../../utils/auth'
import { getAdminIdForCreate } from '../../../../utils/tenant'
import { CELEBRATION_KINDS, getDefaultTemplate, type CelebrationKind } from '../../../../utils/celebrations'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const adminId = getAdminIdForCreate(user)

    let settings = await prisma.celebrationSettings.findUnique({ where: { adminId } })
    if (!settings) {
      settings = await prisma.celebrationSettings.create({ data: { adminId } })
    }

    // Always merge defaults so the UI has something to render even if the column is null.
    const defaults: Record<string, { subject: string; body: string }> = {}
    for (const kind of CELEBRATION_KINDS) {
      defaults[kind] = getDefaultTemplate(kind as CelebrationKind)
    }

    return { success: true, settings, defaults }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
