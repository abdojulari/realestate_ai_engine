import { defineEventHandler } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  try {
    // Get the latest sync result from settings
    const syncResult = await prisma.setting.findFirst({
      where: { key: 'last_sync_result' }
    })

    const syncStatus = await prisma.setting.findFirst({
      where: { key: 'sync_status' }
    })

    const syncProgress = await prisma.setting.findFirst({
      where: { key: 'sync_progress' }
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
