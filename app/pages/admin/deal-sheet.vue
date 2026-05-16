<template>
  <div class="deal-sheet-root">
    <div class="deal-sheet pa-md-10 pa-5">
      <header class="deal-hero mb-8 no-print">
        <div class="d-flex align-center mb-3 flex-wrap">
          <v-btn
            icon="mdi-arrow-left"
            variant="text"
            size="small"
            class="mr-1"
            to="/admin"
            aria-label="Back to admin dashboard"
          />
          <div class="premium-accent-bar mr-4" />
          <span class="text-overline letter-spacing-2 text-medium-emphasis">Tools &amp; workspace</span>
        </div>
        <div class="d-flex flex-wrap align-end justify-space-between ga-6">
          <div>
            <v-chip color="primary" variant="tonal" size="small" class="font-weight-bold mb-4 premium-chip">
              <v-icon start size="16">mdi-calculator-variant</v-icon>
              Commission calculator
            </v-chip>
            <h1 class="display-serif text-h4 text-md-h3 font-weight-bold mb-2">Commission Deal Sheet</h1>
            <p class="text-body-1 text-medium-emphasis mb-0 hero-sub">
              Estimate gross commission, referrals, and net to agent. Private to this browser—nothing is saved.
            </p>
          </div>
          <div class="hero-meta d-none d-sm-flex align-center ga-3">
            <div class="hero-meta-inner">
              <v-icon icon="mdi-shield-lock-outline" size="18" class="mr-2 text-primary" />
              <span class="text-caption font-weight-medium">Client-side only</span>
            </div>
          </div>
        </div>
      </header>

      <v-alert
        type="info"
        variant="tonal"
        border="start"
        class="mb-8 text-body-2 no-print deal-disclaimer"
        rounded="lg"
      >
        <div class="font-weight-bold mb-1">Planning reference</div>
        Confirm figures, GST treatment, and brokerage splits with your broker and accountant before relying on this sheet.
      </v-alert>

      <v-stepper v-model="step" class="deal-stepper deal-stepper-premium" flat>
        <v-stepper-header class="deal-stepper-header px-0">
          <v-stepper-item :complete="Number(step) > 1" value="1" title="Deal details" />
          <v-divider />
          <v-stepper-item :complete="Number(step) > 2" value="2" title="Commission" />
          <v-divider />
          <v-stepper-item value="3" title="Deal sheet" />
        </v-stepper-header>

      <v-stepper-window>
        <!-- Step 1 -->
        <v-stepper-window-item value="1">
          <v-card class="deal-form-card pa-6 pa-md-8 mt-5" rounded="xl" elevation="0">
            <div class="section-kicker text-overline letter-spacing-2 text-medium-emphasis mb-1">Step 1</div>
            <h2 class="text-h6 font-weight-bold mb-6">Property &amp; agent</h2>
            <v-row dense>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.firstName"
                  label="Agent first name"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-account-outline"
                  class="premium-field"
                  hide-details="auto"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.lastName"
                  label="Agent last name"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-account-outline"
                  class="premium-field"
                  hide-details="auto"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="form.brokerage"
                  label="Brokerage"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-domain"
                  placeholder="e.g. eXp Realty"
                  class="premium-field"
                  hide-details="auto"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="form.addressLine"
                  label="Property address"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-map-marker-outline"
                  placeholder="Street, City, Province, Postal code"
                  class="premium-field"
                  hide-details="auto"
                />
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <v-text-field
                  v-model="form.province"
                  label="Province"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-map-outline"
                  class="premium-field"
                  hide-details="auto"
                />
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <v-select
                  v-model="form.side"
                  :items="sideItems"
                  item-title="title"
                  item-value="value"
                  label="Side representation"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-swap-horizontal"
                  class="premium-field"
                  hide-details="auto"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model.number="form.salePriceInclGst"
                  label="Sale price (incl. 5% GST)"
                  type="number"
                  min="0"
                  step="1000"
                  prefix="$"
                  variant="outlined"
                  density="comfortable"
                  hint="Canadian GST (5%) included in this figure"
                  persistent-hint
                  prepend-inner-icon="mdi-currency-usd"
                  class="premium-field"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="form.commissionPreTax"
                  label="Commission base (pre-tax)"
                  type="number"
                  min="0"
                  step="0.01"
                  prefix="$"
                  variant="outlined"
                  density="comfortable"
                  :hint="commissionBaseHint"
                  persistent-hint
                  prepend-inner-icon="mdi-finance"
                  class="premium-field"
                />
                <v-btn
                  size="small"
                  variant="tonal"
                  color="primary"
                  class="mt-2 text-none rounded-lg"
                  prepend-icon="mdi-refresh"
                  @click="syncCommissionBaseFromSale"
                >
                  Apply sale ÷ 1.05
                </v-btn>
              </v-col>
            </v-row>
            <div class="d-flex justify-end mt-8 pt-2">
              <v-btn
                color="primary"
                size="large"
                :disabled="!step1Valid"
                class="text-none rounded-xl px-8"
                prepend-icon="mdi-arrow-right"
                @click="step = '2'"
              >
                Continue
              </v-btn>
            </div>
          </v-card>
        </v-stepper-window-item>

        <!-- Step 2 -->
        <v-stepper-window-item value="2">
          <v-card class="deal-form-card pa-6 pa-md-8 mt-5" rounded="xl" elevation="0">
            <div class="section-kicker text-overline letter-spacing-2 text-medium-emphasis mb-1">Step 2</div>
            <h2 class="text-h6 font-weight-bold mb-2">Commission structure</h2>
            <p class="text-body-2 text-medium-emphasis mb-6">
              Choose how gross commission is calculated on the pre-tax base, then add referrals or desk fees.
            </p>

            <v-row class="tier-card-row mb-6" dense>
              <v-col cols="12" md="4">
                <button
                  type="button"
                  class="tier-card"
                  :class="{ 'tier-card--active': form.tier === 'tier1' }"
                  @click="form.tier = 'tier1'"
                >
                  <v-icon icon="mdi-tune-vertical" class="tier-card__icon mb-3" />
                  <div class="tier-card__title">Tier 1</div>
                  <div class="tier-card__desc">Custom two-part percentage on a cap amount and balance</div>
                </button>
              </v-col>
              <v-col cols="12" md="4">
                <button
                  type="button"
                  class="tier-card"
                  :class="{ 'tier-card--active': form.tier === 'tier2' }"
                  @click="form.tier = 'tier2'"
                >
                  <v-icon icon="mdi-percent-outline" class="tier-card__icon mb-3" />
                  <div class="tier-card__title">Tier 2</div>
                  <div class="tier-card__desc">3.5% on first $100k + 1.5% on remainder</div>
                </button>
              </v-col>
              <v-col cols="12" md="4">
                <button
                  type="button"
                  class="tier-card"
                  :class="{ 'tier-card--active': form.tier === 'tier3' }"
                  @click="form.tier = 'tier3'"
                >
                  <v-icon icon="mdi-cash-multiple" class="tier-card__icon mb-3" />
                  <div class="tier-card__title">Tier 3</div>
                  <div class="tier-card__desc">Single flat gross commission amount</div>
                </button>
              </v-col>
            </v-row>

            <v-expand-transition>
              <div v-if="form.tier === 'tier1'" class="mb-6">
                <v-row dense>
                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model.number="form.tier1Breakpoint"
                      label="First bracket cap (amount)"
                      type="number"
                      min="0"
                      prefix="$"
                      variant="outlined"
                      density="comfortable"
                      hint="First rate applies up to this amount on the commission base"
                      persistent-hint
                      class="premium-field"
                    />
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model.number="form.tier1PctFirst"
                      label="Rate on first bracket"
                      type="number"
                      min="0"
                      step="0.01"
                      suffix="%"
                      variant="outlined"
                      density="comfortable"
                      class="premium-field"
                      hide-details="auto"
                    />
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model.number="form.tier1PctRest"
                      label="Rate on remaining balance"
                      type="number"
                      min="0"
                      step="0.01"
                      suffix="%"
                      variant="outlined"
                      density="comfortable"
                      class="premium-field"
                      hide-details="auto"
                    />
                  </v-col>
                </v-row>
              </div>
            </v-expand-transition>

            <v-expand-transition>
              <div v-if="form.tier === 'tier3'" class="mb-6">
                <v-text-field
                  v-model.number="form.tier3Flat"
                  label="Flat gross commission ($)"
                  type="number"
                  min="0"
                  step="0.01"
                  prefix="$"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-currency-usd"
                  class="premium-field max-w-md"
                  hide-details="auto"
                />
              </div>
            </v-expand-transition>

            <v-sheet v-if="form.tier === 'tier2'" rounded="lg" border class="pa-4 mb-6 tier2-callout">
              <div class="d-flex align-start ga-3">
                <v-icon icon="mdi-information-outline" color="primary" class="mt-1" />
                <p class="text-body-2 text-medium-emphasis mb-0">
                  Applied to <strong>commission base (pre-tax)</strong>:
                  <strong>3.5%</strong> on the first <strong>$100,000</strong> and <strong>1.5%</strong> on the remainder.
                </p>
              </div>
            </v-sheet>

            <div class="section-kicker text-overline letter-spacing-2 text-medium-emphasis mb-2">Other side (optional)</div>
            <v-row dense class="mb-4">
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="form.listingFlatOverride"
                  label="Listing gross (flat fee)"
                  type="number"
                  min="0"
                  step="0.01"
                  prefix="$"
                  variant="outlined"
                  density="comfortable"
                  hint="Fixed listing-side amount in addition to your calculated side"
                  persistent-hint
                  class="premium-field"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="form.buyerFlatOverride"
                  label="Buyer gross (flat fee)"
                  type="number"
                  min="0"
                  step="0.01"
                  prefix="$"
                  variant="outlined"
                  density="comfortable"
                  hint="Fixed buyer-side amount in addition to your calculated side"
                  persistent-hint
                  class="premium-field"
                />
              </v-col>
            </v-row>

            <v-divider class="my-6 opacity-20" />

            <div class="section-kicker text-overline letter-spacing-2 text-medium-emphasis mb-2">Referral</div>
            <v-checkbox
              v-model="form.hasReferral"
              label="Deduct referral commission after gross is calculated"
              hide-details
              density="comfortable"
              class="mb-2"
              color="primary"
            />
            <v-expand-transition>
              <v-text-field
                v-if="form.hasReferral"
                v-model.number="form.referralAmount"
                label="Referral amount ($)"
                type="number"
                min="0"
                step="0.01"
                prefix="$"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-hand-coin-outline"
                class="premium-field max-w-sm"
                hide-details="auto"
              />
            </v-expand-transition>

            <v-divider class="my-6 opacity-20" />

            <div class="section-kicker text-overline letter-spacing-2 text-medium-emphasis mb-2">Brokerage / back office</div>
            <v-text-field
              v-model.number="form.backOfficeAmount"
              label="Amount to brokerage or back office (optional)"
              type="number"
              min="0"
              step="0.01"
              prefix="$"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-bank-outline"
              class="premium-field max-w-sm"
              hint="After referral — desk fees, splits, etc."
              persistent-hint
            />

            <div
              v-if="step2Valid"
              class="live-estimate no-print d-flex flex-wrap align-center justify-space-between ga-4 mt-8 pa-4 rounded-xl"
            >
              <div>
                <div class="text-caption text-medium-emphasis text-uppercase letter-spacing-1">Your side (before referral &amp; fees)</div>
                <div class="text-h5 font-weight-bold">{{ formatMoney(calculatedPrimaryGross) }}</div>
              </div>
              <div class="text-body-2 text-medium-emphasis text-md-right" style="max-width: 280px">
                Net on the deal sheet includes optional flats on the other side, then referral and back office.
              </div>
            </div>

            <div class="d-flex flex-wrap justify-space-between mt-8 pt-2 ga-3">
              <v-btn variant="text" class="text-none rounded-lg" prepend-icon="mdi-arrow-left" @click="step = '1'">Back</v-btn>
              <v-btn
                color="primary"
                size="large"
                :disabled="!step2Valid"
                class="text-none rounded-xl px-8"
                prepend-icon="mdi-file-document-outline"
                @click="step = '3'"
              >
                View deal sheet
              </v-btn>
            </div>
          </v-card>
        </v-stepper-window-item>

        <!-- Step 3 -->
        <v-stepper-window-item value="3">
          <v-card class="deal-form-card deal-sheet-print pa-6 pa-md-8 mt-5" rounded="xl" elevation="0">
            <div class="d-flex flex-wrap justify-space-between align-center mb-6 no-print ga-3">
              <v-btn variant="tonal" class="text-none rounded-lg" prepend-icon="mdi-arrow-left" @click="step = '2'">Back</v-btn>
              <div class="d-flex flex-wrap ga-2">
                <v-btn variant="tonal" color="secondary" prepend-icon="mdi-refresh" class="text-none rounded-lg" @click="resetForm">
                  New sheet
                </v-btn>
                <v-btn color="primary" prepend-icon="mdi-printer" size="large" class="text-none rounded-xl px-6" @click="printSheet">
                  Print / PDF
                </v-btn>
              </div>
            </div>

            <div class="sheet-paper pa-6 pa-md-10">
              <div class="sheet-paper__accent" aria-hidden="true" />
              <div class="text-overline letter-spacing-2 text-primary mb-1 font-weight-bold">Commission deal sheet</div>
              <div class="display-serif text-h4 font-weight-bold mb-1">{{ agentDisplayName }}</div>
              <div class="text-body-2 text-medium-emphasis mb-8">{{ form.brokerage || '—' }}</div>

              <v-table density="comfortable" class="sheet-table bg-transparent">
                <tbody>
                  <tr>
                    <td class="text-medium-emphasis w-40">Province</td>
                    <td class="font-weight-medium">{{ form.province || '—' }}</td>
                  </tr>
                  <tr>
                    <td class="text-medium-emphasis align-top">Property</td>
                    <td class="font-weight-medium">{{ form.addressLine || '—' }}</td>
                  </tr>
                  <tr>
                    <td class="text-medium-emphasis">Sale price (incl. 5% tax)</td>
                    <td class="font-weight-bold">{{ formatMoney(form.salePriceInclGst) }}</td>
                  </tr>
                  <tr>
                    <td class="text-medium-emphasis">Side representation</td>
                    <td class="font-weight-medium">{{ sideLabel }}</td>
                  </tr>
                  <tr>
                    <td class="text-medium-emphasis">Commission base (pre-tax)</td>
                    <td class="font-weight-medium">{{ formatMoney(effectiveCommissionBase) }}</td>
                  </tr>
                  <tr>
                    <td class="text-medium-emphasis">Agent / Brokerage</td>
                    <td class="font-weight-medium">{{ agentDisplayName }} — {{ form.brokerage || '—' }}</td>
                  </tr>
                </tbody>
              </v-table>

              <v-divider class="my-8" />

              <div class="text-overline letter-spacing-2 text-medium-emphasis mb-3">Gross commission</div>
              <v-table density="comfortable" class="sheet-table bg-transparent">
                <tbody>
                  <tr>
                    <td>Listing gross commission (flat fee)</td>
                    <td class="text-right font-weight-medium">{{ formatMoney(sheet.listingGross) }}</td>
                  </tr>
                  <tr>
                    <td>Buyer gross commission (flat fee)</td>
                    <td class="text-right font-weight-medium">{{ formatMoney(sheet.buyerGross) }}</td>
                  </tr>
                  <tr class="text-h6 font-weight-black">
                    <td>Total gross commission</td>
                    <td class="text-right">{{ formatMoney(sheet.totalGross) }}</td>
                  </tr>
                </tbody>
              </v-table>

              <v-divider class="my-8" />

              <div class="sheet-agent-block pa-5 rounded-xl mb-6">
                <div class="text-overline letter-spacing-2 text-medium-emphasis mb-1">{{ roleLine }}</div>
                <div class="text-h6 font-weight-bold">{{ agentDisplayName }}</div>
              </div>

              <v-table density="comfortable" class="sheet-table bg-transparent mb-2">
                <tbody>
                  <tr>
                    <td>Gross commission</td>
                    <td class="text-right font-weight-bold">{{ formatMoney(sheet.primarySideGross) }}</td>
                  </tr>
                  <tr v-if="form.hasReferral && form.referralAmount > 0">
                    <td>Referral deduction</td>
                    <td class="text-right text-error">− {{ formatMoney(form.referralAmount) }}</td>
                  </tr>
                  <tr v-if="form.backOfficeAmount > 0">
                    <td>Amount for back office</td>
                    <td class="text-right">{{ formatMoney(form.backOfficeAmount) }}</td>
                  </tr>
                  <tr class="net-row">
                    <td class="font-weight-bold">Net to agent</td>
                    <td class="text-right font-weight-bold text-h6">{{ formatMoney(sheet.netToAgent) }}</td>
                  </tr>
                </tbody>
              </v-table>

              <div class="text-caption text-medium-emphasis mt-8 mb-0">
                Tier:
                <span v-if="form.tier === 'tier1'">custom {{ form.tier1PctFirst }}% / {{ form.tier1PctRest }}% on balance after ${{ formatNumber(form.tier1Breakpoint) }} cap</span>
                <span v-else-if="form.tier === 'tier2'">3.5% on first $100,000 + 1.5% on remainder</span>
                <span v-else>flat {{ formatMoney(form.tier3Flat) }}</span>
                · Page 1
              </div>
              <div class="text-caption text-medium-emphasis mt-4 mb-0 no-print">
                Tip: you can also use your browser’s print ({{ printShortcut }}) when this step is open.
              </div>
              <div class="text-caption text-medium-emphasis mt-2 mb-0 print-only">
                Generated {{ printedAt }}
              </div>
            </div>
          </v-card>
        </v-stepper-window-item>
      </v-stepper-window>
    </v-stepper>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'

definePageMeta({
  layout: 'admin',
  middleware: ['admin', 'delegate-feature'],
  delegateFeature: 'core',
})

const GST = 0.05

const step = ref('1')

/** Timestamp shown on printed deal sheet only */
const printedAt = ref('')
function refreshPrintedAt() {
  printedAt.value = new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date())
}

const printShortcut = computed(() =>
  typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform || '') ? '⌘P' : 'Ctrl+P',
)

const PRINT_STYLE_ID = 'deal-sheet-admin-print-overrides'

const form = reactive({
  firstName: '',
  lastName: '',
  brokerage: '',
  addressLine: '',
  province: 'Alberta',
  side: 'buying' as 'buying' | 'listing',
  salePriceInclGst: 0,
  commissionPreTax: 0,
  tier: 'tier2' as 'tier1' | 'tier2' | 'tier3',
  tier1Breakpoint: 100_000,
  tier1PctFirst: 3.5,
  tier1PctRest: 1.5,
  tier3Flat: 0,
  listingFlatOverride: 0,
  buyerFlatOverride: 0,
  hasReferral: false,
  referralAmount: 0,
  backOfficeAmount: 0,
})

const sideItems = [
  { title: 'Buying', value: 'buying' },
  { title: 'Listing', value: 'listing' },
]

function syncCommissionBaseFromSale() {
  if (form.salePriceInclGst > 0) {
    form.commissionPreTax = Math.round((form.salePriceInclGst / (1 + GST)) * 100) / 100
  }
}

const commissionBaseHint = computed(() => {
  if (form.salePriceInclGst > 0) {
    const sug = Math.round((form.salePriceInclGst / (1 + GST)) * 100) / 100
    return `Suggested from sale ÷ 1.05: ${formatMoney(sug)}`
  }
  return 'Typically sale price including GST ÷ 1.05 — use the button below to fill'
})

const effectiveCommissionBase = computed(() => {
  const n = Number(form.commissionPreTax)
  return Number.isFinite(n) && n >= 0 ? n : 0
})

function tierGrossOnBase(base: number): number {
  if (form.tier === 'tier3') {
    return Math.max(0, Number(form.tier3Flat) || 0)
  }
  if (form.tier === 'tier2') {
    const first = Math.min(base, 100_000)
    const rest = Math.max(0, base - 100_000)
    return first * 0.035 + rest * 0.015
  }
  const cap = Math.max(0, Number(form.tier1Breakpoint) || 0)
  const p1 = Math.max(0, Number(form.tier1PctFirst) || 0) / 100
  const p2 = Math.max(0, Number(form.tier1PctRest) || 0) / 100
  const firstPortion = Math.min(base, cap)
  const rest = Math.max(0, base - cap)
  return firstPortion * p1 + rest * p2
}

const calculatedPrimaryGross = computed(() =>
  roundCurrency(tierGrossOnBase(effectiveCommissionBase.value)),
)

const sheet = computed(() => {
  const base = effectiveCommissionBase.value
  const listingExtra = Math.max(0, Number(form.listingFlatOverride) || 0)
  const buyerExtra = Math.max(0, Number(form.buyerFlatOverride) || 0)
  const calc = calculatedPrimaryGross.value

  let listingGross = listingExtra
  let buyerGross = buyerExtra
  if (form.side === 'listing') {
    listingGross += calc
  } else {
    buyerGross += calc
  }

  const totalGross = roundCurrency(listingGross + buyerGross)
  const primarySideGross = form.side === 'listing' ? listingGross : buyerGross
  const referral = form.hasReferral ? Math.max(0, Number(form.referralAmount) || 0) : 0
  const back = Math.max(0, Number(form.backOfficeAmount) || 0)
  const netToAgent = roundCurrency(Math.max(0, primarySideGross - referral - back))

  return {
    listingGross: roundCurrency(listingGross),
    buyerGross: roundCurrency(buyerGross),
    totalGross,
    primarySideGross: roundCurrency(primarySideGross),
    netToAgent,
  }
})

const agentDisplayName = computed(() => {
  const a = `${form.firstName} ${form.lastName}`.trim()
  return a || '—'
})

const sideLabel = computed(() => (form.side === 'listing' ? 'Listing' : 'Buying'))

const roleLine = computed(() => (form.side === 'listing' ? "Listing agent" : "Buyer's agent"))

const step1Valid = computed(() => {
  return (
    form.firstName.trim().length > 0 &&
    form.lastName.trim().length > 0 &&
    form.addressLine.trim().length > 0 &&
    form.salePriceInclGst > 0 &&
    effectiveCommissionBase.value > 0
  )
})

const step2Valid = computed(() => {
  if (form.tier === 'tier1') {
    return (
      Number(form.tier1Breakpoint) >= 0 &&
      Number(form.tier1PctFirst) >= 0 &&
      Number(form.tier1PctRest) >= 0
    )
  }
  if (form.tier === 'tier3') {
    return Number(form.tier3Flat) > 0
  }
  return effectiveCommissionBase.value > 0
})

function injectPrintStyles() {
  if (!import.meta.client) return
  if (document.getElementById(PRINT_STYLE_ID)) return
  const el = document.createElement('style')
  el.id = PRINT_STYLE_ID
  el.textContent = `
@media print {
  .admin-layout > *:not(.admin-main-content) {
    display: none !important;
  }
  .admin-main-content {
    padding: 0 !important;
    margin: 0 !important;
  }
  .deal-stepper .v-window__container .v-window-item:not(.v-window-item--active) {
    display: none !important;
    height: 0 !important;
    overflow: hidden !important;
  }
  .deal-stepper .v-window__container .v-window-item.v-window-item--active {
    display: block !important;
    opacity: 1 !important;
    visibility: visible !important;
  }
  @page {
    margin: 12mm;
  }
}
`
  document.head.appendChild(el)
}

function removePrintStyles() {
  if (!import.meta.client) return
  document.getElementById(PRINT_STYLE_ID)?.remove()
}

function onBeforePrint() {
  refreshPrintedAt()
  if (step1Valid.value && step2Valid.value) {
    step.value = '3'
  }
}

onMounted(() => {
  refreshPrintedAt()
  injectPrintStyles()
  if (import.meta.client) {
    window.addEventListener('beforeprint', onBeforePrint)
  }
})

onUnmounted(() => {
  removePrintStyles()
  if (import.meta.client) {
    window.removeEventListener('beforeprint', onBeforePrint)
  }
})

function roundCurrency(n: number) {
  return Math.round(n * 100) / 100
}

function formatNumber(n: number) {
  return new Intl.NumberFormat('en-CA').format(n)
}

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n || 0)
}

function printSheet() {
  if (!import.meta.client) return
  refreshPrintedAt()
  if (step.value !== '3') step.value = '3'
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.print()
    })
  })
}

function resetForm() {
  step.value = '1'
  form.firstName = ''
  form.lastName = ''
  form.brokerage = ''
  form.addressLine = ''
  form.province = 'Alberta'
  form.side = 'buying'
  form.salePriceInclGst = 0
  form.commissionPreTax = 0
  form.tier = 'tier2'
  form.tier1Breakpoint = 100_000
  form.tier1PctFirst = 3.5
  form.tier1PctRest = 1.5
  form.tier3Flat = 0
  form.listingFlatOverride = 0
  form.buyerFlatOverride = 0
  form.hasReferral = false
  form.referralAmount = 0
  form.backOfficeAmount = 0
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap');

.deal-sheet-root {
  min-height: 100%;
  background: linear-gradient(180deg, #f5f7fb 0%, #fafbfd 45%, #f0f3f8 100%);
  padding-bottom: 3rem;
}

.deal-sheet {
  max-width: 920px;
  margin: 0 auto;
  font-family: 'DM Sans', system-ui, sans-serif;
}

.display-serif {
  font-family: 'Playfair Display', 'Georgia', serif;
  letter-spacing: -0.02em;
}

.premium-accent-bar {
  width: 40px;
  height: 4px;
  background: linear-gradient(90deg, rgb(var(--v-theme-primary)) 0%, rgba(140, 115, 75, 0.85) 100%);
  border-radius: 2px;
}

.hero-sub {
  max-width: 640px;
  line-height: 1.55;
}

.hero-meta-inner {
  display: inline-flex;
  align-items: center;
  padding: 10px 16px;
  border-radius: 12px;
  background: rgba(var(--v-theme-primary), 0.08);
  border: 1px solid rgba(var(--v-theme-primary), 0.15);
}

.premium-chip {
  border-radius: 10px !important;
}

.deal-disclaimer {
  border-radius: 14px !important;
}

.deal-stepper-premium :deep(.v-stepper-header) {
  box-shadow: none;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(8px);
  border-radius: 16px;
  border: 1px solid rgba(15, 23, 42, 0.06);
  padding: 8px 12px !important;
  margin-bottom: 4px;
}

.deal-stepper-premium :deep(.v-stepper-item--selected) {
  font-weight: 600;
}

.deal-form-card {
  background: rgba(255, 255, 255, 0.92) !important;
  border: 1px solid rgba(15, 23, 42, 0.07) !important;
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    0 12px 40px -16px rgba(15, 23, 42, 0.12) !important;
}

.section-kicker {
  font-size: 0.7rem;
  font-weight: 600;
}

.premium-field :deep(.v-field) {
  border-radius: 12px;
}

.tier-card {
  display: block;
  width: 100%;
  text-align: left;
  padding: 1.25rem 1.25rem;
  border-radius: 16px;
  border: 1px solid rgba(15, 23, 42, 0.1);
  background: rgba(255, 255, 255, 0.65);
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease,
    transform 0.15s ease;
  font: inherit;
  color: inherit;
  min-height: 140px;
}

.tier-card:hover {
  border-color: rgba(var(--v-theme-primary), 0.35);
  background: rgba(var(--v-theme-primary), 0.04);
  transform: translateY(-1px);
  box-shadow: 0 8px 24px -12px rgba(15, 23, 42, 0.2);
}

.tier-card--active {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.09);
  box-shadow:
    0 0 0 1px rgb(var(--v-theme-primary)),
    0 12px 32px -16px rgba(var(--v-theme-primary), 0.35);
}

.tier-card__icon {
  opacity: 0.85;
  color: rgb(var(--v-theme-primary));
}

.tier-card__title {
  font-weight: 700;
  font-size: 1rem;
  margin-bottom: 4px;
}

.tier-card__desc {
  font-size: 0.8125rem;
  line-height: 1.45;
  color: rgba(var(--v-theme-on-surface), 0.62);
}

.tier-card:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

.tier2-callout {
  background: rgba(var(--v-theme-primary), 0.04) !important;
  border-color: rgba(var(--v-theme-primary), 0.12) !important;
}

.live-estimate {
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.1) 0%, rgba(var(--v-theme-primary), 0.04) 100%);
  border: 1px solid rgba(var(--v-theme-primary), 0.15);
}

.sheet-paper {
  position: relative;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 20px;
  background: linear-gradient(180deg, #ffffff 0%, #fafbfd 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.sheet-paper__accent {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  border-radius: 20px 20px 0 0;
  background: linear-gradient(90deg, rgb(var(--v-theme-primary)), rgba(var(--v-theme-primary), 0.5));
}

.sheet-paper > *:not(.sheet-paper__accent) {
  position: relative;
  z-index: 1;
}

.sheet-table :deep(td) {
  border: none !important;
  padding-top: 12px !important;
  padding-bottom: 12px !important;
}

.sheet-agent-block {
  background: rgba(15, 23, 42, 0.04);
  border: 1px solid rgba(15, 23, 42, 0.06);
}

.net-row :deep(td) {
  padding-top: 1rem !important;
  border-top: 1px solid rgba(15, 23, 42, 0.1) !important;
}

.w-40 {
  width: 40%;
  max-width: 240px;
}

.max-w-md {
  max-width: 360px;
}

.max-w-sm {
  max-width: 280px;
}

@media print {
  .deal-sheet-root {
    background: white !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  .no-print {
    display: none !important;
  }

  .print-only {
    display: block !important;
  }

  .deal-stepper :deep(.v-stepper-header) {
    display: none !important;
  }

  .deal-sheet {
    padding: 0 !important;
    max-width: none !important;
  }

  .deal-form-card,
  .deal-sheet-print {
    box-shadow: none !important;
    border: none !important;
    background: white !important;
    padding: 0 !important;
  }

  .sheet-paper {
    border: none !important;
    background: white !important;
    box-shadow: none !important;
  }

  .sheet-paper__accent {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  .sheet-agent-block {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
    background: #f8fafc !important;
  }
}
.print-only {
  display: none;
}
</style>
