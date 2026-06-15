/**
 * Tenant-isolation regression test for the Newsletter > Automations flow.
 *
 * Run:
 *   npx tsx tests/newsletter-tenant-isolation.ts
 *
 * This test focuses on the layer that actually decides who gets a newsletter:
 * the audience-resolution helpers and the Prisma queries that back them. It
 * deliberately does NOT call `dispatchNewsletter` (which pulls in the Nuxt
 * runtime via the email module); instead it reproduces the dispatcher's
 * tenant-scoped SELECTs against the live DB and asserts they never cross.
 *
 * What's covered:
 *   1. Helper invariants (`normalizeAudience`, `normalizeSubscriberIds`,
 *      `buildAudienceWhere`) — pure unit checks.
 *   2. SQL-level cross-tenant attack vectors against `NewsletterSubscriber`,
 *      `NewsletterTemplate`, and `Newsletter`:
 *        a) `audience='specific'` with another tenant's subscriber IDs.
 *        b) Template lookups scoped to the wrong tenant.
 *        c) Campaign lookups scoped to the wrong tenant.
 *        d) Mixing one's own and another tenant's IDs together.
 *
 * The test exits non-zero on any failure so CI can gate merges on it.
 */

// Load .env so the test picks up DATABASE_URL the same way the Nuxt server
// does, without needing the user to `export` anything first.
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import {
  buildAudienceWhere,
  normalizeAudience,
  normalizeSubscriberIds,
} from '../server/utils/newsletterAudience'

const prisma = new PrismaClient()

let failed = 0
function check(label: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ✓ ${label}`)
  } else {
    failed++
    console.error(`  ✗ ${label}${detail ? ' — ' + detail : ''}`)
  }
}

async function makeTenant(suffix: string) {
  const admin = await prisma.user.create({
    data: {
      email: `tenant-iso-admin-${suffix}@example.test`,
      password: await bcrypt.hash('x', 4),
      firstName: 'Iso',
      lastName: suffix,
      role: 'admin',
    },
  })
  const subscriber = await prisma.newsletterSubscriber.create({
    data: {
      adminId: admin.id,
      email: `iso-sub-${suffix}-${Date.now()}@example.test`,
      firstName: 'Sub',
      lastName: suffix,
      status: 'active',
    },
  })
  const template = await prisma.newsletterTemplate.create({
    data: {
      adminId: admin.id,
      name: `Iso Template ${suffix} ${Date.now()}`,
      subject: `Hello from ${suffix}`,
      content: `<p>Hi from ${suffix}</p>`,
      isActive: true,
      createdBy: admin.id,
    },
  })
  const newsletter = await prisma.newsletter.create({
    data: {
      adminId: admin.id,
      name: `Iso Campaign ${suffix} ${Date.now()}`,
      subject: `Campaign from ${suffix}`,
      content: `<p>Campaign content for ${suffix}</p>`,
      status: 'draft',
      createdBy: admin.id,
    },
  })
  return { admin, subscriber, template, newsletter }
}

async function cleanup(adminIds: number[]) {
  if (adminIds.length === 0) return
  await prisma.sentNewsletter.deleteMany({
    where: { newsletter: { adminId: { in: adminIds } } },
  })
  await prisma.newsletter.deleteMany({ where: { adminId: { in: adminIds } } })
  await prisma.newsletterTemplate.deleteMany({ where: { adminId: { in: adminIds } } })
  await prisma.newsletterAutomation.deleteMany({ where: { adminId: { in: adminIds } } })
  await prisma.newsletterSubscriber.deleteMany({ where: { adminId: { in: adminIds } } })
  await prisma.user.deleteMany({ where: { id: { in: adminIds } } })
}

async function main() {
  console.log('— Newsletter tenant-isolation test —')

  // 1. Pure-helper sanity (no DB needed).
  console.log('Helper unit checks:')
  check('normalizeAudience defaults unknown to "all"', normalizeAudience('hax0r-payload') === 'all')
  check('normalizeAudience accepts "specific"', normalizeAudience('specific') === 'specific')
  check(
    'normalizeSubscriberIds drops non-numeric, negatives, and floats',
    JSON.stringify(normalizeSubscriberIds([1, '2', -3, 'foo', 4.5, null, 5])) ===
      JSON.stringify([1, 2, 5]),
  )

  const noTenantWhere = buildAudienceWhere('all', {}) as any
  check(
    'buildAudienceWhere with no adminId substitutes -1 sentinel',
    noTenantWhere.adminId === -1,
    JSON.stringify(noTenantWhere),
  )

  const specificEmpty = buildAudienceWhere('specific', { adminId: 999 }, []) as any
  check(
    'buildAudienceWhere("specific", []) refuses to widen',
    JSON.stringify(specificEmpty.id) === JSON.stringify({ in: [-1] }) &&
      specificEmpty.adminId === 999,
    JSON.stringify(specificEmpty),
  )

  const specificMixed = buildAudienceWhere('specific', { adminId: 999 }, [1, 2, 3]) as any
  check(
    'buildAudienceWhere("specific", ids) keeps adminId AND ids',
    specificMixed.adminId === 999 &&
      JSON.stringify(specificMixed.id) === JSON.stringify({ in: [1, 2, 3] }),
    JSON.stringify(specificMixed),
  )

  // 2. DB integration — simulate what dispatchNewsletter would query.
  const a = await makeTenant('A' + Date.now())
  const b = await makeTenant('B' + Date.now())
  console.log(
    `\nProvisioned tenants — A.adminId=${a.admin.id} A.subId=${a.subscriber.id}; ` +
      `B.adminId=${b.admin.id} B.subId=${b.subscriber.id}`,
  )

  try {
    console.log('\nCross-tenant attack vectors:')

    // (a) Specific audience for A but caller passes only B's subscriber ID.
    //     dispatcher would call findMany with this where:
    const attackWhereOnlyB = buildAudienceWhere(
      'specific',
      { adminId: a.admin.id },
      [b.subscriber.id],
    )
    const onlyBCount = await prisma.newsletterSubscriber.count({ where: attackWhereOnlyB as any })
    const onlyBRows = await prisma.newsletterSubscriber.findMany({ where: attackWhereOnlyB as any })
    check(
      `findMany(specific, A, [B.sub]) returns 0 rows (got ${onlyBCount})`,
      onlyBCount === 0 && onlyBRows.length === 0,
    )

    // (b) Mixed IDs — A.sub + B.sub. Only A.sub must come back.
    const attackWhereMixed = buildAudienceWhere(
      'specific',
      { adminId: a.admin.id },
      [a.subscriber.id, b.subscriber.id],
    )
    const mixedRows = await prisma.newsletterSubscriber.findMany({ where: attackWhereMixed as any })
    check(
      `findMany(specific, A, [A.sub, B.sub]) returns exactly 1 row, A's`,
      mixedRows.length === 1 && mixedRows[0]!.id === a.subscriber.id,
      JSON.stringify(mixedRows.map((r) => r.id)),
    )

    // (c) audience='all' for tenant A must never return B's subscriber.
    const allRows = await prisma.newsletterSubscriber.findMany({
      where: buildAudienceWhere('all', { adminId: a.admin.id }) as any,
      select: { id: true, adminId: true },
    })
    check(
      `findMany(all, A) excludes any row with adminId !== A`,
      allRows.every((r) => r.adminId === a.admin.id),
      JSON.stringify(allRows),
    )

    // (d) Template-source check — admin A asking for B's template ID.
    //     Mirrors dispatcher's `prisma.newsletterTemplate.findFirst`.
    const crossTemplate = await prisma.newsletterTemplate.findFirst({
      where: { id: b.template.id, adminId: a.admin.id },
    })
    check(
      'findFirst(template B.id, A.adminId) returns null',
      crossTemplate === null,
      JSON.stringify(crossTemplate),
    )

    // (e) Campaign-source check — admin A asking for B's campaign ID.
    const crossCampaign = await prisma.newsletter.findFirst({
      where: { id: b.newsletter.id, adminId: a.admin.id },
    })
    check(
      'findFirst(campaign B.id, A.adminId) returns null',
      crossCampaign === null,
      JSON.stringify(crossCampaign),
    )

    // (f) Owner-side sanity: A can still see their own template + campaign.
    const ownTemplate = await prisma.newsletterTemplate.findFirst({
      where: { id: a.template.id, adminId: a.admin.id },
    })
    const ownCampaign = await prisma.newsletter.findFirst({
      where: { id: a.newsletter.id, adminId: a.admin.id },
    })
    check('A can read own template', ownTemplate !== null)
    check('A can read own campaign', ownCampaign !== null)

    // (g) NewsletterAutomation creation as A with B.templateId — the POST
    //     handler validates this before insert. Simulate the validation:
    const fakeTemplateLookup = await prisma.newsletterTemplate.findFirst({
      where: { id: b.template.id, adminId: a.admin.id },
    })
    check(
      'automation create-validation: A pointing at B.templateId resolves to null',
      fakeTemplateLookup === null,
    )

    // (h) Subscriber-IDs whitelist used by automations POST/PUT — only owned
    //     IDs survive. Simulates the `findMany({id: { in: requested }, ...tenantFilter})`.
    const whitelist = await prisma.newsletterSubscriber.findMany({
      where: {
        id: { in: [a.subscriber.id, b.subscriber.id] },
        adminId: a.admin.id,
      },
      select: { id: true },
    })
    check(
      'subscriberIds whitelist filters out B.sub when caller is A',
      whitelist.length === 1 && whitelist[0]!.id === a.subscriber.id,
      JSON.stringify(whitelist),
    )
  } finally {
    await cleanup([a.admin.id, b.admin.id])
  }

  console.log('\nDone.')
  if (failed > 0) {
    console.error(`FAILED ${failed} check(s).`)
    process.exit(1)
  }
  console.log('All tenant-isolation checks passed.')
}

main()
  .catch((err) => {
    console.error('Test crashed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
