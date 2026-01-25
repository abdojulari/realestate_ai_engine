<template>
  <v-container fluid class="pa-6">
    <v-row class="mb-6">
      <v-col cols="12" md="8">
        <h1 class="text-h4 font-weight-bold">CMA - Sold Comparables</h1>
        <p class="text-subtitle-2 text-medium-emphasis">
          Filter sold listings and compare against subject properties.
        </p>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" lg="4">
        <v-card class="pa-4 mb-6" elevation="0">
          <div class="text-subtitle-1 font-weight-bold mb-4">Filters</div>
          <v-select v-model="filters.province" :items="provinceOptions" label="Province" variant="outlined" />
          <v-text-field v-model="filters.city" label="City" variant="outlined" class="mt-3" />
          <v-select v-model="filters.range" :items="dateRanges" label="Date Range" variant="outlined" class="mt-3" />
          <v-row v-if="filters.range === 'custom'" class="mt-1">
            <v-col cols="6">
              <v-text-field v-model="filters.startDate" type="date" label="Start" variant="outlined" />
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="filters.endDate" type="date" label="End" variant="outlined" />
            </v-col>
          </v-row>
          <v-btn color="primary" class="mt-4" :loading="loadingSold" @click="loadSold">
            Load Sold Properties
          </v-btn>
        </v-card>

        <v-card class="pa-4" elevation="0">
          <div class="text-subtitle-1 font-weight-bold mb-4">Subject Property</div>
          <v-select
            v-model="selectedEstimateId"
            :items="estimateOptions"
            label="Use Estimate Request"
            variant="outlined"
            @update:model-value="applyEstimate"
          />
          <v-text-field v-model="subject.address" label="Address" variant="outlined" class="mt-3" />
          <v-text-field v-model="subject.city" label="City" variant="outlined" class="mt-3" />
          <v-text-field v-model="subject.province" label="Province" variant="outlined" class="mt-3" />
          <v-row class="mt-1">
            <v-col cols="4">
              <v-text-field v-model.number="subject.beds" type="number" label="Beds" variant="outlined" />
            </v-col>
            <v-col cols="4">
              <v-text-field v-model.number="subject.baths" type="number" label="Baths" variant="outlined" />
            </v-col>
            <v-col cols="4">
              <v-text-field v-model.number="subject.sqft" type="number" label="Sqft" variant="outlined" />
            </v-col>
          </v-row>
          <v-select
            v-model="subject.features"
            :items="availableFeatures"
            label="Key Features"
            multiple
            chips
            variant="outlined"
            class="mt-3"
          />
          <v-text-field v-model.number="radiusKm" type="number" label="Radius (km)" variant="outlined" class="mt-3" />
          <v-btn color="primary" class="mt-4" :loading="loadingComps" @click="findComps">
            Find Comparables
          </v-btn>
        </v-card>
      </v-col>

      <v-col cols="12" lg="8">
        <v-card class="pa-4 mb-6" elevation="0">
          <div class="d-flex align-center justify-space-between mb-4">
            <div class="text-subtitle-1 font-weight-bold">Sold Properties</div>
            <div class="text-caption text-medium-emphasis">
              {{ soldPagination.total }} total
            </div>
          </div>
          <v-data-table
            :headers="soldHeaders"
            :items="soldProperties"
            :loading="loadingSold"
            :items-per-page="soldPagination.limit"
            :page="soldPagination.page"
            :items-length="soldPagination.total"
            class="elevation-0"
            @update:page="updateSoldPage"
          >
            <template #item.price="{ item }">
              ${{ formatCurrency(item.price) }}
            </template>
            <template #item.bedsBaths="{ item }">
              {{ item.beds }} / {{ item.baths }}
            </template>
            <template #item.soldDate="{ item }">
              {{ formatDate(item.soldDate) }}
            </template>
            <template #no-data>
              <div class="text-center py-6 text-medium-emphasis">
                No sold properties found for the current filters.
              </div>
            </template>
          </v-data-table>
        </v-card>

        <v-card class="pa-4" elevation="0">
          <div class="d-flex align-center justify-space-between mb-4">
            <div class="text-subtitle-1 font-weight-bold">Comparables</div>
            <div class="text-caption text-medium-emphasis">
              {{ compStats.count }} comps • Avg: ${{ formatCurrency(compStats.avgPrice) }}
            </div>
          </div>
          <v-table>
            <thead>
              <tr>
                <th>Property</th>
                <th>Price</th>
                <th>Match</th>
                <th>Distance</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loadingComps">
                <td colspan="5" class="text-center py-6">
                  <v-progress-circular indeterminate color="primary" />
                </td>
              </tr>
              <tr v-else-if="comparables.length === 0">
                <td colspan="5" class="text-center py-6 text-medium-emphasis">
                  No comparables yet. Use the subject form and click “Find Comparables”.
                </td>
              </tr>
              <tr v-else v-for="comp in comparables" :key="comp.id">
                <td>{{ comp.title }}</td>
                <td>${{ formatCurrency(comp.price) }}</td>
                <td>
                  <v-chip :color="matchColor(comp.matchScore)" size="small" variant="flat">
                    {{ comp.matchScore }}%
                  </v-chip>
                </td>
                <td>{{ comp.distanceKm ? comp.distanceKm.toFixed(2) + ' km' : '—' }}</td>
                <td class="text-caption">
                  <div v-if="comp.subjectExtraFeatures?.length" class="text-success">
                    Met & beyond: {{ comp.subjectExtraFeatures.join(', ') }}
                  </div>
                  <div v-else class="text-medium-emphasis">Feature parity</div>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { api } from '~/utils/api'

definePageMeta({
  layout: 'admin',
  middleware: ['admin']
})

const provinceOptions = ['All', 'Alberta', 'British Columbia', 'Saskatchewan', 'Manitoba', 'Ontario']
const dateRanges = [
  { title: 'Last 30 days', value: 'last_30' },
  { title: 'Last 3 months', value: 'last_90' },
  { title: 'Last 6 months', value: 'last_180' },
  { title: 'Last 12 months', value: 'last_365' },
  { title: 'Custom', value: 'custom' }
]

const availableFeatures = [
  'Finished Basement',
  'Double Garage',
  'Single Garage',
  'Parking Pad',
  'Central Air',
  'Fireplace',
  'Pool',
  'Waterfront',
  'City Views'
]

const filters = reactive({
  province: 'Alberta',
  city: '',
  range: 'last_90',
  startDate: '',
  endDate: ''
})

const loadingSold = ref(false)
const soldProperties = ref<any[]>([])
const soldPagination = ref({ page: 1, limit: 25, total: 0, pages: 1 })
const soldHeaders = [
  { title: 'Property', key: 'title' },
  { title: 'Price', key: 'price' },
  { title: 'Beds/Baths', key: 'bedsBaths' },
  { title: 'City', key: 'city' },
  { title: 'Status', key: 'status' },
  { title: 'Sold Date', key: 'soldDate' }
]

const estimates = ref<any[]>([])
const selectedEstimateId = ref<number | null>(null)

const subject = reactive({
  address: '',
  city: '',
  province: '',
  postalCode: '',
  beds: 0,
  baths: 0,
  sqft: 0,
  yearBuilt: 0,
  lotSize: '',
  condition: '',
  features: [] as string[]
})

const radiusKm = ref(5)
const comparables = ref<any[]>([])
const loadingComps = ref(false)
const compStats = ref({ count: 0, avgPrice: 0, minPrice: 0, maxPrice: 0 })

const estimateOptions = computed(() => {
  return estimates.value.map((e: any) => ({
    title: `${e.address} • ${e.firstName} ${e.lastName}`,
    value: e.id
  }))
})

const formatCurrency = (value: number) => {
  if (!value) return '0'
  return value.toLocaleString()
}

const formatDate = (value: string) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString()
}

const matchColor = (score: number) => {
  if (score >= 80) return 'success'
  if (score >= 50) return 'warning'
  return 'error'
}

const loadSold = async () => {
  loadingSold.value = true
  try {
    const query = new URLSearchParams({
      province: filters.province === 'All' ? '' : (filters.province || ''),
      city: filters.city || '',
      range: filters.range || 'last_90',
      startDate: filters.startDate || '',
      endDate: filters.endDate || '',
      limit: String(soldPagination.value.limit),
      page: String(soldPagination.value.page)
    })
    const response: any = await api.get(`/api/admin/cma/sold?${query.toString()}`)
    soldProperties.value = response.properties || []
    soldPagination.value = response.pagination || soldPagination.value
  } catch (error) {
    console.error('Failed to load sold properties:', error)
  } finally {
    loadingSold.value = false
  }
}

const updateSoldPage = (page: number) => {
  soldPagination.value.page = page
  loadSold()
}

watch(
  () => [filters.province, filters.city, filters.range, filters.startDate, filters.endDate],
  () => {
    soldPagination.value.page = 1
    loadSold()
  }
)

const loadEstimates = async () => {
  try {
    const response: any = await api.get('/api/admin/estimates?limit=20')
    estimates.value = response.estimates || []
  } catch (error) {
    console.error('Failed to load estimates:', error)
  }
}

const applyEstimate = () => {
  const estimate = estimates.value.find((e: any) => e.id === selectedEstimateId.value)
  if (!estimate) return
  subject.address = estimate.address || ''
  subject.city = estimate.city || subject.city
  subject.province = estimate.province || subject.province
  subject.postalCode = estimate.postalCode || ''
  subject.beds = estimate.beds || 0
  subject.baths = estimate.baths || 0
  subject.sqft = estimate.sqft || 0
  subject.yearBuilt = estimate.yearBuilt || 0
  subject.lotSize = estimate.lotSize || ''
  subject.condition = estimate.condition || ''
  subject.features = Array.isArray(estimate.features) ? estimate.features : []
}

const findComps = async () => {
  loadingComps.value = true
  try {
    const response: any = await api.post('/api/admin/cma/comps', {
      subject,
      filters: {
        province: filters.province || subject.province,
        city: filters.city || subject.city,
        range: filters.range,
        startDate: filters.startDate,
        endDate: filters.endDate,
        radiusKm: radiusKm.value,
        limit: 20
      }
    })
    comparables.value = response.comps || []
    compStats.value = response.stats || compStats.value
  } catch (error) {
    console.error('Failed to load comparables:', error)
  } finally {
    loadingComps.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadSold(), loadEstimates()])
})
</script>
