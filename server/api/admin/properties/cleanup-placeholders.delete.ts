import { defineEventHandler, readBody, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter } from '../../../utils/tenant'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)

  try {
    console.log('🗑️ Starting cleanup of CREA properties with placeholder images...')
    
    // Find all CREA properties with placeholder images, scoped to tenant
    const propertiesWithPlaceholders = await prisma.property.findMany({
      where: {
        source: 'crea',
        images: {
          string_contains: 'property-placeholder.svg'
        },
        ...tenantFilter
      },
      select: {
        id: true,
        title: true,
        externalId: true,
        mlsNumber: true,
        images: true
      }
    })

    console.log(`📊 Found ${propertiesWithPlaceholders.length} CREA properties with placeholders`)

    if (propertiesWithPlaceholders.length === 0) {
      return {
        success: true,
        message: 'No CREA properties with placeholders found',
        deleted: 0
      }
    }

    // Delete these properties - they're invalid for MLS
    const deleteResult = await prisma.property.deleteMany({
      where: {
        id: {
          in: propertiesWithPlaceholders.map(p => p.id)
        },
        ...tenantFilter
      }
    })

    console.log(`✅ Deleted ${deleteResult.count} CREA properties with invalid placeholder images`)
    
    // Log the deleted properties
    propertiesWithPlaceholders.forEach(prop => {
      console.log(`🗑️ Deleted: ${prop.mlsNumber || prop.externalId} - ${prop.title}`)
    })

    return {
      success: true,
      message: `Successfully deleted ${deleteResult.count} CREA properties with placeholder images`,
      deleted: deleteResult.count,
      deletedProperties: propertiesWithPlaceholders.map(p => ({
        id: p.id,
        mlsNumber: p.mlsNumber,
        externalId: p.externalId,
        title: p.title
      }))
    }

  } catch (error: any) {
    console.error('❌ Failed to cleanup placeholder properties:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Cleanup failed: ${error.message}`
    })
  }
})
