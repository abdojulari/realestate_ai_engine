<template>
  <div class="neighborhood-dropdown">
    <v-autocomplete
      v-model="selectedNeighborhood"
      :items="neighborhoods"
      :loading="loading"
      v-model:search="searchQuery"
      item-title="label"
      item-value="value"
      :label="label"
      :placeholder="placeholder"
      :clearable="clearable"
      :multiple="multiple"
      :chips="multiple"
      :closable-chips="multiple"
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
            <v-icon size="16" class="mr-2">mdi-home-group</v-icon>
          </template>
          <v-list-item-title>{{ item.raw.name }}</v-list-item-title>
          <v-list-item-subtitle>
            {{ item.raw.city }}, {{ item.raw.province }}
            <span v-if="item.raw.propertyCount" class="text-primary ml-1">
              ({{ item.raw.propertyCount }} properties)
            </span>
          </v-list-item-subtitle>
        </v-list-item>
      </template>

      <template #chip="{ props, item }">
        <v-chip
          v-bind="props"
          size="small"
          variant="outlined"
          :text="item.raw.name"
          closable
        />
      </template>

      <template #no-data>
        <v-list-item>
          <v-list-item-title class="text-gray-500">
            {{ searchQuery ? `No neighborhoods found matching "${searchQuery}"` : 'No neighborhoods available' }}
          </v-list-item-title>
          <v-list-item-subtitle v-if="props.cityFilter" class="text-xs">
            Try selecting a different city or clearing the city filter
          </v-list-item-subtitle>
        </v-list-item>
      </template>
    </v-autocomplete>

    <!-- Selected Neighborhood Info -->
    <div v-if="selectedNeighborhoodInfo && !multiple" class="mt-2 text-sm text-gray-600">
      <div class="flex items-center gap-2">
        <v-icon size="14">mdi-information-outline</v-icon>
        <span>
          {{ selectedNeighborhoodInfo.propertyCount }} properties, 
          <span v-if="selectedNeighborhoodInfo.averagePrice">
            avg. ${{ formatPrice(selectedNeighborhoodInfo.averagePrice) }}
          </span>
          <span v-else>price info pending</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Neighborhood {
  id: number
  name: string
  city: string
  province: string
  country: string
  propertyCount: number
  averagePrice?: number
  confidence?: number
}

interface NeighborhoodOption {
  label: string
  value: number
  name: string
  city: string
  province: string
  propertyCount: number
  averagePrice?: number
}

interface Props {
  modelValue?: number | number[] | null
  label?: string
  placeholder?: string
  clearable?: boolean
  multiple?: boolean
  inputClass?: string
  cityFilter?: string
  provinceFilter?: string
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Neighborhood',
  placeholder: 'Select a neighborhood...',
  clearable: true,
  multiple: false,
  inputClass: '',
  cityFilter: '',
  provinceFilter: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: number | number[] | null]
  'neighborhood-selected': [neighborhood: Neighborhood | null]
  'neighborhoods-selected': [neighborhoods: Neighborhood[]]
}>()

// Reactive data
const selectedNeighborhood = ref(props.modelValue)
const searchQuery = ref('')
const neighborhoods = ref<NeighborhoodOption[]>([])
const loading = ref(false)
const allNeighborhoods = ref<Neighborhood[]>([])

// Computed
const selectedNeighborhoodInfo = computed(() => {
  if (!selectedNeighborhood.value || props.multiple) return null
  return allNeighborhoods.value.find(n => n.id === selectedNeighborhood.value)
})

// Methods
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0
  }).format(price)
}

const fetchNeighborhoods = async (search = '') => {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (search.trim()) {
      params.append('search', search.trim())
    }
    if (props.cityFilter) {
      params.append('city', props.cityFilter)
    }
    if (props.provinceFilter) {
      params.append('province', props.provinceFilter)
    }
    params.append('orderBy', 'propertyCount')
    params.append('order', 'desc')
    params.append('limit', '100')

    const response = await $fetch<{
      neighborhoods: Neighborhood[]
      pagination: any
    }>(`/api/neighborhoods?${params.toString()}`)

    allNeighborhoods.value = response.neighborhoods
    
    neighborhoods.value = response.neighborhoods.map(neighborhood => ({
      label: `${neighborhood.name}, ${neighborhood.city} (${neighborhood.propertyCount} properties)`,
      value: neighborhood.id,
      name: neighborhood.name,
      city: neighborhood.city,
      province: neighborhood.province,
      propertyCount: neighborhood.propertyCount,
      averagePrice: neighborhood.averagePrice
    }))

  } catch (error) {
    console.error('Failed to fetch neighborhoods:', error)
    neighborhoods.value = []
  } finally {
    loading.value = false
  }
}

const onSelectionChange = (value: number | number[] | null) => {
  selectedNeighborhood.value = value
  emit('update:modelValue', value)

  if (props.multiple) {
    const selectedNeighborhoods = allNeighborhoods.value.filter(n => 
      Array.isArray(value) && value.includes(n.id)
    )
    emit('neighborhoods-selected', selectedNeighborhoods)
  } else {
    const selectedNeighborhoodData = value 
      ? allNeighborhoods.value.find(n => n.id === value) || null
      : null
    emit('neighborhood-selected', selectedNeighborhoodData)
  }
}

// Create a simple debounce function
const debounce = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout
  return (...args: any[]) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(null, args), delay)
  }
}

const debouncedFetchNeighborhoods = debounce((search: string) => {
  fetchNeighborhoods(search)
}, 300)

// Watch for external model value changes
watch(() => props.modelValue, (newValue) => {
  selectedNeighborhood.value = newValue
})

// Watch for search query changes
watch(searchQuery, (newSearch) => {
  debouncedFetchNeighborhoods(newSearch || '')
})

// Watch for filter changes
watch([() => props.cityFilter, () => props.provinceFilter], () => {
  fetchNeighborhoods(searchQuery.value)
})

// Initial load
onMounted(() => {
  fetchNeighborhoods()
})
</script>

<style scoped>
.neighborhood-dropdown {
  @apply w-full;
}

:deep(.v-select .v-field__input) {
  min-height: 40px;
}

:deep(.v-list-item-subtitle) {
  font-size: 0.75rem;
  opacity: 0.7;
}
</style>
