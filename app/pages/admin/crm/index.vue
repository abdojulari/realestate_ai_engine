<template>
  <div class="admin-crm px-md-8 py-md-6">
    <v-container fluid>
      <!-- Header -->
      <v-row class="mb-10 align-center">
        <v-col cols="12" md="8">
          <div class="d-flex align-center mb-2">
            <v-btn icon="mdi-arrow-left" variant="text" size="small" class="mr-2" to="/admin" />
            <div class="premium-accent-bar mr-4"></div>
            <span class="text-overline letter-spacing-2 text-gold">CRM Dashboard</span>
          </div>
          <h1 class="display-serif text-h3 mb-1">Client & Transaction Hub</h1>
          <p class="text-subtitle-1 text-medium-emphasis font-weight-light">
            Manage clients, track transactions, and monitor deal progress
          </p>
        </v-col>
        <v-col cols="12" md="4" class="text-md-right">
          <v-btn color="primary" class="premium-action-btn mr-2" prepend-icon="mdi-account-plus" @click="showAddClient = true">
            Add Client
          </v-btn>
        </v-col>
      </v-row>

      <!-- Stats Cards -->
      <v-row class="mb-10">
        <v-col cols="12" sm="6" md="3">
          <v-card class="stat-card-premium" elevation="0">
            <v-card-text>
              <div class="d-flex align-center mb-4">
                <div class="icon-orb primary-orb"><v-icon>mdi-account-group</v-icon></div>
              </div>
              <div class="text-h3 font-weight-bold mb-1">{{ dashboard.clients?.total || 0 }}</div>
              <div class="text-overline text-medium-emphasis">Total Clients</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-card class="stat-card-premium" elevation="0">
            <v-card-text>
              <div class="d-flex align-center mb-4">
                <div class="icon-orb success-orb"><v-icon>mdi-handshake</v-icon></div>
              </div>
              <div class="text-h3 font-weight-bold mb-1">{{ dashboard.transactions?.total || 0 }}</div>
              <div class="text-overline text-medium-emphasis">Transactions</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-card class="stat-card-premium" elevation="0">
            <v-card-text>
              <div class="d-flex align-center mb-4">
                <div class="icon-orb warning-orb"><v-icon>mdi-bell-ring</v-icon></div>
              </div>
              <div class="text-h3 font-weight-bold mb-1">{{ dashboard.pendingLeads?.total || 0 }}</div>
              <div class="text-overline text-medium-emphasis">Pending Leads</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-card class="stat-card-premium" elevation="0">
            <v-card-text>
              <div class="d-flex align-center mb-4">
                <div class="icon-orb gold-orb"><v-icon>mdi-check-decagram</v-icon></div>
              </div>
              <div class="text-h3 font-weight-bold mb-1">{{ dashboard.transactions?.byStatus?.closed || 0 }}</div>
              <div class="text-overline text-medium-emphasis">Deals Closed</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Quick Actions -->
      <v-row class="mb-10">
        <v-col cols="12">
          <v-card class="action-card-premium" elevation="0">
            <v-card-title class="text-overline letter-spacing-1 pt-6 px-8">Quick Actions</v-card-title>
            <v-card-text class="pa-8 pt-2">
              <v-row>
                <v-col cols="12" sm="6" md="3">
                  <v-btn prepend-icon="mdi-account-multiple" color="primary" to="/admin/crm/clients" block height="54" variant="flat" class="premium-action-btn">
                    Manage Clients
                  </v-btn>
                </v-col>
                <v-col cols="12" sm="6" md="3">
                  <v-btn prepend-icon="mdi-file-document-check" color="success" to="/admin/crm/transactions" block height="54" variant="flat" class="premium-action-btn">
                    Transactions
                  </v-btn>
                </v-col>
                <v-col cols="12" sm="6" md="3">
                  <v-btn prepend-icon="mdi-tag-multiple" color="info" to="/admin/deals" block height="54" variant="flat" class="premium-action-btn">
                    Best Deals
                  </v-btn>
                </v-col>
                <v-col cols="12" sm="6" md="3">
                  <v-btn prepend-icon="mdi-calendar" color="warning" to="/admin/calendar" block height="54" variant="flat" class="premium-action-btn">
                    Calendar
                  </v-btn>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Celebrations -->
      <v-row class="mb-10">
        <v-col cols="12">
          <v-card class="celebrations-card" elevation="0">
            <v-card-title class="pa-6 d-flex align-center">
              <v-icon color="warning" class="mr-3">mdi-cake-variant</v-icon>
              <div>
                <span class="display-serif text-h5">Celebrations</span>
                <div class="text-caption text-medium-emphasis">
                  <span v-if="celebrationsToday > 0" class="font-weight-bold text-warning">
                    {{ celebrationsToday }} today
                  </span>
                  <span v-else>Nothing today</span>
                  <span v-if="upcomingPersonal.length"> · {{ upcomingPersonal.length }} in the next 14 days</span>
                </div>
              </div>
              <v-spacer />
              <v-btn
                variant="tonal"
                size="small"
                prepend-icon="mdi-cog-outline"
                to="/admin/crm/celebrations"
              >Settings</v-btn>
            </v-card-title>
            <v-divider class="opacity-10" />
            <v-card-text class="pa-6">
              <!-- Empty state -->
              <div v-if="!loadingCelebrations && upcomingPersonal.length === 0 && upcomingFixed.length === 0" class="text-center py-8">
                <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-calendar-blank-outline</v-icon>
                <div class="text-body-1 text-medium-emphasis">No upcoming celebrations.</div>
                <div class="text-caption text-medium-emphasis">Add birthdays or anniversaries on a client to see them here.</div>
              </div>

              <!-- Personal celebrations -->
              <v-row v-if="upcomingPersonal.length">
                <v-col v-for="item in upcomingPersonal" :key="`${item.kind}-${item.clientId}`" cols="12" md="6" lg="4">
                  <div class="celebration-item" :class="{ 'celebration-today': item.daysUntil === 0 }">
                    <div class="celebration-icon" :class="`kind-${item.kind}`">
                      <v-icon size="20">{{ kindIcon(item.kind) }}</v-icon>
                    </div>
                    <div class="celebration-info flex-grow-1">
                      <div class="d-flex align-center">
                        <span class="font-weight-bold">{{ item.firstName }} {{ item.lastName }}</span>
                        <v-chip
                          v-if="item.daysUntil === 0"
                          size="x-small"
                          color="warning"
                          class="ml-2 text-uppercase font-weight-bold"
                        >Today</v-chip>
                        <v-chip
                          v-else-if="item.daysUntil <= 3"
                          size="x-small"
                          color="info"
                          variant="tonal"
                          class="ml-2"
                        >In {{ item.daysUntil }}d</v-chip>
                      </div>
                      <div class="text-caption text-medium-emphasis">
                        {{ kindLabel(item.kind) }} · {{ formatDayMonth(item.date) }}
                        <span v-if="!item.email" class="text-error ml-1">· no email</span>
                      </div>
                    </div>
                    <v-btn
                      v-if="item.email"
                      :color="item.alreadySentToday ? 'success' : (item.daysUntil === 0 ? 'warning' : 'primary')"
                      :variant="item.alreadySentToday ? 'tonal' : 'flat'"
                      size="small"
                      :prepend-icon="item.alreadySentToday ? 'mdi-check' : 'mdi-send'"
                      @click="openSendForItem(item)"
                      class="celebration-send-btn"
                    >
                      {{ item.alreadySentToday ? 'Sent' : 'Send' }}
                    </v-btn>
                  </div>
                </v-col>
              </v-row>

              <!-- Fixed holidays banner -->
              <div v-if="upcomingFixed.length" class="mt-6">
                <v-divider class="mb-4" />
                <div class="text-overline letter-spacing-1 text-medium-emphasis mb-3">Fixed Holidays</div>
                <v-row>
                  <v-col v-for="h in upcomingFixed" :key="h.kind" cols="12" md="6">
                    <div class="fixed-holiday-card">
                      <div class="d-flex align-center mb-2">
                        <v-icon :color="h.kind === 'christmas' ? 'red-darken-2' : 'indigo-darken-2'" class="mr-2">
                          {{ h.kind === 'christmas' ? 'mdi-pine-tree' : 'mdi-firework' }}
                        </v-icon>
                        <span class="font-weight-bold">
                          {{ h.kind === 'christmas' ? 'Christmas' : 'New Year' }}
                        </span>
                        <v-chip
                          v-if="h.daysUntil === 0"
                          size="x-small"
                          color="warning"
                          class="ml-2 text-uppercase font-weight-bold"
                        >Today</v-chip>
                        <v-chip v-else size="x-small" variant="tonal" class="ml-2">
                          In {{ h.daysUntil }} day{{ h.daysUntil === 1 ? '' : 's' }}
                        </v-chip>
                      </div>
                      <div class="text-caption text-medium-emphasis mb-3">
                        {{ h.eligibleClientCount }} eligible clients (after exception list)
                      </div>
                      <v-btn
                        size="small"
                        variant="tonal"
                        color="primary"
                        prepend-icon="mdi-send-outline"
                        @click="openBulkSend(h.kind, h.eligibleClientCount)"
                      >Send to all</v-btn>
                    </div>
                  </v-col>
                </v-row>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Active Transactions Pipeline -->
      <v-row class="mb-10">
        <v-col cols="12">
          <v-card class="pipeline-card" elevation="0">
            <v-card-title class="pa-6">
              <span class="display-serif text-h5">Transaction Pipeline</span>
            </v-card-title>
            <v-divider class="opacity-10" />
            <v-card-text class="pa-6">
              <v-row>
                <v-col v-for="transaction in dashboard.activeTransactions" :key="transaction.id" cols="12" md="6" lg="4">
                  <v-card class="transaction-mini-card" elevation="0" @click="goToTransaction(transaction.id)">
                    <v-card-text class="pa-4">
                      <div class="d-flex justify-space-between align-center mb-2">
                        <span class="font-weight-bold">{{ transaction.client?.firstName }} {{ transaction.client?.lastName }}</span>
                        <v-chip :color="getStatusColor(transaction.status)" size="x-small" class="text-uppercase font-weight-bold">
                          {{ transaction.status }}
                        </v-chip>
                      </div>
                      <div class="text-body-2 text-medium-emphasis mb-3">
                        {{ transaction.propertyAddress || 'No address yet' }}
                      </div>

                      <!-- Progress Bar -->
                      <div class="d-flex align-center mb-1">
                        <v-progress-linear
                          :model-value="transaction.progress"
                          :color="getProgressColor(transaction.progress)"
                          height="8"
                          rounded
                          class="flex-grow-1 mr-3"
                        />
                        <span class="text-body-2 font-weight-bold" :class="getProgressTextColor(transaction.progress)">
                          {{ transaction.progress }}%
                        </span>
                      </div>
                      <div class="text-caption text-medium-emphasis">
                        {{ transaction.completedItems }}/{{ transaction.totalItems }} steps completed
                      </div>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Lead Sources & Recent Clients -->
      <v-row>
        <v-col cols="12" md="6">
          <v-card class="lead-card" elevation="0">
            <v-card-title class="pa-6">
              <span class="display-serif text-h5">Pending Leads</span>
            </v-card-title>
            <v-divider class="opacity-10" />
            <v-card-text class="pa-6">
              <div class="d-flex align-center mb-4 pa-3 rounded-lg" style="background: #f9f9f9;">
                <v-icon color="primary" class="mr-3">mdi-home-search</v-icon>
                <div class="flex-grow-1">
                  <div class="font-weight-bold">Property Inquiries</div>
                  <div class="text-caption text-medium-emphasis">New leads from property pages</div>
                </div>
                <v-chip color="primary" size="small">{{ dashboard.pendingLeads?.inquiries || 0 }}</v-chip>
              </div>
              <div class="d-flex align-center mb-4 pa-3 rounded-lg" style="background: #f9f9f9;">
                <v-icon color="info" class="mr-3">mdi-chat</v-icon>
                <div class="flex-grow-1">
                  <div class="font-weight-bold">Chat Leads</div>
                  <div class="text-caption text-medium-emphasis">From chat widget conversations</div>
                </div>
                <v-chip color="info" size="small">{{ dashboard.pendingLeads?.chatLeads || 0 }}</v-chip>
              </div>
              <div class="d-flex align-center pa-3 rounded-lg" style="background: #f9f9f9;">
                <v-icon color="success" class="mr-3">mdi-home-analytics</v-icon>
                <div class="flex-grow-1">
                  <div class="font-weight-bold">Home Estimates</div>
                  <div class="text-caption text-medium-emphasis">Valuation request submissions</div>
                </div>
                <v-chip color="success" size="small">{{ dashboard.pendingLeads?.estimates || 0 }}</v-chip>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-card class="recent-card" elevation="0">
            <v-card-title class="pa-6 d-flex align-center">
              <span class="display-serif text-h5">Recent Clients</span>
              <v-spacer />
              <v-btn variant="tonal" to="/admin/crm/clients" size="small">View All</v-btn>
            </v-card-title>
            <v-divider class="opacity-10" />
            <v-card-text class="pa-0">
              <v-list bg-color="transparent">
                <v-list-item v-for="client in dashboard.recentClients" :key="client.id" class="px-6 py-3 list-item-hover" :to="`/admin/crm/clients/${client.id}`">
                  <template #prepend>
                    <v-avatar :color="getClientTypeColor(client.type)" size="40" class="text-white">
                      {{ client.firstName[0] }}{{ client.lastName[0] }}
                    </v-avatar>
                  </template>
                  <v-list-item-title class="font-weight-bold">
                    {{ client.firstName }} {{ client.lastName }}
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    <v-chip :color="getClientTypeColor(client.type)" size="x-small" class="text-uppercase mr-1">{{ client.type }}</v-chip>
                    {{ formatDate(client.createdAt) }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Send Celebration Dialog -->
      <SendCelebrationDialog
        v-model="showSendDialog"
        :kind="sendKind"
        :recipient="sendRecipient"
        :bulk="sendBulk"
        :bulk-eligible-count="sendBulkCount"
        :defaults="celebrationDefaults"
        :admin-name="adminName"
        @sent="onCelebrationSent"
      />

      <!-- Add Client Dialog -->
      <v-dialog v-model="showAddClient" max-width="500" persistent>
        <v-card class="rounded-xl">
          <v-card-title class="pa-6 display-serif text-h6">Add New Client</v-card-title>
          <v-divider />
          <v-card-text class="pa-6">
            <v-row>
              <v-col cols="6">
                <v-text-field density="compact" v-model="clientForm.firstName" label="First Name" variant="outlined" required />
              </v-col>
              <v-col cols="6">
                <v-text-field density="compact" v-model="clientForm.lastName" label="Last Name" variant="outlined" required />
              </v-col>
              <v-col cols="12">
                <v-text-field density="compact" v-model="clientForm.email" label="Email" variant="outlined" type="email" />
              </v-col>
              <v-col cols="12">
                <v-text-field density="compact" v-model="clientForm.phone" label="Phone" variant="outlined" />
              </v-col>
              <v-col cols="12">
                <v-select density="compact" v-model="clientForm.type" :items="['lead', 'buyer', 'seller', 'investor']" label="Client Type" variant="outlined" />
              </v-col>
              <v-col cols="12">
                <v-textarea density="compact" v-model="clientForm.notes" label="Notes" variant="outlined" rows="3" />
              </v-col>
            </v-row>
          </v-card-text>
          <v-divider />
          <v-card-actions class="pa-6">
            <v-spacer />
            <v-btn variant="text" @click="showAddClient = false">Cancel</v-btn>
            <v-btn color="primary" @click="addClient" :loading="addingClient">Add Client</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import SendCelebrationDialog from '~/components/crm/SendCelebrationDialog.vue'

const getAuthHeaders = (): Record<string, string> => {
  if (process.client) {
    const token = localStorage.getItem('token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }
  return {}
}

const dashboard = ref<any>({
  clients: { total: 0, byType: {} },
  transactions: { total: 0, byStatus: {} },
  pendingLeads: { total: 0, inquiries: 0, chatLeads: 0, estimates: 0 },
  recentClients: [],
  activeTransactions: []
})

// ── Celebrations widget state ─────────────────────────────
type PersonalKind = 'birthday' | 'anniversary' | 'closing'
type FixedKind = 'christmas' | 'new_year'
type AnyKind = PersonalKind | FixedKind | 'eid'

interface PersonalItem {
  kind: PersonalKind
  clientId: number
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  date: string
  daysUntil: number
  alreadySentToday: boolean
}
interface FixedItem {
  kind: FixedKind
  date: string
  daysUntil: number
  eligibleClientCount: number
}

const loadingCelebrations = ref(false)
const upcomingPersonal = ref<PersonalItem[]>([])
const upcomingFixed = ref<FixedItem[]>([])
const celebrationDefaults = ref<Record<string, { subject: string; body: string }>>({})
const adminName = ref('')

const celebrationsToday = computed(() =>
  upcomingPersonal.value.filter(p => p.daysUntil === 0).length
  + upcomingFixed.value.filter(f => f.daysUntil === 0).length
)

const showSendDialog = ref(false)
const sendKind = ref<AnyKind>('birthday')
const sendRecipient = ref<{ id: number; firstName: string; lastName: string; email: string | null } | null>(null)
const sendBulk = ref(false)
const sendBulkCount = ref<number | null>(null)

function kindIcon(kind: PersonalKind) {
  return kind === 'birthday' ? 'mdi-cake-variant'
    : kind === 'anniversary' ? 'mdi-heart'
    : 'mdi-key-variant'
}
function kindLabel(kind: PersonalKind) {
  return kind === 'birthday' ? 'Birthday'
    : kind === 'anniversary' ? 'Wedding Anniversary'
    : 'Closing Anniversary'
}
function formatDayMonth(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function openSendForItem(item: PersonalItem) {
  sendKind.value = item.kind
  sendRecipient.value = {
    id: item.clientId,
    firstName: item.firstName,
    lastName: item.lastName,
    email: item.email,
  }
  sendBulk.value = false
  sendBulkCount.value = null
  showSendDialog.value = true
}

function openBulkSend(kind: FixedKind, count: number) {
  sendKind.value = kind
  sendRecipient.value = null
  sendBulk.value = true
  sendBulkCount.value = count
  showSendDialog.value = true
}

async function onCelebrationSent() {
  await loadCelebrations()
}

async function loadCelebrations() {
  loadingCelebrations.value = true
  try {
    const [upcomingRes, settingsRes] = await Promise.all([
      $fetch('/api/admin/crm/celebrations/upcoming?days=14', { headers: getAuthHeaders() }) as Promise<any>,
      $fetch('/api/admin/crm/celebrations/settings', { headers: getAuthHeaders() }) as Promise<any>,
    ])
    upcomingPersonal.value = upcomingRes.personal || []
    upcomingFixed.value = upcomingRes.fixed || []
    celebrationDefaults.value = settingsRes.defaults || {}
  } catch (e) {
    console.error('Error loading celebrations:', e)
  } finally {
    loadingCelebrations.value = false
  }
}

async function loadAdminName() {
  try {
    const res: any = await $fetch('/api/auth/me', { headers: getAuthHeaders() })
    const u = res?.user || res
    adminName.value = [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim() || u?.email || ''
  } catch {
    // Non-fatal — placeholders fall back to "Your Agent"
  }
}

const showAddClient = ref(false)
const addingClient = ref(false)
const clientForm = ref({ firstName: '', lastName: '', email: '', phone: '', type: 'lead', notes: '' })

const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

const getStatusColor = (s: string) => {
  const c: Record<string, string> = { active: 'primary', conditional: 'warning', firm: 'info', closed: 'success', cancelled: 'error' }
  return c[s] || 'grey'
}

const getProgressColor = (p: number) => p >= 80 ? 'success' : p >= 50 ? 'info' : p >= 25 ? 'warning' : 'primary'
const getProgressTextColor = (p: number) => p >= 80 ? 'text-success' : p >= 50 ? 'text-info' : 'text-primary'

const getClientTypeColor = (t: string) => {
  const c: Record<string, string> = { buyer: 'blue', seller: 'green', investor: 'purple', lead: 'grey' }
  return c[t] || 'primary'
}

function goToTransaction(id: number) {
  navigateTo(`/admin/crm/transactions/${id}`)
}

async function addClient() {
  if (!clientForm.value.firstName || !clientForm.value.lastName) return
  addingClient.value = true
  try {
    await $fetch('/api/admin/crm/clients', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: clientForm.value
    })
    showAddClient.value = false
    clientForm.value = { firstName: '', lastName: '', email: '', phone: '', type: 'lead', notes: '' }
    await loadDashboard()
  } finally {
    addingClient.value = false
  }
}

async function loadDashboard() {
  try {
    dashboard.value = await $fetch('/api/admin/crm/dashboard', { headers: getAuthHeaders() }) as any
  } catch (e) {
    console.error('Error loading CRM dashboard:', e)
  }
}

onMounted(async () => {
  await Promise.all([loadDashboard(), loadCelebrations(), loadAdminName()])
})

definePageMeta({ layout: 'admin', middleware: ['admin'] })
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;600;700&display=swap');

.admin-crm {
  background-color: #fcfcfb;
  font-family: 'Inter', sans-serif;
  min-height: 100vh;
}
.display-serif { font-family: 'Playfair Display', serif; }
.text-gold { color: #8c734b; }
.letter-spacing-2 { letter-spacing: 2px; }
.letter-spacing-1 { letter-spacing: 1px; }
.premium-accent-bar { width: 40px; height: 4px; background: #8c734b; border-radius: 2px; }
.premium-action-btn { border-radius: 12px !important; text-transform: none !important; font-weight: 700 !important; }

.stat-card-premium, .pipeline-card, .lead-card, .recent-card {
  border-radius: 20px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  background: white !important;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.stat-card-premium:hover { transform: translateY(-5px); border-color: #8c734b !important; }

.icon-orb { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.primary-orb { background: rgba(var(--v-theme-primary), 0.1); color: rgb(var(--v-theme-primary)); }
.success-orb { background: rgba(var(--v-theme-success), 0.1); color: rgb(var(--v-theme-success)); }
.warning-orb { background: rgba(var(--v-theme-warning), 0.1); color: rgb(var(--v-theme-warning)); }
.gold-orb { background: rgba(140, 115, 75, 0.1); color: #8c734b; }

.action-card-premium { border-radius: 24px !important; }

.transaction-mini-card {
  border-radius: 16px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  cursor: pointer;
  transition: all 0.3s ease;
}
.transaction-mini-card:hover { transform: translateY(-3px); box-shadow: 0 8px 30px rgba(0,0,0,0.1) !important; }

.list-item-hover:hover { background: #f9f9f9; }

/* ── Celebrations widget ── */
.celebrations-card {
  border-radius: 20px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  background: linear-gradient(135deg, #fffaf0 0%, #ffffff 60%) !important;
}
.celebration-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(0,0,0,0.05);
  background: #fff;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  height: 100%;
}
.celebration-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.06);
  border-color: rgba(140, 115, 75, 0.4);
}
.celebration-today {
  border-color: #f59e0b !important;
  background: linear-gradient(135deg, #fff8eb 0%, #ffffff 80%) !important;
}
.celebration-icon {
  width: 40px; height: 40px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  color: #fff;
}
.kind-birthday    { background: linear-gradient(135deg, #f59e0b, #fb923c); }
.kind-anniversary { background: linear-gradient(135deg, #ef4444, #f43f5e); }
.kind-closing     { background: linear-gradient(135deg, #10b981, #14b8a6); }
.celebration-info { min-width: 0; }
.celebration-info .font-weight-bold {
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.celebration-send-btn { text-transform: none; font-weight: 700; }

.fixed-holiday-card {
  padding: 16px 18px;
  border-radius: 14px;
  border: 1px dashed rgba(0,0,0,0.1);
  background: #fafaf8;
}
</style>
