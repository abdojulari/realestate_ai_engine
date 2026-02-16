/**
 * Canada Tax Engine — Public API
 * Re-exports runtime values needed by API routes.
 * Types are auto-imported by Nuxt from types.ts directly.
 */

export { TaxFacade } from './_lib/facade'
export { getProvinceConfig, getProvinceList, getAllProvinceCodes, TAX_YEAR, FEDERAL, CPP, EI, RRSP, PROVINCES } from './_lib/config'
