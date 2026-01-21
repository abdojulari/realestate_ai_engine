import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const body = await readBody(event)
    const { email, firstName, lastName, tags, status = 'active' } = body

    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      throw createError({ statusCode: 400, message: 'Invalid email address' })
    }

    const existingSubscriber = await prisma.newsletterSubscriber.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingSubscriber) {
      throw createError({ statusCode: 400, message: 'Email already exists' })
    }

    const subscriber = await prisma.newsletterSubscriber.create({
      data: {
        email: email.toLowerCase(),
        firstName,
        lastName,
        status,
        source: 'manual',
        tags: tags || null
      }
    })

    return {
      success: true,
      message: 'Subscriber added successfully',
      subscriber
    }
  } catch (error: any) {
    console.error('Error creating subscriber:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
