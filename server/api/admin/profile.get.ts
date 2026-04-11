import { PrismaClient } from '@prisma/client'
import { resolveStoredUploadUrl } from '../../utils/publicMediaUrl'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  try {
    console.log('[PROFILE GET] Handler called')
    console.log('[PROFILE GET] event.context.user:', event.context.user)
    
    // Get user from session/auth (you should have auth middleware)
    const userId = event.context.user?.id

    if (!userId) {
      console.error('[PROFILE GET] No user ID found in context')
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }
    
    console.log('[PROFILE GET] User ID:', userId)

    // Get user profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        bio: true,
        role: true,
        adminId: true,
        delegatedAdminPermissions: true,
        delegationExcludedUserIds: true,
        timezone: true,
        language: true,
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        loginCount: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    // Get stats
    const stats = {
      totalLogins: user.loginCount || 0,
      lastLogin: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'
    }

    // Get preferences
    const preferences = {
      timezone: user.timezone || 'America/New_York',
      language: user.language || 'English',
      emailNotifications: user.emailNotifications,
      pushNotifications: user.pushNotifications,
      smsNotifications: user.smsNotifications
    }

    return {
      profile: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        avatar: resolveStoredUploadUrl(user.avatar),
        bio: user.bio,
        role: user.role,
        adminId: user.adminId,
        delegatedAdminPermissions: user.delegatedAdminPermissions,
        delegationExcludedUserIds: user.delegationExcludedUserIds,
      },
      preferences,
      twoFactorEnabled: user.twoFactorEnabled,
      stats
    }
  } catch (error: any) {
    console.error('Error fetching profile:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch profile'
    })
  }
})

