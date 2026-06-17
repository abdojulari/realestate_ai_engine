<template>
  <div class="admin-welcome-email-premium px-md-8 py-md-6">
    <v-container fluid>
      <!-- Page Header -->
      <v-row class="mb-8 align-center">
        <v-col cols="12" md="8">
          <div class="d-flex align-center mb-2">
            <v-btn icon="mdi-arrow-left" variant="text" to="/admin/newsletter" class="mr-3" />
            <div class="premium-accent-bar mr-4"></div>
            <span class="text-overline letter-spacing-2 text-gold">Subscriber Onboarding</span>
          </div>
          <h1 class="display-serif text-h3 mb-1">Welcome Email</h1>
          <p class="text-subtitle-1 text-medium-emphasis font-weight-light">
            Automatically sent the moment someone subscribes to your newsletter. Branded with your business name, logo, and colours.
          </p>
        </v-col>
        <v-col cols="12" md="4" class="text-md-right">
          <v-btn
            color="primary"
            size="large"
            prepend-icon="mdi-content-save-outline"
            class="premium-action-btn"
            :loading="saving"
            :disabled="loading"
            @click="saveSettings"
          >
            Save Changes
          </v-btn>
        </v-col>
      </v-row>

      <v-row v-if="loading">
        <v-col cols="12" class="text-center py-12">
          <v-progress-circular indeterminate color="primary" />
        </v-col>
      </v-row>

      <v-row v-else>
        <!-- ── Left column: form ─────────────────────────────────────── -->
        <v-col cols="12" lg="6">
          <v-card class="settings-card mb-6" elevation="0">
            <v-card-text class="pa-6">
              <div class="d-flex align-center justify-space-between mb-2">
                <div>
                  <div class="text-overline text-gold letter-spacing-1">Status</div>
                  <div class="text-h6 mt-1">Welcome emails are {{ form.enabled ? 'enabled' : 'paused' }}</div>
                </div>
                <v-switch
                  v-model="form.enabled"
                  color="success"
                  inset
                  hide-details
                />
              </div>
              <p class="text-caption text-medium-emphasis mt-2 mb-0">
                When enabled, every new and reactivated subscriber receives this email once, automatically.
              </p>
            </v-card-text>
          </v-card>

          <v-card class="settings-card mb-6" elevation="0">
            <v-card-text class="pa-6">
              <div class="text-overline text-gold letter-spacing-1 mb-4">Content</div>
              <v-text-field
                v-model="form.subject"
                label="Subject line"
                variant="outlined"
                density="comfortable"
                class="mb-2"
                :placeholder="defaultSubjectPreview"
                persistent-placeholder
                counter="200"
                maxlength="200"
                hint="Leave blank to use the default. Merge tags below work here too."
                persistent-hint
              />

              <v-textarea
                v-model="form.intro"
                label="Welcome message (HTML allowed)"
                variant="outlined"
                density="comfortable"
                class="mt-6"
                rows="10"
                auto-grow
                placeholder="Hi {firstName}, thanks for joining {businessName}…"
                persistent-placeholder
                counter
                hint="Leave blank to use the default welcome message."
                persistent-hint
              />

              <div class="merge-tags mt-4">
                <div class="text-caption font-weight-bold mb-2">Merge tags</div>
                <div class="d-flex flex-wrap" style="gap: 6px;">
                  <v-chip
                    v-for="tag in mergeTags"
                    :key="tag.tag"
                    size="small"
                    variant="tonal"
                    color="primary"
                    @click="insertMergeTag(tag.tag)"
                  >
                    <code class="mr-1">{{ tag.tag }}</code>
                    <span class="text-caption opacity-80">{{ tag.description }}</span>
                  </v-chip>
                </div>
                <div class="text-caption text-medium-emphasis mt-2">
                  Click a tag to insert it at the end of the message.
                </div>
              </div>
            </v-card-text>
          </v-card>

          <v-card class="settings-card mb-6" elevation="0">
            <v-card-text class="pa-6">
              <div class="text-overline text-gold letter-spacing-1 mb-4">Branding (read-only)</div>
              <p class="text-caption text-medium-emphasis mb-4">
                These values flow in from your tenant settings and shape the header, footer, button colour, and From identity on every welcome email.
                <NuxtLink to="/admin/settings" class="text-primary">Edit branding</NuxtLink>.
              </p>
              <div class="branding-row" v-if="branding">
                <div class="branding-item">
                  <div class="branding-label">Business name</div>
                  <div class="branding-value">{{ branding.businessName || '—' }}</div>
                </div>
                <div class="branding-item">
                  <div class="branding-label">Tagline</div>
                  <div class="branding-value">{{ branding.tagline || '—' }}</div>
                </div>
                <div class="branding-item">
                  <div class="branding-label">Primary colour</div>
                  <div class="branding-value d-flex align-center" style="gap: 8px;">
                    <span
                      class="color-swatch"
                      :style="{ background: branding.primaryColor }"
                    />
                    <code>{{ branding.primaryColor }}</code>
                  </div>
                </div>
                <div class="branding-item">
                  <div class="branding-label">Logo</div>
                  <div class="branding-value">
                    <img
                      v-if="branding.logoUrl"
                      :src="branding.logoUrl"
                      :alt="branding.businessName"
                      style="max-height: 36px; max-width: 160px;"
                    />
                    <span v-else class="text-medium-emphasis">— no logo set</span>
                  </div>
                </div>
                <div class="branding-item">
                  <div class="branding-label">Reply-to</div>
                  <div class="branding-value">{{ branding.contactEmail || '—' }}</div>
                </div>
              </div>
            </v-card-text>
          </v-card>

          <v-card class="settings-card" elevation="0">
            <v-card-text class="pa-6">
              <div class="text-overline text-gold letter-spacing-1 mb-4">Send a Test</div>
              <p class="text-caption text-medium-emphasis mb-4">
                Send this email to yourself or a teammate to verify the look, the From identity, and your email deliverability.
                Tests respect your unsaved changes and always send regardless of the on/off toggle above.
              </p>
              <v-text-field
                v-model="testEmail"
                label="Recipient email"
                variant="outlined"
                density="comfortable"
                type="email"
                :placeholder="adminEmail || 'you@example.com'"
                persistent-placeholder
                hint="Defaults to your own email when left blank."
                persistent-hint
              />
              <v-btn
                color="primary"
                variant="tonal"
                prepend-icon="mdi-email-fast-outline"
                class="mt-4"
                :loading="sendingTest"
                @click="sendTest"
              >
                Send Test Email
              </v-btn>
              <v-alert
                v-if="lastTestResult"
                :type="lastTestResult.type"
                density="compact"
                variant="tonal"
                class="mt-4"
              >
                {{ lastTestResult.message }}
              </v-alert>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- ── Right column: live preview ────────────────────────────── -->
        <v-col cols="12" lg="6">
          <v-card class="preview-card sticky-preview" elevation="0">
            <v-card-text class="pa-6">
              <div class="d-flex align-center justify-space-between mb-4">
                <div>
                  <div class="text-overline text-gold letter-spacing-1">Live Preview</div>
                  <div class="text-caption text-medium-emphasis">
                    Updates as you type. This is exactly what subscribers will see.
                  </div>
                </div>
                <v-btn-toggle
                  v-model="previewFlavor"
                  mandatory
                  density="compact"
                  variant="outlined"
                >
                  <v-btn value="new" size="small">New</v-btn>
                  <v-btn value="reactivation" size="small">Returning</v-btn>
                </v-btn-toggle>
              </div>

              <div v-if="previewSubject" class="preview-subject mb-3">
                <span class="preview-subject-label">Subject:</span>
                <span class="preview-subject-text">{{ previewSubject }}</span>
              </div>

              <div class="preview-frame-wrapper">
                <iframe
                  v-if="previewHtml"
                  ref="previewFrame"
                  class="preview-frame"
                  :srcdoc="previewHtml"
                  sandbox=""
                />
                <div v-else class="preview-empty">
                  <v-progress-circular v-if="previewing" indeterminate size="24" color="primary" />
                  <span v-else class="text-caption text-medium-emphasis">Preview will appear here…</span>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

// Same auth header pattern other newsletter pages use — keeps this page
// consistent with the rest of /admin/newsletter/*.
const getAuthHeaders = (): Record<string, string> => {
  if (process.client) {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }
  return {}
}

interface MergeTag { tag: string; description: string }
interface Branding {
  businessName: string
  tagline: string | null
  logoUrl: string | null
  primaryColor: string
  contactEmail: string | null
}

const loading = ref(true)
const saving = ref(false)
const sendingTest = ref(false)
const previewing = ref(false)

const form = reactive({
  enabled: true,
  subject: '',
  intro: '',
})

const branding = ref<Branding | null>(null)
const mergeTags = ref<MergeTag[]>([])
const adminEmail = ref<string>('')

const testEmail = ref('')
const lastTestResult = ref<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null)

const previewFlavor = ref<'new' | 'reactivation'>('new')
const previewSubject = ref('')
const previewHtml = ref('')

const snackbar = ref({ show: false, color: 'success', message: '' })

const defaultSubjectPreview = computed(() => {
  const name = branding.value?.businessName || 'your brokerage'
  return previewFlavor.value === 'reactivation'
    ? `Welcome back to ${name}`
    : `Welcome to ${name}`
})

const loadSettings = async () => {
  loading.value = true
  try {
    const data = await $fetch('/api/admin/newsletter/welcome-email', {
      headers: getAuthHeaders(),
    }) as any
    form.enabled = !!data.settings.enabled
    form.subject = data.settings.subject || ''
    form.intro = data.settings.intro || ''
    branding.value = data.branding
    mergeTags.value = data.mergeTags || []
    adminEmail.value = data.branding?.contactEmail || ''
  } catch (err: any) {
    console.error('Failed to load welcome email settings:', err)
    snackbar.value = {
      show: true,
      color: 'error',
      message: err?.data?.message || 'Could not load welcome email settings.',
    }
  } finally {
    loading.value = false
  }
}

const saveSettings = async () => {
  saving.value = true
  try {
    await $fetch('/api/admin/newsletter/welcome-email', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: {
        enabled: form.enabled,
        subject: form.subject,
        intro: form.intro,
      },
    })
    snackbar.value = { show: true, color: 'success', message: 'Welcome email saved.' }
  } catch (err: any) {
    console.error('Failed to save welcome email settings:', err)
    snackbar.value = {
      show: true,
      color: 'error',
      message: err?.data?.statusMessage || err?.data?.message || 'Save failed.',
    }
  } finally {
    saving.value = false
  }
}

// Server-side preview render. Cheaper than building a parallel renderer
// on the client, and guarantees the preview is byte-identical to what
// subscribers actually receive.
const refreshPreview = async () => {
  if (loading.value) return
  previewing.value = true
  try {
    const data = await $fetch('/api/admin/newsletter/welcome-email/preview', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: {
        enabled: form.enabled,
        subject: form.subject,
        intro: form.intro,
        flavor: previewFlavor.value,
      },
    }) as any
    previewSubject.value = data.subject || ''
    previewHtml.value = data.html || ''
  } catch (err) {
    console.error('Preview render failed:', err)
  } finally {
    previewing.value = false
  }
}

// Debounce form-driven preview refresh so we don't fire a request on
// every keystroke. 350ms feels live without hammering the server.
let previewDebounce: ReturnType<typeof setTimeout> | null = null
const queuePreview = () => {
  if (previewDebounce) clearTimeout(previewDebounce)
  previewDebounce = setTimeout(refreshPreview, 350)
}

watch(
  () => [form.subject, form.intro, form.enabled, previewFlavor.value],
  queuePreview,
)

const insertMergeTag = (tag: string) => {
  // Append to the intro textarea — simplest insertion that always works
  // without needing a textarea ref + selectionStart tracking. The merge-
  // tag chips are a "discoverability aid" more than a precise editor.
  form.intro = (form.intro ? form.intro + ' ' : '') + tag
}

const sendTest = async () => {
  lastTestResult.value = null
  sendingTest.value = true
  try {
    const data = await $fetch('/api/admin/newsletter/welcome-email/test', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: {
        to: testEmail.value || adminEmail.value || '',
        subject: form.subject,
        intro: form.intro,
        flavor: previewFlavor.value,
      },
    }) as any
    const channel = data.deliveredVia === 'mailerlite' ? 'MailerLite' : 'SMTP'
    lastTestResult.value = {
      type: data.mailerLiteSkippedReason ? 'warning' : 'success',
      message: data.mailerLiteSkippedReason
        ? `Test sent to ${data.sentTo} via SMTP — MailerLite was skipped: ${data.mailerLiteSkippedReason}`
        : `Test sent to ${data.sentTo} via ${channel}. Check your inbox.`,
    }
  } catch (err: any) {
    console.error('Test send failed:', err)
    lastTestResult.value = {
      type: 'error',
      message: err?.data?.statusMessage || err?.data?.message || 'Test send failed.',
    }
  } finally {
    sendingTest.value = false
  }
}

onMounted(async () => {
  await loadSettings()
  // First preview fires only after settings are loaded — otherwise the
  // initial render reflects empty form state, which is misleading.
  refreshPreview()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;600;700&display=swap');

.admin-welcome-email-premium {
  background-color: #fcfcfb;
  font-family: 'Inter', sans-serif;
  min-height: 100vh;
}

.display-serif { font-family: 'Playfair Display', serif; }
.text-gold { color: #8c734b; }
.letter-spacing-2 { letter-spacing: 2px; }
.letter-spacing-1 { letter-spacing: 1px; }

.premium-accent-bar {
  width: 40px;
  height: 4px;
  background: #8c734b;
  border-radius: 2px;
}

.premium-action-btn {
  border-radius: 12px !important;
  text-transform: none !important;
  font-weight: 700 !important;
  letter-spacing: 0.5px !important;
}

.settings-card,
.preview-card {
  border-radius: 20px !important;
  background: white !important;
  border: 1px solid rgba(0, 0, 0, 0.05) !important;
}

.merge-tags code {
  font-family: 'JetBrains Mono', Menlo, Monaco, monospace;
  font-size: 11px;
}

.branding-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

@media (max-width: 600px) {
  .branding-row { grid-template-columns: 1fr; }
}

.branding-item {
  padding: 12px;
  border-radius: 10px;
  background: #fafafa;
  border: 1px solid #f0f0ee;
}

.branding-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #999;
  margin-bottom: 4px;
}

.branding-value {
  font-size: 14px;
  color: #1a1a1a;
  word-break: break-word;
}

.color-swatch {
  display: inline-block;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.preview-subject {
  padding: 10px 14px;
  background: #f8f8f6;
  border-radius: 10px;
  font-size: 13px;
}
.preview-subject-label {
  color: #999;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.5px;
  margin-right: 8px;
}
.preview-subject-text {
  color: #1a1a1a;
  font-weight: 600;
}

.preview-frame-wrapper {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #ececec;
  background: #f5f5f5;
}

.preview-frame {
  width: 100%;
  height: 720px;
  border: 0;
  background: #f5f5f5;
}

.preview-empty {
  height: 720px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Keep the preview pane visible while the admin scrolls through long
   form fields on the left. Falls back gracefully when viewport is short. */
@media (min-width: 1280px) {
  .sticky-preview {
    position: sticky;
    top: 24px;
  }
}
</style>
