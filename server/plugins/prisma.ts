import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineNitroPlugin(async (nitroApp) => {
  nitroApp.hooks.hook('request', async () => {
    // Connect to database when request starts
    await prisma.$connect()
  })

  nitroApp.hooks.hook('beforeResponse', async () => {
    // Disconnect from database before sending response
    await prisma.$disconnect()
  })

  // Make prisma available in event context
  nitroApp.hooks.hook('request', (event) => {
    event.context.prisma = prisma
  })
})
