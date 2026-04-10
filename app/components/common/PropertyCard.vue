<template>
  <v-card 
    class="property-card overflow-hidden" 
    flat 
    elevation="0"
    :ripple="false"
  >
    <!-- Image Section with Overlays -->
    <div class="image-wrapper">
      <v-img
        :src="imageSrc"
        :lazy-src="'/images/property-placeholder.svg'"
        :alt="property?.title ?? 'Property Image'"
        height="280"
        width="100%"
        cover
        class="main-image"
        @error="onImgError"
      >
        <!-- Loading State -->
        <template v-slot:placeholder>
          <v-row class="fill-height ma-0" align="center" justify="center" style="background: #f8fafc">
            <v-progress-circular indeterminate color="grey-lighten-2" size="24" />
          </v-row>
        </template>

        <!-- Top Badges Overlay -->
        <div class="badge-overlay d-flex flex-column gap-2 align-start pa-4">
          <v-chip
            v-if="property?.isMLS || property?.source === 'crea' || property?.source === 'pillar9'"
            size="x-small"
            color="white"
            variant="flat"
            class="premium-chip font-weight-bold"
          >
            <v-icon start icon="mdi-home-search" size="14"></v-icon>
            MLS®
          </v-chip>
          
          <v-chip
            v-if="property?.isBuilder || property?.source === 'manual'"
            size="x-small"
            color="black"
            theme="dark"
            variant="flat"
            class="premium-chip font-weight-bold"
          >
            <v-icon start icon="mdi-hammer-wrench" size="14"></v-icon>
            PRE-CONSTRUCTION
          </v-chip>
          
          <v-chip
            v-if="property?.status && property?.status !== 'for_sale'"
            size="x-small"
            :color="getStatusColor(property?.status)"
            variant="flat"
            class="premium-chip font-weight-bold text-uppercase"
          >
            {{ property?.status?.replace('_', ' ') }}
          </v-chip>
        </div>

        <!-- Heart/Save Action -->
        <div class="action-overlay pa-4">
          <v-btn
            v-if="showSaveButton"
            :icon="property?.isSaved ? 'mdi-heart' : 'mdi-heart-outline'"
            :color="property?.isSaved ? 'red' : 'white'"
            variant="flat"
            size="small"
            class="save-btn-blur shadow-sm"
            @click.stop="toggleSave"
          />
        </div>

        <!-- Address Bar (Glassmorphism) -->
        <div class="address-blur pa-3 d-flex align-center">
          <v-icon size="small" color="white" class="mr-2">mdi-map-marker-outline</v-icon>
          <span class="text-caption text-white font-weight-medium text-truncate">
            {{ property?.address ?? 'Address Available' }}, {{ property?.city ?? 'Contact for details' }}
          </span>
        </div>
      </v-img>
    </div>

    <!-- Content Section -->
    <v-card-text class="pa-4">
      <div class="d-flex align-center justify-space-between mb-2">
        <h2 class="text-h6 font-weight-bold price-text mb-0">
          {{ formatPrice(property?.price ?? 0) }}
        </h2>
        <v-chip
          size="x-small"
          :color="getTypeColor(property?.type)"
          variant="tonal"
          class="font-weight-black text-uppercase tracking-wider"
        >
          {{ property?.type ?? 'Property' }}
        </v-chip>
      </div>

      <p class="property-title text-body-2 font-weight-medium text-truncate mb-3">
        {{ property?.title ?? 'Luxury Residence' }}
      </p>

      <div class="features-row d-flex align-center text-caption text-medium-emphasis mb-2">
        <div class="d-flex align-center mr-4">
          <v-icon size="16" class="mr-1">mdi-bed-outline</v-icon>
          <span class="font-weight-bold">{{ property?.beds ?? 0 }}</span>
        </div>
        <div class="d-flex align-center mr-4">
          <v-icon size="16" class="mr-1">mdi-shower-outline</v-icon>
          <span class="font-weight-bold">{{ property?.baths ?? 0 }}</span>
        </div>
        <div class="d-flex align-center">
          <v-icon size="16" class="mr-1">mdi-ruler-square</v-icon>
          <span class="font-weight-bold">{{ property?.sqft ?? 0 }} <small>SQFT</small></span>
        </div>
      </div>
      
      <!-- Additional Details -->
      <div v-if="hasExtraFeatures" class="extra-features d-flex align-center flex-wrap gap-1">
        <v-chip v-if="property?.features?.yearBuilt" size="x-small" variant="outlined" color="grey-darken-1">
          {{ property.features.yearBuilt }}
        </v-chip>
        <v-chip v-if="property?.features?.parking" size="x-small" variant="outlined" color="grey-darken-1">
          <v-icon size="x-small" class="mr-1">mdi-car</v-icon>{{ property.features.parking }}
        </v-chip>
        <v-chip v-if="property?.features?.stories" size="x-small" variant="outlined" color="grey-darken-1">
          {{ property.features.stories }} {{ property.features.stories > 1 ? 'Stories' : 'Story' }}
        </v-chip>
      </div>
    </v-card-text>

    <!-- Footer Actions -->
    <v-card-actions class="px-4 pb-4 pt-0">
      <div class="w-100">
        <div class="d-flex gap-2">
          <v-btn
            variant="flat"
            color="black"
            class="flex-grow-1 text-none font-weight-bold"
            rounded="lg"
            :to="`/property/${property?.id}`"
          >
            View Details
          </v-btn>
          
          <v-btn
            v-if="showContactButton"
            variant="outlined"
            color="black"
            class="text-none font-weight-bold"
            rounded="lg"
            @click.stop="contact"
          >
            <v-icon icon="mdi-email-outline" />
          </v-btn>
        </div>
        
        <div class="listing-attribution mt-3 d-flex align-center">
          <v-icon size="12" color="grey" class="mr-1">mdi-information-outline</v-icon>
          <span class="text-tiny text-grey text-truncate">
            {{ (property?.listingAgent && property?.listingOffice) 
                ? `Courtesy: ${property.listingAgent} | ${property.listingOffice}` 
                : 'MLS® Exclusive Listing' }}
          </span>
        </div>
      </div>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { Property } from '~/types'
import { formatPrice } from '~/utils/formatters'

const props = defineProps<{
  property: Property & Record<string, any>
  showSaveButton?: boolean
  showContactButton?: boolean
}>()

const emit = defineEmits(['save', 'contact'])

// Image handling with fallback
const imageSrc = ref<string>((props.property?.images && props.property.images[0]) || '/images/property-placeholder.svg')

watch(() => props.property, (newVal) => {
  imageSrc.value = (newVal?.images && newVal.images[0]) || '/images/property-placeholder.svg'
}, { deep: true })

const onImgError = () => { 
  if (imageSrc.value !== '/images/property-placeholder.svg') {
    imageSrc.value = '/images/property-placeholder.svg'
  } else {
    imageSrc.value = '/favicon.ico'
  }
}

// Check if property has extra features to display
const hasExtraFeatures = computed(() => {
  const f = props.property?.features
  return f && (f.yearBuilt || f.parking || f.stories)
})

const getStatusColor = (status?: string) => {
  const colors = {
    'for_sale': 'success',
    'for_rent': 'info',
    'sold': 'error',
    'pending': 'warning',
    'off_market': 'grey'
  }
  return colors[status as keyof typeof colors] ?? 'grey'
}

const getTypeColor = (type?: string) => {
  const colors = {
    'house': 'primary',
    'condo': 'secondary',
    'townhouse': 'info',
    'land': 'success'
  }
  return colors[type as keyof typeof colors] ?? 'grey'
}

const toggleSave = (event: Event) => {
  event.stopPropagation()
  emit('save', props.property)
}

const contact = (event: Event) => {
  event.stopPropagation()
  emit('contact', props.property)
}
</script>

<style scoped>
.property-card {
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
  border: 1px solid #f1f5f9;
  background: white;
  border-radius: 20px;
}

.property-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
  border-color: #e2e8f0;
}

.image-wrapper {
  position: relative;
  overflow: hidden;
  border-radius: 18px 18px 0 0;
}

.main-image :deep(.v-img__img) {
  transition: transform 0.8s cubic-bezier(0.165, 0.84, 0.44, 1);
}

.property-card:hover .main-image :deep(.v-img__img) {
  transform: scale(1.08);
}

.badge-overlay {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
}

.action-overlay {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 2;
}

.premium-chip {
  letter-spacing: 0.05em;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.save-btn-blur {
  background: rgba(255, 255, 255, 0.85) !important;
  backdrop-filter: blur(8px);
  border-radius: 12px;
}

.address-blur {
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 2;
}

.price-text {
  color: #0f172a;
  letter-spacing: -0.01em;
}

.property-title {
  color: #475569;
}

.text-tiny {
  font-size: 0.65rem;
  line-height: 1;
}

.tracking-wider {
  letter-spacing: 0.08em;
}

.gap-2 { gap: 8px; }
.gap-1 { gap: 4px; }
</style>