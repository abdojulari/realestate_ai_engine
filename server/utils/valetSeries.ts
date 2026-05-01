/**
 * Bank of Canada Valet API — series catalogue for the public /rates page.
 * ──────────────────────────────────────────────────────────────────────────
 * Series IDs come from the A4 dataset:
 *   https://www.bankofcanada.ca/rates/banking-and-financial-statistics/
 *     interest-rates-for-new-and-existing-lending-by-chartered-banks/
 *
 * Every value Valet returns here is a volume-weighted average ACROSS all
 * reporting chartered banks for a given month — there is no per-bank breakdown
 * (that's what the admin-curated PostedRate model is for).
 *
 * We focus on FUNDS ADVANCED rates (what new borrowers actually paid this
 * month) rather than OUTSTANDING BALANCES (the average of every loan still
 * on the books) because the former is what site visitors care about when
 * shopping a mortgage today.
 */

export interface ValetSeriesDef {
  id: string          // CANSIM series ID (V12...)
  label: string       // display label
  category: 'mortgage_insured' | 'mortgage_uninsured' | 'variable' | 'consumer' | 'business'
  group: string       // sub-grouping inside the category (e.g. "Fixed", "Variable", "Outstanding")
  highlight?: boolean // headline rate for that category
}

export const VALET_SERIES: readonly ValetSeriesDef[] = [
  // ── Insured residential mortgages — funds advanced ──────────────────────
  { id: 'V122667775', label: 'Insured — Total',                category: 'mortgage_insured', group: 'Headline', highlight: true },
  { id: 'V122667776', label: 'Insured — Variable',             category: 'mortgage_insured', group: 'Variable' },
  { id: 'V122667777', label: 'Insured — Fixed, < 1 year',      category: 'mortgage_insured', group: 'Fixed' },
  { id: 'V122667778', label: 'Insured — Fixed, 1 to < 3 years',category: 'mortgage_insured', group: 'Fixed' },
  { id: 'V122667779', label: 'Insured — Fixed, 3 to < 5 years',category: 'mortgage_insured', group: 'Fixed' },
  { id: 'V122667780', label: 'Insured — Fixed, 5 years +',     category: 'mortgage_insured', group: 'Fixed' },

  // ── Uninsured residential mortgages — funds advanced ────────────────────
  { id: 'V122667781', label: 'Uninsured — Total',               category: 'mortgage_uninsured', group: 'Headline', highlight: true },
  { id: 'V122667782', label: 'Uninsured — Variable',            category: 'mortgage_uninsured', group: 'Variable' },
  { id: 'V122667783', label: 'Uninsured — Fixed, < 1 year',     category: 'mortgage_uninsured', group: 'Fixed' },
  { id: 'V122667784', label: 'Uninsured — Fixed, 1 to < 3 years', category: 'mortgage_uninsured', group: 'Fixed' },
  { id: 'V122667785', label: 'Uninsured — Fixed, 3 to < 5 years', category: 'mortgage_uninsured', group: 'Fixed' },
  { id: 'V122667786', label: 'Uninsured — Fixed, 5 years +',    category: 'mortgage_uninsured', group: 'Fixed', highlight: true },

  // ── Variable rate breakdown — funds advanced ────────────────────────────
  { id: 'V122667799', label: 'Total variable rate',         category: 'variable', group: 'Variable', highlight: true },
  { id: 'V122667800', label: 'Closed non-convertible',      category: 'variable', group: 'Variable' },
  { id: 'V122667801', label: 'Closed convertible',          category: 'variable', group: 'Variable' },
  { id: 'V122667802', label: 'Open variable',               category: 'variable', group: 'Variable' },

  // ── Consumer credit — funds advanced + key outstanding card rate ───────
  { id: 'V122667803', label: 'Consumer credit — Total',     category: 'consumer', group: 'Funds advanced', highlight: true },
  { id: 'V122667805', label: 'Auto loans',                  category: 'consumer', group: 'Funds advanced' },
  { id: 'V122667806', label: 'Personal LOC — secured',      category: 'consumer', group: 'Funds advanced' },
  { id: 'V122667807', label: 'Personal LOC — unsecured',    category: 'consumer', group: 'Funds advanced' },
  { id: 'V122667808', label: 'Other personal',              category: 'consumer', group: 'Funds advanced' },
  // Credit cards only published as outstanding balance — but it's the figure people recognise.
  { id: 'V122667812', label: 'Credit cards (outstanding)',  category: 'consumer', group: 'Outstanding' },

  // ── Business / corporate lending — funds advanced ──────────────────────
  { id: 'V122667816', label: 'Business loans — Total',                  category: 'business', group: 'Funds advanced', highlight: true },
  { id: 'V122667818', label: 'Lease receivables',                       category: 'business', group: 'Funds advanced' },
  { id: 'V122667819', label: 'Loans to individuals (business purposes)', category: 'business', group: 'Funds advanced' },
  { id: 'V122667820', label: 'Non-residential mortgages',               category: 'business', group: 'Funds advanced' },
]

export const VALET_SERIES_BY_ID: Record<string, ValetSeriesDef> = Object.fromEntries(
  VALET_SERIES.map(s => [s.id, s]),
)
