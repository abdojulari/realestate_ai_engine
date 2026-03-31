<template>
  <div class="admin-property-view px-md-8 py-md-6">
    <v-container fluid>
      <!-- Header -->
      <v-row class="mb-8 align-center">
        <v-col cols="12" md="8">
          <div class="d-flex align-center mb-2">
            <v-btn icon="mdi-arrow-left" variant="text" size="small" class="mr-2" @click="$router.back()" />
            <div class="premium-accent-bar mr-4"></div>
            <span class="text-overline letter-spacing-2 text-gold">Property Details</span>
          </div>
          <h1 class="display-serif text-h3 mb-1">{{ property.title || property.address || 'Loading...' }}</h1>
          <p class="text-subtitle-1 text-medium-emphasis font-weight-light">
            {{ property.city }}{{ property.province ? `, ${property.province}` : '' }}{{ property.postalCode ? ` ${property.postalCode}` : '' }}
          </p>
        </v-col>
        <v-col cols="12" md="4" class="text-md-right d-flex ga-2 justify-md-end">
          <v-chip variant="tonal" :color="sourceColor" class="font-weight-bold">{{ property.source || 'manual' }}</v-chip>
          <v-chip variant="tonal" :color="statusColor" class="font-weight-bold text-capitalize">{{ formatStatus(property.status) }}</v-chip>
          <v-btn variant="tonal" color="primary" prepend-icon="mdi-pencil" class="premium-action-btn ml-2" :to="`/admin/properties/${id}/edit`">Edit</v-btn>
        </v-col>
      </v-row>

      <!-- Gallery -->
      <v-row v-if="images.length > 0" class="mb-8">
        <v-col cols="12">
          <v-card class="view-card" elevation="0">
            <v-card-text class="pa-4">
              <div class="view-gallery">
                <v-img
                  v-for="(img, idx) in images.slice(0, 6)"
                  :key="idx"
                  :src="img"
                  height="220"
                  cover
                  class="view-gallery-img rounded-lg"
                  @click="galleryIndex = idx; showGallery = true"
                />
                <div v-if="images.length > 6" class="view-gallery-more rounded-lg" @click="galleryIndex = 6; showGallery = true">
                  +{{ images.length - 6 }} more
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-row>
        <!-- Left: Details -->
        <v-col cols="12" lg="8">
          <!-- Price & Key Stats -->
          <v-card class="view-card mb-6" elevation="0">
            <v-card-text class="pa-6">
              <div class="d-flex align-center flex-wrap ga-4 mb-5">
                <div>
                  <div class="text-h3 font-weight-bold">${{ formatPrice(property.price) }}</div>
                  <div v-if="property.priceDrop?.originalPrice" class="d-flex align-center ga-2 mt-1">
                    <span class="text-body-2 text-decoration-line-through text-medium-emphasis">${{ formatPrice(property.priceDrop.originalPrice) }}</span>
                    <v-chip size="x-small" color="error" variant="flat" class="font-weight-bold">
                      -{{ Math.abs(property.priceDrop.changePct || 0).toFixed(1) }}%
                    </v-chip>
                  </div>
                </div>
                <v-spacer />
                <div class="d-flex ga-6">
                  <div class="text-center">
                    <div class="text-h5 font-weight-bold">{{ property.beds || 0 }}</div>
                    <div class="text-caption text-medium-emphasis">Beds</div>
                  </div>
                  <div class="view-stat-divider"></div>
                  <div class="text-center">
                    <div class="text-h5 font-weight-bold">{{ property.baths || 0 }}</div>
                    <div class="text-caption text-medium-emphasis">Baths</div>
                  </div>
                  <div class="view-stat-divider"></div>
                  <div class="text-center">
                    <div class="text-h5 font-weight-bold">{{ property.sqft?.toLocaleString() || '—' }}</div>
                    <div class="text-caption text-medium-emphasis">Sq Ft</div>
                  </div>
                </div>
              </div>
              <v-divider class="mb-5 opacity-10" />
              <div class="text-body-1" style="white-space: pre-line; line-height: 1.7;">{{ property.description || 'No description available.' }}</div>
            </v-card-text>
          </v-card>

          <!-- Property Info Grid -->
          <v-card class="view-card mb-6" elevation="0">
            <v-card-text class="pa-6">
              <div class="text-h6 font-weight-bold mb-4">Property Information</div>
              <v-row>
                <v-col v-for="item in infoItems" :key="item.label" cols="6" sm="4" md="3">
                  <div class="view-info-item">
                    <div class="text-caption text-medium-emphasis">{{ item.label }}</div>
                    <div class="text-body-2 font-weight-bold">{{ item.value || '—' }}</div>
                  </div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Price History -->
          <v-card v-if="property.priceHistory?.length" class="view-card mb-6" elevation="0">
            <v-card-text class="pa-6">
              <div class="text-h6 font-weight-bold mb-4">Price History</div>
              <v-table density="compact" class="view-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Price</th>
                    <th>Event</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="ph in property.priceHistory" :key="ph.id">
                    <td class="text-body-2">{{ formatDate(ph.createdAt) }}</td>
                    <td class="text-body-2 font-weight-bold">${{ formatPrice(ph.price) }}</td>
                    <td>
                      <v-chip size="x-small" :color="ph.event === 'price_decrease' ? 'error' : 'success'" variant="tonal" class="font-weight-bold text-capitalize">
                        {{ ph.event?.replace(/_/g, ' ') || 'listed' }}
                      </v-chip>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Right: Location & Actions -->
        <v-col cols="12" lg="4">
          <!-- Location -->
          <v-card class="view-card mb-6" elevation="0">
            <v-card-text class="pa-6">
              <div class="text-h6 font-weight-bold mb-4">Location</div>
              <div class="view-info-item mb-3">
                <div class="text-caption text-medium-emphasis">Address</div>
                <div class="text-body-2 font-weight-bold">{{ property.address || '—' }}</div>
              </div>
              <v-row dense>
                <v-col cols="6">
                  <div class="view-info-item mb-3">
                    <div class="text-caption text-medium-emphasis">City</div>
                    <div class="text-body-2 font-weight-bold">{{ property.city || '—' }}</div>
                  </div>
                </v-col>
                <v-col cols="6">
                  <div class="view-info-item mb-3">
                    <div class="text-caption text-medium-emphasis">Province</div>
                    <div class="text-body-2 font-weight-bold">{{ property.province || '—' }}</div>
                  </div>
                </v-col>
                <v-col cols="6">
                  <div class="view-info-item mb-3">
                    <div class="text-caption text-medium-emphasis">Postal Code</div>
                    <div class="text-body-2 font-weight-bold">{{ property.postalCode || '—' }}</div>
                  </div>
                </v-col>
                <v-col cols="6">
                  <div class="view-info-item mb-3">
                    <div class="text-caption text-medium-emphasis">Community</div>
                    <div class="text-body-2 font-weight-bold">{{ property.cityRegion || '—' }}</div>
                  </div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Quick Actions -->
          <v-card class="view-card mb-6" elevation="0">
            <v-card-text class="pa-6">
              <div class="text-h6 font-weight-bold mb-4">Actions</div>
              <v-btn block variant="tonal" color="primary" prepend-icon="mdi-pencil" class="mb-3 premium-action-btn" :to="`/admin/properties/${id}/edit`">Edit Property</v-btn>
              <v-btn block variant="tonal" prepend-icon="mdi-facebook" class="mb-3 premium-action-btn" :to="`/admin/facebook?propertyId=${id}`">Post to Facebook</v-btn>
              <v-btn block variant="tonal" prepend-icon="mdi-email-outline" class="mb-3 premium-action-btn" :to="`/admin/newsletter/campaigns/new?propertyId=${id}`">Email Campaign</v-btn>
              <v-btn block variant="outlined" prepend-icon="mdi-arrow-left" class="premium-action-btn" @click="$router.back()">Go Back</v-btn>
            </v-card-text>
          </v-card>

          <!-- Metadata -->
          <v-card class="view-card" elevation="0">
            <v-card-text class="pa-6">
              <div class="text-h6 font-weight-bold mb-4">Metadata</div>
              <div class="view-info-item mb-2">
                <div class="text-caption text-medium-emphasis">Property ID</div>
                <div class="text-body-2 font-weight-bold">{{ property.id }}</div>
              </div>
              <div class="view-info-item mb-2">
                <div class="text-caption text-medium-emphasis">MLS Number</div>
                <div class="text-body-2 font-weight-bold">{{ property.mlsNumber || '—' }}</div>
              </div>
              <div class="view-info-item mb-2">
                <div class="text-caption text-medium-emphasis">Source</div>
                <div class="text-body-2 font-weight-bold text-capitalize">{{ property.source || 'manual' }}</div>
              </div>
              <div class="view-info-item mb-2">
                <div class="text-caption text-medium-emphasis">Listed</div>
                <div class="text-body-2 font-weight-bold">{{ formatDate(property.createdAt) }}</div>
              </div>
              <div class="view-info-item">
                <div class="text-caption text-medium-emphasis">Last Updated</div>
                <div class="text-body-2 font-weight-bold">{{ formatDate(property.updatedAt) }}</div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Gallery Overlay -->
      <v-dialog v-model="showGallery" max-width="900" content-class="view-gallery-dialog">
        <v-card class="rounded-xl" color="black">
          <v-btn icon="mdi-close" variant="text" color="white" class="position-absolute" style="top: 8px; right: 8px; z-index: 10;" @click="showGallery = false" />
          <v-carousel v-model="galleryIndex" hide-delimiters height="600" show-arrows="hover">
            <v-carousel-item v-for="(img, idx) in images" :key="idx" :src="img" contain />
          </v-carousel>
          <div class="text-center pa-3 text-white text-caption">{{ galleryIndex + 1 }} / {{ images.length }}</div>
        </v-card>
      </v-dialog>

      <!-- Loading -->
      <v-overlay :model-value="loading" class="align-center justify-center" contained>
        <v-progress-circular indeterminate size="64" color="primary" />
      </v-overlay>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({ layout: 'admin', middleware: ['admin'] })

const route = useRoute()
const id = computed(() => route.params.id as string)

const getAuthHeaders = (): Record<string, string> => {
  if (process.client) {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }
  return {}
}

const property = ref<any>({})
const loading = ref(false)
const showGallery = ref(false)
const galleryIndex = ref(0)

const images = computed(() => {
  const imgs = property.value.images
  if (!Array.isArray(imgs)) return []
  return imgs.map((img: any) => (typeof img === 'string' ? img : img.url || img.Uri)).filter(Boolean)
})

const formatPrice = (price: number) => price ? Math.round(price).toLocaleString() : '0'
const formatDate = (date: string) => date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const formatStatus = (s: string) => s ? s.replace(/_/g, ' ') : 'Unknown'

const sourceColor = computed(() => {
  const s = property.value.source
  if (s === 'crea') return 'info'
  if (s === 'pillar9') return 'purple'
  return 'success'
})

const statusColor = computed(() => {
  const s = property.value.status
  if (s === 'for_sale') return 'success'
  if (s === 'sold') return 'error'
  if (s === 'pending') return 'warning'
  return 'info'
})

const infoItems = computed(() => [
  { label: 'Property Type', value: property.value.type },
  { label: 'Year Built', value: property.value.yearBuilt },
  { label: 'Stories', value: property.value.stories },
  { label: 'Lot Size', value: property.value.lotSizeDimensions },
  { label: 'Annual Tax', value: property.value.taxAnnualAmount ? `$${Math.round(property.value.taxAnnualAmount).toLocaleString()}` : null },
  { label: 'Zoning', value: property.value.zoning },
  { label: 'Unit #', value: property.value.unitNumber },
  { label: 'MLS #', value: property.value.mlsNumber },
].filter(item => item.value))

async function loadProperty() {
  loading.value = true
  try {
    const res = await $fetch(`/api/admin/properties/${id.value}`, { headers: getAuthHeaders() }) as any
    property.value = res.property || res
  } catch (e: any) {
    console.error('Error loading property:', e)
  } finally {
    loading.value = false
  }
}

onMounted(loadProperty)
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;600;700&display=swap');

.admin-property-view {
  background-color: #fcfcfb;
  font-family: 'Inter', sans-serif;
  min-height: 100vh;
}
.display-serif { font-family: 'Playfair Display', serif; }
.text-gold { color: #8c734b; }
.letter-spacing-2 { letter-spacing: 2px; }
.premium-accent-bar { width: 40px; height: 4px; background: #8c734b; border-radius: 2px; }

.view-card {
  border-radius: 20px !important;
  border: 1px solid rgba(0, 0, 0, 0.05) !important;
  background: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(20px);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 8px 32px rgba(0, 0, 0, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
}

.premium-action-btn {
  border-radius: 12px !important;
  text-transform: none !important;
  font-weight: 700 !important;
}

.view-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 8px;
}

.view-gallery-img {
  cursor: pointer;
  transition: all 0.2s ease;
}
.view-gallery-img:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.view-gallery-more {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  background: rgba(0, 0, 0, 0.04);
  font-weight: 700;
  color: rgba(0, 0, 0, 0.4);
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}
.view-gallery-more:hover {
  background: rgba(0, 0, 0, 0.08);
}

.view-stat-divider {
  width: 1px;
  height: 36px;
  background: rgba(0, 0, 0, 0.08);
}

.view-info-item {
  padding: 6px 0;
}

.view-table {
  background: transparent !important;
}
</style>
