import { defineEventHandler, getQuery } from 'h3'
import { getPublicTenantFilter, getPublicSharedMlsWhere, isSharedMlsSource } from '../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  const tenantFilter = await getPublicTenantFilter(event)
  const query = getQuery(event)
  const {
    includeCrea = 'true',
    includeManual = 'true',
    limit = '10',
    city
  } = query

  const sourceFilter: string[] = []
  if (includeManual === 'true') sourceFilter.push('manual')
  if (includeCrea === 'true') {
    sourceFilter.push('crea', 'pillar9')
  }

  const andClause: any[] = [getPublicSharedMlsWhere(tenantFilter), { status: 'for_sale' as const }]
  if (city) {
    andClause.push({ city: { contains: city as string, mode: 'insensitive' as const } })
  }
  // When both flags are false, omit source narrowing — still bounded by getPublicSharedMlsWhere (shared MLS + this tenant's manuals).
  if (sourceFilter.length > 0) {
    andClause.push({ source: { in: sourceFilter } })
  }
  andClause.push({
    OR: [
      { listingAgentData: { not: null } },
      { source: 'manual' },
    ],
  })

  const properties = await prisma.property.findMany({
    where: { AND: andClause },
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
      isMLS: isSharedMlsSource(p.source),
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

