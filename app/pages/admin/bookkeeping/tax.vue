<template>
  <div class="tax-page px-md-8 py-md-6">
    <v-container fluid>
      <!-- Page Header -->
      <v-row class="mb-8 align-center">
        <v-col cols="12" md="6">
          <div class="d-flex align-center mb-2">
            <v-btn icon="mdi-arrow-left" variant="text" size="small" class="mr-2" to="/admin/bookkeeping" />
            <div class="premium-accent-bar mr-4"></div>
            <span class="text-overline letter-spacing-2 text-gold">Financial Management</span>
          </div>
          <h1 class="display-serif text-h3 mb-1">Tax Calculator</h1>
          <p class="text-subtitle-1 text-medium-emphasis font-weight-light">
            Canadian tax estimates for your business
          </p>
        </v-col>
        <v-col cols="12" md="6" class="d-flex align-center justify-md-end ga-3 flex-wrap">
          <v-select
            v-model="province"
            :items="provinces"
            item-title="name"
            item-value="code"
            label="Province"
            variant="outlined"
            density="compact"
            hide-details
            class="premium-input"
            style="max-width: 220px;"
            prepend-inner-icon="mdi-map-marker"
            @update:model-value="calculateTax"
          />
          <v-btn-toggle v-model="businessType" mandatory color="#8c734b" variant="outlined" density="compact" rounded="lg">
            <v-btn value="sole_prop" class="premium-toggle-btn">
              <v-icon start size="small">mdi-account</v-icon>
              Sole Prop
            </v-btn>
            <v-btn value="corporation" class="premium-toggle-btn">
              <v-icon start size="small">mdi-domain</v-icon>
              Corporation
            </v-btn>
          </v-btn-toggle>
        </v-col>
      </v-row>

      <!-- Override Inputs -->
      <v-row class="mb-8">
        <v-col cols="12" sm="6">
          <v-card class="stat-card" elevation="0">
            <v-card-text class="pa-5">
              <div class="text-overline text-gold font-weight-bold mb-3">Gross Income</div>
              <v-text-field
                v-model.number="overrideIncome"
                type="number"
                label="Gross Income ($)"
                variant="outlined"
                density="compact"
                prefix="$"
                class="premium-input"
                hint="Auto-loaded from revenue. Override manually if needed."
                persistent-hint
                @update:model-value="calculateTax"
              />
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6">
          <v-card class="stat-card" elevation="0">
            <v-card-text class="pa-5">
              <div class="text-overline text-gold font-weight-bold mb-3">Total Expenses</div>
              <v-text-field
                v-model.number="overrideExpenses"
                type="number"
                label="Total Expenses ($)"
                variant="outlined"
                density="compact"
                prefix="$"
                class="premium-input"
                hint="Auto-loaded from expenses. Override manually if needed."
                persistent-hint
                @update:model-value="calculateTax"
              />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Tax Results -->
      <v-row class="mb-8">
        <v-col v-for="card in resultCards" :key="card.label" cols="12" sm="6" md="4" lg="3" class="d-flex">
          <v-skeleton-loader v-if="loading" type="card" class="w-100 rounded-xl" />
          <v-card v-else class="result-card w-100" elevation="0">
            <v-card-text class="pa-5">
              <div class="d-flex align-center mb-3">
                <div :class="['icon-orb mr-3', card.orb]">
                  <v-icon :icon="card.icon" size="small" />
                </div>
                <div class="text-overline text-medium-emphasis lh-tight" style="font-size: 0.65rem;">{{ card.label }}</div>
              </div>
              <div :class="['text-h5 font-weight-bold letter-spacing-tight', card.valueClass || '']">
                {{ card.isPercent ? card.value + '%' : fmt(card.value as number) }}
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Corporate Breakdown (if corporation) -->
      <v-row v-if="estimate.businessType === 'corporation' && estimate.corporateTax && !loading" class="mb-8">
        <v-col cols="12">
          <v-card class="analytics-card" elevation="0">
            <v-card-title class="d-flex align-center pa-6">
              <v-icon icon="mdi-domain" class="mr-2 text-gold" size="small" />
              <span class="display-serif text-h5">Corporate Tax Breakdown</span>
              <v-chip class="ml-3" size="small" color="#8c734b" variant="outlined">CCPC</v-chip>
            </v-card-title>
            <v-divider class="opacity-10" />
            <v-card-text class="pa-6">
              <v-row>
                <v-col cols="12" sm="6" md="3">
                  <div class="text-overline text-medium-emphasis mb-1" style="font-size: 0.65rem;">SBD Income (first $500k)</div>
                  <div class="text-h6 font-weight-bold">{{ fmt(estimate.corporateTax.smallBusinessIncome) }}</div>
                  <div class="text-caption text-medium-emphasis">Fed 9% + Prov {{ (getProvSmallRate * 100).toFixed(1) }}% = {{ (9 + getProvSmallRate * 100).toFixed(1) }}%</div>
                </v-col>
                <v-col cols="12" sm="6" md="3">
                  <div class="text-overline text-medium-emphasis mb-1" style="font-size: 0.65rem;">General Income (above $500k)</div>
                  <div class="text-h6 font-weight-bold">{{ fmt(estimate.corporateTax.generalIncome) }}</div>
                  <div class="text-caption text-medium-emphasis">Fed 15% + Prov {{ (getProvGeneralRate * 100).toFixed(1) }}% = {{ (15 + getProvGeneralRate * 100).toFixed(1) }}%</div>
                </v-col>
                <v-col cols="12" sm="6" md="3">
                  <div class="text-overline text-medium-emphasis mb-1" style="font-size: 0.65rem;">Federal Corporate Tax</div>
                  <div class="text-h6 font-weight-bold text-blue">{{ fmt(estimate.corporateTax.federalTaxTotal) }}</div>
                </v-col>
                <v-col cols="12" sm="6" md="3">
                  <div class="text-overline text-medium-emphasis mb-1" style="font-size: 0.65rem;">Provincial Corporate Tax</div>
                  <div class="text-h6 font-weight-bold text-purple">{{ fmt(estimate.corporateTax.provincialTaxTotal) }}</div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Personal Tax Breakdown (if sole prop) -->
      <v-row v-if="estimate.businessType === 'sole_prop' && estimate.personalTax && !loading" class="mb-8">
        <v-col cols="12">
          <v-card class="analytics-card" elevation="0">
            <v-card-title class="d-flex align-center pa-6">
              <v-icon icon="mdi-account" class="mr-2 text-gold" size="small" />
              <span class="display-serif text-h5">Personal Tax Breakdown</span>
              <v-chip class="ml-3" size="small" color="#8c734b" variant="outlined">Sole Proprietor</v-chip>
            </v-card-title>
            <v-divider class="opacity-10" />
            <v-card-text class="pa-6">
              <v-row>
                <v-col cols="12" sm="6" md="3">
                  <div class="text-overline text-medium-emphasis mb-1" style="font-size: 0.65rem;">Taxable Income</div>
                  <div class="text-h6 font-weight-bold">{{ fmt(estimate.personalTax.taxableIncome) }}</div>
                </v-col>
                <v-col cols="12" sm="6" md="3">
                  <div class="text-overline text-medium-emphasis mb-1" style="font-size: 0.65rem;">Federal Income Tax</div>
                  <div class="text-h6 font-weight-bold text-blue">{{ fmt(estimate.personalTax.federalTax) }}</div>
                </v-col>
                <v-col cols="12" sm="6" md="3">
                  <div class="text-overline text-medium-emphasis mb-1" style="font-size: 0.65rem;">Provincial Income Tax</div>
                  <div class="text-h6 font-weight-bold text-purple">{{ fmt(estimate.personalTax.provincialTax) }}</div>
                </v-col>
                <v-col cols="12" sm="6" md="3">
                  <div class="text-overline text-medium-emphasis mb-1" style="font-size: 0.65rem;">Marginal Rate</div>
                  <div class="text-h6 font-weight-bold text-warning">{{ fmtPct(estimate.personalTax.marginalRate) }}</div>
                  <div class="text-caption text-medium-emphasis">Combined federal + provincial</div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Sales Tax + RRSP -->
      <v-row v-if="!loading && (estimate.salesTax || estimate.rrsp)" class="mb-8">
        <v-col v-if="estimate.salesTax" cols="12" :md="estimate.rrsp ? 6 : 12" class="d-flex">
          <v-card class="analytics-card w-100" elevation="0">
            <v-card-title class="d-flex align-center pa-6">
              <v-icon icon="mdi-receipt-text-check" class="mr-2 text-gold" size="small" />
              <span class="display-serif text-h5">Sales Tax (GST/HST/PST)</span>
            </v-card-title>
            <v-divider class="opacity-10" />
            <v-card-text class="pa-6">
              <v-row>
                <v-col cols="6">
                  <div class="text-overline text-medium-emphasis mb-1" style="font-size: 0.65rem;">Tax Collected</div>
                  <div class="text-h6 font-weight-bold">{{ fmt(estimate.salesTax.totalCollected) }}</div>
                  <div class="text-caption text-medium-emphasis">Rate: {{ fmtPct(estimate.salesTax.salesTaxRate) }}</div>
                </v-col>
                <v-col cols="6">
                  <div class="text-overline text-medium-emphasis mb-1" style="font-size: 0.65rem;">Tax Paid (ITCs)</div>
                  <div class="text-h6 font-weight-bold">{{ fmt(estimate.salesTax.totalPaid) }}</div>
                </v-col>
                <v-col cols="12">
                  <v-divider class="my-2 opacity-10" />
                  <div class="d-flex justify-space-between align-center">
                    <span class="text-overline text-medium-emphasis" style="font-size: 0.65rem;">Net Remittance to CRA</span>
                    <span class="text-h6 font-weight-bold text-error">{{ fmt(estimate.salesTax.netRemittance) }}</span>
                  </div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col v-if="estimate.rrsp" cols="12" :md="estimate.salesTax ? 6 : 12" class="d-flex">
          <v-card class="analytics-card w-100" elevation="0">
            <v-card-title class="d-flex align-center pa-6">
              <v-icon icon="mdi-piggy-bank" class="mr-2 text-gold" size="small" />
              <span class="display-serif text-h5">RRSP Optimization</span>
            </v-card-title>
            <v-divider class="opacity-10" />
            <v-card-text class="pa-6">
              <v-row>
                <v-col cols="6">
                  <div class="text-overline text-medium-emphasis mb-1" style="font-size: 0.65rem;">Contribution Room</div>
                  <div class="text-h6 font-weight-bold">{{ fmt(estimate.rrsp.contributionRoom) }}</div>
                  <div class="text-caption text-medium-emphasis">18% of earned income, max $31,560</div>
                </v-col>
                <v-col cols="6">
                  <div class="text-overline text-medium-emphasis mb-1" style="font-size: 0.65rem;">Estimated Tax Savings</div>
                  <div class="text-h6 font-weight-bold text-success">{{ fmt(estimate.rrsp.taxSavings) }}</div>
                  <div class="text-caption text-medium-emphasis">If you maximize contributions</div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Chart + Province Comparison -->
      <v-row class="mb-8">
        <v-col cols="12" lg="5" class="d-flex">
          <v-card class="analytics-card w-100" elevation="0">
            <v-card-title class="d-flex align-center pa-6">
              <v-icon icon="mdi-chart-donut" class="mr-2 text-gold" size="small" />
              <span class="display-serif text-h5">Tax Breakdown</span>
            </v-card-title>
            <v-divider class="opacity-10" />
            <v-card-text class="pa-6">
              <v-skeleton-loader v-if="loading" type="image" class="rounded-lg" />
              <div v-else class="chart-container">
                <EChart :option="donutChartOption" height="340px" />
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" lg="7" class="d-flex">
          <v-card class="analytics-card w-100" elevation="0">
            <v-card-title class="d-flex align-center pa-6">
              <v-icon icon="mdi-table" class="mr-2 text-gold" size="small" />
              <span class="display-serif text-h5">Province Comparison</span>
            </v-card-title>
            <v-divider class="opacity-10" />
            <v-card-text class="pa-0">
              <v-skeleton-loader v-if="loading" type="table-row@6" class="rounded-lg" />
              <v-table v-else class="premium-table" density="compact">
                <thead>
                  <tr>
                    <th class="px-6">Province</th>
                    <th class="text-right">Federal</th>
                    <th class="text-right">Provincial</th>
                    <th class="text-right">Total Tax</th>
                    <th class="text-right">Eff. Rate</th>
                    <th class="text-right px-6">Net Income</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in comparisonProvinces"
                    :key="row.code"
                    :class="['table-row-hover', { 'selected-province': row.code === province }]"
                  >
                    <td class="px-6 text-body-2 font-weight-medium">
                      <div class="d-flex align-center">
                        <v-icon v-if="row.code === province" icon="mdi-check-circle" size="small" color="#8c734b" class="mr-2" />
                        {{ row.name }}
                      </div>
                    </td>
                    <td class="text-right text-body-2">{{ fmt(row.federalTax) }}</td>
                    <td class="text-right text-body-2">{{ fmt(row.provincialTax) }}</td>
                    <td class="text-right text-body-2 font-weight-bold text-error">{{ fmt(row.totalTax) }}</td>
                    <td class="text-right text-body-2">{{ fmtPct(row.effectiveRate) }}</td>
                    <td class="text-right text-body-2 font-weight-bold text-success px-6">{{ fmt(row.netIncome) }}</td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Disclaimer -->
      <v-row class="mb-8">
        <v-col cols="12">
          <v-alert type="info" variant="tonal" density="compact" rounded="xl" class="text-body-2">
            <template #prepend>
              <v-icon icon="mdi-information" />
            </template>
            <strong>Estimate Only</strong> — These calculations are estimates based on {{ estimate.year || new Date().getFullYear() }} Canadian tax rates.
            Actual tax obligations may differ. Consult a certified accountant or tax professional.
            Rates are updated annually; this tool covers federal + provincial income tax, CPP/EI, GST/HST/PST, and RRSP optimization.
          </v-alert>
        </v-col>
      </v-row>
    </v-container>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" color="error" location="top right" rounded="lg" :timeout="4000">
      <div class="d-flex align-center">
        <v-icon class="mr-2">mdi-alert-circle</v-icon>
        {{ errorMessage }}
      </div>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
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
interface CorporateTaxResult {
  netIncome: number
  smallBusinessIncome: number
  generalIncome: number
  federalSmallBizTax: number
  federalGeneralTax: number
  federalTaxTotal: number
  provincialSmallBizTax: number
  provincialGeneralTax: number
  provincialTaxTotal: number
  totalCorporateTax: number
  effectiveRate: number
  afterTaxIncome: number
}

interface PersonalTaxResult {
  grossIncome: number
  deductions: number
  taxableIncome: number
  federalTax: number
  provincialTax: number
  totalIncomeTax: number
  effectiveRate: number
  marginalRate: number
  netIncome: number
}

interface SalesTaxResult {
  revenue: number
  expenses: number
  totalCollected: number
  totalPaid: number
  netRemittance: number
  salesTaxRate: number
}

interface RRSPResult {
  earnedIncome: number
  contributionRoom: number
  suggestedContribution: number
  taxSavings: number
}

interface TaxEstimate {
  grossIncome: number
  totalExpenses: number
  province: string
  provinceName: string
  businessType: string
  year: number
  corporateTax?: CorporateTaxResult
  personalTax?: PersonalTaxResult
  salesTax?: SalesTaxResult
  rrsp?: RRSPResult
  cppTotal: number
  eiTotal: number
  federalTax: number
  provincialTax: number
  totalTax: number
  effectiveRate: number
  netIncome: number
  estimateOnly: boolean
}

interface ProvinceOption {
  code: string
  name: string
}

interface ProvinceComparison {
  code: string
  name: string
  federalTax: number
  provincialTax: number
  totalTax: number
  effectiveRate: number
  netIncome: number
}

// ─── Helpers ─────────────────────────────────────────────────
const fmt = (n: number) => '$' + (n || 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtPct = (n: number) => {
  if (!n) return '0%'
  const pct = n > 1 ? n : n * 100
  return pct.toFixed(1) + '%'
}

// ─── Province Data ───────────────────────────────────────────
const provinces = ref<ProvinceOption[]>([
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon' }
])

// ─── State ───────────────────────────────────────────────────
const loading = ref(true)
const snackbar = ref(false)
const errorMessage = ref('')

const province = ref('ON')
const businessType = ref('sole_prop')
const overrideIncome = ref(0)
const overrideExpenses = ref(0)

const estimate = ref<TaxEstimate>({
  grossIncome: 0,
  totalExpenses: 0,
  province: 'ON',
  provinceName: 'Ontario',
  businessType: 'sole_prop',
  year: new Date().getFullYear(),
  cppTotal: 0,
  eiTotal: 0,
  federalTax: 0,
  provincialTax: 0,
  totalTax: 0,
  effectiveRate: 0,
  netIncome: 0,
  estimateOnly: true
})

const comparisonProvinces = ref<ProvinceComparison[]>([])

// ─── Result Cards ────────────────────────────────────────────
const effectiveRatePct = computed(() => {
  const r = estimate.value.effectiveRate
  return r > 1 ? r.toFixed(1) : (r * 100).toFixed(1)
})

const resultCards = computed(() => {
  const e = estimate.value
  const taxableIncome = Math.max(0, e.grossIncome - (e.totalExpenses || overrideExpenses.value))
  const isCorp = e.businessType === 'corporation'

  const cards: any[] = [
    { label: 'Gross Income', value: e.grossIncome, icon: 'mdi-cash-multiple', orb: 'success-orb' },
    { label: 'Total Expenses', value: e.totalExpenses || overrideExpenses.value, icon: 'mdi-receipt-text', orb: 'error-orb' },
    { label: 'Taxable Income', value: taxableIncome, icon: 'mdi-calculator-variant', orb: 'gold-orb' },
    { label: isCorp ? 'Federal Corporate Tax' : 'Federal Income Tax', value: e.federalTax, icon: 'mdi-flag', orb: 'info-orb' },
    { label: isCorp ? 'Provincial Corporate Tax' : 'Provincial Income Tax', value: e.provincialTax, icon: 'mdi-map-marker', orb: 'purple-orb' },
  ]

  if (!isCorp) {
    cards.push(
      { label: 'CPP (Both Sides)', value: e.cppTotal, icon: 'mdi-shield-account', orb: 'warning-orb' },
      { label: 'EI Premiums', value: e.eiTotal, icon: 'mdi-umbrella', orb: 'teal-orb' }
    )
  }

  if (isCorp && e.corporateTax) {
    cards.push(
      { label: 'SBD Income (9%)', value: e.corporateTax.smallBusinessIncome, icon: 'mdi-shield-star', orb: 'teal-orb' },
      { label: 'General Income (15%+)', value: e.corporateTax.generalIncome, icon: 'mdi-office-building', orb: 'warning-orb' }
    )
  }

  cards.push(
    { label: 'Total Tax', value: e.totalTax, icon: 'mdi-bank', orb: 'error-orb', valueClass: 'text-error' },
    { label: 'Effective Tax Rate', value: effectiveRatePct.value, icon: 'mdi-percent', orb: 'gold-orb', isPercent: true },
    { label: 'Estimated Net Income', value: e.netIncome, icon: 'mdi-wallet', orb: 'success-orb', valueClass: 'text-success' }
  )

  if (e.rrsp) {
    cards.push(
      { label: 'RRSP Room', value: e.rrsp.contributionRoom, icon: 'mdi-piggy-bank', orb: 'info-orb' },
      { label: 'RRSP Tax Savings', value: e.rrsp.taxSavings, icon: 'mdi-cash-refund', orb: 'success-orb', valueClass: 'text-success' }
    )
  }

  if (e.salesTax) {
    cards.push(
      { label: 'GST/HST Collected', value: e.salesTax.totalCollected, icon: 'mdi-receipt', orb: 'warning-orb' },
      { label: 'Net Remittance', value: e.salesTax.netRemittance, icon: 'mdi-bank-transfer', orb: 'error-orb', valueClass: 'text-error' }
    )
  }

  return cards
})

// ─── Province Rate Helpers (for corporate breakdown display) ─
const PROVINCE_CORP_RATES: Record<string, { small: number; general: number }> = {
  AB: { small: 0.02, general: 0.08 },
  BC: { small: 0.02, general: 0.12 },
  MB: { small: 0.00, general: 0.12 },
  NB: { small: 0.025, general: 0.14 },
  NL: { small: 0.03, general: 0.15 },
  NS: { small: 0.025, general: 0.14 },
  ON: { small: 0.032, general: 0.115 },
  PE: { small: 0.01, general: 0.16 },
  QC: { small: 0.032, general: 0.115 },
  SK: { small: 0.01, general: 0.12 },
  NT: { small: 0.02, general: 0.115 },
  NU: { small: 0.03, general: 0.12 },
  YT: { small: 0.00, general: 0.12 },
}

const getProvSmallRate = computed(() => PROVINCE_CORP_RATES[province.value]?.small || 0)
const getProvGeneralRate = computed(() => PROVINCE_CORP_RATES[province.value]?.general || 0)

// ─── Donut Chart ─────────────────────────────────────────────
const donutChartOption = computed(() => {
  const e = estimate.value
  const allData = [
    { name: 'Federal Tax', value: e.federalTax, itemStyle: { color: '#1565c0' } },
    { name: 'Provincial Tax', value: e.provincialTax, itemStyle: { color: '#7b1fa2' } },
    { name: 'CPP', value: e.cppTotal, itemStyle: { color: '#ef6c00' } },
    { name: 'EI', value: e.eiTotal, itemStyle: { color: '#00897b' } },
    { name: 'Expenses', value: e.totalExpenses || overrideExpenses.value, itemStyle: { color: '#ef5350' } },
    { name: 'Net Income', value: Math.max(0, e.netIncome), itemStyle: { color: '#43a047' } }
  ].filter(d => d.value > 0)

  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#eee',
      borderWidth: 1,
      textStyle: { color: '#333', fontSize: 12 },
      formatter: (params: any) => {
        const val = (params.value || 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        return `<b>${params.name}</b><br/>$${val} (${params.percent}%)`
      }
    },
    legend: {
      bottom: 0,
      textStyle: { fontSize: 11 }
    },
    series: [{
      type: 'pie',
      radius: ['45%', '75%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 3 },
      label: { show: false },
      emphasis: {
        label: { show: true, fontSize: 14, fontWeight: 'bold' }
      },
      data: allData
    }]
  }
})

// ─── API ─────────────────────────────────────────────────────
const calculateTax = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams({
      province: province.value,
      businessType: businessType.value
    })
    if (overrideIncome.value > 0) params.append('grossIncome', String(overrideIncome.value))
    if (overrideExpenses.value > 0) params.append('totalExpenses', String(overrideExpenses.value))

    const data = await $fetch<{ estimate: TaxEstimate; provinces: ProvinceOption[]; comparison: ProvinceComparison[] }>(
      `/api/admin/bookkeeping/tax?${params.toString()}`,
      { headers: getAuthHeaders() }
    )

    estimate.value = data.estimate || estimate.value
    if (data.provinces?.length) {
      provinces.value = data.provinces
    }

    if (overrideIncome.value === 0 && data.estimate?.grossIncome) {
      overrideIncome.value = data.estimate.grossIncome
    }
    if (overrideExpenses.value === 0 && data.estimate?.totalExpenses) {
      overrideExpenses.value = data.estimate.totalExpenses
    }

    if (data.comparison?.length) {
      comparisonProvinces.value = data.comparison
    }
  } catch (err: any) {
    console.error('Error calculating tax:', err)
    errorMessage.value = err?.data?.statusMessage || err?.data?.message || 'Failed to calculate tax'
    snackbar.value = true
  } finally {
    loading.value = false
  }
}

// ─── Watchers ────────────────────────────────────────────────
watch(businessType, () => {
  calculateTax()
})

// ─── Lifecycle ───────────────────────────────────────────────
onMounted(() => {
  calculateTax()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;600;700;800&display=swap');

.tax-page {
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

.lh-tight {
  line-height: 1.2;
}

.premium-accent-bar {
  width: 40px;
  height: 4px;
  background: #8c734b;
  border-radius: 2px;
}

/* Cards */
.stat-card {
  border-radius: 20px !important;
  border: 1px solid rgba(0, 0, 0, 0.05) !important;
  background: white !important;
}

.result-card {
  border-radius: 20px !important;
  border: 1px solid rgba(0, 0, 0, 0.05) !important;
  background: white !important;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), border-color 0.3s ease;
}

.result-card:hover {
  transform: translateY(-4px);
  border-color: #8c734b !important;
}

.analytics-card {
  border-radius: 24px !important;
  background: white !important;
  border: 1px solid rgba(0, 0, 0, 0.05) !important;
}

/* Orbs */
.icon-orb {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.success-orb {
  background: rgba(67, 160, 71, 0.1);
  color: #43a047;
}

.error-orb {
  background: rgba(239, 83, 80, 0.1);
  color: #ef5350;
}

.gold-orb {
  background: rgba(140, 115, 75, 0.1);
  color: #8c734b;
}

.info-orb {
  background: rgba(21, 101, 192, 0.1);
  color: #1565c0;
}

.purple-orb {
  background: rgba(123, 31, 162, 0.1);
  color: #7b1fa2;
}

.warning-orb {
  background: rgba(239, 108, 0, 0.1);
  color: #ef6c00;
}

.teal-orb {
  background: rgba(0, 137, 123, 0.1);
  color: #00897b;
}

/* Chart */
.chart-container {
  padding: 8px;
  background: #fcfcfb;
  border-radius: 16px;
  border: 1px solid #f1f1ee;
}

/* Table */
.premium-table :deep(th) {
  background: #fafaf9 !important;
  font-size: 0.7rem !important;
  font-weight: 700 !important;
  letter-spacing: 1px !important;
  text-transform: uppercase !important;
  color: #999 !important;
}

.table-row-hover:hover {
  background: #fcfcfb !important;
}

.selected-province {
  background: rgba(140, 115, 75, 0.04) !important;
}

/* Toggle */
.premium-toggle-btn {
  text-transform: none !important;
  font-weight: 700 !important;
  font-size: 0.8rem !important;
  letter-spacing: 0.3px !important;
}

/* Input */
.premium-input :deep(.v-field) {
  border-radius: 12px;
}

@media (max-width: 960px) {
  .tax-page {
    padding: 12px !important;
  }

  .text-h3 {
    font-size: 1.6rem !important;
  }
}
</style>
