import { defineEventHandler, readBody, createError } from 'h3'
import { creaService } from '../../utils/crea.service'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { filters = {}, includeAgentData = true, limit = 10 } = body

  try {
    console.log(`🍁 Starting CREA sync with agent data (limit: ${limit})`)
    
    // Fetch properties from CREA
    const creaProperties = await creaService.getProperties({ ...filters, $top: limit })
    console.log(`Found ${creaProperties.length} CREA properties`)

    const syncStats = {
      total: creaProperties.length,
      created: 0,
      updated: 0,
      errors: 0,
      errorDetails: [] as string[],
      agentDataFetched: 0,
      agentDataErrors: 0
    }

    // Process each property
    for (const creaProp of creaProperties) {
      try {
        let agentData = undefined
        
        if (includeAgentData) {
          try {
            // Fetch agent and office data for this property
            const propertyWithAgents = await creaService.getPropertyWithAgentDetails(creaProp.ListingKey)
            agentData = {
              listingAgent: propertyWithAgents.listingAgent,
              listingOffice: propertyWithAgents.listingOffice,
              coListingAgents: propertyWithAgents.coListingAgents,
              coListingOffices: propertyWithAgents.coListingOffices
            }
            syncStats.agentDataFetched++
            
            console.log(`📋 Agent data for ${creaProp.ListingKey}: ${agentData.listingAgent?.MemberFullName || 'No agent'} @ ${agentData.listingOffice?.OfficeName || 'No office'}`)
          } catch (agentError: any) {
            console.warn(`⚠️ Failed to fetch agent data for ${creaProp.ListingKey}:`, agentError.message)
            syncStats.agentDataErrors++
          }
        }

        // Transform property with agent data
        const transformedProperty = creaService.transformToLocalProperty(creaProp, agentData)
        
        if (!transformedProperty) {
          console.log(`🏢 SKIPPING property ${creaProp.ListingKey} - filtered out by transformer`)
          continue
        }
        
        // Remove relation fields that shouldn't be in the create/update data
        const { user, agent, isSaved, ...propertyData } = transformedProperty as any
        
        // Check if property already exists
        const existingProperty = await prisma.property.findFirst({
          where: {
            source: 'crea',
            externalId: creaProp.ListingKey
          }
        })

        if (existingProperty) {
          // Update existing property
          await prisma.property.update({
            where: { id: existingProperty.id },
            data: {
              ...propertyData,
              lastSyncAt: new Date(),
              // Preserve local data
              views: existingProperty.views,
              createdAt: existingProperty.createdAt
            }
          })
          syncStats.updated++
          console.log(`✅ Updated: ${transformedProperty.title}`)
        } else {
          // Create new property
          await prisma.property.create({
            data: {
              ...propertyData,
              lastSyncAt: new Date()
            }
          })
          syncStats.created++
          console.log(`✅ Created: ${transformedProperty.title}`)
        }
        
      } catch (error: any) {
        console.error(`❌ Error processing property ${creaProp.ListingKey}:`, error)
        syncStats.errors++
        syncStats.errorDetails.push(`Property ${creaProp.ListingKey}: ${error.message}`)
      }
    }

    console.log('🎉 CREA sync with agent data completed:', syncStats)
    
    return {
      success: true,
      stats: syncStats,
      message: `Synced ${syncStats.created + syncStats.updated} properties with ${syncStats.agentDataFetched} agent records`
    }
    
  } catch (error: any) {
    console.error('❌ CREA sync with agent data failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `CREA sync failed: ${error.message}`
    })
  }
})
