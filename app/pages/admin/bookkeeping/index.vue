<template>
  <FeatureGate :feature="FEATURES.BOOKKEEPING" :show-upgrade-prompt="true">
  <div class="bookkeeping-dashboard px-md-8 py-md-6">
    <v-container fluid>
      <!-- Page Header -->
      <v-row class="mb-10 align-center">
        <v-col cols="12" md="7">
          <div class="d-flex align-center mb-2">
            <v-btn icon="mdi-arrow-left" variant="text" size="small" class="mr-2" to="/admin" />
            <div class="premium-accent-bar mr-4"></div>
            <span class="text-overline letter-spacing-2 text-gold">Financial Management</span>
          </div>
          <h1 class="display-serif text-h3 mb-1">Book Keeping</h1>
          <p class="text-subtitle-1 text-medium-emphasis font-weight-light">
            Track revenue, expenses, payroll, and financial health at a glance
          </p>
        </v-col>
        <v-col cols="12" md="5" class="d-flex align-center justify-md-end ga-3 flex-wrap">
          <v-select
            v-model="selectedYear"
            :items="yearOptions"
            label="Fiscal Year"
            variant="outlined"
            density="compact"
            hide-details
            style="max-width: 160px;"
            class="premium-input"
            prepend-inner-icon="mdi-calendar"
            @update:model-value="fetchDashboard"
          />
          <div class="timestamp-box d-none d-md-inline-flex">
            <v-icon icon="mdi-finance" size="small" class="mr-2" />
            <span class="text-caption font-weight-bold">{{ selectedYear }} Overview</span>
          </div>
        </v-col>
      </v-row>

      <!-- Financial Summary Cards -->
      <v-row class="mb-10">
        <v-col
          v-for="(card, idx) in summaryCards"
          :key="idx"
          cols="12"
          sm="6"
          md="3"
          class="d-flex"
        >
          <v-skeleton-loader v-if="loading" type="card" class="w-100 rounded-xl" />
          <v-card v-else class="stat-card-premium w-100" elevation="0">
            <v-card-text class="d-flex flex-column h-100">
              <div class="d-flex justify-space-between align-start mb-4">
                <div :class="['icon-orb', card.orb]">
                  <v-icon :icon="card.icon" />
                </div>
                <v-chip
                  size="x-small"
                  :color="card.chipColor"
                  variant="flat"
                  class="font-weight-bold"
                >
                  {{ card.count }} {{ card.countLabel }}
                </v-chip>
              </div>
              <div class="mt-auto">
                <div class="text-h4 font-weight-bold mb-1 letter-spacing-tight">
                  {{ formatCurrency(card.amount) }}
                </div>
                <div class="text-overline text-medium-emphasis lh-1 mb-1">{{ card.label }}</div>
                <div class="text-caption opacity-60">{{ card.sub }}</div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Quick Actions -->
      <v-row class="mb-10">
        <v-col cols="12">
          <v-card class="action-card-premium" elevation="0">
            <v-card-title class="text-overline letter-spacing-1 pt-6 px-8">
              Quick Actions
            </v-card-title>
            <v-card-text class="pa-8 pt-2">
              <v-row>
                <v-col
                  v-for="action in quickActions"
                  :key="action.title"
                  cols="6"
                  sm="4"
                  md="2"
                >
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

      <!-- Revenue vs Expenses Chart + Top Expense Categories -->
      <v-row class="mb-10">
        <v-col cols="12" lg="8" class="d-flex">
          <v-card class="analytics-card w-100" elevation="0">
            <v-card-title class="d-flex align-center pa-6">
              <v-icon icon="mdi-chart-bar" class="mr-2 text-gold" size="small" />
              <span class="display-serif text-h5">Revenue vs Expenses</span>
              <v-spacer />
              <v-chip size="x-small" variant="tonal" class="font-weight-bold">{{ selectedYear }}</v-chip>
            </v-card-title>
            <v-divider class="opacity-10" />
            <v-card-text class="pa-6">
              <v-skeleton-loader v-if="loading" type="image" class="rounded-lg" />
              <div v-else class="chart-container-premium">
                <EChart :option="revenueExpenseChartOption" height="360px" />
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" lg="4" class="d-flex">
          <v-card class="analytics-card w-100" elevation="0">
            <v-card-title class="d-flex align-center pa-6">
              <v-icon icon="mdi-shape" class="mr-2 text-gold" size="small" />
              <span class="display-serif text-h5">Top Expenses</span>
            </v-card-title>
            <v-divider class="opacity-10" />
            <v-card-text class="pa-6">
              <v-skeleton-loader v-if="loading" type="list-item@5" class="rounded-lg" />
              <div v-else>
                <div
                  v-for="(cat, idx) in dashboard.topExpenseCategories"
                  :key="cat.category"
                  class="category-row mb-4"
                >
                  <div class="d-flex justify-space-between align-center mb-1">
                    <div class="d-flex align-center">
                      <div class="category-rank mr-3">{{ idx + 1 }}</div>
                      <span class="text-body-2 font-weight-medium text-capitalize">{{ cat.category }}</span>
                    </div>
                    <span class="text-body-2 font-weight-bold">{{ formatCurrency(cat.total) }}</span>
                  </div>
                  <v-progress-linear
                    :model-value="maxExpenseCategory > 0 ? (cat.total / maxExpenseCategory) * 100 : 0"
                    color="#ef5350"
                    bg-color="rgba(239,83,80,0.1)"
                    height="6"
                    rounded
                  />
                </div>
                <div
                  v-if="!dashboard.topExpenseCategories?.length"
                  class="text-center py-8 text-medium-emphasis"
                >
                  <v-icon icon="mdi-chart-box-outline" size="40" class="mb-2 opacity-40" />
                  <div class="text-caption">No expense data yet</div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Top Revenue Categories + Recent Transactions -->
      <v-row class="mb-10">
        <v-col cols="12" lg="4" class="d-flex">
          <v-card class="analytics-card w-100" elevation="0">
            <v-card-title class="d-flex align-center pa-6">
              <v-icon icon="mdi-trending-up" class="mr-2 text-gold" size="small" />
              <span class="display-serif text-h5">Top Revenue</span>
            </v-card-title>
            <v-divider class="opacity-10" />
            <v-card-text class="pa-6">
              <v-skeleton-loader v-if="loading" type="list-item@5" class="rounded-lg" />
              <div v-else>
                <div
                  v-for="(cat, idx) in dashboard.topRevenueCategories"
                  :key="cat.category"
                  class="category-row mb-4"
                >
                  <div class="d-flex justify-space-between align-center mb-1">
                    <div class="d-flex align-center">
                      <div class="category-rank category-rank--green mr-3">{{ idx + 1 }}</div>
                      <span class="text-body-2 font-weight-medium text-capitalize">{{ cat.category }}</span>
                    </div>
                    <span class="text-body-2 font-weight-bold">{{ formatCurrency(cat.total) }}</span>
                  </div>
                  <v-progress-linear
                    :model-value="maxRevenueCategory > 0 ? (cat.total / maxRevenueCategory) * 100 : 0"
                    color="#43a047"
                    bg-color="rgba(67,160,71,0.1)"
                    height="6"
                    rounded
                  />
                </div>
                <div
                  v-if="!dashboard.topRevenueCategories?.length"
                  class="text-center py-8 text-medium-emphasis"
                >
                  <v-icon icon="mdi-chart-box-outline" size="40" class="mb-2 opacity-40" />
                  <div class="text-caption">No revenue data yet</div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" lg="8" class="d-flex">
          <v-card class="analytics-card w-100 d-flex flex-column" elevation="0">
            <v-card-title class="d-flex align-center pa-6">
              <v-icon icon="mdi-swap-horizontal" class="mr-2 text-gold" size="small" />
              <span class="display-serif text-h5">Recent Transactions</span>
              <v-spacer />
              <v-chip size="x-small" variant="tonal" class="font-weight-bold">
                Last 10
              </v-chip>
            </v-card-title>
            <v-divider class="opacity-10" />
            <v-card-text class="pa-0 flex-grow-1 overflow-auto" style="max-height: 440px;">
              <v-skeleton-loader v-if="loading" type="list-item-two-line@5" class="rounded-lg" />
              <v-list v-else bg-color="transparent" class="py-2">
                <v-list-item
                  v-for="tx in recentTransactions"
                  :key="tx.id"
                  class="px-6 py-3 list-item-hover"
                >
                  <template #prepend>
                    <div
                      :class="[
                        'tx-icon-orb mr-4',
                        tx.type === 'revenue' ? 'tx-icon-orb--green' : tx.type === 'payroll' ? 'tx-icon-orb--orange' : 'tx-icon-orb--red'
                      ]"
                    >
                      <v-icon
                        :icon="tx.type === 'revenue' ? 'mdi-arrow-down-bold' : tx.type === 'payroll' ? 'mdi-account-cash' : 'mdi-arrow-up-bold'"
                        size="small"
                      />
                    </div>
                  </template>

                  <v-list-item-title class="font-weight-bold text-body-2">
                    {{ tx.description }}
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-caption text-medium-emphasis">
                    {{ tx.category }} &middot; {{ formatDateShort(tx.date) }}
                  </v-list-item-subtitle>

                  <template #append>
                    <span
                      :class="[
                        'text-body-2 font-weight-bold',
                        tx.type === 'revenue' ? 'text-success' : 'text-error'
                      ]"
                    >
                      {{ tx.type === 'revenue' ? '+' : '-' }}{{ formatCurrency(Math.abs(tx.amount)) }}
                    </span>
                  </template>
                </v-list-item>

                <v-list-item v-if="!recentTransactions.length" class="text-center py-10">
                  <div class="w-100 text-center text-medium-emphasis">
                    <v-icon icon="mdi-receipt-text-outline" size="40" class="mb-2 opacity-40" />
                    <div class="text-caption">No recent transactions</div>
                  </div>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Error Snackbar -->
    <v-snackbar v-model="snackbar" color="error" location="top right" rounded="lg" :timeout="4000">
      <div class="d-flex align-center">
        <v-icon class="mr-2">mdi-alert-circle</v-icon>
        {{ errorMessage }}
      </div>
    </v-snackbar>
  </div>
  </FeatureGate>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import FeatureGate from '~/components/FeatureGate.vue'
import { FEATURES } from '~/composables/useLicense'
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
interface CategoryTotal {
  category: string
  total: number
}

interface MonthlyTrend {
  month: string
  revenue: number
  expenses: number
  payroll: number
  net: number
}

interface DashboardData {
  totalRevenue: number
  totalExpenses: number
  totalPayroll: number
  netProfit: number
  revenueCount: number
  expenseCount: number
  payrollCount: number
  topExpenseCategories: CategoryTotal[]
  topRevenueCategories: CategoryTotal[]
  monthlyTrend: MonthlyTrend[]
}

// ─── State ───────────────────────────────────────────────────
const currentYear = new Date().getFullYear()
const selectedYear = ref(currentYear)
const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i)

const loading = ref(true)
const snackbar = ref(false)
const errorMessage = ref('')

const dashboard = ref<DashboardData>({
  totalRevenue: 0,
  totalExpenses: 0,
  totalPayroll: 0,
  netProfit: 0,
  revenueCount: 0,
  expenseCount: 0,
  payrollCount: 0,
  topExpenseCategories: [],
  topRevenueCategories: [],
  monthlyTrend: []
})

const recentTransactions = ref<any[]>([])

// ─── Helpers ─────────────────────────────────────────────────
const formatCurrency = (value: number): string => {
  if (value == null) return '$0.00'
  const abs = Math.abs(value)
  const formatted = abs.toLocaleString('en-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  return value < 0 ? `-$${formatted}` : `$${formatted}`
}

const formatDateShort = (date: string): string => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

// ─── Summary Cards ───────────────────────────────────────────
const summaryCards = computed(() => [
  {
    label: 'Total Revenue',
    amount: dashboard.value.totalRevenue,
    icon: 'mdi-trending-up',
    orb: 'success-orb',
    chipColor: 'success',
    count: dashboard.value.revenueCount,
    countLabel: 'entries',
    sub: `Fiscal year ${selectedYear.value}`
  },
  {
    label: 'Total Expenses',
    amount: dashboard.value.totalExpenses,
    icon: 'mdi-trending-down',
    orb: 'error-orb',
    chipColor: 'error',
    count: dashboard.value.expenseCount,
    countLabel: 'entries',
    sub: `Fiscal year ${selectedYear.value}`
  },
  {
    label: 'Net Profit',
    amount: dashboard.value.netProfit,
    icon: 'mdi-chart-line',
    orb: 'info-orb',
    chipColor: dashboard.value.netProfit >= 0 ? 'success' : 'error',
    count: dashboard.value.netProfit >= 0 ? 'Positive' : 'Negative',
    countLabel: '',
    sub: 'Revenue minus all costs'
  },
  {
    label: 'Total Payroll',
    amount: dashboard.value.totalPayroll,
    icon: 'mdi-account-group',
    orb: 'gold-orb',
    chipColor: 'warning',
    count: dashboard.value.payrollCount,
    countLabel: 'entries',
    sub: `Salaries & benefits`
  }
])

// ─── Quick Actions ───────────────────────────────────────────
const quickActions = [
  { title: 'Add Expense', icon: 'mdi-receipt-text-plus', color: 'error', to: '/admin/bookkeeping/expenses' },
  { title: 'Scan Receipt', icon: 'mdi-camera', color: 'warning', to: '/admin/bookkeeping/expenses?scan=true' },
  { title: 'Add Revenue', icon: 'mdi-cash-plus', color: 'success', to: '/admin/bookkeeping/revenue' },
  { title: 'Payroll', icon: 'mdi-account-cash', color: 'orange', to: '/admin/bookkeeping/payroll' },
  { title: 'Tax Calc', icon: 'mdi-calculator', color: 'info', to: '/admin/bookkeeping/tax' },
  { title: 'Reports', icon: 'mdi-file-export', color: 'primary', to: '/admin/bookkeeping/reports' }
]

// ─── Top Categories Helpers ──────────────────────────────────
const maxExpenseCategory = computed(() => {
  const cats = dashboard.value.topExpenseCategories || []
  return cats.length ? Math.max(...cats.map(c => c.total)) : 0
})

const maxRevenueCategory = computed(() => {
  const cats = dashboard.value.topRevenueCategories || []
  return cats.length ? Math.max(...cats.map(c => c.total)) : 0
})

// ─── Revenue vs Expenses Chart ───────────────────────────────
const revenueExpenseChartOption = computed(() => {
  const trend = dashboard.value.monthlyTrend || []
  const months = trend.map(m => m.month)
  const revenue = trend.map(m => m.revenue)
  const expenses = trend.map(m => m.expenses)
  const net = trend.map(m => m.net)

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross', crossStyle: { color: '#999' } },
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#eee',
      borderWidth: 1,
      textStyle: { color: '#333', fontSize: 12 },
      formatter(params: any[]) {
        let tip = `<div style="font-weight:700;margin-bottom:6px">${params[0].axisValue}</div>`
        params.forEach((p: any) => {
          const color = p.color
          const val = Number(p.value).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          tip += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
            <span style="width:10px;height:10px;border-radius:2px;background:${color};display:inline-block"></span>
            ${p.seriesName}: <b>$${val}</b>
          </div>`
        })
        return tip
      }
    },
    legend: {
      data: ['Revenue', 'Expenses', 'Net Profit'],
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
      data: months,
      axisLine: { lineStyle: { color: '#e8e8e8' } },
      axisLabel: { color: '#888', fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { type: 'dashed', color: '#f0f0f0' } },
      axisLabel: {
        color: '#888',
        fontSize: 11,
        formatter: (v: number) => {
          if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`
          return `$${v}`
        }
      }
    },
    series: [
      {
        name: 'Revenue',
        type: 'bar',
        data: revenue,
        barWidth: '28%',
        itemStyle: { borderRadius: [4, 4, 0, 0], color: '#43a047' }
      },
      {
        name: 'Expenses',
        type: 'bar',
        data: expenses,
        barWidth: '28%',
        itemStyle: { borderRadius: [4, 4, 0, 0], color: '#ef5350' }
      },
      {
        name: 'Net Profit',
        type: 'line',
        data: net,
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        lineStyle: { width: 3, color: '#1565c0' },
        itemStyle: { color: '#1565c0' },
        areaStyle: { color: 'rgba(21, 101, 192, 0.06)' }
      }
    ]
  }
})

// ─── Data Fetching ───────────────────────────────────────────
const fetchDashboard = async () => {
  loading.value = true
  try {
    const data = await $fetch<DashboardData>(
      `/api/admin/bookkeeping/dashboard?year=${selectedYear.value}`,
      { headers: getAuthHeaders() }
    )

    dashboard.value = {
      totalRevenue: data.totalRevenue ?? 0,
      totalExpenses: data.totalExpenses ?? 0,
      totalPayroll: data.totalPayroll ?? 0,
      netProfit: data.netProfit ?? 0,
      revenueCount: data.revenueCount ?? 0,
      expenseCount: data.expenseCount ?? 0,
      payrollCount: data.payrollCount ?? 0,
      topExpenseCategories: data.topExpenseCategories ?? [],
      topRevenueCategories: data.topRevenueCategories ?? [],
      monthlyTrend: data.monthlyTrend ?? []
    }

    await fetchRecentTransactions()
  } catch (err: any) {
    console.error('Error loading bookkeeping dashboard:', err)
    errorMessage.value = err?.data?.statusMessage || 'Failed to load dashboard data'
    snackbar.value = true
  } finally {
    loading.value = false
  }
}

const fetchRecentTransactions = async () => {
  try {
    const data = await $fetch<any[]>(
      `/api/admin/bookkeeping/transactions/recent?year=${selectedYear.value}&limit=10`,
      { headers: getAuthHeaders() }
    )
    recentTransactions.value = data || []
  } catch {
    recentTransactions.value = []
  }
}

// ─── Lifecycle ───────────────────────────────────────────────
onMounted(() => {
  fetchDashboard()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;600;700;800&display=swap');

.bookkeeping-dashboard {
  background-color: #fcfcfb;
  font-family: 'Inter', sans-serif;
  min-height: 100vh;
}

/* ── Typography ──────────────────────────────────────────── */
.display-serif {
  font-family: 'Playfair Display', serif;
}

.text-gold {
  color: #8c734b;
}

.letter-spacing-2 {
  letter-spacing: 2px;
}

.letter-spacing-1 {
  letter-spacing: 1px;
}

.letter-spacing-tight {
  letter-spacing: -1px;
}

.lh-1 {
  line-height: 1;
}

/* ── Premium Accent ──────────────────────────────────────── */
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

/* ── Stat Cards ──────────────────────────────────────────── */
.stat-card-premium {
  border-radius: 20px !important;
  border: 1px solid rgba(0, 0, 0, 0.05) !important;
  background: white !important;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275),
    border-color 0.3s ease;
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

.success-orb {
  background: rgba(67, 160, 71, 0.1);
  color: #43a047;
}

.error-orb {
  background: rgba(239, 83, 80, 0.1);
  color: #ef5350;
}

.info-orb {
  background: rgba(21, 101, 192, 0.1);
  color: #1565c0;
}

.gold-orb {
  background: rgba(140, 115, 75, 0.1);
  color: #8c734b;
}

/* ── Quick Actions Card ──────────────────────────────────── */
.action-card-premium {
  border-radius: 24px !important;
}

.premium-action-btn {
  border-radius: 12px !important;
  text-transform: none !important;
  font-weight: 700 !important;
  letter-spacing: 0.5px !important;
  font-size: 0.8rem !important;
}

/* ── Analytics Cards ─────────────────────────────────────── */
.analytics-card {
  border-radius: 24px !important;
  background: white !important;
  border: 1px solid rgba(0, 0, 0, 0.05) !important;
}

.chart-container-premium {
  padding: 8px;
  background: #fcfcfb;
  border-radius: 16px;
  border: 1px solid #f1f1ee;
}

/* ── Category Rows ───────────────────────────────────────── */
.category-rank {
  width: 24px;
  height: 24px;
  border-radius: 8px;
  background: rgba(239, 83, 80, 0.1);
  color: #ef5350;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 800;
  flex-shrink: 0;
}

.category-rank--green {
  background: rgba(67, 160, 71, 0.1);
  color: #43a047;
}

/* ── Transaction List ────────────────────────────────────── */
.list-item-hover:hover {
  background-color: #fcfcfb;
}

.tx-icon-orb {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tx-icon-orb--green {
  background: rgba(67, 160, 71, 0.1);
  color: #43a047;
}

.tx-icon-orb--red {
  background: rgba(239, 83, 80, 0.1);
  color: #ef5350;
}

.tx-icon-orb--orange {
  background: rgba(140, 115, 75, 0.1);
  color: #8c734b;
}

/* ── Input Overrides ─────────────────────────────────────── */
.premium-input :deep(.v-field) {
  border-radius: 12px;
}

/* ── Responsive ──────────────────────────────────────────── */
@media (max-width: 960px) {
  .bookkeeping-dashboard {
    padding: 12px !important;
  }

  .text-h3 {
    font-size: 1.6rem !important;
  }

  .text-h4 {
    font-size: 1.3rem !important;
  }
}
</style>
