<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="640"
    scrollable
  >
    <v-card rounded="xl" class="premium-dialog">
      <v-card-title class="dialog-title d-flex align-center">
        <v-icon icon="mdi-watermark" class="mr-2" />
        Watermark
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" @click="$emit('update:modelValue', false)" />
      </v-card-title>

      <v-card-text>
        <p class="text-caption text-medium-emphasis mb-4">
          Add a watermark to every page. The text, opacity, size, rotation and colour are all configurable. Use
          <strong>Remove watermark</strong> to revert to the original PDF (any unsaved edits will be lost).
        </p>

        <v-text-field
          v-model="text"
          label="Watermark text"
          variant="outlined"
          density="comfortable"
          placeholder="e.g. Confidential, Draft, Sample"
          prepend-inner-icon="mdi-format-text"
          clearable
          class="mb-2"
        />

        <v-row dense>
          <v-col cols="12" md="6">
            <div class="text-caption font-weight-medium mb-1">Opacity — {{ Math.round(opacity * 100) }}%</div>
            <v-slider
              v-model="opacity"
              :min="0.05"
              :max="1"
              :step="0.05"
              hide-details
              thumb-label
              color="primary"
            />
          </v-col>
          <v-col cols="12" md="6">
            <div class="text-caption font-weight-medium mb-1">Font size — {{ fontSize }}pt</div>
            <v-slider
              v-model="fontSize"
              :min="16"
              :max="160"
              :step="2"
              hide-details
              thumb-label
              color="primary"
            />
          </v-col>
        </v-row>

        <v-row dense class="mt-2">
          <v-col cols="12" md="6">
            <div class="text-caption font-weight-medium mb-1">Rotation</div>
            <v-btn-toggle
              v-model="rotation"
              density="comfortable"
              divided
              mandatory
              color="primary"
              variant="outlined"
            >
              <v-btn :value="0">0°</v-btn>
              <v-btn :value="45">45°</v-btn>
              <v-btn :value="-45">−45°</v-btn>
              <v-btn :value="90">90°</v-btn>
            </v-btn-toggle>
          </v-col>
          <v-col cols="12" md="6">
            <div class="text-caption font-weight-medium mb-1">Colour</div>
            <div class="d-flex align-center ga-2">
              <button
                v-for="swatch in colorSwatches"
                :key="swatch.label"
                type="button"
                class="color-swatch"
                :class="{ 'is-active': isSameColor(color, swatch.hex) }"
                :style="{ background: swatch.hex }"
                :title="swatch.label"
                @click="color = swatch.hex"
              />
              <input v-model="color" type="color" class="color-input" title="Custom colour" />
            </div>
          </v-col>
        </v-row>

        <!-- Preview -->
        <div class="watermark-preview mt-5">
          <div
            class="watermark-preview__stamp"
            :style="{
              opacity,
              transform: `rotate(${rotation}deg)`,
              color,
              fontSize: previewFontSize + 'px',
            }"
          >{{ text || 'Confidential' }}</div>
          <div class="watermark-preview__doc-lines">
            <div v-for="i in 6" :key="i" class="line" />
          </div>
        </div>
      </v-card-text>

      <v-divider />
      <v-card-actions class="pa-4">
        <v-btn
          v-if="hasExistingWatermark"
          variant="text"
          color="error"
          prepend-icon="mdi-eraser"
          :loading="loading"
          @click="$emit('remove')"
        >Remove watermark</v-btn>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">Cancel</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          prepend-icon="mdi-watermark"
          :loading="loading"
          :disabled="!text || !text.trim()"
          @click="apply"
        >Apply watermark</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

interface Props {
  modelValue: boolean
  loading?: boolean
  /** When true, show the "Remove watermark" button. Parent decides this. */
  hasExistingWatermark?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  hasExistingWatermark: false,
})

const emit = defineEmits<{
  'update:modelValue': [val: boolean]
  apply: [payload: { text: string; opacity: number; fontSize: number; rotation: number; color: { r: number; g: number; b: number }; colorHex: string }]
  remove: []
}>()

const text = ref('Confidential')
const opacity = ref(0.2)
const fontSize = ref(50)
const rotation = ref<number>(45)
const color = ref('#e51a1a')

const colorSwatches = [
  { label: 'Red',   hex: '#e51a1a' },
  { label: 'Grey',  hex: '#6b7280' },
  { label: 'Blue',  hex: '#1976d2' },
  { label: 'Black', hex: '#0f172a' },
  { label: 'Amber', hex: '#f59e0b' },
]

// Reset to defaults each time the dialog opens, so previous overrides don't bleed.
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      text.value = 'Confidential'
      opacity.value = 0.2
      fontSize.value = 50
      rotation.value = 45
      color.value = '#e51a1a'
    }
  },
)

const previewFontSize = computed(() => Math.max(18, Math.min(64, fontSize.value * 0.6)))

function isSameColor(a: string, b: string) {
  return (a || '').toLowerCase() === (b || '').toLowerCase()
}

function hexToRgb01(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return { r: 0.9, g: 0.1, b: 0.1 }
  return {
    r: parseInt(m[1]!, 16) / 255,
    g: parseInt(m[2]!, 16) / 255,
    b: parseInt(m[3]!, 16) / 255,
  }
}

function apply() {
  if (!text.value || !text.value.trim()) return
  emit('apply', {
    text: text.value.trim(),
    opacity: opacity.value,
    fontSize: fontSize.value,
    rotation: rotation.value,
    color: hexToRgb01(color.value),
    colorHex: color.value,
  })
}
</script>

<style scoped>
.premium-dialog {
  background: rgba(255, 255, 255, 0.98) !important;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 20px 60px rgba(31, 38, 135, 0.3) !important;
}
.dialog-title {
  font-weight: 700;
  font-size: 1.15rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  padding: 18px 22px !important;
}

.color-swatch {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.15);
}
.color-swatch:hover { transform: scale(1.08); }
.color-swatch.is-active {
  border-color: #1976d2;
  box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.2);
}
.color-input {
  width: 36px;
  height: 30px;
  border: 1px solid rgba(15, 23, 42, 0.15);
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  padding: 0;
}

.watermark-preview {
  position: relative;
  height: 180px;
  border: 1px dashed rgba(15, 23, 42, 0.18);
  border-radius: 12px;
  background: #fafbfc;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.watermark-preview__doc-lines {
  position: absolute;
  inset: 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
}
.watermark-preview__doc-lines .line {
  height: 8px;
  background: rgba(15, 23, 42, 0.06);
  border-radius: 4px;
}
.watermark-preview__doc-lines .line:nth-child(odd) { width: 92%; }
.watermark-preview__doc-lines .line:nth-child(even) { width: 78%; }
.watermark-preview__stamp {
  position: relative;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
  user-select: none;
  z-index: 1;
}
</style>
