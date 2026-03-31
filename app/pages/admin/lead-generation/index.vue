<template>
  <div class="admin-leads px-md-8 py-md-6">
    <v-container fluid>
      <!-- Header -->
      <v-row class="mb-10 align-center">
        <v-col cols="12" md="8">
          <div class="d-flex align-center mb-2">
            <v-btn icon="mdi-arrow-left" variant="text" size="small" class="mr-2" to="/admin" />
            <div class="premium-accent-bar mr-4"></div>
            <span class="text-overline letter-spacing-2 text-gold">Lead Generation</span>
          </div>
          <h1 class="display-serif text-h3 mb-1">Lead Command Center</h1>
          <p class="text-subtitle-1 text-medium-emphasis font-weight-light">
            Capture, track, and convert leads across all channels
          </p>
        </v-col>
        <v-col cols="12" md="4" class="text-md-right">
          <div class="d-flex flex-wrap align-center justify-md-end ga-3">
            <v-btn-toggle v-model="chartPeriod" mandatory density="compact" class="period-toggle">
              <v-btn value="monthly" size="small">Monthly</v-btn>
              <v-btn value="quarterly" size="small">Quarterly</v-btn>
            </v-btn-toggle>
            <v-btn color="primary" class="premium-action-btn" prepend-icon="mdi-link-plus" to="/admin/lead-generation/forms" variant="tonal">
              Capture Forms
            </v-btn>
            <v-btn color="primary" class="premium-action-btn" prepend-icon="mdi-refresh" @click="loadDashboard" :loading="loading">
              Refresh
            </v-btn>
          </div>
        </v-col>
      </v-row>

      <!-- Loading skeleton -->
      <template v-if="loading && !data">
        <v-row class="mb-10">
          <v-col v-for="i in 4" :key="i" cols="12" sm="6" md="3">
            <v-skeleton-loader type="card" class="rounded-xl" />
          </v-col>
        </v-row>
      </template>

      <template v-else-if="data">
        <!-- KPI Cards -->
        <v-row class="mb-10">
          <v-col cols="12" sm="6" md="3">
            <v-card class="stat-card-premium" elevation="0">
              <v-card-text>
                <div class="d-flex align-center mb-4">
                  <div class="icon-orb primary-orb"><v-icon>mdi-account-multiple-plus</v-icon></div>
                  <v-spacer />
                  <v-chip size="x-small" color="success" variant="tonal" v-if="data.kpis.newLeads">+{{ data.kpis.newLeads }} new</v-chip>
                </div>
                <div class="text-h3 font-weight-bold mb-1">{{ data.kpis.totalLeads }}</div>
                <div class="text-overline text-medium-emphasis">Total Leads</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-card class="stat-card-premium" elevation="0">
              <v-card-text>
                <div class="d-flex align-center mb-4">
                  <div class="icon-orb warning-orb"><v-icon>mdi-bell-ring</v-icon></div>
                </div>
                <div class="text-h3 font-weight-bold mb-1">{{ data.kpis.newLeads }}</div>
                <div class="text-overline text-medium-emphasis">Pending / New</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-card class="stat-card-premium" elevation="0">
              <v-card-text>
                <div class="d-flex align-center mb-4">
                  <div class="icon-orb success-orb"><v-icon>mdi-email-newsletter</v-icon></div>
                </div>
                <div class="text-h3 font-weight-bold mb-1">{{ data.kpis.activeSubscribers }}</div>
                <div class="text-overline text-medium-emphasis">Active Subscribers</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-card class="stat-card-premium" elevation="0">
              <v-card-text>
                <div class="d-flex align-center mb-4">
                  <div class="icon-orb gold-orb"><v-icon>mdi-percent</v-icon></div>
                </div>
                <div class="text-h3 font-weight-bold mb-1">{{ data.kpis.conversionRate }}%</div>
                <div class="text-overline text-medium-emphasis">Conversion Rate</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Funnel + Source Breakdown -->
        <v-row class="mb-10">
          <!-- Funnel -->
          <v-col cols="12" md="5">
            <v-card class="chart-card" elevation="0">
              <v-card-title class="text-overline letter-spacing-1 pt-6 px-8 text-gold">Conversion Funnel</v-card-title>
              <v-card-text class="px-8 pb-8">
                <div class="funnel-container">
                  <div v-for="(stage, idx) in funnelStages" :key="stage.label" class="funnel-stage" :style="{ width: stage.width + '%' }">
                    <div class="funnel-bar" :class="stage.colorClass">
                      <span class="funnel-count">{{ stage.value }}</span>
                    </div>
                    <div class="funnel-label">
                      <v-icon size="14" class="mr-1">{{ stage.icon }}</v-icon>
                      {{ stage.label }}
                    </div>
                    <div v-if="idx < funnelStages.length - 1" class="funnel-arrow">
                      <v-icon size="16" color="grey-lighten-1">mdi-chevron-down</v-icon>
                      <span class="funnel-rate">{{ stage.dropRate }}%</span>
                    </div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Source breakdown -->
          <v-col cols="12" md="7">
            <v-card class="chart-card" elevation="0">
              <v-card-title class="text-overline letter-spacing-1 pt-6 px-8 text-gold">Lead Sources</v-card-title>
              <v-card-text class="px-8 pb-8">
                <div class="d-flex flex-wrap ga-3 mb-6">
                  <div v-for="src in sourceCards" :key="src.label" class="source-card" :class="src.colorClass">
                    <v-icon size="20" class="mb-1">{{ src.icon }}</v-icon>
                    <div class="source-count">{{ src.value }}</div>
                    <div class="source-label">{{ src.label }}</div>
                  </div>
                </div>
                <ClientOnly>
                  <EChart :option="sourceChartOption" height="240px" />
                </ClientOnly>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Trend Charts -->
        <v-row class="mb-10">
          <v-col cols="12" md="8">
            <v-card class="chart-card" elevation="0">
              <v-card-title class="text-overline letter-spacing-1 pt-6 px-8 text-gold">
                Lead Trend — {{ chartPeriod === 'monthly' ? 'Monthly' : 'Quarterly' }}
              </v-card-title>
              <v-card-text class="px-8 pb-8">
                <ClientOnly>
                  <EChart :option="trendChartOption" height="340px" />
                </ClientOnly>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="4">
            <v-card class="chart-card" elevation="0">
              <v-card-title class="text-overline letter-spacing-1 pt-6 px-8 text-gold">Pipeline Status</v-card-title>
              <v-card-text class="px-8 pb-8">
                <div class="pipeline-section mb-5">
                  <div class="pipeline-title mb-2">
                    <v-icon size="16" class="mr-1">mdi-home-search</v-icon> Property Inquiries
                  </div>
                  <div v-for="(count, status) in data.pipeline.inquiryStatuses" :key="'inq-' + status" class="pipeline-row">
                    <span class="pipeline-status-dot" :class="'dot-' + status"></span>
                    <span class="pipeline-status-label">{{ formatStatus(status as string) }}</span>
                    <span class="pipeline-status-count">{{ count }}</span>
                  </div>
                </div>
                <v-divider class="my-4" />
                <div class="pipeline-section mb-5">
                  <div class="pipeline-title mb-2">
                    <v-icon size="16" class="mr-1">mdi-chat</v-icon> Chat Leads
                  </div>
                  <div v-for="(count, status) in data.pipeline.chatLeadStatuses" :key="'chat-' + status" class="pipeline-row">
                    <span class="pipeline-status-dot" :class="'dot-' + status"></span>
                    <span class="pipeline-status-label">{{ formatStatus(status as string) }}</span>
                    <span class="pipeline-status-count">{{ count }}</span>
                  </div>
                </div>
                <v-divider class="my-4" />
                <div class="pipeline-section">
                  <div class="pipeline-title mb-2">
                    <v-icon size="16" class="mr-1">mdi-calculator</v-icon> Home Estimates
                  </div>
                  <div v-for="(count, status) in data.pipeline.estimateStatuses" :key="'est-' + status" class="pipeline-row">
                    <span class="pipeline-status-dot" :class="'dot-' + status"></span>
                    <span class="pipeline-status-label">{{ formatStatus(status as string) }}</span>
                    <span class="pipeline-status-count">{{ count }}</span>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Recent Leads Table -->
        <v-row>
          <v-col cols="12">
            <v-card class="chart-card" elevation="0">
              <v-card-title class="d-flex align-center pt-6 px-8">
                <span class="text-overline letter-spacing-1 text-gold">Recent Leads</span>
                <v-spacer />
                <v-text-field
                  v-model="searchQuery"
                  density="compact"
                  variant="outlined"
                  prepend-inner-icon="mdi-magnify"
                  placeholder="Search leads..."
                  hide-details
                  class="search-field"
                  style="max-width: 280px"
                />
              </v-card-title>
              <v-card-text class="px-8 pb-8">
                <v-data-table
                  :headers="tableHeaders"
                  :items="filteredLeads"
                  :items-per-page="10"
                  class="leads-table"
                  density="comfortable"
                >
                  <template #item.name="{ item }">
                    <div class="d-flex align-center">
                      <v-avatar size="32" class="mr-3" :color="getSourceColor(item.type)">
                        <span class="text-caption text-white font-weight-bold">{{ getInitials(item.name) }}</span>
                      </v-avatar>
                      <div>
                        <div class="font-weight-medium">{{ item.name || 'Unknown' }}</div>
                        <div class="text-caption text-medium-emphasis">{{ item.email }}</div>
                      </div>
                    </div>
                  </template>
                  <template #item.phone="{ item }">
                    <span class="text-body-2">{{ item.phone || '—' }}</span>
                  </template>
                  <template #item.source="{ item }">
                    <v-chip size="small" :color="getSourceColor(item.type)" variant="tonal" label>
                      <v-icon start size="14">{{ getSourceIcon(item.type) }}</v-icon>
                      {{ item.source }}
                    </v-chip>
                  </template>
                  <template #item.status="{ item }">
                    <v-chip size="small" :color="getStatusColor(item.status)" variant="flat" class="font-weight-medium">
                      {{ formatStatus(item.status) }}
                    </v-chip>
                  </template>
                  <template #item.createdAt="{ item }">
                    <span class="text-body-2 text-medium-emphasis">{{ formatDate(item.createdAt) }}</span>
                  </template>
                  <template #item.actions="{ item }">
                    <v-btn icon="mdi-account-convert" size="small" variant="text" color="primary" @click="convertToCrm(item)" />
                  </template>
                </v-data-table>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </template>
    </v-container>

    <!-- Convert to CRM dialog -->
    <v-dialog v-model="showConvert" max-width="480" persistent>
      <v-card class="rounded-xl">
        <v-card-title class="pt-6 px-6">
          <v-icon class="mr-2" color="primary">mdi-account-convert</v-icon>
          Convert to CRM Client
        </v-card-title>
        <v-card-text class="px-6">
          <p class="mb-4 text-medium-emphasis">Convert <strong>{{ convertTarget?.name }}</strong> to a CRM client for pipeline tracking.</p>
          <v-select v-model="convertType" :items="['buyer', 'seller', 'investor']" label="Client Type" variant="outlined" density="compact" />
        </v-card-text>
        <v-card-actions class="px-6 pb-6">
          <v-spacer />
          <v-btn variant="text" @click="showConvert = false">Cancel</v-btn>
          <v-btn color="primary" variant="flat" :loading="converting" @click="doConvert" class="premium-action-btn px-6">Convert</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import EChart from '~/components/charts/EChart.vue'

const loading = ref(false)
const data = ref<any>(null)
const chartPeriod = ref('monthly')
const searchQuery = ref('')
const showConvert = ref(false)
const convertTarget = ref<any>(null)
const convertType = ref('buyer')
const converting = ref(false)

function getAuthHeaders() {
  if (import.meta.client) {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }
  return {}
}

async function loadDashboard() {
  loading.value = true
  try {
    data.value = await $fetch('/api/admin/lead-generation/dashboard', { headers: getAuthHeaders() })
  } catch (e) {
    console.error('Error loading lead dashboard:', e)
  } finally {
    loading.value = false
  }
}

// Funnel
const funnelStages = computed(() => {
  if (!data.value) return []
  const f = data.value.funnel
  const stages = [
    { label: 'Captured', value: f.captured, icon: 'mdi-magnet', colorClass: 'funnel-primary', width: 100 },
    { label: 'Contacted', value: f.contacted, icon: 'mdi-phone-outgoing', colorClass: 'funnel-info', width: f.captured ? Math.max(30, (f.contacted / f.captured) * 100) : 0 },
    { label: 'Qualified', value: f.qualified, icon: 'mdi-check-circle', colorClass: 'funnel-warning', width: f.captured ? Math.max(20, (f.qualified / f.captured) * 100) : 0 },
    { label: 'Converted', value: f.converted, icon: 'mdi-handshake', colorClass: 'funnel-success', width: f.captured ? Math.max(15, (f.converted / f.captured) * 100) : 0 },
  ]
  for (let i = 0; i < stages.length - 1; i++) {
    (stages[i] as any).dropRate = (stages[i] as any).value > 0 ? Math.round(((stages[i + 1] as any).value / (stages[i] as any).value) * 100) : 0
  }
  return stages
})

// Source cards
const sourceCards = computed(() => {
  if (!data.value) return []
  const s = data.value.sources
  return [
    { label: 'Inquiries', value: s.inquiries, icon: 'mdi-home-search', colorClass: 'src-blue' },
    { label: 'Chat', value: s.chatLeads, icon: 'mdi-chat', colorClass: 'src-purple' },
    { label: 'Estimates', value: s.estimates, icon: 'mdi-calculator', colorClass: 'src-orange' },
    { label: 'Newsletter', value: s.subscribers, icon: 'mdi-email', colorClass: 'src-green' },
    { label: 'CRM', value: s.crmLeads, icon: 'mdi-account-group', colorClass: 'src-red' },
  ]
})

// Source donut chart
const sourceChartOption = computed(() => {
  if (!data.value) return {}
  const s = data.value.sources
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    series: [{
      type: 'pie',
      radius: ['50%', '75%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 3 },
      label: { show: false },
      data: [
        { value: s.inquiries, name: 'Inquiries', itemStyle: { color: '#4285f4' } },
        { value: s.chatLeads, name: 'Chat', itemStyle: { color: '#9c27b0' } },
        { value: s.estimates, name: 'Estimates', itemStyle: { color: '#ff9800' } },
        { value: s.subscribers, name: 'Newsletter', itemStyle: { color: '#43a047' } },
        { value: s.crmLeads, name: 'CRM Direct', itemStyle: { color: '#e53935' } },
      ].filter(d => d.value > 0),
    }],
  }
})

// Trend chart
const trendChartOption = computed(() => {
  if (!data.value) return {}
  const isMonthly = chartPeriod.value === 'monthly'
  const tData = isMonthly ? data.value.trends.monthly : data.value.trends.quarterly
  const cats = tData.map((d: any) => isMonthly ? d.month : d.quarter)

  return {
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    grid: { top: 20, right: 20, bottom: 50, left: 50 },
    xAxis: { type: 'category', data: cats, axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 11 } },
    series: [
      { name: 'Inquiries', type: 'bar', stack: 'total', data: tData.map((d: any) => d.inquiries), itemStyle: { color: '#4285f4' }, barWidth: isMonthly ? 20 : 40 },
      { name: 'Chat', type: 'bar', stack: 'total', data: tData.map((d: any) => d.chatLeads), itemStyle: { color: '#9c27b0' } },
      { name: 'Estimates', type: 'bar', stack: 'total', data: tData.map((d: any) => d.estimates), itemStyle: { color: '#ff9800' } },
      { name: 'Newsletter', type: 'bar', stack: 'total', data: tData.map((d: any) => d.subscribers), itemStyle: { color: '#43a047' } },
      { name: 'Total', type: 'line', data: tData.map((d: any) => d.total), smooth: true, itemStyle: { color: '#1a1a1a' }, lineStyle: { width: 2 }, symbol: 'circle', symbolSize: 6 },
    ],
  }
})

// Table
const tableHeaders = [
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Phone', key: 'phone', sortable: false },
  { title: 'Source', key: 'source', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Date', key: 'createdAt', sortable: true },
  { title: '', key: 'actions', sortable: false, width: 50 },
]

const filteredLeads = computed(() => {
  if (!data.value?.recentLeads) return []
  if (!searchQuery.value) return data.value.recentLeads
  const q = searchQuery.value.toLowerCase()
  return data.value.recentLeads.filter((l: any) =>
    (l.name || '').toLowerCase().includes(q) ||
    (l.email || '').toLowerCase().includes(q) ||
    (l.phone || '').includes(q) ||
    (l.source || '').toLowerCase().includes(q)
  )
})

// Helpers
function formatStatus(s: string) { return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }
function formatDate(d: string) { return new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) }
function getInitials(name: string) { return (name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) }

function getSourceColor(type: string) {
  const m: Record<string, string> = { inquiry: 'blue', chat: 'purple', estimate: 'orange' }
  return m[type] || 'primary'
}
function getSourceIcon(type: string) {
  const m: Record<string, string> = { inquiry: 'mdi-home-search', chat: 'mdi-chat', estimate: 'mdi-calculator' }
  return m[type] || 'mdi-account'
}
function getStatusColor(s: string) {
  const m: Record<string, string> = { new: 'blue', pending: 'orange', responded: 'green', contacted: 'teal', closed: 'grey', converted: 'success' }
  return m[s] || 'grey'
}

function convertToCrm(lead: any) {
  convertTarget.value = lead
  showConvert.value = true
}

async function doConvert() {
  if (!convertTarget.value) return
  converting.value = true
  try {
    await $fetch('/api/admin/crm/clients', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: {
        firstName: (convertTarget.value.name || '').split(' ')[0] || 'Unknown',
        lastName: (convertTarget.value.name || '').split(' ').slice(1).join(' ') || '',
        email: convertTarget.value.email,
        phone: convertTarget.value.phone,
        type: convertType.value,
        source: convertTarget.value.type,
        sourceId: convertTarget.value.id,
      },
    })
    showConvert.value = false
    await loadDashboard()
  } catch (e) {
    console.error('Failed to convert lead:', e)
  } finally {
    converting.value = false
  }
}

onMounted(loadDashboard)

definePageMeta({ layout: 'admin', middleware: ['admin'] })
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;600;700&display=swap');

.admin-leads {
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

/* KPI Cards */
.stat-card-premium {
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

/* Chart cards */
.chart-card {
  border-radius: 24px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  background: white !important;
}

/* Period toggle */
.period-toggle {
  border-radius: 10px !important;
  overflow: hidden;
}
.period-toggle .v-btn { text-transform: none !important; font-weight: 600 !important; }

/* Funnel */
.funnel-container { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 16px 0; }
.funnel-stage { text-align: center; transition: width 0.5s ease; }
.funnel-bar {
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 18px;
  color: white;
  transition: all 0.3s ease;
}
.funnel-bar:hover { transform: scale(1.03); }
.funnel-primary { background: linear-gradient(135deg, #4285f4, #5c9ce6); }
.funnel-info { background: linear-gradient(135deg, #0097a7, #26c6da); }
.funnel-warning { background: linear-gradient(135deg, #f9a825, #ffca28); color: #333; }
.funnel-success { background: linear-gradient(135deg, #2e7d32, #43a047); }
.funnel-label { font-size: 12px; font-weight: 600; color: #666; margin-top: 4px; display: flex; align-items: center; justify-content: center; }
.funnel-arrow { display: flex; align-items: center; gap: 4px; justify-content: center; }
.funnel-rate { font-size: 11px; font-weight: 700; color: #999; }
.funnel-count { text-shadow: 0 1px 2px rgba(0,0,0,0.2); }

/* Source cards */
.source-card {
  flex: 1;
  min-width: 100px;
  padding: 14px 10px;
  border-radius: 14px;
  text-align: center;
  transition: transform 0.2s ease;
}
.source-card:hover { transform: translateY(-3px); }
.source-count { font-size: 22px; font-weight: 800; }
.source-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; }
.src-blue { background: rgba(66,133,244,0.08); color: #4285f4; }
.src-purple { background: rgba(156,39,176,0.08); color: #9c27b0; }
.src-orange { background: rgba(255,152,0,0.08); color: #e65100; }
.src-green { background: rgba(67,160,71,0.08); color: #2e7d32; }
.src-red { background: rgba(229,57,53,0.08); color: #c62828; }

/* Pipeline */
.pipeline-title { font-size: 13px; font-weight: 700; color: #333; display: flex; align-items: center; }
.pipeline-row { display: flex; align-items: center; padding: 6px 0; }
.pipeline-status-dot { width: 8px; height: 8px; border-radius: 50%; margin-right: 10px; flex-shrink: 0; }
.pipeline-status-label { flex: 1; font-size: 13px; color: #555; text-transform: capitalize; }
.pipeline-status-count { font-weight: 700; font-size: 14px; color: #222; }
.dot-new { background: #4285f4; }
.dot-pending { background: #ff9800; }
.dot-responded { background: #43a047; }
.dot-contacted { background: #0097a7; }
.dot-closed { background: #9e9e9e; }
.dot-converted { background: #2e7d32; }
.dot-completed { background: #2e7d32; }
.dot-cancelled { background: #e53935; }

/* Search */
.search-field :deep(.v-field) { border-radius: 12px !important; }

/* Table */
.leads-table { border-radius: 16px !important; }
.leads-table :deep(th) { font-size: 11px !important; text-transform: uppercase !important; letter-spacing: 1px !important; color: #999 !important; }
.leads-table :deep(td) { border-bottom: 1px solid rgba(0,0,0,0.04) !important; }
.leads-table :deep(tr:hover td) { background: #fafaf8 !important; }
</style>
