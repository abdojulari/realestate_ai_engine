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

const loading = ref(false)
const items = ref<any[]>([])
const q = ref('')
const currentPage = ref(1)
const totalPages = ref(1)
const totalProperties = ref(0)
const limit = 10

// Use property service composable for service worker integration
const { searchProperties, loading: serviceLoading } = usePropertyService()

const loadProperties = async (page = 1) => {
  loading.value = true
  try {
    // Get search parameters from URL query
    const route = useRoute()
    const queryParams = route.query
    
    console.log('🔍 Properties page URL query params:', queryParams) // Debug log
    
    // TEMPORARILY DISABLED: Try service worker first for better performance
    // The service worker is returning cached data without agent information
    // Force direct API calls until service worker cache is updated
    console.log('⚠️ Service worker temporarily disabled - using direct API calls for agent data')
    
    
    // Fallback to direct API call
    const searchParams = new URLSearchParams()
    searchParams.append('limit', limit.toString())
    searchParams.append('page', page.toString())
    
    // Add all non-empty query parameters
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value && value !== 'undefined' && value !== 'null' && key !== 'limit' && key !== 'page') {
        searchParams.append(key, String(value))
      }
    })
    
    const apiUrl = `/api/properties?${searchParams.toString()}`
    console.log('🔍 Fetching from API URL:', apiUrl) // Debug log
    
    const response = await $fetch(apiUrl) as any
    console.log('🔍 API Response type:', typeof response, Array.isArray(response))
    console.log('🔍 API Response keys:', Object.keys(response))
    console.log('🔍 API Response sample:', response.properties?.[0] || response[0]) // Debug the actual response
    
    const { filterResidentialProperties } = await import('../../../utils/propertyFilters')
    
    // Handle both old array format and new paginated format
    if (Array.isArray(response)) {
      // Old format - just an array
      items.value = filterResidentialProperties(response)
      currentPage.value = page
      totalPages.value = 1
      totalProperties.value = response.length
      console.log('🔍 After filtering (array format), first item agent:', items.value[0]?.listingAgent)
    } else {
      // New paginated format
      const allProperties = response.properties || []
      console.log('🔍 Properties array before filtering, first item agent:', allProperties[0]?.listingAgent)
      items.value = filterResidentialProperties(allProperties)
      currentPage.value = response.pagination?.page || page
      totalPages.value = response.pagination?.totalPages || 1
      totalProperties.value = response.pagination?.total || 0
      console.log('🔍 After filtering (paginated format), first item agent:', items.value[0]?.listingAgent)
    }
    
    console.log('✅ Found properties:', items.value.length, 'residential of', totalProperties.value, 'total') // Debug log
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadProperties(1)
})

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


