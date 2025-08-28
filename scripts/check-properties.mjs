import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const properties = await prisma.property.findMany({
    select: {
      id: true,
      title: true,
      city: true,
      latitude: true,
      longitude: true,
      price: true,
      type: true
    },
    orderBy: { id: 'asc' }
  })

  console.log(`Found ${properties.length} properties:`)
  console.log('ID | Title | City | Lat | Lng | Price | Type')
  console.log('---|-------|------|-----|-----|-------|-----')
  
  properties.forEach(p => {
    console.log(`${p.id} | ${p.title.substring(0, 20)}... | ${p.city} | ${p.latitude} | ${p.longitude} | $${p.price.toLocaleString()} | ${p.type}`)
  })

  const users = await prisma.user.count()
  const contentBlocks = await prisma.contentBlock.count()
  
  console.log(`\nSummary:`)
  console.log(`- Properties: ${properties.length}`)
  console.log(`- Users: ${users}`)
  console.log(`- Content Blocks: ${contentBlocks}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
