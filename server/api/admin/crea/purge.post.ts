import { defineEventHandler, getHeader, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma

/**
 * Allow request if a sync secret is configured and supplied (cron / scripts),
 * otherwise require an authenticated admin. Without this guard the route
 * would be reachable by anyone on the internet — the middleware whitelist
 * intentionally skips JWT auth here so cron jobs can call it.
 */
async function requireAdminOrSyncSecret(event: any) {
  const secret = process.env.CREA_SYNC_SECRET || process.env.CRON_SECRET || ''
  if (secret.length > 0) {
    const keyHeader = getHeader(event, 'x-crea-sync-key')
    const authHeader = getHeader(event, 'authorization')
    const provided = keyHeader ?? (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null)
    if (provided && provided === secret) return
  }
  await requireAdmin(event)
}

// Purge all CREA properties from database
// This allows a fresh sync without stale data
export default defineEventHandler(async (event) => {
  await requireAdminOrSyncSecret(event)

  try {
    console.log('Purging all CREA properties from database...')
    
    // Delete all properties with source = 'crea'
    const result = await prisma.property.deleteMany({
      where: {
        source: 'crea'
      }
    })
    
    console.log(`Purged ${result.count} CREA properties`)
    
    return {
      success: true,
      deleted: result.count,
      message: `Successfully purged ${result.count} CREA properties from database`
    }
  } catch (error: any) {
    console.error('Failed to purge CREA properties:', error)
    return {
      success: false,
      deleted: 0,
      error: error.message
    }
  }
})
