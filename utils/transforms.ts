interface SearchFilters {
  location?: string
  propertyType?: string
  priceMin?: number
  priceMax?: number
  beds?: number
  baths?: number
  sqftMin?: number
  sqftMax?: number
}

export const transformSearchFilters = (filters: any): SearchFilters => {
  return {
    location: filters.location || '',
    propertyType: filters.propertyType || 'all',
    priceMin: filters.priceMin ? Number(filters.priceMin) : undefined,
    priceMax: filters.priceMax ? Number(filters.priceMax) : undefined,
    beds: filters.beds ? Number(filters.beds) : undefined,
    baths: filters.baths ? Number(filters.baths) : undefined,
    sqftMin: filters.sqftMin ? Number(filters.sqftMin) : undefined,
    sqftMax: filters.sqftMax ? Number(filters.sqftMax) : undefined
  }
}

export const buildSearchQuery = (filters: SearchFilters): Record<string, any> => {
  const query: Record<string, any> = {}
  
  if (filters.location) {
    query.location = filters.location
  }
  
  if (filters.propertyType && filters.propertyType !== 'all') {
    query.type = filters.propertyType
  }
  
  if (filters.priceMin) {
    query.priceMin = filters.priceMin
  }
  
  if (filters.priceMax) {
    query.priceMax = filters.priceMax
  }
  
  if (filters.beds) {
    query.beds = filters.beds
  }
  
  if (filters.baths) {
    query.baths = filters.baths
  }
  
  if (filters.sqftMin) {
    query.sqftMin = filters.sqftMin
  }
  
  if (filters.sqftMax) {
    query.sqftMax = filters.sqftMax
  }
  
  return query
}