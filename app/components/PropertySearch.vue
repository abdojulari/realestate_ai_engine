<template>
  <v-card
    :class="['property-search', expanded ? 'expanded' : '']"
    variant="outlined"
  >
    <v-card-text>
      <v-row dense>
        <v-col cols="12" sm="6" md="3">
          <v-text-field
            v-model="searchParams.location"
            label="Location"
            placeholder="City, Address, or Postal Code"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-map-marker"
            hide-details
            @update:model-value="handleLocationInput"
          />
          <!-- Location suggestions dropdown -->
          <v-list
            v-if="locationSuggestions.length && showSuggestions"
            class="location-suggestions"
            density="compact"
          >
            <v-list-item
              v-for="suggestion in locationSuggestions"
              :key="suggestion.id"
              :title="suggestion.description"
              @click="selectLocation(suggestion)"
            />
          </v-list>
        </v-col>

        <v-col cols="12" sm="6" md="3">
          <v-select
            v-model="searchParams.propertyType"
            :items="propertyTypes"
            label="Property Type"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-home"
            hide-details
          />
        </v-col>

        <v-col cols="12" sm="6" md="2">
          <v-select
            v-model="searchParams.minPrice"
            :items="priceRanges"
            label="Min Price"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-currency-usd"
            hide-details
          />
        </v-col>

        <v-col cols="12" sm="6" md="2">
          <v-select
            v-model="searchParams.maxPrice"
            :items="priceRanges"
            label="Max Price"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-currency-usd"
            hide-details
          />
        </v-col>

        <v-col cols="12" sm="6" md="2">
          <v-btn
            color="primary"
            variant="flat"
            @click="search"
          >
            Search
          </v-btn>
        </v-col>
      </v-row>

      <!-- Advanced filters -->
      <v-expand-transition>
        <div v-if="expanded">
          <v-divider class="my-4" />
          <v-row dense>
            <v-col cols="6" sm="3">
              <v-select
                v-model="searchParams.beds"
                :items="bedOptions"
                label="Beds"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-bed"
                hide-details
              />
            </v-col>

            <v-col cols="6" sm="3">
              <v-select
                v-model="searchParams.baths"
                :items="bathOptions"
                label="Baths"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-shower"
                hide-details
              />
            </v-col>

            <v-col cols="6" sm="3">
              <v-text-field
                v-model="searchParams.minSqft"
                label="Min Sqft"
                type="number"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-ruler-square"
                hide-details
              />
            </v-col>

            <v-col cols="6" sm="3">
              <v-text-field
                v-model="searchParams.maxSqft"
                label="Max Sqft"
                type="number"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-ruler-square"
                hide-details
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-select
                v-model="searchParams.features"
                :items="features"
                label="Features"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-star"
                multiple
                chips
                hide-details
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-select
                v-model="searchParams.yearBuilt"
                :items="yearBuiltOptions"
                label="Year Built"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-calendar"
                hide-details
              />
            </v-col>
          </v-row>
        </div>
      </v-expand-transition>
    </v-card-text>

    <v-card-actions>
      <v-spacer />
      <v-btn
        variant="text"
        @click="expanded = !expanded"
      >
        {{ expanded ? 'Less Filters' : 'More Filters' }}
        <v-icon :icon="expanded ? 'mdi-chevron-up' : 'mdi-chevron-down'" />
      </v-btn>
      <v-spacer />
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
const props = defineProps({
  elevation: {
    type: [Number, String],
    default: 2
  }
})

const emit = defineEmits(['search'])

const expanded = ref(false)
const showSuggestions = ref(false)
const locationSuggestions = ref([])

const searchParams = ref({
  location: '',
  propertyType: null,
  minPrice: null,
  maxPrice: null,
  beds: null,
  baths: null,
  minSqft: null,
  maxSqft: null,
  features: [],
  yearBuilt: null
})

const propertyTypes = [
  { title: 'Any Type', value: null },
  { title: 'House', value: 'house' },
  { title: 'Condo', value: 'condo' },
  { title: 'Townhouse', value: 'townhouse' },
  { title: 'Land', value: 'land' }
]

const priceRanges = [
  { title: 'No Min', value: null },
  { title: '$100,000', value: 100000 },
  { title: '$200,000', value: 200000 },
  { title: '$300,000', value: 300000 },
  { title: '$400,000', value: 400000 },
  { title: '$500,000', value: 500000 },
  { title: '$600,000', value: 600000 },
  { title: '$700,000', value: 700000 },
  { title: '$800,000', value: 800000 },
  { title: '$900,000', value: 900000 },
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

const features = [
  'Garage',
  'Pool',
  'Waterfront',
  'Central AC',
  'Fireplace',
  'Basement',
  'Smart Home',
  'Solar Panels'
]

const yearBuiltOptions = [
  { title: 'Any', value: null },
  { title: 'Last 5 years', value: 'last_5' },
  { title: '5-10 years', value: '5_10' },
  { title: '10-20 years', value: '10_20' },
  { title: '20+ years', value: '20_plus' }
]

const handleLocationInput = async (value: string) => {
  if (!value) {
    locationSuggestions.value = []
    showSuggestions.value = false
    return
  }

  try {
    // This would be replaced with actual API call
    const response = await fetch(`/api/locations/suggest?q=${value}`)
    const data = await response.json()
    locationSuggestions.value = data
    showSuggestions.value = true
  } catch (error) {
    console.error('Location suggestion error:', error)
  }
}

const selectLocation = (suggestion: any) => {
  searchParams.value.location = suggestion.description
  locationSuggestions.value = []
  showSuggestions.value = false
}

const search = () => {
  emit('search', searchParams.value)
}

// Close suggestions when clicking outside
onMounted(() => {
  document.addEventListener('click', (e) => {
    if (!e.target?.closest('.location-suggestions')) {
      showSuggestions.value = false
    }
  })
})
</script>

<style scoped>
.property-search {
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

.expanded {
  margin-bottom: 1rem;
}
</style>
