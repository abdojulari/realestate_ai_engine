import { defineEventHandler } from 'h3'
import { PrismaClient } from '@prisma/client'
import { pillar9Service } from '../../../utils/pillar9.service'

const prisma = new PrismaClient()

// GET is public - used by admin page and schedulers
export default defineEventHandler(async (event) => {
  try {
    // Initialize service with runtime config
    const config = useRuntimeConfig()
    
    // Debug logging
    console.log('🔧 Pillar9 Config Check:')
    console.log('  - clientId:', config.pillar9ClientId ? `${config.pillar9ClientId.substring(0, 10)}...` : 'NOT SET')
    console.log('  - clientSecret:', config.pillar9ClientSecret ? 'SET (hidden)' : 'NOT SET')
    
    pillar9Service.initConfig({
      clientId: config.pillar9ClientId,
      clientSecret: config.pillar9ClientSecret,
      tokenHost: config.pillar9TokenHost,
      apiHost: config.pillar9ApiHost
    })

    // Get configuration status
    const configStatus = pillar9Service.getConfigStatus()

    // Get property counts from database
    const [activeCount, soldCount, pendingCount, lastSyncSetting] = await Promise.all([
      prisma.property.count({
        where: { source: 'pillar9', status: 'for_sale' }
      }),
      prisma.property.count({
        where: { source: 'pillar9', status: 'sold' }
      }),
      prisma.property.count({
        where: { source: 'pillar9', status: 'pending' }
      }),
      prisma.setting.findUnique({
        where: { key: 'pillar9_last_sync' }
      })
    ])

    // Get API counts if configured
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
      lastSync: lastSyncSetting?.value || null
    }
  } catch (error: any) {
    console.error('Failed to get Pillar9 status:', error)
    return {
      configured: false,
      message: `Error: ${error.message}`,
      localCounts: { active: 0, sold: 0, pending: 0, total: 0 },
      apiCounts: null,
      lastSync: null
    }
  }
})
