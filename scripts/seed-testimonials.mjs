import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const items = [
    {
      key: 'testimonial.1',
      title: 'Testimonial',
      content: 'We had an amazing buying experience. The team was responsive and made the process effortless.',
      type: 'testimonial',
      metadata: { section: 'testimonials', published: true, author: 'John Smith', position: 'Edmonton, AB', avatar: '' }
    },
    {
      key: 'testimonial.2',
      title: 'Testimonial',
      content: 'Sold our home above asking within a week. Professional marketing and clear communication throughout.',
      type: 'testimonial',
      metadata: { section: 'testimonials', published: true, author: 'Emily Chen', position: 'Seller', avatar: '' }
    },
    {
      key: 'testimonial.3',
      title: 'Testimonial',
      content: 'Great neighbourhood insights helped us choose the right area for our family.',
      type: 'testimonial',
      metadata: { section: 'testimonials', published: true, author: 'Ravi Patel', position: 'Buyer', avatar: '' }
    }
  ]

  for (const it of items) {
    await prisma.contentBlock.upsert({
      where: { key: it.key },
      update: { title: it.title, content: it.content, type: it.type, metadata: it.metadata },
      create: it
    })
  }

  console.log('Seeded Testimonials content.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })


