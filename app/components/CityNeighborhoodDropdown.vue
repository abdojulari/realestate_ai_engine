<template>
  <div class="city-neighborhood-dropdown">
    <v-autocomplete
      v-model="selectedValue"
      :items="allItems"
      :loading="loading"
      v-model:search="searchQuery"
      item-title="label"
      item-value="value"
      :label="label"
      :placeholder="placeholder"
      :clearable="clearable"
      variant="outlined"
      density="comfortable"
      hide-details="auto"
      :class="inputClass"
      @update:model-value="onSelectionChange"
    >
      <template #prepend-inner>
        <v-icon size="20" class="text-gray-500">
          mdi-map-marker-radius
        </v-icon>
      </template>
      
      <template #item="{ props, item }">
        <v-list-item v-bind="props">
          <template #prepend>
            <v-icon size="16" class="mr-2" :color="item.raw.type === 'city' ? 'primary' : 'success'">
              {{ item.raw.type === 'city' ? 'mdi-city' : 'mdi-home-group' }}
            </v-icon>
          </template>
          <v-list-item-title>{{ item.raw.name }}</v-list-item-title>
          <v-list-item-subtitle>
            <span v-if="item.raw.type === 'city'">
              {{ item.raw.propertyCount }} properties in city
            </span>
            <span v-else>
              {{ item.raw.city }}, {{ item.raw.province }} - {{ item.raw.propertyCount }} properties
            </span>
          </v-list-item-subtitle>
        </v-list-item>
      </template>

      <template #no-data>
        <v-list-item>
          <v-list-item-title class="text-gray-500">
            {{ searchQuery ? `No locations found matching "${searchQuery}"` : 'Start typing to search cities and neighborhoods...' }}
          </v-list-item-title>
        </v-list-item>
      </template>
    </v-autocomplete>

    <!-- Selected Location Info -->
    <div v-if="selectedInfo" class="mt-2 text-sm text-gray-600">
      <div class="flex items-center gap-2">
        <v-icon size="14">mdi-information-outline</v-icon>
        <span v-if="selectedInfo.type === 'city'">
          {{ selectedInfo.propertyCount.toLocaleString() }} properties in {{ selectedInfo.name }}
        </span>
        <span v-else>
          {{ selectedInfo.propertyCount }} properties in {{ selectedInfo.name }}, {{ selectedInfo.city }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue?: string | null
  label?: string
  placeholder?: string
  clearable?: boolean
  inputClass?: string
  prioritizeCities?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Location',
  placeholder: 'Search cities or neighborhoods...',
  clearable: true,
  inputClass: '',
  prioritizeCities: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
  'location-selected': [location: any]
}>()

// Reactive data
const selectedValue = ref(props.modelValue)
const searchQuery = ref('')
const allItems = ref<any[]>([])
const loading = ref(false)
const selectedInfo = ref<any>(null)

// Create a simple debounce function
const debounce = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout
  return (...args: any[]) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(null, args), delay)
  }
}

const debouncedFetchData = debounce((search: string) => {
  fetchData(search)
}, 300)

const fetchData = async (search = '') => {
  loading.value = true
  try {
    // Fetch both cities and neighborhoods
    const [cityResponse, neighborhoodResponse] = await Promise.all([
      $fetch<any>('/api/properties/city-stats'),
      $fetch<any>('/api/neighborhoods?limit=100' + (search ? `&search=${encodeURIComponent(search)}` : ''))
    ])

    const items: any[] = []
    
    // Add cities (filtered by search if provided)
    const cities = cityResponse.cities || []
    const filteredCities = search 
      ? cities.filter((city: any) => city.city.toLowerCase().includes(search.toLowerCase()))
      : cities.slice(0, 20) // Show top 20 cities if no search
    
    filteredCities.forEach((city: any) => {
      items.push({
        label: `${city.city} (${city.propertyCount.toLocaleString()} properties)`,
        value: `city:${city.city}`,
        name: city.city,
        propertyCount: city.propertyCount,
        type: 'city'
      })
    })
    
    // Add neighborhoods
    const neighborhoods = neighborhoodResponse.neighborhoods || []
    neighborhoods.forEach((neighborhood: any) => {
      items.push({
        label: `${neighborhood.name}, ${neighborhood.city} (${neighborhood.propertyCount} properties)`,
        value: `neighborhood:${neighborhood.id}`,
        name: neighborhood.name,
        city: neighborhood.city,
        province: neighborhood.province,
        propertyCount: neighborhood.propertyCount,
        type: 'neighborhood',
        id: neighborhood.id
      })
    })
    
    // Sort: neighborhoods first if prioritizing, otherwise by property count
    if (props.prioritizeCities) {
      items.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'city' ? -1 : 1
        }
        return b.propertyCount - a.propertyCount
      })
    } else {
      items.sort((a, b) => b.propertyCount - a.propertyCount)
    }
    
    allItems.value = items

  } catch (error) {
    console.error('Failed to fetch location data:', error)
    allItems.value = []
  } finally {
    loading.value = false
  }
}

const onSelectionChange = (value: string | null) => {
  selectedValue.value = value
  emit('update:modelValue', value)

  if (value) {
    const selectedItem = allItems.value.find(item => item.value === value)
    selectedInfo.value = selectedItem
    emit('location-selected', selectedItem)
  } else {
    selectedInfo.value = null
    emit('location-selected', null)
  }
}

// Watch for external model value changes
watch(() => props.modelValue, (newValue) => {
  selectedValue.value = newValue
})

// Watch for search query changes
watch(searchQuery, (newSearch) => {
  debouncedFetchData(newSearch || '')
})

// Initial load
onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.city-neighborhood-dropdown {
  @apply w-full;
}

:deep(.v-autocomplete .v-field__input) {
  min-height: 40px;
}

:deep(.v-list-item-subtitle) {
  font-size: 0.75rem;
  opacity: 0.7;
}
</style>
