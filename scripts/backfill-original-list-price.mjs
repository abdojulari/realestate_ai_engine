#!/usr/bin/env node
/**
 * Backfill OriginalListPrice / PreviousListPrice for existing rows.
 *
 * Why this script exists
 * ----------------------
 * The Best Deals page used to filter on `firstEntryPrice` only. That column
 * was added in migration 20260410200000 and lazily back-filled to
 * `existingProperty.price` on the next sync — meaning every legacy row that
 * had ALREADY been reduced before April 10 got its baseline silently set to
 * the *reduced* price. Result: those listings can never appear as "deals" in
 * our system even though MLS shows them as -X% off.
 *
 * The new MLS-native fields (`originalListPrice`, `previousListPrice`,
 * `priceChangeTimestamp`) come from the CREA / Pillar9 feed directly. Once
 * the next sync runs, fresh rows will be populated automatically. For rows
 * already in the DB we run this script to:
 *
 *   1. Clear `firstEntryPrice` on rows that look like they came from the
 *      April-10 lazy backfill (i.e. firstEntryPrice == price AND row pre-dates
 *      the migration). That lets the next sync re-derive a sensible baseline
 *      from the feed rather than being permanently stuck on the reduced price.
 *   2. Where `originalListPrice` is still null but we have a usable
 *      `firstEntryPrice` that's HIGHER than the current price, copy it across
 *      so the deals page has at least our internal signal until the next
 *      sync brings the real OriginalListPrice down from MLS.
 *
 * The script is idempotent — running it twice is a no-op the second time.
 *
 * Usage:
 *   node scripts/backfill-original-list-price.mjs              # apply changes
 *   DRY_RUN=1 node scripts/backfill-original-list-price.mjs    # preview only
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true'

// The lazy-backfill happened on the first sync after this migration timestamp.
const LAZY_BACKFILL_CUTOFF = new Date('2026-04-10T00:00:00.000Z')

async function main() {
  console.log(DRY_RUN ? '🔎 DRY RUN — no writes will be performed.\n' : '🛠  Live run — writes WILL be applied.\n')

  // ─── Step 1: clear bogus firstEntryPrice on legacy rows ────────────────────
  // These are rows that existed before the firstEntryPrice column was added
  // AND whose firstEntryPrice now equals their current price (i.e. the
  // next-sync lazy backfill pinned them to whatever price was current that
  // night, not the original list price). Wiping the column lets the next
  // sync re-set it to the new price (irrelevant for deals — `originalListPrice`
  // takes precedence) without misleading the deals query.
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

  // ─── Step 2: copy firstEntryPrice -> originalListPrice when useful ─────────
  // Only when (a) we don't already have originalListPrice from the feed and
  // (b) firstEntryPrice is HIGHER than the current price (otherwise it's not
  // a "deal" signal). This is a stop-gap that disappears on the next sync as
  // soon as the feed delivers a real OriginalListPrice.
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

  // ─── Summary ───────────────────────────────────────────────────────────────
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
}

main()
  .catch((e) => {
    console.error('❌ Backfill failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
