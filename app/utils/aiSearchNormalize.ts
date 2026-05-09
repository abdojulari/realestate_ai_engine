/**
 * Maps /api/ai/parse-property-query output to /api/properties query params.
 * Keeps behavior aligned with ai-search while fixing gaps (cityRegion/subdivision,
 * minParking from garage count, etc.).
 */

export interface AiSearchNormalizeContext {
  searchQuery: string
  selectedCity: string
  selectedNeighborhoodName: string | null
  itemsPerPage: number
  page: number
}

/** Merge parsed MLS area into subdivision/cityRegion when a city is selected (dropdown wins). */
export function buildPropertySearchParams(
  filters: Record<string, unknown>,
  ctx: AiSearchNormalizeContext,
): URLSearchParams {
  const queryParams = new URLSearchParams()
  const q = ctx.searchQuery.toLowerCase()

  const appendParsedAreaIfNeeded = (raw: string) => {
    const loc = raw.trim()
    if (!loc) return
    if (ctx.selectedNeighborhoodName?.trim()) return
    queryParams.append('subdivision', loc)
  }

  Object.entries(filters).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return

    if (key === 'beds') {
      const isMinimum =
        q.includes('+') ||
        q.includes('or more') ||
        q.includes('plus') ||
        q.includes('minimum') ||
        q.includes('at least')
      const isExact =
        q.includes('exactly') || q.includes('precise') || q.includes('specific')
      if (isExact) {
        queryParams.append('bedsExact', String(value))
      } else if (isMinimum) {
        queryParams.append('beds', String(value))
      } else {
        queryParams.append('bedsExact', String(value))
      }
    } else if (key === 'garageSpaces') {
      const n = Number(value)
      queryParams.append('features', 'garage')
      if (!Number.isNaN(n) && n > 0) {
        queryParams.append('minParking', String(Math.floor(n)))
      }
    } else if (key === 'basement') {
      queryParams.append('features', 'basement')
    } else if (key === 'garage' && value === true) {
      queryParams.append('features', 'garage')
    } else if (key === 'features' && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.entries(value as Record<string, unknown>).forEach(([feature, isEnabled]) => {
        if (isEnabled) queryParams.append('features', feature)
      })
    } else if (key === 'minPrice') {
      queryParams.append('minPrice', String(value))
    } else if (key === 'maxPrice') {
      queryParams.append('maxPrice', String(value))
    } else if (key === 'minSqft') {
      queryParams.append('minSqft', String(value))
    } else if (key === 'maxSqft') {
      queryParams.append('maxSqft', String(value))
    } else if (key === 'lotSizeAcres' || key === 'minLotSizeAcres') {
      queryParams.append('lotSizeAcres', String(value))
    } else if (key === 'maxLotSizeAcres') {
      queryParams.append('maxLotSizeAcres', String(value))
    } else if (key === 'lotSizeSqFt') {
      queryParams.append('lotSizeSqFt', String(value))
    } else if (key === 'stories') {
      queryParams.append('stories', String(value))
    } else if (key === 'minYearBuilt') {
      queryParams.append('minYearBuilt', String(value))
    } else if (key === 'maxYearBuilt') {
      queryParams.append('maxYearBuilt', String(value))
    } else if (key === 'condition') {
      queryParams.append('condition', String(value))
    } else if (key === 'zoning') {
      queryParams.append('zoning', String(value))
    } else if (key === 'location') {
      if (ctx.selectedCity) {
        appendParsedAreaIfNeeded(String(value))
      } else {
        queryParams.append('location', String(value))
      }
    } else if (key === 'locationType') {
      if (!ctx.selectedCity) {
        queryParams.append('location', String(value))
      }
    } else if (key === 'subdivision') {
      if (!ctx.selectedNeighborhoodName?.trim()) {
        queryParams.append('subdivision', String(value))
      }
    } else if (key === 'cityRegion') {
      if (!ctx.selectedNeighborhoodName?.trim()) {
        queryParams.append('cityRegion', String(value))
      }
    } else if (key === 'maxHoaFee') {
      queryParams.append('maxHoaFee', String(value))
    } else if (key === 'noHoaFee') {
      if (value) queryParams.append('noHoaFee', 'true')
    } else if (key === 'maxTaxAmount') {
      queryParams.append('maxTaxAmount', String(value))
    } else if (key === 'baths') {
      queryParams.append('baths', String(value))
    } else if (key === 'near') {
      /* POI — reserved */
    } else if (key === 'multiLevel' || key === 'splitLevel') {
      queryParams.append('features', key)
    } else if (key === 'largeLot' || key === 'smallLot') {
      queryParams.append('features', key)
    } else if (key === 'bedsMinimum' || key === 'mainFloorBedrooms' || key === 'upperFloorBedroomCount') {
      /* handled elsewhere / remark keywords */
    } else if (Array.isArray(value)) {
      queryParams.append(key, value.join(','))
    } else {
      queryParams.append(key, String(value))
    }
  })

  if (ctx.selectedCity) {
    queryParams.append('city', ctx.selectedCity)
  }
  if (ctx.selectedNeighborhoodName?.trim()) {
    queryParams.append('subdivision', ctx.selectedNeighborhoodName.trim())
  }

  queryParams.append('limit', String(ctx.itemsPerPage))
  queryParams.append('page', String(ctx.page))

  return queryParams
}

export function cloneSearchParamsWithoutPagination(params: URLSearchParams): URLSearchParams {
  const p = new URLSearchParams(params.toString())
  p.delete('page')
  p.delete('limit')
  return p
}
