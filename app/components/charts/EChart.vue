<template>
  <VChart :option="option" :autoresize="true" :style="{ width, height }" />
</template>

<script setup lang="ts">
import 'echarts'
import { defineAsyncComponent } from 'vue'
const VChart = defineAsyncComponent(() => import('vue-echarts'))

const props = defineProps<{ option: any, width?: string, height?: string }>()
const width = computed(() => props.width || '100%')
const height = computed(() => props.height || '300px')
</script>


