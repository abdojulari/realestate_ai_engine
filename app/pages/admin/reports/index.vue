<template>
  <v-container>
    <div class="d-flex align-center mb-6">
      <h1 class="text-h4">Reports & Analytics</h1>
      <v-spacer />
      <v-btn-group>
        <v-btn
          prepend-icon="mdi-file-excel"
          @click="exportReport('excel')"
          :loading="exporting === 'excel'"
        >
          Export Excel
        </v-btn>
        <v-btn
          prepend-icon="mdi-file-pdf-box"
          @click="exportReport('pdf')"
          :loading="exporting === 'pdf'"
        >
          Export PDF
        </v-btn>
      </v-btn-group>
    </div>

    <!-- Date Range Filter -->
    <v-card class="mb-6">
      <v-card-text>
        <v-row align="center">
          <v-col cols="12" sm="4">
            <v-select
              v-model="dateRange"
              :items="dateRanges"
              label="Date Range"
              @update:model-value="updateReports"
            />
          </v-col>

          <v-col cols="12" sm="4">
            <v-text-field
              v-model="customRange.start"
              label="Start Date"
              type="date"
              :disabled="dateRange !== 'custom'"
              @update:model-value="updateReports"
            />
          </v-col>

          <v-col cols="12" sm="4">
            <v-text-field
              v-model="customRange.end"
              label="End Date"
              type="date"
              :disabled="dateRange !== 'custom'"
              @update:model-value="updateReports"
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Overview Stats -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text class="text-center">
            <v-icon
              size="36"
              color="primary"
              class="mb-2"
            >
              mdi-home-analytics
            </v-icon>
            <div class="text-h4 mb-1">{{ stats.totalListings }}</div>
            <div class="text-body-1">Total Listings</div>
            <div class="text-caption text-success">
              <v-icon size="small">mdi-arrow-up</v-icon>
              {{ stats.listingGrowth }}% from last period
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text class="text-center">
            <v-icon
              size="36"
              color="primary"
              class="mb-2"
            >
              mdi-account-group
            </v-icon>
            <div class="text-h4 mb-1">{{ stats.totalUsers }}</div>
            <div class="text-body-1">Total Users</div>
            <div class="text-caption text-success">
              <v-icon size="small">mdi-arrow-up</v-icon>
              {{ stats.userGrowth }}% from last period
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text class="text-center">
            <v-icon
              size="36"
              color="primary"
              class="mb-2"
            >
              mdi-eye
            </v-icon>
            <div class="text-h4 mb-1">{{ stats.totalViews }}</div>
            <div class="text-body-1">Total Views</div>
            <div class="text-caption text-success">
              <v-icon size="small">mdi-arrow-up</v-icon>
              {{ stats.viewGrowth }}% from last period
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text class="text-center">
            <v-icon
              size="36"
              color="primary"
              class="mb-2"
            >
              mdi-currency-usd
            </v-icon>
            <div class="text-h4 mb-1">${{ formatNumber(stats.totalRevenue) }}</div>
            <div class="text-body-1">Total Revenue</div>
            <div class="text-caption text-success">
              <v-icon size="small">mdi-arrow-up</v-icon>
              {{ stats.revenueGrowth }}% from last period
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Charts -->
    <v-row class="mb-6">
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title>Listings & Views Over Time</v-card-title>
          <v-card-text>
            <EChart :option="listingsViewsOption" height="300px" />
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card>
          <v-card-title>Property Types Distribution</v-card-title>
          <v-card-text>
            <EChart :option="typesPieOption" height="300px" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Detailed Reports -->
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-tabs v-model="activeTab">
            <v-tab value="listings">Listings Report</v-tab>
            <v-tab value="users">User Activity</v-tab>
            <v-tab value="inquiries">Inquiries</v-tab>
            <v-tab value="viewings">Viewings</v-tab>
          </v-tabs>

          <v-card-text>
            <v-window v-model="activeTab">
              <!-- Listings Report -->
              <v-window-item value="listings">
                <v-table>
                  <thead>
                    <tr>
                      <th>Property</th>
                      <th>Views</th>
                      <th>Inquiries</th>
                      <th>Viewings</th>
                      <th>Status</th>
                      <th>Listed Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="listing in listingsReport"
                      :key="listing.id"
                    >
                      <td>
                        <div class="d-flex align-center">
                          <v-img
                            :src="listing.image"
                            width="60"
                            height="40"
                            cover
                            class="rounded mr-3"
                          />
                          <div>
                            <div class="font-weight-medium">{{ listing.title }}</div>
                            <div class="text-caption">${{ formatNumber(listing.price) }}</div>
                          </div>
                        </div>
                      </td>
                      <td>{{ listing.views }}</td>
                      <td>{{ listing.inquiries }}</td>
                      <td>{{ listing.viewings }}</td>
                      <td>
                        <v-chip
                          :color="getStatusColor(listing.status)"
                          size="small"
                        >
                          {{ listing.status }}
                        </v-chip>
                      </td>
                      <td>{{ formatDate(listing.listedDate) }}</td>
                    </tr>
                  </tbody>
                </v-table>
              </v-window-item>

              <!-- User Activity -->
              <v-window-item value="users">
                <v-table>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Last Active</th>
                      <th>Saved Properties</th>
                      <th>Inquiries</th>
                      <th>Viewings</th>
                      <th>Registration Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="user in userReport"
                      :key="user.id"
                    >
                      <td>
                        <div class="d-flex align-center">
                          <v-avatar
                            :color="user.status === 'active' ? 'primary' : 'grey'"
                            size="32"
                            class="mr-3"
                          >
                            {{ getInitials(user.name) }}
                          </v-avatar>
                          <div>
                            <div class="font-weight-medium">{{ user.name }}</div>
                            <div class="text-caption">{{ user.email }}</div>
                          </div>
                        </div>
                      </td>
                      <td>{{ formatTimeAgo(user.lastActive) }}</td>
                      <td>{{ user.savedProperties }}</td>
                      <td>{{ user.inquiries }}</td>
                      <td>{{ user.viewings }}</td>
                      <td>{{ formatDate(user.registrationDate) }}</td>
                    </tr>
                  </tbody>
                </v-table>
              </v-window-item>

              <!-- Inquiries -->
              <v-window-item value="inquiries">
                <v-table>
                  <thead>
                    <tr>
                      <th>Property</th>
                      <th>User</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Response Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="inquiry in inquiryReport"
                      :key="inquiry.id"
                    >
                      <td>
                        <div class="d-flex align-center">
                          <v-img
                            :src="inquiry.property.image"
                            width="60"
                            height="40"
                            cover
                            class="rounded mr-3"
                          />
                          <div>{{ inquiry.property.title }}</div>
                        </div>
                      </td>
                      <td>{{ inquiry.user.name }}</td>
                      <td>{{ inquiry.type }}</td>
                      <td>
                        <v-chip
                          :color="getInquiryStatusColor(inquiry.status)"
                          size="small"
                        >
                          {{ inquiry.status }}
                        </v-chip>
                      </td>
                      <td>{{ formatDate(inquiry.date) }}</td>
                      <td>{{ inquiry.responseTime }}</td>
                    </tr>
                  </tbody>
                </v-table>
              </v-window-item>

              <!-- Viewings -->
              <v-window-item value="viewings">
                <v-table>
                  <thead>
                    <tr>
                      <th>Property</th>
                      <th>User</th>
                      <th>Date & Time</th>
                      <th>Status</th>
                      <th>Agent</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="viewing in viewingReport"
                      :key="viewing.id"
                    >
                      <td>
                        <div class="d-flex align-center">
                          <v-img
                            :src="viewing.property.image"
                            width="60"
                            height="40"
                            cover
                            class="rounded mr-3"
                          />
                          <div>{{ viewing.property.title }}</div>
                        </div>
                      </td>
                      <td>{{ viewing.user.name }}</td>
                      <td>{{ formatDateTime(viewing.dateTime) }}</td>
                      <td>
                        <v-chip
                          :color="getViewingStatusColor(viewing.status)"
                          size="small"
                        >
                          {{ viewing.status }}
                        </v-chip>
                      </td>
                      <td>{{ viewing.agent.name }}</td>
                      <td>{{ viewing.notes }}</td>
                    </tr>
                  </tbody>
                </v-table>
              </v-window-item>
            </v-window>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import EChart from '~/components/charts/EChart.vue'

const dateRange = ref('last_30_days')
const customRange = ref({
  start: '',
  end: ''
})
const activeTab = ref('listings')
const exporting = ref('')

const dateRanges = [
  { title: 'Last 7 Days', value: 'last_7_days' },
  { title: 'Last 30 Days', value: 'last_30_days' },
  { title: 'Last 90 Days', value: 'last_90_days' },
  { title: 'This Year', value: 'this_year' },
  { title: 'Custom Range', value: 'custom' }
]

const stats = ref({
  totalListings: 0,
  listingGrowth: 0,
  totalUsers: 0,
  userGrowth: 0,
  totalViews: 0,
  viewGrowth: 0,
  totalRevenue: 0,
  revenueGrowth: 0
})

const listingsReport = ref<any[]>([])

const userReport = ref<any[]>([])

const inquiryReport = ref<any[]>([])

const viewingReport = ref<any[]>([])

const formatNumber = (num: number) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString()
}

const formatDateTime = (date: Date) => {
  return new Date(date).toLocaleString()
}

const formatTimeAgo = (date: Date) => {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000)
  
  let interval = seconds / 31536000
  if (interval > 1) return Math.floor(interval) + ' years ago'
  
  interval = seconds / 2592000
  if (interval > 1) return Math.floor(interval) + ' months ago'
  
  interval = seconds / 86400
  if (interval > 1) return Math.floor(interval) + ' days ago'
  
  interval = seconds / 3600
  if (interval > 1) return Math.floor(interval) + ' hours ago'
  
  interval = seconds / 60
  if (interval > 1) return Math.floor(interval) + ' minutes ago'
  
  return Math.floor(seconds) + ' seconds ago'
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
}

const getStatusColor = (status: string) => {
  const colors = {
    active: 'success',
    pending: 'warning',
    sold: 'error',
    inactive: 'grey'
  }
  return colors[status as keyof typeof colors] || 'grey'
}

const getInquiryStatusColor = (status: string) => {
  const colors = {
    new: 'warning',
    responded: 'success',
    closed: 'grey'
  }
  return colors[status as keyof typeof colors] || 'grey'
}

const getViewingStatusColor = (status: string) => {
  const colors = {
    scheduled: 'primary',
    completed: 'success',
    cancelled: 'error',
    pending: 'warning'
  }
  return colors[status as keyof typeof colors] || 'grey'
}

const updateReports = async () => {
  try {
    const headers = (() => { try { const t = localStorage.getItem('token'); return t ? { Authorization: `Bearer ${t}` } : {} } catch { return {} } })()
    const params = new URLSearchParams()
    params.append('range', dateRange.value)
    if (dateRange.value === 'custom' && customRange.value.start && customRange.value.end) {
      params.append('start', customRange.value.start)
      params.append('end', customRange.value.end)
    }
    const [s, listings, users, inquiries, viewings] = await Promise.all([
      //@ts-ignore
      $fetch(`/api/admin/reports/stats?${params.toString()}`, { headers }),
      //@ts-ignore
      $fetch('/api/admin/reports/listings', { headers }),
      //@ts-ignore
      $fetch('/api/admin/reports/users', { headers }),
      //@ts-ignore
      $fetch('/api/admin/reports/inquiries', { headers }),
      //@ts-ignore
      $fetch('/api/admin/reports/viewings', { headers })
    ])
    stats.value = s as any
    listingsReport.value = listings as any[]
    userReport.value = users as any[]
    inquiryReport.value = inquiries as any[]
    viewingReport.value = viewings as any[]
  } catch (error) {
    console.error('Error updating reports:', error)
  }
}
const listingsViewsOption = computed(() => {
  const x = listingsReport.value.map((i: any) => i.title)
  const views = listingsReport.value.map((i: any) => i.views)
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['Views'] },
    xAxis: { type: 'category', data: x, axisLabel: { show: false } },
    yAxis: { type: 'value' },
    series: [{ name: 'Views', type: 'bar', data: views }]
  }
})

const typesPieOption = computed(() => {
  const groups: Record<string, number> = {}
  listingsReport.value.forEach((i: any) => { const key = (i.type || 'unknown'); groups[key] = (groups[key] || 0) + 1 })
  return {
    tooltip: { trigger: 'item' },
    series: [{ type: 'pie', radius: '70%', data: Object.entries(groups).map(([name, value]) => ({ name, value })) }]
  }
})


const exportReport = async (format: string) => {
  exporting.value = format
  try {
    // Call export API with proper headers
    const token = localStorage.getItem('token')
    const response = await fetch('/api/admin/reports/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({
        format,
        dateRange: dateRange.value,
        customRange: dateRange.value === 'custom' ? customRange.value : undefined,
        type: activeTab.value
      })
    })
    
    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`)
    }
    
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    
    // Set correct file extension
    const extension = format === 'excel' ? 'csv' : 'html'
    const fileName = `property-report-${dateRange.value}-${new Date().toISOString().split('T')[0]}.${extension}`
    a.download = fileName
    
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    
    console.log(`✅ ${format} report downloaded: ${fileName}`)
  } catch (error) {
    console.error('Error exporting report:', error)
  } finally {
    exporting.value = ''
  }
}

onMounted(() => {
  updateReports()
})

watch([dateRange, customRange], () => {
  if (dateRange.value !== 'custom' || (customRange.value.start && customRange.value.end)) {
    updateReports()
  }
})

definePageMeta({
  layout: 'admin',
  middleware: ['admin']
})
</script>
