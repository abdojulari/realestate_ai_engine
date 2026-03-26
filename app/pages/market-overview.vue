<template>
  <div class="mo-page">
    <!-- Hero -->
    <section class="mo-hero">
      <div class="mo-hero-grain"></div>
      <div class="mo-hero-glow mo-glow-1"></div>
      <div class="mo-hero-glow mo-glow-2"></div>

      <v-container class="mo-hero-content">
        <v-row align="center" justify="center" class="text-center">
          <v-col cols="12" md="10" lg="7">
            <div class="mo-hero-chip">
              <span class="mo-chip-dot"></span>
              Market Insights
            </div>
            <h1 class="mo-hero-title">
              Alberta Real Estate<br class="hidden-sm-and-down" />
              <span class="mo-hero-accent">Market Intelligence</span>
            </h1>
            <p class="mo-hero-desc">
              Access comprehensive neighborhood analytics, pricing trends and
              inventory data across Alberta&rsquo;s most vibrant cities.
            </p>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Main Content -->
    <section class="mo-content">
      <v-container>
        <!-- City Overview Card -->
        <div class="mo-card-wrapper mo-pull-up">
          <div class="mo-glass-card">
            <CityMarketOverview @city-selected="handleCitySelected" />
          </div>
        </div>

        <!-- Neighborhood Section -->
        <div v-if="showNeighborhoodData" class="mo-card-wrapper mt-14">
          <div class="mo-section-header">
            <div>
              <h2 class="mo-section-title">Neighborhood Breakdown</h2>
              <div class="mo-section-bar"></div>
            </div>
            <div class="mo-section-chip">
              <v-icon size="14" class="mr-1">mdi-chart-bell-curve</v-icon>
              Beta Access
            </div>
          </div>

          <div class="mo-info-banner">
            <v-icon size="20" color="white" class="mr-3">mdi-lightbulb-on-outline</v-icon>
            <div>
              <div class="mo-banner-title">Insights Expanding</div>
              <div class="mo-banner-desc">We are currently indexing localized data. The following metrics represent curated sample sets for key Alberta regions.</div>
            </div>
          </div>

          <div class="mo-glass-card">
            <NeighborhoodMarketOverview @city-selected="handleCitySelected" />
          </div>
        </div>

        <!-- City Dialog -->
        <v-dialog
          v-model="showCityDialog"
          max-width="850px"
          scrollable
          transition="dialog-bottom-transition"
        >
          <v-card class="mo-dialog-card">
            <v-card-title class="mo-dialog-header">
              <div class="d-flex align-center">
                <div class="mo-dialog-icon">
                  <v-icon size="24" color="white">mdi-city-variant-outline</v-icon>
                </div>
                <div class="ml-4">
                  <div class="mo-dialog-overline">City Analytics</div>
                  <div class="mo-dialog-name">{{ selectedCity }}</div>
                </div>
              </div>
              <v-btn icon="mdi-close" variant="text" size="small" @click="showCityDialog = false" />
            </v-card-title>

            <v-divider />

            <v-card-text class="pa-0">
              <div v-if="loadingCityDetails" class="text-center py-16">
                <v-progress-circular indeterminate color="#0f172a" size="56" width="3" />
                <p class="mt-6 mo-dialog-loading-text">Gathering intelligence&hellip;</p>
              </div>

              <div v-else-if="cityNeighborhoods.length > 0">
                <v-data-table
                  :headers="cityDetailHeaders"
                  :items="cityNeighborhoods"
                  :items-per-page="10"
                  class="mo-dialog-table"
                  hover
                >
                  <template #item.name="{ item }">
                    <div class="py-3">
                      <div class="font-weight-bold" style="color: #1e293b;">{{ item.name }}</div>
                      <div class="text-caption" style="color: #94a3b8;">Residential Zone</div>
                    </div>
                  </template>

                  <template #item.propertyCount="{ item }">
                    <span class="mo-dialog-count" :class="getCountClass(item.propertyCount)">
                      {{ item.propertyCount }} Active
                    </span>
                  </template>

                  <template #item.averagePrice="{ item }">
                    <div class="text-right">
                      <div class="font-weight-black" style="color: #0f172a;">{{ formatPrice(item.averagePrice) }}</div>
                      <div style="font-size: 0.6rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Avg Listing</div>
                    </div>
                  </template>
                </v-data-table>
              </div>

              <div v-else class="text-center py-16 px-6">
                <v-icon size="56" color="#cbd5e1">mdi-database-off-outline</v-icon>
                <h3 class="mt-4" style="color: #475569;">No Localized Data</h3>
                <p style="color: #94a3b8;">Collecting neighborhood-level metrics for {{ selectedCity }}.</p>
              </div>
            </v-card-text>

            <v-divider />

            <v-card-actions class="pa-5">
              <v-btn
                color="#0f172a"
                variant="flat"
                size="large"
                block
                rounded="lg"
                class="text-none font-weight-bold"
                @click="searchPropertiesInCity"
              >
                Browse Properties in {{ selectedCity }}
                <v-icon end size="18" class="ml-2">mdi-arrow-right</v-icon>
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-container>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

definePageMeta({
  title: 'Market Overview - Alberta Real Estate',
  description: 'Comprehensive overview of Alberta real estate market by neighborhoods and cities'
})

const showCityDialog = ref(false)
const selectedCity = ref('')
const loadingCityDetails = ref(false)
const cityNeighborhoods = ref<any[]>([])
const showNeighborhoodData = ref(false)

const cityDetailHeaders = [
  { title: 'Neighborhood', key: 'name', sortable: true, align: 'start' as const },
  { title: 'Availability', key: 'propertyCount', sortable: true, align: 'center' as const },
  { title: 'Market Value', key: 'averagePrice', sortable: true, align: 'end' as const }
]

const formatPrice = (price: number): string => {
  if (!price) return 'N/A'
  if (price >= 1000000) return `$${(price / 1000000).toFixed(2)}M`
  if (price >= 1000) return `$${(price / 1000).toFixed(0)}K`
  return `$${price.toLocaleString()}`
}

const getCountClass = (count: number): string => {
  if (count >= 50) return 'count-high'
  if (count >= 25) return 'count-mid'
  if (count >= 10) return 'count-low'
  return 'count-min'
}

const handleCitySelected = async (city: string) => {
  selectedCity.value = city
  showCityDialog.value = true
  loadingCityDetails.value = true
  try {
    const response = await $fetch<{ neighborhoods: any[], pagination: any }>(
      `/api/neighborhoods?city=${encodeURIComponent(city)}&limit=100`
    )
    cityNeighborhoods.value = response.neighborhoods || []
  } catch (error) {
    console.error('Error loading city neighborhoods:', error)
    cityNeighborhoods.value = []
  } finally {
    loadingCityDetails.value = false
  }
}

const searchPropertiesInCity = () => {
  navigateTo({ path: '/properties', query: { city: selectedCity.value } })
  showCityDialog.value = false
}

useHead({
  title: 'Alberta Real Estate Intelligence | Market Overview',
  meta: [
    { name: 'description', content: 'Explore high-fidelity market data for Alberta real estate. Detailed neighborhood stats, average pricing, and inventory levels for Calgary, Edmonton, and surrounding areas.' }
  ]
})
</script>

<style scoped>
.mo-page {
  min-height: 100vh;
  background: #f1f5f9;
}

/* ═══════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════ */
.mo-hero {
  background: #0f172a;
  position: relative;
  padding: 100px 0 120px;
  overflow: hidden;
}
.mo-hero-grain {
  position: absolute; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
  opacity: 0.5;
  pointer-events: none;
}
.mo-hero-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
}
.mo-glow-1 {
  width: 400px; height: 400px;
  top: -120px; right: -60px;
  background: rgba(59, 130, 246, 0.15);
}
.mo-glow-2 {
  width: 300px; height: 300px;
  bottom: -80px; left: -40px;
  background: rgba(16, 185, 129, 0.1);
}
.mo-hero-content { position: relative; z-index: 1; }

.mo-hero-chip {
  display: inline-flex; align-items: center; gap: 8px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 20px;
  padding: 6px 18px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: rgba(255,255,255,0.7);
  margin-bottom: 28px;
  backdrop-filter: blur(8px);
}
.mo-chip-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #10b981;
  animation: pulse-dot 2s ease-in-out infinite;
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(16,185,129,0.4); }
  50% { opacity: 0.7; box-shadow: 0 0 0 6px rgba(16,185,129,0); }
}

.mo-hero-title {
  color: #fff;
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 900;
  letter-spacing: -0.03em;
  line-height: 1.1;
  margin-bottom: 20px;
}
.mo-hero-accent {
  background: linear-gradient(135deg, #3b82f6, #10b981);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-style: italic;
  font-weight: 400;
}
.mo-hero-desc {
  color: #94a3b8;
  font-size: 1.05rem;
  line-height: 1.7;
  max-width: 560px;
  margin: 0 auto;
}

/* ═══════════════════════════════════════════
   CONTENT
   ═══════════════════════════════════════════ */
.mo-content { padding-bottom: 80px; }

.mo-pull-up { margin-top: -60px; position: relative; z-index: 2; }

.mo-glass-card {
  background: #fff;
  border-radius: 20px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow:
    0 1px 3px rgba(0,0,0,0.04),
    0 8px 32px rgba(0,0,0,0.06),
    0 24px 60px rgba(0,0,0,0.04);
  overflow: hidden;
  transition: box-shadow 0.3s;
}
.mo-glass-card:hover {
  box-shadow:
    0 1px 3px rgba(0,0,0,0.04),
    0 12px 40px rgba(0,0,0,0.08),
    0 32px 72px rgba(0,0,0,0.05);
}

/* ── Section Header ── */
.mo-section-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 24px;
}
.mo-section-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.02em;
}
.mo-section-bar {
  width: 48px; height: 4px;
  background: linear-gradient(90deg, #0f172a, #3b82f6);
  border-radius: 2px;
  margin-top: 8px;
}
.mo-section-chip {
  display: inline-flex; align-items: center;
  padding: 5px 14px;
  border-radius: 8px;
  background: #0f172a;
  color: #94a3b8;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* ── Info Banner ── */
.mo-info-banner {
  display: flex; align-items: flex-start;
  background: linear-gradient(135deg, #1e3a5f, #0f172a);
  border-radius: 14px;
  padding: 18px 24px;
  margin-bottom: 20px;
}
.mo-banner-title { color: #fff; font-weight: 700; font-size: 0.9rem; margin-bottom: 2px; }
.mo-banner-desc { color: #94a3b8; font-size: 0.8rem; line-height: 1.5; }

/* ═══════════════════════════════════════════
   DIALOG
   ═══════════════════════════════════════════ */
.mo-dialog-card {
  border-radius: 20px !important;
  overflow: hidden;
}
.mo-dialog-header {
  display: flex !important;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px !important;
  background: #f8fafc;
}
.mo-dialog-icon {
  width: 44px; height: 44px; border-radius: 12px;
  background: #0f172a;
  display: flex; align-items: center; justify-content: center;
}
.mo-dialog-overline {
  font-size: 0.6rem; text-transform: uppercase;
  letter-spacing: 0.12em; color: #94a3b8; font-weight: 700;
}
.mo-dialog-name { font-size: 1.2rem; font-weight: 800; color: #0f172a; }
.mo-dialog-loading-text {
  font-size: 0.75rem; text-transform: uppercase;
  letter-spacing: 0.1em; color: #64748b;
}

.mo-dialog-table :deep(thead th) {
  background: #f8fafc !important;
  font-weight: 700 !important;
  text-transform: uppercase;
  font-size: 0.67rem !important;
  letter-spacing: 0.08em;
  color: #64748b !important;
  border-bottom: 2px solid #e2e8f0 !important;
}
.mo-dialog-table :deep(tbody tr:hover) { background: #f1f5f9 !important; }

.mo-dialog-count {
  display: inline-block; padding: 3px 12px; border-radius: 20px;
  font-weight: 700; font-size: 0.75rem;
}
.count-high { background: #0f172a; color: #fff; }
.count-mid { background: #eff6ff; color: #2563eb; }
.count-low { background: #ecfdf5; color: #059669; }
.count-min { background: #f1f5f9; color: #64748b; }

/* ═══════════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════════ */
@media (max-width: 768px) {
  .mo-hero { padding: 64px 0 80px; }
  .mo-pull-up { margin-top: -40px; }
  .mo-section-header { flex-direction: column; align-items: flex-start; gap: 12px; }
}
@media (max-width: 480px) {
  .mo-hero { padding: 48px 0 64px; }
  .mo-glass-card { border-radius: 14px; }
}
</style>
