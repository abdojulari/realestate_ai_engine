import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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

    // Get IP and user agent for tracking
    const headers = getHeaders(event)
    const ipAddress = headers['x-forwarded-for'] || headers['x-real-ip'] || 'unknown'
    const userAgent = headers['user-agent'] || 'unknown'

    // Check if subscriber already exists
    const existingSubscriber = await prisma.newsletterSubscriber.findUnique({
      where: { email: email.toLowerCase() }
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
        userAgent
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
