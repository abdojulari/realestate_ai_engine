import { PrismaClient } from '@prisma/client'
import { resolveStoredUploadUrl } from '../../utils/publicMediaUrl'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  try {
    const userId = event.context.user?.id

    if (!userId) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const body = await readBody(event)

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        bio: body.bio
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        bio: true,
        avatar: true,
        role: true
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'update',
        entity: 'profile',
        entityId: userId,
        description: 'Updated profile information',
        ipAddress: getRequestIP(event),
        userAgent: getRequestHeader(event, 'user-agent')
      }
    })

    return {
      ...updatedUser,
      avatar: resolveStoredUploadUrl(updatedUser.avatar),
    }
  } catch (error: any) {
    console.error('Error updating profile:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to update profile'
    })
  }
})

