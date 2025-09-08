#!/usr/bin/env node

/**
 * Bulk sync ALL Alberta properties from CREA MLS
 * This script will sync all ~7,863 Alberta properties with unlimited images
 */

import fetch from 'node-fetch'

async function syncAllAlberta() {
  console.log('🍁 STARTING BULK ALBERTA CREA SYNC')
  console.log('==================================')
  console.log('Target: ALL Alberta properties (~7,863)')
  console.log('Images: UNLIMITED per property')
  console.log('')

  try {
    let totalSynced = 0
    let currentBatch = 1
    const maxBatchSize = 50 // CREA API limit - smaller batches work better

    while (true) {
      console.log(`\n📦 BATCH ${currentBatch}: Syncing up to ${maxBatchSize} properties...`)
      
      const response = await fetch('http://localhost:3000/api/crea/sync-alberta', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          limit: 10000, // Set high to get all available
          batchSize: maxBatchSize // Process in large batches
        }),
      })

      if (!response.ok) {
        console.error(`❌ Batch ${currentBatch} failed:`, response.status)
        const error = await response.text()
        console.error(error)
        break
      }

      const result = await response.json()
      
      console.log(`✅ Batch ${currentBatch} Results:`)
      console.log(`   📊 Total: ${result.total}`)
      console.log(`   ✅ Created: ${result.created}`)
      console.log(`   🔄 Updated: ${result.updated}`)
      console.log(`   ⏭️ Skipped: ${result.skipped}`)
      
      totalSynced += result.created + result.updated
      
      // Check if we're done
      if (result.created === 0 && result.updated === 0) {
        console.log('\n🎉 SYNC COMPLETE - No more new properties to process')
        break
      }
      
      currentBatch++
      
      // Safety break to avoid infinite loops (27,758 / 50 = ~555 batches max)
      if (currentBatch > 600) {
        console.log('\n⚠️ Reached maximum batch limit (600), stopping')
        break
      }
      
      // Brief pause between batches
      console.log('   ⏳ Waiting 2 seconds before next batch...')
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    console.log('\n🎯 FINAL RESULTS:')
    console.log('=================')
    console.log(`📊 Total properties synced: ${totalSynced}`)
    console.log(`📦 Batches processed: ${currentBatch - 1}`)
    
    // Get final count from database
    console.log('\n🔍 Verifying final database count...')
    const statusResponse = await fetch('http://localhost:3000/api/properties?source=crea')
    const properties = await statusResponse.json()
    console.log(`✅ CREA properties in database: ${properties.length}`)
    
    if (properties.length > 0) {
      console.log(`📸 Sample property images: ${properties[0].images?.length || 0} images`)
      console.log(`🏠 Sample cities: ${[...new Set(properties.slice(0, 10).map(p => p.city))].join(', ')}`)
    }

  } catch (error) {
    console.error('❌ Bulk sync failed:', error.message)
    process.exit(1)
  }
}

// Run the sync
syncAllAlberta()
