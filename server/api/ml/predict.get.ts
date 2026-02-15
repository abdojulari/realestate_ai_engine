/**
 * ML Prediction API Endpoint
 * 
 * Returns forecasts for sales volume, prices, and inventory
 * using the trained TensorFlow.js model.
 * 
 * GET /api/ml/predict
 */

import { defineEventHandler, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../utils/auth'
import { requireFeature, FEATURES } from '../../utils/license'
import { aggregateMonthlyMetrics, prepareForPrediction } from '../../ml/dataPrep'
import { loadModel, predict, modelExists } from '../../ml/model'
import type { RawPropertyData } from '../../ml/dataPrep'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// Cache predictions for 1 hour (don't predict on every request)
let predictionCache: {
  timestamp: number
  data: any
} | null = null
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  
  // Check license for forecast feature
  await requireFeature(FEATURES.FORECAST, event)
  
  // Check cache
  if (predictionCache && Date.now() - predictionCache.timestamp < CACHE_TTL) {
    console.log('[ML API] Returning cached prediction')
    return predictionCache.data
  }
  
  console.log('[ML API] Generating new prediction...')
  
  try {
    // Check if model exists
    if (!modelExists()) {
      return {
        success: false,
        error: 'No trained model found. Please train the model first.',
        hasPrediction: false
      }
    }
    
    // Load model
    const loaded = await loadModel()
    if (!loaded) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to load model'
      })
    }
    
    const { model, metadata } = loaded
    
    // Load normalization parameters
    const normPath = path.join(process.cwd(), 'server', 'ml', 'models', 'forecast', 'normalization.json')
    if (!fs.existsSync(normPath)) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Normalization parameters not found. Please retrain the model.'
      })
    }
    
    const normalization = JSON.parse(fs.readFileSync(normPath, 'utf-8'))
    
    // Load recent property data
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
    
    // Aggregate monthly metrics
    const monthlyMetrics = aggregateMonthlyMetrics(rawData)
    
    if (monthlyMetrics.length < 6) {
      return {
        success: false,
        error: 'Insufficient data for prediction. Need at least 6 months of data.',
        hasPrediction: false
      }
    }
    
    // Prepare features for prediction
    const features = prepareForPrediction(monthlyMetrics, normalization)
    
    if (!features) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to prepare prediction features'
      })
    }
    
    // Make prediction
    const prediction = await predict(model, features, normalization)
    
    if (!prediction) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Prediction failed'
      })
    }
    
    // Get current metrics for comparison
    const lastMonth = monthlyMetrics[monthlyMetrics.length - 1]!
    
    // Calculate predicted changes
    const soldChange = lastMonth.soldCount > 0 
      ? Math.round((prediction.soldCount - lastMonth.soldCount) / lastMonth.soldCount * 100)
      : 0
    const priceChange = lastMonth.avgSoldPrice > 0
      ? Math.round((prediction.avgPrice - lastMonth.avgSoldPrice) / lastMonth.avgSoldPrice * 100)
      : 0
    const inventoryChange = lastMonth.activeInventory > 0
      ? Math.round((prediction.inventory - lastMonth.activeInventory) / lastMonth.activeInventory * 100)
      : 0
    
    const result = {
      success: true,
      hasPrediction: true,
      prediction: {
        forecastPeriod: 'Next 3 months',
        soldCount: prediction.soldCount,
        avgPrice: prediction.avgPrice,
        inventory: prediction.inventory,
        confidence: Math.round(prediction.confidence * 100)
      },
      changes: {
        soldChange,
        priceChange,
        inventoryChange
      },
      currentMetrics: {
        month: `${lastMonth.year}-${String(lastMonth.month).padStart(2, '0')}`,
        soldCount: lastMonth.soldCount,
        avgPrice: Math.round(lastMonth.avgSoldPrice),
        inventory: lastMonth.activeInventory
      },
      modelInfo: {
        trainedAt: metadata.trainedAt,
        dataRange: `${monthlyMetrics[0]!.year}-${monthlyMetrics[0]!.month} to ${lastMonth.year}-${lastMonth.month}`
      }
    }
    
    // Cache result
    predictionCache = {
      timestamp: Date.now(),
      data: result
    }
    
    return result
    
  } catch (error: any) {
    console.error('[ML API] Prediction error:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    return {
      success: false,
      error: error.message,
      hasPrediction: false
    }
  }
})
