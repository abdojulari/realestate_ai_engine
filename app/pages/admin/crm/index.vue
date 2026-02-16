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
            <v-card-title class="text-overline letter-spacing-1 pt-6 px-8 text-white">Quick Actions</v-card-title>
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
import { ref, onMounted } from 'vue'

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

onMounted(loadDashboard)

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

.action-card-premium { border-radius: 24px !important; background: #121212 !important; color: white !important; }

.transaction-mini-card {
  border-radius: 16px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  cursor: pointer;
  transition: all 0.3s ease;
}
.transaction-mini-card:hover { transform: translateY(-3px); box-shadow: 0 8px 30px rgba(0,0,0,0.1) !important; }

.list-item-hover:hover { background: #f9f9f9; }
</style>
