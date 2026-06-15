import { defineEventHandler } from 'h3'
import { getPublicTenantFilter, getPublicSharedMlsWhere } from '../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  try {
    const tenantFilter = await getPublicTenantFilter(event)

    // Public homepage social proof: count the tenant's CRM clients
    // (buyers / sellers / past clients / leads), NOT auth users. Exclude
    // soft-disabled rows so the number reflects real people the broker has
    // worked with or is working with.
    // If we can't resolve a tenant from the domain, return 0 — never leak a
    // cross-tenant aggregate to the public.
    const clientWhere = tenantFilter.adminId
      ? { adminId: tenantFilter.adminId, status: { not: 'inactive' } }
      : null

    const [totalClients, totalProperties, totalActiveProperties] = await Promise.all([
      clientWhere
        // @ts-ignore - crmClient is in the Prisma schema
        ? prisma.crmClient.count({ where: clientWhere })
        : Promise.resolve(0),
      prisma.property.count({ where: { AND: [getPublicSharedMlsWhere(tenantFilter)] } }),
      prisma.property.count({
        where: {
          AND: [
            getPublicSharedMlsWhere(tenantFilter),
            {
              status: {
                in: ['for_sale', 'for_rent', 'active'],
              },
            },
          ],
        },
      })
    ])

    return {
      totalClients,
      totalProperties,
      totalActiveProperties
    }
  } catch (error) {
    console.error('Error fetching public stats:', error)
    // Return fallback values if database query fails
    return {
      totalClients: 0,
      totalProperties: 0,
      totalActiveProperties: 0
    }
  }
})
