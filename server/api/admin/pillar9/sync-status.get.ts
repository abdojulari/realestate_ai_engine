import { defineEventHandler } from 'h3'
import { pillar9Service } from '../../../utils/pillar9.service'
import { PrismaClient } from '@prisma/client'
import { getPillar9SyncProgress } from './sync.post'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()

    pillar9Service.initConfig({
      clientId: config.pillar9ClientId,
      clientSecret: config.pillar9ClientSecret,
      apiHost: config.pillar9ApiHost
    })

    const configStatus = pillar9Service.getConfigStatus()

    const [activeCount, soldCount, pendingCount, lastSyncSetting] = await Promise.all([
      prisma.property.count({ where: { source: 'pillar9', status: 'for_sale' } }),
      prisma.property.count({ where: { source: 'pillar9', status: 'sold' } }),
      prisma.property.count({ where: { source: 'pillar9', status: 'pending' } }),
      // Setting has @@unique([adminId, key]), so `pillar9_last_sync` can have
      // multiple rows (one per super_admin plus optionally an adminId=null
      // platform row). Sync writes to just one; if we `findFirst` without an
      // orderBy Prisma returns whichever row Postgres decides (typically
      // lowest id → oldest), so the UI happily kept showing June 25 while a
      // freshly-updated July 4 row sat next to it in the same table. Order by
      // the row's own `updatedAt` so we always surface the newest stamp
      // regardless of which admin the sync run got attributed to.
      prisma.setting.findFirst({
        where: { key: 'pillar9_last_sync' },
        orderBy: { updatedAt: 'desc' },
      })
    ])

    let apiCounts = null
    if (configStatus.configured) {
      try {
        const [apiActiveCount, apiSoldCount, apiPendingCount] = await Promise.all([
          pillar9Service.getPropertiesCount({ status: 'A', province: 'AB' }),
          pillar9Service.getPropertiesCount({ status: 'S', province: 'AB' }),
          pillar9Service.getPropertiesCount({ status: 'P', province: 'AB' })
        ])
        apiCounts = {
          active: apiActiveCount,
          sold: apiSoldCount,
          pending: apiPendingCount,
          total: apiActiveCount + apiSoldCount + apiPendingCount
        }
      } catch (error) {
        console.warn('Could not fetch API counts:', error)
      }
    }

    const progress = getPillar9SyncProgress()

    return {
      configured: configStatus.configured,
      message: configStatus.message,
      localCounts: {
        active: activeCount,
        sold: soldCount,
        pending: pendingCount,
        total: activeCount + soldCount + pendingCount
      },
      apiCounts,
      lastSync: lastSyncSetting?.value || null,
      syncProgress: progress,
    }
  } catch (error: any) {
    console.error('Failed to get Pillar9 status:', error)
    return {
      configured: false,
      message: `Error: ${error.message}`,
      localCounts: { active: 0, sold: 0, pending: 0, total: 0 },
      apiCounts: null,
      lastSync: null,
      syncProgress: null,
    }
  }
})
