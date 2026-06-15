<template>
  <div class="admin-automations-premium px-md-8 py-md-6">
    <v-container fluid>
      <!-- Page Header -->
      <v-row class="mb-8 align-center">
        <v-col cols="12" md="8">
          <div class="d-flex align-center mb-2">
            <v-btn icon="mdi-arrow-left" variant="text" :to="'/admin/newsletter'" class="mr-3"></v-btn>
            <div class="premium-accent-bar mr-4"></div>
            <span class="text-overline letter-spacing-2 text-gold">Marketing Automation</span>
          </div>
          <h1 class="display-serif text-h3 mb-1">Automations</h1>
          <p class="text-subtitle-1 text-medium-emphasis font-weight-light">
            Schedule recurring sends or fire off an instant newsletter from a campaign or template
          </p>
        </v-col>
        <v-col cols="12" md="4" class="text-md-right">
          <v-btn
            color="primary"
            prepend-icon="mdi-flash-outline"
            variant="tonal"
            class="mr-2"
            @click="openInstantDialog"
          >
            Send Instantly
          </v-btn>
          <v-btn
            color="primary"
            prepend-icon="mdi-robot-outline"
            @click="openCreateAutomationDialog"
          >
            Create Automation
          </v-btn>
        </v-col>
      </v-row>

      <!-- Automations List -->
      <v-row>
        <v-col v-for="automation in automations" :key="automation.id" cols="12" md="6">
          <v-card class="automation-card-premium" elevation="0">
            <v-card-text class="pa-6">
              <div class="d-flex justify-space-between align-start mb-4">
                <div class="d-flex align-items-center">
                  <v-switch
                    :model-value="automation.isActive"
                    color="success"
                    density="compact"
                    hide-details
                    @update:model-value="toggleAutomation(automation)"
                  />
                  <v-chip
                    :color="automation.isActive ? 'success' : 'grey'"
                    size="small"
                    class="ml-3"
                    variant="flat"
                  >
                    {{ automation.isActive ? 'Active' : 'Inactive' }}
                  </v-chip>
                </div>
                <v-menu>
                  <template v-slot:activator="{ props }">
                    <v-btn icon="mdi-dots-vertical" variant="text" size="small" v-bind="props"></v-btn>
                  </template>
                  <v-list>
                    <v-list-item @click="runAutomation(automation)" :disabled="runningId === automation.id">
                      <v-list-item-title>
                        <v-icon icon="mdi-send" size="small" class="mr-2" />
                        Send Now
                      </v-list-item-title>
                    </v-list-item>
                    <v-list-item @click="editAutomation(automation)">
                      <v-list-item-title>
                        <v-icon icon="mdi-pencil" size="small" class="mr-2" />
                        Edit
                      </v-list-item-title>
                    </v-list-item>
                    <v-list-item @click="deleteAutomation(automation.id)">
                      <v-list-item-title class="text-error">
                        <v-icon icon="mdi-delete" size="small" class="mr-2" />
                        Delete
                      </v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </div>

              <div class="automation-icon mb-4">
                <v-icon icon="mdi-robot-outline" size="40" color="#8c734b" />
              </div>

              <h3 class="text-h6 font-weight-bold mb-2">{{ automation.name }}</h3>
              <p v-if="automation.description" class="text-caption text-medium-emphasis mb-4">
                {{ automation.description }}
              </p>

              <div class="automation-details mb-4">
                <div class="detail-item">
                  <v-icon icon="mdi-calendar-clock" size="small" class="mr-2" />
                  <span class="text-body-2">{{ getFrequencyText(automation) }}</span>
                </div>
                <div class="detail-item">
                  <v-icon icon="mdi-clock-outline" size="small" class="mr-2" />
                  <span class="text-body-2">{{ automation.timeOfDay || '09:00' }}</span>
                </div>
                <div class="detail-item">
                  <v-icon :icon="getSourceIcon(automation)" size="small" class="mr-2" />
                  <span class="text-body-2">{{ getSourceLabel(automation) }}</span>
                </div>
                <div class="detail-item">
                  <v-icon icon="mdi-account-group-outline" size="small" class="mr-2" />
                  <span class="text-body-2">{{ getAudienceLabel(automation) }}</span>
                </div>
              </div>

              <v-divider class="my-4" />

              <div class="d-flex justify-space-between align-center">
                <div class="text-caption text-medium-emphasis">
                  <div>Runs: {{ automation.runCount }}</div>
                  <div v-if="automation.lastRun">Last: {{ formatDate(automation.lastRun) }}</div>
                </div>
                <div v-if="automation.nextRun && automation.isActive" class="text-caption font-weight-bold text-success">
                  Next: {{ formatDate(automation.nextRun) }}
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Empty State -->
      <v-row v-if="!loading && automations.length === 0">
        <v-col cols="12">
          <v-card class="text-center pa-12" elevation="0">
            <v-icon icon="mdi-robot-outline" size="64" color="#cbd5e1" class="mb-4" />
            <h3 class="text-h5 mb-2">No Automations Yet</h3>
            <p class="text-medium-emphasis mb-6">Create your first automation to schedule newsletters automatically</p>
            <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateAutomationDialog">
              Create Automation
            </v-btn>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Automation / Instant Send Dialog -->
    <v-dialog v-model="showAutomationDialog" max-width="780" scrollable>
      <v-card>
        <v-card-title class="pa-6 d-flex align-center">
          <span class="display-serif text-h5">
            {{ dialogTitle }}
          </span>
          <v-spacer />
          <v-chip v-if="formData.mode === 'instant'" color="primary" size="small" variant="flat">
            Instant Send
          </v-chip>
          <v-chip v-else color="success" size="small" variant="flat">
            Scheduled
          </v-chip>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-6">
          <v-form ref="form">
            <!-- Mode toggle: only when creating (not editing). -->
            <div v-if="!editingAutomation" class="mb-6">
              <div class="text-overline text-medium-emphasis mb-2">How do you want to send this?</div>
              <v-btn-toggle
                v-model="formData.mode"
                mandatory
                color="primary"
                variant="outlined"
                divided
              >
                <v-btn value="schedule" prepend-icon="mdi-calendar-clock">Schedule</v-btn>
                <v-btn value="instant" prepend-icon="mdi-flash-outline">Send Now</v-btn>
              </v-btn-toggle>
              <div class="text-caption text-medium-emphasis mt-2">
                {{ formData.mode === 'schedule'
                  ? 'Save as a recurring automation. Runs on the cadence you configure below.'
                  : 'Fires off a single newsletter right now to the audience you pick — no automation row is created.' }}
              </div>
            </div>

            <!-- Source selection -->
            <h4 class="text-subtitle-1 font-weight-bold mb-3">Content Source</h4>
            <v-radio-group v-model="formData.sourceType" inline density="compact" class="mb-2">
              <v-radio label="Existing Campaign" value="campaign" />
              <v-radio label="Template" value="template" />
            </v-radio-group>

            <v-select
              v-if="formData.sourceType === 'campaign'"
              v-model="formData.campaignId"
              :items="campaigns"
              item-title="name"
              item-value="id"
              label="Pick a Campaign"
              variant="outlined"
              density="compact"
              prepend-inner-icon="mdi-email-multiple-outline"
              clearable
              class="mb-4"
              :rules="[v => !!v || 'Select a campaign']"
            >
              <template v-slot:item="{ props, item }">
                <v-list-item v-bind="props">
                  <template v-slot:title>
                    <div class="font-weight-medium">{{ item.raw.name }}</div>
                  </template>
                  <template v-slot:subtitle>
                    <div class="text-caption">{{ item.raw.subject }} · {{ item.raw.status }}</div>
                  </template>
                </v-list-item>
              </template>
            </v-select>

            <v-select
              v-if="formData.sourceType === 'template'"
              v-model="formData.templateId"
              :items="templates"
              item-title="name"
              item-value="id"
              label="Pick a Template"
              variant="outlined"
              density="compact"
              prepend-inner-icon="mdi-file-document-outline"
              clearable
              class="mb-4"
              :rules="[v => !!v || 'Select a template']"
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

            <v-text-field
              v-model="formData.subject"
              label="Subject Override (Optional)"
              variant="outlined"
              density="compact"
              hint="Leave empty to use the campaign/template subject"
              persistent-hint
              class="mb-6"
            />

            <!-- Audience -->
            <h4 class="text-subtitle-1 font-weight-bold mb-3">Recipients</h4>
            <v-radio-group v-model="formData.audience" density="compact" class="mb-2">
              <v-radio
                v-for="opt in audienceOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </v-radio-group>

            <v-autocomplete
              v-if="formData.audience === 'specific'"
              v-model="formData.subscriberIds"
              :items="subscribers"
              item-title="email"
              item-value="id"
              label="Choose Subscribers"
              variant="outlined"
              density="compact"
              prepend-inner-icon="mdi-account-multiple-outline"
              multiple
              chips
              closable-chips
              :loading="loadingSubscribers"
              class="mb-2"
              :rules="[v => (Array.isArray(v) && v.length > 0) || 'Select at least one subscriber']"
            >
              <template v-slot:item="{ props, item }">
                <v-list-item v-bind="props">
                  <template v-slot:title>
                    <span class="font-weight-medium">{{ item.raw.email }}</span>
                  </template>
                  <template v-slot:subtitle>
                    <span class="text-caption">
                      {{ [item.raw.firstName, item.raw.lastName].filter(Boolean).join(' ') }}
                      <span v-if="item.raw.firstName || item.raw.lastName"> · </span>
                      {{ item.raw.status }}
                    </span>
                  </template>
                </v-list-item>
              </template>
            </v-autocomplete>

            <v-alert type="info" variant="tonal" density="compact" class="mb-6">
              <div class="text-body-2">
                <span v-if="audienceCountLoading">Counting recipients…</span>
                <span v-else>This will be sent to <strong>{{ audienceCount?.toLocaleString() ?? 0 }}</strong> active subscriber<span v-if="audienceCount !== 1">s</span>.</span>
              </div>
            </v-alert>

            <!-- Schedule (only when scheduling) -->
            <template v-if="formData.mode === 'schedule'">
              <v-divider class="my-4" />
              <h4 class="text-subtitle-1 font-weight-bold mb-3">Automation Details</h4>
              <v-text-field
                v-model="formData.name"
                label="Automation Name"
                variant="outlined"
                density="compact"
                class="mb-4"
                :rules="[v => !!v || 'Name is required']"
              />
              <v-textarea
                v-model="formData.description"
                label="Description (Optional)"
                variant="outlined"
                density="compact"
                rows="2"
                class="mb-4"
              />

              <h4 class="text-subtitle-1 font-weight-bold mb-3">Schedule</h4>
              <v-select
                v-model="formData.frequency"
                :items="['daily', 'weekly', 'monthly']"
                label="Frequency"
                variant="outlined"
                density="compact"
                class="mb-4"
                :rules="[v => !!v || 'Frequency is required']"
              />
              <v-select
                v-if="formData.frequency === 'weekly'"
                v-model="formData.dayOfWeek"
                :items="dayOptions"
                label="Day of Week"
                variant="outlined"
                density="compact"
                class="mb-4"
              />
              <v-text-field
                v-if="formData.frequency === 'monthly'"
                v-model.number="formData.dayOfMonth"
                type="number"
                min="1"
                max="31"
                label="Day of Month"
                variant="outlined"
                density="compact"
                class="mb-4"
              />
              <v-text-field
                v-model="formData.timeOfDay"
                type="time"
                label="Time of Day"
                variant="outlined"
                density="compact"
                class="mb-4"
              />
              <v-switch
                v-model="formData.isActive"
                label="Activate immediately"
                color="primary"
              />
            </template>
          </v-form>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-6">
          <v-spacer />
          <v-btn variant="text" @click="closeAutomationDialog">Cancel</v-btn>
          <v-btn
            v-if="formData.mode === 'instant' && !editingAutomation"
            color="primary"
            prepend-icon="mdi-send"
            :loading="sendingNow"
            @click="sendInstantly"
          >
            Send Now
          </v-btn>
          <v-btn
            v-else
            color="primary"
            :loading="saving"
            @click="saveAutomation"
          >
            {{ editingAutomation ? 'Update' : 'Create Automation' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4500">
      <v-icon :icon="snackbar.color === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle'" class="mr-2" />
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { formatDate } from '~/utils/formatters'

const getAuthHeaders = (): Record<string, string> => {
  if (process.client) {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }
  return {}
}

const automations = ref<any[]>([])
const campaigns = ref<any[]>([])
const templates = ref<any[]>([])
const subscribers = ref<any[]>([])
const loading = ref(false)
const loadingSubscribers = ref(false)
const saving = ref(false)
const sendingNow = ref(false)
const runningId = ref<number | null>(null)
const showAutomationDialog = ref(false)
const editingAutomation = ref<any>(null)
const audienceCount = ref<number | null>(null)
const audienceCountLoading = ref(false)

const snackbar = ref({ show: false, color: 'success' as 'success' | 'error', message: '' })
const showSnack = (color: 'success' | 'error', message: string) => {
  snackbar.value = { show: true, color, message }
}

interface FormState {
  mode: 'schedule' | 'instant'
  sourceType: 'campaign' | 'template'
  campaignId: number | null
  templateId: number | null
  subject: string
  audience: 'all' | 'new' | 'inactive' | 'specific'
  subscriberIds: number[]
  // Scheduling-only fields:
  name: string
  description: string
  frequency: 'daily' | 'weekly' | 'monthly'
  dayOfWeek: number
  dayOfMonth: number
  timeOfDay: string
  isActive: boolean
}

const defaultForm = (): FormState => ({
  mode: 'schedule',
  sourceType: 'campaign',
  campaignId: null,
  templateId: null,
  subject: '',
  audience: 'all',
  subscriberIds: [],
  name: '',
  description: '',
  frequency: 'weekly',
  dayOfWeek: 1,
  dayOfMonth: 1,
  timeOfDay: '09:00',
  isActive: true,
})

const formData = ref<FormState>(defaultForm())

const dayOptions = [
  { title: 'Monday', value: 1 },
  { title: 'Tuesday', value: 2 },
  { title: 'Wednesday', value: 3 },
  { title: 'Thursday', value: 4 },
  { title: 'Friday', value: 5 },
  { title: 'Saturday', value: 6 },
  { title: 'Sunday', value: 0 },
]

const audienceOptions = [
  { value: 'all', label: 'All Active Subscribers' },
  { value: 'new', label: 'New Subscribers (Last 30 Days)' },
  { value: 'inactive', label: 'Inactive (No Opens in 90 Days)' },
  { value: 'specific', label: 'Specific Subscribers (Pick Below)' },
]

const dialogTitle = computed(() => {
  if (editingAutomation.value) return 'Edit Automation'
  return formData.value.mode === 'instant' ? 'Send Newsletter Instantly' : 'Create Automation'
})

const getFrequencyText = (automation: any) => {
  if (automation.frequency === 'daily') return 'Daily'
  if (automation.frequency === 'weekly') {
    const day = dayOptions.find((d) => d.value === automation.dayOfWeek)
    return `Weekly on ${day?.title || 'Monday'}`
  }
  if (automation.frequency === 'monthly') return `Monthly on day ${automation.dayOfMonth}`
  return automation.frequency
}

const getSourceIcon = (automation: any) => {
  const filters = automation.targetFilters || {}
  if (filters.campaignId) return 'mdi-email-multiple-outline'
  if (automation.templateId) return 'mdi-file-document-outline'
  return 'mdi-text-box-outline'
}

const getSourceLabel = (automation: any) => {
  const filters = automation.targetFilters || {}
  if (filters.campaignId) {
    const c = campaigns.value.find((x) => x.id === filters.campaignId)
    return c ? `Campaign · ${c.name}` : `Campaign #${filters.campaignId}`
  }
  if (automation.templateId) {
    const t = templates.value.find((x) => x.id === automation.templateId)
    return t ? `Template · ${t.name}` : `Template #${automation.templateId}`
  }
  return 'Custom content'
}

const getAudienceLabel = (automation: any) => {
  const filters = automation.targetFilters || {}
  const audience = filters.audience || 'all'
  if (audience === 'specific') {
    const count = Array.isArray(filters.subscriberIds) ? filters.subscriberIds.length : 0
    return `${count} specific subscriber${count === 1 ? '' : 's'}`
  }
  const found = audienceOptions.find((o) => o.value === audience)
  return found ? found.label : 'All Active Subscribers'
}

const loadAutomations = async () => {
  loading.value = true
  try {
    const data = (await $fetch('/api/admin/newsletter/automations', { headers: getAuthHeaders() })) as any
    automations.value = data.automations
  } catch (error) {
    console.error('Error loading automations:', error)
  } finally {
    loading.value = false
  }
}

const loadCampaigns = async () => {
  try {
    const data = (await $fetch('/api/admin/newsletter/campaigns', {
      headers: getAuthHeaders(),
      params: { limit: 100 },
    })) as any
    campaigns.value = data.campaigns || []
  } catch (error) {
    console.error('Error loading campaigns:', error)
  }
}

const loadTemplates = async () => {
  try {
    const data = (await $fetch('/api/admin/newsletter/templates', {
      headers: getAuthHeaders(),
      params: { limit: 100 },
    })) as any
    templates.value = data.templates || []
  } catch (error) {
    console.error('Error loading templates:', error)
  }
}

const loadSubscribers = async () => {
  loadingSubscribers.value = true
  try {
    const data = (await $fetch('/api/admin/newsletter/subscribers', {
      headers: getAuthHeaders(),
      params: { limit: 1000, status: 'active' },
    })) as any
    subscribers.value = data.subscribers || []
  } catch (error) {
    console.error('Error loading subscribers:', error)
  } finally {
    loadingSubscribers.value = false
  }
}

const refreshAudienceCount = async () => {
  audienceCountLoading.value = true
  try {
    const params: Record<string, any> = { audience: formData.value.audience }
    if (formData.value.audience === 'specific') {
      // Send as comma-separated list — Nuxt's $fetch flattens arrays into
      // repeated `?subscriberIds=` params, but the server normalizer accepts
      // either shape, so go with the flat list for cleaner URLs.
      params.subscriberIds = formData.value.subscriberIds.join(',')
    }
    const res = (await $fetch('/api/admin/newsletter/audience-count', {
      headers: getAuthHeaders(),
      params,
    })) as any
    audienceCount.value = res?.count ?? 0
  } catch (e) {
    console.error('Failed to load audience count', e)
    audienceCount.value = null
  } finally {
    audienceCountLoading.value = false
  }
}

watch(
  () => [formData.value.audience, formData.value.subscriberIds.length],
  () => {
    if (showAutomationDialog.value) refreshAudienceCount()
  },
)

const openCreateAutomationDialog = () => {
  editingAutomation.value = null
  formData.value = defaultForm()
  formData.value.mode = 'schedule'
  showAutomationDialog.value = true
  refreshAudienceCount()
}

const openInstantDialog = () => {
  editingAutomation.value = null
  formData.value = defaultForm()
  formData.value.mode = 'instant'
  showAutomationDialog.value = true
  refreshAudienceCount()
}

const editAutomation = (automation: any) => {
  editingAutomation.value = automation
  const filters = automation.targetFilters || {}
  const sourceType: 'campaign' | 'template' = filters.campaignId ? 'campaign' : 'template'
  formData.value = {
    mode: 'schedule',
    sourceType,
    campaignId: filters.campaignId || null,
    templateId: automation.templateId || null,
    subject: automation.subject || '',
    audience: filters.audience || 'all',
    subscriberIds: Array.isArray(filters.subscriberIds) ? [...filters.subscriberIds] : [],
    name: automation.name,
    description: automation.description || '',
    frequency: automation.frequency || 'weekly',
    dayOfWeek: automation.dayOfWeek ?? 1,
    dayOfMonth: automation.dayOfMonth ?? 1,
    timeOfDay: automation.timeOfDay || '09:00',
    isActive: automation.isActive,
  }
  showAutomationDialog.value = true
  refreshAudienceCount()
}

const toggleAutomation = async (automation: any) => {
  try {
    await $fetch(`/api/admin/newsletter/automations/${automation.id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: { isActive: !automation.isActive },
    })
    await loadAutomations()
  } catch (error) {
    console.error('Error toggling automation:', error)
    showSnack('error', 'Failed to toggle automation')
  }
}

const deleteAutomation = async (id: number) => {
  if (!confirm('Are you sure you want to delete this automation?')) return
  try {
    await $fetch(`/api/admin/newsletter/automations/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
    await loadAutomations()
    showSnack('success', 'Automation deleted')
  } catch (error) {
    console.error('Error deleting automation:', error)
    showSnack('error', 'Failed to delete automation')
  }
}

const runAutomation = async (automation: any) => {
  if (!confirm(`Send "${automation.name}" right now to its configured audience?`)) return
  runningId.value = automation.id
  try {
    const res = (await $fetch(`/api/admin/newsletter/automations/${automation.id}/run`, {
      method: 'POST',
      headers: getAuthHeaders(),
    })) as any
    showSnack('success', res?.message || 'Newsletter sent')
    await loadAutomations()
  } catch (error: any) {
    console.error('Error running automation:', error)
    showSnack('error', error?.data?.message || 'Failed to send newsletter')
  } finally {
    runningId.value = null
  }
}

const buildPayload = () => {
  const payload: Record<string, any> = {
    audience: formData.value.audience,
    subscriberIds: formData.value.audience === 'specific' ? formData.value.subscriberIds : [],
    subject: formData.value.subject || undefined,
  }
  if (formData.value.sourceType === 'campaign') {
    payload.campaignId = formData.value.campaignId
    payload.templateId = null
  } else {
    payload.templateId = formData.value.templateId
    payload.campaignId = null
  }
  return payload
}

const sendInstantly = async () => {
  if (!formData.value.campaignId && formData.value.sourceType === 'campaign') {
    showSnack('error', 'Pick a campaign first')
    return
  }
  if (!formData.value.templateId && formData.value.sourceType === 'template') {
    showSnack('error', 'Pick a template first')
    return
  }
  if (formData.value.audience === 'specific' && formData.value.subscriberIds.length === 0) {
    showSnack('error', 'Pick at least one subscriber')
    return
  }
  sendingNow.value = true
  try {
    const res = (await $fetch('/api/admin/newsletter/automations/send-now', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: buildPayload(),
    })) as any
    showSnack('success', res?.message || 'Newsletter sent')
    closeAutomationDialog()
  } catch (error: any) {
    console.error('Error sending instantly:', error)
    showSnack('error', error?.data?.message || 'Failed to send newsletter')
  } finally {
    sendingNow.value = false
  }
}

const saveAutomation = async () => {
  if (!formData.value.name) {
    showSnack('error', 'Automation name is required')
    return
  }
  if (formData.value.sourceType === 'campaign' && !formData.value.campaignId) {
    showSnack('error', 'Pick a campaign')
    return
  }
  if (formData.value.sourceType === 'template' && !formData.value.templateId) {
    showSnack('error', 'Pick a template')
    return
  }
  if (formData.value.audience === 'specific' && formData.value.subscriberIds.length === 0) {
    showSnack('error', 'Pick at least one subscriber')
    return
  }

  saving.value = true
  try {
    const body = {
      name: formData.value.name,
      description: formData.value.description,
      frequency: formData.value.frequency,
      dayOfWeek: formData.value.dayOfWeek,
      dayOfMonth: formData.value.dayOfMonth,
      timeOfDay: formData.value.timeOfDay,
      isActive: formData.value.isActive,
      ...buildPayload(),
    }
    if (editingAutomation.value) {
      await $fetch(`/api/admin/newsletter/automations/${editingAutomation.value.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body,
      })
      showSnack('success', 'Automation updated')
    } else {
      await $fetch('/api/admin/newsletter/automations', {
        method: 'POST',
        headers: getAuthHeaders(),
        body,
      })
      showSnack('success', 'Automation created')
    }
    closeAutomationDialog()
    await loadAutomations()
  } catch (error: any) {
    console.error('Error saving automation:', error)
    showSnack('error', error?.data?.message || 'An error occurred')
  } finally {
    saving.value = false
  }
}

const closeAutomationDialog = () => {
  showAutomationDialog.value = false
  editingAutomation.value = null
  formData.value = defaultForm()
}

onMounted(() => {
  loadAutomations()
  loadCampaigns()
  loadTemplates()
  loadSubscribers()
})

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;600;700&display=swap');

.admin-automations-premium {
  background-color: #fcfcfb;
  font-family: 'Inter', sans-serif;
  min-height: 100vh;
}

.display-serif {
  font-family: 'Playfair Display', serif;
}

.text-gold {
  color: #8c734b;
}

.letter-spacing-2 { letter-spacing: 2px; }

.premium-accent-bar {
  width: 40px;
  height: 4px;
  background: #8c734b;
  border-radius: 2px;
}

.automation-card-premium {
  border-radius: 20px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  background: white !important;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.automation-card-premium:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.08) !important;
}

.automation-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 70px;
  height: 70px;
  background: rgba(140, 115, 75, 0.1);
  border-radius: 16px;
}

.automation-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-item {
  display: flex;
  align-items: center;
  color: #64748b;
}
</style>
