<template>
  <v-container>
    <v-row justify="center">
      <v-col cols="12" md="10" lg="8">
        <h1 class="text-h4 mb-6">List Your Property</h1>

        <v-stepper v-model="currentStep" class="mb-6">
          <v-stepper-header>
            <v-stepper-item value="1">
              Basic Info
            </v-stepper-item>

            <v-divider />

            <v-stepper-item value="2">
              Details & Features
            </v-stepper-item>

            <v-divider />

            <v-stepper-item value="3">
              Photos & Media
            </v-stepper-item>

            <v-divider />

            <v-stepper-item value="4">
              Location & Price
            </v-stepper-item>
          </v-stepper-header>

          <v-stepper-window>
            <!-- Step 1: Basic Info -->
            <v-stepper-window-item value="1">
              <v-card flat>
                <v-card-text>
                  <v-form v-model="isStep1Valid" @submit.prevent>
                    <v-row>
                      <v-col cols="12">
                        <v-text-field
                          v-model="propertyData.title"
                          label="Property Title"
                          :rules="[v => !!v || 'Title is required']"
                          required
                        />
                      </v-col>

                      <v-col cols="12" md="6">
                        <v-select
                          v-model="propertyData.type"
                          :items="propertyTypes"
                          label="Property Type"
                          required
                          :rules="[v => !!v || 'Property type is required']"
                        />
                      </v-col>

                      <v-col cols="12" md="6">
                        <v-select
                          v-model="propertyData.status"
                          :items="propertyStatuses"
                          label="Listing Status"
                          required
                          :rules="[v => !!v || 'Status is required']"
                        />
                      </v-col>

                      <v-col cols="12">
                        <v-textarea
                          v-model="propertyData.description"
                          label="Property Description"
                          rows="4"
                          :rules="[v => !!v || 'Description is required']"
                          required
                        />
                      </v-col>
                    </v-row>
                  </v-form>
                </v-card-text>
              </v-card>
            </v-stepper-window-item>

            <!-- Step 2: Details & Features -->
            <v-stepper-window-item value="2">
              <v-card flat>
                <v-card-text>
                  <v-form v-model="isStep2Valid" @submit.prevent>
                    <v-row>
                      <v-col cols="12" sm="6" md="3">
                        <v-text-field
                          v-model="propertyData.beds"
                          label="Bedrooms"
                          type="number"
                          min="0"
                          required
                          :rules="[v => !!v || 'Required']"
                        />
                      </v-col>

                      <v-col cols="12" sm="6" md="3">
                        <v-text-field
                          v-model="propertyData.baths"
                          label="Bathrooms"
                          type="number"
                          min="0"
                          step="0.5"
                          required
                          :rules="[v => !!v || 'Required']"
                        />
                      </v-col>

                      <v-col cols="12" sm="6" md="3">
                        <v-text-field
                          v-model="propertyData.sqft"
                          label="Square Feet"
                          type="number"
                          min="0"
                          required
                          :rules="[v => !!v || 'Required']"
                        />
                      </v-col>

                      <v-col cols="12" sm="6" md="3">
                        <v-text-field
                          v-model="propertyData.yearBuilt"
                          label="Year Built"
                          type="number"
                          min="1800"
                          :max="new Date().getFullYear()"
                          required
                          :rules="[v => !!v || 'Required']"
                        />
                      </v-col>

                      <v-col cols="12">
                        <v-combobox
                          v-model="propertyData.features"
                          :items="commonFeatures"
                          label="Features"
                          multiple
                          chips
                          closable-chips
                        />
                      </v-col>

                      <v-col cols="12" md="6">
                        <v-select
                          v-model="propertyData.parking"
                          :items="parkingOptions"
                          label="Parking"
                        />
                      </v-col>

                      <v-col cols="12" md="6">
                        <v-select
                          v-model="propertyData.heating"
                          :items="heatingOptions"
                          label="Heating"
                        />
                      </v-col>
                    </v-row>
                  </v-form>
                </v-card-text>
              </v-card>
            </v-stepper-window-item>

            <!-- Step 3: Photos & Media -->
            <v-stepper-window-item value="3">
              <v-card flat>
                <v-card-text>
                  <v-form v-model="isStep3Valid" @submit.prevent>
                    <v-row>
                      <v-col cols="12">
                        <v-file-input
                          v-model="propertyImages"
                          label="Property Images"
                          multiple
                          accept="image/*"
                          :rules="[v => v?.length > 0 || 'At least one image is required']"
                          show-size
                          counter
                          chips
                          prepend-icon="mdi-camera"
                        />
                      </v-col>

                      <v-col cols="12">
                        <div class="image-preview-grid">
                          <v-img
                            v-for="(file, index) in imagePreviewUrls"
                            :key="index"
                            :src="file"
                            aspect-ratio="16/9"
                            cover
                            class="image-preview"
                          >
                            <template v-slot:placeholder>
                              <v-row
                                class="fill-height ma-0"
                                align="center"
                                justify="center"
                              >
                                <v-progress-circular
                                  indeterminate
                                  color="grey-lighten-5"
                                />
                              </v-row>
                            </template>
                            <v-btn
                              icon="mdi-close"
                              size="small"
                              color="error"
                              class="remove-image-btn"
                              @click="removeImage(index)"
                            />
                          </v-img>
                        </div>
                      </v-col>

                      <v-col cols="12">
                        <v-text-field
                          v-model="propertyData.videoUrl"
                          label="Video URL (Optional)"
                          placeholder="e.g., YouTube or Vimeo link"
                        />
                      </v-col>

                      <v-col cols="12">
                        <v-text-field
                          v-model="propertyData.virtualTourUrl"
                          label="Virtual Tour URL (Optional)"
                          placeholder="e.g., Matterport or other 3D tour link"
                        />
                      </v-col>
                    </v-row>
                  </v-form>
                </v-card-text>
              </v-card>
            </v-stepper-window-item>

            <!-- Step 4: Location & Price -->
            <v-stepper-window-item value="4">
              <v-card flat>
                <v-card-text>
                  <v-form v-model="isStep4Valid" @submit.prevent>
                    <v-row>
                      <v-col cols="12">
                        <v-text-field
                          v-model="propertyData.address"
                          label="Street Address"
                          required
                          :rules="[v => !!v || 'Address is required']"
                        />
                      </v-col>

                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model="propertyData.city"
                          label="City"
                          required
                          :rules="[v => !!v || 'City is required']"
                        />
                      </v-col>

                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model="propertyData.postalCode"
                          label="Postal Code"
                          required
                          :rules="[v => !!v || 'Postal code is required']"
                        />
                      </v-col>

                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model="propertyData.price"
                          label="Price"
                          type="number"
                          prefix="$"
                          required
                          :rules="[v => !!v || 'Price is required']"
                        />
                      </v-col>

                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model="propertyData.taxes"
                          label="Annual Property Taxes"
                          type="number"
                          prefix="$"
                        />
                      </v-col>

                      <v-col cols="12">
                        <client-only>
                          <l-map
                            ref="map"
                            v-model:zoom="zoom"
                            :center="mapCenter"
                            style="height: 400px"
                            @click="handleMapClick"
                          >
                            <l-tile-layer
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <l-marker
                              v-if="propertyData.latitude && propertyData.longitude"
                              :lat-lng="[propertyData.latitude, propertyData.longitude]"
                            />
                          </l-map>
                        </client-only>
                      </v-col>
                    </v-row>
                  </v-form>
                </v-card-text>
              </v-card>
            </v-stepper-window-item>
          </v-stepper-window>

          <v-divider class="mb-4" />

          <v-card-actions>
            <v-btn
              v-if="currentStep > 1"
              variant="text"
              @click="currentStep--"
            >
              Back
            </v-btn>
            <v-spacer />
            <v-btn
              v-if="currentStep < 4"
              color="primary"
              @click="currentStep++"
              :disabled="!isCurrentStepValid"
            >
              Continue
            </v-btn>
            <v-btn
              v-else
              color="primary"
              :loading="loading"
              :disabled="!isCurrentStepValid"
              @click="submitListing"
            >
              Submit Listing
            </v-btn>
          </v-card-actions>
        </v-stepper>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { LatLng } from 'leaflet'

const currentStep = ref(1)
const loading = ref(false)
const propertyImages = ref<File[]>([])
const imagePreviewUrls = ref<string[]>([])
const zoom = ref(12)
const mapCenter = ref([53.5461, -113.4937]) // Edmonton coordinates

const isStep1Valid = ref(false)
const isStep2Valid = ref(false)
const isStep3Valid = ref(false)
const isStep4Valid = ref(false)

const propertyData = ref({
  title: '',
  type: '',
  status: '',
  description: '',
  beds: 0,
  baths: 0,
  sqft: 0,
  yearBuilt: 0,
  features: [] as string[],
  parking: '',
  heating: '',
  videoUrl: '',
  virtualTourUrl: '',
  address: '',
  city: '',
  postalCode: '',
  price: 0,
  taxes: 0,
  latitude: 0,
  longitude: 0
})

const propertyTypes = [
  'House',
  'Condo',
  'Townhouse',
  'Land'
]

const propertyStatuses = [
  'For Sale',
  'For Rent',
  'Coming Soon'
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

const parkingOptions = [
  'No Parking',
  '1 Car Garage',
  '2 Car Garage',
  '3+ Car Garage',
  'Street Parking',
  'Carport'
]

const heatingOptions = [
  'Forced Air',
  'Radiant',
  'Heat Pump',
  'Electric',
  'Natural Gas',
  'Other'
]

const isCurrentStepValid = computed(() => {
  switch (currentStep.value) {
    case 1: return isStep1Valid.value
    case 2: return isStep2Valid.value
    case 3: return isStep3Valid.value
    case 4: return isStep4Valid.value
    default: return false
  }
})

const handleMapClick = (event: { latlng: LatLng }) => {
  propertyData.value.latitude = event.latlng.lat
  propertyData.value.longitude = event.latlng.lng
}

const removeImage = (index: number) => {
  propertyImages.value = propertyImages.value.filter((_, i) => i !== index)
  imagePreviewUrls.value = imagePreviewUrls.value.filter((_, i) => i !== index)
}

watch(propertyImages, async (files) => {
  imagePreviewUrls.value = []
  for (const file of files) {
    const reader = new FileReader()
    reader.onload = (e) => {
      imagePreviewUrls.value.push(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }
})

const submitListing = async () => {
  loading.value = true
  try {
    const formData = new FormData()
    
    // Append property data
    formData.append('data', JSON.stringify(propertyData.value))
    
    // Append images
    propertyImages.value.forEach((file, index) => {
      formData.append(`image${index}`, file)
    })

    // Replace with actual API call
    await fetch('/api/properties', {
      method: 'POST',
      body: formData
    })

    // Show success message and redirect
    navigateTo('/seller/dashboard')
  } catch (error) {
    console.error('Error submitting listing:', error)
    // Show error message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.image-preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.image-preview {
  position: relative;
  border-radius: 4px;
  overflow: hidden;
}

.remove-image-btn {
  position: absolute;
  top: 8px;
  right: 8px;
}
</style>
