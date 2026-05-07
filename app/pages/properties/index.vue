<template>
  <v-container class="py-8">
    <div class="d-flex align-center mb-6">
      <h1 class="text-h5">All Properties</h1>
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
import { watch } from 'vue'
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

const loading = ref(false)
const items = ref<any[]>([])
const q = ref('')
const currentPage = ref(1)
const totalPages = ref(1)
const totalProperties = ref(0)
const limit = 10

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


