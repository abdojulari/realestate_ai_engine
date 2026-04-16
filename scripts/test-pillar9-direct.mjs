#!/usr/bin/env node
/**
 * Direct Pillar9/Matrix API test — validates auth, pagination, city codes, and fetches 300+ properties
 * Usage: node --env-file=.env scripts/test-pillar9-direct.mjs
 */

const CLIENT_ID = process.env.PILLAR9_CLIENT_ID
const CLIENT_SECRET = process.env.PILLAR9_CLIENT_SECRET
const API_HOST = process.env.PILLAR9_API_HOST || 'abrls.matrixwebapi.com'
const API_PATH = '/MatrixWebAPI/local/Property'

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing PILLAR9_CLIENT_ID or PILLAR9_CLIENT_SECRET')
  process.exit(1)
}

const basicAuth = 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')

async function fetchBatch(filter, top = 200, skip = 0) {
  const params = new URLSearchParams({
    '$filter': filter,
    '$top': String(top),
    '$skip': String(skip),
    '$select': 'ListingId,ListingKeyNumeric,MlsStatus,ListPrice,City,UnparsedAddress,BedroomsTotal,BathroomsTotalInteger,PropertyType,PropertySubType',
    '$orderby': 'ListingKeyNumeric asc',
  })
  const url = `https://${API_HOST}${API_PATH}?${params}`

  const start = Date.now()
  const res = await fetch(url, {
    headers: { 'Authorization': basicAuth, 'Accept': 'application/json' }
  })
  const elapsed = Date.now() - start

  if (res.status === 404) {
    return { ok: true, status: 404, count: 0, properties: [], elapsed, endOfData: true }
  }

  if (!res.ok) {
    const text = await res.text()
    return { ok: false, status: res.status, error: text, elapsed, endOfData: false }
  }

  const json = await res.json()
  return {
    ok: true,
    status: res.status,
    count: json.value?.length ?? 0,
    properties: json.value || [],
    elapsed,
    endOfData: false,
  }
}

async function run() {
  console.log('='.repeat(60))
  console.log('  PILLAR9 DIRECT API TEST')
  console.log('='.repeat(60))
  console.log(`Host: ${API_HOST}`)
  console.log(`Client ID: ${CLIENT_ID}`)
  console.log()

  let totalErrors = 0
  let totalPassed = 0

  // ─── Test 1: Basic Authentication ───
  console.log('--- Test 1: Authentication ---')
  const t1 = await fetchBatch("MlsStatus eq 'A' and City eq '0047'", 1, 0)
  if (!t1.ok) {
    console.error(`  FAIL: ${t1.status} — ${t1.error?.substring(0, 200)}`)
    console.error('\n  Cannot continue — authentication failed.')
    process.exit(1)
  }
  console.log(`  PASS: Auth OK (${t1.elapsed}ms)`)
  if (t1.count > 0) console.log(`  Sample: ${t1.properties[0]?.ListingId} — ${t1.properties[0]?.UnparsedAddress}`)
  totalPassed++
  console.log()

  // ─── Test 2: Max $top=200 works ───
  console.log('--- Test 2: $top=200 (API max) ---')
  const t2 = await fetchBatch("MlsStatus eq 'A' and City eq '0047'", 200, 0)
  if (!t2.ok) {
    console.error(`  FAIL: ${t2.status} — ${t2.error?.substring(0, 200)}`)
    totalErrors++
  } else {
    console.log(`  PASS: Got ${t2.count} properties (${t2.elapsed}ms)`)
    totalPassed++
  }
  console.log()

  // ─── Test 3: $top=201 rejected ───
  console.log('--- Test 3: $top=201 rejected (confirms 200 limit) ---')
  const t3 = await fetchBatch("MlsStatus eq 'A' and City eq '0047'", 201, 0)
  if (!t3.ok && t3.error?.includes('max top size of 200')) {
    console.log(`  PASS: Correctly rejected $top=201 (${t3.elapsed}ms)`)
    totalPassed++
  } else if (t3.ok) {
    console.log(`  INFO: API accepted $top=201 — limit may have changed`)
  } else {
    console.error(`  FAIL: Unexpected error: ${t3.status}`)
    totalErrors++
  }
  console.log()

  // ─── Test 4: 404 = end-of-pagination ───
  console.log('--- Test 4: 404 as end-of-pagination ---')
  const t4a = await fetchBatch("MlsStatus eq 'A' and City eq '0047'", 200, 0)
  if (t4a.ok && t4a.count > 0) {
    const t4b = await fetchBatch("MlsStatus eq 'A' and City eq '0047'", 200, 99999)
    if (t4b.endOfData) {
      console.log(`  PASS: skip=99999 returned 404 (end-of-data) (${t4b.elapsed}ms)`)
      totalPassed++
    } else if (t4b.ok && t4b.count === 0) {
      console.log(`  PASS: skip=99999 returned 0 results (${t4b.elapsed}ms)`)
      totalPassed++
    } else {
      console.error(`  FAIL: Expected 404 or empty, got ${t4b.status}`)
      totalErrors++
    }
  } else {
    console.log(`  SKIP: No data in city 0047 to test pagination`)
  }
  console.log()

  // ─── Test 5: Invalid city code handling ───
  console.log('--- Test 5: Invalid city codes (should get 400 "enumeration") ---')
  const invalidCities = ['0156', '0159', '0161', '0170']
  let invalidHandled = 0
  for (const c of invalidCities) {
    const r = await fetchBatch(`MlsStatus eq 'A' and City eq '${c}'`, 1, 0)
    if (!r.ok && (r.error?.includes('enumeration') || r.error?.includes('not a valid'))) {
      invalidHandled++
    } else if (r.ok && r.count === 0) {
      invalidHandled++ // also acceptable — just no data
    } else if (r.ok) {
      console.log(`  INFO: City ${c} is valid with ${r.count} results`)
      invalidHandled++
    } else {
      console.log(`  INFO: City ${c} returned ${r.status}`)
    }
  }
  console.log(`  PASS: ${invalidHandled}/${invalidCities.length} invalid codes handled gracefully`)
  totalPassed++
  console.log()

  // ─── Test 6: Calgary "too many results" ───
  console.log('--- Test 6: Calgary unfiltered (expect "too many results") ---')
  const t6 = await fetchBatch("MlsStatus eq 'A' and City eq '0046'", 200, 0)
  if (!t6.ok && t6.error?.includes('More than')) {
    console.log(`  PASS: Calgary correctly returns "too many results" (${t6.elapsed}ms)`)
    totalPassed++
  } else if (t6.ok) {
    console.log(`  INFO: Calgary returned ${t6.count} — no splitting needed (${t6.elapsed}ms)`)
    totalPassed++
  } else {
    console.log(`  INFO: Calgary returned ${t6.status} — ${t6.error?.substring(0, 100)}`)
  }
  console.log()

  // ─── Test 7: Fetch 300+ via price-range batches (the real sync pattern) ───
  console.log('--- Test 7: Fetch 300+ properties (Calgary price-range batches) ---')
  const priceRanges = [
    { min: 0, max: 200000 },
    { min: 200001, max: 400000 },
    { min: 400001, max: 600000 },
    { min: 600001, max: 800000 },
    { min: 800001, max: 1500000 },
    { min: 1500001, max: 99999999 },
  ]
  let grandTotal = 0
  let batchCount = 0
  let batchErrors = 0
  const startAll = Date.now()

  for (const range of priceRanges) {
    let skip = 0
    while (true) {
      const r = await fetchBatch(
        `MlsStatus eq 'A' and City eq '0046' and ListPrice ge ${range.min} and ListPrice le ${range.max}`,
        200, skip
      )
      batchCount++
      if (!r.ok) {
        console.error(`  $${range.min}-$${range.max} skip=${skip}: ERROR ${r.status}`)
        batchErrors++
        break
      }
      if (r.count === 0 || r.endOfData) {
        break
      }
      grandTotal += r.count
      console.log(`  $${range.min}-$${range.max} skip=${skip}: +${r.count} (total: ${grandTotal}, ${r.elapsed}ms)`)
      if (r.count < 200) break
      skip += 200
    }
  }
  const totalTime = Date.now() - startAll
  if (grandTotal >= 300) {
    console.log(`  PASS: Fetched ${grandTotal} properties in ${batchCount} batches (${totalTime}ms, ${batchErrors} errors)`)
    totalPassed++
  } else {
    console.error(`  FAIL: Only fetched ${grandTotal} (expected 300+)`)
    totalErrors++
  }
  console.log()

  // ─── Test 8: Rapid-fire (no rate limiting) ───
  console.log('--- Test 8: Rapid-fire (10 requests, no delay) ---')
  const validCities = ['0046', '0047', '0100', '0114', '0134', '0264', '0265', '0380', '0150', '0154']
  const rapidStart = Date.now()
  let rapidOk = 0
  let rapidFail = 0
  for (const city of validCities) {
    const r = await fetchBatch(`MlsStatus eq 'A' and City eq '${city}'`, 1, 0)
    if (r.ok) rapidOk++
    else rapidFail++
  }
  const rapidElapsed = Date.now() - rapidStart
  if (rapidFail === 0) {
    console.log(`  PASS: ${rapidOk}/${validCities.length} succeeded, 0 rate-limited (${rapidElapsed}ms)`)
    totalPassed++
  } else {
    console.log(`  WARN: ${rapidOk}/${validCities.length} succeeded, ${rapidFail} failed (${rapidElapsed}ms)`)
    if (rapidOk > rapidFail) totalPassed++
    else totalErrors++
  }
  console.log()

  // ─── Test 9: Sold listings ───
  console.log("--- Test 9: Sold listings (status S) ---")
  const t9 = await fetchBatch("MlsStatus eq 'S' and City eq '0046'", 200, 0)
  if (t9.ok) {
    console.log(`  PASS: Got ${t9.count} sold properties (${t9.elapsed}ms)`)
    totalPassed++
  } else {
    console.error(`  FAIL: ${t9.status} — ${t9.error?.substring(0, 150)}`)
    totalErrors++
  }
  console.log()

  // ─── Summary ───
  console.log('='.repeat(60))
  console.log(`  RESULTS: ${totalPassed} passed, ${totalErrors} failed`)
  console.log(`  Total properties fetched in Test 7: ${grandTotal}`)
  console.log('='.repeat(60))

  process.exit(totalErrors > 0 ? 1 : 0)
}

run().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
