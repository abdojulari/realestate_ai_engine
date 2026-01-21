import { defineEventHandler, createError, getRouterParam } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  
  // Guard: only numeric IDs are valid; avoid catching routes like "/saved"
  if (!id || !/^\d+$/.test(id)) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Property not found'
    })
  }

  const property = await prisma.property.findUnique({
    where: { id: parseInt(id) },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    },
  })

  if (!property) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Property not found'
    })
  }

  // Parse enhanced CREA agent data
  const listingAgentData = typeof property.listingAgentData === 'string' ? JSON.parse(property.listingAgentData) : property.listingAgentData
  const listingOfficeData = typeof property.listingOfficeData === 'string' ? JSON.parse(property.listingOfficeData) : property.listingOfficeData
  
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

  // Transform the response to match expected format
  return {
    ...property,
    images: typeof property.images === 'string' ? JSON.parse(property.images) : property.images,
    features: typeof property.features === 'string' ? JSON.parse(property.features) : property.features,
    agent: property.user,
    
    // Simple agent/office fields for display
    listingAgent,
    listingOffice,
    
    // Enhanced agent data for detailed views
    listingAgentData,
    listingOfficeData,
    coListingAgentsData: typeof property.coListingAgentsData === 'string' ? JSON.parse(property.coListingAgentsData) : property.coListingAgentsData,
    coListingOfficesData: typeof property.coListingOfficesData === 'string' ? JSON.parse(property.coListingOfficesData) : property.coListingOfficesData,
    
    // Add indicators for UI
    isMLS: property.source === 'crea',
    isBuilder: property.source === 'manual'
  }
})
