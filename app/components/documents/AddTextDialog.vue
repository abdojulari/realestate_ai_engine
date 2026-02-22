<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="600">
    <v-card rounded="xl" class="premium-dialog">
      <v-card-title class="dialog-title">Add Text to PDF</v-card-title>
      <v-card-text>
        <v-textarea density="compact" v-model="textOverlay" label="Enter text" variant="outlined" rows="3" class="mb-4" />
        <v-row>
          <v-col cols="6">
            <v-select v-model="fontFamily" :items="fontFamilies" label="Font Family" variant="outlined" density="compact" />
          </v-col>
          <v-col cols="6">
            <v-slider v-model="fontSize" label="Font Size" min="8" max="72" step="2" thumb-label />
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="6">
            <div class="text-caption mb-2">Text Color</div>
            <input type="color" v-model="color" class="color-picker" />
          </v-col>
          <v-col cols="6">
            <v-select density="compact"
              v-model="page"
              :items="Array.from({ length: totalPages }, (_, i) => ({ title: `Page ${i + 1}`, value: i + 1 }))"
              label="Page" variant="outlined"
            />
          </v-col>
        </v-row>
        <div class="text-preview pa-4 mt-4 border rounded" :style="{ fontFamily, fontSize: fontSize + 'px', color }">
          {{ textOverlay || 'Preview your text here' }}
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">Cancel</v-btn>
        <v-btn color="primary" @click="submit">Add Text</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  totalPages: number
  currentPage: number
}>()

const emit = defineEmits<{
  'update:modelValue': [val: boolean]
  'add-text': [element: { page: number; content: string; x: number; y: number; fontSize: number; fontFamily: string; color: string }]
}>()

const fontFamilies = ['Helvetica', 'Times-Roman', 'Courier', 'Arial', 'Verdana', 'Georgia', 'Palatino']

const textOverlay = ref('')
const fontSize = ref(16)
const fontFamily = ref('Helvetica')
const color = ref('#000000')
const page = ref(1)

watch(() => props.modelValue, (val) => {
  if (val) page.value = props.currentPage
})

function submit() {
  if (!textOverlay.value.trim()) return
  emit('add-text', {
    page: page.value,
    content: textOverlay.value,
    x: 100, y: 100,
    fontSize: fontSize.value,
    fontFamily: fontFamily.value,
    color: color.value,
  })
  textOverlay.value = ''
  emit('update:modelValue', false)
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
  font-weight: 700; font-size: 1.25rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  padding: 20px 24px !important;
}
.color-picker {
  width: 100%; height: 40px; border: 2px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px; cursor: pointer; transition: border-color 0.2s ease;
}
.color-picker:hover { border-color: rgb(var(--v-theme-primary)); }
.text-preview {
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border: 1px solid rgba(0, 0, 0, 0.08); min-height: 80px; border-radius: 8px;
}
</style>
