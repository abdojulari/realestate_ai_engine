import { defineEventHandler, createError, readBody } from 'h3'
import { PrismaClient } from '@prisma/client'
import { syncCrmClientProfileFields } from '../../utils/crmClientSync'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma

export default defineEventHandler(async (event) => {
  const userId = event.context.user?.id
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody<{
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    preferredContactTime?: string | null
  }>(event)

  const firstName = (body.firstName ?? '').trim()
  const lastName = (body.lastName ?? '').trim()
  const email = (body.email ?? '').trim().toLowerCase()
  const phone = (body.phone ?? '').trim()

  if (!firstName || firstName.length < 2) {
    throw createError({ statusCode: 400, statusMessage: 'First name is required' })
  }
  if (!lastName || lastName.length < 2) {
    throw createError({ statusCode: 400, statusMessage: 'Last name is required' })
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Valid email is required' })
  }
  if (!phone) {
    throw createError({ statusCode: 400, statusMessage: 'Phone number is required' })
  }
  if (!/^\+?[\d\s-]{10,}$/.test(phone)) {
    throw createError({ statusCode: 400, statusMessage: 'Please enter a valid phone number' })
  }

  let preferredContactTime: string | null =
    body.preferredContactTime === '' || body.preferredContactTime === undefined
      ? null
      : String(body.preferredContactTime).trim() || null

  if (preferredContactTime) {
    const parsed = new Date(preferredContactTime)
    if (!Number.isNaN(parsed.getTime())) {
      preferredContactTime = parsed.toISOString()
    }
    /* non-ISO legacy strings (e.g. old dropdown labels) are stored as-is */
  }

  try {
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { adminId: true },
    })

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        email,
        phone,
        preferredContactTime,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        preferredContactTime: true,
        role: true,
        adminId: true,
        delegatedAdminPermissions: true,
        delegationExcludedUserIds: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    await syncCrmClientProfileFields(prisma, {
      adminId: me?.adminId,
      email: updatedUser.email,
      phone: updatedUser.phone ?? phone,
      preferredContactTime,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
    })

    return updatedUser
  } catch (error: any) {
    console.error('[user/profile.put]', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to update profile',
    })
  }
})
