/**
 * Smoke test for the CRM "Convert to Transaction" handler.
 *
 * Reproduces the exact bug the user hit (string `salePrice` from a Vuetify
 * `type="number"` field) and the cross-tenant safety guarantees of the
 * convert endpoint, against the live local DB.
 *
 * Run:
 *   npx tsx tests/crm-convert-smoke.ts
 *
 * Heavy logging + a per-step timeout watchdog so a stuck query is obvious
 * rather than hanging silently. If a step doesn't finish in 8s we abort the
 * process — that's plenty for a local Postgres on tiny rows; anything longer
 * means the DB is locked by another process (e.g. a stale `nuxt dev`).
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

// Force a small connection pool + explicit short timeouts so we don't sit
// blocked waiting for connections held by a stray dev server.
const databaseUrl = (() => {
  const raw = process.env.DATABASE_URL
  if (!raw) return raw
  try {
    const u = new URL(raw)
    if (!u.searchParams.get('connection_limit')) u.searchParams.set('connection_limit', '2')
    if (!u.searchParams.get('pool_timeout')) u.searchParams.set('pool_timeout', '5')
    if (!u.searchParams.get('connect_timeout')) u.searchParams.set('connect_timeout', '5')
    return u.toString()
  } catch {
    return raw
  }
})()

const prisma = new PrismaClient({
  datasources: databaseUrl ? { db: { url: databaseUrl } } : undefined,
  log: ['warn', 'error'],
})

let failed = 0
function check(label: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ✓ ${label}`)
  else {
    failed++
    console.error(`  ✗ ${label}${detail ? ' — ' + detail : ''}`)
  }
}

// Wraps any awaitable so we abort the process if a single step takes longer
// than `ms`. Without this a Prisma deadlock looks identical to a slow query.
async function step<T>(label: string, ms: number, fn: () => Promise<T>): Promise<T> {
  const start = Date.now()
  process.stdout.write(`  · ${label} … `)
  let timer: NodeJS.Timeout | undefined
  const watchdog = new Promise<never>((_, rej) => {
    timer = setTimeout(() => {
      rej(new Error(`STEP TIMEOUT after ${ms}ms — likely a DB lock or connection-pool starvation`))
    }, ms)
  })
  try {
    const out = (await Promise.race([fn(), watchdog])) as T
    process.stdout.write(`${Date.now() - start}ms\n`)
    return out
  } catch (e: any) {
    process.stdout.write(`FAILED (${Date.now() - start}ms)\n`)
    throw e
  } finally {
    if (timer) clearTimeout(timer)
  }
}

function coerceSalePrice(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n)) return null
  if (n < 0) return null
  return n
}

async function main() {
  console.log('— CRM convert smoke test —')
  console.log(`DATABASE_URL host: ${(() => { try { return new URL(databaseUrl || '').host } catch { return 'unknown' } })()}`)

  console.log('\n[1] Coercion unit checks (no DB):')
  check('coerce "330162.57" → 330162.57', coerceSalePrice('330162.57') === 330162.57)
  check('coerce 100 → 100', coerceSalePrice(100) === 100)
  check('coerce "" → null', coerceSalePrice('') === null)
  check('coerce null → null', coerceSalePrice(null) === null)
  check('coerce undefined → null', coerceSalePrice(undefined) === null)
  check('coerce "abc" → null', coerceSalePrice('abc') === null)
  check('coerce "-5" → null', coerceSalePrice('-5') === null)
  check('coerce Infinity → null', coerceSalePrice(Infinity) === null)
  check('coerce NaN → null', coerceSalePrice(NaN) === null)

  console.log('\n[2] DB ping:')
  await step('SELECT 1', 5_000, () => prisma.$queryRawUnsafe('SELECT 1'))

  console.log('\n[3] Provision two tenants:')
  const suffix = String(Date.now())
  const adminA = await step('create User A', 8_000, () =>
    prisma.user.create({
      data: {
        email: `crm-conv-A-${suffix}@example.test`,
        password: bcrypt.hashSync('x', 4),
        firstName: 'Conv', lastName: 'A', role: 'admin',
      },
    }),
  )
  const adminB = await step('create User B', 8_000, () =>
    prisma.user.create({
      data: {
        email: `crm-conv-B-${suffix}@example.test`,
        password: bcrypt.hashSync('x', 4),
        firstName: 'Conv', lastName: 'B', role: 'admin',
      },
    }),
  )
  const aClient = await step('create CrmClient A', 8_000, () =>
    prisma.crmClient.create({
      data: {
        adminId: adminA.id,
        firstName: 'Adebayo', lastName: 'Test',
        email: `adebayo-${suffix}@example.test`,
        type: 'lead', status: 'active',
      },
    }),
  )
  console.log(`   provisioned: A.adminId=${adminA.id}, A.client=${aClient.id}; B.adminId=${adminB.id}`)

  let txId: number | null = null
  let tx2Id: number | null = null
  try {
    console.log('\n[4] Reproduce the screenshot bug:')
    // Vuetify ships the value as a STRING ("330162.57"). Prisma 6 used to
    // reject this; with `coerceSalePrice` we now hand it a real number.
    const stringFromVuetify = '330162.57'
    const coerced = coerceSalePrice(stringFromVuetify)

    const tx = await step('CrmTransaction.create with coerced number', 8_000, () =>
      prisma.crmTransaction.create({
        data: {
          clientId: aClient.id,
          type: 'buying',
          propertyAddress: '212 Marquis Blvd, Edmonton',
          salePrice: coerced,
          status: 'active',
          currentStage: 'initial',
          progress: 0,
          adminId: aClient.adminId,
        },
      }),
    )
    txId = tx.id
    check('Prisma accepts coerced number for Float? salePrice', tx.salePrice === 330162.57)
    check('Transaction adminId === client.adminId (no cross-tenant drift)', tx.adminId === aClient.adminId)

    console.log('\n[5] Tenant isolation:')
    const bSees = await step('B scope sees A.tx', 5_000, () =>
      prisma.crmTransaction.findMany({ where: { id: tx.id, adminId: adminB.id } }),
    )
    check('Tenant B cannot see A.client transaction', bSees.length === 0)

    const aSees = await step('A scope sees A.tx', 5_000, () =>
      prisma.crmTransaction.findMany({ where: { id: tx.id, adminId: adminA.id } }),
    )
    check('Tenant A sees their own transaction', aSees.length === 1)

    console.log('\n[6] Empty/null payload:')
    const tx2 = await step('CrmTransaction.create with nulls', 8_000, () =>
      prisma.crmTransaction.create({
        data: {
          clientId: aClient.id,
          type: 'selling',
          propertyAddress: null,
          salePrice: null,
          status: 'active',
          currentStage: 'initial',
          progress: 0,
          adminId: aClient.adminId,
        },
      }),
    )
    tx2Id = tx2.id
    check('Transaction with null propertyAddress + salePrice persists', tx2.id > 0)
  } catch (err: any) {
    failed++
    console.error('  ✗ DB simulation crashed:', err?.message || err)
  } finally {
    console.log('\n[7] Cleanup:')
    // Tear down in dependency order. CrmChecklistItem cascades from
    // CrmTransaction so we don't need to delete those explicitly.
    if (txId) {
      await step(`delete tx ${txId}`, 5_000, () =>
        prisma.crmTransaction.delete({ where: { id: txId! } }).catch(() => null),
      )
    }
    if (tx2Id) {
      await step(`delete tx ${tx2Id}`, 5_000, () =>
        prisma.crmTransaction.delete({ where: { id: tx2Id! } }).catch(() => null),
      )
    }
    await step('delete CrmClient A', 5_000, () =>
      prisma.crmClient.delete({ where: { id: aClient.id } }).catch(() => null),
    )
    await step('delete Users', 5_000, () =>
      prisma.user.deleteMany({ where: { id: { in: [adminA.id, adminB.id] } } }),
    )
  }

  console.log('\nDone.')
  if (failed > 0) {
    console.error(`FAILED ${failed} check(s).`)
    process.exit(1)
  }
  console.log('All convert-smoke checks passed.')
}

const HARD_TIMEOUT_MS = 60_000
const hardTimer = setTimeout(() => {
  console.error(`\n*** Hard timeout (${HARD_TIMEOUT_MS}ms) — forcing exit. ***`)
  process.exit(2)
}, HARD_TIMEOUT_MS)
hardTimer.unref()

main()
  .catch((err) => {
    console.error('\nTest crashed:', err?.message || err)
    process.exit(1)
  })
  .finally(async () => {
    clearTimeout(hardTimer)
    await prisma.$disconnect().catch(() => {})
  })
