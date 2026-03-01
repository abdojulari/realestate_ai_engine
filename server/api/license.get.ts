// GET /api/license - Get current license info and feature access
// Works for both authenticated and unauthenticated requests
import { getLicenseInfo, getUserLicense, getEffectiveSubscriptionTier, FEATURES } from '../utils/license'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  // Check for optional auth token
  const authHeader = getHeader(event, 'authorization')
  
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1]!
      const secret = process.env.JWT_SECRET || 'fallback-secret'
      const decoded = jwt.verify(token, secret) as { id: number }
      
      // Fetch user with admin relationship
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          role: true,
          subscriptionTier: true,
          adminId: true,
        }
      })
      
      if (user) {
        // Get user-based license
        const { tier, isSuperAdmin } = await getEffectiveSubscriptionTier(user)
        const license = await getUserLicense(user)
        
        // Build feature map
        const allFeatures = Object.values(FEATURES)
        const featureMap: Record<string, boolean> = {}
        for (const feature of allFeatures) {
          featureMap[feature] = license.features.includes(feature)
        }
        
        return {
          success: true,
          data: {
            tier,
            features: featureMap,
            role: user.role,
            isSuperAdmin,
          },
        }
      }
    } catch (error) {
      // Invalid token - fall through to tenant-based license
      console.log('[License] Invalid token, using tenant-based license')
    }
  }
  
  // Fallback to tenant-based or environment-based license
  const licenseInfo = await getLicenseInfo(event)
  
  return {
    success: true,
    data: licenseInfo,
  }
})
