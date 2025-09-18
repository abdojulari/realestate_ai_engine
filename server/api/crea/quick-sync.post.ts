import { defineEventHandler, readBody, createError } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { properties } = body

  if (!properties || !Array.isArray(properties)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Properties array required'
    })
  }

  // Get or create system user for CREA properties
  let systemUser = await prisma.user.findFirst({
    where: { email: 'system@abdul.com' }
  })

  if (!systemUser) {
    systemUser = await prisma.user.create({
      data: {
        email: 'system@abdul.com',
        firstName: 'MLS',
        lastName: 'System',
        role: 'agent',
        provider: 'system'
      }
    })
  }

  const results = []
  
  for (const propData of properties) {
    try {
      // Check if property already exists
      const existing = await prisma.property.findFirst({
        where: {
          source: 'crea',
          externalId: propData.externalId
        }
      })

      if (existing) {
        console.log(`Property ${propData.externalId} already exists, skipping`)
        continue
      }

      const property = await prisma.property.create({
        data: {
          ...propData,
          userId: systemUser.id,
          images: JSON.stringify(propData.images || []),
          features: JSON.stringify(propData.features || {}),
          lastSyncAt: new Date()
        }
      })

      results.push({
        success: true,
        id: property.id,
        title: property.title,
        externalId: property.externalId
      })

      console.log(`✅ Created CREA property: ${property.title}`)
      
    } catch (error) {
      console.error(`❌ Failed to create property ${propData.title}:`, error)
      results.push({
        success: false,
        title: propData.title,
        error: error.message
      })
    }
  }

  return {
    success: true,
    results,
    total: properties.length,
    created: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length
  }
})
