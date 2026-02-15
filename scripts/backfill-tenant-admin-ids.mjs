/**
 * Backfill adminId on all tenant-scoped models.
 * Sets existing records (where adminId is NULL) to the first super_admin / admin.
 *
 * Run: node scripts/backfill-tenant-admin-ids.mjs
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Find the first super_admin or admin
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

  // Create TenantSettings for this admin if not exists
  const existing = await prisma.tenantSettings.findUnique({ where: { adminId: admin.id } })
  if (!existing) {
    await prisma.tenantSettings.create({
      data: {
        adminId: admin.id,
        businessName: 'Alberta One Real Estate',
        tagline: 'ALBERTA ONE REAL ESTATE',
        phone: '+1 (647) 563 7235',
        email: 'abdul.ojulari@exprealty.com',
        brokerageName: 'eXp Realty',
        brokerageLogoUrl: '/images/avatars/exp.png',
        copyrightName: 'HomesByAbdulOjulari',
        developerName: 'Abdul Ojulari',
        developerUrl: 'https://www.linkedin.com/in/abdulojulari/',
        footerDisclaimer: 'For listings in Canada, the trademarks REALTOR®, REALTORS®, and the REALTOR® logo are controlled by The Canadian Real Estate Association (CREA) and identify real estate professionals who are members of CREA. The trademarks MLS®, Multiple Listing Service® and the associated logos are owned by CREA and identify the quality of services provided by real estate professionals who are members of CREA. Used under license.',
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
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
