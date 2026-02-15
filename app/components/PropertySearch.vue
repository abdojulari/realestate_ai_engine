<template>
  <div :class="['premium-search-wrapper', { 'is-expanded': expanded }]">
    <v-card class="search-glass-card" elevation="0">
      <v-card-text class="pa-0">
        <!-- Primary Search Row -->
        <div class="search-main-row">
          <div class="search-field-group location-group">
            <v-icon icon="mdi-map-marker-outline" class="field-icon" />
            <div class="field-content">
              <label>Location</label>
              <input 
                v-model="searchParams.location"
                placeholder="Where to?"
                @input="handleLocationInput(($event.target as HTMLInputElement)?.value ?? '')"
                @focus="showSuggestions = true"
              />
            </div>
            
            <!-- Floating Suggestions -->
            <transition name="fade-slide">
              <div v-if="locationSuggestions.length && showSuggestions" class="premium-suggestions">
                <div 
                  v-for="suggestion in locationSuggestions" 
                  :key="suggestion.id"
                  class="suggestion-item"
                  @click="selectLocation(suggestion)"
                >
                  <v-icon icon="mdi-map-marker-radius-outline" size="small" />
                  <span>{{ suggestion.description }}</span>
                </div>
              </div>
            </transition>
          </div>

          <div class="field-divider"></div>

          <div class="search-field-group">
            <v-icon icon="mdi-home-outline" class="field-icon" />
            <div class="field-content">
              <label>Type</label>
              <select v-model="searchParams.propertyType">
                <option v-for="item in propertyTypes" :key="(item.value as any)" :value="item.value">
                  {{ item.title }}
                </option>
              </select>
            </div>
          </div>

          <div class="field-divider"></div>

          <div class="search-field-group">
            <v-icon icon="mdi-currency-usd" class="field-icon" />
            <div class="field-content">
              <label>Price Range</label>
              <div class="dual-inputs">
                <select v-model="searchParams.minPrice" class="mini-select">
                  <option :value="null">Min</option>
                  <option v-for="p in priceRanges.filter(x => x.value !== null)" :key="p.value" :value="p.value">
                    {{ p.title }}
                  </option>
                </select>
                <span class="sep">-</span>
                <select v-model="searchParams.maxPrice" class="mini-select">
                  <option :value="null">Max</option>
                  <option v-for="p in priceRanges.filter(x => x.value !== null)" :key="p.value" :value="p.value">
                    {{ p.title }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div class="search-actions">
            <button class="filter-toggle" @click="expanded = !expanded" :class="{ active: expanded }">
              <v-icon :icon="expanded ? 'mdi-tune-vertical' : 'mdi-tune'" />
              <span>Filters</span>
            </button>
            <v-btn
              color="grey-darken-4"
              class="premium-search-btn"
              height="56"
              width="56"
              icon
              elevation="4"
              @click="search"
            >
              <v-icon icon="mdi-magnify" size="28" />
            </v-btn>
          </div>
        </div>

        <!-- Advanced Filters Expand -->
        <v-expand-transition>
          <div v-if="expanded" class="advanced-filters-panel">
            <div class="filters-grid">
              <div class="filter-cell">
                <label>Bedrooms</label>
                <div class="chip-group">
                  <button 
                    v-for="opt in bedOptions" 
                    :key="(opt.value as any)"
                    :class="{ active: searchParams.beds === opt.value }"
                    @click="searchParams.beds = opt.value as any"
                  >
                    {{ opt.title }}
                  </button>
                </div>
              </div>

              <div class="filter-cell">
                <label>Bathrooms</label>
                <div class="chip-group">
                  <button 
                    v-for="opt in bathOptions" 
                    :key="(opt.value as any)"
                    :class="{ active: searchParams.baths === opt.value }"
                    @click="searchParams.baths = opt.value as any"
                  >
                    {{ opt.title }}
                  </button>
                </div>
              </div>

              <div class="filter-cell">
                <label>Square Footage</label>
                <div class="range-row">
                  <input type="number" v-model="searchParams.minSqft" placeholder="Min sqft" />
                  <input type="number" v-model="searchParams.maxSqft" placeholder="Max sqft" />
                </div>
              </div>

              <div class="filter-cell full-width">
                <label>Amenities & Features</label>
                <div class="features-wrap">
                  <v-chip
                    v-for="feature in features"
                    :key="feature"
                    :selected="searchParams.features.includes(feature)"
                    filter
                    variant="outlined"
                    class="ma-1 premium-chip"
                    @click="toggleFeature(feature)"
                  >
                    {{ feature }}
                  </v-chip>
                </div>
              </div>
            </div>
          </div>
        </v-expand-transition>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps({
  elevation: { type: [Number, String], default: 2 }
})

const emit = defineEmits(['search'])

const expanded = ref(false)
const showSuggestions = ref(false)
const locationSuggestions = ref<Array<{id: string, description: string}>>([])

const searchParams = ref({
  location: '',
  selectedLocation: null,
  propertyType: null,
  minPrice: null,
  maxPrice: null,
  beds: null,
  baths: null,
  minSqft: null,
  maxSqft: null,
  features: [] as string[],
  yearBuilt: null
})

const propertyTypes = [
  { title: 'Any Property', value: null },
  { title: 'Modern House', value: 'house' },
  { title: 'Luxury Condo', value: 'condo' },
  { title: 'Townhouse', value: 'townhouse' },
  { title: 'Estate Land', value: 'land' }
]

const priceRanges = [
  { title: 'No Min', value: null },
  { title: '$200k', value: 200000 },
  { title: '$400k', value: 400000 },
  { title: '$600k', value: 600000 },
  { title: '$800k', value: 800000 },
  { title: '$1M', value: 1000000 },
  { title: '$2M', value: 2000000 },
  { title: '$5M+', value: 5000000 }
]

const bedOptions = [
  { title: 'Any', value: null },
  { title: '1+', value: 1 },
  { title: '2+', value: 2 },
  { title: '3+', value: 3 },
  { title: '4+', value: 4 }
]

const bathOptions = [
  { title: 'Any', value: null },
  { title: '1+', value: 1 },
  { title: '2+', value: 2 },
  { title: '3+', value: 3 }
]

const features = ['Garage', 'Pool', 'Waterfront', 'Central AC', 'Fireplace', 'Smart Home', 'Wine Cellar', 'Home Gym']

const handleLocationInput = async (value: string) => {
  if (!value) {
    locationSuggestions.value = []
    showSuggestions.value = false
    return
  }
  try {
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
  showSuggestions.value = false
}

const toggleFeature = (feature: string) => {
  const index = searchParams.value.features.indexOf(feature)
  if (index === -1) searchParams.value.features.push(feature)
  else searchParams.value.features.splice(index, 1)
}

const search = () => {
  const transformedParams = {
    location: searchParams.value.location,
    propertyType: searchParams.value.propertyType || undefined,
    minPrice: searchParams.value.minPrice || undefined,
    maxPrice: searchParams.value.maxPrice || undefined,
    beds: searchParams.value.beds || undefined,
    baths: searchParams.value.baths || undefined,
    features: searchParams.value.features
  }
  emit('search', transformedParams)
}

onMounted(() => {
  document.addEventListener('click', (e: any) => {
    if (!e.target?.closest('.location-group')) showSuggestions.value = false
  })
})
</script>

<style scoped>
.premium-search-wrapper {
  max-width: 1100px;
  margin: 0 auto;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.search-glass-card {
  background: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.05) !important;
  border-radius: 24px !important;
  overflow: visible !important;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15) !important;
}

.search-main-row {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  gap: 8px;
}

.search-field-group {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 8px 16px;
  gap: 12px;
  border-radius: 16px;
  transition: background 0.3s ease;
  position: relative;
}

.search-field-group:hover {
  background: rgba(0, 0, 0, 0.02);
}

.field-icon {
  color: #64748b;
  font-size: 24px;
}

.field-content {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.field-content label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
  margin-bottom: 2px;
}

.field-content input, 
.field-content select {
  border: none;
  background: transparent;
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  width: 100%;
  outline: none;
}

.field-content input::placeholder {
  color: #cbd5e1;
  font-weight: 400;
}

.field-divider {
  width: 1px;
  height: 40px;
  background: #f1f5f9;
}

.dual-inputs {
  display: flex;
  align-items: center;
  gap: 4px;
}

.mini-select {
  width: auto !important;
  cursor: pointer;
}

.sep {
  color: #cbd5e1;
  font-size: 0.8rem;
}

/* Actions */
.search-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-left: 12px;
}

.filter-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 12px;
  font-weight: 600;
  color: #64748b;
  transition: all 0.3s ease;
}

.filter-toggle:hover {
  background: #f8fafc;
}

.filter-toggle.active {
  background: #f1f5f9;
  color: #0f172a;
}

.premium-search-btn {
  background: #0f172a !important;
  color: white !important;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.premium-search-btn:hover {
  transform: scale(1.1);
}

/* Advanced Panel */
.advanced-filters-panel {
  padding: 24px 32px 32px;
  border-top: 1px solid #f1f5f9;
  background: #fafafa;
  border-radius: 0 0 24px 24px;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
}

.filter-cell.full-width {
  grid-column: span 3;
}

.filter-cell label {
  display: block;
  font-size: 0.85rem;
  font-weight: 700;
  color: #475569;
  margin-bottom: 12px;
}

.chip-group {
  display: flex;
  gap: 8px;
}

.chip-group button {
  padding: 8px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #64748b;
  background: white;
  transition: all 0.2s ease;
}

.chip-group button.active {
  background: #0f172a;
  color: white;
  border-color: #0f172a;
}

.range-row {
  display: flex;
  gap: 12px;
}

.range-row input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 0.9rem;
  outline: none;
}

.premium-chip {
  border-color: #e2e8f0 !important;
  font-weight: 500 !important;
}

/* Suggestions Overlay */
.premium-suggestions {
  position: absolute;
  top: calc(100% + 12px);
  left: 0;
  width: 320px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
  z-index: 100;
  padding: 8px;
  border: 1px solid #f1f5f9;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.suggestion-item:hover {
  background: #f1f5f9;
}

.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.3s ease;
}
.fade-slide-enter-from, .fade-slide-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@media (max-width: 960px) {
  .search-main-row {
    flex-direction: column;
    padding: 20px;
  }
  .field-divider {
    display: none;
  }
  .search-field-group {
    width: 100%;
    border-bottom: 1px solid #f1f5f9;
    border-radius: 0;
  }
  .filters-grid {
    grid-template-columns: 1fr;
  }
  .filter-cell.full-width {
    grid-column: span 1;
  }
}
</style>