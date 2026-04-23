import { defineEventHandler, getQuery, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { resolveTenantFromRequest } from '../utils/tenant'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const featured = query.featured === 'true'
    const approved = query.approved !== 'false'
    const limit = parseInt(query.limit as string) || (featured ? 10 : 50)
    const offset = parseInt(query.offset as string) || 0

    // Scope to the visiting tenant. Without this every site in the platform
    // would render every other tenant's testimonials. We also include any
    // legacy rows with `adminId = null` so older single-tenant deployments
    // don't suddenly start showing an empty list.
    const adminId = await resolveTenantFromRequest(event)
    const where: any = adminId
      ? { OR: [{ adminId }, { adminId: null }] }
      : {}

    if (approved) {
      where.approved = true
    }

    if (featured) {
      where.featured = true
    }

    const testimonials = await prisma.testimonial.findMany({
      where,
      orderBy: featured 
        ? [
            { displayOrder: 'asc' },
            { createdAt: 'desc' }
          ]
        : [{ createdAt: 'desc' }],
      take: limit,
      skip: offset,
      select: {
        id: true,
        name: true,
        location: true,
        content: true,
        rating: true,
        propertyType: true,
        avatar: true,
        featured: true,
        createdAt: true,
      }
    })

    return testimonials
  } catch (error) {
    console.error('Error fetching testimonials:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch testimonials'
    })
  }
})
