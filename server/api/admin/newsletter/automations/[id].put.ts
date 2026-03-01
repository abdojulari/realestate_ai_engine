import { requireAdmin } from '../../../../utils/auth'
import { getTenantFilter } from '../../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

function calculateNextRun(frequency: string, dayOfWeek?: number, dayOfMonth?: number, timeOfDay?: string, timezone?: string): Date {
  const now = new Date()
  const [hours, minutes] = (timeOfDay || '09:00').split(':').map(Number)
  
  const nextRun = new Date(now)
  nextRun.setHours(hours!, minutes!, 0, 0)
  
  if (frequency === 'daily') {
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1)
    }
  } else if (frequency === 'weekly' && dayOfWeek !== undefined) {
    const currentDay = nextRun.getDay()
    const daysUntilTarget = (dayOfWeek - currentDay + 7) % 7
    nextRun.setDate(nextRun.getDate() + (daysUntilTarget || 7))
  } else if (frequency === 'monthly' && dayOfMonth !== undefined) {
    nextRun.setDate(dayOfMonth)
    if (nextRun <= now) {
      nextRun.setMonth(nextRun.getMonth() + 1)
    }
  }
  
  return nextRun
}

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const tenantFilter = getTenantFilter(user)
    const id = parseInt(event.context.params?.id || '0')
    const body = await readBody(event)

    if (!id) {
      throw createError({ statusCode: 400, message: 'Invalid automation ID' })
    }

    // Verify tenant ownership before updating
    const existingAutomation = await prisma.newsletterAutomation.findFirst({
      where: { id, ...tenantFilter }
    })

    if (!existingAutomation) {
      throw createError({ statusCode: 404, message: 'Automation not found' })
    }

    const {
      name,
      description,
      triggerType,
      frequency,
      dayOfWeek,
      dayOfMonth,
      timeOfDay,
      timezone,
      templateId,
      subject,
      targetFilters,
      isActive
    } = body

    let nextRun = undefined
    if (frequency || dayOfWeek !== undefined || dayOfMonth !== undefined || timeOfDay) {
      nextRun = calculateNextRun(
        frequency || existingAutomation.frequency || 'weekly',
        dayOfWeek !== undefined ? dayOfWeek : existingAutomation.dayOfWeek || undefined,
        dayOfMonth !== undefined ? dayOfMonth : existingAutomation.dayOfMonth || undefined,
        timeOfDay || existingAutomation.timeOfDay || '09:00',
        timezone || existingAutomation.timezone
      )
    }

    const automation = await prisma.newsletterAutomation.update({
      where: { id },
      data: {
        name,
        description,
        triggerType,
        frequency,
        dayOfWeek,
        dayOfMonth,
        timeOfDay,
        timezone,
        templateId: templateId || null,
        subject,
        targetFilters: targetFilters || null,
        isActive,
        nextRun
      }
    })

    return {
      success: true,
      message: 'Automation updated successfully',
      automation
    }
  } catch (error: any) {
    console.error('Error updating automation:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
