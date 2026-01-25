#!/usr/bin/env node

/**
 * HOLISTIC CREA SYNC - Complete sync with no broken images
 * =========================================================
 * 
 * This script performs a complete, clean sync:
 * 1. Optionally purges all CREA properties from database
 * 2. Gets total count from CREA
 * 3. Syncs all properties with fresh images
 * 4. Cleans up any properties with broken images
 * 5. Verifies final database state
 * 
 * Usage:
 *   node scripts/holistic-sync.mjs [options]
 * 
 * Options:
 *   --purge       Delete all CREA properties before sync
 *   --cleanup     Only run cleanup (skip sync)
 *   --verify      Only verify database state
 *   --help        Show this help
 */

import fetch from 'node-fetch'

const API_BASE = process.env.NUXT_PUBLIC_SITE_URL || process.env.APP_URL || 'http://localhost:3000'

// ============================================
// UTILITY FUNCTIONS
// ============================================

async function testImageUrl(url) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const response = await fetch(url, { method: 'HEAD', signal: controller.signal })
    clearTimeout(timeout)
    return response.status === 200
  } catch {
    return false
  }
}

function parseArgs() {
  const args = process.argv.slice(2)
  return {
    purge: args.includes('--purge') || args.includes('-p'),
    cleanup: args.includes('--cleanup') || args.includes('-c'),
    verify: args.includes('--verify') || args.includes('-v'),
    help: args.includes('--help') || args.includes('-h')
  }
}

function showHelp() {
  console.log(`
HOLISTIC CREA SYNC
==================

A complete sync solution that ensures all properties have valid images.

Usage:
  node scripts/holistic-sync.mjs [options]

Options:
  --purge, -p     Delete all CREA properties before syncing (fresh start)
  --cleanup, -c   Only cleanup broken images (skip sync)
  --verify, -v    Only verify database state (no changes)
  --help, -h      Show this help message

Examples:
  # Full purge and sync (recommended for clean slate)
  node scripts/holistic-sync.mjs --purge

  # Just cleanup broken images
  node scripts/holistic-sync.mjs --cleanup

  # Check current database state
  node scripts/holistic-sync.mjs --verify
`)
}

// ============================================
// STEP 1: PURGE DATABASE
// ============================================

async function purgeDatabase() {
  console.log('\n========================================')
  console.log('STEP 1: PURGING CREA PROPERTIES')
  console.log('========================================\n')
  
  try {
    const response = await fetch(`${API_BASE}/api/admin/crea/purge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    
    if (!response.ok) {
      console.log('Purge endpoint not available')
      return false
    }
    
    const result = await response.json()
    console.log(`Deleted ${result.deleted} CREA properties from database`)
    return true
  } catch (error) {
    console.log('Could not purge database:', error.message)
    return false
  }
}

// ============================================
// STEP 2: GET CREA COUNT
// ============================================

async function getCreaCount() {
  console.log('\n========================================')
  console.log('STEP 2: GETTING CREA PROPERTY COUNT')
  console.log('========================================\n')
  
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

// ============================================
// STEP 3: SYNC PROPERTIES
// ============================================

async function syncProperties(totalInCrea) {
  console.log('\n========================================')
  console.log('STEP 3: SYNCING PROPERTIES')
  console.log('========================================\n')
  
  let totalSynced = 0
  let totalCreated = 0
  let totalUpdated = 0
  let totalSkipped = 0
  let totalErrors = 0
  let currentBatch = 1
  
  const batchSize = 100
  const processingBatchSize = 10
  const maxBatches = totalInCrea ? Math.ceil(totalInCrea / batchSize) + 50 : 500

  console.log(`Starting sync (estimated ${maxBatches} batches)...\n`)

  while (true) {
    const startTime = Date.now()
    
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
      break
    }

    const result = await response.json()
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    
    console.log(`Batch ${currentBatch}: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped (${elapsed}s)`)
    
    totalCreated += result.created
    totalUpdated += result.updated
    totalSkipped += result.skipped
    totalErrors += result.errors
    totalSynced += result.created + result.updated

    if (result.created === 0 && result.updated === 0) {
      console.log('\nSync complete - no more new properties')
      break
    }
    
    currentBatch++
    
    if (currentBatch > maxBatches) {
      console.log(`\nReached batch limit (${maxBatches})`)
      break
    }
    
    await new Promise(r => setTimeout(r, 1000))
  }

  return { totalSynced, totalCreated, totalUpdated, totalSkipped, totalErrors, batches: currentBatch - 1 }
}

// ============================================
// STEP 4: CLEANUP BROKEN IMAGES
// ============================================

async function cleanupBrokenImages() {
  console.log('\n========================================')
  console.log('STEP 4: CLEANING UP BROKEN IMAGES')
  console.log('========================================\n')
  
  try {
    console.log('Starting cleanup (this may take a while)...\n')
    
    const response = await fetch(`${API_BASE}/api/admin/crea/cleanup-broken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    
    if (!response.ok) {
      console.log('Cleanup endpoint not available')
      return null
    }
    
    const result = await response.json()
    console.log(`\nCleanup complete:`)
    console.log(`  - Checked: ${result.totalChecked}`)
    console.log(`  - Valid: ${result.validImages}`)
    console.log(`  - Broken: ${result.brokenImages}`)
    console.log(`  - No images: ${result.noImages}`)
    console.log(`  - Deleted: ${result.deleted}`)
    
    return result
  } catch (error) {
    console.log('Cleanup failed:', error.message)
    return null
  }
}

// ============================================
// STEP 5: VERIFY DATABASE
// ============================================

async function verifyDatabase() {
  console.log('\n========================================')
  console.log('STEP 5: VERIFYING DATABASE')
  console.log('========================================\n')
  
  try {
    const response = await fetch(`${API_BASE}/api/properties?source=crea&limit=10`)
    const data = await response.json()
    const properties = data.properties || []
    const totalCount = data.pagination?.total || 0
    
    console.log(`Total CREA properties in database: ${totalCount}`)
    
    if (properties.length > 0) {
      // Test sample images
      let validCount = 0
      let brokenCount = 0
      
      console.log('\nTesting sample images...')
      for (const property of properties.slice(0, 5)) {
        const firstImage = property.images?.[0]
        if (firstImage) {
          const isValid = await testImageUrl(firstImage)
          if (isValid) {
            validCount++
            console.log(`  [OK] ${property.title?.substring(0, 40)}...`)
          } else {
            brokenCount++
            console.log(`  [BROKEN] ${property.title?.substring(0, 40)}...`)
          }
        } else {
          brokenCount++
          console.log(`  [NO IMAGE] ${property.title?.substring(0, 40)}...`)
        }
      }
      
      console.log(`\nSample results: ${validCount} valid, ${brokenCount} broken`)
    }
    
    return { totalCount, properties }
  } catch (error) {
    console.log('Verification failed:', error.message)
    return null
  }
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  const options = parseArgs()
  
  if (options.help) {
    showHelp()
    return
  }
  
  console.log('==========================================')
  console.log('    HOLISTIC CREA SYNC                   ')
  console.log('==========================================')
  console.log(`Mode: ${options.verify ? 'VERIFY' : options.cleanup ? 'CLEANUP' : options.purge ? 'PURGE + SYNC' : 'SYNC'}`)
  
  const startTime = Date.now()
  
  try {
    // Verify only mode
    if (options.verify) {
      await verifyDatabase()
      return
    }
    
    // Cleanup only mode
    if (options.cleanup) {
      await cleanupBrokenImages()
      await verifyDatabase()
      return
    }
    
    // Full sync mode
    if (options.purge) {
      await purgeDatabase()
    }
    
    const totalInCrea = await getCreaCount()
    const syncResult = await syncProperties(totalInCrea)
    
    // Always cleanup after sync
    await cleanupBrokenImages()
    
    // Verify final state
    await verifyDatabase()
    
    // Final summary
    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1)
    
    console.log('\n==========================================')
    console.log('    FINAL SUMMARY                        ')
    console.log('==========================================')
    console.log(`Total time: ${totalTime} minutes`)
    console.log(`Properties synced: ${syncResult.totalSynced}`)
    console.log(`  - Created: ${syncResult.totalCreated}`)
    console.log(`  - Updated: ${syncResult.totalUpdated}`)
    console.log(`  - Skipped: ${syncResult.totalSkipped}`)
    console.log(`  - Errors: ${syncResult.totalErrors}`)
    console.log(`Batches processed: ${syncResult.batches}`)
    
  } catch (error) {
    console.error('\nSync failed:', error.message)
    process.exit(1)
  }
}

main()
