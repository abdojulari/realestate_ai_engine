<template>
  <v-container class="py-8">
    <div class="d-flex align-center flex-wrap mb-4">
      <h1 class="text-h5 me-4">All Properties</h1>
      <v-chip
        v-if="!loading"
        color="grey-lighten-3"
        text-color="grey-darken-3"
        size="small"
        class="me-4"
      >
        {{ totalProperties.toLocaleString() }} results
      </v-chip>
      <v-spacer />
      <v-text-field
        v-model="q"
        prepend-inner-icon="mdi-magnify"
        placeholder="Search address or city"
        hide-details
        density="compact"
        variant="outlined"
        style="max-width: 360px"
      />
    </div>

    <!-- Active filter chips -->
    <div v-if="activeFilterChips.length > 0" class="d-flex align-center flex-wrap ga-2 mb-4">
      <span class="text-body-2 text-grey">Filters:</span>
      <v-chip
        v-for="chip in activeFilterChips"
        :key="chip.key"
        color="primary"
        variant="tonal"
        size="small"
        closable
        @click:close="clearFilter(chip.key)"
      >
        {{ chip.label }}
      </v-chip>
      <v-btn
        v-if="activeFilterChips.length > 1"
        variant="text"
        color="grey"
        size="small"
        class="ms-2"
        @click="clearAllFilters"
      >
        Clear all
      </v-btn>
    </div>

    <!-- Inline refine bar (visible always so users can re-filter after landing here) -->
    <v-card variant="outlined" class="mb-6">
      <v-card-text class="py-3">
        <v-row dense align="center">
          <v-col cols="12" sm="6" md="3">
            <v-text-field
              v-model="refine.city"
              label="City / Location"
              prepend-inner-icon="mdi-map-marker-outline"
              hide-details
              density="compact"
              variant="outlined"
              clearable
              @keyup.enter="applyRefine"
              @click:clear="applyRefineNextTick"
            />
          </v-col>
          <v-col cols="6" sm="3" md="2">
            <v-select
              v-model="refine.type"
              :items="typeOptions"
              label="Type"
              hide-details
              density="compact"
              variant="outlined"
              clearable
              @update:model-value="applyRefine"
            />
          </v-col>
          <v-col cols="6" sm="3" md="2">
            <v-select
              v-model="refine.minPrice"
              :items="minPriceOptions"
              label="Min price"
              hide-details
              density="compact"
              variant="outlined"
              clearable
              @update:model-value="applyRefine"
            />
          </v-col>
          <v-col cols="6" sm="3" md="2">
            <v-select
              v-model="refine.maxPrice"
              :items="maxPriceOptions"
              label="Max price"
              hide-details
              density="compact"
              variant="outlined"
              clearable
              @update:model-value="applyRefine"
            />
          </v-col>
          <v-col cols="6" sm="3" md="1">
            <v-select
              v-model="refine.beds"
              :items="bedOptions"
              label="Beds"
              hide-details
              density="compact"
              variant="outlined"
              clearable
              @update:model-value="applyRefine"
            />
          </v-col>
          <v-col cols="6" sm="3" md="1">
            <v-select
              v-model="refine.baths"
              :items="bathOptions"
              label="Baths"
              hide-details
              density="compact"
              variant="outlined"
              clearable
              @update:model-value="applyRefine"
            />
          </v-col>
          <v-col cols="12" md="1" class="d-flex justify-end">
            <v-btn
              color="primary"
              variant="flat"
              size="small"
              prepend-icon="mdi-magnify"
              @click="applyRefine"
            >
              Search
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-row>
      <v-col
        v-for="property in filtered"
        :key="property.id"
        cols="12"
        sm="6"
        md="4"
      >
        <PropertyCard :property="property" @click="open(property)" />
       
      </v-col>
    </v-row>

    <EmptyState v-if="!loading && filtered.length === 0" title="No properties found" />

    <LoadingState v-if="loading" message="Loading properties..." />

    <!-- Pagination -->
    <div v-if="!loading && items.length > 0" class="d-flex justify-center align-center mt-8">
      <v-btn
        :disabled="currentPage <= 1"
        variant="outlined"
        @click="goToPage(currentPage - 1)"
        class="me-4"
      >
        Previous
      </v-btn>
      
      <span class="mx-4 text-body-1">
        Page {{ currentPage }} of {{ totalPages }}
      </span>
      
      <v-btn
        :disabled="currentPage >= totalPages"
        variant="outlined"
        @click="goToPage(currentPage + 1)"
        class="ms-4"
      >
        Next
      </v-btn>
    </div>
  </v-container>
  
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import PropertyCard from '~/components/common/PropertyCard.vue'
import EmptyState from '~/components/common/EmptyState.vue'

const { businessName } = useTenantSettings()
useSeoMeta({
  title: () => `Properties For Sale | ${businessName.value || 'Real Estate'}`,
  ogTitle: () => `Properties For Sale | ${businessName.value || 'Real Estate'}`,
  description: 'Browse homes and properties for sale. Filter by price, bedrooms, location, and more.',
  ogDescription: 'Browse homes and properties for sale. Filter by price, bedrooms, location, and more.',
})
import LoadingState from '~/components/common/LoadingState.vue'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const items = ref<any[]>([])
const q = ref('')
const currentPage = ref(1)
const totalPages = ref(1)
const totalProperties = ref(0)
const limit = 10

// Inline refine controls — seed from current URL, resync when URL changes.
const refine = ref({
  city: '',
  type: null as string | null,
  minPrice: null as number | null,
  maxPrice: null as number | null,
  beds: null as number | null,
  baths: null as number | null,
})

const typeOptions = [
  { title: 'House', value: 'house' },
  { title: 'Condo', value: 'condo' },
  { title: 'Townhouse', value: 'townhouse' },
  { title: 'Duplex', value: 'duplex' },
  { title: 'Land', value: 'land' },
  { title: 'Multi-family', value: 'multi-family' },
]

const PRICE_STEPS = [100_000, 200_000, 300_000, 400_000, 500_000, 600_000, 750_000, 1_000_000, 1_500_000, 2_000_000, 5_000_000]
const formatPrice = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M` : `$${(n / 1000).toFixed(0)}k`)
const minPriceOptions = PRICE_STEPS.map((v) => ({ title: formatPrice(v), value: v }))
const maxPriceOptions = PRICE_STEPS.map((v) => ({ title: formatPrice(v), value: v }))
const bedOptions = [1, 2, 3, 4, 5].map((v) => ({ title: `${v}+`, value: v }))
const bathOptions = [1, 2, 3, 4].map((v) => ({ title: `${v}+`, value: v }))

/** Read the current URL query into `refine` (so the controls stay in sync). */
function syncRefineFromRoute() {
  const qy = route.query
  const num = (v: unknown): number | null => {
    if (v == null) return null
    const n = parseFloat(String(v))
    return Number.isFinite(n) ? n : null
  }
  refine.value = {
    city: typeof qy.city === 'string' ? qy.city : (typeof qy.location === 'string' ? qy.location : ''),
    type: typeof qy.type === 'string' && qy.type ? qy.type : null,
    minPrice: num(qy.minPrice),
    maxPrice: num(qy.maxPrice),
    beds: num(qy.beds),
    baths: num(qy.baths),
  }
}

/** Push `refine` back into the URL (which triggers `loadProperties` via the route watcher). */
function applyRefine() {
  // Preserve any URL params we don't own (features, status, sortBy, etc.).
  const next: Record<string, string> = {}
  for (const [k, v] of Object.entries(route.query)) {
    if (v == null) continue
    if (['city', 'location', 'type', 'minPrice', 'maxPrice', 'beds', 'baths'].includes(k)) continue
    if (Array.isArray(v)) {
      // URLSearchParams-style: keep the first non-empty
      const first = v.find((x) => x != null && String(x) !== '')
      if (first != null) next[k] = String(first)
    } else if (String(v) !== '') {
      next[k] = String(v)
    }
  }
  if (refine.value.city && refine.value.city.trim()) next.city = refine.value.city.trim()
  if (refine.value.type) next.type = String(refine.value.type)
  if (refine.value.minPrice != null) next.minPrice = String(refine.value.minPrice)
  if (refine.value.maxPrice != null) next.maxPrice = String(refine.value.maxPrice)
  if (refine.value.beds != null) next.beds = String(refine.value.beds)
  if (refine.value.baths != null) next.baths = String(refine.value.baths)
  if (!next.status) next.status = 'for_sale'
  router.push({ path: '/properties', query: next })
}

function applyRefineNextTick() {
  nextTick(applyRefine)
}

/** Chips shown above the grid so users see what's active. */
const FILTER_LABELS: Record<string, (v: string) => string> = {
  city: (v) => `Location: ${v}`,
  location: (v) => `Location: ${v}`,
  type: (v) => `Type: ${v[0]!.toUpperCase() + v.slice(1)}`,
  minPrice: (v) => `Min: ${formatPrice(Number(v))}`,
  maxPrice: (v) => `Max: ${formatPrice(Number(v))}`,
  beds: (v) => `${v}+ beds`,
  baths: (v) => `${v}+ baths`,
  minSqft: (v) => `Min ${Number(v).toLocaleString()} sqft`,
  maxSqft: (v) => `Max ${Number(v).toLocaleString()} sqft`,
  features: (v) => v.split(',').map((f) => f.trim()).filter(Boolean).join(', ') || 'Features',
  status: (v) => `Status: ${v.replace('_', ' ')}`,
  subdivision: (v) => `Neighborhood: ${v}`,
  neighborhood: (v) => `Neighborhood: ${v}`,
}
const HIDDEN_CHIPS = new Set(['limit', 'page', 'sortBy', 'sortOrder', 'source', 'includeCrea', 'includeManual'])

const activeFilterChips = computed(() => {
  const chips: Array<{ key: string; label: string }> = []
  for (const [k, raw] of Object.entries(route.query)) {
    if (raw == null) continue
    if (HIDDEN_CHIPS.has(k)) continue
    // Hide the default status=for_sale badge so it isn't in every user's face
    if (k === 'status' && String(raw) === 'for_sale') continue
    const v = Array.isArray(raw) ? raw.filter(Boolean).join(',') : String(raw)
    if (!v) continue
    const label = (FILTER_LABELS[k] ?? ((val: string) => `${k}: ${val}`))(v)
    chips.push({ key: k, label })
  }
  return chips
})

function clearFilter(key: string) {
  const next: Record<string, string> = {}
  for (const [k, v] of Object.entries(route.query)) {
    if (k === key) continue
    if (v == null) continue
    if (Array.isArray(v)) {
      const first = v.find((x) => x != null && String(x) !== '')
      if (first != null) next[k] = String(first)
    } else if (String(v) !== '') {
      next[k] = String(v)
    }
  }
  // Sibling clear for location/city — treat them as one chip
  if (key === 'city') delete next.location
  if (key === 'location') delete next.city
  if (!next.status) next.status = 'for_sale'
  router.push({ path: '/properties', query: next })
}

function clearAllFilters() {
  router.push({ path: '/properties', query: { status: 'for_sale' } })
}

/** Forward route query to `/api/properties`, supporting repeated keys (arrays). */
function appendRouteQuery(searchParams: URLSearchParams, query: typeof route.query) {
  for (const key of Object.keys(query)) {
    if (key === 'limit' || key === 'page') continue
    const value = query[key]
    if (value === undefined || value === null) continue
    if (Array.isArray(value)) {
      for (const v of value) {
        if (v !== undefined && v !== null && String(v) !== '')
          searchParams.append(key, String(v))
      }
    } else if (String(value) !== '' && value !== 'undefined' && value !== 'null') {
      searchParams.append(key, String(value))
    }
  }
}

const loadProperties = async (page = 1) => {
  loading.value = true
  try {
    const searchParams = new URLSearchParams()
    searchParams.set('limit', String(limit))
    searchParams.set('page', String(page))
    appendRouteQuery(searchParams, route.query)
    // Consumer browse defaults to active MLS rows stored as `for_sale`
    if (!searchParams.has('status')) searchParams.set('status', 'for_sale')

    const response = await $fetch(`/api/properties?${searchParams.toString()}`) as any

    const { filterResidentialProperties } = await import('../../../utils/propertyFilters')

    if (Array.isArray(response)) {
      items.value = filterResidentialProperties(response)
      currentPage.value = page
      totalPages.value = 1
      totalProperties.value = response.length
    } else {
      const allProperties = response.properties || []
      items.value = filterResidentialProperties(allProperties)
      currentPage.value = response.pagination?.page || page
      totalPages.value = response.pagination?.totalPages || 1
      totalProperties.value = response.pagination?.total || 0
    }
  } finally {
    loading.value = false
  }
}

watch(
  () => route.fullPath,
  () => {
    syncRefineFromRoute()
    currentPage.value = 1
    void loadProperties(1)
  },
  { immediate: true }
)

const goToPage = async (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    await loadProperties(page)
  }
}

const filtered = computed(() => {
  const term = q.value.trim().toLowerCase()
  if (!term) return items.value
  return items.value.filter((p) =>
    `${p.title} ${p.address} ${p.city}`.toLowerCase().includes(term)
  )
})

function open(p: any) {
  navigateTo(`/property/${p.id}`)
}
</script>



