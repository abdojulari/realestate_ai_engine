#!/usr/bin/env node

import 'dotenv/config'

/**
 * PILLAR9 SYNC - Sync properties from Pillar9/Matrix API (Alberta)
 * ================================================================
 *
 * Calls the Pillar9 sync API to fetch 40,000+ properties by city and status.
 * Use with cron or manually. Requires PILLAR9_SYNC_SECRET or CRON_SECRET.
 *
 * Usage:
 *   node scripts/pillar9-sync.mjs [options]
 *
 * Options:
 *   --verify          Only fetch and display sync status (no sync)
 *   --no-media        Skip fetching images from Media API (faster)
 *   --no-dedupe       Do not skip properties already in CREA
 *   --cities=CODES     Comma-separated city codes (e.g. 0046,0047 for Calgary,Edmonton). Default: all Alberta
 *   --delay=MS        Delay between API batches in ms (default: 2500)
 *   --secret=KEY      Sync secret (default: from PILLAR9_SYNC_SECRET or CRON_SECRET)
 *   --help            Show this help
 *
 * Examples:
 *   node scripts/pillar9-sync.mjs                    # Full sync (all cities, all statuses, with media)
 *   node scripts/pillar9-sync.mjs --verify           # Show current status only
 *   node scripts/pillar9-sync.mjs --cities=0046,0047  # Sync only Calgary and Edmonton
 *   node scripts/pillar9-sync.mjs --no-media         # Faster sync without image fetch
 */

import fetch from 'node-fetch'

const API_BASE = process.env.NUXT_PUBLIC_SITE_URL || process.env.APP_URL || 'http://localhost:3000'

// ============================================
// UTILITY
// ============================================

function parseArgs() {
  const args = process.argv.slice(2)

  let cities = null
  const citiesArg = args.find(a => a.startsWith('--cities='))
  if (citiesArg) {
    cities = citiesArg.split('=')[1].split(',').map(s => s.trim()).filter(Boolean)
  }

  let delay = 2500
  const delayArg = args.find(a => a.startsWith('--delay='))
  if (delayArg) {
    const v = parseInt(delayArg.split('=')[1], 10)
    if (!Number.isNaN(v)) delay = v
  }

  let secret = null
  const secretArg = args.find(a => a.startsWith('--secret='))
  if (secretArg) {
    secret = secretArg.split('=')[1]
  }

  return {
    verify: args.includes('--verify') || args.includes('-v'),
    help: args.includes('--help') || args.includes('-h'),
    noMedia: args.includes('--no-media'),
    noDedupe: args.includes('--no-dedupe'),
    cities,
    delay,
    secret: secret || process.env.PILLAR9_SYNC_SECRET || process.env.CRON_SECRET
  }
}

function showHelp() {
  console.log(`
PILLAR9 SYNC
============

Sync properties from Pillar9/Matrix API (Alberta). Supports 40,000+ properties
via city-code batching. Use with cron or run manually.

Usage:
  node scripts/pillar9-sync.mjs [options]

Options:
  --verify, -v           Only show sync status (no sync)
  --no-media             Do not fetch images from Media API (faster, fewer requests)
  --no-dedupe            Do not skip properties that exist in CREA
  --cities=CODES         Comma-separated city codes (e.g. 0046,0047). Default: all Alberta cities
  --delay=MS             Delay between API batches in ms (default: 2500)
  --secret=KEY           Sync secret (default: PILLAR9_SYNC_SECRET or CRON_SECRET env)
  --help, -h             Show this help

Environment:
  NUXT_PUBLIC_SITE_URL or APP_URL   API base (default: http://localhost:3000)
  PILLAR9_SYNC_SECRET or CRON_SECRET  Required for running sync (not needed for --verify)

Examples:
  # Full sync (all cities, all statuses, with media)
  node scripts/pillar9-sync.mjs

  # Show current status only
  node scripts/pillar9-sync.mjs --verify

  # Sync only Calgary and Edmonton
  node scripts/pillar9-sync.mjs --cities=0046,0047

  # Faster sync without image fetch
  node scripts/pillar9-sync.mjs --no-media
`)
}

// ============================================
// SYNC STATUS (GET)
// ============================================

async function getSyncStatus() {
  try {
    const response = await fetch(`${API_BASE}/api/admin/pillar9/sync-status`)
    if (!response.ok) {
      console.log('Sync status endpoint not available:', response.status)
      return null
    }
    return await response.json()
  } catch (error) {
    console.log('Could not get sync status:', error.message)
    return null
  }
}

// ============================================
// RUN SYNC (POST)
// ============================================

async function runSync(options) {
  const { cities, delay, noMedia, noDedupe, secret } = options

  if (!secret || secret.length === 0) {
    console.error('Error: Sync secret required. Set PILLAR9_SYNC_SECRET or CRON_SECRET, or use --secret=KEY')
    process.exit(1)
  }

  const body = {
    syncAllStatuses: true,
    deduplicateWithCrea: !noDedupe,
    includeMedia: !noMedia,
    delayBetweenBatchesMs: delay
  }
  if (cities && cities.length > 0) {
    body.cityCodes = cities
  }

  const syncPromise = fetch(`${API_BASE}/api/admin/pillar9/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Pillar9-Sync-Key': secret
    },
    body: JSON.stringify(body)
  })

  // Heartbeat: log every 60s while waiting so user sees progress (server logs detail in its terminal)
  const startMs = Date.now()
  const heartbeat = setInterval(() => {
    const min = Math.floor((Date.now() - startMs) / 60000)
    console.log(`  … still syncing (${min} min elapsed). Progress is logged on the server.`)
  }, 60_000)

  let response
  try {
    response = await syncPromise
  } finally {
    clearInterval(heartbeat)
  }

  if (!response.ok) {
    const text = await response.text()
    let err
    try {
      err = JSON.parse(text)
    } catch {
      err = { message: text }
    }
    throw new Error(err.message || err.statusMessage || `HTTP ${response.status}`)
  }

  return await response.json()
}

// ============================================
// MAIN
// ============================================

async function main() {
  const options = parseArgs()

  if (options.help) {
    showHelp()
    return
  }

  console.log('==========================================')
  console.log('    PILLAR9 SYNC                           ')
  console.log('==========================================')
  console.log(`API base: ${API_BASE}`)
  console.log(`Mode: ${options.verify ? 'VERIFY (status only)' : 'SYNC'}`)
  if (options.cities && options.cities.length > 0) {
    console.log(`Cities: ${options.cities.join(', ')}`)
  } else {
    console.log('Cities: all Alberta')
  }
  if (!options.verify) {
    console.log(`Media: ${options.noMedia ? 'no' : 'yes'}`)
    console.log(`Dedupe with CREA: ${options.noDedupe ? 'no' : 'yes'}`)
  }
  console.log('')

  const startTime = Date.now()

  try {
    if (options.verify) {
      const status = await getSyncStatus()
      if (status) {
        console.log('Configured:', status.configured)
        console.log('Message:', status.message)
        console.log('Local counts:', status.localCounts)
        console.log('API counts:', status.apiCounts || 'N/A')
        console.log('Last sync:', status.lastSync || 'never')
      }
      return
    }

    console.log('Fetching current status...')
    const statusBefore = await getSyncStatus()
    if (statusBefore && statusBefore.localCounts) {
      console.log(`Current Pillar9 properties in DB: ${statusBefore.localCounts.total}\n`)
    }

    console.log('Starting Pillar9 sync (this may take a long time for full sync)...')
    console.log('(Detailed batch/429 logs appear in the server terminal, not here.)\n')
    const result = await runSync(options)

    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1)
    console.log('\n==========================================')
    console.log('    SYNC COMPLETE                         ')
    console.log('==========================================')
    console.log(`Time: ${elapsed} minutes`)
    console.log(`Message: ${result.message}`)
    if (result.stats) {
      console.log('Stats:')
      console.log(`  Total processed: ${result.stats.total}`)
      console.log(`  Created: ${result.stats.created}`)
      console.log(`  Updated: ${result.stats.updated}`)
      console.log(`  Duplicates skipped: ${result.stats.duplicates}`)
      console.log(`  Errors: ${result.stats.errors}`)
      if (result.stalePropertiesMarked !== undefined) {
        console.log(`  Stale marked: ${result.stalePropertiesMarked}`)
      }
      if (result.stats.errors > 0 && result.stats.errorDetails?.length > 0) {
        const sample = result.stats.errorDetails.slice(0, 5)
        console.log('\n  Sample errors:')
        sample.forEach((e, i) => console.log(`    ${i + 1}. ${e}`))
      }
    }

    console.log('\nFetching status after sync...')
    const statusAfter = await getSyncStatus()
    if (statusAfter && statusAfter.localCounts) {
      console.log(`Pillar9 properties in DB now: ${statusAfter.localCounts.total}`)
    }
  } catch (error) {
    console.error('\nSync failed:', error.message)
    process.exit(1)
  }
}

main()
