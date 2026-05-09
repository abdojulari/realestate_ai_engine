<template>
  <section
    v-if="showBar"
    class="unified-search-status rounded-xl border pa-6 mb-8"
    :class="surfaceClass"
    role="status"
    :aria-live="errorMessage ? 'assertive' : 'polite'"
    aria-atomic="true"
  >
    <div class="d-flex flex-column flex-sm-row align-center justify-space-between ga-4">
      <div class="d-flex align-start ga-4 flex-grow-1 min-w-0">
        <v-progress-circular
          v-if="busy && !errorMessage"
          indeterminate
          color="black"
          size="48"
          width="3"
          class="flex-shrink-0"
        />
        <v-icon v-else-if="errorMessage" color="error" size="40" class="flex-shrink-0">mdi-alert-circle-outline</v-icon>
        <div class="min-w-0">
          <div class="text-subtitle-1 font-weight-bold">{{ titleLine }}</div>
          <div v-if="subtitleLine" class="text-body-2 text-medium-emphasis mt-1">{{ subtitleLine }}</div>
          <div v-if="partialLine" class="text-body-2 mt-2 text-amber-darken-3">{{ partialLine }}</div>
          <div v-if="errorMessage" class="text-body-2 text-error mt-2">{{ errorMessage }}</div>
        </div>
      </div>
      <v-btn
        v-if="showCancel"
        variant="tonal"
        color="grey-darken-2"
        prepend-icon="mdi-close"
        class="flex-shrink-0"
        @click="$emit('cancel')"
      >
        Cancel
      </v-btn>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  busy: boolean
  phase: string
  title: string
  subtitle?: string
  fetchAttempt?: number
  fetchMaxAttempts?: number
  partialMessage?: string
  errorMessage?: string
  showCancel?: boolean
}>()

defineEmits<{ cancel: [] }>()

const showBar = computed(
  () =>
    props.busy ||
    !!(props.errorMessage && props.phase === 'idle') ||
    !!(props.partialMessage && props.partialMessage.trim()),
)

const busy = computed(() => props.busy)

const surfaceClass = computed(() => {
  if (props.errorMessage && !props.busy) return 'bg-red-lighten-5 border-error'
  return 'bg-grey-lighten-4'
})

const titleLine = computed(() => {
  if (props.errorMessage && !props.busy) return props.title || 'Something went wrong'
  return props.title || 'Working…'
})

const subtitleLine = computed(() => props.subtitle || '')

const partialLine = computed(() =>
  props.partialMessage && props.partialMessage.trim() ? props.partialMessage.trim() : '',
)
</script>

<style scoped>
.unified-search-status {
  min-height: 88px;
}
</style>
