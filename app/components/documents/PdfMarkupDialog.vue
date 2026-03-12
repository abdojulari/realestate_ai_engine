<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="900" persistent scrollable>
    <v-card rounded="xl" class="markup-dialog">
      <!-- Header -->
      <v-card-title class="pa-4 d-flex align-center markup-header">
        <v-icon class="mr-2" size="20">mdi-draw</v-icon>
        <span class="text-h6 font-weight-bold">PDF Markup</span>
        <v-chip size="x-small" variant="tonal" class="ml-2">Page {{ page }}</v-chip>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" @click="close" />
      </v-card-title>
      <v-divider />

      <!-- Toolbar -->
      <div class="markup-toolbar pa-3 d-flex align-center flex-wrap ga-2">
        <v-btn-toggle v-model="activeTool" mandatory density="compact" variant="outlined" class="rounded-lg">
          <v-btn value="pen" size="small">
            <v-icon start size="16">mdi-pen</v-icon> Draw
          </v-btn>
          <v-btn value="highlighter" size="small">
            <v-icon start size="16">mdi-marker</v-icon> Highlight
          </v-btn>
          <v-btn value="line" size="small">
            <v-icon start size="16">mdi-minus</v-icon> Line
          </v-btn>
          <v-btn value="eraser" size="small">
            <v-icon start size="16">mdi-eraser</v-icon> Eraser
          </v-btn>
        </v-btn-toggle>

        <v-divider vertical class="mx-1" />

        <div v-if="activeTool !== 'eraser'" class="d-flex align-center ga-2">
          <div class="color-swatches d-flex ga-1">
            <div
              v-for="c in presetColors"
              :key="c"
              class="color-swatch"
              :class="{ active: strokeColor === c }"
              :style="{ backgroundColor: c }"
              @click="strokeColor = c"
            />
          </div>

          <v-menu :close-on-content-click="false" location="bottom">
            <template #activator="{ props: menuProps }">
              <v-btn v-bind="menuProps" icon size="x-small" variant="tonal">
                <v-icon size="16">mdi-palette</v-icon>
              </v-btn>
            </template>
            <v-card class="pa-3" width="220">
              <v-text-field
                v-model="strokeColor"
                label="Color"
                variant="outlined"
                density="compact"
                type="color"
                hide-details
              />
            </v-card>
          </v-menu>
        </div>

        <v-divider vertical class="mx-1" />

        <div class="d-flex align-center ga-2" style="min-width: 140px;">
          <v-icon size="14">mdi-circle-small</v-icon>
          <v-slider
            v-model="strokeWidth"
            :min="1"
            :max="activeTool === 'eraser' ? 40 : 20"
            :step="1"
            hide-details
            density="compact"
            thumb-label
            style="max-width: 120px;"
          />
          <span class="text-caption font-weight-bold">{{ strokeWidth }}px</span>
        </div>

        <v-spacer />

        <v-btn variant="text" size="small" prepend-icon="mdi-undo" @click="undo" :disabled="strokes.length === 0">Undo</v-btn>
        <v-btn variant="text" size="small" prepend-icon="mdi-delete-sweep" color="error" @click="clearAll" :disabled="strokes.length === 0">Clear All</v-btn>
      </div>
      <v-divider />

      <!-- Canvas Area -->
      <v-card-text class="pa-0 markup-canvas-area">
        <div ref="canvasWrapper" class="canvas-wrapper">
          <canvas ref="bgCanvas" class="bg-canvas"></canvas>
          <canvas
            ref="drawCanvas"
            class="draw-canvas"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointerleave="onPointerUp"
          ></canvas>
        </div>
      </v-card-text>

      <!-- Footer -->
      <v-divider />
      <v-card-actions class="pa-4">
        <v-select
          density="compact"
          v-model="page"
          :items="Array.from({ length: totalPages }, (_, i) => ({ title: `Page ${i + 1}`, value: i + 1 }))"
          label="Page" variant="outlined" hide-details
          style="max-width: 140px;"
          @update:model-value="loadPagePreview"
        />
        <v-spacer />
        <v-btn variant="text" @click="close">Cancel</v-btn>
        <v-btn color="primary" variant="flat" rounded="lg" @click="applyMarkup" :loading="applying" :disabled="strokes.length === 0">
          Apply Markup
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
interface Stroke {
  tool: 'pen' | 'highlighter' | 'line' | 'eraser'
  color: string
  width: number
  opacity: number
  points: { x: number; y: number }[]
}

const props = defineProps<{
  modelValue: boolean
  totalPages: number
  currentPage: number
  canvasRefs: Map<number, HTMLCanvasElement>
}>()

const emit = defineEmits<{
  'update:modelValue': [val: boolean]
  'apply-markup': [payload: { page: number; imageData: string }]
}>()

const canvasWrapper = ref<HTMLElement | null>(null)
const bgCanvas = ref<HTMLCanvasElement | null>(null)
const drawCanvas = ref<HTMLCanvasElement | null>(null)

const activeTool = ref<'pen' | 'highlighter' | 'line' | 'eraser'>('pen')
const strokeColor = ref('#000000')
const strokeWidth = ref(3)
const page = ref(1)
const applying = ref(false)

const strokes = ref<Stroke[]>([])
let currentStroke: Stroke | null = null
let isDrawing = false
let lineStart: { x: number; y: number } | null = null

const presetColors = [
  '#000000', '#D32F2F', '#1976D2', '#388E3C',
  '#F57C00', '#7B1FA2', '#FFEB3B',
]

watch(() => props.modelValue, (val) => {
  if (val) {
    page.value = props.currentPage
    strokes.value = []
    nextTick(() => setTimeout(() => loadPagePreview(), 100))
  }
})

function loadPagePreview() {
  const sourceCanvas = props.canvasRefs.get(page.value)
  const bg = bgCanvas.value
  const draw = drawCanvas.value
  const wrapper = canvasWrapper.value
  if (!sourceCanvas || !bg || !draw || !wrapper) return

  const wrapperRect = wrapper.getBoundingClientRect()
  const maxW = wrapperRect.width || 800
  const srcW = sourceCanvas.width
  const srcH = sourceCanvas.height
  const scale = Math.min(maxW / srcW, 1)
  const displayW = srcW * scale
  const displayH = srcH * scale

  for (const c of [bg, draw]) {
    c.width = srcW
    c.height = srcH
    c.style.width = displayW + 'px'
    c.style.height = displayH + 'px'
  }

  const ctx = bg.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, srcW, srcH)
    ctx.drawImage(sourceCanvas, 0, 0)
  }

  redraw()
}

function getCanvasPoint(e: PointerEvent): { x: number; y: number } {
  const canvas = drawCanvas.value!
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  }
}

function onPointerDown(e: PointerEvent) {
  const canvas = drawCanvas.value
  if (!canvas) return
  canvas.setPointerCapture(e.pointerId)
  isDrawing = true

  const pt = getCanvasPoint(e)
  const tool = activeTool.value

  if (tool === 'line') {
    lineStart = pt
    currentStroke = {
      tool: 'line',
      color: strokeColor.value,
      width: strokeWidth.value,
      opacity: 1,
      points: [pt, pt],
    }
    return
  }

  currentStroke = {
    tool,
    color: tool === 'eraser' ? '#ffffff' : strokeColor.value,
    width: strokeWidth.value,
    opacity: tool === 'highlighter' ? 0.35 : 1,
    points: [pt],
  }
}

function onPointerMove(e: PointerEvent) {
  if (!isDrawing || !currentStroke) return
  const pt = getCanvasPoint(e)

  if (currentStroke.tool === 'line' && lineStart) {
    currentStroke.points = [lineStart, pt]
    redraw()
    drawStrokePreview(currentStroke)
    return
  }

  currentStroke.points.push(pt)
  drawIncrementalPoint(currentStroke)
}

function onPointerUp() {
  if (!isDrawing) return
  isDrawing = false
  if (currentStroke && currentStroke.points.length >= 2) {
    strokes.value.push(currentStroke)
  }
  currentStroke = null
  lineStart = null
  redraw()
}

function drawIncrementalPoint(stroke: Stroke) {
  const ctx = drawCanvas.value?.getContext('2d')
  if (!ctx || stroke.points.length < 2) return

  ctx.save()
  ctx.globalAlpha = stroke.opacity
  ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over'
  ctx.strokeStyle = stroke.color
  ctx.lineWidth = stroke.width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const pts = stroke.points
  const from = pts[pts.length - 2]!
  const to = pts[pts.length - 1]!
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)
  ctx.stroke()
  ctx.restore()
}

function drawStrokePreview(stroke: Stroke) {
  const ctx = drawCanvas.value?.getContext('2d')
  if (!ctx || stroke.points.length < 2) return

  ctx.save()
  ctx.globalAlpha = stroke.opacity
  ctx.strokeStyle = stroke.color
  ctx.lineWidth = stroke.width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.beginPath()
  ctx.moveTo(stroke.points[0]!.x, stroke.points[0]!.y)
  ctx.lineTo(stroke.points[1]!.x, stroke.points[1]!.y)
  ctx.stroke()
  ctx.restore()
}

function redraw() {
  const ctx = drawCanvas.value?.getContext('2d')
  const canvas = drawCanvas.value
  if (!ctx || !canvas) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  for (const stroke of strokes.value) {
    ctx.save()
    ctx.globalAlpha = stroke.opacity
    ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over'
    ctx.strokeStyle = stroke.color
    ctx.lineWidth = stroke.width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (stroke.tool === 'line' && stroke.points.length === 2) {
      ctx.beginPath()
      ctx.moveTo(stroke.points[0]!.x, stroke.points[0]!.y)
      ctx.lineTo(stroke.points[1]!.x, stroke.points[1]!.y)
      ctx.stroke()
    } else if (stroke.points.length >= 2) {
      ctx.beginPath()
      ctx.moveTo(stroke.points[0]!.x, stroke.points[0]!.y)
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i]!.x, stroke.points[i]!.y)
      }
      ctx.stroke()
    }
    ctx.restore()
  }
}

function undo() {
  strokes.value.pop()
  redraw()
}

function clearAll() {
  strokes.value = []
  redraw()
}

function close() {
  strokes.value = []
  currentStroke = null
  isDrawing = false
  lineStart = null
  emit('update:modelValue', false)
}

function applyMarkup() {
  const draw = drawCanvas.value
  if (!draw || strokes.value.length === 0) return

  applying.value = true
  try {
    const imageData = draw.toDataURL('image/png')
    emit('apply-markup', { page: page.value, imageData })
    close()
  } finally {
    applying.value = false
  }
}
</script>

<style scoped>
.markup-dialog {
  background: #fafafa !important;
  overflow: hidden;
}
.markup-header {
  background: white;
  font-weight: 700;
}
.markup-toolbar {
  background: white;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
.markup-canvas-area {
  background: #e8e8e8;
  min-height: 400px;
  max-height: 70vh;
  overflow: auto;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 16px !important;
}
.canvas-wrapper {
  position: relative;
  display: inline-block;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  overflow: hidden;
  background: white;
}
.bg-canvas {
  display: block;
}
.draw-canvas {
  position: absolute;
  top: 0;
  left: 0;
  cursor: crosshair;
  touch-action: none;
}
.color-swatches {
  display: flex;
  align-items: center;
}
.color-swatch {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.15s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}
.color-swatch:hover {
  transform: scale(1.15);
}
.color-swatch.active {
  border-color: #1976D2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.3);
  transform: scale(1.15);
}
</style>
