<template>
  <div class="revenue-page px-md-8 py-md-6">
    <v-container fluid>
      <!-- Page Header -->
      <v-row class="mb-8 align-center">
        <v-col cols="12" md="6">
          <div class="d-flex align-center mb-2">
            <v-btn icon="mdi-arrow-left" variant="text" size="small" class="mr-2" to="/admin/bookkeeping" />
            <div class="premium-accent-bar mr-4"></div>
            <span class="text-overline letter-spacing-2 text-gold">Financial Management</span>
          </div>
          <h1 class="display-serif text-h3 mb-1">Revenue</h1>
          <p class="text-subtitle-1 text-medium-emphasis font-weight-light">
            Track and manage all income sources
          </p>
        </v-col>
        <v-col cols="12" md="6" class="d-flex align-center justify-md-end ga-3 flex-wrap">
          <v-text-field
            v-model="filterFrom"
            type="date"
            label="From"
            variant="outlined"
            density="compact"
            hide-details
            class="premium-input"
            style="max-width: 170px;"
            @update:model-value="fetchRevenue"
          />
          <v-text-field
            v-model="filterTo"
            type="date"
            label="To"
            variant="outlined"
            density="compact"
            hide-details
            class="premium-input"
            style="max-width: 170px;"
            @update:model-value="fetchRevenue"
          />
          <v-btn
            color="#8c734b"
            variant="flat"
            class="premium-btn"
            prepend-icon="mdi-download"
            @click="exportCSV"
            :loading="exporting"
          >
            Export CSV
          </v-btn>
        </v-col>
      </v-row>

      <!-- Summary Bar -->
      <v-row class="mb-8">
        <v-col cols="12" sm="6" class="d-flex">
          <v-skeleton-loader v-if="loading" type="card" class="w-100 rounded-xl" />
          <v-card v-else class="stat-card w-100" elevation="0">
            <v-card-text class="d-flex align-center pa-6">
              <div class="icon-orb success-orb mr-4">
                <v-icon icon="mdi-cash-multiple" />
              </div>
              <div>
                <div class="text-h4 font-weight-bold letter-spacing-tight">{{ fmt(totalRevenue) }}</div>
                <div class="text-overline text-medium-emphasis">Total Revenue</div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" class="d-flex">
          <v-skeleton-loader v-if="loading" type="card" class="w-100 rounded-xl" />
          <v-card v-else class="stat-card w-100" elevation="0">
            <v-card-text class="d-flex align-center pa-6">
              <div class="icon-orb gold-orb mr-4">
                <v-icon icon="mdi-counter" />
              </div>
              <div>
                <div class="text-h4 font-weight-bold letter-spacing-tight">{{ revenueList.length }}</div>
                <div class="text-overline text-medium-emphasis">Total Entries</div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Add Revenue Button -->
      <v-row class="mb-6">
        <v-col cols="12" class="d-flex justify-end">
          <v-btn
            color="#43a047"
            variant="flat"
            class="premium-btn"
            prepend-icon="mdi-plus"
            @click="showAddDialog = true"
          >
            Add Revenue
          </v-btn>
        </v-col>
      </v-row>

      <!-- Revenue Table -->
      <v-card class="analytics-card mb-8" elevation="0">
        <v-card-title class="d-flex align-center pa-6">
          <v-icon icon="mdi-format-list-bulleted" class="mr-2 text-gold" size="small" />
          <span class="display-serif text-h5">Revenue Entries</span>
          <v-spacer />
          <v-chip size="x-small" variant="tonal" class="font-weight-bold">
            {{ revenueList.length }} records
          </v-chip>
        </v-card-title>
        <v-divider class="opacity-10" />
        <v-card-text class="pa-0">
          <v-skeleton-loader v-if="loading" type="table-row@6" class="rounded-lg" />
          <v-table v-else class="premium-table">
            <thead>
              <tr>
                <th class="px-6">Date</th>
                <th>Source</th>
                <th>Client</th>
                <th>Category</th>
                <th>Description</th>
                <th>Invoice #</th>
                <th class="text-right">Amount</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in revenueList" :key="item._id" class="table-row-hover">
                <td class="px-6 text-body-2">{{ formatDate(item.date) }}</td>
                <td>
                  <v-chip size="x-small" :color="sourceColor(item.source)" variant="flat" class="font-weight-bold text-capitalize">
                    {{ item.source }}
                  </v-chip>
                </td>
                <td class="text-body-2 font-weight-medium">{{ item.clientName || '—' }}</td>
                <td class="text-body-2 text-capitalize">{{ (item.category || '').replace('_', ' ') }}</td>
                <td class="text-body-2 text-medium-emphasis" style="max-width: 220px;">
                  <span class="d-inline-block text-truncate" style="max-width: 220px;">{{ item.description || '—' }}</span>
                </td>
                <td class="text-body-2 font-weight-medium">{{ item.invoiceNumber || '—' }}</td>
                <td class="text-right text-body-2 font-weight-bold text-success">{{ fmt(item.amount) }}</td>
                <td class="text-center">
                  <v-btn
                    icon="mdi-delete-outline"
                    size="small"
                    variant="text"
                    color="error"
                    @click="confirmDelete(item)"
                  />
                </td>
              </tr>
              <tr v-if="!revenueList.length">
                <td colspan="8" class="text-center py-12">
                  <v-icon icon="mdi-cash-register" size="48" class="mb-3 opacity-30" />
                  <div class="text-body-2 text-medium-emphasis">No revenue entries found</div>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
      </v-card>
    </v-container>

    <!-- Add Revenue Dialog -->
    <v-dialog v-model="showAddDialog" max-width="640" persistent>
      <v-card class="dialog-card" rounded="xl">
        <v-card-title class="d-flex align-center pa-6">
          <v-icon icon="mdi-cash-plus" class="mr-2 text-gold" />
          <span class="display-serif text-h5">Add Revenue</span>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="resetForm" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-6">
          <v-form ref="formRef" @submit.prevent="addRevenue">
            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.date"
                  type="date"
                  label="Date *"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Required']"
                  class="premium-input"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="form.amount"
                  type="number"
                  label="Amount ($) *"
                  variant="outlined"
                  density="compact"
                  prefix="$"
                  :rules="[v => v > 0 || 'Must be greater than 0']"
                  class="premium-input"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="form.source"
                  :items="sourceOptions"
                  label="Source *"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Required']"
                  class="premium-input"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="form.category"
                  :items="categoryOptions"
                  label="Category *"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Required']"
                  class="premium-input"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.clientName"
                  label="Client Name"
                  variant="outlined"
                  density="compact"
                  class="premium-input"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.invoiceNumber"
                  label="Invoice Number"
                  variant="outlined"
                  density="compact"
                  class="premium-input"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="form.description"
                  label="Description"
                  variant="outlined"
                  density="compact"
                  rows="2"
                  class="premium-input"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-6">
          <v-spacer />
          <v-btn variant="text" @click="resetForm">Cancel</v-btn>
          <v-btn
            color="#43a047"
            variant="flat"
            class="premium-btn"
            :loading="saving"
            @click="addRevenue"
          >
            Save Revenue
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation -->
    <v-dialog v-model="showDeleteDialog" max-width="440">
      <v-card class="dialog-card" rounded="xl">
        <v-card-title class="d-flex align-center pa-6">
          <v-icon icon="mdi-alert-circle" color="error" class="mr-2" />
          <span class="display-serif text-h6">Confirm Delete</span>
        </v-card-title>
        <v-card-text class="px-6">
          Are you sure you want to delete this revenue entry?
          <div v-if="deleteTarget" class="mt-3 pa-3 bg-grey-lighten-4 rounded-lg">
            <div class="font-weight-bold">{{ fmt(deleteTarget.amount) }}</div>
            <div class="text-caption text-medium-emphasis">{{ deleteTarget.description || deleteTarget.source }}</div>
          </div>
        </v-card-text>
        <v-card-actions class="pa-6">
          <v-spacer />
          <v-btn variant="text" @click="showDeleteDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" class="premium-btn" :loading="deleting" @click="deleteRevenue">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackColor" location="top right" rounded="lg" :timeout="4000">
      <div class="d-flex align-center">
        <v-icon class="mr-2">{{ snackColor === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle' }}</v-icon>
        {{ snackMessage }}
      </div>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

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
interface RevenueEntry {
  _id: string
  date: string
  amount: number
  source: string
  category: string
  description?: string
  clientName?: string
  invoiceNumber?: string
}

// ─── Helpers ─────────────────────────────────────────────────
const fmt = (n: number) => '$' + n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatDate = (date: string): string => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

const sourceColor = (source: string): string => {
  const map: Record<string, string> = { manual: 'blue-grey', commission: 'success', listing: 'primary', referral: 'purple' }
  return map[source] || 'grey'
}

// ─── Options ─────────────────────────────────────────────────
const sourceOptions = [
  { title: 'Manual', value: 'manual' },
  { title: 'Commission', value: 'commission' },
  { title: 'Listing', value: 'listing' },
  { title: 'Referral', value: 'referral' }
]

const categoryOptions = [
  { title: 'Commission', value: 'commission' },
  { title: 'Referral', value: 'referral' },
  { title: 'Consulting', value: 'consulting' },
  { title: 'Rental Income', value: 'rental_income' },
  { title: 'Coaching', value: 'coaching' },
  { title: 'Other', value: 'other' }
]

// ─── State ───────────────────────────────────────────────────
const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const exporting = ref(false)
const snackbar = ref(false)
const snackMessage = ref('')
const snackColor = ref<'success' | 'error'>('success')

const revenueList = ref<RevenueEntry[]>([])
const filterFrom = ref('')
const filterTo = ref('')

const showAddDialog = ref(false)
const showDeleteDialog = ref(false)
const deleteTarget = ref<RevenueEntry | null>(null)
const formRef = ref()

const form = ref({
  date: new Date().toISOString().split('T')[0],
  amount: 0,
  source: '',
  category: '',
  description: '',
  clientName: '',
  invoiceNumber: ''
})

const totalRevenue = computed(() => revenueList.value.reduce((sum, r) => sum + (r.amount || 0), 0))

// ─── Notifications ───────────────────────────────────────────
const notify = (message: string, color: 'success' | 'error' = 'success') => {
  snackMessage.value = message
  snackColor.value = color
  snackbar.value = true
}

// ─── API ─────────────────────────────────────────────────────
const fetchRevenue = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (filterFrom.value) params.append('from', filterFrom.value)
    if (filterTo.value) params.append('to', filterTo.value)
    const qs = params.toString()
    const data = await $fetch<RevenueEntry[]>(`/api/admin/bookkeeping/revenue${qs ? '?' + qs : ''}`, {
      headers: getAuthHeaders()
    })
    revenueList.value = data || []
  } catch (err: any) {
    console.error('Error fetching revenue:', err)
    notify(err?.data?.statusMessage || 'Failed to load revenue', 'error')
  } finally {
    loading.value = false
  }
}

const addRevenue = async () => {
  const { valid } = await formRef.value?.validate()
  if (!valid) return
  saving.value = true
  try {
    await $fetch('/api/admin/bookkeeping/revenue', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: { ...form.value }
    })
    notify('Revenue added successfully')
    resetForm()
    await fetchRevenue()
  } catch (err: any) {
    console.error('Error adding revenue:', err)
    notify(err?.data?.statusMessage || 'Failed to add revenue', 'error')
  } finally {
    saving.value = false
  }
}

const confirmDelete = (item: RevenueEntry) => {
  deleteTarget.value = item
  showDeleteDialog.value = true
}

const deleteRevenue = async () => {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await $fetch(`/api/admin/bookkeeping/revenue`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: { id: deleteTarget.value._id }
    })
    notify('Revenue deleted')
    showDeleteDialog.value = false
    deleteTarget.value = null
    await fetchRevenue()
  } catch (err: any) {
    console.error('Error deleting revenue:', err)
    notify(err?.data?.statusMessage || 'Failed to delete revenue', 'error')
  } finally {
    deleting.value = false
  }
}

const exportCSV = async () => {
  exporting.value = true
  try {
    const params = new URLSearchParams()
    if (filterFrom.value) params.append('from', filterFrom.value)
    if (filterTo.value) params.append('to', filterTo.value)
    params.append('format', 'csv')
    const qs = params.toString()
    const response = await fetch(`/api/admin/bookkeeping/revenue${qs ? '?' + qs : ''}`, {
      headers: getAuthHeaders()
    })
    const data = await response.json() as RevenueEntry[]
    const header = 'Date,Source,Category,Client,Invoice,Amount,Description'
    const rows = data.map((r: RevenueEntry) =>
      `"${r.date}","${r.source}","${r.category}","${r.clientName || ''}","${r.invoiceNumber || ''}",${r.amount},"${(r.description || '').replace(/"/g, '""')}"`
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `revenue-export-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    notify('CSV exported successfully')
  } catch (err: any) {
    console.error('Error exporting CSV:', err)
    notify('Failed to export CSV', 'error')
  } finally {
    exporting.value = false
  }
}

const resetForm = () => {
  showAddDialog.value = false
  form.value = {
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    source: '',
    category: '',
    description: '',
    clientName: '',
    invoiceNumber: ''
  }
  formRef.value?.reset()
}

// ─── Lifecycle ───────────────────────────────────────────────
onMounted(() => {
  fetchRevenue()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;600;700;800&display=swap');

.revenue-page {
  background-color: #fcfcfb;
  font-family: 'Inter', sans-serif;
  min-height: 100vh;
}

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

.premium-accent-bar {
  width: 40px;
  height: 4px;
  background: #8c734b;
  border-radius: 2px;
}

/* Cards */
.stat-card {
  border-radius: 20px !important;
  border: 1px solid rgba(0, 0, 0, 0.05) !important;
  background: white !important;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), border-color 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  border-color: #8c734b !important;
}

.analytics-card {
  border-radius: 24px !important;
  background: white !important;
  border: 1px solid rgba(0, 0, 0, 0.05) !important;
}

.dialog-card {
  border: 1px solid rgba(0, 0, 0, 0.05) !important;
  background: white !important;
}

/* Orbs */
.icon-orb {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.success-orb {
  background: rgba(67, 160, 71, 0.1);
  color: #43a047;
}

.gold-orb {
  background: rgba(140, 115, 75, 0.1);
  color: #8c734b;
}

/* Table */
.premium-table :deep(th) {
  background: #fafaf9 !important;
  font-size: 0.7rem !important;
  font-weight: 700 !important;
  letter-spacing: 1px !important;
  text-transform: uppercase !important;
  color: #999 !important;
}

.table-row-hover:hover {
  background: #fcfcfb !important;
}

/* Buttons */
.premium-btn {
  border-radius: 12px !important;
  text-transform: none !important;
  font-weight: 700 !important;
  letter-spacing: 0.3px !important;
}

/* Inputs */
.premium-input :deep(.v-field) {
  border-radius: 12px;
}

@media (max-width: 960px) {
  .revenue-page {
    padding: 12px !important;
  }

  .text-h3 {
    font-size: 1.6rem !important;
  }
}
</style>
