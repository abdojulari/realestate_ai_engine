import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter, getAdminIdForCreate } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)
  const adminId = getAdminIdForCreate(user)

  const body = await readBody(event)
  const { template } = body

  // Validate template number (1-5)
  if (!template || template < 1 || template > 5) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Template must be a number between 1 and 5'
    })
  }

  try {
    // Find existing setting for this tenant, then update or create
    const existing = await prisma.setting.findFirst({
      where: { key: 'site.homeTemplate', adminId }
    })

    if (existing) {
      await prisma.setting.update({
        where: { id: existing.id },
        data: { value: String(template) }
      })
    } else {
      await prisma.setting.create({
        data: { key: 'site.homeTemplate', value: String(template), adminId }
      })
    }

    // Verify it was saved
    const savedSetting = await prisma.setting.findFirst({
      where: { key: 'site.homeTemplate', adminId }
    })
    
    console.log(`✅ Home template updated to template ${template}`)
    console.log(`📝 Verified saved value: ${savedSetting?.value}`)

    return {
      success: true,
      message: `Home template updated to template ${template}`,
      template: template
    }
  } catch (error: any) {
    console.error('❌ Failed to update home template:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update home template'
    })
  }
})
