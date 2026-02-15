import { defineEventHandler } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Test if an image URL is valid (returns 200)
async function testImageUrl(url: string): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    
    const response = await fetch(url, { 
      method: 'HEAD',
      signal: controller.signal
    })
    
    clearTimeout(timeout)
    return response.status === 200
  } catch {
    return false
  }
}

// Cleanup all CREA properties with broken or missing images
export default defineEventHandler(async (event) => {
  console.log('Starting cleanup of properties with broken images...')
  
  const stats = {
    totalChecked: 0,
    noImages: 0,
    brokenImages: 0,
    validImages: 0,
    deleted: 0,
    errors: 0
  }
  
  try {
    // Get all CREA properties
    const properties = await prisma.property.findMany({
      where: { source: 'crea' },
      select: { id: true, title: true, images: true }
    })
    
    console.log(`Found ${properties.length} CREA properties to check`)
    
    const toDelete: number[] = []
    
    for (const property of properties) {
      stats.totalChecked++
      
      // Parse images if stored as string
      let images: string[] = []
      if (typeof property.images === 'string') {
        try {
          images = JSON.parse(property.images)
        } catch {
          images = []
        }
      } else if (Array.isArray(property.images)) {
        images = property.images as string[]
      }
      
      // No images
      if (!images || images.length === 0) {
        console.log(`[NO IMAGES] ${property.id}: ${property.title?.substring(0, 40)}...`)
        stats.noImages++
        toDelete.push(property.id)
        continue
      }
      
      // Test first image
      const firstImage = images[0]!
      const isValid = await testImageUrl(firstImage)
      
      if (!isValid) {
        console.log(`[BROKEN] ${property.id}: ${property.title?.substring(0, 40)}...`)
        stats.brokenImages++
        toDelete.push(property.id)
      } else {
        stats.validImages++
      }
      
      // Log progress every 100 properties
      if (stats.totalChecked % 100 === 0) {
        console.log(`Progress: ${stats.totalChecked}/${properties.length} checked, ${toDelete.length} to delete`)
      }
    }
    
    // Delete properties with broken images
    if (toDelete.length > 0) {
      console.log(`\nDeleting ${toDelete.length} properties with broken/missing images...`)
      
      const result = await prisma.property.deleteMany({
        where: {
          id: { in: toDelete }
        }
      })
      
      stats.deleted = result.count
      console.log(`Deleted ${result.count} properties`)
    }
    
    console.log('\nCleanup complete!')
    console.log(`Total checked: ${stats.totalChecked}`)
    console.log(`Valid images: ${stats.validImages}`)
    console.log(`No images: ${stats.noImages}`)
    console.log(`Broken images: ${stats.brokenImages}`)
    console.log(`Deleted: ${stats.deleted}`)
    
    return {
      success: true,
      ...stats,
      message: `Cleanup complete: ${stats.deleted} properties with broken/missing images removed`
    }
    
  } catch (error: any) {
    console.error('Cleanup failed:', error)
    return {
      success: false,
      ...stats,
      error: error.message
    }
  }
})
