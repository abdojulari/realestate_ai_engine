<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="720" scrollable>
    <v-card rounded="xl" class="premium-dialog">
      <v-card-title class="d-flex align-center dialog-title">
        <v-icon icon="mdi-gavel" class="mr-2" />
        Compliance Review – {{ doc?.originalName }}
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" @click="$emit('update:modelValue', false)" />
      </v-card-title>
      <v-card-text class="legal-advise-body">
        <p class="text-caption text-grey mb-4">AI-generated summary of red flags, important dates, and buyer/seller impact. Set email reminders so deadlines aren't missed.</p>

        <div v-if="loading" class="text-center py-8">
          <v-progress-circular indeterminate color="primary" />
          <p class="mt-2 text-body-2">Loading review...</p>
        </div>

        <template v-else-if="!reviewData?.review">
          <p class="text-body-2 text-grey">No compliance review yet. Click <strong>Run Compliance Review</strong> in the sidebar or table first to analyze terms, conditions, and important dates.</p>
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
            <h3 class="text-subtitle-1 font-weight-bold mb-2 d-flex align-center">
              Important dates
              <v-spacer />
              <v-btn
                v-if="hasAnyEnabledAlert"
                size="x-small"
                variant="tonal"
                color="primary"
                prepend-icon="mdi-calendar-plus"
                class="text-none"
                @click="downloadCalendar"
              >Add all to calendar (.ics)</v-btn>
            </h3>
            <ul v-if="(reviewData.review.importantDates || []).length" class="legal-list">
              <li v-for="(d, i) in reviewData.review.importantDates" :key="i" class="d-flex align-center">
                <span class="flex-grow-1">
                  <strong>{{ d.label }}</strong>: {{ d.date }}{{ d.context ? ` – ${d.context}` : '' }}
                </span>
                <a
                  :href="googleUrlFor(d)"
                  target="_blank"
                  rel="noopener"
                  class="ml-2 text-caption google-cal-link"
                  title="Add to Google Calendar"
                >
                  <v-icon size="14" class="mr-1">mdi-google</v-icon>Google
                </a>
              </li>
            </ul>
            <p v-else class="text-caption text-grey">None extracted.</p>
          </div>
          <div class="mb-4">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">Plain-English summary</h3>
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
          <div class="d-flex flex-wrap ga-2 mt-3">
            <v-btn
              color="primary"
              variant="flat"
              prepend-icon="mdi-email-fast-outline"
              :loading="savingAlerts"
              :disabled="!doc || !hasAnyEnabledAlert"
              @click="$emit('save-alerts', dateAlerts)"
            >Set email reminders</v-btn>
            <v-btn
              color="primary"
              variant="tonal"
              prepend-icon="mdi-calendar-plus"
              :disabled="!hasAnyEnabledAlert"
              @click="downloadCalendar"
            >Add to calendar (.ics)</v-btn>
          </div>
          <p class="text-caption text-grey mt-2 mb-0">
            <v-icon size="14" class="mr-1">mdi-information-outline</v-icon>
            Email reminders go to you and super admins. The .ics file imports into Apple Calendar, Outlook, Google Calendar &amp; more.
          </p>

          <v-divider class="my-4" />
          <p class="text-caption text-medium-emphasis mb-0">
            <v-icon size="14" class="mr-1" color="warning">mdi-shield-alert-outline</v-icon>
            <strong>Informational only — not legal advice.</strong>
            This compliance review is generated by AI to help you summarize a contract and surface
            important dates. It is not a substitute for legal counsel and may contain errors. Always
            confirm critical dates and terms against the original document and consult a licensed
            lawyer for legal questions.
          </p>
        </template>
      </v-card-text>

      <v-divider />
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  buildGoogleCalendarUrl,
  buildIcsCalendar,
  downloadIcs,
  safeFilename,
  type CalendarEventInput,
} from '~/utils/calendar'

const props = defineProps<{
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

/** Pull "context" from the AI review when available, by matching label+date. */
function contextFor(label: string, date: string): string | undefined {
  const list = (props.reviewData?.review?.importantDates as Array<any> | undefined) || []
  const hit = list.find((d) => d?.label === label && d?.date === date)
  return hit?.context
}

const hasAnyEnabledAlert = computed(() =>
  (props.dateAlerts || []).some((a) => a.enabled && a.date),
)

function googleUrlFor(d: { label: string; date: string; context?: string }) {
  // Use a sensible default reminder window matching the dialog's other dates.
  const matchingAlert = (props.dateAlerts || []).find(
    (a) => a.label === d.label && a.date === d.date,
  )
  const ev: CalendarEventInput = {
    label: d.label,
    date: d.date,
    daysBefore: matchingAlert?.daysBefore ?? 2,
    context: d.context,
  }
  return buildGoogleCalendarUrl(ev, props.doc?.originalName)
}

function downloadCalendar() {
  const events: CalendarEventInput[] = (props.dateAlerts || [])
    .filter((a) => a.enabled && a.date)
    .map((a) => ({
      label: a.label,
      date: a.date,
      daysBefore: a.daysBefore,
      context: contextFor(a.label, a.date),
    }))
  if (!events.length) return
  const ics = buildIcsCalendar(events, {
    documentName: props.doc?.originalName,
    documentId: props.doc?.id,
  })
  downloadIcs(`${safeFilename(props.doc?.originalName || 'document')}-dates`, ics)
}
</script>

<style scoped>
.premium-dialog { background: rgba(255, 255, 255, 0.98) !important; backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.8); box-shadow: 0 20px 60px rgba(31, 38, 135, 0.3) !important; }
.dialog-title { font-weight: 700; font-size: 1.25rem; border-bottom: 1px solid rgba(0, 0, 0, 0.06); padding: 20px 24px !important; }
.legal-advise-body { max-height: 70vh; overflow-y: auto; }
.legal-list { margin: 0; padding-left: 1.25rem; font-size: 0.9rem; }
.legal-list li { margin-bottom: 0.35rem; }
.google-cal-link {
  display: inline-flex;
  align-items: center;
  color: #1976d2;
  text-decoration: none;
  font-weight: 600;
  white-space: nowrap;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(25, 118, 210, 0.08);
  transition: background 0.15s ease;
}
.google-cal-link:hover { background: rgba(25, 118, 210, 0.16); }
</style>
