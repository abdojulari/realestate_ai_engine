<template>
  <v-dialog :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)" max-width="720" persistent scrollable>
    <v-card class="rounded-xl celebration-dialog">
      <v-card-title class="pa-6 d-flex align-center">
        <div>
          <div class="text-overline letter-spacing-2 text-gold">{{ kindMeta.overline }}</div>
          <div class="display-serif text-h5">{{ kindMeta.title }}</div>
          <div v-if="recipientLabel" class="text-caption text-medium-emphasis mt-1">to {{ recipientLabel }}</div>
        </div>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" @click="emit('update:modelValue', false)" />
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-6">
        <!-- Mode selector -->
        <v-btn-toggle
          v-model="mode"
          color="primary"
          divided
          density="comfortable"
          mandatory
          class="mb-5"
          rounded="lg"
        >
          <v-btn value="auto" prepend-icon="mdi-flash">Use Template</v-btn>
          <v-btn value="custom" prepend-icon="mdi-pencil">Custom Message</v-btn>
        </v-btn-toggle>

        <!-- Auto preview / Custom editor -->
        <template v-if="mode === 'auto'">
          <div class="text-overline text-medium-emphasis mb-1">Subject</div>
          <div class="preview-box mb-4">{{ renderedSubject }}</div>
          <div class="text-overline text-medium-emphasis mb-1">Message Preview</div>
          <div class="preview-box html-preview" v-html="renderedBody" />
          <p class="text-caption text-medium-emphasis mt-3">
            <v-icon size="14" class="mr-1">mdi-information-outline</v-icon>
            Sent with your saved template. Edit the template under
            <NuxtLink to="/admin/crm/celebrations" class="text-primary">Celebrations Settings</NuxtLink>.
          </p>
        </template>
        <template v-else>
          <v-text-field
            v-model="customSubject"
            label="Subject"
            variant="outlined"
            density="comfortable"
            class="mb-3"
            :placeholder="defaultSubject"
          />
          <v-textarea
            v-model="customBody"
            label="Message (HTML supported)"
            variant="outlined"
            density="comfortable"
            rows="9"
            :placeholder="defaultBody"
            hint="Placeholders: {{firstName}} {{lastName}} {{adminName}} {{year}}"
            persistent-hint
          />
          <div class="d-flex justify-end mt-2">
            <v-btn
              size="small"
              variant="text"
              prepend-icon="mdi-restore"
              @click="loadDefault"
            >Reset to template</v-btn>
          </div>
        </template>

        <!-- Bulk options (for fixed/open holidays) -->
        <template v-if="bulk">
          <v-divider class="my-5" />
          <div class="text-overline letter-spacing-1 mb-2">Recipients</div>
          <v-alert
            type="info"
            variant="tonal"
            density="compact"
            class="mb-2"
            border="start"
          >
            <div class="text-body-2">
              This will send to <strong>{{ bulkEligibleCount ?? '—' }}</strong> active clients with email.
              Clients in your <strong>holiday exception list</strong> for this kind are skipped automatically.
            </div>
          </v-alert>
        </template>
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-6">
        <span v-if="lastResultText" class="text-caption text-medium-emphasis">
          <v-icon size="14" :color="lastResultColor" class="mr-1">{{ lastResultIcon }}</v-icon>
          {{ lastResultText }}
        </span>
        <v-spacer />
        <v-btn variant="text" @click="emit('update:modelValue', false)">Close</v-btn>
        <v-btn
          color="primary"
          :loading="sending"
          :disabled="sendDisabled"
          @click="onSend"
          class="premium-action-btn"
        >
          <v-icon start>mdi-send</v-icon>
          {{ bulk ? `Send to ${bulkEligibleCount ?? 'All'}` : 'Send Wishes' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Recipient {
  id?: number
  firstName?: string
  lastName?: string
  email?: string | null
}

interface DefaultsMap {
  [key: string]: { subject: string; body: string }
}

const props = defineProps<{
  modelValue: boolean
  kind: 'birthday' | 'anniversary' | 'closing' | 'christmas' | 'new_year' | 'eid'
  recipient?: Recipient | null  // for single-client send
  bulk?: boolean                 // true → bulk-send (christmas/new_year/eid)
  bulkEligibleCount?: number | null
  defaults?: DefaultsMap         // from /api/admin/crm/celebrations/settings
  adminName?: string             // tenant admin's full name (placeholder fallback)
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'sent', payload: { kind: string; mode: 'auto' | 'custom'; result: any }): void
}>()

const KIND_META: Record<string, { overline: string; title: string }> = {
  birthday:    { overline: 'Birthday',           title: 'Send Birthday Wishes' },
  anniversary: { overline: 'Wedding Anniversary',title: 'Send Anniversary Wishes' },
  closing:     { overline: 'Closing Anniversary',title: 'Thank You — One Year On' },
  christmas:   { overline: 'Christmas',          title: 'Send Christmas Wishes' },
  new_year:    { overline: 'New Year',           title: 'Send New Year Wishes' },
  eid:         { overline: 'Eid',                title: 'Send Eid Wishes' },
}

const kindMeta = computed(() => KIND_META[props.kind] ?? { overline: 'Celebration', title: 'Send Wishes' })
const recipientLabel = computed(() => {
  if (!props.recipient) return ''
  const name = [props.recipient.firstName, props.recipient.lastName].filter(Boolean).join(' ')
  return props.recipient.email ? `${name} <${props.recipient.email}>` : name
})

const mode = ref<'auto' | 'custom'>('auto')
const customSubject = ref('')
const customBody = ref('')
const sending = ref(false)
const lastResult = ref<{ ok: boolean; message: string } | null>(null)

const defaultSubject = computed(() => props.defaults?.[props.kind]?.subject ?? '')
const defaultBody = computed(() => props.defaults?.[props.kind]?.body ?? '')

function renderPlaceholders(template: string): string {
  if (!template) return ''
  const vars: Record<string, string> = {
    firstName: props.recipient?.firstName || 'there',
    lastName: props.recipient?.lastName || '',
    fullName: [props.recipient?.firstName, props.recipient?.lastName].filter(Boolean).join(' ') || 'there',
    email: props.recipient?.email || '',
    adminName: props.adminName || 'Your Agent',
    year: String(new Date().getFullYear()),
  }
  return template.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (m, k) => vars[k] ?? m)
}

const renderedSubject = computed(() => renderPlaceholders(defaultSubject.value))
const renderedBody = computed(() => renderPlaceholders(defaultBody.value))

const sendDisabled = computed(() => {
  if (sending.value) return true
  if (mode.value === 'custom' && (!customSubject.value.trim() && !customBody.value.trim())) return true
  return false
})

const lastResultText = computed(() => lastResult.value?.message || '')
const lastResultColor = computed(() => lastResult.value?.ok ? 'success' : 'error')
const lastResultIcon = computed(() => lastResult.value?.ok ? 'mdi-check-circle' : 'mdi-alert-circle')

function loadDefault() {
  customSubject.value = defaultSubject.value
  customBody.value = defaultBody.value
}

watch(() => props.modelValue, (open) => {
  if (open) {
    mode.value = 'auto'
    customSubject.value = ''
    customBody.value = ''
    lastResult.value = null
  }
})

function getAuthHeaders(): Record<string, string> {
  if (process.client) {
    const token = localStorage.getItem('token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }
  return {}
}

async function onSend() {
  sending.value = true
  lastResult.value = null
  try {
    const path = props.bulk
      ? '/api/admin/crm/celebrations/bulk-send'
      : '/api/admin/crm/celebrations/send'

    const body: Record<string, unknown> = {
      kind: props.kind,
      mode: mode.value,
    }
    if (mode.value === 'custom') {
      body.subject = customSubject.value || undefined
      body.body = customBody.value || undefined
    }
    if (!props.bulk && props.recipient?.id) {
      body.clientId = props.recipient.id
    }

    const res: any = await $fetch(path, {
      method: 'POST',
      headers: getAuthHeaders(),
      body,
    })

    if (props.bulk) {
      lastResult.value = {
        ok: true,
        message: `Sent ${res.sent}, skipped ${res.skipped}, failed ${res.failed}`,
      }
    } else {
      lastResult.value = { ok: true, message: 'Wishes sent.' }
    }
    emit('sent', { kind: props.kind, mode: mode.value, result: res })
    if (!props.bulk) {
      // Auto-close single-client flow after a beat so the user sees confirmation
      setTimeout(() => emit('update:modelValue', false), 900)
    }
  } catch (e: any) {
    lastResult.value = {
      ok: false,
      message: e?.data?.message || e?.message || 'Failed to send. Please try again.',
    }
  } finally {
    sending.value = false
  }
}
</script>

<style scoped>
.celebration-dialog .display-serif { font-family: 'Playfair Display', serif; }
.text-gold { color: #8c734b; }
.letter-spacing-2 { letter-spacing: 2px; }
.letter-spacing-1 { letter-spacing: 1px; }
.premium-action-btn {
  border-radius: 12px !important;
  text-transform: none !important;
  font-weight: 700 !important;
}
.preview-box {
  background: #fafaf8;
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 12px;
  padding: 16px 18px;
  font-size: 0.92rem;
  line-height: 1.55;
  color: #2d2a26;
}
.html-preview :deep(p) { margin: 0 0 12px; }
.html-preview :deep(p:last-child) { margin-bottom: 0; }
.html-preview :deep(strong) { color: #1d1b18; }
</style>
