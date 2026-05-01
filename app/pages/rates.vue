<template>
  <div class="public-rates">
    <!-- ── Hero ─────────────────────────────────────────────────────────── -->
    <section class="hero">
      <v-container class="py-md-12 py-8">
        <div class="d-flex align-center mb-3">
          <div class="premium-accent-bar mr-4" />
          <span class="text-overline letter-spacing-2 text-gold">Live Rate Board</span>
        </div>
        <v-row align="end">
          <v-col cols="12" md="8">
            <h1 class="display-serif hero-title mb-3">Mortgage &amp; Lending Rates</h1>
            <p class="text-body-1 hero-sub mb-0">
              The lender rates we're tracking right now, paired with the Bank of Canada's national
              weighted-average rates from chartered banks. Use them as a starting point — actual rates
              depend on your file, the lender, and the day.
            </p>
          </v-col>
          <v-col cols="12" md="4" class="text-md-right">
            <div class="hero-stamp d-inline-block px-4 py-3">
              <div class="text-overline letter-spacing-1 text-gold mb-1">Updated</div>
              <div class="display-serif text-h6 lh-1">{{ updatedLabel }}</div>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <v-container class="py-md-8 py-4">
      <!-- ── 1. Posted (curated) bank rates ───────────────────────────── -->
      <section v-if="postedLoaded" class="mb-md-12 mb-8">
        <div class="d-flex align-center mb-4">
          <v-icon color="primary" size="22" class="mr-2">mdi-bank-outline</v-icon>
          <span class="display-serif text-h5">Today's lender posted rates</span>
          <v-spacer />
          <v-chip
            v-if="postedRates.length > 0 && posted.updatedAt"
            size="x-small"
            color="primary"
            variant="tonal"
            class="font-weight-bold"
          >
            Refreshed {{ relative(posted.updatedAt) }}
          </v-chip>
        </div>

        <div v-if="postedRates.length === 0" class="empty-callout pa-6 text-center">
          <v-icon size="40" color="grey-lighten-1" class="mb-3">mdi-bank-outline</v-icon>
          <div class="display-serif text-h6 mb-1">No lender rates posted yet</div>
          <p class="text-body-2 text-medium-emphasis mb-0">
            Check back soon — in the meantime, scroll down for the national market averages.
          </p>
        </div>

        <div v-else class="bank-grid">
          <article
            v-for="group in postedByBank"
            :key="group.bank"
            class="bank-board"
            :class="{ 'bank-board--highlight': group.hasHighlight }"
          >
            <header class="bank-board__head">
              <div class="bank-board__mark mr-3">
                <img
                  v-if="group.logoUrl"
                  :src="group.logoUrl"
                  :alt="`${group.bank} logo`"
                  class="bank-board__logo"
                  loading="lazy"
                />
                <v-avatar v-else :color="bankColor(group.bank)" size="40" class="text-white font-weight-bold">
                  {{ bankInitials(group.bank) }}
                </v-avatar>
              </div>
              <div>
                <div class="display-serif text-h6 lh-1">{{ group.bank }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ group.rows.length }} {{ group.rows.length === 1 ? 'rate' : 'rates' }}
                </div>
              </div>
            </header>
            <ul class="bank-board__list">
              <li
                v-for="row in group.rows"
                :key="row.id"
                class="bank-board__row"
                :class="{ 'bank-board__row--highlight': row.highlight }"
              >
                <div class="bank-board__product">
                  <div class="bank-board__product-name">
                    {{ row.product }}
                    <v-chip
                      v-if="row.highlight"
                      size="x-small"
                      color="warning"
                      variant="flat"
                      class="ml-1 highlight-chip"
                    >
                      <v-icon size="10" start>mdi-star</v-icon>
                      Featured
                    </v-chip>
                  </div>
                  <div v-if="row.term || row.notes" class="bank-board__product-meta">
                    <span v-if="row.term">{{ row.term }}</span>
                    <span v-if="row.term && row.notes"> · </span>
                    <span v-if="row.notes">{{ row.notes }}</span>
                  </div>
                </div>
                <div class="bank-board__rate">{{ formatPercent(row.rate) }}</div>
              </li>
            </ul>
          </article>
        </div>
      </section>

      <!-- ── 2. Bank of Canada market averages ────────────────────────── -->
      <section>
        <div class="d-flex align-center mb-3">
          <v-icon color="primary" size="22" class="mr-2">mdi-chart-line-variant</v-icon>
          <span class="display-serif text-h5">National market averages</span>
          <v-spacer />
          <v-chip
            v-if="market?.asOf"
            size="x-small"
            color="primary"
            variant="tonal"
            class="font-weight-bold"
          >
            As of {{ formatMonth(market.asOf) }}
          </v-chip>
        </div>
        <p class="text-body-2 text-medium-emphasis mb-5" style="max-width: 720px">
          Sourced live from the Bank of Canada's Valet API. These are volume-weighted averages across
          every reporting chartered bank — not posted rates from any one lender.
        </p>

        <v-tabs v-model="activeTab" color="primary" density="compact" class="mb-4 market-tabs">
          <v-tab v-for="tab in TABS" :key="tab.value" :value="tab.value">
            <v-icon size="16" class="mr-1">{{ tab.icon }}</v-icon>
            {{ tab.label }}
          </v-tab>
        </v-tabs>

        <div v-if="!market && marketLoading" class="market-loading">
          <v-progress-circular indeterminate color="primary" />
          <p class="text-caption text-medium-emphasis mt-3">Fetching latest rates from the Bank of Canada…</p>
        </div>

        <v-alert
          v-else-if="marketError"
          type="warning"
          variant="tonal"
          density="compact"
          class="mb-4"
        >
          {{ marketError }}
        </v-alert>

        <div v-else-if="market" class="market-grid">
          <article
            v-for="rate in marketForTab"
            :key="rate.id"
            class="market-card"
            :class="{ 'market-card--highlight': rate.highlight }"
          >
            <div class="market-card__lbl">{{ rate.label }}</div>
            <div class="market-card__num">
              <span v-if="rate.current != null">{{ formatPercent(rate.current) }}</span>
              <span v-else class="text-medium-emphasis">—</span>
            </div>
            <div class="market-card__delta" :class="deltaClass(rate.delta)">
              <v-icon v-if="rate.delta != null" size="14" class="mr-1">
                {{ rate.delta > 0 ? 'mdi-arrow-up-thin' : rate.delta < 0 ? 'mdi-arrow-down-thin' : 'mdi-minus' }}
              </v-icon>
              <span v-if="rate.delta != null">
                {{ Math.abs(rate.delta).toFixed(2) }} pp vs prior month
              </span>
              <span v-else>Single month of data</span>
            </div>

            <Sparkline
              v-if="rate.history.length > 1"
              :points="rate.history.slice().reverse().map(p => p.value)"
              :positive="(rate.delta ?? 0) <= 0"
            />

            <div class="market-card__group">{{ rate.group }}</div>
          </article>
        </div>
      </section>

      <!-- Disclaimer -->
      <section class="mt-md-12 mt-8">
        <v-card class="disclaimer-card pa-md-5 pa-4" elevation="0">
          <div class="d-flex align-start ga-3">
            <v-icon color="warning" size="20" class="mt-1">mdi-information-outline</v-icon>
            <div>
              <div class="font-weight-bold text-body-2 mb-1">About these numbers</div>
              <p class="text-caption text-medium-emphasis mb-2">
                <strong>Posted lender rates</strong> are curated by our team and refreshed manually as
                lenders publish updates. They reflect what the bank advertises, not necessarily what
                you'll qualify for.
              </p>
              <p class="text-caption text-medium-emphasis mb-2">
                <strong>National market averages</strong> are weighted across all chartered banks and
                published monthly by the Bank of Canada
                (<a href="https://www.bankofcanada.ca/valet/docs" target="_blank" rel="noopener" class="text-gold">Valet API</a>).
                Per-bank averages are not made public by the source.
              </p>
              <p class="text-caption text-medium-emphasis mb-0">
                <strong>Processing delay:</strong> although we aim for timely updates, there may be a
                brief delay between when the Bank of Canada publishes new data and when it appears in
                the API. If you don't see today's numbers right away, check back later in the day.
              </p>
            </div>
          </div>
        </v-card>
      </section>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h, defineComponent } from 'vue'

definePageMeta({ layout: 'default' })

useHead({
  title: 'Mortgage & Lending Rates | Live Bank of Canada averages + lender posted rates',
  meta: [
    {
      name: 'description',
      content:
        "Today's posted mortgage rates from major Canadian lenders alongside the Bank of Canada's national chartered-bank averages — refreshed live from the Valet API.",
    },
  ],
})

// ── Types ─────────────────────────────────────────────────────────────────
interface PostedRate {
  id: number
  bank: string
  bankLogoUrl: string | null
  category: string
  product: string
  term: string | null
  rate: number
  effectiveDate: string
  notes: string | null
  highlight: boolean
}
interface PostedResponse { rates: PostedRate[]; updatedAt: string | null }

interface MarketRate {
  id: string
  label: string
  category: 'mortgage_insured' | 'mortgage_uninsured' | 'variable' | 'consumer' | 'business'
  group: string
  highlight: boolean
  current: number | null
  previous: number | null
  delta: number | null
  asOf: string | null
  history: Array<{ date: string; value: number }>
}
interface MarketResponse {
  source: string
  fetchedAt: string
  asOf: string | null
  cached: boolean
  rates: MarketRate[]
}

// ── State ─────────────────────────────────────────────────────────────────
const posted = ref<PostedResponse>({ rates: [], updatedAt: null })
const postedLoaded = ref(false)
const market = ref<MarketResponse | null>(null)
const marketLoading = ref(true)
const marketError = ref('')
const activeTab = ref<'mortgage' | 'variable' | 'consumer' | 'business'>('mortgage')

const TABS = [
  { value: 'mortgage' as const, label: 'Mortgages',     icon: 'mdi-home-city-outline' },
  { value: 'variable' as const, label: 'Variable rate', icon: 'mdi-chart-bell-curve' },
  { value: 'consumer' as const, label: 'Consumer credit', icon: 'mdi-credit-card-outline' },
  { value: 'business' as const, label: 'Business loans', icon: 'mdi-domain' },
]

const postedRates = computed(() => posted.value.rates)

const postedByBank = computed(() => {
  const map = new Map<string, { bank: string; rows: PostedRate[]; hasHighlight: boolean; logoUrl: string | null }>()
  for (const r of postedRates.value) {
    const g = map.get(r.bank) ?? { bank: r.bank, rows: [], hasHighlight: false, logoUrl: null }
    g.rows.push(r)
    if (r.highlight) g.hasHighlight = true
    if (!g.logoUrl && r.bankLogoUrl) g.logoUrl = r.bankLogoUrl
    map.set(r.bank, g)
  }
  return Array.from(map.values()).sort((a, b) => a.bank.localeCompare(b.bank))
})

const marketForTab = computed(() => {
  if (!market.value) return []
  if (activeTab.value === 'mortgage') {
    // Combine insured + uninsured into the mortgages tab.
    return market.value.rates.filter(r =>
      r.category === 'mortgage_insured' || r.category === 'mortgage_uninsured',
    )
  }
  return market.value.rates.filter(r => r.category === activeTab.value)
})

const updatedLabel = computed(() => {
  // Prefer the manual update (because that's what the agent controls) — fall
  // back to the Bank of Canada stamp.
  if (posted.value.updatedAt) {
    return new Date(posted.value.updatedAt).toLocaleDateString('en-CA', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  }
  if (market.value?.asOf) return formatMonth(market.value.asOf)
  return '—'
})

// ── Loaders ───────────────────────────────────────────────────────────────
async function loadPosted() {
  try {
    posted.value = await $fetch<PostedResponse>('/api/public/rates/posted')
  } catch (e) {
    console.error('Failed to load posted rates:', e)
  } finally {
    postedLoaded.value = true
  }
}

async function loadMarket() {
  marketLoading.value = true
  marketError.value = ''
  try {
    market.value = await $fetch<MarketResponse>('/api/public/rates/market')
  } catch (e: any) {
    marketError.value = e?.data?.statusMessage || 'Could not load market averages right now. Please refresh in a moment.'
    console.error('Failed to load market rates:', e)
  } finally {
    marketLoading.value = false
  }
}

onMounted(() => {
  loadPosted()
  loadMarket()
})

// ── Display helpers ───────────────────────────────────────────────────────
function formatPercent(n: number) {
  return (Number(n) || 0).toFixed(2) + '%'
}
function formatMonth(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'long' })
}
function relative(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0) return 'just now'
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  if (days < 1) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}
function deltaClass(delta: number | null) {
  if (delta == null) return 'text-medium-emphasis'
  if (delta > 0)    return 'delta-up'
  if (delta < 0)    return 'delta-down'
  return 'text-medium-emphasis'
}
function bankInitials(bank: string) {
  const parts = bank.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]!.slice(0, 3).toUpperCase()
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
}
function bankColor(bank: string): string {
  const palette = ['#003168', '#12824C', '#EE3124', '#0079C1', '#C8102E', '#E1251B', '#8c734b', '#5a4a30', '#6c757d']
  let h = 0
  for (let i = 0; i < bank.length; i++) h = (h * 31 + bank.charCodeAt(i)) >>> 0
  return palette[h % palette.length]!
}

// ── Tiny inline sparkline (SVG) ───────────────────────────────────────────
// Self-contained so the public /rates page doesn't need to ship the full
// echarts bundle just to draw twelve pixels per card.
const Sparkline = defineComponent({
  name: 'Sparkline',
  props: {
    points: { type: Array as () => number[], required: true },
    positive: { type: Boolean, default: true }, // green when "good for the borrower" (= rate going down)
  },
  setup(props) {
    return () => {
      const pts = props.points
      if (!pts.length) return h('div')
      const W = 120, H = 32, P = 2
      const min = Math.min(...pts)
      const max = Math.max(...pts)
      const span = Math.max(0.0001, max - min)
      const step = pts.length > 1 ? (W - P * 2) / (pts.length - 1) : 0
      const path = pts
        .map((v, i) => {
          const x = (P + i * step).toFixed(2)
          const y = (P + (H - P * 2) * (1 - (v - min) / span)).toFixed(2)
          return `${i === 0 ? 'M' : 'L'}${x},${y}`
        })
        .join(' ')
      const color = props.positive ? '#2e7d32' : '#c62828'
      return h(
        'svg',
        { class: 'spark', viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-hidden': 'true' },
        [
          h('path', { d: path, fill: 'none', stroke: color, 'stroke-width': 1.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }),
        ],
      )
    }
  },
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;500;600;700&display=swap');

.public-rates {
  background-color: #fcfcfb;
  font-family: 'Inter', sans-serif;
  min-height: 100vh;
}
.display-serif { font-family: 'Playfair Display', serif; }
.text-gold { color: #8c734b; }
.letter-spacing-1 { letter-spacing: 1px; }
.letter-spacing-2 { letter-spacing: 2px; }
.lh-1 { line-height: 1; }
.ga-3 { gap: 12px; }
.premium-accent-bar { width: 40px; height: 4px; background: #8c734b; border-radius: 2px; }

/* ── Hero ─────────────────────────────────────────────────────────────── */
.hero {
  background:
    radial-gradient(circle at 90% 0%, rgba(140, 115, 75, 0.08), transparent 50%),
    linear-gradient(180deg, #ffffff 0%, #fcfcfb 100%);
  border-bottom: 1px solid rgba(0,0,0,0.04);
}
.hero-title {
  font-size: clamp(2.4rem, 5vw, 3.6rem);
  line-height: 1.05;
  letter-spacing: -0.5px;
}
.hero-sub { color: rgba(0,0,0,0.62); max-width: 640px; line-height: 1.6; }
.hero-stamp {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid rgba(140, 115, 75, 0.2);
}

/* ── Empty callout ────────────────────────────────────────────────────── */
.empty-callout {
  border-radius: 18px;
  background: #ffffff;
  border: 1px dashed rgba(0,0,0,0.08);
}

/* ── Posted (curated) rates ───────────────────────────────────────────── */
.bank-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}
.bank-board {
  background: #ffffff;
  border-radius: 18px;
  border: 1px solid rgba(0,0,0,0.06);
  overflow: hidden;
}
.bank-board--highlight {
  border-color: rgba(140, 115, 75, 0.4);
  box-shadow: 0 4px 20px rgba(140, 115, 75, 0.08);
}
.bank-board__head {
  display: flex;
  align-items: center;
  padding: 16px 18px;
  background: linear-gradient(180deg, rgba(140, 115, 75, 0.04), transparent);
  border-bottom: 1px solid rgba(0,0,0,0.04);
}
.bank-board__mark {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.bank-board__logo {
  max-width: 48px;
  max-height: 48px;
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
}
.bank-board__list { list-style: none; padding: 4px 0; margin: 0; }
.bank-board__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px;
  gap: 12px;
}
.bank-board__row + .bank-board__row {
  border-top: 1px solid rgba(0,0,0,0.04);
}
.bank-board__row--highlight {
  background: linear-gradient(90deg, rgba(255, 152, 0, 0.06), transparent);
}
.bank-board__product {
  flex: 1 1 0;
  min-width: 0;
}
.bank-board__product-name {
  font-weight: 600;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}
.bank-board__product-meta {
  font-size: 11px;
  color: rgba(0,0,0,0.55);
  margin-top: 2px;
}
.bank-board__rate {
  font-family: 'Playfair Display', serif;
  font-size: 22px;
  color: #5a4a30;
  flex: 0 0 auto;
}
.highlight-chip { font-weight: 700 !important; letter-spacing: 0.5px; }

/* ── Market averages ──────────────────────────────────────────────────── */
.market-tabs :deep(.v-tab) {
  text-transform: none;
  font-weight: 600;
  letter-spacing: 0;
}
.market-loading {
  text-align: center;
  padding: 40px 16px;
}
.market-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}
.market-card {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid rgba(0,0,0,0.06);
  padding: 16px 18px;
  position: relative;
  display: flex;
  flex-direction: column;
}
.market-card--highlight {
  border-color: rgba(140, 115, 75, 0.35);
  background: linear-gradient(180deg, rgba(140, 115, 75, 0.04), #ffffff 50%);
}
.market-card__lbl {
  font-size: 11px;
  color: rgba(0,0,0,0.6);
  letter-spacing: 0.4px;
  font-weight: 600;
  line-height: 1.35;
  min-height: 30px;
}
.market-card__num {
  font-family: 'Playfair Display', serif;
  font-size: 32px;
  line-height: 1.1;
  color: #2c2418;
  margin: 6px 0 4px;
}
.market-card__delta {
  font-size: 11px;
  display: flex;
  align-items: center;
  letter-spacing: 0.3px;
  margin-bottom: 6px;
}
.delta-up   { color: #c62828; }
.delta-down { color: #2e7d32; }

.market-card__group {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(0,0,0,0.4);
  margin-top: auto;
  padding-top: 8px;
  font-weight: 600;
}
:deep(.spark) {
  margin: 4px 0 4px;
  display: block;
}

/* ── Disclaimer ───────────────────────────────────────────────────────── */
.disclaimer-card {
  border-radius: 16px !important;
  background: linear-gradient(135deg, #ffffff, #fff8e8) !important;
  border: 1px solid rgba(255, 152, 0, 0.2) !important;
}
.disclaimer-card a { text-decoration: none; font-weight: 600; }
.disclaimer-card a:hover { text-decoration: underline; }
</style>
