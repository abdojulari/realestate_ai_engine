<template>
  <div class="premium-activity-wrapper bg-[#F8FAFC] min-h-screen">
    <!-- TOP NAVIGATION BAR (PREMIUM LOOK) -->
    <div class="header-glass sticky top-0 z-50 px-8 py-4 border-b border-slate-200 backdrop-blur-md bg-white/80">
      <div class="max-w-[1600px] mx-auto d-flex align-center">
        <div>
          <div class="flex items-center space-x-2 mb-0">
            <span class="text-[10px] uppercase tracking-[0.3em] font-bold text-primary">Security & Monitoring</span>
          </div>
          <h1 class="text-h4 font-serif text-slate-900 font-weight-bold">Activity Log</h1>
        </div>
        <v-spacer />
        <div class="d-flex align-center gap-4">
          <v-select
            v-model="filterAction"
            :items="actionTypes"
            label="Filter by Action"
            variant="outlined"
            rounded="lg"
            density="comfortable"
            class="max-width-200 premium-input"
            clearable
            hide-details
          />
          <v-btn
            prepend-icon="mdi-refresh"
            @click="loadActivityLogs"
            variant="outlined"
            rounded="lg"
            class="action-btn-outline"
          >
            Refresh
          </v-btn>
        </div>
      </div>
    </div>

    <v-container fluid class="max-w-[1600px] px-8 pt-8 pb-16">
      <!-- Stats Cards -->
      <v-row class="mb-8">
        <v-col cols="12" md="3">
          <v-card class="premium-card stat-card">
            <v-card-text class="p-6">
              <div class="d-flex align-center justify-space-between mb-2">
                <div class="icon-orb-small bg-blue-50">
                  <v-icon color="primary" size="20">mdi-chart-line</v-icon>
                </div>
                <v-icon color="success" size="16">mdi-trending-up</v-icon>
              </div>
              <h3 class="text-h4 font-weight-bold mb-1">{{ stats.totalActivities }}</h3>
              <p class="text-caption text-slate-500 mb-0">Total Activities</p>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3">
          <v-card class="premium-card stat-card">
            <v-card-text class="p-6">
              <div class="d-flex align-center justify-space-between mb-2">
                <div class="icon-orb-small bg-green-50">
                  <v-icon color="success" size="20">mdi-calendar-today</v-icon>
                </div>
                <v-icon color="info" size="16">mdi-information</v-icon>
              </div>
              <h3 class="text-h4 font-weight-bold mb-1">{{ stats.todayActivities }}</h3>
              <p class="text-caption text-slate-500 mb-0">Today's Activities</p>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3">
          <v-card class="premium-card stat-card">
            <v-card-text class="p-6">
              <div class="d-flex align-center justify-space-between mb-2">
                <div class="icon-orb-small bg-purple-50">
                  <v-icon color="purple" size="20">mdi-account-multiple</v-icon>
                </div>
                <v-icon color="warning" size="16">mdi-clock</v-icon>
              </div>
              <h3 class="text-h4 font-weight-bold mb-1">{{ stats.activeUsers }}</h3>
              <p class="text-caption text-slate-500 mb-0">Active Users (24h)</p>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3">
          <v-card class="premium-card stat-card">
            <v-card-text class="p-6">
              <div class="d-flex align-center justify-space-between mb-2">
                <div class="icon-orb-small bg-red-50">
                  <v-icon color="error" size="20">mdi-shield-alert</v-icon>
                </div>
                <v-icon color="error" size="16">mdi-alert</v-icon>
              </div>
              <h3 class="text-h4 font-weight-bold mb-1">{{ stats.securityEvents }}</h3>
              <p class="text-caption text-slate-500 mb-0">Security Events</p>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Activity Timeline -->
      <v-card class="premium-card">
        <div class="p-8 border-b border-slate-100 d-flex align-center">
          <div class="icon-orb mr-4">
            <v-icon color="primary" size="24">mdi-history</v-icon>
          </div>
          <div>
            <h2 class="text-h6 font-weight-bold">Activity Timeline</h2>
            <p class="text-caption text-slate-500 mb-0">Real-time system activity monitoring</p>
          </div>
          <v-spacer />
          <v-text-field
            v-model="searchQuery"
            append-inner-icon="mdi-magnify"
            label="Search activities..."
            single-line
            hide-details
            variant="outlined"
            rounded="lg"
            class="max-width-300 premium-input"
            density="comfortable"
          />
        </div>

        <v-card-text class="p-0">
          <!-- Loading State -->
          <div v-if="loading" class="p-12 text-center">
            <v-progress-circular
              indeterminate
              color="primary"
              size="48"
            />
            <p class="text-subtitle-1 mt-4 text-slate-600">Loading activity logs...</p>
          </div>

          <!-- Empty State -->
          <div v-else-if="!filteredActivities.length" class="p-12 text-center">
            <v-icon size="64" color="slate-300">mdi-history</v-icon>
            <h3 class="text-h6 font-weight-bold mt-4 mb-2">No Activities Found</h3>
            <p class="text-body-2 text-slate-500">There are no activities matching your filters</p>
          </div>

          <!-- Activity List -->
          <v-list v-else class="activity-list">
            <v-list-item
              v-for="(activity, index) in filteredActivities"
              :key="activity.id"
              class="activity-item px-8 py-4"
              :class="{ 'border-b border-slate-100': index < filteredActivities.length - 1 }"
            >
              <template v-slot:prepend>
                <v-avatar
                  :color="getActionColor(activity.action)"
                  size="40"
                  class="activity-avatar"
                >
                  <v-icon :icon="getActionIcon(activity.action)" size="20" color="white" />
                </v-avatar>
              </template>

              <v-list-item-title class="font-weight-bold mb-1">
                {{ activity.user?.firstName }} {{ activity.user?.lastName }}
                <v-chip
                  :color="getActionColor(activity.action)"
                  size="x-small"
                  variant="tonal"
                  class="ml-2 premium-chip-mini"
                >
                  {{ activity.action }}
                </v-chip>
              </v-list-item-title>

              <v-list-item-subtitle class="text-slate-600 mb-2">
                {{ activity.description || getActionDescription(activity) }}
              </v-list-item-subtitle>

              <div class="d-flex align-center gap-4 mt-2">
                <div class="d-flex align-center text-caption text-slate-500">
                  <v-icon size="14" class="mr-1">mdi-clock-outline</v-icon>
                  {{ formatRelativeTime(activity.createdAt) }}
                </div>
                <div v-if="activity.ipAddress" class="d-flex align-center text-caption text-slate-500">
                  <v-icon size="14" class="mr-1">mdi-ip</v-icon>
                  {{ activity.ipAddress }}
                </div>
                <div v-if="activity.entity" class="d-flex align-center text-caption text-slate-500">
                  <v-icon size="14" class="mr-1">mdi-tag</v-icon>
                  {{ activity.entity }}{{ activity.entityId ? ` #${activity.entityId}` : '' }}
                </div>
              </div>

              <template v-slot:append>
                <v-btn
                  icon="mdi-information-outline"
                  variant="text"
                  size="small"
                  @click="showActivityDetails(activity)"
                />
              </template>
            </v-list-item>
          </v-list>

          <!-- Pagination -->
          <div v-if="totalPages > 1" class="p-6 border-t border-slate-100 d-flex align-center justify-center">
            <v-pagination
              v-model="currentPage"
              :length="totalPages"
              :total-visible="7"
              rounded="circle"
              @update:model-value="loadActivityLogs"
            />
          </div>
        </v-card-text>
      </v-card>
    </v-container>

    <!-- Activity Details Dialog -->
    <v-dialog v-model="showDetailsDialog" max-width="600">
      <v-card v-if="selectedActivity" class="premium-card">
        <div class="p-8 bg-slate-900 text-white">
          <h2 class="text-h5 font-serif">Activity Details</h2>
          <p class="text-caption text-slate-400 mb-0">Detailed information about this activity</p>
        </div>
        <v-card-text class="p-8">
          <v-list class="bg-transparent">
            <v-list-item>
              <v-list-item-title class="text-caption text-slate-500 mb-1">User</v-list-item-title>
              <v-list-item-subtitle class="text-body-1 font-weight-bold text-slate-900">
                {{ selectedActivity.user?.firstName }} {{ selectedActivity.user?.lastName }} ({{ selectedActivity.user?.email }})
              </v-list-item-subtitle>
            </v-list-item>
            <v-divider class="my-2" />
            <v-list-item>
              <v-list-item-title class="text-caption text-slate-500 mb-1">Action</v-list-item-title>
              <v-list-item-subtitle class="text-body-1 font-weight-bold text-slate-900">
                {{ selectedActivity.action }}
              </v-list-item-subtitle>
            </v-list-item>
            <v-divider class="my-2" />
            <v-list-item v-if="selectedActivity.entity">
              <v-list-item-title class="text-caption text-slate-500 mb-1">Entity</v-list-item-title>
              <v-list-item-subtitle class="text-body-1 font-weight-bold text-slate-900">
                {{ selectedActivity.entity }}{{ selectedActivity.entityId ? ` #${selectedActivity.entityId}` : '' }}
              </v-list-item-subtitle>
            </v-list-item>
            <v-divider v-if="selectedActivity.entity" class="my-2" />
            <v-list-item>
              <v-list-item-title class="text-caption text-slate-500 mb-1">Description</v-list-item-title>
              <v-list-item-subtitle class="text-body-1 text-slate-900">
                {{ selectedActivity.description || getActionDescription(selectedActivity) }}
              </v-list-item-subtitle>
            </v-list-item>
            <v-divider class="my-2" />
            <v-list-item>
              <v-list-item-title class="text-caption text-slate-500 mb-1">Timestamp</v-list-item-title>
              <v-list-item-subtitle class="text-body-1 text-slate-900">
                {{ formatDateTime(selectedActivity.createdAt) }}
              </v-list-item-subtitle>
            </v-list-item>
            <v-divider class="my-2" />
            <v-list-item v-if="selectedActivity.ipAddress">
              <v-list-item-title class="text-caption text-slate-500 mb-1">IP Address</v-list-item-title>
              <v-list-item-subtitle class="text-body-1 font-mono text-slate-900">
                {{ selectedActivity.ipAddress }}
              </v-list-item-subtitle>
            </v-list-item>
            <v-divider v-if="selectedActivity.ipAddress" class="my-2" />
            <v-list-item v-if="selectedActivity.userAgent">
              <v-list-item-title class="text-caption text-slate-500 mb-1">User Agent</v-list-item-title>
              <v-list-item-subtitle class="text-caption font-mono text-slate-900">
                {{ selectedActivity.userAgent }}
              </v-list-item-subtitle>
            </v-list-item>
            <v-divider v-if="selectedActivity.userAgent" class="my-2" />
            <v-list-item v-if="selectedActivity.metadata">
              <v-list-item-title class="text-caption text-slate-500 mb-1">Metadata</v-list-item-title>
              <v-list-item-subtitle>
                <pre class="text-caption bg-slate-50 p-3 rounded-lg mt-2">{{ JSON.stringify(selectedActivity.metadata, null, 2) }}</pre>
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions class="p-8 pt-0">
          <v-spacer />
          <v-btn
            color="primary"
            @click="showDetailsDialog = false"
            class="action-btn-primary px-8"
          >
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '~/utils/api'

// State
const loading = ref(false)
const searchQuery = ref('')
const filterAction = ref<string | null>(null)
const currentPage = ref(1)
const itemsPerPage = 50
const totalItems = ref(0)
const activities = ref<any[]>([])
const showDetailsDialog = ref(false)
const selectedActivity = ref<any>(null)

// Stats
const stats = ref({
  totalActivities: 0,
  todayActivities: 0,
  activeUsers: 0,
  securityEvents: 0
})

// Action Types
const actionTypes = [
  'login',
  'logout',
  'create',
  'update',
  'delete',
  'view',
  'download',
  'upload',
  'password_change',
  '2fa_enabled',
  '2fa_disabled',
  'settings_update',
  'api_call'
]

// Computed
const filteredActivities = computed(() => {
  let filtered = activities.value

  if (filterAction.value) {
    filtered = filtered.filter(a => a.action === filterAction.value)
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(a => 
      a.user?.firstName?.toLowerCase().includes(query) ||
      a.user?.lastName?.toLowerCase().includes(query) ||
      a.user?.email?.toLowerCase().includes(query) ||
      a.action?.toLowerCase().includes(query) ||
      a.description?.toLowerCase().includes(query) ||
      a.entity?.toLowerCase().includes(query)
    )
  }

  return filtered
})

const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage))

// Methods
const loadActivityLogs = async () => {
  loading.value = true
  try {
    const response: any = await api.get(`/api/admin/activity-logs?page=${currentPage.value}&limit=${itemsPerPage}`)
    activities.value = response.activities || []
    totalItems.value = response.total || 0
    stats.value = response.stats || stats.value
  } catch (e) {
    console.error('Failed to load activity logs:', e)
  } finally {
    loading.value = false
  }
}

const getActionColor = (action: string): string => {
  const colors: Record<string, string> = {
    login: 'success',
    logout: 'info',
    create: 'primary',
    update: 'info',
    delete: 'error',
    view: 'grey',
    download: 'purple',
    upload: 'blue',
    password_change: 'warning',
    '2fa_enabled': 'success',
    '2fa_disabled': 'error',
    settings_update: 'info',
    api_call: 'secondary'
  }
  return colors[action] || 'grey'
}

const getActionIcon = (action: string): string => {
  const icons: Record<string, string> = {
    login: 'mdi-login',
    logout: 'mdi-logout',
    create: 'mdi-plus-circle',
    update: 'mdi-pencil',
    delete: 'mdi-delete',
    view: 'mdi-eye',
    download: 'mdi-download',
    upload: 'mdi-upload',
    password_change: 'mdi-key',
    '2fa_enabled': 'mdi-shield-check',
    '2fa_disabled': 'mdi-shield-off',
    settings_update: 'mdi-cog',
    api_call: 'mdi-api'
  }
  return icons[action] || 'mdi-history'
}

const getActionDescription = (activity: any): string => {
  const action = activity.action
  const entity = activity.entity
  const user = `${activity.user?.firstName} ${activity.user?.lastName}`

  if (action === 'login') return `${user} logged into the system`
  if (action === 'logout') return `${user} logged out`
  if (action === 'create' && entity) return `${user} created a new ${entity}`
  if (action === 'update' && entity) return `${user} updated ${entity} record`
  if (action === 'delete' && entity) return `${user} deleted ${entity} record`
  if (action === 'view' && entity) return `${user} viewed ${entity}`
  if (action === 'password_change') return `${user} changed their password`
  if (action === '2fa_enabled') return `${user} enabled two-factor authentication`
  if (action === '2fa_disabled') return `${user} disabled two-factor authentication`

  return `${user} performed ${action}`
}

const formatRelativeTime = (date: string | Date): string => {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now.getTime() - past.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`

  return past.toLocaleDateString()
}

const formatDateTime = (date: string | Date): string => {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const showActivityDetails = (activity: any) => {
  selectedActivity.value = activity
  showDetailsDialog.value = true
}

onMounted(() => {
  loadActivityLogs()
})

definePageMeta({
  layout: 'admin',
  middleware: ['admin']
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@700&display=swap');

.premium-activity-wrapper {
  font-family: 'Inter', sans-serif;
  letter-spacing: -0.01em;
  min-height: 100vh;
}

.font-serif {
  font-family: 'Playfair Display', serif;
}

.header-glass {
  backdrop-filter: blur(12px);
  background: rgba(255, 255, 255, 0.8) !important;
}

/* Card Styling */
.premium-card {
  background: white !important;
  border: 1px solid #E2E8F0 !important;
  border-radius: 20px !important;
  box-shadow: 0 4px 25px rgba(0, 0, 0, 0.03) !important;
  transition: transform 0.2s ease;
  overflow: hidden;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 30px rgba(0, 0, 0, 0.08) !important;
}

.icon-orb {
  width: 48px;
  height: 48px;
  background: rgba(25, 118, 210, 0.08);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-orb-small {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bg-blue-50 {
  background: #EFF6FF !important;
}

.bg-green-50 {
  background: #F0FDF4 !important;
}

.bg-purple-50 {
  background: #FAF5FF !important;
}

.bg-red-50 {
  background: #FEF2F2 !important;
}

/* Activity List */
.activity-list {
  background: white;
}

.activity-item {
  transition: background 0.15s ease;
}

.activity-item:hover {
  background: #F8FAFC !important;
}

.activity-avatar {
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

/* Input Styling */
.premium-input :deep(.v-field__outline) {
  --v-field-border-opacity: 0.1;
  border-radius: 12px !important;
}

.premium-input :deep(.v-field) {
  border-radius: 12px !important;
}

.action-btn-primary {
  background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%) !important;
  color: white !important;
  border-radius: 12px !important;
  height: 52px !important;
  font-weight: 700 !important;
  text-transform: none !important;
  letter-spacing: 0.02em !important;
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.2) !important;
  transition: all 0.2s ease !important;
}

.action-btn-outline {
  border: 2px solid #E2E8F0 !important;
  border-radius: 12px !important;
  text-transform: none !important;
  font-weight: 700 !important;
  color: #475569 !important;
}

.premium-chip-mini {
  height: 20px !important;
  font-size: 0.65rem !important;
  font-weight: 700 !important;
  border-radius: 6px !important;
}

/* Utility Classes */
.border-slate-100 {
  border-color: #F1F5F9 !important;
}

.border-slate-200 {
  border-color: #E2E8F0 !important;
}

.text-slate-500 {
  color: #64748B !important;
}

.text-slate-600 {
  color: #475569 !important;
}

.text-slate-900 {
  color: #0F172A !important;
}

.rounded-lg {
  border-radius: 12px !important;
}

.max-width-200 {
  max-width: 200px;
}

.max-width-300 {
  max-width: 300px;
}

.sticky {
  position: sticky;
}

.top-0 {
  top: 0;
}

.z-50 {
  z-index: 50;
}

.gap-4 {
  gap: 16px;
}

.font-mono {
  font-family: 'Courier New', monospace;
}

@media (max-width: 960px) {
  .header-glass {
    padding: 16px !important;
  }
  
  .premium-card .p-8 {
    padding: 24px !important;
  }
  
  .max-width-200,
  .max-width-300 {
    max-width: 100%;
  }
}
</style>

