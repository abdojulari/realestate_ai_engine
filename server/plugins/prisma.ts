import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV !== 'production' ? ['warn', 'error'] : ['error'],
})
globalForPrisma.prisma = prisma

export default defineNitroPlugin(async (nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    event.context.prisma = prisma
  })

  nitroApp.hooks.hook('close', async () => {
    await prisma.$disconnect()
  })
})
