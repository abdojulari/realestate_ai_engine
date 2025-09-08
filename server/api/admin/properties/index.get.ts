import { defineEventHandler, getQuery } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)

  const q = getQuery(event)
  const search = (q.search as string) || ''
  const type = (q.type as string) || undefined
  const status = (q.status as string) || undefined
  const sortBy = (q.sortBy as string) || 'newest'
  const excludeCrea = q.exclude_crea === 'true'
  const page = parseInt((q.page as string) || '1', 10)
  const limit = 12 // Show 12 properties per page


  const where: any = {}
  
  // Add basic filters - convert to lowercase to match database values
  if (type) where.type = type.toLowerCase()
  if (status) where.status = status.toLowerCase().replace(' ', '_')
  
  // Add search conditions
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } }
    ]
  }

  const orderBy: any = sortBy === 'price_asc' ? { price: 'asc' }
    : sortBy === 'price_desc' ? { price: 'desc' }
    : sortBy === 'views' ? { views: 'desc' }
    : { createdAt: 'desc' }

  if (excludeCrea) {
    // For CREA filtering, we need to get all matching properties first, filter them, then paginate
    const allProperties = await prisma.property.findMany({
      where,
      orderBy,
      select: {
        id: true,
        title: true,
        price: true,
        type: true,
        status: true,
        beds: true,
        baths: true,
        sqft: true,
        address: true,
        images: true,
        views: true
      }
    })

    // Filter out CREA properties (those with realtor.ca images)
    const filteredProperties = allProperties.filter((p: any) => {
      const images = Array.isArray(p.images) ? p.images : (typeof p.images === 'string' ? (() => { try { return JSON.parse(p.images) } catch { return [] } })() : [])
      return images.length > 0 && images[0].startsWith('/images/')
    })

    // Apply pagination to filtered results
    const totalCount = filteredProperties.length
    const skip = (page - 1) * limit
    const paginatedProperties = filteredProperties.slice(skip, skip + limit)

    const totalPages = Math.ceil(totalCount / limit)

    const transformedProperties = paginatedProperties.map((p: any) => ({
      ...p,
      type: (p.type || '').replace(/^[a-z]/, (m: string) => m.toUpperCase()),
      status: (p.status || '').replace('_', ' ').replace(/^[a-z]/, (m: string) => m.toUpperCase()),
      images: Array.isArray(p.images) ? p.images : (typeof p.images === 'string' ? (() => { try { return JSON.parse(p.images) } catch { return ['/favicon.ico'] } })() : ['/favicon.ico'])
    }))

    return {
      data: transformedProperties,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }
  } else {
    // No CREA filtering - use normal pagination
    const skip = (page - 1) * limit
    const totalCount = await prisma.property.count({ where })
    
    const properties = await prisma.property.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        price: true,
        type: true,
        status: true,
        beds: true,
        baths: true,
        sqft: true,
        address: true,
        images: true,
        views: true
      }
    })

    const totalPages = Math.ceil(totalCount / limit)

    const transformedProperties = properties.map((p: any) => ({
      ...p,
      type: (p.type || '').replace(/^[a-z]/, (m: string) => m.toUpperCase()),
      status: (p.status || '').replace('_', ' ').replace(/^[a-z]/, (m: string) => m.toUpperCase()),
      images: Array.isArray(p.images) ? p.images : (typeof p.images === 'string' ? (() => { try { return JSON.parse(p.images) } catch { return ['/favicon.ico'] } })() : ['/favicon.ico'])
    }))

    return {
      data: transformedProperties,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }
  }
})


