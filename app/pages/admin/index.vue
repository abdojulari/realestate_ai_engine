<template>
  <div class="admin-dashboard-premium px-md-8 py-md-6">
    <v-container fluid>
      <!-- Refined Page Header -->
      <v-row class="mb-10 align-center">
        <v-col cols="12" md="8">
          <div class="d-flex align-center mb-2">
            <div class="premium-accent-bar mr-4"></div>
            <span class="text-overline letter-spacing-2 text-gold">Management Console</span>
          </div>
          <h1 class="display-serif text-h3 mb-1">Command Center</h1>
          <p class="text-subtitle-1 text-medium-emphasis font-weight-light">Real-time platform oversight and intelligence</p>
        </v-col>
        <v-col cols="12" md="4" class="text-md-right">
          <div class="timestamp-box">
            <v-icon icon="mdi-clock-outline" size="small" class="mr-2" />
            <span class="text-caption font-weight-bold">System Status: Optimal</span>
          </div>
        </v-col>
      </v-row>

      <!-- High-Fidelity Stats Cards (Uniform Height) -->
      <v-row class="mb-10 flex-row">
        <v-col v-for="(card, index) in [
          { val: stats.totalUsers, label: 'Total Users', sub: `${stats.userGrowth}% this month`, icon: 'mdi-account-group-outline', orb: 'primary-orb', growth: true },
          { val: stats.activeListings, label: 'Active Listings', sub: `Out of ${stats.totalListings} total`, icon: 'mdi-home-city-outline', orb: 'success-orb' },
          { val: stats.inquiriesThisMonth, label: 'Monthly Inquiries', sub: `${stats.totalInquiries} lifetime`, icon: 'mdi-message-text-outline', orb: 'info-orb' },
          { val: stats.viewingsToday, label: 'Viewings Today', sub: `${stats.viewingsThisWeek} this week`, icon: 'mdi-calendar-check-outline', orb: 'gold-orb' }
        ]" :key="index" cols="12" sm="6" md="3" class="d-flex">
          <v-card class="stat-card-premium w-100" elevation="0">
            <v-card-text class="d-flex flex-column h-100">
              <div class="d-flex justify-space-between align-start mb-4">
                <div :class="['icon-orb', card.orb]"><v-icon :icon="card.icon" /></div>
                <div v-if="card.growth" class="text-caption text-success font-weight-bold growth-chip">
                  <v-icon size="x-small">mdi-arrow-up</v-icon> {{ stats.userGrowth }}%
                </div>
              </div>
              <div class="mt-auto">
                <div class="text-h3 font-weight-bold mb-1 letter-spacing-tight">{{ card.val }}</div>
                <div class="text-overline text-medium-emphasis lh-1 mb-1">{{ card.label }}</div>
                <div class="text-caption opacity-60">{{ card.sub }}</div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Sleek Quick Actions -->
      <v-row class="mb-10">
        <v-col cols="12">
          <v-card class="action-card-premium" elevation="0">
            <v-card-title class="text-overline letter-spacing-1 pt-6 px-8">Operational Shortcuts</v-card-title>
            <v-card-text class="pa-8 pt-2">
              <v-row>
                <v-col v-for="action in quickActions" :key="action.title" cols="12" sm="6" md="3">
                  <v-btn
                    :prepend-icon="action.icon"
                    :color="action.color"
                    :to="action.to"
                    block
                    height="54"
                    variant="flat"
                    class="premium-action-btn"
                  >
                    {{ action.title }}
                  </v-btn>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Data Intelligence Row (Uniform Height) -->
      <v-row class="mb-10">
        <v-col cols="12" md="6" class="d-flex">
          <v-card class="editorial-list-card w-100 flex-column d-flex" elevation="0">
            <v-card-title class="d-flex align-center pa-6">
              <span class="display-serif text-h5">Recent Acquisitions</span>
              <v-spacer />
              <v-btn variant="tonal" to="/admin/users" size="small" class="rounded-lg">Directory</v-btn>
            </v-card-title>
            <v-divider class="opacity-10" />
            <v-card-text class="pa-0 flex-grow-1 overflow-auto" style="max-height: 400px;">
              <v-list bg-color="transparent" class="py-2">
                <v-list-item
                  v-for="user in recentUsers"
                  :key="user.id"
                  class="px-6 py-3 list-item-hover"
                >
                  <template v-slot:prepend>
                    <v-avatar
                      :color="user.role === 'admin' ? '#121212' : '#f4f1ea'"
                      :class="user.role === 'admin' ? 'text-white' : 'text-primary'"
                      size="48"
                      class="mr-4 elevation-1 font-weight-bold"
                    >
                      {{ getInitials(user) }}
                    </v-avatar>
                  </template>

                  <v-list-item-title class="font-weight-bold text-body-1">{{ user.firstName }} {{ user.lastName }}</v-list-item-title>
                  <v-list-item-subtitle class="text-caption text-medium-emphasis">{{ user.email }}</v-list-item-subtitle>

                  <template v-slot:append>
                    <div class="text-caption font-weight-medium opacity-60">
                      {{ formatDate(user.createdAt) }}
                    </div>
                  </template>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6" class="d-flex">
          <v-card class="editorial-list-card w-100 flex-column d-flex" elevation="0">
            <v-card-title class="d-flex align-center pa-6">
              <span class="display-serif text-h5">Portfolio Updates</span>
              <v-spacer />
              <v-btn variant="tonal" to="/admin/properties" size="small" class="rounded-lg">Inventory</v-btn>
            </v-card-title>
            <v-divider class="opacity-10" />
            <v-card-text class="pa-0 flex-grow-1 overflow-auto" style="max-height: 400px;">
              <v-list bg-color="transparent" class="py-2">
                <v-list-item
                  v-for="property in recentProperties"
                  :key="property.id"
                  class="px-6 py-3 list-item-hover"
                >
                  <template v-slot:prepend>
                    <v-img
                      :src="property.images[0]"
                      width="70"
                      height="50"
                      cover
                      class="rounded-lg mr-4 elevation-2 border-all"
                    />
                  </template>

                  <v-list-item-title class="font-weight-bold text-body-1">{{ property.title }}</v-list-item-title>
                  <v-list-item-subtitle class="text-caption text-medium-emphasis">{{ property.address }}</v-list-item-subtitle>

                  <template v-slot:append>
                    <v-chip
                      :color="getStatusColor(property.status)"
                      size="x-small"
                      class="text-uppercase font-weight-black letter-spacing-1 px-3"
                      variant="flat"
                    >
                      {{ property.status }}
                    </v-chip>
                  </template>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Analytics Intelligence (Uniform Height) -->
      <v-row>
        <v-col cols="12">
          <v-card class="analytics-wrapper-card" elevation="0">
            <v-card-title class="pa-8 pb-2">
              <span class="display-serif text-h5">Market Intelligence Trends</span>
            </v-card-title>
            <v-card-text class="pa-8 pt-0">
              <v-row>
                <v-col cols="12" md="6" class="d-flex">
                  <div class="chart-container-premium w-100">
                    <div class="chart-header">
                      <v-icon icon="mdi-trending-up" class="mr-2" size="small" />
                      Registration Velocity
                    </div>
                    <EChart :option="userTrendOption" height="280px" />
                  </div>
                </v-col>

                <v-col cols="12" md="6" class="d-flex">
                  <div class="chart-container-premium w-100">
                    <div class="chart-header">
                      <v-icon icon="mdi-eye-outline" class="mr-2" size="small" />
                      Engagement Metrics
                    </div>
                    <EChart :option="viewsTrendOption" height="280px" />
                  </div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import EChart from '~/components/charts/EChart.vue'
import { formatDate } from '../../../utils/formatters'

// Helper function to safely get auth headers
const getAuthHeaders = () => {
  if (process.client) {
    const token = localStorage.getItem('token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }
  return {}
}

// NO LOGIC CHANGES MADE BELOW THIS LINE
const stats = ref<any>({
  totalUsers: 0,
  userGrowth: 0,
  activeListings: 0,
  totalListings: 0,
  inquiriesThisMonth: 0,
  totalInquiries: 0,
  viewingsToday: 0,
  viewingsThisWeek: 0
})

const quickActions = [
  { title: 'Add User', icon: 'mdi-account-plus', color: 'primary', to: '/admin/users' },
  { title: 'Add Property', icon: 'mdi-home-plus', color: 'success', to: '/admin/properties' },
  { title: 'Export Data', icon: 'mdi-download', color: 'info', to: '/admin/reports' },
  { title: 'Settings', icon: 'mdi-cog', color: 'warning', to: '/admin/settings' }
]

const recentUsers = ref<any[]>([])
const recentProperties = ref<any[]>([])

const getInitials = (user: any) => {
  return `${user.firstName[0]}${user.lastName[0]}`
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    active: 'success',
    pending: 'warning',
    sold: 'info',
    inactive: 'grey'
  }
  return colors[status] || 'grey'
}

onMounted(async () => {
  try {
    const data = await $fetch('/api/admin/dashboard', {
      headers: getAuthHeaders()
    }) as any
    stats.value = data.stats || stats.value
    recentUsers.value = data.recentUsers || []
    recentProperties.value = data.recentProperties || []
  } catch (error) {
    console.error('Error loading dashboard data:', error)
  }
})

definePageMeta({
  layout: 'admin',
  middleware: ['admin']
})

const userTrendOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: { type: 'category', data: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], axisLine: { lineStyle: { color: '#eee' } } },
  yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed' } } },
  series: [{ 
    type: 'line', 
    data: [0,0,0,0,0,0,0], 
    smooth: true, 
    color: '#8c734b',
    areaStyle: { color: 'rgba(140, 115, 75, 0.1)' },
    lineStyle: { width: 3 }
  }]
}))

const viewsTrendOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: { type: 'category', data: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], axisLine: { lineStyle: { color: '#eee' } } },
  yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed' } } },
  series: [{ 
    type: 'line', 
    data: [0,0,0,0,0,0,0], 
    smooth: true, 
    color: '#121212',
    areaStyle: { color: 'rgba(18, 18, 18, 0.05)' },
    lineStyle: { width: 3 }
  }]
}))
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;600;700&display=swap');

.admin-dashboard-premium {
  background-color: #fcfcfb;
  font-family: 'Inter', sans-serif;
  min-height: 100vh;
}

.lh-1 { line-height: 1; }

.display-serif {
  font-family: 'Playfair Display', serif;
}

.text-gold {
  color: #8c734b;
}

.letter-spacing-2 { letter-spacing: 2px; }
.letter-spacing-1 { letter-spacing: 1px; }
.letter-spacing-tight { letter-spacing: -1px; }

.premium-accent-bar {
  width: 40px;
  height: 4px;
  background: #8c734b;
  border-radius: 2px;
}

.timestamp-box {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 100px;
  color: #666;
}

/* Stat Cards */
.stat-card-premium {
  border-radius: 20px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  background: white !important;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.stat-card-premium:hover {
  transform: translateY(-5px);
  border-color: #8c734b !important;
}

.icon-orb {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.primary-orb { background: rgba(var(--v-theme-primary), 0.1); color: rgb(var(--v-theme-primary)); }
.success-orb { background: rgba(var(--v-theme-success), 0.1); color: rgb(var(--v-theme-success)); }
.info-orb { background: rgba(var(--v-theme-info), 0.1); color: rgb(var(--v-theme-info)); }
.gold-orb { background: rgba(140, 115, 75, 0.1); color: #8c734b; }

.growth-chip {
  padding: 2px 8px;
  background: rgba(var(--v-theme-success), 0.1);
  border-radius: 100px;
}

/* Action Card */
.action-card-premium {
  border-radius: 24px !important;
  background: #121212 !important;
  color: white !important;
}

.premium-action-btn {
  border-radius: 12px !important;
  text-transform: none !important;
  font-weight: 700 !important;
  letter-spacing: 0.5px !important;
}

/* List Cards */
.editorial-list-card {
  border-radius: 24px !important;
  background: white !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  min-height: 520px; /* Uniform height for data lists */
}

.list-item-hover:hover {
  background-color: #fcfcfb;
}

.border-all {
  border: 1px solid rgba(0,0,0,0.05);
}

/* Analytics */
.analytics-wrapper-card {
  border-radius: 24px !important;
  background: white !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
}

.chart-container-premium {
  padding: 24px;
  background: #fcfcfb;
  border-radius: 20px;
  border: 1px solid #f1f1ee;
}

.chart-header {
  font-weight: 800;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 1px;
  margin-bottom: 20px;
  color: #999;
}
</style>