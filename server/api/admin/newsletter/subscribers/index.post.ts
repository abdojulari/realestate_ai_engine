import { requireAdmin } from '../../../../utils/auth'
import { getTenantFilter, getAdminIdForCreate } from '../../../../utils/tenant'
import { upsertCrmClientFromPlatformContact } from '../../../../utils/crmClientSync'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const tenantFilter = getTenantFilter(user)
    const body = await readBody(event)
    const { email, firstName, lastName, tags, status = 'active' } = body

    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      throw createError({ statusCode: 400, message: 'Invalid email address' })
    }

    const existingSubscriber = await prisma.newsletterSubscriber.findFirst({
      where: { email: email.toLowerCase(), ...tenantFilter }
    })

    if (existingSubscriber) {
      throw createError({ statusCode: 400, message: 'Email already exists' })
    }

    const adminId = getAdminIdForCreate(user)
    const subscriber = await prisma.newsletterSubscriber.create({
      data: {
        email: email.toLowerCase(),
        firstName,
        lastName,
        status,
        source: 'manual',
        tags: tags || null,
        adminId
      }
    })

    await upsertCrmClientFromPlatformContact(prisma, {
      adminId,
      email: subscriber.email,
      firstName: subscriber.firstName || undefined,
      lastName: subscriber.lastName || undefined,
      source: 'newsletter_manual',
      sourceId: subscriber.id,
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
