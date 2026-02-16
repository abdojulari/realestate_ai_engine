/**
 * Canada Tax Engine — Province & Federal Configuration (2026)
 *
 * All rates are stored here as the single source of truth.
 * To update for a new tax year, only this file needs to change.
 * Future: load from DB table `tax_config` keyed by (province, year).
 */

import type {
  ProvinceConfig,
  FederalConfig,
  CPPConfig,
  EIConfig,
  RRSPConfig,
} from './types'

// ─── Tax Year ────────────────────────────────────────────────
export const TAX_YEAR = 2026

// ─── Federal Configuration ───────────────────────────────────
export const FEDERAL: FederalConfig = {
  year: TAX_YEAR,
  corporateSmallRate: 0.09,     // 9% CCPC small business rate
  corporateGeneralRate: 0.15,   // 15% general corporate rate
  smallBusinessLimit: 500_000,  // $500,000 SBD threshold
  basicPersonalAmount: 15_705,
  personalBrackets: [
    { min: 0,       max: 55_867,  rate: 0.15   },
    { min: 55_867,  max: 111_733, rate: 0.205  },
    { min: 111_733, max: 173_205, rate: 0.26   },
    { min: 173_205, max: 246_752, rate: 0.29   },
    { min: 246_752, max: Infinity, rate: 0.33  },
  ],
}

// ─── CPP Configuration (2026) ────────────────────────────────
export const CPP: CPPConfig = {
  rate: 0.0595,
  maxPensionableEarnings: 68_500,
  basicExemption: 3_500,
  maxContribution: 3_867.50,
}

// ─── EI Configuration (2026) ─────────────────────────────────
export const EI: EIConfig = {
  employeeRate: 0.0166,
  employerMultiplier: 1.4,
  maxInsurableEarnings: 63_200,
  maxEmployeeContribution: 1_049.12,
}

// ─── RRSP Configuration (2026) ───────────────────────────────
export const RRSP: RRSPConfig = {
  contributionRate: 0.18,
  annualLimit: 31_560,
}

// ─── Province Configurations ─────────────────────────────────

export const PROVINCES: Record<string, ProvinceConfig> = {
  AB: {
    code: 'AB', name: 'Alberta', year: TAX_YEAR,
    gstRate: 0.05, hstRate: 0, pstRate: 0, hasHST: false,
    corporateSmallRate: 0.02, corporateGeneralRate: 0.08,
    basicPersonalAmount: 21_003,
    personalBrackets: [
      { min: 0,       max: 142_292, rate: 0.10  },
      { min: 142_292, max: 170_751, rate: 0.12  },
      { min: 170_751, max: 227_668, rate: 0.13  },
      { min: 227_668, max: 341_502, rate: 0.14  },
      { min: 341_502, max: Infinity, rate: 0.15 },
    ],
  },
  BC: {
    code: 'BC', name: 'British Columbia', year: TAX_YEAR,
    gstRate: 0.05, hstRate: 0, pstRate: 0.07, hasHST: false,
    corporateSmallRate: 0.02, corporateGeneralRate: 0.12,
    basicPersonalAmount: 11_981,
    personalBrackets: [
      { min: 0,       max: 45_654,  rate: 0.0506 },
      { min: 45_654,  max: 91_310,  rate: 0.077  },
      { min: 91_310,  max: 104_835, rate: 0.105  },
      { min: 104_835, max: 127_299, rate: 0.1229 },
      { min: 127_299, max: 172_602, rate: 0.147  },
      { min: 172_602, max: 240_716, rate: 0.168  },
      { min: 240_716, max: Infinity, rate: 0.205 },
    ],
  },
  MB: {
    code: 'MB', name: 'Manitoba', year: TAX_YEAR,
    gstRate: 0.05, hstRate: 0, pstRate: 0.07, hasHST: false,
    corporateSmallRate: 0.00, corporateGeneralRate: 0.12,
    basicPersonalAmount: 15_000,
    personalBrackets: [
      { min: 0,      max: 36_842,  rate: 0.108  },
      { min: 36_842, max: 79_625,  rate: 0.1275 },
      { min: 79_625, max: Infinity, rate: 0.174 },
    ],
  },
  NB: {
    code: 'NB', name: 'New Brunswick', year: TAX_YEAR,
    gstRate: 0, hstRate: 0.15, pstRate: 0, hasHST: true,
    corporateSmallRate: 0.025, corporateGeneralRate: 0.14,
    basicPersonalAmount: 12_458,
    personalBrackets: [
      { min: 0,       max: 47_715,  rate: 0.094 },
      { min: 47_715,  max: 95_431,  rate: 0.14  },
      { min: 95_431,  max: 176_756, rate: 0.16  },
      { min: 176_756, max: Infinity, rate: 0.195 },
    ],
  },
  NL: {
    code: 'NL', name: 'Newfoundland & Labrador', year: TAX_YEAR,
    gstRate: 0, hstRate: 0.15, pstRate: 0, hasHST: true,
    corporateSmallRate: 0.03, corporateGeneralRate: 0.15,
    basicPersonalAmount: 10_382,
    personalBrackets: [
      { min: 0,         max: 41_457,    rate: 0.087 },
      { min: 41_457,    max: 82_913,    rate: 0.145 },
      { min: 82_913,    max: 148_027,   rate: 0.158 },
      { min: 148_027,   max: 207_239,   rate: 0.178 },
      { min: 207_239,   max: 264_750,   rate: 0.198 },
      { min: 264_750,   max: 529_500,   rate: 0.208 },
      { min: 529_500,   max: 1_059_000, rate: 0.213 },
      { min: 1_059_000, max: Infinity,  rate: 0.218 },
    ],
  },
  NS: {
    code: 'NS', name: 'Nova Scotia', year: TAX_YEAR,
    gstRate: 0, hstRate: 0.15, pstRate: 0, hasHST: true,
    corporateSmallRate: 0.025, corporateGeneralRate: 0.14,
    basicPersonalAmount: 8_481,
    personalBrackets: [
      { min: 0,       max: 29_590,  rate: 0.0879 },
      { min: 29_590,  max: 59_180,  rate: 0.1495 },
      { min: 59_180,  max: 93_000,  rate: 0.1667 },
      { min: 93_000,  max: 150_000, rate: 0.175  },
      { min: 150_000, max: Infinity, rate: 0.21  },
    ],
  },
  ON: {
    code: 'ON', name: 'Ontario', year: TAX_YEAR,
    gstRate: 0, hstRate: 0.13, pstRate: 0, hasHST: true,
    corporateSmallRate: 0.032, corporateGeneralRate: 0.115,
    basicPersonalAmount: 11_865,
    personalBrackets: [
      { min: 0,       max: 51_446,  rate: 0.0505 },
      { min: 51_446,  max: 102_894, rate: 0.0915 },
      { min: 102_894, max: 150_000, rate: 0.1116 },
      { min: 150_000, max: 220_000, rate: 0.1216 },
      { min: 220_000, max: Infinity, rate: 0.1316 },
    ],
  },
  PE: {
    code: 'PE', name: 'Prince Edward Island', year: TAX_YEAR,
    gstRate: 0, hstRate: 0.15, pstRate: 0, hasHST: true,
    corporateSmallRate: 0.01, corporateGeneralRate: 0.16,
    basicPersonalAmount: 12_000,
    personalBrackets: [
      { min: 0,      max: 31_984,  rate: 0.098 },
      { min: 31_984, max: 63_969,  rate: 0.138 },
      { min: 63_969, max: Infinity, rate: 0.167 },
    ],
  },
  QC: {
    code: 'QC', name: 'Quebec', year: TAX_YEAR,
    gstRate: 0.05, hstRate: 0, pstRate: 0.09975, hasHST: false,
    corporateSmallRate: 0.032, corporateGeneralRate: 0.115,
    basicPersonalAmount: 17_183,
    personalBrackets: [
      { min: 0,       max: 49_275,  rate: 0.14   },
      { min: 49_275,  max: 98_540,  rate: 0.19   },
      { min: 98_540,  max: 119_910, rate: 0.24   },
      { min: 119_910, max: Infinity, rate: 0.2575 },
    ],
  },
  SK: {
    code: 'SK', name: 'Saskatchewan', year: TAX_YEAR,
    gstRate: 0.05, hstRate: 0, pstRate: 0.06, hasHST: false,
    corporateSmallRate: 0.01, corporateGeneralRate: 0.12,
    basicPersonalAmount: 17_661,
    personalBrackets: [
      { min: 0,       max: 49_720,  rate: 0.105 },
      { min: 49_720,  max: 142_058, rate: 0.125 },
      { min: 142_058, max: Infinity, rate: 0.145 },
    ],
  },
  NT: {
    code: 'NT', name: 'Northwest Territories', year: TAX_YEAR,
    gstRate: 0.05, hstRate: 0, pstRate: 0, hasHST: false,
    corporateSmallRate: 0.02, corporateGeneralRate: 0.115,
    basicPersonalAmount: 16_593,
    personalBrackets: [
      { min: 0,       max: 48_326,  rate: 0.059  },
      { min: 48_326,  max: 96_655,  rate: 0.086  },
      { min: 96_655,  max: 157_139, rate: 0.122  },
      { min: 157_139, max: Infinity, rate: 0.1405 },
    ],
  },
  NU: {
    code: 'NU', name: 'Nunavut', year: TAX_YEAR,
    gstRate: 0.05, hstRate: 0, pstRate: 0, hasHST: false,
    corporateSmallRate: 0.03, corporateGeneralRate: 0.12,
    basicPersonalAmount: 17_925,
    personalBrackets: [
      { min: 0,       max: 50_877,  rate: 0.04  },
      { min: 50_877,  max: 101_754, rate: 0.07  },
      { min: 101_754, max: 165_429, rate: 0.09  },
      { min: 165_429, max: Infinity, rate: 0.115 },
    ],
  },
  YT: {
    code: 'YT', name: 'Yukon', year: TAX_YEAR,
    gstRate: 0.05, hstRate: 0, pstRate: 0, hasHST: false,
    corporateSmallRate: 0.00, corporateGeneralRate: 0.12,
    basicPersonalAmount: 15_705,
    personalBrackets: [
      { min: 0,       max: 55_867,  rate: 0.064 },
      { min: 55_867,  max: 111_733, rate: 0.09  },
      { min: 111_733, max: 154_906, rate: 0.109 },
      { min: 154_906, max: 500_000, rate: 0.128 },
      { min: 500_000, max: Infinity, rate: 0.15 },
    ],
  },
}

// ─── Helpers ─────────────────────────────────────────────────

export function getProvinceConfig(code: string): ProvinceConfig {
  return PROVINCES[code.toUpperCase()] || PROVINCES.ON
}

export function getProvinceList(): { code: string; name: string }[] {
  return Object.values(PROVINCES).map(p => ({ code: p.code, name: p.name }))
}

export function getAllProvinceCodes(): string[] {
  return Object.keys(PROVINCES)
}
