import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../utils/auth'

const prisma = new PrismaClient()

function calculateNextRun(frequency: string, dayOfWeek?: number, dayOfMonth?: number, timeOfDay?: string, timezone?: string): Date {
  const now = new Date()
  const [hours, minutes] = (timeOfDay || '09:00').split(':').map(Number)
  
  const nextRun = new Date(now)
  nextRun.setHours(hours, minutes, 0, 0)
  
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
    const id = parseInt(event.context.params?.id || '0')
    const body = await readBody(event)

    if (!id) {
      throw createError({ statusCode: 400, message: 'Invalid automation ID' })
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
      const automation = await prisma.newsletterAutomation.findUnique({
        where: { id }
      })
      if (automation) {
        nextRun = calculateNextRun(
          frequency || automation.frequency || 'weekly',
          dayOfWeek !== undefined ? dayOfWeek : automation.dayOfWeek || undefined,
          dayOfMonth !== undefined ? dayOfMonth : automation.dayOfMonth || undefined,
          timeOfDay || automation.timeOfDay || '09:00',
          timezone || automation.timezone
        )
      }
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
