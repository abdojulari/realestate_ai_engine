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
        
        // Get system user for CREA listings
        let systemUser = await prisma.user.findFirst({
          where: { email: 'system@abdul.com' }
        })

        if (!systemUser) {
          systemUser = await prisma.user.create({
            data: {
              email: 'system@abdul.com',
              firstName: 'System',
              lastName: 'MLS',
              role: 'agent',
              provider: 'system'
            }
          })
        }

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
              const transformedProperty = creaService.transformToLocalProperty(creaProp, systemUser.id)
              
              // Upsert property
              const existingProperty = await prisma.property.findFirst({
                where: { source: 'crea', externalId: creaProp.ListingKey }
              })

              if (existingProperty) {
                await prisma.property.update({
                  where: { id: existingProperty.id },
                  data: { ...transformedProperty, lastSyncAt: new Date() }
                })
                syncStats.updated++
              } else {
                await prisma.property.create({
                  data: { ...transformedProperty, lastSyncAt: new Date() }
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
