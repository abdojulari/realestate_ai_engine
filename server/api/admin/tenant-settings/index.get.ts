import { defineEventHandler, getQuery, createError } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { mapTenantMediaFields } from '../../../utils/tenantMediaUrls'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


/**
 * GET /api/admin/tenant-settings
 *
 * Returns the TenantSettings for the current admin.
 *  • admin       → findUnique where adminId = user.id
 *  • super_admin → own settings by default, or ?adminId=<id> to view another tenant
 */
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)

  try {
    let targetAdminId = user.id

    // super_admin can view another tenant's settings via query param
    if (user.role === 'super_admin') {
      const query = getQuery(event)
      if (query.adminId) {
        const parsed = Number(query.adminId)
        if (isNaN(parsed)) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Invalid adminId query parameter',
          })
        }
        targetAdminId = parsed
      }
    }

    const settings = await prisma.tenantSettings.findUnique({
      where: { adminId: targetAdminId },
    })

    if (!settings) {
      // Return empty defaults so the client always gets a consistent shape
      return {
        id: null,
        adminId: targetAdminId,
        businessName: null,
        tagline: null,
        logoUrl: null,
        faviconUrl: null,
        primaryColor: '#1976D2',
        phone: null,
        email: null,
        address: null,
        city: null,
        province: null,
        postalCode: null,
        socialLinks: null,
        brokerageName: null,
        brokerageLogoUrl: null,
        footerDisclaimer: null,
        copyrightName: null,
        googleReviewUrl: null,
        developerName: null,
        developerUrl: null,
        subdomain: null,
        customDomain: null,
        createdAt: null,
        updatedAt: null,
      }
    }

    return mapTenantMediaFields(settings)
  } catch (error: any) {
    if (error.statusCode) throw error
    console.error('Failed to load tenant settings:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load tenant settings',
    })
  }
})
