<template>
  <ClientOnly>
    <!--
      ECharts has hard runtime dependencies on `window` (resize-detector, canvas init).
      Render only on the client; show a graceful skeleton during SSR / hydration.
    -->
    <div v-if="loadError" class="chart-error pa-4 text-center" :style="rootStyle">
      <v-icon icon="mdi-chart-line-variant" size="32" class="mb-2 text-disabled" />
      <div class="text-caption text-disabled">Chart unavailable</div>
      <div v-if="errorMessage" class="text-caption text-disabled mt-1" style="opacity:.7">
        {{ errorMessage }}
      </div>
    </div>
    <div v-else-if="!hasData" class="chart-empty pa-4 text-center" :style="rootStyle">
      <v-icon icon="mdi-chart-areaspline-variant" size="32" class="mb-2 text-disabled" />
      <div class="text-caption text-disabled">No data to display yet</div>
    </div>
    <VChart
      v-else-if="VChart"
      :option="safeOption"
      :autoresize="true"
      :init-options="initOptions"
      :style="rootStyle"
    />
    <div v-else class="chart-loading pa-4 text-center" :style="rootStyle">
      <v-progress-circular indeterminate size="28" width="2" color="primary" />
    </div>

    <template #fallback>
      <div class="chart-loading pa-4 text-center" :style="rootStyle">
        <v-progress-circular indeterminate size="28" width="2" color="primary" />
      </div>
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, onMounted, onErrorCaptured } from 'vue'

const props = defineProps<{
  option: any
  width?: string
  height?: string
}>()

const loadError = ref(false)
const errorMessage = ref('')
// Use shallowRef for the async-loaded component so Vue does not deeply reactive-wrap it.
const VChart = shallowRef<any>(null)

const width = computed(() => props.width || '100%')
const height = computed(() => props.height || '300px')
const rootStyle = computed(() => ({ width: width.value, height: height.value }))

// Defensive: if option is missing or has no series/data we surface an "empty" state
// rather than crashing ECharts which would otherwise throw a hard error.
const hasData = computed(() => {
  const opt = props.option
  if (!opt || typeof opt !== 'object') return false
  const series = (opt as any).series
  if (!series) return false
  if (Array.isArray(series)) {
    if (series.length === 0) return false
    return series.some((s: any) => {
      if (!s) return false
      if (Array.isArray(s.data)) return s.data.length > 0
      return s.data != null
    })
  }
  return true
})

// Always pass a sane object to ECharts so it never receives `undefined`.
const safeOption = computed(() => props.option || {})

// Use the SVG renderer by default — it works without a real canvas, is lighter
// for our small dashboard charts, and is more stable across browsers/zoom levels.
const initOptions = { renderer: 'svg' as const }

onMounted(async () => {
  try {
    // Side-effect import: registers all chart types (line, bar, pie, ...) and
    // components (tooltip, legend, grid, ...) on echarts core. Safe to call
    // multiple times.
    await import('echarts')
    const mod: any = await import('vue-echarts')
    VChart.value = mod.default || mod
  } catch (err: any) {
    console.error('[EChart] Failed to load chart library:', err)
    errorMessage.value = err?.message || ''
    loadError.value = true
  }
})

onErrorCaptured((error) => {
  console.error('[EChart] Runtime error:', error)
  errorMessage.value = (error as any)?.message || ''
  loadError.value = true
  return false
})
</script>

<style scoped>
.chart-error,
.chart-empty,
.chart-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #fafafa;
  border: 1px dashed rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  min-height: 160px;
  box-sizing: border-box;
}

.chart-loading {
  background: transparent;
  border: none;
}
</style>
