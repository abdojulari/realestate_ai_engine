<template>
  <v-container fluid class="fill-height pa-0 premium-bg">
    <!-- Main Dashboard View -->
    <v-fade-transition hide-on-leave>
      <div v-if="!isEditing" class="w-100 pa-6 dashboard-container">
        <v-row align="center" class="mb-6">
          <v-col>
            <h1 class="text-h4 font-weight-bold text-grey-darken-4">Document Management</h1>
            <p class="text-subtitle-1 text-grey">Edit, sign, and convert your professional documents.</p>
          </v-col>
          <v-col cols="auto">
            <v-btn
              color="primary"
              prepend-icon="mdi-plus"
              rounded="lg"
              elevation="2"
              size="large"
              @click="triggerFileUpload"
              :loading="uploading"
            >
              Upload Document
            </v-btn>
            <input
              type="file"
              ref="fileInput"
              class="d-none"
              accept=".pdf,.docx"
              @change="handleFileUpload"
            />
          </v-col>
        </v-row>

        <v-row>
          <!-- Document Stats -->
          <v-col cols="12" md="4" v-for="stat in stats" :key="stat.title">
            <v-card rounded="xl" elevation="0" class="pa-4 glass-card stat-card">
              <div class="d-flex align-center">
                <v-avatar :color="stat.color + '-lighten-4'" size="56" class="mr-4 premium-avatar">
                  <v-icon :color="stat.color" :icon="stat.icon" size="28" />
                </v-avatar>
                <div>
                  <div class="text-caption text-grey-darken-1 font-weight-medium">{{ stat.title }}</div>
                  <div class="text-h5 font-weight-bold">{{ stat.value }}</div>
                </div>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <!-- Document List -->
        <v-card rounded="xl" elevation="0" class="mt-8 overflow-hidden glass-card">
          <v-table hover class="premium-table">
            <thead>
              <tr class="table-header-row">
                <th class="text-overline font-weight-bold">Name</th>
                <th class="text-overline text-center font-weight-bold">Type</th>
                <th class="text-overline text-center font-weight-bold">Status</th>
                <th class="text-overline text-center font-weight-bold">Size</th>
                <th class="text-overline text-right font-weight-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="5" class="text-center py-8">
                  <v-progress-circular indeterminate color="primary" />
                </td>
              </tr>
              <tr v-else-if="documents.length === 0">
                <td colspan="5" class="text-center py-8 text-grey">
                  No documents yet. Upload your first document to get started.
                </td>
              </tr>
              <tr v-else v-for="doc in documents" :key="doc.id" class="document-row">
                <td>
                  <div class="d-flex align-center py-2">
                    <v-icon :icon="doc.type === 'pdf' ? 'mdi-file-pdf-box' : 'mdi-file-word-box'" 
                            :color="doc.type === 'pdf' ? 'red' : 'blue'" class="mr-3" size="large" />
                    <div>
                      <div class="font-weight-medium">{{ doc.originalName }}</div>
                      <div class="text-caption text-grey">{{ formatDate(doc.createdAt) }}</div>
                    </div>
                  </div>
                </td>
                <td class="text-center">
                  <v-chip size="x-small" label class="text-uppercase">{{ doc.type }}</v-chip>
                </td>
                <td class="text-center">
                  <v-chip :color="getStatusColor(doc.status)" size="x-small" variant="flat">
                    {{ doc.status }}
                  </v-chip>
                </td>
                <td class="text-center text-caption">{{ formatFileSize(doc.fileSize) }}</td>
                <td class="text-right">
                  <v-btn icon="mdi-pencil-outline" variant="text" size="small" @click="openEditor(doc)" />
                  <v-btn icon="mdi-download-outline" variant="text" size="small" @click="downloadDocument(doc)" />
                  <v-btn icon="mdi-delete-outline" variant="text" color="error" size="small" @click="confirmDelete(doc)" />
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </div>

      <!-- PDF Editor View -->
      <v-container v-else fluid class="pa-0 fill-height d-flex flex-column editor-workspace" style="height: 100vh;">
        <!-- Top Toolbar -->
        <v-toolbar color="surface" elevation="0" density="compact" class=" glass-toolbar">
          <v-btn icon="mdi-arrow-left" @click="closeEditor" variant="text" class="toolbar-btn" />
          <v-toolbar-title class="font-weight-bold text-truncate ml-2" style="max-width: 300px;">
            {{ activeDoc?.originalName }}
          </v-toolbar-title>
          <v-spacer />
          
          <!-- Page Navigation -->
          <div class="d-flex align-center mx-4 page-nav-group">
            <v-btn 
            icon="mdi-chevron-left" 
            size="small" variant="text" @click="previousPage" :disabled="currentPage <= 1" 
            class="nav-btn" 
            />
            <v-text-field
              v-model.number="currentPage"
              type="number"
              density="compact"
              hide-details
              style="width: 60px;"
              class="mx-2 text-center page-input"
              @keyup.enter="goToPage"
            />
            <span class="text-caption font-weight-medium">/ {{ totalPages }}</span>
            <v-btn icon="mdi-chevron-right" size="small" variant="text" @click="nextPage" :disabled="currentPage >= totalPages" class="nav-btn" />
          </div>

          <!-- Zoom Controls -->
          <v-btn-group density="compact" class="mx-2 zoom-controls">
            <v-btn icon="mdi-minus" size="small" @click="zoomOut" />
            <v-btn size="small" style="min-width: 70px;" class="zoom-display">{{ Math.round(scale * 100) }}%</v-btn>
            <v-btn icon="mdi-plus" size="small" @click="zoomIn" />
          </v-btn-group>

          <!-- Tools -->
        
          <v-btn variant="tonal" prepend-icon="mdi-file-convert" class="mr-2 text-body-2" @click="showConverterDialog = true">
            Convert to PDF
          </v-btn>
          <v-btn color="primary" variant="flat" prepend-icon="mdi-content-save" class="mr-5  text-body-2" @click="savePdf" :loading="saving">
            Save PDF
          </v-btn>
        </v-toolbar>

        <!-- Main Content Area -->
        <div class="flex-grow-1 d-flex editor-content" style="overflow: hidden;">
          <!-- Left Sidebar -->
          <div class="glass-sidebar left-sidebar">
            <v-list density="compact" nav class="sidebar-list">
              <v-list-subheader>TOOLS</v-list-subheader>
              <v-list-item prepend-icon="mdi-format-text" title="Add Text" @click="startAddingText" />
              <v-list-item prepend-icon="mdi-signature" title="Add Signature" @click="openSignatureDialog" />
              <v-list-item prepend-icon="mdi-watermark" title="Watermark" @click="addWatermark" :loading="processing" />
              <v-list-item prepend-icon="mdi-text-box-search-outline" title="OCR Extract" @click="runOCR" :disabled="ocrLoading" />
              <v-list-item prepend-icon="mdi-magnify" title="Search PDF" @click="showSearchDialog = true" />
              <v-list-item prepend-icon="mdi-file-convert" title="Convert to PDF" @click="showConverterDialog = true" />
            </v-list>
            
            <v-divider class="my-2" />
            
            <!-- Page Thumbnails -->
            <div class="pa-2 thumbnails-container">
              <div class="text-caption font-weight-bold mb-2 px-2">PAGES</div>
              <div
                v-for="pageNum in totalPages"
                :key="pageNum"
                class="page-thumbnail mb-2 cursor-pointer"
                :class="{ 'active-page': pageNum === currentPage }"
                @click="goToPageNumber(pageNum)"
              >
                <div class="text-center pa-1">
                  <div class="thumbnail-preview">
                    <canvas :ref="el => setThumbnailRef(el, pageNum)" class="thumbnail-canvas"></canvas>
                  </div>
                  <div class="text-caption mt-1 thumbnail-label">{{ pageNum }}</div>
                </div>
              </div>
            </div>

            <!-- OCR Results -->
            <div v-if="ocrText" class="pa-4">
              <v-divider class="mb-2" />
              <div class="text-caption font-weight-bold mb-2">EXTRACTED TEXT:</div>
              <div class="text-caption" style="max-height: 200px; overflow-y: auto; word-break: break-word;">
                {{ ocrText }}
              </div>
            </div>
          </div>

          <!-- PDF Viewer Area -->
          <div class="flex-grow-1 canvas-workspace pdf-viewer-container" ref="pdfViewerContainer">
            <div class="pdf-pages-wrapper" :style="{ transform: `scale(${scale})` }">
              <div
                v-for="pageNum in totalPages"
                :key="`page-${pageNum}`"
                :id="`page-${pageNum}`"
                class="pdf-page-container mb-4"
                :style="{ position: 'relative' }"
              >
                <canvas :ref="el => setCanvasRef(el, pageNum)"></canvas>
                
                <!-- Draggable Text Elements -->
                <div
                  v-for="(text, index) in textElements.filter(t => t.page === pageNum)"
                  :key="`text-${index}`"
                  class="draggable-text-element premium-element"
                  :class="{ 'selected': selectedElement === `text-${index}` }"
                  :style="{
                    position: 'absolute',
                    left: text.x + 'px',
                    top: text.y + 'px',
                    fontSize: text.fontSize + 'px',
                    fontFamily: text.fontFamily,
                    color: text.color,
                    cursor: 'move',
                    userSelect: 'none',
                    border: selectedElement === `text-${index}` ? '2px dashed #1976D2' : '2px dashed transparent',
                    padding: '4px',
                    minWidth: '50px',
                    transform: `scale(${1/scale})`
                  }"
                  @mousedown="startDrag($event, 'text', index)"
                  @click="selectElement(`text-${index}`, text)"
                >
                  {{ text.content }}
                  <div v-if="selectedElement === `text-${index}`" class="element-controls">
                    <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" @click.stop="deleteElement('text', index)" />
                  </div>
                </div>

                <!-- Draggable Signature Elements -->
                <div
                  v-for="(sig, index) in signatureElements.filter(s => s.page === pageNum)"
                  :key="`sig-${index}`"
                  class="draggable-signature-element premium-element"
                  :class="{ 'selected': selectedElement === `sig-${index}` }"
                  :style="{
                    position: 'absolute',
                    left: sig.x + 'px',
                    top: sig.y + 'px',
                    width: sig.width + 'px',
                    height: sig.height + 'px',
                    cursor: 'move',
                    border: selectedElement === `sig-${index}` ? '2px solid #1976D2' : '2px solid transparent',
                    transform: `scale(${1/scale})`
                  }"
                  @mousedown="startDrag($event, 'signature', index)"
                  @click="selectElement(`sig-${index}`, sig)"
                >
                  <img 
                    v-if="sig.type === 'draw' || sig.type === 'upload'" 
                    :src="sig.data" 
                    style="width: 100%; height: 100%; object-fit: contain; background: transparent;" 
                  />
                  <div v-else style="font-family: 'Dancing Script', cursive; font-size: 32px; display: flex; align-items: center; justify-content: center; height: 100%; background: transparent;">
                    {{ sig.data }}
                  </div>
                  
                  <!-- Resize Handle -->
                  <div
                    v-if="selectedElement === `sig-${index}`"
                    class="resize-handle"
                    @mousedown.stop="startResize($event, index)"
                  ></div>
                  
                  <div v-if="selectedElement === `sig-${index}`" class="element-controls">
                    <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" @click.stop="deleteElement('signature', index)" />
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Loading Overlay -->
            <div v-if="loadingPdf" class="pdf-loading-overlay">
              <v-progress-circular indeterminate color="primary" size="64" />
              <div class="mt-4">Loading PDF...</div>
            </div>
          </div>
        </div>
      </v-container>
    </v-fade-transition>

    <!-- Text Customization Dialog -->
    <v-dialog v-model="showTextDialog" max-width="600">
      <v-card rounded="xl" class="premium-dialog">
        <v-card-title class="dialog-title">Add Text to PDF</v-card-title>
        <v-card-text>
          <v-textarea
            v-model="textOverlay"
            label="Enter text"
            variant="outlined"
            rows="3"
            class="mb-4"
          />
          
          <v-row>
            <v-col cols="6">
              <v-select
                v-model="textFontFamily"
                :items="fontFamilies"
                label="Font Family"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="6">
              <v-slider
                v-model="textSize"
                label="Font Size"
                min="8"
                max="72"
                step="2"
                thumb-label
              />
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="6">
              <div class="text-caption mb-2">Text Color</div>
              <input
                type="color"
                v-model="textColor"
                class="color-picker"
              />
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="textPage"
                :items="Array.from({length: totalPages}, (_, i) => ({ title: `Page ${i + 1}`, value: i + 1 }))"
                label="Page"
                variant="outlined"
                density="compact"
              />
            </v-col>
          </v-row>

          <div class="text-preview pa-4 mt-4 border rounded" :style="{ fontFamily: textFontFamily, fontSize: textSize + 'px', color: textColor }">
            {{ textOverlay || 'Preview your text here' }}
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showTextDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="addTextElement">Add Text</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Signature Dialog -->
    <v-dialog v-model="showSignatureDialog" max-width="700" persistent>
      <v-card rounded="xl" class="premium-dialog">
        <v-card-title class="pa-4 d-flex align-center dialog-title">
          <span class="text-h6">Add Your Signature</span>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="closeSignatureDialog" />
        </v-card-title>
        
        <!-- Saved Signatures -->
        <v-card-text v-if="savedSignatures.length > 0" class="pb-0">
          <div class="text-caption font-weight-bold mb-2">SAVED SIGNATURES</div>
          <v-row>
            <v-col v-for="sig in savedSignatures" :key="sig.id" cols="6">
              <v-card 
                variant="outlined" 
                class="pa-2 cursor-pointer signature-preview-card"
                :class="{ 'selected-signature': selectedSavedSignature === sig.id }"
                @click="selectSavedSignature(sig)"
              >
                <div class="d-flex justify-space-between align-center mb-2">
                  <span class="text-caption font-weight-bold">{{ sig.name }}</span>
                  <v-btn icon="mdi-delete" size="x-small" variant="text" @click.stop="deleteSavedSignature(sig.id)" />
                </div>
                <div v-if="sig.type === 'draw' || sig.type === 'upload'" class="signature-img-preview">
                  <img :src="sig.signatureData" alt="Signature" style="max-width: 100%; height: auto;" />
                </div>
                <div v-else class="signature-text-preview">
                  {{ sig.signatureData }}
                </div>
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
              <v-btn variant="text" size="small" @click="clearSignature">Clear</v-btn>
              <v-checkbox v-model="saveThisSignature" label="Save for reuse" hide-details density="compact" />
            </div>
          </v-window-item>

          <v-window-item value="type">
            <v-text-field
              v-model="sigText"
              label="Type your name"
              variant="outlined"
              class="mb-4"
              placeholder="Your Signature"
            />
            <div class="preview-text-sig mb-4">
              {{ sigText || 'Preview' }}
            </div>
            <v-checkbox v-model="saveThisSignature" label="Save for reuse" hide-details density="compact" />
          </v-window-item>

          <v-window-item value="upload">
            <v-file-input
              v-model="uploadedSignatureFile"
              label="Select Signature Image"
              prepend-icon="mdi-camera"
              variant="outlined"
              accept="image/*"
              @change="handleSignatureFileUpload"
            />
            <div v-if="uploadedSignaturePreview" class="mt-4 text-center">
              <img :src="uploadedSignaturePreview" alt="Preview" style="max-width: 100%; max-height: 200px;" />
            </div>
            <v-checkbox v-model="saveThisSignature" label="Save for reuse" hide-details density="compact" class="mt-4" />
          </v-window-item>
        </v-window>

        <v-card-text class="pt-0">
          <v-select
            v-model="signaturePage"
            :items="Array.from({length: totalPages}, (_, i) => ({ title: `Page ${i + 1}`, value: i + 1 }))"
            label="Add to Page"
            variant="outlined"
            density="compact"
          />
        </v-card-text>

        <v-card-actions class="pa-6 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="closeSignatureDialog">Cancel</v-btn>
          <v-btn color="primary" variant="flat" rounded="lg" @click="addSignatureElement" :loading="applyingSignature">
            Add Signature
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Search Dialog -->
    <v-dialog v-model="showSearchDialog" max-width="400">
      <v-card rounded="xl" class="premium-dialog">
        <v-card-title class="dialog-title">Search PDF</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="searchQuery"
            label="Search text"
            variant="outlined"
            prepend-inner-icon="mdi-magnify"
            @keyup.enter="searchPdf"
          />
          <div v-if="searchResults.length > 0" class="mt-4">
            <div class="text-caption mb-2">Found {{ searchResults.length }} results</div>
            <v-list density="compact">
              <v-list-item
                v-for="(result, index) in searchResults"
                :key="index"
                @click="goToSearchResult(result)"
              >
                <v-list-item-title>Page {{ result.page }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showSearchDialog = false">Close</v-btn>
          <v-btn color="primary" @click="searchPdf">Search</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation -->
    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card rounded="xl" class="premium-dialog">
        <v-card-title class="dialog-title">Delete Document</v-card-title>
        <v-card-text>
          Are you sure you want to delete "{{ documentToDelete?.originalName }}"? This cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showDeleteDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="deleteDocument" :loading="deleting">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- File Converter Dialog -->
    <v-dialog v-model="showConverterDialog" max-width="600">
      <v-card rounded="xl" class="premium-dialog">
        <v-card-title class="d-flex align-center dialog-title">
          <v-icon icon="mdi-file-convert" class="mr-2" />
          Convert Files to PDF
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="showConverterDialog = false" />
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

          <v-file-input
            v-model="converterFile"
            label="Select file to convert"
            prepend-icon="mdi-file"
            variant="outlined"
            accept=".docx,.doc,.jpg,.jpeg,.png,.txt"
            :disabled="converting"
          />

          <div v-if="converterFile.length > 0" class="mt-4 pa-4 bg-grey-lighten-4 rounded">
            <div class="d-flex align-center">
              <v-icon icon="mdi-file-document" class="mr-2" />
              <div class="flex-grow-1">
                <div class="font-weight-medium">{{ converterFile[0]?.name }}</div>
                <div class="text-caption">{{ formatFileSize(converterFile[0]?.size || 0) }}</div>
              </div>
              <v-chip size="small" color="primary" variant="flat">
                {{ getFileExtension(converterFile[0]?.name || '') }}
              </v-chip>
            </div>
          </div>
        </v-card-text>
        <v-card-actions class="pa-6 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="showConverterDialog = false" :disabled="converting">Cancel</v-btn>
          <v-btn 
            color="primary" 
            variant="flat" 
            @click="convertFileToPdf" 
            :loading="converting"
            :disabled="converterFile.length === 0"
          >
            Convert to PDF
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import SignaturePad from 'signature_pad'
import mammoth from 'mammoth'
import { createWorker } from 'tesseract.js'

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`

definePageMeta({
  layout: 'admin',
  middleware: ['admin']
})

// State
const isEditing = ref(false)
const showSignatureDialog = ref(false)
const showTextDialog = ref(false)
const showSearchDialog = ref(false)
const showDeleteDialog = ref(false)
const showConverterDialog = ref(false)
const sigTab = ref('draw')
const sigText = ref('')
const textOverlay = ref('')
const textSize = ref(16)
const textFontFamily = ref('Helvetica')
const textColor = ref('#000000')
const textPage = ref(1)
const searchQuery = ref('')
const searchResults = ref<any[]>([])
const ocrLoading = ref(false)
const ocrText = ref('')
const activeDoc = ref<any>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const pdfViewerContainer = ref<HTMLDivElement | null>(null)
const sigCanvas = ref<HTMLCanvasElement | null>(null)
const signaturePad = ref<SignaturePad | null>(null)
const uploading = ref(false)
const loading = ref(false)
const loadingPdf = ref(false)
const processing = ref(false)
const saving = ref(false)
const deleting = ref(false)
const applyingSignature = ref(false)
const saveThisSignature = ref(false)
const uploadedSignatureFile = ref<File[]>([])
const uploadedSignaturePreview = ref('')
const selectedSavedSignature = ref<number | null>(null)
const signaturePage = ref(1)
const converterFile = ref<File[]>([])
const converting = ref(false)

// Font families
const fontFamilies = [
  'Helvetica',
  'Times-Roman',
  'Courier',
  'Arial',
  'Verdana',
  'Georgia',
  'Palatino'
]

// PDF State
let currentPdfDoc: any = null
let pdfDocument: any = null
const currentPage = ref(1)
const totalPages = ref(0)
const scale = ref(1.0)
const canvasRefs = new Map<number, HTMLCanvasElement>()
const thumbnailRefs = new Map<number, HTMLCanvasElement>()

// Draggable elements
const textElements = ref<any[]>([])
const signatureElements = ref<any[]>([])
const selectedElement = ref<string | null>(null)
const isDragging = ref(false)
const isResizing = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const currentDragElement = ref<any>(null)

// Data
const documents = ref<any[]>([])
const savedSignatures = ref<any[]>([])
const stats = ref([
  { title: 'Total Documents', value: 0, icon: 'mdi-file-multiple', color: 'blue' },
  { title: 'Signed Today', value: 0, icon: 'mdi-pen', color: 'green' },
  { title: 'Pending Review', value: 0, icon: 'mdi-clock-outline', color: 'orange' },
])
const documentToDelete = ref<any>(null)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

// Refs management
const setCanvasRef = (el: any, pageNum: number) => {
  if (el) canvasRefs.set(pageNum, el)
}

const setThumbnailRef = (el: any, pageNum: number) => {
  if (el) thumbnailRefs.set(pageNum, el)
}

// Auth helper
const getAuthHeaders = (): Record<string, string> => {
  try {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}

// Load documents
async function loadDocuments() {
  loading.value = true
  try {
    const response: any = await $fetch('/api/admin/documents', {
      headers: getAuthHeaders()
    })
    documents.value = response?.documents || []
    
    if (response?.stats) {
      if (stats.value[0]) stats.value[0].value = response.stats.total || 0
      if (stats.value[1]) stats.value[1].value = response.stats.signed || 0
      if (stats.value[2]) stats.value[2].value = response.stats.pending || 0
    }
  } catch (error) {
    console.error('Error loading documents:', error)
    showSnackbar('Failed to load documents', 'error')
  } finally {
    loading.value = false
  }
}

// Load signatures
async function loadSignatures() {
  try {
    const response: any = await $fetch('/api/admin/signatures', {
      headers: getAuthHeaders()
    })
    savedSignatures.value = response.signatures || []
  } catch (error) {
    console.error('Error loading signatures:', error)
  }
}

const triggerFileUpload = () => fileInput.value?.click()

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)

    const response: any = await $fetch('/api/admin/documents', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData
    })

    if (response.success) {
      showSnackbar('Document uploaded successfully', 'success')
      await loadDocuments()
      
      if (response.document) {
        openEditor(response.document)
      }
    }
  } catch (error: any) {
    console.error('Upload error:', error)
    showSnackbar(error.data?.message || 'Failed to upload document', 'error')
  } finally {
    uploading.value = false
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}

const openEditor = async (doc: any) => {
  activeDoc.value = doc
  isEditing.value = true
  loadingPdf.value = true
  currentPage.value = 1
  scale.value = 1.0
  signaturePage.value = 1
  textPage.value = 1
  textElements.value = []
  signatureElements.value = []
  
  await nextTick()
  
  try {
    const response = await fetch(doc.filePath)
    const arrayBuffer = await response.arrayBuffer()
    
    if (doc.type === 'docx') {
      const pdfBytes = await convertDocxToPdf(arrayBuffer)
      await loadPdfDocument(pdfBytes)
    } else {
      await loadPdfDocument(arrayBuffer)
    }
  } catch (error) {
    console.error('Error opening document:', error)
    showSnackbar('Failed to open document', 'error')
    closeEditor()
  } finally {
    loadingPdf.value = false
  }
}

const loadPdfDocument = async (arrayBuffer: ArrayBuffer) => {
  currentPdfDoc = await PDFDocument.load(arrayBuffer)
  
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
  pdfDocument = await loadingTask.promise
  totalPages.value = pdfDocument.numPages
  
  await nextTick()
  for (let i = 1; i <= totalPages.value; i++) {
    await renderPage(i)
    await renderThumbnail(i)
  }
}

const renderPage = async (pageNum: number) => {
  if (!pdfDocument) return
  
  const page = await pdfDocument.getPage(pageNum)
  const viewport = page.getViewport({ scale: 1.5 })
  
  const canvas = canvasRefs.get(pageNum)
  if (!canvas) return
  
  const context = canvas.getContext('2d')
  if (!context) return
  
  canvas.height = viewport.height
  canvas.width = viewport.width
  
  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise
}

const renderThumbnail = async (pageNum: number) => {
  if (!pdfDocument) return
  
  const page = await pdfDocument.getPage(pageNum)
  const viewport = page.getViewport({ scale: 0.2 })
  
  const canvas = thumbnailRefs.get(pageNum)
  if (!canvas) return
  
  const context = canvas.getContext('2d')
  if (!context) return
  
  canvas.height = viewport.height
  canvas.width = viewport.width
  
  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise
}

const convertDocxToPdf = async (arrayBuffer: ArrayBuffer): Promise<ArrayBuffer> => {
  const result = await mammoth.extractRawText({ arrayBuffer })
  const text = result.value
  
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  
  const pageWidth = 595
  const pageHeight = 842
  let page = pdfDoc.addPage([pageWidth, pageHeight])
  
  const fontSize = 12
  const lineHeight = fontSize * 1.2
  const maxWidth = 500
  const margin = 50
  let y = pageHeight - margin
  
  const lines = text.split('\n')
  for (const line of lines) {
    const words = line.split(' ')
    let currentLine = ''
    
    for (const word of words) {
      const testLine = currentLine + word + ' '
      const width = font.widthOfTextAtSize(testLine, fontSize)
      
      if (width > maxWidth && currentLine !== '') {
        page.drawText(currentLine.trim(), {
          x: margin,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        })
        currentLine = word + ' '
        y -= lineHeight
        
        if (y < margin) {
          page = pdfDoc.addPage([pageWidth, pageHeight])
          y = pageHeight - margin
        }
      } else {
        currentLine = testLine
      }
    }
    
    if (currentLine.trim() !== '') {
      page.drawText(currentLine.trim(), {
        x: margin,
        y,
        size: fontSize,
        font,
        color: rgb(0, 0, 0)
      })
      y -= lineHeight
      
      if (y < margin) {
        page = pdfDoc.addPage([pageWidth, pageHeight])
        y = pageHeight - margin
      }
    }
  }
  
  const pdfBytes = await pdfDoc.save()
  return pdfBytes.buffer as ArrayBuffer
}

const closeEditor = () => {
  isEditing.value = false
  activeDoc.value = null
  currentPdfDoc = null
  pdfDocument = null
  currentPage.value = 1
  totalPages.value = 0
  scale.value = 1.0
  ocrText.value = ''
  textElements.value = []
  signatureElements.value = []
  selectedElement.value = null
  canvasRefs.clear()
  thumbnailRefs.clear()
}

// Navigation
const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
    scrollToPage(currentPage.value)
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    scrollToPage(currentPage.value)
  }
}

const goToPage = () => {
  if (currentPage.value >= 1 && currentPage.value <= totalPages.value) {
    scrollToPage(currentPage.value)
  }
}

const goToPageNumber = (pageNum: number) => {
  currentPage.value = pageNum
  scrollToPage(pageNum)
}

const scrollToPage = (pageNum: number) => {
  const element = document.getElementById(`page-${pageNum}`)
  if (element && pdfViewerContainer.value) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// Zoom
const zoomIn = () => {
  if (scale.value < 3) {
    scale.value += 0.25
  }
}

const zoomOut = () => {
  if (scale.value > 0.5) {
    scale.value -= 0.25
  }
}

// Text Management
const startAddingText = () => {
  textPage.value = currentPage.value
  showTextDialog.value = true
}

const addTextElement = () => {
  if (!textOverlay.value.trim()) return
  
  textElements.value.push({
    page: textPage.value,
    content: textOverlay.value,
    x: 100,
    y: 100,
    fontSize: textSize.value,
    fontFamily: textFontFamily.value,
    color: textColor.value
  })
  
  showTextDialog.value = false
  textOverlay.value = ''
  showSnackbar('Text added - drag to position it', 'success')
}

// Signature Management
const openSignatureDialog = () => {
  signaturePage.value = currentPage.value
  showSignatureDialog.value = true
}

const closeSignatureDialog = () => {
  showSignatureDialog.value = false
  selectedSavedSignature.value = null
  saveThisSignature.value = false
  sigText.value = ''
  uploadedSignaturePreview.value = ''
}

watch(() => showSignatureDialog.value, (val) => {
  if (val && sigTab.value === 'draw') {
    nextTick(() => {
      if (sigCanvas.value) {
        const ctx = sigCanvas.value.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, sigCanvas.value.width, sigCanvas.value.height)
        }
        
        signaturePad.value = new SignaturePad(sigCanvas.value, {
          backgroundColor: 'rgba(0, 0, 0, 0)',
          penColor: 'rgb(0, 0, 0)'
        })
      }
    })
  }
})

const clearSignature = () => signaturePad.value?.clear()

const handleSignatureFileUpload = () => {
  const files = uploadedSignatureFile.value
  if (files && files.length > 0 && files[0]) {
    const reader = new FileReader()
    reader.onload = (e) => {
      uploadedSignaturePreview.value = e.target?.result as string
    }
    reader.readAsDataURL(files[0])
  }
}

const selectSavedSignature = (signature: any) => {
  selectedSavedSignature.value = signature.id
}

const deleteSavedSignature = async (id: number) => {
  try {
    await $fetch(`/api/admin/signatures/${id}`, { 
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    showSnackbar('Signature deleted', 'success')
    await loadSignatures()
  } catch (error) {
    showSnackbar('Failed to delete signature', 'error')
  }
}

const addSignatureElement = async () => {
  applyingSignature.value = true
  try {
    let signatureData = ''
    let signatureType = ''
    let signatureName = ''

    if (selectedSavedSignature.value) {
      const savedSig = savedSignatures.value.find(s => s.id === selectedSavedSignature.value)
      if (savedSig) {
        signatureData = savedSig.signatureData
        signatureType = savedSig.type
      }
    } else {
      if (sigTab.value === 'draw' && signaturePad.value && !signaturePad.value.isEmpty()) {
        signatureData = signaturePad.value.toDataURL()
        signatureType = 'draw'
        signatureName = 'Signature ' + new Date().toLocaleString()
      } else if (sigTab.value === 'type' && sigText.value) {
        signatureData = sigText.value
        signatureType = 'type'
        signatureName = sigText.value
      } else if (sigTab.value === 'upload' && uploadedSignaturePreview.value) {
        signatureData = uploadedSignaturePreview.value
        signatureType = 'upload'
        signatureName = 'Signature ' + new Date().toLocaleString()
      }

      if (saveThisSignature.value && signatureData && signatureType) {
        try {
          await $fetch('/api/admin/signatures', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: {
              name: signatureName,
              type: signatureType,
              signatureData: signatureData,
              isDefault: false
            }
          })
          await loadSignatures()
        } catch (error) {
          console.error('Failed to save signature:', error)
        }
      }
    }

    if (signatureData) {
      signatureElements.value.push({
        page: signaturePage.value,
        data: signatureData,
        type: signatureType,
        x: 100,
        y: 100,
        width: 200,
        height: 80
      })
      
      showSnackbar('Signature added - drag to position and resize', 'success')
    }

    closeSignatureDialog()
  } catch (error) {
    console.error('Add signature error:', error)
    showSnackbar('Failed to add signature', 'error')
  } finally {
    applyingSignature.value = false
  }
}

// Drag and Drop
const selectElement = (elementId: string, element: any) => {
  selectedElement.value = elementId
  currentDragElement.value = element
}

const startDrag = (event: MouseEvent, type: string, index: number) => {
  event.preventDefault()
  isDragging.value = true
  
  const elements = type === 'text' ? textElements.value : signatureElements.value
  currentDragElement.value = elements[index]
  selectedElement.value = `${type === 'text' ? 'text' : 'sig'}-${index}`
  
  dragStart.value = {
    x: event.clientX - currentDragElement.value.x * scale.value,
    y: event.clientY - currentDragElement.value.y * scale.value
  }
  
  document.addEventListener('mousemove', handleDragMove)
  document.addEventListener('mouseup', stopDrag)
}

const handleDragMove = (event: MouseEvent) => {
  if (!isDragging.value || !currentDragElement.value) return
  
  const newX = (event.clientX - dragStart.value.x) / scale.value
  const newY = (event.clientY - dragStart.value.y) / scale.value
  
  currentDragElement.value.x = Math.max(0, newX)
  currentDragElement.value.y = Math.max(0, newY)
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', handleDragMove)
  document.removeEventListener('mouseup', stopDrag)
}

// Resize
const startResize = (event: MouseEvent, index: number) => {
  event.preventDefault()
  event.stopPropagation()
  isResizing.value = true
  currentDragElement.value = signatureElements.value[index]
  
  dragStart.value = {
    x: event.clientX,
    y: event.clientY
  }
  
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
}

const handleResize = (event: MouseEvent) => {
  if (!isResizing.value || !currentDragElement.value) return
  
  const deltaX = (event.clientX - dragStart.value.x) / scale.value
  const deltaY = (event.clientY - dragStart.value.y) / scale.value
  
  currentDragElement.value.width = Math.max(50, currentDragElement.value.width + deltaX)
  currentDragElement.value.height = Math.max(30, currentDragElement.value.height + deltaY)
  
  dragStart.value = {
    x: event.clientX,
    y: event.clientY
  }
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}

const deleteElement = (type: string, index: number) => {
  if (type === 'text') {
    textElements.value.splice(index, 1)
  } else {
    signatureElements.value.splice(index, 1)
  }
  selectedElement.value = null
}

// Search
const searchPdf = async () => {
  if (!pdfDocument || !searchQuery.value) return
  
  searchResults.value = []
  
  for (let i = 1; i <= totalPages.value; i++) {
    const page = await pdfDocument.getPage(i)
    const textContent = await page.getTextContent()
    const text = textContent.items.map((item: any) => item.str).join(' ')
    
    if (text.toLowerCase().includes(searchQuery.value.toLowerCase())) {
      searchResults.value.push({ page: i, text })
    }
  }
  
  if (searchResults.value.length > 0) {
    showSnackbar(`Found ${searchResults.value.length} results`, 'success')
  } else {
    showSnackbar('No results found', 'info')
  }
}

const goToSearchResult = (result: any) => {
  goToPageNumber(result.page)
  showSearchDialog.value = false
}

// Watermark
const addWatermark = async () => {
  if (!currentPdfDoc) return

  processing.value = true
  try {
    const pages = currentPdfDoc.getPages()
    const font = await currentPdfDoc.embedFont(StandardFonts.HelveticaBold)

    pages.forEach((page: any) => {
      const { width, height } = page.getSize()
      page.drawText('CONFIDENTIAL', {
        x: width / 4,
        y: height / 2,
        size: 50,
        font,
        color: rgb(0.9, 0.1, 0.1),
        opacity: 0.2,
        rotate: degrees(45),
      })
    })

    const pdfBytes = await currentPdfDoc.save()
    await loadPdfDocument(pdfBytes.buffer)
    showSnackbar('Watermark applied successfully', 'success')
  } catch (error) {
    console.error('Watermark error:', error)
    showSnackbar('Failed to apply watermark', 'error')
  } finally {
    processing.value = false
  }
}

// OCR
const runOCR = async () => {
  if (!canvasRefs.has(currentPage.value)) return

  ocrLoading.value = true
  ocrText.value = ''
  try {
    const canvas = canvasRefs.get(currentPage.value)
    if (!canvas) return
    
    const worker = await createWorker('eng')
    const { data: { text } } = await worker.recognize(canvas)
    ocrText.value = text
    await worker.terminate()
    showSnackbar('OCR completed', 'success')
  } catch (err) {
    console.error('OCR error:', err)
    showSnackbar('OCR failed', 'error')
  } finally {
    ocrLoading.value = false
  }
}

// Save
const savePdf = async () => {
  if (!currentPdfDoc || !activeDoc.value) return

  saving.value = true
  try {
    const pages = currentPdfDoc.getPages()
    
    // Add text elements
    for (const textEl of textElements.value) {
      const page = pages[textEl.page - 1]
      if (!page) continue
      
      let font
      try {
        if (textEl.fontFamily === 'Helvetica') {
          font = await currentPdfDoc.embedFont(StandardFonts.Helvetica)
        } else if (textEl.fontFamily === 'Times-Roman') {
          font = await currentPdfDoc.embedFont(StandardFonts.TimesRoman)
        } else if (textEl.fontFamily === 'Courier') {
          font = await currentPdfDoc.embedFont(StandardFonts.Courier)
        } else {
          font = await currentPdfDoc.embedFont(StandardFonts.Helvetica)
        }
      } catch (e) {
        font = await currentPdfDoc.embedFont(StandardFonts.Helvetica)
      }
      
      const color = hexToRgb(textEl.color)
      const pageHeight = page.getHeight()
      
      page.drawText(textEl.content, {
        x: textEl.x * 1.5,
        y: pageHeight - (textEl.y * 1.5) - textEl.fontSize,
        size: textEl.fontSize,
        font,
        color: rgb(color.r, color.g, color.b)
      })
    }
    
    // Add signature elements
    for (const sigEl of signatureElements.value) {
      const page = pages[sigEl.page - 1]
      if (!page) continue
      
      const pageHeight = page.getHeight()
      
      if (sigEl.type === 'draw' || sigEl.type === 'upload') {
        const signatureImage = await currentPdfDoc.embedPng(sigEl.data)
        page.drawImage(signatureImage, {
          x: sigEl.x * 1.5,
          y: pageHeight - (sigEl.y * 1.5) - (sigEl.height * 1.5),
          width: sigEl.width * 1.5,
          height: sigEl.height * 1.5,
        })
      } else if (sigEl.type === 'type') {
        const font = await currentPdfDoc.embedFont(StandardFonts.HelveticaBold)
        page.drawText(sigEl.data, {
          x: sigEl.x * 1.5,
          y: pageHeight - (sigEl.y * 1.5) - 40,
          size: 32,
          font,
          color: rgb(0, 0, 0)
        })
      }
    }

    const pdfBytes = await currentPdfDoc.save()
    const blob = new Blob([pdfBytes], { type: 'application/pdf' })
    const formData = new FormData()
    formData.append('file', blob, activeDoc.value.originalName)
    formData.append('status', 'signed')
    formData.append('isSigned', 'true')

    await $fetch(`/api/admin/documents/${activeDoc.value.id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: formData
    })

    showSnackbar('Document saved successfully', 'success')
    await loadDocuments()
    
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Signed_${activeDoc.value.originalName}`
    link.click()
    URL.revokeObjectURL(url)
    
    closeEditor()
  } catch (error) {
    console.error('Save error:', error)
    showSnackbar('Failed to save document', 'error')
  } finally {
    saving.value = false
  }
}

// Utilities
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1] || '00', 16) / 255,
    g: parseInt(result[2] || '00', 16) / 255,
    b: parseInt(result[3] || '00', 16) / 255
  } : { r: 0, g: 0, b: 0 }
}

// Document management
const downloadDocument = (doc: any) => {
  const link = document.createElement('a')
  link.href = doc.filePath
  link.download = doc.originalName
  link.click()
}

const confirmDelete = (doc: any) => {
  documentToDelete.value = doc
  showDeleteDialog.value = true
}

const deleteDocument = async () => {
  if (!documentToDelete.value) return

  deleting.value = true
  try {
    await $fetch(`/api/admin/documents/${documentToDelete.value.id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })

    showSnackbar('Document deleted successfully', 'success')
    await loadDocuments()
    showDeleteDialog.value = false
    documentToDelete.value = null
  } catch (error) {
    console.error('Delete error:', error)
    showSnackbar('Failed to delete document', 'error')
  } finally {
    deleting.value = false
  }
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    signed: 'success',
    pending: 'warning',
    draft: 'grey'
  }
  return colors[status] || 'grey'
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const showSnackbar = (message: string, color: string = 'success') => {
  snackbarText.value = message
  snackbarColor.value = color
  snackbar.value = true
}

const getFileExtension = (filename: string) => {
  return filename.split('.').pop()?.toUpperCase() || ''
}

// File Converter
const convertFileToPdf = async () => {
  if (converterFile.value.length === 0) return

  converting.value = true
  try {
    const file = converterFile.value[0]
    if (!file) {
      throw new Error('No file selected')
    }
    
    const fileName = file.name
    const fileType = fileName.split('.').pop()?.toLowerCase()

    let pdfBytes: ArrayBuffer

    if (fileType === 'docx' || fileType === 'doc') {
      const arrayBuffer = await file.arrayBuffer()
      pdfBytes = await convertDocxToPdf(arrayBuffer)
    } else if (fileType === 'jpg' || fileType === 'jpeg' || fileType === 'png') {
      pdfBytes = await convertImageToPdf(file)
    } else if (fileType === 'txt') {
      const text = await file.text()
      pdfBytes = await convertTextToPdf(text)
    } else {
      throw new Error('Unsupported file type')
    }

    const blob = new Blob([pdfBytes], { type: 'application/pdf' })
    const pdfFileName = fileName.replace(/\.[^/.]+$/, '') + '.pdf'
    
    const formData = new FormData()
    formData.append('file', blob, pdfFileName)

    const response: any = await $fetch('/api/admin/documents', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData
    })

    if (response.success) {
      showSnackbar('File converted to PDF successfully!', 'success')
      await loadDocuments()
      showConverterDialog.value = false
      converterFile.value = []
      
      if (response.document) {
        openEditor(response.document)
      }
    }
  } catch (error: any) {
    console.error('Conversion error:', error)
    showSnackbar(error.message || 'Failed to convert file', 'error')
  } finally {
    converting.value = false
  }
}

const convertImageToPdf = async (imageFile: File): Promise<ArrayBuffer> => {
  const pdfDoc = await PDFDocument.create()
  
  const imageBytes = await imageFile.arrayBuffer()
  const fileType = imageFile.name.split('.').pop()?.toLowerCase() || ''
  
  let image
  if (fileType === 'jpg' || fileType === 'jpeg') {
    image = await pdfDoc.embedJpg(imageBytes)
  } else if (fileType === 'png') {
    image = await pdfDoc.embedPng(imageBytes)
  } else {
    throw new Error('Unsupported image format')
  }
  
  const imageDims = image.scale(1)
  
  const page = pdfDoc.addPage([imageDims.width, imageDims.height])
  
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: imageDims.width,
    height: imageDims.height,
  })
  
  const pdfBytes = await pdfDoc.save()
  return pdfBytes.buffer as ArrayBuffer
}

const convertTextToPdf = async (text: string): Promise<ArrayBuffer> => {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  
  const pageWidth = 595
  const pageHeight = 842
  const fontSize = 12
  const lineHeight = fontSize * 1.5
  const margin = 50
  const maxWidth = pageWidth - (margin * 2)
  
  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin
  
  const lines = text.split('\n')
  
  for (const line of lines) {
    if (!line.trim()) {
      y -= lineHeight
      if (y < margin) {
        page = pdfDoc.addPage([pageWidth, pageHeight])
        y = pageHeight - margin
      }
      continue
    }
    
    const words = line.split(' ')
    let currentLine = ''
    
    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word
      const width = font.widthOfTextAtSize(testLine, fontSize)
      
      if (width > maxWidth && currentLine) {
        page.drawText(currentLine, {
          x: margin,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        })
        currentLine = word
        y -= lineHeight
        
        if (y < margin) {
          page = pdfDoc.addPage([pageWidth, pageHeight])
          y = pageHeight - margin
        }
      } else {
        currentLine = testLine
      }
    }
    
    if (currentLine) {
      page.drawText(currentLine, {
        x: margin,
        y,
        size: fontSize,
        font,
        color: rgb(0, 0, 0)
      })
      y -= lineHeight
      
      if (y < margin) {
        page = pdfDoc.addPage([pageWidth, pageHeight])
        y = pageHeight - margin
      }
    }
  }
  
  const pdfBytes = await pdfDoc.save()
  return pdfBytes.buffer as ArrayBuffer
}

onMounted(async () => {
  await Promise.all([loadDocuments(), loadSignatures()])
})
</script>

<style scoped>
/* Premium Background & Layout */
.premium-bg {
  background: linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%);
  min-height: 100vh;
}

.dashboard-container {
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Glass Card Effect */
.glass-card {
  background: rgba(255, 255, 255, 0.85) !important;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.15) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.glass-card:hover {
  box-shadow: 0 12px 40px rgba(31, 38, 135, 0.25) !important;
  transform: translateY(-2px);
}

.stat-card {
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #1976D2, #64B5F6);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.stat-card:hover::before {
  opacity: 1;
}

.premium-avatar {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Premium Table */
.premium-table {
  background: transparent !important;
}

.table-header-row {
  background: linear-gradient(180deg, rgba(249, 250, 251, 0.8), rgba(243, 244, 246, 0.8)) !important;
  backdrop-filter: blur(10px);
}

.table-header-row th {
  border-bottom: 2px solid rgba(25, 118, 210, 0.2) !important;
  padding: 16px !important;
}

.document-row {
  transition: all 0.2s ease;
  cursor: pointer;
}

.document-row:hover {
  background: linear-gradient(90deg, rgba(25, 118, 210, 0.03), rgba(25, 118, 210, 0.08)) !important;
  transform: translateX(4px);
}

/* Editor Workspace */
.editor-workspace {
  background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
}

.glass-toolbar {
  background: rgba(255, 255, 255, 0.9) !important;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08) !important;
  width: 100% !important;
  /*margin-left:-100px !important;*/
}

.toolbar-btn {
  transition: all 0.2s ease;
}

.toolbar-btn:hover {
  background: rgba(25, 118, 210, 0.1);
  transform: scale(1.05);
}

.page-nav-group {
  background: rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  padding: 4px 8px;
  backdrop-filter: blur(10px);
}

.page-input input {
  text-align: center;
  font-weight: 600;
}

.zoom-controls {
  background: rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  overflow: hidden;
  backdrop-filter: blur(10px);
}

.zoom-display {
  font-weight: 600;
  letter-spacing: 0.5px;
}

/* Glass Sidebar */
.glass-sidebar {
  width: 280px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-right: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 4px 0 24px rgba(31, 38, 135, 0.1);
  overflow-y: auto;
  overflow-x: hidden;
}

/* Custom Scrollbar - Premium Style */
.glass-sidebar::-webkit-scrollbar,
.pdf-viewer-container::-webkit-scrollbar,
.thumbnails-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.glass-sidebar::-webkit-scrollbar-track,
.pdf-viewer-container::-webkit-scrollbar-track,
.thumbnails-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.02);
  border-radius: 10px;
}

.glass-sidebar::-webkit-scrollbar-thumb,
.pdf-viewer-container::-webkit-scrollbar-thumb,
.thumbnails-container::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(25, 118, 210, 0.5), rgba(25, 118, 210, 0.7));
  border-radius: 10px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
}

.glass-sidebar::-webkit-scrollbar-thumb:hover,
.pdf-viewer-container::-webkit-scrollbar-thumb:hover,
.thumbnails-container::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(25, 118, 210, 0.7), rgba(25, 118, 210, 0.9));
  border-color: rgba(255, 255, 255, 0.5);
}

.sidebar-list .v-list-item {
  border-radius: 8px;
  margin: 4px 8px;
  transition: all 0.2s ease;
}

.sidebar-list .v-list-item:hover {
  background: rgba(25, 118, 210, 0.08);
  transform: translateX(4px);
}

/* Canvas Workspace */
.canvas-workspace {
  background: 
    linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(135deg, #dfe4ea 0%, #cbd5e1 100%);
  background-size: 20px 20px, 20px 20px, 100% 100%;
  position: relative;
}

.pdf-viewer-container {
  overflow-y: auto;
  overflow-x: auto;
  position: relative;
}

.pdf-pages-wrapper {
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform-origin: top center;
  transition: transform 0.2s ease;
}

.pdf-page-container {
  background: white;
  box-shadow: 
    0 10px 40px rgba(0, 0, 0, 0.12),
    0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 20px;
  border-radius: 4px;
  overflow: hidden;
  transition: box-shadow 0.3s ease;
}

.pdf-page-container:hover {
  box-shadow: 
    0 15px 50px rgba(0, 0, 0, 0.15),
    0 4px 12px rgba(0, 0, 0, 0.1);
}

.pdf-page-container canvas {
  display: block;
}

.pdf-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

/* Thumbnails */
.thumbnails-container {
  overflow-y: auto;
  max-height: calc(100vh - 400px);
}

.page-thumbnail {
  border: 2px solid transparent;
  border-radius: 8px;
  padding: 6px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: rgba(255, 255, 255, 0.4);
}

.page-thumbnail:hover {
  border-color: rgba(25, 118, 210, 0.5);
  background: rgba(25, 118, 210, 0.08);
  transform: scale(1.03);
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.15);
}

.page-thumbnail.active-page {
  border-color: #1976D2;
  background: rgba(25, 118, 210, 0.12);
  box-shadow: 0 4px 16px rgba(25, 118, 210, 0.25);
}

.thumbnail-preview {
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.thumbnail-canvas {
  max-width: 100%;
  height: auto;
}

.thumbnail-label {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
}

/* Draggable Elements - Premium */
.premium-element {
  transition: all 0.2s ease;
}

.draggable-text-element {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.draggable-text-element.selected {
  box-shadow: 0 4px 20px rgba(25, 118, 210, 0.3);
}

.draggable-signature-element {
  background: transparent !important;
}

.draggable-signature-element.selected {
  background-image: 
    linear-gradient(45deg, rgba(224, 224, 224, 0.3) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(224, 224, 224, 0.3) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(224, 224, 224, 0.3) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(224, 224, 224, 0.3) 75%) !important;
  background-size: 10px 10px !important;
  background-position: 0 0, 0 5px, 5px -5px, -5px 0px !important;
  box-shadow: 0 4px 20px rgba(25, 118, 210, 0.3);
}

.draggable-text-element.selected,
.draggable-signature-element.selected {
  z-index: 1000;
}

.element-controls {
  position: absolute;
  top: -32px;
  right: 0;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 2px;
}

.resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 18px;
  height: 18px;
  background: linear-gradient(135deg, #1976D2, #42A5F5);
  cursor: nwse-resize;
  border-radius: 0 0 4px 0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
}

.resize-handle:hover {
  transform: scale(1.1);
}

.resize-handle::after {
  content: '';
  position: absolute;
  bottom: 3px;
  right: 3px;
  width: 8px;
  height: 8px;
  border-right: 2px solid white;
  border-bottom: 2px solid white;
}

/* Premium Dialogs */
.premium-dialog {
  background: rgba(255, 255, 255, 0.98) !important;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 20px 60px rgba(31, 38, 135, 0.3) !important;
}

.dialog-title {
  font-weight: 700;
  font-size: 1.25rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  padding: 20px 24px !important;
}

/* Signature Canvas */
.premium-signature-pad {
  background-image: 
    linear-gradient(45deg, #f8f9fa 25%, transparent 25%),
    linear-gradient(-45deg, #f8f9fa 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #f8f9fa 75%),
    linear-gradient(-45deg, transparent 75%, #f8f9fa 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
}

.premium-signature-pad::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border: 2px solid rgba(25, 118, 210, 0.15);
  border-radius: 8px;
  pointer-events: none;
}

.signature-canvas-container canvas {
  cursor: crosshair;
  width: 100%;
  display: block;
}

.preview-text-sig {
  font-family: 'Dancing Script', cursive;
  font-size: 48px;
  text-align: center;
  border: 2px dashed rgba(25, 118, 210, 0.3);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.9));
  padding: 20px;
  color: #1a237e;
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.cursor-pointer {
  cursor: pointer;
}

.signature-preview-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
}

.signature-preview-card:hover {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 6px 20px rgba(25, 118, 210, 0.2);
  transform: translateY(-2px);
}

.selected-signature {
  border-color: rgb(var(--v-theme-primary)) !important;
  border-width: 2px !important;
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.08), rgba(var(--v-theme-primary), 0.12)) !important;
  box-shadow: 0 8px 24px rgba(25, 118, 210, 0.25) !important;
}

.signature-img-preview, .signature-text-preview {
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.signature-text-preview {
  font-family: 'Dancing Script', cursive;
  font-size: 24px;
  color: #1a237e;
}

.color-picker {
  width: 100%;
  height: 40px;
  border: 2px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.color-picker:hover {
  border-color: rgb(var(--v-theme-primary));
}

.text-preview {
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border: 1px solid rgba(0, 0, 0, 0.08);
  min-height: 80px;
  border-radius: 8px;
}
</style>