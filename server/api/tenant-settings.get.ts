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
        googleReviewUrl: true,
        developerName: true,
        developerUrl: true,
        awardsCount: true,
        // Public marketing — pixel ID is fine to expose (it ships in the
        // browser bundle anyway). NEVER select metaPixelAccessToken here;
        // that token is server-only and would be a security incident if
        // it leaked into a public response.
        metaPixelId: true,
        admin: { select: { firstName: true, lastName: true, email: true } },
        // Intentionally excluded: subdomain, customDomain, adminId,
        //                         metaPixelAccessToken
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
        googleReviewUrl: null,
        developerName: null,
        developerUrl: null,
        awardsCount: null,
        metaPixelId: null,
      }
    }

    const mapped = mapTenantMediaFields(settings)
    const admin = (settings as any).admin
    const adminFirstName = admin?.firstName || null
    const adminLastName = admin?.lastName || null
    const adminFullName = [adminFirstName, adminLastName].filter(Boolean).join(' ') || null
    return { ...mapped, adminEmail: admin?.email || null, adminFirstName, adminLastName, adminFullName }
  } catch (error: any) {
    if (error.statusCode) throw error
    console.error('Failed to load public tenant settings:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load tenant settings',
    })
  }
})
