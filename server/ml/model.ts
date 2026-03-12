/**
 * TensorFlow.js Model Definition for Real Estate Forecasting
 * 
 * A dense neural network designed for time-series regression.
 * Predicts sales volume, prices, and inventory levels.
 * 
 * Uses @tensorflow/tfjs-node when available (native perf),
 * falls back to @tensorflow/tfjs (pure JS) in environments
 * where native addons are unavailable (e.g. Alpine Docker).
 */

import * as path from 'path'
import * as fs from 'fs'

let _tf: typeof import('@tensorflow/tfjs') | null = null
let _usingNode = false

async function getTf(): Promise<typeof import('@tensorflow/tfjs')> {
  if (_tf) return _tf
  try {
    _tf = await import('@tensorflow/tfjs-node') as any
    _usingNode = true
    console.log('[ML] Using @tensorflow/tfjs-node (native)')
  } catch {
    _tf = await import('@tensorflow/tfjs')
    _usingNode = false
    console.log('[ML] Using @tensorflow/tfjs (pure JS fallback)')
  }
  return _tf!
}

// ============================================
// NODE.JS FILESYSTEM IO HANDLER
// Provides file:// save/load when tfjs-node is unavailable
// ============================================

function nodeFileIOHandler(dirPath: string) {
  return {
    async save(modelArtifacts: any) {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true })
      }

      const weightsFileName = 'weights.bin'
      const weightsPath = path.join(dirPath, weightsFileName)

      if (modelArtifacts.weightData) {
        const buf = Buffer.from(
          modelArtifacts.weightData instanceof ArrayBuffer
            ? modelArtifacts.weightData
            : modelArtifacts.weightData.buffer
              ? modelArtifacts.weightData.buffer.slice(
                  modelArtifacts.weightData.byteOffset,
                  modelArtifacts.weightData.byteOffset + modelArtifacts.weightData.byteLength
                )
              : modelArtifacts.weightData
        )
        fs.writeFileSync(weightsPath, buf)
      }

      const modelJson: any = {
        modelTopology: modelArtifacts.modelTopology,
        format: modelArtifacts.format,
        generatedBy: modelArtifacts.generatedBy,
        convertedBy: modelArtifacts.convertedBy,
        weightsManifest: [{
          paths: [weightsFileName],
          weights: modelArtifacts.weightSpecs
        }]
      }

      fs.writeFileSync(
        path.join(dirPath, 'model.json'),
        JSON.stringify(modelJson)
      )

      return {
        modelArtifactsInfo: {
          dateSaved: new Date(),
          modelTopologyType: 'JSON' as const
        }
      }
    },

    async load() {
      const modelJsonPath = path.join(dirPath, 'model.json')
      const modelJson = JSON.parse(fs.readFileSync(modelJsonPath, 'utf-8'))

      let weightData: ArrayBuffer | undefined
      const weightsManifest = modelJson.weightsManifest

      if (weightsManifest && weightsManifest.length > 0) {
        const buffers: Buffer[] = []
        for (const group of weightsManifest) {
          for (const p of group.paths) {
            buffers.push(fs.readFileSync(path.join(dirPath, p)))
          }
        }
        const combined = Buffer.concat(buffers)
        weightData = combined.buffer.slice(
          combined.byteOffset,
          combined.byteOffset + combined.byteLength
        )
      }

      const weightSpecs = weightsManifest
        ? weightsManifest.flatMap((g: any) => g.weights)
        : []

      return {
        modelTopology: modelJson.modelTopology,
        weightSpecs,
        weightData,
        format: modelJson.format,
        generatedBy: modelJson.generatedBy,
        convertedBy: modelJson.convertedBy
      }
    }
  }
}

// ============================================
// MODEL CONFIGURATION
// ============================================

export interface ModelConfig {
  inputSize: number
  outputSize: number
  hiddenLayers: number[]
  learningRate: number
  epochs: number
  batchSize: number
  validationSplit: number
}

export const DEFAULT_CONFIG: ModelConfig = {
  inputSize: 23,
  outputSize: 3,
  hiddenLayers: [64, 32, 16],
  learningRate: 0.001,
  epochs: 100,
  batchSize: 32,
  validationSplit: 0.2
}

const MODEL_DIR = path.join(process.cwd(), 'server', 'ml', 'models', 'forecast')
const MODEL_PATH = `file://${MODEL_DIR}`
const METADATA_PATH = path.join(MODEL_DIR, 'metadata.json')

// ============================================
// MODEL CREATION
// ============================================

export async function createModel(config: ModelConfig = DEFAULT_CONFIG): Promise<any> {
  const tf = await getTf()

  const model = tf.sequential({ name: 'real_estate_forecast' })

  model.add(tf.layers.dense({
    units: config.hiddenLayers[0]!,
    activation: 'relu',
    inputShape: [config.inputSize],
    kernelInitializer: 'heNormal',
    name: 'dense_input'
  }))

  model.add(tf.layers.dropout({ rate: 0.2, name: 'dropout_1' }))

  for (let i = 1; i < config.hiddenLayers.length; i++) {
    model.add(tf.layers.dense({
      units: config.hiddenLayers[i]!,
      activation: 'relu',
      kernelInitializer: 'heNormal',
      name: `dense_hidden_${i}`
    }))

    if (i < config.hiddenLayers.length - 1) {
      model.add(tf.layers.dropout({ rate: 0.1, name: `dropout_${i + 1}` }))
    }
  }

  model.add(tf.layers.dense({
    units: config.outputSize,
    activation: 'linear',
    name: 'output'
  }))

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

export async function trainModel(
  features: number[][],
  labels: number[][],
  config: ModelConfig = DEFAULT_CONFIG,
  onProgress?: (epoch: number, logs: any) => void
): Promise<TrainingResult> {
  const tf = await getTf()
  const startTime = Date.now()

  if (features.length === 0 || labels.length === 0) {
    throw new Error('No training data provided')
  }

  if (features.length !== labels.length) {
    throw new Error('Features and labels must have same number of samples')
  }

  console.log(`[ML] Training with ${features.length} samples`)
  console.log(`[ML] Feature size: ${features[0]!.length}, Output size: ${labels[0]!.length}`)

  const actualConfig = {
    ...config,
    inputSize: features[0]!.length,
    outputSize: labels[0]!.length
  }

  const model = await createModel(actualConfig)

  const xs = tf.tensor2d(features)
  const ys = tf.tensor2d(labels)

  const callbacks = {
    onEpochEnd: (epoch: number, logs: any) => {
      if (onProgress) onProgress(epoch, logs)
      if (epoch % 10 === 0) {
        console.log(`[ML] Epoch ${epoch}: loss=${logs?.loss?.toFixed(4)}, mae=${logs?.mae?.toFixed(4)}`)
      }
    }
  }

  const history = await model.fit(xs, ys, {
    epochs: actualConfig.epochs,
    batchSize: actualConfig.batchSize,
    validationSplit: actualConfig.validationSplit,
    shuffle: true,
    verbose: 0,
    callbacks
  })

  const h = history.history
  const loss = (h.loss ?? []) as number[]
  const val_loss = (h.val_loss ?? []) as number[]
  const mae = (h.mae ?? h.mean_absolute_error ?? []) as number[]
  const val_mae = (h.val_mae ?? h.val_mean_absolute_error ?? []) as number[]

  const trainingHistory = { loss, val_loss, mae, val_mae }

  await saveModel(model, actualConfig)

  xs.dispose()
  ys.dispose()

  const trainingTime = Date.now() - startTime

  return {
    success: true,
    epochs: actualConfig.epochs,
    finalLoss: loss.length > 0 ? loss[loss.length - 1]! : 0,
    finalMae: mae.length > 0 ? mae[mae.length - 1]! : 0,
    history: trainingHistory,
    trainingTime,
    modelPath: MODEL_DIR
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

export async function saveModel(
  model: any,
  config: ModelConfig,
  normalization?: ModelMetadata['normalization']
): Promise<void> {
  if (!fs.existsSync(MODEL_DIR)) {
    fs.mkdirSync(MODEL_DIR, { recursive: true })
  }

  if (_usingNode) {
    await model.save(MODEL_PATH)
  } else {
    await model.save(nodeFileIOHandler(MODEL_DIR))
  }
  console.log(`[ML] Model saved to ${MODEL_DIR}`)

  const metadata: ModelMetadata = {
    config,
    trainedAt: new Date().toISOString(),
    samplesUsed: 0,
    normalization
  }

  fs.writeFileSync(METADATA_PATH, JSON.stringify(metadata, null, 2))
  console.log(`[ML] Metadata saved to ${METADATA_PATH}`)
}

export async function loadModel(): Promise<{
  model: any
  metadata: ModelMetadata
} | null> {
  try {
    const tf = await getTf()
    const modelJsonPath = path.join(MODEL_DIR, 'model.json')
    if (!fs.existsSync(modelJsonPath)) {
      console.log('[ML] No saved model found')
      return null
    }

    let model: any
    if (_usingNode) {
      model = await tf.loadLayersModel(`${MODEL_PATH}/model.json`)
    } else {
      model = await tf.loadLayersModel(nodeFileIOHandler(MODEL_DIR) as any)
    }
    console.log('[ML] Model loaded successfully')

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

export async function predict(
  model: any,
  features: number[],
  normalization: ModelMetadata['normalization']
): Promise<PredictionResult | null> {
  if (!normalization) {
    console.error('[ML] Normalization parameters required for prediction')
    return null
  }

  try {
    const tf = await getTf()

    const input = tf.tensor2d([features])
    const prediction = model.predict(input)
    const normalizedOutput = await prediction.data()

    const output = Array.from(normalizedOutput).map((val: number, i: number) =>
      val * normalization.labelStds[i]! + normalization.labelMeans[i]!
    )

    const confidence = 0.75

    input.dispose()
    prediction.dispose()

    return {
      soldCount: Math.max(0, Math.round(output[0]!)),
      avgPrice: Math.max(0, Math.round(output[1]!)),
      inventory: Math.max(0, Math.round(output[2]!)),
      confidence
    }
  } catch (error) {
    console.error('[ML] Prediction error:', error)
    return null
  }
}
