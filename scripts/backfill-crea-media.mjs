#!/usr/bin/env node

try { await import('dotenv/config') } catch {}

/**
 * BACKFILL CREA MEDIA - Repair properties saved with empty `images`
 * =================================================================
 *
 * Targeted repair tool for the pre-fix CREA sync bug where the per-listing
 * Media fetch result was discarded. All previously synced rows ended up with
 * `images: []`, causing the placeholder "Property Image" tile to appear on
 * map-search and the listing detail page.
 *
 * What this does (and doesn't do):
 *   - Calls POST /api/admin/crea/backfill-media in a loop until no more rows
 *     need photos.
 *   - Each call does a single CREA Media fetch per property — ~4x cheaper
 *     than the full sync (which also fetches Property + Member + Office).
 *   - Does NOT touch price, status, agent, or any other column. Pure media
 *     repair, safe to run alongside the regular sync.
 *
 * Usage:
 *   node scripts/backfill-crea-media.mjs [options]
 *
 * Options:
 *   --batch=100      Properties per batch (default 100, max 500)
 *   --delay=300      Per-property CREA delay in ms (default 300)
 *   --max-batches=N  Safety stop after N batches (default unlimited)
 *   --help           Show this help
 *
 * Env: same API base resolution as holistic-sync.mjs. No auth required —
 * mirrors the unauthenticated `/api/crea/sync-province` pattern that
 * holistic-sync.mjs already uses.
 *
 * Examples:
 *   node scripts/backfill-crea-media.mjs                # Run until done
 *   node scripts/backfill-crea-media.mjs --batch=50     # Smaller batches
 *   node scripts/backfill-crea-media.mjs --max-batches=1 # Smoke-test 100 rows
 */

function resolveApiBase() {
  const candidates = [
    process.env.HOLISTIC_SYNC_API_BASE,
    process.env.PILLAR9_SYNC_API_BASE,
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

function parseArgs() {
  const args = process.argv.slice(2)

  const get = (name, fallback) => {
    const a = args.find(s => s.startsWith(`--${name}=`))
    if (!a) return fallback
    const v = a.substring(a.indexOf('=') + 1)
    return v
  }

  const num = (name, fallback) => {
    const v = get(name, null)
    if (v == null) return fallback
    const n = Number(v)
    return Number.isFinite(n) ? n : fallback
  }

  return {
    help: args.includes('--help') || args.includes('-h'),
    batch: num('batch', 100),
    delay: num('delay', 300),
    maxBatches: num('max-batches', Infinity),
  }
}

function showHelp() {
  console.log(`
BACKFILL CREA MEDIA

Usage:
  node scripts/backfill-crea-media.mjs [options]

Options:
  --batch=100      Properties per batch (default 100, max 500)
  --delay=300      Per-property CREA delay in ms (default 300)
  --max-batches=N  Safety stop after N batches (default unlimited)
  --help           Show this help
`)
}

async function main() {
  const opts = parseArgs()
  if (opts.help) {
    showHelp()
    process.exit(0)
  }

  const apiBase = resolveApiBase()
  const url = `${apiBase}/api/crea/backfill-media?limit=${opts.batch}&delay=${opts.delay}`

  console.log('========================================')
  console.log('CREA MEDIA BACKFILL')
  console.log('========================================')
  console.log(`API:        ${apiBase}`)
  console.log(`Batch:      ${opts.batch}`)
  console.log(`Per-prop:   ${opts.delay}ms`)
  console.log(`Max batches: ${opts.maxBatches === Infinity ? 'unlimited' : opts.maxBatches}`)
  console.log('========================================\n')

  const totals = { attempted: 0, updated: 0, noMedia: 0, expired: 0, failed: 0 }
  const startedAt = Date.now()
  let batch = 0

  while (batch < opts.maxBatches) {
    batch++
    const batchStart = Date.now()

    let res
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (err) {
      console.error(`❌ Batch ${batch} request failed: ${err?.message || err}`)
      // Network blip — wait and retry the same batch.
      await new Promise(r => setTimeout(r, 5_000))
      batch--
      continue
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`❌ Batch ${batch} HTTP ${res.status}: ${body.slice(0, 300)}`)
      // Server hiccup — back off briefly, then keep going.
      await new Promise(r => setTimeout(r, 10_000))
      continue
    }

    const json = await res.json().catch(() => null)
    if (!json || !json.success) {
      console.error(`❌ Batch ${batch} unexpected response: ${JSON.stringify(json)?.slice(0, 300)}`)
      break
    }

    const s = json.stats || {}
    totals.attempted += s.attempted || 0
    totals.updated += s.updated || 0
    totals.noMedia += s.noMedia || 0
    totals.expired += s.expired || 0
    totals.failed += s.failed || 0

    const elapsed = ((Date.now() - batchStart) / 1000).toFixed(1)
    const totalElapsed = ((Date.now() - startedAt) / 60000).toFixed(1)
    console.log(
      `Batch ${batch}: attempted=${s.attempted} updated=${s.updated} noMedia=${s.noMedia} expired=${s.expired || 0} failed=${s.failed} (${elapsed}s, total=${totalElapsed}m)`
    )

    if (s.reasons && s.reasons.length) {
      for (const r of s.reasons.slice(0, 3)) console.log(`  · ${r}`)
    }

    // Two ways the loop terminates:
    //   1. Server says hasMore=false (no more rows match the missing-images
    //      predicate). This is the happy path.
    //   2. Server returned a partial batch (< requested limit). Belt-and-
    //      suspenders in case `hasMore` ever drifts from reality.
    if (json.hasMore === false || (s.attempted ?? 0) < opts.batch) {
      console.log('\n✅ No more properties need media backfilled.')
      break
    }
  }

  const totalMin = ((Date.now() - startedAt) / 60000).toFixed(1)
  console.log('\n========================================')
  console.log('BACKFILL COMPLETE')
  console.log('========================================')
  console.log(`Total attempted:  ${totals.attempted}`)
  console.log(`Updated:          ${totals.updated}`)
  console.log(`No media in CREA: ${totals.noMedia}`)
  console.log(`Expired (404):    ${totals.expired}`)
  console.log(`Failed:           ${totals.failed}`)
  console.log(`Elapsed:         ${totalMin} minutes`)
  console.log('========================================\n')

  process.exit(totals.failed > 0 && totals.updated === 0 ? 1 : 0)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
