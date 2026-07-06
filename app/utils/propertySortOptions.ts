/**
 * Single source of truth for property list sort options.
 *
 * Both the public listing (`/api/properties`) and the admin listing
 * (`/api/admin/properties`) accept these `sortBy` values, so the same
 * option array feeds both frontend selects and the backend orderBy builder.
 * Defaults to price ascending so consumers see the most approachable listings
 * first; agents / power-users can flip to any of the other options.
 */

export type PropertySortValue =
  | 'price_asc'
  | 'price_desc'
  | 'newest'
  | 'oldest'
  | 'views'
  | 'sqft_desc'
  | 'sqft_asc'

export interface PropertySortOption {
  title: string
  value: PropertySortValue
}

export const PROPERTY_SORT_OPTIONS: PropertySortOption[] = [
  { title: 'Price: Low to High', value: 'price_asc' },
  { title: 'Price: High to Low', value: 'price_desc' },
  { title: 'Newest', value: 'newest' },
  { title: 'Oldest', value: 'oldest' },
  { title: 'Most Viewed', value: 'views' },
  { title: 'Size: Large to Small', value: 'sqft_desc' },
  { title: 'Size: Small to Large', value: 'sqft_asc' },
]

export const DEFAULT_PROPERTY_SORT: PropertySortValue = 'price_asc'

/**
 * Normalize an unknown value (usually a URL query param) into a supported
 * sort value, falling back to the default.
 */
export function normalizePropertySort(input: unknown): PropertySortValue {
  if (typeof input !== 'string') return DEFAULT_PROPERTY_SORT
  const known = PROPERTY_SORT_OPTIONS.find((o) => o.value === input)
  return known ? known.value : DEFAULT_PROPERTY_SORT
}

/**
 * Translate a `sortBy` value into a Prisma-compatible `orderBy` array.
 * Kept as a plain-object literal (no Prisma type imports) so both public
 * and admin endpoints can consume it without a build dependency.
 *
 * We always append a stable tiebreaker (`id: 'desc'`) so pages don't jitter
 * when many rows share the same price / sqft / view count.
 */
export function buildPropertyOrderBy(
  sortBy: PropertySortValue,
): Array<Record<string, 'asc' | 'desc'>> {
  const stableTiebreaker = { id: 'desc' as const }
  switch (sortBy) {
    case 'price_asc':
      return [{ price: 'asc' }, stableTiebreaker]
    case 'price_desc':
      return [{ price: 'desc' }, stableTiebreaker]
    case 'oldest':
      return [{ createdAt: 'asc' }, stableTiebreaker]
    case 'views':
      return [{ views: 'desc' }, stableTiebreaker]
    case 'sqft_desc':
      return [{ sqft: 'desc' }, stableTiebreaker]
    case 'sqft_asc':
      return [{ sqft: 'asc' }, stableTiebreaker]
    case 'newest':
    default:
      return [{ createdAt: 'desc' }, stableTiebreaker]
  }
}
