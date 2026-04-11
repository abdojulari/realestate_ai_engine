/**
 * Analytics API Endpoint
 * 
 * Returns business insights, KPIs, and market trends
 * using non-ML statistical analysis.
 * 
 * GET /api/ml/analytics
 */

import { defineEventHandler, getQuery } from 'h3'
import { requireAdmin } from '../../utils/auth'
import { requireFeature, FEATURES } from '../../utils/license'
import { calculateAnalytics } from '../../ml/analytics'
import type { RawPropertyData } from '../../ml/dataPrep'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


// Cache analytics for 30 minutes
let analyticsCache: {
  timestamp: number
  data: any
} | null = null
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  
  // Check license for ML analytics feature
  await requireFeature(FEATURES.ML_ANALYTICS, event)
  
  const query = getQuery(event)
  const forceRefresh = query.refresh === 'true'
  
  // Check cache (unless force refresh)
  if (!forceRefresh && analyticsCache && Date.now() - analyticsCache.timestamp < CACHE_TTL) {
    console.log('[Analytics API] Returning cached analytics')
    return analyticsCache.data
  }
  
  console.log('[Analytics API] Calculating fresh analytics...')
  
  try {
    // Load all property data
    const properties = await prisma.property.findMany({
      select: {
        id: true,
        price: true,
        status: true,
        type: true,
        beds: true,
        baths: true,
        sqft: true,
        city: true,
        province: true,
        createdAt: true,
        updatedAt: true,
        originalEntryTimestamp: true
      },
      orderBy: { createdAt: 'asc' }
    })
    
    console.log(`[Analytics API] Analyzing ${properties.length} properties`)
    
    if (properties.length === 0) {
      return {
        success: false,
        error: 'No property data available',
        hasAnalytics: false
      }
    }
    
    // Transform to RawPropertyData
    // Calculate daysOnMarket from originalEntryTimestamp (days since original listing)
    const now = new Date()
    const rawData: RawPropertyData[] = properties.map(p => {
      const listingDate = p.originalEntryTimestamp || p.createdAt
      const daysOnMarket = Math.floor((now.getTime() - listingDate.getTime()) / (1000 * 60 * 60 * 24))
      return {
        id: p.id,
        price: p.price || 0,
        status: p.status || 'unknown',
        type: p.type || undefined,
        beds: p.beds || undefined,
        baths: p.baths || undefined,
        sqft: p.sqft || undefined,
        city: p.city || undefined,
        province: p.province || undefined,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        daysOnMarket: daysOnMarket > 0 ? daysOnMarket : undefined
      }
    })
    
    // Calculate analytics
    const analytics = calculateAnalytics(rawData)
    
    const result = {
      success: true,
      hasAnalytics: true,
      generatedAt: new Date().toISOString(),
      totalProperties: properties.length,
      ...analytics
    }
    
    // Cache result
    analyticsCache = {
      timestamp: Date.now(),
      data: result
    }
    
    return result
    
  } catch (error: any) {
    console.error('[Analytics API] Error:', error)
    return {
      success: false,
      error: error.message,
      hasAnalytics: false
    }
  }
})
