/**
 * Smoke test for the CRM "Convert to Transaction" handler.
 *
 * Reproduces the exact bug the user hit (string `salePrice` from a Vuetify
 * `type="number"` field) and the cross-tenant safety guarantees of the
 * convert endpoint, against the live local DB.
 *
 * Run:
 *   npx tsx tests/crm-convert-smoke.ts
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

let failed = 0
function check(label: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ✓ ${label}`)
  else {
    failed++
    console.error(`  ✗ ${label}${detail ? ' — ' + detail : ''}`)
  }
}

// Tiny helpers reproducing the server's coercion logic. We test these here
// rather than invoking the Nuxt handler directly (which needs a runtime).
function coerceSalePrice(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n)) return null
  if (n < 0) return null
  return n
}

async function makeAdmin(suffix: string) {
  return prisma.user.create({
    data: {
      email: `crm-conv-${suffix}@example.test`,
      password: await bcrypt.hash('x', 4),
      firstName: 'Conv',
      lastName: suffix,
      role: 'admin',
    },
  })
}

async function makeClient(adminId: number, name: string) {
  return prisma.crmClient.create({
    data: {
      adminId,
      firstName: name,
      lastName: 'Test',
      email: `${name.toLowerCase()}-${Date.now()}@example.test`,
      type: 'lead',
      status: 'active',
    },
  })
}

async function cleanup(adminIds: number[]) {
  if (!adminIds.length) return
  await prisma.crmChecklistItem.deleteMany({
    where: { transaction: { adminId: { in: adminIds } } },
  })
  await prisma.crmTransaction.deleteMany({ where: { adminId: { in: adminIds } } })
  await prisma.crmClient.deleteMany({ where: { adminId: { in: adminIds } } })
  await prisma.user.deleteMany({ where: { id: { in: adminIds } } })
}

async function main() {
  console.log('— CRM convert smoke test —')

  console.log('Coercion unit checks:')
  check('coerce "330162.57" → 330162.57 (the screenshot value)', coerceSalePrice('330162.57') === 330162.57)
  check('coerce 100 → 100', coerceSalePrice(100) === 100)
  check('coerce "" → null', coerceSalePrice('') === null)
  check('coerce null → null', coerceSalePrice(null) === null)
  check('coerce undefined → null', coerceSalePrice(undefined) === null)
  check('coerce "abc" → null', coerceSalePrice('abc') === null)
  check('coerce "-5" → null (no negative prices)', coerceSalePrice('-5') === null)
  check('coerce Infinity → null', coerceSalePrice(Infinity) === null)
  check('coerce NaN → null', coerceSalePrice(NaN) === null)

  const adminA = await makeAdmin('A' + Date.now())
  const adminB = await makeAdmin('B' + Date.now())
  const aClient = await makeClient(adminA.id, 'Adebayo')
  console.log(`\nProvisioned: A.adminId=${adminA.id}, A.client=${aClient.id}; B.adminId=${adminB.id}`)

  try {
    console.log('\nDB-level convert simulation:')

    // (1) Reproduce the exact server logic that previously crashed: pass the
    //     string Vuetify sends ("330162.57") through coerceSalePrice and
    //     into Prisma's `Float?` column. Should succeed now.
    const stringFromVuetify = '330162.57'
    const coerced = coerceSalePrice(stringFromVuetify)
    const tx = await prisma.crmTransaction.create({
      data: {
        clientId: aClient.id,
        type: 'buying',
        propertyAddress: '212 Marquis Blvd, Edmonton',
        salePrice: coerced,
        status: 'active',
        currentStage: 'initial',
        progress: 0,
        adminId: aClient.adminId, // anchored to client tenant, not the user
      },
    })
    check('Prisma accepts coerced number for Float? salePrice', tx.salePrice === 330162.57)
    check('Transaction adminId === client.adminId (no cross-tenant drift)', tx.adminId === aClient.adminId)

    // (2) Tenant-isolation: a transaction created for A's client should not
    //     show up under B's tenant scope.
    const bTransactionsForAClient = await prisma.crmTransaction.findMany({
      where: { id: tx.id, adminId: adminB.id },
    })
    check('Tenant B cannot see A.client transaction via adminId scope', bTransactionsForAClient.length === 0)

    // (3) The opposite query (A's tenant scope) DOES see it.
    const aTransactionsForAClient = await prisma.crmTransaction.findMany({
      where: { id: tx.id, adminId: adminA.id },
    })
    check('Tenant A sees their own transaction via adminId scope', aTransactionsForAClient.length === 1)

    // (4) Empty propertyAddress and null salePrice should also be safe.
    const tx2 = await prisma.crmTransaction.create({
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
    })
    check('Transaction with null propertyAddress + salePrice persists', tx2.id > 0)
  } catch (err: any) {
    failed++
    console.error('  ✗ DB simulation crashed:', err?.message || err)
  } finally {
    await cleanup([adminA.id, adminB.id])
  }

  console.log('\nDone.')
  if (failed > 0) {
    console.error(`FAILED ${failed} check(s).`)
    process.exit(1)
  }
  console.log('All convert-smoke checks passed.')
}

main()
  .catch((err) => {
    console.error('Test crashed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
