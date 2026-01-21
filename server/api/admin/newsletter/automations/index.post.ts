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
    const body = await readBody(event)
    const {
      name,
      description,
      triggerType = 'time-based',
      frequency,
      dayOfWeek,
      dayOfMonth,
      timeOfDay,
      timezone = 'America/New_York',
      templateId,
      subject,
      targetFilters,
      isActive = true
    } = body

    if (!name || !frequency) {
      throw createError({ statusCode: 400, message: 'Name and frequency are required' })
    }

    const nextRun = calculateNextRun(frequency, dayOfWeek, dayOfMonth, timeOfDay, timezone)

    const automation = await prisma.newsletterAutomation.create({
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
        nextRun,
        createdBy: user.id
      }
    })

    return {
      success: true,
      message: 'Automation created successfully',
      automation
    }
  } catch (error: any) {
    console.error('Error creating automation:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
