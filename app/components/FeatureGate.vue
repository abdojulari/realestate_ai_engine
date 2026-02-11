<script setup lang="ts">
/**
 * FeatureGate Component
 * 
 * Conditionally renders content based on license tier.
 * Shows upgrade prompt if feature is not available.
 */
import { computed } from 'vue'
import { useLicense, type Feature, type LicenseTier } from '~/composables/useLicense'

const props = defineProps<{
  feature: Feature
  showUpgradePrompt?: boolean
  hideCompletely?: boolean
}>()

const { hasFeature, getUpgradeRecommendation, tierDisplayName } = useLicense()

const isAvailable = computed(() => hasFeature(props.feature))
const recommendedTier = computed(() => getUpgradeRecommendation(props.feature))

const tierNames: Record<LicenseTier, string> = {
  free: 'Free',
  basic: 'Basic',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  enterprise: 'Enterprise',
}
</script>

<template>
  <slot v-if="isAvailable" />
  
  <template v-else-if="!hideCompletely">
    <slot name="unavailable">
      <v-card
        v-if="showUpgradePrompt"
        class="text-center pa-6 bg-grey-darken-3"
        variant="outlined"
      >
        <v-icon size="48" color="warning" class="mb-4">mdi-lock</v-icon>
        <h3 class="text-h6 mb-2">Feature Not Available</h3>
        <p class="text-body-2 text-grey mb-4">
          This feature requires the <strong>{{ tierNames[recommendedTier!] }}</strong> plan or higher.
          <br />
          You are currently on the <strong>{{ tierDisplayName }}</strong> plan.
        </p>
        <v-btn color="primary" variant="flat">
          Upgrade Plan
        </v-btn>
      </v-card>
    </slot>
  </template>
</template>
