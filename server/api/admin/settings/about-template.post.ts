import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { getAdminIdForCreate } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const adminId = getAdminIdForCreate(user)

  const body = await readBody(event)
  const { template } = body

  if (!template || template < 1 || template > 5) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Template must be a number between 1 and 5'
    })
  }

  try {
    const existing = await prisma.setting.findFirst({
      where: { key: 'site.aboutTemplate', adminId }
    })

    if (existing) {
      await prisma.setting.update({
        where: { id: existing.id },
        data: { value: String(template) }
      })
    } else {
      await prisma.setting.create({
        data: { key: 'site.aboutTemplate', value: String(template), adminId }
      })
    }

    return {
      success: true,
      message: `About page template updated to template ${template}`,
      template
    }
  } catch (error: any) {
    console.error('❌ Failed to update about template:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update about template'
    })
  }
})
