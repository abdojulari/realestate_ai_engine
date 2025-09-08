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
    // Get system user for CREA listings (create if doesn't exist)
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
        const transformedProperty = creaService.transformToSuhaniProperty(creaProp, systemUser.id)
        
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
              ...transformedProperty,
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
              ...transformedProperty,
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
