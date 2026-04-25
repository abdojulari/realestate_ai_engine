#!/usr/bin/env node
/**
 * Direct Pillar9/Matrix sold-status extractor.
 *
 * Why this exists:
 *   The regular Pillar9 sync was reporting `0 sold` even though Matrix has
 *   thousands of recently-closed listings. Rather than altering the sync
 *   pipeline blindly, this script talks straight to the API and:
 *     1. Probes the MlsStatus enum to find the value(s) Matrix actually
 *        accepts for sold listings (RESO says "Closed", Pillar9 docs hint
 *        at "S", boards sometimes use "Sold" — depends on the install).
 *     2. Once a working code is found, iterates every Alberta city code,
 *        paginating with $top=200 + $skip, and falls back to price-range
 *        slicing for cities that return "More than X results" errors.
 *     3. Writes the full list of sold properties to a timestamped JSON
 *        file plus a small CSV summary so you can visually confirm the
 *        sync is undercounting before changing any production code.
 *
 * Usage:
 *   node --env-file=.env scripts/test-pillar9-direct.mjs
 *   node --env-file=.env scripts/test-pillar9-direct.mjs --cities=0046,0047
 *   node --env-file=.env scripts/test-pillar9-direct.mjs --status=Closed
 *   node --env-file=.env scripts/test-pillar9-direct.mjs --probe-only
 *
 * Output: ./pillar9-sold-<timestamp>.json (full list + summary)
 *         ./pillar9-sold-<timestamp>.csv  (lightweight per-city counts)
 */

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CLIENT_ID = process.env.PILLAR9_CLIENT_ID
const CLIENT_SECRET = process.env.PILLAR9_CLIENT_SECRET
const API_HOST = process.env.PILLAR9_API_HOST || 'abrls.matrixwebapi.com'
const API_PATH = '/MatrixWebAPI/local/Property'

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing PILLAR9_CLIENT_ID or PILLAR9_CLIENT_SECRET')
  process.exit(1)
}

const basicAuth = 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')

// Mirrors getAlbertaCityCodes() in server/utils/pillar9.service.ts. Embedded
// inline so this script is self-contained — the user explicitly asked us not
// to touch the production code, only this file.
const ALBERTA_CITY_CODES = [
  '0046', '0047', '0100', '0102', '0114', '0134', '0141', '0264', '0265', '0380',
  '0150', '0152', '0154', '0156', '0159', '0161', '0165', '0167', '0170', '0172',
  '0201', '0203', '0205', '0125', '0145', '0168', '0182', '0184', '0187', '0190',
  '0192', '0195', '0197', '0199', '0200', '0202', '0204', '0206', '0208', '0210',
  '0212', '0214', '0216', '0218', '0220', '0222', '0224', '0226', '0228', '0230',
  '0232', '0234', '0236', '0238', '0240', '0242', '0244', '0246', '0248', '0250',
  '0252', '0254', '0256', '0258', '0300', '0302', '0304', '0306', '0308', '0310',
  '0312', '0314', '0316', '0318', '0320', '0322', '0324', '0326', '0328', '0330',
  '0332', '0334', '0336', '0338', '0340', '0342', '0344', '0346', '0348', '0350',
  '0352', '0354', '0356', '0358', '0360', '0362', '0364', '0366', '0368', '0370',
  '0372', '0374', '0376', '0378', '0381', '0383', '0385', '0387', '0389', '0391',
  '0393', '0395', '0397', '0399', '0401', '0403', '0405', '0407', '0409', '0411',
  '0413', '0415', '0417', '0419', '0421', '0423', '0425', '0427', '0429', '0431',
  '0433', '0435', '0437', '0439', '0441', '0443', '0445', '0447', '0449', '0451',
  '0453', '0455', '0457', '0459', '0461', '0463', '0465', '0467', '0469', '0471',
  '0473', '0475', '0477', '0479', '0481', '0483', '0485', '0487', '0489', '0491',
  '0493', '0495', '0497', '0499', '0501', '0503', '0505', '0507', '0509', '0511',
  '0513', '0515', '0517', '0519', '0521', '0523', '0525', '0527', '0529', '0531',
  '0533', '0535', '0537', '0539', '0541', '0543', '0545', '0547', '0549', '0551',
  '0553', '0555', '0557', '0559', '0561', '0563', '0565', '0567', '0569', '0571',
  '0573', '0575', '0577', '0579', '0581', '0583', '0585', '0587', '0589', '0591',
]

// Common values seen across CREA / RESO / Matrix installs. Probed against
// Calgary (which definitely has sold history) to figure out which one(s)
// this particular Pillar9 tenant accepts. Extra single-letter values are
// included because some Matrix instances expose RESO StandardStatus codes
// directly while others use abbreviated MlsStatus enums.
const SOLD_STATUS_CANDIDATES = ['Sold', 'Closed', 'S', 's', 'C', 'SO', 'CL']

// Fields we know every Matrix tenant in this network exposes — verified by
// the historical version of this script that successfully ran with this
// exact list. Used for the discovery probe and as the safe baseline if the
// richer field set gets rejected with a "Could not find a property named"
// error (which is exactly what `abrls.matrixwebapi.com` does for
// ClosePrice / CloseDate / StandardStatus).
const SAFE_SELECT_FIELDS = [
  'ListingId',
  'ListingKeyNumeric',
  'MlsStatus',
  'ListPrice',
  'City',
  'UnparsedAddress',
  'BedroomsTotal',
  'BathroomsTotalInteger',
  'PropertyType',
  'PropertySubType',
]

// Optional fields probed once at startup; only kept if they're actually in
// the tenant's OData schema. Pillar9/Matrix installs vary widely — some
// expose the full RESO 2.0 vocabulary, others stop at the legacy enum.
const OPTIONAL_SELECT_FIELDS = [
  'StandardStatus',
  'ClosePrice',
  'CloseDate',
  'ListAgentFullName',
  'CoListAgentFullName',
]

// Populated by detectSupportedFields() before extraction starts.
let activeSelectFields = SAFE_SELECT_FIELDS.slice()
let supportsCloseDate = false

function parseArgs() {
  const args = process.argv.slice(2)
  const get = (name) => {
    const a = args.find(s => s.startsWith(`--${name}=`))
    return a ? a.substring(a.indexOf('=') + 1) : null
  }
  return {
    help: args.includes('--help') || args.includes('-h'),
    probeOnly: args.includes('--probe-only'),
    cities: (get('cities') || '').split(',').map(s => s.trim()).filter(Boolean),
    status: get('status'),
    minClose: get('min-close-date'), // ISO date — only export sales newer than this
  }
}

function showHelp() {
  console.log(`
PILLAR9 SOLD EXTRACTOR

Usage:
  node --env-file=.env scripts/test-pillar9-direct.mjs [options]

Options:
  --probe-only             Only run status discovery; don't extract.
  --status=Closed          Skip discovery and use this status directly.
  --cities=0046,0047       Restrict extraction to these city codes.
  --min-close-date=2025-01 Only export sales with CloseDate >= this date.
  --help                   Show this help.
`)
}

async function fetchBatch({ filter, top = 200, skip = 0, select = activeSelectFields.join(',') }) {
  const params = new URLSearchParams({
    '$filter': filter,
    '$top': String(top),
    '$skip': String(skip),
    '$select': select,
    '$orderby': 'ListingKeyNumeric asc',
  })
  const url = `https://${API_HOST}${API_PATH}?${params}`

  const start = Date.now()
  let res
  try {
    res = await fetch(url, {
      headers: { 'Authorization': basicAuth, 'Accept': 'application/json' },
    })
  } catch (err) {
    return { ok: false, status: 0, error: String(err?.message || err), elapsed: Date.now() - start, endOfData: false }
  }
  const elapsed = Date.now() - start

  if (res.status === 404) {
    return { ok: true, status: 404, count: 0, properties: [], elapsed, endOfData: true }
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    return { ok: false, status: res.status, error: text, elapsed, endOfData: false }
  }
  const json = await res.json().catch(() => ({}))
  return {
    ok: true,
    status: res.status,
    count: json.value?.length ?? 0,
    properties: json.value || [],
    elapsed,
    endOfData: false,
  }
}

// Probe each optional field individually with $top=1 against a known-rich
// city. The Matrix server returns
//   400 "Could not find a property named '<field>' on type
//        'MatrixData.Property'"
// when a field isn't in the tenant's schema — we treat that as "drop it".
// Anything else (incl. an empty 200) means the field is fine.
async function detectSupportedFields() {
  console.log('--- Detecting supported $select fields ---')
  // Calgary (`0046`) trips Matrix's "More than N results" cap before the
  // server gets to validate the $select clause, which produces false
  // negatives for fields that ARE supported. Use a tight filter that's
  // guaranteed to return a tiny result set so any 400 we see is genuinely
  // about the field, not the row count.
  const probeFilter = `City eq '0046' and ListPrice ge 100000 and ListPrice le 110000`
  const supported = SAFE_SELECT_FIELDS.slice()
  for (const field of OPTIONAL_SELECT_FIELDS) {
    const select = [...supported, field].join(',')
    const r = await fetchBatch({
      filter: probeFilter,
      top: 1,
      skip: 0,
      select,
    })
    if (r.ok) {
      supported.push(field)
      console.log(`  ${field}: supported`)
    } else if (r.error && /Could not find a property named/i.test(r.error)) {
      console.log(`  ${field}: not in this tenant's schema — skipping`)
    } else {
      // Unknown failure mode (auth, throttling, network). Be conservative
      // and skip the field so the bulk extract doesn't get poisoned by it.
      // Print the full body so we can tell the difference between "really
      // missing" and e.g. "$select too long" or "concurrent throttling".
      console.log(`  ${field}: probe failed (${r.status}) — skipping defensively`)
      if (r.error) console.log(`    └─ ${r.error.substring(0, 400)}`)
    }
  }
  activeSelectFields = supported
  supportsCloseDate = supported.includes('CloseDate')
  console.log(`  Active fields: ${activeSelectFields.join(',')}`)
  console.log()
}

// Pulls a sample of listings WITHOUT any status filter and tabulates every
// MlsStatus value that actually appears. This is the ground-truth check for
// "what statuses does this tenant actually carry?" — far more reliable than
// guessing enum values, because if Matrix's contract excludes sold data the
// 'S' enum will be silently empty (200 OK, 0 results) on every city.
async function tabulateActualStatuses() {
  console.log('--- Sampling actual MlsStatus values in the feed ---')
  // Same "More than N" trap: Calgary unfiltered will fail. Use price slices
  // for the big cities (Calgary 0046, Edmonton-area 0265) and unfiltered for
  // the smaller ones — gives us enough variety to spot any sold-style enum
  // value if it exists.
  const sampleQueries = [
    { city: '0046', priceMin: 0,       priceMax: 300_000 },
    { city: '0046', priceMin: 300_001, priceMax: 600_000 },
    { city: '0047', priceMin: null,    priceMax: null    },
    { city: '0100', priceMin: null,    priceMax: null    },
    { city: '0114', priceMin: null,    priceMax: null    },
    { city: '0265', priceMin: 0,       priceMax: 600_000 },
  ]
  const counts = new Map()
  let totalSampled = 0

  for (const q of sampleQueries) {
    const filter = q.priceMin != null
      ? `City eq '${q.city}' and ListPrice ge ${q.priceMin} and ListPrice le ${q.priceMax}`
      : `City eq '${q.city}'`
    const label = q.priceMin != null ? `${q.city} $${q.priceMin}-$${q.priceMax}` : q.city
    const r = await fetchBatch({
      filter,
      top: 200,
      skip: 0,
      select: 'ListingId,MlsStatus',
    })
    if (!r.ok) {
      console.log(`  ${label}: probe failed (${r.status}) ${r.error?.substring(0, 200)}`)
      continue
    }
    totalSampled += r.count
    for (const p of r.properties) {
      const k = p.MlsStatus ?? '(null)'
      counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    console.log(`  ${label}: sampled ${r.count} rows`)
  }

  if (totalSampled === 0) {
    console.log('  (no rows sampled — cannot infer status vocabulary)\n')
    return []
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
  console.log(`\n  Distinct MlsStatus values across ${totalSampled} sampled rows:`)
  for (const [k, n] of sorted) {
    console.log(`    ${JSON.stringify(k).padEnd(15)} ${n}`)
  }
  console.log()
  return sorted.map(([k]) => k)
}

// Try each candidate status against a known-rich city until one returns
// non-empty results. We probe both Calgary (0046) and Edmonton (0047) since
// some boards split data weirdly across major metros.
async function discoverSoldStatus() {
  console.log('--- Discovering sold-status code ---')
  const probeCities = ['0046', '0047']
  const working = []
  const rejected = []

  for (const status of SOLD_STATUS_CANDIDATES) {
    let foundCount = 0
    let lastError = null
    for (const city of probeCities) {
      const r = await fetchBatch({
        filter: `MlsStatus eq '${status}' and City eq '${city}'`,
        top: 1,
      })
      if (r.ok && r.count > 0) {
        foundCount += r.count
        break
      }
      if (!r.ok) lastError = `${r.status} ${r.error?.substring(0, 400)}`
    }
    if (foundCount > 0) {
      working.push(status)
      console.log(`  '${status}': has data (sample count ≥ ${foundCount})`)
    } else if (lastError) {
      rejected.push({ status, lastError })
      console.log(`  '${status}': REJECTED — ${lastError}`)
    } else {
      // 200 OK but zero rows — this is the smoking gun: enum is valid, the
      // tenant just doesn't carry that status.
      rejected.push({ status, lastError: null })
      console.log(`  '${status}': accepted by API but 0 rows in feed`)
    }
  }

  console.log()
  if (working.length === 0) {
    // Only try StandardStatus if the tenant actually exposes the column;
    // otherwise we'd just generate another wave of identical 400s.
    if (activeSelectFields.includes('StandardStatus')) {
      console.log('No MlsStatus value matched. Trying StandardStatus instead…')
      for (const status of ['Closed', 'Sold', 'Active Under Contract']) {
        const r = await fetchBatch({
          filter: `StandardStatus eq '${status}' and City eq '0046'`,
          top: 1,
        })
        if (r.ok && r.count > 0) {
          console.log(`  StandardStatus '${status}': has data — switching probe field`)
          return { field: 'StandardStatus', status }
        }
      }
    } else {
      console.log('Skipping StandardStatus probe — column not exposed by this tenant.')
    }
    return null
  }

  return { field: 'MlsStatus', status: working[0] }
}

// Pulls every page for a given filter, paging with $skip until either an
// empty page or a 404 (Matrix's idiomatic end-of-data response) appears.
async function extractAll({ baseFilter, maxSkipSafety = 50_000 }) {
  const out = []
  let skip = 0
  while (skip < maxSkipSafety) {
    const r = await fetchBatch({ filter: baseFilter, top: 200, skip })
    if (!r.ok) {
      // "More than N results" is a soft error — caller will retry with
      // narrower filters. Bubble it up via a sentinel.
      if (r.error && /More than/i.test(r.error)) {
        return { properties: out, tooMany: true, lastError: r.error }
      }
      return { properties: out, tooMany: false, lastError: `${r.status} ${r.error?.substring(0, 200)}` }
    }
    if (r.endOfData || r.count === 0) break
    out.push(...r.properties)
    if (r.count < 200) break
    skip += 200
  }
  return { properties: out, tooMany: false, lastError: null }
}

// When a city has more results than the API will page through (Matrix caps
// somewhere around 5k per filter), slice by ListPrice ranges and union the
// results. The price brackets match what the production sync uses.
const PRICE_RANGES = [
  { min: 0, max: 200_000 },
  { min: 200_001, max: 400_000 },
  { min: 400_001, max: 600_000 },
  { min: 600_001, max: 800_000 },
  { min: 800_001, max: 1_500_000 },
  { min: 1_500_001, max: 99_999_999 },
]

async function extractCity({ field, status, cityCode, minCloseDate }) {
  const baseClauses = [`${field} eq '${status}'`, `City eq '${cityCode}'`]
  // Only push the CloseDate predicate when the tenant actually exposes it —
  // otherwise the API rejects the entire query with the same 400 we saw
  // during field detection.
  if (minCloseDate && supportsCloseDate) {
    baseClauses.push(`CloseDate ge ${minCloseDate}T00:00:00Z`)
  }

  const baseFilter = baseClauses.join(' and ')
  const flat = await extractAll({ baseFilter })
  if (!flat.tooMany) {
    return { properties: flat.properties, error: flat.lastError }
  }

  // Fall back to per-price-range pagination
  const all = []
  let lastError = null
  for (const range of PRICE_RANGES) {
    const filter = `${baseFilter} and ListPrice ge ${range.min} and ListPrice le ${range.max}`
    const r = await extractAll({ baseFilter: filter })
    if (r.lastError) lastError = r.lastError
    all.push(...r.properties)
  }
  return { properties: all, error: lastError }
}

async function run() {
  const opts = parseArgs()
  if (opts.help) {
    showHelp()
    process.exit(0)
  }

  console.log('='.repeat(60))
  console.log('  PILLAR9 SOLD EXTRACTOR')
  console.log('='.repeat(60))
  console.log(`Host:        ${API_HOST}`)
  console.log(`Client ID:   ${CLIENT_ID}`)
  console.log(`Cities:      ${opts.cities.length ? opts.cities.join(',') : `all Alberta (${ALBERTA_CITY_CODES.length})`}`)
  console.log(`Min close:   ${opts.minClose || 'none'}`)
  console.log()

  await detectSupportedFields()

  if (opts.minClose && !supportsCloseDate) {
    console.log(`⚠  --min-close-date=${opts.minClose} ignored: this tenant doesn't expose CloseDate.\n`)
  }

  // Ground-truth check: see what statuses this tenant actually carries
  // before guessing enum values. If 'S' / 'Sold' / 'Closed' never appear in
  // the sample, we can stop chasing them and tell the user the contract
  // probably excludes sold data.
  const actualStatuses = await tabulateActualStatuses()
  const lowered = new Set(actualStatuses.map(s => String(s).toLowerCase()))
  const hasSoldHints = ['s', 'sold', 'closed', 'c', 'so', 'cl'].some(s => lowered.has(s))
  if (actualStatuses.length > 0 && !hasSoldHints) {
    console.log('⚠  None of the sampled rows have a sold-style status.')
    console.log('   This Pillar9/Matrix tenant likely only feeds Active listings — sold data')
    console.log('   would need a separate VOW/historical contract or a different feed source.\n')
  }

  let probe
  if (opts.status) {
    probe = { field: 'MlsStatus', status: opts.status }
    console.log(`Using user-supplied status: ${probe.field}='${probe.status}'\n`)
  } else {
    probe = await discoverSoldStatus()
    if (!probe) {
      console.error('Could not find any working sold-status code. Aborting.')
      process.exit(1)
    }
    console.log(`Will extract using ${probe.field}='${probe.status}'\n`)
  }

  if (opts.probeOnly) {
    console.log('--probe-only set; exiting without extraction.')
    process.exit(0)
  }

  const cities = opts.cities.length ? opts.cities : ALBERTA_CITY_CODES
  const summary = []
  const allListings = []
  let cityErrors = 0
  const startedAt = Date.now()

  for (let i = 0; i < cities.length; i++) {
    const code = cities[i]
    const t0 = Date.now()
    const { properties, error } = await extractCity({
      field: probe.field,
      status: probe.status,
      cityCode: code,
      minCloseDate: opts.minClose,
    })
    const elapsed = Date.now() - t0

    summary.push({ city: code, count: properties.length, error })
    allListings.push(...properties)
    if (error) cityErrors++

    const tag = error ? `ERR ${error.substring(0, 60)}` : 'ok'
    process.stdout.write(
      `[${String(i + 1).padStart(3)}/${cities.length}] city ${code}: ${String(properties.length).padStart(5)} sold (${elapsed}ms) ${tag}\n`
    )
  }

  const totalElapsed = ((Date.now() - startedAt) / 1000).toFixed(1)
  const grandTotal = allListings.length
  const uniqueByKey = new Map()
  for (const p of allListings) {
    const key = p.ListingKeyNumeric || p.ListingId
    if (key && !uniqueByKey.has(key)) uniqueByKey.set(key, p)
  }
  const uniqueTotal = uniqueByKey.size

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const jsonPath = join(process.cwd(), `pillar9-sold-${ts}.json`)
  const csvPath = join(process.cwd(), `pillar9-sold-${ts}.csv`)

  writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        meta: {
          host: API_HOST,
          field: probe.field,
          status: probe.status,
          minCloseDate: opts.minClose || null,
          extractedAt: new Date().toISOString(),
          cityCount: cities.length,
          rawTotal: grandTotal,
          uniqueTotal,
          cityErrors,
        },
        summary,
        listings: Array.from(uniqueByKey.values()),
      },
      null,
      2
    )
  )

  // CSV is just `cityCode,count,error` so it's grep-friendly.
  const csvLines = ['cityCode,count,error']
  for (const row of summary) {
    const err = (row.error || '').replace(/[",\n]/g, ' ')
    csvLines.push(`${row.city},${row.count},"${err}"`)
  }
  csvLines.push(`TOTAL,${uniqueTotal},`)
  writeFileSync(csvPath, csvLines.join('\n'))

  console.log()
  console.log('='.repeat(60))
  console.log('  EXTRACTION COMPLETE')
  console.log('='.repeat(60))
  console.log(`  Status used:       ${probe.field}='${probe.status}'`)
  console.log(`  Cities processed:  ${cities.length}`)
  console.log(`  Cities with error: ${cityErrors}`)
  console.log(`  Raw rows fetched:  ${grandTotal}`)
  console.log(`  Unique listings:   ${uniqueTotal}`)
  console.log(`  Total time:        ${totalElapsed}s`)
  console.log(`  JSON:              ${jsonPath}`)
  console.log(`  CSV:               ${csvPath}`)
  console.log('='.repeat(60))

  // Top 10 cities by sold count, for quick eyeballing
  const top = [...summary].sort((a, b) => b.count - a.count).slice(0, 10).filter(r => r.count > 0)
  if (top.length) {
    console.log('\nTop cities by sold count:')
    for (const r of top) console.log(`  ${r.city}: ${r.count}`)
  }

  process.exit(0)
}

run().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
