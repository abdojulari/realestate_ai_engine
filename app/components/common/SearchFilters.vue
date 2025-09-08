<template>
  <v-card class="search-filters">
    <v-card-text>
      <v-row dense>
        <!-- City Selection (Primary) -->
       
        <!-- Property Type -->
        <v-col cols="12" sm="6" :md="expanded ? 12 : 6">
          <v-select
            v-model="filters.propertyType"
            :items="propertyTypes"
            label="Property Type"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-home"
          />
        </v-col>

        <!-- Price Range -->
        <v-col cols="12" sm="6" :md="expanded ? 12 : 6">
          <v-select
            v-model="filters.minPrice"
            :items="priceRanges"
            label="Min Price"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-currency-usd"
            class="text-body-2"
          />
        </v-col>

        <v-col cols="12" sm="6" :md="expanded ? 12 : 6">
          <v-select
            v-model="filters.maxPrice"
            :items="priceRanges"
            label="Max Price"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-currency-usd"
          />
        </v-col>

        <!-- Advanced Filters -->
        <v-expand-transition>
          <div v-if="expanded">
            <v-col cols="12">
              <v-divider class="my-4" />
            </v-col>

            <!-- Beds & Baths -->
            <v-col cols="12">
              <v-select
                v-model="filters.beds"
                :items="bedOptions"
                label="Beds"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-bed"
                clearable
              />
            </v-col>

            <v-col cols="12">
              <v-select
                v-model="filters.baths"
                :items="bathOptions"
                label="Baths"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-shower"
                clearable
              />
            </v-col>

            <!-- Square Footage -->
            <v-col cols="12">
              <v-text-field
                v-model="filters.minSqft"
                label="Min Sqft"
                type="number"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-ruler-square"
                clearable
              />
            </v-col>

            <v-col cols="12">
              <v-text-field
                v-model="filters.maxSqft"
                label="Max Sqft"
                type="number"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-ruler-square"
                clearable
              />
            </v-col>

            <!-- Features -->
            <v-col cols="12">
              <v-combobox
                v-model="filters.features"
                :items="commonFeatures"
                label="Features"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-star"
                multiple
                chips
                closable-chips
                clearable
              />
            </v-col>

            <!-- Property Status -->
            <v-col cols="12">
              <v-select
                v-model="filters.status"
                :items="propertyStatuses"
                label="Status"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-home-search"
                clearable
              />
            </v-col>

            <!-- Sort By -->
            <v-col cols="12">
              <v-select
                v-model="filters.sortBy"
                :items="sortOptions"
                label="Sort By"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-sort"
                clearable
              />
            </v-col>
          </div>
        </v-expand-transition>
      </v-row>
    </v-card-text>

    <v-divider />

    <v-card-actions>
      <v-btn
        variant="outlined"
        density="compact"
        @click="clearFilters"
        class="text-body-2"
      >
        Clear All
      </v-btn>
      <v-spacer />
      <v-btn
        variant="outlined"
        density="compact"
        class="text-body-2"
        @click="expanded = !expanded"
      >
        {{ expanded ? 'Less Filters' : 'More Filters' }}
        <v-icon :icon="expanded ? 'mdi-chevron-up' : 'mdi-chevron-down'" />
      </v-btn>
      <v-spacer />
      <v-btn
        color="primary"
        density="compact"
        class="text-body-2"
        variant="outlined"
        @click="search"
      >
        Search
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { transformSearchFilters } from '../../../utils/transforms'

const props = defineProps<{
  initialFilters?: Record<string, any>
}>()

const emit = defineEmits(['search', 'update:filters'])

const expanded = ref(false)
const showSuggestions = ref(false)
const locationSuggestions = ref([])

const filters = ref({
  location: '',
  propertyType: null,
  minPrice: null,
  maxPrice: null,
  beds: null,
  baths: null,
  minSqft: null,
  maxSqft: null,
  features: [],
  status: null,
  sortBy: null,
  ...props.initialFilters
})

// Import property types from utility
import { getResidentialPropertyTypes } from '../../../utils/propertyFilters'
const propertyTypes = getResidentialPropertyTypes()

const priceRanges = [
  { title: 'No Min', value: null },
  { title: '$100,000', value: 100000 },
  { title: '$200,000', value: 200000 },
  { title: '$300,000', value: 300000 },
  { title: '$400,000', value: 400000 },
  { title: '$500,000', value: 500000 },
  { title: '$750,000', value: 750000 },
  { title: '$1M+', value: 1000000 }
]

const bedOptions = [
  { title: 'Any', value: null },
  { title: '1+', value: 1 },
  { title: '2+', value: 2 },
  { title: '3+', value: 3 },
  { title: '4+', value: 4 },
  { title: '5+', value: 5 }
]

const bathOptions = [
  { title: 'Any', value: null },
  { title: '1+', value: 1 },
  { title: '2+', value: 2 },
  { title: '3+', value: 3 },
  { title: '4+', value: 4 }
]

const commonFeatures = [
  'Garage',
  'Pool',
  'Waterfront',
  'Central AC',
  'Fireplace',
  'Basement',
  'Smart Home',
  'Solar Panels'
]

const propertyStatuses = [
  { title: 'Any Status', value: null },
  { title: 'For Sale', value: 'for_sale' },
  { title: 'For Rent', value: 'for_rent' },
  { title: 'New Construction', value: 'new' }
]

const sortOptions = [
  { title: 'Newest First', value: 'newest' },
  { title: 'Price (Low to High)', value: 'price_asc' },
  { title: 'Price (High to Low)', value: 'price_desc' },
  { title: 'Most Popular', value: 'popular' }
]

const handleLocationInput = async (value: string) => {
  if (!value) {
    locationSuggestions.value = []
    showSuggestions.value = false
    return
  }

  try {
    // Replace with actual API call
    const response = await fetch(`/api/locations/suggest?q=${value}`)
    const data = await response.json()
    locationSuggestions.value = data
    showSuggestions.value = true
  } catch (error) {
    console.error('Location suggestion error:', error)
  }
}

const selectLocation = (suggestion: any) => {
  filters.value.location = suggestion.description
  locationSuggestions.value = []
  showSuggestions.value = false
}

const clearFilters = () => {
  filters.value = {
    location: '',
    propertyType: null,
    minPrice: null,
    maxPrice: null,
    beds: null,
    baths: null,
    minSqft: null,
    maxSqft: null,
    features: [],
    status: null,
    sortBy: null
  }
}

const search = () => {
  console.log('🔍 SearchFilters: search button clicked') // Debug log
  console.log('📋 Raw filters:', filters.value) // Debug log
  const transformed = transformSearchFilters(filters.value)
  console.log('🔄 Transformed filters:', transformed) // Debug log
  emit('search', transformed)
}

// Watch for filter changes
watch(filters, (newFilters) => {
  emit('update:filters', transformSearchFilters(newFilters))
}, { deep: true })

// Close suggestions when clicking outside
onMounted(() => {
  document.addEventListener('click', (e) => {
    if (!e.target?.closest('.location-suggestions')) {
      showSuggestions.value = false
    }
  })
})

onUnmounted(() => {
  document.removeEventListener('click', () => {})
})
</script>

<style scoped>
.search-filters {
  position: relative;
  z-index: 1;
}

.location-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 2;
  background: white;
  border: 1px solid #ddd;
  border-top: none;
  border-radius: 0 0 4px 4px;
  max-height: 200px;
  overflow-y: auto;
}
</style>
