import { defineEventHandler, readBody, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { pillar9Service } from '../../../utils/pillar9.service'
import { requireAdmin } from '../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  // Verify admin access
  await requireAdmin(event)

  // Initialize service with runtime config
  const config = useRuntimeConfig()
  pillar9Service.initConfig({
    clientId: config.pillar9ClientId,
    clientSecret: config.pillar9ClientSecret,
    tokenHost: config.pillar9TokenHost,
    apiHost: config.pillar9ApiHost
  })

  const body = await readBody(event)
  const { 
    filters = {},
    syncSold = false,
    syncPending = false,
    deduplicateWithCrea = true
  } = body

  try {
    // Check if Pillar9 is configured
    const configStatus = pillar9Service.getConfigStatus()
    if (!configStatus.configured) {
      throw createError({
        statusCode: 400,
        statusMessage: configStatus.message
      })
    }

    console.log('🏠 Starting Pillar9 property sync...', { filters, syncSold, syncPending })

    let syncStats = {
      total: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      duplicates: 0,
      errors: 0,
      errorDetails: [] as string[],
      byStatus: {
        active: { created: 0, updated: 0 },
        sold: { created: 0, updated: 0 },
        pending: { created: 0, updated: 0 }
      }
    }

    // Define statuses to sync
    const statusesToSync: Array<'A' | 'S' | 'P'> = ['A'] // Always sync active
    if (syncSold) statusesToSync.push('S')
    if (syncPending) statusesToSync.push('P')

    // Fetch and process properties for each status
    for (const status of statusesToSync) {
      const statusName = status === 'A' ? 'Active' : status === 'S' ? 'Sold' : 'Pending'
      console.log(`\n📊 Fetching ${statusName} properties from Pillar9...`)

      try {
        const properties = await pillar9Service.getProperties({
          status,
          city: filters.city,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
          province: filters.province || 'AB', // Default to Alberta
          limit: filters.limit || 100
        })

        console.log(`📦 Found ${properties.length} ${statusName} properties`)
        syncStats.total += properties.length

        // Process each property
        for (const p9Prop of properties) {
          try {
            const transformedProperty = pillar9Service.transformToLocalProperty(p9Prop)
            
            // Skip if transformer returned null (likely commercial)
            if (!transformedProperty) {
              console.log(`🏢 Skipping property ${p9Prop.ListingId} - filtered out (likely commercial)`)
              syncStats.skipped++
              continue
            }

            // Check for duplicates with CREA if enabled
            if (deduplicateWithCrea && transformedProperty.mlsNumber) {
              const existingCrea = await prisma.property.findFirst({
                where: {
                  source: 'crea',
                  mlsNumber: transformedProperty.mlsNumber
                }
              })

              if (existingCrea) {
                console.log(`🔄 Duplicate found in CREA: ${transformedProperty.mlsNumber} - skipping`)
                syncStats.duplicates++
                continue
              }
            }

            // Remove relation fields that shouldn't be in the create/update data
            const { user, agent, isSaved, ...propertyData } = transformedProperty as any

            // Check if property already exists in Pillar9 source
            const existingProperty = await prisma.property.findFirst({
              where: {
                source: 'pillar9',
                externalId: p9Prop.ListingKey
              }
            })

            const statusKey = status === 'A' ? 'active' : status === 'S' ? 'sold' : 'pending'

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
              syncStats.byStatus[statusKey].updated++
            } else {
              // Create new property
              await prisma.property.create({
                data: {
                  ...propertyData,
                  lastSyncAt: new Date()
                }
              })
              syncStats.created++
              syncStats.byStatus[statusKey].created++
            }
          } catch (propError: any) {
            console.error(`❌ Error processing property ${p9Prop.ListingId}:`, propError.message)
            syncStats.errors++
            syncStats.errorDetails.push(`Property ${p9Prop.ListingId}: ${propError.message}`)
          }
        }
      } catch (statusError: any) {
        console.error(`❌ Error fetching ${statusName} properties:`, statusError.message)
        syncStats.errors++
        syncStats.errorDetails.push(`${statusName} fetch failed: ${statusError.message}`)
      }
    }

    // Mark stale Pillar9 properties as inactive (properties not updated in 7 days)
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const staleProperties = await prisma.property.updateMany({
      where: {
        source: 'pillar9',
        lastSyncAt: {
          lt: cutoffDate
        },
        status: 'for_sale'
      },
      data: {
        status: 'sold'
      }
    })

    // Save sync timestamp to settings
    await prisma.setting.upsert({
      where: { key: 'pillar9_last_sync' },
      update: { value: new Date().toISOString() },
      create: { key: 'pillar9_last_sync', value: new Date().toISOString() }
    })

    console.log('\n✅ Pillar9 sync completed:', syncStats)

    return {
      success: true,
      stats: syncStats,
      stalePropertiesMarked: staleProperties.count,
      message: `Sync completed: ${syncStats.created} created, ${syncStats.updated} updated, ${syncStats.duplicates} duplicates skipped, ${syncStats.errors} errors`
    }
  } catch (error: any) {
    console.error('❌ Pillar9 sync error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Sync failed: ${error.message}`
    })
  }
})
