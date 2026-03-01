import { resolveTenantFromRequest } from '../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { email, firstName, lastName, source = 'website' } = body

    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return {
        success: false,
        message: 'Please provide a valid email address'
      }
    }

    // Resolve tenant
    const adminId = await resolveTenantFromRequest(event)

    // Get IP and user agent for tracking
    const headers = getHeaders(event)
    const ipAddress = headers['x-forwarded-for'] || headers['x-real-ip'] || 'unknown'
    const userAgent = headers['user-agent'] || 'unknown'

    // Check if subscriber already exists for this tenant (adminId + email uniqueness)
    const existingSubscriber = await prisma.newsletterSubscriber.findFirst({
      where: { email: email.toLowerCase(), ...(adminId ? { adminId } : {}) }
    })

    if (existingSubscriber) {
      // If they were unsubscribed, reactivate them
      if (existingSubscriber.status === 'unsubscribed') {
        await prisma.newsletterSubscriber.update({
          where: { id: existingSubscriber.id },
          data: {
            status: 'active',
            subscribedAt: new Date(),
            firstName: firstName || existingSubscriber.firstName,
            lastName: lastName || existingSubscriber.lastName,
            source,
            ipAddress,
            userAgent
          }
        })

        return {
          success: true,
          message: 'Welcome back! You have been resubscribed to our newsletter.'
        }
      }

      return {
        success: true,
        message: 'You are already subscribed to our newsletter.'
      }
    }

    // Create new subscriber
    await prisma.newsletterSubscriber.create({
      data: {
        email: email.toLowerCase(),
        firstName,
        lastName,
        status: 'active',
        source,
        ipAddress,
        userAgent,
        ...(adminId ? { adminId } : {})
      }
    })

    return {
      success: true,
      message: 'Thank you for subscribing! You will receive our curated property collections and market insights.'
    }
  } catch (error) {
    console.error('Newsletter subscription error:', error)
    return {
      success: false,
      message: 'An error occurred while subscribing. Please try again later.'
    }
  }
})
