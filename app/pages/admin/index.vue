<template>
  <div class="admin-dashboard">
    <v-container>
      <!-- Page Header -->
      <v-row class="mb-6">
        <v-col>
          <h1 class="text-h4">Admin Dashboard</h1>
          <p class="text-subtitle-1">Manage your real estate platform</p>
        </v-col>
      </v-row>

      <!-- Stats Cards -->
      <v-row class="mb-6">
        <v-col cols="12" md="3">
          <v-card>
            <v-card-text class="text-center">
              <div class="text-h3 mb-2">{{ stats.totalUsers }}</div>
              <div class="text-subtitle-1">Total Users</div>
              <div class="text-caption text-success">
                <v-icon size="small">mdi-arrow-up</v-icon>
                {{ stats.userGrowth }}% this month
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3">
          <v-card>
            <v-card-text class="text-center">
              <div class="text-h3 mb-2">{{ stats.activeListings }}</div>
              <div class="text-subtitle-1">Active Listings</div>
              <div class="text-caption">
                {{ stats.totalListings }} total listings
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3">
          <v-card>
            <v-card-text class="text-center">
              <div class="text-h3 mb-2">{{ stats.inquiriesThisMonth }}</div>
              <div class="text-subtitle-1">Inquiries This Month</div>
              <div class="text-caption">
                {{ stats.totalInquiries }} total inquiries
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3">
          <v-card>
            <v-card-text class="text-center">
              <div class="text-h3 mb-2">{{ stats.viewingsToday }}</div>
              <div class="text-subtitle-1">Viewings Today</div>
              <div class="text-caption">
                {{ stats.viewingsThisWeek }} this week
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Quick Actions -->
      <v-row class="mb-6">
        <v-col cols="12">
          <v-card>
            <v-card-title>Quick Actions</v-card-title>
            <v-card-text>
              <v-row>
                <v-col
                  v-for="action in quickActions"
                  :key="action.title"
                  cols="6"
                  md="3"
                >
                  <v-btn
                    :prepend-icon="action.icon"
                    :color="action.color"
                    :to="action.to"
                    block
                    class="mb-2"
                  >
                    {{ action.title }}
                  </v-btn>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Recent Activity -->
      <v-row class="mb-6">
        <v-col cols="12" md="6">
          <v-card>
            <v-card-title class="d-flex align-center">
              Recent Users
              <v-spacer />
              <v-btn
                variant="text"
                to="/admin/users"
                size="small"
              >
                View All
              </v-btn>
            </v-card-title>

            <v-card-text>
              <v-list lines="two">
                <v-list-item
                  v-for="user in recentUsers"
                  :key="user.id"
                  :title="`${user.firstName} ${user.lastName}`"
                  :subtitle="user.email"
                >
                  <template v-slot:prepend>
                    <v-avatar
                      :color="user.role === 'admin' ? 'error' : 'primary'"
                      size="40"
                    >
                      {{ getInitials(user) }}
                    </v-avatar>
                  </template>

                  <template v-slot:append>
                    <div class="text-caption">
                      {{ formatDate(user.createdAt) }}
                    </div>
                  </template>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-card>
            <v-card-title class="d-flex align-center">
              Recent Properties
              <v-spacer />
              <v-btn
                variant="text"
                to="/admin/properties"
                size="small"
              >
                View All
              </v-btn>
            </v-card-title>

            <v-card-text>
              <v-list lines="two">
                <v-list-item
                  v-for="property in recentProperties"
                  :key="property.id"
                  :title="property.title"
                  :subtitle="property.address"
                >
                  <template v-slot:prepend>
                    <v-img
                      :src="property.images[0]"
                      width="60"
                      height="40"
                      cover
                      class="rounded"
                    />
                  </template>

                  <template v-slot:append>
                    <v-chip
                      :color="getStatusColor(property.status)"
                      size="small"
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

      <!-- Analytics -->
      <v-row>
        <v-col cols="12">
          <v-card>
            <v-card-title>Platform Analytics</v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="12" md="6">
                  <v-card variant="outlined">
                    <v-card-title>User Registration Trend</v-card-title>
                    <v-card-text>
                      <EChart :option="userTrendOption" height="200px" />
                    </v-card-text>
                  </v-card>
                </v-col>

                <v-col cols="12" md="6">
                  <v-card variant="outlined">
                    <v-card-title>Property Views</v-card-title>
                    <v-card-text>
                      <EChart :option="viewsTrendOption" height="200px" />
                    </v-card-text>
                  </v-card>
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
import { ref, computed } from 'vue'
import EChart from '~/components/charts/EChart.vue'
import { formatDate } from '../../../utils/formatters'

// Reactive data loaded from API
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
  { title: 'Add User', icon: 'mdi-account-plus', color: 'primary', to: '/admin/users/new' },
  { title: 'Add Property', icon: 'mdi-home-plus', color: 'success', to: '/admin/properties/new' },
  { title: 'Export Data', icon: 'mdi-download', color: 'info', to: '/admin/reports' },
  { title: 'Settings', icon: 'mdi-cog', color: 'warning', to: '/admin/settings' }
]

const recentUsers = ref<any[]>([])

const recentProperties = ref<any[]>([])

// Methods
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

// Load data
onMounted(async () => {
  try {
    const data = await $fetch('/api/admin/dashboard', {
      headers: (() => {
        try {
          const token = localStorage.getItem('token')
          return token ? { Authorization: `Bearer ${token}` } : {}
        } catch { return {} }
      })()
    }) as any
    stats.value = data.stats || stats.value
    recentUsers.value = data.recentUsers || []
    recentProperties.value = data.recentProperties || []
  } catch (error) {
    console.error('Error loading dashboard data:', error)
  }
})

// Define page meta
definePageMeta({
  layout: 'admin',
  middleware: ['admin']
})

const userTrendOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] },
  yAxis: { type: 'value' },
  series: [{ type: 'line', data: [0,0,0,0,0,0,0] }]
}))

const viewsTrendOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] },
  yAxis: { type: 'value' },
  series: [{ type: 'line', data: [0,0,0,0,0,0,0] }]
}))
</script>

<style scoped>
.admin-dashboard {
  min-height: calc(100vh - 64px);
}

.chart-placeholder {
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  border-radius: 4px;
  color: #666;
}
</style>