<template>
  <div class="city-market-overview">
    <!-- Premium Header -->
    <div class="cmo-header">
      <div class="cmo-header-content">
        <div class="d-flex align-center">
          <div class="cmo-icon-badge mr-4">
            <v-icon size="28" color="white">mdi-city-variant</v-icon>
          </div>
          <div>
            <h2 class="cmo-title">Alberta Real Estate Market</h2>
            <p class="cmo-subtitle">Comprehensive city-level analytics &amp; distribution</p>
          </div>
        </div>
        <div v-if="totalStats" class="cmo-header-badge">
          <span class="cmo-badge-number">{{ totalStats.totalProperties.toLocaleString() }}</span>
          <span class="cmo-badge-label">Active Listings</span>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="cmo-loader">
      <div class="cmo-loader-ring">
        <v-progress-circular indeterminate color="#0f172a" size="56" width="3" />
      </div>
      <p class="cmo-loader-text">Aggregating market data&hellip;</p>
    </div>

    <!-- Error -->
    <v-alert v-else-if="error" type="error" variant="tonal" class="mx-6 my-6 rounded-xl">
      {{ error }}
    </v-alert>

    <!-- Content -->
    <div v-else-if="cityStats.length > 0" class="cmo-body">
      <!-- KPI Strip -->
      <div class="kpi-strip">
        <div class="kpi-card kpi-dark">
          <div class="kpi-icon-wrap"><v-icon size="22" color="white">mdi-map-marker-radius</v-icon></div>
          <div class="kpi-value">{{ totalStats?.totalCities || 0 }}</div>
          <div class="kpi-label">Cities &amp; Areas</div>
        </div>
        <div class="kpi-card kpi-emerald">
          <div class="kpi-icon-wrap"><v-icon size="22" color="white">mdi-home-group</v-icon></div>
          <div class="kpi-value">{{ totalStats?.totalProperties?.toLocaleString() || '0' }}</div>
          <div class="kpi-label">Total Properties</div>
        </div>
        <div class="kpi-card kpi-blue">
          <div class="kpi-icon-wrap"><v-icon size="22" color="white">mdi-chart-line</v-icon></div>
          <div class="kpi-value">{{ totalStats?.avgPropertiesPerCity || 0 }}</div>
          <div class="kpi-label">Avg per City</div>
        </div>
        <div class="kpi-card kpi-amber">
          <div class="kpi-icon-wrap"><v-icon size="22" color="white">mdi-trophy</v-icon></div>
          <div class="kpi-value">{{ formatNumber(totalStats?.maxProperties || 0) }}</div>
          <div class="kpi-label">Largest Market</div>
        </div>
      </div>

      <!-- Two Column Layout -->
      <div class="cmo-grid">
        <!-- Left: Search + Table -->
        <div class="cmo-col-main">
          <div class="cmo-search-bar">
            <v-text-field
              v-model="searchQuery"
              placeholder="Search cities or areas..."
              prepend-inner-icon="mdi-magnify"
              variant="solo-filled"
              density="compact"
              hide-details
              clearable
              flat
              class="cmo-search-input"
            />
            <v-select
              v-model="filterSize"
              :items="sizeFilters"
              placeholder="Market size"
              variant="solo-filled"
              density="compact"
              hide-details
              clearable
              flat
              class="cmo-filter-select"
            />
          </div>

          <div class="cmo-table-wrap">
            <v-data-table
              :headers="headers"
              :items="filteredCityStats"
              :items-per-page="25"
              item-value="city"
              :sort-by="[{ key: 'propertyCount', order: 'desc' }]"
              :search="searchQuery"
              class="cmo-table"
              hover
            >
              <template #item.city="{ item }">
                <div class="d-flex align-center py-3">
                  <div class="city-dot" :class="getCityDotClass(item.propertyCount)"></div>
                  <div class="ml-3">
                    <div class="text-subtitle-2 font-weight-bold" style="color: #1e293b;">{{ item.city }}</div>
                    <div class="text-caption" style="color: #94a3b8;">{{ getCityType(item.city) }}</div>
                  </div>
                </div>
              </template>

              <template #item.propertyCount="{ item }">
                <div class="text-center py-2">
                  <div class="prop-count-badge" :class="getPropCountClass(item.propertyCount)">
                    {{ item.propertyCount.toLocaleString() }}
                  </div>
                  <div class="text-caption mt-1" style="color: #94a3b8; font-size: 0.65rem;">
                    {{ getMarketShare(item.propertyCount) }}% share
                  </div>
                </div>
              </template>

              <template #item.marketCategory="{ item }">
                <span class="market-tag" :class="'tag-' + item.marketCategory.toLowerCase()">
                  {{ item.marketCategory }}
                </span>
              </template>

              <template #item.actions="{ item }">
                <v-btn
                  size="small"
                  variant="text"
                  class="cmo-view-btn"
                  @click="viewCityProperties(item.city)"
                >
                  <v-icon size="18">mdi-arrow-right-circle-outline</v-icon>
                  <v-tooltip activator="parent" location="top">View {{ item.city }}</v-tooltip>
                </v-btn>
              </template>
            </v-data-table>
          </div>
        </div>

        <!-- Right: Charts & Insights -->
        <div class="cmo-col-side">
          <!-- Pie Chart -->
          <div class="chart-card">
            <div class="chart-card-header">
              <div class="chart-dot dot-blue"></div>
              <span>Top 3 Cities Share</span>
            </div>
            <div class="chart-card-body">
              <VChart :option="pieChartOption" style="height: 260px;" autoresize />
            </div>
          </div>

          <!-- Bar Chart -->
          <div class="chart-card">
            <div class="chart-card-header">
              <div class="chart-dot dot-green"></div>
              <span>Market Distribution</span>
            </div>
            <div class="chart-card-body">
              <VChart :option="barChartOption" style="height: 220px;" autoresize />
            </div>
          </div>

          <!-- Summary -->
          <div class="chart-card">
            <div class="chart-card-header">
              <div class="chart-dot dot-purple"></div>
              <span>Market Breakdown</span>
            </div>
            <div class="chart-card-body summary-body">
              <div class="summary-row">
                <div class="summary-label"><span class="summary-bullet bg-emerald"></span>Major (1000+)</div>
                <div class="summary-val">{{ majorMarkets.length }} cities</div>
              </div>
              <div class="summary-row">
                <div class="summary-label"><span class="summary-bullet bg-amber"></span>Medium (100–999)</div>
                <div class="summary-val">{{ mediumMarkets.length }} cities</div>
              </div>
              <div class="summary-row">
                <div class="summary-label"><span class="summary-bullet bg-blue"></span>Small (1–99)</div>
                <div class="summary-val">{{ smallMarkets.length }} cities</div>
              </div>
              <div class="summary-divider"></div>
              <div v-for="city in majorMarkets.slice(0, 3)" :key="city.city" class="summary-row highlight">
                <div class="summary-label font-weight-medium">{{ city.city }}</div>
                <div class="summary-val text-emerald font-weight-bold">{{ city.propertyCount.toLocaleString() }}</div>
              </div>
            </div>
          </div>

          <!-- Property Types -->
          <div class="chart-card">
            <div class="chart-card-header">
              <div class="chart-dot dot-orange"></div>
              <span>Property Types</span>
            </div>
            <div class="chart-card-body">
              <VChart :option="propertyTypeChartOption" style="height: 260px;" autoresize />
            </div>
          </div>

          <!-- Realtor CTA -->
          <div class="realtor-cta">
            <div class="realtor-cta-glow"></div>
            <div class="realtor-cta-content">
              <v-icon size="36" color="white" class="mb-3">mdi-account-tie</v-icon>
              <p class="realtor-cta-text">
                Looking for a REALTOR&reg;?
                <strong>{{ adminFullName }}</strong> is ready to guide your home-buying journey.
              </p>
              <v-btn
                color="white"
                variant="flat"
                size="small"
                class="text-none font-weight-bold mt-2"
                style="color: #0f172a;"
                prepend-icon="mdi-phone"
                @click="navigateToContact"
              >
                Get in Touch
              </v-btn>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else class="cmo-empty">
      <v-icon size="64" color="#cbd5e1">mdi-city-variant-outline</v-icon>
      <h3 class="mt-4" style="color: #475569;">No Market Data Available</h3>
      <p style="color: #94a3b8;">Data will appear once properties are indexed.</p>
      <v-btn color="#0f172a" variant="flat" class="text-none mt-4" @click="loadData">Refresh</v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import 'echarts'
import { defineAsyncComponent } from 'vue'
const VChart = defineAsyncComponent(() => import('vue-echarts'))

const { adminFullName } = useTenantSettings()

interface CityStats {
  city: string
  propertyCount: number
  marketCategory: 'Major' | 'Medium' | 'Small'
}

interface PropertyTypeStats {
  type: string
  count: number
}

interface TotalStats {
  totalCities: number
  totalProperties: number
  avgPropertiesPerCity: number
  maxProperties: number
}

const emit = defineEmits<{
  'city-selected': [city: string]
}>()

const loading = ref(true)
const error = ref('')
const cityStats = ref<CityStats[]>([])
const propertyTypeStats = ref<PropertyTypeStats[]>([])
const totalStats = ref<TotalStats | null>(null)
const searchQuery = ref('')
const filterSize = ref('')

const sizeFilters = [
  { title: 'Major Markets (1000+)', value: 'major' },
  { title: 'Medium Markets (100-999)', value: 'medium' },
  { title: 'Small Markets (1-99)', value: 'small' }
]

const headers = [
  { title: 'City / Area', key: 'city', sortable: true },
  { title: 'Listings', key: 'propertyCount', sortable: true },
  { title: 'Market Size', key: 'marketCategory', sortable: true },
  { title: '', key: 'actions', sortable: false, width: '56px' }
]

const filteredCityStats = computed(() => {
  let filtered = cityStats.value
  if (filterSize.value) {
    filtered = filtered.filter(city => {
      switch (filterSize.value) {
        case 'major': return city.propertyCount >= 1000
        case 'medium': return city.propertyCount >= 100 && city.propertyCount < 1000
        case 'small': return city.propertyCount < 100
        default: return true
      }
    })
  }
  return filtered
})

const majorMarkets = computed(() => cityStats.value.filter(c => c.propertyCount >= 1000))
const mediumMarkets = computed(() => cityStats.value.filter(c => c.propertyCount >= 100 && c.propertyCount < 1000))
const smallMarkets = computed(() => cityStats.value.filter(c => c.propertyCount < 100))

const pieChartOption = computed(() => {
  const top3 = [...cityStats.value].sort((a, b) => b.propertyCount - a.propertyCount).slice(0, 3)
  const othersCount = cityStats.value.slice(3).reduce((s, c) => s + c.propertyCount, 0)
  const data = [
    ...top3.map(c => ({ name: c.city, value: c.propertyCount })),
    ...(othersCount > 0 ? [{ name: 'Others', value: othersCount }] : [])
  ]
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)', backgroundColor: '#1e293b', borderColor: '#334155', textStyle: { color: '#f1f5f9', fontSize: 12 } },
    legend: { orient: 'vertical', left: 'left', textStyle: { fontSize: 11, color: '#64748b' } },
    series: [{
      name: 'Properties', type: 'pie', radius: ['42%', '72%'], avoidLabelOverlap: false,
      itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 3 },
      label: { show: false }, emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold', color: '#1e293b' } },
      labelLine: { show: false }, data,
      color: ['#0f172a', '#3b82f6', '#10b981', '#94a3b8']
    }]
  }
})

const barChartOption = computed(() => {
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: '#1e293b', borderColor: '#334155', textStyle: { color: '#f1f5f9', fontSize: 12 } },
    grid: { left: '4%', right: '4%', bottom: '4%', top: '12%', containLabel: true },
    xAxis: { type: 'category', data: ['Major', 'Medium', 'Small'], axisLabel: { fontSize: 11, color: '#64748b' }, axisLine: { lineStyle: { color: '#e2e8f0' } } },
    yAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#94a3b8' }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
    series: [{
      name: 'Cities', type: 'bar',
      data: [majorMarkets.value.length, mediumMarkets.value.length, smallMarkets.value.length],
      itemStyle: {
        borderRadius: [6, 6, 0, 0],
        color: (params: any) => ['#10b981', '#f59e0b', '#3b82f6'][params.dataIndex]
      },
      label: { show: true, position: 'top', fontSize: 13, fontWeight: 'bold', color: '#1e293b' }
    }]
  }
})

const propertyTypeChartOption = computed(() => {
  const typeLabels: Record<string, string> = {
    house: 'Single Family', condo: 'Condo', townhouse: 'Townhouse',
    'multi-family': 'Multi-Family', land: 'Land', commercial: 'Commercial',
    industrial: 'Industrial', other: 'Other'
  }
  const data = propertyTypeStats.value.map(s => ({ name: typeLabels[s.type] || s.type, value: s.count }))
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)', backgroundColor: '#1e293b', borderColor: '#334155', textStyle: { color: '#f1f5f9', fontSize: 12 } },
    legend: { orient: 'horizontal', bottom: '0%', textStyle: { fontSize: 10, color: '#64748b' } },
    series: [{
      name: 'Types', type: 'pie', radius: ['30%', '60%'], center: ['50%', '42%'],
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 13, fontWeight: 'bold', color: '#1e293b' } },
      labelLine: { show: false }, data,
      color: ['#0f172a', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#14b8a6', '#78716c', '#94a3b8']
    }]
  }
})

const formatNumber = (n: number) => n.toLocaleString()

const getCityType = (city: string): string => {
  if (city.toLowerCase().includes('rural')) return 'Rural Area'
  if (city === 'Calgary' || city === 'Edmonton') return 'Major City'
  return 'City / Town'
}

const getCityDotClass = (count: number): string => {
  if (count >= 1000) return 'dot-emerald'
  if (count >= 100) return 'dot-amber'
  return 'dot-slate'
}

const getPropCountClass = (count: number): string => {
  if (count >= 1000) return 'pcb-emerald'
  if (count >= 100) return 'pcb-amber'
  if (count >= 50) return 'pcb-blue'
  return 'pcb-slate'
}

const getMarketShare = (count: number): string => {
  if (!totalStats.value) return '0'
  return ((count / totalStats.value.totalProperties) * 100).toFixed(1)
}

const viewCityProperties = (city: string) => emit('city-selected', city)
const navigateToContact = () => navigateTo('/contact')

const loadData = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await $fetch<any>('/api/properties/city-stats')
    if (!response?.cities?.length) {
      cityStats.value = []
      propertyTypeStats.value = []
      totalStats.value = null
      return
    }
    cityStats.value = response.cities.map((city: any) => ({
      city: city.city,
      propertyCount: city.propertyCount,
      marketCategory: city.propertyCount >= 1000 ? 'Major' : city.propertyCount >= 100 ? 'Medium' : 'Small'
    }))
    if (response.propertyTypes) {
      propertyTypeStats.value = response.propertyTypes.map((t: any) => ({ type: t.type, count: t.count }))
    }
    totalStats.value = {
      totalCities: cityStats.value.length,
      totalProperties: cityStats.value.reduce((s, c) => s + c.propertyCount, 0),
      avgPropertiesPerCity: Math.round(cityStats.value.reduce((s, c) => s + c.propertyCount, 0) / cityStats.value.length),
      maxProperties: Math.max(...cityStats.value.map(c => c.propertyCount))
    }
  } catch (err) {
    error.value = 'Failed to load market overview data'
    console.error('Error loading city stats:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => loadData())
</script>

<style scoped>
.city-market-overview { width: 100%; }

/* ── Header ── */
.cmo-header {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  padding: 28px 32px;
  border-radius: 20px 20px 0 0;
}
.cmo-header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
}
.cmo-icon-badge {
  width: 52px; height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 20px rgba(59,130,246,0.35);
}
.cmo-title { color: #fff; font-size: 1.35rem; font-weight: 800; letter-spacing: -0.02em; line-height: 1.2; }
.cmo-subtitle { color: #94a3b8; font-size: 0.82rem; margin: 2px 0 0; }
.cmo-header-badge {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 12px;
  padding: 10px 20px;
  text-align: center;
  backdrop-filter: blur(8px);
}
.cmo-header-badge .cmo-badge-number { display: block; color: #fff; font-size: 1.5rem; font-weight: 800; letter-spacing: -0.02em; }
.cmo-header-badge .cmo-badge-label { color: #94a3b8; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; }

/* ── Loader ── */
.cmo-loader { text-align: center; padding: 64px 0; }
.cmo-loader-text { color: #64748b; font-size: 0.85rem; margin-top: 16px; letter-spacing: 0.05em; }

/* ── Body ── */
.cmo-body { padding: 0; }

/* ── KPI Strip ── */
.kpi-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  border-bottom: 1px solid #e2e8f0;
}
.kpi-card {
  padding: 24px 20px;
  text-align: center;
  position: relative;
  transition: background 0.2s;
}
.kpi-card:not(:last-child) { border-right: 1px solid #e2e8f0; }
.kpi-card:hover { background: #f8fafc; }
.kpi-icon-wrap {
  width: 40px; height: 40px;
  border-radius: 10px;
  display: inline-flex; align-items: center; justify-content: center;
  margin-bottom: 10px;
}
.kpi-dark .kpi-icon-wrap { background: linear-gradient(135deg, #0f172a, #334155); }
.kpi-emerald .kpi-icon-wrap { background: linear-gradient(135deg, #059669, #10b981); }
.kpi-blue .kpi-icon-wrap { background: linear-gradient(135deg, #2563eb, #3b82f6); }
.kpi-amber .kpi-icon-wrap { background: linear-gradient(135deg, #d97706, #f59e0b); }
.kpi-value { font-size: 1.6rem; font-weight: 800; color: #0f172a; letter-spacing: -0.03em; line-height: 1; }
.kpi-label { font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 6px; }

/* ── Grid ── */
.cmo-grid {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 0;
}
.cmo-col-main { border-right: 1px solid #e2e8f0; }
.cmo-col-side { background: #f8fafc; }

/* ── Search ── */
.cmo-search-bar {
  display: flex; gap: 12px;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  background: #fafbfc;
}
.cmo-search-input { flex: 1; }
.cmo-filter-select { max-width: 220px; }
:deep(.cmo-search-bar .v-field) {
  border-radius: 10px !important;
  background: #f1f5f9 !important;
  box-shadow: none !important;
}
:deep(.cmo-search-bar .v-field--focused) {
  background: #fff !important;
  box-shadow: 0 0 0 2px rgba(59,130,246,0.2) !important;
}

/* ── Table ── */
.cmo-table-wrap { padding: 0; }
.cmo-table :deep(thead th) {
  background: #f8fafc !important;
  font-weight: 700 !important;
  text-transform: uppercase;
  font-size: 0.68rem !important;
  letter-spacing: 0.08em;
  color: #64748b !important;
  border-bottom: 2px solid #e2e8f0 !important;
  padding-top: 14px !important;
  padding-bottom: 14px !important;
}
.cmo-table :deep(tbody tr) { transition: background 0.15s; }
.cmo-table :deep(tbody tr:hover) { background: #f1f5f9 !important; }
.cmo-table :deep(tbody td) { border-bottom: 1px solid #f1f5f9 !important; }

.city-dot {
  width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
}
.dot-emerald { background: #10b981; box-shadow: 0 0 6px rgba(16,185,129,0.4); }
.dot-amber { background: #f59e0b; box-shadow: 0 0 6px rgba(245,158,11,0.4); }
.dot-slate { background: #94a3b8; }

.prop-count-badge {
  display: inline-block; padding: 3px 12px; border-radius: 20px;
  font-weight: 700; font-size: 0.8rem;
}
.pcb-emerald { background: #ecfdf5; color: #059669; }
.pcb-amber { background: #fffbeb; color: #d97706; }
.pcb-blue { background: #eff6ff; color: #2563eb; }
.pcb-slate { background: #f1f5f9; color: #64748b; }

.market-tag {
  display: inline-block; padding: 3px 10px; border-radius: 6px;
  font-size: 0.7rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
}
.tag-major { background: #ecfdf5; color: #059669; }
.tag-medium { background: #fffbeb; color: #d97706; }
.tag-small { background: #eff6ff; color: #2563eb; }

.cmo-view-btn { color: #3b82f6 !important; min-width: 36px !important; }
.cmo-view-btn:hover { background: #eff6ff !important; }

/* ── Chart Cards ── */
.chart-card {
  border-bottom: 1px solid #e2e8f0;
}
.chart-card-header {
  display: flex; align-items: center; gap: 8px;
  padding: 16px 20px 0;
  font-size: 0.82rem; font-weight: 700; color: #334155;
  text-transform: uppercase; letter-spacing: 0.04em;
}
.chart-dot { width: 8px; height: 8px; border-radius: 50%; }
.dot-blue { background: #3b82f6; }
.dot-green { background: #10b981; }
.dot-purple { background: #8b5cf6; }
.dot-orange { background: #f59e0b; }
.chart-card-body { padding: 8px 16px 16px; }

/* ── Summary ── */
.summary-body { padding: 12px 20px 20px !important; }
.summary-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 6px 0; font-size: 0.82rem; color: #475569;
}
.summary-row.highlight { color: #0f172a; }
.summary-label { display: flex; align-items: center; gap: 8px; }
.summary-bullet { width: 8px; height: 8px; border-radius: 3px; display: inline-block; }
.bg-emerald { background: #10b981; }
.bg-amber { background: #f59e0b; }
.bg-blue { background: #3b82f6; }
.summary-val { font-weight: 600; }
.text-emerald { color: #059669; }
.summary-divider { height: 1px; background: #e2e8f0; margin: 10px 0; }

/* ── Realtor CTA ── */
.realtor-cta {
  margin: 20px 16px 20px;
  border-radius: 16px;
  background: linear-gradient(135deg, #0f172a, #1e3a5f);
  padding: 28px 24px;
  text-align: center;
  position: relative;
  overflow: hidden;
}
.realtor-cta-glow {
  position: absolute; top: -40px; right: -40px;
  width: 120px; height: 120px; border-radius: 50%;
  background: rgba(59,130,246,0.25);
  filter: blur(30px);
}
.realtor-cta-content { position: relative; z-index: 1; }
.realtor-cta-text {
  color: #cbd5e1; font-size: 0.85rem; line-height: 1.6; margin: 0;
}
.realtor-cta-text strong { color: #fff; }

/* ── Empty ── */
.cmo-empty { text-align: center; padding: 80px 32px; }

/* ── Responsive ── */
@media (max-width: 1024px) {
  .cmo-grid { grid-template-columns: 1fr; }
  .cmo-col-main { border-right: none; border-bottom: 1px solid #e2e8f0; }
}
@media (max-width: 768px) {
  .kpi-strip { grid-template-columns: repeat(2, 1fr); }
  .kpi-card:nth-child(1), .kpi-card:nth-child(2) { border-bottom: 1px solid #e2e8f0; }
  .kpi-card:nth-child(2) { border-right: none; }
  .cmo-header { padding: 20px; border-radius: 16px 16px 0 0; }
  .cmo-search-bar { flex-direction: column; }
  .cmo-filter-select { max-width: 100%; }
}
@media (max-width: 480px) {
  .kpi-strip { grid-template-columns: 1fr 1fr; }
  .cmo-header-content { flex-direction: column; align-items: flex-start; }
}
</style>
