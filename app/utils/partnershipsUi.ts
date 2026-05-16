/** Mirrors server `partnershipsShared` categories for UI labels only. */
export const TEAM_CATEGORY_OPTIONS = [
  {
    value: 'mortgage_specialist',
    title: 'Mortgage specialists',
    subtitle: 'Lenders, banks & brokers',
    icon: 'mdi-bank-outline',
  },
  {
    value: 'lawyer',
    title: 'Real estate lawyers',
    subtitle: 'Closings & title',
    icon: 'mdi-scale-balance',
  },
  {
    value: 'home_inspector',
    title: 'Home inspectors',
    subtitle: 'Due diligence',
    icon: 'mdi-magnify-scan',
  },
] as const

export type TeamCategoryValue = (typeof TEAM_CATEGORY_OPTIONS)[number]['value']

export function teamCategoryLabel(value: string): string {
  return TEAM_CATEGORY_OPTIONS.find((o) => o.value === value)?.title ?? value
}
