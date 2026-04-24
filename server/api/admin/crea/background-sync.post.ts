import { defineEventHandler, readBody, createError } from 'h3'
import { resolveCreaSyncAdminId } from '../../../utils/crea-sync-admin'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


/** Upsert a system-level setting (owned by first super_admin) */
async function upsertSysSetting(key: string, value: string) {
  const sa = await prisma.user.findFirst({ where: { role: 'super_admin' }, select: { id: true } })
  const adminId = sa?.id ?? null
  if (!adminId) {
    // Fallback: just create without adminId (nullable)
    const existing = await (prisma.setting as any).findFirst({ where: { key, adminId: null } })
    if (existing) await prisma.setting.update({ where: { id: existing.id }, data: { value } })
    else await (prisma.setting as any).create({ data: { key, value } })
    return
  }
  await (prisma.setting as any).upsert({
    where: { adminId_key: { adminId, key } },
    update: { value },
    create: { adminId, key, value },
  })
}

export default defineEventHandler(async (event) => {
  // For scheduled syncs, we'll bypass auth check
  // For manual syncs, we'll require admin
  const { scheduled = false, filters = {} } = await readBody(event)
  
  if (!scheduled) {
    const { requireAdmin } = await import('../../../utils/auth')
    await requireAdmin(event)
  }

  try {
    // Set sync status to running
    await upsertSysSetting('sync_status', 'running')

    // Start background sync without blocking the response
    // This will run asynchronously
    setImmediate(async () => {
      try {
        console.log('🔄 Starting background CREA sync...', { scheduled, filters })
        
        // Update progress
        await upsertSysSetting('sync_progress', JSON.stringify({ progress: 10, text: 'Connecting to CREA API...' }))
        
        // Import CREA service directly
        const { creaService } = await import('../../../utils/crea.service')

        const creaAdminId = await resolveCreaSyncAdminId(prisma)
        if (creaAdminId != null) {
          console.log(`CREA background sync: attaching listings to adminId=${creaAdminId}`)
        }

        // Update progress
        await upsertSysSetting('sync_progress', JSON.stringify({ progress: 20, text: 'Fetching properties from CREA...' }))

        // Fetch properties from CREA
        const creProperties = await creaService.getProperties(filters)
        console.log(`📊 Found ${creProperties.length} CREA properties to sync`)

        let syncStats = {
          total: creProperties.length,
          created: 0,
          updated: 0,
          errors: 0,
          timestamp: new Date().toISOString()
        }

        // Update progress
        await upsertSysSetting('sync_progress', JSON.stringify({ progress: 30, text: `Processing ${creProperties.length} properties...` }))

        // Process properties in batches to avoid memory issues
        const batchSize = 10
        const totalBatches = Math.ceil(creProperties.length / batchSize)
        
        for (let i = 0; i < creProperties.length; i += batchSize) {
          const batch = creProperties.slice(i, i + batchSize)
          const currentBatch = Math.floor(i / batchSize) + 1
          
          // Update progress
          const progress = 30 + Math.floor((currentBatch / totalBatches) * 60)
          await upsertSysSetting('sync_progress', JSON.stringify({ 
            progress, 
            text: `Processing batch ${currentBatch}/${totalBatches} (${syncStats.created + syncStats.updated} processed)` 
          }))
          
          for (const creaProp of batch) {
            try {
              // CRITICAL: Fetch agent and office data PLUS the full property
              // with its Media collection. The bulk /Property feed (creaProp)
              // does NOT include Media — only the per-listing fetch does — so
              // we must use the enriched record from getPropertyWithAgentDetails
              // for the transform. Falling back to creaProp keeps non-image
              // fields working even if the enrichment call fails.
              let agentData = undefined
              let propertyForTransform: any = creaProp
              try {
                console.log(`🔍 Fetching agent/office data for ${creaProp.ListingKey}...`)
                const propertyWithAgents = await creaService.getPropertyWithAgentDetails(creaProp.ListingKey)
                
                if (propertyWithAgents.property) {
                  propertyForTransform = propertyWithAgents.property
                  agentData = {
                    listingAgent: propertyWithAgents.listingAgent,
                    listingOffice: propertyWithAgents.listingOffice,
                    coListingAgents: propertyWithAgents.coListingAgents,
                    coListingOffices: propertyWithAgents.coListingOffices
                  }
                  const mediaCount = propertyWithAgents.property.Media?.length ?? 0
                  console.log(`📋 Agent: ${agentData.listingAgent?.MemberFullName || 'No agent'} @ ${agentData.listingOffice?.OfficeName || 'No office'} (${mediaCount} media)`)
                } else {
                  console.warn(`⚠️ Property ${creaProp.ListingKey} not found when fetching agent details — saving without Media`)
                }
              } catch (agentError: any) {
                console.warn(`⚠️ Failed to fetch agent data for ${creaProp.ListingKey}:`, agentError.message)
              }

              const transformedProperty = creaService.transformToLocalProperty(propertyForTransform, agentData)
              
              // Skip if transformer returned null (likely commercial property)
              if (!transformedProperty) {
                console.log(`🏢 SKIPPING property ${creaProp.ListingKey} - filtered out by transformer (likely commercial)`)
                continue
              }
              
              // Remove relation fields that shouldn't be in the create/update data
              const { user, agent, isSaved, ...propertyData } = transformedProperty as any
              
              // Upsert property
              const existingProperty: any = await prisma.property.findFirst({
                where: { source: 'crea', externalId: creaProp.ListingKey }
              })

              const newPrice = propertyData.price || 0

              if (existingProperty) {
                // Detect price change and record it
                const oldPrice = existingProperty.price
                if (oldPrice && newPrice && oldPrice !== newPrice) {
                  const changeAmt = newPrice - oldPrice
                  const changePct = parseFloat(((changeAmt / oldPrice) * 100).toFixed(2))
                  const priceEvent = changeAmt < 0 ? 'price_decrease' : 'price_increase'
                  try {
                    await (prisma as any).propertyPriceHistory.create({
                      data: {
                        propertyId: existingProperty.id,
                        price: newPrice,
                        event: priceEvent,
                        changeAmt,
                        changePct,
                        source: 'crea'
                      }
                    })
                  } catch (_priceErr) {
                    // Non-critical – don't fail the sync
                  }
                }

                // Don't let CREA overwrite statuses set by Pillar9 (sold, terminated, etc.)
                const pillar9AuthoritativeStatuses = ['sold', 'terminated', 'withdrawn']
                const preserveStatus = pillar9AuthoritativeStatuses.includes(existingProperty.status)
                  && propertyData.status === 'for_sale'

                await (prisma.property as any).update({
                  where: { id: existingProperty.id },
                  data: {
                    ...propertyData,
                    ...(creaAdminId != null ? { adminId: creaAdminId } : {}),
                    lastSyncAt: new Date(),
                    firstEntryPrice: existingProperty.firstEntryPrice ?? existingProperty.price,
                    ...(preserveStatus ? { status: existingProperty.status } : {})
                  }
                })
                syncStats.updated++
              } else {
                const created: any = await (prisma.property as any).create({
                  data: {
                    ...propertyData,
                    ...(creaAdminId != null ? { adminId: creaAdminId } : {}),
                    lastSyncAt: new Date(),
                    firstEntryPrice: newPrice
                  }
                })
                // Record initial listing price
                try {
                  await (prisma as any).propertyPriceHistory.create({
                    data: {
                      propertyId: created.id,
                      price: newPrice,
                      event: 'listed',
                      source: 'crea'
                    }
                  })
                } catch (_priceErr) {
                  // Non-critical
                }
                syncStats.created++
              }
            } catch (error) {
              syncStats.errors++
              console.error(`❌ Error processing property ${creaProp.ListingKey}:`, error)
            }
          }
          
          // Small delay between batches
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        // Final progress update
        await upsertSysSetting('sync_progress', JSON.stringify({ progress: 100, text: 'Sync completed!' }))

        // Store sync results
        await upsertSysSetting('last_sync_result', JSON.stringify(syncStats))

        // Auto-populate neighborhoods from SubdivisionName
        try {
          console.log('📍 Starting neighborhood population from SubdivisionName...')
          const { populateNeighborhoods } = await import('../neighborhoods/populate-util')
          const nhStats = await populateNeighborhoods(prisma)
          console.log('✅ Neighborhood population complete:', nhStats)
          syncStats.neighborhoodStats = nhStats
        } catch (nhErr: any) {
          console.warn('⚠️ Neighborhood population failed (non-critical):', nhErr.message)
        }

        // Set sync status to completed
        await upsertSysSetting('sync_status', 'completed')

        console.log('✅ Background CREA sync completed:', syncStats)
        
      } catch (error: any) {
        console.error('❌ Background sync failed:', error)
        
        // Store error result
        const errorResult = {
          total: 0,
          created: 0,
          updated: 0,
          errors: 1,
          timestamp: new Date().toISOString(),
          error: error.message
        }
        
        await upsertSysSetting('last_sync_result', JSON.stringify(errorResult))

        await upsertSysSetting('sync_status', 'error')
      }
    })

    // Return immediately without waiting for sync to complete
    return {
      success: true,
      message: 'Background sync started',
      status: 'running'
    }
  } catch (error: any) {
    console.error('❌ Failed to start background sync:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to start background sync'
    })
  }
})
