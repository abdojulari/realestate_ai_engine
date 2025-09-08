<template>
  <div class="property-detail">
    <!-- Image Gallery -->
    <v-container fluid class="pa-0">
      <v-row no-gutters>
        <v-col cols="12">
          <v-carousel
            v-if="Array.isArray(property.images) && property.images.length === 1"
            hide-delimiters
            height="600"
          >
            <v-carousel-item
              :src="(Array.isArray(property.images) && property.images.length ? property.images[0] : '/favicon.ico')"
              cover
            />
          </v-carousel>

          <div v-else class="image-grid">
            <v-img
              :src="(Array.isArray(property.images) && property.images.length ? property.images[0] : '/favicon.ico')"
              height="600"
              class="main-image"
              cover
              @click="openGallery(0)"
            >
              <template v-slot:placeholder>
                <v-row class="fill-height ma-0" align="center" justify="center">
                  <v-progress-circular indeterminate />
                </v-row>
              </template>
            </v-img>

            <div class="thumbnail-grid">
              <v-img
                v-for="(image, index) in thumbnailImages"
                :key="index"
                :src="image || '/favicon.ico'"
                height="197"
                cover
                class="thumbnail"
                @click="openGallery(index + 1)"
              />
              <v-btn
                v-if="Array.isArray(property.images) && property.images.length > 5"
                color="primary"
                class="more-photos"
                @click="openGallery(0)"
              >
                +{{ (Array.isArray(property.images) ? property.images.length : 0) - 4 }} more photos
              </v-btn>
            </div>
          </div>
        </v-col>
      </v-row>
    </v-container>

    <v-container class="py-8">
      <!-- Tabs -->
      <v-tabs v-model="selectedTab" class="mb-6" density="comfortable">
        <v-tab value="highlights">Highlights</v-tab>
        <v-tab value="payments">Monthly payments</v-tab>
        <v-tab value="neighbourhood">Neighbourhood</v-tab>
        <v-tab value="schools">Schools</v-tab>
      </v-tabs>

      <v-row>
        <v-col cols="12" md="8">
          <div v-show="selectedTab === 'highlights'">
            <div class="d-flex align-center mb-4">
              <h1 class="text-h4">{{ property.title }} {{ property.city }}, {{ property.province }}, {{ property.postalCode }}</h1>
              <v-spacer />
              <v-btn icon="mdi-share-variant" variant="text" @click="shareProperty" />
              <v-btn :icon="property.isSaved ? 'mdi-heart' : 'mdi-heart-outline'" :color="property.isSaved ? 'red' : undefined" variant="text" @click="toggleSave" />
            </div>
            <div class="text-h5 mb-4">${{ formatPrice(property.price) }}</div>
            <div class="d-flex align-center mb-6">
              <v-chip class="mr-2" color="primary">{{ property.type }}</v-chip>
              <v-chip class="mr-2">{{ property.beds }} beds</v-chip>
              <v-chip class="mr-2">{{ property.baths }} baths</v-chip>
              <v-chip>{{ property.sqft }} sqft</v-chip>
            </div>
            <v-card class="mb-6" flat>
              <v-card-text>
                <div class="text-h6 mb-4">Property Details</div>
                <v-row>
                  <v-col cols="6" sm="4">
                    <div class="text-caption">Property Type</div>
                    <div class="text-capitalize">{{ property.type }}</div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.yearBuilt">
                    <div class="text-caption">Year Built</div>
                    <div>{{ property.features.yearBuilt }}</div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.garage">
                    <div class="text-caption">Parking</div>
                    <div>{{ property.features.garage }} spaces</div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.heating">
                    <div class="text-caption">Heating</div>
                    <div>{{ formatArray(property.features.heating) }}</div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.cooling">
                    <div class="text-caption">Cooling</div>
                    <div>{{ formatArray(property.features.cooling) }}</div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.lotSize">
                    <div class="text-caption">Lot Size</div>
                    <div>{{ property.features.lotSize }} {{ property.features.lotSize > 1 ? 'acres' : 'sqft' }}</div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.basement">
                    <div class="text-caption">Basement</div>
                    <div>{{ formatArray(property.features.basement) }}</div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.taxes">
                    <div class="text-caption">Annual Taxes</div>
                    <div>${{ formatPrice(property.features.taxes) }} ({{ property.features.taxYear }})</div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.hoaFee">
                    <div class="text-caption">HOA Fee</div>
                    <div>${{ formatPrice(property.features.hoaFee) }}/month</div>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
            <v-card class="mb-6" flat>
              <v-card-text>
                <div class="text-h6 mb-4">Description</div>
                <div class="text-body-1">{{ property.description }}</div>
              </v-card-text>
            </v-card>
            <v-card class="mb-6" v-if="hasFeatures" flat>
              <v-card-text>
                <div class="text-h6 mb-4">Features & Amenities</div>
                <!-- The feature blocks remain unchanged -->
                <div v-if="property.features?.appliances?.length" class="mb-4">
                  <div class="text-subtitle-2 mb-2">Appliances</div>
                  <v-chip-group>
                    <v-chip v-for="appliance in property.features.appliances" :key="appliance" variant="outlined" size="small">{{ appliance }}</v-chip>
                  </v-chip-group>
                </div>
                <div v-if="property.features?.interiorFeatures?.length" class="mb-4">
                  <div class="text-subtitle-2 mb-2">Interior Features</div>
                  <v-chip-group>
                    <v-chip v-for="feature in property.features.interiorFeatures" :key="feature" variant="outlined" size="small">{{ feature }}</v-chip>
                  </v-chip-group>
                </div>
                <div v-if="property.features?.exteriorFeatures?.length" class="mb-4">
                  <div class="text-subtitle-2 mb-2">Exterior Features</div>
                  <v-chip-group>
                    <v-chip v-for="feature in property.features.exteriorFeatures" :key="feature" variant="outlined" size="small">{{ feature }}</v-chip>
                  </v-chip-group>
                </div>
                <div v-if="property.features?.flooring?.length" class="mb-4">
                  <div class="text-subtitle-2 mb-2">Flooring</div>
                  <v-chip-group>
                    <v-chip v-for="floor in property.features.flooring" :key="floor" variant="outlined" size="small">{{ floor }}</v-chip>
                  </v-chip-group>
                </div>
                <div v-if="property.features?.poolFeatures?.length" class="mb-4">
                  <div class="text-subtitle-2 mb-2">Pool Features</div>
                  <v-chip-group>
                    <v-chip v-for="pool in property.features.poolFeatures" :key="pool" variant="outlined" size="small" color="blue">{{ pool }}</v-chip>
                  </v-chip-group>
                </div>
                <div v-if="property.features?.fireplaceFeatures?.length">
                  <div class="text-subtitle-2 mb-2">Fireplace Features</div>
                  <v-chip-group>
                    <v-chip v-for="fireplace in property.features.fireplaceFeatures" :key="fireplace" variant="outlined" size="small" color="orange">{{ fireplace }}</v-chip>
                  </v-chip-group>
                </div>
              </v-card-text>
            </v-card>
            <v-card class="mb-6" flat>
              <v-card-text>
                <div class="text-h6 mb-4">Location</div>
                <div class="mb-4">{{ property.address }}, {{ property.city }}, {{ property.province }}, {{ property.postalCode }}</div>
                <client-only>
                  <div v-if="property.latitude && property.longitude">
                    <l-map :zoom="15" :center="[property.latitude, property.longitude]" style="height: 400px">
                      <l-tile-layer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <l-marker :lat-lng="[property.latitude, property.longitude]"><l-popup>{{ property.address }}</l-popup></l-marker>
                    </l-map>
                  </div>
                  <div v-else class="d-flex align-center justify-center" style="height: 400px;">
                    <v-icon size="64" class="text-grey">mdi-map-marker-off</v-icon>
                    <span class="text-grey ml-4">Location not available</span>
                  </div>
                  <template #fallback>
                    <div class="d-flex align-center justify-center" style="height: 400px;">
                      <v-progress-circular indeterminate />
                      <span class="ml-4">Loading map...</span>
                    </div>
                  </template>
                </client-only>
              </v-card-text>
            </v-card>
          </div>

          <div v-show="selectedTab === 'payments'">
            <v-card flat>
              <v-card-text>
                <div class="text-h6 mb-4">Monthly payments</div>
                <v-form>
                  <v-text-field v-model.number="calc.price" label="Home price" prefix="$" variant="outlined" density="compact" />
                  <v-text-field v-model.number="calc.downPercent" label="Down payment (%)" suffix="%" variant="outlined" density="compact" />
                  <v-text-field v-model.number="calc.rate" label="Interest rate (APR %)" suffix="%" variant="outlined" density="compact" />
                  <v-text-field v-model.number="calc.years" label="Amortization (years)" variant="outlined" density="compact" />
                </v-form>
                <v-divider class="my-4" />
                <div class="text-subtitle-1 mb-2">Estimated monthly payment</div>
                <div class="text-h5 mb-1">${{ formatPrice(monthlyPayment) }}</div>
                <div class="text-caption text-medium-emphasis">
                  Principal & interest on a ${{ formatPrice(loanAmount) }} mortgage at {{ calc.rate }}% for {{ calc.years }} years
                </div>
              </v-card-text>
            </v-card>
          </div>

          <div v-show="selectedTab === 'neighbourhood'">
            <v-card flat>
              <v-card-text>
                <div class="text-h6 mb-4">Nearby points of interest</div>
                <div class="mb-4">
                  <v-btn-toggle v-model="transportMode" mandatory class="mb-2" divided>
                    <v-btn value="walk" prepend-icon="mdi-walk">Walking</v-btn>
                    <v-btn value="bike" prepend-icon="mdi-bike">Biking</v-btn>
                    <v-btn value="car" prepend-icon="mdi-car">Car</v-btn>
                  </v-btn-toggle>
                </div>
                <v-alert v-if="poiError" type="error" variant="tonal" density="compact" class="mb-4">{{ poiError }}</v-alert>
                <v-skeleton-loader v-if="poiLoading" type="table-row@5" />
                <v-table v-else>
                  <thead>
                    <tr>
                      <th class="text-left">Category</th>
                      <th class="text-left">Name</th>
                      <th class="text-left">Distance</th>
                      <th class="text-left">ETA</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in pois" :key="item.id">
                      <td>{{ item.category }}</td>
                      <td>{{ item.name }}</td>
                      <td>{{ (item.distance/1000).toFixed(2) }} km</td>
                      <td>{{ formatEtaMinutes(item.distance) }} min ({{ transportMode }})</td>
                    </tr>
                  </tbody>
                </v-table>
              </v-card-text>
            </v-card>
          </div>

          <div v-show="selectedTab === 'schools'">
            <v-card flat>
              <v-card-text>
                <div class="d-flex align-center justify-space-between mb-4">
                  <div class="text-h6">Schools</div>
                  
                  <!-- Transportation Mode Selector -->
                  <div class="transport-selector">
                    <v-btn-toggle
                      v-model="schoolTransportMode"
                      mandatory
                      density="compact"
                      @update:model-value="updateSchoolETAs"
                    >
                      <v-btn value="walking" size="small">
                        <v-icon>mdi-walk</v-icon>
                        <span class="ml-1">WALKING</span>
                      </v-btn>
                      <v-btn value="biking" size="small">
                        <v-icon>mdi-bike</v-icon>
                        <span class="ml-1">BIKING</span>
                      </v-btn>
                      <v-btn value="car" size="small">
                        <v-icon>mdi-car</v-icon>
                        <span class="ml-1">CAR</span>
                      </v-btn>
                    </v-btn-toggle>
                  </div>
                </div>
                
                <v-alert v-if="schoolsError" type="error" variant="tonal" density="compact" class="mb-4">{{ schoolsError }}</v-alert>
                <v-skeleton-loader v-if="schoolsLoading" type="table-row@5" />
                <v-table v-else>
                  <thead>
                    <tr>
                      <th class="text-left">School name</th>
                      <th class="text-left">Distance</th>
                      <th class="text-left">ETA</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="s in schools" :key="s.id">
                      <td>{{ s.name }}</td>
                      <td>{{ (s.distance/1000).toFixed(2) }} km</td>
                      <td>{{ formatEtaMinutes(s.distance, schoolTransportMode) }} min ({{ schoolTransportMode }})</td>
                    </tr>
                  </tbody>
                </v-table>
              </v-card-text>
            </v-card>
          </div>
        </v-col>

        <!-- Persistent Contact Form -->
        <v-col cols="12" md="4">
          <v-card class="sticky-card" flat>
            <v-card-text>
              <div class="text-h6 mb-4">Contact Agent</div>
              <v-form v-model="isFormValid" @submit.prevent="handleSubmit">
                <v-text-field v-model="contactForm.name" label="Your Name" :rules="nameRules" required variant="outlined" density="compact" />
                <v-text-field v-model="contactForm.email" label="Email" type="email" :rules="emailRules" required variant="outlined" density="compact" />
                <v-text-field v-model="contactForm.phone" label="Phone" :rules="phoneRules" variant="outlined" density="compact" />
                <v-textarea v-model="contactForm.message" label="Message" :rules="messageRules" required variant="outlined" density="compact" rows="3" />
                <v-btn type="submit" color="primary" block :loading="loading" :disabled="!isFormValid">Contact Agent</v-btn>
              </v-form>
              <v-divider class="my-4" />
              <div class="text-center">
                <v-btn variant="outlined" color="primary" block class="mb-2" @click="scheduleViewing">Schedule Viewing</v-btn>
                <v-btn variant="text" block prepend-icon="mdi-phone" :href="`tel:${property.agent?.phone}`">Call Agent</v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

    </v-container>

    <!-- Image Gallery Dialog -->
    <v-dialog
      v-model="showGallery"
      fullscreen
      :scrim="false"
      transition="dialog-bottom-transition"
    >
      <v-card flat>
        <v-toolbar dark color="black">
          <v-btn
            icon="mdi-close"
            @click="showGallery = false"
          />
          <v-toolbar-title>Gallery</v-toolbar-title>
          <v-spacer />
          <div class="text-body-2">
            {{ currentImageIndex + 1 }} / {{ property.images?.length }}
          </div>
        </v-toolbar>

        <v-carousel
          v-model="currentImageIndex"
          height="100vh"
          hide-delimiter-background
          show-arrows="hover"
        >
          <v-carousel-item
            v-for="(image, index) in property.images"
            :key="index"
            :src="image"
            cover
          />
        </v-carousel>
      </v-card>
    </v-dialog>

    <!-- Schedule Viewing Dialog -->
    <v-dialog v-model="showViewingDialog" max-width="500">
      <v-card>
        <v-card-title>Schedule a Viewing</v-card-title>
        <v-card-text>
          <v-form v-model="isViewingFormValid" @submit.prevent="submitViewingRequest">
            <v-text-field
              v-model="viewingForm.date"
              label="Preferred Date"
              type="date"
              class="mb-4"
              variant="outlined"
              density="compact"
              required
            />

            <v-select
              v-model="viewingForm.time"
              :items="availableTimes"
              label="Preferred Time"
              required
              variant="outlined"
            />

            <v-textarea
              v-model="viewingForm.notes"
              label="Additional Notes"
              variant="outlined"
              rows="3"
            />

            <v-card-actions>
              <v-spacer />
              <v-btn
                color="primary"
                type="submit"
                :loading="viewingLoading"
                :disabled="!isViewingFormValid"
              >
                Schedule Viewing
              </v-btn>
            </v-card-actions>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { propertyService } from '~/services/property.service'
const GEOAPIFY_KEY = import.meta.env.VITE_GEOAPIFY
const GEOAPIFY_URL = import.meta.env.GEOAPIFY_API_URL || 'https://api.geoapify.com/v2'

const route = useRoute()
const loading = ref(false)

// Save functionality
const { toggleSave: toggleSaveProperty } = useProperty()
const showGallery = ref(false)
const currentImageIndex = ref(0)
const showViewingDialog = ref(false)
const viewingLoading = ref(false)
const isFormValid = ref(false)
const isViewingFormValid = ref(false)
const selectedTab = ref<'highlights' | 'payments' | 'neighbourhood' | 'schools'>('highlights')

// Mortgage calculator state
const calc = ref({
  price: 0,
  downPercent: 20,
  rate: 5.25,
  years: 25
})

const loanAmount = computed(() => {
  const price = Number(calc.value.price) || 0
  const down = Math.max(0, Math.min(100, Number(calc.value.downPercent) || 0))
  return Math.max(0, Math.round(price * (1 - down / 100)))
})

const monthlyPayment = computed(() => {
  const P = loanAmount.value
  const monthlyRate = (Number(calc.value.rate) || 0) / 100 / 12
  const n = (Number(calc.value.years) || 0) * 12
  if (P <= 0 || monthlyRate <= 0 || n <= 0) return 0
  const m = P * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1)
  return Math.round(m)
})

// Neighbourhood (Geoapify)
const transportMode = ref<'walk' | 'bike' | 'car'>('walk')
const schoolTransportMode = ref<'walking' | 'biking' | 'car'>('car')
const poiLimit = ref(2)
const pois = ref<{ id: string; category: string; name: string; distance: number }[]>([])
const poiLoading = ref(false)
const poiError = ref('')

const geoCategories = [
  { key: 'cafes', label: 'Cafes', category: 'catering.cafe' },
  { key: 'grocery', label: 'Grocery stores', category: 'commercial.supermarket' },
  { key: 'parks', label: 'Parks', category: 'leisure.park' },
  { key: 'restaurants', label: 'Restaurants', category: 'catering.restaurant' },
  { key: 'shopping', label: 'Shopping centers', category: 'commercial.shopping_mall' }
]

function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (v: number) => v * Math.PI / 180
  const R = 6371000 // meters
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function getSpeedKmh(mode: 'walk' | 'bike' | 'car') {
  if (mode === 'walk' || mode === 'walking') return 5
  if (mode === 'bike' || mode === 'biking') return 15
  return 40 // car
}

function formatEtaMinutes(distanceMeters: number, mode?: string) {
  const transportModeToUse = mode || transportMode.value
  const speedKmh = getSpeedKmh(transportModeToUse)
  const metersPerMinute = (speedKmh * 1000) / 60
  const minutes = distanceMeters / metersPerMinute
  return Math.max(1, Math.round(minutes))
}

// Update school ETAs when transport mode changes
const updateSchoolETAs = () => {
  // The ETA will automatically update since it's reactive
  console.log('🚗 School transport mode changed to:', schoolTransportMode.value)
}

async function loadPois() {
  if (!property.value?.latitude || !property.value?.longitude) return
  poiLoading.value = true
  poiError.value = ''
  pois.value = []
  try {
    const lon = property.value.longitude
    const lat = property.value.latitude
    const results: any[] = []
    for (const c of geoCategories) {
      const url = `${GEOAPIFY_URL}/places?categories=${encodeURIComponent(c.category)}&filter=circle:${lon},${lat},10000&limit=${poiLimit.value}&apiKey=${GEOAPIFY_KEY}`
      const res = await fetch(url)
      if (!res.ok) {
        let body: any = undefined
        try { body = await res.json() } catch {}
        const msg = body?.error || body?.message || body?.statusMessage || res.statusText || `HTTP ${res.status}`
        throw new Error(`Geoapify ${c.key} failed: ${msg}`)
      }
      const data = await res.json()
      const items = (data.features || []).map((f: any) => {
        const coords = Array.isArray(f.geometry?.coordinates) ? f.geometry.coordinates : [0, 0]
        const poiLon = Number(coords[0])
        const poiLat = Number(coords[1])
        const distance = isFinite(poiLon) && isFinite(poiLat)
          ? haversineDistanceMeters(lat, lon, poiLat, poiLon)
          : 0
        return {
          id: f.properties?.place_id || `${c.key}-${f.properties?.name}-${distance}`,
          category: c.label,
          name: f.properties?.name || 'Unknown',
          distance
        }
      })
      results.push(...items)
    }
    // sort by distance ascending
    pois.value = results.sort((a, b) => a.distance - b.distance)
  } catch (e: any) {
    poiError.value = e?.message || 'Failed to load nearby places'
  } finally {
    poiLoading.value = false
  }
}

// Schools via Geoapify
const schools = ref<{ id: string; name: string; distance: number }[]>([])
const schoolsLoading = ref(false)
const schoolsError = ref('')

async function loadSchools() {
  if (!property.value?.latitude || !property.value?.longitude) return
  schoolsLoading.value = true
  schoolsError.value = ''
  schools.value = []
  try {
    const lon = property.value.longitude
    const lat = property.value.latitude
    const url = `${GEOAPIFY_URL}/places?categories=education.school&filter=circle:${lon},${lat},10000&limit=10&apiKey=${GEOAPIFY_KEY}`
    const res = await fetch(url)
    if (!res.ok) {
      let body: any = undefined
      try { body = await res.json() } catch {}
      const msg = body?.error || body?.message || body?.statusMessage || res.statusText || `HTTP ${res.status}`
      throw new Error(`Geoapify schools failed: ${msg}`)
    }
    const data = await res.json()
    schools.value = (data.features || []).map((f: any) => {
      const coords = Array.isArray(f.geometry?.coordinates) ? f.geometry.coordinates : [0, 0]
      const poiLon = Number(coords[0])
      const poiLat = Number(coords[1])
      const distance = isFinite(poiLon) && isFinite(poiLat)
        ? haversineDistanceMeters(lat, lon, poiLat, poiLon)
        : 0
      return {
        id: f.properties?.place_id || `${f.properties?.name}-${distance}`,
        name: f.properties?.name || 'Unknown',
        distance
      }
    }).sort((a: any, b: any) => a.distance - b.distance)
  } catch (e: any) {
    schoolsError.value = e?.message || 'Failed to load schools'
  } finally {
    schoolsLoading.value = false
  }
}

// Property from API (DB). Start with safe defaults, then hydrate.
const property = ref<any>({
  id: route.params.id,
  title: 'Property',
  price: 0,
  type: 'house',
  beds: 0,
  baths: 0,
  sqft: 0,
  yearBuilt: '',
  parking: '',
  heating: '',
  cooling: '',
  lotSize: 0,
  address: '',
  description: '',
  features: [],
  images: ['/favicon.ico'],
  latitude: 56.7268,
  longitude: -111.3800,
  isFavorite: false,
  agent: { name: '', phone: '', email: '' }
})

onMounted(async () => {
  try {
    const data = await $fetch(`/api/properties/${route.params.id}`)
    // Some DBs may store latitude/longitude swapped; ensure numbers
    const d: any = data
    const lat = Number(d.latitude)
    const lng = Number(d.longitude)
    property.value = {
      ...data,
      images: Array.isArray(d.images) && d.images.length ? d.images : ['/favicon.ico'],
      latitude: isFinite(lat) ? lat : 56.7268,
      longitude: isFinite(lng) ? lng : -111.3800
    }
    // Initialize calculator price once property is loaded
    if (Number(property.value.price) > 0 && calc.value.price === 0) {
      calc.value.price = Number(property.value.price)
    }
    // Prefill contact message with rich property context
    contactForm.value.message = `Hi, I am interested in ${property.value.title} (${property.value.address}, ${property.value.city}). MLS: ${property.value.mlsNumber || 'N/A'}. Price: $${formatPrice(property.value.price)}. Please contact me.`
    // Load POIs and Schools when property is available
    await Promise.all([loadPois(), loadSchools()])
  } catch (e) {
    // keep defaults
  }
})

const contactForm = ref({
  name: '',
  email: '',
  phone: '',
  message: `Hi, I am interested in ${property.value.address}`
})

const viewingForm = ref({
  date: '',
  time: '',
  notes: ''
})

const thumbnailImages = computed(() => {
  return property.value.images?.slice(1, 4) || []
})

const availableTimes = [
  '9:00 AM',
  '10:00 AM',
  '11:00 AM',
  '1:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM'
]

const nameRules = [
  (v: string) => !!v || 'Name is required',
  (v: string) => v.length >= 2 || 'Name must be at least 2 characters'
]

const emailRules = [
  (v: string) => !!v || 'Email is required',
  (v: string) => /.+@.+\..+/.test(v) || 'Email must be valid'
]

const phoneRules = [
  (v: string) => !v || /^\+?[\d\s-]{10,}$/.test(v) || 'Please enter a valid phone number'
]

const messageRules = [
  (v: string) => !!v || 'Message is required',
  (v: string) => v.length >= 10 || 'Message must be at least 10 characters'
]

const openGallery = (index: number) => {
  currentImageIndex.value = index
  showGallery.value = true
}

const toggleFavorite = () => {
  property.value.isFavorite = !property.value.isFavorite
}

const shareProperty = () => {
  if (navigator.share) {
    navigator.share({
      title: property.value.title,
      text: `Check out this property: ${property.value.address}`,
      url: window.location.href
    })
  }
}

const handleSubmit = async () => {
  loading.value = true
  try {
    const snapshot = {
      id: property.value.id,
      title: property.value.title,
      address: property.value.address,
      city: property.value.city,
      province: property.value.province,
      postalCode: property.value.postalCode,
      mlsNumber: property.value.mlsNumber,
      price: property.value.price,
      url: typeof window !== 'undefined' ? window.location.href : ''
    }
    await propertyService.createInquiry(property.value.id, {
      name: contactForm.value.name,
      email: contactForm.value.email,
      phone: contactForm.value.phone,
      message: contactForm.value.message,
      property: snapshot
    } as any)
  } catch (error) {
    console.error('Submit error:', error)
  } finally {
    loading.value = false
  }
}

const scheduleViewing = () => {
  showViewingDialog.value = true
}

const submitViewingRequest = async () => {
  viewingLoading.value = true
  try {
    const snapshot = {
      id: property.value.id,
      title: property.value.title,
      address: property.value.address,
      city: property.value.city,
      province: property.value.province,
      postalCode: property.value.postalCode,
      mlsNumber: property.value.mlsNumber,
      price: property.value.price,
      url: typeof window !== 'undefined' ? window.location.href : ''
    }
    await propertyService.requestViewing(property.value.id, {
      date: viewingForm.value.date,
      time: viewingForm.value.time,
      notes: viewingForm.value.notes,
      property: snapshot
    } as any)
    showViewingDialog.value = false
  } catch (error) {
    console.error('Viewing request error:', error)
  } finally {
    viewingLoading.value = false
  }
}

const formatPrice = (price: number) => {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const formatArray = (value: string | string[]) => {
  if (Array.isArray(value)) {
    return value.join(', ')
  }
  return value || 'N/A'
}

const hasFeatures = computed(() => {
  return property.value.features && 
    (property.value.features.appliances?.length ||
     property.value.features.interiorFeatures?.length ||
     property.value.features.exteriorFeatures?.length ||
     property.value.features.flooring?.length ||
     property.value.features.poolFeatures?.length ||
     property.value.features.fireplaceFeatures?.length)
})

// Save functionality
const toggleSave = async () => {
  if (!property.value?.id) return
  
  try {
    await toggleSaveProperty(property.value.id)
    property.value.isSaved = !property.value.isSaved
  } catch (error) {
    console.error('Error toggling save:', error)
  }
}
</script>

<style scoped>
.property-detail {
  min-height: 100vh;
}

.image-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 4px;
  height: 600px;
}

.main-image {
  grid-row: 1 / span 4;
  cursor: pointer;
}

.thumbnail-grid {
  display: grid;
  grid-template-rows: repeat(4, 1fr);
  gap: 4px;
}

.thumbnail {
  cursor: pointer;
}

.more-photos {
  position: absolute;
  bottom: 16px;
  right: 16px;
}

.sticky-card {
  position: sticky;
  top: 24px;
}

@media (max-width: 960px) {
  .image-grid {
    grid-template-columns: 1fr;
    height: auto;
  }

  .main-image {
    height: 300px;
  }

  .thumbnail-grid {
    display: none;
  }
}
</style>
