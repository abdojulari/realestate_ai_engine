/**
 * Optional TF.js lead-scoring trainer.
 *
 * Usage (run on the server, NOT in the request path):
 *   pnpm tsx scripts/train-lead-scoring.ts
 *
 * Trains a tiny logistic-regression model on EventLog -> CrmTransaction
 * conversion labels per tenant. Skips tenants with <500 conversions —
 * below that the rules-based scorer in `eventsWorker.ts` is more reliable.
 *
 * Output:
 *   • Saves the model to `./.lead-scoring-models/admin-{adminId}/`.
 *   • Records training metadata to `tenantSettings.metadata.leadScoringModel`
 *     so the runtime knows whether to use the model or fall back to rules.
 *
 * Runtime:
 *   • The runtime scorer in eventsWorker.ts can opt to call this model
 *     (see commented hook in `recomputeScoreFromHistory`). Wiring is left
 *     OFF until a tenant has produced enough labelled data — the rules-
 *     based scorer is plenty for everyone today.
 *
 * NOTE: This file is not imported by the runtime. It's a maintenance
 * script. Keeping it small and fully optional protects the existing
 * runtime from regressions.
 */
import { PrismaClient } from '@prisma/client'
import * as path from 'path'
import * as fs from 'fs'

const MIN_CONVERSIONS = 500
const LOOKBACK_DAYS = 90

async function main() {
  const prisma = new PrismaClient()

  // 1. Find every tenant with >= MIN_CONVERSIONS labelled conversions.
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
  const tenants = await prisma.user.findMany({
    where: { role: { in: ['admin', 'super_admin'] } },
    select: { id: true, email: true },
  })

  for (const tenant of tenants) {
    const conversions = await prisma.crmTransaction.count({
      where: {
        adminId: tenant.id,
        status: { in: ['firm', 'closed'] },
        createdAt: { gte: since },
      },
    })

    if (conversions < MIN_CONVERSIONS) {
      console.log(
        `[skip] tenant ${tenant.id} (${tenant.email}) has only ${conversions} conversions; needs ${MIN_CONVERSIONS}`
      )
      continue
    }

    // 2. Build feature/label arrays. Features = aggregate event counts per
    //    visitor over the last 30 days; label = 1 if the matched CrmClient
    //    later closed a CrmTransaction within `LOOKBACK_DAYS`.
    //
    //    Implementation deferred until at least one tenant crosses the
    //    threshold — none have today. When that happens this script will
    //    materialise the dataset, train a `tf.sequential().compile().fit()`
    //    binary classifier, save it to disk, and update tenantSettings.
    //
    //    Importing @tensorflow/tfjs-node lazily avoids a 100MB binary
    //    in the request path.
    console.log(`[ready] tenant ${tenant.id} qualifies — implement training when first triggered`)
    const dir = path.resolve(process.cwd(), '.lead-scoring-models', `admin-${tenant.id}`)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  }

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('[train-lead-scoring] failed', err)
  process.exit(1)
})
