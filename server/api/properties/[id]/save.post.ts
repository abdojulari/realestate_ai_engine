import { defineEventHandler, getRouterParam, createError } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    })
  }

  const propertyId = parseInt(getRouterParam(event, 'id') || '0')
  if (!propertyId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid property ID'
    })
  }

  // Check if property exists
  const property = await prisma.property.findUnique({
    where: { id: propertyId }
  })

  if (!property) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Property not found'
    })
  }

  try {
    // Check if already saved
    const existingSave = await prisma.savedProperty.findUnique({
      where: {
        userId_propertyId: {
          userId: user.id,
          propertyId: propertyId
        }
      }
    })

    if (existingSave) {
      // Remove from saved
      await prisma.savedProperty.delete({
        where: {
          userId_propertyId: {
            userId: user.id,
            propertyId: propertyId
          }
        }
      })
      
      return { saved: false, message: 'Property removed from saved list' }
    } else {
      // Add to saved
      await prisma.savedProperty.create({
        data: {
          userId: user.id,
          propertyId: propertyId
        }
      })
      
      return { saved: true, message: 'Property saved successfully' }
    }
  } catch (error) {
    console.error('Error toggling save:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to toggle save status'
    })
  }
})
