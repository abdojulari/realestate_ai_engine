<template>
  <FeatureGate :feature="FEATURES.DOCUMENTS" :show-upgrade-prompt="true">
  <v-container fluid class="fill-height pa-0 premium-bg">
    <!-- ─── Dashboard View ──────────────────────────────── -->
    <v-fade-transition hide-on-leave>
      <div v-if="!editor.isEditing.value" class="w-100 docs-dashboard pa-6 pa-md-10 dashboard-container">
        <!-- Hero -->
        <v-row class="mb-8 align-center" align="center">
          <v-col cols="12" lg="7">
            <div class="d-flex align-center mb-3">
              <div class="docs-hero-accent mr-4" />
              <span class="text-overline letter-spacing-1 text-primary font-weight-bold">Document workspace</span>
            </div>
            <h1 class="text-h3 text-md-h2 font-weight-bold docs-hero-title mb-3">
              Manage, sign &amp; send with confidence
            </h1>
            <p class="text-body-1 text-medium-emphasis docs-hero-sub max-w-lg">
              Upload PDFs and Word files, annotate in the editor, run AI contract review when enabled, and send
              <strong class="text-high-emphasis">remote signature</strong> requests through Verdocs — similar to DocuSign-style workflows.
            </p>
          </v-col>
          <v-col cols="12" lg="5" class="text-lg-right">
            <v-btn
              color="primary"
              size="x-large"
              rounded="xl"
              class="docs-cta-btn px-8"
              prepend-icon="mdi-cloud-upload-outline"
              :loading="uploading"
              @click="triggerFileUpload"
            >
              Upload document
            </v-btn>
            <p class="text-caption text-medium-emphasis mt-3 mb-0">PDF, DOCX · up to 50&nbsp;MB</p>
            <input type="file" ref="fileInput" class="d-none" accept=".pdf,.docx" @change="handleFileUpload" />
          </v-col>
        </v-row>

        <!-- Workflow + Verdocs -->
        <v-row class="mb-8">
          <v-col cols="12" lg="7">
            <v-card class="docs-panel pa-6" rounded="xl" elevation="0">
              <div class="d-flex align-center mb-4">
                <v-icon icon="mdi-routes" color="primary" class="mr-2" />
                <span class="text-subtitle-1 font-weight-bold">Typical workflow</span>
              </div>
              <v-row dense>
                <v-col v-for="(step, i) in workflowSteps" :key="i" cols="12" sm="4">
                  <div class="workflow-step pa-4 rounded-xl h-100">
                    <div class="step-index mb-2">{{ i + 1 }}</div>
                    <div class="d-flex align-center mb-2">
                      <v-icon :icon="step.icon" size="22" class="mr-2 text-primary" />
                      <span class="text-body-2 font-weight-bold">{{ step.title }}</span>
                    </div>
                    <p class="text-caption text-medium-emphasis mb-0">{{ step.text }}</p>
                  </div>
                </v-col>
              </v-row>
            </v-card>
          </v-col>
          <v-col cols="12" lg="5">
            <v-card
              class="docs-panel pa-6 verdocs-panel h-100"
              rounded="xl"
              elevation="0"
              :class="{ 'verdocs-off': !verdocsConfigured }"
            >
              <div class="d-flex align-center mb-3">
                <v-avatar color="deep-purple" variant="flat" size="44" class="mr-3">
                  <v-icon icon="mdi-file-sign" color="white" size="26" />
                </v-avatar>
                <div>
                  <div class="text-subtitle-1 font-weight-bold">Remote signing</div>
                  <div class="text-caption text-medium-emphasis">Verdocs e‑sign</div>
                </div>
              </div>
              <p class="text-body-2 text-medium-emphasis mb-4">
                Add signers with name, email, and phone. We create the envelope in Verdocs and return signing links.
              </p>
              <v-chip
                :color="verdocsConfigured ? 'success' : 'warning'"
                variant="flat"
                size="small"
                class="font-weight-bold"
              >
                <v-icon start size="16">{{ verdocsConfigured ? 'mdi-check-circle' : 'mdi-alert-circle-outline' }}</v-icon>
                {{ verdocsConfigured ? 'Connected' : 'Configure credentials' }}
              </v-chip>
            </v-card>
          </v-col>
        </v-row>

        <v-row v-if="canUseDocumentsLegalReview" class="mb-8">
          <v-col cols="12">
            <v-card class="docs-panel legal-strip pa-5" rounded="xl" elevation="0">
              <div class="d-flex flex-wrap align-center gap-4">
                <div class="d-flex align-center">
                  <v-avatar color="primary" variant="flat" size="48" class="mr-3">
                    <v-icon icon="mdi-gavel" size="28" color="white" />
                  </v-avatar>
                  <div>
                    <div class="text-subtitle-1 font-weight-bold">Contract &amp; legal intelligence</div>
                    <div class="text-caption text-medium-emphasis">AI review, red flags, and email reminders for critical dates.</div>
                  </div>
                </div>
                <v-spacer />
                <div class="d-flex flex-wrap ga-2">
                  <v-chip prepend-icon="mdi-robot-outline" variant="tonal" color="primary" size="small">Legal review</v-chip>
                  <v-chip prepend-icon="mdi-calendar-clock" variant="tonal" color="primary" size="small">Date alerts</v-chip>
                  <v-chip prepend-icon="mdi-file-document-outline" variant="tonal" color="primary" size="small">Summary</v-chip>
                </div>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <!-- KPI stats -->
        <v-row class="mb-8">
          <v-col cols="12" md="4" v-for="stat in stats" :key="stat.title">
            <v-card rounded="xl" elevation="0" class="pa-5 docs-kpi h-100">
              <div class="d-flex align-center justify-space-between">
                <div>
                  <div class="text-overline text-medium-emphasis font-weight-bold letter-spacing-1">{{ stat.title }}</div>
                  <div class="text-h4 font-weight-bold mt-1">{{ stat.value }}</div>
                  <div v-if="stat.hint" class="text-caption text-medium-emphasis mt-1">{{ stat.hint }}</div>
                </div>
                <v-avatar :class="'kpi-orb kpi-orb--' + stat.tone" size="56" rounded="xl">
                  <v-icon :icon="stat.icon" size="28" />
                </v-avatar>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <!-- Document table -->
        <v-card rounded="xl" elevation="0" class="docs-table-card overflow-hidden">
          <div class="docs-table-head pa-6 pa-md-8 d-flex flex-wrap align-center gap-4">
            <div>
              <h2 class="text-h5 font-weight-bold mb-1">Your documents</h2>
              <p class="text-body-2 text-medium-emphasis mb-0">Open the editor, send for signature, or share by email.</p>
            </div>
            <v-spacer />
            <v-text-field
              v-model="docSearch"
              density="comfortable"
              variant="outlined"
              placeholder="Search by name…"
              prepend-inner-icon="mdi-magnify"
              hide-details
              clearable
              class="docs-search"
              rounded="lg"
            />
          </div>
          <v-divider class="opacity-10" />
          <v-table hover class="docs-table">
            <thead>
              <tr>
                <th class="text-overline font-weight-bold">Document</th>
                <th class="text-overline text-center font-weight-bold d-none d-md-table-cell">E‑sign</th>
                <th class="text-overline text-center font-weight-bold">Type</th>
                <th class="text-overline text-center font-weight-bold">Status</th>
                <th class="text-overline text-center font-weight-bold d-none d-sm-table-cell">Size</th>
                <th class="text-overline text-right font-weight-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="6" class="text-center py-12">
                  <v-progress-circular indeterminate color="primary" size="48" />
                </td>
              </tr>
              <tr v-else-if="filteredDocuments.length === 0">
                <td colspan="6" class="text-center py-12 text-medium-emphasis">
                  <v-icon icon="mdi-folder-open-outline" size="48" class="mb-2 opacity-40" />
                  <div>No documents match your search. Upload a file to get started.</div>
                </td>
              </tr>
              <tr v-else v-for="doc in filteredDocuments" :key="doc.id" class="docs-row">
                <td>
                  <div class="d-flex align-center py-2">
                    <div class="file-type-badge mr-4" :class="doc.type === 'pdf' ? 'is-pdf' : 'is-doc'">
                      <v-icon :icon="doc.type === 'pdf' ? 'mdi-file-pdf-box' : 'mdi-file-word-box'" size="26" />
                    </div>
                    <div class="min-width-0">
                      <div class="font-weight-semibold text-body-1 text-truncate">{{ doc.originalName }}</div>
                      <div class="text-caption text-medium-emphasis">{{ editor.formatDate(doc.createdAt) }}</div>
                    </div>
                  </div>
                </td>
                <td class="text-center d-none d-md-table-cell">
                  <v-chip
                    v-if="verdocsStatus(doc)"
                    size="x-small"
                    variant="flat"
                    color="deep-purple"
                    class="font-weight-medium"
                  >
                    {{ verdocsStatus(doc) }}
                  </v-chip>
                  <span v-else class="text-caption text-disabled">—</span>
                </td>
                <td class="text-center">
                  <v-chip size="small" variant="tonal" class="text-uppercase font-weight-bold">{{ doc.type }}</v-chip>
                </td>
                <td class="text-center">
                  <v-chip :color="editor.getStatusColor(doc.status)" size="small" variant="flat" class="font-weight-medium text-capitalize">
                    {{ doc.status }}
                  </v-chip>
                </td>
                <td class="text-center text-body-2 text-medium-emphasis d-none d-sm-table-cell">
                  {{ editor.formatFileSize(doc.fileSize) }}
                </td>
                <td class="text-right">
                  <v-menu location="bottom end">
                    <template #activator="{ props: menuProps }">
                      <v-btn
                        v-bind="menuProps"
                        variant="flat"
                        color="primary"
                        size="small"
                        rounded="lg"
                        append-icon="mdi-chevron-down"
                        class="text-none font-weight-bold"
                      >
                        Actions
                      </v-btn>
                    </template>
                    <v-list density="compact" class="docs-action-menu py-2" min-width="240" rounded="lg">
                      <v-list-subheader class="text-uppercase">Open &amp; export</v-list-subheader>
                      <v-list-item prepend-icon="mdi-pencil-outline" title="Open in editor" @click="handleOpenEditor(doc)" />
                      <v-list-item prepend-icon="mdi-download-outline" title="Download" @click="downloadDocument(doc)" />
                      <v-divider class="my-2" />
                      <v-list-subheader class="text-uppercase">Share</v-list-subheader>
                      <v-list-item
                        prepend-icon="mdi-email-send-outline"
                        title="Email to CRM contact"
                        @click="emailDoc = doc; showEmailDialog = true"
                      />
                      <v-list-item
                        v-if="verdocsConfigured && doc.type === 'pdf'"
                        prepend-icon="mdi-file-sign"
                        title="Send for signature (Verdocs)"
                        subtitle="Remote signing links"
                        @click="verdocsTargetDoc = doc; showVerdocsDialog = true"
                      />
                      <template v-if="canUseDocumentsLegalReview && doc.type === 'pdf'">
                        <v-divider class="my-2" />
                        <v-list-subheader class="text-uppercase">Legal</v-list-subheader>
                        <v-list-item
                          prepend-icon="mdi-gavel"
                          title="Run AI legal review"
                          :disabled="legalReviewLoading && legalReviewDocId === doc.id"
                          @click="runLegalReview(doc)"
                        />
                        <v-list-item prepend-icon="mdi-file-document-outline" title="Legal advise &amp; alerts" @click="openLegalAdvise(doc)" />
                      </template>
                      <v-divider class="my-2" />
                      <v-list-item
                        prepend-icon="mdi-delete-outline"
                        title="Delete"
                        base-color="error"
                        @click="documentToDelete = doc; showDeleteDialog = true"
                      />
                    </v-list>
                  </v-menu>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </div>

      <!-- ─── PDF Editor View ─────────────────────────────── -->
      <v-container v-else fluid class="pa-0 fill-height d-flex flex-column editor-workspace" style="height: 100vh;">
        <!-- Toolbar -->
        <v-toolbar color="surface" elevation="0" density="compact" class="glass-toolbar">
          <v-btn icon="mdi-arrow-left" @click="editor.closeEditor()" variant="text" />
          <v-toolbar-title class="font-weight-bold text-truncate ml-2" style="max-width: 300px;">{{ editor.activeDoc.value?.originalName }}</v-toolbar-title>
          <v-spacer />
          <div class="d-flex align-center mx-4 page-nav-group">
            <v-btn icon="mdi-chevron-left" size="small" variant="text" @click="editor.previousPage()" :disabled="editor.currentPage.value <= 1" />
            <v-text-field v-model.number="editor.currentPage.value" type="number" density="compact" hide-details style="width: 60px;" class="mx-2 text-center" @keyup.enter="editor.goToPage()" />
            <span class="text-caption font-weight-medium">/ {{ editor.totalPages.value }}</span>
            <v-btn icon="mdi-chevron-right" size="small" variant="text" @click="editor.nextPage()" :disabled="editor.currentPage.value >= editor.totalPages.value" />
          </div>
          <v-btn-group density="compact" class="mx-2 zoom-controls">
            <v-btn icon="mdi-minus" size="small" @click="editor.zoomOut()" />
            <v-btn size="small" style="min-width: 70px;">{{ Math.round(editor.scale.value * 100) }}%</v-btn>
            <v-btn icon="mdi-plus" size="small" @click="editor.zoomIn()" />
          </v-btn-group>
          <v-btn variant="tonal" prepend-icon="mdi-file-convert" class="mr-2 text-body-2" @click="showConverterDialog = true">Convert to PDF</v-btn>
          <v-btn color="primary" variant="flat" prepend-icon="mdi-content-save" class="mr-5 text-body-2" @click="handleSave" :loading="editor.saving.value">Save PDF</v-btn>
        </v-toolbar>

        <!-- Main Area -->
        <div class="flex-grow-1 d-flex" style="overflow: hidden;">
          <!-- Sidebar -->
          <div class="glass-sidebar">
            <!-- Legal Pane -->
            <div v-if="canUseDocumentsLegalReview && editor.activeDoc.value?.type === 'pdf'" class="legal-pane">
              <div class="d-flex align-center gap-2 mb-2"><v-icon icon="mdi-gavel" size="24" color="primary" /><span class="font-weight-bold" style="font-size:.95rem">Contract & Legal</span></div>
              <p class="text-caption mb-3" style="color:rgba(0,0,0,.7); line-height:1.4">Review terms, get AI advice, and set email reminders for important dates.</p>
              <v-btn block color="primary" variant="flat" prepend-icon="mdi-gavel" size="small" class="mb-2" @click="runLegalReview(editor.activeDoc.value, editor.ocrText.value)" :loading="legalReviewLoading && legalReviewDocId === editor.activeDoc.value?.id">Legal Review</v-btn>
              <v-btn block variant="tonal" prepend-icon="mdi-file-document-outline" size="small" class="mb-2" @click="openLegalAdvise(editor.activeDoc.value)">Legal Advise</v-btn>
              <p class="text-caption text-grey mt-2 mb-0">After review, open Legal Advise to see red flags, summary, and set date reminders.</p>
            </div>

            <v-list density="compact" nav class="sidebar-list">
              <v-list-subheader>TOOLS</v-list-subheader>
              <v-list-item prepend-icon="mdi-format-text" title="Add Text" @click="showTextDialog = true" />
              <v-list-item prepend-icon="mdi-signature" title="Add Signature" @click="showSignatureDialog = true" />
              <v-list-item prepend-icon="mdi-draw" title="Markup & Annotate" @click="showMarkupDialog = true" />
              <v-list-item prepend-icon="mdi-watermark" title="Watermark" @click="handleWatermark" :loading="editor.processing.value" />
              <v-list-item prepend-icon="mdi-text-box-search-outline" title="OCR Extract (Page)" @click="handleOCR" :disabled="editor.ocrLoading.value" />
              <v-list-item prepend-icon="mdi-file-document-multiple" title="OCR All Pages" @click="handleOCRAll" :disabled="editor.ocrLoading.value" />
              <v-list-item prepend-icon="mdi-magnify" title="Search PDF" @click="showSearchDialog = true" />
              <v-list-item prepend-icon="mdi-file-convert" title="Convert to PDF" @click="showConverterDialog = true" />
            </v-list>

            <v-divider class="my-2" />

            <!-- Thumbnails -->
            <div class="pa-2" style="overflow-y:auto; max-height:calc(100vh - 400px);">
              <div class="text-caption font-weight-bold mb-2 px-2">PAGES</div>
              <div v-for="p in editor.totalPages.value" :key="p" class="page-thumbnail mb-2 cursor-pointer" :class="{ 'active-page': p === editor.currentPage.value }" @click="editor.goToPageNumber(p)">
                <div class="text-center pa-1">
                  <div class="thumbnail-preview"><canvas :ref="el => editor.setThumbnailRef(el, p)" class="thumbnail-canvas"></canvas></div>
                  <div class="text-caption mt-1" style="font-weight:600; color:rgba(0,0,0,.7)">{{ p }}</div>
                </div>
              </div>
            </div>

            <!-- OCR Results -->
            <div class="pa-4">
              <v-divider class="mb-2" />
              <div class="text-caption font-weight-bold mb-2">EXTRACTED TEXT:</div>
              <v-select v-model="editor.ocrPage.value" :items="Array.from({ length: editor.totalPages.value }, (_, i) => ({ title: `Page ${i + 1}`, value: i + 1 }))" label="OCR Page" variant="outlined" density="compact" class="mb-3" :disabled="editor.totalPages.value === 0" />
              <div class="text-caption" style="max-height: 200px; overflow-y: auto; word-break: break-word;">{{ editor.ocrText.value || 'No OCR results yet.' }}</div>
            </div>
          </div>

          <!-- Canvas -->
          <div class="flex-grow-1 canvas-workspace" style="overflow:auto; position:relative;" ref="pdfViewerContainer">
            <div class="pdf-pages-wrapper" :style="{ transform: `scale(${editor.scale.value})` }">
              <div v-for="pageNum in editor.totalPages.value" :key="`page-${pageNum}`" :id="`page-${pageNum}`" class="pdf-page-container mb-4" style="position:relative">
                <canvas :ref="el => editor.setCanvasRef(el, pageNum)"></canvas>

                <!-- Text Elements -->
                <div v-for="(text, index) in editor.textElements.value.filter(t => t.page === pageNum)" :key="`text-${index}`"
                  class="draggable-text-element" :class="{ selected: editor.selectedElement.value === `text-${index}` }"
                  :style="{ position:'absolute', left:text.x+'px', top:text.y+'px', fontSize:text.fontSize+'px', fontFamily:text.fontFamily, color:text.color, cursor:'move', userSelect:'none', border: editor.selectedElement.value === `text-${index}` ? '2px dashed #1976D2' : '2px dashed transparent', padding:'4px', minWidth:'50px', transform:`scale(${1/editor.scale.value})` }"
                  @mousedown="editor.startDrag($event, 'text', index)" @click="editor.selectElement(`text-${index}`, text)">
                  {{ text.content }}
                  <div v-if="editor.selectedElement.value === `text-${index}`" class="element-controls">
                    <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" @click.stop="editor.deleteElement('text', index)" />
                  </div>
                </div>

                <!-- Signature Elements -->
                <div v-for="(sig, index) in editor.signatureElements.value.filter(s => s.page === pageNum)" :key="`sig-${index}`"
                  class="draggable-signature-element" :class="{ selected: editor.selectedElement.value === `sig-${index}` }"
                  :style="{ position:'absolute', left:sig.x+'px', top:sig.y+'px', width:sig.width+'px', height:sig.height+'px', cursor:'move', border: editor.selectedElement.value === `sig-${index}` ? '2px solid #1976D2' : '2px solid transparent', transform:`scale(${1/editor.scale.value})` }"
                  @mousedown="editor.startDrag($event, 'signature', index)" @click="editor.selectElement(`sig-${index}`, sig)">
                  <img v-if="sig.type === 'draw' || sig.type === 'upload'" :src="sig.data" style="width:100%; height:100%; object-fit:contain; background:transparent;" />
                  <div v-else style="font-family:'Dancing Script',cursive; font-size:32px; display:flex; align-items:center; justify-content:center; height:100%; background:transparent;">{{ sig.data }}</div>
                  <div v-if="editor.selectedElement.value === `sig-${index}`" class="resize-handle" @mousedown.stop="editor.startResize($event, index)"></div>
                  <div v-if="editor.selectedElement.value === `sig-${index}`" class="element-controls">
                    <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" @click.stop="editor.deleteElement('signature', index)" />
                  </div>
                </div>
              </div>
            </div>
            <div v-if="editor.loadingPdf.value" class="pdf-loading-overlay">
              <v-progress-circular indeterminate color="primary" size="64" /><div class="mt-4">Loading PDF...</div>
            </div>
          </div>
        </div>
      </v-container>
    </v-fade-transition>

    <!-- ─── Dialogs ─────────────────────────────────────── -->
    <AddTextDialog v-model="showTextDialog" :total-pages="editor.totalPages.value" :current-page="editor.currentPage.value" @add-text="onAddText" />
    <SignatureDialog v-model="showSignatureDialog" :total-pages="editor.totalPages.value" :current-page="editor.currentPage.value" :saved-signatures="savedSignatures" @add-signature="onAddSignature" @delete-signature="onDeleteSignature" />
    <SearchPdfDialog v-model="showSearchDialog" :results="editor.searchResults.value" @search="onSearch" @go-to-result="onGoToSearchResult" />
    <DeleteDocumentDialog v-model="showDeleteDialog" :document="documentToDelete" :loading="deleting" @confirm="deleteDocument" />
    <FileConverterDialog v-model="showConverterDialog" :loading="converting" @convert="convertFile" />
    <LegalAdviseDialog v-model="showLegalAdviseDialog" :doc="legalAdviseDoc" :review-data="legalReviewData" :loading="legalReviewLoading" :date-alerts="dateAlertItems" :saving-alerts="savingAlerts" @save-alerts="saveDateAlerts" />
    <EmailDocumentDialog v-model="showEmailDialog" :doc="emailDoc" @sent="showSnackbar('Document emailed successfully', 'success')" />
    <SendForSignatureDialog
      v-model="showVerdocsDialog"
      :doc="verdocsTargetDoc"
      :auth-headers="editor.getAuthHeaders()"
      @sent="onVerdocsSent"
    />
    <PdfMarkupDialog v-model="showMarkupDialog" :total-pages="editor.totalPages.value" :current-page="editor.currentPage.value" :canvas-refs="editor.canvasRefs" @apply-markup="onApplyMarkup" />

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">{{ snackbarText }}</v-snackbar>
  </v-container>
  </FeatureGate>
</template>

<script setup lang="ts">
import FeatureGate from '~/components/FeatureGate.vue'
import SendForSignatureDialog from '~/components/documents/SendForSignatureDialog.vue'
import { FEATURES } from '~/composables/useLicense'
import { useDocumentEditor } from '~/composables/useDocumentEditor'

definePageMeta({ layout: 'admin', middleware: ['admin'] })

// ─── Composable ──────────────────────────────────────────
const editor = useDocumentEditor()

// ─── Dashboard state ─────────────────────────────────────
const documents = ref<any[]>([])
const loading = ref(false)
const uploading = ref(false)
const deleting = ref(false)
const converting = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const pdfViewerContainer = ref<HTMLDivElement | null>(null)
const documentToDelete = ref<any>(null)
const savedSignatures = ref<any[]>([])
const stats = ref([
  { title: 'Total documents', value: 0, icon: 'mdi-file-document-multiple-outline', tone: 'blue' as const, hint: 'All files in your workspace' },
  { title: 'Signed', value: 0, icon: 'mdi-signature-freehand', tone: 'green' as const, hint: 'Marked complete / executed' },
  { title: 'Pending', value: 0, icon: 'mdi-clock-outline', tone: 'amber' as const, hint: 'Drafts & in progress' },
])

const workflowSteps = [
  { icon: 'mdi-upload-outline', title: 'Upload', text: 'PDF or Word — stored securely for your account.' },
  { icon: 'mdi-draw-pen', title: 'Edit & sign', text: 'Text, signatures, markup, watermark, OCR.' },
  { icon: 'mdi-send-check-outline', title: 'Send', text: 'Email to contacts or Verdocs links for remote signing.' },
]

const docSearch = ref('')
const filteredDocuments = computed(() => {
  const q = docSearch.value.trim().toLowerCase()
  if (!q) return documents.value
  return documents.value.filter(
    (d: any) =>
      (d.originalName || '').toLowerCase().includes(q) ||
      (d.name || '').toLowerCase().includes(q) ||
      (d.status || '').toLowerCase().includes(q)
  )
})

const verdocsConfigured = ref(false)
const showVerdocsDialog = ref(false)
const verdocsTargetDoc = ref<any>(null)

function verdocsStatus(doc: any): string | null {
  const v = doc?.metadata?.verdocs
  if (!v?.status && !v?.documentId) return null
  if (v.status === 'sent') return 'Sent'
  if (v.status === 'completed') return 'Completed'
  if (v.status === 'partially_signed') return 'In progress'
  if (v.status === 'viewed') return 'Viewed'
  if (v.documentId) return 'Verdocs'
  return null
}

async function loadVerdocsConfig() {
  try {
    const res: any = await $fetch('/api/admin/documents/verdocs-config', { headers: editor.getAuthHeaders() })
    verdocsConfigured.value = Boolean(res?.configured)
  } catch {
    verdocsConfigured.value = false
  }
}

function onVerdocsSent() {
  showSnackbar('Remote signing envelope created. Links copied from the dialog if shown.', 'success')
  loadDocuments()
}

// ─── Dialog visibility ───────────────────────────────────
const showTextDialog = ref(false)
const showSignatureDialog = ref(false)
const showSearchDialog = ref(false)
const showDeleteDialog = ref(false)
const showConverterDialog = ref(false)
const showLegalAdviseDialog = ref(false)
const showEmailDialog = ref(false)
const showMarkupDialog = ref(false)
const emailDoc = ref<any>(null)

// ─── Snackbar ────────────────────────────────────────────
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')
const showSnackbar = (msg: string, color = 'success') => { snackbarText.value = msg; snackbarColor.value = color; snackbar.value = true }

// ─── Legal Review state ──────────────────────────────────
const { canUseDocumentsLegalReview } = useLicense()
const legalReviewLoading = ref(false)
const legalReviewDocId = ref<number | null>(null)
const legalAdviseDoc = ref<any>(null)
const legalReviewData = ref<{ review: any; dateAlerts: any[] } | null>(null)
const dateAlertItems = ref<Array<{ label: string; date: string; enabled: boolean; daysBefore: number }>>([])
const savingAlerts = ref(false)

// ─── Data loading ────────────────────────────────────────
async function loadDocuments() {
  loading.value = true
  try {
    const res: any = await $fetch('/api/admin/documents', { headers: editor.getAuthHeaders() })
    documents.value = res?.documents || []
    if (res?.stats) {
      if (stats.value[0]) stats.value[0].value = res.stats.total || 0
      if (stats.value[1]) stats.value[1].value = res.stats.signed || 0
      if (stats.value[2]) stats.value[2].value = res.stats.pending || 0
    }
  } catch { showSnackbar('Failed to load documents', 'error') }
  finally { loading.value = false }
}

async function loadSignatures() {
  try {
    const res: any = await $fetch('/api/admin/signatures', { headers: editor.getAuthHeaders() })
    savedSignatures.value = res.signatures || []
  } catch { /* ignore */ }
}

// ─── Document CRUD ───────────────────────────────────────
const triggerFileUpload = () => fileInput.value?.click()

async function handleFileUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploading.value = true
  try {
    const formData = new FormData(); formData.append('file', file)
    const res: any = await $fetch('/api/admin/documents', { method: 'POST', headers: editor.getAuthHeaders(), body: formData })
    if (res.success) { showSnackbar('Document uploaded successfully'); await loadDocuments(); if (res.document) handleOpenEditor(res.document) }
  } catch (e: any) { showSnackbar(e.data?.message || 'Failed to upload', 'error') }
  finally { uploading.value = false; if (fileInput.value) fileInput.value.value = '' }
}

async function handleOpenEditor(doc: any) {
  try { await editor.openEditor(doc) } catch { showSnackbar('Failed to open document', 'error') }
}

function downloadDocument(doc: any) {
  const link = document.createElement('a'); link.href = doc.filePath; link.download = doc.originalName; link.click()
}

async function deleteDocument() {
  if (!documentToDelete.value) return
  deleting.value = true
  try {
    await $fetch(`/api/admin/documents/${documentToDelete.value.id}`, { method: 'DELETE', headers: editor.getAuthHeaders() })
    showSnackbar('Document deleted'); await loadDocuments(); showDeleteDialog.value = false; documentToDelete.value = null
  } catch { showSnackbar('Failed to delete document', 'error') }
  finally { deleting.value = false }
}

// ─── Editor actions (delegate to composable) ─────────────
function onAddText(el: any) { editor.addTextElement(el); showSnackbar('Text added - drag to position it') }

async function onAddSignature(el: any, save: boolean, name: string) {
  editor.addSignatureElement(el)
  if (save && el.data && el.type) {
    try {
      await $fetch('/api/admin/signatures', { method: 'POST', headers: editor.getAuthHeaders(), body: { name, type: el.type, signatureData: el.data, isDefault: false } })
      await loadSignatures()
    } catch { /* ignore */ }
  }
  showSnackbar('Signature added - drag to position and resize')
}

async function onDeleteSignature(id: number) {
  try { await $fetch(`/api/admin/signatures/${id}`, { method: 'DELETE', headers: editor.getAuthHeaders() }); showSnackbar('Signature deleted'); await loadSignatures() }
  catch { showSnackbar('Failed to delete signature', 'error') }
}

async function onApplyMarkup(payload: { page: number; imageData: string }) {
  try {
    await editor.applyMarkupToPage(payload.page, payload.imageData)
    showSnackbar('Markup applied to page ' + payload.page)
  } catch {
    showSnackbar('Failed to apply markup', 'error')
  }
}

async function onSearch(query: string) {
  editor.searchQuery.value = query
  const count = await editor.searchPdf()
  showSnackbar(count ? `Found ${count} results` : 'No results found', count ? 'success' : 'info')
}

function onGoToSearchResult(result: any) { editor.goToPageNumber(result.page); showSearchDialog.value = false }

async function handleWatermark() {
  try { await editor.addWatermark(); showSnackbar('Watermark applied') } catch { showSnackbar('Failed to apply watermark', 'error') }
}

async function handleOCR() {
  try { await editor.runOCR(); showSnackbar(`OCR completed for page ${editor.ocrPage.value}`) } catch { showSnackbar('OCR failed', 'error') }
}

async function handleOCRAll() {
  try { await editor.runOCRAllPages(); showSnackbar(`OCR completed for ${editor.totalPages.value} page(s). Use Legal Review to analyze.`) } catch { showSnackbar('OCR failed', 'error') }
}

async function handleSave() {
  try { const ok = await editor.savePdf(); if (ok) { showSnackbar('Document saved successfully'); await loadDocuments() } }
  catch { showSnackbar('Failed to save document', 'error') }
}

// ─── File conversion ─────────────────────────────────────
async function convertFile(file: File | null) {
  if (!file) return
  converting.value = true
  try {
    const ext = file.name.split('.').pop()?.toLowerCase()
    let pdfBytes: ArrayBuffer
    if (ext === 'docx' || ext === 'doc') pdfBytes = await editor.convertDocxToPdf(await file.arrayBuffer())
    else if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') pdfBytes = await editor.convertImageToPdf(file)
    else if (ext === 'txt') pdfBytes = await editor.convertTextToPdf(await file.text())
    else throw new Error('Unsupported file type')

    const blob = new Blob([pdfBytes], { type: 'application/pdf' })
    const formData = new FormData(); formData.append('file', blob, file.name.replace(/\.[^/.]+$/, '') + '.pdf')
    const res: any = await $fetch('/api/admin/documents', { method: 'POST', headers: editor.getAuthHeaders(), body: formData })
    if (res.success) { showSnackbar('File converted to PDF!'); await loadDocuments(); showConverterDialog.value = false; if (res.document) handleOpenEditor(res.document) }
  } catch (e: any) { showSnackbar(e.message || 'Conversion failed', 'error') }
  finally { converting.value = false }
}

// ─── Legal Review ────────────────────────────────────────
async function runLegalReview(doc: any, extractedText?: string) {
  if (doc.type !== 'pdf') return
  legalReviewLoading.value = true; legalReviewDocId.value = doc.id
  try {
    const body: Record<string, unknown> = {}
    if (extractedText && extractedText.trim().length >= 50) body.extractedText = extractedText.trim()
    const res: any = await $fetch(`/api/admin/documents/${doc.id}/legal-review`, { method: 'POST', headers: editor.getAuthHeaders(), body })
    if (res.success && res.review) {
      legalAdviseDoc.value = doc
      legalReviewData.value = { review: res.review, dateAlerts: res.dateAlerts || [] }
      dateAlertItems.value = (res.review.importantDates || []).map((d: any) => ({ label: d.label || 'Date', date: d.date || '', enabled: true, daysBefore: 2 }))
      showLegalAdviseDialog.value = true; showSnackbar('Legal review complete!')
    }
  } catch (e: any) { showSnackbar(e.data?.statusMessage || 'Legal review failed', 'error') }
  finally { legalReviewLoading.value = false; legalReviewDocId.value = null }
}

async function openLegalAdvise(doc: any) {
  legalAdviseDoc.value = doc; showLegalAdviseDialog.value = true; legalReviewData.value = null; legalReviewLoading.value = true
  try {
    const res: any = await $fetch(`/api/admin/documents/${doc.id}/legal-review`, { headers: editor.getAuthHeaders() })
    if (res.success && res.review) {
      legalReviewData.value = { review: res.review, dateAlerts: res.dateAlerts || [] }
      dateAlertItems.value = (res.review.importantDates || []).map((d: any) => ({ label: d.label || 'Date', date: d.date || '', enabled: true, daysBefore: 2 }))
    } else { legalReviewData.value = { review: null, dateAlerts: [] } }
  } catch { legalReviewData.value = null }
  finally { legalReviewLoading.value = false }
}

async function saveDateAlerts(alerts: any[]) {
  if (!legalAdviseDoc.value) return
  const enabled = alerts.filter((a: any) => a.enabled && a.date).map((a: any) => ({ label: a.label, dueDate: a.date, daysBefore: a.daysBefore }))
  savingAlerts.value = true
  try {
    await $fetch(`/api/admin/documents/${legalAdviseDoc.value.id}/legal-review/alerts`, { method: 'POST', headers: editor.getAuthHeaders(), body: { alerts: enabled } })
    showSnackbar('Date alerts set. You and super admins will receive email reminders.')
  } catch (e: any) { showSnackbar(e.data?.statusMessage || 'Failed to set alerts', 'error') }
  finally { savingAlerts.value = false }
}

// ─── Lifecycle ───────────────────────────────────────────
onMounted(() => {
  loadDocuments()
  loadSignatures()
  loadVerdocsConfig()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');

/* ─── Layout ─── */
.premium-bg { background: linear-gradient(160deg, #f0f4f8 0%, #e8ecf1 45%, #f5f7fa 100%); min-height: 100vh; }
.dashboard-container { animation: fadeIn .5s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.docs-dashboard { font-family: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif; max-width: 1400px; margin: 0 auto; }
.docs-hero-accent { width: 4px; height: 28px; border-radius: 4px; background: linear-gradient(180deg, #1976d2, #42a5f5); }
.docs-hero-title { letter-spacing: -0.02em; color: #0f172a; }
.docs-hero-sub { line-height: 1.6; max-width: 36rem; }
.text-high-emphasis { color: #0f172a; }
.docs-cta-btn { font-weight: 700 !important; letter-spacing: 0.02em !important; text-transform: none !important; box-shadow: 0 12px 32px rgba(25, 118, 210, 0.35) !important; }

.docs-panel {
  background: rgba(255, 255, 255, 0.92) !important;
  border: 1px solid rgba(15, 23, 42, 0.06);
  box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06) !important;
}
.verdocs-panel { background: linear-gradient(145deg, rgba(103, 58, 183, 0.06), rgba(255, 255, 255, 0.95)) !important; border-color: rgba(103, 58, 183, 0.15); }
.verdocs-off { opacity: 0.92; }
.docs-code { font-size: 11px; padding: 2px 8px; border-radius: 6px; background: rgba(0, 0, 0, 0.05); }

.workflow-step { background: rgba(25, 118, 210, 0.04); border: 1px solid rgba(25, 118, 210, 0.1); transition: transform 0.2s ease, box-shadow 0.2s ease; }
.workflow-step:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(25, 118, 210, 0.1); }
.step-index {
  width: 28px; height: 28px; border-radius: 8px;
  background: linear-gradient(135deg, #1976d2, #2196f3);
  color: white; font-size: 13px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
}

.legal-strip { border-left: 4px solid #1976d2; background: linear-gradient(90deg, rgba(25, 118, 210, 0.06), rgba(255, 255, 255, 0.95)) !important; }

.docs-kpi {
  background: #fff !important;
  border: 1px solid rgba(15, 23, 42, 0.06);
  box-shadow: 0 8px 30px rgba(15, 23, 42, 0.06) !important;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.docs-kpi:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(15, 23, 42, 0.1) !important; }
.kpi-orb { display: flex; align-items: center; justify-content: center; }
.kpi-orb--blue { background: linear-gradient(135deg, rgba(25, 118, 210, 0.15), rgba(66, 165, 245, 0.12)); color: #1565c0; }
.kpi-orb--green { background: linear-gradient(135deg, rgba(46, 125, 50, 0.15), rgba(102, 187, 106, 0.12)); color: #2e7d32; }
.kpi-orb--amber { background: linear-gradient(135deg, rgba(245, 124, 0, 0.15), rgba(255, 183, 77, 0.12)); color: #e65100; }

.docs-table-card {
  background: #fff !important;
  border: 1px solid rgba(15, 23, 42, 0.06);
  box-shadow: 0 12px 48px rgba(15, 23, 42, 0.08) !important;
}
.docs-table-head { background: linear-gradient(180deg, #fafbfc 0%, #fff 100%); }
.docs-search { max-width: 280px; min-width: 200px; }

.docs-table { background: transparent !important; }
.docs-table thead th {
  font-size: 11px !important;
  letter-spacing: 0.08em !important;
  color: #64748b !important;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08) !important;
  padding: 14px 20px !important;
}
.docs-table tbody td { padding: 12px 20px !important; vertical-align: middle; border-bottom: 1px solid rgba(15, 23, 42, 0.04) !important; }
.docs-row { transition: background 0.2s ease; }
.docs-row:hover { background: rgba(25, 118, 210, 0.03) !important; }

.file-type-badge {
  width: 48px; height: 48px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.file-type-badge.is-pdf { background: linear-gradient(135deg, #ffebee, #ffcdd2); color: #c62828; }
.file-type-badge.is-doc { background: linear-gradient(135deg, #e3f2fd, #bbdefb); color: #1565c0; }

.font-weight-semibold { font-weight: 600 !important; }
.min-width-0 { min-width: 0; }

.docs-action-menu :deep(.v-list-subheader) { font-size: 10px; letter-spacing: 0.12em; color: #94a3b8; min-height: 28px; }

/* ─── Editor ─── */
.editor-workspace { background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%); }
.glass-toolbar { background: rgba(255,255,255,.9) !important; backdrop-filter: blur(20px); border-bottom: 1px solid rgba(0,0,0,.05); box-shadow: 0 4px 16px rgba(0,0,0,.08) !important; width: 100% !important; }
.page-nav-group { background: rgba(255,255,255,.6); border-radius: 8px; padding: 4px 8px; }
.zoom-controls { background: rgba(255,255,255,.6); border-radius: 8px; overflow: hidden; }

/* ─── Sidebar ─── */
.glass-sidebar { width: 280px; background: rgba(255,255,255,.9); backdrop-filter: blur(20px); border-right: 1px solid rgba(0,0,0,.08); box-shadow: 4px 0 24px rgba(31,38,135,.1); overflow-y: auto; overflow-x: hidden; }
.sidebar-list .v-list-item { border-radius: 8px; margin: 4px 8px; transition: all .2s ease; }
.sidebar-list .v-list-item:hover { background: rgba(25,118,210,.08); transform: translateX(4px); }

/* ─── Canvas ─── */
.canvas-workspace { background: linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(135deg, #dfe4ea 0%, #cbd5e1 100%); background-size: 20px 20px, 20px 20px, 100% 100%; }
.pdf-pages-wrapper { padding: 16px; display: flex; flex-direction: column; align-items: center; transform-origin: top center; transition: transform .2s ease; }
.pdf-page-container { background: white; box-shadow: 0 10px 40px rgba(0,0,0,.12), 0 2px 8px rgba(0,0,0,.08); margin-bottom: 20px; border-radius: 4px; overflow: hidden; }
.pdf-page-container canvas { display: block; }
.pdf-loading-overlay { position: absolute; top:0; left:0; right:0; bottom:0; background: rgba(255,255,255,.95); backdrop-filter: blur(10px); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10; }

/* ─── Thumbnails ─── */
.page-thumbnail { border: 2px solid transparent; border-radius: 8px; padding: 6px; transition: all .3s cubic-bezier(.4,0,.2,1); background: rgba(255,255,255,.4); }
.page-thumbnail:hover { border-color: rgba(25,118,210,.5); background: rgba(25,118,210,.08); }
.page-thumbnail.active-page { border-color: #1976D2; background: rgba(25,118,210,.12); box-shadow: 0 4px 16px rgba(25,118,210,.25); }
.thumbnail-preview { background: white; border: 1px solid rgba(0,0,0,.08); border-radius: 4px; display: flex; align-items: center; justify-content: center; min-height: 60px; }
.thumbnail-canvas { max-width: 100%; height: auto; }
.cursor-pointer { cursor: pointer; }

/* ─── Draggable elements ─── */
.draggable-text-element { background: rgba(255,255,255,.95); backdrop-filter: blur(8px); box-shadow: 0 2px 8px rgba(0,0,0,.1); transition: all .2s ease; }
.draggable-text-element.selected { box-shadow: 0 4px 20px rgba(25,118,210,.3); z-index: 1000; }
.draggable-signature-element { background: transparent !important; transition: all .2s ease; }
.draggable-signature-element.selected { box-shadow: 0 4px 20px rgba(25,118,210,.3); z-index: 1000; }
.element-controls { position: absolute; top: -32px; right: 0; background: rgba(255,255,255,.98); backdrop-filter: blur(10px); border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,.15); padding: 2px; }
.resize-handle { position: absolute; bottom: 0; right: 0; width: 18px; height: 18px; background: linear-gradient(135deg, #1976D2, #42A5F5); cursor: nwse-resize; border-radius: 0 0 4px 0; box-shadow: 0 2px 6px rgba(0,0,0,.2); }
.resize-handle::after { content:''; position: absolute; bottom: 3px; right: 3px; width: 8px; height: 8px; border-right: 2px solid white; border-bottom: 2px solid white; }

/* ─── Legal & info cards ─── */
.legal-info-card { border: 1px solid rgba(25,118,210,.2); }
.legal-pane { padding: 16px; margin-bottom: 16px; background: linear-gradient(135deg, rgba(25,118,210,.08), rgba(25,118,210,.04)); border: 1px solid rgba(25,118,210,.2); border-radius: 12px; }
</style>
