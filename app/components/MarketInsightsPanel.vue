<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

const props = defineProps<{
  city?: string
}>()

interface Indicator {
  label: string
  direction: 'up' | 'down' | 'stable'
  value: string
  description: string
}

interface Verdict {
  verdict: string
  detail: string
  isFavorable: boolean
}

interface MonthlyTrend {
  year: number
  month: number
  soldCount: number
  avgSoldPrice: number
  activeInventory: number
}

interface InsightsData {
  success: boolean
  hasData: boolean
  marketType: 'buyer' | 'seller' | 'balanced'
  city: string
  indicators: Indicator[]
  recommendation: {
    forBuyers: Verdict
    forSellers: Verdict
  }
  overview: {
    activeListings: number
    soldLast30Days: number
    avgPrice: number
    medianPrice: number
  }
  insights: string[]
  monthlyTrends: MonthlyTrend[]
  generatedAt: string
}

const loading = ref(false)
const data = ref<InsightsData | null>(null)
const error = ref('')
const activeTab = ref<'buyers' | 'sellers'>('buyers')
const expanded = ref(true)

const authStore = useAuthStore()

const fetchInsights = async () => {
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams()
    if (props.city) params.append('city', props.city)

    const headers: Record<string, string> = {}
    const token = authStore.token || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null)
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const result = await $fetch<InsightsData>(`/api/market-insights?${params.toString()}`, { headers })
    if (result.success && result.hasData) {
      data.value = result
    } else {
      data.value = null
    }
  } catch (e: any) {
    if (e?.statusCode === 403) {
      error.value = ''
      data.value = null
    } else {
      console.error('[MarketInsights] Fetch failed:', e?.statusCode, e?.message || e)
      error.value = 'Unable to load market insights'
    }
  } finally {
    loading.value = false
  }
}

const marketBadge = computed(() => {
  if (!data.value) return null
  const map = {
    buyer: {
      label: "BUYER'S MARKET",
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.08)',
      border: 'rgba(16, 185, 129, 0.2)',
      icon: 'mdi-tag-outline',
      glow: 'rgba(16, 185, 129, 0.15)',
    },
    seller: {
      label: "SELLER'S MARKET",
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.08)',
      border: 'rgba(239, 68, 68, 0.2)',
      icon: 'mdi-fire',
      glow: 'rgba(239, 68, 68, 0.15)',
    },
    balanced: {
      label: 'BALANCED MARKET',
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.08)',
      border: 'rgba(245, 158, 11, 0.2)',
      icon: 'mdi-scale-balance',
      glow: 'rgba(245, 158, 11, 0.15)',
    },
  }
  return map[data.value.marketType]
})

const activeRecommendation = computed(() => {
  if (!data.value) return null
  return activeTab.value === 'buyers'
    ? data.value.recommendation.forBuyers
    : data.value.recommendation.forSellers
})

const trendBars = computed(() => {
  if (!data.value?.monthlyTrends?.length) return []
  const trends = data.value.monthlyTrends
  const maxSold = Math.max(...trends.map(t => t.soldCount), 1)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return trends.map(t => ({
    label: months[t.month - 1] || '',
    height: Math.max((t.soldCount / maxSold) * 100, 4),
    value: t.soldCount,
    price: t.avgSoldPrice,
  }))
})

function directionIcon(dir: 'up' | 'down' | 'stable') {
  if (dir === 'up') return 'mdi-arrow-top-right'
  if (dir === 'down') return 'mdi-arrow-bottom-right'
  return 'mdi-arrow-right'
}

function directionColor(dir: 'up' | 'down' | 'stable') {
  if (dir === 'up') return '#10b981'
  if (dir === 'down') return '#ef4444'
  return '#9ca3af'
}

function directionBg(dir: 'up' | 'down' | 'stable') {
  if (dir === 'up') return 'rgba(16, 185, 129, 0.08)'
  if (dir === 'down') return 'rgba(239, 68, 68, 0.08)'
  return 'rgba(156, 163, 175, 0.08)'
}

function formatCurrency(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${Math.round(value / 1_000).toLocaleString()}K`
  return `$${value.toLocaleString()}`
}

watch(() => props.city, () => {
  fetchInsights()
})

onMounted(() => {
  fetchInsights()
})
</script>

<template>
  <div class="market-insights-panel">
    <!-- Loading -->
    <div v-if="loading" class="insights-loader">
      <div class="loader-card">
        <div class="loader-shimmer" />
        <div class="loader-content">
          <div class="loader-pulse" />
          <div>
            <div class="text-caption font-weight-bold tracking-wide">ANALYZING</div>
            <div class="text-body-2 text-medium-emphasis">Market data...</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="insights-error">
      <div class="loader-card">
        <div class="d-flex align-center gap-3">
          <v-icon color="grey" size="20">mdi-chart-timeline-variant-shimmer</v-icon>
          <div>
            <div class="text-caption font-weight-bold text-grey">MARKET INSIGHTS</div>
            <div class="text-caption text-medium-emphasis">{{ error }}</div>
          </div>
          <v-spacer />
          <v-btn icon variant="text" size="x-small" @click="fetchInsights">
            <v-icon size="16">mdi-refresh</v-icon>
          </v-btn>
        </div>
      </div>
    </div>

    <!-- No data -->
    <template v-else-if="!data" />

    <!-- Full-width Enterprise Panel -->
    <div v-else class="insights-enterprise">
      <!-- Dark Header Bar -->
      <div class="insights-dark-header">
        <div class="header-bg-pattern" />
        <div class="header-content">
          <div class="header-left">
            <div class="header-label">
              <v-icon size="12" class="mr-1">mdi-chart-timeline-variant-shimmer</v-icon>
              MARKET INTELLIGENCE
            </div>
            <h3 class="header-city">{{ data.city }}</h3>
          </div>

          <div class="header-center">
            <div
              class="market-signal"
              :style="{
                background: marketBadge?.bg,
                borderColor: marketBadge?.border,
                boxShadow: `0 0 24px ${marketBadge?.glow}`,
              }"
            >
              <div class="signal-dot" :style="{ background: marketBadge?.color }" />
              <span class="signal-label" :style="{ color: marketBadge?.color }">
                {{ marketBadge?.label }}
              </span>
            </div>
          </div>

          <div class="header-right">
            <div class="header-kpis">
              <div class="hkpi">
                <div class="hkpi-val">{{ data.overview.activeListings.toLocaleString() }}</div>
                <div class="hkpi-lbl">Active</div>
              </div>
              <div class="hkpi-sep" />
              <div class="hkpi">
                <div class="hkpi-val">{{ data.overview.soldLast30Days.toLocaleString() }}</div>
                <div class="hkpi-lbl">Sold 30d</div>
              </div>
              <div class="hkpi-sep" />
              <div class="hkpi">
                <div class="hkpi-val">{{ formatCurrency(data.overview.avgPrice) }}</div>
                <div class="hkpi-lbl">Avg Price</div>
              </div>
              <div class="hkpi-sep" />
              <div class="hkpi">
                <div class="hkpi-val">{{ formatCurrency(data.overview.medianPrice) }}</div>
                <div class="hkpi-lbl">Median</div>
              </div>
            </div>
            <v-btn
              icon
              variant="text"
              size="x-small"
              color="white"
              class="collapse-btn"
              @click="expanded = !expanded"
            >
              <v-icon size="18">{{ expanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
            </v-btn>
          </div>
        </div>
      </div>

      <!-- Expandable Body — horizontal 3-column layout -->
      <v-expand-transition>
        <div v-show="expanded" class="insights-body">
          <div class="body-grid">
            <!-- Column 1: Indicators -->
            <div class="body-col">
              <div class="section-head">
                <span class="section-icon"><v-icon size="13">mdi-pulse</v-icon></span>
                <span>KEY INDICATORS</span>
              </div>
              <div class="indicators-grid">
                <div
                  v-for="indicator in data.indicators"
                  :key="indicator.label"
                  class="indicator-card"
                  :title="indicator.description"
                >
                  <div class="indicator-top">
                    <div class="indicator-arrow" :style="{ background: directionBg(indicator.direction) }">
                      <v-icon :style="{ color: directionColor(indicator.direction) }" size="16">
                        {{ directionIcon(indicator.direction) }}
                      </v-icon>
                    </div>
                    <div class="indicator-value" :style="{ color: directionColor(indicator.direction) }">
                      {{ indicator.value }}
                    </div>
                  </div>
                  <div class="indicator-name">{{ indicator.label }}</div>
                </div>
              </div>
            </div>

            <!-- Column 2: Chart + Insights -->
            <div class="body-col body-col-mid">
              <div v-if="trendBars.length > 0" class="chart-block">
                <div class="section-head">
                  <span class="section-icon"><v-icon size="13">mdi-chart-bar</v-icon></span>
                  <span>SALES ACTIVITY</span>
                </div>
                <div class="mini-chart">
                  <div
                    v-for="(bar, i) in trendBars"
                    :key="i"
                    class="chart-bar-wrap"
                    :title="`${bar.label}: ${bar.value} sold — Avg ${formatCurrency(bar.price)}`"
                  >
                    <div class="chart-bar" :style="{ height: bar.height + '%' }" />
                    <div class="chart-label">{{ bar.label }}</div>
                  </div>
                </div>
              </div>

              <div v-if="data.insights.length > 0" class="insights-block">
                <div class="section-head">
                  <span class="section-icon"><v-icon size="13">mdi-brain</v-icon></span>
                  <span>AI INSIGHTS</span>
                </div>
                <div class="insight-items">
                  <div v-for="(insight, i) in data.insights" :key="i" class="insight-item">
                    <div class="insight-bullet">{{ i + 1 }}</div>
                    <span>{{ insight }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Column 3: Recommendation -->
            <div class="body-col">
              <div class="section-head">
                <span class="section-icon"><v-icon size="13">mdi-lightbulb-on-outline</v-icon></span>
                <span>RECOMMENDATION</span>
              </div>

              <div class="rec-toggle">
                <button class="toggle-btn" :class="{ active: activeTab === 'buyers' }" @click="activeTab = 'buyers'">
                  <v-icon size="15" class="mr-1">mdi-home-search</v-icon>
                  Buyers
                </button>
                <button class="toggle-btn" :class="{ active: activeTab === 'sellers' }" @click="activeTab = 'sellers'">
                  <v-icon size="15" class="mr-1">mdi-currency-usd</v-icon>
                  Sellers
                </button>
                <div class="toggle-slider" :class="{ right: activeTab === 'sellers' }" />
              </div>

              <v-fade-transition mode="out-in">
                <div
                  v-if="activeRecommendation"
                  :key="activeTab"
                  class="verdict-card"
                  :class="activeRecommendation.isFavorable ? 'verdict-positive' : 'verdict-negative'"
                >
                  <div class="verdict-header">
                    <div class="verdict-icon" :class="activeRecommendation.isFavorable ? 'icon-positive' : 'icon-negative'">
                      <v-icon size="18">
                        {{ activeRecommendation.isFavorable ? 'mdi-thumb-up' : 'mdi-shield-alert-outline' }}
                      </v-icon>
                    </div>
                    <div>
                      <div class="verdict-title">{{ activeRecommendation.verdict }}</div>
                      <div class="verdict-subtitle">
                        {{ activeTab === 'buyers' ? 'Buyer Advisory' : 'Seller Advisory' }}
                      </div>
                    </div>
                  </div>
                  <p class="verdict-detail">{{ activeRecommendation.detail }}</p>
                </div>
              </v-fade-transition>
            </div>
          </div>

          <!-- Footer -->
          <div class="insights-footer">
            <v-icon size="12" class="mr-1 text-grey">mdi-clock-outline</v-icon>
            <span>{{ new Date(data.generatedAt).toLocaleString() }}</span>
            <v-spacer />
            <button class="refresh-btn" @click="fetchInsights" :disabled="loading">
              <v-icon size="13">mdi-refresh</v-icon>
            </button>
          </div>
        </div>
      </v-expand-transition>
    </div>
  </div>
</template>

<style scoped>
/* ================================================
   FULL-WIDTH ENTERPRISE MARKET INSIGHTS PANEL
   ================================================ */

/* LOADER */
.loader-card {
  position: relative;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 24px;
  padding: 32px;
  overflow: hidden;
}

.loader-shimmer {
  position: absolute;
  top: 0; left: -100%;
  width: 200%; height: 100%;
  background: linear-gradient(90deg, transparent 25%, rgba(0,0,0,0.02) 50%, transparent 75%);
  animation: shimmer 2s ease-in-out infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-50%); }
  100% { transform: translateX(50%); }
}

.loader-content {
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
}

.loader-pulse {
  width: 40px; height: 40px;
  border-radius: 12px;
  background: #000;
  animation: loaderPulse 1.5s ease-in-out infinite;
}

@keyframes loaderPulse {
  0%, 100% { opacity: 0.15; transform: scale(0.95); }
  50% { opacity: 0.3; transform: scale(1); }
}

.tracking-wide { letter-spacing: 0.15em; }

/* ENTERPRISE CONTAINER */
.insights-enterprise {
  border-radius: 24px;
  overflow: hidden;
  border: 1px solid #e0e0e0;
  background: #fff;
  box-shadow: 0 12px 48px rgba(0,0,0,0.07);
}

/* ---- DARK HEADER (horizontal) ---- */
.insights-dark-header {
  position: relative;
  background: #0a0a0a;
  padding: 20px 28px;
  overflow: hidden;
}

.header-bg-pattern {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 85% 30%, rgba(255, 152, 0, 0.08) 0%, transparent 50%),
    radial-gradient(circle at 15% 70%, rgba(25, 118, 210, 0.06) 0%, transparent 50%);
}

.header-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 24px;
}

.header-left {
  flex-shrink: 0;
}

.header-label {
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.3em;
  color: #FF9800;
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.header-city {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 1.15rem;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.02em;
  margin: 0;
  white-space: nowrap;
}

.header-center {
  flex-shrink: 0;
}

.market-signal {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  border-radius: 100px;
  border: 1px solid;
  transition: all 0.4s ease;
}

.signal-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  animation: signalPulse 2s ease-in-out infinite;
}

@keyframes signalPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.signal-label {
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.2em;
}

.header-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 20px;
}

.header-kpis {
  display: flex;
  align-items: center;
  gap: 16px;
}

.hkpi {
  text-align: center;
}

.hkpi-val {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 0.95rem;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.02em;
  white-space: nowrap;
}

.hkpi-lbl {
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: rgba(255,255,255,0.4);
  text-transform: uppercase;
  margin-top: 1px;
}

.hkpi-sep {
  width: 1px;
  height: 24px;
  background: rgba(255,255,255,0.1);
  flex-shrink: 0;
}

.collapse-btn {
  opacity: 0.5;
  transition: opacity 0.2s;
}

.collapse-btn:hover {
  opacity: 1;
}

/* ---- BODY (3 columns) ---- */
.insights-body {
  border-top: 1px solid #f0f0f0;
}

.body-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
}

.body-col {
  padding: 22px 24px;
}

.body-col + .body-col {
  border-left: 1px solid #f0f0f0;
}

.body-col-mid {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* SECTION HEADINGS */
.section-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.2em;
  color: #9e9e9e;
  margin-bottom: 14px;
}

.section-icon {
  width: 22px; height: 22px;
  border-radius: 6px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* INDICATORS (2x3 grid) */
.indicators-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.indicator-card {
  padding: 12px;
  border-radius: 12px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  transition: all 0.25s ease;
  cursor: default;
}

.indicator-card:hover {
  background: #f5f5f5;
  border-color: #e0e0e0;
  transform: translateY(-1px);
}

.indicator-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.indicator-arrow {
  width: 28px; height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.indicator-value {
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.indicator-name {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #757575;
  line-height: 1.3;
}

/* MINI CHART */
.mini-chart {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 56px;
  padding-bottom: 16px;
  position: relative;
}

.chart-bar-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
  cursor: default;
  position: relative;
}

.chart-bar {
  width: 100%;
  min-height: 3px;
  background: #87CEFA;
  border-radius: 4px 4px 0 0;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.chart-bar-wrap:hover .chart-bar {
  background: #FF9800;
  transform: scaleY(1.08);
}

.chart-label {
  font-size: 0.48rem;
  font-weight: 700;
  color: #bdbdbd;
  letter-spacing: 0.04em;
  margin-top: 4px;
  position: absolute;
  bottom: -14px;
}

/* AI INSIGHTS */
.insight-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.insight-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.72rem;
  line-height: 1.5;
  color: #555;
}

.insight-bullet {
  width: 18px; height: 18px;
  border-radius: 5px;
  background: #f5f5f5;
  border: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.5rem;
  font-weight: 800;
  color: #9e9e9e;
  flex-shrink: 0;
  margin-top: 1px;
}

/* RECOMMENDATION */
.rec-toggle {
  position: relative;
  display: flex;
  background: #f5f5f5;
  border-radius: 10px;
  padding: 3px;
  margin-bottom: 14px;
  border: 1px solid #eee;
}

.toggle-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #9e9e9e;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 8px;
  position: relative;
  z-index: 2;
  transition: color 0.3s ease;
}

.toggle-btn.active {
  color: #fff;
}

.toggle-slider {
  position: absolute;
  top: 3px; left: 3px;
  width: calc(50% - 3px);
  height: calc(100% - 6px);
  background: #111;
  border-radius: 8px;
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 1;
}

.toggle-slider.right {
  transform: translateX(100%);
}

.verdict-card {
  border-radius: 14px;
  padding: 18px;
  border: 1px solid;
}

.verdict-positive {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.04) 0%, rgba(16, 185, 129, 0.02) 100%);
  border-color: rgba(16, 185, 129, 0.15);
}

.verdict-negative {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.04) 0%, rgba(239, 68, 68, 0.02) 100%);
  border-color: rgba(239, 68, 68, 0.15);
}

.verdict-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.verdict-icon {
  width: 36px; height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-positive { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.icon-negative { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

.verdict-title {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 0.85rem;
  font-weight: 800;
  color: #111;
  letter-spacing: -0.01em;
}

.verdict-subtitle {
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #9e9e9e;
  text-transform: uppercase;
}

.verdict-detail {
  font-size: 0.76rem;
  line-height: 1.65;
  color: #555;
  margin: 0;
}

/* FOOTER */
.insights-footer {
  display: flex;
  align-items: center;
  padding: 10px 28px;
  font-size: 0.58rem;
  font-weight: 600;
  color: #bdbdbd;
  background: #fafafa;
  border-top: 1px solid #f0f0f0;
}

.refresh-btn {
  width: 26px; height: 26px;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #9e9e9e;
}

.refresh-btn:hover {
  background: #111;
  border-color: #111;
  color: #fff;
  transform: rotate(90deg);
}

.refresh-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

/* ---- RESPONSIVE ---- */
@media (max-width: 1264px) {
  .body-grid {
    grid-template-columns: 1fr 1fr;
  }

  .body-col:nth-child(3) {
    grid-column: 1 / -1;
    border-left: none;
    border-top: 1px solid #f0f0f0;
  }
}

@media (max-width: 960px) {
  .header-content {
    flex-wrap: wrap;
    gap: 12px;
  }

  .header-kpis {
    display: none;
  }

  .body-grid {
    grid-template-columns: 1fr;
  }

  .body-col + .body-col {
    border-left: none;
    border-top: 1px solid #f0f0f0;
  }

  .indicators-grid {
    grid-template-columns: 1fr 1fr 1fr;
  }
}

@media (max-width: 600px) {
  .insights-dark-header {
    padding: 16px 20px;
  }

  .body-col {
    padding: 18px 20px;
  }

  .indicators-grid {
    grid-template-columns: 1fr 1fr;
  }

  .header-city {
    font-size: 1rem;
  }
}
</style>
