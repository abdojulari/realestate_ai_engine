import { defineEventHandler, readBody, createError } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
    await prisma.setting.upsert({
      where: { key: 'sync_status' },
      update: { value: 'running' },
      create: { key: 'sync_status', value: 'running' }
    })

    // Start background sync without blocking the response
    // This will run asynchronously
    setImmediate(async () => {
      try {
        console.log('🔄 Starting background CREA sync...', { scheduled, filters })
        
        // Update progress
        await prisma.setting.upsert({
          where: { key: 'sync_progress' },
          update: { value: JSON.stringify({ progress: 10, text: 'Connecting to CREA API...' }) },
          create: { key: 'sync_progress', value: JSON.stringify({ progress: 10, text: 'Connecting to CREA API...' }) }
        })
        
        // Import CREA service directly
        const { creaService } = await import('../../../utils/crea.service')

        // Update progress
        await prisma.setting.upsert({
          where: { key: 'sync_progress' },
          update: { value: JSON.stringify({ progress: 20, text: 'Fetching properties from CREA...' }) },
          create: { key: 'sync_progress', value: JSON.stringify({ progress: 20, text: 'Fetching properties from CREA...' }) }
        })

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
        await prisma.setting.upsert({
          where: { key: 'sync_progress' },
          update: { value: JSON.stringify({ progress: 30, text: `Processing ${creProperties.length} properties...` }) },
          create: { key: 'sync_progress', value: JSON.stringify({ progress: 30, text: `Processing ${creProperties.length} properties...` }) }
        })

        // Process properties in batches to avoid memory issues
        const batchSize = 10
        const totalBatches = Math.ceil(creProperties.length / batchSize)
        
        for (let i = 0; i < creProperties.length; i += batchSize) {
          const batch = creProperties.slice(i, i + batchSize)
          const currentBatch = Math.floor(i / batchSize) + 1
          
          // Update progress
          const progress = 30 + Math.floor((currentBatch / totalBatches) * 60)
          await prisma.setting.upsert({
            where: { key: 'sync_progress' },
            update: { value: JSON.stringify({ 
              progress, 
              text: `Processing batch ${currentBatch}/${totalBatches} (${syncStats.created + syncStats.updated} processed)` 
            }) },
            create: { key: 'sync_progress', value: JSON.stringify({ 
              progress, 
              text: `Processing batch ${currentBatch}/${totalBatches} (${syncStats.created + syncStats.updated} processed)` 
            }) }
          })
          
          for (const creaProp of batch) {
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
              
              // Upsert property
              const existingProperty = await prisma.property.findFirst({
                where: { source: 'crea', externalId: creaProp.ListingKey }
              })

              if (existingProperty) {
                await prisma.property.update({
                  where: { id: existingProperty.id },
                  data: { ...propertyData, lastSyncAt: new Date() }
                })
                syncStats.updated++
              } else {
                await prisma.property.create({
                  data: { ...propertyData, lastSyncAt: new Date() }
                })
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
        await prisma.setting.upsert({
          where: { key: 'sync_progress' },
          update: { value: JSON.stringify({ progress: 100, text: 'Sync completed!' }) },
          create: { key: 'sync_progress', value: JSON.stringify({ progress: 100, text: 'Sync completed!' }) }
        })

        // Store sync results
        await prisma.setting.upsert({
          where: { key: 'last_sync_result' },
          update: { value: JSON.stringify(syncStats) },
          create: { key: 'last_sync_result', value: JSON.stringify(syncStats) }
        })

        // Set sync status to completed
        await prisma.setting.upsert({
          where: { key: 'sync_status' },
          update: { value: 'completed' },
          create: { key: 'sync_status', value: 'completed' }
        })
        
        console.log('✅ Background CREA sync completed:', syncStats)
        
      } catch (error) {
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
        
        await prisma.setting.upsert({
          where: { key: 'last_sync_result' },
          update: { value: JSON.stringify(errorResult) },
          create: { key: 'last_sync_result', value: JSON.stringify(errorResult) }
        })

        await prisma.setting.upsert({
          where: { key: 'sync_status' },
          update: { value: 'error' },
          create: { key: 'sync_status', value: 'error' }
        })
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
