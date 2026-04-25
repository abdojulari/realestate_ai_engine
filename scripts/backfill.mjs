#!/usr/bin/env node
/**
 * Consolidated backfill CLI.
 *
 * Replaces three previous standalone scripts:
 *   - backfill-crea-media.mjs
 *   - backfill-original-list-price.mjs
 *   - backfill-tenant-admin-ids.mjs
 *
 * Each subcommand below preserves the exact behaviour of the old script it
 * replaces — only the entry point changed. Run with --help on any subcommand
 * to see its flags.
 *
 * Usage:
 *   node scripts/backfill.mjs <subcommand> [options]
 *
 * Subcommands:
 *   crea-media           Repair Property.images for CREA rows synced before
 *                        the discard-media bug was fixed. Hits the public
 *                        /api/crea/backfill-media endpoint in batches.
 *   original-list-price  One-time DB fixup for the deals page: clears bogus
 *                        firstEntryPrice values and seeds originalListPrice
 *                        from firstEntryPrice when useful.
 *   tenant-admin-ids     One-time tenant scoping fixup: sets adminId on
 *                        tenant-scoped models to the first super_admin/admin
 *                        and creates TenantSettings if missing.
 *
 * Examples:
 *   node scripts/backfill.mjs crea-media --batch=50 --max-batches=1
 *   DRY_RUN=1 node scripts/backfill.mjs original-list-price
 *   node scripts/backfill.mjs tenant-admin-ids
 *   node scripts/backfill.mjs --help
 */

try { await import('dotenv/config') } catch {}

// ─── Subcommand registry ───────────────────────────────────────────────────

const SUBCOMMANDS = {
  'crea-media': {
    summary: 'Repair Property.images for CREA rows synced before media-discard fix.',
    run: runCreaMedia,
    help: helpCreaMedia,
  },
  'original-list-price': {
    summary: 'One-time DB fixup for the deals page (firstEntryPrice / originalListPrice).',
    run: runOriginalListPrice,
    help: helpOriginalListPrice,
  },
  'tenant-admin-ids': {
    summary: 'One-time tenant scoping fixup for legacy adminId-null rows.',
    run: runTenantAdminIds,
    help: helpTenantAdminIds,
  },
}

// ─── Top-level dispatcher ──────────────────────────────────────────────────

const [, , rawSub, ...rest] = process.argv

if (!rawSub || rawSub === '--help' || rawSub === '-h') {
  showTopHelp()
  process.exit(0)
}

const sub = SUBCOMMANDS[rawSub]
if (!sub) {
  console.error(`Unknown subcommand: ${rawSub}\n`)
  showTopHelp()
  process.exit(1)
}

if (rest.includes('--help') || rest.includes('-h')) {
  sub.help()
  process.exit(0)
}

sub.run(rest).catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})

function showTopHelp() {
  console.log(`
backfill — consolidated backfill CLI

Usage:
  node scripts/backfill.mjs <subcommand> [options]

Subcommands:`)
  for (const [name, def] of Object.entries(SUBCOMMANDS)) {
    console.log(`  ${name.padEnd(22)} ${def.summary}`)
  }
  console.log(`
Run \`node scripts/backfill.mjs <subcommand> --help\` for subcommand options.
`)
}

// ─── Subcommand: crea-media ────────────────────────────────────────────────

function helpCreaMedia() {
  console.log(`
backfill crea-media — repair empty Property.images for CREA rows

Usage:
  node scripts/backfill.mjs crea-media [options]

Options:
  --batch=100      Properties per batch (default 100, max 500)
  --delay=300      Per-property CREA delay in ms (default 300)
  --max-batches=N  Safety stop after N batches (default unlimited)
  --help, -h       Show this help

Env: same API base resolution as holistic-sync.mjs. Endpoint is unauthenticated
(mirrors /api/crea/sync-province).
`)
}

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
    if (u.toLowerCase().endsWith('/api')) u = u.slice(0, -4)
    if (/^https?:\/\//i.test(u)) return u
  }
  return 'http://localhost:3000'
}

function parseFlag(args, name, fallback) {
  const a = args.find((s) => s.startsWith(`--${name}=`))
  if (!a) return fallback
  const v = a.substring(a.indexOf('=') + 1)
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

async function runCreaMedia(args) {
  const opts = {
    batch: parseFlag(args, 'batch', 100),
    delay: parseFlag(args, 'delay', 300),
    maxBatches: parseFlag(args, 'max-batches', Infinity),
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
      await new Promise((r) => setTimeout(r, 5_000))
      batch--
      continue
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`❌ Batch ${batch} HTTP ${res.status}: ${body.slice(0, 300)}`)
      // Server hiccup — back off briefly, then keep going.
      await new Promise((r) => setTimeout(r, 10_000))
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
      `Batch ${batch}: attempted=${s.attempted} updated=${s.updated} noMedia=${s.noMedia} expired=${s.expired || 0} failed=${s.failed} (${elapsed}s, total=${totalElapsed}m)`,
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

// ─── Subcommand: original-list-price ───────────────────────────────────────

function helpOriginalListPrice() {
  console.log(`
backfill original-list-price — one-time deals-page DB fixup

Usage:
  node scripts/backfill.mjs original-list-price [options]
  DRY_RUN=1 node scripts/backfill.mjs original-list-price

Why this exists
  The deals page used to filter on \`firstEntryPrice\` only. That column was
  added in migration 20260410200000 and lazily back-filled to
  \`existingProperty.price\`, which silently set the baseline for legacy rows
  to their *reduced* price — meaning those listings can never appear as deals.

What it does
  1. Clears firstEntryPrice on rows that look like the April-10 lazy backfill
     (firstEntryPrice == price AND row pre-dates the migration). Lets the next
     sync re-derive a sensible baseline from the feed.
  2. Where originalListPrice is null but firstEntryPrice is HIGHER than the
     current price, copies it across as a stop-gap signal.

Idempotent — re-running is a no-op.

Options:
  --help, -h       Show this help
`)
}

async function runOriginalListPrice() {
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()
  const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true'

  // The lazy-backfill happened on the first sync after this migration timestamp.
  const LAZY_BACKFILL_CUTOFF = new Date('2026-04-10T00:00:00.000Z')

  try {
    console.log(DRY_RUN ? '🔎 DRY RUN — no writes will be performed.\n' : '🛠  Live run — writes WILL be applied.\n')

    // ─── Step 1: clear bogus firstEntryPrice on legacy rows ──────────────────
    const lazyBackfillRows = await prisma.$queryRaw`
      SELECT id, source, "createdAt", "firstEntryPrice", price
      FROM "Property"
      WHERE "firstEntryPrice" IS NOT NULL
        AND "firstEntryPrice" = price
        AND "createdAt" < ${LAZY_BACKFILL_CUTOFF}
        AND source IN ('crea', 'pillar9')
    `
    console.log(`Step 1 – legacy firstEntryPrice rows to clear: ${lazyBackfillRows.length}`)
    if (!DRY_RUN && lazyBackfillRows.length > 0) {
      const ids = lazyBackfillRows.map((r) => r.id)
      const cleared = await prisma.property.updateMany({
        where: { id: { in: ids } },
        data: { firstEntryPrice: null },
      })
      console.log(`  ✔ cleared firstEntryPrice on ${cleared.count} rows`)
    }

    // ─── Step 2: copy firstEntryPrice -> originalListPrice when useful ───────
    const seedCandidates = await prisma.property.findMany({
      where: {
        originalListPrice: null,
        firstEntryPrice: { not: null },
      },
      select: { id: true, price: true, firstEntryPrice: true },
    })
    const toSeed = seedCandidates.filter(
      (p) =>
        typeof p.firstEntryPrice === 'number' &&
        typeof p.price === 'number' &&
        p.firstEntryPrice > p.price,
    )
    console.log(`Step 2 – rows to seed originalListPrice from firstEntryPrice: ${toSeed.length}`)
    if (!DRY_RUN) {
      let updated = 0
      for (const row of toSeed) {
        try {
          await prisma.property.update({
            where: { id: row.id },
            data: { originalListPrice: row.firstEntryPrice },
          })
          updated++
        } catch (e) {
          console.warn(`  ⚠ failed to update id=${row.id}: ${e.message}`)
        }
      }
      console.log(`  ✔ seeded originalListPrice on ${updated} rows`)
    }

    const totals = await prisma.$queryRaw`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE "originalListPrice" IS NOT NULL)::int AS with_olp,
        COUNT(*) FILTER (WHERE "firstEntryPrice"   IS NOT NULL)::int AS with_first,
        COUNT(*) FILTER (
          WHERE status IN ('for_sale','pending')
            AND (
              ("originalListPrice" IS NOT NULL AND price < "originalListPrice")
              OR ("originalListPrice" IS NULL AND "firstEntryPrice" IS NOT NULL AND price < "firstEntryPrice")
            )
        )::int AS would_show_as_deal
      FROM "Property"
    `
    console.log('\nFinal totals:')
    console.table(totals[0])

    console.log(
      DRY_RUN
        ? '\n✅ DRY RUN complete. Re-run without DRY_RUN=1 to apply.'
        : '\n✅ Backfill complete. Run a normal CREA + Pillar9 sync to pull real MLS originalListPrice values.',
    )
  } finally {
    await prisma.$disconnect()
  }
}

// ─── Subcommand: tenant-admin-ids ──────────────────────────────────────────

function helpTenantAdminIds() {
  console.log(`
backfill tenant-admin-ids — one-time tenant scoping fixup

Usage:
  node scripts/backfill.mjs tenant-admin-ids

Sets adminId on tenant-scoped models (where adminId IS NULL) to the first
super_admin / admin in the system, and creates a default TenantSettings row
for that admin if one doesn't exist yet.

Run after introducing tenant-scoped adminId or to repair legacy null rows.

Options:
  --help, -h       Show this help
`)
}

async function runTenantAdminIds() {
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()

  try {
    const admin = await prisma.user.findFirst({
      where: { role: { in: ['super_admin', 'admin'] } },
      orderBy: { id: 'asc' },
      select: { id: true, email: true, role: true },
    })

    if (!admin) {
      console.error('❌ No super_admin or admin found. Cannot backfill.')
      process.exit(1)
    }

    console.log(`\n🔧 Backfilling adminId with admin: ${admin.email} (id=${admin.id}, role=${admin.role})\n`)

    const models = [
      'property',
      'contentBlock',
      'setting',
      'emailTemplate',
      'testimonial',
      'newsletterSubscriber',
      'newsletterTemplate',
      'newsletter',
      'newsletterAutomation',
      'blogCategory',
      'blogPost',
      'blogTag',
      'chatLead',
      'homeEstimate',
      'propertyInquiry',
    ]

    for (const model of models) {
      try {
        const result = await prisma[model].updateMany({
          where: { adminId: null },
          data: { adminId: admin.id },
        })
        console.log(`  ✅ ${model}: updated ${result.count} records`)
      } catch (err) {
        console.error(`  ⚠️  ${model}: ${err.message}`)
      }
    }

    const existing = await prisma.tenantSettings.findUnique({ where: { adminId: admin.id } })
    if (!existing) {
      await prisma.tenantSettings.create({
        data: {
          adminId: admin.id,
          businessName: 'DeelBot',
          tagline: 'Intelligence for Realtors',
          phone: '+1 (647) 563 7235',
          email: 'abdul.ojulari@exprealty.com',
          brokerageName: 'eXp Realty',
          brokerageLogoUrl: '/images/avatars/exp.png',
          copyrightName: 'HomesByAbdulOjulari',
          developerName: 'Abdul Ojulari',
          developerUrl: 'https://www.linkedin.com/in/abdulojulari/',
          footerDisclaimer:
            'For listings in Canada, the trademarks REALTOR®, REALTORS®, and the REALTOR® logo are controlled by The Canadian Real Estate Association (CREA) and identify real estate professionals who are members of CREA. The trademarks MLS®, Multiple Listing Service® and the associated logos are owned by CREA and identify the quality of services provided by real estate professionals who are members of CREA. Used under license.',
          socialLinks: [
            { icon: 'mdi-facebook', name: 'Facebook', url: 'https://www.facebook.com/realtorabdulojulari' },
            { icon: 'mdi-instagram', name: 'Instagram', url: 'https://www.instagram.com/homesbyabdul_o/' },
            { icon: 'mdi-linkedin', name: 'LinkedIn', url: 'https://www.linkedin.com/in/abdulojulari/' },
          ],
        },
      })
      console.log(`  ✅ TenantSettings created for ${admin.email}`)
    } else {
      console.log(`  ℹ️  TenantSettings already exists for ${admin.email}`)
    }

    console.log('\n✅ Backfill complete!\n')
  } finally {
    await prisma.$disconnect()
  }
}
