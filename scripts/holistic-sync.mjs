#!/usr/bin/env node

/**
 * HOLISTIC CREA SYNC - Complete sync with no broken images
 * =========================================================
 * 
 * This script performs a complete, clean sync:
 * 1. Optionally purges all CREA properties from database
 * 2. Gets total count from CREA
 * 3. Syncs all properties with fresh images (supports all provinces)
 * 4. Cleans up any properties with broken images
 * 5. Verifies final database state
 * 
 * Usage:
 *   node scripts/holistic-sync.mjs [options]
 * 
 * Options:
 *   --purge           Delete all CREA properties before sync
 *   --cleanup         Only run cleanup (skip sync)
 *   --verify          Only verify database state
 *   --province=NAME   Sync specific province (e.g., --province=Ontario)
 *   --all             Sync all Canadian provinces (default)
 *   --help            Show this help
 * 
 * Examples:
 *   node scripts/holistic-sync.mjs --purge              # Purge and sync Alberta (default)
 *   node scripts/holistic-sync.mjs --purge --all        # Purge and sync ALL provinces
 *   node scripts/holistic-sync.mjs --province=Ontario   # Sync only Ontario
 *
 * Requires Node 18+ (global fetch).
 *
 * API base (first match wins):
 *   HOLISTIC_SYNC_API_BASE, NUXT_PUBLIC_API_BASE, NUXT_PUBLIC_SITE_URL, APP_URL
 * Trailing slashes and a trailing /api are stripped. Example:
 *   HOLISTIC_SYNC_API_BASE=https://your-tenant.example.com node scripts/holistic-sync.mjs --verify
 */

function resolveApiBase() {
  const candidates = [
    process.env.HOLISTIC_SYNC_API_BASE,
    process.env.NUXT_PUBLIC_API_BASE,
    process.env.NUXT_PUBLIC_SITE_URL,
    process.env.APP_URL,
  ].filter(Boolean)

  for (const raw of candidates) {
    let u = String(raw).trim().replace(/\/+$/, '')
    if (u.toLowerCase().endsWith('/api')) {
      u = u.slice(0, -4)
    }
    if (/^https?:\/\//i.test(u)) {
      return u
    }
  }
  return 'http://localhost:3000'
}

const API_BASE = resolveApiBase()

// All Canadian provinces/territories
const ALL_PROVINCES = [
  'Alberta',
  'British Columbia',
  'Manitoba',
  'New Brunswick',
  'Newfoundland and Labrador',
  'Nova Scotia',
  'Ontario',
  'Prince Edward Island',
  'Quebec',
  'Saskatchewan',
  'Northwest Territories',
  'Nunavut',
  'Yukon'
]

// ============================================
// UTILITY FUNCTIONS
// ============================================

const MAX_RETRIES = 3
const RETRY_DELAYS = [15_000, 30_000, 60_000] // 15s, 30s, 60s

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function fetchWithRetry(url, options = {}, label = '') {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, options)
      if (res.ok) return res

      const body = await res.text().catch(() => '')
      const isDbError = /auth|prisma|database|connect|P1000|P1001|P1008|P1017/i.test(body)

      if (isDbError && attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS[attempt] || 60_000
        console.warn(`[RETRY] ${label} attempt ${attempt + 1}/${MAX_RETRIES} — DB error (${res.status}), waiting ${delay / 1000}s...`)
        await sleep(delay)
        continue
      }

      const err = new Error(`HTTP ${res.status}`)
      err.status = res.status
      err.body = body
      throw err
    } catch (e) {
      if (e.status) throw e
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS[attempt] || 60_000
        console.warn(`[RETRY] ${label} attempt ${attempt + 1}/${MAX_RETRIES} — ${e.message}, waiting ${delay / 1000}s...`)
        await sleep(delay)
        continue
      }
      throw e
    }
  }
}

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
  
  // Parse province argument (--province=Ontario or --province Ontario)
  let province = null
  const provinceArg = args.find(a => a.startsWith('--province=') || a.startsWith('-P='))
  if (provinceArg) {
    province = provinceArg.split('=')[1]
  } else {
    const provinceIndex = args.indexOf('--province')
    if (provinceIndex !== -1 && args[provinceIndex + 1]) {
      province = args[provinceIndex + 1]
    }
  }
  
  // Parse city argument (--city=Edmonton or --city Edmonton)
  let city = null
  const cityArg = args.find(a => a.startsWith('--city=') || a.startsWith('-C='))
  if (cityArg) {
    city = cityArg.split('=')[1]
  } else {
    const cityIndex = args.indexOf('--city')
    if (cityIndex !== -1 && args[cityIndex + 1]) {
      city = args[cityIndex + 1]
    }
  }
  
  const syncAll = args.includes('--all') || args.includes('-a')
  const offMarketOnly = args.includes('--off-market')
  
  return {
    purge: args.includes('--purge') || args.includes('-p'),
    cleanup: args.includes('--cleanup') || args.includes('-c'),
    verify: args.includes('--verify') || args.includes('-v'),
    help: args.includes('--help') || args.includes('-h'),
    province: province,
    city: city,
    syncAll: syncAll,
    offMarketOnly: offMarketOnly
  }
}

function showHelp() {
  console.log(`
HOLISTIC CREA SYNC
==================

A complete sync solution that ensures all properties have valid images.
Now supports syncing ALL Canadian provinces and specific cities!

Usage:
  node scripts/holistic-sync.mjs [options]

Options:
  --purge, -p              Delete all CREA properties before syncing (fresh start)
  --cleanup, -c            Only cleanup broken images (skip sync)
  --verify, -v             Only verify database state (no changes)
  --province=NAME          Sync a specific province (e.g., --province=Ontario)
  --city=NAME, -C=NAME     Sync a specific city (e.g., --city=Edmonton)
  --off-market             Sync off-market listings only (Terminated, Withdrawn, Expired, Cancelled)
  --all, -a                Sync ALL Canadian provinces (slower but complete)
  --help, -h               Show this help message

Available Provinces:
  Alberta, British Columbia, Manitoba, New Brunswick, 
  Newfoundland and Labrador, Nova Scotia, Ontario, 
  Prince Edward Island, Quebec, Saskatchewan,
  Northwest Territories, Nunavut, Yukon

Examples:
  # Sync Alberta only (default)
  node scripts/holistic-sync.mjs --purge

  # Sync specific city (e.g., Edmonton)
  node scripts/holistic-sync.mjs --city=Edmonton

  # Sync multiple cities
  node scripts/holistic-sync.mjs --city=Edmonton
  node scripts/holistic-sync.mjs --city=Calgary
  node scripts/holistic-sync.mjs --city="St. Albert"

  # Sync ALL provinces (Canada-wide)
  node scripts/holistic-sync.mjs --purge --all

  # Sync specific province
  node scripts/holistic-sync.mjs --province=Ontario

  # Just cleanup broken images
  node scripts/holistic-sync.mjs --cleanup

  # Check current database state
  node scripts/holistic-sync.mjs --verify

Environment (API host for sync / verify — must match production tenant URL):
  HOLISTIC_SYNC_API_BASE   e.g. https://subdomain.yourdomain.com
  NUXT_PUBLIC_SITE_URL     same idea (no trailing /api)
  node --env-file=.env.production scripts/holistic-sync.mjs ...
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

async function getCreaCount(province = 'Alberta', city = null) {
  const locationLabel = city ? `${city}, ${province}` : province
  console.log('\n========================================')
  console.log(`STEP 2: GETTING CREA PROPERTY COUNT (${locationLabel})`)
  console.log('========================================\n')
  
  try {
    let url = `${API_BASE}/api/crea/count?province=${encodeURIComponent(province)}`
    if (city) {
      url += `&city=${encodeURIComponent(city)}`
    }
    
    const response = await fetch(url)
    if (!response.ok) {
      console.log('Count endpoint not available')
      return null
    }
    
    const result = await response.json()
    console.log(`Total ${locationLabel} properties in CREA: ${result.count}`)
    return result.count
  } catch (error) {
    console.log('Could not get count:', error.message)
    return null
  }
}

// ============================================
// STEP 3: SYNC PROPERTIES
// ============================================

async function syncProperties(totalInCrea, province = 'Alberta', city = null, standardStatus = null) {
  const locationLabel = city ? `${city}, ${province}` : province
  const statusLabel = standardStatus ? ` [${Array.isArray(standardStatus) ? standardStatus.join(', ') : standardStatus}]` : ''
  console.log('\n========================================')
  console.log(`STEP 3: SYNCING PROPERTIES (${locationLabel})${statusLabel}`)
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

  console.log(`Starting sync for ${locationLabel}${statusLabel} (estimated ${maxBatches} batches)...\n`)

  while (true) {
    const startTime = Date.now()
    
    const requestBody = {
      province: province,
      limit: batchSize,
      offset: (currentBatch - 1) * batchSize,
      batchSize: processingBatchSize,
      includeAgentData: true
    }
    
    if (city) {
      requestBody.city = city
    }
    if (standardStatus) {
      requestBody.standardStatus = standardStatus
    }
    
    let response
    try {
      response = await fetchWithRetry(
        `${API_BASE}/api/crea/sync-province`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        },
        `[${province}] Batch ${currentBatch}`
      )
    } catch (err) {
      if (currentBatch === 1 && Array.isArray(standardStatus) && standardStatus.length > 1) {
        console.warn(`[${province}] Combined status query failed (${err.status}). Falling back to per-status sync...`)
        let fallbackResult = { totalSynced: 0, totalCreated: 0, totalUpdated: 0, totalSkipped: 0, totalErrors: 0, batches: 0, province }
        for (const singleStatus of standardStatus) {
          console.log(`\n  → Trying status: ${singleStatus}`)
          const sub = await syncProperties(null, province, city, [singleStatus])
          fallbackResult.totalSynced += sub.totalSynced
          fallbackResult.totalCreated += sub.totalCreated
          fallbackResult.totalUpdated += sub.totalUpdated
          fallbackResult.totalSkipped += sub.totalSkipped
          fallbackResult.totalErrors += sub.totalErrors
          fallbackResult.batches += sub.batches
        }
        return fallbackResult
      }
      console.error(`[${province}] Batch ${currentBatch} failed after ${MAX_RETRIES} retries:`, err.status || err.message)
      if (err.body) console.error(`  Error detail: ${err.body.substring(0, 200)}`)
      break
    }

    const result = await response.json()
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    
    console.log(`[${province}] Batch ${currentBatch}: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped (${elapsed}s)`)
    
    totalCreated += result.created
    totalUpdated += result.updated
    totalSkipped += result.skipped
    totalErrors += result.errors
    totalSynced += result.created + result.updated

    if (result.created === 0 && result.updated === 0) {
      console.log(`\n${province} sync complete - no more new properties`)
      break
    }
    
    currentBatch++
    
    if (currentBatch > maxBatches) {
      console.log(`\nReached batch limit (${maxBatches})`)
      break
    }
    
    await new Promise(r => setTimeout(r, 1000))
  }

  return { totalSynced, totalCreated, totalUpdated, totalSkipped, totalErrors, batches: currentBatch - 1, province }
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
    if (totalCount === 0 && properties.length === 0) {
      console.log(
        `\nNote: If this is 0 but sync counts look good, verify you are hitting the same host as production.\n` +
          `  This run uses API_BASE=${API_BASE}\n` +
          `  Set HOLISTIC_SYNC_API_BASE or NUXT_PUBLIC_SITE_URL, or use node --env-file=.env.production …\n` +
          `  Tenant scoping uses the Host header; localhost often shows 0 CREA rows while the VPS has data.\n`
      )
    }

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
  
  // Determine which provinces to sync
  let provincesToSync = ['Alberta'] // Default
  if (options.syncAll) {
    provincesToSync = ALL_PROVINCES
  } else if (options.province) {
    provincesToSync = [options.province]
  }
  
  // City filter (optional)
  const cityFilter = options.city || null
  
  const OFF_MARKET_STATUSES = ['Expired', 'Withdrawn', 'Canceled']
  
  console.log('==========================================')
  console.log('    HOLISTIC CREA SYNC                   ')
  console.log('==========================================')
  console.log(`API base: ${API_BASE}`)
  const modeLabel = options.verify ? 'VERIFY' : options.cleanup ? 'CLEANUP' : options.offMarketOnly ? 'OFF-MARKET SYNC' : options.purge ? 'PURGE + SYNC' : 'SYNC'
  console.log(`Mode: ${modeLabel}`)
  console.log(`Provinces: ${provincesToSync.length === ALL_PROVINCES.length ? 'ALL CANADA' : provincesToSync.join(', ')}`)
  if (cityFilter) {
    console.log(`City: ${cityFilter}`)
  }
  if (options.offMarketOnly) {
    console.log(`Statuses: ${OFF_MARKET_STATUSES.join(', ')}`)
  }
  
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
    
    // Aggregate stats across all provinces
    const aggregateStats = {
      totalSynced: 0,
      totalCreated: 0,
      totalUpdated: 0,
      totalSkipped: 0,
      totalErrors: 0,
      totalBatches: 0,
      provinceResults: []
    }
    
    // Determine sync passes: active, off-market, or both
    const syncPasses = options.offMarketOnly
      ? [{ label: 'OFF-MARKET', statuses: OFF_MARKET_STATUSES }]
      : [{ label: 'ACTIVE', statuses: null }]

    for (const pass of syncPasses) {
      for (const province of provincesToSync) {
        const locationLabel = cityFilter ? `${cityFilter}, ${province}` : province
        console.log(`\n${'='.repeat(50)}`)
        console.log(`SYNCING ${pass.label}: ${locationLabel.toUpperCase()}`)
        console.log('='.repeat(50))
        
        const totalInCrea = pass.statuses ? null : await getCreaCount(province, cityFilter)
        const syncResult = await syncProperties(totalInCrea, province, cityFilter, pass.statuses)
        
        aggregateStats.totalSynced += syncResult.totalSynced
        aggregateStats.totalCreated += syncResult.totalCreated
        aggregateStats.totalUpdated += syncResult.totalUpdated
        aggregateStats.totalSkipped += syncResult.totalSkipped
        aggregateStats.totalErrors += syncResult.totalErrors
        aggregateStats.totalBatches += syncResult.batches
        aggregateStats.provinceResults.push({
          province: `${province} (${pass.label})`,
          ...syncResult
        })
        
        if (provincesToSync.indexOf(province) < provincesToSync.length - 1) {
          console.log('\nWaiting 5 seconds before next province...')
          await new Promise(r => setTimeout(r, 5000))
        }
      }
    }
    
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
    console.log(`Provinces synced: ${provincesToSync.length}`)
    console.log(`Total properties synced: ${aggregateStats.totalSynced}`)
    console.log(`  - Created: ${aggregateStats.totalCreated}`)
    console.log(`  - Updated: ${aggregateStats.totalUpdated}`)
    console.log(`  - Skipped: ${aggregateStats.totalSkipped}`)
    console.log(`  - Errors: ${aggregateStats.totalErrors}`)
    console.log(`Total batches processed: ${aggregateStats.totalBatches}`)
    
    if (provincesToSync.length > 1) {
      console.log('\nBreakdown by Province:')
      for (const result of aggregateStats.provinceResults) {
        console.log(`  ${result.province}: ${result.totalCreated} created, ${result.totalUpdated} updated`)
      }
    }
    
  } catch (error) {
    console.error('\nSync failed:', error.message)
    process.exit(1)
  }
}

main()
