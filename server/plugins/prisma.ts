import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
/** Always attach in production — otherwise each route module can spawn its own client and exhaust Postgres connections. */
globalForPrisma.prisma = prisma

export default defineNitroPlugin(async (nitroApp) => {
  // Make prisma available in event context
  nitroApp.hooks.hook('request', (event) => {
    event.context.prisma = prisma
  })
})
