/**
 * Canada Tax Engine — Type Definitions
 * All types used across the modular tax system.
 */

// ─── Tax Brackets ────────────────────────────────────────────
export interface TaxBracket {
  min: number
  max: number   // use Infinity for the top bracket
  rate: number  // decimal (e.g. 0.15 = 15%)
}

// ─── Province Configuration ──────────────────────────────────
export interface ProvinceConfig {
  code: string
  name: string
  year: number

  // Sales tax
  gstRate: number
  hstRate: number     // 0 if province uses GST + PST
  pstRate: number     // 0 if province uses HST
  hasHST: boolean

  // Corporate tax
  corporateSmallRate: number    // Small Business Deduction rate
  corporateGeneralRate: number  // General corporate rate

  // Personal income tax
  personalBrackets: TaxBracket[]
  basicPersonalAmount: number   // Provincial basic personal amount
}

// ─── Federal Configuration ───────────────────────────────────
export interface FederalConfig {
  year: number
  personalBrackets: TaxBracket[]
  basicPersonalAmount: number
  corporateSmallRate: number      // 9% for CCPC
  corporateGeneralRate: number    // 15%
  smallBusinessLimit: number      // $500,000
}

// ─── CPP Configuration ───────────────────────────────────────
export interface CPPConfig {
  rate: number
  maxPensionableEarnings: number
  basicExemption: number
  maxContribution: number
}

// ─── EI Configuration ────────────────────────────────────────
export interface EIConfig {
  employeeRate: number
  employerMultiplier: number  // typically 1.4
  maxInsurableEarnings: number
  maxEmployeeContribution: number
}

// ─── RRSP Configuration ──────────────────────────────────────
export interface RRSPConfig {
  contributionRate: number  // 18%
  annualLimit: number       // e.g. $31,560 for 2026
}

// ─── Calculation Results ─────────────────────────────────────

export interface CorporateTaxResult {
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

export interface PersonalTaxResult {
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

export interface SalesTaxResult {
  revenue: number
  expenses: number
  gstCollected: number
  pstCollected: number
  hstCollected: number
  totalCollected: number
  gstPaid: number
  pstPaid: number
  hstPaid: number
  totalPaid: number
  netRemittance: number
  salesTaxRate: number
}

export interface PayrollDeductionResult {
  grossPay: number
  cppEmployee: number
  cppEmployer: number
  eiEmployee: number
  eiEmployer: number
  federalTaxWithheld: number
  provincialTaxWithheld: number
  totalDeductions: number
  netPay: number
  totalEmployerCost: number
}

export interface RRSPResult {
  earnedIncome: number
  contributionRoom: number
  suggestedContribution: number
  taxSavings: number
}

export interface FullTaxSummary {
  grossIncome: number
  totalExpenses: number
  province: string
  provinceName: string
  businessType: 'sole_prop' | 'corporation'
  year: number

  // Corporate (if corporation)
  corporateTax?: CorporateTaxResult

  // Personal (sole prop or salary from corp)
  personalTax?: PersonalTaxResult

  // Payroll
  cppTotal: number
  eiTotal: number

  // Summary
  federalTax: number
  provincialTax: number
  totalTax: number
  effectiveRate: number
  netIncome: number

  // Sales tax
  salesTax?: SalesTaxResult

  // RRSP
  rrsp?: RRSPResult

  // Metadata
  estimateOnly: true
}

export interface ProvinceComparison {
  code: string
  name: string
  federalTax: number
  provincialTax: number
  totalTax: number
  effectiveRate: number
  netIncome: number
}
