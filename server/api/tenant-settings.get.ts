import { defineEventHandler, createError } from 'h3'
import { getPublicTenantFilter } from '../utils/tenant'
import { mapTenantMediaFields } from '../utils/tenantMediaUrls'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


/**
 * GET /api/tenant-settings
 *
 * PUBLIC route — no auth required.
 * Resolves the tenant from the incoming request domain and returns
 * their public-facing settings (business name, logo, contact info, etc.).
 *
 * Sensitive fields (subdomain, customDomain) are excluded from the response.
 */
export default defineEventHandler(async (event) => {
  try {
    const tenantFilter = await getPublicTenantFilter(event)

    if (!tenantFilter.adminId) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Tenant not found',
      })
    }

    const settings = await prisma.tenantSettings.findUnique({
      where: { adminId: tenantFilter.adminId },
      select: {
        id: true,
        businessName: true,
        tagline: true,
        logoUrl: true,
        faviconUrl: true,
        primaryColor: true,
        phone: true,
        email: true,
        address: true,
        city: true,
        province: true,
        postalCode: true,
        socialLinks: true,
        brokerageName: true,
        brokerageLogoUrl: true,
        footerDisclaimer: true,
        copyrightName: true,
        developerName: true,
        developerUrl: true,
        admin: { select: { email: true } },
        // Intentionally excluded: subdomain, customDomain, adminId
      },
    })

    if (!settings) {
      // Return empty defaults so the client always gets a consistent shape
      return {
        id: null,
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
        developerName: null,
        developerUrl: null,
      }
    }

    const mapped = mapTenantMediaFields(settings)
    return { ...mapped, adminEmail: (settings as any).admin?.email || null }
  } catch (error: any) {
    if (error.statusCode) throw error
    console.error('Failed to load public tenant settings:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load tenant settings',
    })
  }
})
