/**
 * TensorFlow.js Model Definition for Real Estate Forecasting
 * 
 * A dense neural network designed for time-series regression.
 * Predicts sales volume, prices, and inventory levels.
 */

import * as tf from '@tensorflow/tfjs-node'
import * as path from 'path'
import * as fs from 'fs'

// ============================================
// MODEL CONFIGURATION
// ============================================

export interface ModelConfig {
  inputSize: number      // Number of input features
  outputSize: number     // Number of outputs to predict
  hiddenLayers: number[] // Units in each hidden layer
  learningRate: number
  epochs: number
  batchSize: number
  validationSplit: number
}

export const DEFAULT_CONFIG: ModelConfig = {
  inputSize: 23,        // Based on prepareTrainingData feature count
  outputSize: 3,        // [sold_count, avg_price, inventory]
  hiddenLayers: [64, 32, 16],
  learningRate: 0.001,
  epochs: 100,
  batchSize: 32,
  validationSplit: 0.2
}

// Model save path
const MODEL_DIR = path.join(process.cwd(), 'server', 'ml', 'models', 'forecast')
const MODEL_PATH = `file://${MODEL_DIR}`
const METADATA_PATH = path.join(MODEL_DIR, 'metadata.json')

// ============================================
// MODEL CREATION
// ============================================

/**
 * Create a dense neural network for regression
 * 
 * Architecture:
 * - Input layer with dropout for regularization
 * - Multiple hidden layers with ReLU activation
 * - Output layer with linear activation (for regression)
 */
export function createModel(config: ModelConfig = DEFAULT_CONFIG): tf.Sequential {
  const model = tf.sequential({
    name: 'real_estate_forecast'
  })
  
  // First hidden layer (includes input shape)
  model.add(tf.layers.dense({
    units: config.hiddenLayers[0],
    activation: 'relu',
    inputShape: [config.inputSize],
    kernelInitializer: 'heNormal',
    name: 'dense_input'
  }))
  
  // Dropout for regularization (prevents overfitting)
  model.add(tf.layers.dropout({ rate: 0.2, name: 'dropout_1' }))
  
  // Additional hidden layers
  for (let i = 1; i < config.hiddenLayers.length; i++) {
    model.add(tf.layers.dense({
      units: config.hiddenLayers[i],
      activation: 'relu',
      kernelInitializer: 'heNormal',
      name: `dense_hidden_${i}`
    }))
    
    // Dropout between hidden layers
    if (i < config.hiddenLayers.length - 1) {
      model.add(tf.layers.dropout({ rate: 0.1, name: `dropout_${i + 1}` }))
    }
  }
  
  // Output layer (linear activation for regression)
  model.add(tf.layers.dense({
    units: config.outputSize,
    activation: 'linear',
    name: 'output'
  }))
  
  // Compile with Adam optimizer and MSE loss
  model.compile({
    optimizer: tf.train.adam(config.learningRate),
    loss: 'meanSquaredError',
    metrics: ['mse', 'mae']
  })
  
  return model
}

// ============================================
// MODEL TRAINING
// ============================================

export interface TrainingResult {
  success: boolean
  epochs: number
  finalLoss: number
  finalMae: number
  history: {
    loss: number[]
    val_loss: number[]
    mae: number[]
    val_mae: number[]
  }
  trainingTime: number
  modelPath: string
}

/**
 * Train the model with prepared data
 */
export async function trainModel(
  features: number[][],
  labels: number[][],
  config: ModelConfig = DEFAULT_CONFIG,
  onProgress?: (epoch: number, logs: any) => void
): Promise<TrainingResult> {
  const startTime = Date.now()
  
  // Validate input
  if (features.length === 0 || labels.length === 0) {
    throw new Error('No training data provided')
  }
  
  if (features.length !== labels.length) {
    throw new Error('Features and labels must have same number of samples')
  }
  
  console.log(`[ML] Training with ${features.length} samples`)
  console.log(`[ML] Feature size: ${features[0].length}, Output size: ${labels[0].length}`)
  
  // Update config based on actual data
  const actualConfig = {
    ...config,
    inputSize: features[0].length,
    outputSize: labels[0].length
  }
  
  // Create model
  const model = createModel(actualConfig)
  
  // Convert to tensors
  const xs = tf.tensor2d(features)
  const ys = tf.tensor2d(labels)
  
  // Training callbacks
  const callbacks: tf.CustomCallbackArgs = {
    onEpochEnd: (epoch, logs) => {
      if (onProgress) {
        onProgress(epoch, logs)
      }
      if (epoch % 10 === 0) {
        console.log(`[ML] Epoch ${epoch}: loss=${logs?.loss?.toFixed(4)}, mae=${logs?.mae?.toFixed(4)}`)
      }
    }
  }
  
  // Train
  const history = await model.fit(xs, ys, {
    epochs: actualConfig.epochs,
    batchSize: actualConfig.batchSize,
    validationSplit: actualConfig.validationSplit,
    shuffle: true,
    callbacks
  })
  
  // Extract history
  const trainingHistory = {
    loss: history.history.loss as number[],
    val_loss: history.history.val_loss as number[],
    mae: history.history.mae as number[],
    val_mae: history.history.val_mae as number[]
  }
  
  // Save model
  await saveModel(model, actualConfig)
  
  // Cleanup tensors
  xs.dispose()
  ys.dispose()
  
  const trainingTime = Date.now() - startTime
  
  return {
    success: true,
    epochs: actualConfig.epochs,
    finalLoss: trainingHistory.loss[trainingHistory.loss.length - 1],
    finalMae: trainingHistory.mae[trainingHistory.mae.length - 1],
    history: trainingHistory,
    trainingTime,
    modelPath: MODEL_PATH
  }
}

// ============================================
// MODEL PERSISTENCE
// ============================================

export interface ModelMetadata {
  config: ModelConfig
  trainedAt: string
  samplesUsed: number
  normalization?: {
    featureMeans: number[]
    featureStds: number[]
    labelMeans: number[]
    labelStds: number[]
  }
}

/**
 * Save model and metadata
 */
export async function saveModel(
  model: tf.Sequential | tf.LayersModel,
  config: ModelConfig,
  normalization?: ModelMetadata['normalization']
): Promise<void> {
  // Ensure directory exists
  if (!fs.existsSync(MODEL_DIR)) {
    fs.mkdirSync(MODEL_DIR, { recursive: true })
  }
  
  // Save model
  await model.save(MODEL_PATH)
  console.log(`[ML] Model saved to ${MODEL_PATH}`)
  
  // Save metadata
  const metadata: ModelMetadata = {
    config,
    trainedAt: new Date().toISOString(),
    samplesUsed: 0, // Will be updated by caller
    normalization
  }
  
  fs.writeFileSync(METADATA_PATH, JSON.stringify(metadata, null, 2))
  console.log(`[ML] Metadata saved to ${METADATA_PATH}`)
}

/**
 * Load saved model
 */
export async function loadModel(): Promise<{
  model: tf.LayersModel
  metadata: ModelMetadata
} | null> {
  try {
    // Check if model exists
    const modelJsonPath = path.join(MODEL_DIR, 'model.json')
    if (!fs.existsSync(modelJsonPath)) {
      console.log('[ML] No saved model found')
      return null
    }
    
    // Load model
    const model = await tf.loadLayersModel(`${MODEL_PATH}/model.json`)
    console.log('[ML] Model loaded successfully')
    
    // Load metadata
    let metadata: ModelMetadata = {
      config: DEFAULT_CONFIG,
      trainedAt: '',
      samplesUsed: 0
    }
    
    if (fs.existsSync(METADATA_PATH)) {
      metadata = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf-8'))
    }
    
    return { model, metadata }
  } catch (error) {
    console.error('[ML] Error loading model:', error)
    return null
  }
}

/**
 * Check if a trained model exists
 */
export function modelExists(): boolean {
  const modelJsonPath = path.join(MODEL_DIR, 'model.json')
  return fs.existsSync(modelJsonPath)
}

// ============================================
// PREDICTION
// ============================================

export interface PredictionResult {
  soldCount: number
  avgPrice: number
  inventory: number
  confidence: number
}

/**
 * Make predictions using the trained model
 */
export async function predict(
  model: tf.LayersModel,
  features: number[],
  normalization: ModelMetadata['normalization']
): Promise<PredictionResult | null> {
  if (!normalization) {
    console.error('[ML] Normalization parameters required for prediction')
    return null
  }
  
  try {
    // Create input tensor
    const input = tf.tensor2d([features])
    
    // Predict
    const prediction = model.predict(input) as tf.Tensor
    const normalizedOutput = await prediction.data()
    
    // Denormalize output
    const output = Array.from(normalizedOutput).map((val, i) =>
      val * normalization.labelStds[i] + normalization.labelMeans[i]
    )
    
    // Calculate confidence (inverse of prediction variance, simplified)
    // In production, you'd use ensemble methods or dropout at inference
    const confidence = 0.75 // Placeholder - implement properly with multiple samples
    
    // Cleanup
    input.dispose()
    prediction.dispose()
    
    return {
      soldCount: Math.max(0, Math.round(output[0])),
      avgPrice: Math.max(0, Math.round(output[1])),
      inventory: Math.max(0, Math.round(output[2])),
      confidence
    }
  } catch (error) {
    console.error('[ML] Prediction error:', error)
    return null
  }
}
