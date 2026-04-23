<template>
  <div class="admin-campaign-new-premium px-md-8 py-md-6">
    <v-container fluid>
      <!-- Page Header -->
      <v-row class="mb-8 align-center">
        <v-col cols="12">
          <div class="d-flex align-center mb-2">
            <v-btn icon="mdi-arrow-left" variant="text" :to="'/admin/newsletter/campaigns'" class="mr-3"></v-btn>
            <div class="premium-accent-bar mr-4"></div>
            <span class="text-overline letter-spacing-2 text-gold">Campaign Builder</span>
          </div>
          <h1 class="display-serif text-h3 mb-1">Create New Campaign</h1>
          <p class="text-subtitle-1 text-medium-emphasis">Design and schedule your email marketing campaign</p>
        </v-col>
      </v-row>

      <!-- Campaign Form -->
      <v-form ref="formRef" @submit.prevent="saveCampaign">
        <v-row>
          <!-- Left Column - Main Details -->
          <v-col cols="12" md="8">
            <!-- Basic Information Card -->
            <v-card class="mb-6 premium-card" elevation="0">
              <v-card-title class="text-h6 font-weight-bold pa-6 border-b">
                <v-icon icon="mdi-information-outline" class="mr-2" color="primary" />
                Campaign Details
              </v-card-title>
              <v-card-text class="pa-6">
                <v-text-field
                  v-model="form.name"
                  label="Campaign Name"
                  placeholder="e.g., Monthly Newsletter - January 2024"
                  variant="outlined"
                  density="comfortable"
                  :rules="[v => !!v || 'Campaign name is required']"
                  class="mb-4"
                />

                <v-text-field
                  v-model="form.subject"
                  label="Email Subject"
                  placeholder="e.g., Your January Market Update"
                  variant="outlined"
                  density="comfortable"
                  :rules="[v => !!v || 'Email subject is required']"
                  class="mb-4"
                />

                <v-textarea
                  v-model="form.previewText"
                  label="Preview Text (Optional)"
                  placeholder="This appears in the inbox preview..."
                  variant="outlined"
                  density="comfortable"
                  rows="2"
                  class="mb-4"
                />
              </v-card-text>
            </v-card>

            <!-- Template Selection Card -->
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
                  placeholder="<h1>Hello!</h1><p>Your content here...</p>"
                  variant="outlined"
                  rows="12"
                  :rules="[v => !!v || 'Email content is required']"
                  class="mb-4"
                />

                <v-textarea density="compact"
                  v-model="form.plainTextContent"
                  label="Plain Text Version (Optional)"
                  placeholder="Plain text version for email clients that don't support HTML"
                  variant="outlined"
                  rows="6"
                />
              </v-card-text>
            </v-card>

            <!-- Target Audience Card -->
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

                <v-alert type="info" variant="tonal" class="mt-4">
                  <template v-slot:prepend>
                    <v-icon icon="mdi-information" />
                  </template>
                  <div class="text-body-2">
                    This campaign will be sent to {{ getAudienceCount() }} subscribers
                  </div>
                </v-alert>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Right Column - Schedule & Settings -->
          <v-col cols="12" md="4">
            <!-- Schedule Card -->
            <v-card class="mb-6 premium-card" elevation="0">
              <v-card-title class="text-h6 font-weight-bold pa-6 border-b">
                <v-icon icon="mdi-calendar-clock" class="mr-2" color="primary" />
                Schedule
              </v-card-title>
              <v-card-text class="pa-6">
                <v-radio-group v-model="form.sendType" density="comfortable">
                  <v-radio label="Send Now" value="now" />
                  <v-radio label="Schedule for Later" value="scheduled" />
                  <v-radio label="Save as Draft" value="draft" />
                </v-radio-group>

                <div v-if="form.sendType === 'scheduled'" class="mt-4">
                  <v-text-field
                    v-model="form.scheduledDate"
                    label="Date"
                    type="date"
                    variant="outlined"
                    density="comfortable"
                    class="mb-4"
                  />
                  <v-text-field
                    v-model="form.scheduledTime"
                    label="Time"
                    type="time"
                    variant="outlined"
                    density="comfortable"
                  />
                </div>
              </v-card-text>
            </v-card>

            <!-- Campaign Settings Card -->
            <v-card class="mb-6 premium-card" elevation="0">
              <v-card-title class="text-h6 font-weight-bold pa-6 border-b">
                <v-icon icon="mdi-cog" class="mr-2" color="primary" />
                Settings
              </v-card-title>
              <v-card-text class="pa-6">
                <v-switch
                  v-model="form.trackOpens"
                  label="Track Opens"
                  color="primary"
                  density="comfortable"
                  hide-details
                  class="mb-4"
                />
                <v-switch
                  v-model="form.trackClicks"
                  label="Track Clicks"
                  color="primary"
                  density="comfortable"
                  hide-details
                />
              </v-card-text>
            </v-card>

            <!-- Actions Card -->
            <v-card class="premium-card" elevation="0">
              <v-card-text class="pa-6">
                <v-btn
                  type="submit"
                  color="primary"
                  block
                  size="large"
                  prepend-icon="mdi-send"
                  :loading="saving"
                  class="mb-3"
                >
                  {{ getSubmitButtonText() }}
                </v-btn>
                <v-btn
                  variant="outlined"
                  block
                  size="large"
                  prepend-icon="mdi-eye"
                  @click="previewCampaign"
                >
                  Preview
                </v-btn>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-form>
    </v-container>

    <!-- Preview Dialog -->
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

    <!-- Success Snackbar -->
    <v-snackbar v-model="showSuccess" color="success" :timeout="3000">
      <v-icon icon="mdi-check-circle" class="mr-2" />
      {{ successMessage }}
    </v-snackbar>

    <!-- Error Snackbar -->
    <v-snackbar v-model="showError" color="error" :timeout="5000">
      <v-icon icon="mdi-alert-circle" class="mr-2" />
      {{ errorMessage }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { formatDateTime } from '~/utils/formatters'

definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})

const router = useRouter()
const route = useRoute()
const formRef = ref<any>(null)
const saving = ref(false)
const showPreview = ref(false)
const showSuccess = ref(false)
const showError = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

// Sanitized preview of the campaign body. Even though the editor is admin-only,
// pasted HTML can carry <script> or `on*=` handlers — strip them before
// rendering inside the preview dialog.
const safePreview = useSanitizedHtml(() => form.value.content, { allowIframes: true })

// Form data
const form = ref({
  name: '',
  subject: '',
  previewText: '',
  templateId: null,
  content: '',
  plainTextContent: '',
  targetAudience: 'all',
  sendType: 'draft',
  scheduledDate: '',
  scheduledTime: '',
  trackOpens: true,
  trackClicks: true
})

const templates = ref<any[]>([])
const audienceOptions = [
  { title: 'All Subscribers', value: 'all' },
  { title: 'Active Subscribers Only', value: 'active' },
  { title: 'New Subscribers (Last 30 Days)', value: 'new' },
  { title: 'Inactive Subscribers', value: 'inactive' }
]

// Load templates
const loadTemplates = async () => {
  try {
    const response = await $fetch('/api/admin/newsletter/templates', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    }) as any
    templates.value = response.templates || []
  } catch (error) {
    console.error('Error loading templates:', error)
  }
}

// Load template content
const loadTemplate = async (templateId: number) => {
  if (!templateId) return
  
  try {
    const template = await $fetch(`/api/admin/newsletter/templates/${templateId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    }) as any
    
    form.value.subject = template.subject
    form.value.content = template.content
    form.value.plainTextContent = template.plainTextContent || ''
    form.value.previewText = template.previewText || ''
  } catch (error) {
    console.error('Error loading template:', error)
  }
}

// Get audience count
const getAudienceCount = () => {
  // This would typically fetch from the API
  return '1,234'
}

// Get submit button text
const getSubmitButtonText = () => {
  if (form.value.sendType === 'now') return 'Send Now'
  if (form.value.sendType === 'scheduled') return 'Schedule Campaign'
  return 'Save as Draft'
}

// Preview campaign
const previewCampaign = () => {
  showPreview.value = true
}

// Save campaign
const saveCampaign = async () => {
  const isValid = await formRef.value?.validate()
  if (!isValid?.valid) return

  saving.value = true
  
  try {
    // Determine status based on send type
    let status = 'draft'
    let scheduledFor = null
    
    if (form.value.sendType === 'now') {
      status = 'draft'
    } else if (form.value.sendType === 'scheduled') {
      status = 'scheduled'
      scheduledFor = `${form.value.scheduledDate}T${form.value.scheduledTime}:00`
    }

    const payload = {
      name: form.value.name,
      subject: form.value.subject,
      content: form.value.content,
      plainTextContent: form.value.plainTextContent,
      previewText: form.value.previewText,
      templateId: form.value.templateId,
      status,
      scheduledFor,
      targetFilters: { audience: form.value.targetAudience },
      trackOpens: form.value.trackOpens,
      trackClicks: form.value.trackClicks
    }

    const response = await $fetch('/api/admin/newsletter/campaigns', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: payload
    }) as any

    const campaignId = response.campaign?.id

    if (form.value.sendType === 'now' && campaignId) {
      const sendResult = await $fetch(`/api/admin/newsletter/campaigns/${campaignId}/send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: {}
      }) as any
      successMessage.value = sendResult.message || `Campaign sent to ${sendResult.recipientCount} subscribers!`
    } else if (form.value.sendType === 'scheduled') {
      successMessage.value = 'Campaign scheduled successfully!'
    } else {
      successMessage.value = 'Campaign saved as draft!'
    }
    
    showSuccess.value = true

    setTimeout(() => {
      router.push('/admin/newsletter/campaigns')
    }, 1500)
  } catch (error: any) {
    console.error('Error saving campaign:', error)
    errorMessage.value = error.data?.message || 'Failed to save campaign. Please try again.'
    showError.value = true
  } finally {
    saving.value = false
  }
}

async function prefillFromProperty(propertyId: number) {
  try {
    const res = await $fetch(`/api/admin/properties/${propertyId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }) as any
    const p = res.property || res
    if (!p?.id) return

    const price = p.price || 0
    const original = p.firstEntryPrice || 0
    const hasDeal = original && price && original > price
    const saved = hasDeal ? original - price : 0
    const dropPct = hasDeal ? ((saved / original) * 100).toFixed(1) : '0'
    const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`
    const addr = p.address || p.title || 'Property'
    const loc = [p.city, p.province || 'AB'].filter(Boolean).join(', ')
    const specs = [
      p.beds ? `${p.beds} Bed` : '',
      p.baths ? `${p.baths} Bath` : '',
      p.sqft ? `${p.sqft.toLocaleString()} sqft` : '',
    ].filter(Boolean).join(' · ')
    const link = `${window.location.origin}/property/${p.id}`

    const heroImg = Array.isArray(p.images) && p.images.length > 0
      ? (typeof p.images[0] === 'string' ? p.images[0] : p.images[0].url || p.images[0].Uri || '')
      : ''

    if (hasDeal) {
      form.value.name = `Price Drop Alert – ${addr}`
      form.value.subject = `🔥 ${dropPct}% Price Drop – ${addr} now ${fmt(price)}`
      form.value.previewText = `Was ${fmt(original)}, now ${fmt(price)}. Save ${fmt(saved)} on this ${specs} home in ${loc}.`
      form.value.content = buildDealEmailHtml({ addr, loc, specs, price, original, saved, dropPct, link, heroImg, description: p.description })
      form.value.plainTextContent = [
        `PRICE REDUCED ${dropPct}% – ${addr}`,
        `${loc} | ${specs}`,
        '',
        `Was: ${fmt(original)}`,
        `Now: ${fmt(price)}`,
        `You Save: ${fmt(saved)} (${dropPct}% off)`,
        '',
        p.description?.substring(0, 300) || '',
        '',
        `Don't miss this deal → ${link}`,
      ].join('\n')
    } else {
      form.value.name = `Featured Listing – ${addr}`
      form.value.subject = `New Listing: ${addr} – ${fmt(price)}`
      form.value.previewText = `${specs} in ${loc} for ${fmt(price)}.`
      form.value.content = buildListingEmailHtml({ addr, loc, specs, price, link, heroImg, description: p.description })
      form.value.plainTextContent = [
        `${addr}`, `${loc} | ${specs}`, `Price: ${fmt(price)}`,
        '', p.description?.substring(0, 300) || '', '', `View listing → ${link}`,
      ].join('\n')
    }
  } catch (e) {
    console.error('Failed to prefill property for campaign:', e)
  }
}

function buildDealEmailHtml(d: any) {
  const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`
  return `
<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
  ${d.heroImg ? `<img src="${d.heroImg}" alt="${d.addr}" style="width:100%;max-height:340px;object-fit:cover;border-radius:8px 8px 0 0;" />` : ''}
  <div style="padding:32px 28px;">
    <div style="background:linear-gradient(135deg,#e74c3c,#c0392b);color:#fff;padding:12px 20px;border-radius:8px;margin-bottom:24px;text-align:center;">
      <span style="font-size:22px;font-weight:700;">🔥 PRICE REDUCED ${d.dropPct}%</span>
    </div>
    <h1 style="margin:0 0 8px;font-size:24px;color:#1a1a1a;">${d.addr}</h1>
    <p style="margin:0 0 20px;color:#666;font-size:15px;">${d.loc} · ${d.specs}</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <tr>
        <td style="padding:16px;background:#f8f9fa;border-radius:8px 0 0 8px;text-align:center;width:33%;">
          <div style="font-size:12px;color:#999;text-transform:uppercase;letter-spacing:1px;">Was</div>
          <div style="font-size:20px;font-weight:700;color:#999;text-decoration:line-through;">${fmt(d.original)}</div>
        </td>
        <td style="padding:16px;background:#e74c3c;text-align:center;width:33%;">
          <div style="font-size:12px;color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:1px;">Now</div>
          <div style="font-size:24px;font-weight:700;color:#fff;">${fmt(d.price)}</div>
        </td>
        <td style="padding:16px;background:#27ae60;border-radius:0 8px 8px 0;text-align:center;width:33%;">
          <div style="font-size:12px;color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:1px;">You Save</div>
          <div style="font-size:20px;font-weight:700;color:#fff;">${fmt(d.saved)}</div>
        </td>
      </tr>
    </table>
    ${d.description ? `<p style="margin:0 0 24px;color:#444;font-size:14px;line-height:1.6;">${d.description.substring(0, 300)}</p>` : ''}
    <div style="text-align:center;margin:28px 0;">
      <a href="${d.link}" style="display:inline-block;padding:14px 40px;background:#e74c3c;color:#fff;font-size:16px;font-weight:600;text-decoration:none;border-radius:8px;">View This Deal →</a>
    </div>
    <p style="text-align:center;color:#999;font-size:13px;margin-top:20px;">This property just dropped ${fmt(d.saved)} — don't wait!</p>
  </div>
</div>`.trim()
}

function buildListingEmailHtml(d: any) {
  const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`
  return `
<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
  ${d.heroImg ? `<img src="${d.heroImg}" alt="${d.addr}" style="width:100%;max-height:340px;object-fit:cover;border-radius:8px 8px 0 0;" />` : ''}
  <div style="padding:32px 28px;">
    <h1 style="margin:0 0 8px;font-size:24px;color:#1a1a1a;">${d.addr}</h1>
    <p style="margin:0 0 12px;color:#666;font-size:15px;">${d.loc} · ${d.specs}</p>
    <p style="margin:0 0 24px;font-size:28px;font-weight:700;color:#1877F2;">${fmt(d.price)}</p>
    ${d.description ? `<p style="margin:0 0 24px;color:#444;font-size:14px;line-height:1.6;">${d.description.substring(0, 300)}</p>` : ''}
    <div style="text-align:center;margin:28px 0;">
      <a href="${d.link}" style="display:inline-block;padding:14px 40px;background:#1877F2;color:#fff;font-size:16px;font-weight:600;text-decoration:none;border-radius:8px;">View Listing →</a>
    </div>
  </div>
</div>`.trim()
}

onMounted(async () => {
  await loadTemplates()
  const pid = route.query.propertyId
  if (pid) await prefillFromProperty(Number(pid))
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
