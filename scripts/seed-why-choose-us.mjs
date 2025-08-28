import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const items = [
    {
      key: 'why-choose-us',
      title: 'Why Choose Us',
      content: '',
      type: 'text',
      metadata: { section: 'home', published: true }
    },
    {
      key: 'why-choose-us-item.1',
      title: 'First-Time Buyer Guide',
      content:
        'Buying your first home in Edmonton? This guide walks you through every step — from mortgage pre-approval to move-in day. Clear, simple, and tailored for new buyers, so you can avoid surprises and make smart decisions. Start your journey with confidence.',
      type: 'text',
      metadata: { section: 'home', published: true, icon: 'mdi-home-search' }
    },
    {
      key: 'why-choose-us-item.2',
      title: 'Edmonton Market Insights',
      content:
        'Stay informed with up-to-date stats and expert analysis on the Edmonton real estate market. Whether you’re buying, selling, or just watching, these insights help you time your move and understand trends. Updated monthly and written in plain language.',
      type: 'text',
      metadata: { section: 'home', published: true, icon: 'mdi-chart-line' }
    },
    {
      key: 'why-choose-us-item.3',
      title: 'Browse Homes by Neighborhood',
      content:
        'Explore homes in top Edmonton neighborhoods like Windermere, Mill Woods, and Downtown. Each area comes with listings, school info, amenities, and lifestyle tips so you can find the right fit. Start searching by location and discover your ideal community.',
      type: 'text',
      metadata: { section: 'home', published: true, icon: 'mdi-map-marker-radius' }
    },
    {
      key: 'why-choose-us-item.4',
      title: 'Book a Free Consultation',
      content:
        "Got questions? Book a free 15-minute call to talk about your home goals. No pressure, no pitch — just helpful advice tailored to your situation. Whether you're planning to buy, sell, or explore, I’m here to guide you step by step.",
      type: 'text',
      metadata: { section: 'home', published: true, icon: 'mdi-phone-in-talk' }
    }
  ]

  for (const it of items) {
    await prisma.contentBlock.upsert({
      where: { key: it.key },
      update: {
        title: it.title,
        content: it.content,
        type: it.type,
        metadata: it.metadata
      },
      create: it
    })
  }

  console.log('Seeded Why Choose Us content.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


