<template>
  <v-container class="py-10">
    <v-row class="mb-8">
      <v-col cols="12" class="text-center">
        <h1 class="text-h3 font-weight-bold mb-2">How much home can you afford?</h1>
        <p class="text-body-1 text-medium-emphasis">
          A practical guide to budgeting, down payments, and monthly costs—plus a quick calculator to estimate your price range.
        </p>
      </v-col>
    </v-row>

    <v-row class="mb-10" align="stretch">
      <v-col cols="12" md="7">
        <v-card variant="flat" class="mb-8">
          <v-card-text>
            <h2 class="text-h5 mb-3">Map out your budget</h2>
            <p class="mb-4">
              A common guideline is to keep total monthly housing expenses at or below one-third of your monthly income. Housing costs usually include
              principal, interest, property taxes, and home insurance. Leave room for changes in taxes/insurance and other recurring costs.
            </p>
            <v-alert type="info" variant="tonal" density="comfortable" class="mb-4">
              Rule of thumb: monthly housing ≤ 33% of gross monthly income.
            </v-alert>

            <h2 class="text-h5 mb-3">Down payment basics (Canada)</h2>
            <ul class="pl-6 mb-4 list-disc">
              <li>Under $500,000: minimum 5% down</li>
              <li>$500,000–$1.5M: 5% of first $500k + 10% of the remainder</li>
              <li>Over $1.5M: 20% minimum down payment</li>
            </ul>

            <h2 class="text-h5 mb-3">Closing costs</h2>
            <p class="mb-4">Budget an additional 1.5%–4% of the purchase price for closing costs (varies by province and financing).</p>

            <h2 class="text-h5 mb-3">Pre-qualification vs. pre-approval</h2>
            <ul class="pl-6 mb-4 list-disc">
              <li><strong>Pre-qualification</strong>: quick estimate based on self-reported info.</li>
              <li><strong>Pre-approval</strong>: lender-reviewed with a rate hold (typically ~90 days).</li>
            </ul>

            <h2 class="text-h5 mb-3">Consider the big picture</h2>
            <ul class="pl-6 list-disc">
              <li>Location and commute vs. space</li>
              <li>Property age and maintenance</li>
              <li>Features and ongoing costs (HOA/condo fees, utilities, upgrades)</li>
            </ul>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="5">
        <v-card class="sticky md:top-6" elevation="2">
          <v-card-title>Affordability quick calculator</v-card-title>
          <v-card-text>
            <v-form>
              <v-text-field v-model.number="form.monthlyIncome" label="Gross monthly income" prefix="$" variant="outlined" density="compact" type="number" />
              <v-text-field v-model.number="form.housingPercent" label="Housing budget (%)" suffix="%" variant="outlined" density="compact" type="number" />
              <v-divider class="my-4" />
              <v-text-field v-model.number="form.downPayment" label="Down payment (cash)" prefix="$" variant="outlined" density="compact" type="number" />
              <v-text-field v-model.number="form.rate" label="Interest rate (APR %)" suffix="%" variant="outlined" density="compact" type="number" />
              <v-text-field v-model.number="form.years" label="Amortization (years)" variant="outlined" density="compact" type="number" />
              <v-text-field v-model.number="form.taxesInsuranceMonthly" label="Taxes + insurance (monthly)" prefix="$" variant="outlined" density="compact" type="number" />
            </v-form>

            <v-divider class="my-4" />

            <div class="mb-2 d-flex align-center justify-space-between">
              <span class="text-subtitle-2">Max housing budget</span>
              <span class="text-subtitle-1 font-weight-medium">${{ formatNumber(maxHousingBudget) }}</span>
            </div>
            <div class="mb-2 d-flex align-center justify-space-between">
              <span class="text-subtitle-2">Est. P&I budget</span>
              <span class="text-subtitle-1 font-weight-medium">${{ formatNumber(principalInterestBudget) }}</span>
            </div>
            <div class="mb-2 d-flex align-center justify-space-between">
              <span class="text-subtitle-2">Max loan (estimated)</span>
              <span class="text-subtitle-1 font-weight-medium">${{ formatNumber(maxLoanAmount) }}</span>
            </div>
            <div class="mb-2 d-flex align-center justify-space-between">
              <span class="text-subtitle-2">Down payment</span>
              <span class="text-subtitle-1 font-weight-medium">${{ formatNumber(form.downPayment) }}</span>
            </div>
            <v-alert type="success" variant="tonal" density="comfortable" class="mt-3">
              Estimated maximum purchase price: <strong>${{ formatNumber(maxPurchasePrice) }}</strong>
            </v-alert>
            <div class="text-caption text-medium-emphasis mt-2">
              This quick estimate excludes CMHC insurance and other fees. For accuracy, speak with a licensed mortgage professional.
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" class="text-center">
        <v-btn 
          color="primary" 
          size="large" 
          to="/map-search"
          variant="tonal"
          text="Browse homes near you"
        />
      </v-col>
    </v-row>
  </v-container>
  
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

definePageMeta({ layout: 'default' })

const form = ref({
  monthlyIncome: 6000,
  housingPercent: 33,
  downPayment: 50000,
  rate: 5.25,
  years: 25,
  taxesInsuranceMonthly: 300
})

const maxHousingBudget = computed(() => {
  const income = Number(form.value.monthlyIncome) || 0
  const pct = Math.max(0, Math.min(100, Number(form.value.housingPercent) || 0))
  return Math.round(income * (pct / 100))
})

const principalInterestBudget = computed(() => {
  // Subtract taxes+insurance from total housing budget
  const ti = Math.max(0, Number(form.value.taxesInsuranceMonthly) || 0)
  return Math.max(0, maxHousingBudget.value - ti)
})

const maxLoanAmount = computed(() => {
  const m = principalInterestBudget.value
  const monthlyRate = (Number(form.value.rate) || 0) / 100 / 12
  const n = (Number(form.value.years) || 0) * 12
  if (m <= 0 || monthlyRate <= 0 || n <= 0) return 0
  const p = m * (Math.pow(1 + monthlyRate, n) - 1) / (monthlyRate * Math.pow(1 + monthlyRate, n))
  return Math.round(p)
})

const maxPurchasePrice = computed(() => {
  const dp = Math.max(0, Number(form.value.downPayment) || 0)
  return Math.max(0, maxLoanAmount.value + dp)
})

function formatNumber(value: number) {
  return (Number(value) || 0).toLocaleString()
}
</script>

<style scoped>
/* Keep layout responsive without changing global styles */
.sticky { position: sticky; }
@media (min-width: 960px) { .md\:top-6 { top: 24px; } }
</style>


