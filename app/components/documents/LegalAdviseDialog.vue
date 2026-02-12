<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="720" scrollable persistent>
    <v-card rounded="xl" class="premium-dialog">
      <v-card-title class="d-flex align-center dialog-title">
        <v-icon icon="mdi-gavel" class="mr-2" />
        Legal Advise – {{ doc?.originalName }}
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" @click="$emit('update:modelValue', false)" />
      </v-card-title>
      <v-card-text class="legal-advise-body">
        <p class="text-caption text-grey mb-4">AI-powered summary of red flags, important dates, and impact for buyer/seller. Set email reminders so you never miss deadlines.</p>

        <div v-if="loading" class="text-center py-8">
          <v-progress-circular indeterminate color="primary" />
          <p class="mt-2 text-body-2">Loading review...</p>
        </div>

        <template v-else-if="!reviewData?.review">
          <p class="text-body-2 text-grey">No legal review yet. Click <strong>Legal Review</strong> in the sidebar or table first to analyze terms, conditions, and important dates.</p>
        </template>

        <template v-else>
          <div class="mb-4">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">Red flags</h3>
            <ul v-if="(reviewData.review.redFlags || []).length" class="legal-list">
              <li v-for="(item, i) in reviewData.review.redFlags" :key="i">{{ item }}</li>
            </ul>
            <p v-else class="text-caption text-grey">None identified.</p>
          </div>
          <div class="mb-4">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">Important notes</h3>
            <ul v-if="(reviewData.review.importantNotes || []).length" class="legal-list">
              <li v-for="(item, i) in reviewData.review.importantNotes" :key="i">{{ item }}</li>
            </ul>
            <p v-else class="text-caption text-grey">None.</p>
          </div>
          <div class="mb-4">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">Important dates</h3>
            <ul v-if="(reviewData.review.importantDates || []).length" class="legal-list">
              <li v-for="(d, i) in reviewData.review.importantDates" :key="i">
                <strong>{{ d.label }}</strong>: {{ d.date }}{{ d.context ? ` – ${d.context}` : '' }}
              </li>
            </ul>
            <p v-else class="text-caption text-grey">None extracted.</p>
          </div>
          <div class="mb-4">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">Legal summary</h3>
            <p class="text-body-2" style="white-space: pre-wrap;">{{ reviewData.review.legalSummary }}</p>
          </div>
          <div class="mb-4">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">Buyer impact</h3>
            <p class="text-body-2" style="white-space: pre-wrap;">{{ reviewData.review.buyerImpact }}</p>
          </div>
          <div class="mb-4">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">Seller impact</h3>
            <p class="text-body-2" style="white-space: pre-wrap;">{{ reviewData.review.sellerImpact }}</p>
          </div>

          <v-divider class="my-4" />
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Set automation alerts for important dates</h3>
          <p class="text-caption text-grey mb-3">Reminders will be emailed to you and super admins before each date.</p>
          <div v-for="(item, i) in dateAlerts" :key="i" class="d-flex align-center mb-2">
            <v-checkbox v-model="item.enabled" hide-details density="compact" class="mr-2 flex-grow-0" />
            <span class="flex-grow-1">{{ item.label }} – {{ item.date }}</span>
            <v-text-field v-model.number="item.daysBefore" type="number" min="1" max="30" density="compact" hide-details style="width: 80px;" suffix="days before" />
          </div>
          <v-btn color="primary" variant="flat" class="mt-3" :loading="savingAlerts" :disabled="!doc" @click="$emit('save-alerts', dateAlerts)">
            Set automation alerts
          </v-btn>
        </template>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: boolean
  doc: any
  reviewData: { review: any; dateAlerts: any[] } | null
  loading: boolean
  dateAlerts: Array<{ label: string; date: string; enabled: boolean; daysBefore: number }>
  savingAlerts: boolean
}>()

defineEmits<{
  'update:modelValue': [val: boolean]
  'save-alerts': [alerts: Array<{ label: string; date: string; enabled: boolean; daysBefore: number }>]
}>()
</script>

<style scoped>
.premium-dialog { background: rgba(255, 255, 255, 0.98) !important; backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.8); box-shadow: 0 20px 60px rgba(31, 38, 135, 0.3) !important; }
.dialog-title { font-weight: 700; font-size: 1.25rem; border-bottom: 1px solid rgba(0, 0, 0, 0.06); padding: 20px 24px !important; }
.legal-advise-body { max-height: 70vh; overflow-y: auto; }
.legal-list { margin: 0; padding-left: 1.25rem; font-size: 0.9rem; }
.legal-list li { margin-bottom: 0.25rem; }
</style>
