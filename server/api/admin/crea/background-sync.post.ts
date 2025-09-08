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
    // Start background sync without blocking the response
    // This will run asynchronously
    setImmediate(async () => {
      try {
        console.log('🔄 Starting background CREA sync...', { scheduled, filters })
        
        // Import CREA service directly
        const { creaService } = await import('../../../utils/crea.service')
        
        // Get system user for CREA listings
        let systemUser = await prisma.user.findFirst({
          where: { email: 'system@suhani.com' }
        })

        if (!systemUser) {
          systemUser = await prisma.user.create({
            data: {
              email: 'system@suhani.com',
              firstName: 'System',
              lastName: 'MLS',
              role: 'agent',
              provider: 'system'
            }
          })
        }

        // Fetch properties from CREA
        const creProperties = await creaService.getProperties(filters)
        console.log(`📊 Found ${creProperties.length} CREA properties to sync`)

        let syncStats = {
          total: creProperties.length,
          created: 0,
          updated: 0,
          errors: 0
        }

        // Process properties in batches to avoid memory issues
        const batchSize = 10
        for (let i = 0; i < creProperties.length; i += batchSize) {
          const batch = creProperties.slice(i, i + batchSize)
          
          for (const creaProp of batch) {
            try {
              const transformedProperty = creaService.transformToSuhaniProperty(creaProp, systemUser.id)
              
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
        
        console.log('✅ Background CREA sync completed:', syncStats)
        
      } catch (error) {
        console.error('❌ Background sync failed:', error)
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
