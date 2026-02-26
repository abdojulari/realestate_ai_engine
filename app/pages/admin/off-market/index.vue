<template>
  <div class="admin-off-market px-md-8 py-md-6">
    <v-container fluid>
      <!-- Header -->
      <v-row class="mb-10 align-center">
        <v-col cols="12" md="8">
          <div class="d-flex align-center mb-2">
            <v-btn icon="mdi-arrow-left" variant="text" size="small" class="mr-2" to="/admin" />
            <div class="premium-accent-bar mr-4"></div>
            <span class="text-overline letter-spacing-2 text-gold">Lead Intelligence</span>
          </div>
          <h1 class="display-serif text-h3 mb-1">Off-Market Listings</h1>
          <p class="text-subtitle-1 text-medium-emphasis font-weight-light">
            Sold, terminated, withdrawn, and expired listings — potential leads for outreach
          </p>
        </v-col>
      </v-row>

      <!-- Summary Cards -->
      <v-row class="mb-8">
        <v-col cols="12" sm="6" md="3">
          <v-card class="stat-card" elevation="0" @click="setStatusFilter('sold')" style="cursor:pointer">
            <v-card-text class="text-center">
              <v-icon icon="mdi-check-decagram" size="28" color="success" class="mb-2" />
              <div class="text-h3 font-weight-bold text-success mb-1">{{ counts.sold }}</div>
              <div class="text-overline text-medium-emphasis">Sold</div>
              <div class="text-caption text-medium-emphasis">Transaction closed</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-card class="stat-card" elevation="0" @click="setStatusFilter('terminated')" style="cursor:pointer">
            <v-card-text class="text-center">
              <v-icon icon="mdi-file-cancel-outline" size="28" color="error" class="mb-2" />
              <div class="text-h3 font-weight-bold text-error mb-1">{{ counts.terminated }}</div>
              <div class="text-overline text-medium-emphasis">Terminated</div>
              <div class="text-caption text-medium-emphasis">Contract ended early</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-card class="stat-card" elevation="0" @click="setStatusFilter('withdrawn')" style="cursor:pointer">
            <v-card-text class="text-center">
              <v-icon icon="mdi-undo-variant" size="28" color="warning" class="mb-2" />
              <div class="text-h3 font-weight-bold text-warning mb-1">{{ counts.withdrawn }}</div>
              <div class="text-overline text-medium-emphasis">Withdrawn</div>
              <div class="text-caption text-medium-emphasis">Pulled off market</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-card class="stat-card" elevation="0" @click="setStatusFilter('expired')" style="cursor:pointer">
            <v-card-text class="text-center">
              <v-icon icon="mdi-clock-alert-outline" size="28" color="info" class="mb-2" />
              <div class="text-h3 font-weight-bold text-info mb-1">{{ counts.expired }}</div>
              <div class="text-overline text-medium-emphasis">Expired</div>
              <div class="text-caption text-medium-emphasis">Listing period ended</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Filters -->
      <v-row class="mb-8">
        <v-col cols="12">
          <v-card class="filter-card" elevation="0">
            <v-card-text class="pa-6">
              <v-row align="center">
                <v-col cols="12" sm="6" md="3">
                  <v-select
                    v-model="filters.status"
                    :items="statusOptions"
                    label="Status"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-filter-variant"
                    clearable
                    @update:model-value="loadListings"
                  />
                </v-col>
                <v-col cols="12" sm="6" md="3">
                  <v-autocomplete
                    v-model="filters.city"
                    :items="filterOptions.cities"
                    label="City"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-city"
                    clearable
                    @update:model-value="loadListings"
                  />
                </v-col>
                <v-col cols="12" sm="6" md="3">
                  <v-select
                    v-model="filters.source"
                    :items="sourceOptions"
                    label="Source"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-database"
                    clearable
                    @update:model-value="loadListings"
                  />
                </v-col>
                <v-col cols="12" sm="6" md="3">
                  <v-text-field
                    v-model="filters.search"
                    label="Search address / MLS#"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-magnify"
                    clearable
                    @keyup.enter="loadListings"
                    @click:clear="filters.search = ''; loadListings()"
                  />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-16">
        <v-progress-circular indeterminate size="48" color="primary" />
        <p class="mt-4 text-medium-emphasis">Loading off-market listings...</p>
      </div>

      <!-- Empty State -->
      <v-row v-else-if="properties.length === 0" class="mb-8">
        <v-col cols="12">
          <v-card class="text-center pa-16" elevation="0" style="border-radius:20px; border:1px solid rgba(0,0,0,0.05)">
            <v-icon icon="mdi-home-search" size="64" color="grey-lighten-1" class="mb-4" />
            <h3 class="text-h5 font-weight-bold mb-2">No Off-Market Listings Found</h3>
            <p class="text-body-1 text-medium-emphasis">
              Off-market listings will appear here after syncing from Pillar9 or CREA with sold, terminated, withdrawn, or expired statuses.
            </p>
          </v-card>
        </v-col>
      </v-row>

      <!-- Listings Grid -->
      <v-row v-else>
        <v-col v-for="prop in properties" :key="prop.id" cols="12" sm="6" lg="4">
          <v-card class="listing-card" elevation="0">
            <div class="listing-img-wrap">
              <v-img
                :src="getFirstImage(prop.images)"
                height="200"
                cover
                class="listing-img"
              >
                <template v-slot:error>
                  <div class="d-flex align-center justify-center fill-height bg-grey-lighten-3">
                    <v-icon icon="mdi-image-off" size="48" color="grey" />
                  </div>
                </template>
              </v-img>
              <v-chip :color="getStatusColor(prop.status)" size="small" class="status-badge" variant="flat">
                {{ prop.status.toUpperCase() }}
              </v-chip>
              <v-chip v-if="prop.source" size="x-small" class="source-badge" variant="flat" color="grey-darken-3">
                {{ prop.source }}
              </v-chip>
            </div>

            <v-card-text class="pa-5">
              <h3 class="text-subtitle-1 font-weight-bold mb-1 text-truncate">{{ prop.address || prop.title }}</h3>
              <p class="text-caption text-medium-emphasis mb-3">{{ prop.city }}, {{ prop.province }}</p>

              <div class="d-flex align-center justify-space-between mb-3">
                <span class="text-h6 font-weight-bold text-primary">${{ formatPrice(prop.price) }}</span>
                <span v-if="prop.mlsNumber" class="text-caption text-medium-emphasis">MLS# {{ prop.mlsNumber }}</span>
              </div>

              <div class="d-flex gap-4 mb-3 text-caption text-medium-emphasis">
                <span v-if="prop.beds"><v-icon icon="mdi-bed" size="14" class="mr-1" />{{ prop.beds }} bd</span>
                <span v-if="prop.baths"><v-icon icon="mdi-shower" size="14" class="mr-1" />{{ prop.baths }} ba</span>
                <span v-if="prop.sqft"><v-icon icon="mdi-ruler-square" size="14" class="mr-1" />{{ formatPrice(prop.sqft) }} sqft</span>
              </div>

              <!-- Agent Info -->
              <div v-if="getAgentName(prop)" class="text-caption text-medium-emphasis mb-3">
                <v-icon icon="mdi-account-tie" size="14" class="mr-1" />
                {{ getAgentName(prop) }}
                <span v-if="getOfficeName(prop)"> &middot; {{ getOfficeName(prop) }}</span>
              </div>

              <v-divider class="my-3" />

              <div class="d-flex gap-2">
                <v-btn size="small" variant="tonal" color="primary" prepend-icon="mdi-email" @click="createCampaign(prop)">
                  Campaign
                </v-btn>
                <v-btn size="small" variant="tonal" color="info" prepend-icon="mdi-facebook" @click="postToFacebook(prop)">
                  Share
                </v-btn>
                <v-spacer />
                <v-btn size="small" variant="text" icon="mdi-open-in-new" :href="`/property/${prop.id}`" target="_blank" />
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Pagination -->
      <div v-if="pagination.totalPages > 1" class="d-flex justify-center mt-8">
        <v-pagination
          v-model="pagination.page"
          :length="pagination.totalPages"
          :total-visible="7"
          @update:model-value="loadListings"
        />
      </div>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({
  layout: 'admin',
  middleware: ['admin']
})

const getAuthHeaders = (): Record<string, string> => {
  const token = process.client ? localStorage.getItem('token') : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const loading = ref(true)
const properties = ref<any[]>([])
const counts = ref({ sold: 0, terminated: 0, withdrawn: 0, expired: 0 })
const pagination = ref({ page: 1, limit: 18, total: 0, totalPages: 0 })
const filterOptions = ref({ cities: [] as string[], sources: [] as string[] })

const filters = ref({
  status: '' as string,
  city: '' as string,
  source: '' as string,
  search: '' as string,
})

const statusOptions = [
  { title: 'All Off-Market', value: '' },
  { title: 'Sold', value: 'sold' },
  { title: 'Terminated', value: 'terminated' },
  { title: 'Withdrawn', value: 'withdrawn' },
  { title: 'Expired', value: 'expired' },
]

const sourceOptions = ref<{ title: string; value: string }[]>([])

function setStatusFilter(status: string) {
  filters.value.status = filters.value.status === status ? '' : status
  loadListings()
}

function getStatusColor(status: string) {
  const map: Record<string, string> = { sold: 'success', terminated: 'error', withdrawn: 'warning', expired: 'info' }
  return map[status] || 'grey'
}

function getFirstImage(images: any) {
  if (!images) return ''
  const arr = Array.isArray(images) ? images : []
  if (arr.length === 0) return ''
  const first = arr[0]
  return typeof first === 'string' ? first : first?.url || first?.Uri || ''
}

function formatPrice(n: number) {
  return n ? Math.round(n).toLocaleString() : '0'
}

function getAgentName(prop: any) {
  const agent = prop.listingAgentData as any
  if (!agent) return ''
  if (typeof agent === 'string') return agent
  return agent.MemberFullName || agent.name || [agent.MemberFirstName, agent.MemberLastName].filter(Boolean).join(' ') || ''
}

function getOfficeName(prop: any) {
  const office = prop.listingOfficeData as any
  if (!office) return ''
  if (typeof office === 'string') return office
  return office.OfficeName || office.name || ''
}

function createCampaign(prop: any) {
  navigateTo(`/admin/newsletter/campaigns/new?propertyId=${prop.id}`)
}

function postToFacebook(prop: any) {
  navigateTo(`/admin/facebook?propertyId=${prop.id}`)
}

async function loadFilterOptions() {
  try {
    const data = await $fetch('/api/admin/off-market/filter-options', {
      headers: getAuthHeaders()
    }) as any
    filterOptions.value = data
    sourceOptions.value = (data.sources || []).map((s: string) => ({ title: s, value: s }))
  } catch (e) {
    console.error('Failed to load filter options:', e)
  }
}

async function loadListings() {
  loading.value = true
  try {
    const params: any = { page: pagination.value.page, limit: pagination.value.limit }
    if (filters.value.status) params.status = filters.value.status
    if (filters.value.city) params.city = filters.value.city
    if (filters.value.source) params.source = filters.value.source
    if (filters.value.search) params.search = filters.value.search

    const data = await $fetch('/api/admin/off-market', {
      headers: getAuthHeaders(),
      params
    }) as any

    properties.value = data.properties
    pagination.value = { ...pagination.value, ...data.pagination }
    counts.value = data.counts
  } catch (e: any) {
    console.error('Failed to load off-market listings:', e)
    if (e?.statusCode === 403) {
      navigateTo('/admin')
    }
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadFilterOptions(), loadListings()])
})
</script>

<style scoped>
.admin-off-market {
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
.premium-accent-bar {
  width: 40px;
  height: 4px;
  background: #8c734b;
  border-radius: 2px;
}
.stat-card {
  border-radius: 20px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  background: white !important;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.08) !important;
}
.filter-card {
  border-radius: 20px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  background: white !important;
}
.listing-card {
  border-radius: 16px !important;
  border: 1px solid rgba(0,0,0,0.06) !important;
  background: white !important;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  overflow: hidden;
}
.listing-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.1) !important;
}
.listing-img-wrap {
  position: relative;
}
.status-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.source-badge {
  position: absolute;
  top: 12px;
  right: 12px;
}
.gap-2 {
  gap: 8px;
}
.gap-4 {
  gap: 16px;
}
</style>
