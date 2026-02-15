import { PrismaClient } from '@prisma/client'
import { getPublicTenantFilter } from '../../utils/tenant'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const tenantFilter = await getPublicTenantFilter(event)
    const body = await readBody(event)
    const { email } = body

    if (!email) {
      return {
        success: false,
        message: 'Email address is required'
      }
    }

    const subscriber = await prisma.newsletterSubscriber.findFirst({
      where: { email: email.toLowerCase(), ...tenantFilter }
    })

    if (!subscriber) {
      return {
        success: false,
        message: 'Email address not found'
      }
    }

    await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: {
        status: 'unsubscribed',
        unsubscribedAt: new Date()
      }
    })

    return {
      success: true,
      message: 'You have been successfully unsubscribed from our newsletter.'
    }
  } catch (error) {
    console.error('Newsletter unsubscribe error:', error)
    return {
      success: false,
      message: 'An error occurred. Please try again later.'
    }
  }
})
