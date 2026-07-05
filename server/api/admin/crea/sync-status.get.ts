import { defineEventHandler } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  try {
    // Setting has @@unique([adminId, key]) so these shared keys can have
    // multiple rows (one per admin). Without an orderBy Prisma returns
    // whichever row Postgres picks (typically the oldest by id), which
    // produced the "sync succeeded but Last Sync card kept showing an old
    // date" bug. Take the most recently updated row for each key.
    const syncResult = await prisma.setting.findFirst({
      where: { key: 'last_sync_result' },
      orderBy: { updatedAt: 'desc' },
    })

    const syncStatus = await prisma.setting.findFirst({
      where: { key: 'sync_status' },
      orderBy: { updatedAt: 'desc' },
    })

    const syncProgress = await prisma.setting.findFirst({
      where: { key: 'sync_progress' },
      orderBy: { updatedAt: 'desc' },
    })

    return {
      lastSyncResult: syncResult?.value ? JSON.parse(syncResult.value) : null,
      syncStatus: syncStatus?.value || 'ready',
      syncProgress: syncProgress?.value ? JSON.parse(syncProgress.value) : { progress: 0, text: '' }
    }
  } catch (error: any) {
    console.error('❌ Failed to get sync status:', error)
    return {
      lastSyncResult: null,
      syncStatus: 'ready',
      syncProgress: { progress: 0, text: '' }
    }
  }
})
