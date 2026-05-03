<template>
  <div class="admin-automation-rules px-md-8 py-md-6">
    <v-container fluid>
      <v-row class="mb-6 align-center">
        <v-col cols="12" md="7">
          <div class="d-flex align-center mb-2">
            <v-btn icon="mdi-arrow-left" variant="text" size="small" class="mr-2" to="/admin" />
            <div class="premium-accent-bar mr-4" />
            <span class="text-overline letter-spacing-2 text-gold">Behaviour Triggers</span>
          </div>
          <h1 class="display-serif text-h4 mb-1">Automation Rules</h1>
          <p class="text-body-2 text-medium-emphasis mb-0">
            Fire emails, notifications, CRM tags or Meta CAPI events whenever a visitor crosses
            a behavioural threshold. Rules run automatically against every event your site logs.
          </p>
        </v-col>
        <v-col cols="12" md="5" class="text-md-right">
          <div class="d-flex flex-wrap justify-md-end ga-2">
            <v-btn
              variant="outlined"
              class="premium-action-btn premium-ghost-btn"
              prepend-icon="mdi-rocket-launch"
              :loading="seeding"
              @click="seedDefaults"
            >Seed defaults</v-btn>
            <v-btn
              color="primary"
              class="premium-action-btn"
              prepend-icon="mdi-plus"
              @click="openCreate"
            >Add Rule</v-btn>
          </div>
        </v-col>
      </v-row>

      <v-card class="rules-card" elevation="0">
        <v-data-table
          :headers="headers"
          :items="rules"
          :loading="loading"
          density="comfortable"
          item-value="id"
          class="rules-table"
        >
          <template #item.enabled="{ item }">
            <v-switch
              :model-value="item.enabled"
              hide-details
              color="success"
              density="compact"
              @update:model-value="(v: boolean | null) => toggleEnabled(item, !!v)"
            />
          </template>
          <template #item.trigger="{ item }">
            <v-chip size="small" variant="tonal" :color="triggerColor(item.trigger?.type)">
              {{ describeTrigger(item.trigger) }}
            </v-chip>
          </template>
          <template #item.action="{ item }">
            <v-chip size="small" variant="tonal" :color="actionColor(item.action?.type)">
              {{ describeAction(item.action) }}
            </v-chip>
          </template>
          <template #item.fireCount="{ item }">
            <span class="font-weight-medium">{{ item.fireCount || 0 }}</span>
            <div v-if="item.lastFiredAt" class="text-caption text-medium-emphasis">
              last {{ formatRelative(item.lastFiredAt) }}
            </div>
          </template>
          <template #item.actions="{ item }">
            <v-btn icon="mdi-pencil" size="small" variant="text" @click="openEdit(item)" />
            <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="confirmDelete(item)" />
          </template>
          <template #no-data>
            <div class="text-center py-12">
              <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-creation-outline</v-icon>
              <div class="text-body-1 text-medium-emphasis">No automation rules yet.</div>
              <div class="text-caption text-medium-emphasis">
                Click <strong>Seed defaults</strong> to start with three high-impact rules.
              </div>
            </div>
          </template>
        </v-data-table>
      </v-card>

      <v-dialog v-model="formOpen" max-width="780" scrollable>
        <v-card>
          <v-card-title class="d-flex align-center">
            {{ editing ? 'Edit Automation Rule' : 'New Automation Rule' }}
            <v-spacer />
            <v-btn icon="mdi-close" variant="text" @click="closeForm" />
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-6">
            <v-text-field
              v-model="form.name"
              label="Rule name"
              variant="outlined"
              density="comfortable"
              :rules="[(v: string) => !!v || 'Name is required']"
            />
            <v-textarea
              v-model="form.description"
              label="Description (optional)"
              variant="outlined"
              density="comfortable"
              rows="2"
              auto-grow
            />

            <v-divider class="my-4" />
            <div class="text-overline text-medium-emphasis mb-2">Trigger</div>
            <v-select
              v-model="form.triggerType"
              :items="triggerTypes"
              label="When..."
              variant="outlined"
              density="comfortable"
            />
            <v-select
              v-if="form.triggerType === 'event'"
              v-model="form.triggerEvent"
              :items="eventNames"
              label="Event"
              variant="outlined"
              density="comfortable"
            />
            <div v-if="form.triggerType === 'score'" class="d-flex ga-2">
              <v-select
                v-model="form.scoreOperator"
                :items="['>=', '>', '==', '<=', '<']"
                label="Operator"
                variant="outlined"
                density="comfortable"
                style="max-width:140px"
              />
              <v-text-field
                v-model.number="form.scoreValue"
                label="Score value"
                type="number"
                variant="outlined"
                density="comfortable"
              />
            </div>
            <v-select
              v-if="form.triggerType === 'intent'"
              v-model="form.intentValue"
              :items="['buyer', 'seller', 'renter', 'investor', 'researcher', 'other']"
              label="Intent"
              variant="outlined"
              density="comfortable"
            />
            <v-select
              v-if="form.triggerType === 'lifecycle'"
              v-model="form.lifecycleValue"
              :items="['visitor', 'lead', 'engaged', 'qualified', 'client']"
              label="Lifecycle stage"
              variant="outlined"
              density="comfortable"
            />

            <v-divider class="my-4" />
            <div class="text-overline text-medium-emphasis mb-2">Action</div>
            <v-select
              v-model="form.actionType"
              :items="actionTypes"
              label="Then..."
              variant="outlined"
              density="comfortable"
            />
            <template v-if="form.actionType === 'email'">
              <v-select
                v-model="form.emailTo"
                :items="['lead', 'agent']"
                label="Send to"
                variant="outlined"
                density="comfortable"
              />
              <v-text-field
                v-model="form.emailSubject"
                label="Subject"
                variant="outlined"
                density="comfortable"
                hint="Supports {{name}}, {{email}}, {{intent}}, {{leadScore}}, {{eventName}}, {{path}}"
                persistent-hint
              />
              <v-textarea
                v-model="form.emailBody"
                label="Body (plain text)"
                variant="outlined"
                rows="5"
                auto-grow
                persistent-hint
              />
            </template>
            <template v-if="form.actionType === 'notify_admin'">
              <v-textarea
                v-model="form.notifyMessage"
                label="Notification message"
                variant="outlined"
                rows="3"
                auto-grow
                persistent-hint
                hint="Supports the same {{placeholders}} as email actions"
              />
            </template>
            <template v-if="form.actionType === 'meta_capi'">
              <v-text-field
                v-model="form.metaEvent"
                label="Meta event name"
                variant="outlined"
                density="comfortable"
                placeholder="Lead"
              />
              <v-text-field
                v-model.number="form.metaValue"
                label="Value (optional, CAD)"
                type="number"
                variant="outlined"
                density="comfortable"
              />
            </template>
            <template v-if="form.actionType === 'crm_tag'">
              <v-text-field
                v-model="form.tagValue"
                label="Tag to add"
                variant="outlined"
                density="comfortable"
              />
            </template>
            <template v-if="form.actionType === 'lifecycle'">
              <v-select
                v-model="form.lifecycleStage"
                :items="['visitor', 'lead', 'engaged', 'qualified', 'client']"
                label="Set lifecycle stage"
                variant="outlined"
                density="comfortable"
              />
            </template>
            <template v-if="form.actionType === 'webhook'">
              <v-text-field
                v-model="form.webhookUrl"
                label="Webhook URL"
                variant="outlined"
                density="comfortable"
              />
            </template>

            <v-divider class="my-4" />
            <v-text-field
              v-model.number="form.cooldownSeconds"
              label="Cooldown (seconds, blank = unlimited)"
              type="number"
              variant="outlined"
              density="comfortable"
              hint="Per (visitor, rule) pair. 86400 = once per day."
              persistent-hint
            />
            <v-switch
              v-model="form.enabled"
              label="Enabled"
              color="success"
              hide-details
              class="mt-3"
            />
          </v-card-text>
          <v-divider />
          <v-card-actions class="pa-4">
            <v-spacer />
            <v-btn variant="text" @click="closeForm">Cancel</v-btn>
            <v-btn color="primary" :loading="saving" @click="save">Save</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="deleteOpen" max-width="420">
        <v-card>
          <v-card-title>Delete this rule?</v-card-title>
          <v-card-text>
            <strong>{{ pendingDelete?.name }}</strong> will be removed permanently. Past run logs are kept.
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="deleteOpen = false">Cancel</v-btn>
            <v-btn color="error" :loading="deleting" @click="deleteRule">Delete</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3500">
        {{ snackbar.message }}
      </v-snackbar>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'

interface AutomationRule {
  id: number
  name: string
  description: string | null
  enabled: boolean
  trigger: any
  action: any
  cooldownSeconds: number | null
  fireCount: number
  lastFiredAt: string | null
}

const rules = ref<AutomationRule[]>([])
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const seeding = ref(false)
const formOpen = ref(false)
const editing = ref<AutomationRule | null>(null)
const deleteOpen = ref(false)
const pendingDelete = ref<AutomationRule | null>(null)

const headers = [
  { title: 'On', key: 'enabled', sortable: false, width: 70 },
  { title: 'Name', key: 'name' },
  { title: 'Trigger', key: 'trigger', sortable: false },
  { title: 'Action', key: 'action', sortable: false },
  { title: 'Fired', key: 'fireCount', width: 120 },
  { title: '', key: 'actions', sortable: false, align: 'end' as const, width: 110 },
]

const triggerTypes = [
  { title: 'Event happens', value: 'event' },
  { title: 'Lead score crosses', value: 'score' },
  { title: 'Intent detected', value: 'intent' },
  { title: 'Lifecycle stage set', value: 'lifecycle' },
]

const eventNames = [
  'page_view', 'listing_view', 'listing_favorite', 'resource_unlock',
  'form_started', 'form_submitted', 'cta_clicked', 'phone_clicked',
  'email_clicked', 'inquiry_sent', 'estimate_requested',
  'newsletter_subscribed', 'lead_created',
]

const actionTypes = [
  { title: 'Send email', value: 'email' },
  { title: 'Notify agent', value: 'notify_admin' },
  { title: 'Send Meta CAPI event', value: 'meta_capi' },
  { title: 'Add CRM tag', value: 'crm_tag' },
  { title: 'Set lifecycle stage', value: 'lifecycle' },
  { title: 'POST to webhook', value: 'webhook' },
]

const form = reactive<{
  id: number | null
  name: string
  description: string
  enabled: boolean
  triggerType: string
  triggerEvent: string
  scoreOperator: string
  scoreValue: number | null
  intentValue: string
  lifecycleValue: string
  actionType: string
  emailTo: string
  emailSubject: string
  emailBody: string
  notifyMessage: string
  metaEvent: string
  metaValue: number | null
  tagValue: string
  lifecycleStage: string
  webhookUrl: string
  cooldownSeconds: number | null
}>({
  id: null,
  name: '',
  description: '',
  enabled: true,
  triggerType: 'event',
  triggerEvent: 'form_submitted',
  scoreOperator: '>=',
  scoreValue: 70,
  intentValue: 'seller',
  lifecycleValue: 'lead',
  actionType: 'notify_admin',
  emailTo: 'lead',
  emailSubject: 'Thanks for getting in touch',
  emailBody: 'Hi {{name}},\n\nThanks for reaching out — we\'ll be back to you shortly.',
  notifyMessage: '{{eventName}} for {{email}} — score is now {{leadScore}}.',
  metaEvent: 'Lead',
  metaValue: null,
  tagValue: 'hot',
  lifecycleStage: 'qualified',
  webhookUrl: '',
  cooldownSeconds: null,
})

const snackbar = reactive({ show: false, message: '', color: 'success' })

function notify(message: string, color: 'success' | 'error' | 'info' = 'success') {
  snackbar.message = message
  snackbar.color = color
  snackbar.show = true
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem('admin_token') || localStorage.getItem('token') || ''
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function loadRules() {
  loading.value = true
  try {
    const res = await $fetch<{ rules: AutomationRule[] }>('/api/admin/automation-rules', {
      headers: getAuthHeaders(),
    })
    rules.value = res?.rules || []
  } catch (err: any) {
    notify(err?.statusMessage || 'Could not load rules', 'error')
  } finally {
    loading.value = false
  }
}

async function seedDefaults() {
  seeding.value = true
  try {
    const res = await $fetch<{ created: number; message: string }>(
      '/api/admin/automation-rules/seed-defaults',
      { method: 'POST', headers: getAuthHeaders() }
    )
    notify(res.message, res.created > 0 ? 'success' : 'info')
    await loadRules()
  } catch (err: any) {
    notify(err?.statusMessage || 'Seed failed', 'error')
  } finally {
    seeding.value = false
  }
}

function resetForm() {
  form.id = null
  form.name = ''
  form.description = ''
  form.enabled = true
  form.triggerType = 'event'
  form.triggerEvent = 'form_submitted'
  form.scoreOperator = '>='
  form.scoreValue = 70
  form.intentValue = 'seller'
  form.lifecycleValue = 'lead'
  form.actionType = 'notify_admin'
  form.emailTo = 'lead'
  form.emailSubject = 'Thanks for getting in touch'
  form.emailBody = 'Hi {{name}},\n\nThanks for reaching out — we\'ll be back to you shortly.'
  form.notifyMessage = '{{eventName}} for {{email}} — score is now {{leadScore}}.'
  form.metaEvent = 'Lead'
  form.metaValue = null
  form.tagValue = 'hot'
  form.lifecycleStage = 'qualified'
  form.webhookUrl = ''
  form.cooldownSeconds = null
}

function openCreate() {
  editing.value = null
  resetForm()
  formOpen.value = true
}

function openEdit(rule: AutomationRule) {
  editing.value = rule
  resetForm()
  form.id = rule.id
  form.name = rule.name
  form.description = rule.description || ''
  form.enabled = rule.enabled
  form.cooldownSeconds = rule.cooldownSeconds ?? null
  if (rule.trigger?.type) {
    form.triggerType = rule.trigger.type
    if (rule.trigger.type === 'event') form.triggerEvent = rule.trigger.event || 'form_submitted'
    if (rule.trigger.type === 'score') {
      form.scoreOperator = rule.trigger.operator || '>='
      form.scoreValue = Number(rule.trigger.value) || 70
    }
    if (rule.trigger.type === 'intent') form.intentValue = rule.trigger.value || 'seller'
    if (rule.trigger.type === 'lifecycle') form.lifecycleValue = rule.trigger.value || 'lead'
  }
  if (rule.action?.type) {
    form.actionType = rule.action.type
    if (rule.action.type === 'email') {
      form.emailTo = rule.action.to || 'lead'
      form.emailSubject = rule.action.subject || ''
      form.emailBody = rule.action.body || ''
    }
    if (rule.action.type === 'notify_admin') form.notifyMessage = rule.action.message || ''
    if (rule.action.type === 'meta_capi') {
      form.metaEvent = rule.action.event || 'Lead'
      form.metaValue = rule.action.value ?? null
    }
    if (rule.action.type === 'crm_tag') form.tagValue = rule.action.tag || ''
    if (rule.action.type === 'lifecycle') form.lifecycleStage = rule.action.stage || 'qualified'
    if (rule.action.type === 'webhook') form.webhookUrl = rule.action.url || ''
  }
  formOpen.value = true
}

function closeForm() {
  formOpen.value = false
}

function buildTrigger(): any {
  switch (form.triggerType) {
    case 'event': return { type: 'event', event: form.triggerEvent }
    case 'score': return { type: 'score', operator: form.scoreOperator, value: form.scoreValue }
    case 'intent': return { type: 'intent', value: form.intentValue }
    case 'lifecycle': return { type: 'lifecycle', value: form.lifecycleValue }
    default: return { type: 'event', event: 'form_submitted' }
  }
}

function buildAction(): any {
  switch (form.actionType) {
    case 'email':
      return { type: 'email', to: form.emailTo, subject: form.emailSubject, body: form.emailBody }
    case 'notify_admin':
      return { type: 'notify_admin', message: form.notifyMessage }
    case 'meta_capi':
      return form.metaValue
        ? { type: 'meta_capi', event: form.metaEvent, value: form.metaValue, currency: 'CAD' }
        : { type: 'meta_capi', event: form.metaEvent }
    case 'crm_tag':
      return { type: 'crm_tag', tag: form.tagValue }
    case 'lifecycle':
      return { type: 'lifecycle', stage: form.lifecycleStage }
    case 'webhook':
      return { type: 'webhook', url: form.webhookUrl }
    default:
      return { type: 'notify_admin', message: '' }
  }
}

async function save() {
  if (!form.name.trim()) {
    notify('Name is required', 'error')
    return
  }
  saving.value = true
  try {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      enabled: form.enabled,
      trigger: buildTrigger(),
      action: buildAction(),
      cooldownSeconds: form.cooldownSeconds ?? null,
    }
    if (form.id) {
      await $fetch(`/api/admin/automation-rules/${form.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: payload,
      })
      notify('Rule updated')
    } else {
      await $fetch('/api/admin/automation-rules', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: payload,
      })
      notify('Rule created')
    }
    formOpen.value = false
    await loadRules()
  } catch (err: any) {
    notify(err?.statusMessage || 'Save failed', 'error')
  } finally {
    saving.value = false
  }
}

async function toggleEnabled(rule: AutomationRule, value: boolean) {
  try {
    await $fetch(`/api/admin/automation-rules/${rule.id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: { enabled: value },
    })
    rule.enabled = value
  } catch (err: any) {
    notify(err?.statusMessage || 'Toggle failed', 'error')
  }
}

function confirmDelete(rule: AutomationRule) {
  pendingDelete.value = rule
  deleteOpen.value = true
}

async function deleteRule() {
  if (!pendingDelete.value) return
  deleting.value = true
  try {
    await $fetch(`/api/admin/automation-rules/${pendingDelete.value.id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
    notify('Rule deleted')
    deleteOpen.value = false
    pendingDelete.value = null
    await loadRules()
  } catch (err: any) {
    notify(err?.statusMessage || 'Delete failed', 'error')
  } finally {
    deleting.value = false
  }
}

function describeTrigger(trigger: any): string {
  if (!trigger) return '—'
  switch (trigger.type) {
    case 'event': return `Event: ${trigger.event}`
    case 'score': return `Score ${trigger.operator} ${trigger.value}`
    case 'intent': return `Intent = ${trigger.value}`
    case 'lifecycle': return `Stage = ${trigger.value}`
    default: return trigger.type
  }
}

function describeAction(action: any): string {
  if (!action) return '—'
  switch (action.type) {
    case 'email': return `Email ${action.to}`
    case 'notify_admin': return 'Notify agent'
    case 'meta_capi': return `Meta CAPI: ${action.event || 'Lead'}`
    case 'crm_tag': return `Tag: ${action.tag}`
    case 'lifecycle': return `Stage → ${action.stage}`
    case 'webhook': return 'Webhook'
    default: return action.type
  }
}

function triggerColor(type: string): string {
  switch (type) {
    case 'event': return 'primary'
    case 'score': return 'error'
    case 'intent': return 'warning'
    case 'lifecycle': return 'info'
    default: return 'grey'
  }
}

function actionColor(type: string): string {
  switch (type) {
    case 'email': return 'primary'
    case 'notify_admin': return 'success'
    case 'meta_capi': return 'info'
    case 'crm_tag': return 'warning'
    case 'lifecycle': return 'purple'
    case 'webhook': return 'grey'
    default: return 'grey'
  }
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

onMounted(loadRules)

definePageMeta({ layout: 'admin', middleware: ['admin'] })
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;600;700&display=swap');
.admin-automation-rules { background-color: #fcfcfb; font-family: 'Inter', sans-serif; min-height: 100vh; }
.display-serif { font-family: 'Playfair Display', serif; }
.text-gold { color: #8c734b; }
.letter-spacing-2 { letter-spacing: 2px; }
.premium-accent-bar { width: 40px; height: 4px; background: #8c734b; border-radius: 2px; }
.premium-action-btn { border-radius: 12px !important; text-transform: none !important; font-weight: 700 !important; }
.premium-ghost-btn { border-color: #d6c9a4 !important; color: #8c734b !important; }
.rules-card { border-radius: 20px !important; border: 1px solid rgba(0,0,0,0.05) !important; background: white !important; }
.rules-table th { text-transform: uppercase; letter-spacing: 1px; font-size: 0.72rem !important; }
</style>
