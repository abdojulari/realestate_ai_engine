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

    // Strict tenant isolation: only this site's testimonials (`adminId` must match).
    // Never merge `adminId: null` — those rows would leak onto every tenant's homepage.
    // If tenant resolution fails entirely, return nothing (never `{}`, which would list all rows).
    const adminId = await resolveTenantFromRequest(event)
    const where: Record<string, unknown> =
      adminId != null ? { adminId } : { id: { in: [] as number[] } }

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
