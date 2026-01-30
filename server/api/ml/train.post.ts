/**
 * ML Training API Endpoint
 * 
 * Triggers training of the TensorFlow.js forecasting model
 * using historical property data from the database.
 * 
 * POST /api/ml/train
 */

import { defineEventHandler, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../utils/auth'
import { aggregateMonthlyMetrics, prepareTrainingData } from '../../ml/dataPrep'
import { trainModel, saveModel, DEFAULT_CONFIG } from '../../ml/model'
import type { RawPropertyData } from '../../ml/dataPrep'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  // Only admins can train the model
  await requireAdmin(event)
  
  console.log('[ML API] Starting model training...')
  
  try {
    // Step 1: Load property data from database
    console.log('[ML API] Loading property data...')
    
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
    
    console.log(`[ML API] Loaded ${properties.length} properties`)
    
    if (properties.length < 100) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Insufficient data for training. Need at least 100 properties.'
      })
    }
    
    // Transform to RawPropertyData format
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
    
    // Step 2: Aggregate into monthly metrics
    console.log('[ML API] Aggregating monthly metrics...')
    const monthlyMetrics = aggregateMonthlyMetrics(rawData)
    console.log(`[ML API] Generated ${monthlyMetrics.length} months of data`)
    
    // Minimum 1 month of data required (allow 30 days, 1-3-6 months, 1 year+)
    if (monthlyMetrics.length < 1) {
      throw createError({
        statusCode: 400,
        statusMessage: `Insufficient time-series data. Need at least 1 month of data.`
      })
    }
    
    // Step 3: Prepare training data
    // Dynamically adjust window sizes based on available data
    // lookback = how many months to look back for features
    // forecast = how many months ahead to predict
    let lookbackMonths = 6
    let forecastMonths = 3
    
    // Adjust window sizes for smaller datasets
    if (monthlyMetrics.length < 12) {
      // For 6-11 months: use 3 month lookback, 1 month forecast
      lookbackMonths = Math.min(3, Math.floor(monthlyMetrics.length / 2))
      forecastMonths = 1
    }
    if (monthlyMetrics.length < 6) {
      // For 3-5 months: use 2 month lookback, 1 month forecast
      lookbackMonths = Math.max(1, Math.floor(monthlyMetrics.length / 2))
      forecastMonths = 1
    }
    if (monthlyMetrics.length < 3) {
      // For 1-2 months: minimal model (1 month lookback, 1 month forecast)
      lookbackMonths = 1
      forecastMonths = 1
    }
    
    console.log(`[ML API] Using lookback=${lookbackMonths} months, forecast=${forecastMonths} months for ${monthlyMetrics.length} months of data`)
    console.log('[ML API] Preparing training features...')
    const preparedData = prepareTrainingData(monthlyMetrics, lookbackMonths, forecastMonths)
    
    if (preparedData.features.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Could not prepare training data. Check data quality.'
      })
    }
    
    console.log(`[ML API] Prepared ${preparedData.features.length} training samples`)
    console.log(`[ML API] Feature count: ${preparedData.features[0].length}`)
    console.log(`[ML API] Label count: ${preparedData.labels[0].length}`)
    
    // Step 4: Train model
    console.log('[ML API] Starting TensorFlow.js training...')
    
    const config = {
      ...DEFAULT_CONFIG,
      inputSize: preparedData.features[0].length,
      outputSize: preparedData.labels[0].length,
      epochs: 150 // More epochs for production
    }
    
    const result = await trainModel(
      preparedData.features,
      preparedData.labels,
      config,
      (epoch, logs) => {
        // Progress callback - could be used for WebSocket updates
        if (epoch % 25 === 0) {
          console.log(`[ML API] Epoch ${epoch}: loss=${logs?.loss?.toFixed(4)}`)
        }
      }
    )
    
    // Step 5: Save normalization parameters with model
    const { saveModel: _ } = await import('../../ml/model')
    // Note: normalization is saved as part of metadata in model.ts
    
    // Store normalization in a separate file for prediction
    const fs = await import('fs')
    const path = await import('path')
    const normPath = path.join(process.cwd(), 'server', 'ml', 'models', 'forecast', 'normalization.json')
    fs.writeFileSync(normPath, JSON.stringify(preparedData.normalization, null, 2))
    
    console.log('[ML API] Training complete!')
    
    return {
      success: true,
      message: 'Model trained successfully',
      stats: {
        samplesUsed: preparedData.features.length,
        monthsOfData: monthlyMetrics.length,
        propertiesAnalyzed: properties.length,
        epochs: result.epochs,
        finalLoss: result.finalLoss,
        finalMae: result.finalMae,
        trainingTime: `${(result.trainingTime / 1000).toFixed(1)}s`
      },
      featureNames: preparedData.featureNames,
      labelNames: preparedData.labelNames
    }
    
  } catch (error: any) {
    console.error('[ML API] Training error:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: `Training failed: ${error.message}`
    })
  }
})
