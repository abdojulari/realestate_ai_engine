<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="600">
    <v-card rounded="xl" class="premium-dialog">
      <v-card-title class="d-flex align-center dialog-title">
        <v-icon icon="mdi-file-convert" class="mr-2" />
        Convert Files to PDF
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" @click="$emit('update:modelValue', false)" />
      </v-card-title>
      <v-card-text>
        <div class="mb-4">
          <div class="text-subtitle-2 mb-2">Supported formats:</div>
          <v-chip-group>
            <v-chip size="small" variant="outlined">Word (.docx, .doc)</v-chip>
            <v-chip size="small" variant="outlined">Images (.jpg, .png)</v-chip>
            <v-chip size="small" variant="outlined">Text (.txt)</v-chip>
          </v-chip-group>
        </div>
        <v-file-input v-model="file" label="Select file to convert" prepend-icon="mdi-file" variant="outlined" accept=".docx,.doc,.jpg,.jpeg,.png,.txt" :disabled="loading" />
        <div v-if="file" class="mt-4 pa-4 bg-grey-lighten-4 rounded">
          <div class="d-flex align-center">
            <v-icon icon="mdi-file-document" class="mr-2" />
            <div class="flex-grow-1">
              <div class="font-weight-medium">{{ file.name }}</div>
              <div class="text-caption">{{ formatFileSize(file.size || 0) }}</div>
            </div>
            <v-chip size="small" color="primary" variant="flat">{{ getExt(file.name || '') }}</v-chip>
          </div>
        </div>
      </v-card-text>
      <v-card-actions class="pa-6 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)" :disabled="loading">Cancel</v-btn>
        <v-btn color="primary" variant="flat" @click="$emit('convert', file)" :loading="loading" :disabled="!file">Convert to PDF</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean; loading: boolean }>()
defineEmits<{ 'update:modelValue': [val: boolean]; convert: [file: File | null] }>()

const file = ref<File | null>(null)

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const getExt = (name: string) => name.split('.').pop()?.toUpperCase() || ''
</script>

<style scoped>
.premium-dialog { background: rgba(255, 255, 255, 0.98) !important; backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.8); box-shadow: 0 20px 60px rgba(31, 38, 135, 0.3) !important; }
.dialog-title { font-weight: 700; font-size: 1.25rem; border-bottom: 1px solid rgba(0, 0, 0, 0.06); padding: 20px 24px !important; }
</style>
