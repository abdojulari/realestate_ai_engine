import { defineEventHandler, getQuery, createError } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const featured = query.featured === 'true'
    const approved = query.approved !== 'false' // Default to true
    const limit = parseInt(query.limit as string) || (featured ? 10 : 50)
    const offset = parseInt(query.offset as string) || 0

    const where: any = {}
    
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
        // Don't expose email, phone, IP for public API
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
