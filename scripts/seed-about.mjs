import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const items = [
    {
      key: 'about-title',
      title: 'About Title',
      content: 'About Us',
      type: 'text',
      metadata: { section: 'about', published: true }
    },
    {
      key: 'about-body',
      title: 'About Body',
      content:
        '<p>We help buyers and sellers across Edmonton with data-driven market insights, neighbourhood expertise, and personalized service. Whether you are purchasing your first home or selling a property, our team will guide you from consultation to closing with transparency and care.</p>',
      type: 'html',
      metadata: { section: 'about', published: true }
    }
  ]

  for (const it of items) {
    await prisma.contentBlock.upsert({
      where: { key: it.key },
      update: { title: it.title, content: it.content, type: it.type, metadata: it.metadata },
      create: it
    })
  }

  console.log('Seeded About content.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })


