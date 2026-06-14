<template>
  <div class="admin-campaign-new-premium px-md-8 py-md-6">
    <v-container fluid>
      <v-row class="mb-8 align-center">
        <v-col cols="12">
          <div class="d-flex align-center mb-2">
            <v-btn icon="mdi-arrow-left" variant="text" :to="'/admin/newsletter/campaigns'" class="mr-3"></v-btn>
            <div class="premium-accent-bar mr-4"></div>
            <span class="text-overline letter-spacing-2 text-gold">Campaign Builder</span>
          </div>
          <h1 class="display-serif text-h3 mb-1">Edit Campaign</h1>
          <p class="text-subtitle-1 text-medium-emphasis">Update your email marketing campaign</p>
        </v-col>
      </v-row>

      <div v-if="loading" class="text-center py-16">
        <v-progress-circular indeterminate size="48" color="primary" />
        <p class="mt-4 text-medium-emphasis">Loading campaign...</p>
      </div>

      <v-form v-else ref="formRef" @submit.prevent="updateCampaign">
        <v-row>
          <v-col cols="12" md="8">
            <v-card class="mb-6 premium-card" elevation="0">
              <v-card-title class="text-h6 font-weight-bold pa-6 border-b">
                <v-icon icon="mdi-information-outline" class="mr-2" color="primary" />
                Campaign Details
              </v-card-title>
              <v-card-text class="pa-6">
                <v-text-field
                  v-model="form.name"
                  label="Campaign Name"
                  variant="outlined"
                  density="comfortable"
                  :rules="[v => !!v || 'Campaign name is required']"
                  class="mb-4"
                />
                <v-text-field
                  v-model="form.subject"
                  label="Email Subject"
                  variant="outlined"
                  density="comfortable"
                  :rules="[v => !!v || 'Email subject is required']"
                  class="mb-4"
                />
                <v-textarea
                  v-model="form.previewText"
                  label="Preview Text (Optional)"
                  variant="outlined"
                  density="comfortable"
                  rows="2"
                  class="mb-4"
                />
              </v-card-text>
            </v-card>

            <v-card class="mb-6 premium-card" elevation="0">
              <v-card-title class="text-h6 font-weight-bold pa-6 border-b">
                <v-icon icon="mdi-file-document" class="mr-2" color="primary" />
                Content
              </v-card-title>
              <v-card-text class="pa-6">
                <v-select
                  v-model="form.templateId"
                  :items="templates"
                  item-title="name"
                  item-value="id"
                  label="Select Template (Optional)"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-file-document-outline"
                  clearable
                  class="mb-4"
                  @update:model-value="loadTemplate as any"
                >
                  <template v-slot:item="{ props, item }">
                    <v-list-item v-bind="props">
                      <template v-slot:title>
                        <div class="font-weight-medium">{{ item.raw.name }}</div>
                      </template>
                      <template v-slot:subtitle>
                        <div class="text-caption">{{ item.raw.subject }}</div>
                      </template>
                    </v-list-item>
                  </template>
                </v-select>

                <v-textarea density="compact"
                  v-model="form.content"
                  label="Email Content (HTML)"
                  variant="outlined"
                  rows="12"
                  :rules="[v => !!v || 'Email content is required']"
                  class="mb-4"
                />
                <v-textarea density="compact"
                  v-model="form.plainTextContent"
                  label="Plain Text Version (Optional)"
                  variant="outlined"
                  rows="6"
                />
              </v-card-text>
            </v-card>

            <v-card class="mb-6 premium-card" elevation="0">
              <v-card-title class="text-h6 font-weight-bold pa-6 border-b">
                <v-icon icon="mdi-account-group" class="mr-2" color="primary" />
                Target Audience
              </v-card-title>
              <v-card-text class="pa-6">
                <v-select
                  v-model="form.targetAudience"
                  :items="audienceOptions"
                  label="Send To"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-email-multiple"
                  :rules="[v => !!v || 'Target audience is required']"
                />
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="4">
            <!-- Status Banner -->
            <v-alert v-if="originalStatus" :type="statusAlertType" variant="tonal" class="mb-6">
              <div class="font-weight-bold text-uppercase">{{ originalStatus }}</div>
              <div v-if="originalStatus === 'sent'" class="text-caption mt-1">
                Sent {{ campaign?.sentAt ? formatDate(campaign.sentAt) : '' }} to {{ campaign?.recipientCount }} recipients
              </div>
            </v-alert>

            <v-card class="mb-6 premium-card" elevation="0">
              <v-card-title class="text-h6 font-weight-bold pa-6 border-b">
                <v-icon icon="mdi-calendar-clock" class="mr-2" color="primary" />
                Schedule
              </v-card-title>
              <v-card-text class="pa-6">
                <v-radio-group v-model="form.sendType" density="comfortable" :disabled="originalStatus === 'sent'">
                  <v-radio label="Send Now" value="now" />
                  <v-radio label="Schedule for Later" value="scheduled" />
                  <v-radio label="Save as Draft" value="draft" />
                </v-radio-group>

                <div v-if="form.sendType === 'scheduled'" class="mt-4">
                  <v-text-field v-model="form.scheduledDate" label="Date" type="date" variant="outlined" density="comfortable" class="mb-4" />
                  <v-text-field v-model="form.scheduledTime" label="Time" type="time" variant="outlined" density="comfortable" />
                </div>
              </v-card-text>
            </v-card>

            <v-card class="mb-6 premium-card" elevation="0">
              <v-card-title class="text-h6 font-weight-bold pa-6 border-b">
                <v-icon icon="mdi-chart-line" class="mr-2" color="primary" />
                Engagement Tracking
              </v-card-title>
              <v-card-text class="pa-6">
                <div class="d-flex align-center mb-2">
                  <v-icon icon="mdi-check-circle" color="success" size="20" class="mr-2" />
                  <span class="text-body-2">Opens tracked via embedded pixel</span>
                </div>
                <div class="d-flex align-center">
                  <v-icon icon="mdi-check-circle" color="success" size="20" class="mr-2" />
                  <span class="text-body-2">Clicks tracked via link redirect</span>
                </div>
              </v-card-text>
            </v-card>

            <v-card class="premium-card" elevation="0">
              <v-card-text class="pa-6">
                <v-btn type="submit" color="primary" block size="large" prepend-icon="mdi-content-save" :loading="saving" class="mb-3" :disabled="originalStatus === 'sent'">
                  {{ getSubmitButtonText() }}
                </v-btn>
                <v-btn variant="outlined" block size="large" prepend-icon="mdi-eye" @click="showPreview = true">
                  Preview
                </v-btn>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-form>
    </v-container>

    <v-dialog v-model="showPreview" max-width="800">
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center pa-6 border-b">
          <span class="text-h6 font-weight-bold">Campaign Preview</span>
          <v-btn icon="mdi-close" variant="text" @click="showPreview = false"></v-btn>
        </v-card-title>
        <v-card-text class="pa-6">
          <div class="mb-4">
            <div class="text-caption text-medium-emphasis mb-1">Subject:</div>
            <div class="text-h6">{{ form.subject }}</div>
          </div>
          <div v-if="form.previewText" class="mb-4">
            <div class="text-caption text-medium-emphasis mb-1">Preview Text:</div>
            <div class="text-body-2">{{ form.previewText }}</div>
          </div>
          <v-divider class="my-4" />
          <div class="preview-content" v-html="safePreview"></div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="showSuccess" color="success" :timeout="3000">
      <v-icon icon="mdi-check-circle" class="mr-2" />
      {{ successMessage }}
    </v-snackbar>

    <v-snackbar v-model="showError" color="error" :timeout="5000">
      <v-icon icon="mdi-alert-circle" class="mr-2" />
      {{ errorMessage }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { formatDate } from '~/utils/formatters'

definePageMeta({
  layout: 'admin',
  middleware: ['admin']
})

const router = useRouter()
const route = useRoute()
const campaignId = computed(() => Number(route.params.id))

const formRef = ref<any>(null)
const loading = ref(true)
const saving = ref(false)
const showPreview = ref(false)
const showSuccess = ref(false)
const showError = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const campaign = ref<any>(null)
const originalStatus = ref('')

const getAuthHeaders = () => {
  const token = process.client ? localStorage.getItem('token') : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const form = ref({
  name: '',
  subject: '',
  previewText: '',
  templateId: null as number | null,
  content: '',
  plainTextContent: '',
  targetAudience: 'all',
  sendType: 'draft',
  scheduledDate: '',
  scheduledTime: '',
})

// Sanitized preview of the campaign body so the dialog can't execute scripts
// embedded in pasted HTML.
const safePreview = useSanitizedHtml(() => form.value.content, { allowIframes: true })

const templates = ref<any[]>([])
const audienceOptions = [
  { title: 'All Active Subscribers', value: 'all' },
  { title: 'New Subscribers (Last 30 Days)', value: 'new' },
  { title: 'Re-engage Inactive (No Opens in 90 Days)', value: 'inactive' }
]

const statusAlertType = computed(() => {
  const map: Record<string, string> = { sent: 'success', sending: 'warning', scheduled: 'info', draft: 'warning' }
  return (map[originalStatus.value] || 'info') as any
})

async function loadCampaign() {
  loading.value = true
  try {
    const data = await $fetch(`/api/admin/newsletter/campaigns/${campaignId.value}`, {
      headers: getAuthHeaders()
    }) as any

    campaign.value = data
    originalStatus.value = data.status || ''

    form.value.name = data.name || ''
    form.value.subject = data.subject || ''
    form.value.previewText = data.previewText || ''
    form.value.templateId = data.templateId || null
    form.value.content = data.content || ''
    form.value.plainTextContent = data.plainTextContent || ''

    const filters = data.targetFilters as any
    form.value.targetAudience = filters?.audience || 'all'

    if (data.status === 'scheduled' && data.scheduledFor) {
      form.value.sendType = 'scheduled'
      const dt = new Date(data.scheduledFor)
      form.value.scheduledDate = dt.toISOString().split('T')[0]
      form.value.scheduledTime = dt.toTimeString().substring(0, 5)
    } else if (data.status === 'sent') {
      form.value.sendType = 'draft'
    } else {
      form.value.sendType = 'draft'
    }
  } catch (e: any) {
    console.error('Failed to load campaign:', e)
    errorMessage.value = 'Failed to load campaign'
    showError.value = true
  } finally {
    loading.value = false
  }
}

async function loadTemplates() {
  try {
    const res = await $fetch('/api/admin/newsletter/templates', { headers: getAuthHeaders() }) as any
    templates.value = res.templates || []
  } catch (e) {
    console.error('Error loading templates:', e)
  }
}

async function loadTemplate(templateId: number) {
  if (!templateId) return
  try {
    const t = await $fetch(`/api/admin/newsletter/templates/${templateId}`, { headers: getAuthHeaders() }) as any
    form.value.subject = t.subject
    form.value.content = t.content
    form.value.plainTextContent = t.plainTextContent || ''
    form.value.previewText = t.previewText || ''
  } catch (e) {
    console.error('Error loading template:', e)
  }
}

function getSubmitButtonText() {
  if (form.value.sendType === 'now') return 'Save & Send Now'
  if (form.value.sendType === 'scheduled') return 'Save & Schedule'
  return 'Save Changes'
}

async function updateCampaign() {
  const isValid = await formRef.value?.validate()
  if (!isValid?.valid) return

  saving.value = true
  try {
    let status = 'draft'
    let scheduledFor = null

    if (form.value.sendType === 'scheduled') {
      status = 'scheduled'
      scheduledFor = `${form.value.scheduledDate}T${form.value.scheduledTime}:00`
    }

    await $fetch(`/api/admin/newsletter/campaigns/${campaignId.value}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: {
        name: form.value.name,
        subject: form.value.subject,
        content: form.value.content,
        plainTextContent: form.value.plainTextContent,
        previewText: form.value.previewText,
        templateId: form.value.templateId,
        status,
        scheduledFor,
        targetFilters: { audience: form.value.targetAudience },
      }
    })

    if (form.value.sendType === 'now') {
      const sendResult = await $fetch(`/api/admin/newsletter/campaigns/${campaignId.value}/send`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: {}
      }) as any
      successMessage.value = sendResult.message || `Campaign sent to ${sendResult.recipientCount} subscribers!`
    } else if (form.value.sendType === 'scheduled') {
      successMessage.value = 'Campaign scheduled successfully!'
    } else {
      successMessage.value = 'Campaign saved!'
    }

    showSuccess.value = true
    setTimeout(() => router.push('/admin/newsletter/campaigns'), 1500)
  } catch (e: any) {
    console.error('Error updating campaign:', e)
    errorMessage.value = e.data?.message || 'Failed to update campaign.'
    showError.value = true
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadCampaign(), loadTemplates()])
})
</script>

<style scoped>
.admin-campaign-new-premium {
  min-height: 100vh;
  background: #fafafa;
}
.premium-card {
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  background: white;
  transition: all 0.3s ease;
}
.premium-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}
.premium-accent-bar {
  width: 4px;
  height: 32px;
  background: linear-gradient(180deg, #8c734b 0%, #d4af37 100%);
  border-radius: 2px;
}
.display-serif {
  font-family: 'Playfair Display', Georgia, serif;
}
.letter-spacing-2 {
  letter-spacing: 2px;
}
.text-gold {
  color: #8c734b;
}
.border-b {
  border-bottom: 1px solid #e0e0e0;
}
.preview-content {
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fafafa;
  min-height: 300px;
  max-height: 600px;
  overflow-y: auto;
}
.preview-content :deep(img) {
  max-width: 100%;
  height: auto;
}
</style>
