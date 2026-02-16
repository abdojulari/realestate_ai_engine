<template>
  <div class="admin-property-edit px-md-8 py-md-6">
    <v-container fluid>
      <!-- Header -->
      <v-row class="mb-8 align-center">
        <v-col cols="12" md="8">
          <div class="d-flex align-center mb-2">
            <v-btn icon="mdi-arrow-left" variant="text" class="mr-2" @click="$router.back()" />
            <div class="premium-accent-bar mr-4"></div>
            <span class="text-overline letter-spacing-2 text-gold">{{ isNew ? 'New Listing' : 'Edit Listing' }}</span>
          </div>
          <h1 class="display-serif text-h3 mb-1">{{ isNew ? 'Add Manual Property' : 'Edit Property' }}</h1>
          <p class="text-subtitle-1 text-medium-emphasis font-weight-light">
            {{ isNew ? 'Create a builder, FSBO, flip, or other offline listing' : `Editing: ${form.title}` }}
          </p>
        </v-col>
        <v-col cols="12" md="4" class="text-md-right">
          <v-chip v-if="!isNew" variant="tonal" :color="form.source === 'manual' ? 'success' : 'info'" class="mr-2">
            {{ form.source || 'manual' }}
          </v-chip>
        </v-col>
      </v-row>

      <v-form ref="formRef" @submit.prevent="save">
        <v-row>
          <!-- Left: Main fields -->
          <v-col cols="12" lg="8">
            <!-- Basic Info -->
            <v-card class="section-card mb-6" elevation="0">
              <v-card-text class="pa-6">
                <div class="text-h6 font-weight-bold mb-4">Property Details</div>
                <v-row>
                  <v-col cols="12">
                    <v-text-field density="compact" v-model="form.title" label="Listing Title *" variant="outlined" :rules="[v => !!v || 'Required']" placeholder="e.g., Modern 3BR in Beltline – Builder Special" />
                  </v-col>
                  <v-col cols="12">
                    <v-textarea density="compact" v-model="form.description" label="Description" variant="outlined" rows="4" placeholder="Describe the property..." />
                  </v-col>
                  <v-col cols="12" sm="4">
                    <v-text-field density="compact" v-model.number="form.price" label="Price *" variant="outlined" type="number" prefix="$" :rules="[v => v > 0 || 'Required']" />
                  </v-col>
                  <v-col cols="12" sm="4">
                    <v-select density="compact" v-model="form.type" :items="propertyTypes" item-title="label" item-value="value" label="Property Type *" variant="outlined" :rules="[v => !!v || 'Required']" />
                  </v-col>
                  <v-col cols="12" sm="4">
                    <v-select density="compact" v-model="form.status" :items="propertyStatuses" item-title="label" item-value="value" label="Status" variant="outlined" />
                  </v-col>
                  <v-col cols="12" sm="4">
                    <v-text-field density="compact" v-model.number="form.beds" label="Bedrooms *" variant="outlined" type="number" :rules="[v => v >= 0 || 'Required']" />
                  </v-col>
                  <v-col cols="12" sm="4">
                    <v-text-field density="compact" v-model.number="form.baths" label="Bathrooms *" variant="outlined" type="number" step="0.5" :rules="[v => v >= 0 || 'Required']" />
                  </v-col>
                  <v-col cols="12" sm="4">
                    <v-text-field density="compact" v-model.number="form.sqft" label="Sq Ft *" variant="outlined" type="number" :rules="[v => v > 0 || 'Required']" />
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>

            <!-- Location -->
            <v-card class="section-card mb-6" elevation="0">
              <v-card-text class="pa-6">
                <div class="text-h6 font-weight-bold mb-4">Location</div>
                <v-row>
                  <v-col cols="12">
                    <v-text-field density="compact" v-model="form.address" label="Street Address *" variant="outlined" :rules="[v => !!v || 'Required']" />
                  </v-col>
                  <v-col cols="12" sm="4">
                    <v-text-field density="compact" v-model="form.city" label="City *" variant="outlined" :rules="[v => !!v || 'Required']" />
                  </v-col>
                  <v-col cols="12" sm="4">
                    <v-text-field density="compact" v-model="form.province" label="Province" variant="outlined" />
                  </v-col>
                  <v-col cols="12" sm="4">
                    <v-text-field density="compact" v-model="form.postalCode" label="Postal Code" variant="outlined" />
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field density="compact" v-model="form.cityRegion" label="Community / Region" variant="outlined" />
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field density="compact" v-model="form.unitNumber" label="Unit #" variant="outlined" />
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>

            <!-- Extra Details -->
            <v-card class="section-card mb-6" elevation="0">
              <v-card-text class="pa-6">
                <div class="text-h6 font-weight-bold mb-4">Additional Details</div>
                <v-row>
                  <v-col cols="12" sm="4">
                    <v-text-field density="compact" v-model.number="form.yearBuilt" label="Year Built" variant="outlined" type="number" />
                  </v-col>
                  <v-col cols="12" sm="4">
                    <v-text-field density="compact" v-model.number="form.stories" label="Stories" variant="outlined" type="number" />
                  </v-col>
                  <v-col cols="12" sm="4">
                    <v-text-field density="compact" v-model="form.lotSizeDimensions" label="Lot Size" variant="outlined" placeholder="e.g., 50x120" />
                  </v-col>
                  <v-col cols="12" sm="4">
                    <v-text-field density="compact" v-model.number="form.taxAnnualAmount" label="Annual Tax" variant="outlined" type="number" prefix="$" />
                  </v-col>
                  <v-col cols="12" sm="4">
                    <v-text-field density="compact" v-model="form.zoning" label="Zoning" variant="outlined" />
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Right: Images & Actions -->
          <v-col cols="12" lg="4">
            <!-- Images -->
            <v-card class="section-card mb-6" elevation="0">
              <v-card-text class="pa-6">
                <div class="text-h6 font-weight-bold mb-4">Photos</div>
                <v-file-input
                  label="Upload Images"
                  variant="outlined"
                  prepend-icon=""
                  prepend-inner-icon="mdi-camera"
                  accept="image/*"
                  multiple
                  :loading="uploading"
                  @update:model-value="uploadImages as any"
                  class="mb-4"
                  density="compact"
                  hide-details
                />
                <div v-if="form.images.length > 0" class="image-grid">
                  <div v-for="(img, idx) in form.images" :key="idx" class="image-thumb">
                    <v-img :src="img" height="100" cover class="rounded-lg" />
                    <v-btn
                      icon="mdi-close"
                      size="x-small"
                      color="error"
                      variant="flat"
                      class="remove-img-btn"
                      @click="form.images.splice(idx, 1)"
                    />
                  </div>
                </div>
                <div v-else class="text-center py-8 text-medium-emphasis">
                  <v-icon size="48" color="grey-lighten-2" class="mb-2">mdi-image-multiple-outline</v-icon>
                  <div class="text-body-2">No photos yet</div>
                </div>
              </v-card-text>
            </v-card>

            <!-- Actions -->
            <v-card class="section-card" elevation="0">
              <v-card-text class="pa-6">
                <v-btn color="primary" block size="large" class="mb-3 premium-action-btn" :loading="saving" @click="save">
                  <v-icon start>mdi-content-save</v-icon>
                  {{ isNew ? 'Create Listing' : 'Save Changes' }}
                </v-btn>
                <v-btn variant="outlined" block size="large" class="premium-action-btn" @click="$router.back()">
                  Cancel
                </v-btn>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-form>

      <!-- Loading -->
      <v-overlay :model-value="loadingProperty" class="align-center justify-center" contained>
        <v-progress-circular indeterminate size="64" color="primary" />
      </v-overlay>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({ layout: 'admin', middleware: ['admin'] })

const route = useRoute()
const router = useRouter()
const id = computed(() => route.params.id as string)
const isNew = computed(() => id.value === 'new')

const getAuthHeaders = (): Record<string, string> => {
  if (process.client) {
    const token = localStorage.getItem('token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }
  return {}
}

const loadingProperty = ref(false)
const saving = ref(false)
const uploading = ref(false)
const formRef = ref<any>(null)

const form = ref<any>({
  title: '',
  description: '',
  price: 0,
  type: 'house',
  status: 'for_sale',
  beds: 0,
  baths: 0,
  sqft: 0,
  address: '',
  city: '',
  province: 'AB',
  postalCode: '',
  cityRegion: '',
  unitNumber: '',
  yearBuilt: null,
  stories: null,
  lotSizeDimensions: '',
  taxAnnualAmount: null,
  zoning: '',
  images: [] as string[],
  source: 'manual',
})

const propertyTypes = [
  { label: 'House', value: 'house' },
  { label: 'Condo', value: 'condo' },
  { label: 'Townhouse', value: 'townhouse' },
  { label: 'Duplex', value: 'duplex' },
  { label: 'Multi-Family', value: 'multi-family' },
  { label: 'Land', value: 'land' },
]

const propertyStatuses = [
  { label: 'For Sale', value: 'for_sale' },
  { label: 'Pending', value: 'pending' },
  { label: 'Sold', value: 'sold' },
  { label: 'For Rent', value: 'for_rent' },
]

async function loadProperty() {
  if (isNew.value) return
  loadingProperty.value = true
  try {
    const res = await $fetch(`/api/admin/properties/${id.value}`, { headers: getAuthHeaders() }) as any
    if (res.property) {
      const p = res.property
      form.value = {
        title: p.title || '',
        description: p.description || '',
        price: p.price || 0,
        type: p.type || 'house',
        status: p.status || 'for_sale',
        beds: p.beds || 0,
        baths: p.baths || 0,
        sqft: p.sqft || 0,
        address: p.address || '',
        city: p.city || '',
        province: p.province || 'AB',
        postalCode: p.postalCode || '',
        cityRegion: p.cityRegion || '',
        unitNumber: p.unitNumber || '',
        yearBuilt: p.yearBuilt || null,
        stories: p.stories || null,
        lotSizeDimensions: p.lotSizeDimensions || '',
        taxAnnualAmount: p.taxAnnualAmount || null,
        zoning: p.zoning || '',
        images: Array.isArray(p.images) ? p.images : [],
        source: p.source || 'manual',
      }
    }
  } catch (e: any) {
    console.error('Error loading property:', e)
  } finally {
    loadingProperty.value = false
  }
}

async function uploadImages(files: File[] | null) {
  if (!files || files.length === 0) return
  uploading.value = true
  try {
    for (const file of files) {
      const fd = new FormData()
      fd.append('file', file)
      const res = await $fetch('/api/admin/properties/upload-image', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: fd,
      }) as any
      if (res.url) {
        form.value.images.push(res.url)
      }
    }
  } catch (e: any) {
    console.error('Upload error:', e)
  } finally {
    uploading.value = false
  }
}

async function save() {
  const { valid } = await formRef.value?.validate() || { valid: true }
  if (!valid) return

  saving.value = true
  try {
    if (isNew.value) {
      const res = await $fetch('/api/admin/properties', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: form.value,
      }) as any
      if (res.success) {
        router.push('/admin/properties')
      }
    } else {
      await $fetch(`/api/admin/properties/${id.value}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: form.value,
      })
      router.push('/admin/properties')
    }
  } catch (e: any) {
    console.error('Save error:', e)
  } finally {
    saving.value = false
  }
}

onMounted(loadProperty)
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;600;700&display=swap');

.admin-property-edit {
  background-color: #fcfcfb;
  font-family: 'Inter', sans-serif;
  min-height: 100vh;
}
.display-serif { font-family: 'Playfair Display', serif; }
.text-gold { color: #8c734b; }
.letter-spacing-2 { letter-spacing: 2px; }
.premium-accent-bar { width: 40px; height: 4px; background: #8c734b; border-radius: 2px; }

.section-card {
  border-radius: 20px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  background: white !important;
}

.premium-action-btn {
  border-radius: 12px !important;
  text-transform: none !important;
  font-weight: 700 !important;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.image-thumb {
  position: relative;
}

.remove-img-btn {
  position: absolute;
  top: 4px;
  right: 4px;
}
</style>
