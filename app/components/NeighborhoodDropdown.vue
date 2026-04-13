<template>
  <div class="neighborhood-dropdown">
    <v-autocomplete
      v-model="internalSelection"
      :items="neighborhoods"
      :loading="loading"
      v-model:search="searchQuery"
      item-title="label"
      item-value="value"
      return-object
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

      <template #selection="{ item }">
        <span class="text-body-2">{{ item.raw?.name || '' }}</span>
      </template>

      <template #item="{ props, item }">
        <v-list-item v-bind="props">
          <template #prepend>
            <v-icon size="16" class="mr-2">mdi-home-group</v-icon>
          </template>
          <v-list-item-title>{{ item.raw.name }}</v-list-item-title>
          <v-list-item-subtitle>
            {{ item.raw.propertyCount }} properties
            <span v-if="item.raw.averagePrice" class="ml-1">
              &bull; Avg {{ formatPrice(item.raw.averagePrice) }}
            </span>
          </v-list-item-subtitle>
        </v-list-item>
      </template>

      <template #chip="{ props, item }">
        <v-chip
          v-bind="props"
          size="small"
          variant="outlined"
          :text="item.raw?.name || ''"
          closable
        />
      </template>

      <template #no-data>
        <v-list-item>
          <v-list-item-title class="text-gray-500">
            {{ loading ? 'Loading neighborhoods...' : !cityFilter ? 'Select a city first' : searchQuery ? `No neighborhoods found matching "${searchQuery}"` : 'No neighborhoods found for this city' }}
          </v-list-item-title>
          <v-list-item-subtitle class="text-xs">
            {{ loading ? '' : 'You can still search without selecting a neighborhood' }}
          </v-list-item-subtitle>
        </v-list-item>
      </template>
    </v-autocomplete>

    <!-- Selected Neighborhood Info -->
    <div v-if="selectedInfo && !multiple" class="mt-2 text-sm text-gray-600">
      <div class="flex items-center gap-2">
        <v-icon size="14">mdi-information-outline</v-icon>
        <span>
          {{ selectedInfo.propertyCount }} properties
          <span v-if="selectedInfo.averagePrice">
            &bull; avg. {{ formatPrice(selectedInfo.averagePrice) }}
          </span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface NeighborhoodItem {
  id: number
  name: string
  city: string
  propertyCount: number
  averagePrice?: number | null
  centerLatitude?: number | null
  centerLongitude?: number | null
}

interface NeighborhoodOption {
  label: string
  value: string
  name: string
  city: string
  propertyCount: number
  averagePrice?: number | null
}

interface Props {
  modelValue?: string | string[] | null
  label?: string
  placeholder?: string
  clearable?: boolean
  multiple?: boolean
  inputClass?: string
  cityFilter?: string
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Neighborhood',
  placeholder: 'All Areas',
  clearable: true,
  multiple: false,
  inputClass: '',
  cityFilter: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: string | string[] | null]
  'neighborhood-selected': [neighborhood: NeighborhoodItem | null]
  'neighborhoods-selected': [neighborhoods: NeighborhoodItem[]]
}>()

const internalSelection = ref<NeighborhoodOption | NeighborhoodOption[] | null>(null)
const searchQuery = ref('')
const neighborhoods = ref<NeighborhoodOption[]>([])
const allItems = ref<NeighborhoodItem[]>([])
const loading = ref(false)

const selectedInfo = computed(() => {
  if (props.multiple || !internalSelection.value || Array.isArray(internalSelection.value)) return null
  const sel = internalSelection.value as NeighborhoodOption
  return allItems.value.find(n => n.name === sel.name) || null
})

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0
  }).format(price)
}

const fetchNeighborhoods = async (search = '') => {
  if (!props.cityFilter) {
    neighborhoods.value = []
    allItems.value = []
    return
  }

  loading.value = true
  try {
    const params = new URLSearchParams({
      city: props.cityFilter,
    })
    if (search.trim()) {
      params.append('search', search.trim())
    }

    const response = await $fetch<{
      neighborhoods: NeighborhoodItem[]
      total: number
    }>(`/api/properties/neighborhoods?${params.toString()}`)

    allItems.value = response.neighborhoods

    neighborhoods.value = response.neighborhoods.map(n => ({
      label: `${n.name} (${n.propertyCount} properties)`,
      value: n.name,
      name: n.name,
      city: n.city,
      propertyCount: n.propertyCount,
      averagePrice: n.averagePrice
    }))
  } catch (error) {
    console.error('Failed to fetch neighborhoods:', error)
    neighborhoods.value = []
  } finally {
    loading.value = false
  }
}

const onSelectionChange = (value: NeighborhoodOption | NeighborhoodOption[] | null) => {
  internalSelection.value = value

  if (props.multiple) {
    const names = Array.isArray(value) ? value.map(v => v.name) : []
    emit('update:modelValue', names)
    const selected = allItems.value.filter(n => names.includes(n.name))
    emit('neighborhoods-selected', selected)
  } else {
    const sel = value as NeighborhoodOption | null
    const name = sel?.name ?? null
    emit('update:modelValue', name)
    const data = name ? allItems.value.find(n => n.name === name) || null : null
    emit('neighborhood-selected', data)
  }
}

const debounce = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout
  return (...args: any[]) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(null, args), delay)
  }
}

const debouncedFetch = debounce((search: string) => {
  fetchNeighborhoods(search)
}, 300)

watch(() => props.modelValue, (newValue) => {
  if (newValue == null) {
    internalSelection.value = null
    return
  }
  if (props.multiple && Array.isArray(newValue)) {
    internalSelection.value = neighborhoods.value.filter(n => (newValue as string[]).includes(n.name))
  } else if (!props.multiple && typeof newValue === 'string') {
    const match = neighborhoods.value.find(n => n.name === newValue)
    internalSelection.value = match || null
  }
})

watch(searchQuery, (newSearch) => {
  debouncedFetch(newSearch || '')
})

// When city changes, clear selection and reload neighborhoods for the new city
watch(() => props.cityFilter, (newCity, oldCity) => {
  if (newCity !== oldCity) {
    internalSelection.value = null
    emit('update:modelValue', null)
    emit('neighborhood-selected', null)
    fetchNeighborhoods('')
  }
})

onMounted(() => {
  if (props.cityFilter) {
    fetchNeighborhoods()
  }
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
