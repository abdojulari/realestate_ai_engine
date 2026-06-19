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
          <!-- Status filter: tap any chip to include/exclude that listing
               status. By default everything is selected (the comprehensive
               CMA view). Common presets at the bottom let agents one-click
               into a "Sold only" / "Active + Pending" view without ticking
               each chip individually. -->
          <div class="mt-4 mb-1 d-flex align-center justify-space-between">
            <div class="text-caption font-weight-medium">Listing Statuses</div>
            <div class="text-caption text-medium-emphasis">
              {{ filters.statuses.length }} / {{ COMPREHENSIVE_STATUSES.length }}
            </div>
          </div>
          <v-chip-group
            v-model="filters.statuses"
            multiple
            column
            selected-class="text-white"
          >
            <v-chip
              v-for="s in COMPREHENSIVE_STATUSES"
              :key="s"
              :value="s"
              :color="filters.statuses.includes(s) ? statusChipColor(s) : undefined"
              :variant="filters.statuses.includes(s) ? 'flat' : 'outlined'"
              size="small"
              filter
            >
              {{ statusLabel(s) }}
            </v-chip>
          </v-chip-group>
          <div class="d-flex flex-wrap mt-1 mb-1" style="gap: 4px;">
            <v-btn
              v-for="preset in statusPresets"
              :key="preset.key"
              size="x-small"
              variant="text"
              density="compact"
              :disabled="isPresetActive(preset.values)"
              @click="applyStatusPreset(preset.values)"
            >
              {{ preset.label }}
            </v-btn>
          </div>
          <div class="text-caption text-medium-emphasis mb-2">
            Deselect to narrow the comp universe. Empty = include all.
          </div>
          <v-text-field 
            v-model.number="minMatchScore" 
            type="number" 
            label="Match Highlight (%)" 
            variant="outlined" 
            class="mt-3"
            min="0"
            max="100"
            density="compact"
            hint="Highlights stronger comps &mdash; lower-scoring properties still appear below"
            persistent-hint
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
            hint="Compared one-to-one against each candidate property"
            persistent-hint
          />
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
              {{ soldPagination.total }} total &middot; {{ selectedStatusesCaption }}
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
            <!-- v-data-table-server lets us drive pagination from the API:
                 the previous v-data-table computed its footer from items.length,
                 which capped the view at the current page's 10 rows even when
                 the server reported 781 total. -->
            <v-data-table-server
              :headers="soldHeaders"
              :items="soldProperties"
              :loading="loadingSold"
              :items-per-page="soldPagination.limit"
              :items-per-page-options="[10, 25, 50, 100]"
              :page="soldPagination.page"
              :items-length="soldPagination.total"
              class="elevation-0 cma-sold-table cma-sold-table--clickable"
              height="400"
              fixed-header
              hover
              @update:page="updateSoldPage"
              @update:items-per-page="updateSoldLimit"
              @click:row="onRowClick"
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
          </v-data-table-server>
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
              {{ compStats.count }} comps
              <span v-if="aboveThresholdCount > 0">
                &middot; {{ aboveThresholdCount }} highlighted ({{ minMatchScore }}%+)
              </span>
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
              Showing every loaded comparable in <strong>{{ filters.community }}</strong> &mdash; sold, active, pending, expired, terminated and withdrawn. Each property is scored on a one-to-one feature match against the subject.
            </span>
            <span v-else>
              Showing city-wide comparables &mdash; <strong>{{ filters.community }}</strong> didn't produce any results, so the search broadened to the rest of {{ filters.city }}.
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
                  No comparable activity found. Try widening the date range or removing the community filter.
                </td>
              </tr>
              <tr v-else v-for="comp in comparables" :key="comp.id" :class="{ 'comp-below-threshold': comp.meetsMinMatch === false }">
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
                      <v-chip
                        v-bind="props"
                        :color="matchColor(comp.matchScore)"
                        size="small"
                        :variant="comp.meetsMinMatch === false ? 'outlined' : 'flat'"
                      >
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
import { useRouter } from 'vue-router'
// @ts-ignore
import { api } from '~/utils/api'
import FeatureGate from '~/components/FeatureGate.vue'
import { FEATURES } from '~/composables/useLicense'

definePageMeta({
  layout: 'admin',
  middleware: ['admin']
})

const router = useRouter()

// sessionStorage key for round-tripping CMA state when the user clicks a
// row to open a property detail page and then hits Back. Version-suffixed so
// that schema changes to the saved blob can be invalidated without users
// hitting "cannot read property X of undefined" the day we ship a change.
const CMA_STATE_KEY = 'cma:state:v1'

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

// Comprehensive comp universe — kept in lock-step with the server-side
// COMPREHENSIVE_STATUSES in sold.get.ts / comps.post.ts. If the backend gains
// a new status (e.g. 'coming_soon'), add it here too and to STATUS_LABELS
// below. Wire order is also the display order in the multiselect.
const COMPREHENSIVE_STATUSES = [
  'sold',
  'for_sale',
  'pending',
  'expired',
  'terminated',
  'withdrawn',
] as const

const filters = reactive({
  province: 'Alberta',
  city: '',
  community: '',
  range: 'last_90',
  startDate: '',
  endDate: '',
  // Default: every comprehensive status selected. Users can deselect to
  // narrow the universe (e.g. "Sold only" for a traditional CMA, or
  // "Active + Pending" to gauge current market depth). Empty array means
  // "all" on both endpoints — see parseStatusList in sold.get.ts and the
  // length check in comps.post.ts.
  statuses: [...COMPREHENSIVE_STATUSES] as string[],
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

// Common CMA presets — one-click shortcuts so agents don't have to tick
// individual chips for the most-asked views. `All` is intentionally first
// to make "reset the filter" a single click. Keep these ordered by frequency
// of use, not alphabetically.
const statusPresets: Array<{ key: string; label: string; values: string[] }> = [
  { key: 'all',          label: 'All',              values: [...COMPREHENSIVE_STATUSES] },
  { key: 'sold-only',    label: 'Sold only',        values: ['sold'] },
  { key: 'on-market',    label: 'Active + Pending', values: ['for_sale', 'pending'] },
  { key: 'closed',       label: 'Closed',           values: ['sold', 'expired', 'terminated', 'withdrawn'] },
  { key: 'unsold',       label: 'Unsold',           values: ['expired', 'terminated', 'withdrawn'] },
]

// A preset is "active" when the current selection matches it exactly, so
// we can disable the button (visual confirmation that this preset is the
// current state and clicking it would be a no-op).
function isPresetActive(values: string[]): boolean {
  if (filters.statuses.length !== values.length) return false
  const set = new Set(filters.statuses)
  return values.every((v) => set.has(v))
}

function applyStatusPreset(values: string[]) {
  filters.statuses = [...values]
}

// Drives the small caption above the activity table. We render:
//   - "all statuses"  when every status is selected (default view) OR when
//     the chip group is fully empty — both fall back to the comprehensive
//     universe on the server (see parseStatusList in sold.get.ts), so we
//     show the same caption either way to avoid misleading the user.
//   - "sold, active"  (the comma-joined human labels) when narrower.
const selectedStatusesCaption = computed(() => {
  const n = filters.statuses.length
  if (n === 0 || n === COMPREHENSIVE_STATUSES.length) return 'all statuses'
  return filters.statuses.map((s) => statusLabel(s).toLowerCase()).join(', ')
})

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

const comparables = ref<any[]>([])
const loadingComps = ref(false)
const searchScope = ref<string>('')
// Number of comps that scored at-or-above the user's match threshold. The
// remainder are still shown (sorted to the bottom) — threshold is a
// highlight, not a filter, since hard-cutting low-score comps was producing
// "0 results" against a fully-populated activity table.
const aboveThresholdCount = computed(() =>
  comparables.value.filter((c: any) => c.meetsMinMatch !== false).length
)
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
    // sold.get.ts reads a comma-separated `statuses` query param via
    // parseStatusList(). We omit it when the user has every status selected
    // (the server default) to keep URLs short and cacheable, but always
    // send it when narrower so the SQL `status IN (...)` clause matches the
    // user's current selection rather than the comprehensive default.
    if (
      filters.statuses.length > 0 &&
      filters.statuses.length < COMPREHENSIVE_STATUSES.length
    ) {
      query.set('statuses', filters.statuses.join(','))
    }
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

// `-1` is Vuetify's "All" sentinel from the items-per-page menu. We don't
// support unbounded fetches here (the comp universe can be thousands of
// rows), so cap at 100 and reset to page 1.
const updateSoldLimit = (limit: number) => {
  const next = limit && limit > 0 ? Math.min(limit, 100) : 10
  if (next === soldPagination.value.limit) return
  soldPagination.value.limit = next
  soldPagination.value.page = 1
  loadSold()
}

// Set to true while `restoreCmaState()` is replaying a saved snapshot.
// Vue batches the Object.assign writes into a single watcher invocation,
// so we flip this to true → mutate → let the (now-suppressed) watcher run
// → flip back to false. Without this the watcher would call loadSold() and
// blow away the snapshot's `soldProperties` with a fresh fetch on every
// "Back to CMA" navigation.
let suppressFilterWatcher = false

watch(
  () => [
    filters.province,
    filters.city,
    filters.community,
    filters.range,
    filters.startDate,
    filters.endDate,
    // Spread so the watcher fires on chip add/remove, not just on
    // identity changes — `filters.statuses` is mutated in place when the
    // chip group toggles and Vue's default shallow watch wouldn't see it.
    filters.statuses.join('|'),
  ],
  () => {
    if (suppressFilterWatcher) {
      suppressFilterWatcher = false
      return
    }
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
        // `radiusKm` was removed from the contract — the server now scopes
        // comps to the loaded activity universe (community / city + status
        // + date) and never gates by geographic radius.
        minMatchScore: minMatchScore.value,
        // comps.post.ts expects an array; an empty array OR omitting the
        // field both fall back to COMPREHENSIVE_STATUSES on the server side.
        // We always send the array so the two endpoints share a single
        // source of truth (the activity-table query and the comps query
        // must agree on the universe — see prior bug where Active rows
        // were silently dropped only from comps).
        statuses: filters.statuses,
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

// ── CMA state persistence ───────────────────────────────────────────────
// When the user clicks a row in the activity table we navigate to the
// property detail page. The browser keeps a history entry for /admin/cma
// but Vue Components re-`setup()` on every visit, so without a side store
// the filters/subject/comparables/pagination would reset to defaults on
// the way back. We snapshot the relevant state to sessionStorage right
// before navigating and restore it on mount.
//
// We deliberately persist the *results* (comparables, soldProperties,
// stats) alongside the *inputs* (filters, subject) so coming back to the
// page is instantaneous — no re-fetch flicker, no waiting on the API to
// re-rebuild what the user just left.
const saveCmaState = () => {
  if (typeof window === 'undefined') return
  try {
    const snapshot = {
      filters: { ...filters },
      subject: { ...subject },
      selectedEstimateId: selectedEstimateId.value,
      minMatchScore: minMatchScore.value,
      soldPagination: { ...soldPagination.value },
      soldProperties: soldProperties.value,
      soldStatusBreakdown: soldStatusBreakdown.value,
      comparables: comparables.value,
      compStats: compStats.value,
      methodology: methodology.value,
      searchScope: searchScope.value,
      fallbackInfo: fallbackInfo.value,
      compStatusBreakdown: compStatusBreakdown.value,
      compStatusStats: compStatusStats.value,
      clientEmail: clientEmail.value,
      clientName: clientName.value,
      // Used by the restore path to expire stale snapshots — if someone
      // returns to the CMA tab a week later we'd rather rerun fresh than
      // show wrong-looking comp counts.
      savedAt: Date.now(),
    }
    sessionStorage.setItem(CMA_STATE_KEY, JSON.stringify(snapshot))
  } catch (e) {
    // Quota errors are non-fatal; the page will just look fresh on the way back.
    console.warn('CMA state save failed', e)
  }
}

// Returns true when we successfully restored a snapshot, so callers can
// skip the default fetch in onMounted (avoids a flash of empty rows
// while loadSold() re-runs against the same filters).
const restoreCmaState = (): boolean => {
  if (typeof window === 'undefined') return false
  let raw: string | null = null
  try {
    raw = sessionStorage.getItem(CMA_STATE_KEY)
  } catch {
    return false
  }
  if (!raw) return false

  // Single-use snapshot: clear immediately so the next deep-link / fresh
  // load of /admin/cma doesn't surface stale results.
  try {
    sessionStorage.removeItem(CMA_STATE_KEY)
  } catch {
    // ignore — storage may be sandboxed
  }

  try {
    const saved = JSON.parse(raw) as Record<string, any>
    // 30-minute TTL — anything older is treated as "didn't restore" so we
    // refetch. Picked empirically: most agents click in and back within
    // a minute, but we don't want stale data 6 hours later.
    if (saved?.savedAt && Date.now() - saved.savedAt > 30 * 60 * 1000) {
      return false
    }

    // Tell the filter-watcher to skip its next scheduled invocation so the
    // restored snapshot's results aren't immediately blown away by a
    // refetch (see comment on `suppressFilterWatcher`).
    suppressFilterWatcher = true

    if (saved.filters) Object.assign(filters, saved.filters)
    if (saved.subject) Object.assign(subject, saved.subject)
    if (saved.selectedEstimateId !== undefined) selectedEstimateId.value = saved.selectedEstimateId
    if (typeof saved.minMatchScore === 'number') minMatchScore.value = saved.minMatchScore
    if (saved.soldPagination) soldPagination.value = { ...soldPagination.value, ...saved.soldPagination }
    if (Array.isArray(saved.soldProperties)) soldProperties.value = saved.soldProperties
    if (saved.soldStatusBreakdown) soldStatusBreakdown.value = saved.soldStatusBreakdown
    if (Array.isArray(saved.comparables)) comparables.value = saved.comparables
    if (saved.compStats) compStats.value = saved.compStats
    if (saved.methodology !== undefined) methodology.value = saved.methodology
    if (typeof saved.searchScope === 'string') searchScope.value = saved.searchScope
    if (saved.fallbackInfo !== undefined) fallbackInfo.value = saved.fallbackInfo
    if (saved.compStatusBreakdown) compStatusBreakdown.value = saved.compStatusBreakdown
    if (saved.compStatusStats) compStatusStats.value = saved.compStatusStats
    if (typeof saved.clientEmail === 'string') clientEmail.value = saved.clientEmail
    if (typeof saved.clientName === 'string') clientName.value = saved.clientName

    return true
  } catch (e) {
    console.warn('CMA state restore failed', e)
    return false
  }
}

// Vuetify 3's `@click:row` signature varies between versions; the second
// argument can be either the raw item or `{ item, internalItem, …}`. We
// defensively look at both shapes so a Vuetify minor bump doesn't quietly
// break navigation.
const onRowClick = (_event: Event, payload: any) => {
  const item = payload?.item?.raw ?? payload?.item ?? payload
  const id = item?.id ?? item?.propertyId
  if (!id) return
  saveCmaState()
  router.push({
    path: `/admin/properties/${id}`,
    query: { from: 'cma' },
  })
}

// Width (in CSS pixels) we render the off-screen report at before handing
// it to html2canvas. Must match the report's `.container { max-width: 800px }`
// so the rasterized output isn't shrink-fit narrower than the design width.
const REPORT_RENDER_WIDTH = 800

const downloadReport = async () => {
  generatingReport.value = true
  // Hoist the iframe ref outside the try so the finally block can always
  // clean up. Earlier we used a bare <div> with innerHTML which leaked styles
  // into the host page (Vuetify) and made html2canvas capture a blank region.
  let iframe: HTMLIFrameElement | null = null
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

    if (!response.reportHtml) {
      throw new Error('Server did not return reportHtml')
    }

    // Dynamic client-side-only imports keep these heavy libs out of the SSR
    // bundle. html2canvas rasterizes a DOM node; jsPDF assembles the canvas
    // image into a multi-page PDF.
    const html2canvas = (await import('html2canvas')).default
    const { jsPDF } = await import('jspdf')

    // ── Why an iframe instead of a <div> with innerHTML ─────────────────
    // The server returns a full HTML document (<!DOCTYPE html><html><head>
    // <style>…</style></head><body>…</body></html>). Injecting that into a
    // host-page <div> via innerHTML has two failure modes we hit in prod:
    //
    //   1. The report's reset rule (`* { margin: 0; padding: 0; box-sizing:
    //      border-box; }`) leaks out and clobbers Vuetify's tooltip / menu
    //      layout while the PDF is generating.
    //   2. More importantly — Vuetify's stylesheet wins specificity battles
    //      against the report's `.container { max-width: 800px }`, so the
    //      visible rendering inside the host page is collapsed to ~0 width.
    //      html2canvas then captures that collapsed region and the saved
    //      PDF comes out blank, which is what users were reporting.
    //
    // Rendering inside an iframe gives the report its own document context:
    // a real <html>/<head>/<body> with the report's <style> scoped to just
    // that document. No cross-talk with Vuetify, layout resolves at the
    // exact design width we set, and html2canvas captures a properly-sized
    // body element.
    iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.top = '0'
    iframe.style.left = '0'
    iframe.style.width = `${REPORT_RENDER_WIDTH}px`
    iframe.style.height = '0' // will grow to body.scrollHeight below
    iframe.style.border = '0'
    iframe.style.visibility = 'hidden' // hidden but still painted (display:none would skip layout)
    iframe.style.pointerEvents = 'none'
    iframe.style.zIndex = '-9999'
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentDocument
    if (!iframeDoc) {
      throw new Error('Failed to access iframe document')
    }
    iframeDoc.open()
    iframeDoc.write(response.reportHtml)
    iframeDoc.close()

    // Wait for the iframe's document to finish parsing + initial paint, then
    // additionally wait for every <img> inside it to finish loading.
    await new Promise<void>((resolve) => {
      if (iframeDoc.readyState === 'complete') {
        resolve()
        return
      }
      const onReady = () => {
        if (iframeDoc.readyState === 'complete') {
          iframeDoc.removeEventListener('readystatechange', onReady)
          resolve()
        }
      }
      iframeDoc.addEventListener('readystatechange', onReady)
      // Hard cap so a broken external image can't hang the PDF flow forever.
      setTimeout(resolve, 3000)
    })

    const images = Array.from(iframeDoc.images || [])
    if (images.length > 0) {
      await Promise.all(
        images.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete && img.naturalWidth > 0) {
                resolve()
                return
              }
              img.addEventListener('load', () => resolve(), { once: true })
              img.addEventListener('error', () => resolve(), { once: true }) // don't block on broken images
              // Per-image hard cap.
              setTimeout(resolve, 2000)
            })
        )
      )
    }

    // Grow the iframe to fit the entire rendered body so html2canvas can
    // capture all of it in one pass. Without this, the captured canvas would
    // be cropped to the iframe's initial 0px height.
    const target = iframeDoc.body
    const contentHeight = Math.max(target.scrollHeight, iframeDoc.documentElement.scrollHeight)
    iframe.style.height = `${contentHeight}px`
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

    // Rasterize the iframe's body into a single tall canvas. scale:2 gives
    // us roughly 192 DPI, which is plenty crisp for printing and emailing.
    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: REPORT_RENDER_WIDTH,
      height: contentHeight,
      windowWidth: REPORT_RENDER_WIDTH,
      windowHeight: contentHeight,
      scrollX: 0,
      scrollY: 0,
    })

    if (!canvas.width || !canvas.height) {
      throw new Error(`html2canvas captured an empty canvas (${canvas.width}x${canvas.height})`)
    }

    // ── Canvas → multi-page PDF ─────────────────────────────────────────
    // We scale the canvas to fit A4 width (210mm) and walk the canvas top-
    // to-bottom in A4-page-height increments, painting the same full-height
    // image at progressively negative Y offsets on each page. This is the
    // standard html2canvas→jsPDF pagination idiom — it keeps text crisp at
    // page boundaries without re-running the (expensive) html2canvas pass.
    const pdf = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
      compress: true,
    })
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = pdfWidth
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    const imgData = canvas.toDataURL('image/jpeg', 0.95)

    let heightLeft = imgHeight
    let position = 0
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
    heightLeft -= pdfHeight

    while (heightLeft > 0) {
      position = heightLeft - imgHeight // negative offset slides the image up
      pdf.addPage()
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
      heightLeft -= pdfHeight
    }

    const filename = `CMA-Report-${subject.address || 'Property'}-${new Date().toISOString().split('T')[0]}.pdf`
    pdf.save(filename)

    snackbar.value = { show: true, message: 'PDF report downloaded successfully', color: 'success' }
  } catch (error) {
    console.error('Failed to generate report:', error)
    snackbar.value = { show: true, message: 'Failed to generate report', color: 'error' }
  } finally {
    if (iframe && iframe.parentNode) {
      iframe.parentNode.removeChild(iframe)
    }
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
  // If the user is coming back from a property detail page (clicked a row
  // in the activity table), restore the previous filters / comparables /
  // pagination so the page looks exactly like they left it. We still load
  // estimates and communities because those are reference data that drive
  // the dropdowns rather than results the user produced.
  const restored = restoreCmaState()
  if (restored) {
    await Promise.all([loadEstimates(), loadCommunities()])
  } else {
    await Promise.all([loadSold(), loadEstimates(), loadCommunities()])
  }
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

/* Rows in the Comparable Market Activity table are clickable — they
   navigate to /admin/properties/{id}?from=cma. Give the user a clear
   pointer cursor + a subtle row-hover tint so the click affordance is
   obvious and doesn't get lost in the existing Vuetify hover behavior. */
.cma-sold-table--clickable :deep(tbody tr) {
  cursor: pointer;
  transition: background-color 120ms ease;
}
.cma-sold-table--clickable :deep(tbody tr:hover) {
  background-color: rgba(25, 118, 210, 0.06);
}

/* Comps that fell below the user's "Match Highlight" threshold are kept in
   the table but rendered muted so the eye lands on the strong matches first.
   Threshold = highlight, not a filter (see comps.post.ts). */
.comp-below-threshold td {
  opacity: 0.62;
}
.comp-below-threshold:hover td {
  opacity: 0.92;
}
</style>
