<template>
  <v-card 
    class="modern-property-card" 
    @click="$emit('click')"
    elevation="0"
  >
    <div class="property-image">
      <v-img
        :src="imageSrc"
        :lazy-src="'/images/property-placeholder.svg'"
        :alt="property.title"
        height="200"
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
          v-if="property?.isMLS || property.source === 'crea'"
          color="primary"
          size="small"
          class="ma-3"
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
          class="ma-3"
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
        :color="property.isSaved ? 'red' : 'grey-darken-3'"
        variant="text"
        size="large"
        class="save-button"
        @click.stop="toggleSave"
      />
    </v-img>
      <div class="property-location">
        <v-icon size="small" class="location-icon">mdi-map-marker</v-icon>
        {{ property.city }}, {{ property.province }}
      </div>
    </div>
    
    <v-card-text class="property-details">
      <div class="text-body-1 font-weight-bold mb-1">{{ property.title }}, {{ property.city }}, {{ property.province }}</div>
      <div class="property-specs">
        <span class="spec-item">
          <v-icon size="small">mdi-bed</v-icon>
          {{ property.beds }} Beds
        </span>
        <span class="spec-item">
          <v-icon size="small">mdi-shower</v-icon>
          {{ property.baths }} Baths
        </span>
        <span class="spec-item">
          <v-icon size="small">mdi-ruler-square</v-icon>
          {{ property.sqft }}sqft
        </span>
      </div>
      
      <v-btn 
        variant="outlined" 
        color="grey-darken-3" 
        size="small"
        class="get-started-btn text-none"
        @click.stop="$emit('click')"
      >
        Get Started
      </v-btn>
      
      <div class="property-price d-flex ">
        {{ formatPrice(property.price || 0) }}
        <v-spacer />
        <v-chip
          size="small"
          :color="getTypeColor(property.type)"
        >
          {{ property.type }}
        </v-chip>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { formatPrice } from '../../../utils/formatters'
import type { Property } from '~/types'

const props = defineProps<{
  property: Property
  showSaveButton?: boolean
  showContactButton?: boolean
}>()


const emit = defineEmits(['click', 'save', 'contact'])


const imageSrc = ref<string>((props.property.images?.[0]?.url || props.property.images?.[0]) || '/images/property-placeholder.svg')

watch(() => props.property, (p) => {
  imageSrc.value = (p?.images?.[0]?.url || p?.images?.[0]) || '/images/property-placeholder.svg'
}, { deep: true })

const onImgError = () => { 
  if (imageSrc.value !== '/images/property-placeholder.svg') {
    imageSrc.value = '/images/property-placeholder.svg'
  } else {
    imageSrc.value = '/favicon.ico'
  }
}

const toggleSave = (event: Event) => {
  event.stopPropagation()
  emit('save', props.property)
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

</script>

<style scoped>
.modern-property-card {
  background: #f5f5f5;
  overflow: hidden;
  /* box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08); */
  transition: all 0.3s ease;
  cursor: pointer;
  max-width: 400px;
}

/* .modern-property-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 15px 50px rgba(0, 0, 0, 0.15);
} */

.property-image {
  position: relative;
  height: 200px;
  overflow: hidden;
}

.property-img {
  width: 100%;
  height: 100%;
  transition: transform 0.3s ease;
}

.modern-property-card:hover .property-img {
  transform: scale(1.05);
}

.property-location {
  position: absolute;
  bottom: 3.5rem;
  left: 1rem;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.location-icon {
  color: #ffd700;
}

.property-details {
  padding: 1.5rem;
}

.property-specs {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.spec-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.85rem;
  color: #6c757d;
}

.spec-item .v-icon {
  color: #adb5bd;
}

.get-started-btn {
  margin-bottom: 1rem;
  border-radius: 8px;
}

.property-price {
  font-size: 1.3rem;
  font-weight: 700;
  color: #2c3e50;
}
</style>
