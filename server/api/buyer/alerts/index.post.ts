import { defineEventHandler, readBody, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const {
    naturalQuery,
    parsedFilters,
    city,
    frequency,
    marketingConsent,
    emailEnabled
  } = await readBody(event)

  // Validate required fields
  if (!naturalQuery || !frequency) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Natural query and frequency are required'
    })
  }

  // Validate marketing consent
  if (!marketingConsent) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Marketing consent is required to create property alerts'
    })
  }

  try {
    // Calculate next run time based on frequency
    const nextRun = calculateNextRun(frequency)
    
    // Get client IP for consent tracking (fallback method)
    const clientIP = event.node.req.headers['x-forwarded-for'] || event.node.req.connection?.remoteAddress || 'unknown'
    
    // Create the property alert
    const alert = await prisma.propertyAlert.create({
      data: {
        userId: user.id,
        naturalQuery,
        parsedFilters,
        city,
        frequency,
        isActive: true,
        nextRun,
        emailEnabled: emailEnabled ?? true,
        marketingConsent: true,
        consentDate: new Date(),
        totalSent: 0
      }
    })

    // Update user's marketing consent in their profile
    await prisma.user.update({
      where: { id: user.id },
      data: {
        marketingConsent: true,
        consentDate: new Date(),
        consentIpAddress: clientIP
      }
    })

    console.log('✅ Property alert created for user:', user.email, 'Query:', naturalQuery, 'Frequency:', frequency)

    return {
      success: true,
      alert: {
        id: alert.id,
        naturalQuery: alert.naturalQuery,
        city: alert.city,
        frequency: alert.frequency,
        nextRun: alert.nextRun,
        isActive: alert.isActive
      },
      message: `Alert created! You'll receive notifications ${getFrequencyLabel(frequency)} for new properties matching your search.`
    }
  } catch (error: any) {
    console.error('❌ Failed to create property alert:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create property alert'
    })
  }
})

function calculateNextRun(frequency: string): Date {
  const now = new Date()
  
  switch (frequency) {
    case '2h':
      return new Date(now.getTime() + 2 * 60 * 60 * 1000)
    case '4h':
      return new Date(now.getTime() + 4 * 60 * 60 * 1000)
    case '12h':
      return new Date(now.getTime() + 12 * 60 * 60 * 1000)
    case '24h':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000)
    case '7d':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    case '14d':
      return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    case '30d':
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000) // Default to daily
  }
}

function getFrequencyLabel(frequency: string): string {
  const labels: Record<string, string> = {
    '2h': 'every 2 hours',
    '4h': 'every 4 hours', 
    '12h': 'every 12 hours',
    '24h': 'daily',
    '7d': 'weekly',
    '14d': 'bi-weekly',
    '30d': 'monthly'
  }
  return labels[frequency] || 'daily'
}
