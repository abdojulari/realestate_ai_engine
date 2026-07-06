<template>
  <v-container>
    <div class="d-flex align-center mb-6">
      <v-btn icon="mdi-arrow-left" variant="text" size="small" class="mr-2" to="/admin" />
      <h1 class="text-h4">Properties Management</h1>
      <v-spacer />
      <v-btn
        color="primary"
        prepend-icon="mdi-home-plus"
        to="/admin/properties/new/edit"
        variant="flat"
      >
        Add Property
      </v-btn>
    </div>

    <!-- Source Tabs -->
    <v-tabs v-model="activeSource" class="mb-6" color="primary">
      <v-tab value="manual">
        <v-icon start>mdi-pencil</v-icon>
        Manual Listings
      </v-tab>
      <v-tab value="all">
        <v-icon start>mdi-view-grid</v-icon>
        All Properties
      </v-tab>
      <v-tab value="pillar9">
        <v-icon start>mdi-database-sync</v-icon>
        Pillar9
      </v-tab>
      <v-tab value="crea">
        <v-icon start>mdi-cloud-sync</v-icon>
        CREA
      </v-tab>
    </v-tabs>

    <!-- Filters -->
    <v-card class="mb-6">
      <v-card-text>
        <v-row align="center">
          <v-col cols="12" sm="5" md="3">
            <v-text-field
              v-model="filters.search"
              label="Search Properties"
              prepend-inner-icon="mdi-magnify"
              clearable
              @keyup.enter="applyFilters"
              @click:clear="applyFilters"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          
          <v-col cols="12" sm="6" md="2">
            <v-select
              v-model="filters.type"
              :items="propertyTypes"
              label="Property Type"
              clearable
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>

          <v-col cols="12" sm="6" md="2">
            <v-select
              v-model="filters.status"
              :items="propertyStatuses"
              label="Status"
              clearable
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>

          <v-col cols="12" sm="6" md="2">
            <v-select
              v-model="filters.sortBy"
              :items="sortOptions"
              label="Sort By"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-btn
              color="primary"
              @click="applyFilters"
              :loading="loading"
              variant="flat"
              prepend-icon="mdi-magnify"
              rounded="lg"
            >
              Search
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="64" />
      <div class="mt-4 text-h6">Loading properties...</div>
    </div>

    <!-- Empty State -->
    <v-card v-else-if="properties.length === 0" class="text-center py-12">
      <v-card-text>
        <v-icon size="64" color="grey-lighten-2" class="mb-4">mdi-home-search</v-icon>
        <div class="text-h6 mb-2">No properties found</div>
        <div class="text-body-1 text-grey mb-4">
          <template v-if="activeSource === 'manual'">
            No manual listings yet. Add builder, FSBO, flip, or other offline listings.
          </template>
          <template v-else>
            Try adjusting your filters or add a new property
          </template>
        </div>
        <v-btn v-if="activeSource === 'manual'" color="primary" to="/admin/properties/new/edit" prepend-icon="mdi-plus">
          Create Listing
        </v-btn>
      </v-card-text>
    </v-card>

    <!-- Properties Grid -->
    <v-row v-else>
      <v-col
        v-for="property in properties"
        :key="property.id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <v-card>
          <v-img
            :src="getImage(property)"
            height="200"
            cover
            class="property-image"
          >
            <template v-slot:placeholder>
              <v-row class="fill-height ma-0" align="center" justify="center">
                <v-progress-circular indeterminate color="blue-grey-lighten-5" />
              </v-row>
            </template>

            <div class="d-flex justify-space-between pa-2" style="position:absolute;top:0;left:0;right:0;">
              <v-chip :color="getStatusColor(property.status)" size="small">
                {{ property.status }}
              </v-chip>
              <v-chip :color="getSourceColor(property.source)" size="x-small" variant="flat" class="font-weight-bold text-uppercase">
                {{ property.source || 'manual' }}
              </v-chip>
            </div>
          </v-img>

          <v-card-text>
            <div class="d-flex align-center mb-2">
              <span class="text-h6">${{ formatPrice(property.price) }}</span>
              <v-spacer />
              <v-chip size="small" :color="getTypeColor(property.type)">
                {{ property.type }}
              </v-chip>
            </div>

            <div class="text-subtitle-1 mb-1 text-truncate">{{ property.title }}</div>
            <div class="text-body-2 text-grey mb-2">{{ property.address }}</div>
            <div class="text-caption text-grey mb-2" v-if="property.city">{{ property.city }}, {{ property.province }}</div>

            <div class="d-flex align-center text-body-2 text-grey mb-2">
              <v-icon size="small" class="mr-1">mdi-bed</v-icon>
              <span class="mr-3">{{ property.beds }}</span>
              <v-icon size="small" class="mr-1">mdi-shower</v-icon>
              <span class="mr-3">{{ property.baths }}</span>
              <v-icon size="small" class="mr-1">mdi-ruler-square</v-icon>
              <span>{{ property.sqft?.toLocaleString() }} sqft</span>
            </div>

            <div class="d-flex align-center flex-wrap text-caption text-grey" style="gap: 4px;">
              <v-chip v-if="property.mlsNumber" size="x-small" variant="outlined" color="blue-grey">
                MLS: {{ property.mlsNumber }}
              </v-chip>
            </div>
          </v-card-text>

          <v-divider />

          <v-card-actions>
            <v-btn variant="text" :to="`/property/${property.id}`" target="_blank">
              View
            </v-btn>
            <v-btn variant="text" :to="`/admin/properties/${property.id}/edit`">
              Edit
            </v-btn>
            <v-spacer />
            <v-menu>
              <template v-slot:activator="{ props }">
                <v-btn icon="mdi-dots-vertical" variant="text" v-bind="props" />
              </template>
              <v-list>
                <v-list-item @click="duplicateProperty(property)">
                  <template v-slot:prepend><v-icon>mdi-content-copy</v-icon></template>
                  <v-list-item-title>Duplicate</v-list-item-title>
                </v-list-item>
                <v-divider />
                <v-list-item color="error" @click="deleteProperty(property)">
                  <template v-slot:prepend><v-icon color="error">mdi-delete</v-icon></template>
                  <v-list-item-title>Delete</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Pagination -->
    <div v-if="!loading && properties.length > 0" class="mt-6">
      <div v-if="totalProperties > 0" class="text-center mb-4">
        <v-chip variant="outlined" color="primary">
          Showing {{ ((currentPage - 1) * 12) + 1 }}-{{ Math.min(currentPage * 12, totalProperties) }} of {{ totalProperties }} properties
        </v-chip>
      </div>
      <div v-if="totalPages > 1" class="text-center">
        <v-pagination v-model="currentPage" :length="totalPages" :total-visible="7" @update:model-value="loadPage" />
      </div>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import {
  DEFAULT_PROPERTY_SORT,
  PROPERTY_SORT_OPTIONS,
  type PropertySortValue,
} from '~/utils/propertySortOptions'

const getAuthHeaders = (): Record<string, string> | undefined => {
  if (process.client) {
    const token = localStorage.getItem('token')
    return token ? { 'Authorization': `Bearer ${token}` } : undefined
  }
  return undefined
}

const loading = ref(false)
const currentPage = ref(1)
const totalPages = ref(1)
const totalProperties = ref(0)
const activeSource = ref('manual')

const filters = ref({
  search: '',
  type: null as string | null,
  status: null as string | null,
  sortBy: DEFAULT_PROPERTY_SORT as PropertySortValue,
})

const propertyTypes = ['House', 'Condo', 'Duplex', 'Townhouse', 'Multi-Family', 'Land']
const propertyStatuses = ['For sale', 'Pending', 'Sold', 'For rent']
const sortOptions = PROPERTY_SORT_OPTIONS

const properties = ref<any[]>([])

const getStatusColor = (status: string) => {
  const s = (status || '').toLowerCase()
  if (s.includes('sale')) return 'success'
  if (s.includes('rent')) return 'info'
  if (s.includes('sold')) return 'error'
  if (s.includes('pending')) return 'warning'
  return 'grey'
}

const getTypeColor = (type: string) => {
  const t = (type || '').toLowerCase()
  if (t.includes('house')) return 'primary'
  if (t.includes('condo')) return 'secondary'
  if (t.includes('duplex')) return 'info'
  if (t.includes('town')) return 'success'
  return 'grey'
}

const getSourceColor = (source: string) => {
  if (source === 'manual') return 'success'
  if (source === 'crea') return 'info'
  if (source === 'pillar9') return 'purple'
  return 'grey'
}

const getImage = (property: any) => {
  const images = property.images
  if (Array.isArray(images) && images.length > 0) {
    const first = images[0]
    return typeof first === 'string' ? first : first?.url || first?.Uri || '/placeholder.jpg'
  }
  return '/placeholder.jpg'
}

const formatPrice = (price: number) =>
  Math.round(price).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')

async function applyFilters() {
  if (loading.value) return
  loading.value = true
  currentPage.value = 1

  try {
    const params = new URLSearchParams()
    if (filters.value.search?.trim()) params.append('search', filters.value.search.trim())
    if (filters.value.type) params.append('type', filters.value.type)
    if (filters.value.status) params.append('status', filters.value.status)
    params.append('sortBy', filters.value.sortBy || DEFAULT_PROPERTY_SORT)
    params.append('page', '1')

    // Source filter from tabs
    if (activeSource.value === 'manual') {
      params.append('only_manual', 'true')
    } else if (activeSource.value !== 'all') {
      params.append('source', activeSource.value)
    }

    const response = await $fetch(`/api/admin/properties?${params.toString()}`, {
      headers: getAuthHeaders(),
    }) as any

    if (response.data && response.pagination) {
      properties.value = response.data
      totalPages.value = response.pagination.totalPages
      totalProperties.value = response.pagination.total
      currentPage.value = response.pagination.page
    } else {
      properties.value = Array.isArray(response) ? response : (response.data || [])
      totalPages.value = response.totalPages || 1
      totalProperties.value = properties.value.length
    }
  } catch (error) {
    console.error('Error applying filters:', error)
    properties.value = []
  } finally {
    loading.value = false
  }
}

async function loadPage(page: number) {
  if (loading.value) return
  loading.value = true
  currentPage.value = page

  try {
    const params = new URLSearchParams()
    if (filters.value.search?.trim()) params.append('search', filters.value.search.trim())
    if (filters.value.type) params.append('type', filters.value.type)
    if (filters.value.status) params.append('status', filters.value.status)
    params.append('sortBy', filters.value.sortBy || DEFAULT_PROPERTY_SORT)
    params.append('page', page.toString())

    if (activeSource.value === 'manual') {
      params.append('only_manual', 'true')
    } else if (activeSource.value !== 'all') {
      params.append('source', activeSource.value)
    }

    const response = await $fetch(`/api/admin/properties?${params.toString()}`, {
      headers: getAuthHeaders(),
    }) as any

    if (response.data && response.pagination) {
      properties.value = response.data
      totalPages.value = response.pagination.totalPages
      totalProperties.value = response.pagination.total
      currentPage.value = response.pagination.page
    } else {
      properties.value = Array.isArray(response) ? response : (response.data || [])
      totalPages.value = 1
      totalProperties.value = properties.value.length
    }
  } catch (error) {
    console.error('Error loading page:', error)
    properties.value = []
  } finally {
    loading.value = false
  }
}

async function duplicateProperty(property: any) {
  try {
    await $fetch(`/api/admin/properties/${property.id}/duplicate`, {
      method: 'POST',
      headers: getAuthHeaders(),
    })
    await applyFilters()
  } catch (error) {
    console.error('Error duplicating:', error)
  }
}

async function deleteProperty(property: any) {
  if (!confirm('Are you sure you want to delete this property?')) return
  try {
    await $fetch(`/api/admin/properties/${property.id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
    properties.value = properties.value.filter(p => p.id !== property.id)
    totalProperties.value--
  } catch (error) {
    console.error('Error deleting:', error)
  }
}

// Re-fetch when source tab changes
watch(activeSource, () => {
  applyFilters()
})

onMounted(() => {
  applyFilters()
})

definePageMeta({ layout: 'admin', middleware: ['admin'] })
</script>

<style scoped>
.property-image { position: relative; }
</style>
