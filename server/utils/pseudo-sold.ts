/**
 * Pseudo-sold inference for Pillar9 listings.
 *
 * Why this still exists (now a fallback, not the primary signal)
 * ───────────────────────────────────────────────────────────────
 * As of 2026-05, `scripts/test-pillar9-direct.mjs --probe-only` against
 * `abrls.matrixwebapi.com` confirms the full RESO MlsStatus enum is now
 * observable on this tenant:
 *
 *   - `A`, `P`, `S`, `W`, `X`, `T` all return real data.
 *   - `I` is accepted by the enum but returns 0 rows tenant-wide.
 *
 * That means real `S` (sold), `W` (withdrawn), `X` (expired), and `T`
 * (terminated) signals now come straight from the feed and are written
 * directly via the normal upsert + Pillar9→CREA cross-update path.
 * Inference is no longer load-bearing for any of those transitions.
 *
 * What this module still catches
 * ──────────────────────────────
 * Listings that disappear from every observable status entirely — i.e.
 * the row was Pending in a previous run, and on this run Pillar9 didn't
 * return it under A, P, S, W, X, *or* T. That can happen when the listing
 * is dropped from the feed before being assigned a terminal status, or
 * when the broker re-listed it under a new MLS#. We still treat that as
 * a probable sold (more likely than dropped-and-forgotten), with the
 * `pseudo_sold` audit marker so analytics can keep it separate from
 * confirmed sales.
 *
 * Inference rule (per sync run, no time-based grace)
 * ──────────────────────────────────────────────────
 * A row currently `status='pending'` with a `lastSeenStatuses.P` marker,
 * in a city we synced this run, NOT returned under any of A/P/S/W/X/T
 * during this run
 *   → infer sold.
 *
 * Listings that came back under `A`, `S`, or any terminal status are
 * handled by the normal upsert path (real S → real sold, A/P → restore
 * for_sale, etc.) and never reach this candidate set.
 *
 * Storage (no schema migration)
 * ─────────────────────────────
 *   `Property.features.lastSeenStatuses = { A: ISO, P: ISO, S: ISO, W: ISO, X: ISO, T: ISO }`
 *   `Property.features.soldInference   = { method, confidence, ... }`
 *   `PropertyPriceHistory.event        = 'pseudo_sold' | 'pseudo_sold_reversed'`
 *
 * The `event` column is a free-form string in the schema, so adding
 * `'pseudo_sold'` is a convention change, not a migration.
 */

import type { PrismaClient } from '@prisma/client'

export const PSEUDO_SOLD_EVENT = 'pseudo_sold'
export const PSEUDO_SOLD_REVERSED_EVENT = 'pseudo_sold_reversed'
export const REAL_SOLD_EVENT = 'sold'

// Tag stored on `features.soldInference.method` so downstream consumers
// (CMA, price-trend models, "recently sold" UI) can distinguish inferred
// sales from confirmed ones.
export const INFERENCE_METHOD = 'pending_disappeared'

// Any observable status that re-surfaces the listing rules out a sold
// guess. Pending stays in this set even though the candidate WAS pending —
// "still pending after this run" means the listing is alive and we should
// not infer anything. With the full RESO enum now observable on this
// tenant (S/W/X/T are real signals as of 2026-05), inference only fires
// when the listing has truly vanished from every observable status.
const SIBLING_RULE_OUT_STATUSES = ['A', 'P', 'S', 'W', 'X', 'T'] as const

export type Confidence = 'low' | 'medium' | 'high'

export interface SoldInference {
  method: typeof INFERENCE_METHOD
  confidence: Confidence
  lastSeenInPendingFeed: string
  inferredAt: string
  runId: string
}

export interface FeaturesObject {
  lastSeenStatuses?: Partial<Record<string, string>>
  soldInference?: SoldInference
  [key: string]: any
}

// ── Pure helpers (no I/O, used in the sync upsert hot loop) ────────────

/**
 * `Property.features` is `Json?` and may arrive as a JSON string, an
 * already-parsed object, or null. Always go through this so the rest of
 * the module can treat it as a plain object.
 */
export function parseFeatures(raw: unknown): FeaturesObject {
  if (raw == null) return {}
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) || {} } catch { return {} }
  }
  if (typeof raw === 'object') return raw as FeaturesObject
  return {}
}

/**
 * Stamp `features.lastSeenStatuses[status] = now`, preserving every other
 * field on the row. Called for every Pillar9 listing we successfully
 * fetched in a sync run, including those we dedupe-skip into a CREA row.
 */
export function stampLastSeen(features: FeaturesObject, mlsStatus: string): FeaturesObject {
  const key = String(mlsStatus || '').toUpperCase()
  if (!key) return features
  return {
    ...features,
    lastSeenStatuses: {
      ...(features.lastSeenStatuses || {}),
      [key]: new Date().toISOString(),
    },
  }
}

export interface TransitionResult {
  features: FeaturesObject
  priceHistoryEvent: typeof PSEUDO_SOLD_REVERSED_EVENT | typeof REAL_SOLD_EVENT | null
}

/**
 * Reversal / upgrade hook for the per-listing upsert path.
 *
 * If the row in DB carries our pseudo-sold marker AND the feed now reports
 * the listing under a status that contradicts or upgrades that marker,
 * clear the marker and tell the caller which audit event to write:
 *
 *   - incoming `A` or `P`  → `pseudo_sold_reversed` (deal fell through).
 *     Caller restores `status` from the incoming transform.
 *   - incoming `S`         → `sold` (real, confirmed). Caller keeps
 *     `status='sold'`. We preserve `inferredAt` for analytics by stashing
 *     it on the cleared object's `previousInference` field.
 *
 * Anything else → no change (we shouldn't be seeing W/X/T/I with data on
 * this tenant, and even if we did, those don't contradict "sold").
 */
export function applyPseudoSoldTransition(
  features: FeaturesObject,
  incomingMlsStatus: string,
): TransitionResult {
  const inference = features.soldInference
  if (!inference || inference.method !== INFERENCE_METHOD) {
    return { features, priceHistoryEvent: null }
  }

  const status = String(incomingMlsStatus || '').toUpperCase()
  const { soldInference: drop, ...rest } = features

  if (status === 'A' || status === 'P') {
    return { features: rest, priceHistoryEvent: PSEUDO_SOLD_REVERSED_EVENT }
  }
  if (status === 'S') {
    return {
      features: {
        ...rest,
        previousInference: {
          method: drop!.method,
          inferredAt: drop!.inferredAt,
          confidence: drop!.confidence,
          confirmedAt: new Date().toISOString(),
        },
      },
      priceHistoryEvent: REAL_SOLD_EVENT,
    }
  }
  return { features, priceHistoryEvent: null }
}

// ── Confidence scoring (cheap heuristic, ship from day one) ────────────

interface ConfidenceInputs {
  daysOnMarket: number | null
  priceChangeTimestamp: Date | string | null
  previousListPrice: number | null
  price: number
}

function computeConfidence(p: ConfidenceInputs): Confidence {
  let score = 30
  if ((p.daysOnMarket ?? 0) > 30) score += 20
  if (p.priceChangeTimestamp) {
    const ts = typeof p.priceChangeTimestamp === 'string'
      ? new Date(p.priceChangeTimestamp).getTime()
      : p.priceChangeTimestamp.getTime()
    if (!Number.isNaN(ts)) {
      const days = (Date.now() - ts) / 86400000
      if (days <= 60 && days >= 0) score += 20
    }
  }
  if (p.previousListPrice != null && p.price > 0 && p.previousListPrice > p.price) {
    score += 15
  }
  if (score >= 70) return 'high'
  if (score >= 50) return 'medium'
  return 'low'
}

// ── Diff + promotion phase (runs once per sync, after city loop) ───────

export interface SeenInRun {
  externalIds: Map<string, Set<string>> // status → externalIds returned this run
  mlsNumbers: Map<string, Set<string>>  // status → mlsNumbers returned this run
}

export function makeSeenInRun(): SeenInRun {
  return { externalIds: new Map(), mlsNumbers: new Map() }
}

export function recordSeen(
  seen: SeenInRun,
  status: string,
  externalId: string | null | undefined,
  mlsNumber: string | null | undefined,
) {
  const key = String(status || '').toUpperCase()
  if (!key) return
  if (externalId) {
    let s = seen.externalIds.get(key)
    if (!s) { s = new Set(); seen.externalIds.set(key, s) }
    s.add(externalId)
  }
  if (mlsNumber) {
    let s = seen.mlsNumbers.get(key)
    if (!s) { s = new Set(); seen.mlsNumbers.set(key, s) }
    s.add(mlsNumber)
  }
}

export interface DiffParams {
  prisma: PrismaClient
  seenInRun: SeenInRun
  citiesScopedThisRun: Set<string>      // city NAMES (not Pillar9 codes)
  statusesSyncedThisRun: Set<string>    // uppercase MlsStatus values
  runId: string
  province?: string
}

export interface DiffResult {
  candidatesScanned: number
  promoted: number
  propagatedToCrea: number
  skippedReason: string | null
  errors: number
  errorDetails: string[]
}

/**
 * Pure JS rule-out check, factored out so both code paths use the same
 * logic. A candidate survives iff neither its externalId NOR its
 * mlsNumber appears in any of the rule-out status sets.
 */
function isStillCandidate(
  seen: SeenInRun,
  externalId: string | null,
  mlsNumber: string | null,
): boolean {
  for (const s of SIBLING_RULE_OUT_STATUSES) {
    if (externalId) {
      const ext = seen.externalIds.get(s)
      if (ext?.has(externalId)) return false
    }
    if (mlsNumber) {
      const mls = seen.mlsNumbers.get(s)
      if (mls?.has(mlsNumber)) return false
    }
  }
  return true
}

/**
 * Find every Pillar9-known pending listing the feed didn't return this
 * run, and promote it to sold with the inference marker. Also propagates
 * to the matching CREA row by mlsNumber where one exists.
 *
 * Two candidate paths:
 *
 *   1. Pillar9-only rows         — `source='pillar9'` AND `status='pending'`.
 *      Came in through Pillar9's normal upsert path (no CREA match).
 *
 *   2. CREA rows seen as P via dedupe — `source='crea'`,
 *      `features.lastSeenStatuses.P IS NOT NULL`, `status != 'sold'`.
 *      The Pillar9 dedupe block stamped `lastSeenStatuses.P` on the CREA
 *      row when it saw the same MLS# under `MlsStatus eq 'P'`. Since CREA
 *      itself doesn't expose Pending, this is the only signal that the
 *      listing was ever pending in the wider feed.
 */
export async function runPendingDisappearanceDiff(params: DiffParams): Promise<DiffResult> {
  const { prisma, seenInRun, citiesScopedThisRun, statusesSyncedThisRun, runId, province } = params
  const result: DiffResult = {
    candidatesScanned: 0,
    promoted: 0,
    propagatedToCrea: 0,
    skippedReason: null,
    errors: 0,
    errorDetails: [],
  }

  // We need both A and P synced this run to perform inference. P tells
  // us which listings to consider; A tells us which ones came back to
  // market. Without both, the false-positive rate would be uncontrolled.
  if (!statusesSyncedThisRun.has('A') || !statusesSyncedThisRun.has('P')) {
    result.skippedReason = 'A or P was not part of statuses synced this run'
    return result
  }
  if (citiesScopedThisRun.size === 0) {
    result.skippedReason = 'no cities scoped this run'
    return result
  }

  const cityList = Array.from(citiesScopedThisRun)

  // ── Path 1: Pillar9-only rows ────────────────────────────────────────
  // These are listings Pillar9 had that didn't match any CREA row at the
  // time they were ingested. Status='pending' is the marker.
  const pillar9Candidates = await (prisma as any).property.findMany({
    where: {
      source: 'pillar9',
      status: 'pending',
      city: { in: cityList },
      ...(province ? { province } : {}),
    },
    select: {
      id: true, externalId: true, mlsNumber: true, price: true, city: true,
      daysOnMarket: true, priceChangeTimestamp: true, previousListPrice: true,
      features: true,
    },
  })

  // ── Path 2: CREA rows that Pillar9 saw as Pending via dedupe ─────────
  // The dedupe block in sync.post.ts stamps `features.lastSeenStatuses.P`
  // on the matching CREA row whenever a Pillar9 P arrives. We look for
  // those rows here. We don't restrict by current status because the
  // CREA row could be 'for_sale' (CREA's only status) while pending in
  // Pillar9.
  const creaCandidates = await (prisma as any).property.findMany({
    where: {
      source: 'crea',
      city: { in: cityList },
      ...(province ? { province } : {}),
      status: { not: 'sold' },
      // Postgres JSON path: features->'lastSeenStatuses'->>'P' IS NOT NULL.
      features: { path: ['lastSeenStatuses', 'P'], not: 0 },
    } as any,
    select: {
      id: true, externalId: true, mlsNumber: true, price: true, city: true,
      daysOnMarket: true, priceChangeTimestamp: true, previousListPrice: true,
      features: true,
    },
  })

  const allCandidates = [...pillar9Candidates, ...creaCandidates]
  result.candidatesScanned = allCandidates.length

  for (const c of allCandidates) {
    try {
      if (!isStillCandidate(seenInRun, c.externalId ?? null, c.mlsNumber ?? null)) continue

      const features = parseFeatures(c.features)
      const lastSeenP = features.lastSeenStatuses?.P
      // No lastSeenP means we never observed it as pending in the feed
      // — could be a stale row from before this feature shipped. Skip.
      if (!lastSeenP) continue

      const confidence = computeConfidence({
        daysOnMarket: c.daysOnMarket ?? null,
        priceChangeTimestamp: c.priceChangeTimestamp ?? null,
        previousListPrice: c.previousListPrice ?? null,
        price: c.price ?? 0,
      })

      const inference: SoldInference = {
        method: INFERENCE_METHOD,
        confidence,
        lastSeenInPendingFeed: lastSeenP,
        inferredAt: new Date().toISOString(),
        runId,
      }

      const newFeatures = {
        ...features,
        soldInference: inference,
        statusChangeTimestamp: new Date().toISOString(),
      }

      await (prisma as any).property.update({
        where: { id: c.id },
        data: { status: 'sold', features: newFeatures, lastSyncAt: new Date() },
      })
      await (prisma as any).propertyPriceHistory.create({
        data: {
          propertyId: c.id,
          price: c.price ?? 0,
          event: PSEUDO_SOLD_EVENT,
          source: 'pillar9',
        },
      }).catch(() => { /* non-critical — keep status update */ })

      result.promoted++

      // Cross-source propagation: if this candidate was a Pillar9 row,
      // also flip the matching CREA row by mlsNumber. (For CREA-source
      // candidates we just updated the CREA row directly above — nothing
      // more to do.)
      if (c.mlsNumber) {
        const isPillar9Row = pillar9Candidates.some((p: any) => p.id === c.id)
        if (isPillar9Row) {
          const matchingCrea: any = await (prisma as any).property.findFirst({
            where: { source: 'crea', mlsNumber: c.mlsNumber },
          })
          if (matchingCrea && matchingCrea.status !== 'sold') {
            const creaFeatures = parseFeatures(matchingCrea.features)
            await (prisma as any).property.update({
              where: { id: matchingCrea.id },
              data: {
                status: 'sold',
                lastSyncAt: new Date(),
                features: {
                  ...creaFeatures,
                  soldInference: inference,
                  statusChangeTimestamp: new Date().toISOString(),
                },
              },
            })
            await (prisma as any).propertyPriceHistory.create({
              data: {
                propertyId: matchingCrea.id,
                price: matchingCrea.price ?? 0,
                event: PSEUDO_SOLD_EVENT,
                source: 'pillar9',
              },
            }).catch(() => {})
            result.propagatedToCrea++
          }
        }
      }
    } catch (err: any) {
      result.errors++
      result.errorDetails.push(`property ${c.id}: ${err?.message || err}`)
    }
  }

  return result
}
