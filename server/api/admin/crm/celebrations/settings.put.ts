import { requireAdmin } from '../../../../utils/auth'
import { getAdminIdForCreate } from '../../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

// Whitelist of editable fields. Anything not in here is silently ignored — keeps the
// endpoint safe to call from a permissive form payload.
const STRING_FIELDS = [
  'birthdayTemplate', 'anniversaryTemplate', 'closingTemplate',
  'christmasTemplate', 'newYearTemplate', 'eidTemplate',
  'birthdaySubject', 'anniversarySubject', 'closingSubject',
  'christmasSubject', 'newYearSubject', 'eidSubject',
] as const

const BOOL_FIELDS = [
  'autoSendBirthday', 'autoSendAnniversary', 'autoSendClosing',
  'autoSendChristmas', 'autoSendNewYear',
] as const

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const adminId = getAdminIdForCreate(user)
    const body = (await readBody(event)) || {}

    const data: Record<string, unknown> = {}
    for (const f of STRING_FIELDS) {
      if (body[f] !== undefined) data[f] = body[f] === '' ? null : String(body[f])
    }
    for (const f of BOOL_FIELDS) {
      if (body[f] !== undefined) data[f] = Boolean(body[f])
    }

    const settings = await prisma.celebrationSettings.upsert({
      where: { adminId },
      update: data,
      create: { adminId, ...data },
    })

    return { success: true, settings }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
