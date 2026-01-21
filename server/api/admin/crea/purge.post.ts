import { defineEventHandler } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Purge all CREA properties from database
// This allows a fresh sync without stale data
export default defineEventHandler(async (event) => {
  try {
    console.log('Purging all CREA properties from database...')
    
    // Delete all properties with source = 'crea'
    const result = await prisma.property.deleteMany({
      where: {
        source: 'crea'
      }
    })
    
    console.log(`Purged ${result.count} CREA properties`)
    
    return {
      success: true,
      deleted: result.count,
      message: `Successfully purged ${result.count} CREA properties from database`
    }
  } catch (error: any) {
    console.error('Failed to purge CREA properties:', error)
    return {
      success: false,
      deleted: 0,
      error: error.message
    }
  }
})
