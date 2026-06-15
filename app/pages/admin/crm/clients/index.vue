<template>
  <div class="admin-crm-clients px-md-8 py-md-6">
    <v-container fluid>
      <!-- Header -->
      <v-row class="mb-8 align-center">
        <v-col cols="12" md="6">
          <div class="d-flex align-center mb-2">
            <v-btn icon="mdi-arrow-left" variant="text" size="small" class="mr-2" to="/admin/crm" />
            <div class="premium-accent-bar mr-4"></div>
            <span class="text-overline letter-spacing-2 text-gold">CRM</span>
          </div>
          <h1 class="display-serif text-h3 mb-1">Client Management</h1>
        </v-col>
        <v-col cols="12" md="6" class="text-md-right">
          <div class="d-flex flex-wrap justify-md-end ga-2">
            <v-btn
              variant="outlined"
              class="premium-action-btn premium-ghost-btn"
              prepend-icon="mdi-upload-outline"
              @click="openImportDialog"
            >
              Import
            </v-btn>
            <v-menu offset="6">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  variant="outlined"
                  class="premium-action-btn premium-ghost-btn"
                  prepend-icon="mdi-download-outline"
                  append-icon="mdi-chevron-down"
                  :loading="exporting"
                  :disabled="!pagination.total"
                >
                  Export
                </v-btn>
              </template>
              <v-list density="compact" class="premium-menu">
                <v-list-item prepend-icon="mdi-microsoft-excel" title="Excel (.xlsx)" @click="exportClients('xlsx')" />
                <v-list-item prepend-icon="mdi-file-delimited-outline" title="CSV (.csv)" @click="exportClients('csv')" />
              </v-list>
            </v-menu>
            <v-btn color="primary" class="premium-action-btn" prepend-icon="mdi-account-plus" @click="showAddDialog = true">
              Add Client
            </v-btn>
          </div>
        </v-col>
      </v-row>

      <!-- Filters -->
      <v-row class="mb-6">
        <v-col cols="12">
          <v-card class="filter-card" elevation="0">
            <v-card-text class="pa-4">
              <v-row align="center">
                <v-col cols="12" sm="4">
                  <v-text-field v-model="search" label="Search clients..." variant="outlined" density="compact" prepend-inner-icon="mdi-magnify" clearable @input="debouncedSearch" />
                </v-col>
                <v-col cols="6" sm="3">
                  <v-select v-model="typeFilter" :items="['All', 'lead', 'buyer', 'seller', 'investor']" label="Type" variant="outlined" density="compact" @update:model-value="loadClients" />
                </v-col>
                <v-col cols="6" sm="3">
                  <v-select v-model="statusFilter" :items="['All', 'active', 'inactive', 'closed']" label="Status" variant="outlined" density="compact" @update:model-value="loadClients" />
                </v-col>
                <v-col cols="12" sm="2" class="text-center">
                  <span class="text-body-2 font-weight-bold">{{ pagination.total }} clients</span>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Clients Table -->
      <v-row>
        <v-col cols="12">
          <v-card class="clients-card" elevation="0">
            <v-card-text class="pa-0">
              <v-table hover>
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Type</th>
                    <th>Contact</th>
                    <th>Transactions</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="client in clients" :key="client.id" class="cursor-pointer" @click="goToClient(client)">
                    <td>
                      <div class="d-flex align-center py-2">
                        <v-avatar :color="getTypeColor(client.type)" size="36" class="mr-3 text-white">
                          {{ client.firstName[0] }}{{ client.lastName[0] }}
                        </v-avatar>
                        <div>
                          <div class="font-weight-bold">{{ client.firstName }} {{ client.lastName }}</div>
                          <div class="text-caption text-medium-emphasis">Added {{ formatDate(client.createdAt) }}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <v-chip :color="getTypeColor(client.type)" size="small" class="text-uppercase font-weight-bold">
                        {{ client.type }}
                      </v-chip>
                    </td>
                    <td>
                      <div>{{ client.email || 'N/A' }}</div>
                      <div class="text-caption text-medium-emphasis">{{ client.phone || '' }}</div>
                    </td>
                    <td>
                      <span v-if="client.transactions?.length">
                        {{ client.transactions.length }} transaction{{ client.transactions.length > 1 ? 's' : '' }}
                      </span>
                      <span v-else class="text-medium-emphasis">None</span>
                    </td>
                    <td>
                      <v-chip :color="client.status === 'active' ? 'success' : 'grey'" size="x-small" class="text-uppercase">
                        {{ client.status }}
                      </v-chip>
                    </td>
                    <td>
                      <v-btn size="small" variant="tonal" color="primary" class="mr-1" @click.stop="convertClient(client)">
                        Convert
                      </v-btn>
                      <v-btn size="small" variant="text" icon @click.stop="editClient(client)">
                        <v-icon size="small">mdi-pencil</v-icon>
                      </v-btn>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Pagination -->
      <v-row v-if="pagination.pages > 1" class="mt-4">
        <v-col class="d-flex justify-center">
          <v-pagination v-model="pagination.page" :length="pagination.pages" rounded @update:model-value="loadClients" />
        </v-col>
      </v-row>

      <!-- Add/Edit Dialog -->
      <v-dialog v-model="showAddDialog" max-width="640" persistent scrollable>
        <v-card class="rounded-xl client-dialog">
          <v-card-title class="pa-6 d-flex align-center">
            <div>
              <div class="text-overline text-gold letter-spacing-2">CRM Client</div>
              <div class="display-serif text-h5">{{ editingClient ? 'Edit Client' : 'Add Client' }}</div>
            </div>
            <v-spacer />
            <v-btn icon="mdi-close" variant="text" size="small" @click="closeDialog" />
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-6">
            <v-tabs v-model="dialogTab" color="primary" density="compact" class="mb-4">
              <v-tab value="basics">
                <v-icon size="16" class="mr-2">mdi-account-outline</v-icon>
                Basics
              </v-tab>
              <v-tab value="celebrations">
                <v-icon size="16" class="mr-2">mdi-cake-variant-outline</v-icon>
                Celebrations
              </v-tab>
            </v-tabs>

            <v-window v-model="dialogTab">
              <v-window-item value="basics">
                <v-row>
                  <v-col cols="6"><v-text-field density="compact" v-model="form.firstName" label="First Name" variant="outlined" /></v-col>
                  <v-col cols="6"><v-text-field density="compact" v-model="form.lastName" label="Last Name" variant="outlined" /></v-col>
                  <v-col cols="12"><v-text-field density="compact" v-model="form.email" label="Email" variant="outlined" type="email" prepend-inner-icon="mdi-email-outline" /></v-col>
                  <v-col cols="12"><v-text-field density="compact" v-model="form.phone" label="Phone" variant="outlined" prepend-inner-icon="mdi-phone-outline" /></v-col>
                  <v-col cols="12"><v-select density="compact" v-model="form.type" :items="['lead', 'buyer', 'seller', 'investor']" label="Type" variant="outlined" /></v-col>
                  <v-col cols="12"><v-textarea density="compact" v-model="form.notes" label="Notes" variant="outlined" rows="3" /></v-col>
                </v-row>
              </v-window-item>

              <v-window-item value="celebrations">
                <p class="text-caption text-medium-emphasis mb-4">
                  Add personal anniversary dates so the CRM can remind you (or auto-send) on the right day.
                  Year is stored but only the month and day are used for matching.
                </p>
                <v-row>
                  <v-col cols="12" sm="4">
                    <v-text-field
                      v-model="form.dateOfBirth"
                      label="Date of Birth"
                      variant="outlined"
                      density="compact"
                      type="date"
                      prepend-inner-icon="mdi-cake-variant"
                      clearable
                    />
                  </v-col>
                  <v-col cols="12" sm="4">
                    <v-text-field
                      v-model="form.weddingAnniversary"
                      label="Wedding Anniversary"
                      variant="outlined"
                      density="compact"
                      type="date"
                      prepend-inner-icon="mdi-heart-outline"
                      clearable
                    />
                  </v-col>
                  <v-col cols="12" sm="4">
                    <v-text-field
                      v-model="form.closingAnniversary"
                      label="Successful Closing Date"
                      variant="outlined"
                      density="compact"
                      type="date"
                      prepend-inner-icon="mdi-key-variant"
                      clearable
                      hint="Used for the 1-year-after-closing thank-you"
                      persistent-hint
                    />
                  </v-col>
                </v-row>

                <v-divider class="my-5" />

                <div class="text-overline letter-spacing-1 mb-2">Holiday Exceptions</div>
                <p class="text-caption text-medium-emphasis mb-3">
                  Tick a holiday to exclude this client from those tenant-wide messages
                  (e.g. some clients prefer not to receive Christmas or New Year wishes).
                </p>
                <div class="d-flex flex-wrap ga-2">
                  <v-chip
                    v-for="opt in HOLIDAY_OPTIONS"
                    :key="opt.value"
                    :color="form.holidayExceptions.includes(opt.value) ? 'error' : 'default'"
                    :variant="form.holidayExceptions.includes(opt.value) ? 'flat' : 'outlined'"
                    @click="toggleException(opt.value)"
                    class="exception-chip"
                  >
                    <v-icon start size="14">{{ form.holidayExceptions.includes(opt.value) ? 'mdi-cancel' : opt.icon }}</v-icon>
                    {{ opt.label }}
                  </v-chip>
                </div>
              </v-window-item>
            </v-window>
          </v-card-text>
          <v-divider />
          <v-card-actions class="pa-6">
            <v-spacer />
            <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
            <v-btn color="primary" @click="saveClient" :loading="saving" class="premium-action-btn">
              {{ editingClient ? 'Save Changes' : 'Create Client' }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Import Dialog -->
      <v-dialog v-model="showImportDialog" max-width="640" persistent scrollable>
        <v-card class="rounded-xl client-dialog">
          <v-card-title class="pa-6 d-flex align-center">
            <div>
              <div class="text-overline text-gold letter-spacing-2">CRM</div>
              <div class="display-serif text-h5">Import Clients</div>
            </div>
            <v-spacer />
            <v-btn icon="mdi-close" variant="text" size="small" :disabled="importing" @click="closeImportDialog" />
          </v-card-title>
          <v-divider />

          <v-card-text class="pa-6">
            <!-- Step 1 — pick file & options -->
            <template v-if="!importResult">
              <div class="template-banner pa-4 mb-5 rounded-lg d-flex align-center flex-wrap ga-3">
                <v-icon color="warning" size="22">mdi-file-document-edit-outline</v-icon>
                <div class="flex-1-1-0">
                  <div class="font-weight-bold text-body-2">Need a starting point?</div>
                  <div class="text-caption text-medium-emphasis">Download the template, fill it in, then upload it back.</div>
                </div>
                <v-btn
                  size="small"
                  variant="tonal"
                  color="primary"
                  prepend-icon="mdi-microsoft-excel"
                  :loading="downloadingTemplate === 'xlsx'"
                  :disabled="downloadingTemplate === 'csv'"
                  @click="downloadTemplate('xlsx')"
                >
                  Excel
                </v-btn>
                <v-btn
                  size="small"
                  variant="tonal"
                  color="primary"
                  prepend-icon="mdi-file-delimited-outline"
                  :loading="downloadingTemplate === 'csv'"
                  :disabled="downloadingTemplate === 'xlsx'"
                  @click="downloadTemplate('csv')"
                >
                  CSV
                </v-btn>
              </div>

              <v-file-input
                v-model="importFile"
                label="Select Excel or CSV file"
                accept=".xlsx,.xls,.csv"
                variant="outlined"
                density="compact"
                prepend-icon=""
                prepend-inner-icon="mdi-paperclip"
                show-size
                clearable
                :disabled="importing"
              />

              <div class="text-overline letter-spacing-1 mt-3 mb-2">When a client already exists</div>
              <v-radio-group v-model="importMode" inline density="compact" hide-details :disabled="importing">
                <v-radio value="skip" label="Skip duplicates" />
                <v-radio value="update" label="Update existing" />
              </v-radio-group>
              <p class="text-caption text-medium-emphasis mt-2 mb-0">
                Matching is by email within your account. Rows without an email are always created as new.
              </p>

              <v-alert
                v-if="importError"
                type="error"
                variant="tonal"
                density="compact"
                class="mt-4"
                closable
                @click:close="importError = ''"
              >
                {{ importError }}
              </v-alert>
            </template>

            <!-- Step 2 — results -->
            <template v-else>
              <div class="result-summary d-flex flex-wrap ga-3 mb-4">
                <div class="result-tile result-tile--ok">
                  <div class="result-tile__num">{{ importResult.created }}</div>
                  <div class="result-tile__lbl">Created</div>
                </div>
                <div class="result-tile result-tile--ok">
                  <div class="result-tile__num">{{ importResult.updated }}</div>
                  <div class="result-tile__lbl">Updated</div>
                </div>
                <div class="result-tile result-tile--warn">
                  <div class="result-tile__num">{{ importResult.skipped }}</div>
                  <div class="result-tile__lbl">Skipped</div>
                </div>
                <div class="result-tile result-tile--err">
                  <div class="result-tile__num">{{ importResult.failed }}</div>
                  <div class="result-tile__lbl">Failed</div>
                </div>
              </div>

              <div v-if="importResult.errors?.length" class="error-list rounded-lg">
                <div class="px-4 py-2 text-overline letter-spacing-1 bg-grey-lighten-4">
                  Issues ({{ importResult.errors.length }})
                </div>
                <v-divider />
                <div class="error-list__scroll">
                  <div
                    v-for="(e, i) in importResult.errors"
                    :key="i"
                    class="px-4 py-2 d-flex align-start ga-2 error-list__row"
                  >
                    <v-chip size="x-small" variant="tonal" color="grey" class="mt-1">Row {{ e.row }}</v-chip>
                    <div class="flex-1-1-0">
                      <div class="text-body-2 font-weight-bold">{{ e.name }}</div>
                      <div class="text-caption text-medium-emphasis">{{ e.reason }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <p v-else class="text-body-2 text-medium-emphasis mb-0">
                All rows imported cleanly with no issues.
              </p>
            </template>
          </v-card-text>

          <v-divider />
          <v-card-actions class="pa-6">
            <v-spacer />
            <template v-if="!importResult">
              <v-btn variant="text" :disabled="importing" @click="closeImportDialog">Cancel</v-btn>
              <v-btn
                color="primary"
                class="premium-action-btn"
                :loading="importing"
                :disabled="!importFile"
                @click="submitImport"
              >
                Upload &amp; Import
              </v-btn>
            </template>
            <template v-else>
              <v-btn variant="text" @click="resetImport">Import Another</v-btn>
              <v-btn color="primary" class="premium-action-btn" @click="closeImportDialog">Done</v-btn>
            </template>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Convert Dialog -->
      <v-dialog v-model="showConvertDialog" max-width="500" persistent>
        <v-card class="rounded-xl">
          <v-card-title class="pa-6 display-serif text-h6">Convert to Transaction</v-card-title>
          <v-divider />
          <v-card-text class="pa-6">
            <div class="text-body-1 mb-4">
              Create a new transaction for <strong>{{ convertingClient?.firstName }} {{ convertingClient?.lastName }}</strong>
            </div>
            <v-select density="compact" v-model="convertForm.type" :items="[{title: 'Buying', value: 'buying'}, {title: 'Selling', value: 'selling'}]" label="Transaction Type" variant="outlined" class="mb-4" />
            <v-text-field density="compact" v-model="convertForm.propertyAddress" label="Property Address (optional)" variant="outlined" class="mb-4" />
            <v-text-field density="compact" v-model="convertForm.salePrice" label="Sale Price (optional)" variant="outlined" type="number" prefix="$" />
          </v-card-text>
          <v-divider />
          <v-card-actions class="pa-6">
            <v-spacer />
            <v-btn variant="text" @click="showConvertDialog = false">Cancel</v-btn>
            <v-btn color="success" @click="submitConvert" :loading="converting">
              Create Transaction
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const getAuthHeaders = (): Record<string, string> => {
  if (process.client) {
    const token = localStorage.getItem('token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }
  return {}
}

const clients = ref<any[]>([])
const search = ref('')
const typeFilter = ref('All')
const statusFilter = ref('All')
const pagination = ref({ total: 0, page: 1, limit: 20, pages: 0 })
const showAddDialog = ref(false)
const showConvertDialog = ref(false)
const editingClient = ref<any>(null)
const convertingClient = ref<any>(null)
const saving = ref(false)
const converting = ref(false)

// ── Import / Export state ───────────────────────────────────────────────────
interface ImportError { row: number; name: string; reason: string }
interface ImportResult {
  total: number; created: number; updated: number; skipped: number; failed: number
  errors: ImportError[]
}

const showImportDialog = ref(false)
const importFile = ref<File | null>(null)
const importMode = ref<'skip' | 'update'>('skip')
const importing = ref(false)
const importError = ref('')
const importResult = ref<ImportResult | null>(null)
const downloadingTemplate = ref<'' | 'xlsx' | 'csv'>('')
const exporting = ref(false)

interface ClientForm {
  firstName: string
  lastName: string
  email: string
  phone: string
  type: string
  notes: string
  dateOfBirth: string
  weddingAnniversary: string
  closingAnniversary: string
  holidayExceptions: string[]
}

const emptyForm = (): ClientForm => ({
  firstName: '', lastName: '', email: '', phone: '', type: 'lead', notes: '',
  dateOfBirth: '', weddingAnniversary: '', closingAnniversary: '', holidayExceptions: []
})

const form = ref<ClientForm>(emptyForm())
const convertForm = ref({ type: 'buying', propertyAddress: '', salePrice: null as number | null })
const dialogTab = ref<'basics' | 'celebrations'>('basics')

const HOLIDAY_OPTIONS = [
  { value: 'christmas', label: 'Christmas',  icon: 'mdi-pine-tree' },
  { value: 'new_year',  label: 'New Year',   icon: 'mdi-firework' },
  { value: 'eid',       label: 'Eid',        icon: 'mdi-star-crescent' },
] as const

function toggleException(value: string) {
  const set = new Set(form.value.holidayExceptions)
  if (set.has(value)) set.delete(value)
  else set.add(value)
  form.value.holidayExceptions = Array.from(set)
}

// ISO date → "YYYY-MM-DD" (for v-text-field type=date). Empty for null/invalid.
function toDateInput(v: any): string {
  if (!v) return ''
  const d = new Date(v)
  if (isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

let searchTimeout: any = null
function debouncedSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(loadClients, 300)
}

const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const getTypeColor = (t: string) => {
  const c: Record<string, string> = { buyer: 'blue', seller: 'green', investor: 'purple', lead: 'grey' }
  return c[t] || 'primary'
}

function goToClient(client: any) {
  // In a full implementation, this would navigate to client detail page
}

function editClient(client: any) {
  editingClient.value = client
  form.value = {
    firstName: client.firstName,
    lastName: client.lastName,
    email: client.email || '',
    phone: client.phone || '',
    type: client.type,
    notes: client.notes || '',
    dateOfBirth: toDateInput(client.dateOfBirth),
    weddingAnniversary: toDateInput(client.weddingAnniversary),
    closingAnniversary: toDateInput(client.closingAnniversary),
    holidayExceptions: Array.isArray(client.holidayExceptions) ? [...client.holidayExceptions] : [],
  }
  dialogTab.value = 'basics'
  showAddDialog.value = true
}

function convertClient(client: any) {
  convertingClient.value = client
  convertForm.value = { type: 'buying', propertyAddress: '', salePrice: null }
  showConvertDialog.value = true
}

function closeDialog() {
  showAddDialog.value = false
  editingClient.value = null
  form.value = emptyForm()
  dialogTab.value = 'basics'
}

async function saveClient() {
  if (!form.value.firstName || !form.value.lastName) return
  saving.value = true
  try {
    if (editingClient.value) {
      await $fetch(`/api/admin/crm/clients/${editingClient.value.id}`, {
        method: 'PUT', headers: getAuthHeaders(), body: form.value
      })
    } else {
      await $fetch('/api/admin/crm/clients', {
        method: 'POST', headers: getAuthHeaders(), body: form.value
      })
    }
    closeDialog()
    await loadClients()
  } finally {
    saving.value = false
  }
}

async function submitConvert() {
  if (!convertingClient.value) return
  converting.value = true
  try {
    // `v-text-field type="number"` returns its value as a STRING, and Prisma
    // strictly rejects a string for the `Float?` salePrice column. Normalize
    // here so the wire payload matches the schema (server also re-validates).
    const rawPrice = convertForm.value.salePrice as number | string | null
    let parsedPrice: number | null = null
    if (rawPrice !== null && rawPrice !== '' && rawPrice !== undefined) {
      const n = typeof rawPrice === 'number' ? rawPrice : Number(rawPrice)
      parsedPrice = Number.isFinite(n) && n >= 0 ? n : null
    }

    const propertyAddress = (convertForm.value.propertyAddress || '').trim() || null

    const res = await $fetch('/api/admin/crm/clients/convert', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: {
        clientId: convertingClient.value.id,
        type: convertForm.value.type,
        propertyAddress,
        salePrice: parsedPrice,
      },
    }) as any

    showConvertDialog.value = false
    if (res.transaction?.id) {
      navigateTo(`/admin/crm/transactions/${res.transaction.id}`)
    }
  } catch (e: any) {
    console.error('Convert failed:', e?.data?.message || e?.statusMessage || e)
    alert(e?.data?.message || e?.statusMessage || 'Could not convert this client. Please try again.')
  } finally {
    converting.value = false
  }
}

// Trigger a browser download for a Blob without leaking the object URL.
function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoke on the next tick so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Bearer token can't ride on a plain <a href>, so we fetch as Blob and trigger
// the download manually. Same approach for both template and export.
async function fetchAndDownload(url: string, filename: string) {
  const blob = await $fetch<Blob>(url, {
    headers: getAuthHeaders(),
    responseType: 'blob',
  })
  triggerBlobDownload(blob, filename)
}

async function downloadTemplate(format: 'xlsx' | 'csv') {
  if (downloadingTemplate.value) return
  downloadingTemplate.value = format
  try {
    await fetchAndDownload(
      `/api/admin/crm/clients/template?format=${format}`,
      `crm-clients-template.${format}`,
    )
  } catch (e: any) {
    importError.value = e?.data?.message || e?.statusMessage || 'Could not download the template.'
  } finally {
    downloadingTemplate.value = ''
  }
}

async function exportClients(format: 'xlsx' | 'csv') {
  if (exporting.value) return
  exporting.value = true
  try {
    const params = new URLSearchParams({ format })
    if (search.value) params.set('search', search.value)
    if (typeFilter.value !== 'All') params.set('type', typeFilter.value)
    if (statusFilter.value !== 'All') params.set('status', statusFilter.value)
    const stamp = new Date().toISOString().slice(0, 10)
    await fetchAndDownload(
      `/api/admin/crm/clients/export?${params.toString()}`,
      `crm-clients-${stamp}.${format}`,
    )
  } catch (e: any) {
    console.error('Export failed:', e)
  } finally {
    exporting.value = false
  }
}

function openImportDialog() {
  importFile.value = null
  importMode.value = 'skip'
  importError.value = ''
  importResult.value = null
  showImportDialog.value = true
}

function resetImport() {
  importFile.value = null
  importError.value = ''
  importResult.value = null
}

function closeImportDialog() {
  if (importing.value) return
  showImportDialog.value = false
  // Defer the state reset so the dialog close animation isn't visually noisy.
  setTimeout(() => {
    importFile.value = null
    importError.value = ''
    importResult.value = null
  }, 200)
}

async function submitImport() {
  if (!importFile.value || importing.value) return
  importing.value = true
  importError.value = ''
  importResult.value = null
  try {
    const fd = new FormData()
    fd.append('file', importFile.value)
    fd.append('mode', importMode.value)
    const res = await $fetch<ImportResult & { success: boolean }>('/api/admin/crm/clients/import', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: fd,
    })
    importResult.value = {
      total: res.total,
      created: res.created,
      updated: res.updated,
      skipped: res.skipped,
      failed: res.failed,
      errors: res.errors || [],
    }
    if (res.created > 0 || res.updated > 0) {
      await loadClients()
    }
  } catch (e: any) {
    importError.value = e?.data?.message || e?.statusMessage || 'Import failed. Please check the file and try again.'
  } finally {
    importing.value = false
  }
}

async function loadClients() {
  try {
    const params = new URLSearchParams()
    if (search.value) params.set('search', search.value)
    if (typeFilter.value !== 'All') params.set('type', typeFilter.value)
    if (statusFilter.value !== 'All') params.set('status', statusFilter.value)
    params.set('page', pagination.value.page.toString())

    const res = await $fetch(`/api/admin/crm/clients?${params}`, { headers: getAuthHeaders() }) as any
    clients.value = res.clients || []
    pagination.value = res.pagination || pagination.value
  } catch (e) {
    console.error('Error loading clients:', e)
  }
}

onMounted(loadClients)

definePageMeta({ layout: 'admin', middleware: ['admin'] })
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;600;700&display=swap');

.admin-crm-clients { background-color: #fcfcfb; font-family: 'Inter', sans-serif; min-height: 100vh; }
.display-serif { font-family: 'Playfair Display', serif; }
.text-gold { color: #8c734b; }
.letter-spacing-2 { letter-spacing: 2px; }
.premium-accent-bar { width: 40px; height: 4px; background: #8c734b; border-radius: 2px; }
.premium-action-btn { border-radius: 12px !important; text-transform: none !important; font-weight: 700 !important; }

.filter-card, .clients-card {
  border-radius: 20px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  background: white !important;
}
.cursor-pointer { cursor: pointer; }

.client-dialog :deep(.v-tab) {
  text-transform: none;
  font-weight: 600;
  letter-spacing: 0;
}
.exception-chip { cursor: pointer; }
.exception-chip :deep(.v-chip__content) { font-weight: 600; }
.ga-2 { gap: 8px; }
.ga-3 { gap: 12px; }
.letter-spacing-1 { letter-spacing: 1px; }

.premium-ghost-btn {
  border-color: rgba(140, 115, 75, 0.4) !important;
  color: #8c734b !important;
}
.premium-ghost-btn:hover {
  background: rgba(140, 115, 75, 0.06) !important;
}

.premium-menu :deep(.v-list-item-title) {
  font-weight: 600;
}

.template-banner {
  background: linear-gradient(135deg, rgba(140, 115, 75, 0.08), rgba(140, 115, 75, 0.02));
  border: 1px dashed rgba(140, 115, 75, 0.35);
}

.result-summary { width: 100%; }
.result-tile {
  flex: 1 1 110px;
  border-radius: 12px;
  padding: 14px 16px;
  border: 1px solid rgba(0,0,0,0.06);
  background: #fff;
}
.result-tile__num { font-family: 'Playfair Display', serif; font-size: 28px; line-height: 1; }
.result-tile__lbl { font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: rgba(0,0,0,0.55); margin-top: 4px; }
.result-tile--ok   { background: rgba(76, 175, 80, 0.06); border-color: rgba(76, 175, 80, 0.25); }
.result-tile--ok   .result-tile__num { color: #2e7d32; }
.result-tile--warn { background: rgba(255, 152, 0, 0.06); border-color: rgba(255, 152, 0, 0.25); }
.result-tile--warn .result-tile__num { color: #ef6c00; }
.result-tile--err  { background: rgba(244, 67, 54, 0.06); border-color: rgba(244, 67, 54, 0.25); }
.result-tile--err  .result-tile__num { color: #c62828; }

.error-list {
  border: 1px solid rgba(0,0,0,0.08);
  background: #fff;
  overflow: hidden;
}
.error-list__scroll {
  max-height: 260px;
  overflow-y: auto;
}
.error-list__row + .error-list__row {
  border-top: 1px solid rgba(0,0,0,0.04);
}
</style>
