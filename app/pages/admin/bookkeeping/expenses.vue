<template>
  <div class="expenses-page px-md-8 py-md-6">
    <v-container fluid>
      <!-- ═══════════════════════════════════════════════════════════
           PAGE HEADER
           ═══════════════════════════════════════════════════════════ -->
      <v-row class="mb-6 align-center">
        <v-col cols="12" md="5">
          <div class="d-flex align-center mb-2">
            <v-btn icon="mdi-arrow-left" variant="text" size="small" class="mr-2" to="/admin/bookkeeping" />
            <div class="premium-accent-bar mr-4"></div>
            <span class="text-overline letter-spacing-2 text-gold">Financial Management</span>
          </div>
          <h1 class="display-serif text-h3 mb-1">Expenses</h1>
          <p class="text-subtitle-1 text-medium-emphasis font-weight-light">
            Track, scan, and manage all business expenses
          </p>
        </v-col>

        <v-col cols="12" md="7" class="d-flex align-center justify-md-end ga-3 flex-wrap">
          <v-select
            v-model="dateRangePreset"
            :items="datePresetOptions"
            label="Period"
            variant="outlined"
            density="compact"
            hide-details
            style="max-width: 170px;"
            class="premium-input"
            prepend-inner-icon="mdi-calendar-range"
            @update:model-value="onPresetChange"
          />

          <template v-if="dateRangePreset === 'custom'">
            <v-text-field
              v-model="dateFrom"
              type="date"
              label="From"
              variant="outlined"
              density="compact"
              hide-details
              style="max-width: 160px;"
              class="premium-input"
              @change="fetchExpenses"
            />
            <v-text-field
              v-model="dateTo"
              type="date"
              label="To"
              variant="outlined"
              density="compact"
              hide-details
              style="max-width: 160px;"
              class="premium-input"
              @change="fetchExpenses"
            />
          </template>

          <v-btn
            prepend-icon="mdi-camera"
            color="#8c734b"
            variant="flat"
            class="premium-btn"
            @click="openScanDialog"
          >
            Scan Receipt
          </v-btn>

          <v-btn
            prepend-icon="mdi-plus"
            color="#121212"
            variant="flat"
            class="premium-btn"
            @click="openAddDialog()"
          >
            Add Expense
          </v-btn>
        </v-col>
      </v-row>

      <!-- ═══════════════════════════════════════════════════════════
           SUMMARY BAR
           ═══════════════════════════════════════════════════════════ -->
      <v-row class="mb-8">
        <v-col
          v-for="(stat, idx) in summaryStats"
          :key="idx"
          cols="12"
          sm="4"
          class="d-flex"
        >
          <v-skeleton-loader v-if="loading" type="card" class="w-100 rounded-xl" />
          <v-card v-else class="stat-card-premium w-100" elevation="0">
            <v-card-text class="d-flex align-center pa-5">
              <div :class="['icon-orb mr-4', stat.orb]">
                <v-icon :icon="stat.icon" />
              </div>
              <div>
                <div class="text-h5 font-weight-bold letter-spacing-tight">{{ stat.value }}</div>
                <div class="text-caption text-medium-emphasis">{{ stat.label }}</div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- ═══════════════════════════════════════════════════════════
           EXPENSES TABLE
           ═══════════════════════════════════════════════════════════ -->
      <v-row class="mb-8">
        <v-col cols="12">
          <v-card class="analytics-card" elevation="0">
            <v-card-title class="d-flex align-center pa-6 flex-wrap ga-3">
              <v-icon icon="mdi-receipt-text" class="mr-2 text-gold" size="small" />
              <span class="display-serif text-h5">All Expenses</span>
              <v-spacer />

              <v-select
                v-model="filterCategory"
                :items="[{ title: 'All Categories', value: '' }, ...categoryOptions]"
                variant="outlined"
                density="compact"
                hide-details
                style="max-width: 180px;"
                class="premium-input"
                placeholder="Filter"
                @update:model-value="fetchExpenses"
              />

              <v-btn
                prepend-icon="mdi-download"
                variant="outlined"
                size="small"
                class="premium-btn-outlined"
                :loading="exporting"
                @click="exportCSV"
              >
                Export CSV
              </v-btn>
            </v-card-title>

            <v-divider class="opacity-10" />

            <v-card-text class="pa-0">
              <v-skeleton-loader v-if="loading" type="table-row@6" class="rounded-lg" />

              <!-- Desktop Table -->
              <v-table v-else-if="expenses.length" class="expenses-table d-none d-md-block">
                <thead>
                  <tr>
                    <th class="text-left">Date</th>
                    <th class="text-left">Vendor</th>
                    <th class="text-left">Category</th>
                    <th class="text-right">Subtotal</th>
                    <th class="text-right">Tax</th>
                    <th class="text-right">Total</th>
                    <th class="text-left">Payment</th>
                    <th class="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="expense in expenses"
                    :key="expense._id || expense.id"
                    class="expense-row"
                    @click="openEditDialog(expense)"
                  >
                    <td class="text-body-2">{{ formatDateShort(expense.date) }}</td>
                    <td class="text-body-2 font-weight-medium">{{ expense.vendor }}</td>
                    <td>
                      <v-chip
                        :color="getCategoryColor(expense.category)"
                        size="small"
                        variant="tonal"
                        class="text-capitalize font-weight-bold"
                      >
                        {{ formatCategoryLabel(expense.category) }}
                      </v-chip>
                    </td>
                    <td class="text-body-2 text-right">{{ formatCurrency(expense.subtotal) }}</td>
                    <td class="text-body-2 text-right">{{ formatCurrency(expense.taxTotal || 0) }}</td>
                    <td class="text-body-2 text-right font-weight-bold">{{ formatCurrency(expense.total) }}</td>
                    <td class="text-body-2 text-capitalize">{{ formatPaymentMethod(expense.paymentMethod) }}</td>
                    <td class="text-center">
                      <v-btn
                        icon="mdi-delete-outline"
                        variant="text"
                        size="small"
                        color="error"
                        @click.stop="confirmDelete(expense)"
                      />
                    </td>
                  </tr>
                </tbody>
              </v-table>

              <!-- Mobile List -->
              <v-list v-else-if="expenses.length" class="d-md-none py-0" bg-color="transparent">
                <v-list-item
                  v-for="expense in expenses"
                  :key="expense._id || expense.id"
                  class="px-4 py-3 list-item-hover"
                  @click="openEditDialog(expense)"
                >
                  <template #prepend>
                    <div class="tx-icon-orb tx-icon-orb--red mr-3">
                      <v-icon icon="mdi-arrow-up-bold" size="small" />
                    </div>
                  </template>
                  <v-list-item-title class="font-weight-bold text-body-2">
                    {{ expense.vendor }}
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-caption text-medium-emphasis">
                    {{ formatCategoryLabel(expense.category) }} &middot; {{ formatDateShort(expense.date) }}
                  </v-list-item-subtitle>
                  <template #append>
                    <div class="text-right">
                      <div class="text-body-2 font-weight-bold text-error">
                        {{ formatCurrency(expense.total) }}
                      </div>
                      <v-btn
                        icon="mdi-delete-outline"
                        variant="text"
                        size="x-small"
                        color="error"
                        @click.stop="confirmDelete(expense)"
                      />
                    </div>
                  </template>
                </v-list-item>
              </v-list>

              <!-- Empty State -->
              <div v-else class="text-center py-16 text-medium-emphasis">
                <v-icon icon="mdi-receipt-text-outline" size="64" class="mb-4 opacity-30" />
                <div class="text-h6 font-weight-light mb-2">No expenses found</div>
                <div class="text-caption mb-4">Add your first expense or scan a receipt to get started</div>
                <v-btn
                  prepend-icon="mdi-plus"
                  color="#8c734b"
                  variant="flat"
                  class="premium-btn"
                  @click="openAddDialog()"
                >
                  Add Expense
                </v-btn>
              </div>
            </v-card-text>

            <!-- Pagination -->
            <v-divider v-if="pagination.pages > 1" class="opacity-10" />
            <v-card-actions v-if="pagination.pages > 1" class="justify-center pa-4">
              <v-pagination
                v-model="currentPage"
                :length="pagination.pages"
                :total-visible="5"
                density="compact"
                rounded="lg"
                active-color="#8c734b"
                @update:model-value="fetchExpenses"
              />
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- ═══════════════════════════════════════════════════════════
         ADD / EDIT EXPENSE DIALOG
         ═══════════════════════════════════════════════════════════ -->
    <v-dialog v-model="expenseDialog" max-width="720" scrollable>
      <v-card class="dialog-card">
        <v-card-title class="d-flex align-center pa-6">
          <v-icon icon="mdi-receipt-text-edit" class="mr-2 text-gold" size="small" />
          <span class="display-serif text-h5">
            {{ editingExpense ? 'Edit Expense' : 'Add Expense' }}
          </span>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="expenseDialog = false" />
        </v-card-title>

        <v-divider class="opacity-10" />

        <!-- OCR Confidence Banner -->
        <v-alert
          v-if="ocrConfidence > 0"
          type="info"
          variant="tonal"
          density="compact"
          class="ma-4 rounded-lg"
          closable
        >
          <div class="d-flex align-center">
            <v-icon icon="mdi-brain" class="mr-2" size="small" />
            <span class="text-body-2">
              Receipt scanned with <strong>{{ (ocrConfidence * 100).toFixed(0) }}%</strong> confidence — please review fields below
            </span>
          </div>
        </v-alert>

        <v-card-text class="pa-6">
          <v-form ref="expenseFormRef" v-model="formValid">
            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.vendor"
                  label="Vendor Name *"
                  variant="outlined"
                  density="compact"
                  :rules="[rules.required]"
                  class="premium-input"
                  prepend-inner-icon="mdi-store"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.date"
                  label="Date *"
                  type="date"
                  variant="outlined"
                  density="compact"
                  :rules="[rules.required]"
                  class="premium-input"
                  prepend-inner-icon="mdi-calendar"
                />
              </v-col>

              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="form.subtotal"
                  label="Subtotal"
                  type="number"
                  variant="outlined"
                  density="compact"
                  prefix="$"
                  class="premium-input"
                  step="0.01"
                  min="0"
                  @update:model-value="recalcTotal"
                />
              </v-col>
              <v-col cols="6" sm="3">
                <v-text-field
                  v-model.number="form.gst"
                  label="GST"
                  type="number"
                  variant="outlined"
                  density="compact"
                  prefix="$"
                  class="premium-input"
                  step="0.01"
                  min="0"
                  @update:model-value="recalcTotal"
                />
              </v-col>
              <v-col cols="6" sm="3">
                <v-text-field
                  v-model.number="form.hst"
                  label="HST"
                  type="number"
                  variant="outlined"
                  density="compact"
                  prefix="$"
                  class="premium-input"
                  step="0.01"
                  min="0"
                  @update:model-value="recalcTotal"
                />
              </v-col>
              <v-col cols="6" sm="3">
                <v-text-field
                  v-model.number="form.pst"
                  label="PST"
                  type="number"
                  variant="outlined"
                  density="compact"
                  prefix="$"
                  class="premium-input"
                  step="0.01"
                  min="0"
                  @update:model-value="recalcTotal"
                />
              </v-col>
              <v-col cols="6" sm="3">
                <v-text-field
                  v-model.number="form.taxTotal"
                  label="Tax Total"
                  type="number"
                  variant="outlined"
                  density="compact"
                  prefix="$"
                  class="premium-input"
                  readonly
                  bg-color="#f9f9f7"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="form.total"
                  label="Total"
                  type="number"
                  variant="outlined"
                  density="compact"
                  prefix="$"
                  class="premium-input"
                  readonly
                  bg-color="#f9f9f7"
                />
              </v-col>

              <v-col cols="12" sm="6">
                <v-select
                  v-model="form.category"
                  :items="categoryOptions"
                  label="Category"
                  variant="outlined"
                  density="compact"
                  class="premium-input"
                  prepend-inner-icon="mdi-shape"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="form.paymentMethod"
                  :items="paymentMethodOptions"
                  label="Payment Method"
                  variant="outlined"
                  density="compact"
                  class="premium-input"
                  prepend-inner-icon="mdi-credit-card"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.receiptNumber"
                  label="Receipt Number"
                  variant="outlined"
                  density="compact"
                  class="premium-input"
                  prepend-inner-icon="mdi-pound"
                />
              </v-col>

              <v-col cols="12">
                <v-textarea
                  v-model="form.description"
                  label="Description"
                  variant="outlined"
                  density="compact"
                  rows="2"
                  auto-grow
                  class="premium-input"
                  prepend-inner-icon="mdi-text"
                />
              </v-col>

              <v-col cols="12">
                <v-file-input
                  v-model="receiptFile"
                  label="Receipt Upload"
                  variant="outlined"
                  density="compact"
                  accept="image/*,application/pdf"
                  prepend-icon=""
                  prepend-inner-icon="mdi-paperclip"
                  class="premium-input"
                  @update:model-value="previewReceipt"
                />
                <v-img
                  v-if="receiptPreview"
                  :src="receiptPreview"
                  max-height="200"
                  class="rounded-lg mt-2 border"
                  contain
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-divider class="opacity-10" />

        <v-card-actions class="pa-6">
          <v-spacer />
          <v-btn variant="text" class="mr-2" @click="expenseDialog = false">Cancel</v-btn>
          <v-btn
            color="#8c734b"
            variant="flat"
            class="premium-btn"
            :loading="saving"
            :disabled="!formValid"
            @click="saveExpense"
          >
            {{ editingExpense ? 'Update Expense' : 'Save Expense' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ═══════════════════════════════════════════════════════════
         OCR RECEIPT SCANNER DIALOG
         ═══════════════════════════════════════════════════════════ -->
    <v-dialog v-model="scanDialog" max-width="600" persistent>
      <v-card class="dialog-card">
        <v-card-title class="d-flex align-center pa-6">
          <v-icon icon="mdi-camera-enhance" class="mr-2 text-gold" size="small" />
          <span class="display-serif text-h5">Scan Receipt</span>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="closeScanDialog" />
        </v-card-title>

        <v-divider class="opacity-10" />

        <v-card-text class="pa-6 text-center">
          <!-- Camera Feed -->
          <div v-if="scanStep === 'camera'" class="camera-container">
            <video
              ref="videoRef"
              autoplay
              playsinline
              muted
              class="camera-feed rounded-xl"
            />
            <div class="camera-overlay">
              <div class="scan-frame"></div>
            </div>
            <v-btn
              icon="mdi-camera"
              color="#8c734b"
              size="x-large"
              class="capture-btn mt-4"
              elevation="4"
              @click="captureImage"
            />
          </div>

          <!-- Captured Image Preview -->
          <div v-else-if="scanStep === 'preview'">
            <v-img
              :src="capturedImage"
              max-height="360"
              class="rounded-xl mb-4 border"
              contain
            />
            <div class="d-flex justify-center ga-3">
              <v-btn
                prepend-icon="mdi-camera-retake"
                variant="outlined"
                class="premium-btn-outlined"
                @click="retakePhoto"
              >
                Retake
              </v-btn>
              <v-btn
                prepend-icon="mdi-text-recognition"
                color="#8c734b"
                variant="flat"
                class="premium-btn"
                :loading="ocrProcessing"
                @click="processOCR"
              >
                Process Receipt
              </v-btn>
            </div>
          </div>

          <!-- OCR Processing -->
          <div v-else-if="scanStep === 'processing'" class="py-8">
            <v-progress-circular indeterminate color="#8c734b" size="64" width="4" class="mb-4" />
            <div class="text-h6 font-weight-light mb-2">Reading receipt...</div>
            <div class="text-caption text-medium-emphasis">{{ ocrStatus }}</div>
          </div>

          <!-- OCR Result -->
          <div v-else-if="scanStep === 'result'" class="text-left">
            <v-alert type="success" variant="tonal" density="compact" class="rounded-lg mb-4">
              <div class="d-flex align-center">
                <v-icon icon="mdi-check-circle" class="mr-2" size="small" />
                <span class="text-body-2">
                  Receipt processed — <strong>{{ (ocrConfidence * 100).toFixed(0) }}%</strong> confidence
                </span>
              </div>
            </v-alert>

            <div class="ocr-text-preview rounded-lg pa-4 mb-4">
              <div class="text-overline text-medium-emphasis mb-2">Extracted Text</div>
              <pre class="text-caption ocr-raw-text">{{ ocrRawText }}</pre>
            </div>

            <div class="d-flex justify-center ga-3">
              <v-btn
                prepend-icon="mdi-camera-retake"
                variant="outlined"
                class="premium-btn-outlined"
                @click="retakePhoto"
              >
                Rescan
              </v-btn>
              <v-btn
                prepend-icon="mdi-pencil"
                color="#8c734b"
                variant="flat"
                class="premium-btn"
                @click="useOcrData"
              >
                Use Data &amp; Edit
              </v-btn>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- ═══════════════════════════════════════════════════════════
         DELETE CONFIRMATION DIALOG
         ═══════════════════════════════════════════════════════════ -->
    <v-dialog v-model="deleteDialog" max-width="420">
      <v-card class="dialog-card">
        <v-card-title class="d-flex align-center pa-6">
          <v-icon icon="mdi-alert-circle" color="error" class="mr-2" size="small" />
          <span class="display-serif text-h6">Confirm Delete</span>
        </v-card-title>
        <v-card-text class="px-6 pb-2">
          <p class="text-body-2">
            Are you sure you want to delete the expense from
            <strong>{{ deletingExpense?.vendor }}</strong> for
            <strong>{{ formatCurrency(deletingExpense?.total || 0) }}</strong>?
            This action cannot be undone.
          </p>
        </v-card-text>
        <v-card-actions class="pa-6">
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn
            color="error"
            variant="flat"
            class="premium-btn"
            :loading="deleting"
            @click="deleteExpense"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ═══════════════════════════════════════════════════════════
         SNACKBAR NOTIFICATIONS
         ═══════════════════════════════════════════════════════════ -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" location="top right" rounded="lg" :timeout="4000">
      <div class="d-flex align-center">
        <v-icon :icon="snackbarColor === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle'" class="mr-2" />
        {{ snackbarMessage }}
      </div>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'

definePageMeta({
  layout: 'admin',
  middleware: ['admin']
})

// ─── Auth ────────────────────────────────────────────────────
const getAuthHeaders = (): Record<string, string> => {
  if (process.client) {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }
  return {}
}

// ─── Types ───────────────────────────────────────────────────
interface Expense {
  _id?: string
  id?: string
  vendor: string
  date: string
  subtotal: number
  gst: number
  hst: number
  pst: number
  taxTotal: number
  total: number
  category: string
  description: string
  paymentMethod: string
  receiptNumber: string
  receiptUrl?: string
}

interface Pagination {
  total: number
  page: number
  limit: number
  pages: number
}

interface ExpenseForm {
  vendor: string
  date: string
  subtotal: number
  gst: number
  hst: number
  pst: number
  taxTotal: number
  total: number
  category: string
  description: string
  paymentMethod: string
  receiptNumber: string
}

// ─── Route ───────────────────────────────────────────────────
const route = useRoute()

// ─── Date Range ──────────────────────────────────────────────
const dateRangePreset = ref('this_month')
const dateFrom = ref('')
const dateTo = ref('')

const datePresetOptions = [
  { title: 'This Month', value: 'this_month' },
  { title: 'This Quarter', value: 'this_quarter' },
  { title: 'This Year', value: 'this_year' },
  { title: 'Custom', value: 'custom' }
]

const getDateRange = () => {
  const now = new Date()
  let from: Date
  let to: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (dateRangePreset.value) {
    case 'this_month':
      from = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'this_quarter': {
      const quarter = Math.floor(now.getMonth() / 3)
      from = new Date(now.getFullYear(), quarter * 3, 1)
      break
    }
    case 'this_year':
      from = new Date(now.getFullYear(), 0, 1)
      break
    case 'custom':
      return { from: dateFrom.value, to: dateTo.value }
    default:
      from = new Date(now.getFullYear(), now.getMonth(), 1)
  }

  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0]
  }
}

const onPresetChange = () => {
  if (dateRangePreset.value !== 'custom') {
    const range = getDateRange()
    dateFrom.value = range.from
    dateTo.value = range.to
    fetchExpenses()
  }
}

// ─── State ───────────────────────────────────────────────────
const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const exporting = ref(false)

const expenses = ref<Expense[]>([])
const pagination = ref<Pagination>({ total: 0, page: 1, limit: 20, pages: 0 })
const summary = ref({ totalAmount: 0, count: 0 })
const currentPage = ref(1)
const filterCategory = ref('')

const expenseDialog = ref(false)
const deleteDialog = ref(false)
const editingExpense = ref<Expense | null>(null)
const deletingExpense = ref<Expense | null>(null)

const formValid = ref(false)
const expenseFormRef = ref()
const receiptFile = ref<File[]>([])
const receiptPreview = ref('')
const ocrConfidence = ref(0)

const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')

// ─── Form ────────────────────────────────────────────────────
const defaultForm = (): ExpenseForm => ({
  vendor: '',
  date: new Date().toISOString().split('T')[0],
  subtotal: 0,
  gst: 0,
  hst: 0,
  pst: 0,
  taxTotal: 0,
  total: 0,
  category: 'general',
  description: '',
  paymentMethod: 'credit',
  receiptNumber: ''
})

const form = ref<ExpenseForm>(defaultForm())

const rules = {
  required: (v: string) => !!v || 'Required'
}

const recalcTotal = () => {
  const gst = Number(form.value.gst) || 0
  const hst = Number(form.value.hst) || 0
  const pst = Number(form.value.pst) || 0
  form.value.taxTotal = Math.round((gst + hst + pst) * 100) / 100
  form.value.total = Math.round(((Number(form.value.subtotal) || 0) + form.value.taxTotal) * 100) / 100
}

// ─── Category Options ────────────────────────────────────────
const categoryOptions = [
  { title: 'Advertising', value: 'advertising' },
  { title: 'Auto', value: 'auto' },
  { title: 'Bank Fees', value: 'bank_fees' },
  { title: 'Commissions', value: 'commissions' },
  { title: 'Education', value: 'education' },
  { title: 'Equipment', value: 'equipment' },
  { title: 'Insurance', value: 'insurance' },
  { title: 'Legal', value: 'legal' },
  { title: 'Meals', value: 'meals' },
  { title: 'Office Supplies', value: 'office_supplies' },
  { title: 'Phone', value: 'phone' },
  { title: 'Rent', value: 'rent' },
  { title: 'Repairs', value: 'repairs' },
  { title: 'Software', value: 'software' },
  { title: 'Travel', value: 'travel' },
  { title: 'Utilities', value: 'utilities' },
  { title: 'Wages', value: 'wages' },
  { title: 'General', value: 'general' },
  { title: 'Other', value: 'other' }
]

const paymentMethodOptions = [
  { title: 'Cash', value: 'cash' },
  { title: 'Credit Card', value: 'credit' },
  { title: 'Debit Card', value: 'debit' },
  { title: 'E-Transfer', value: 'etransfer' },
  { title: 'Cheque', value: 'cheque' }
]

const categoryColorMap: Record<string, string> = {
  advertising: '#7B1FA2',
  auto: '#1565C0',
  bank_fees: '#455A64',
  commissions: '#00838F',
  education: '#2E7D32',
  equipment: '#EF6C00',
  insurance: '#4527A0',
  legal: '#AD1457',
  meals: '#F9A825',
  office_supplies: '#6D4C41',
  phone: '#0097A7',
  rent: '#C62828',
  repairs: '#FF6F00',
  software: '#1565C0',
  travel: '#00695C',
  utilities: '#558B2F',
  wages: '#D84315',
  general: '#546E7A',
  other: '#78909C'
}

const getCategoryColor = (cat: string): string => categoryColorMap[cat] || '#546E7A'

const formatCategoryLabel = (cat: string): string => {
  if (!cat) return ''
  return cat.replace(/_/g, ' ')
}

const formatPaymentMethod = (method: string): string => {
  if (!method) return ''
  const map: Record<string, string> = {
    cash: 'Cash',
    credit: 'Credit',
    debit: 'Debit',
    etransfer: 'E-Transfer',
    cheque: 'Cheque'
  }
  return map[method] || method
}

// ─── Helpers ─────────────────────────────────────────────────
const formatCurrency = (value: number): string => {
  if (value == null) return '$0.00'
  const abs = Math.abs(value)
  const formatted = abs.toLocaleString('en-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  return value < 0 ? `-$${formatted}` : `$${formatted}`
}

const formatDateShort = (date: string): string => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

// ─── Summary Stats ───────────────────────────────────────────
const summaryStats = computed(() => {
  const avg = summary.value.count > 0
    ? summary.value.totalAmount / summary.value.count
    : 0
  return [
    {
      label: 'Total Expenses',
      value: formatCurrency(summary.value.totalAmount),
      icon: 'mdi-cash-multiple',
      orb: 'error-orb'
    },
    {
      label: 'Number of Expenses',
      value: summary.value.count.toLocaleString(),
      icon: 'mdi-receipt-text',
      orb: 'gold-orb'
    },
    {
      label: 'Average per Expense',
      value: formatCurrency(avg),
      icon: 'mdi-chart-timeline-variant',
      orb: 'info-orb'
    }
  ]
})

// ─── Receipt Preview ─────────────────────────────────────────
const previewReceipt = () => {
  if (receiptFile.value && receiptFile.value.length > 0) {
    const file = receiptFile.value[0]
    if (file && file.type?.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        receiptPreview.value = e.target?.result as string
      }
      reader.readAsDataURL(file)
    } else {
      receiptPreview.value = ''
    }
  } else {
    receiptPreview.value = ''
  }
}

// ─── Dialog Handlers ─────────────────────────────────────────
const openAddDialog = () => {
  editingExpense.value = null
  form.value = defaultForm()
  receiptFile.value = []
  receiptPreview.value = ''
  ocrConfidence.value = 0
  expenseDialog.value = true
}

const openEditDialog = (expense: Expense) => {
  editingExpense.value = expense
  form.value = {
    vendor: expense.vendor || '',
    date: expense.date ? expense.date.split('T')[0] : '',
    subtotal: expense.subtotal || 0,
    gst: expense.gst || 0,
    hst: expense.hst || 0,
    pst: expense.pst || 0,
    taxTotal: expense.taxTotal || 0,
    total: expense.total || 0,
    category: expense.category || 'general',
    description: expense.description || '',
    paymentMethod: expense.paymentMethod || 'credit',
    receiptNumber: expense.receiptNumber || ''
  }
  receiptFile.value = []
  receiptPreview.value = expense.receiptUrl || ''
  ocrConfidence.value = 0
  expenseDialog.value = true
}

const confirmDelete = (expense: Expense) => {
  deletingExpense.value = expense
  deleteDialog.value = true
}

// ─── OCR Scanner ─────────────────────────────────────────────
const scanDialog = ref(false)
const scanStep = ref<'camera' | 'preview' | 'processing' | 'result'>('camera')
const videoRef = ref<HTMLVideoElement | null>(null)
const capturedImage = ref('')
const ocrProcessing = ref(false)
const ocrStatus = ref('')
const ocrRawText = ref('')
let mediaStream: MediaStream | null = null
let ocrParsedData: Record<string, any> = {}

const openScanDialog = async () => {
  scanStep.value = 'camera'
  capturedImage.value = ''
  ocrRawText.value = ''
  ocrConfidence.value = 0
  scanDialog.value = true

  await nextTick()
  await startCamera()
}

const startCamera = async () => {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    })
    await nextTick()
    if (videoRef.value) {
      videoRef.value.srcObject = mediaStream
    }
  } catch (err) {
    console.error('Camera access denied:', err)
    showSnackbar('Camera access denied. Please allow camera permissions.', 'error')
    scanDialog.value = false
  }
}

const stopCamera = () => {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop())
    mediaStream = null
  }
}

const captureImage = () => {
  if (!videoRef.value) return

  const canvas = document.createElement('canvas')
  canvas.width = videoRef.value.videoWidth
  canvas.height = videoRef.value.videoHeight
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.drawImage(videoRef.value, 0, 0)
    capturedImage.value = canvas.toDataURL('image/png')
    scanStep.value = 'preview'
    stopCamera()
  }
}

const retakePhoto = async () => {
  scanStep.value = 'camera'
  capturedImage.value = ''
  ocrRawText.value = ''
  await nextTick()
  await startCamera()
}

const processOCR = async () => {
  if (!capturedImage.value) return

  ocrProcessing.value = true
  scanStep.value = 'processing'
  ocrStatus.value = 'Initializing OCR engine...'

  try {
    const { createWorker } = await import('tesseract.js')
    const worker = await createWorker('eng')

    ocrStatus.value = 'Reading receipt text...'
    const { data } = await worker.recognize(capturedImage.value)
    ocrRawText.value = data.text
    ocrConfidence.value = data.confidence / 100

    await worker.terminate()

    ocrStatus.value = 'Parsing receipt data...'
    const parsed = await $fetch<{ success: boolean; data: Record<string, any> }>(
      '/api/admin/bookkeeping/ocr-parse',
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: { text: ocrRawText.value }
      }
    )

    if (parsed.success && parsed.data) {
      ocrParsedData = parsed.data
      ocrConfidence.value = parsed.data.confidence || ocrConfidence.value
    }

    scanStep.value = 'result'
  } catch (err: any) {
    console.error('OCR processing error:', err)
    showSnackbar('Failed to process receipt. Please try again.', 'error')
    scanStep.value = 'preview'
  } finally {
    ocrProcessing.value = false
  }
}

const useOcrData = () => {
  form.value = {
    ...defaultForm(),
    vendor: ocrParsedData.vendor || '',
    date: ocrParsedData.date ? ocrParsedData.date.split('T')[0] : new Date().toISOString().split('T')[0],
    subtotal: Number(ocrParsedData.subtotal) || 0,
    gst: Number(ocrParsedData.gst) || 0,
    hst: Number(ocrParsedData.hst) || 0,
    pst: Number(ocrParsedData.pst) || 0,
    taxTotal: Number(ocrParsedData.taxTotal) || 0,
    total: Number(ocrParsedData.total) || 0,
    receiptNumber: ocrParsedData.receiptNumber || ''
  }
  receiptPreview.value = capturedImage.value
  scanDialog.value = false
  stopCamera()
  expenseDialog.value = true
}

const closeScanDialog = () => {
  stopCamera()
  scanDialog.value = false
}

// ─── API Calls ───────────────────────────────────────────────
const fetchExpenses = async () => {
  loading.value = true
  try {
    const range = getDateRange()
    const params = new URLSearchParams({
      page: String(currentPage.value),
      limit: '20',
      dateFrom: range.from,
      dateTo: range.to
    })
    if (filterCategory.value) {
      params.set('category', filterCategory.value)
    }

    const data = await $fetch<{
      expenses: Expense[]
      pagination: Pagination
      summary: { totalAmount: number; count: number }
    }>(`/api/admin/bookkeeping/expenses?${params.toString()}`, {
      headers: getAuthHeaders()
    })

    expenses.value = data.expenses || []
    pagination.value = data.pagination || { total: 0, page: 1, limit: 20, pages: 0 }
    summary.value = data.summary || { totalAmount: 0, count: 0 }
  } catch (err: any) {
    console.error('Error loading expenses:', err)
    showSnackbar(err?.data?.statusMessage || 'Failed to load expenses', 'error')
  } finally {
    loading.value = false
  }
}

const saveExpense = async () => {
  saving.value = true
  try {
    const body: Record<string, any> = { ...form.value }

    if (editingExpense.value) {
      body.id = editingExpense.value._id || editingExpense.value.id
    }

    if (receiptFile.value && receiptFile.value.length > 0) {
      const file = receiptFile.value[0]
      const reader = new FileReader()
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.readAsDataURL(file)
      })
      body.receiptBase64 = base64
      body.receiptFilename = file.name
    }

    await $fetch('/api/admin/bookkeeping/expenses', {
      method: 'POST',
      headers: getAuthHeaders(),
      body
    })

    showSnackbar(
      editingExpense.value ? 'Expense updated successfully' : 'Expense added successfully',
      'success'
    )
    expenseDialog.value = false
    await fetchExpenses()
  } catch (err: any) {
    console.error('Error saving expense:', err)
    showSnackbar(err?.data?.statusMessage || 'Failed to save expense', 'error')
  } finally {
    saving.value = false
  }
}

const deleteExpense = async () => {
  if (!deletingExpense.value) return
  deleting.value = true
  try {
    const id = deletingExpense.value._id || deletingExpense.value.id
    await $fetch(`/api/admin/bookkeeping/expenses?id=${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    showSnackbar('Expense deleted successfully', 'success')
    deleteDialog.value = false
    await fetchExpenses()
  } catch (err: any) {
    console.error('Error deleting expense:', err)
    showSnackbar(err?.data?.statusMessage || 'Failed to delete expense', 'error')
  } finally {
    deleting.value = false
  }
}

const exportCSV = async () => {
  exporting.value = true
  try {
    const range = getDateRange()
    const url = `/api/admin/bookkeeping/export?type=expenses&dateFrom=${range.from}&dateTo=${range.to}`
    const blob = await $fetch<Blob>(url, {
      headers: getAuthHeaders(),
      responseType: 'blob'
    })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `expenses_${range.from}_to_${range.to}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    showSnackbar('Export downloaded successfully', 'success')
  } catch (err: any) {
    console.error('Export error:', err)
    showSnackbar('Failed to export data', 'error')
  } finally {
    exporting.value = false
  }
}

// ─── Snackbar ────────────────────────────────────────────────
const showSnackbar = (message: string, color: string = 'success') => {
  snackbarMessage.value = message
  snackbarColor.value = color
  snackbar.value = true
}

// ─── Lifecycle ───────────────────────────────────────────────
onMounted(() => {
  const range = getDateRange()
  dateFrom.value = range.from
  dateTo.value = range.to
  fetchExpenses()

  if (route.query.scan === 'true') {
    nextTick(() => openScanDialog())
  }
})

onBeforeUnmount(() => {
  stopCamera()
})

watch(() => route.query.scan, (val) => {
  if (val === 'true') {
    openScanDialog()
  }
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;600;700;800&display=swap');

.expenses-page {
  background-color: #fcfcfb;
  font-family: 'Inter', sans-serif;
  min-height: 100vh;
}

/* ── Typography ──────────────────────────────────────────── */
.display-serif {
  font-family: 'Playfair Display', serif;
}

.text-gold {
  color: #8c734b;
}

.letter-spacing-2 {
  letter-spacing: 2px;
}

.letter-spacing-tight {
  letter-spacing: -1px;
}

/* ── Premium Accent ──────────────────────────────────────── */
.premium-accent-bar {
  width: 40px;
  height: 4px;
  background: #8c734b;
  border-radius: 2px;
}

/* ── Stat Cards ──────────────────────────────────────────── */
.stat-card-premium {
  border-radius: 20px !important;
  border: 1px solid rgba(0, 0, 0, 0.05) !important;
  background: white !important;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275),
    border-color 0.3s ease;
}

.stat-card-premium:hover {
  transform: translateY(-4px);
  border-color: #8c734b !important;
}

.icon-orb {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.error-orb {
  background: rgba(239, 83, 80, 0.1);
  color: #ef5350;
}

.info-orb {
  background: rgba(21, 101, 192, 0.1);
  color: #1565c0;
}

.gold-orb {
  background: rgba(140, 115, 75, 0.1);
  color: #8c734b;
}

/* ── Analytics Cards ─────────────────────────────────────── */
.analytics-card {
  border-radius: 24px !important;
  background: white !important;
  border: 1px solid rgba(0, 0, 0, 0.05) !important;
}

/* ── Buttons ─────────────────────────────────────────────── */
.premium-btn {
  border-radius: 12px !important;
  text-transform: none !important;
  font-weight: 700 !important;
  letter-spacing: 0.3px !important;
}

.premium-btn-outlined {
  border-radius: 12px !important;
  text-transform: none !important;
  font-weight: 600 !important;
  border-color: rgba(0, 0, 0, 0.12) !important;
}

/* ── Input Overrides ─────────────────────────────────────── */
.premium-input :deep(.v-field) {
  border-radius: 12px;
}

/* ── Dialog ──────────────────────────────────────────────── */
.dialog-card {
  border-radius: 24px !important;
  overflow: hidden;
}

/* ── Expenses Table ──────────────────────────────────────── */
.expenses-table {
  background: transparent !important;
}

.expenses-table :deep(thead th) {
  font-size: 0.7rem !important;
  font-weight: 800 !important;
  letter-spacing: 1px !important;
  text-transform: uppercase !important;
  color: rgba(0, 0, 0, 0.5) !important;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06) !important;
  padding: 16px 16px !important;
  white-space: nowrap;
}

.expenses-table :deep(tbody td) {
  padding: 14px 16px !important;
  border-bottom: 1px solid rgba(0, 0, 0, 0.03) !important;
}

.expense-row {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.expense-row:hover {
  background-color: #f9f9f7 !important;
}

/* ── Transaction List (mobile) ───────────────────────────── */
.list-item-hover:hover {
  background-color: #f9f9f7;
}

.tx-icon-orb {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tx-icon-orb--red {
  background: rgba(239, 83, 80, 0.1);
  color: #ef5350;
}

/* ── Camera / Scanner ────────────────────────────────────── */
.camera-container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.camera-feed {
  width: 100%;
  max-height: 400px;
  object-fit: cover;
  background: #000;
}

.camera-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.scan-frame {
  width: 80%;
  height: 70%;
  border: 2px dashed rgba(140, 115, 75, 0.6);
  border-radius: 16px;
}

.capture-btn {
  border-radius: 50% !important;
}

.ocr-text-preview {
  background: #f9f9f7;
  border: 1px solid rgba(0, 0, 0, 0.06);
  max-height: 200px;
  overflow-y: auto;
}

.ocr-raw-text {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
  line-height: 1.6;
  color: #555;
  margin: 0;
}

/* ── Border Utility ──────────────────────────────────────── */
.border {
  border: 1px solid rgba(0, 0, 0, 0.08);
}

/* ── Responsive ──────────────────────────────────────────── */
@media (max-width: 960px) {
  .expenses-page {
    padding: 12px !important;
  }

  .text-h3 {
    font-size: 1.6rem !important;
  }

  .text-h5 {
    font-size: 1.15rem !important;
  }

  .camera-feed {
    max-height: 300px;
  }
}

@media (max-width: 600px) {
  .stat-card-premium .text-h5 {
    font-size: 1.1rem !important;
  }
}
</style>
