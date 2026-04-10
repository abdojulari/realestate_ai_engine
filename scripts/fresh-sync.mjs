#!/usr/bin/env node

/**
 * Fresh CREA Sync Script
 * - Gets total count from CREA first
 * - Option to purge database before sync
 * - Dynamic batch handling based on actual count
 */

const API_BASE = 'http://localhost:3000'

async function purgeDatabase() {
  console.log('\n=== PURGING CREA PROPERTIES FROM DATABASE ===')
  
  try {
    // Call purge endpoint
    const response = await fetch(`${API_BASE}/api/admin/crea/purge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    
    if (!response.ok) {
      // If endpoint doesn't exist, we'll create it
      console.log('Purge endpoint not available, will sync over existing data')
      return false
    }
    
    const result = await response.json()
    console.log(`Purged ${result.deleted} CREA properties from database`)
    return true
  } catch (error) {
    console.log('Could not purge database:', error.message)
    return false
  }
}

async function getCreaCount() {
  console.log('\n=== GETTING CREA PROPERTY COUNT ===')
  
  try {
    const response = await fetch(`${API_BASE}/api/crea/count?province=Alberta`)
    if (!response.ok) {
      console.log('Count endpoint not available')
      return null
    }
    
    const result = await response.json()
    console.log(`Total Alberta properties in CREA: ${result.count}`)
    return result.count
  } catch (error) {
    console.log('Could not get count:', error.message)
    return null
  }
}

async function syncAllAlberta(purgeFirst = false) {
  console.log('===========================================')
  console.log('     FRESH ALBERTA CREA SYNC              ')
  console.log('===========================================')
  console.log('Images: Fetched individually for each property')
  console.log('')

  // Optional: Purge database first
  if (purgeFirst) {
    await purgeDatabase()
  }

  // Get total count from CREA
  const totalInCrea = await getCreaCount()
  if (totalInCrea) {
    console.log(`Target: ${totalInCrea} Alberta properties`)
  }

  try {
    let totalSynced = 0
    let totalCreated = 0
    let totalUpdated = 0
    let totalSkipped = 0
    let totalErrors = 0
    let currentBatch = 1
    const batchSize = 100 // Properties per API call
    const processingBatchSize = 10 // Properties processed at a time

    // Calculate max batches dynamically
    const maxBatches = totalInCrea ? Math.ceil(totalInCrea / batchSize) + 50 : 1000

    console.log(`\nStarting sync (max ${maxBatches} batches)...`)
    console.log('')

    while (true) {
      const startTime = Date.now()
      console.log(`\n--- Batch ${currentBatch} ---`)
      
      const response = await fetch(`${API_BASE}/api/crea/sync-alberta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          limit: batchSize,
          batchSize: processingBatchSize,
          includeAgentData: true
        }),
      })

      if (!response.ok) {
        console.error(`Batch ${currentBatch} failed:`, response.status)
        const error = await response.text()
        console.error(error)
        break
      }

      const result = await response.json()
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      
      console.log(`Results: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped, ${result.errors} errors (${elapsed}s)`)
      
      totalCreated += result.created
      totalUpdated += result.updated
      totalSkipped += result.skipped
      totalErrors += result.errors
      totalSynced += result.created + result.updated

      // Check if we're done (no new properties to process)
      if (result.created === 0 && result.updated === 0) {
        console.log('\nSYNC COMPLETE - No more new properties to process')
        break
      }
      
      currentBatch++
      
      // Dynamic safety limit
      if (currentBatch > maxBatches) {
        console.log(`\nReached calculated batch limit (${maxBatches}), stopping`)
        break
      }
      
      // Brief pause between batches
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    console.log('\n===========================================')
    console.log('              FINAL RESULTS                ')
    console.log('===========================================')
    console.log(`Total synced:  ${totalSynced}`)
    console.log(`  - Created:   ${totalCreated}`)
    console.log(`  - Updated:   ${totalUpdated}`)
    console.log(`  - Skipped:   ${totalSkipped}`)
    console.log(`  - Errors:    ${totalErrors}`)
    console.log(`Batches:       ${currentBatch - 1}`)
    
    // Verify final count
    console.log('\nVerifying database...')
    const statusResponse = await fetch(`${API_BASE}/api/properties?source=crea&limit=5`)
    const data = await statusResponse.json()
    const properties = data.properties || []
    const totalCount = data.pagination?.total || 0
    
    console.log(`CREA properties in database: ${totalCount}`)
    
    if (properties.length > 0) {
      // Test first image URL
      const firstImage = properties[0].images?.[0]
      if (firstImage) {
        try {
          const imgResponse = await fetch(firstImage, { method: 'HEAD' })
          console.log(`Sample image status: ${imgResponse.status === 200 ? 'OK' : 'FAILED'} (${firstImage.substring(0, 50)}...)`)
        } catch (e) {
          console.log('Sample image test failed')
        }
      }
    }

  } catch (error) {
    console.error('Sync failed:', error.message)
    process.exit(1)
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const purgeFirst = args.includes('--purge') || args.includes('-p')

if (purgeFirst) {
  console.log('Mode: PURGE AND SYNC (will delete all CREA properties first)')
} else {
  console.log('Mode: UPDATE SYNC (will update existing properties)')
  console.log('Use --purge or -p flag to purge database first')
}

syncAllAlberta(purgeFirst)
