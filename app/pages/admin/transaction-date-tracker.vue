<template>
  <div>
    <div class="tdt-shell pa-6 pa-md-10">
      <!-- ── Hero ──────────────────────────────────────────────────────── -->
      <header class="tdt-hero mb-8">
        <div class="d-flex flex-wrap align-end ga-4">
          <div class="flex-grow-1">
            <div class="d-flex align-center mb-2">
              <v-chip color="primary" variant="tonal" size="small" class="font-weight-bold">
                <v-icon size="14" start>mdi-robot-outline</v-icon>
                AI Compliance Assistant
              </v-chip>
            </div>
            <h1 class="display-serif text-h4 text-md-h3 font-weight-bold mb-2">
              Every contract date.<br class="d-none d-md-inline" /> One place. No deadlines missed.
            </h1>
            <p class="text-body-1 text-medium-emphasis mb-0" style="max-width: 640px">
              Drop in a contract — or pick from your library — and we'll pull out completion days,
              condition days, deposit deadlines, and every other date that matters. Then sync them
              straight into your calendar with one click.
            </p>
          </div>

          <!-- Live stats -->
          <div class="tdt-stats-grid">
            <div class="tdt-stat">
              <div class="tdt-stat__num">{{ stats.analyzed }}</div>
              <div class="tdt-stat__lbl">Contracts analyzed</div>
            </div>
            <div class="tdt-stat">
              <div class="tdt-stat__num">{{ stats.totalDates }}</div>
              <div class="tdt-stat__lbl">Dates tracked</div>
            </div>
            <div class="tdt-stat" :class="{ 'tdt-stat--alert': stats.dueSoon > 0 }">
              <div class="tdt-stat__num">{{ stats.dueSoon }}</div>
              <div class="tdt-stat__lbl">Due in 14 days</div>
            </div>
          </div>
        </div>
      </header>

      <!-- ── 3-step "How it works" ─────────────────────────────────────── -->
      <section class="tdt-steps mb-8">
        <div v-for="(step, i) in STEPS" :key="step.title" class="tdt-step">
          <div class="tdt-step__num">{{ String(i + 1).padStart(2, '0') }}</div>
          <div class="tdt-step__body">
            <div class="d-flex align-center mb-1">
              <v-icon :icon="step.icon" color="primary" size="20" class="mr-2" />
              <div class="font-weight-bold">{{ step.title }}</div>
            </div>
            <div class="text-caption text-medium-emphasis">{{ step.body }}</div>
          </div>
        </div>
      </section>

      <!-- ── Drag & drop zone ──────────────────────────────────────────── -->
      <section
        class="tdt-drop mb-6"
        :class="{ 'tdt-drop--over': dragging, 'tdt-drop--busy': uploading }"
        @dragover.prevent="dragging = true"
        @dragenter.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="onDrop"
        @click="!uploading && fileInput?.click()"
      >
        <input
          ref="fileInput"
          type="file"
          accept="application/pdf,.pdf"
          multiple
          class="d-none"
          @change="onFilePick"
        />
        <div v-if="!uploading" class="text-center">
          <v-icon icon="mdi-cloud-upload-outline" size="48" color="primary" class="mb-2" />
          <div class="text-h6 font-weight-bold mb-1">
            Drop a contract PDF here
          </div>
          <div class="text-body-2 text-medium-emphasis">
            or <span class="text-primary font-weight-bold">click to browse</span> your files. We'll
            upload it and start the compliance review automatically.
          </div>
          <div class="text-caption text-medium-emphasis mt-2">PDF only · up to 50&nbsp;MB per file</div>
        </div>
        <div v-else class="text-center">
          <v-progress-circular indeterminate color="primary" size="36" class="mb-2" />
          <div class="text-body-2 font-weight-bold">{{ uploadStatus }}</div>
        </div>
      </section>

      <!-- ── Documents list ────────────────────────────────────────────── -->
      <section class="mb-8">
        <div class="d-flex align-center mb-3">
          <v-icon icon="mdi-file-cabinet" color="primary" class="mr-2" />
          <h2 class="text-h6 font-weight-bold mb-0">Your contracts</h2>
          <v-spacer />
          <v-btn
            v-if="pdfDocuments.length > 0"
            color="primary"
            variant="tonal"
            size="small"
            prepend-icon="mdi-magnify-scan"
            :loading="bulkRunning"
            :disabled="selectedIds.length === 0 || bulkRunning"
            class="text-none"
            @click="runBulk"
          >
            Analyze {{ selectedIds.length || '' }} selected
          </v-btn>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="pa-12 text-center tdt-card">
          <v-progress-circular indeterminate color="primary" size="36" />
          <p class="text-body-2 text-medium-emphasis mt-3 mb-0">Loading your documents…</p>
        </div>

        <!-- Hard error -->
        <v-alert
          v-else-if="loadError"
          type="error"
          variant="tonal"
          density="compact"
          class="mb-0"
          closable
          @click:close="loadError = ''"
        >
          {{ loadError }}
          <template #append>
            <v-btn size="small" variant="tonal" color="error" class="text-none" @click="loadDocuments">
              Try again
            </v-btn>
          </template>
        </v-alert>

        <!-- Empty: no documents -->
        <div v-else-if="documents.length === 0" class="tdt-card pa-10 text-center">
          <v-icon icon="mdi-file-document-outline" size="48" color="grey-lighten-1" class="mb-3" />
          <h3 class="text-h6 font-weight-bold mb-2">No contracts uploaded yet</h3>
          <p class="text-body-2 text-medium-emphasis mb-4" style="max-width: 460px; margin: 0 auto">
            Drop a PDF in the box above to get started — or hop over to the Documents workspace if
            you'd rather upload there first.
          </p>
          <v-btn color="primary" variant="tonal" prepend-icon="mdi-cloud-upload-outline" to="/admin/documents" class="text-none">
            Open Documents
          </v-btn>
        </div>

        <!-- Filtered empty: no PDFs -->
        <div v-else-if="pdfDocuments.length === 0" class="tdt-card pa-10 text-center">
          <v-icon icon="mdi-file-pdf-box" size="48" color="grey-lighten-1" class="mb-3" />
          <h3 class="text-h6 font-weight-bold mb-2">No PDF contracts in your library</h3>
          <p class="text-body-2 text-medium-emphasis mb-4" style="max-width: 460px; margin: 0 auto">
            Date extraction needs a PDF. Convert your existing documents in the editor, or drop one
            in the upload zone above.
          </p>
          <v-btn color="primary" variant="tonal" prepend-icon="mdi-file-convert" to="/admin/documents" class="text-none">
            Convert to PDF
          </v-btn>
        </div>

        <!-- Doc cards -->
        <div v-else class="tdt-doc-list">
          <div v-if="pagination.total > 0" class="tdt-doc-list__head">
            <span>{{ loadedRangeLabel }}</span>
            <span v-if="hydrating" class="tdt-doc-list__hydrating">
              <v-progress-circular indeterminate size="12" width="2" color="primary" class="mr-1" />
              Refreshing review status…
            </span>
          </div>
          <article
            v-for="doc in pdfDocuments"
            :key="doc.id"
            class="tdt-doc"
            :class="{ 'tdt-doc--reviewed': !!reviewedData[doc.id], 'tdt-doc--active': activeDocId === doc.id }"
          >
            <header class="tdt-doc__head">
              <v-checkbox
                :model-value="selectedIds.includes(doc.id)"
                hide-details
                density="compact"
                class="flex-grow-0"
                @update:model-value="toggleOne(doc.id)"
              />
              <v-avatar size="40" color="red-lighten-5" class="mr-3 flex-grow-0">
                <v-icon icon="mdi-file-pdf-box" color="red-darken-2" size="22" />
              </v-avatar>
              <div class="flex-grow-1 min-w-0">
                <div class="font-weight-bold text-truncate">{{ doc.originalName }}</div>
                <div class="text-caption text-medium-emphasis">
                  Uploaded {{ formatDate(doc.createdAt) }}
                  <template v-if="reviewedData[doc.id]">
                    · {{ (reviewedData[doc.id]!.review.importantDates || []).length }} dates extracted
                  </template>
                </div>
              </div>
              <StatusChip :state="statusFor(doc.id)" class="mx-3" />
              <template v-if="docErrors[doc.id]">
                <v-btn
                  color="warning"
                  variant="tonal"
                  size="small"
                  prepend-icon="mdi-text-box-search-outline"
                  to="/admin/documents"
                  class="text-none flex-grow-0"
                >
                  Open editor to OCR
                </v-btn>
                <v-btn
                  variant="text"
                  size="small"
                  prepend-icon="mdi-refresh"
                  :loading="runningId === doc.id"
                  :disabled="bulkRunning || (runningId !== null && runningId !== doc.id)"
                  class="text-none flex-grow-0"
                  title="Already ran OCR? Try analyzing again."
                  @click="processDocument(doc)"
                >
                  Try again
                </v-btn>
              </template>
              <v-btn
                v-else
                color="primary"
                :variant="reviewedData[doc.id] ? 'tonal' : 'flat'"
                size="small"
                :prepend-icon="reviewedData[doc.id] ? 'mdi-refresh' : 'mdi-magnify-scan'"
                :loading="runningId === doc.id"
                :disabled="bulkRunning || (runningId !== null && runningId !== doc.id)"
                class="text-none flex-grow-0"
                @click="processDocument(doc)"
              >
                {{ reviewedData[doc.id] ? 'Re-analyze' : 'Analyze' }}
              </v-btn>
              <v-btn
                v-if="reviewedData[doc.id]"
                icon="mdi-cog-outline"
                variant="text"
                size="small"
                title="Set email reminders &amp; view full review"
                class="ml-1 flex-grow-0"
                @click="openComplianceDialog(doc)"
              />
            </header>

            <!-- Inline timeline preview -->
            <div v-if="reviewedData[doc.id]" class="tdt-timeline">
              <div v-if="(reviewedData[doc.id]!.review.importantDates || []).length === 0" class="tdt-timeline__empty">
                <v-icon icon="mdi-calendar-blank-outline" size="18" class="mr-2" />
                No important dates were extracted from this contract.
              </div>
              <ul v-else class="tdt-timeline__list">
                <li
                  v-for="d in datesForDoc(doc.id)"
                  :key="`${d.label}-${d.date}`"
                  class="tdt-date"
                  :class="`tdt-date--${urgencyKind(d.date)}`"
                >
                  <div class="tdt-date__urgency">
                    <span class="tdt-dot" :class="`tdt-dot--${urgencyKind(d.date)}`" />
                    <span class="tdt-date__when">{{ relativeWhen(d.date) }}</span>
                  </div>
                  <div class="tdt-date__main">
                    <div class="tdt-date__label">{{ d.label }}</div>
                    <div v-if="d.context" class="tdt-date__ctx text-caption text-medium-emphasis">
                      {{ d.context }}
                    </div>
                  </div>
                  <div class="tdt-date__day">{{ formatDateLong(d.date) }}</div>
                  <div class="tdt-date__actions">
                    <a
                      :href="googleUrlFor(doc, d)"
                      target="_blank"
                      rel="noopener"
                      class="tdt-cal-btn"
                      title="Add to Google Calendar"
                    >
                      <v-icon size="14" class="mr-1">mdi-google</v-icon>Google
                    </a>
                    <button
                      type="button"
                      class="tdt-cal-btn tdt-cal-btn--ics"
                      title="Download as .ics"
                      @click="downloadIcsForDoc(doc)"
                    >
                      <v-icon size="14" class="mr-1">mdi-calendar-arrow-right</v-icon>.ics
                    </button>
                  </div>
                </li>
              </ul>
              <div class="tdt-timeline__foot">
                <v-btn
                  size="x-small"
                  variant="text"
                  prepend-icon="mdi-cog-outline"
                  class="text-none"
                  @click="openComplianceDialog(doc)"
                >
                  View full review &amp; email reminders
                </v-btn>
              </div>
            </div>
          </article>

          <!-- Load more -->
          <div v-if="hasMore" class="tdt-loadmore">
            <v-btn
              variant="tonal"
              color="primary"
              prepend-icon="mdi-tray-arrow-down"
              :loading="loadingMore"
              :disabled="loadingMore"
              class="text-none"
              @click="loadMore"
            >
              Load next {{ Math.min(PAGE_SIZE, pagination.total - documents.length) }} of {{ pagination.total - documents.length }} remaining
            </v-btn>
          </div>
        </div>
      </section>

      <!-- ── Consolidated upcoming-across-everything ───────────────────── -->
      <section v-if="upcomingDates.length > 0" class="tdt-upcoming mb-8">
        <div class="d-flex align-center mb-3">
          <v-icon icon="mdi-calendar-clock" color="primary" class="mr-2" />
          <h2 class="text-h6 font-weight-bold mb-0">Upcoming across every contract</h2>
          <v-spacer />
          <v-btn
            size="small"
            variant="tonal"
            color="primary"
            prepend-icon="mdi-calendar-arrow-right"
            class="text-none"
            @click="downloadAllUpcoming"
          >
            Download all as .ics
          </v-btn>
        </div>
        <v-alert
          v-if="hasMore"
          type="info"
          variant="tonal"
          density="compact"
          class="mb-3"
          icon="mdi-information-outline"
        >
          This view aggregates dates from your <strong>{{ documents.length }}</strong> loaded contracts.
          You have <strong>{{ pagination.total - documents.length }}</strong> more in your library —
          load them in to include their dates here too.
          <template #append>
            <v-btn
              size="small"
              variant="tonal"
              color="primary"
              :loading="loadingMore"
              class="text-none"
              @click="loadMore"
            >
              Load more
            </v-btn>
          </template>
        </v-alert>
        <div v-for="month in upcomingByMonth" :key="month.key" class="tdt-month">
          <h3 class="tdt-month__head">{{ month.label }}</h3>
          <ul class="tdt-month__list">
            <li
              v-for="d in month.items"
              :key="`${d.docId}-${d.label}-${d.date}`"
              class="tdt-date"
              :class="`tdt-date--${urgencyKind(d.date)}`"
            >
              <div class="tdt-date__urgency">
                <span class="tdt-dot" :class="`tdt-dot--${urgencyKind(d.date)}`" />
                <span class="tdt-date__when">{{ relativeWhen(d.date) }}</span>
              </div>
              <div class="tdt-date__main">
                <div class="tdt-date__label">{{ d.label }}</div>
                <div class="tdt-date__ctx text-caption text-medium-emphasis text-truncate">
                  from <strong>{{ d.docName }}</strong>
                  <template v-if="d.context"> · {{ d.context }}</template>
                </div>
              </div>
              <div class="tdt-date__day">{{ formatDateLong(d.date) }}</div>
              <div class="tdt-date__actions">
                <a
                  :href="googleUrlFor({ id: d.docId, originalName: d.docName }, d)"
                  target="_blank"
                  rel="noopener"
                  class="tdt-cal-btn"
                  title="Add to Google Calendar"
                >
                  <v-icon size="14" class="mr-1">mdi-google</v-icon>Google
                </a>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <!-- ── Disclaimer ────────────────────────────────────────────────── -->
      <v-card class="tdt-disclaimer pa-4" rounded="xl" elevation="0">
        <div class="d-flex align-start ga-3">
          <v-icon icon="mdi-shield-alert-outline" color="warning" size="22" class="mt-1" />
          <div>
            <div class="font-weight-bold text-body-2 mb-1">Informational only — not legal advice</div>
            <p class="text-caption text-medium-emphasis mb-0">
              This Compliance Review is generated by AI to help you summarize a contract and track
              important dates. It is not a substitute for legal counsel and may contain errors.
              Always confirm critical dates and terms against the original document, and consult a
              licensed lawyer for legal questions.
            </p>
          </div>
        </div>
      </v-card>
    </div>

    <!-- Reuses the existing dialog for the full review + email-reminder UI. -->
    <LegalAdviseDialog
      v-model="showLegalAdviseDialog"
      :doc="legalAdviseDoc"
      :review-data="legalReviewData"
      :loading="legalReviewLoading"
      :date-alerts="dateAlertItems"
      :saving-alerts="savingAlerts"
      @save-alerts="saveDateAlerts"
    />

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3500" location="top right">
      {{ snackbarText }}
      <template #actions>
        <v-btn icon="mdi-close" variant="text" @click="snackbar = false" />
      </template>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineComponent, h, onMounted, onBeforeUnmount } from 'vue'
import LegalAdviseDialog from '~/components/documents/LegalAdviseDialog.vue'
import {
  buildGoogleCalendarUrl,
  buildIcsCalendar,
  downloadIcs,
  safeFilename,
  type CalendarEventInput,
} from '~/utils/calendar'

definePageMeta({ layout: 'admin', middleware: ['admin'] })

useHead({ title: 'Transaction Date Tracker · Admin' })

// ── Auth helper ───────────────────────────────────────────────────────────
function getAuthHeaders(): Record<string, string> {
  if (process.client) {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }
  return {}
}

// ── Types ─────────────────────────────────────────────────────────────────
interface DocItem {
  id: number
  originalName: string
  type: string
  fileSize: number
  status: string
  createdAt: string
  filePath?: string
}

type DocStatus =
  | { kind: 'idle' }
  | { kind: 'loading'; startedAt: number }
  | { kind: 'reviewed'; dates: number; reviewedAt: string }
  | { kind: 'error'; message: string }

interface ReviewedDoc {
  review: {
    redFlags?: string[]
    importantNotes?: string[]
    importantDates?: Array<{ label: string; date: string; context?: string }>
    legalSummary?: string
    buyerImpact?: string
    sellerImpact?: string
    [k: string]: any
  }
  dateAlerts: any[]
}

interface FlatDate {
  docId: number
  docName: string
  label: string
  date: string // YYYY-MM-DD
  context?: string
}

// ── State ─────────────────────────────────────────────────────────────────
const documents = ref<DocItem[]>([])
const loading = ref(true)
const loadError = ref('')

// Pagination — first page on mount, "Load more" appends subsequent pages.
// Page size matches the server default so we send the smallest possible query.
const PAGE_SIZE = 50
const pagination = ref<{ page: number; limit: number; total: number; totalPages: number }>({
  page: 0,
  limit: PAGE_SIZE,
  total: 0,
  totalPages: 0,
})
const loadingMore = ref(false)

const selectedIds = ref<number[]>([])
const docStatus = ref<Record<number, DocStatus>>({})
const docErrors = ref<Record<number, boolean>>({})
const reviewedData = ref<Record<number, ReviewedDoc>>({})
const runningId = ref<number | null>(null)
const bulkRunning = ref(false)

// Re-hydrate-on-focus state — guards against double-fires and against running
// while another in-flight operation already owns the request channel.
const hydrating = ref(false)
const lastHydrateAt = ref(0)

// `now` ticks every 2s ONLY while at least one doc is in the loading state.
// Keeps the staged-copy progression ("Analyzing…" → "Still working…" →
// "Almost done…") fresh without burning a timer when nothing is running.
const now = ref(Date.now())
let loadingTicker: ReturnType<typeof setInterval> | null = null
function hasAnyLoading() {
  return Object.values(docStatus.value).some((s) => s?.kind === 'loading')
}
function ensureLoadingTicker() {
  if (!hasAnyLoading()) {
    if (loadingTicker) {
      clearInterval(loadingTicker)
      loadingTicker = null
    }
    return
  }
  if (loadingTicker) return
  now.value = Date.now()
  loadingTicker = setInterval(() => {
    now.value = Date.now()
    // Stop the timer the moment the last loading doc finishes — saves wakeups.
    if (!hasAnyLoading()) {
      if (loadingTicker) {
        clearInterval(loadingTicker)
        loadingTicker = null
      }
    }
  }, 2000)
}

// Drag & drop / upload
const fileInput = ref<HTMLInputElement | null>(null)
const dragging = ref(false)
const uploading = ref(false)
const uploadStatus = ref('')

// Reused dialog state
const showLegalAdviseDialog = ref(false)
const legalAdviseDoc = ref<DocItem | null>(null)
const legalReviewData = ref<{ review: any; dateAlerts: any[] } | null>(null)
const legalReviewLoading = ref(false)
const dateAlertItems = ref<Array<{ label: string; date: string; enabled: boolean; daysBefore: number }>>([])
const savingAlerts = ref(false)
const activeDocId = computed(() => legalAdviseDoc.value?.id ?? null)

// Snackbar
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')
function showSnackbar(msg: string, color: 'success' | 'error' | 'warning' | 'info' = 'success') {
  snackbarText.value = msg
  snackbarColor.value = color
  snackbar.value = true
}

// ── Static content ────────────────────────────────────────────────────────
const STEPS = [
  {
    title: 'Drop your contract',
    icon: 'mdi-cloud-upload-outline',
    body: 'Drag a PDF here or pick from your library. Multi-page AREA, OREA, BCREA forms — all fine.',
  },
  {
    title: 'AI reads it in seconds',
    icon: 'mdi-robot-outline',
    body: 'We extract every important date, summarize the deal, and flag risky terms in plain English.',
  },
  {
    title: 'Sync &amp; never miss',
    icon: 'mdi-calendar-check-outline',
    body: 'One-tap add each date to Google Calendar or download .ics — and switch on email reminders.',
  },
] as const

// ── Derived ───────────────────────────────────────────────────────────────
const pdfDocuments = computed(() =>
  documents.value.filter((d) => (d.type || '').toLowerCase() === 'pdf'),
)
function statusFor(id: number): DocStatus {
  return docStatus.value[id] || { kind: 'idle' }
}

const upcomingDates = computed<FlatDate[]>(() => {
  const out: FlatDate[] = []
  const today = startOfToday()
  for (const doc of pdfDocuments.value) {
    const r = reviewedData.value[doc.id]
    if (!r) continue
    for (const d of r.review.importantDates || []) {
      if (!isValidIsoDate(d.date)) continue
      // Skip dates that are 30+ days in the past — irrelevant noise.
      if (parseIso(d.date) < addDays(today, -30)) continue
      out.push({
        docId: doc.id,
        docName: doc.originalName,
        label: d.label || 'Important date',
        date: d.date,
        context: d.context,
      })
    }
  }
  out.sort((a, b) => a.date.localeCompare(b.date))
  return out
})

const upcomingByMonth = computed(() => {
  const groups = new Map<string, { key: string; label: string; items: FlatDate[] }>()
  for (const d of upcomingDates.value) {
    const key = d.date.slice(0, 7) // YYYY-MM
    const g = groups.get(key) ?? { key, label: monthLabel(key), items: [] }
    g.items.push(d)
    groups.set(key, g)
  }
  return Array.from(groups.values())
})

const stats = computed(() => {
  const analyzed = Object.keys(reviewedData.value).length
  const totalDates = Object.values(reviewedData.value).reduce(
    (acc, r) => acc + (r.review.importantDates || []).length,
    0,
  )
  const today = startOfToday()
  const fortnight = addDays(today, 14)
  const dueSoon = upcomingDates.value.filter((d) => {
    const dt = parseIso(d.date)
    return dt >= today && dt <= fortnight
  }).length
  return { analyzed, totalDates, dueSoon }
})

function datesForDoc(docId: number): FlatDate[] {
  const r = reviewedData.value[docId]
  if (!r) return []
  const today = startOfToday()
  return [...(r.review.importantDates || [])]
    .filter((d) => isValidIsoDate(d.date))
    .map((d) => ({
      docId,
      docName: pdfDocuments.value.find((x) => x.id === docId)?.originalName || 'Document',
      label: d.label || 'Important date',
      date: d.date,
      context: d.context,
    }))
    .sort((a, b) => {
      // Past dates last; future dates ascending; date NaN guarded above.
      const aPast = parseIso(a.date) < today
      const bPast = parseIso(b.date) < today
      if (aPast !== bPast) return aPast ? 1 : -1
      return a.date.localeCompare(b.date)
    })
}

// ── Loaders ───────────────────────────────────────────────────────────────
const hasMore = computed(
  () => documents.value.length < (pagination.value.total || 0),
)
const loadedRangeLabel = computed(() => {
  const shown = documents.value.length
  const total = pagination.value.total || shown
  if (total <= shown) return `Showing all ${total}`
  return `Showing ${shown} of ${total}`
})

async function loadDocuments() {
  loading.value = true
  loadError.value = ''
  try {
    const res: any = await $fetch('/api/admin/documents', {
      headers: getAuthHeaders(),
      params: { page: 1, limit: PAGE_SIZE },
    })
    documents.value = (res?.documents || []) as DocItem[]
    pagination.value = {
      page: res?.pagination?.page ?? 1,
      limit: res?.pagination?.limit ?? PAGE_SIZE,
      total: res?.pagination?.total ?? documents.value.length,
      totalPages: res?.pagination?.totalPages ?? 1,
    }
    void hydrateStatuses(pdfDocuments.value)
  } catch (e: any) {
    loadError.value =
      e?.data?.statusMessage ||
      e?.statusMessage ||
      'We could not load your documents. Please try again.'
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  try {
    const nextPage = (pagination.value.page || 1) + 1
    const res: any = await $fetch('/api/admin/documents', {
      headers: getAuthHeaders(),
      params: { page: nextPage, limit: PAGE_SIZE },
    })
    const incoming = (res?.documents || []) as DocItem[]
    // Defensive de-dupe: a doc could already be in the list if a recent upload
    // beat the next page server-side. Keep the existing instance to preserve
    // any reactive flags layered on top of it.
    const existingIds = new Set(documents.value.map((d) => d.id))
    const fresh = incoming.filter((d) => !existingIds.has(d.id))
    documents.value = [...documents.value, ...fresh]
    pagination.value = {
      page: res?.pagination?.page ?? nextPage,
      limit: res?.pagination?.limit ?? PAGE_SIZE,
      total: res?.pagination?.total ?? pagination.value.total,
      totalPages: res?.pagination?.totalPages ?? pagination.value.totalPages,
    }
    if (fresh.length > 0) {
      void hydrateStatuses(fresh.filter((d) => (d.type || '').toLowerCase() === 'pdf'))
    }
  } catch (e: any) {
    showSnackbar(
      e?.data?.statusMessage || e?.statusMessage || 'Could not load more documents.',
      'error',
    )
  } finally {
    loadingMore.value = false
  }
}

/**
 * Hydrate per-doc compliance-review status. Called:
 *   - after loadDocuments / loadMore (full page of fresh docs)
 *   - on tab focus / visibility change (only docs without a confirmed review,
 *     so we cheaply pick up any work the user did on /admin/documents)
 *
 * Errors are swallowed per-doc — hydration is best-effort and never throws.
 */
async function hydrateStatuses(docs: DocItem[]) {
  if (hydrating.value || docs.length === 0) return
  hydrating.value = true
  try {
    const CHUNK = 4
    for (let i = 0; i < docs.length; i += CHUNK) {
      const slice = docs.slice(i, i + CHUNK)
      await Promise.all(
        slice.map(async (doc) => {
          try {
            const res: any = await $fetch(
              `/api/admin/documents/${doc.id}/legal-review`,
              { headers: getAuthHeaders() },
            )
            if (res?.review) {
              reviewedData.value[doc.id] = {
                review: res.review,
                dateAlerts: res.dateAlerts || [],
              }
              docStatus.value[doc.id] = {
                kind: 'reviewed',
                dates: (res.review.importantDates || []).length,
                reviewedAt: res.review.reviewedAt,
              }
              // If a stale OCR-error chip was sitting on this card, clear it
              // — the doc clearly has a review now.
              if (docErrors.value[doc.id]) delete docErrors.value[doc.id]
            }
          } catch {
            // Best-effort — status stays as whatever it was.
          }
        }),
      )
    }
  } finally {
    hydrating.value = false
    lastHydrateAt.value = Date.now()
  }
}

/**
 * Re-hydrate after the user comes back to the tab. We only pull statuses for
 * docs that aren't already confirmed reviewed in the current session — that
 * cheaply catches:
 *   • OCR-error rows where the user went to the editor, ran OCR, came back
 *   • New reviews kicked off in /admin/documents in another tab
 * We also throttle so quick alt-tabs don't fan out a burst of API calls.
 */
function refreshStaleStatuses() {
  if (loading.value || bulkRunning.value || uploading.value || runningId.value !== null) return
  if (Date.now() - lastHydrateAt.value < 5_000) return
  const stale = pdfDocuments.value.filter(
    (doc) => !reviewedData.value[doc.id] || docErrors.value[doc.id],
  )
  if (stale.length === 0) return
  void hydrateStatuses(stale)
}

// ── Selection ─────────────────────────────────────────────────────────────
function toggleOne(id: number) {
  const idx = selectedIds.value.indexOf(id)
  if (idx === -1) selectedIds.value.push(id)
  else selectedIds.value.splice(idx, 1)
}

// ── OCR-needed detection ──────────────────────────────────────────────────
function isOcrNeededError(e: any): boolean {
  const status = e?.status || e?.statusCode || e?.response?.status
  const msg: string = e?.data?.statusMessage || e?.statusMessage || e?.message || ''
  if (status !== 400) return false
  return /extract enough text|scanned|image-only|run OCR/i.test(msg)
}

// ── Combined "Run review + open dialog if asked" ──────────────────────────
async function processDocument(doc: DocItem): Promise<'ok' | 'ocr' | 'error'> {
  if ((doc.type || '').toLowerCase() !== 'pdf') {
    showSnackbar('Only PDF documents can be analyzed.', 'warning')
    return 'error'
  }

  runningId.value = doc.id
  docStatus.value[doc.id] = { kind: 'loading', startedAt: Date.now() }
  delete docErrors.value[doc.id]
  ensureLoadingTicker()

  try {
    const res: any = await $fetch(`/api/admin/documents/${doc.id}/legal-review`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: {},
    })
    if (res?.success && res.review) {
      reviewedData.value[doc.id] = { review: res.review, dateAlerts: res.dateAlerts || [] }
      docStatus.value[doc.id] = {
        kind: 'reviewed',
        dates: (res.review.importantDates || []).length,
        reviewedAt: new Date().toISOString(),
      }
      const n = (res.review.importantDates || []).length
      showSnackbar(
        `Compliance review complete · ${n} date${n === 1 ? '' : 's'} extracted from "${doc.originalName}".`,
      )
      return 'ok'
    }
    throw new Error('Empty response from compliance review.')
  } catch (e: any) {
    if (isOcrNeededError(e)) {
      docErrors.value[doc.id] = true
      docStatus.value[doc.id] = {
        kind: 'error',
        message: 'Scanned PDF — open in editor to OCR first.',
      }
      showSnackbar(
        'This document looks scanned. Open it in the Documents editor and run OCR, then come back.',
        'warning',
      )
      return 'ocr'
    }
    const msg =
      e?.data?.statusMessage || e?.statusMessage || e?.message || 'Compliance review failed.'
    docStatus.value[doc.id] = { kind: 'error', message: msg }
    showSnackbar(msg, 'error')
    return 'error'
  } finally {
    runningId.value = null
    // Loading state is no longer 'loading' for this doc — let the ticker
    // shut itself down on its next tick (or sooner if nothing else is loading).
    ensureLoadingTicker()
  }
}

async function runBulk() {
  if (bulkRunning.value) return
  const ids = [...selectedIds.value]
  if (ids.length === 0) return
  bulkRunning.value = true
  let okCount = 0
  let ocrCount = 0
  let errCount = 0
  try {
    for (const id of ids) {
      const doc = pdfDocuments.value.find((d) => d.id === id)
      if (!doc) continue
      const outcome = await processDocument(doc)
      if (outcome === 'ok') okCount++
      else if (outcome === 'ocr') ocrCount++
      else errCount++
      // Pause between docs so Groq's per-minute rate window stays comfortable.
      if (ids.length > 1) await new Promise((r) => setTimeout(r, 800))
    }
  } finally {
    bulkRunning.value = false
    selectedIds.value = []
    if (ids.length > 1) {
      const parts = [
        okCount ? `${okCount} reviewed` : '',
        ocrCount ? `${ocrCount} need OCR` : '',
        errCount ? `${errCount} failed` : '',
      ].filter(Boolean)
      showSnackbar(`Batch complete · ${parts.join(' · ')}`, errCount ? 'warning' : 'success')
    }
  }
}

// ── Drag & drop upload ────────────────────────────────────────────────────
function onDrop(e: DragEvent) {
  dragging.value = false
  const files = Array.from(e.dataTransfer?.files || [])
  void uploadFiles(files)
}
function onFilePick(e: Event) {
  const target = e.target as HTMLInputElement
  const files = Array.from(target.files || [])
  void uploadFiles(files)
  target.value = '' // allow re-picking the same file later
}
// Mirrors the server-side cap in /api/admin/documents (formidable maxFileSize).
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024 // 50 MB
function fmtMb(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function uploadFiles(files: File[]) {
  const pdfs = files.filter((f) => /\.pdf$/i.test(f.name) || f.type === 'application/pdf')
  if (pdfs.length === 0) {
    showSnackbar('Only PDF contracts can be analyzed for transaction dates.', 'warning')
    return
  }
  // Fail fast on oversized files before sending megabytes over the wire.
  const tooBig = pdfs.find((f) => f.size > MAX_UPLOAD_BYTES)
  if (tooBig) {
    showSnackbar(
      `"${tooBig.name}" is ${fmtMb(tooBig.size)} — over the ${fmtMb(MAX_UPLOAD_BYTES)} per-file limit.`,
      'error',
    )
    return
  }
  if (uploading.value) return
  uploading.value = true
  let uploaded = 0
  let lastDoc: DocItem | null = null
  try {
    for (const file of pdfs) {
      uploadStatus.value =
        pdfs.length > 1
          ? `Uploading ${uploaded + 1} of ${pdfs.length}: ${file.name}…`
          : `Uploading ${file.name}…`
      const formData = new FormData()
      formData.append('file', file)
      try {
        const res: any = await $fetch('/api/admin/documents', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: formData,
        })
        if (res?.success && res.document) {
          documents.value = [res.document as DocItem, ...documents.value]
          lastDoc = res.document as DocItem
          uploaded++
          // Keep the "Showing X of Y" counter honest after fresh uploads.
          pagination.value.total = (pagination.value.total || 0) + 1
        }
      } catch (e: any) {
        const msg = e?.data?.message || e?.statusMessage || `Failed to upload ${file.name}`
        showSnackbar(msg, 'error')
      }
    }
    if (uploaded > 0) {
      showSnackbar(
        uploaded === 1
          ? `Uploaded "${lastDoc?.originalName}" — analyzing now…`
          : `Uploaded ${uploaded} contracts — analyzing now…`,
      )
      // Auto-analyze each freshly uploaded doc, sequentially.
      uploadStatus.value = 'Running compliance review…'
      const newlyUploaded = documents.value
        .slice(0, uploaded)
        .filter((d) => (d.type || '').toLowerCase() === 'pdf')
      for (const doc of newlyUploaded) {
        await processDocument(doc)
        if (newlyUploaded.length > 1) await new Promise((r) => setTimeout(r, 800))
      }
    }
  } finally {
    uploading.value = false
    uploadStatus.value = ''
  }
}

// ── Open the full review/alerts dialog ────────────────────────────────────
function openComplianceDialog(doc: DocItem) {
  const r = reviewedData.value[doc.id]
  if (!r) return
  legalAdviseDoc.value = doc
  legalReviewData.value = { review: r.review, dateAlerts: r.dateAlerts || [] }
  dateAlertItems.value = (r.review.importantDates || []).map((d: any) => ({
    label: d.label || 'Date',
    date: d.date || '',
    enabled: true,
    daysBefore: 2,
  }))
  legalReviewLoading.value = false
  showLegalAdviseDialog.value = true
}

// ── Save email reminders ──────────────────────────────────────────────────
async function saveDateAlerts(
  alerts: Array<{ label: string; date: string; enabled: boolean; daysBefore: number }>,
) {
  if (!legalAdviseDoc.value) return
  const enabled = alerts
    .filter((a) => a.enabled && a.date)
    .map((a) => ({ label: a.label, dueDate: a.date, daysBefore: a.daysBefore }))
  savingAlerts.value = true
  try {
    await $fetch(`/api/admin/documents/${legalAdviseDoc.value.id}/legal-review/alerts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: { alerts: enabled },
    })
    showSnackbar(
      enabled.length
        ? `Reminders set for ${enabled.length} date${enabled.length === 1 ? '' : 's'}.`
        : 'Reminders cleared.',
    )
  } catch (e: any) {
    showSnackbar(e?.data?.statusMessage || 'Failed to save reminders.', 'error')
  } finally {
    savingAlerts.value = false
  }
}

// ── Calendar helpers (per-row buttons) ────────────────────────────────────
function googleUrlFor(
  doc: { id: number | string; originalName: string },
  d: { label: string; date: string; context?: string },
) {
  const ev: CalendarEventInput = {
    label: d.label,
    date: d.date,
    daysBefore: 2,
    context: d.context,
  }
  return buildGoogleCalendarUrl(ev, doc.originalName)
}

function downloadIcsForDoc(doc: DocItem) {
  const r = reviewedData.value[doc.id]
  if (!r) return
  const events: CalendarEventInput[] = (r.review.importantDates || [])
    .filter((d: any) => isValidIsoDate(d.date))
    .map((d: any) => ({
      label: d.label || 'Important date',
      date: d.date,
      daysBefore: 2,
      context: d.context,
    }))
  if (!events.length) {
    showSnackbar('No exportable dates on this contract.', 'warning')
    return
  }
  const ics = buildIcsCalendar(events, { documentName: doc.originalName, documentId: doc.id })
  downloadIcs(`${safeFilename(doc.originalName)}-dates`, ics)
}

function downloadAllUpcoming() {
  const events: CalendarEventInput[] = upcomingDates.value.map((d) => ({
    label: `${d.label} – ${d.docName}`,
    date: d.date,
    daysBefore: 2,
    context: d.context,
  }))
  if (!events.length) {
    showSnackbar('No upcoming dates to export.', 'warning')
    return
  }
  const ics = buildIcsCalendar(events, { documentName: 'All contracts' })
  downloadIcs(`upcoming-contract-dates`, ics)
}

// ── Date / display helpers ────────────────────────────────────────────────
function isValidIsoDate(d: string | undefined): d is string {
  return !!d && /^\d{4}-\d{2}-\d{2}$/.test(d)
}
function parseIso(d: string): Date {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y!, (m || 1) - 1, day || 1)
}
function startOfToday(): Date {
  const t = new Date()
  return new Date(t.getFullYear(), t.getMonth(), t.getDate())
}
function addDays(d: Date, n: number): Date {
  const o = new Date(d)
  o.setDate(o.getDate() + n)
  return o
}
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}
function urgencyKind(date: string): 'overdue' | 'urgent' | 'soon' | 'later' {
  const today = startOfToday()
  const dt = parseIso(date)
  const diff = daysBetween(today, dt)
  if (diff < 0) return 'overdue'
  if (diff <= 7) return 'urgent'
  if (diff <= 30) return 'soon'
  return 'later'
}
function relativeWhen(date: string): string {
  const today = startOfToday()
  const dt = parseIso(date)
  const diff = daysBetween(today, dt)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff < 0) return `${Math.abs(diff)} days ago`
  if (diff < 14) return `In ${diff} days`
  if (diff < 60) return `In ${Math.round(diff / 7)} weeks`
  return `In ${Math.round(diff / 30)} months`
}
function formatDate(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
function formatDateLong(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
function monthLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number)
  return new Date(y!, (m || 1) - 1, 1).toLocaleDateString('en-CA', {
    month: 'long',
    year: 'numeric',
  })
}

// ── Tiny inline status chip ───────────────────────────────────────────────
// Loading copy is staged to give users reassurance during longer reviews
// without exposing any internals (provider names, retries, etc.):
//   0–8s    → "Analyzing…"
//   8–25s   → "Still working…"
//   25s+    → "Almost done…"
// The thresholds are intentionally generous so we never undershoot: if we
// say "Almost done" we want to actually be close, not trigger user impatience.
function loadingCopy(elapsedMs: number): string {
  if (elapsedMs >= 25_000) return 'Almost done…'
  if (elapsedMs >= 8_000) return 'Still working…'
  return 'Analyzing…'
}

const StatusChip = defineComponent({
  name: 'StatusChip',
  props: {
    state: { type: Object as () => DocStatus, required: true },
  },
  setup(props) {
    return () => {
      const s = props.state
      const classes: Record<string, string> = {
        idle: 'tdt-pill tdt-pill--idle',
        loading: 'tdt-pill tdt-pill--loading',
        reviewed: 'tdt-pill tdt-pill--ok',
        error: 'tdt-pill tdt-pill--err',
      }
      const text =
        s.kind === 'idle'
          ? 'Not analyzed'
          : s.kind === 'loading'
            ? loadingCopy(now.value - s.startedAt)
            : s.kind === 'reviewed'
              ? `${s.dates} date${s.dates === 1 ? '' : 's'}`
              : s.message
      return h('span', { class: classes[s.kind] }, text)
    }
  },
})

// ── Lifecycle ─────────────────────────────────────────────────────────────
function onPageVisible() {
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
    refreshStaleStatuses()
  }
}
function onWindowFocus() {
  refreshStaleStatuses()
}

onMounted(() => {
  loadDocuments()
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onPageVisible)
  }
  if (typeof window !== 'undefined') {
    // `focus` covers Safari/iOS where visibilitychange can be stingy, and
    // also the case where the browser was already foregrounded but the user
    // tabbed in from another window.
    window.addEventListener('focus', onWindowFocus)
  }
})

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', onPageVisible)
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('focus', onWindowFocus)
  }
  if (loadingTicker) {
    clearInterval(loadingTicker)
    loadingTicker = null
  }
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap');

.tdt-shell {
  background: #f7f6f2;
  min-height: 100%;
}
.display-serif { font-family: 'Playfair Display', serif; }
.min-w-0 { min-width: 0; }
.ga-3 { gap: 12px; }
.ga-4 { gap: 16px; }

/* ── Hero ─────────────────────────────────────────────────────────────── */
.tdt-hero h1 {
  letter-spacing: -0.5px;
  line-height: 1.1;
}
.tdt-stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  min-width: 320px;
}
.tdt-stat {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 14px;
  padding: 14px 16px;
  text-align: center;
}
.tdt-stat__num {
  font-family: 'Playfair Display', serif;
  font-size: 28px;
  line-height: 1.1;
  color: #2c2418;
}
.tdt-stat__lbl {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(0, 0, 0, 0.55);
  margin-top: 4px;
  font-weight: 600;
}
.tdt-stat--alert {
  background: linear-gradient(135deg, #fff8e8, #ffffff);
  border-color: rgba(255, 152, 0, 0.35);
}
.tdt-stat--alert .tdt-stat__num { color: #c8770a; }

/* ── Steps ────────────────────────────────────────────────────────────── */
.tdt-steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
}
.tdt-step {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 16px;
  padding: 18px;
  display: flex;
  gap: 14px;
}
.tdt-step__num {
  font-family: 'Playfair Display', serif;
  font-size: 24px;
  color: #8c734b;
  flex: 0 0 auto;
  line-height: 1;
}

/* ── Drop zone ────────────────────────────────────────────────────────── */
.tdt-drop {
  background: #ffffff;
  border: 2px dashed rgba(140, 115, 75, 0.35);
  border-radius: 18px;
  padding: 36px 24px;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
}
.tdt-drop:hover {
  border-color: #8c734b;
  background: #fdfcf9;
}
.tdt-drop--over {
  border-color: #1976d2;
  background: rgba(25, 118, 210, 0.04);
  transform: scale(1.005);
}
.tdt-drop--busy {
  cursor: progress;
  border-style: solid;
  background: #fdfcf9;
}

/* ── Doc cards ────────────────────────────────────────────────────────── */
.tdt-card {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 16px;
}
.tdt-doc-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.tdt-doc-list__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: rgba(0, 0, 0, 0.5);
  font-weight: 700;
  padding: 0 4px 2px;
}
.tdt-doc-list__hydrating {
  display: inline-flex;
  align-items: center;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0;
  color: #1565c0;
}
.tdt-loadmore {
  text-align: center;
  margin-top: 6px;
  padding: 8px;
}
.tdt-doc {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 16px;
  overflow: hidden;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.tdt-doc:hover {
  border-color: rgba(140, 115, 75, 0.25);
}
.tdt-doc--reviewed {
  border-color: rgba(46, 125, 50, 0.25);
}
.tdt-doc--active {
  box-shadow: 0 4px 18px rgba(140, 115, 75, 0.15);
}
.tdt-doc__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 18px;
}

/* ── Status pills ─────────────────────────────────────────────────────── */
.tdt-pill {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
  letter-spacing: 0.3px;
  white-space: nowrap;
}
.tdt-pill--idle    { background: #f1efeb; color: #6c5f4a; }
.tdt-pill--loading { background: rgba(25, 118, 210, 0.12); color: #1565c0; }
.tdt-pill--ok      { background: rgba(46, 125, 50, 0.12); color: #2e7d32; }
.tdt-pill--err     { background: rgba(237, 108, 2, 0.14); color: #b15c00; }

/* ── Inline timeline preview ──────────────────────────────────────────── */
.tdt-timeline {
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  background: linear-gradient(180deg, rgba(140, 115, 75, 0.03), transparent 30%);
  padding: 10px 18px 14px;
}
.tdt-timeline__list,
.tdt-month__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.tdt-timeline__empty {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  padding: 8px 0;
}
.tdt-timeline__foot {
  margin-top: 8px;
  text-align: right;
}

/* Date row — used in both inline timeline + consolidated upcoming view */
.tdt-date {
  display: grid;
  grid-template-columns: 130px 1fr 160px auto;
  gap: 12px;
  align-items: center;
  padding: 8px 12px;
  background: #fdfcf9;
  border: 1px solid rgba(0, 0, 0, 0.04);
  border-radius: 10px;
}
.tdt-date--overdue { background: #fff4f4; border-color: rgba(198, 40, 40, 0.18); }
.tdt-date--urgent  { background: #fff8e8; border-color: rgba(237, 108, 2, 0.22); }
.tdt-date--soon    { background: #fdfcf9; border-color: rgba(140, 115, 75, 0.18); }
.tdt-date--later   { background: #fdfcf9; border-color: rgba(0, 0, 0, 0.04); }

.tdt-date__urgency {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.tdt-date__when {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.6);
}
.tdt-date--overdue .tdt-date__when { color: #c62828; }
.tdt-date--urgent  .tdt-date__when { color: #b15c00; }

.tdt-date__main { min-width: 0; }
.tdt-date__label { font-weight: 600; font-size: 14px; }
.tdt-date__ctx { font-size: 11px; }
.tdt-date__day {
  font-family: 'Playfair Display', serif;
  font-size: 16px;
  color: #2c2418;
  text-align: right;
}
.tdt-date__actions { display: flex; gap: 6px; flex-shrink: 0; }

.tdt-cal-btn {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  text-decoration: none;
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(25, 118, 210, 0.1);
  color: #1565c0;
  border: none;
  cursor: pointer;
  transition: background 0.15s ease;
  white-space: nowrap;
}
.tdt-cal-btn:hover { background: rgba(25, 118, 210, 0.2); }
.tdt-cal-btn--ics {
  background: rgba(46, 125, 50, 0.1);
  color: #2e7d32;
}
.tdt-cal-btn--ics:hover { background: rgba(46, 125, 50, 0.2); }

.tdt-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.tdt-dot--overdue { background: #c62828; }
.tdt-dot--urgent  { background: #ed6c02; }
.tdt-dot--soon    { background: #8c734b; }
.tdt-dot--later   { background: #b8b8b8; }

/* ── Upcoming consolidated view ───────────────────────────────────────── */
.tdt-month + .tdt-month { margin-top: 16px; }
.tdt-month__head {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.55);
  margin: 0 0 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

/* ── Disclaimer ───────────────────────────────────────────────────────── */
.tdt-disclaimer {
  background: linear-gradient(135deg, #ffffff, #fff8e8) !important;
  border: 1px solid rgba(255, 152, 0, 0.2) !important;
}

/* ── Responsive ───────────────────────────────────────────────────────── */
@media (max-width: 900px) {
  .tdt-date {
    grid-template-columns: 1fr;
    gap: 6px;
  }
  .tdt-date__day { text-align: left; }
  .tdt-stats-grid { min-width: unset; width: 100%; }
}
</style>
