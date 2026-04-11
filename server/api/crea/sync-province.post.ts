import { defineEventHandler, readBody, createError } from 'h3'
import { creaService } from '../../utils/crea.service'
import { resolveCreaSyncAdminId } from '../../utils/crea-sync-admin'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

async function ensurePrismaConnected() {
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch {
    console.warn('[sync-province] DB connection lost, reconnecting...')
    await prisma.$disconnect().catch(() => {})
    await prisma.$connect()
  }
}

/**
 * Generic CREA sync endpoint that accepts any Canadian province
 * 
 * Body parameters:
 *   - province: The province to sync (e.g., "Ontario", "Alberta")
 *   - limit: Maximum number of properties to fetch (default: 100)
 *   - offset: Number of properties to skip for pagination (default: 0)
 *   - batchSize: Processing batch size (default: 10)
 *   - includeAgentData: Whether to fetch agent data (default: true)
 *   - standardStatus: CREA RESO status(es) to fetch (default: ['Active']). 
 *       Off-market: ['Expired','Withdrawn','Canceled']. All RESO values:
 *       Active, ActiveUnderContract, Closed, Pending, Expired, Withdrawn, Canceled, Hold, Delete.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { 
    province = 'Alberta', 
    city = null,
    limit = 100, 
    offset = 0,
    batchSize = 10, 
    includeAgentData = true,
    standardStatus = null as string | string[] | null
  } = body

  const locationLabel = city ? `${city}, ${province}` : province

  try {
    await ensurePrismaConnected()
    const creaAdminId = await resolveCreaSyncAdminId(prisma)
    if (creaAdminId != null) {
      console.log(`CREA sync: attaching listings to adminId=${creaAdminId} (super_admin / SUPER_ADMIN_EMAIL)`)
    }

    console.log(`🍁 Starting ${locationLabel} CREA sync with agent data (limit: ${limit})`)
    
    const filters: any = {
      province: province,
      $top: limit,
      $skip: offset
    }
    
    if (standardStatus) {
      filters.standardStatus = Array.isArray(standardStatus) ? standardStatus : [standardStatus]
    }
    
    // Add city filter if specified
    if (city) {
      filters.city = city
    }
    
    const creaProperties = await creaService.getProperties(filters)
    console.log(`Found ${creaProperties.length} ${province} CREA properties`)

    const syncStats = {
      total: creaProperties.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      errorDetails: [] as string[],
      agentDataFetched: 0,
      agentDataErrors: 0,
      province: province
    }

    // Process properties in batches
    const totalBatches = Math.ceil(creaProperties.length / batchSize)
    
    for (let i = 0; i < creaProperties.length; i += batchSize) {
      const batch = creaProperties.slice(i, i + batchSize)
      const currentBatch = Math.floor(i / batchSize) + 1
      
      console.log(`[${province}] Processing batch ${currentBatch}/${totalBatches} (${batch.length} properties)`)
      
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

          if (existingProperty) {
            // Don't let CREA overwrite statuses set by Pillar9 (sold, terminated, etc.)
            const pillar9AuthoritativeStatuses = ['sold', 'terminated', 'withdrawn']
            const preserveStatus = pillar9AuthoritativeStatuses.includes(existingProperty.status)
              && propertyData.status === 'for_sale'

            await prisma.property.update({
              where: { id: existingProperty.id },
              data: {
                ...propertyData,
                ...(creaAdminId != null ? { adminId: creaAdminId } : {}),
                lastSyncAt: new Date(),
                views: existingProperty.views,
                createdAt: existingProperty.createdAt,
                ...(preserveStatus ? { status: existingProperty.status } : {})
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
                lastSyncAt: new Date()
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

    console.log(`${province} CREA sync with agent data completed!`)
    
    return {
      success: true,
      province: province,
      total: syncStats.total,
      created: syncStats.created,
      updated: syncStats.updated,
      skipped: syncStats.skipped,
      errors: syncStats.errors,
      agentDataFetched: syncStats.agentDataFetched,
      agentDataErrors: syncStats.agentDataErrors,
      errorDetails: syncStats.errorDetails,
      message: `${province} sync completed: ${syncStats.created} created, ${syncStats.updated} updated, ${syncStats.skipped} skipped, ${syncStats.errors} errors. Agent data: ${syncStats.agentDataFetched} fetched, ${syncStats.agentDataErrors} errors.`
    }
    
  } catch (error: any) {
    console.error(`${province} CREA sync failed:`, error)
    throw createError({
      statusCode: 500,
      statusMessage: `${province} sync failed: ${error.message}`
    })
  }
})
