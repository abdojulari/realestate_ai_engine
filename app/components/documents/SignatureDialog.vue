<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="700" persistent>
    <v-card rounded="xl" class="premium-dialog">
      <v-card-title class="pa-4 d-flex align-center dialog-title">
        <span class="text-h6">Add Your Signature</span>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" @click="close" />
      </v-card-title>

      <!-- Saved Signatures -->
      <v-card-text v-if="savedSignatures.length > 0" class="pb-0">
        <div class="text-caption font-weight-bold mb-2">SAVED SIGNATURES</div>
        <v-row>
          <v-col v-for="sig in savedSignatures" :key="sig.id" cols="6">
            <v-card
              variant="outlined"
              class="pa-2 cursor-pointer signature-preview-card"
              :class="{ 'selected-signature': selectedSavedId === sig.id }"
              @click="selectedSavedId = sig.id"
            >
              <div class="d-flex justify-space-between align-center mb-2">
                <span class="text-caption font-weight-bold">{{ sig.name }}</span>
                <v-btn icon="mdi-delete" size="x-small" variant="text" @click.stop="$emit('delete-signature', sig.id)" />
              </div>
              <div v-if="sig.type === 'draw' || sig.type === 'upload'" class="signature-img-preview">
                <img :src="sig.signatureData" alt="Signature" style="max-width: 100%; height: auto;" />
              </div>
              <div v-else class="signature-text-preview">{{ sig.signatureData }}</div>
            </v-card>
          </v-col>
        </v-row>
        <v-divider class="my-4" />
      </v-card-text>

      <v-tabs v-model="sigTab" color="primary" grow>
        <v-tab value="draw">Draw</v-tab>
        <v-tab value="type">Type</v-tab>
        <v-tab value="upload">Upload</v-tab>
      </v-tabs>

      <v-window v-model="sigTab" class="pa-6">
        <v-window-item value="draw">
          <div class="signature-canvas-container premium-signature-pad border rounded-lg bg-white mb-4">
            <canvas ref="sigCanvas" width="600" height="200"></canvas>
          </div>
          <div class="d-flex justify-space-between align-center">
            <v-btn variant="text" size="small" @click="clearSig">Clear</v-btn>
            <v-checkbox v-model="saveForReuse" label="Save for reuse" hide-details density="compact" />
          </div>
        </v-window-item>
        <v-window-item value="type">
          <v-text-field v-model="sigText" label="Type your name" variant="outlined" class="mb-4" placeholder="Your Signature" />
          <div class="preview-text-sig mb-4">{{ sigText || 'Preview' }}</div>
          <v-checkbox v-model="saveForReuse" label="Save for reuse" hide-details density="compact" />
        </v-window-item>
        <v-window-item value="upload">
          <v-file-input v-model="uploadedFile" label="Select Signature Image" prepend-icon="mdi-camera" variant="outlined" accept="image/*" @change="handleFileUpload" />
          <div v-if="uploadPreview" class="mt-4 text-center">
            <img :src="uploadPreview" alt="Preview" style="max-width: 100%; max-height: 200px;" />
          </div>
          <v-checkbox v-model="saveForReuse" label="Save for reuse" hide-details density="compact" class="mt-4" />
        </v-window-item>
      </v-window>

      <v-card-text class="pt-0">
        <v-select
          v-model="page"
          :items="Array.from({ length: totalPages }, (_, i) => ({ title: `Page ${i + 1}`, value: i + 1 }))"
          label="Add to Page" variant="outlined" density="compact"
        />
      </v-card-text>

      <v-card-actions class="pa-6 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="close">Cancel</v-btn>
        <v-btn color="primary" variant="flat" rounded="lg" @click="submit" :loading="loading">Add Signature</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import SignaturePad from 'signature_pad'

const props = defineProps<{
  modelValue: boolean
  totalPages: number
  currentPage: number
  savedSignatures: any[]
}>()

const emit = defineEmits<{
  'update:modelValue': [val: boolean]
  'add-signature': [element: { page: number; data: string; type: string; x: number; y: number; width: number; height: number }, save: boolean, name: string]
  'delete-signature': [id: number]
}>()

const sigCanvas = ref<HTMLCanvasElement | null>(null)
let signaturePad: SignaturePad | null = null

const sigTab = ref('draw')
const sigText = ref('')
const uploadedFile = ref<File[]>([])
const uploadPreview = ref('')
const selectedSavedId = ref<number | null>(null)
const saveForReuse = ref(false)
const page = ref(1)
const loading = ref(false)

watch(() => props.modelValue, (val) => {
  if (val) {
    page.value = props.currentPage
    if (sigTab.value === 'draw') initCanvas()
  }
})

watch(sigTab, (val) => {
  if (val === 'draw' && props.modelValue) initCanvas()
})

function initCanvas() {
  nextTick(() => {
    if (sigCanvas.value) {
      const ctx = sigCanvas.value.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, sigCanvas.value.width, sigCanvas.value.height)
      signaturePad = new SignaturePad(sigCanvas.value, {
        backgroundColor: 'rgba(0, 0, 0, 0)', penColor: 'rgb(0, 0, 0)',
      })
    }
  })
}

function clearSig() { signaturePad?.clear() }

function handleFileUpload() {
  const files = uploadedFile.value
  if (files?.length > 0 && files[0]) {
    const reader = new FileReader()
    reader.onload = (e) => { uploadPreview.value = e.target?.result as string }
    reader.readAsDataURL(files[0])
  }
}

function close() {
  selectedSavedId.value = null
  saveForReuse.value = false
  sigText.value = ''
  uploadPreview.value = ''
  emit('update:modelValue', false)
}

async function submit() {
  loading.value = true
  try {
    let data = '', type = '', name = ''

    if (selectedSavedId.value) {
      const saved = props.savedSignatures.find((s: any) => s.id === selectedSavedId.value)
      if (saved) { data = saved.signatureData; type = saved.type }
    } else if (sigTab.value === 'draw' && signaturePad && !signaturePad.isEmpty()) {
      data = signaturePad.toDataURL(); type = 'draw'; name = 'Signature ' + new Date().toLocaleString()
    } else if (sigTab.value === 'type' && sigText.value) {
      data = sigText.value; type = 'type'; name = sigText.value
    } else if (sigTab.value === 'upload' && uploadPreview.value) {
      data = uploadPreview.value; type = 'upload'; name = 'Signature ' + new Date().toLocaleString()
    }

    if (data) {
      emit('add-signature', { page: page.value, data, type, x: 100, y: 100, width: 200, height: 80 }, saveForReuse.value, name)
    }
    close()
  } finally { loading.value = false }
}
</script>

<style scoped>
.premium-dialog {
  background: rgba(255, 255, 255, 0.98) !important; backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.8); box-shadow: 0 20px 60px rgba(31, 38, 135, 0.3) !important;
}
.dialog-title { font-weight: 700; font-size: 1.25rem; border-bottom: 1px solid rgba(0, 0, 0, 0.06); padding: 20px 24px !important; }
.cursor-pointer { cursor: pointer; }
.signature-preview-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(10px); }
.signature-preview-card:hover { border-color: rgb(var(--v-theme-primary)); box-shadow: 0 6px 20px rgba(25, 118, 210, 0.2); transform: translateY(-2px); }
.selected-signature { border-color: rgb(var(--v-theme-primary)) !important; border-width: 2px !important; background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.08), rgba(var(--v-theme-primary), 0.12)) !important; box-shadow: 0 8px 24px rgba(25, 118, 210, 0.25) !important; }
.signature-img-preview, .signature-text-preview { min-height: 60px; display: flex; align-items: center; justify-content: center; }
.signature-text-preview { font-family: 'Dancing Script', cursive; font-size: 24px; color: #1a237e; }
.premium-signature-pad { background-image: linear-gradient(45deg, #f8f9fa 25%, transparent 25%), linear-gradient(-45deg, #f8f9fa 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f8f9fa 75%), linear-gradient(-45deg, transparent 75%, #f8f9fa 75%); background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0px; box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.05); position: relative; overflow: hidden; }
.signature-canvas-container canvas { cursor: crosshair; width: 100%; display: block; }
.preview-text-sig { font-family: 'Dancing Script', cursive; font-size: 48px; text-align: center; border: 2px dashed rgba(25, 118, 210, 0.3); background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.9)); padding: 20px; color: #1a237e; min-height: 100px; display: flex; align-items: center; justify-content: center; border-radius: 8px; }
</style>
