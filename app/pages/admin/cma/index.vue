<template>
  <FeatureGate :feature="FEATURES.CMA" :show-upgrade-prompt="true">
    <v-container fluid class="pa-6">
      <v-row class="mb-6">
        <v-col cols="12" md="8">
          <h1 class="text-h4 font-weight-bold">Comparative Market Analysis</h1>
          <p class="text-subtitle-2 text-medium-emphasis">
            Comprehensive CMA across sold, active, pending, expired, terminated and withdrawn listings &mdash; weighted by neighbourhood and status confidence.
          </p>
        </v-col>
      <v-col cols="12" md="4" class="d-flex justify-end align-center">
        <v-btn
          v-if="comparables.length > 0"
          color="success"
          variant="outlined"
          class="mr-2"
          @click="downloadReport"
          :loading="generatingReport"
        >
          <v-icon start>mdi-file-pdf-box</v-icon>
          Download PDF
        </v-btn>
        <v-btn
          v-if="comparables.length > 0"
          color="primary"
          @click="openSendDialog"
        >
          <v-icon start>mdi-email-send</v-icon>
          Send to Client
        </v-btn>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" lg="4">
        <v-card class="pa-4 mb-6" elevation="0">
          <div class="text-subtitle-1 font-weight-bold mb-4">Filters</div>
          <v-select 
            v-model="filters.province" 
            :items="provinceOptions" 
            label="Province" 
            variant="outlined" 
            density="compact"
          />
          <v-text-field 
            v-model="filters.city" 
            label="City" 
            variant="outlined" 
            class="mt-3" 
            density="compact"
          />
          <v-autocomplete
            v-model="filters.community"
            :items="availableCommunities"
            label="Neighbourhood / Community"
            variant="outlined"
            class="mt-3"
            density="compact"
            clearable
            hint="Essential for accurate comps &mdash; pulled from sold, active, pending, expired, terminated and withdrawn listings"
            persistent-hint
          />
          <v-select density="compact" v-model="filters.range" :items="dateRanges" label="Date Range" variant="outlined" class="mt-3" />
          <v-row v-if="filters.range === 'custom'" class="mt-1">
            <v-col cols="6">
              <v-text-field 
              v-model="filters.startDate" 
                type="date" label="Start" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="filters.endDate" type="date" label="End" 
              variant="outlined" density="compact" />
            </v-col>
          </v-row>
          <v-text-field 
            v-model.number="minMatchScore" 
            type="number" 
            label="Min Match Score (%)" 
            variant="outlined" 
            class="mt-3"
            min="0"
            max="100"
            density="compact"
          />
          <v-btn color="primary" class="mt-4" :loading="loadingSold" @click="loadSold">
            Load Properties
          </v-btn>
        </v-card>

        <v-card class="pa-4" elevation="0">
          <div class="text-subtitle-1 font-weight-bold mb-4">Subject Property</div>
          <v-select
            v-model="selectedEstimateId"
            :items="estimateOptions"
            label="Use Estimate Request"
            variant="outlined"
            density="compact"
            @update:model-value="applyEstimate"
          />
          <v-text-field density="compact" v-model="subject.address" label="Address" variant="outlined" class="mt-3" />
          <v-text-field density="compact" v-model="subject.city" label="City" variant="outlined" class="mt-3" />
          <v-autocomplete density="compact" v-model="subject.community" :items="availableCommunities" label="Neighbourhood" variant="outlined" class="mt-3" clearable />
          <v-text-field density="compact" v-model="subject.province" label="Province" variant="outlined" class="mt-3" />
          <v-row class="mt-1">
            <v-col cols="4">
              <v-text-field density="compact" v-model.number="subject.beds" type="number" label="Beds" variant="outlined" />
            </v-col>
            <v-col cols="4">
              <v-text-field density="compact" v-model.number="subject.baths" type="number" label="Baths" variant="outlined" />
            </v-col>
            <v-col cols="4">
              <v-text-field density="compact" v-model.number="subject.sqft" type="number" label="Sqft" variant="outlined" />
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
            density="compact"
          />
          <v-text-field density="compact" v-model.number="radiusKm" type="number" label="Radius (km)" variant="outlined" class="mt-3" />
          <v-btn color="primary" class="mt-4" :loading="loadingComps" @click="findComps">
            Find Comparables
          </v-btn>
        </v-card>
      </v-col>

      <v-col cols="12" lg="8" class="cma-tables-col">
        <v-card class="pa-4 mb-6 cma-sold-card" elevation="0">
          <div class="d-flex align-center justify-space-between mb-4 flex-wrap" style="gap: 8px;">
            <div class="text-subtitle-1 font-weight-bold">Comparable Market Activity</div>
            <div class="text-caption text-medium-emphasis">
              {{ soldPagination.total }} total &middot; sold, active, pending, expired, terminated &amp; withdrawn
            </div>
          </div>
          <!-- Status breakdown chips: shows the comprehensive mix at a glance.
               A "Sold-only" CMA is a quick view; the comprehensive one blends
               every sale-side status, and this chip row makes that visible. -->
          <div v-if="hasStatusBreakdown" class="d-flex flex-wrap mb-3" style="gap: 8px;">
            <v-chip
              v-for="(count, status) in soldStatusBreakdown"
              :key="status"
              :color="statusChipColor(String(status))"
              size="small"
              variant="tonal"
              v-show="count > 0"
            >
              {{ statusLabel(String(status)) }}: {{ count }}
            </v-chip>
          </div>
          <div class="cma-data-table-wrapper">
            <v-data-table
              :headers="soldHeaders"
              :items="soldProperties"
              :loading="loadingSold"
              :items-per-page="soldPagination.limit"
              :page="soldPagination.page"
              :items-length="soldPagination.total"
              class="elevation-0 cma-sold-table"
              height="400"
              fixed-header
              @update:page="updateSoldPage"
            >
            <template #item.status="{ item }">
              <v-chip :color="statusChipColor(item.status)" size="x-small" variant="tonal">
                {{ statusLabel(item.status) }}
              </v-chip>
            </template>
            <template #item.price="{ item }">
              <div class="d-flex flex-column">
                <span class="font-weight-medium">${{ formatCurrency(item.price) }}</span>
                <span
                  v-if="item.listingPrice && item.listingPrice !== item.price"
                  class="text-caption text-medium-emphasis"
                >
                  Listed: ${{ formatCurrency(item.listingPrice) }}
                </span>
              </div>
            </template>
            <template #item.bedsBaths="{ item }">
              {{ item.beds }} / {{ item.baths }}
            </template>
            <template #item.soldDate="{ item }">
              <div class="d-flex align-center" style="gap: 6px;">
                <span>{{ formatDate(item.soldDate) }}</span>
                <v-tooltip
                  v-if="item.soldDateSource && item.soldDateSource !== 'closeDate' && item.soldDateSource !== 'statusChangeTimestamp'"
                  location="top"
                >
                  <template #activator="{ props }">
                    <v-icon v-bind="props" size="14" color="warning">mdi-alert-circle-outline</v-icon>
                  </template>
                  <span>Inferred from {{ soldDateSourceLabel(item.soldDateSource) }} — exact status-change date unavailable.</span>
                </v-tooltip>
              </div>
            </template>
            <template #no-data>
              <div class="text-center py-6 text-medium-emphasis">
                No comparable market activity found for the current filters.
              </div>
            </template>
          </v-data-table>
          </div>
        </v-card>

        <!-- Valuation Summary Card -->
        <v-card v-if="compStats.estimatedValue" class="pa-4 mb-6 valuation-card" elevation="0">
          <div class="d-flex align-center justify-space-between mb-4">
            <div class="text-subtitle-1 font-weight-bold">
              Market Valuation
              <span v-if="fallbackInfo" class="text-caption text-warning font-weight-regular ml-2">
                (indicative — date range broadened to find activity)
              </span>
              <span v-else class="text-caption text-medium-emphasis font-weight-regular ml-2">
                (weighted by status confidence: sold &gt; pending &gt; active &gt; expired/terminated/withdrawn)
              </span>
            </div>
          </div>
          <v-row>
            <v-col cols="12" md="4">
              <div class="valuation-box text-center pa-6 rounded-lg">
                <div class="text-caption opacity-80">Estimated Value</div>
                <div class="text-h4 font-weight-bold">${{ formatCurrency(compStats.estimatedValue) }}</div>
                <div class="text-caption opacity-80 mt-2">
                  Range: ${{ formatCurrency(compStats.priceRange?.low) }} - ${{ formatCurrency(compStats.priceRange?.high) }}
                </div>
              </div>
            </v-col>
            <v-col cols="12" md="8">
              <v-row>
                <v-col cols="6" sm="3">
                  <div class="stat-box text-center rounded-lg">
                    <div class="stat-label">Comps</div>
                    <div class="stat-value">{{ compStats.count }}</div>
                  </div>
                </v-col>
                <v-col cols="6" sm="3">
                  <div class="stat-box text-center rounded-lg">
                    <div class="stat-label">Avg Price</div>
                    <div class="stat-value">${{ formatCompact(compStats.avgPrice) }}</div>
                  </div>
                </v-col>
                <v-col cols="6" sm="3">
                  <div class="stat-box text-center rounded-lg">
                    <div class="stat-label">Median</div>
                    <div class="stat-value">${{ formatCompact(compStats.medianPrice) }}</div>
                  </div>
                </v-col>
                <v-col cols="6" sm="3">
                  <div class="stat-box text-center rounded-lg">
                    <div class="stat-label">$/Sqft</div>
                    <div class="stat-value">${{ formatCurrency(compStats.avgPricePerSqft) }}</div>
                  </div>
                </v-col>
              </v-row>
            </v-col>
          </v-row>
        </v-card>

        <v-card class="pa-4 mb-6" elevation="0">
          <div class="d-flex align-center justify-space-between mb-4 flex-wrap" style="gap: 8px;">
            <div class="text-subtitle-1 font-weight-bold">
              Comparable Properties
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ compStats.count }} comps ({{ minMatchScore }}%+ match)
              <span v-if="compStats.neighbourhoodComps"> &middot; {{ compStats.neighbourhoodComps }} in neighbourhood</span>
            </div>
          </div>
          <!-- Comp-set status breakdown: shows the mix of sold/active/pending/
               expired/terminated/withdrawn that fed into the valuation. -->
          <div v-if="hasCompStatusBreakdown" class="d-flex flex-wrap mb-3" style="gap: 8px;">
            <v-chip
              v-for="(count, status) in compStatusBreakdown"
              :key="`comp-${status}`"
              :color="statusChipColor(String(status))"
              size="small"
              variant="tonal"
              v-show="count > 0"
            >
              {{ statusLabel(String(status)) }}: {{ count }}
            </v-chip>
          </div>
          <!-- Closed-comp fallback notice. Triggered when the server couldn't
               find any dated activity in the selected window and broadened to
               all available comparables regardless of date. -->
          <v-alert v-if="fallbackInfo" type="warning" variant="tonal" density="compact" class="mb-4" icon="mdi-information-outline">
            <div class="font-weight-medium">No recent activity in the selected date range</div>
            <div class="text-caption">
              No comparables matched
              <span v-if="filters.community">in <strong>{{ filters.community }}</strong> </span>
              within the selected date range. Showing all available comparables (sold, active, pending, expired, terminated, withdrawn) instead. Treat valuation as indicative.
            </div>
          </v-alert>
          <v-alert v-else-if="searchScope && filters.community" type="info" variant="tonal" density="compact" class="mb-4">
            <span v-if="searchScope === 'neighbourhood'">
              Showing comps from <strong>{{ filters.community }}</strong> neighbourhood &mdash; sold, active, pending, expired, terminated and withdrawn.
            </span>
            <span v-else>
              Not enough comps in <strong>{{ filters.community }}</strong> &mdash; expanded search to {{ radiusKm }}km radius.
            </span>
          </v-alert>
          <v-table>
            <thead>
              <tr>
                <th>Property</th>
                <th>Status</th>
                <th>Price</th>
                <th>Beds/Baths</th>
                <th>Sqft</th>
                <th>Match</th>
                <th>Distance</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loadingComps">
                <td colspan="7" class="text-center py-6">
                  <v-progress-circular indeterminate color="primary" />
                </td>
              </tr>
              <tr v-else-if="comparables.length === 0">
                <td colspan="7" class="text-center py-6 text-medium-emphasis">
                  No comparables found with {{ minMatchScore }}%+ match. Try adjusting the criteria.
                </td>
              </tr>
              <tr v-else v-for="comp in comparables" :key="comp.id">
                <td>
                  <div class="font-weight-medium">{{ comp.title || comp.address }}</div>
                  <div class="text-caption text-medium-emphasis">
                    {{ comp.city }}
                    <v-chip v-if="comp.inSameNeighbourhood" size="x-small" color="primary" variant="tonal" class="ml-1">
                      Same neighbourhood
                    </v-chip>
                  </div>
                  <div v-if="comp.cityRegion" class="text-caption text-medium-emphasis">{{ comp.cityRegion }}</div>
                </td>
                <td>
                  <v-chip :color="statusChipColor(comp.status)" size="x-small" variant="tonal">
                    {{ statusLabel(comp.status) }}
                  </v-chip>
                </td>
                <td>
                  <div class="font-weight-bold">${{ formatCurrency(comp.price) }}</div>
                  <div
                    v-if="comp.listingPrice && comp.listingPrice !== comp.price"
                    class="text-caption text-medium-emphasis"
                  >
                    Listed: ${{ formatCurrency(comp.listingPrice) }}
                  </div>
                  <div
                    v-if="comp.status === 'sold' && comp.listVsFinalDelta != null"
                    class="text-caption"
                    :class="comp.listVsFinalDelta >= 0 ? 'text-success' : 'text-error'"
                  >
                    {{ comp.listVsFinalDelta >= 0 ? '+' : '' }}{{ comp.listVsFinalDelta }}% vs list
                  </div>
                </td>
                <td>{{ comp.beds }} / {{ comp.baths }}</td>
                <td>{{ comp.sqft ? comp.sqft.toLocaleString() : '—' }}</td>
                <td>
                  <v-tooltip :text="getMatchTooltip(comp)">
                    <template v-slot:activator="{ props }">
                      <v-chip v-bind="props" :color="matchColor(comp.matchScore)" size="small" variant="flat">
                        {{ comp.matchScore }}%
                      </v-chip>
                    </template>
                  </v-tooltip>
                </td>
                <td>
                  <span v-if="comp.distanceKm != null">{{ comp.distanceKm.toFixed(1) }} km</span>
                  <span v-else class="text-medium-emphasis">—</span>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>

        <!-- Methodology Section -->
        <v-card v-if="methodology" class="pa-4" elevation="0">
          <div class="text-subtitle-1 font-weight-bold mb-4">Analysis Methodology</div>
          <v-alert type="info" variant="tonal" class="mb-4">
            <div class="font-weight-medium">{{ methodology.description }}</div>
          </v-alert>
          <div class="text-subtitle-2 mb-2">Matching Criteria:</div>
          <ul class="ml-4 mb-4">
            <li v-for="(criterion, idx) in methodology.matchCriteria" :key="idx" class="text-body-2">
              {{ criterion }}
            </li>
          </ul>
          <v-divider class="my-4" />
          <div class="text-caption text-medium-emphasis">
            <strong>Disclaimer:</strong> This analysis is based on comparable properties across multiple listing
            statuses (sold, active, pending, expired, terminated, withdrawn) and should not be considered an official
            appraisal. Expired, terminated and withdrawn listings reflect <em>unsold</em> asking prices and are
            weighted accordingly. Market conditions and property specifics may affect actual value.
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Send to Client Dialog -->
    <v-dialog v-model="showSendDialog" max-width="500">
      <v-card>
        <v-card-title>Send Report to Client</v-card-title>
        <v-card-text>
          <v-text-field density="compact"
            v-model="clientEmail"
            label="Client Email"
            type="email"
            variant="outlined"
            :rules="[v => !!v || 'Email is required', v => /.+@.+\..+/.test(v) || 'Invalid email']"
          />
          <v-text-field density="compact"
            v-model="clientName"
            label="Client Name"
            variant="outlined"
            class="mt-3"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showSendDialog = false">Cancel</v-btn>
          <v-btn 
            color="primary" 
            :loading="sendingReport" 
            :disabled="!clientEmail"
            @click="sendReport"
          >
            Send Report
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Success/Error Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
  </FeatureGate>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
// @ts-ignore
import { api } from '~/utils/api'
import FeatureGate from '~/components/FeatureGate.vue'
import { FEATURES } from '~/composables/useLicense'

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
  'Walkout Basement',
  'Double Garage',
  'Triple Garage',
  'Single Garage',
  'Parking Pad',
  'Central Air',
  'Fireplace',
  'Fence',
  'Solar',
  'Solar Panels',
  'Pool',
  'Waterfront',
  'City Views',
]

const availableCommunities = ref<string[]>([])

const loadCommunities = async () => {
  try {
    const params = new URLSearchParams()
    if (filters.province && filters.province !== 'All') params.set('province', filters.province)
    if (filters.city) params.set('city', filters.city)
    const data: any = await api.get(`/api/admin/cma/communities?${params.toString()}`)
    availableCommunities.value = data.communities || []
  } catch (e) {
    console.error('Failed to load communities:', e)
  }
}

const filters = reactive({
  province: 'Alberta',
  city: '',
  community: '',
  range: 'last_90',
  startDate: '',
  endDate: ''
})

const minMatchScore = ref(50)
const loadingSold = ref(false)
const soldProperties = ref<any[]>([])
const soldPagination = ref({ page: 1, limit: 10, total: 0, pages: 1 })
const soldStatusBreakdown = ref<Record<string, number>>({})
const hasStatusBreakdown = computed(() =>
  Object.values(soldStatusBreakdown.value).some(v => (v as number) > 0)
)
const soldHeaders = [
  { title: 'Property', key: 'title' },
  { title: 'Status', key: 'status' },
  { title: 'Price', key: 'price' },
  { title: 'Beds/Baths', key: 'bedsBaths' },
  { title: 'City', key: 'city' },
  { title: 'Community', key: 'cityRegion' },
  { title: 'Status Date', key: 'soldDate' }
]

// Status presentation helpers — single source of truth for status labels and
// chip colors across both tables and the report sender.
const STATUS_LABELS: Record<string, string> = {
  sold: 'Sold',
  for_sale: 'Active',
  pending: 'Pending',
  expired: 'Expired',
  terminated: 'Terminated',
  withdrawn: 'Withdrawn',
}
const STATUS_COLORS: Record<string, string> = {
  sold: 'success',
  pending: 'info',
  for_sale: 'warning',
  expired: 'error',
  terminated: 'grey',
  withdrawn: 'grey',
}
const statusLabel = (status: string) => STATUS_LABELS[status] || status || '—'
const statusChipColor = (status: string) => STATUS_COLORS[status] || 'default'

const estimates = ref<any[]>([])
const selectedEstimateId = ref<number | null>(null)

const subject = reactive({
  address: '',
  city: '',
  community: '',
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

const radiusKm = ref(1)
const comparables = ref<any[]>([])
const loadingComps = ref(false)
const searchScope = ref<string>('')
// Set when the server couldn't find dated activity in the requested window and
// had to broaden to all available comparables. Drives the "no recent activity"
// banner on the comparables panel.
const fallbackInfo = ref<null | { type: string; reason: string }>(null)
const compStats = ref<any>({
  count: 0,
  neighbourhoodComps: 0,
  avgPrice: 0,
  medianPrice: 0,
  weightedAvgPrice: 0,
  minPrice: 0,
  maxPrice: 0,
  avgPricePerSqft: 0,
  estimatedValue: 0,
  avgListVsFinalDelta: null as number | null,
  priceRange: { low: 0, high: 0 }
})
const methodology = ref<any>(null)
const compStatusBreakdown = ref<Record<string, number>>({})
const compStatusStats = ref<Record<string, { count: number; avgPrice: number; medianPrice: number }>>({})
const hasCompStatusBreakdown = computed(() =>
  Object.values(compStatusBreakdown.value).some(v => (v as number) > 0)
)

// Report/Email state
const generatingReport = ref(false)
const showSendDialog = ref(false)
const sendingReport = ref(false)
const clientEmail = ref('')
const clientName = ref('')
const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
})

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

// Format large numbers compactly (e.g., 1.2M, 530K)
const formatCompact = (value: number) => {
  if (!value) return '0'
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(0) + 'K'
  }
  return value.toLocaleString()
}

const formatDate = (value: string) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString()
}

// Human label for the sold-date provenance returned by /api/admin/cma/comps.
// Anything other than `closeDate` / `statusChangeTimestamp` is an inferred
// date and we surface a tooltip warning admins.
const soldDateSourceLabel = (src: string) => {
  switch (src) {
    case 'closeDate': return 'closing date'
    case 'statusChangeTimestamp': return 'status change'
    case 'pendingTimestamp': return 'pending date'
    case 'modificationTimestamp': return 'last MLS update'
    case 'updatedAt': return 'last sync'
    default: return src
  }
}

const matchColor = (score: number) => {
  if (score >= 70) return 'success'
  if (score >= 50) return 'warning'
  return 'error'
}

const getMatchTooltip = (comp: any) => {
  const parts = []
  if (comp.neighbourhoodScore !== undefined && filters.community) parts.push(`Neighbourhood: ${comp.neighbourhoodScore}%`)
  if (comp.featureScore !== undefined) parts.push(`Features: ${comp.featureScore}%`)
  if (comp.valueImpactScore !== undefined) parts.push(`Value Impact: ${comp.valueImpactScore}%`)
  if (comp.bedsScore !== undefined) parts.push(`Beds: ${comp.bedsScore}%`)
  if (comp.bathsScore !== undefined) parts.push(`Baths: ${comp.bathsScore}%`)
  if (comp.sqftScore !== undefined) parts.push(`Sqft: ${comp.sqftScore}%`)
  return parts.join(' | ') || `Match: ${comp.matchScore}%`
}

const loadSold = async () => {
  loadingSold.value = true
  try {
    const query = new URLSearchParams({
      province: filters.province === 'All' ? '' : (filters.province || ''),
      city: filters.city || '',
      community: filters.community || '',
      range: filters.range || 'last_90',
      startDate: filters.startDate || '',
      endDate: filters.endDate || '',
      limit: String(soldPagination.value.limit),
      page: String(soldPagination.value.page)
    })
    const response: any = await api.get(`/api/admin/cma/sold?${query.toString()}`)
    soldProperties.value = response.properties || []
    soldPagination.value = response.pagination || soldPagination.value
    soldStatusBreakdown.value = response.statusBreakdown || {}
  } catch (error) {
    console.error('Failed to load comparable market activity:', error)
  } finally {
    loadingSold.value = false
  }
}

const updateSoldPage = (page: number) => {
  soldPagination.value.page = page
  loadSold()
}

watch(
  () => [filters.province, filters.city, filters.community, filters.range, filters.startDate, filters.endDate],
  () => {
    soldPagination.value.page = 1
    loadSold()
  }
)

watch(
  () => [filters.province, filters.city],
  () => { loadCommunities() }
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
  // Pre-fill client info if available
  if (estimate.email) clientEmail.value = estimate.email
  if (estimate.firstName || estimate.lastName) {
    clientName.value = `${estimate.firstName || ''} ${estimate.lastName || ''}`.trim()
  }
}

const findComps = async () => {
  loadingComps.value = true
  try {
    const response: any = await api.post('/api/admin/cma/comps', {
      subject,
      filters: {
        province: filters.province || subject.province,
        city: filters.city || subject.city,
        community: filters.community || subject.community || '',
        range: filters.range,
        startDate: filters.startDate,
        endDate: filters.endDate,
        radiusKm: radiusKm.value,
        minMatchScore: minMatchScore.value,
        limit: 20
      }
    })
    comparables.value = response.comps || []
    compStats.value = response.stats || compStats.value
    methodology.value = response.methodology || null
    searchScope.value = response.searchScope || ''
    fallbackInfo.value = response.fallback || null
    compStatusBreakdown.value = response.statusBreakdown || {}
    compStatusStats.value = response.statusStats || {}
  } catch (error) {
    console.error('Failed to load comparables:', error)
  } finally {
    loadingComps.value = false
  }
}

const openSendDialog = () => {
  showSendDialog.value = true
}

const downloadReport = async () => {
  generatingReport.value = true
  try {
    const response: any = await api.post('/api/admin/cma/report', {
      subject,
      comps: comparables.value,
      stats: compStats.value,
      methodology: methodology.value,
      statusBreakdown: compStatusBreakdown.value,
      statusStats: compStatusStats.value,
      clientName: clientName.value,
      action: 'download'
    })
    
    if (response.reportHtml) {
      // Dynamically import html2pdf.js (client-side only)
      const html2pdf = (await import('html2pdf.js')).default
      
      // Create a temporary container for the HTML
      const container = document.createElement('div')
      container.innerHTML = response.reportHtml
      container.style.position = 'absolute'
      container.style.left = '-9999px'
      container.style.top = '0'
      document.body.appendChild(container)
      
      // Generate PDF
      const filename = `CMA-Report-${subject.address || 'Property'}-${new Date().toISOString().split('T')[0]}.pdf`
      
      await html2pdf()
        .set({
          margin: 0,
          filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        })
        .from(container)
        .save()
      
      // Clean up
      document.body.removeChild(container)
      
      snackbar.value = { show: true, message: 'PDF report downloaded successfully', color: 'success' }
    }
  } catch (error) {
    console.error('Failed to generate report:', error)
    snackbar.value = { show: true, message: 'Failed to generate report', color: 'error' }
  } finally {
    generatingReport.value = false
  }
}

const sendReport = async () => {
  if (!clientEmail.value) return
  
  sendingReport.value = true
  try {
    const response: any = await api.post('/api/admin/cma/report', {
      subject,
      comps: comparables.value,
      stats: compStats.value,
      methodology: methodology.value,
      statusBreakdown: compStatusBreakdown.value,
      statusStats: compStatusStats.value,
      clientEmail: clientEmail.value,
      clientName: clientName.value,
      action: 'send'
    })
    
    showSendDialog.value = false
    snackbar.value = { 
      show: true, 
      message: response.message || `Report sent to ${clientEmail.value}`, 
      color: 'success' 
    }
  } catch (error) {
    console.error('Failed to send report:', error)
    snackbar.value = { show: true, message: 'Failed to send report', color: 'error' }
  } finally {
    sendingReport.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadSold(), loadEstimates(), loadCommunities()])
})
</script>

<style scoped>
.valuation-box {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: white;
  height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.stat-box {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  height: 80px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 12px 8px;
}

.stat-label {
  font-size: 11px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a2e;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.valuation-card {
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
}

ul {
  list-style-type: disc;
}

/* CMA layout: prevent right-side cutoff and ensure table scrolls properly */
.cma-tables-col {
  min-width: 0; /* Allow flex shrink; prevents overflow from pushing content */
  overflow: visible;
}

.cma-data-table-wrapper {
  overflow-x: auto;
  overflow-y: visible;
}

.cma-sold-table {
  min-width: 600px;
}
</style>
