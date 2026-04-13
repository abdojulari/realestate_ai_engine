import { defineEventHandler, readBody, createError } from 'h3'
import { creaService } from '../../../utils/crea.service'
import { resolveCreaSyncAdminId } from '../../../utils/crea-sync-admin'
import { requireAdmin } from '../../../utils/auth'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  // Verify admin access
  const user = await requireAdmin(event)

  const body = await readBody(event)
  const { filters = {} } = body

  try {
    const creaAdminId = await resolveCreaSyncAdminId(prisma)
    if (creaAdminId != null) {
      console.log(`CREA sync: attaching listings to adminId=${creaAdminId}`)
    }

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
        } catch (agentError: any) {
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

        const newPrice = propertyData.price || 0

        if (existingProperty) {
          // Detect price change and record it
          const oldPrice = existingProperty.price
          if (oldPrice && newPrice && oldPrice !== newPrice) {
            const changeAmt = newPrice - oldPrice
            const changePct = parseFloat(((changeAmt / oldPrice) * 100).toFixed(2))
            const priceEvent = changeAmt < 0 ? 'price_decrease' : 'price_increase'
            try {
              await prisma.propertyPriceHistory.create({
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

          // If Pillar9 already marked this property as sold/terminated/withdrawn,
          // don't let CREA overwrite it back to 'for_sale' since CREA DDF only
          // knows about active listings and lacks non-active status data.
          const pillar9AuthoritativeStatuses = ['sold', 'terminated', 'withdrawn']
          const preserveStatus = pillar9AuthoritativeStatuses.includes(existingProperty.status)
            && propertyData.status === 'for_sale'

          const updatePayload = {
            ...propertyData,
            ...(creaAdminId != null ? { adminId: creaAdminId } : {}),
            lastSyncAt: new Date(),
            views: existingProperty.views,
            createdAt: existingProperty.createdAt,
            firstEntryPrice: existingProperty.firstEntryPrice ?? existingProperty.price,
            ...(preserveStatus ? { status: existingProperty.status } : {})
          }

          await prisma.property.update({
            where: { id: existingProperty.id },
            data: updatePayload
          })
          syncStats.updated++
        } else {
          // Create new property – set firstEntryPrice = current price
          const created = await prisma.property.create({
            data: {
              ...propertyData,
              ...(creaAdminId != null ? { adminId: creaAdminId } : {}),
              lastSyncAt: new Date(),
              firstEntryPrice: newPrice
            }
          })
          // Record initial listing
          try {
            await prisma.propertyPriceHistory.create({
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
      } catch (error: any) {
        console.error(`Error processing CREA property ${creaProp.ListingKey}:`, error)
        syncStats.errors++
        syncStats.errorDetails.push(`Property ${creaProp.ListingKey}: ${error.message}`)
      }
    }

    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const staleProperties = await prisma.property.updateMany({
      where: {
        source: 'crea',
        lastSyncAt: { lt: cutoffDate },
        status: 'for_sale'
      },
      data: { status: 'expired' }
    })

    console.log('CREA sync completed:', syncStats)

    // Auto-populate neighborhoods from SubdivisionName in property features
    let neighborhoodStats = null
    try {
      console.log('📍 Starting neighborhood population from SubdivisionName...')
      const { populateNeighborhoods } = await import('../neighborhoods/populate-util')
      neighborhoodStats = await populateNeighborhoods(prisma)
      console.log('✅ Neighborhood population complete:', neighborhoodStats)
    } catch (err: any) {
      console.warn('⚠️ Neighborhood population failed (non-critical):', err.message)
    }
    
    return {
      success: true,
      stats: syncStats,
      stalePropertiesMarked: staleProperties.count,
      neighborhoodStats,
      message: `Sync completed: ${syncStats.created} created, ${syncStats.updated} updated, ${syncStats.errors} errors`
    }
  } catch (error: any) {
    console.error('CREA sync error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Sync failed: ${error.message}`
    })
  }
})
