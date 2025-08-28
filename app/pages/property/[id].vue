<template>
  <div class="property-detail">
    <!-- Image Gallery -->
    <v-container fluid class="pa-0">
      <v-row no-gutters>
        <v-col cols="12">
          <v-carousel
            v-if="property.images?.length === 1"
            hide-delimiters
            height="600"
          >
            <v-carousel-item
              :src="(property.images && property.images[0]) || '/favicon.ico'"
              cover
            />
          </v-carousel>

          <div v-else class="image-grid">
            <v-img
              :src="property.images?.[0] || '/favicon.ico'"
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
                height="150"
                cover
                class="thumbnail"
                @click="openGallery(index + 1)"
              />
              <v-btn
                v-if="property.images?.length > 5"
                color="primary"
                class="more-photos"
                @click="openGallery(0)"
              >
                +{{ property.images.length - 4 }} more photos
              </v-btn>
            </div>
          </div>
        </v-col>
      </v-row>
    </v-container>

    <v-container class="py-8">
      <v-row>
        <!-- Property Details -->
        <v-col cols="12" md="8">
          <div class="d-flex align-center mb-4">
            <h1 class="text-h4">{{ property.title }}</h1>
            <v-spacer />
            <v-btn
              icon="mdi-share-variant"
              variant="text"
              @click="shareProperty"
            />
            <v-btn
              :icon="property.isFavorite ? 'mdi-heart' : 'mdi-heart-outline'"
              :color="property.isFavorite ? 'red' : undefined"
              variant="text"
              @click="toggleFavorite"
            />
          </div>

          <div class="text-h5 mb-4">${{ formatPrice(property.price) }}</div>

          <div class="d-flex align-center mb-6">
            <v-chip class="mr-2" color="primary">{{ property.type }}</v-chip>
            <v-chip class="mr-2">{{ property.beds }} beds</v-chip>
            <v-chip class="mr-2">{{ property.baths }} baths</v-chip>
            <v-chip>{{ property.sqft }} sqft</v-chip>
          </div>

          <v-card class="mb-6">
            <v-card-text>
              <div class="text-h6 mb-4">Property Details</div>
              <v-row>
                <v-col cols="6" sm="4">
                  <div class="text-caption">Property Type</div>
                  <div>{{ property.type }}</div>
                </v-col>
                <v-col cols="6" sm="4">
                  <div class="text-caption">Year Built</div>
                  <div>{{ property.yearBuilt }}</div>
                </v-col>
                <v-col cols="6" sm="4">
                  <div class="text-caption">Parking</div>
                  <div>{{ property.parking }}</div>
                </v-col>
                <v-col cols="6" sm="4">
                  <div class="text-caption">Heating</div>
                  <div>{{ property.heating }}</div>
                </v-col>
                <v-col cols="6" sm="4">
                  <div class="text-caption">Cooling</div>
                  <div>{{ property.cooling }}</div>
                </v-col>
                <v-col cols="6" sm="4">
                  <div class="text-caption">Lot Size</div>
                  <div>{{ property.lotSize }} sqft</div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <v-card class="mb-6">
            <v-card-text>
              <div class="text-h6 mb-4">Description</div>
              <div class="text-body-1">{{ property.description }}</div>
            </v-card-text>
          </v-card>

          <v-card class="mb-6">
            <v-card-text>
              <div class="text-h6 mb-4">Features</div>
              <v-chip-group>
                <v-chip
                  v-for="feature in property.features"
                  :key="feature"
                  variant="outlined"
                >
                  {{ feature }}
                </v-chip>
              </v-chip-group>
            </v-card-text>
          </v-card>

          <v-card class="mb-6">
            <v-card-text>
              <div class="text-h6 mb-4">Location</div>
              <div class="mb-4">{{ property.address }}</div>
              <client-only>
                <l-map
                  :zoom="15"
                  :center="[property.latitude, property.longitude]"
                  style="height: 400px"
                >
                  <l-tile-layer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <l-marker :lat-lng="[property.latitude, property.longitude]">
                    <l-popup>{{ property.address }}</l-popup>
                  </l-marker>
                </l-map>
              </client-only>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Contact Form -->
        <v-col cols="12" md="4">
          <v-card class="sticky-card">
            <v-card-text>
              <div class="text-h6 mb-4">Contact Agent</div>
              
              <v-form v-model="isFormValid" @submit.prevent="handleSubmit">
                <v-text-field
                  v-model="contactForm.name"
                  label="Your Name"
                  :rules="nameRules"
                  required
                  variant="outlined"
                  density="compact"
                />

                <v-text-field
                  v-model="contactForm.email"
                  label="Email"
                  type="email"
                  :rules="emailRules"
                  required
                  variant="outlined"
                  density="compact"
                />

                <v-text-field
                  v-model="contactForm.phone"
                  label="Phone"
                  :rules="phoneRules"
                  variant="outlined"
                  density="compact"
                />

                <v-textarea
                  v-model="contactForm.message"
                  label="Message"
                  :rules="messageRules"
                  required
                  variant="outlined"
                  density="compact"
                  rows="3"
                />

                <v-btn
                  type="submit"
                  color="primary"
                  block
                  :loading="loading"
                  :disabled="!isFormValid"
                >
                  Contact Agent
                </v-btn>
              </v-form>

              <v-divider class="my-4" />

              <div class="text-center">
                <v-btn
                  variant="outlined"
                  color="primary"
                  block
                  class="mb-2"
                  @click="scheduleViewing"
                >
                  Schedule Viewing
                </v-btn>

                <v-btn
                  variant="text"
                  block
                  prepend-icon="mdi-phone"
                  :href="`tel:${property.agent?.phone}`"
                >
                  Call Agent
                </v-btn>
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
      <v-card>
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
            <v-date-picker
              v-model="viewingForm.date"
              class="mb-4"
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
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const loading = ref(false)
const showGallery = ref(false)
const currentImageIndex = ref(0)
const showViewingDialog = ref(false)
const viewingLoading = ref(false)
const isFormValid = ref(false)
const isViewingFormValid = ref(false)

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
    const lat = Number((data as any).latitude)
    const lng = Number((data as any).longitude)
    property.value = {
      ...data,
      images: Array.isArray(data.images) && data.images.length ? data.images : ['/favicon.ico'],
      latitude: isFinite(lat) ? lat : 56.7268,
      longitude: isFinite(lng) ? lng : -111.3800
    }
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
    // Replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    // Show success message
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
    // Replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    showViewingDialog.value = false
    // Show success message
  } catch (error) {
    console.error('Viewing request error:', error)
  } finally {
    viewingLoading.value = false
  }
}

const formatPrice = (price: number) => {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
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
