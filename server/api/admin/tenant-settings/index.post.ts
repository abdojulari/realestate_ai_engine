import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { mapTenantMediaFields } from '../../../utils/tenantMediaUrls'
import { getAdminIdForCreate } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


/**
 * POST /api/admin/tenant-settings
 *
 * Create or update (upsert) TenantSettings.
 *  • admin       → upsert where adminId = user.id
 *  • super_admin → upsert where adminId = user.id, or a specified adminId in the body
 */
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const body = await readBody(event)

  try {
    // Determine the target adminId
    let targetAdminId = getAdminIdForCreate(user)

    // super_admin may specify a different adminId
    if (user.role === 'super_admin' && body.adminId) {
      const parsed = Number(body.adminId)
      if (isNaN(parsed)) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid adminId in request body',
        })
      }
      targetAdminId = parsed
    }

    // ── Validate subdomain uniqueness ──────────────────────────
    if (body.subdomain) {
      const existing = await prisma.tenantSettings.findUnique({
        where: { subdomain: body.subdomain },
        select: { adminId: true },
      })
      if (existing && existing.adminId !== targetAdminId) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Subdomain is already taken by another tenant',
        })
      }
    }

    // ── Validate customDomain uniqueness ───────────────────────
    if (body.customDomain) {
      const existing = await prisma.tenantSettings.findUnique({
        where: { customDomain: body.customDomain },
        select: { adminId: true },
      })
      if (existing && existing.adminId !== targetAdminId) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Custom domain is already taken by another tenant',
        })
      }
    }

    // ── Build the data payload (only set fields that were sent) ─
    const data: Record<string, any> = {}

    const allowedFields = [
      'businessName',
      'tagline',
      'logoUrl',
      'faviconUrl',
      'primaryColor',
      'phone',
      'email',
      'address',
      'city',
      'province',
      'postalCode',
      'socialLinks',
      'brokerageName',
      'brokerageLogoUrl',
      'footerDisclaimer',
      'copyrightName',
      'googleReviewUrl',
      'developerName',
      'developerUrl',
      'awardsCount',
      'subdomain',
      'customDomain',
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        // awardsCount is an integer; coerce strings/empty to null gracefully
        if (field === 'awardsCount') {
          const raw = body[field]
          if (raw === null || raw === '' || raw === undefined) {
            data[field] = null
          } else {
            const n = Number(raw)
            data[field] = Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
          }
        } else {
          data[field] = body[field]
        }
      }
    }

    // ── Upsert ─────────────────────────────────────────────────
    const settings = await prisma.tenantSettings.upsert({
      where: { adminId: targetAdminId },
      update: data,
      create: {
        adminId: targetAdminId,
        ...data,
      },
    })

    return {
      success: true,
      message: 'Tenant settings saved successfully',
      settings: mapTenantMediaFields(settings),
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    console.error('Failed to save tenant settings:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to save tenant settings',
    })
  }
})
