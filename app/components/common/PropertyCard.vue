<template>
  <v-card class="property-card h-100" flat color="grey-lighten-5">
    <v-img
      :src="imageSrc"
      :lazy-src="'/images/property-placeholder.svg'"
      :alt="property.title"
      height="250"
      cover
      class="property-image"
      @error="onImgError"
    >
      <template v-slot:placeholder>
        <v-row class="fill-height ma-0" align="center" justify="center">
          <v-progress-circular indeterminate color="grey-lighten-5" />
        </v-row>
      </template>

      <!-- Source and Status Badges -->
      <div class="status-overlay">
        <!-- MLS Badge -->
        <v-chip
          v-if="property.isMLS || property.source === 'crea'"
          color="primary"
          size="small"
          class="mb-1"
          variant="flat"
        >
          <v-icon start icon="mdi-home-search"></v-icon>
          MLS
        </v-chip>
        
        <!-- Builder Badge -->
        <v-chip
          v-if="property?.isBuilder || property.source === 'manual'"
          color="green"
          size="small"
          class="mb-1"
          variant="flat"
        >
          <v-icon start icon="mdi-hammer-wrench"></v-icon>
          PRE-CONSTRUCTION
        </v-chip>
        
        <!-- Status Badge -->
        <v-chip
          v-if="property.status !== 'for_sale'"
          :color="getStatusColor(property.status)"
          size="small"
        >
          {{ property.status }}
        </v-chip>
      </div>

      <!-- Save Button -->
      <v-btn
        v-if="showSaveButton"
        icon="mdi-heart"
        :color="property.isSaved ? 'red' : undefined"
        variant="text"
        size="large"
        class="save-button"
        @click.stop="toggleSave"
      />
    </v-img>

    <v-card-text>
      <!-- Price -->
      <div class="d-flex align-center mb-2">
        <span class="text-h5">{{ formatPrice(property.price) }}</span>
        <v-spacer />
        <v-chip
          size="small"
          :color="getTypeColor(property.type)"
        >
          {{ property.type }}
        </v-chip>
      </div>

      <!-- Title -->
      <div class="text-subtitle-1 font-weight-bold mb-1">{{ property.title }}</div>

      <!-- Address -->
      <div class="text-body-2 text-grey mb-3">{{ property.address }}, {{ property.city }}, {{ property.province }}, {{ property.postalCode }}</div>
      
      <!-- Features -->
      <div class="d-flex align-center text-body-2 text-grey">
        <v-icon size="small" class="mr-1">mdi-bed</v-icon>
        <span class="mr-3">{{ property.beds }}</span>

        <v-icon size="small" class="mr-1">mdi-shower</v-icon>
        <span class="mr-3">{{ property.baths }}</span>

        <v-icon size="small" class="mr-1">mdi-ruler-square</v-icon>
        <span>{{ property.sqft }} sqft</span>
      </div>
    </v-card-text>

    <v-divider />

    <v-card-actions>
      <v-btn
        variant="text"
        :to="`/property/${property.id}`"
        class="text-none"
      >
        View Details
      </v-btn>
      <v-spacer />
      <v-btn
        v-if="showContactButton"
        variant="text"
        prepend-icon="mdi-phone"
        class="text-none"
        @click="contact"
      >
        Contact Agent
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import type { Property } from '~/types'
import { formatPrice } from '../../../utils/formatters'

const props = defineProps<{
  property: Property
  showSaveButton?: boolean
  showContactButton?: boolean
}>()

const emit = defineEmits(['save', 'contact'])

const imageSrc = ref<string>((props.property.images && props.property.images[0]) || '/images/property-placeholder.svg')
watch(() => props.property, (p) => {
  imageSrc.value = (p?.images && p.images[0]) || '/images/property-placeholder.svg'
}, { deep: true })
const onImgError = () => { 
  // Try the generic placeholder first, then favicon as last resort
  if (imageSrc.value !== '/images/property-placeholder.svg') {
    imageSrc.value = '/images/property-placeholder.svg'
  } else {
    imageSrc.value = '/favicon.ico'
  }
}

const getStatusColor = (status: string) => {
  const colors = {
    'for_sale': 'success',
    'for_rent': 'info',
    'sold': 'error',
    'pending': 'warning',
    'off_market': 'grey'
  }
  return colors[status as keyof typeof colors] || 'grey'
}

const getTypeColor = (type: string) => {
  const colors = {
    'house': 'primary',
    'condo': 'secondary',
    'townhouse': 'info',
    'land': 'success'
  }
  return colors[type as keyof typeof colors] || 'grey'
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
  transition: transform 0.2s ease;
}

.property-card:hover {
  transform: translateY(-4px);
}

.property-image {
  position: relative;
}

.status-overlay {
  position: absolute;
  top: 12px;
  left: 12px;
}

.save-button {
  position: absolute;
  top: 8px;
  right: 8px;
}

.property-image :deep(.v-img__img) {
  transition: transform 0.3s ease;
}

.property-card:hover .property-image :deep(.v-img__img) {
  transform: scale(1.05);
}
</style>
