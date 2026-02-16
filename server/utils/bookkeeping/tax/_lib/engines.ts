/**
 * Canada Tax Engine — Pure Calculation Engines
 *
 * These are stateless, pure functions with ZERO side effects.
 * They take data in and return results — no DB, no config lookups.
 * This makes them unit-test-ready and reusable across services.
 */

import type { TaxBracket } from './types'

// ─── Rounding Utilities ──────────────────────────────────────
export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function round4(n: number): number {
  return Math.round(n * 10000) / 10000
}

// ─── Progressive Tax Engine (Reusable) ───────────────────────
/**
 * Calculate tax using progressive brackets.
 * Used by federal and provincial personal income tax.
 */
export function calculateProgressiveTax(
  taxableIncome: number,
  brackets: TaxBracket[]
): number {
  if (taxableIncome <= 0) return 0

  let tax = 0
  for (const bracket of brackets) {
    if (taxableIncome <= bracket.min) break
    const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min
    tax += taxableInBracket * bracket.rate
  }
  return round2(tax)
}

/**
 * Get the marginal tax rate for a given income.
 */
export function getMarginalRate(
  taxableIncome: number,
  brackets: TaxBracket[]
): number {
  if (taxableIncome <= 0) return brackets[0]?.rate || 0

  for (let i = brackets.length - 1; i >= 0; i--) {
    if (taxableIncome > brackets[i]!.min) {
      return brackets[i]!.rate
    }
  }
  return brackets[0]?.rate || 0
}

// ─── Small Business Deduction Engine ─────────────────────────
/**
 * Calculate corporate tax with SBD logic.
 * CCPC gets reduced rate on first $smallBusinessLimit of active business income.
 */
export function calculateCorporateTaxSplit(
  netIncome: number,
  federalSmallRate: number,
  federalGeneralRate: number,
  provincialSmallRate: number,
  provincialGeneralRate: number,
  smallBusinessLimit: number,
  isCCPC: boolean = true
): {
  smallBusinessIncome: number
  generalIncome: number
  federalSmallBizTax: number
  federalGeneralTax: number
  federalTaxTotal: number
  provincialSmallBizTax: number
  provincialGeneralTax: number
  provincialTaxTotal: number
  totalTax: number
} {
  if (netIncome <= 0) {
    return {
      smallBusinessIncome: 0, generalIncome: 0,
      federalSmallBizTax: 0, federalGeneralTax: 0, federalTaxTotal: 0,
      provincialSmallBizTax: 0, provincialGeneralTax: 0, provincialTaxTotal: 0,
      totalTax: 0,
    }
  }

  const smallBizIncome = isCCPC ? Math.min(netIncome, smallBusinessLimit) : 0
  const generalIncome = isCCPC ? Math.max(0, netIncome - smallBusinessLimit) : netIncome

  const federalSmallBizTax = round2(smallBizIncome * federalSmallRate)
  const federalGeneralTax = round2(generalIncome * federalGeneralRate)
  const federalTaxTotal = round2(federalSmallBizTax + federalGeneralTax)

  const provincialSmallBizTax = round2(smallBizIncome * provincialSmallRate)
  const provincialGeneralTax = round2(generalIncome * provincialGeneralRate)
  const provincialTaxTotal = round2(provincialSmallBizTax + provincialGeneralTax)

  return {
    smallBusinessIncome: smallBizIncome,
    generalIncome,
    federalSmallBizTax,
    federalGeneralTax,
    federalTaxTotal,
    provincialSmallBizTax,
    provincialGeneralTax,
    provincialTaxTotal,
    totalTax: round2(federalTaxTotal + provincialTaxTotal),
  }
}

// ─── Payroll Deduction Engine ────────────────────────────────
/**
 * Calculate CPP contribution for an individual.
 */
export function calculateCPP(
  grossIncome: number,
  rate: number,
  maxPensionableEarnings: number,
  basicExemption: number,
  maxContribution: number
): { employee: number; employer: number } {
  const pensionable = Math.max(0, Math.min(grossIncome, maxPensionableEarnings) - basicExemption)
  const contribution = round2(Math.min(pensionable * rate, maxContribution))
  return { employee: contribution, employer: contribution }
}

/**
 * Calculate EI contribution.
 */
export function calculateEI(
  grossIncome: number,
  employeeRate: number,
  employerMultiplier: number,
  maxInsurableEarnings: number,
  maxEmployeeContribution: number
): { employee: number; employer: number } {
  const insurable = Math.min(grossIncome, maxInsurableEarnings)
  const employee = round2(Math.min(insurable * employeeRate, maxEmployeeContribution))
  const employer = round2(employee * employerMultiplier)
  return { employee, employer }
}

// ─── Sales Tax Engine ────────────────────────────────────────
/**
 * Calculate sales tax on an amount.
 */
export function calculateSalesTaxOnAmount(
  amount: number,
  gstRate: number,
  hstRate: number,
  pstRate: number,
  hasHST: boolean
): { gst: number; hst: number; pst: number; total: number; rate: number } {
  if (hasHST) {
    const hst = round2(amount * hstRate)
    return { gst: 0, hst, pst: 0, total: hst, rate: hstRate }
  }
  const gst = round2(amount * gstRate)
  const pst = round2(amount * pstRate)
  return { gst, hst: 0, pst, total: round2(gst + pst), rate: round2(gstRate + pstRate) }
}

// ─── RRSP Engine ─────────────────────────────────────────────
/**
 * Calculate RRSP contribution room and tax savings.
 */
export function calculateRRSP(
  earnedIncome: number,
  contributionRate: number,
  annualLimit: number,
  marginalRate: number,
  carryForwardRoom: number = 0
): { room: number; suggestedContribution: number; taxSavings: number } {
  const currentYearRoom = round2(Math.min(earnedIncome * contributionRate, annualLimit))
  const totalRoom = round2(currentYearRoom + carryForwardRoom)
  const suggestedContribution = totalRoom
  const taxSavings = round2(suggestedContribution * marginalRate)
  return { room: totalRoom, suggestedContribution, taxSavings }
}
