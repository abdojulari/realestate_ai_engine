<template>
  <div v-if="loadError" class="chart-error pa-4 text-center">
    <v-icon icon="mdi-chart-line" size="large" class="mb-2 text-disabled" />
    <div class="text-caption text-disabled">Chart unavailable</div>
  </div>
  <VChart v-else :option="option" :autoresize="true" :style="{ width, height }" />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref, onErrorCaptured } from 'vue'
import 'echarts'

const loadError = ref(false)

const VChart = defineAsyncComponent({
  loader: () => import('vue-echarts'),
  onError(error) {
    console.error('[EChart] Failed to load vue-echarts:', error)
    loadError.value = true
  }
})

const props = defineProps<{ option: any, width?: string, height?: string }>()
const width = computed(() => props.width || '100%')
const height = computed(() => props.height || '300px')

onErrorCaptured((error) => {
  console.error('[EChart] Error captured:', error)
  loadError.value = true
  return false // Prevent error from propagating
})
</script>

<style scoped>
.chart-error {
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border-radius: 8px;
}
</style>


