<template>
  <v-dialog
    :model-value="modelValue"
    max-width="960"
    persistent
    scrollable
    class="send-sig-dialog"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card rounded="xl" class="send-sig-card d-flex flex-column">
      <v-card-title class="d-flex align-start pa-6 pb-4 flex-shrink-0">
        <div class="d-flex align-center flex-grow-1 min-width-0 ga-4">
          <v-avatar color="primary" variant="flat" size="48" class="flex-shrink-0">
            <v-icon icon="mdi-file-sign" size="28" color="white" />
          </v-avatar>
          <div class="min-width-0 flex-grow-1">
            <div class="text-h6 font-weight-bold">Send for signature</div>
            <div class="text-body-2 text-medium-emphasis font-weight-regular text-wrap">
              Powered by Verdocs — signers get a secure link by email. You’ll be notified as they progress.
            </div>
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" size="small" class="mt-n1 flex-shrink-0" @click="close" />
      </v-card-title>

      <v-divider class="opacity-20" />

      <v-card-text v-if="doc" class="pa-6 send-sig-card-text">
        <v-alert type="info" variant="tonal" density="comfortable" rounded="lg" class="mb-6">
          <div class="text-body-2 text-wrap">
            <strong>{{ doc.originalName }}</strong>
            <span class="text-medium-emphasis">
              — Choose how signing areas are defined: click on the PDF (like DocuSign), use automatic spots on page 1, or let signers place fields in Verdocs.</span>
          </div>
        </v-alert>

        <div class="text-subtitle-2 font-weight-bold mb-3">Where fields go</div>
        <div class="d-flex flex-column ga-3 mb-4">
          <v-card
            v-for="opt in placementOptions"
            :key="opt.value"
            variant="outlined"
            rounded="lg"
            role="button"
            tabindex="0"
            class="placement-tile pa-4"
            :class="{ 'placement-tile--active': fieldPlacement === opt.value }"
            @click="fieldPlacement = opt.value"
            @keydown.enter.prevent="fieldPlacement = opt.value"
            @keydown.space.prevent="fieldPlacement = opt.value"
          >
            <div class="d-flex align-start ga-3 min-width-0">
              <v-icon
                :icon="fieldPlacement === opt.value ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank'"
                color="primary"
                class="flex-shrink-0 mt-0"
                size="22"
              />
              <div class="min-width-0 flex-grow-1">
                <div class="text-body-2 font-weight-medium text-wrap">{{ opt.title }}</div>
                <div class="text-caption text-medium-emphasis text-wrap mt-1">{{ opt.body }}</div>
              </div>
            </div>
          </v-card>
        </div>

        <ClientOnly>
          <div v-if="fieldPlacement === 'on_document'" class="pdf-placer mb-6">
            <v-card variant="outlined" rounded="lg" class="pa-4">
              <div class="d-flex flex-wrap align-center ga-3 mb-3">
                <v-select
                  v-model="activeSignerIndex"
                  :items="signerSelectItems"
                  item-title="title"
                  item-value="value"
                  label="Fields for"
                  variant="outlined"
                  density="compact"
                  hide-details
                  style="min-width: 200px"
                />
                <div class="text-caption text-medium-emphasis align-self-center">Field to place:</div>
                <v-btn-toggle v-model="activeFieldKind" mandatory divided density="compact" color="primary">
                  <v-btn value="signature" size="small">Signature</v-btn>
                  <v-btn value="initial" size="small">Initial</v-btn>
                  <v-btn value="timestamp" size="small">Date signed</v-btn>
                </v-btn-toggle>
                <v-spacer />
                <v-btn
                  icon="mdi-minus"
                  size="small"
                  variant="tonal"
                  :disabled="pdfScale <= 0.9"
                  @click="pdfScale = Math.max(0.9, Math.round((pdfScale - 0.15) * 100) / 100)"
                />
                <span class="text-caption">{{ Math.round(pdfScale * 100) }}%</span>
                <v-btn
                  icon="mdi-plus"
                  size="small"
                  variant="tonal"
                  :disabled="pdfScale >= 2.25"
                  @click="pdfScale = Math.min(2.25, Math.round((pdfScale + 0.15) * 100) / 100)"
                />
              </div>

              <div class="d-flex flex-wrap align-center ga-2 mb-3">
                <v-btn
                  size="small"
                  variant="tonal"
                  prepend-icon="mdi-chevron-left"
                  :disabled="currentPdfPage <= 1 || pdfLoading"
                  @click="goPage(-1)"
                >
                  Previous
                </v-btn>
                <span class="text-body-2">Page {{ currentPdfPage }} / {{ totalPdfPages || '—' }}</span>
                <v-btn
                  size="small"
                  variant="tonal"
                  append-icon="mdi-chevron-right"
                  :disabled="!totalPdfPages || currentPdfPage >= totalPdfPages || pdfLoading"
                  @click="goPage(1)"
                >
                  Next
                </v-btn>
                <v-btn
                  v-if="placedFields.length"
                  size="small"
                  variant="text"
                  color="error"
                  prepend-icon="mdi-delete-sweep"
                  @click="clearPlacements"
                >
                  Clear all markers
                </v-btn>
              </div>

              <v-alert v-if="pdfError" type="warning" variant="tonal" density="compact" rounded="lg" class="mb-3">
                {{ pdfError }}
              </v-alert>

              <div v-if="pdfLoading" class="d-flex align-center justify-center py-12">
                <v-progress-circular indeterminate color="primary" size="48" />
                <span class="ml-4 text-medium-emphasis">Loading PDF…</span>
              </div>

              <div v-else class="pdf-stage-wrap">
                <div class="pdf-canvas-shell rounded-lg overflow-auto border">
                  <div class="pdf-canvas-inner position-relative d-inline-block">
                    <canvas
                      ref="canvasRef"
                      class="pdf-canvas-el d-block"
                      @click="onCanvasClick"
                    />
                    <div
                      v-for="p in markersOnPage"
                      :key="p.id"
                      class="field-marker"
                      :class="`kind-${p.type}`"
                      :style="markerStyle(p)"
                      @click.stop="removePlacement(p.id)"
                    >
                      <span class="marker-label">{{ markerLabel(p) }}</span>
                      <v-icon icon="mdi-close-circle" size="14" class="marker-x" />
                    </div>
                  </div>
                </div>
                <p class="text-caption text-medium-emphasis mt-2 mb-0">
                  Click the page to drop a field. Click a yellow tag to remove it. Use page buttons for multi-page agreements.
                </p>
              </div>

              <v-list v-if="placedFields.length" density="compact" class="mt-3 border rounded-lg">
                <v-list-subheader>Placed fields ({{ placedFields.length }})</v-list-subheader>
                <v-list-item
                  v-for="p in placedFields"
                  :key="p.id"
                  :title="`${signerLabel(p.signerIndex)} · ${markerLabel(p)} · page ${p.page}`"
                  subtitle="Click row to remove"
                  @click="removePlacement(p.id)"
                />
              </v-list>
            </v-card>
          </div>
          <template #fallback>
            <div v-if="fieldPlacement === 'on_document'" class="py-8 text-center text-medium-emphasis text-caption">
              Loading PDF tools…
            </div>
          </template>
        </ClientOnly>

        <div v-if="fieldPlacement !== 'on_document'" class="text-subtitle-2 font-weight-bold mb-2 mt-2">Field types</div>
        <div v-if="fieldPlacement !== 'on_document'" class="d-flex flex-column ga-1 mb-4">
          <v-checkbox
            v-model="includeInitial"
            label="Initials (per signer)"
            color="primary"
            hide-details
            density="comfortable"
          />
          <v-checkbox
            v-model="includeDateSigned"
            label="Date signed (timestamp)"
            color="primary"
            hide-details
            density="comfortable"
          />
          <v-checkbox
            v-model="includePrefilledNameEmail"
            :disabled="fieldPlacement === 'signer_places'"
            label="Name & email on first page (read-only, auto-filled)"
            color="primary"
            hide-details
            density="comfortable"
          />
        </div>

        <div class="text-subtitle-2 font-weight-bold mb-1">Signers</div>
        <p class="text-caption text-medium-emphasis mb-3">
          Search combines your CRM clients (synced from leads, estimates, newsletter, etc.) with other tenant contacts — one entry per email. Pick a row or type a name and edit email/phone below.
        </p>
        <v-card
          v-for="(s, i) in signers"
          :key="i"
          variant="outlined"
          rounded="lg"
          class="pa-4 mb-3 signer-row"
        >
          <div class="d-flex align-center justify-space-between mb-3">
            <span class="text-subtitle-2 font-weight-bold">Signer {{ i + 1 }}</span>
            <v-btn
              v-if="signers.length > 1"
              icon="mdi-close"
              size="x-small"
              variant="text"
              color="error"
              @click="removeSigner(i)"
            />
          </div>
          <v-combobox
            :model-value="s.name"
            :items="crmItemsBySigner[i] || []"
            :loading="Boolean(crmLoading[i])"
            item-title="title"
            return-object
            label="Full name"
            placeholder="Search CRM or type a name"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-account-outline"
            hide-details="auto"
            class="mb-3 signer-crm-combobox"
            clearable
            :custom-filter="crmItemFilter"
            :menu-props="{ maxHeight: 320 }"
            @update:model-value="(v) => onSignerNameModel(i, v)"
            @update:search="(q) => scheduleCrmSearch(i, q)"
            @focus="onSignerComboFocus(i)"
          >
            <template #item="{ props, item }">
              <v-list-item v-bind="props">
                <template #prepend>
                  <v-icon icon="mdi-database-search" size="small" class="text-medium-emphasis" />
                </template>
                <v-list-item-title class="text-body-2">{{ item.raw.title }}</v-list-item-title>
                <v-list-item-subtitle class="text-caption">
                  {{ item.raw.source }}
                </v-list-item-subtitle>
              </v-list-item>
            </template>
            <template #no-data>
              <div class="px-4 py-3 text-caption text-medium-emphasis">
                <span v-if="crmLoading[i]">Searching CRM…</span>
                <span v-else-if="(crmSearchQueries[i] || '').length > 0">No contacts match. Enter name and email manually below.</span>
                <span v-else>Start typing to search CRM contacts (scoped to your account), or type a full name.</span>
              </div>
            </template>
          </v-combobox>
          <v-text-field
            v-model="s.email"
            label="Email"
            type="email"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-email-outline"
            hide-details="auto"
            class="mb-3"
          />
          <v-text-field
            v-model="s.phone"
            label="Phone (optional)"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-phone-outline"
            hide-details="auto"
          />
        </v-card>

        <v-btn
          variant="text"
          color="primary"
          prepend-icon="mdi-account-plus"
          class="mb-4"
          @click="addSigner"
        >
          Add another signer
        </v-btn>

        <v-alert v-if="errorMsg" type="error" variant="tonal" rounded="lg" class="mb-0">
          {{ errorMsg }}
        </v-alert>

        <template v-if="result">
          <v-divider class="my-6" />
          <div class="text-subtitle-2 font-weight-bold mb-3">Signing links</div>
          <p class="text-body-2 text-medium-emphasis mb-4">
            Share these with signers or confirm they received Verdocs emails. Links open in a new tab.
          </p>
          <v-card v-if="result.signingUrl" variant="tonal" rounded="lg" class="pa-4 mb-3">
            <div class="text-caption font-weight-bold mb-1">Primary</div>
            <div class="d-flex align-center ga-2 flex-wrap">
              <code class="link-snippet text-truncate">{{ result.signingUrl }}</code>
              <v-btn size="small" variant="flat" color="primary" @click="copy(result.signingUrl)">Copy</v-btn>
              <v-btn size="small" variant="tonal" :href="result.signingUrl" target="_blank" rel="noopener noreferrer">
                Open
              </v-btn>
            </div>
          </v-card>
          <v-card
            v-for="(sl, j) in result.signerLinks"
            :key="j"
            v-show="sl.url && sl.url !== result.signingUrl"
            variant="tonal"
            rounded="lg"
            class="pa-4 mb-3"
          >
            <div class="text-caption font-weight-bold mb-1">{{ sl.name || sl.email || `Signer ${j + 1}` }}</div>
            <div class="d-flex align-center ga-2 flex-wrap">
              <code class="link-snippet text-truncate">{{ sl.url }}</code>
              <v-btn size="small" variant="flat" color="primary" @click="copy(sl.url!)">Copy</v-btn>
              <v-btn size="small" variant="tonal" :href="sl.url" target="_blank" rel="noopener noreferrer">
                Open
              </v-btn>
            </div>
          </v-card>
          <p v-if="webhookHint" class="text-caption text-medium-emphasis mb-0">
            {{ webhookHint }}
          </p>
        </template>
      </v-card-text>

      <v-card-actions class="pa-6 pt-0 flex-shrink-0 bg-surface">
        <v-spacer />
        <v-btn variant="text" @click="close">{{ result ? 'Close' : 'Cancel' }}</v-btn>
        <v-btn
          v-if="!result"
          color="primary"
          variant="flat"
          rounded="lg"
          :loading="loading"
          prepend-icon="mdi-send-check"
          @click="submit"
        >
          Create & send
        </v-btn>
      </v-card-actions>
    </v-card>

    <v-snackbar v-model="copied" color="success" :timeout="2000">Copied</v-snackbar>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, shallowRef, markRaw, watch, computed, nextTick, onBeforeUnmount } from 'vue'

const props = defineProps<{
  modelValue: boolean
  doc: Record<string, unknown> | null
  authHeaders: Record<string, string>
}>()

const emit = defineEmits<{
  'update:modelValue': [val: boolean]
  sent: []
}>()

type SignerForm = { name: string; email: string; phone: string }
type FieldKind = 'signature' | 'initial' | 'timestamp'
type PlacedField = { id: string; signerIndex: number; type: FieldKind; page: number; x: number; y: number }

/** CRM row for v-combobox (from GET /api/admin/contacts/search — tenant / RBAC scoped on server). */
type CrmComboItem = {
  title: string
  name: string
  email: string
  phone: string
  source: string
}

const signers = ref<SignerForm[]>([{ name: '', email: '', phone: '' }])
const crmItemsBySigner = ref<CrmComboItem[][]>([[]])
const crmLoading = ref<Record<number, boolean>>({})
const crmSearchQueries = ref<Record<number, string>>({})
const crmDebounceTimers = new Map<number, ReturnType<typeof setTimeout>>()

/** Server-side search only — show all items returned by API. */
function crmItemFilter() {
  return true
}

function isCrmComboItem(v: unknown): v is CrmComboItem {
  return (
    typeof v === 'object' &&
    v !== null &&
    'email' in v &&
    'name' in v &&
    typeof (v as CrmComboItem).email === 'string' &&
    typeof (v as CrmComboItem).name === 'string'
  )
}

function onSignerNameModel(i: number, v: string | CrmComboItem | null) {
  const row = signers.value[i]
  if (!row) return
  if (v === null || v === '') {
    row.name = ''
    return
  }
  if (isCrmComboItem(v)) {
    row.name = v.name.trim()
    row.email = v.email.trim().toLowerCase()
    row.phone = (v.phone || '').trim()
    return
  }
  row.name = String(v).trim()
}

function scheduleCrmSearch(i: number, q: string | null) {
  const query = (q ?? '').trim()
  crmSearchQueries.value = { ...crmSearchQueries.value, [i]: query }
  const prev = crmDebounceTimers.get(i)
  if (prev) clearTimeout(prev)
  crmDebounceTimers.set(
    i,
    setTimeout(() => {
      crmDebounceTimers.delete(i)
      void runCrmSearch(i, query)
    }, 280)
  )
}

async function runCrmSearch(i: number, query: string) {
  if (!props.modelValue || i < 0 || i >= signers.value.length) return
  crmLoading.value = { ...crmLoading.value, [i]: true }
  try {
    const res = await $fetch<{
      success?: boolean
      contacts: { name: string; email: string; phone?: string; source: string }[]
    }>('/api/admin/contacts/search', {
      headers: props.authHeaders,
      query: { q: query, limit: 30 },
    })
    const list = res.contacts || []
    const next = [...crmItemsBySigner.value]
    while (next.length <= i) next.push([])
    next[i] = list.map((c) => ({
      title: `${c.name} — ${c.email}`,
      name: c.name,
      email: c.email,
      phone: c.phone || '',
      source: c.source,
    }))
    crmItemsBySigner.value = next
  } catch (e) {
    console.error('[SendForSignature] CRM search failed', e)
    const next = [...crmItemsBySigner.value]
    while (next.length <= i) next.push([])
    next[i] = []
    crmItemsBySigner.value = next
  } finally {
    crmLoading.value = { ...crmLoading.value, [i]: false }
  }
}

function onSignerComboFocus(i: number) {
  if ((crmItemsBySigner.value[i]?.length ?? 0) === 0) {
    void runCrmSearch(i, '')
  }
}

function clearCrmSearchState() {
  crmDebounceTimers.forEach((t) => clearTimeout(t))
  crmDebounceTimers.clear()
  crmItemsBySigner.value = [[]]
  crmLoading.value = {}
  crmSearchQueries.value = {}
}
const fieldPlacement = ref<'on_document' | 'fixed_first_page' | 'signer_places'>('on_document')

const placementOptions = [
  {
    value: 'on_document' as const,
    title: 'Place on PDF (recommended)',
    body: 'Pick the signer and field type, then click the document — any page, any section. Each signer needs at least one signature.',
  },
  {
    value: 'fixed_first_page' as const,
    title: 'Auto on first page',
    body: 'Signature, optional initials, and date-signed stamps in a row per signer (bottom area of page 1).',
  },
  {
    value: 'signer_places' as const,
    title: 'Signers place fields',
    body: 'Signers drag fields onto the PDF inside Verdocs.',
  },
]
const includeInitial = ref(true)
const includeDateSigned = ref(true)
const includePrefilledNameEmail = ref(false)
const loading = ref(false)
const errorMsg = ref('')
const result = ref<{
  signingUrl?: string
  signerLinks?: Array<{ name?: string; email?: string; url?: string }>
} | null>(null)
const copied = ref(false)
const webhookHint = ref('Webhook: configure Verdocs to POST events to your site at /api/webhooks/verdocs to sync status here.')

const placedFields = ref<PlacedField[]>([])
const activeSignerIndex = ref(0)
const activeFieldKind = ref<FieldKind>('signature')

/** PDF.js objects use private fields — must not be wrapped in Vue's reactive Proxy (use shallowRef + markRaw). */
const pdfDocRef = shallowRef<{ destroy?: () => void; numPages: number; getPage: (n: number) => Promise<any> } | null>(
  null
)
const pdfLoading = ref(false)
const pdfError = ref('')
const currentPdfPage = ref(1)
const totalPdfPages = ref(0)
const viewportRef = shallowRef<{
  convertToViewportPoint: (x: number, y: number) => number[]
  convertToPdfPoint: (x: number, y: number) => number[]
} | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const pdfScale = ref(1.35)

const signerSelectItems = computed(() =>
  signers.value.map((s, i) => ({
    title: s.name.trim() || `Signer ${i + 1}`,
    value: i,
  }))
)

const markersOnPage = computed(() =>
  placedFields.value.filter((p) => p.page === currentPdfPage.value)
)

function signerLabel(idx: number) {
  const s = signers.value[idx]
  return s?.name?.trim() || `Signer ${idx + 1}`
}

function markerLabel(p: PlacedField) {
  if (p.type === 'signature') return 'Sign'
  if (p.type === 'initial') return 'Initial'
  return 'Date'
}

function markerStyle(p: PlacedField) {
  if (!viewportRef.value) return { display: 'none' }
  const [vx, vy] = viewportRef.value.convertToViewportPoint(p.x, p.y)
  return {
    left: `${vx}px`,
    top: `${vy}px`,
    transform: 'translate(-50%, -110%)',
  }
}

function destroyPdf() {
  try {
    pdfDocRef.value?.destroy?.()
  } catch {
    /* ignore */
  }
  pdfDocRef.value = null
  totalPdfPages.value = 0
  viewportRef.value = null
  pdfError.value = ''
}

async function loadPdf() {
  if (!import.meta.client) return
  const path = props.doc?.filePath
  if (!path || typeof path !== 'string') return

  destroyPdf()
  pdfLoading.value = true
  pdfError.value = ''
  try {
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

    const res = await fetch(path)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = await res.arrayBuffer()
    const task = pdfjsLib.getDocument({ data: buf })
    const doc = await task.promise
    pdfDocRef.value = markRaw(doc)
    totalPdfPages.value = doc.numPages
    currentPdfPage.value = 1
    await nextTick()
    await renderPdfPage()
  } catch (e) {
    console.error('[SendForSignature] PDF load failed', e)
    pdfError.value = 'Could not load this PDF for placement. Check the file path or try another document.'
  } finally {
    pdfLoading.value = false
  }
}

async function renderPdfPage() {
  const doc = pdfDocRef.value
  const canvas = canvasRef.value
  if (!doc || !canvas) return

  const page = await doc.getPage(currentPdfPage.value)
  const viewport = page.getViewport({ scale: pdfScale.value })
  viewportRef.value = markRaw(viewport)
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  await page.render({ canvasContext: ctx, viewport }).promise
}

function goPage(delta: number) {
  const next = currentPdfPage.value + delta
  if (next < 1 || (totalPdfPages.value && next > totalPdfPages.value)) return
  currentPdfPage.value = next
  void renderPdfPage()
}

function onCanvasClick(e: MouseEvent) {
  if (fieldPlacement.value !== 'on_document') return
  const canvas = canvasRef.value
  const vp = viewportRef.value
  if (!canvas || !vp || pdfLoading.value) return

  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  const x = (e.clientX - rect.left) * scaleX
  const y = (e.clientY - rect.top) * scaleY
  const [pdfX, pdfY] = vp.convertToPdfPoint(x, y)

  placedFields.value.push({
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `f_${Date.now()}_${Math.random()}`,
    signerIndex: activeSignerIndex.value,
    type: activeFieldKind.value,
    page: currentPdfPage.value,
    x: pdfX,
    y: pdfY,
  })
}

function removePlacement(id: string) {
  placedFields.value = placedFields.value.filter((p) => p.id !== id)
}

function clearPlacements() {
  placedFields.value = []
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      clearCrmSearchState()
      signers.value = [{ name: '', email: '', phone: '' }]
      fieldPlacement.value = 'on_document'
      includeInitial.value = true
      includeDateSigned.value = true
      includePrefilledNameEmail.value = false
      placedFields.value = []
      activeSignerIndex.value = 0
      activeFieldKind.value = 'signature'
      currentPdfPage.value = 1
      errorMsg.value = ''
      result.value = null
      if (import.meta.client) {
        void nextTick(() => loadPdf())
      }
    } else if (import.meta.client) {
      destroyPdf()
    }
  }
)

watch(pdfScale, () => {
  if (props.modelValue && pdfDocRef.value) void renderPdfPage()
})

watch(
  () => props.doc?.filePath,
  (path, prev) => {
    if (props.modelValue && path && path !== prev && import.meta.client) {
      void loadPdf()
    }
  }
)

watch(signers, (list) => {
  if (activeSignerIndex.value >= list.length) {
    activeSignerIndex.value = Math.max(0, list.length - 1)
  }
})

onBeforeUnmount(() => {
  clearCrmSearchState()
  destroyPdf()
})

function addSigner() {
  signers.value.push({ name: '', email: '', phone: '' })
  crmItemsBySigner.value = [...crmItemsBySigner.value, []]
}

function removeSigner(i: number) {
  signers.value.splice(i, 1)
  crmItemsBySigner.value.splice(i, 1)
  crmDebounceTimers.forEach((t) => clearTimeout(t))
  crmDebounceTimers.clear()
  crmLoading.value = {}
  crmSearchQueries.value = {}
  placedFields.value = placedFields.value
    .filter((p) => p.signerIndex !== i)
    .map((p) => (p.signerIndex > i ? { ...p, signerIndex: p.signerIndex - 1 } : p))
}

function close() {
  if (result.value) emit('sent')
  emit('update:modelValue', false)
}

function validateBeforeSubmit(): string | null {
  if (fieldPlacement.value === 'on_document') {
    for (let i = 0; i < signers.value.length; i++) {
      const hasSig = placedFields.value.some((p) => p.signerIndex === i && p.type === 'signature')
      if (!hasSig) {
        return `Add at least one Signature on the PDF for ${signerLabel(i)} (use “Fields for” and click the page).`
      }
    }
    if (placedFields.value.length === 0) {
      return 'Click the PDF to place at least one field for each signer.'
    }
  }
  return null
}

async function submit() {
  if (!props.doc?.id) return
  errorMsg.value = ''
  const v = validateBeforeSubmit()
  if (v) {
    errorMsg.value = v
    return
  }
  loading.value = true
  try {
    const res = await $fetch<{
      success?: boolean
      signingUrl?: string
      signerLinks?: Array<{ name?: string; email?: string; url?: string }>
    }>(`/api/admin/documents/${props.doc.id}/verdocs/send`, {
      method: 'POST',
      headers: props.authHeaders,
      body: {
        fieldPlacement: fieldPlacement.value,
        includeInitial: includeInitial.value,
        includeDateSigned: includeDateSigned.value,
        includePrefilledNameEmail: includePrefilledNameEmail.value,
        manualFields:
          fieldPlacement.value === 'on_document'
            ? placedFields.value.map(({ signerIndex, type, page, x, y }) => ({
                signerIndex,
                type,
                page,
                x,
                y,
              }))
            : undefined,
        signers: signers.value.map((s) => ({
          name: s.name.trim(),
          email: s.email.trim(),
          phone: s.phone.trim() || undefined,
        })),
      },
    })
    result.value = {
      signingUrl: res.signingUrl,
      signerLinks: res.signerLinks,
    }
    if (!res.signingUrl && (!res.signerLinks || !res.signerLinks.length)) {
      errorMsg.value =
        'Document was created in Verdocs, but no signing URL was returned. Check the Verdocs dashboard or API response format.'
    }
  } catch (e: unknown) {
    const err = e as {
      data?: { message?: string; statusMessage?: string }
      statusCode?: number
      statusMessage?: string
      message?: string
    }
    const fromData = err?.data
    const dataMsg =
      typeof fromData === 'string'
        ? fromData.replace(/<[^>]+>/g, ' ').slice(0, 200).trim()
        : fromData?.message || fromData?.statusMessage
    errorMsg.value =
      dataMsg ||
      err?.statusMessage ||
      err?.message ||
      (err?.statusCode ? `Request failed (${err.statusCode}). Check server logs or Verdocs credentials.` : '') ||
      'Failed to send for signature'
  } finally {
    loading.value = false
  }
}

function copy(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    copied.value = true
  })
}
</script>

<style scoped>
.min-width-0 {
  min-width: 0;
}

.send-sig-dialog :deep(.v-overlay__content) {
  max-height: min(92vh, 900px);
}

.send-sig-card {
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.12) !important;
  max-height: min(92vh, 900px);
  min-height: 0;
}

.send-sig-card-text {
  overflow-x: hidden;
  overflow-y: auto;
  flex: 1 1 auto;
  min-height: 0;
}

.placement-tile {
  cursor: pointer;
  border-color: rgba(0, 0, 0, 0.12) !important;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background-color 0.15s ease;
}

.placement-tile:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

.placement-tile--active {
  border-color: rgb(var(--v-theme-primary)) !important;
  box-shadow: 0 0 0 1px rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.08);
}
.signer-row {
  border-color: rgba(25, 118, 210, 0.15) !important;
  background: rgba(249, 250, 251, 0.6);
}
.link-snippet {
  flex: 1;
  min-width: 0;
  font-size: 11px;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 8px;
}
.pdf-stage-wrap .border {
  border-color: rgba(0, 0, 0, 0.12) !important;
  max-height: min(62vh, 640px);
  background: #525659;
}
.pdf-canvas-inner {
  line-height: 0;
}
.pdf-canvas-el {
  cursor: crosshair;
  max-width: 100%;
  height: auto;
}
.field-marker {
  position: absolute;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  user-select: none;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(0, 0, 0, 0.15);
}
.field-marker.kind-signature {
  background: #ffe082;
  color: #5d4037;
}
.field-marker.kind-initial {
  background: #fff59d;
  color: #5d4037;
}
.field-marker.kind-timestamp {
  background: #e1bee7;
  color: #4a148c;
}
.marker-x {
  opacity: 0.85;
}
</style>
