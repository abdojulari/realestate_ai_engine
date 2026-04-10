#!/usr/bin/env node

/**
 * Cleanup Properties with Broken Images
 * - Finds all CREA properties
 * - Tests their image URLs
 * - Deletes properties with broken/no images
 */

const API_BASE = 'http://localhost:3000'
const BATCH_SIZE = 50

async function testImageUrl(url) {
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      timeout: 5000 
    })
    return response.status === 200
  } catch {
    return false
  }
}

async function cleanupBrokenImages() {
  console.log('===========================================')
  console.log('  CLEANUP PROPERTIES WITH BROKEN IMAGES   ')
  console.log('===========================================')
  console.log('')

  let totalChecked = 0
  let totalDeleted = 0
  let totalValid = 0
  let offset = 0
  
  try {
    while (true) {
      console.log(`\nFetching properties (offset: ${offset})...`)
      
      const response = await fetch(`${API_BASE}/api/properties?source=crea&limit=${BATCH_SIZE}&offset=${offset}`)
      const data = await response.json()
      const properties = data.properties || []
      
      if (properties.length === 0) {
        console.log('No more properties to check')
        break
      }
      
      console.log(`Checking ${properties.length} properties...`)
      
      const toDelete = []
      
      for (const property of properties) {
        totalChecked++
        
        // Check if property has images
        if (!property.images || property.images.length === 0) {
          console.log(`  [NO IMAGES] ${property.id}: ${property.title}`)
          toDelete.push(property.id)
          continue
        }
        
        // Test first image URL
        const firstImage = property.images[0]
        const isValid = await testImageUrl(firstImage)
        
        if (!isValid) {
          console.log(`  [BROKEN] ${property.id}: ${property.title}`)
          toDelete.push(property.id)
        } else {
          totalValid++
        }
      }
      
      // Delete broken properties
      if (toDelete.length > 0) {
        console.log(`\nDeleting ${toDelete.length} properties with broken images...`)
        
        for (const id of toDelete) {
          try {
            await fetch(`${API_BASE}/api/admin/properties/${id}`, {
              method: 'DELETE'
            })
            totalDeleted++
          } catch (e) {
            console.log(`  Failed to delete property ${id}`)
          }
        }
      }
      
      // Move to next batch - adjust offset for deleted items
      offset += BATCH_SIZE - toDelete.length
      
      // Safety limit
      if (totalChecked > 100000) {
        console.log('Safety limit reached')
        break
      }
      
      // Small delay to not overwhelm servers
      await new Promise(r => setTimeout(r, 500))
    }
    
    console.log('\n===========================================')
    console.log('              CLEANUP COMPLETE             ')
    console.log('===========================================')
    console.log(`Total checked:  ${totalChecked}`)
    console.log(`Total valid:    ${totalValid}`)
    console.log(`Total deleted:  ${totalDeleted}`)
    
  } catch (error) {
    console.error('Cleanup failed:', error.message)
    process.exit(1)
  }
}

cleanupBrokenImages()
