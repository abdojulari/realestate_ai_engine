import { defineEventHandler, readBody, createError, getHeader, getQuery } from 'h3'
import { pillar9Service } from '../../../utils/pillar9.service'
import { requireAdmin } from '../../../utils/auth'
import { PrismaClient } from '@prisma/client'
import {
  PSEUDO_SOLD_REVERSED_EVENT,
  REAL_SOLD_EVENT,
  applyPseudoSoldTransition,
  makeSeenInRun,
  parseFeatures,
  recordSeen,
  runPendingDisappearanceDiff,
  stampLastSeen,
} from '../../../utils/pseudo-sold'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


/** Allow request if sync secret is configured and provided (for cron). Otherwise require admin. */
async function requireAdminOrSyncSecret(event: any) {
  const config = useRuntimeConfig()
  const secret = (config.pillar9SyncSecret as string)
    || process.env.PILLAR9_SYNC_SECRET
    || process.env.CRON_SECRET
    || ''
  if (secret.length > 0) {
    const keyHeader = getHeader(event, 'x-pillar9-sync-key')
    const authHeader = getHeader(event, 'authorization')
    const provided = keyHeader ?? (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null)
    if (provided === secret) return
  }
  await requireAdmin(event)
}

const BATCH_LIMIT = 200
const DELAY_BETWEEN_BATCHES_MS = 500
const DELAY_BETWEEN_MEDIA_MS = 100
const MAX_RETRIES_ON_401 = 5
const DELAY_ON_401_BASE_MS = 3000
const MAX_RETRIES_ON_429 = 10
const DELAY_ON_429_BASE_MS = 5000
const MAX_MEDIA_RETRIES_ON_429 = 4
const DELAY_MEDIA_429_MS = 2000

const PRICE_RANGE_BRACKETS = [
  { min: 0, max: 200000 },
  { min: 200001, max: 400000 },
  { min: 400001, max: 600000 },
  { min: 600001, max: 800000 },
  { min: 800001, max: 1000000 },
  { min: 1000001, max: 1500000 },
  { min: 1500001, max: 2000000 },
  { min: 2000001, max: 5000000 },
  { min: 5000001, max: 99999999 },
]

async function getPropertyMediaWithRetry(
  listingKeyNumeric: number,
  delayFn: (ms: number) => Promise<void>
): Promise<string[]> {
  for (let r = 0; r <= MAX_MEDIA_RETRIES_ON_429; r++) {
    try {
      return await pillar9Service.getPropertyMedia(listingKeyNumeric)
    } catch (e: any) {
      const msg = e?.message ?? String(e)
      if (msg.includes('429') && r < MAX_MEDIA_RETRIES_ON_429) {
        await delayFn(DELAY_MEDIA_429_MS * (r + 1))
        continue
      }
      break
    }
  }
  return []
}

function statusToKey(s: string): string {
  const map: Record<string, string> = {
    A: 'active', P: 'pending', S: 'sold', LEAS: 'leased',
    W: 'withdrawn', X: 'expired', T: 'terminated', I: 'incomplete'
  }
  return map[s] ?? 'other'
}

// ── In-memory sync progress (shared across requests) ──

interface SyncProgress {
  running: boolean
  startedAt: string | null
  phase: string
  currentCity: string
  currentStatus: string
  citiesTotal: number
  citiesDone: number
  stats: {
    total: number
    created: number
    updated: number
    skipped: number
    duplicates: number
    errors: number
    errorDetails: string[]
    byStatus: Record<string, { created: number; updated: number }>
  }
  result: any | null
  error: string | null
}

const syncProgress: SyncProgress = {
  running: false,
  startedAt: null,
  phase: 'idle',
  currentCity: '',
  currentStatus: '',
  citiesTotal: 0,
  citiesDone: 0,
  stats: {
    total: 0, created: 0, updated: 0, skipped: 0, duplicates: 0, errors: 0,
    errorDetails: [], byStatus: {}
  },
  result: null,
  error: null,
}

/** Exported so sync-status.get.ts can read it */
export function getPillar9SyncProgress() {
  return { ...syncProgress }
}

// ── Background sync worker ──

async function runSyncInBackground(params: any) {
  const {
    filters, syncSold, syncPending, syncAllStatuses, syncStatuses,
    deduplicateWithCrea, includeMedia, cityCodes, delayBetweenBatchesMs
  } = params

  const config = useRuntimeConfig()
  pillar9Service.initConfig({
    clientId: config.pillar9ClientId,
    clientSecret: config.pillar9ClientSecret,
    apiHost: config.pillar9ApiHost
  })

  const configStatus = pillar9Service.getConfigStatus()
  if (!configStatus.configured) {
    syncProgress.error = configStatus.message
    syncProgress.running = false
    syncProgress.phase = 'error'
    return
  }

  const statusesToSync: string[] = syncAllStatuses
    ? [...pillar9Service.getMlsStatuses()]
    : ['A', ...(syncSold ? ['S'] : []), ...(syncPending ? ['P'] : []), ...syncStatuses]

  const citiesToSync = cityCodes.length > 0 ? cityCodes : pillar9Service.getAlbertaCityCodes()

  // ── Pseudo-sold inference state (per-run, in memory) ─────────────────
  // Track which {externalId, mlsNumber} pairs Pillar9 actually returned
  // under each MlsStatus this run. Combined with `lastSeenStatuses` on
  // each Property row, this lets us infer "was pending, no longer in any
  // observable status this run → sold" once the city loop completes.
  // See server/utils/pseudo-sold.ts for the full rationale.
  const seenInRun = makeSeenInRun()
  const citiesScopedThisRun = new Set<string>()
  for (const code of citiesToSync) {
    // `getCityName` returns the mapped name when known, otherwise the
    // code itself. Either way, that's what `pillar9Service.transform...`
    // stores in `Property.city`, so it's the right key to query by.
    const name = pillar9Service.getCityName(code) || code
    if (name) citiesScopedThisRun.add(name)
  }
  const pseudoSoldRunId = `pillar9-${new Date().toISOString()}-${Math.random().toString(36).slice(2, 8)}`

  const byStatus: Record<string, { created: number; updated: number }> = {}
  for (const s of statusesToSync) byStatus[statusToKey(s)] = { created: 0, updated: 0 }

  syncProgress.stats = {
    total: 0, created: 0, updated: 0, skipped: 0, duplicates: 0, errors: 0,
    errorDetails: [], byStatus
  }
  syncProgress.citiesTotal = citiesToSync.length
  syncProgress.citiesDone = 0
  syncProgress.phase = 'syncing'

  console.log('🏠 Starting Pillar9 property sync (city-code batching)...', {
    statuses: statusesToSync, cities: citiesToSync.length, includeMedia, deduplicateWithCrea
  })

  const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

  async function fetchBatchWithRetry(
    cityCode: string,
    status: string,
    skip: number,
    minPrice?: number,
    maxPrice?: number,
  ): Promise<{ properties: Awaited<ReturnType<typeof pillar9Service.getProperties>>; success: boolean; tooMany: boolean; invalidCity: boolean }> {
    let retries401 = 0
    let retries429 = 0
    while (true) {
      try {
        const properties = await pillar9Service.getProperties({
          status: status as any,
          cityCode,
          province: filters.province || 'AB',
          limit: BATCH_LIMIT,
          skip,
          minPrice,
          maxPrice,
        })
        return { properties, success: true, tooMany: false, invalidCity: false }
      } catch (batchError: any) {
        const msg = batchError?.message ?? String(batchError)
        const statusCode = (batchError as any)?.statusCode

        if (msg.includes('More than') && msg.includes('results found')) {
          return { properties: [], success: false, tooMany: true, invalidCity: false }
        }
        if (msg.includes('not a valid enumeration') || msg.includes('not a valid Edm')) {
          console.log(`⏭️  Pillar9: city code ${cityCode} is not a valid enum — skipping entirely`)
          return { properties: [], success: true, tooMany: false, invalidCity: true }
        }
        if (statusCode === 401 && retries401 < MAX_RETRIES_ON_401) {
          retries401++
          const backoff401 = Math.min(DELAY_ON_401_BASE_MS * retries401, 60000)
          syncProgress.phase = `retry-401 (${retries401}, wait ${Math.round(backoff401 / 1000)}s)`
          await delay(backoff401)
        } else if (statusCode === 429 && retries429 < MAX_RETRIES_ON_429) {
          retries429++
          const backoffMs = Math.min(DELAY_ON_429_BASE_MS * retries429, 120000)
          syncProgress.phase = `rate-limited (wait ${Math.round(backoffMs / 1000)}s)`
          await delay(backoffMs)
        } else {
          syncProgress.stats.errors++
          syncProgress.stats.errorDetails.push(`Batch city ${cityCode} status ${status}: ${msg}`)
          return { properties: [], success: false, tooMany: false, invalidCity: false }
        }
      }
    }
  }

  async function fetchAllForCityStatus(
    cityCode: string,
    status: string,
    minPrice?: number,
    maxPrice?: number,
  ): Promise<{ properties: Awaited<ReturnType<typeof pillar9Service.getProperties>>; invalidCity: boolean }> {
    const all: Awaited<ReturnType<typeof pillar9Service.getProperties>> = []
    let skip = 0
    let hasMore = true

    while (hasMore) {
      const result = await fetchBatchWithRetry(cityCode, status, skip, minPrice, maxPrice)

      if (result.invalidCity) {
        return { properties: [], invalidCity: true }
      }

      if (result.tooMany) {
        console.log(`📊 Pillar9: city ${cityCode} status ${status} too large — splitting by price range`)
        syncProgress.phase = `splitting city ${cityCode}`
        const subResults: Awaited<ReturnType<typeof pillar9Service.getProperties>> = []
        for (const bracket of PRICE_RANGE_BRACKETS) {
          const sub = await fetchAllForCityStatus(cityCode, status, bracket.min, bracket.max)
          if (sub.invalidCity) return { properties: [], invalidCity: true }
          subResults.push(...sub.properties)
          await delay(DELAY_BETWEEN_BATCHES_MS)
        }
        return { properties: subResults, invalidCity: false }
      }

      if (!result.success || result.properties.length === 0) break

      all.push(...result.properties)
      if (result.properties.length < BATCH_LIMIT) hasMore = false
      else skip += BATCH_LIMIT
      await delay(delayBetweenBatchesMs)
    }

    return { properties: all, invalidCity: false }
  }

  try {
    for (const cityCode of citiesToSync) {
      syncProgress.currentCity = cityCode
      let skipCity = false

      for (const status of statusesToSync) {
        if (skipCity) break
        syncProgress.currentStatus = status
        syncProgress.phase = 'syncing'

        const fetchResult = await fetchAllForCityStatus(
          cityCode,
          status,
          filters.minPrice,
          filters.maxPrice,
        )

        if (fetchResult.invalidCity) {
          skipCity = true
          break
        }

        const properties = fetchResult.properties
        if (properties.length === 0) continue

        syncProgress.stats.total += properties.length

        for (const p9Prop of properties) {
          try {
            let transformedProperty = pillar9Service.transformToLocalProperty(p9Prop)
            if (!transformedProperty) { syncProgress.stats.skipped++; continue }

            if (deduplicateWithCrea && transformedProperty.mlsNumber) {
              const existingCrea: any = await prisma.property.findFirst({
                where: { source: 'crea', mlsNumber: transformedProperty.mlsNumber }
              })
              if (existingCrea) {
                const p9Status = transformedProperty.status as string

                // Pseudo-sold tracking: stamp `lastSeenStatuses[X]` on the
                // CREA row so the end-of-run diff can detect "was pending,
                // no longer in any feed pass" for cross-source listings.
                // CREA itself never exposes MlsStatus, so this is the only
                // place we get to record that Pillar9 saw this MLS# under
                // status X today. Done unconditionally for every dedupe
                // hit, before anything else, so even no-op dedupes still
                // refresh the marker.
                const dedupeExternalId = p9Prop.ListingKeyNumeric != null
                  ? String(p9Prop.ListingKeyNumeric)
                  : p9Prop.ListingId
                recordSeen(seenInRun, status, dedupeExternalId, transformedProperty.mlsNumber)

                const existingCreaFeatures = parseFeatures(existingCrea.features)
                const stampedFeatures = stampLastSeen(existingCreaFeatures, status)
                const transition = applyPseudoSoldTransition(stampedFeatures, status)
                // Reversal: listing came back as A or P after we'd inferred
                // it sold — undo the inferred sold status on the CREA row
                // so it shows live again. CREA's mapping for both A and P
                // is `for_sale` (CREA doesn't have a Pending status of its
                // own), so that's the status to restore.
                const reversalStatus = transition.priceHistoryEvent === PSEUDO_SOLD_REVERSED_EVENT
                  ? 'for_sale'
                  : null

                const statusUpdateNeeded = ['sold', 'terminated', 'withdrawn', 'expired'].includes(p9Status)
                  && existingCrea.status !== p9Status

                // Opportunistically backfill MLS-native price fields on the
                // CREA-owned row when they're missing or stale. We never
                // overwrite CREA's `price` from Pillar9 here — CREA is the
                // authoritative price feed for active listings — but if Pillar9
                // exposes the original / previous list price and CREA hasn't,
                // this is the cheapest way to make the Best Deals page work for
                // legacy rows that pre-date this column.
                const p9OriginalListPrice = (transformedProperty as any).originalListPrice as number | null | undefined
                const p9PreviousListPrice = (transformedProperty as any).previousListPrice as number | null | undefined
                const p9PriceChangeTs = (transformedProperty as any).priceChangeTimestamp as Date | null | undefined
                const priceFieldUpdate: Record<string, any> = {}
                if (existingCrea.originalListPrice == null && typeof p9OriginalListPrice === 'number') {
                  priceFieldUpdate.originalListPrice = p9OriginalListPrice
                }
                if (existingCrea.previousListPrice == null && typeof p9PreviousListPrice === 'number') {
                  priceFieldUpdate.previousListPrice = p9PreviousListPrice
                }
                if (existingCrea.priceChangeTimestamp == null && p9PriceChangeTs instanceof Date) {
                  priceFieldUpdate.priceChangeTimestamp = p9PriceChangeTs
                }

                // We now always write at least the `lastSeenStatuses`
                // stamp (and the reversal status when applicable), so the
                // outer `if` only gates the legacy status/price changes —
                // the update itself is unconditional.
                try {
                  // Start the features payload from `transition.features`
                  // (which has the fresh stamp baked in and `soldInference`
                  // cleared if the listing was being un-pseudo-sold).
                  let mergedFeatures: any = transition.features
                  const updateData: any = {
                    ...priceFieldUpdate,
                    lastSyncAt: new Date(),
                    features: mergedFeatures,
                  }

                  if (reversalStatus) {
                    updateData.status = reversalStatus
                  }

                  if (statusUpdateNeeded) {
                    updateData.status = p9Status
                    if (p9Status === 'sold' && transformedProperty.features) {
                      const p9Features = typeof transformedProperty.features === 'string'
                        ? JSON.parse(transformedProperty.features as string)
                        : transformedProperty.features
                      mergedFeatures = {
                        ...mergedFeatures,
                        closeDate: (p9Features as any)?.closeDate || null,
                        closePrice: (p9Features as any)?.closePrice || null,
                        statusChangeTimestamp: new Date().toISOString(),
                      }
                      updateData.features = mergedFeatures
                      if ((p9Features as any)?.closePrice) updateData.price = (p9Features as any).closePrice
                    }
                  }

                  await prisma.property.update({ where: { id: existingCrea.id }, data: updateData })

                  if (statusUpdateNeeded && p9Status === 'sold') {
                    await (prisma as any).propertyPriceHistory.create({
                      data: { propertyId: existingCrea.id, price: existingCrea.price, event: 'sold', source: 'pillar9' }
                    }).catch(() => {})
                  }
                  // Audit the pseudo-sold reversal/upgrade so analytics can
                  // tell "we wrongly inferred sold then corrected" from a
                  // genuine sold event.
                  if (transition.priceHistoryEvent) {
                    await (prisma as any).propertyPriceHistory.create({
                      data: {
                        propertyId: existingCrea.id,
                        price: existingCrea.price,
                        event: transition.priceHistoryEvent,
                        source: 'pillar9',
                      }
                    }).catch(() => {})
                  }
                  if (statusUpdateNeeded || reversalStatus) {
                    syncProgress.stats.updated++
                    const sKey = statusToKey(status)
                    if (syncProgress.stats.byStatus[sKey]) syncProgress.stats.byStatus[sKey]!.updated++
                  }
                } catch (_err) { /* non-critical */ }

                syncProgress.stats.duplicates++
                continue
              }
            }

            if (includeMedia && (!transformedProperty.images || (transformedProperty.images as string[]).length === 0) && p9Prop.ListingKeyNumeric != null) {
              const mediaUrls = await getPropertyMediaWithRetry(p9Prop.ListingKeyNumeric, delay)
              if (mediaUrls.length > 0) transformedProperty = { ...transformedProperty, images: mediaUrls }
              await delay(DELAY_BETWEEN_MEDIA_MS)
            }

            const { user, agent, isSaved, ...propertyData } = transformedProperty as any
            const externalId = p9Prop.ListingKeyNumeric != null ? String(p9Prop.ListingKeyNumeric) : p9Prop.ListingId
            const existingProperty: any = await prisma.property.findFirst({
              where: { source: 'pillar9', externalId }
            })

            // Pseudo-sold tracking on the Pillar9-owned row. Same shape as
            // the dedupe block above: stamp `lastSeenStatuses[X]`, then
            // ask `applyPseudoSoldTransition` whether the existing row's
            // inferred-sold marker has been contradicted (back to A/P) or
            // upgraded (real S now arriving).
            recordSeen(seenInRun, status, externalId, transformedProperty.mlsNumber || null)
            const existingP9Features = parseFeatures(existingProperty?.features)
            const incomingP9Features = parseFeatures((propertyData as any).features)
            const stampedP9Features = stampLastSeen(
              { ...existingP9Features, ...incomingP9Features },
              status,
            )
            const p9Transition = applyPseudoSoldTransition(stampedP9Features, status)
            ;(propertyData as any).features = p9Transition.features

            const statusKey = statusToKey(status)
            const newPrice = propertyData.price || 0
            const data = {
              ...propertyData,
              lastSyncAt: new Date(),
              ...(existingProperty
                ? { views: existingProperty.views, createdAt: existingProperty.createdAt, firstEntryPrice: existingProperty.firstEntryPrice ?? existingProperty.price }
                : { firstEntryPrice: newPrice })
            }

            let saved = false
            for (let attempt = 1; attempt <= 2 && !saved; attempt++) {
              try {
                if (existingProperty) {
                  const oldPrice = existingProperty.price
                  if (oldPrice && newPrice && oldPrice !== newPrice) {
                    const changeAmt = newPrice - oldPrice
                    const changePct = parseFloat(((changeAmt / oldPrice) * 100).toFixed(2))
                    try {
                      await (prisma as any).propertyPriceHistory.create({
                        data: { propertyId: existingProperty.id, price: newPrice, event: changeAmt < 0 ? 'price_decrease' : 'price_increase', changeAmt, changePct, source: 'pillar9' }
                      })
                    } catch (_) { /* non-critical */ }
                  }
                  await (prisma.property as any).update({ where: { id: existingProperty.id }, data })
                  // Audit pseudo-sold reversal/upgrade events on the
                  // Pillar9 row, mirroring the dedupe path.
                  if (p9Transition.priceHistoryEvent) {
                    await (prisma as any).propertyPriceHistory.create({
                      data: {
                        propertyId: existingProperty.id,
                        price: newPrice,
                        event: p9Transition.priceHistoryEvent,
                        source: 'pillar9',
                      }
                    }).catch(() => {})
                    // Real-S upgrade also deserves the standard 'sold' row
                    // so existing analytics queries that filter by event
                    // ='sold' pick it up.
                    if (p9Transition.priceHistoryEvent === REAL_SOLD_EVENT) {
                      await (prisma as any).propertyPriceHistory.create({
                        data: { propertyId: existingProperty.id, price: newPrice, event: 'sold', source: 'pillar9' }
                      }).catch(() => {})
                    }
                  }
                  syncProgress.stats.updated++
                  if (syncProgress.stats.byStatus[statusKey]) syncProgress.stats.byStatus[statusKey].updated++
                } else {
                  const created: any = await (prisma.property as any).create({
                    data: { ...propertyData, lastSyncAt: new Date(), firstEntryPrice: newPrice }
                  })
                  try {
                    await (prisma as any).propertyPriceHistory.create({
                      data: { propertyId: created.id, price: newPrice, event: 'listed', source: 'pillar9' }
                    })
                  } catch (_) { /* non-critical */ }
                  syncProgress.stats.created++
                  if (syncProgress.stats.byStatus[statusKey]) syncProgress.stats.byStatus[statusKey].created++
                }
                saved = true
              } catch (saveError: any) {
                if (attempt === 1) await delay(1000)
                else {
                  syncProgress.stats.errors++
                  syncProgress.stats.errorDetails.push(`Property ${p9Prop.ListingId}: ${saveError.message}`)
                }
              }
            }
          } catch (propError: any) {
            syncProgress.stats.errors++
            syncProgress.stats.errorDetails.push(`Property ${p9Prop.ListingId}: ${propError.message}`)
          }
        }
      }

      syncProgress.citiesDone++
    }

    syncProgress.phase = 'finalizing'

    // ── Pseudo-sold inference (runs only on a clean city-loop completion) ──
    // We only get here if the for-cityCode loop completed without
    // throwing. Partial runs would risk false-positive sold inferences,
    // since the absence of a listing in `seenInRun` could just mean we
    // never reached its city. The diff itself enforces the additional
    // rule that A and P must both have been part of `statusesToSync`.
    syncProgress.phase = 'inferring-sold'
    let pseudoSoldResult: Awaited<ReturnType<typeof runPendingDisappearanceDiff>> | null = null
    try {
      pseudoSoldResult = await runPendingDisappearanceDiff({
        prisma,
        seenInRun,
        citiesScopedThisRun,
        statusesSyncedThisRun: new Set(statusesToSync.map((s: string) => s.toUpperCase())),
        runId: pseudoSoldRunId,
        province: filters.province || 'AB',
      })
      console.log('🔮 Pseudo-sold inference:', pseudoSoldResult)
    } catch (inferErr: any) {
      console.error('❌ Pseudo-sold inference failed:', inferErr)
      syncProgress.stats.errorDetails.push(`pseudo-sold: ${inferErr.message ?? inferErr}`)
    }

    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const staleProperties = await prisma.property.updateMany({
      where: { source: 'pillar9', lastSyncAt: { lt: cutoffDate }, status: 'for_sale' },
      data: { status: 'expired' }
    })

    const sysAdmin = await prisma.user.findFirst({ where: { role: 'super_admin' }, select: { id: true } })
    const sysAdminId = sysAdmin?.id ?? null
    await (prisma.setting as any).upsert({
      where: { adminId_key: { adminId: sysAdminId!, key: 'pillar9_last_sync' } },
      update: { value: new Date().toISOString() },
      create: { adminId: sysAdminId, key: 'pillar9_last_sync', value: new Date().toISOString() }
    })

    syncProgress.result = {
      success: true,
      stats: { ...syncProgress.stats },
      pseudoSold: pseudoSoldResult,
      stalePropertiesMarked: staleProperties.count,
      message: `Sync completed: ${syncProgress.stats.created} created, ${syncProgress.stats.updated} updated, ${syncProgress.stats.duplicates} duplicates skipped, ${syncProgress.stats.errors} errors`
        + (pseudoSoldResult
          ? ` | pseudo-sold: scanned ${pseudoSoldResult.candidatesScanned}, promoted ${pseudoSoldResult.promoted} (CREA propagated ${pseudoSoldResult.propagatedToCrea})${pseudoSoldResult.skippedReason ? ` [skipped: ${pseudoSoldResult.skippedReason}]` : ''}`
          : ''),
    }
    syncProgress.phase = 'completed'
    console.log('\n✅ Pillar9 sync completed:', syncProgress.stats)
  } catch (error: any) {
    console.error('❌ Pillar9 sync error:', error)
    syncProgress.error = error.message
    syncProgress.phase = 'error'
  } finally {
    syncProgress.running = false
  }
}

// ── HTTP handler ──

export default defineEventHandler(async (event) => {
  await requireAdminOrSyncSecret(event)

  const query = getQuery(event)

  // ?mode=blocking — script callers (pillar9-sync.mjs) want to wait for the full result
  const blocking = query.mode === 'blocking'

  if (syncProgress.running) {
    // If already running and caller wants blocking, wait for it to finish
    if (blocking) {
      while (syncProgress.running) {
        await new Promise(r => setTimeout(r, 5000))
      }
      if (syncProgress.result) return syncProgress.result
      throw createError({ statusCode: 500, statusMessage: syncProgress.error || 'Sync failed' })
    }
    return {
      success: false,
      alreadyRunning: true,
      message: 'A sync is already in progress. Check sync-status for progress.',
      progress: {
        phase: syncProgress.phase,
        citiesDone: syncProgress.citiesDone,
        citiesTotal: syncProgress.citiesTotal,
        stats: syncProgress.stats,
      }
    }
  }

  const body = await readBody(event).catch(() => ({}))
  const params = {
    filters: body.filters || {},
    syncSold: body.syncSold ?? false,
    syncPending: body.syncPending ?? false,
    syncAllStatuses: body.syncAllStatuses ?? true,
    syncStatuses: body.syncStatuses || [],
    deduplicateWithCrea: body.deduplicateWithCrea ?? true,
    includeMedia: body.includeMedia ?? true,
    cityCodes: body.cityCodes || [],
    delayBetweenBatchesMs: body.delayBetweenBatchesMs ?? DELAY_BETWEEN_BATCHES_MS,
  }

  // Reset progress
  syncProgress.running = true
  syncProgress.startedAt = new Date().toISOString()
  syncProgress.phase = 'starting'
  syncProgress.currentCity = ''
  syncProgress.currentStatus = ''
  syncProgress.citiesTotal = 0
  syncProgress.citiesDone = 0
  syncProgress.result = null
  syncProgress.error = null

  if (blocking) {
    // Script callers: run synchronously and return result
    await runSyncInBackground(params)
    if (syncProgress.result) return syncProgress.result
    throw createError({ statusCode: 500, statusMessage: syncProgress.error || 'Sync failed' })
  }

  // Admin UI: fire-and-forget, return immediately
  runSyncInBackground(params).catch(err => {
    console.error('❌ Background sync crashed:', err)
    syncProgress.running = false
    syncProgress.phase = 'error'
    syncProgress.error = err.message
  })

  return {
    success: true,
    started: true,
    message: 'Sync started in background. Poll sync-status for progress.',
  }
})
