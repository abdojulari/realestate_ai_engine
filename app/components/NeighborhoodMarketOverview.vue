<template>
  <div class="nmo-root">
    <!-- Premium Header -->
    <div class="nmo-header">
      <div class="nmo-header-inner">
        <div class="d-flex align-center">
          <div class="nmo-icon-badge mr-4">
            <v-icon size="26" color="white">mdi-map-marker-multiple</v-icon>
          </div>
          <div>
            <h2 class="nmo-title">Neighborhood Intelligence</h2>
            <p class="nmo-subtitle">City-level breakdown of neighborhoods, pricing &amp; inventory</p>
          </div>
        </div>
        <div v-if="totalStats" class="nmo-pill">
          <span class="nmo-pill-num">{{ totalStats.totalNeighborhoods }}</span>
          <span class="nmo-pill-label">Neighborhoods</span>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="nmo-loader">
      <v-progress-circular indeterminate color="#0f172a" size="52" width="3" />
      <p class="nmo-loader-label">Indexing neighborhoods&hellip;</p>
    </div>

    <!-- Error -->
    <v-alert v-else-if="error" type="error" variant="tonal" class="mx-6 my-6 rounded-xl">{{ error }}</v-alert>

    <!-- Content -->
    <div v-else-if="cityStats.length > 0" class="nmo-body">
      <!-- KPI Row -->
      <div class="nmo-kpi-row">
        <div class="nmo-kpi">
          <div class="nmo-kpi-dot bg-dark"></div>
          <div class="nmo-kpi-data">
            <span class="nmo-kpi-val">{{ totalStats?.totalCities }}</span>
            <span class="nmo-kpi-lbl">Cities</span>
          </div>
        </div>
        <div class="nmo-kpi">
          <div class="nmo-kpi-dot bg-emerald"></div>
          <div class="nmo-kpi-data">
            <span class="nmo-kpi-val">{{ totalStats?.totalNeighborhoods }}</span>
            <span class="nmo-kpi-lbl">Neighborhoods</span>
          </div>
        </div>
        <div class="nmo-kpi">
          <div class="nmo-kpi-dot bg-blue"></div>
          <div class="nmo-kpi-data">
            <span class="nmo-kpi-val">{{ formatNumber(totalStats?.totalProperties ?? 0) }}</span>
            <span class="nmo-kpi-lbl">Properties</span>
          </div>
        </div>
        <div class="nmo-kpi">
          <div class="nmo-kpi-dot bg-amber"></div>
          <div class="nmo-kpi-data">
            <span class="nmo-kpi-val">{{ formatPrice(totalStats?.avgPrice ?? 0) }}</span>
            <span class="nmo-kpi-lbl">Avg Price</span>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="nmo-table-wrap">
        <v-data-table
          :headers="headers"
          :items="cityStats"
          :items-per-page="20"
          item-value="city"
          :sort-by="[{ key: 'neighborhoodCount', order: 'desc' }]"
          class="nmo-table"
          hover
        >
          <template #item.city="{ item }">
            <div class="d-flex align-center py-3">
              <div class="city-marker">
                <v-icon size="16" color="white">mdi-map-marker</v-icon>
              </div>
              <span class="ml-3 font-weight-bold" style="color: #1e293b;">{{ item.city }}</span>
            </div>
          </template>

          <template #item.neighborhoodCount="{ item }">
            <span class="nmo-badge" :class="getNbhBadgeClass(item.neighborhoodCount)">
              {{ item.neighborhoodCount }}
            </span>
          </template>

          <template #item.propertyRange="{ item }">
            <div class="range-cell">
              <span class="range-val">{{ item.minProperties }}&ndash;{{ item.maxProperties }}</span>
              <span class="range-sub">per neighborhood</span>
            </div>
          </template>

          <template #item.totalProperties="{ item }">
            <div class="text-center">
              <span class="font-weight-black" style="color: #0f172a; font-size: 1.05rem;">
                {{ formatNumber(item.totalProperties) }}
              </span>
            </div>
          </template>

          <template #item.priceRange="{ item }">
            <div class="range-cell">
              <span class="range-price-lo">{{ formatPrice(item.minPrice) }}</span>
              <span class="range-arrow">→</span>
              <span class="range-price-hi">{{ formatPrice(item.maxPrice) }}</span>
            </div>
          </template>

          <template #item.avgPrice="{ item }">
            <span class="avg-price-tag">{{ formatPrice(item.avgPrice) }}</span>
          </template>

          <template #item.actions="{ item }">
            <v-btn
              size="small"
              variant="text"
              class="nmo-view-btn"
              @click="viewCityDetails(item.city)"
            >
              <v-icon size="18">mdi-arrow-right-circle-outline</v-icon>
              <v-tooltip activator="parent" location="top">View {{ item.city }}</v-tooltip>
            </v-btn>
          </template>
        </v-data-table>
      </div>

      <!-- Insight Cards -->
      <div class="nmo-insights-grid">
        <div class="insight-card">
          <div class="insight-header">
            <div class="insight-dot bg-emerald"></div>
            <span>Top Performing Cities</span>
          </div>
          <div class="insight-body">
            <div v-for="(city, idx) in topCities" :key="city.city" class="insight-row">
              <div class="d-flex align-center gap-2">
                <span class="rank-badge">{{ idx + 1 }}</span>
                <span class="font-weight-medium" style="color: #1e293b;">{{ city.city }}</span>
              </div>
              <span class="insight-chip">{{ city.neighborhoodCount }} neighborhoods</span>
            </div>
          </div>
        </div>

        <div class="insight-card">
          <div class="insight-header">
            <div class="insight-dot bg-amber"></div>
            <span>Price Intelligence</span>
          </div>
          <div class="insight-body">
            <div class="price-insight-row">
              <span class="price-insight-label">Highest Average</span>
              <span class="price-insight-val text-amber">{{ formatPrice(totalStats?.maxAvgPrice ?? 0) }}</span>
            </div>
            <div class="price-insight-row">
              <span class="price-insight-label">Lowest Average</span>
              <span class="price-insight-val text-emerald">{{ formatPrice(totalStats?.minAvgPrice ?? 0) }}</span>
            </div>
            <div class="price-insight-divider"></div>
            <div class="price-insight-row highlight">
              <span class="price-insight-label">Market Average</span>
              <span class="price-insight-val text-dark">{{ formatPrice(totalStats?.avgPrice ?? 0) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else class="nmo-empty">
      <v-icon size="56" color="#cbd5e1">mdi-city-variant-outline</v-icon>
      <h3 class="mt-4" style="color: #475569;">No Neighborhood Data</h3>
      <p style="color: #94a3b8;">Data appears once neighborhoods are indexed.</p>
      <v-btn color="#0f172a" variant="flat" class="text-none mt-3" @click="loadData">Refresh</v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
interface CityStats {
  city: string
  neighborhoodCount: number
  minProperties: number
  maxProperties: number
  totalProperties: number
  minPrice: number
  maxPrice: number
  avgPrice: number
}

interface TotalStats {
  totalCities: number
  totalNeighborhoods: number
  totalProperties: number
  avgPrice: number
  minAvgPrice: number
  maxAvgPrice: number
}

const emit = defineEmits<{
  'city-selected': [city: string]
}>()

const loading = ref(true)
const error = ref('')
const cityStats = ref<CityStats[]>([])
const totalStats = ref<TotalStats | null>(null)

const headers = [
  { title: 'City', key: 'city', sortable: true },
  { title: 'Neighborhoods', key: 'neighborhoodCount', sortable: true },
  { title: 'Property Range', key: 'propertyRange', sortable: false },
  { title: 'Total Properties', key: 'totalProperties', sortable: true },
  { title: 'Price Range', key: 'priceRange', sortable: false },
  { title: 'Avg Price', key: 'avgPrice', sortable: true },
  { title: '', key: 'actions', sortable: false, width: '56px' }
]

const topCities = computed(() => [...cityStats.value].sort((a, b) => b.neighborhoodCount - a.neighborhoodCount).slice(0, 3))

const formatPrice = (price: number): string => {
  if (price >= 1000000) return `$${(price / 1000000).toFixed(1)}M`
  if (price >= 1000) return `$${(price / 1000).toFixed(0)}K`
  return `$${price.toLocaleString()}`
}

const formatNumber = (num: number): string => num.toLocaleString()

const getNbhBadgeClass = (count: number): string => {
  if (count >= 10) return 'nbh-emerald'
  if (count >= 5) return 'nbh-amber'
  return 'nbh-blue'
}

const viewCityDetails = (city: string) => emit('city-selected', city)

const loadData = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await $fetch<{ neighborhoods: any[], pagination: any }>('/api/neighborhoods?limit=1000')
    if (!response.neighborhoods?.length) {
      cityStats.value = []
      totalStats.value = null
      return
    }
    const cityGroups = response.neighborhoods.reduce((acc: Record<string, any[]>, n: any) => {
      if (!acc[n.city]) acc[n.city] = []
      acc[n.city].push(n)
      return acc
    }, {} as Record<string, any[]>)

    cityStats.value = Object.entries(cityGroups).map(([city, neighborhoods]: [string, any[]]) => {
      const counts = neighborhoods.map((n: any) => n.propertyCount || 0)
      const prices = neighborhoods.map((n: any) => n.averagePrice || 0).filter((p: number) => p > 0)
      return {
        city,
        neighborhoodCount: neighborhoods.length,
        minProperties: Math.min(...counts),
        maxProperties: Math.max(...counts),
        totalProperties: counts.reduce((s, c) => s + c, 0),
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
        avgPrice: prices.reduce((s, p) => s + p, 0) / prices.length
      }
    })

    const allPrices = cityStats.value.map(c => c.avgPrice).filter(p => p > 0)
    totalStats.value = {
      totalCities: cityStats.value.length,
      totalNeighborhoods: cityStats.value.reduce((s, c) => s + c.neighborhoodCount, 0),
      totalProperties: cityStats.value.reduce((s, c) => s + c.totalProperties, 0),
      avgPrice: allPrices.reduce((s, p) => s + p, 0) / allPrices.length,
      minAvgPrice: Math.min(...allPrices),
      maxAvgPrice: Math.max(...allPrices)
    }
  } catch (err) {
    error.value = 'Failed to load neighborhood data'
    console.error('Error loading neighborhood stats:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => loadData())
</script>

<style scoped>
.nmo-root { width: 100%; }

/* ── Header ── */
.nmo-header {
  background: linear-gradient(135deg, #0f172a, #1e293b);
  padding: 24px 28px;
  border-radius: 20px 20px 0 0;
}
.nmo-header-inner {
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 12px;
}
.nmo-icon-badge {
  width: 48px; height: 48px; border-radius: 12px;
  background: linear-gradient(135deg, #10b981, #059669);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 16px rgba(16,185,129,0.35);
}
.nmo-title { color: #fff; font-size: 1.25rem; font-weight: 800; letter-spacing: -0.02em; }
.nmo-subtitle { color: #94a3b8; font-size: 0.78rem; margin: 2px 0 0; }
.nmo-pill {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 10px; padding: 8px 18px;
  text-align: center; backdrop-filter: blur(8px);
}
.nmo-pill-num { display: block; color: #fff; font-size: 1.35rem; font-weight: 800; }
.nmo-pill-label { color: #94a3b8; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; }

/* ── Loader ── */
.nmo-loader { text-align: center; padding: 56px 0; }
.nmo-loader-label { color: #64748b; font-size: 0.82rem; margin-top: 14px; letter-spacing: 0.04em; }

/* ── Body ── */
.nmo-body { padding: 0; }

/* ── KPI Row ── */
.nmo-kpi-row {
  display: grid; grid-template-columns: repeat(4, 1fr);
  border-bottom: 1px solid #e2e8f0;
}
.nmo-kpi {
  display: flex; align-items: center; gap: 12px;
  padding: 20px 24px;
  transition: background 0.15s;
}
.nmo-kpi:not(:last-child) { border-right: 1px solid #e2e8f0; }
.nmo-kpi:hover { background: #f8fafc; }
.nmo-kpi-dot { width: 10px; height: 10px; border-radius: 4px; flex-shrink: 0; }
.bg-dark { background: #0f172a; }
.bg-emerald { background: #10b981; }
.bg-blue { background: #3b82f6; }
.bg-amber { background: #f59e0b; }
.nmo-kpi-val { display: block; font-size: 1.3rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
.nmo-kpi-lbl { font-size: 0.68rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; }

/* ── Table ── */
.nmo-table-wrap { padding: 0; }
.nmo-table :deep(thead th) {
  background: #f8fafc !important; font-weight: 700 !important;
  text-transform: uppercase; font-size: 0.67rem !important;
  letter-spacing: 0.08em; color: #64748b !important;
  border-bottom: 2px solid #e2e8f0 !important;
  padding: 14px 16px !important;
}
.nmo-table :deep(tbody tr) { transition: background 0.15s; }
.nmo-table :deep(tbody tr:hover) { background: #f1f5f9 !important; }
.nmo-table :deep(tbody td) { border-bottom: 1px solid #f1f5f9 !important; }

.city-marker {
  width: 28px; height: 28px; border-radius: 8px;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}

.nmo-badge {
  display: inline-block; padding: 3px 12px; border-radius: 20px;
  font-weight: 700; font-size: 0.8rem;
}
.nbh-emerald { background: #ecfdf5; color: #059669; }
.nbh-amber { background: #fffbeb; color: #d97706; }
.nbh-blue { background: #eff6ff; color: #2563eb; }

.range-cell { display: flex; flex-direction: column; gap: 1px; }
.range-val { font-weight: 700; color: #334155; font-size: 0.85rem; }
.range-sub { font-size: 0.65rem; color: #94a3b8; }
.range-price-lo { color: #059669; font-weight: 600; font-size: 0.82rem; }
.range-price-hi { color: #d97706; font-weight: 600; font-size: 0.82rem; }
.range-arrow { color: #cbd5e1; font-size: 0.75rem; margin: 0 4px; }

.avg-price-tag {
  display: inline-block; padding: 4px 12px; border-radius: 8px;
  background: #0f172a; color: #fff; font-weight: 700; font-size: 0.82rem;
}

.nmo-view-btn { color: #3b82f6 !important; min-width: 36px !important; }
.nmo-view-btn:hover { background: #eff6ff !important; }

/* ── Insight Cards ── */
.nmo-insights-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  border-top: 1px solid #e2e8f0;
}
.insight-card { padding: 0; }
.insight-card:first-child { border-right: 1px solid #e2e8f0; }

.insight-header {
  display: flex; align-items: center; gap: 8px;
  padding: 18px 24px 0;
  font-size: 0.78rem; font-weight: 700; color: #334155;
  text-transform: uppercase; letter-spacing: 0.05em;
}
.insight-dot { width: 8px; height: 8px; border-radius: 50%; }
.insight-body { padding: 16px 24px 24px; }

.insight-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 0;
}
.insight-row:not(:last-child) { border-bottom: 1px solid #f1f5f9; }
.rank-badge {
  width: 22px; height: 22px; border-radius: 6px;
  background: #f1f5f9; color: #475569;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 0.7rem; font-weight: 800;
}
.insight-chip {
  padding: 3px 10px; border-radius: 20px;
  background: #ecfdf5; color: #059669;
  font-size: 0.7rem; font-weight: 600;
}

.price-insight-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 0;
}
.price-insight-row:not(:last-child):not(.highlight) { border-bottom: 1px solid #f1f5f9; }
.price-insight-row.highlight {
  background: #f8fafc; margin: 0 -24px; padding: 12px 24px;
  border-radius: 10px;
}
.price-insight-label { font-size: 0.82rem; color: #64748b; }
.price-insight-val { font-size: 1rem; font-weight: 800; }
.text-amber { color: #d97706; }
.text-emerald { color: #059669; }
.text-dark { color: #0f172a; }
.price-insight-divider { height: 1px; background: #e2e8f0; margin: 6px 0; }

/* ── Empty ── */
.nmo-empty { text-align: center; padding: 64px 32px; }

/* ── Responsive ── */
@media (max-width: 768px) {
  .nmo-kpi-row { grid-template-columns: repeat(2, 1fr); }
  .nmo-kpi:nth-child(1), .nmo-kpi:nth-child(2) { border-bottom: 1px solid #e2e8f0; }
  .nmo-kpi:nth-child(2) { border-right: none; }
  .nmo-insights-grid { grid-template-columns: 1fr; }
  .insight-card:first-child { border-right: none; border-bottom: 1px solid #e2e8f0; }
  .nmo-header { padding: 20px; border-radius: 16px 16px 0 0; }
}
@media (max-width: 480px) {
  .nmo-header-inner { flex-direction: column; align-items: flex-start; }
}
</style>
