import { defineEventHandler } from 'h3'
import { PrismaClient } from '@prisma/client'
import { populateNeighborhoods } from './populate-util'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

/**
 * POST /api/admin/neighborhoods/populate
 * Extracts unique SubdivisionName values from property features JSON,
 * creates Neighborhood records, and links properties via PropertyNeighborhood.
 */
export default defineEventHandler(async () => {
  const startTime = Date.now()

  const stats = await populateNeighborhoods(prisma)

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`✅ Neighborhood population complete in ${elapsed}s:`, stats)

  return {
    success: true,
    elapsed: `${elapsed}s`,
    stats
  }
})
