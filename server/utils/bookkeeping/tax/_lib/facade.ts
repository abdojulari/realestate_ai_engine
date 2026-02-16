/**
 * Canada Tax Engine — Tax Facade (Orchestrator)
 *
 * Single entry point for all tax calculations.
 * Wires together config, engines, and returns unified results.
 *
 * Usage:
 *   const facade = new TaxFacade('ON')
 *   const summary = facade.calculateFullSummary(300000, 100000, 'corporation')
 *   const comparison = TaxFacade.compareProvinces(300000, 100000, 'corporation')
 */

import type {
  FullTaxSummary,
  CorporateTaxResult,
  PersonalTaxResult,
  SalesTaxResult,
  PayrollDeductionResult,
  RRSPResult,
  ProvinceComparison,
  ProvinceConfig,
} from './types'

import { FEDERAL, CPP, EI, RRSP, getProvinceConfig, getProvinceList, getAllProvinceCodes, TAX_YEAR } from './config'

import {
  round2,
  round4,
  calculateProgressiveTax,
  getMarginalRate,
  calculateCorporateTaxSplit,
  calculateCPP,
  calculateEI,
  calculateSalesTaxOnAmount,
  calculateRRSP,
} from './engines'

// ─── Tax Facade ──────────────────────────────────────────────
export class TaxFacade {
  private province: ProvinceConfig

  constructor(provinceCode: string) {
    this.province = getProvinceConfig(provinceCode)
  }

  // ── Corporate Tax ──────────────────────────────────────────
  calculateCorporateTax(netIncome: number, isCCPC: boolean = true): CorporateTaxResult {
    const split = calculateCorporateTaxSplit(
      netIncome,
      FEDERAL.corporateSmallRate,
      FEDERAL.corporateGeneralRate,
      this.province.corporateSmallRate,
      this.province.corporateGeneralRate,
      FEDERAL.smallBusinessLimit,
      isCCPC
    )

    const effectiveRate = netIncome > 0 ? round4(split.totalTax / netIncome) : 0

    return {
      netIncome,
      smallBusinessIncome: split.smallBusinessIncome,
      generalIncome: split.generalIncome,
      federalSmallBizTax: split.federalSmallBizTax,
      federalGeneralTax: split.federalGeneralTax,
      federalTaxTotal: split.federalTaxTotal,
      provincialSmallBizTax: split.provincialSmallBizTax,
      provincialGeneralTax: split.provincialGeneralTax,
      provincialTaxTotal: split.provincialTaxTotal,
      totalCorporateTax: split.totalTax,
      effectiveRate,
      afterTaxIncome: round2(netIncome - split.totalTax),
    }
  }

  // ── Personal Tax ───────────────────────────────────────────
  calculatePersonalTax(grossIncome: number, rrspDeduction: number = 0): PersonalTaxResult {
    const deductions = rrspDeduction
    const taxableIncome = Math.max(0, grossIncome - deductions)

    // Federal: apply basic personal amount as a non-refundable credit
    const federalTaxableForBrackets = Math.max(0, taxableIncome)
    const federalGross = calculateProgressiveTax(federalTaxableForBrackets, FEDERAL.personalBrackets)
    const federalCredit = round2(FEDERAL.basicPersonalAmount * FEDERAL.personalBrackets[0]!.rate)
    const federalTax = round2(Math.max(0, federalGross - federalCredit))

    // Provincial: apply provincial basic personal amount as credit
    const provincialGross = calculateProgressiveTax(taxableIncome, this.province.personalBrackets)
    const provFirstRate = this.province.personalBrackets[0]?.rate || 0
    const provincialCredit = round2(this.province.basicPersonalAmount * provFirstRate)
    const provincialTax = round2(Math.max(0, provincialGross - provincialCredit))

    const totalIncomeTax = round2(federalTax + provincialTax)
    const effectiveRate = grossIncome > 0 ? round4(totalIncomeTax / grossIncome) : 0

    const federalMarginal = getMarginalRate(taxableIncome, FEDERAL.personalBrackets)
    const provincialMarginal = getMarginalRate(taxableIncome, this.province.personalBrackets)
    const marginalRate = round4(federalMarginal + provincialMarginal)

    return {
      grossIncome,
      deductions,
      taxableIncome,
      federalTax,
      provincialTax,
      totalIncomeTax,
      effectiveRate,
      marginalRate,
      netIncome: round2(grossIncome - totalIncomeTax),
    }
  }

  // ── Sales Tax ──────────────────────────────────────────────
  calculateSalesTax(revenue: number, expenses: number): SalesTaxResult {
    const collected = calculateSalesTaxOnAmount(
      revenue,
      this.province.gstRate, this.province.hstRate,
      this.province.pstRate, this.province.hasHST
    )
    const paid = calculateSalesTaxOnAmount(
      expenses,
      this.province.gstRate, this.province.hstRate,
      this.province.pstRate, this.province.hasHST
    )

    return {
      revenue,
      expenses,
      gstCollected: collected.gst,
      pstCollected: collected.pst,
      hstCollected: collected.hst,
      totalCollected: collected.total,
      gstPaid: paid.gst,
      pstPaid: paid.pst,
      hstPaid: paid.hst,
      totalPaid: paid.total,
      netRemittance: round2(collected.total - paid.total),
      salesTaxRate: collected.rate,
    }
  }

  // ── Payroll Deductions ─────────────────────────────────────
  calculatePayrollDeductions(grossAnnualPay: number): PayrollDeductionResult {
    const cpp = calculateCPP(
      grossAnnualPay, CPP.rate,
      CPP.maxPensionableEarnings, CPP.basicExemption, CPP.maxContribution
    )
    const ei = calculateEI(
      grossAnnualPay, EI.employeeRate,
      EI.employerMultiplier, EI.maxInsurableEarnings, EI.maxEmployeeContribution
    )

    const personalTax = this.calculatePersonalTax(grossAnnualPay)

    return {
      grossPay: grossAnnualPay,
      cppEmployee: cpp.employee,
      cppEmployer: cpp.employer,
      eiEmployee: ei.employee,
      eiEmployer: ei.employer,
      federalTaxWithheld: personalTax.federalTax,
      provincialTaxWithheld: personalTax.provincialTax,
      totalDeductions: round2(cpp.employee + ei.employee + personalTax.totalIncomeTax),
      netPay: round2(grossAnnualPay - cpp.employee - ei.employee - personalTax.totalIncomeTax),
      totalEmployerCost: round2(grossAnnualPay + cpp.employer + ei.employer),
    }
  }

  // ── RRSP ───────────────────────────────────────────────────
  calculateRRSP(earnedIncome: number, carryForwardRoom: number = 0): RRSPResult {
    const personalTax = this.calculatePersonalTax(earnedIncome)
    const marginalRate = personalTax.marginalRate

    const rrsp = calculateRRSP(
      earnedIncome, RRSP.contributionRate,
      RRSP.annualLimit, marginalRate, carryForwardRoom
    )

    return {
      earnedIncome,
      contributionRoom: rrsp.room,
      suggestedContribution: rrsp.suggestedContribution,
      taxSavings: rrsp.taxSavings,
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ═══ FULL BUSINESS TAX SUMMARY (Main Feature) ═════════════
  // ═══════════════════════════════════════════════════════════
  calculateFullSummary(
    grossIncome: number,
    totalExpenses: number,
    businessType: 'sole_prop' | 'corporation'
  ): FullTaxSummary {
    const taxableIncome = Math.max(0, grossIncome - totalExpenses)

    let federalTax = 0
    let provincialTax = 0
    let cppTotal = 0
    let eiTotal = 0
    let corporateTax: CorporateTaxResult | undefined
    let personalTax: PersonalTaxResult | undefined

    if (businessType === 'corporation') {
      // Corporate tax on business income
      corporateTax = this.calculateCorporateTax(taxableIncome)
      federalTax = corporateTax.federalTaxTotal
      provincialTax = corporateTax.provincialTaxTotal
    } else {
      // Sole prop: income taxed as personal
      personalTax = this.calculatePersonalTax(taxableIncome)
      federalTax = personalTax.federalTax
      provincialTax = personalTax.provincialTax

      // Sole prop pays both sides of CPP
      const cpp = calculateCPP(
        taxableIncome, CPP.rate,
        CPP.maxPensionableEarnings, CPP.basicExemption, CPP.maxContribution
      )
      cppTotal = round2(cpp.employee + cpp.employer)

      const ei = calculateEI(
        taxableIncome, EI.employeeRate,
        EI.employerMultiplier, EI.maxInsurableEarnings, EI.maxEmployeeContribution
      )
      eiTotal = ei.employee
    }

    const totalTax = round2(federalTax + provincialTax + cppTotal + eiTotal)
    const effectiveRate = grossIncome > 0 ? round4(totalTax / grossIncome) : 0
    const netIncome = round2(grossIncome - totalExpenses - totalTax)

    // Sales tax
    const salesTax = this.calculateSalesTax(grossIncome, totalExpenses)

    // RRSP (only for sole prop)
    const rrsp = businessType === 'sole_prop'
      ? this.calculateRRSP(taxableIncome)
      : undefined

    return {
      grossIncome,
      totalExpenses,
      province: this.province.code,
      provinceName: this.province.name,
      businessType,
      year: TAX_YEAR,
      corporateTax,
      personalTax,
      cppTotal,
      eiTotal,
      federalTax,
      provincialTax,
      totalTax,
      effectiveRate,
      netIncome,
      salesTax,
      rrsp,
      estimateOnly: true,
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ═══ STATIC: Province Comparison ══════════════════════════
  // ═══════════════════════════════════════════════════════════
  static compareProvinces(
    grossIncome: number,
    totalExpenses: number,
    businessType: 'sole_prop' | 'corporation',
    codes?: string[]
  ): ProvinceComparison[] {
    const provinceCodes = codes || getAllProvinceCodes()

    return provinceCodes.map(code => {
      const facade = new TaxFacade(code)
      const summary = facade.calculateFullSummary(grossIncome, totalExpenses, businessType)
      const config = getProvinceConfig(code)

      return {
        code,
        name: config.name,
        federalTax: summary.federalTax,
        provincialTax: summary.provincialTax,
        totalTax: summary.totalTax,
        effectiveRate: summary.effectiveRate,
        netIncome: summary.netIncome,
      }
    })
  }

  // ── Province info getter ───────────────────────────────────
  static getProvinceList = getProvinceList
}
