<template>
  <div class="admin-celebrations px-md-8 py-md-6">
    <v-container fluid>
      <!-- Header -->
      <v-row class="mb-8 align-center">
        <v-col cols="12" md="8">
          <div class="d-flex align-center mb-2">
            <v-btn icon="mdi-arrow-left" variant="text" size="small" class="mr-2" to="/admin/crm" />
            <div class="premium-accent-bar mr-4"></div>
            <span class="text-overline letter-spacing-2 text-gold">CRM</span>
          </div>
          <h1 class="display-serif text-h3 mb-1">Celebrations</h1>
          <p class="text-subtitle-1 text-medium-emphasis font-weight-light">
            Templates and auto-send rules for birthdays, anniversaries, and holidays.
          </p>
        </v-col>
        <v-col cols="12" md="4" class="text-md-right">
          <v-btn
            color="warning"
            variant="tonal"
            class="premium-action-btn mr-2"
            prepend-icon="mdi-star-crescent"
            @click="openEidDialog"
          >Send Eid Wishes</v-btn>
        </v-col>
      </v-row>

      <!-- Auto-send rules -->
      <v-row class="mb-8">
        <v-col cols="12">
          <v-card class="setting-card" elevation="0">
            <v-card-title class="pa-6">
              <v-icon class="mr-3" color="primary">mdi-flash</v-icon>
              <div>
                <span class="display-serif text-h5">Auto-send Rules</span>
                <div class="text-caption text-medium-emphasis">
                  When enabled, the daily cron at <code>/api/cron/celebrations</code> sends these for you.
                </div>
              </div>
            </v-card-title>
            <v-divider class="opacity-10" />
            <v-card-text class="pa-6">
              <v-row>
                <v-col v-for="t in autoSendToggles" :key="t.field" cols="12" md="6" lg="4">
                  <div class="auto-send-row">
                    <v-icon :color="t.color" class="mr-3" size="20">{{ t.icon }}</v-icon>
                    <div class="flex-grow-1">
                      <div class="font-weight-bold">{{ t.label }}</div>
                      <div class="text-caption text-medium-emphasis">{{ t.help }}</div>
                    </div>
                    <v-switch
                      v-model="settings[t.field]"
                      color="primary"
                      density="compact"
                      hide-details
                      @update:model-value="saveSettings()"
                    />
                  </div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Templates editor -->
      <v-row class="mb-8">
        <v-col cols="12">
          <v-card class="setting-card" elevation="0">
            <v-card-title class="pa-6">
              <v-icon class="mr-3" color="warning">mdi-email-edit-outline</v-icon>
              <div>
                <span class="display-serif text-h5">Message Templates</span>
                <div class="text-caption text-medium-emphasis">
                  Available placeholders: <code>{{ '{{firstName}}' }}</code>,
                  <code>{{ '{{lastName}}' }}</code>,
                  <code>{{ '{{adminName}}' }}</code>,
                  <code>{{ '{{year}}' }}</code>
                </div>
              </div>
            </v-card-title>
            <v-divider class="opacity-10" />
            <v-tabs
              v-model="activeKind"
              color="primary"
              density="comfortable"
              show-arrows
              class="px-4"
            >
              <v-tab v-for="k in CELEBRATION_KINDS" :key="k.value" :value="k.value">
                <v-icon size="16" class="mr-2">{{ k.icon }}</v-icon>
                {{ k.label }}
              </v-tab>
            </v-tabs>
            <v-divider />
            <v-card-text class="pa-6">
              <v-window v-model="activeKind">
                <v-window-item v-for="k in CELEBRATION_KINDS" :key="k.value" :value="k.value">
                  <div class="d-flex align-center mb-3 flex-wrap">
                    <v-chip size="small" variant="tonal" class="mr-2 mb-2">
                      <v-icon start size="14">mdi-information-outline</v-icon>
                      {{ k.help }}
                    </v-chip>
                    <v-spacer />
                    <v-btn
                      v-if="hasOverride(k.value)"
                      size="small"
                      variant="text"
                      prepend-icon="mdi-restore"
                      class="mb-2"
                      @click="resetTemplate(k.value)"
                    >Reset to default</v-btn>
                  </div>
                  <v-text-field
                    :model-value="getSubject(k.value)"
                    @update:model-value="setSubject(k.value, $event)"
                    @blur="saveSettings()"
                    label="Subject"
                    variant="outlined"
                    density="comfortable"
                    :placeholder="defaults[k.value]?.subject"
                    class="mb-3"
                  />
                  <v-textarea
                    :model-value="getBody(k.value)"
                    @update:model-value="setBody(k.value, $event)"
                    @blur="saveSettings()"
                    label="Message (HTML supported)"
                    variant="outlined"
                    density="comfortable"
                    rows="9"
                    :placeholder="defaults[k.value]?.body"
                  />
                </v-window-item>
              </v-window>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Save status -->
      <v-snackbar v-model="showSaved" timeout="2000" location="bottom" color="success">
        <v-icon icon="mdi-check-circle" class="mr-2" />
        Saved
      </v-snackbar>
    </v-container>

    <!-- Eid send dialog (open-date holiday) -->
    <SendCelebrationDialog
      v-model="showEidDialog"
      kind="eid"
      :recipient="null"
      :bulk="true"
      :bulk-eligible-count="eidEligibleCount"
      :defaults="defaults"
      :admin-name="adminName"
      @sent="onEidSent"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import SendCelebrationDialog from '~/components/crm/SendCelebrationDialog.vue'

definePageMeta({ layout: 'admin', middleware: ['admin'] })

const getAuthHeaders = (): Record<string, string> => {
  if (process.client) {
    const token = localStorage.getItem('token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }
  return {}
}

const CELEBRATION_KINDS = [
  { value: 'birthday',    label: 'Birthday',     icon: 'mdi-cake-variant',   help: 'Sent on each client\'s date of birth (month + day match).' },
  { value: 'anniversary', label: 'Anniversary',  icon: 'mdi-heart',          help: 'Sent on the wedding-anniversary month/day.' },
  { value: 'closing',     label: 'Closing',      icon: 'mdi-key-variant',    help: 'Sent on the anniversary of a successful closing (year 1+).' },
  { value: 'christmas',   label: 'Christmas',    icon: 'mdi-pine-tree',      help: 'Sent on Dec 25. Skips clients with the Christmas exception.' },
  { value: 'new_year',    label: 'New Year',     icon: 'mdi-firework',       help: 'Sent on Jan 1. Skips clients with the New Year exception.' },
  { value: 'eid',         label: 'Eid',          icon: 'mdi-star-crescent',  help: 'No fixed date — trigger manually with the Send Eid Wishes button.' },
] as const

type KindValue = typeof CELEBRATION_KINDS[number]['value']

const settings = ref<any>({
  autoSendBirthday: false,
  autoSendAnniversary: false,
  autoSendClosing: false,
  autoSendChristmas: false,
  autoSendNewYear: false,
  birthdayTemplate: '', anniversaryTemplate: '', closingTemplate: '',
  christmasTemplate: '', newYearTemplate: '', eidTemplate: '',
  birthdaySubject: '', anniversarySubject: '', closingSubject: '',
  christmasSubject: '', newYearSubject: '', eidSubject: '',
})
const defaults = ref<Record<string, { subject: string; body: string }>>({})
const activeKind = ref<KindValue>('birthday')
const showSaved = ref(false)
const adminName = ref('')

const showEidDialog = ref(false)
const eidEligibleCount = ref<number | null>(null)

const autoSendToggles = [
  { field: 'autoSendBirthday',    label: 'Birthdays',     icon: 'mdi-cake-variant',  color: 'orange',    help: 'Auto-send on client DOBs' },
  { field: 'autoSendAnniversary', label: 'Anniversaries', icon: 'mdi-heart',         color: 'red',       help: 'Wedding anniversaries' },
  { field: 'autoSendClosing',     label: 'Closings',      icon: 'mdi-key-variant',   color: 'green',     help: '1-year closing thank-you' },
  { field: 'autoSendChristmas',   label: 'Christmas',     icon: 'mdi-pine-tree',     color: 'red-darken-2', help: 'Dec 25 (excludes exceptions)' },
  { field: 'autoSendNewYear',     label: 'New Year',      icon: 'mdi-firework',      color: 'indigo',    help: 'Jan 1 (excludes exceptions)' },
] as const

// Field helpers — map kind → settings property
function templateField(kind: KindValue): string {
  return kind === 'new_year' ? 'newYearTemplate' : `${kind}Template`
}
function subjectField(kind: KindValue): string {
  return kind === 'new_year' ? 'newYearSubject' : `${kind}Subject`
}
function getSubject(kind: KindValue): string {
  return settings.value[subjectField(kind)] || ''
}
function getBody(kind: KindValue): string {
  return settings.value[templateField(kind)] || ''
}
function setSubject(kind: KindValue, v: string) {
  settings.value[subjectField(kind)] = v
}
function setBody(kind: KindValue, v: string) {
  settings.value[templateField(kind)] = v
}
function hasOverride(kind: KindValue): boolean {
  return Boolean(getSubject(kind) || getBody(kind))
}
function resetTemplate(kind: KindValue) {
  setSubject(kind, '')
  setBody(kind, '')
  saveSettings()
}

let saveTimeout: any = null
async function saveSettings() {
  clearTimeout(saveTimeout)
  saveTimeout = setTimeout(async () => {
    try {
      await $fetch('/api/admin/crm/celebrations/settings', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: settings.value,
      })
      showSaved.value = true
    } catch (e) {
      console.error('Save settings error:', e)
    }
  }, 400)
}

async function loadAll() {
  try {
    const [s, u, me] = await Promise.all([
      $fetch('/api/admin/crm/celebrations/settings', { headers: getAuthHeaders() }) as Promise<any>,
      $fetch('/api/admin/crm/celebrations/upcoming?days=365', { headers: getAuthHeaders() }) as Promise<any>,
      $fetch('/api/auth/me', { headers: getAuthHeaders() }) as Promise<any>,
    ])
    if (s?.settings) {
      // Coerce nulls to '' for v-model binding
      const norm: Record<string, any> = {}
      for (const [k, v] of Object.entries(s.settings)) {
        norm[k] = v === null ? '' : v
      }
      settings.value = { ...settings.value, ...norm }
    }
    defaults.value = s?.defaults || {}
    // For Eid we don't have a fixed date, so derive an eligible count: all active w/ email minus eid exceptions
    eidEligibleCount.value = u?.fixed?.find?.((x: any) => x.kind === 'eid')?.eligibleClientCount ?? null
    if (eidEligibleCount.value === null) {
      // Fallback: query upcoming once with a long window won't list eid — count via upcoming.fixed christmas/new_year is wrong.
      // Use a separate light-weight call: counts based on /api/admin/crm/clients with status active + email + eid exception
      try {
        const r: any = await $fetch('/api/admin/crm/clients?status=active&limit=1', { headers: getAuthHeaders() })
        eidEligibleCount.value = r?.pagination?.total ?? null
      } catch {}
    }
    const u2 = me?.user || me
    adminName.value = [u2?.firstName, u2?.lastName].filter(Boolean).join(' ').trim() || u2?.email || ''
  } catch (e) {
    console.error('Load celebrations settings error:', e)
  }
}

function openEidDialog() {
  showEidDialog.value = true
}
function onEidSent() {
  // No-op other than the toast in the dialog itself
}

onMounted(loadAll)
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;600;700&display=swap');

.admin-celebrations { background-color: #fcfcfb; font-family: 'Inter', sans-serif; min-height: 100vh; }
.display-serif { font-family: 'Playfair Display', serif; }
.text-gold { color: #8c734b; }
.letter-spacing-2 { letter-spacing: 2px; }
.letter-spacing-1 { letter-spacing: 1px; }
.premium-accent-bar { width: 40px; height: 4px; background: #8c734b; border-radius: 2px; }
.premium-action-btn { border-radius: 12px !important; text-transform: none !important; font-weight: 700 !important; }

.setting-card {
  border-radius: 20px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  background: white !important;
}
.auto-send-row {
  display: flex;
  align-items: center;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,0.06);
  background: #fafaf8;
  height: 100%;
}
:deep(.v-tab) {
  text-transform: none;
  font-weight: 600;
  letter-spacing: 0;
}
code {
  background: #f1f0eb;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 0.78em;
  color: #6b5a39;
}
</style>
