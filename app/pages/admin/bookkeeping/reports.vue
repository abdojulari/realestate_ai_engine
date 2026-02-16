<template>
  <div class="reports-page px-md-8 py-md-6">
    <v-container fluid>
      <!-- Page Header -->
      <v-row class="mb-8 align-center">
        <v-col cols="12" md="6">
          <div class="d-flex align-center mb-2">
            <v-btn icon="mdi-arrow-left" variant="text" size="small" class="mr-2" to="/admin/bookkeeping" />
            <div class="premium-accent-bar mr-4"></div>
            <span class="text-overline letter-spacing-2 text-gold">Financial Management</span>
          </div>
          <h1 class="display-serif text-h3 mb-1">Profit &amp; Loss</h1>
          <p class="text-subtitle-1 text-medium-emphasis font-weight-light">
            Comprehensive financial performance reports
          </p>
        </v-col>
        <v-col cols="12" md="6" class="d-flex align-center justify-md-end ga-3 flex-wrap">
          <v-btn
            color="#8c734b"
            variant="flat"
            class="premium-btn"
            prepend-icon="mdi-file-delimited"
            :loading="exportingCSV"
            @click="exportReport('csv')"
          >
            Export CSV
          </v-btn>
          <v-btn
            color="#ef5350"
            variant="flat"
            class="premium-btn"
            prepend-icon="mdi-file-pdf-box"
            :loading="exportingPDF"
            @click="exportReport('pdf')"
          >
            Export PDF
          </v-btn>
        </v-col>
      </v-row>

      <!-- Period Selector -->
      <v-card class="analytics-card mb-8" elevation="0">
        <v-card-text class="pa-6">
          <v-row align="center">
            <v-col cols="12" md="3">
              <div class="text-overline text-gold font-weight-bold mb-2">Report Period</div>
              <v-select
                v-model="periodType"
                :items="periodOptions"
                label="Period"
                variant="outlined"
                density="compact"
                hide-details
                class="premium-input"
                @update:model-value="onPeriodChange"
              />
            </v-col>

            <!-- Monthly selectors -->
            <template v-if="periodType === 'monthly'">
              <v-col cols="12" md="3">
                <div class="text-overline text-medium-emphasis font-weight-bold mb-2">Year</div>
                <v-select
                  v-model="selectedYear"
                  :items="yearOptions"
                  label="Year"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="premium-input"
                  @update:model-value="fetchReport"
                />
              </v-col>
              <v-col cols="12" md="3">
                <div class="text-overline text-medium-emphasis font-weight-bold mb-2">Month</div>
                <v-select
                  v-model="selectedMonth"
                  :items="monthOptions"
                  label="Month"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="premium-input"
                  @update:model-value="fetchReport"
                />
              </v-col>
            </template>

            <!-- Quarterly selectors -->
            <template v-if="periodType === 'quarterly'">
              <v-col cols="12" md="3">
                <div class="text-overline text-medium-emphasis font-weight-bold mb-2">Year</div>
                <v-select
                  v-model="selectedYear"
                  :items="yearOptions"
                  label="Year"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="premium-input"
                  @update:model-value="fetchReport"
                />
              </v-col>
              <v-col cols="12" md="3">
                <div class="text-overline text-medium-emphasis font-weight-bold mb-2">Quarter</div>
                <v-select
                  v-model="selectedQuarter"
                  :items="quarterOptions"
                  label="Quarter"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="premium-input"
                  @update:model-value="fetchReport"
                />
              </v-col>
            </template>

            <!-- Mid-Year / Annual selectors -->
            <template v-if="periodType === 'mid_year' || periodType === 'annual'">
              <v-col cols="12" md="3">
                <div class="text-overline text-medium-emphasis font-weight-bold mb-2">Year</div>
                <v-select
                  v-model="selectedYear"
                  :items="yearOptions"
                  label="Year"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="premium-input"
                  @update:model-value="fetchReport"
                />
              </v-col>
            </template>

            <!-- Custom date range -->
            <template v-if="periodType === 'custom'">
              <v-col cols="12" md="3">
                <div class="text-overline text-medium-emphasis font-weight-bold mb-2">Start Date</div>
                <v-text-field
                  v-model="customStart"
                  type="date"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="premium-input"
                  @update:model-value="fetchReport"
                />
              </v-col>
              <v-col cols="12" md="3">
                <div class="text-overline text-medium-emphasis font-weight-bold mb-2">End Date</div>
                <v-text-field
                  v-model="customEnd"
                  type="date"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="premium-input"
                  @update:model-value="fetchReport"
                />
              </v-col>
            </template>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- P&L Report Card -->
      <v-card class="analytics-card mb-8" elevation="0">
        <v-card-title class="d-flex align-center pa-6">
          <v-icon icon="mdi-file-chart" class="mr-2 text-gold" size="small" />
          <span class="display-serif text-h5">Profit &amp; Loss Statement</span>
          <v-spacer />
          <v-chip size="x-small" variant="tonal" class="font-weight-bold">
            {{ report.period || 'Select a period' }}
          </v-chip>
        </v-card-title>
        <v-divider class="opacity-10" />
        <v-card-text class="pa-6">
          <v-skeleton-loader v-if="loading" type="list-item@8" class="rounded-lg" />
          <div v-else>
            <!-- Revenue Section -->
            <div class="pnl-section mb-8">
              <div class="d-flex justify-space-between align-center mb-4">
                <div class="d-flex align-center">
                  <div class="section-indicator section-indicator--green mr-3"></div>
                  <span class="text-h6 font-weight-bold">Revenue</span>
                </div>
                <span class="text-h5 font-weight-bold text-success">{{ fmt(report.revenue.total) }}</span>
              </div>
              <div class="pnl-breakdown pl-8">
                <div
                  v-for="(amount, category) in report.revenue.byCategory"
                  :key="'rev-' + category"
                  class="d-flex justify-space-between align-center py-2 breakdown-row"
                >
                  <span class="text-body-2 text-capitalize text-medium-emphasis">{{ String(category).replace('_', ' ') }}</span>
                  <span class="text-body-2 font-weight-medium">{{ fmt(amount as number) }}</span>
                </div>
                <div class="d-flex justify-space-between align-center py-2 text-caption text-medium-emphasis">
                  <span>{{ report.revenue.count }} revenue entries</span>
                </div>
              </div>
            </div>

            <!-- Expenses Section -->
            <div class="pnl-section mb-8">
              <div class="d-flex justify-space-between align-center mb-4">
                <div class="d-flex align-center">
                  <div class="section-indicator section-indicator--red mr-3"></div>
                  <span class="text-h6 font-weight-bold">Expenses</span>
                </div>
                <span class="text-h5 font-weight-bold text-error">{{ fmt(report.expenses.total) }}</span>
              </div>
              <div class="pnl-breakdown pl-8">
                <div
                  v-for="(amount, category) in report.expenses.byCategory"
                  :key="'exp-' + category"
                  class="d-flex justify-space-between align-center py-2 breakdown-row"
                >
                  <span class="text-body-2 text-capitalize text-medium-emphasis">{{ String(category).replace('_', ' ') }}</span>
                  <span class="text-body-2 font-weight-medium">{{ fmt(amount as number) }}</span>
                </div>
                <div class="d-flex justify-space-between align-center py-2 text-caption text-medium-emphasis">
                  <span>{{ report.expenses.count }} expense entries</span>
                </div>
              </div>
            </div>

            <!-- Payroll Section -->
            <div class="pnl-section mb-8">
              <div class="d-flex justify-space-between align-center mb-4">
                <div class="d-flex align-center">
                  <div class="section-indicator section-indicator--gold mr-3"></div>
                  <span class="text-h6 font-weight-bold">Payroll</span>
                </div>
                <span class="text-h5 font-weight-bold" style="color: #8c734b;">{{ fmt(report.payroll.total) }}</span>
              </div>
              <div class="pl-8 text-caption text-medium-emphasis">
                {{ report.payroll.count }} payroll entries
              </div>
            </div>

            <v-divider class="my-6" />

            <!-- Net Profit -->
            <div class="net-profit-section pa-6 rounded-xl">
              <div class="d-flex justify-space-between align-center">
                <div>
                  <div class="text-overline font-weight-bold mb-1" :class="report.netProfit >= 0 ? 'text-success' : 'text-error'">
                    {{ report.netProfit >= 0 ? 'NET PROFIT' : 'NET LOSS' }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    Profit Margin: <span class="font-weight-bold">{{ report.margin?.toFixed(1) || '0.0' }}%</span>
                  </div>
                </div>
                <div
                  class="text-h3 font-weight-bold display-serif"
                  :class="report.netProfit >= 0 ? 'text-success' : 'text-error'"
                >
                  {{ fmt(report.netProfit) }}
                </div>
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <!-- Revenue vs Expenses Chart -->
      <v-card class="analytics-card mb-8" elevation="0">
        <v-card-title class="d-flex align-center pa-6">
          <v-icon icon="mdi-chart-bar" class="mr-2 text-gold" size="small" />
          <span class="display-serif text-h5">Revenue vs Expenses</span>
        </v-card-title>
        <v-divider class="opacity-10" />
        <v-card-text class="pa-6">
          <v-skeleton-loader v-if="loading" type="image" class="rounded-lg" />
          <div v-else class="chart-container">
            <EChart :option="barChartOption" height="380px" />
          </div>
        </v-card-text>
      </v-card>
    </v-container>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackColor" location="top right" rounded="lg" :timeout="4000">
      <div class="d-flex align-center">
        <v-icon class="mr-2">{{ snackColor === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle' }}</v-icon>
        {{ snackMessage }}
      </div>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import EChart from '~/components/charts/EChart.vue'

definePageMeta({
  layout: 'admin',
  middleware: ['admin']
})

// ─── Auth ────────────────────────────────────────────────────
const getAuthHeaders = (): Record<string, string> => {
  if (process.client) {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }
  return {}
}

// ─── Types ───────────────────────────────────────────────────
interface PnLReport {
  period: string
  revenue: {
    total: number
    byCategory: Record<string, number>
    count: number
  }
  expenses: {
    total: number
    byCategory: Record<string, number>
    count: number
  }
  payroll: {
    total: number
    count: number
  }
  netProfit: number
  margin: number
}

// ─── Helpers ─────────────────────────────────────────────────
const fmt = (n: number) => '$' + (n || 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ─── Period Options ──────────────────────────────────────────
const periodOptions = [
  { title: 'Monthly', value: 'monthly' },
  { title: 'Quarterly', value: 'quarterly' },
  { title: 'Mid-Year', value: 'mid_year' },
  { title: 'Annual', value: 'annual' },
  { title: 'Custom', value: 'custom' }
]

const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1
const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i)

const monthOptions = [
  { title: 'January', value: 1 },
  { title: 'February', value: 2 },
  { title: 'March', value: 3 },
  { title: 'April', value: 4 },
  { title: 'May', value: 5 },
  { title: 'June', value: 6 },
  { title: 'July', value: 7 },
  { title: 'August', value: 8 },
  { title: 'September', value: 9 },
  { title: 'October', value: 10 },
  { title: 'November', value: 11 },
  { title: 'December', value: 12 }
]

const quarterOptions = [
  { title: 'Q1 (Jan – Mar)', value: 1 },
  { title: 'Q2 (Apr – Jun)', value: 2 },
  { title: 'Q3 (Jul – Sep)', value: 3 },
  { title: 'Q4 (Oct – Dec)', value: 4 }
]

// ─── State ───────────────────────────────────────────────────
const loading = ref(true)
const exportingCSV = ref(false)
const exportingPDF = ref(false)
const snackbar = ref(false)
const snackMessage = ref('')
const snackColor = ref<'success' | 'error'>('success')

const periodType = ref('monthly')
const selectedYear = ref(currentYear)
const selectedMonth = ref(currentMonth)
const selectedQuarter = ref(Math.ceil(currentMonth / 3))
const customStart = ref('')
const customEnd = ref('')

const report = ref<PnLReport>({
  period: '',
  revenue: { total: 0, byCategory: {}, count: 0 },
  expenses: { total: 0, byCategory: {}, count: 0 },
  payroll: { total: 0, count: 0 },
  netProfit: 0,
  margin: 0
})

// ─── Notifications ───────────────────────────────────────────
const notify = (message: string, color: 'success' | 'error' = 'success') => {
  snackMessage.value = message
  snackColor.value = color
  snackbar.value = true
}

// ─── Bar Chart ───────────────────────────────────────────────
const barChartOption = computed(() => {
  const revCategories = Object.keys(report.value.revenue.byCategory || {})
  const expCategories = Object.keys(report.value.expenses.byCategory || {})
  const allCategories = [...new Set([...revCategories, ...expCategories])].map(c => c.replace('_', ' '))

  const revData = allCategories.map(c => {
    const key = c.replace(' ', '_')
    return report.value.revenue.byCategory[key] || 0
  })

  const expData = allCategories.map(c => {
    const key = c.replace(' ', '_')
    return report.value.expenses.byCategory[key] || 0
  })

  if (!allCategories.length) {
    return {
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: ['Revenue', 'Expenses', 'Payroll'] },
      yAxis: { type: 'value' },
      series: [{
        type: 'bar',
        data: [
          { value: report.value.revenue.total, itemStyle: { color: '#43a047', borderRadius: [6, 6, 0, 0] } },
          { value: report.value.expenses.total, itemStyle: { color: '#ef5350', borderRadius: [6, 6, 0, 0] } },
          { value: report.value.payroll.total, itemStyle: { color: '#8c734b', borderRadius: [6, 6, 0, 0] } }
        ],
        barWidth: '40%'
      }]
    }
  }

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#eee',
      borderWidth: 1,
      textStyle: { color: '#333', fontSize: 12 }
    },
    legend: {
      data: ['Revenue', 'Expenses'],
      bottom: 0,
      textStyle: { fontSize: 11 }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '14%',
      top: '8%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: allCategories.map(c => c.charAt(0).toUpperCase() + c.slice(1)),
      axisLine: { lineStyle: { color: '#e8e8e8' } },
      axisLabel: { color: '#888', fontSize: 11, rotate: 30 }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { type: 'dashed', color: '#f0f0f0' } },
      axisLabel: {
        color: '#888',
        fontSize: 11,
        formatter: (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
      }
    },
    series: [
      {
        name: 'Revenue',
        type: 'bar',
        data: revData,
        barWidth: '30%',
        itemStyle: { borderRadius: [4, 4, 0, 0], color: '#43a047' }
      },
      {
        name: 'Expenses',
        type: 'bar',
        data: expData,
        barWidth: '30%',
        itemStyle: { borderRadius: [4, 4, 0, 0], color: '#ef5350' }
      }
    ]
  }
})

// ─── Period Change ───────────────────────────────────────────
const onPeriodChange = () => {
  fetchReport()
}

// ─── API ─────────────────────────────────────────────────────
const fetchReport = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams({ period: periodType.value })

    switch (periodType.value) {
      case 'monthly':
        params.append('year', String(selectedYear.value))
        params.append('month', String(selectedMonth.value))
        break
      case 'quarterly':
        params.append('year', String(selectedYear.value))
        params.append('quarter', String(selectedQuarter.value))
        break
      case 'mid_year':
      case 'annual':
        params.append('year', String(selectedYear.value))
        break
      case 'custom':
        if (customStart.value) params.append('startDate', customStart.value)
        if (customEnd.value) params.append('endDate', customEnd.value)
        break
    }

    const data = await $fetch<{ report: PnLReport }>(
      `/api/admin/bookkeeping/reports?${params.toString()}`,
      { headers: getAuthHeaders() }
    )
    report.value = data.report || report.value
  } catch (err: any) {
    console.error('Error fetching report:', err)
    notify(err?.data?.statusMessage || 'Failed to load report', 'error')
  } finally {
    loading.value = false
  }
}

const exportReport = async (type: 'csv' | 'pdf') => {
  if (type === 'csv') exportingCSV.value = true
  else exportingPDF.value = true

  try {
    const params = new URLSearchParams({ type: 'pnl', format: type, period: periodType.value })

    switch (periodType.value) {
      case 'monthly':
        params.append('year', String(selectedYear.value))
        params.append('month', String(selectedMonth.value))
        break
      case 'quarterly':
        params.append('year', String(selectedYear.value))
        params.append('quarter', String(selectedQuarter.value))
        break
      case 'mid_year':
      case 'annual':
        params.append('year', String(selectedYear.value))
        break
      case 'custom':
        if (customStart.value) params.append('startDate', customStart.value)
        if (customEnd.value) params.append('endDate', customEnd.value)
        break
    }

    const response = await fetch(`/api/admin/bookkeeping/export?${params.toString()}`, {
      headers: getAuthHeaders()
    })

    if (!response.ok) throw new Error('Export failed')

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pnl-report-${periodType.value}-${new Date().toISOString().split('T')[0]}.${type === 'csv' ? 'csv' : 'pdf'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    notify('Report exported successfully')
  } catch (err: any) {
    console.error('Error exporting report:', err)
    notify('Failed to export report', 'error')
  } finally {
    exportingCSV.value = false
    exportingPDF.value = false
  }
}

// ─── Lifecycle ───────────────────────────────────────────────
onMounted(() => {
  fetchReport()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;600;700;800&display=swap');

.reports-page {
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

.letter-spacing-2 {
  letter-spacing: 2px;
}

.letter-spacing-tight {
  letter-spacing: -1px;
}

.premium-accent-bar {
  width: 40px;
  height: 4px;
  background: #8c734b;
  border-radius: 2px;
}

/* Cards */
.analytics-card {
  border-radius: 24px !important;
  background: white !important;
  border: 1px solid rgba(0, 0, 0, 0.05) !important;
}

/* Chart */
.chart-container {
  padding: 8px;
  background: #fcfcfb;
  border-radius: 16px;
  border: 1px solid #f1f1ee;
}

/* P&L Section Indicators */
.section-indicator {
  width: 4px;
  height: 28px;
  border-radius: 2px;
}

.section-indicator--green {
  background: #43a047;
}

.section-indicator--red {
  background: #ef5350;
}

.section-indicator--gold {
  background: #8c734b;
}

/* Breakdown Rows */
.breakdown-row {
  border-bottom: 1px solid rgba(0, 0, 0, 0.03);
}

.breakdown-row:last-child {
  border-bottom: none;
}

/* Net Profit Section */
.net-profit-section {
  background: linear-gradient(135deg, rgba(140, 115, 75, 0.04) 0%, rgba(255, 255, 255, 0) 100%);
  border: 1px solid rgba(140, 115, 75, 0.12);
}

/* Buttons */
.premium-btn {
  border-radius: 12px !important;
  text-transform: none !important;
  font-weight: 700 !important;
  letter-spacing: 0.3px !important;
}

/* Input */
.premium-input :deep(.v-field) {
  border-radius: 12px;
}

/* Table (for potential future use) */
.premium-table :deep(th) {
  background: #fafaf9 !important;
  font-size: 0.7rem !important;
  font-weight: 700 !important;
  letter-spacing: 1px !important;
  text-transform: uppercase !important;
  color: #999 !important;
}

@media (max-width: 960px) {
  .reports-page {
    padding: 12px !important;
  }

  .text-h3 {
    font-size: 1.6rem !important;
  }

  .text-h3.display-serif {
    font-size: 1.8rem !important;
  }
}
</style>
