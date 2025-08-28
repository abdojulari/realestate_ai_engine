import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const items = [
    {
      key: 'hero-title',
      title: 'Hero Title',
      content: 'Find Your Dream Home',
      type: 'text',
      metadata: { section: 'home', published: true }
    },
    {
      key: 'hero-subtitle',
      title: 'Hero Subtitle',
      content: 'Search properties for sale and to rent in your area',
      type: 'text',
      metadata: { section: 'home', published: true }
    }
  ]

  for (const it of items) {
    await prisma.contentBlock.upsert({
      where: { key: it.key },
      update: { title: it.title, content: it.content, type: it.type, metadata: it.metadata },
      create: it
    })
  }

  console.log('Seeded hero title and subtitle.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })


