<template>
  <div class="admin-posted-rates px-md-8 py-md-6">
    <v-container fluid>
      <!-- Header -->
      <v-row class="mb-6 align-center">
        <v-col cols="12" md="7">
          <div class="d-flex align-center mb-2">
            <v-btn icon="mdi-arrow-left" variant="text" size="small" class="mr-2" to="/admin" />
            <div class="premium-accent-bar mr-4" />
            <span class="text-overline letter-spacing-2 text-gold">Public Rates Board</span>
          </div>
          <h1 class="display-serif text-h4 mb-1">Posted Bank Rates</h1>
          <p class="text-body-2 text-medium-emphasis mb-0">
            These rows appear on your public <NuxtLink to="/rates" class="text-gold">/rates</NuxtLink> page,
            sitting alongside the live Bank of Canada market averages.
          </p>
        </v-col>
        <v-col cols="12" md="5" class="text-md-right">
          <div class="d-flex flex-wrap justify-md-end ga-2">
            <v-btn
              variant="outlined"
              class="premium-action-btn premium-ghost-btn"
              prepend-icon="mdi-table-plus"
              :loading="seeding"
              @click="seedDefaults"
            >
              Seed Big Six
            </v-btn>
            <v-btn
              color="primary"
              class="premium-action-btn"
              prepend-icon="mdi-plus"
              @click="openCreate"
            >
              Add Rate
            </v-btn>
          </div>
        </v-col>
      </v-row>

      <!-- Empty state -->
      <v-card v-if="!loading && rates.length === 0" class="empty-card pa-8 text-center" elevation="0">
        <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-bank-outline</v-icon>
        <div class="display-serif text-h5 mb-2">No rates published yet</div>
        <p class="text-body-2 text-medium-emphasis mb-5">
          Pre-fill the canonical Big Six grid (RBC, TD, Scotia, BMO, CIBC, NBC) and just edit the numbers,
          or add rows one at a time.
        </p>
        <div class="d-flex justify-center ga-2 flex-wrap">
          <v-btn variant="outlined" class="premium-ghost-btn premium-action-btn" prepend-icon="mdi-table-plus" :loading="seeding" @click="seedDefaults">
            Seed Big Six
          </v-btn>
          <v-btn color="primary" class="premium-action-btn" prepend-icon="mdi-plus" @click="openCreate">
            Add Rate
          </v-btn>
        </div>
      </v-card>

      <!-- Group cards (one per bank) -->
      <div v-else class="bank-groups">
        <v-card v-for="group in groupedRates" :key="group.bank" class="bank-card mb-4" elevation="0">
          <div class="bank-card__head px-md-6 px-4 py-4 d-flex align-center">
            <div class="bank-mark mr-3">
              <img
                v-if="group.logoUrl"
                :src="group.logoUrl"
                :alt="`${group.bank} logo`"
                class="bank-mark__img"
              />
              <v-avatar v-else :color="bankColor(group.bank)" size="36" class="text-white font-weight-bold">
                {{ bankInitials(group.bank) }}
              </v-avatar>
            </div>
            <div>
              <div class="display-serif text-h6 lh-1">{{ group.bank }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ group.rows.length }} {{ group.rows.length === 1 ? 'product' : 'products' }} ·
                {{ group.rows.filter(r => r.isPublished).length }} live on /rates
              </div>
            </div>
          </div>
          <v-divider />
          <v-table density="comfortable" class="rates-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Term</th>
                <th class="text-right">Rate</th>
                <th>Effective</th>
                <th class="text-center">Highlight</th>
                <th class="text-center">Live</th>
                <th class="text-right" style="width:120px">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in group.rows" :key="row.id">
                <td class="font-weight-bold">{{ row.product }}</td>
                <td class="text-medium-emphasis">{{ row.term || '—' }}</td>
                <td class="text-right">
                  <span class="rate-cell">{{ formatPercent(row.rate) }}</span>
                </td>
                <td class="text-medium-emphasis">{{ formatDate(row.effectiveDate) }}</td>
                <td class="text-center">
                  <v-icon
                    :color="row.highlight ? 'warning' : 'grey-lighten-1'"
                    size="18"
                    class="cursor-pointer"
                    @click="toggleField(row, 'highlight')"
                  >
                    {{ row.highlight ? 'mdi-star' : 'mdi-star-outline' }}
                  </v-icon>
                </td>
                <td class="text-center">
                  <v-switch
                    :model-value="row.isPublished"
                    color="success"
                    density="compact"
                    hide-details
                    inset
                    class="d-inline-flex"
                    @update:model-value="(v: boolean | null) => toggleField(row, 'isPublished', v ?? false)"
                  />
                </td>
                <td class="text-right">
                  <v-btn icon variant="text" size="small" @click="openEdit(row)">
                    <v-icon size="18">mdi-pencil</v-icon>
                  </v-btn>
                  <v-btn icon variant="text" size="small" color="error" @click="confirmDelete(row)">
                    <v-icon size="18">mdi-delete-outline</v-icon>
                  </v-btn>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </div>
    </v-container>

    <!-- Add / Edit dialog -->
    <v-dialog v-model="showDialog" max-width="560" persistent>
      <v-card class="rounded-xl rate-dialog">
        <v-card-title class="pa-6 d-flex align-center">
          <div>
            <div class="text-overline text-gold letter-spacing-2">Posted Rate</div>
            <div class="display-serif text-h5">{{ editingId ? 'Edit Rate' : 'Add Rate' }}</div>
          </div>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" :disabled="saving" @click="closeDialog" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-6">
          <!-- Logo uploader -->
          <div class="logo-uploader mb-5 pa-4 d-flex align-center ga-3">
            <div class="logo-preview">
              <img
                v-if="form.bankLogoUrl"
                :src="form.bankLogoUrl"
                alt="Bank logo preview"
                class="logo-preview__img"
              />
              <div v-else class="logo-preview__placeholder">
                <v-icon size="22" color="grey-lighten-1">mdi-image-outline</v-icon>
              </div>
            </div>
            <div class="flex-1-1-0">
              <div class="text-overline letter-spacing-1 text-gold mb-1">Bank Logo</div>
              <div class="text-caption text-medium-emphasis mb-2">
                PNG, JPG, or JPEG &middot; up to 5&nbsp;MB. Shown on the public /rates page next to this bank.
              </div>
              <div class="d-flex ga-2 flex-wrap">
                <v-btn
                  size="small"
                  variant="tonal"
                  color="primary"
                  prepend-icon="mdi-upload"
                  :loading="uploadingLogo"
                  @click="triggerLogoPicker"
                >
                  {{ form.bankLogoUrl ? 'Replace' : 'Upload' }}
                </v-btn>
                <v-btn
                  v-if="form.bankLogoUrl"
                  size="small"
                  variant="text"
                  color="error"
                  prepend-icon="mdi-close"
                  :disabled="uploadingLogo"
                  @click="form.bankLogoUrl = ''"
                >
                  Remove
                </v-btn>
              </div>
              <input
                ref="logoFileInput"
                type="file"
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                style="display: none"
                @change="onLogoSelected"
              />
              <div v-if="logoUploadError" class="text-caption text-error mt-2">
                {{ logoUploadError }}
              </div>
            </div>
          </div>

          <v-row dense>
            <v-col cols="12" sm="6">
              <v-combobox
                v-model="form.bank"
                :items="BANK_SUGGESTIONS"
                label="Bank"
                variant="outlined"
                density="compact"
                hide-details="auto"
                class="mb-3"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="form.category"
                :items="CATEGORY_OPTIONS"
                label="Category"
                variant="outlined"
                density="compact"
                hide-details="auto"
                class="mb-3"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-combobox
                v-model="form.product"
                :items="PRODUCT_SUGGESTIONS"
                label="Product"
                variant="outlined"
                density="compact"
                hide-details="auto"
                class="mb-3"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.term"
                label="Term / sub-label"
                placeholder="Closed, Open, Insured…"
                variant="outlined"
                density="compact"
                hide-details="auto"
                class="mb-3"
              />
            </v-col>
            <v-col cols="6" sm="4">
              <v-text-field
                v-model.number="form.rate"
                label="Rate"
                suffix="%"
                type="number"
                step="0.01"
                variant="outlined"
                density="compact"
                hide-details="auto"
                class="mb-3"
              />
            </v-col>
            <v-col cols="6" sm="4">
              <v-text-field
                v-model="form.effectiveDate"
                label="Effective"
                type="date"
                variant="outlined"
                density="compact"
                hide-details="auto"
                class="mb-3"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model.number="form.sortOrder"
                label="Sort order"
                type="number"
                variant="outlined"
                density="compact"
                hide-details="auto"
                class="mb-3"
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="form.notes"
                label="Notes (shown as a small caption)"
                variant="outlined"
                density="compact"
                rows="2"
                hide-details="auto"
                class="mb-2"
              />
            </v-col>
            <v-col cols="6">
              <v-switch
                v-model="form.highlight"
                color="warning"
                label="Mark as highlight"
                density="compact"
                hide-details
                inset
              />
            </v-col>
            <v-col cols="6">
              <v-switch
                v-model="form.isPublished"
                color="success"
                label="Live on /rates"
                density="compact"
                hide-details
                inset
              />
            </v-col>
          </v-row>

          <v-alert
            v-if="formError"
            type="error"
            variant="tonal"
            density="compact"
            class="mt-3"
            closable
            @click:close="formError = ''"
          >
            {{ formError }}
          </v-alert>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-6">
          <v-spacer />
          <v-btn variant="text" :disabled="saving" @click="closeDialog">Cancel</v-btn>
          <v-btn color="primary" class="premium-action-btn" :loading="saving" @click="saveRate">
            {{ editingId ? 'Save Changes' : 'Add Rate' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete confirmation -->
    <v-dialog v-model="showDelete" max-width="420" persistent>
      <v-card class="rounded-xl">
        <v-card-title class="pa-5 display-serif text-h6">Delete this rate?</v-card-title>
        <v-card-text class="pa-5 pt-0 text-body-2">
          <strong>{{ deleting?.bank }} — {{ deleting?.product }}</strong>
          {{ deleting?.term ? `(${deleting.term})` : '' }} will be removed. This can't be undone.
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" :disabled="deletingBusy" @click="showDelete = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" :loading="deletingBusy" @click="doDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({ layout: 'admin', middleware: ['admin'] })

const getAuthHeaders = (): Record<string, string> => {
  if (process.client) {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }
  return {}
}

interface PostedRate {
  id: number
  bank: string
  bankLogoUrl: string | null
  category: string
  product: string
  term: string | null
  rate: number
  effectiveDate: string
  notes: string | null
  highlight: boolean
  isPublished: boolean
  sortOrder: number
}

const BANK_SUGGESTIONS = ['RBC', 'TD', 'Scotiabank', 'BMO', 'CIBC', 'National Bank', 'HSBC', 'Laurentian', 'EQB', 'Tangerine', 'Desjardins']
const PRODUCT_SUGGESTIONS = ['5-year fixed', '4-year fixed', '3-year fixed', '2-year fixed', '1-year fixed', 'Variable', 'HELOC', 'Prime']
const CATEGORY_OPTIONS = [
  { title: 'Mortgage (fixed)',     value: 'mortgage' },
  { title: 'Variable rate',        value: 'variable' },
  { title: 'HELOC',                value: 'heloc'    },
  { title: 'Prime rate',           value: 'prime'    },
  { title: 'Consumer credit',      value: 'consumer' },
  { title: 'Business / commercial', value: 'business' },
  { title: 'Other',                value: 'other'    },
]

const rates = ref<PostedRate[]>([])
const loading = ref(true)
const seeding = ref(false)
const saving = ref(false)
const showDialog = ref(false)
const editingId = ref<number | null>(null)
const formError = ref('')

const showDelete = ref(false)
const deleting = ref<PostedRate | null>(null)
const deletingBusy = ref(false)

interface RateForm {
  bank: string; category: string; product: string; term: string
  rate: number; effectiveDate: string; sortOrder: number
  notes: string; highlight: boolean; isPublished: boolean
  bankLogoUrl: string
}
const emptyForm = (): RateForm => ({
  bank: '', category: 'mortgage', product: '', term: '',
  rate: 0, effectiveDate: new Date().toISOString().slice(0, 10), sortOrder: 0,
  notes: '', highlight: false, isPublished: true,
  bankLogoUrl: '',
})
const form = ref<RateForm>(emptyForm())

const logoFileInput = ref<HTMLInputElement | null>(null)
const uploadingLogo = ref(false)
const logoUploadError = ref('')

const groupedRates = computed(() => {
  const map = new Map<string, { bank: string; rows: PostedRate[]; minSort: number; logoUrl: string | null }>()
  for (const r of rates.value) {
    const g = map.get(r.bank) ?? { bank: r.bank, rows: [], minSort: Number.POSITIVE_INFINITY, logoUrl: null }
    g.rows.push(r)
    g.minSort = Math.min(g.minSort, r.sortOrder)
    // First non-empty logo we encounter for this bank becomes the card avatar.
    // Keeps things consistent even if individual rows have different URLs.
    if (!g.logoUrl && r.bankLogoUrl) g.logoUrl = r.bankLogoUrl
    map.set(r.bank, g)
  }
  return Array.from(map.values()).sort((a, b) =>
    a.minSort !== b.minSort ? a.minSort - b.minSort : a.bank.localeCompare(b.bank),
  )
})

async function loadRates() {
  loading.value = true
  try {
    const res = await $fetch<{ rates: PostedRate[] }>('/api/admin/posted-rates', {
      headers: getAuthHeaders(),
    })
    rates.value = res.rates || []
  } catch (e) {
    console.error('Failed to load posted rates:', e)
  } finally {
    loading.value = false
  }
}

async function seedDefaults() {
  if (seeding.value) return
  seeding.value = true
  try {
    await $fetch('/api/admin/posted-rates/seed', { method: 'POST', headers: getAuthHeaders() })
    await loadRates()
  } catch (e) {
    console.error('Seed failed:', e)
  } finally {
    seeding.value = false
  }
}

function openCreate() {
  editingId.value = null
  form.value = emptyForm()
  formError.value = ''
  showDialog.value = true
}

function openEdit(row: PostedRate) {
  editingId.value = row.id
  form.value = {
    bank: row.bank,
    category: row.category,
    product: row.product,
    term: row.term || '',
    rate: row.rate,
    effectiveDate: row.effectiveDate ? new Date(row.effectiveDate).toISOString().slice(0, 10) : '',
    sortOrder: row.sortOrder,
    notes: row.notes || '',
    highlight: row.highlight,
    isPublished: row.isPublished,
    bankLogoUrl: row.bankLogoUrl || '',
  }
  logoUploadError.value = ''
  formError.value = ''
  showDialog.value = true
}

function triggerLogoPicker() {
  logoUploadError.value = ''
  logoFileInput.value?.click()
}

async function onLogoSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  // Reset the input value so picking the same file twice still triggers @change.
  input.value = ''
  if (!file) return

  // Mirror the server-side validation so the user gets instant feedback.
  const ext = '.' + (file.name.split('.').pop() || '').toLowerCase()
  if (!['.png', '.jpg', '.jpeg'].includes(ext)) {
    logoUploadError.value = 'Use a PNG, JPG, or JPEG file.'
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    logoUploadError.value = `Logo is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Max is 5 MB.`
    return
  }

  uploadingLogo.value = true
  logoUploadError.value = ''
  try {
    const fd = new FormData()
    fd.append('logo', file)
    if (form.value.bank) fd.append('bank', form.value.bank)
    const res = await $fetch<{ url: string }>('/api/admin/posted-rates/upload-bank-logo', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: fd,
    })
    form.value.bankLogoUrl = res.url
  } catch (err: any) {
    logoUploadError.value = err?.data?.message || err?.statusMessage || 'Could not upload the logo. Try again.'
  } finally {
    uploadingLogo.value = false
  }
}

function closeDialog() {
  if (saving.value) return
  showDialog.value = false
  editingId.value = null
}

async function saveRate() {
  if (!form.value.bank?.trim() || !form.value.product?.trim()) {
    formError.value = 'Bank and product are required.'
    return
  }
  if (!Number.isFinite(form.value.rate) || form.value.rate < 0 || form.value.rate > 100) {
    formError.value = 'Rate must be between 0 and 100.'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    if (editingId.value) {
      await $fetch(`/api/admin/posted-rates/${editingId.value}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: form.value,
      })
    } else {
      await $fetch('/api/admin/posted-rates', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: form.value,
      })
    }
    showDialog.value = false
    editingId.value = null
    await loadRates()
  } catch (e: any) {
    formError.value = e?.data?.statusMessage || e?.statusMessage || 'Could not save the rate.'
  } finally {
    saving.value = false
  }
}

async function toggleField(row: PostedRate, field: 'highlight' | 'isPublished', explicit?: boolean) {
  const next = explicit !== undefined ? explicit : !row[field]
  // Optimistic — keep the UI snappy. Roll back if the server says no.
  const prev = row[field]
  row[field] = next
  try {
    await $fetch(`/api/admin/posted-rates/${row.id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: { [field]: next },
    })
  } catch (e) {
    row[field] = prev
    console.error(`Failed to update ${field}:`, e)
  }
}

function confirmDelete(row: PostedRate) {
  deleting.value = row
  showDelete.value = true
}

async function doDelete() {
  if (!deleting.value || deletingBusy.value) return
  deletingBusy.value = true
  try {
    await $fetch(`/api/admin/posted-rates/${deleting.value.id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
    showDelete.value = false
    deleting.value = null
    await loadRates()
  } catch (e) {
    console.error('Delete failed:', e)
  } finally {
    deletingBusy.value = false
  }
}

// ── Display helpers ────────────────────────────────────────────────────────
function formatPercent(n: number) {
  return (Number(n) || 0).toFixed(2) + '%'
}
function formatDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}
function bankInitials(bank: string) {
  const parts = bank.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]!.slice(0, 3).toUpperCase()
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
}
// Stable per-bank colour so the avatar matches across the page.
function bankColor(bank: string): string {
  const palette = ['#003168', '#12824C', '#EE3124', '#0079C1', '#C8102E', '#E1251B', '#8c734b', '#5a4a30', '#6c757d']
  let h = 0
  for (let i = 0; i < bank.length; i++) h = (h * 31 + bank.charCodeAt(i)) >>> 0
  return palette[h % palette.length]!
}

onMounted(loadRates)
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;600;700&display=swap');

.admin-posted-rates {
  background-color: #fcfcfb;
  font-family: 'Inter', sans-serif;
  min-height: 100vh;
}

.display-serif { font-family: 'Playfair Display', serif; }
.text-gold { color: #8c734b; }
.letter-spacing-1 { letter-spacing: 1px; }
.letter-spacing-2 { letter-spacing: 2px; }
.lh-1 { line-height: 1; }
.ga-2 { gap: 8px; }
.cursor-pointer { cursor: pointer; }
.premium-accent-bar { width: 40px; height: 4px; background: #8c734b; border-radius: 2px; }
.premium-action-btn { border-radius: 12px !important; text-transform: none !important; font-weight: 700 !important; }
.premium-ghost-btn {
  border-color: rgba(140, 115, 75, 0.4) !important;
  color: #8c734b !important;
}
.premium-ghost-btn:hover { background: rgba(140, 115, 75, 0.06) !important; }

.empty-card,
.bank-card {
  border-radius: 20px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  background: #ffffff !important;
}
.bank-card__head {
  background: linear-gradient(180deg, rgba(140, 115, 75, 0.04), transparent);
}
.rate-cell {
  font-family: 'Playfair Display', serif;
  font-size: 18px;
  color: #5a4a30;
}

.rates-table :deep(th) {
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 11px;
  color: rgba(0,0,0,0.55);
}
.rates-table :deep(tbody tr:hover) {
  background: rgba(140, 115, 75, 0.03);
}

.rate-dialog :deep(.v-tab) {
  text-transform: none;
  font-weight: 600;
}

/* ── Bank logo on group cards ────────────────────────────────────────── */
.bank-mark {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bank-mark__img {
  max-width: 48px;
  max-height: 48px;
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
}

/* ── Dialog logo uploader ────────────────────────────────────────────── */
.logo-uploader {
  border: 1px dashed rgba(140, 115, 75, 0.35);
  background: linear-gradient(135deg, rgba(140, 115, 75, 0.04), transparent);
  border-radius: 14px;
}
.logo-preview {
  width: 64px;
  height: 64px;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,0.06);
  overflow: hidden;
}
.logo-preview__img {
  max-width: 56px;
  max-height: 56px;
  object-fit: contain;
}
.logo-preview__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
</style>
