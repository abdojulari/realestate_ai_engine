#!/usr/bin/env node
/**
 * Consolidated Admin Tools
 * ------------------------
 *
 * One-off database / content / API helpers. Run with:
 *   node scripts/admin-tools.mjs <command> [options]
 *
 * Commands:
 *   query-users          Display all users grouped by role (with activity counts).
 *   check-properties     Property statistics + sample data (now includes
 *                        adminId tenant attribution and the new MLS-native
 *                        price fields originalListPrice / firstEntryPrice).
 *   check-content        Display all content blocks (now grouped by adminId).
 *   fix-zero-prices      Remove CREA properties with invalid price = 0.
 *                        Requires --admin-id=N or --all-tenants for safety.
 *   test-crea-api        Quick CREA OAuth + property fetch smoke test using
 *                        env credentials (CREA_CLIENT_ID / CREA_CLIENT_SECRET).
 *                        For richer probing use scripts/test-crea-direct.mjs.
 *   restore-content      Re-seed why-choose-us + testimonials for a tenant.
 *   seed-about           Seed about page content for a tenant.
 *   seed-hero            Seed hero section content for a tenant.
 *   update-about         Replace about page with the bundled rich HTML for a tenant.
 *   help                 Show this message.
 *
 * Flags:
 *   --admin-id=N         Tenant scope. Defaults to the first super_admin /
 *                        admin in the DB if omitted. Required for any write
 *                        that targets tenant-scoped tables.
 *   --all-tenants        Opt-in flag for fix-zero-prices to operate without
 *                        a tenant scope (i.e. across the whole table).
 *
 * Environment:
 *   DATABASE_URL         Required for any DB command.
 *   CREA_CLIENT_ID       Required for test-crea-api.
 *   CREA_CLIENT_SECRET   Required for test-crea-api.
 *   CREA_BASE_URL        Optional, defaults to https://ddfapi.realtor.ca.
 *   CREA_TOKEN_ENDPOINT  Optional, defaults to https://identity.crea.ca/connect/token.
 *
 * Notes:
 *   - ContentBlock / Setting use the composite unique (adminId, key); all
 *     content writes here go through the resolved tenant's adminId.
 *   - This script previously had hard-coded CREA credentials in source.
 *     Those have been removed — they must come from env now. Rotate any
 *     credentials that were ever committed to source control.
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ─── Argument parsing ──────────────────────────────────────────────────────

function parseArgs(argv) {
  const out = { _: [], flags: {} }
  for (const a of argv) {
    if (a.startsWith('--')) {
      const eq = a.indexOf('=')
      if (eq === -1) {
        out.flags[a.slice(2)] = true
      } else {
        out.flags[a.slice(2, eq)] = a.slice(eq + 1)
      }
    } else {
      out._.push(a)
    }
  }
  return out
}

async function resolveAdminId(flagValue) {
  if (flagValue) {
    const n = Number(flagValue)
    if (!Number.isFinite(n) || n <= 0) {
      throw new Error(`--admin-id must be a positive integer, got: ${flagValue}`)
    }
    const user = await prisma.user.findUnique({
      where: { id: n },
      select: { id: true, email: true, role: true },
    })
    if (!user) throw new Error(`No user found with id=${n}`)
    return user
  }
  const fallback = await prisma.user.findFirst({
    where: { role: { in: ['super_admin', 'admin'] } },
    orderBy: { id: 'asc' },
    select: { id: true, email: true, role: true },
  })
  if (!fallback) {
    throw new Error('No super_admin or admin user exists. Pass --admin-id=N or create one first.')
  }
  return fallback
}

// ─── User management ───────────────────────────────────────────────────────

async function queryUsers() {
  console.log('🔍 Querying users from database...\n')

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      phone: true,
      provider: true,
      adminId: true,
      subscriptionTier: true,
      mustChangePassword: true,
      marketingConsent: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,
      _count: {
        select: {
          properties: true,
          savedSearches: true,
          viewingRequests: true,
          inquiries: true,
          savedProperties: true,
        },
      },
    },
    orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
  })

  if (users.length === 0) {
    console.log('❌ No users found in the database.')
    return
  }

  console.log(`📊 Found ${users.length} users:\n`)

  const usersByRole = users.reduce((acc, user) => {
    if (!acc[user.role]) acc[user.role] = []
    acc[user.role].push(user)
    return acc
  }, {})

  for (const [role, roleUsers] of Object.entries(usersByRole)) {
    console.log(`👥 ${role.toUpperCase()} USERS (${roleUsers.length}):`)
    console.log('─'.repeat(60))

    roleUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName}`)
      console.log(`   📧 Email:          ${user.email}`)
      console.log(`   🆔 ID:             ${user.id}`)
      console.log(`   👤 Tenant adminId: ${user.adminId ?? '(none — top-level)'}`)
      console.log(`   📱 Phone:          ${user.phone || 'Not provided'}`)
      console.log(`   🔐 Provider:       ${user.provider || 'Email/Password'}`)
      console.log(`   💳 Subscription:   ${user.subscriptionTier || '—'}`)
      console.log(`   🔒 Must change pw: ${user.mustChangePassword ? 'yes' : 'no'}`)
      console.log(`   🕒 Last login:     ${user.lastLoginAt ? new Date(user.lastLoginAt).toISOString() : '—'}`)
      console.log(`   📅 Created:        ${new Date(user.createdAt).toLocaleDateString()}`)
      console.log(`   📈 Activity:`)
      console.log(`      • Properties:        ${user._count.properties}`)
      console.log(`      • Saved Searches:    ${user._count.savedSearches}`)
      console.log(`      • Viewing Requests:  ${user._count.viewingRequests}`)
      console.log(`      • Inquiries:         ${user._count.inquiries}`)
      console.log(`      • Saved Properties:  ${user._count.savedProperties}`)
      console.log('')
    })
    console.log('')
  }

  console.log('📈 SUMMARY:')
  console.log('─'.repeat(30))
  for (const [role, roleUsers] of Object.entries(usersByRole)) {
    console.log(`${role}: ${roleUsers.length} users`)
  }
  console.log(`Total: ${users.length} users`)
}

// ─── Property management ───────────────────────────────────────────────────

async function checkProperties() {
  const properties = await prisma.property.findMany({
    select: {
      id: true,
      adminId: true,
      title: true,
      city: true,
      latitude: true,
      longitude: true,
      price: true,
      firstEntryPrice: true,
      originalListPrice: true,
      previousListPrice: true,
      priceChangeTimestamp: true,
      type: true,
      status: true,
      source: true,
    },
    orderBy: { id: 'asc' },
  })

  console.log(`Found ${properties.length} properties:`)
  console.log('ID | Tenant | Title | City | Price | OLP | FEP | Type | Status | Source')
  console.log('---|--------|-------|------|-------|-----|-----|------|--------|-------')

  for (const p of properties.slice(0, 10)) {
    const title = p.title.length > 25 ? `${p.title.substring(0, 25)}...` : p.title
    const fmt = (n) => (typeof n === 'number' ? `$${n.toLocaleString()}` : '—')
    console.log(
      [
        p.id,
        p.adminId ?? '∅',
        title,
        p.city,
        fmt(p.price),
        fmt(p.originalListPrice),
        fmt(p.firstEntryPrice),
        p.type,
        p.status,
        p.source || 'manual',
      ].join(' | '),
    )
  }

  if (properties.length > 10) {
    console.log(`... and ${properties.length - 10} more properties`)
  }

  const users = await prisma.user.count()
  const contentBlocks = await prisma.contentBlock.count()

  const propertiesBySource = properties.reduce((acc, p) => {
    const source = p.source || 'manual'
    acc[source] = (acc[source] || 0) + 1
    return acc
  }, {})
  const propertiesByStatus = properties.reduce((acc, p) => {
    const status = p.status || '(null)'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})
  const propertiesByTenant = properties.reduce((acc, p) => {
    const k = p.adminId ?? 'null'
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {})
  const dealsCandidate = properties.filter(
    (p) =>
      (p.status === 'for_sale' || p.status === 'pending') &&
      ((typeof p.originalListPrice === 'number' && p.price < p.originalListPrice) ||
        (p.originalListPrice == null &&
          typeof p.firstEntryPrice === 'number' &&
          p.price < p.firstEntryPrice)),
  )

  console.log(`\nSummary:`)
  console.log(`- Total Properties: ${properties.length}`)
  console.log(`- By source:`)
  for (const [source, count] of Object.entries(propertiesBySource)) {
    console.log(`    ${source.padEnd(12)} ${count}`)
  }
  console.log(`- By status:`)
  for (const [status, count] of Object.entries(propertiesByStatus)) {
    console.log(`    ${status.padEnd(12)} ${count}`)
  }
  console.log(`- By tenant adminId:`)
  for (const [adminId, count] of Object.entries(propertiesByTenant)) {
    console.log(`    adminId=${adminId.padEnd(8)} ${count}`)
  }
  console.log(`- Would show as deals (price-cut): ${dealsCandidate.length}`)
  console.log(`- Users:          ${users}`)
  console.log(`- Content Blocks: ${contentBlocks}`)
}

async function fixZeroPrices(args) {
  const adminIdFlag = args.flags['admin-id']
  const allTenants = !!args.flags['all-tenants']

  if (!adminIdFlag && !allTenants) {
    console.error(
      '❌ fix-zero-prices requires either --admin-id=N (single tenant) or --all-tenants (delete across the whole table).',
    )
    process.exit(1)
  }

  const where = allTenants
    ? { price: 0, source: 'crea' }
    : { price: 0, source: 'crea', adminId: Number(adminIdFlag) }

  console.log(`🔍 Finding CREA properties with price = 0${allTenants ? ' (ALL tenants)' : ` (adminId=${adminIdFlag})`}...`)

  const zeroProperties = await prisma.property.findMany({
    where,
    select: {
      id: true,
      adminId: true,
      title: true,
      price: true,
      externalId: true,
      mlsNumber: true,
    },
  })

  console.log(`📊 Found ${zeroProperties.length} CREA properties with price = 0`)

  if (zeroProperties.length === 0) {
    console.log('✅ No properties to fix!')
    return
  }

  console.log('\n🗑️ These properties will be deleted (they should not exist):')
  for (const p of zeroProperties) {
    console.log(`   - ID: ${p.id} | tenant=${p.adminId ?? '∅'} | ${p.title} | MLS: ${p.mlsNumber || 'N/A'}`)
  }

  const deleteResult = await prisma.property.deleteMany({ where })

  console.log(`\n✅ Deleted ${deleteResult.count} invalid CREA properties`)
}

// ─── Content management ────────────────────────────────────────────────────

async function checkContent() {
  const content = await prisma.contentBlock.findMany({
    select: {
      key: true,
      title: true,
      adminId: true,
      metadata: true,
    },
    orderBy: [{ adminId: 'asc' }, { key: 'asc' }],
  })

  console.log('Content blocks in database:')
  for (const block of content) {
    const section = block.metadata?.section || 'unknown'
    console.log(`- adminId=${block.adminId ?? '∅'}  ${block.key}: "${block.title}" (${section})`)
  }

  const whyChooseUs = content.filter((b) => b.key.includes('why-choose-us'))
  const testimonials = content.filter((b) => b.key.includes('testimonial'))
  const orphans = content.filter((b) => b.adminId == null)

  console.log(`\nSummary:`)
  console.log(`- Why Choose Us items: ${whyChooseUs.length}`)
  console.log(`- Testimonials:        ${testimonials.length}`)
  console.log(`- Orphan rows (adminId IS NULL): ${orphans.length}`)
  console.log(`- Total content blocks: ${content.length}`)
}

// ContentBlock has `@@unique([adminId, key])`. Prisma's composite-unique
// `where` shape is `adminId_key: { adminId, key }`. A real adminId is
// required — Postgres treats NULL as distinct in unique indexes, so upsert
// against a NULL admin would silently insert duplicates instead of updating
// the existing row.
async function upsertContent(adminId, item) {
  return prisma.contentBlock.upsert({
    where: { adminId_key: { adminId, key: item.key } },
    update: {
      adminId,
      title: item.title,
      content: item.content,
      type: item.type,
      metadata: item.metadata,
    },
    create: {
      adminId,
      key: item.key,
      title: item.title,
      content: item.content,
      type: item.type,
      metadata: item.metadata,
    },
  })
}

async function restoreContent(args) {
  const admin = await resolveAdminId(args.flags['admin-id'])
  console.log(`Restoring Why Choose Us content and testimonials for tenant adminId=${admin.id} (${admin.email})...\n`)

  const whyChooseUsTitle = {
    key: 'why-choose-us',
    title: 'Why Choose Us',
    content: 'Why Choose Us',
    type: 'text',
    metadata: { section: 'home', published: true },
  }

  const whyChooseUsItems = [
    {
      key: 'why-choose-us-item',
      title: 'First-Time Buyer Guide',
      content:
        'Buying your first home in Edmonton? This guide walks you through every step — from mortgage pre-approval to move-in day. Clear, simple, and tailored for new buyers, so you can avoid surprises and make smart decisions. Start your journey with confidence.',
      type: 'text',
      metadata: { section: 'home', published: true, icon: 'mdi-home-search' },
    },
    {
      key: 'why-choose-us-item-2',
      title: 'Edmonton Market Insights',
      content:
        "Stay informed with up-to-date stats and expert analysis on the Edmonton real estate market. Whether you're buying, selling, or just watching, these insights help you time your move and understand trends. Updated monthly and written in plain language.",
      type: 'text',
      metadata: { section: 'home', published: true, icon: 'mdi-chart-line' },
    },
    {
      key: 'why-choose-us-item-3',
      title: 'Browse Homes by Neighborhood',
      content:
        'Explore homes in top Edmonton neighborhoods like Windermere, Mill Woods, and Downtown. Each area comes with listings, school info, amenities, and lifestyle tips so you can find the right fit. Start searching by location and discover your ideal community.',
      type: 'text',
      metadata: { section: 'home', published: true, icon: 'mdi-map-marker-radius' },
    },
    {
      key: 'why-choose-us-item-4',
      title: 'Book a Free Consultation',
      content:
        "Got questions? Book a free 15-minute call to talk about your home goals. No pressure, no pitch — just helpful advice tailored to your situation. Whether you're planning to buy, sell, or explore, I'm here to guide you step by step.",
      type: 'text',
      metadata: { section: 'home', published: true, icon: 'mdi-phone-in-talk' },
    },
  ]

  const testimonials = [
    {
      key: 'testimonial-1',
      title: 'Sarah Johnson',
      content:
        'Working with this team made buying our first home so much easier. They guided us through every step and helped us find the perfect place in Windermere. Highly recommended!',
      type: 'testimonial',
      metadata: {
        section: 'testimonials',
        published: true,
        position: 'Windermere Resident',
        avatar: '/images/avatars/sarah.jpg',
      },
    },
    {
      key: 'testimonial-2',
      title: 'Michael Chen',
      content:
        'Sold our house in Mill Woods in just 2 weeks! The marketing strategy was excellent and the communication throughout the process was outstanding. Professional service from start to finish.',
      type: 'testimonial',
      metadata: {
        section: 'testimonials',
        published: true,
        position: 'Mill Woods Seller',
        avatar: '/images/avatars/michael.jpg',
      },
    },
    {
      key: 'testimonial-3',
      title: 'Emily Rodriguez',
      content:
        'As a first-time buyer, I was nervous about the process. The team made everything clear and stress-free. They found me a beautiful condo in Oliver that fits my budget perfectly!',
      type: 'testimonial',
      metadata: {
        section: 'testimonials',
        published: true,
        position: 'Oliver Resident',
        avatar: '/images/avatars/emily.jpg',
      },
    },
  ]

  const allContent = [whyChooseUsTitle, ...whyChooseUsItems, ...testimonials]

  for (const item of allContent) {
    try {
      await upsertContent(admin.id, item)
      console.log(`✓ Restored: ${item.key}`)
    } catch (error) {
      console.error(`✗ Error restoring ${item.key}:`, error.message)
    }
  }

  console.log('\nContent restoration completed!')
}

async function seedAbout(args) {
  const admin = await resolveAdminId(args.flags['admin-id'])
  console.log(`Seeding About content for tenant adminId=${admin.id} (${admin.email})...\n`)

  const items = [
    {
      key: 'about-title',
      title: 'About Title',
      content: 'About Us',
      type: 'text',
      metadata: { section: 'about', published: true },
    },
    {
      key: 'about-body',
      title: 'About Body',
      content:
        '<p>We help buyers and sellers across Edmonton with data-driven market insights, neighbourhood expertise, and personalized service. Whether you are purchasing your first home or selling a property, our team will guide you from consultation to closing with transparency and care.</p>',
      type: 'html',
      metadata: { section: 'about', published: true },
    },
  ]

  for (const item of items) {
    await upsertContent(admin.id, item)
    console.log(`✓ Seeded: ${item.key}`)
  }

  console.log('\nSeeded About content.')
}

async function seedHero(args) {
  const admin = await resolveAdminId(args.flags['admin-id'])
  console.log(`Seeding Hero content for tenant adminId=${admin.id} (${admin.email})...\n`)

  const items = [
    {
      key: 'hero-title',
      title: 'Hero Title',
      content: 'Find Your Dream Home',
      type: 'text',
      metadata: { section: 'home', published: true },
    },
    {
      key: 'hero-subtitle',
      title: 'Hero Subtitle',
      content: 'Search properties for sale and to rent in your area',
      type: 'text',
      metadata: { section: 'home', published: true },
    },
  ]

  for (const item of items) {
    await upsertContent(admin.id, item)
    console.log(`✓ Seeded: ${item.key}`)
  }

  console.log('\nSeeded hero title and subtitle.')
}

async function updateAbout(args) {
  const admin = await resolveAdminId(args.flags['admin-id'])
  console.log(`Updating About page for tenant adminId=${admin.id} (${admin.email})...\n`)

  const newAboutContent = `
<div class="v-container py-12">
  <div class="v-row justify-center">
    <div class="v-col cols-12 md-8">
      <div class="v-card elevation-2 pa-6">
        <h2 class="text-h5 font-weight-bold text-primary mb-4">
          About Me
        </h2>

        <div class="v-divider my-4"></div>

        <h3 class="text-subtitle-1 font-weight-medium mb-4">
          Abdul Ojulari – Residential Real Estate Agent | Licensed REALTOR®
        </h3>

        <div class="text-body-1">
          <p>
            Welcome! I'm Abdul Ojulari, a dedicated residential real estate professional committed to helping individuals and families navigate one of life's most important decisions: buying or selling a home.
          </p>

          <p>
            With a passion for real estate and a deep understanding of the local market, I bring a client-first approach to every transaction. Whether you're a first-time buyer, a growing family looking to upsize, or an investor seeking the perfect opportunity, my goal is to provide personalized guidance, clear communication, and reliable support from start to finish.
          </p>

          <p>
            As a licensed REALTOR®, I adhere to a strict code of ethics and maintain the highest standards of professionalism. I believe that every client deserves honesty, integrity, and the peace of mind that comes from working with someone who truly has their best interests at heart.
          </p>

          <div class="v-divider my-6"></div>

          <h3 class="text-h6 font-weight-bold mb-4">
            What I Offer:
          </h3>

          <ul class="mb-4">
            <li class="mb-2">
              <strong>Market Expertise:</strong> In-depth knowledge of local neighborhoods, trends, and property values.
            </li>
            <li class="mb-2">
              <strong>Client-Focused Service:</strong> I listen carefully to your needs and tailor my approach to meet your unique goals.
            </li>
            <li class="mb-2">
              <strong>Strong Negotiation Skills:</strong> I advocate fiercely for my clients to ensure the best possible outcomes.
            </li>
            <li class="mb-2">
              <strong>Reliable Communication:</strong> Expect timely updates and straightforward advice—no surprises.
            </li>
          </ul>

          <p class="mt-6">
            My mission is simple: to make your real estate experience smooth, successful, and even enjoyable. Whether you're buying your dream home or selling a cherished property, I'm here to guide you with professionalism, transparency, and care.
          </p>

          <p class="font-weight-medium mt-6">
            Let's make your real estate goals a reality.
          </p>
        </div>
      </div>
    </div>
  </div>
</div>
  `.trim()

  await upsertContent(admin.id, {
    key: 'about-body',
    title: 'About Abdul Ojulari',
    content: newAboutContent,
    type: 'html',
    metadata: { section: 'about', published: true },
  })
  console.log('✅ Successfully updated about-body content block')

  await upsertContent(admin.id, {
    key: 'about-title',
    title: 'About Title',
    content: 'About Abdul Ojulari',
    type: 'text',
    metadata: { section: 'about', published: true },
  })
  console.log('✅ Successfully updated about title')
  console.log('\n🎉 About page content has been updated!')
}

// ─── CREA API smoke test ───────────────────────────────────────────────────
//
// This used to embed real CREA credentials. They have been removed and read
// from env now. For richer probing (field detection, status sampling, sold
// discovery, CSV export) prefer scripts/test-crea-direct.mjs.

async function testCreaApi() {
  const clientId = process.env.CREA_CLIENT_ID
  const clientSecret = process.env.CREA_CLIENT_SECRET
  const baseUrl = (process.env.CREA_BASE_URL || 'https://ddfapi.realtor.ca').replace(/\/+$/, '')
  const tokenEndpoint =
    process.env.CREA_TOKEN_ENDPOINT || 'https://identity.crea.ca/connect/token'

  if (!clientId || !clientSecret) {
    console.error('❌ Missing env: CREA_CLIENT_ID and/or CREA_CLIENT_SECRET.')
    console.error('   Source your .env (e.g. `set -a && . ./.env.production && set +a`) and retry.')
    process.exit(1)
  }

  console.log('🧪 Testing CREA API directly...')
  console.log(`   Base URL:       ${baseUrl}`)
  console.log(`   Token endpoint: ${tokenEndpoint}`)
  console.log('   (For richer probes use scripts/test-crea-direct.mjs)\n')

  console.log('🔐 Getting CREA authentication token...')
  const tokenResponse = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })
  if (!tokenResponse.ok) {
    const body = await tokenResponse.text().catch(() => '')
    throw new Error(`Failed to get CREA token: ${tokenResponse.status} ${body.slice(0, 200)}`)
  }
  const tokenData = await tokenResponse.json()
  const token = tokenData.access_token
  console.log('✅ Got CREA token')

  console.log('🔍 Fetching 10 sample Alberta properties...')
  const sampleQuery = `$filter=StateOrProvince eq 'Alberta'&$top=10&$orderby=ListingKey desc`
  const sampleResponse = await fetch(`${baseUrl}/odata/v1/Property?${sampleQuery}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  if (!sampleResponse.ok) {
    const body = await sampleResponse.text().catch(() => '')
    throw new Error(`CREA API request failed: ${sampleResponse.status} ${body.slice(0, 200)}`)
  }
  const sampleData = await sampleResponse.json()
  const properties = sampleData.value || []

  console.log(`✅ Successfully retrieved ${properties.length} sample properties`)
  if (properties.length > 0) {
    const sample = properties[0]
    console.log(`📋 Sample property:`)
    console.log(`   Address:     ${sample.UnparsedAddress}`)
    console.log(`   Price:       $${sample.ListPrice?.toLocaleString() || 'N/A'}`)
    console.log(`   Type:        ${sample.PropertyType ?? '—'}`)
    console.log(`   Listing Key: ${sample.ListingKey}`)
    console.log(`   Status:      ${sample.StandardStatus ?? '—'}`)
  }
  console.log('🎉 CREA API smoke test completed successfully!')
}

// ─── Command handler ───────────────────────────────────────────────────────

function showHelp() {
  console.log(`
🛠️  Admin Tools

Available commands:
  query-users          Display all users with detailed information
  check-properties     Show property statistics and sample data
  check-content        Display all content blocks (grouped by tenant)
  fix-zero-prices      Remove CREA properties with invalid zero prices
                       (--admin-id=N or --all-tenants required)
  test-crea-api        OAuth + property fetch smoke test (env-based creds)
  restore-content      Re-seed why-choose-us + testimonials for a tenant
  seed-about           Seed about page content for a tenant
  seed-hero            Seed hero section content for a tenant
  update-about         Replace about page with bundled rich HTML for a tenant
  help                 Show this help message

Common flags:
  --admin-id=N         Tenant scope. Defaults to first super_admin/admin.
  --all-tenants        (fix-zero-prices only) operate without a tenant scope.

Usage:
  node scripts/admin-tools.mjs <command> [flags]

Examples:
  node scripts/admin-tools.mjs query-users
  node scripts/admin-tools.mjs check-properties
  node scripts/admin-tools.mjs restore-content --admin-id=1
  node scripts/admin-tools.mjs fix-zero-prices --admin-id=1
  node scripts/admin-tools.mjs test-crea-api
`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const command = args._[0]

  if (!command || command === 'help' || args.flags.help || args.flags.h) {
    showHelp()
    return
  }

  try {
    console.log(`🚀 Running command: ${command}\n`)

    switch (command) {
      case 'query-users':
        await queryUsers()
        break
      case 'check-properties':
        await checkProperties()
        break
      case 'check-content':
        await checkContent()
        break
      case 'fix-zero-prices':
        await fixZeroPrices(args)
        break
      case 'test-crea-api':
        await testCreaApi()
        break
      case 'restore-content':
        await restoreContent(args)
        break
      case 'seed-about':
        await seedAbout(args)
        break
      case 'seed-hero':
        await seedHero(args)
        break
      case 'update-about':
        await updateAbout(args)
        break
      default:
        console.error(`❌ Unknown command: ${command}`)
        console.log('Run "node scripts/admin-tools.mjs help" to see available commands')
        process.exit(1)
    }

    console.log('\n✅ Command completed successfully!')
  } catch (error) {
    console.error('❌ Command failed:', error.message || error)
    if (error.stack) console.error(error.stack)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
