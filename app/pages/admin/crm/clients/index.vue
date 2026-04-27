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
          <v-btn color="primary" class="premium-action-btn" prepend-icon="mdi-account-plus" @click="showAddDialog = true">
            Add Client
          </v-btn>
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
    const res = await $fetch('/api/admin/crm/clients/convert', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: {
        clientId: convertingClient.value.id,
        ...convertForm.value
      }
    }) as any

    showConvertDialog.value = false
    if (res.transaction?.id) {
      navigateTo(`/admin/crm/transactions/${res.transaction.id}`)
    }
  } finally {
    converting.value = false
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
.letter-spacing-1 { letter-spacing: 1px; }
</style>
