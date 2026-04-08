<template>
  <div class="admin-dashboard-premium px-md-8 py-md-6">
    <v-container fluid>
      <!-- Hero -->
      <v-row class="mb-8">
        <v-col cols="12">
          <v-card class="hero-premium overflow-hidden" elevation="0" rounded="xl">
            <div class="hero-premium__grid">
              <div class="hero-premium__copy pa-8 pa-md-10">
                <div class="d-flex align-center mb-3">
                  <div class="premium-accent-bar mr-4" />
                  <span class="text-overline letter-spacing-2 text-gold">Management console</span>
                </div>
                <h1 class="display-serif text-h3 text-md-h2 mb-2">Command center</h1>
                <p class="text-body-1 text-medium-emphasis font-weight-light mb-6 mb-md-0 max-width-copy">
                  Real-time oversight, AI-assisted signals, and market-style momentum for your brokerage stack.
                </p>
                <div class="d-flex flex-wrap ga-3 mt-4">
                  <v-chip color="primary" variant="flat" prepend-icon="mdi-brain" class="font-weight-bold">
                    Intelligence layer
                  </v-chip>
                  <v-chip variant="outlined" prepend-icon="mdi-chart-areaspline" class="font-weight-medium">
                    7-day velocity
                  </v-chip>
                </div>
              </div>
              <div class="hero-premium__viz pa-6 pa-md-10 d-flex align-center justify-center">
                <svg class="hero-svg" viewBox="0 0 400 240" aria-hidden="true">
                  <defs>
                    <linearGradient id="heroLine" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stop-color="#8c734b" stop-opacity="0.3" />
                      <stop offset="50%" stop-color="#8c734b" stop-opacity="1" />
                      <stop offset="100%" stop-color="#c9a66b" stop-opacity="0.9" />
                    </linearGradient>
                    <linearGradient id="heroArea" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stop-color="#8c734b" stop-opacity="0.35" />
                      <stop offset="100%" stop-color="#8c734b" stop-opacity="0" />
                    </linearGradient>
                    <radialGradient id="heroGlow" cx="50%" cy="40%" r="60%">
                      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.25" />
                      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
                    </radialGradient>
                  </defs>
                  <rect width="400" height="240" fill="url(#heroGlow)" />
                  <path
                    d="M24 180 C 80 140, 120 200, 180 120 S 300 60, 376 88"
                    fill="none"
                    stroke="url(#heroLine)"
                    stroke-width="4"
                    stroke-linecap="round"
                  />
                  <path
                    d="M24 180 C 80 140, 120 200, 180 120 S 300 60, 376 88 L 376 220 L 24 220 Z"
                    fill="url(#heroArea)"
                  />
                  <g class="hero-nodes">
                    <circle cx="92" cy="158" r="5" fill="#fff" stroke="#8c734b" stroke-width="2" />
                    <circle cx="180" cy="120" r="6" fill="#8c734b" />
                    <circle cx="268" cy="82" r="5" fill="#fff" stroke="#8c734b" stroke-width="2" />
                    <circle cx="340" cy="96" r="7" fill="#121212" />
                  </g>
                  <g opacity="0.55" stroke="#121212" stroke-width="1.2">
                    <line x1="92" y1="158" x2="180" y2="120" />
                    <line x1="180" y1="120" x2="268" y2="82" />
                    <line x1="268" y1="82" x2="340" y2="96" />
                  </g>
                </svg>
              </div>
            </div>
            <div class="hero-premium__footer px-8 py-3 d-flex flex-wrap align-center justify-space-between">
              <div class="d-flex align-center text-caption text-medium-emphasis">
                <v-icon icon="mdi-shield-check-outline" size="small" class="mr-2 text-gold" />
                Tenant-scoped metrics · encrypted sessions
              </div>
              <div class="timestamp-box timestamp-box--ghost">
                <v-icon icon="mdi-clock-outline" size="small" class="mr-2" />
                <span class="text-caption font-weight-bold">System status: optimal</span>
              </div>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Stats -->
      <v-row class="mb-10 flex-row">
        <v-col
          v-for="(card, index) in statCards"
          :key="index"
          cols="12"
          sm="6"
          md="3"
          class="d-flex"
        >
          <v-card class="stat-card-premium w-100" elevation="0">
            <v-card-text class="d-flex flex-column h-100">
              <div class="d-flex justify-space-between align-start mb-4">
                <div :class="['icon-orb', card.orb]">
                  <v-icon :icon="card.icon" />
                </div>
                <div
                  v-if="card.growth"
                  :class="[
                    'text-caption font-weight-bold growth-chip',
                    stats.userGrowth >= 0 ? 'growth-chip--up' : 'growth-chip--down',
                  ]"
                >
                  <v-icon size="x-small">
                    {{ stats.userGrowth >= 0 ? 'mdi-trending-up' : 'mdi-trending-down' }}
                  </v-icon>
                  {{ stats.userGrowth >= 0 ? '+' : '' }}{{ stats.userGrowth }}% MoM
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

      <!-- Market intelligence: insights + charts -->
      <v-row class="mb-10">
        <v-col cols="12" lg="4" class="d-flex">
          <v-card class="insights-panel w-100 d-flex flex-column" elevation="0" rounded="xl">
            <v-card-title class="pa-6 pb-2">
              <span class="display-serif text-h5">Market insights</span>
              <div class="text-caption text-medium-emphasis font-weight-regular mt-1">
                Curated from your live inventory, leads, and listing engagement.
              </div>
            </v-card-title>
            <v-card-text class="pa-6 pt-2 flex-grow-1 d-flex flex-column ga-3">
              <div
                v-for="(item, i) in insightsDisplay"
                :key="i"
                :class="['insight-tile', `insight-tile--${item.variant}`]"
              >
                <div class="d-flex align-start ga-3">
                  <v-avatar :class="['insight-avatar', `insight-avatar--${item.variant}`]" size="40" rounded="lg">
                    <v-icon :icon="item.icon" size="small" />
                  </v-avatar>
                  <div>
                    <div class="text-subtitle-2 font-weight-bold mb-1">{{ item.title }}</div>
                    <p class="text-body-2 text-medium-emphasis mb-0 insight-body">{{ item.body }}</p>
                  </div>
                </div>
              </div>
              <v-alert
                v-if="!insightsDisplay.length"
                type="info"
                variant="tonal"
                density="comfortable"
                rounded="lg"
                class="mt-2"
              >
                Insights will appear as your portfolio and traffic grow.
              </v-alert>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" lg="8" class="d-flex">
          <v-card class="analytics-wrapper-card w-100 flex-grow-1" elevation="0" rounded="xl">
            <v-card-title class="pa-6 pb-0 d-flex flex-column flex-sm-row flex-wrap align-sm-center ga-2">
              <div>
                <span class="display-serif text-h5">Market intelligence trends</span>
                <div class="text-caption text-medium-emphasis">Last 7 days · UTC buckets</div>
              </div>
              <v-spacer />
              <v-chip size="small" variant="tonal" color="secondary" prepend-icon="mdi-database-sync">
                Live from platform events
              </v-chip>
            </v-card-title>
            <v-card-text class="pa-6 pt-4">
              <v-row>
                <v-col cols="12" md="6" class="d-flex">
                  <div class="chart-container-premium w-100">
                    <div class="chart-header">
                      <v-icon icon="mdi-account-plus-outline" class="mr-2" size="small" />
                      Registration velocity
                    </div>
                    <p v-if="chartEmptyUser" class="text-caption text-medium-emphasis mb-2">
                      No new registrations in this window — momentum will chart automatically.
                    </p>
                    <EChart :option="userTrendOption" height="280px" />
                  </div>
                </v-col>
                <v-col cols="12" md="6" class="d-flex">
                  <div class="chart-container-premium w-100">
                    <div class="chart-header">
                      <v-icon icon="mdi-eye-outline" class="mr-2" size="small" />
                      Listing engagement
                    </div>
                    <p v-if="chartEmptyViews" class="text-caption text-medium-emphasis mb-2">
                      No detail views yet — share listings to light up this curve.
                    </p>
                    <EChart :option="viewsTrendOption" height="280px" />
                  </div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Slim shortcuts: two columns -->
      <v-row class="mb-10">
        <v-col cols="12">
          <v-card class="shortcuts-card" elevation="0" rounded="xl">
            <v-card-title class="pa-6 pb-2 d-flex flex-wrap align-center ga-2">
              <span class="text-overline letter-spacing-1">Shortcuts &amp; resources</span>
              <v-chip size="x-small" variant="tonal" color="secondary" class="font-weight-regular">
                Slim columns
              </v-chip>
            </v-card-title>
            <v-card-text class="pa-6 pt-2">
              <v-row>
                <v-col cols="12" md="6">
                  <div class="text-caption text-medium-emphasis font-weight-bold mb-3 text-uppercase letter-spacing-1">
                    Operational
                  </div>
                  <v-list class="slim-links bg-transparent pa-0" density="compact">
                    <v-list-item
                      v-for="action in quickActions"
                      :key="action.title"
                      :to="action.to"
                      rounded="lg"
                      class="slim-link-item mb-2 px-3"
                    >
                      <template #prepend>
                        <v-avatar :color="action.color" size="38" rounded="lg" class="slim-avatar">
                          <v-icon :icon="action.icon" color="white" size="small" />
                        </v-avatar>
                      </template>
                      <v-list-item-title class="font-weight-bold text-body-2">{{ action.title }}</v-list-item-title>
                      <v-list-item-subtitle class="text-caption">Internal workspace</v-list-item-subtitle>
                      <template #append>
                        <v-icon icon="mdi-chevron-right" size="small" class="text-medium-emphasis" />
                      </template>
                    </v-list-item>
                  </v-list>
                </v-col>
                <v-col cols="12" md="6">
                  <div class="d-flex align-center mb-3 ga-2">
                    <span class="text-caption text-medium-emphasis font-weight-bold text-uppercase letter-spacing-1">
                      Industry
                    </span>
                    <v-chip size="x-small" variant="tonal" color="secondary">Opens in new tab</v-chip>
                  </div>
                  <v-list class="slim-links bg-transparent pa-0" density="compact">
                    <v-list-item
                      v-for="link in industryQuickLinks"
                      :key="link.href"
                      :href="link.href"
                      target="_blank"
                      rel="noopener noreferrer"
                      rounded="lg"
                      class="slim-link-item mb-2 px-3"
                    >
                      <template #prepend>
                        <v-avatar color="secondary" variant="tonal" size="38" rounded="lg" class="slim-avatar">
                          <v-icon :icon="link.icon" size="small" />
                        </v-avatar>
                      </template>
                      <v-list-item-title class="font-weight-bold text-body-2">{{ link.label }}</v-list-item-title>
                      <v-list-item-subtitle class="text-caption">External portal</v-list-item-subtitle>
                      <template #append>
                        <v-icon icon="mdi-open-in-new" size="small" class="text-medium-emphasis" />
                      </template>
                    </v-list-item>
                  </v-list>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Recent activity -->
      <v-row class="mb-10">
        <v-col cols="12" md="6" class="d-flex">
          <v-card class="editorial-list-card w-100 flex-column d-flex" elevation="0">
            <v-card-title class="d-flex align-center pa-6">
              <span class="display-serif text-h5">Recent acquisitions</span>
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
                  <template #prepend>
                    <v-avatar
                      :color="user.role === 'admin' || user.role === 'super_admin' ? '#121212' : '#f4f1ea'"
                      :class="user.role === 'admin' || user.role === 'super_admin' ? 'text-white' : 'text-primary'"
                      size="48"
                      class="mr-4 elevation-1 font-weight-bold"
                    >
                      {{ getInitials(user) }}
                    </v-avatar>
                  </template>

                  <v-list-item-title class="font-weight-bold text-body-1">
                    {{ user.firstName }} {{ user.lastName }}
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-caption text-medium-emphasis">{{ user.email }}</v-list-item-subtitle>

                  <template #append>
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
              <span class="display-serif text-h5">Portfolio updates</span>
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
                  <template #prepend>
                    <v-img
                      :src="property.images?.[0] || '/placeholder-property.jpg'"
                      width="70"
                      height="50"
                      cover
                      class="rounded-lg mr-4 elevation-2 border-all"
                    />
                  </template>

                  <v-list-item-title class="font-weight-bold text-body-1">{{ property.title }}</v-list-item-title>
                  <v-list-item-subtitle class="text-caption text-medium-emphasis">{{ property.address }}</v-list-item-subtitle>

                  <template #append>
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
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import EChart from '~/components/charts/EChart.vue'
import { formatDate } from '~/utils/formatters'

type DashboardInsight = {
  title: string
  body: string
  icon: string
  variant: 'gold' | 'slate' | 'emerald'
}

type TrendsPayload = {
  labels: string[]
  userSignups: number[]
  listingViews: number[]
}

const getAuthHeaders = (): Record<string, string> => {
  if (process.client) {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }
  return {}
}

const stats = ref({
  totalUsers: 0,
  userGrowth: 0,
  activeListings: 0,
  totalListings: 0,
  inquiriesThisMonth: 0,
  totalInquiries: 0,
  viewingsToday: 0,
  viewingsThisWeek: 0,
})

const defaultTrends = (): TrendsPayload => ({
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  userSignups: [0, 0, 0, 0, 0, 0, 0],
  listingViews: [0, 0, 0, 0, 0, 0, 0],
})

const trends = ref<TrendsPayload>(defaultTrends())
const insights = ref<DashboardInsight[]>([])

const quickActions = [
  { title: 'Add user', icon: 'mdi-account-plus', color: 'primary', to: '/admin/users' },
  { title: 'Add property', icon: 'mdi-home-plus', color: 'success', to: '/admin/properties' },
  { title: 'Export data', icon: 'mdi-download', color: 'info', to: '/admin/reports' },
  { title: 'Settings', icon: 'mdi-cog', color: 'warning', to: '/admin/settings' },
]

const industryQuickLinks = [
  {
    label: 'FINTRAC',
    href: 'https://member.crea.ca/resources-compliance/legal-compliance-national-standards/compliance-resources/anti-money-laundering-fintrac/',
    icon: 'mdi-shield-check',
  },
  {
    label: 'WebForms',
    href: 'https://webforms.realtorlink.ca/',
    icon: 'mdi-file-document-edit',
  },
  {
    label: 'CREA Learning Hub',
    href: 'https://learning.crea.ca/pages/10/crea-home',
    icon: 'mdi-school-outline',
  },
  {
    label: 'AREA',
    href: 'https://albertarealtor.ca/',
    icon: 'mdi-map-marker-radius',
  },
  {
    label: 'RAE',
    href: 'https://realtorsofedmonton.com/',
    icon: 'mdi-office-building',
  },
  {
    label: 'CREB',
    href: 'https://www.creb.com/',
    icon: 'mdi-home-city',
  },
  {
    label: 'Paragon',
    href: 'https://rae-prod.us.auth0.com/u/login?state=hKFo2SBTTDM0ZlAxeVg2NTE3bGVBQmFGV0FZT1ZZUXlHXzEyeqFur3VuaXZlcnNhbC1sb2dpbqN0aWTZIDloZk1GcS1uQms1YVIxS2hqYjNBQXAwN3UzMEkwNVdjo2NpZNkgQ3ZhZll0cFUwZWw3R0EyT05kSElLWmw5V3gzSFg1TkU',
    icon: 'mdi-monitor-dashboard',
  },
  {
    label: 'Pillar 9',
    href: 'https://pillarnine.com/',
    icon: 'mdi-cloud-outline',
  },
] as const

const recentUsers = ref<any[]>([])
const recentProperties = ref<any[]>([])

const statCards = computed(() => [
  {
    val: stats.value.totalUsers,
    label: 'Total users',
    sub: `${stats.value.userGrowth >= 0 ? '+' : ''}${stats.value.userGrowth}% vs prior month (sign-ups)`,
    icon: 'mdi-account-group-outline',
    orb: 'primary-orb',
    growth: true,
  },
  {
    val: stats.value.activeListings,
    label: 'Active listings',
    sub: `Out of ${stats.value.totalListings} total`,
    icon: 'mdi-home-city-outline',
    orb: 'success-orb',
    growth: false,
  },
  {
    val: stats.value.inquiriesThisMonth,
    label: 'Monthly inquiries',
    sub: `${stats.value.totalInquiries} lifetime`,
    icon: 'mdi-message-text-outline',
    orb: 'info-orb',
    growth: false,
  },
  {
    val: stats.value.viewingsToday,
    label: 'Views today',
    sub: `${stats.value.viewingsThisWeek} in the last 7 days`,
    icon: 'mdi-chart-timeline-variant-shimmer',
    orb: 'gold-orb',
    growth: false,
  },
])

const insightsDisplay = computed(() => insights.value)

const sumSeries = (arr: number[]) => arr.reduce((a, b) => a + b, 0)

const chartEmptyUser = computed(() => sumSeries(trends.value.userSignups) === 0)
const chartEmptyViews = computed(() => sumSeries(trends.value.listingViews) === 0)

function buildLineChartOption(
  labels: string[],
  data: number[],
  lineColor: string,
  areaColor: string
) {
  const maxVal = Math.max(0, ...data)
  const yMax = maxVal === 0 ? 1 : Math.max(1, Math.ceil(maxVal * 1.2))

  return {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: labels.length ? labels : ['—'],
      axisLine: { lineStyle: { color: '#e0e0e0' } },
      axisLabel: { color: '#757575', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: yMax,
      splitNumber: maxVal === 0 ? 1 : undefined,
      splitLine: { lineStyle: { type: 'dashed', color: '#eee' } },
      axisLabel: { color: '#9e9e9e', fontSize: 11 },
    },
    series: [
      {
        type: 'line',
        data: labels.length ? data : [0],
        smooth: true,
        color: lineColor,
        areaStyle: { color: areaColor },
        lineStyle: { width: 3 },
        symbol: 'circle',
        symbolSize: maxVal === 0 ? 0 : 6,
        showSymbol: maxVal > 0,
      },
    ],
  }
}

const userTrendOption = computed(() =>
  buildLineChartOption(
    trends.value.labels,
    trends.value.userSignups,
    '#8c734b',
    'rgba(140, 115, 75, 0.12)'
  )
)

const viewsTrendOption = computed(() =>
  buildLineChartOption(
    trends.value.labels,
    trends.value.listingViews,
    '#1a237e',
    'rgba(26, 35, 126, 0.08)'
  )
)

const getInitials = (user: any) => {
  const f = (user.firstName || '').trim()
  const l = (user.lastName || '').trim()
  const a = f[0] || '?'
  const b = l[0] || (f[1] || '?')
  return `${a}${b}`.toUpperCase()
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    active: 'success',
    pending: 'warning',
    sold: 'info',
    inactive: 'grey',
  }
  return colors[status] || 'grey'
}

onMounted(async () => {
  try {
    const data = (await $fetch('/api/admin/dashboard', {
      headers: getAuthHeaders(),
    })) as any
    if (data.stats) stats.value = { ...stats.value, ...data.stats }
    recentUsers.value = data.recentUsers || []
    recentProperties.value = data.recentProperties || []
    if (data.trends?.labels?.length) {
      trends.value = {
        labels: data.trends.labels,
        userSignups: data.trends.userSignups || [],
        listingViews: data.trends.listingViews || [],
      }
    }
    insights.value = Array.isArray(data.insights) ? data.insights : []
  } catch (error) {
    console.error('Error loading dashboard data:', error)
  }
})

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;600;700&display=swap');

.admin-dashboard-premium {
  background:
    radial-gradient(1200px 600px at 10% -10%, rgba(140, 115, 75, 0.08), transparent 55%),
    radial-gradient(900px 500px at 100% 0%, rgba(26, 35, 126, 0.06), transparent 50%),
    #f7f6f3;
  font-family: 'Inter', sans-serif;
  min-height: 100vh;
}

.lh-1 {
  line-height: 1;
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
.letter-spacing-1 {
  letter-spacing: 1px;
}
.letter-spacing-tight {
  letter-spacing: -1px;
}

.max-width-copy {
  max-width: 36rem;
}

.premium-accent-bar {
  width: 40px;
  height: 4px;
  background: #8c734b;
  border-radius: 2px;
}

.hero-premium {
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: linear-gradient(135deg, #ffffff 0%, #faf8f5 48%, #f0ebe3 100%);
}

.hero-premium__grid {
  display: grid;
  grid-template-columns: 1fr;
}

@media (min-width: 960px) {
  .hero-premium__grid {
    grid-template-columns: 1.05fr 0.95fr;
  }
}

.hero-premium__viz {
  position: relative;
  min-height: 220px;
}

.hero-svg {
  width: 100%;
  max-width: 420px;
  height: auto;
  filter: drop-shadow(0 12px 28px rgba(18, 18, 18, 0.08));
}

.hero-nodes circle {
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.12));
}

.hero-premium__footer {
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(8px);
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

.timestamp-box--ghost {
  background: rgba(255, 255, 255, 0.5);
  border-color: rgba(0, 0, 0, 0.06);
}

.stat-card-premium {
  border-radius: 20px !important;
  border: 1px solid rgba(0, 0, 0, 0.05) !important;
  background: linear-gradient(180deg, #ffffff 0%, #fdfcfa 100%) !important;
  transition:
    transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275),
    box-shadow 0.3s ease;
  box-shadow: 0 8px 24px rgba(18, 18, 18, 0.04);
}

.stat-card-premium:hover {
  transform: translateY(-4px);
  border-color: rgba(140, 115, 75, 0.35) !important;
  box-shadow: 0 14px 36px rgba(18, 18, 18, 0.08);
}

.icon-orb {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.primary-orb {
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
}
.success-orb {
  background: rgba(var(--v-theme-success), 0.1);
  color: rgb(var(--v-theme-success));
}
.info-orb {
  background: rgba(var(--v-theme-info), 0.1);
  color: rgb(var(--v-theme-info));
}
.gold-orb {
  background: rgba(140, 115, 75, 0.12);
  color: #8c734b;
}

.growth-chip {
  padding: 4px 10px;
  border-radius: 100px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.growth-chip--up {
  background: rgba(var(--v-theme-success), 0.12);
  color: rgb(var(--v-theme-success));
}

.growth-chip--down {
  background: rgba(var(--v-theme-error), 0.1);
  color: rgb(var(--v-theme-error));
}

.insights-panel {
  border: 1px solid rgba(0, 0, 0, 0.06) !important;
  background: linear-gradient(180deg, #ffffff 0%, #fbfaf8 100%) !important;
  box-shadow: 0 10px 30px rgba(18, 18, 18, 0.05);
}

.insight-tile {
  border-radius: 16px;
  padding: 14px 16px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  background: rgba(255, 255, 255, 0.85);
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.insight-tile:hover {
  transform: translateY(-2px);
  border-color: rgba(140, 115, 75, 0.25);
}

.insight-tile--gold {
  background: linear-gradient(135deg, rgba(140, 115, 75, 0.08), #ffffff);
}
.insight-tile--emerald {
  background: linear-gradient(135deg, rgba(46, 125, 50, 0.07), #ffffff);
}
.insight-tile--slate {
  background: linear-gradient(135deg, rgba(18, 18, 18, 0.04), #ffffff);
}

.insight-body {
  line-height: 1.45;
}

.insight-avatar {
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.insight-avatar--gold {
  background: rgba(140, 115, 75, 0.12);
  color: #6d5a3c;
}
.insight-avatar--emerald {
  background: rgba(46, 125, 50, 0.12);
  color: #2e7d32;
}
.insight-avatar--slate {
  background: rgba(18, 18, 18, 0.08);
  color: #424242;
}

.shortcuts-card {
  border: 1px solid rgba(0, 0, 0, 0.06) !important;
  background: #ffffff !important;
  box-shadow: 0 12px 32px rgba(18, 18, 18, 0.05);
}

.slim-link-item {
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: #fcfcfb;
  min-height: 56px !important;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;
}

.slim-link-item:hover {
  background: #fff;
  border-color: rgba(140, 115, 75, 0.28);
  transform: translateX(2px);
}

.slim-avatar {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.editorial-list-card {
  border-radius: 24px !important;
  background: #ffffff !important;
  border: 1px solid rgba(0, 0, 0, 0.05) !important;
  min-height: 520px;
  box-shadow: 0 8px 28px rgba(18, 18, 18, 0.04);
}

.list-item-hover:hover {
  background-color: #faf9f7;
}

.border-all {
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.analytics-wrapper-card {
  border-radius: 24px !important;
  background: #ffffff !important;
  border: 1px solid rgba(0, 0, 0, 0.06) !important;
  box-shadow: 0 12px 36px rgba(18, 18, 18, 0.06);
}

.chart-container-premium {
  padding: 20px;
  background: linear-gradient(180deg, #fdfcfa 0%, #f7f5f1 100%);
  border-radius: 20px;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.chart-header {
  font-weight: 800;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 1px;
  margin-bottom: 12px;
  color: #757575;
  display: flex;
  align-items: center;
}
</style>
