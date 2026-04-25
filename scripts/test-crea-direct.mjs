#!/usr/bin/env node
/**
 * Direct CREA DDF sold-status extractor.
 *
 * Companion to scripts/test-pillar9-direct.mjs. Same goal — figure out
 * whether the upstream feed actually carries sold listings before we change
 * any production code — but pointed at CREA's DDF (api.realtor.ca) instead
 * of Pillar9/Matrix.
 *
 * What the script does:
 *   1. Trades the configured CREA client_id/secret for an OAuth2 access
 *      token (same flow as server/utils/crea.service.ts).
 *   2. Detects which optional $select fields the tenant exposes — CREA
 *      tenants vary in whether ClosePrice / CloseDate are available because
 *      board-level VOW agreements toggle those columns.
 *   3. Samples a few hundred Property rows with NO status filter and
 *      tabulates the StandardStatus distribution, so you can SEE which
 *      sold-style values actually show up in this feed. (CREA DDF does
 *      NOT expose MlsStatus — verified — so we ignore it.)
 *   4. Probes the candidate sold-status enum values against StandardStatus
 *      ('Sold', 'Closed', etc.) until one returns rows.
 *   5. Extracts every sold row across the requested provinces, paginating
 *      with $skip + a guard for CREA's 5k-per-query soft cap (slices by
 *      ListPrice when needed).
 *   6. Writes results + summary to ./crea-sold-<timestamp>.json plus a
 *      per-province CSV.
 *
 * Usage:
 *   node --env-file=.env scripts/test-crea-direct.mjs
 *   node --env-file=.env scripts/test-crea-direct.mjs --probe-only
 *   node --env-file=.env scripts/test-crea-direct.mjs --list-statuses
 *   node --env-file=.env scripts/test-crea-direct.mjs --provinces=Alberta
 *   node --env-file=.env scripts/test-crea-direct.mjs --status=Sold
 *   node --env-file=.env scripts/test-crea-direct.mjs --status=Pending
 *   node --env-file=.env scripts/test-crea-direct.mjs --status=Closed
 *   node --env-file=.env scripts/test-crea-direct.mjs --min-close-date=2025-01-01
 *
 * Required env (read from .env via --env-file):
 *   CREA_CLIENT_ID
 *   CREA_CLIENT_SECRET
 *
 * Optional env:
 *   CREA_BASE_URL        (default https://ddfapi.realtor.ca)
 *   CREA_TOKEN_ENDPOINT  (default https://identity.crea.ca/connect/token)
 */

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CLIENT_ID = process.env.CREA_CLIENT_ID
const CLIENT_SECRET = process.env.CREA_CLIENT_SECRET
const BASE_URL = (process.env.CREA_BASE_URL || 'https://ddfapi.realtor.ca').replace(/\/+$/, '')
const TOKEN_ENDPOINT = process.env.CREA_TOKEN_ENDPOINT || 'https://identity.crea.ca/connect/token'

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing CREA_CLIENT_ID or CREA_CLIENT_SECRET in env.')
  process.exit(1)
}

// CREA's DDF feed uses RESO's `StandardStatus` exclusively; `MlsStatus` is a
// Pillar9/board-specific field that DDF does not expose at all (verified —
// every $select containing MlsStatus is rejected by the API). Production
// code in server/utils/crea.service.ts only ever filters on StandardStatus,
// passing 'Active' / 'Sold', so we use the same vocabulary here.
//
// The list below is the full RESO 2.0 StandardStatus enum we want to probe.
// We keep `Active` first because it's the baseline every DDF tenant exposes;
// the rest (Pending / Active Under Contract / Sold / Closed / etc.) are
// permission-gated on a per-tenant basis. `probeAllStatuses` runs each one
// and reports the actual row count so we can see which statuses CREA
// actually delivers to *this* tenant — answering the recurring question of
// "do we get anything other than Active?".
const STATUS_CANDIDATES = {
  StandardStatus: [
    'Active',
    'ComingSoon',
    'Pending',
    'Sale Pending',
    'Active Under Contract',
    'Sold',
    'Closed',
    'Hold',
    'Withdrawn',
    'Expired',
    'Cancelled',
    'Canceled',
    'Delete',
  ],
}

// Minimal baseline known to exist on every CREA DDF tenant. Verified against
// the production service's CreaProperty interface — these are the fields it
// reads back from every Property row.
const SAFE_SELECT_FIELDS = [
  'ListingKey',
  'ListingId',
  'StandardStatus',
  'ListPrice',
  'StateOrProvince',
  'City',
  'UnparsedAddress',
  'BedroomsTotal',
  'BathroomsTotalInteger',
  'PropertyType',
  'PropertySubType',
]

// Fields the production service hopes are there but that vary across DDF
// tenants depending on the broker's contract. Probed one-by-one before any
// extraction so we drop whichever ones this tenant doesn't ship.
const OPTIONAL_SELECT_FIELDS = [
  'OriginalListPrice',
  'PreviousListPrice',
  'ClosePrice',
  'CloseDate',
  'OnMarketDate',
  'OffMarketDate',
  'PendingTimestamp',
  'MajorChangeType',
  'MajorChangeTimestamp',
  'ListAgentFullName',
  'ListOfficeName',
]

let activeSelectFields = SAFE_SELECT_FIELDS.slice()
let supportsCloseDate = false

// ─── Auth ──────────────────────────────────────────────────────────────────

let cachedToken = null
let cachedTokenExpiresAt = 0

async function getAccessToken() {
  if (cachedToken && Date.now() < cachedTokenExpiresAt - 5 * 60 * 1000) return cachedToken

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`CREA token request failed: ${res.status} ${body.substring(0, 300)}`)
  }
  const json = await res.json()
  cachedToken = json.access_token
  cachedTokenExpiresAt = Date.now() + json.expires_in * 1000
  return cachedToken
}

// ─── Argument parsing ──────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2)
  const get = (name) => {
    const a = args.find(s => s.startsWith(`--${name}=`))
    return a ? a.substring(a.indexOf('=') + 1) : null
  }
  return {
    help: args.includes('--help') || args.includes('-h'),
    probeOnly: args.includes('--probe-only'),
    listStatuses: args.includes('--list-statuses'),
    provinces: (get('provinces') || '').split(',').map(s => s.trim()).filter(Boolean),
    status: get('status'),
    field: get('field'), // defaults to 'StandardStatus' (only field DDF supports)
    minClose: get('min-close-date'),
  }
}

function showHelp() {
  console.log(`
CREA SOLD EXTRACTOR

Usage:
  node --env-file=.env scripts/test-crea-direct.mjs [options]

Options:
  --probe-only             Field detection + status sample, no extraction.
  --list-statuses          Probe every StandardStatus value (Active, Pending,
                           Sold, Closed, …) and report the row count CREA
                           returns for each one. Use this to confirm whether
                           the tenant exposes anything beyond Active.
  --provinces=Alberta,...  Provinces to extract from. Default: Alberta.
  --status=Sold            Skip discovery and use this status value.
  --field=StandardStatus   Status field to filter on. CREA DDF only exposes
                           StandardStatus, but kept here for future flexibility.
  --min-close-date=YYYY-MM-DD  Only export sales with CloseDate >= this date.
  --help                   Show this help.
`)
}

// ─── HTTP helper ───────────────────────────────────────────────────────────

async function fetchBatch({ filter, top = 100, skip = 0, select = activeSelectFields.join(','), withCount = false }) {
  const token = await getAccessToken()
  const params = new URLSearchParams({
    '$filter': filter,
    '$top': String(top),
    '$skip': String(skip),
    '$select': select,
    '$orderby': 'ListingKey asc',
  })
  if (withCount) params.set('$count', 'true')
  const url = `${BASE_URL}/odata/v1/Property?${params}`
  const start = Date.now()
  let res
  try {
    res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
    })
  } catch (err) {
    return { ok: false, status: 0, error: String(err?.message || err), elapsed: Date.now() - start, endOfData: false }
  }
  const elapsed = Date.now() - start

  if (res.status === 404) return { ok: true, status: 404, count: 0, properties: [], elapsed, endOfData: true, totalCount: 0 }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    return { ok: false, status: res.status, error: text, elapsed, endOfData: false }
  }
  const json = await res.json().catch(() => ({}))
  // CREA DDF returns the OData v4 count under @odata.count when supported;
  // some tenants surface it as `odata.count` with no @ prefix. Normalize
  // either to a number (or null if neither was returned).
  const rawCount = json['@odata.count'] ?? json['odata.count'] ?? null
  const totalCount = typeof rawCount === 'number'
    ? rawCount
    : (typeof rawCount === 'string' && /^\d+$/.test(rawCount) ? Number(rawCount) : null)
  return {
    ok: true,
    status: res.status,
    count: json.value?.length ?? 0,
    properties: json.value || [],
    elapsed,
    endOfData: false,
    totalCount,
  }
}

// ─── Field detection ───────────────────────────────────────────────────────

async function detectSupportedFields(province) {
  console.log('--- Detecting supported $select fields ---')
  // Tight filter so we don't hit CREA's per-query result cap (which would
  // return a misleading 400 unrelated to the field). Combine the requested
  // province with a narrow city + price slice; if it returns 0 rows that's
  // still fine for $select validation.
  const probeFilter = `StateOrProvince eq '${province}' and City eq 'Calgary' and ListPrice ge 100000 and ListPrice le 110000`

  // Probe one field at a time, against the absolute minimum filter context.
  // We can't trust SAFE_SELECT_FIELDS as a baseline — some DDF tenants are
  // stripped to just (ListingKey, ListingId, ListPrice, StandardStatus,
  // City, StateOrProvince) and reject anything else, including PropertyType.
  // So we validate every field individually and union the survivors.
  const supported = []
  const skipped = []
  for (const field of [...SAFE_SELECT_FIELDS, ...OPTIONAL_SELECT_FIELDS]) {
    // Always include ListingKey so the response is meaningful; skip the
    // probe for ListingKey itself.
    const select = field === 'ListingKey' ? 'ListingKey' : `ListingKey,${field}`
    const r = await fetchBatch({ filter: probeFilter, top: 1, skip: 0, select })
    if (r.ok) {
      supported.push(field)
      console.log(`  ${field}: supported`)
    } else if (r.error && /Could not find a property named|does not exist|no property/i.test(r.error)) {
      skipped.push(field)
      console.log(`  ${field}: not in this tenant's schema — skipping`)
    } else {
      skipped.push(field)
      console.log(`  ${field}: probe failed (${r.status}) — skipping defensively`)
      if (r.error) console.log(`    └─ ${r.error.substring(0, 400)}`)
    }
  }

  // Guard rails — if for some reason ListingKey or StandardStatus didn't
  // come back as supported (network blip, etc.), force them in. Without
  // them no extraction is possible.
  if (!supported.includes('ListingKey')) supported.unshift('ListingKey')
  if (!supported.includes('StandardStatus')) supported.push('StandardStatus')

  activeSelectFields = supported
  supportsCloseDate = supported.includes('CloseDate')
  console.log(`  Active fields (${supported.length}): ${activeSelectFields.join(',')}`)
  if (skipped.length > 0) {
    console.log(`  Stripped ${skipped.length} unsupported field${skipped.length === 1 ? '' : 's'}.`)
  }
  console.log()
}

// ─── Status discovery ──────────────────────────────────────────────────────

async function tabulateActualStatuses(province) {
  console.log('--- Sampling actual StandardStatus values in the feed ---')
  // A handful of price slices in major cities — keeps each query under
  // CREA's per-query result cap while still surfacing every status the
  // feed contains.
  const sampleQueries = [
    { city: 'Calgary',   priceMin: 0,       priceMax: 300_000 },
    { city: 'Calgary',   priceMin: 300_001, priceMax: 600_000 },
    { city: 'Edmonton',  priceMin: 0,       priceMax: 300_000 },
    { city: 'Edmonton',  priceMin: 300_001, priceMax: 600_000 },
    { city: 'Red Deer',  priceMin: 0,       priceMax: 600_000 },
    { city: 'Lethbridge', priceMin: 0,      priceMax: 600_000 },
  ]

  const standardCounts = new Map()
  let totalSampled = 0

  for (const q of sampleQueries) {
    const filter = `StateOrProvince eq '${province}' and City eq '${q.city}' and ListPrice ge ${q.priceMin} and ListPrice le ${q.priceMax}`
    const r = await fetchBatch({
      filter,
      top: 100,
      skip: 0,
      select: 'ListingKey,StandardStatus',
    })
    const label = `${q.city} $${q.priceMin}-$${q.priceMax}`
    if (!r.ok) {
      console.log(`  ${label}: probe failed (${r.status}) ${r.error?.substring(0, 200)}`)
      continue
    }
    totalSampled += r.count
    for (const p of r.properties) {
      const std = p.StandardStatus ?? '(null)'
      standardCounts.set(std, (standardCounts.get(std) ?? 0) + 1)
    }
    console.log(`  ${label}: sampled ${r.count} rows`)
  }

  if (totalSampled === 0) {
    console.log('  (no rows sampled — cannot infer status vocabulary)\n')
    return { standard: [] }
  }

  const sortDesc = (m) => [...m.entries()].sort((a, b) => b[1] - a[1])
  const stdSorted = sortDesc(standardCounts)

  console.log(`\n  Distinct StandardStatus values across ${totalSampled} sampled rows:`)
  for (const [k, n] of stdSorted) console.log(`    ${JSON.stringify(k).padEnd(20)} ${n}`)
  console.log()

  return { standard: stdSorted.map(([k]) => k) }
}

// Probe every StandardStatus value the spec defines and report what CREA
// returns. Distinguishes three outcomes per status:
//   - REJECTED:  CREA returned an error (usually "not a valid enumeration"),
//                meaning this tenant's schema doesn't include the value.
//   - 0 rows:    Value is in the enum but the feed has no rows with it
//                in this province (could be permissions or just genuinely
//                empty).
//   - N rows:    Value works AND the tenant is allowed to see it. This is
//                the answer to "do we get anything other than Active?".
//
// Tries `$count=true` first for an exact total; falls back to "≥ N (sample)"
// if the tenant doesn't echo a count.
async function probeAllStatuses(province) {
  console.log(`--- Probing every StandardStatus value in ${province} ---`)
  const field = 'StandardStatus'
  const results = []
  for (const status of STATUS_CANDIDATES[field]) {
    const filter = `StateOrProvince eq '${province}' and ${field} eq '${status}'`
    // $top=0 + $count=true is the cheapest way to ask "how many?". If the
    // tenant ignores $count, fall back to a 100-row sample so we still
    // surface a lower bound.
    let r = await fetchBatch({ filter, top: 0, skip: 0, withCount: true, select: 'ListingKey' })
    if (r.ok && r.totalCount == null) {
      r = await fetchBatch({ filter, top: 100, skip: 0, select: 'ListingKey' })
    }

    if (!r.ok) {
      const msg = (r.error || '').substring(0, 200).replace(/\s+/g, ' ').trim()
      results.push({ status, accepted: false, count: null, sample: null, error: msg })
      console.log(`  ${status.padEnd(24)} REJECTED  (${r.status}) ${msg}`)
      continue
    }

    if (typeof r.totalCount === 'number') {
      results.push({ status, accepted: true, count: r.totalCount, sample: null, error: null })
      console.log(`  ${status.padEnd(24)} ${String(r.totalCount).padStart(8)} rows`)
    } else {
      const lower = r.count
      const note = lower >= 100 ? `≥${lower} (sample, no $count)` : `${lower} (sample, no $count)`
      results.push({ status, accepted: true, count: null, sample: lower, error: null })
      console.log(`  ${status.padEnd(24)} ${note.padStart(8)}`)
    }
  }

  const withData = results.filter(r => r.accepted && (r.count > 0 || r.sample > 0))
  const acceptedEmpty = results.filter(r => r.accepted && (r.count === 0 || r.sample === 0))
  const rejected = results.filter(r => !r.accepted)
  console.log()
  console.log(`  Summary: ${withData.length} status(es) returned data, ${acceptedEmpty.length} accepted but empty, ${rejected.length} rejected.`)
  if (withData.length > 0) {
    console.log(`  CREA returns rows for: ${withData.map(r => r.status).join(', ')}`)
  }
  console.log()
  return results
}

async function discoverSoldStatus(province, probeResults = null) {
  console.log('--- Discovering sold-status code ---')
  // Reuse the all-statuses probe results when we have them — no point
  // hitting CREA twice for the same questions. Production code uses 'Sold',
  // but strict-RESO tenants use 'Closed'.
  const field = 'StandardStatus'
  const soldOrder = ['Sold', 'Closed', 'Sale Pending', 'Pending', 'Active Under Contract']
  if (probeResults) {
    for (const wanted of soldOrder) {
      const hit = probeResults.find(r => r.status === wanted && r.accepted && (r.count > 0 || r.sample > 0))
      if (hit) {
        console.log(`  Reusing probe: ${field}='${wanted}' → ${hit.count ?? `≥${hit.sample}`} rows`)
        return { field, status: wanted }
      }
    }
    console.log('  No sold-style status returned data in the all-status probe.')
    return null
  }

  for (const status of soldOrder) {
    const r = await fetchBatch({
      filter: `StateOrProvince eq '${province}' and ${field} eq '${status}'`,
      top: 1,
      skip: 0,
    })
    if (r.ok && r.count > 0) {
      console.log(`  ${field}='${status}': has data`)
      return { field, status }
    }
    if (r.ok) {
      console.log(`  ${field}='${status}': accepted but 0 rows in ${province}`)
    } else {
      console.log(`  ${field}='${status}': REJECTED — ${r.status} ${r.error?.substring(0, 200)}`)
    }
  }
  return null
}

// ─── Pagination + price-slice fallback ─────────────────────────────────────

async function extractAll({ baseFilter, maxSkipSafety = 100_000 }) {
  const out = []
  let skip = 0
  while (skip < maxSkipSafety) {
    const r = await fetchBatch({ filter: baseFilter, top: 100, skip })
    if (!r.ok) {
      if (r.error && /(More than|exceed|too many)/i.test(r.error)) {
        return { properties: out, tooMany: true, lastError: r.error }
      }
      return { properties: out, tooMany: false, lastError: `${r.status} ${r.error?.substring(0, 200)}` }
    }
    if (r.endOfData || r.count === 0) break
    out.push(...r.properties)
    if (r.count < 100) break
    skip += 100
  }
  return { properties: out, tooMany: false, lastError: null }
}

const PRICE_RANGES = [
  { min: 0, max: 200_000 },
  { min: 200_001, max: 400_000 },
  { min: 400_001, max: 600_000 },
  { min: 600_001, max: 800_000 },
  { min: 800_001, max: 1_500_000 },
  { min: 1_500_001, max: 99_999_999 },
]

async function extractProvince({ field, status, province, minCloseDate }) {
  const baseClauses = [
    `StateOrProvince eq '${province}'`,
    `${field} eq '${status}'`,
  ]
  if (minCloseDate && supportsCloseDate) {
    baseClauses.push(`CloseDate ge ${minCloseDate}T00:00:00Z`)
  }

  const baseFilter = baseClauses.join(' and ')
  const flat = await extractAll({ baseFilter })
  if (!flat.tooMany) return { properties: flat.properties, error: flat.lastError }

  // CREA returned the per-query cap — slice by price.
  const all = []
  let lastError = null
  for (const range of PRICE_RANGES) {
    const filter = `${baseFilter} and ListPrice ge ${range.min} and ListPrice le ${range.max}`
    const r = await extractAll({ baseFilter: filter })
    if (r.lastError) lastError = r.lastError
    all.push(...r.properties)
    process.stdout.write(`    ${province} $${range.min}-$${range.max}: +${r.properties.length}\n`)
  }
  return { properties: all, error: lastError }
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function run() {
  const opts = parseArgs()
  if (opts.help) {
    showHelp()
    process.exit(0)
  }

  const provinces = opts.provinces.length ? opts.provinces : ['Alberta']

  console.log('='.repeat(60))
  console.log('  CREA SOLD EXTRACTOR')
  console.log('='.repeat(60))
  console.log(`Base URL:    ${BASE_URL}`)
  console.log(`Token URL:   ${TOKEN_ENDPOINT}`)
  console.log(`Provinces:   ${provinces.join(', ')}`)
  console.log(`Min close:   ${opts.minClose || 'none'}`)
  console.log()

  // OAuth pre-flight
  try {
    await getAccessToken()
    console.log('Auth: OK\n')
  } catch (err) {
    console.error(`Auth failed: ${err.message}`)
    process.exit(1)
  }

  // Use the first province for schema/status discovery — CREA exposes the
  // same OData schema across all provinces, so probing once is enough.
  const probeProvince = provinces[0]

  await detectSupportedFields(probeProvince)

  if (opts.minClose && !supportsCloseDate) {
    console.log(`⚠  --min-close-date=${opts.minClose} ignored: this tenant doesn't expose CloseDate.\n`)
  }

  const sample = await tabulateActualStatuses(probeProvince)
  const lower = new Set(sample.standard.map(s => String(s).toLowerCase()))
  const hasSoldHints = ['sold', 'closed'].some(s => lower.has(s))
  if (sample.standard.length > 0 && !hasSoldHints) {
    console.log('⚠  No sold-style status appears in the sample. CREA contract may be Active-only.')
    console.log('   (DDF tenants without VOW/historical permission only ever see live listings.)\n')
  }

  // Always run the per-status probe — answers "do we get anything other
  // than Active?" definitively (Pending, Sold, Closed, Active Under
  // Contract, etc.) by hitting CREA with each enum value.
  const statusProbe = await probeAllStatuses(probeProvince)

  if (opts.listStatuses) {
    console.log('--list-statuses set; exiting after status probe.')
    process.exit(0)
  }

  let probe
  if (opts.status) {
    probe = { field: opts.field || 'StandardStatus', status: opts.status }
    console.log(`Using user-supplied status: ${probe.field}='${probe.status}'\n`)
  } else {
    probe = await discoverSoldStatus(probeProvince, statusProbe)
    if (!probe) {
      console.error('Could not find a working sold-status value. Use --status=... to force one.')
      process.exit(1)
    }
    console.log(`Will extract using ${probe.field}='${probe.status}'\n`)
  }

  if (opts.probeOnly) {
    console.log('--probe-only set; exiting without extraction.')
    process.exit(0)
  }

  // Bulk extract
  const allListings = []
  const summary = []
  const startedAt = Date.now()
  for (const province of provinces) {
    const t0 = Date.now()
    console.log(`Extracting ${province}…`)
    const { properties, error } = await extractProvince({
      field: probe.field,
      status: probe.status,
      province,
      minCloseDate: opts.minClose,
    })
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
    summary.push({ province, count: properties.length, error })
    allListings.push(...properties)
    console.log(`  ${province}: ${properties.length} rows (${elapsed}s) ${error ? 'ERR' : 'ok'}`)
    if (error) {
      console.log(`    └─ ${error}`)
      // If CREA rejected the enum value, ask it what values ARE allowed by
      // sending a deliberately-invalid value. The OData error response on
      // most DDF tenants includes the full list of permitted enum strings.
      if (/not a valid enumeration/i.test(error)) {
        const enumProbe = await fetchBatch({
          filter: `StateOrProvince eq '${province}' and ${probe.field} eq '__suhani_invalid__'`,
          top: 1,
          select: 'ListingKey',
        })
        if (enumProbe.error) {
          console.log(`    └─ Allowed enum values per CREA: ${enumProbe.error}`)
        }
      }
    }
    console.log()
  }

  const uniqueByKey = new Map()
  for (const p of allListings) {
    const key = p.ListingKey || p.ListingId
    if (key && !uniqueByKey.has(key)) uniqueByKey.set(key, p)
  }
  const uniqueTotal = uniqueByKey.size
  const totalElapsed = ((Date.now() - startedAt) / 1000).toFixed(1)

  // Quick top-cities-by-count for human eyeballing
  const cityCounts = new Map()
  for (const p of uniqueByKey.values()) {
    const c = p.City || '(unknown)'
    cityCounts.set(c, (cityCounts.get(c) ?? 0) + 1)
  }
  const topCities = [...cityCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const jsonPath = join(process.cwd(), `crea-sold-${ts}.json`)
  const csvPath = join(process.cwd(), `crea-sold-${ts}.csv`)

  writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        meta: {
          baseUrl: BASE_URL,
          field: probe.field,
          status: probe.status,
          minCloseDate: opts.minClose || null,
          provinces,
          rawTotal: allListings.length,
          uniqueTotal,
          extractedAt: new Date().toISOString(),
        },
        summary,
        topCities,
        listings: Array.from(uniqueByKey.values()),
      },
      null,
      2
    )
  )

  const csvLines = ['province,count,error']
  for (const row of summary) {
    const err = (row.error || '').replace(/[",\n]/g, ' ')
    csvLines.push(`${row.province},${row.count},"${err}"`)
  }
  csvLines.push(`TOTAL,${uniqueTotal},`)
  writeFileSync(csvPath, csvLines.join('\n'))

  console.log('='.repeat(60))
  console.log('  EXTRACTION COMPLETE')
  console.log('='.repeat(60))
  console.log(`  Status used:       ${probe.field}='${probe.status}'`)
  console.log(`  Provinces:         ${provinces.length}`)
  console.log(`  Raw rows fetched:  ${allListings.length}`)
  console.log(`  Unique listings:   ${uniqueTotal}`)
  console.log(`  Total time:        ${totalElapsed}s`)
  console.log(`  JSON:              ${jsonPath}`)
  console.log(`  CSV:               ${csvPath}`)
  console.log('='.repeat(60))

  if (topCities.length) {
    console.log('\nTop cities by sold count:')
    for (const [city, n] of topCities) console.log(`  ${city}: ${n}`)
  }

  process.exit(0)
}

run().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
