import { defineEventHandler, readBody, createError } from 'h3'
import { creaService } from '../../utils/crea.service'
import { resolveCreaSyncAdminId } from '../../utils/crea-sync-admin'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { limit = 100, batchSize = 10, includeAgentData = true } = body

  try {
    const creaAdminId = await resolveCreaSyncAdminId(prisma)
    if (creaAdminId != null) {
      console.log(`CREA sync: attaching listings to adminId=${creaAdminId}`)
    }

    console.log(`🍁 Starting Alberta CREA sync with agent data (limit: ${limit})`)
    
    // Fetch properties from CREA - Alberta specific filter
    // Use simplified approach to avoid complex filter issues
    const filters = {
      province: 'Alberta', // This will be handled more simply in the service
      $top: limit
    }
    
    const creaProperties = await creaService.getProperties(filters)
    console.log(`Found ${creaProperties.length} Alberta CREA properties`)

    const syncStats = {
      total: creaProperties.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      errorDetails: [] as string[],
      agentDataFetched: 0,
      agentDataErrors: 0
    }

    // Process properties in batches
    const totalBatches = Math.ceil(creaProperties.length / batchSize)
    
    for (let i = 0; i < creaProperties.length; i += batchSize) {
      const batch = creaProperties.slice(i, i + batchSize)
      const currentBatch = Math.floor(i / batchSize) + 1
      
      console.log(`Processing batch ${currentBatch}/${totalBatches} (${batch.length} properties)`)
      
      for (const creaProp of batch) {
        try {
          let agentData = undefined
          
          // ALWAYS fetch individual property to get Media (images)
          // The bulk fetch doesn't include Media, only individual fetch does
          let propertyWithMedia = creaProp
          
          try {
            console.log(`Fetching full property data for ${creaProp.ListingKey}...`)
            const propertyWithAgents = await creaService.getPropertyWithAgentDetails(creaProp.ListingKey)
            
            if (propertyWithAgents.property) {
              // Use the property with Media from individual fetch
              propertyWithMedia = propertyWithAgents.property
              
              if (includeAgentData) {
                agentData = {
                  listingAgent: propertyWithAgents.listingAgent,
                  listingOffice: propertyWithAgents.listingOffice,
                  coListingAgents: propertyWithAgents.coListingAgents,
                  coListingOffices: propertyWithAgents.coListingOffices
                }
                syncStats.agentDataFetched++
                console.log(`Agent: ${agentData.listingAgent?.MemberFullName || 'No agent'} @ ${agentData.listingOffice?.OfficeName || 'No office'}`)
              }
            } else {
              console.warn(`Property ${creaProp.ListingKey} not found when fetching details`)
            }
          } catch (fetchError: any) {
            console.warn(`Failed to fetch property data for ${creaProp.ListingKey}:`, fetchError.message)
            if (includeAgentData) syncStats.agentDataErrors++
          }

          // Transform property WITH Media data
          const transformedProperty = creaService.transformToLocalProperty(propertyWithMedia, agentData)
          
          // Skip if transformer returned null (likely commercial property)
          if (!transformedProperty) {
            console.log(`SKIPPING property ${creaProp.ListingKey} - filtered out by transformer (likely commercial)`)
            syncStats.skipped++
            continue
          }
          
          // Check if property already exists
          const existingProperty = await prisma.property.findFirst({
            where: {
              source: 'crea',
              externalId: creaProp.ListingKey
            }
          })

          // Remove relation fields that shouldn't be in the create/update data
          const { user, agent, isSaved, ...propertyData } = transformedProperty as any

          // Debug: Log images being saved
          const imageCount = Array.isArray(propertyData.images) ? propertyData.images.length : 0
          if (imageCount === 0) {
            console.warn(`Property ${creaProp.ListingKey} has 0 images - Media in API: ${creaProp.Media?.length || 0}`)
          }

          // Baseline for the Best Deals page. transformToLocalProperty already
          // copies CREA's RESO `OriginalListPrice` into propertyData when the
          // feed exposes it (Pillar9 / Calgary board does, the Edmonton REALTORS
          // board often does not — see crea.service.ts:1057). When OLP is
          // missing, firstEntryPrice is the only signal the deals query has, so
          // we set it on every create AND lazily on update for legacy rows that
          // were synced through here BEFORE this patch landed (~6.7k Edmonton
          // CREA rows had NULL on both columns and never appeared as deals).
          const newPrice = propertyData.price || 0

          if (existingProperty) {
            // Update existing property
            await prisma.property.update({
              where: { id: existingProperty.id },
              data: {
                ...propertyData,
                ...(creaAdminId != null ? { adminId: creaAdminId } : {}),
                lastSyncAt: new Date(),
                // Preserve local data
                views: existingProperty.views,
                createdAt: existingProperty.createdAt,
                firstEntryPrice: existingProperty.firstEntryPrice ?? existingProperty.price
              }
            })
            syncStats.updated++
            console.log(`Updated: ${transformedProperty.title}`)
          } else {
            // Create new property
            await prisma.property.create({
              data: {
                ...propertyData,
                ...(creaAdminId != null ? { adminId: creaAdminId } : {}),
                lastSyncAt: new Date(),
                firstEntryPrice: newPrice
              }
            })
            syncStats.created++
            console.log(`Created: ${transformedProperty.title}`)
          }
          
        } catch (error: any) {
          console.error(`Error processing property ${creaProp.ListingKey}:`, error.message)
          syncStats.errors++
          syncStats.errorDetails.push(`Property ${creaProp.ListingKey}: ${error.message}`)
        }
      }
      
      // Small delay between batches
      if (i + batchSize < creaProperties.length) {
        console.log('Waiting 1 second before next batch...')
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    console.log('Alberta CREA sync with agent data completed!')
    
    return {
      success: true,
      total: syncStats.total,
      created: syncStats.created,
      updated: syncStats.updated,
      skipped: syncStats.skipped,
      errors: syncStats.errors,
      agentDataFetched: syncStats.agentDataFetched,
      agentDataErrors: syncStats.agentDataErrors,
      errorDetails: syncStats.errorDetails,
      message: `Alberta sync completed: ${syncStats.created} created, ${syncStats.updated} updated, ${syncStats.skipped} skipped, ${syncStats.errors} errors. Agent data: ${syncStats.agentDataFetched} fetched, ${syncStats.agentDataErrors} errors.`
    }
    
  } catch (error: any) {
    console.error('Alberta CREA sync failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Alberta sync failed: ${error.message}`
    })
  }
})