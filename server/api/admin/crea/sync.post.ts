import { defineEventHandler, readBody, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { creaService } from '../../../utils/crea.service'
import { requireAdmin } from '../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  // Verify admin access
  const user = await requireAdmin(event)

  const body = await readBody(event)
  const { filters = {} } = body

  try {
    // Fetch properties from CREA
    console.log('Fetching properties from CREA...', filters)
    const creProperties = await creaService.getProperties(filters)
    console.log(`Found ${creProperties.length} CREA properties`)

    let syncStats = {
      total: creProperties.length,
      created: 0,
      updated: 0,
      errors: 0,
      errorDetails: [] as string[]
    }

    // Process each CREA property
    for (const creaProp of creProperties) {
      try {
        // CRITICAL: Fetch agent and office data for each property before storing
        let agentData = undefined
        try {
          console.log(`🔍 Fetching agent/office data for ${creaProp.ListingKey}...`)
          const propertyWithAgents = await creaService.getPropertyWithAgentDetails(creaProp.ListingKey)
          
          if (propertyWithAgents.property) {
            agentData = {
              listingAgent: propertyWithAgents.listingAgent,
              listingOffice: propertyWithAgents.listingOffice,
              coListingAgents: propertyWithAgents.coListingAgents,
              coListingOffices: propertyWithAgents.coListingOffices
            }
            console.log(`📋 Agent: ${agentData.listingAgent?.MemberFullName || 'No agent'} @ ${agentData.listingOffice?.OfficeName || 'No office'}`)
          } else {
            console.warn(`⚠️ Property ${creaProp.ListingKey} not found when fetching agent details`)
          }
        } catch (agentError) {
          console.warn(`⚠️ Failed to fetch agent data for ${creaProp.ListingKey}:`, agentError.message)
        }

        const transformedProperty = creaService.transformToLocalProperty(creaProp, agentData)
        
        // Skip if transformer returned null (likely commercial property)
        if (!transformedProperty) {
          console.log(`🏢 SKIPPING property ${creaProp.ListingKey} - filtered out by transformer (likely commercial)`)
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
        } else {
          // Create new property
          await prisma.property.create({
            data: {
              ...propertyData,
              lastSyncAt: new Date()
            }
          })
          syncStats.created++
        }
      } catch (error) {
        console.error(`Error processing CREA property ${creaProp.ListingKey}:`, error)
        syncStats.errors++
        syncStats.errorDetails.push(`Property ${creaProp.ListingKey}: ${error.message}`)
      }
    }

    // Mark stale properties as inactive (optional)
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
    const staleProperties = await prisma.property.updateMany({
      where: {
        source: 'crea',
        lastSyncAt: {
          lt: cutoffDate
        },
        status: 'for_sale'
      },
      data: {
        status: 'sold' // Mark as sold to hide from active listings
      }
    })

    console.log('CREA sync completed:', syncStats)
    
    return {
      success: true,
      stats: syncStats,
      stalePropertiesMarked: staleProperties.count,
      message: `Sync completed: ${syncStats.created} created, ${syncStats.updated} updated, ${syncStats.errors} errors`
    }
  } catch (error) {
    console.error('CREA sync error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Sync failed: ${error.message}`
    })
  }
})
