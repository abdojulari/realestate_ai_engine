<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      {{ title }}
      <v-spacer />
      <v-btn
        v-if="collapsible"
        icon="mdi-chevron-down"
        variant="text"
        :class="{ 'rotate-180': !collapsed }"
        @click="collapsed = !collapsed"
      />
    </v-card-title>

    <v-expand-transition>
      <v-card-text v-show="!collapsed">
        <!-- Basic Info -->
        <v-row class="mb-6">
          <v-col
            v-for="(info, index) in basicInfo"
            :key="index"
            cols="6"
            sm="4"
            md="3"
          >
            <div class="feature-item">
              <v-icon
                :icon="info.icon"
                color="primary"
                class="mb-2"
              />
              <div class="text-h6">{{ info.value }}</div>
              <div class="text-caption text-grey">{{ info.label }}</div>
            </div>
          </v-col>
        </v-row>

        <!-- Features Grid -->
        <v-row v-if="features.length">
          <v-col
            v-for="(feature, index) in features"
            :key="index"
            cols="12"
            sm="6"
            md="4"
          >
            <div class="d-flex align-center feature-list-item">
              <v-icon
                :icon="getFeatureIcon(feature)"
                color="primary"
                class="mr-2"
              />
              <span>{{ feature }}</span>
            </div>
          </v-col>
        </v-row>

        <!-- Additional Details -->
        <template v-if="showDetails">
          <v-divider class="my-6" />
          
          <v-row>
            <v-col
              v-for="(detail, key) in details"
              :key="key"
              cols="12"
              sm="6"
            >
              <div class="d-flex justify-space-between mb-2">
                <span class="text-grey">{{ formatLabel(key) }}</span>
                <span class="font-weight-medium">{{ detail }}</span>
              </div>
            </v-col>
          </v-row>
        </template>
      </v-card-text>
    </v-expand-transition>
  </v-card>
</template>

<script setup lang="ts">
const props = defineProps({
  title: {
    type: String,
    default: 'Property Features'
  },
  collapsible: {
    type: Boolean,
    default: false
  },
  beds: {
    type: [Number, String],
    required: true
  },
  baths: {
    type: [Number, String],
    required: true
  },
  sqft: {
    type: [Number, String],
    required: true
  },
  yearBuilt: {
    type: [Number, String],
    default: ''
  },
  features: {
    type: Array as () => string[],
    default: () => []
  },
  details: {
    type: Object as () => Record<string, any>,
    default: () => ({})
  },
  showDetails: {
    type: Boolean,
    default: true
  }
})

const collapsed = ref(false)

const basicInfo = computed(() => [
  {
    icon: 'mdi-bed',
    value: props.beds,
    label: 'Bedrooms'
  },
  {
    icon: 'mdi-shower',
    value: props.baths,
    label: 'Bathrooms'
  },
  {
    icon: 'mdi-ruler-square',
    value: props.sqft,
    label: 'Square Feet'
  },
  {
    icon: 'mdi-home-clock',
    value: props.yearBuilt,
    label: 'Year Built'
  }
])

const getFeatureIcon = (feature: string) => {
  const icons: Record<string, string> = {
    'Garage': 'mdi-garage',
    'Pool': 'mdi-pool',
    'Waterfront': 'mdi-waves',
    'Central AC': 'mdi-snowflake',
    'Fireplace': 'mdi-fireplace',
    'Basement': 'mdi-stairs',
    'Smart Home': 'mdi-home-automation',
    'Solar Panels': 'mdi-solar-power',
    'Garden': 'mdi-flower',
    'Security System': 'mdi-shield-home',
    'Deck': 'mdi-deck',
    'Balcony': 'mdi-balcony',
    'Gym': 'mdi-dumbbell',
    'Elevator': 'mdi-elevator',
    'Storage': 'mdi-package-variant-closed',
    'Parking': 'mdi-car',
    'Laundry': 'mdi-washing-machine',
    'Pet Friendly': 'mdi-paw'
  }

  return icons[feature] || 'mdi-check-circle'
}

const formatLabel = (key: string) => {
  return key
    .split(/(?=[A-Z])/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
</script>

<style scoped>
.feature-item {
  text-align: center;
  padding: 16px;
  border-radius: 8px;
  background: #f5f5f5;
  height: 100%;
}

.feature-list-item {
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.feature-list-item:hover {
  background: #f5f5f5;
}

.rotate-180 {
  transform: rotate(180deg);
}

:deep(.v-icon) {
  transition: transform 0.3s ease;
}
</style>
