import { defineEventHandler, getQuery } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const {
    includeCrea = 'true',
    includeManual = 'true',
    limit = '10',
    city
  } = query

  const where: any = {}
  
  // Source filtering
  const sourceFilter = []
  if (includeManual === 'true') sourceFilter.push('manual')
  if (includeCrea === 'true') sourceFilter.push('crea')
  
  if (sourceFilter.length > 0) {
    where.source = { in: sourceFilter }
  }

  // City filtering
  if (city) {
    where.city = { contains: city as string, mode: 'insensitive' }
  }

  // Only show active properties
  where.status = 'for_sale'

  const properties = await prisma.property.findMany({
    where: {
      ...where,
      // Prioritize properties with agent data (active CREA listings)
      OR: [
        { listingAgentData: { not: null } },
        { source: 'manual' } // Include manual listings even without CREA agent data
      ]
    },
    orderBy: [
      { beds: 'desc' }, // Prioritize properties with bedrooms (residential)
      { views: 'desc' },
      { updatedAt: 'desc' }
    ],
    take: parseInt(limit as string) * 2, // Get more to filter from
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } }
    }
  })

  const processedProperties = properties.map((p: any) => {
    // Parse enhanced CREA agent data
    const listingAgentData = typeof p.listingAgentData === 'string' ? JSON.parse(p.listingAgentData) : p.listingAgentData
    const listingOfficeData = typeof p.listingOfficeData === 'string' ? JSON.parse(p.listingOfficeData) : p.listingOfficeData
    
    // Extract simple agent/office names for display
    let listingAgent = null
    let listingOffice = null
    
    if (listingAgentData) {
      listingAgent = listingAgentData.fullName || 
        (listingAgentData.firstName && listingAgentData.lastName 
          ? `${listingAgentData.firstName} ${listingAgentData.lastName}`
          : null)
    }
    
    if (listingOfficeData) {
      listingOffice = listingOfficeData.name
    }

    return {
      ...p,
      images: typeof p.images === 'string' ? JSON.parse(p.images as any) : p.images,
      features: typeof p.features === 'string' ? JSON.parse(p.features as any) : p.features,
      agent: p.user,
      
      // Simple agent/office fields for display
      listingAgent,
      listingOffice,
      
      // Enhanced agent data for detailed views
      listingAgentData,
      listingOfficeData,
      coListingAgentsData: typeof p.coListingAgentsData === 'string' ? JSON.parse(p.coListingAgentsData) : p.coListingAgentsData,
      coListingOfficesData: typeof p.coListingOfficesData === 'string' ? JSON.parse(p.coListingOfficesData) : p.coListingOfficesData,
      
      // Add indicators for UI
      isMLS: p.source === 'crea',
      isBuilder: p.source === 'manual'
    }
  })

  // Filter to prioritize residential properties with bedrooms and agent data
  const residentialProperties = processedProperties.filter(p => 
    (p.listingAgent || p.source === 'manual') && 
    p.beds > 0 && 
    p.type === 'house'
  )
  
  // If we don't have enough residential properties, include other properties with agent data
  const otherProperties = processedProperties.filter(p => 
    (p.listingAgent || p.source === 'manual') && 
    !(p.beds > 0 && p.type === 'house')
  )
  
  const filteredProperties = [
    ...residentialProperties,
    ...otherProperties
  ].slice(0, parseInt(limit as string))

  return filteredProperties
})


