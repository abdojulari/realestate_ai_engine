<template>
  <div class="buyers-playground">
    <!-- ── Hero ───────────────────────────────────────────────────────────── -->
    <section class="hero">
      <v-container class="py-md-12 py-8">
        <div class="d-flex align-center mb-3">
          <div class="premium-accent-bar mr-4" />
          <span class="text-overline letter-spacing-2 text-gold">Buyer's Playground</span>
        </div>
        <v-row align="end">
          <v-col cols="12" md="8">
            <h1 class="display-serif hero-title mb-3">Buy vs. Rent</h1>
            <p class="text-body-1 hero-sub mb-0">
              Drag the dials to see what really happens over the life of a mortgage. We model every dollar
              you'd hand to the bank, the city, the insurer, and the utility company — and stack it next to
              the same years spent renting.
            </p>
          </v-col>
          <v-col cols="12" md="4" class="text-md-right">
            <v-btn
              color="primary"
              size="large"
              class="premium-action-btn"
              prepend-icon="mdi-file-pdf-box"
              :loading="generatingPdf"
              @click="generatePdf"
            >
              Download PDF
            </v-btn>
            <v-btn
              variant="text"
              size="small"
              class="ml-2 reset-btn"
              prepend-icon="mdi-restore"
              @click="resetInputs"
            >
              Reset
            </v-btn>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <v-container class="py-md-8 py-4">
      <v-row>
        <!-- ── Inputs ──────────────────────────────────────────────────────── -->
        <v-col cols="12" md="5" lg="4" class="inputs-col">
          <v-card class="inputs-card pa-md-6 pa-4" elevation="0">
            <div class="d-flex align-center mb-4">
              <v-icon color="primary" size="22" class="mr-2">mdi-tune-vertical</v-icon>
              <span class="display-serif text-h6">Your scenario</span>
            </div>

            <div class="text-overline letter-spacing-1 text-gold mb-2">Buying</div>
            <v-text-field
              v-model.number="form.purchasePrice"
              label="Purchase price"
              prefix="$"
              type="number"
              variant="outlined"
              density="compact"
              hide-details="auto"
              class="mb-3"
            />
            <v-row dense>
              <v-col cols="6">
                <v-text-field
                  v-model.number="form.downPaymentPct"
                  label="Down payment"
                  suffix="%"
                  type="number"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  class="mb-3"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  :model-value="formatCurrency(downPaymentAmount)"
                  label="= Cash down"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  readonly
                  class="mb-3 readonly-field"
                />
              </v-col>
            </v-row>

            <v-row dense>
              <v-col cols="6">
                <v-text-field
                  v-model.number="form.interestRate"
                  label="Interest rate"
                  suffix="%"
                  type="number"
                  step="0.01"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  class="mb-3"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model.number="form.amortYears"
                  label="Amortization"
                  suffix="yrs"
                  type="number"
                  :min="5"
                  :max="30"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  class="mb-2"
                />
              </v-col>
            </v-row>
            <v-slider
              v-model.number="form.amortYears"
              :min="5"
              :max="30"
              :step="1"
              color="primary"
              hide-details
              thumb-label
              density="compact"
              class="mb-4"
            />

            <div class="text-overline letter-spacing-1 text-gold mb-2">Carrying costs</div>
            <v-row dense>
              <v-col cols="7">
                <v-text-field
                  v-model.number="form.propertyTaxAnnual"
                  label="Property tax (annual)"
                  prefix="$"
                  type="number"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  class="mb-3"
                />
              </v-col>
              <v-col cols="5">
                <v-text-field
                  v-model.number="form.propertyTaxGrowthPct"
                  label="Yearly +"
                  suffix="%"
                  type="number"
                  step="0.1"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  class="mb-3"
                />
              </v-col>
            </v-row>
            <v-row dense>
              <v-col cols="7">
                <v-text-field
                  v-model.number="form.insuranceAnnual"
                  label="Insurance (annual)"
                  prefix="$"
                  type="number"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  class="mb-3"
                />
              </v-col>
              <v-col cols="5">
                <v-text-field
                  v-model.number="form.insuranceGrowthPct"
                  label="Yearly +"
                  suffix="%"
                  type="number"
                  step="0.1"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  class="mb-3"
                />
              </v-col>
            </v-row>
            <v-row dense>
              <v-col cols="7">
                <v-text-field
                  v-model.number="form.utilitiesMonthly"
                  label="Utilities + other (monthly)"
                  prefix="$"
                  type="number"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  class="mb-3"
                />
              </v-col>
              <v-col cols="5">
                <v-text-field
                  v-model.number="form.utilitiesGrowthPct"
                  label="Yearly +"
                  suffix="%"
                  type="number"
                  step="0.1"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  class="mb-3"
                />
              </v-col>
            </v-row>

            <div class="text-overline letter-spacing-1 text-gold mb-2">Renting (same period)</div>
            <v-row dense>
              <v-col cols="7">
                <v-text-field
                  v-model.number="form.rentMonthly"
                  label="Rent (monthly)"
                  prefix="$"
                  type="number"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  class="mb-3"
                />
              </v-col>
              <v-col cols="5">
                <v-text-field
                  v-model.number="form.rentGrowthPct"
                  label="Yearly +"
                  suffix="%"
                  type="number"
                  step="0.1"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  class="mb-3"
                />
              </v-col>
            </v-row>

            <div class="text-overline letter-spacing-1 text-gold mb-2">Home value over time</div>
            <v-text-field
              v-model.number="form.appreciationPct"
              label="Annual home appreciation"
              suffix="%"
              type="number"
              step="0.1"
              variant="outlined"
              density="compact"
              hide-details="auto"
              hint="Conservative national average is ~2–4%/year"
              persistent-hint
            />
          </v-card>

          <p class="text-caption text-medium-emphasis mt-3 px-2">
            Your inputs are saved locally to this browser only — nothing leaves your device.
          </p>
        </v-col>

        <!-- ── Results ─────────────────────────────────────────────────────── -->
        <v-col cols="12" md="7" lg="8">
          <div id="bp-report">
            <!-- Verdict -->
            <v-card class="verdict-card pa-md-6 pa-5 mb-5" elevation="0">
              <div class="d-flex align-start ga-3">
                <div class="verdict-icon">
                  <v-icon :color="netAdvantage >= 0 ? 'success' : 'warning'" size="28">
                    {{ netAdvantage >= 0 ? 'mdi-trending-up' : 'mdi-scale-balance' }}
                  </v-icon>
                </div>
                <div class="flex-1-1-0">
                  <div class="text-overline letter-spacing-2 text-gold mb-1">Bottom Line</div>
                  <div class="display-serif text-h5 mb-2">
                    {{ verdictHeadline }}
                  </div>
                  <p class="text-body-2 mb-0 verdict-body">
                    Over <strong>{{ form.amortYears }} years</strong>, owning will cost you about
                    <strong>{{ formatCurrencyLong(totals.owningOutlay) }}</strong> all-in versus
                    <strong>{{ formatCurrencyLong(totals.rentOutlay) }}</strong> in rent — but you'll
                    own a home worth roughly <strong>{{ formatCurrencyLong(totals.homeValueEnd) }}</strong>,
                    leaving you with <strong>{{ formatCurrencyLong(totals.equityEnd) }}</strong> in equity.
                    A renter who paid the same total ends with <strong>$0</strong>.
                  </p>
                </div>
              </div>
            </v-card>

            <!-- Summary tiles -->
            <div class="summary-grid mb-5">
              <div class="summary-tile summary-tile--own">
                <div class="summary-tile__lbl">Total cost of owning</div>
                <div class="summary-tile__num">{{ formatCurrencyLong(totals.owningOutlay) }}</div>
                <div class="summary-tile__sub">
                  Mortgage {{ formatCurrencyLong(totals.mortgageTotal) }}
                  &nbsp;·&nbsp; Tax {{ formatCurrencyLong(totals.taxTotal) }}
                  &nbsp;·&nbsp; Ins. {{ formatCurrencyLong(totals.insuranceTotal) }}
                  &nbsp;·&nbsp; Utils {{ formatCurrencyLong(totals.utilitiesTotal) }}
                </div>
              </div>
              <div class="summary-tile summary-tile--rent">
                <div class="summary-tile__lbl">Total rent paid</div>
                <div class="summary-tile__num">{{ formatCurrencyLong(totals.rentOutlay) }}</div>
                <div class="summary-tile__sub">
                  Starting at {{ formatCurrencyLong(form.rentMonthly) }}/mo, growing
                  {{ form.rentGrowthPct || 0 }}% per year
                </div>
              </div>
              <div class="summary-tile summary-tile--equity">
                <div class="summary-tile__lbl">Equity built</div>
                <div class="summary-tile__num">{{ formatCurrencyLong(totals.equityEnd) }}</div>
                <div class="summary-tile__sub">
                  Home worth {{ formatCurrencyLong(totals.homeValueEnd) }} · mortgage
                  paid down to {{ formatCurrencyLong(totals.balanceEnd) }}
                </div>
              </div>
              <div
                class="summary-tile"
                :class="netAdvantage >= 0 ? 'summary-tile--net-pos' : 'summary-tile--net-neg'"
              >
                <div class="summary-tile__lbl">Net advantage to owner</div>
                <div class="summary-tile__num">
                  {{ netAdvantage >= 0 ? '+' : '−' }}{{ formatCurrencyLong(Math.abs(netAdvantage)) }}
                </div>
                <div class="summary-tile__sub">
                  Equity gained, minus the extra cash paid above what renting would have cost
                </div>
              </div>
            </div>

            <!-- Cumulative cost chart -->
            <v-card class="chart-card pa-md-5 pa-4 mb-5" elevation="0">
              <div class="d-flex align-center mb-3">
                <span class="display-serif text-h6">The story year by year</span>
                <v-spacer />
                <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-bold">
                  {{ form.amortYears }}-year horizon
                </v-chip>
              </div>
              <ClientOnly>
                <EChart :option="chartOption" height="380px" />
                <template #fallback>
                  <div class="chart-skeleton" />
                </template>
              </ClientOnly>
              <p class="text-caption text-medium-emphasis mt-3 mb-0">
                Lines show cumulative cash spent each year. The green band shows what you actually
                <em>own</em> at that point — the part of the home that's no longer the bank's.
              </p>
            </v-card>

            <!-- Snapshots -->
            <v-card class="snapshots-card mb-5" elevation="0">
              <div class="px-md-6 px-4 pt-4 d-flex align-center">
                <v-icon color="primary" size="20" class="mr-2">mdi-calendar-clock-outline</v-icon>
                <span class="display-serif text-h6">Snapshots</span>
              </div>
              <v-table density="comfortable" class="snapshots-table">
                <thead>
                  <tr>
                    <th>End of year</th>
                    <th class="text-right">Owning paid (cumulative)</th>
                    <th class="text-right">Rent paid (cumulative)</th>
                    <th class="text-right">Mortgage balance</th>
                    <th class="text-right">Home equity</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in snapshotRows" :key="row.year">
                    <td class="font-weight-bold">Year {{ row.year }}</td>
                    <td class="text-right">{{ formatCurrencyLong(row.owningCum) }}</td>
                    <td class="text-right">{{ formatCurrencyLong(row.rentCum) }}</td>
                    <td class="text-right">{{ formatCurrencyLong(row.balanceEnd) }}</td>
                    <td class="text-right text-success font-weight-bold">
                      {{ formatCurrencyLong(row.equity) }}
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </v-card>

            <!-- Insight -->
            <v-card class="insight-card pa-md-6 pa-5" elevation="0">
              <div class="d-flex align-start ga-3">
                <v-icon color="warning" size="22" class="mt-1">mdi-key-variant</v-icon>
                <div>
                  <div class="display-serif text-h6 mb-2">The part most people miss</div>
                  <p class="text-body-2 mb-2">
                    A renter who spends <strong>{{ formatCurrencyLong(totals.rentOutlay) }}</strong>
                    over {{ form.amortYears }} years walks away with the same thing they started with:
                    a stack of receipts. Their landlord owns the appreciation, the equity, and the asset.
                  </p>
                  <p class="text-body-2 mb-0">
                    A homeowner who spends more — <strong>{{ formatCurrencyLong(totals.owningOutlay) }}</strong>
                    — walks away with an asset projected to be worth
                    <strong>{{ formatCurrencyLong(totals.homeValueEnd) }}</strong>. That's the trade:
                    higher monthly cost in exchange for a real, sellable, borrow-against-able asset
                    at the end.
                  </p>
                </div>
              </div>
            </v-card>

            <p class="text-caption text-medium-emphasis text-center mt-4 mb-0">
              Estimates only. Actual mortgage amounts depend on lender, qualification, and compounding
              method. Speak with a licensed mortgage professional for a personalised quote.
            </p>
          </div>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'

definePageMeta({ layout: 'default' })

useHead({
  title: "Buyer's Playground: Buy vs. Rent | Long-term Cost Calculator",
  meta: [
    {
      name: 'description',
      content:
        "Compare the lifetime cost of buying versus renting a home. Model mortgage, taxes, insurance, utilities and rent growth — and see how much equity you'd build.",
    },
  ],
})

// ── Inputs ──────────────────────────────────────────────────────────────────
interface PlaygroundForm {
  purchasePrice: number
  downPaymentPct: number
  interestRate: number
  amortYears: number
  propertyTaxAnnual: number
  propertyTaxGrowthPct: number
  insuranceAnnual: number
  insuranceGrowthPct: number
  utilitiesMonthly: number
  utilitiesGrowthPct: number
  rentMonthly: number
  rentGrowthPct: number
  appreciationPct: number
}

const DEFAULTS: PlaygroundForm = {
  purchasePrice: 650_000,
  downPaymentPct: 20,
  interestRate: 5.25,
  amortYears: 25,
  propertyTaxAnnual: 4800,
  propertyTaxGrowthPct: 2.5,
  insuranceAnnual: 1800,
  insuranceGrowthPct: 2.0,
  utilitiesMonthly: 350,
  utilitiesGrowthPct: 2.5,
  rentMonthly: 2400,
  rentGrowthPct: 3.0,
  appreciationPct: 3.0,
}

const STORAGE_KEY = 'buyers-playground.v1'

const form = reactive<PlaygroundForm>({ ...DEFAULTS })

// Hydrate from localStorage AFTER mount so SSR markup matches the initial defaults
// (otherwise the server-rendered numbers and the client numbers diverge → hydration warning).
onMounted(() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const saved = JSON.parse(raw) as Partial<PlaygroundForm>
    for (const key of Object.keys(DEFAULTS) as (keyof PlaygroundForm)[]) {
      const v = saved[key]
      if (typeof v === 'number' && Number.isFinite(v)) {
        form[key] = v
      }
    }
  } catch (e) {
    // Corrupt payload — wipe so we don't keep failing
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* noop */ }
  }
})

// Debounced persistence so we don't thrash localStorage on every keystroke.
let persistTimer: ReturnType<typeof setTimeout> | null = null
watch(form, () => {
  if (typeof window === 'undefined') return
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(form)) } catch { /* noop */ }
  }, 250)
}, { deep: true })

function resetInputs() {
  Object.assign(form, DEFAULTS)
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* noop */ }
}

// ── Sanitised numeric accessors ─────────────────────────────────────────────
// Inputs come through as `number | string | null` thanks to v-model.number on
// empty fields. Coerce defensively so a blank field never poisons the math.
const num = (v: unknown, fallback = 0) => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

const downPaymentAmount = computed(() => {
  const price = Math.max(0, num(form.purchasePrice))
  const pct = clamp(num(form.downPaymentPct), 0, 100)
  return Math.round(price * (pct / 100))
})

const loanPrincipal = computed(() =>
  Math.max(0, Math.max(0, num(form.purchasePrice)) - downPaymentAmount.value),
)

// ── Year-by-year projection ─────────────────────────────────────────────────
interface YearRow {
  year: number              // 1..N
  mortgagePaidYear: number  // P+I paid this year
  interestYear: number
  principalYear: number
  taxYear: number
  insuranceYear: number
  utilitiesYear: number
  rentYear: number
  balanceEnd: number        // mortgage balance at end of year
  homeValueEnd: number
  // Cumulative through end of year:
  owningCum: number
  rentCum: number
  equity: number            // home value − mortgage balance (= what you'd net if you sold)
}

const projection = computed<YearRow[]>(() => {
  const years = clamp(Math.round(num(form.amortYears, 25)), 1, 50)
  const principal = loanPrincipal.value
  const annualRate = clamp(num(form.interestRate), 0, 25) / 100
  const monthlyRate = annualRate / 12
  const n = years * 12

  // Standard amortising payment. Guard against r=0 (zero-interest loan).
  let monthlyPayment = 0
  if (principal > 0 && n > 0) {
    monthlyPayment = monthlyRate === 0
      ? principal / n
      : (principal * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1)
  }

  const taxBase = Math.max(0, num(form.propertyTaxAnnual))
  const taxGrow = clamp(num(form.propertyTaxGrowthPct), 0, 25) / 100
  const insBase = Math.max(0, num(form.insuranceAnnual))
  const insGrow = clamp(num(form.insuranceGrowthPct), 0, 25) / 100
  const utilBase = Math.max(0, num(form.utilitiesMonthly)) * 12
  const utilGrow = clamp(num(form.utilitiesGrowthPct), 0, 25) / 100
  const rentBase = Math.max(0, num(form.rentMonthly)) * 12
  const rentGrow = clamp(num(form.rentGrowthPct), 0, 25) / 100
  const appr = clamp(num(form.appreciationPct), 0, 25) / 100

  const rows: YearRow[] = []
  let balance = principal
  let owningCum = downPaymentAmount.value // down payment is cash out on day 1
  let rentCum = 0

  for (let y = 1; y <= years; y++) {
    let interestYear = 0
    let principalYear = 0
    for (let m = 0; m < 12; m++) {
      const interestMonth = balance * monthlyRate
      const principalMonth = Math.min(monthlyPayment - interestMonth, balance)
      interestYear += interestMonth
      principalYear += principalMonth
      balance = Math.max(0, balance - principalMonth)
    }
    const mortgagePaidYear = interestYear + principalYear
    const taxYear        = taxBase  * Math.pow(1 + taxGrow,  y - 1)
    const insuranceYear  = insBase  * Math.pow(1 + insGrow,  y - 1)
    const utilitiesYear  = utilBase * Math.pow(1 + utilGrow, y - 1)
    const rentYear       = rentBase * Math.pow(1 + rentGrow, y - 1)
    const homeValueEnd   = Math.max(0, num(form.purchasePrice)) * Math.pow(1 + appr, y)

    owningCum += mortgagePaidYear + taxYear + insuranceYear + utilitiesYear
    rentCum   += rentYear

    rows.push({
      year: y,
      mortgagePaidYear,
      interestYear,
      principalYear,
      taxYear,
      insuranceYear,
      utilitiesYear,
      rentYear,
      balanceEnd: balance,
      homeValueEnd,
      owningCum,
      rentCum,
      equity: Math.max(0, homeValueEnd - balance),
    })
  }
  return rows
})

const totals = computed(() => {
  const rows = projection.value
  const last = rows[rows.length - 1]
  const sum = (k: keyof YearRow) => rows.reduce((s, r) => s + (r[k] as number), 0)
  return {
    mortgageTotal:  sum('mortgagePaidYear'),
    interestTotal:  sum('interestYear'),
    principalTotal: sum('principalYear'),
    taxTotal:       sum('taxYear'),
    insuranceTotal: sum('insuranceYear'),
    utilitiesTotal: sum('utilitiesYear'),
    rentOutlay:     sum('rentYear'),
    owningOutlay:   last ? last.owningCum : 0,
    balanceEnd:     last ? last.balanceEnd : 0,
    homeValueEnd:   last ? last.homeValueEnd : 0,
    equityEnd:      last ? last.equity : 0,
  }
})

const netAdvantage = computed(
  () => totals.value.equityEnd - (totals.value.owningOutlay - totals.value.rentOutlay),
)

const verdictHeadline = computed(() => {
  const adv = netAdvantage.value
  if (adv > 0) {
    return `Buying comes out ahead by ${formatCurrencyLong(adv)} — and you keep the keys.`
  }
  if (adv < 0) {
    return `Renting wins on cash, but owning still leaves you with a real asset.`
  }
  return 'Owning and renting are a financial wash — the deciding factor is the asset you keep.'
})

// Three meaningful checkpoints: ~⅕ in, midway, and the finish line.
const snapshotRows = computed<YearRow[]>(() => {
  const rows = projection.value
  if (rows.length === 0) return []
  const yrs = rows.length
  const pickYears = Array.from(new Set([
    Math.min(5, yrs),
    Math.max(1, Math.round(yrs / 2)),
    yrs,
  ])).sort((a, b) => a - b)
  return pickYears
    .map(y => rows[y - 1])
    .filter((r): r is YearRow => r !== undefined)
})

// ── Chart ───────────────────────────────────────────────────────────────────
const chartOption = computed(() => {
  const rows = projection.value
  const xData = rows.map(r => `Yr ${r.year}`)
  const owning = rows.map(r => Math.round(r.owningCum))
  const renting = rows.map(r => Math.round(r.rentCum))
  const equity  = rows.map(r => Math.round(r.equity))

  return {
    color: ['#8c734b', '#9aa0a6', '#2e7d32'],
    grid: { left: 60, right: 24, top: 48, bottom: 48 },
    legend: {
      top: 0,
      right: 0,
      icon: 'roundRect',
      itemWidth: 12,
      itemHeight: 12,
      textStyle: { fontFamily: 'Inter, sans-serif', fontSize: 12 },
      data: ['Owning (cumulative)', 'Renting (cumulative)', 'Equity built'],
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: 'rgba(140,115,75,0.25)',
      textStyle: { color: '#222', fontFamily: 'Inter, sans-serif' },
      valueFormatter: (v: number) => formatCurrencyLong(v),
    },
    xAxis: {
      type: 'category',
      data: xData,
      axisLine: { lineStyle: { color: 'rgba(0,0,0,0.15)' } },
      axisLabel: { color: 'rgba(0,0,0,0.6)', fontFamily: 'Inter, sans-serif' },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: 'rgba(0,0,0,0.6)',
        fontFamily: 'Inter, sans-serif',
        formatter: (v: number) => formatCurrencyShort(v),
      },
      splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } },
    },
    series: [
      {
        name: 'Owning (cumulative)',
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 3 },
        data: owning,
      },
      {
        name: 'Renting (cumulative)',
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 3, type: 'dashed' },
        data: renting,
      },
      {
        name: 'Equity built',
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 3 },
        areaStyle: { opacity: 0.18 },
        data: equity,
      },
    ],
  }
})

// ── Formatting ──────────────────────────────────────────────────────────────
function formatCurrency(v: number): string {
  return Math.round(num(v)).toLocaleString('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  })
}
// Same as formatCurrency right now, but we keep them as separate names so
// the formatting can diverge later without a sweep across the template.
function formatCurrencyLong(v: number): string {
  return formatCurrency(v)
}
function formatCurrencyShort(v: number): string {
  const n = num(v)
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}k`
  return `$${Math.round(n)}`
}

// ── PDF ─────────────────────────────────────────────────────────────────────
const generatingPdf = ref(false)

async function generatePdf() {
  if (generatingPdf.value) return
  generatingPdf.value = true
  try {
    // Dynamic import — html2pdf.js is client-only and ~100KB; no need to ship
    // it in the SSR bundle for everyone who never clicks the button.
    const html2pdf = (await import('html2pdf.js')).default

    const source = document.getElementById('bp-report')
    if (!source) return

    // Clone the report into an offscreen container so we can apply print-only
    // tweaks (fixed width, white background, a stamped header) without
    // disturbing what the user sees.
    const container = document.createElement('div')
    container.style.position = 'fixed'
    container.style.left = '-10000px'
    container.style.top = '0'
    container.style.width = '900px'
    container.style.padding = '32px'
    container.style.background = '#ffffff'
    container.style.fontFamily = 'Inter, sans-serif'

    const stamp = document.createElement('div')
    stamp.innerHTML = `
      <div style="display:flex;align-items:center;gap:16px;border-bottom:1px solid rgba(0,0,0,0.08);padding-bottom:14px;margin-bottom:18px;">
        <div style="width:6px;height:34px;background:#8c734b;border-radius:3px;"></div>
        <div>
          <div style="font-size:11px;letter-spacing:2px;color:#8c734b;text-transform:uppercase;">Buyer's Playground</div>
          <div style="font-family:'Playfair Display', serif;font-size:24px;line-height:1;margin-top:4px;">Buy vs. Rent — Personal Report</div>
          <div style="font-size:11px;color:#666;margin-top:4px;">Generated ${new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>
    `
    container.appendChild(stamp)

    const clone = source.cloneNode(true) as HTMLElement
    clone.querySelectorAll<HTMLElement>('.chart-skeleton').forEach(el => el.remove())
    container.appendChild(clone)
    document.body.appendChild(container)

    // Give ECharts (SVG renderer) one tick to make sure the cloned chart node
    // has been fully laid out by html2canvas before snapshotting.
    await new Promise(resolve => setTimeout(resolve, 80))

    const filename = `buy-vs-rent-${new Date().toISOString().slice(0, 10)}.pdf`
    // `pagebreak` is a valid runtime option in html2pdf.js but the bundled
    // type declarations don't expose it — cast to bypass the missing field.
    const pdfOptions = {
      margin: [10, 10, 10, 10],
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    } as any
    await html2pdf().set(pdfOptions).from(container).save()

    container.remove()
  } catch (err) {
    console.error('[Buyers Playground] PDF generation failed:', err)
  } finally {
    generatingPdf.value = false
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;500;600;700&display=swap');

.buyers-playground {
  background-color: #fcfcfb;
  font-family: 'Inter', sans-serif;
  min-height: 100vh;
}

.display-serif { font-family: 'Playfair Display', serif; }
.text-gold { color: #8c734b; }
.letter-spacing-1 { letter-spacing: 1px; }
.letter-spacing-2 { letter-spacing: 2px; }
.premium-accent-bar { width: 40px; height: 4px; background: #8c734b; border-radius: 2px; }
.premium-action-btn { border-radius: 12px !important; text-transform: none !important; font-weight: 700 !important; }
.ga-3 { gap: 12px; }

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
.hero-sub {
  color: rgba(0,0,0,0.62);
  max-width: 640px;
  font-size: 1rem;
  line-height: 1.6;
}
.reset-btn { color: rgba(0,0,0,0.55); }

/* ── Inputs ─────────────────────────────────────────────────────────────── */
.inputs-card {
  border-radius: 20px !important;
  border: 1px solid rgba(0,0,0,0.06) !important;
  background: #ffffff !important;
}
@media (min-width: 960px) {
  .inputs-col {
    position: sticky;
    top: 88px;
    align-self: flex-start;
    height: fit-content;
  }
}
.readonly-field :deep(input) {
  color: rgba(0,0,0,0.7);
  font-weight: 600;
}

/* ── Verdict ────────────────────────────────────────────────────────────── */
.verdict-card {
  border-radius: 20px !important;
  background: linear-gradient(135deg, #ffffff, #faf6ee) !important;
  border: 1px solid rgba(140, 115, 75, 0.18) !important;
}
.verdict-icon {
  width: 44px; height: 44px;
  border-radius: 12px;
  background: rgba(140, 115, 75, 0.08);
  display: flex; align-items: center; justify-content: center;
  flex: 0 0 auto;
}
.verdict-body { color: rgba(0,0,0,0.72); line-height: 1.6; }

/* ── Summary tiles ─────────────────────────────────────────────────────── */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
@media (min-width: 1280px) {
  .summary-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
.summary-tile {
  background: #ffffff;
  border-radius: 18px;
  padding: 18px 20px;
  border: 1px solid rgba(0,0,0,0.06);
}
.summary-tile__lbl {
  font-size: 11px;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: rgba(0,0,0,0.55);
  font-weight: 600;
}
.summary-tile__num {
  font-family: 'Playfair Display', serif;
  font-size: 26px;
  line-height: 1.1;
  margin: 6px 0 8px;
}
.summary-tile__sub {
  font-size: 11px;
  color: rgba(0,0,0,0.55);
  line-height: 1.5;
}
.summary-tile--own     { border-color: rgba(140, 115, 75, 0.25); background: rgba(140, 115, 75, 0.04); }
.summary-tile--own     .summary-tile__num { color: #5a4a30; }
.summary-tile--rent    { border-color: rgba(0, 0, 0, 0.10); }
.summary-tile--rent    .summary-tile__num { color: #444; }
.summary-tile--equity  { border-color: rgba(76, 175, 80, 0.25); background: rgba(76, 175, 80, 0.05); }
.summary-tile--equity  .summary-tile__num { color: #2e7d32; }
.summary-tile--net-pos { border-color: rgba(76, 175, 80, 0.4); background: linear-gradient(135deg, rgba(76,175,80,0.08), rgba(76,175,80,0.02)); }
.summary-tile--net-pos .summary-tile__num { color: #2e7d32; }
.summary-tile--net-neg { border-color: rgba(255, 152, 0, 0.4); background: linear-gradient(135deg, rgba(255,152,0,0.08), rgba(255,152,0,0.02)); }
.summary-tile--net-neg .summary-tile__num { color: #ef6c00; }

/* ── Chart ─────────────────────────────────────────────────────────────── */
.chart-card,
.snapshots-card,
.insight-card {
  border-radius: 20px !important;
  border: 1px solid rgba(0,0,0,0.06) !important;
  background: #ffffff !important;
}
.chart-skeleton {
  height: 380px;
  border-radius: 12px;
  background: linear-gradient(135deg, #f7f5f0, #fcfbf7);
}

/* ── Snapshots table ──────────────────────────────────────────────────── */
.snapshots-table :deep(th) {
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 11px;
  color: rgba(0,0,0,0.55);
  background: rgba(140, 115, 75, 0.04);
}
.snapshots-table :deep(tbody tr:hover) {
  background: rgba(140, 115, 75, 0.03);
}

/* ── Insight ──────────────────────────────────────────────────────────── */
.insight-card {
  background: linear-gradient(135deg, #ffffff, #fff8e8) !important;
  border-color: rgba(255, 152, 0, 0.2) !important;
}
.insight-card p { color: rgba(0,0,0,0.72); line-height: 1.6; }
</style>
