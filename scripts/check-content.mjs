import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkContent() {
  const content = await prisma.contentBlock.findMany({
    select: {
      key: true,
      title: true,
      metadata: true
    },
    orderBy: { key: 'asc' }
  })

  console.log('Content blocks in database:')
  content.forEach(block => {
    const section = block.metadata?.section || 'unknown'
    console.log(`- ${block.key}: "${block.title}" (${section})`)
  })

  const whyChooseUs = content.filter(b => b.key.includes('why-choose-us'))
  const testimonials = content.filter(b => b.key.includes('testimonial'))
  
  console.log(`\nSummary:`)
  console.log(`- Why Choose Us items: ${whyChooseUs.length}`)
  console.log(`- Testimonials: ${testimonials.length}`)
  console.log(`- Total content blocks: ${content.length}`)

  await prisma.$disconnect()
}

checkContent().catch(console.error)
