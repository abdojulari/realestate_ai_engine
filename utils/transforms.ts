interface SearchFilters {
  location?: string
  propertyType?: string
  minPrice?: number
  maxPrice?: number
  beds?: number
  baths?: number
  minSqft?: number
  maxSqft?: number
  features?: string[]
  status?: string
  city?: string
  type?: string
}

export const transformSearchFilters = (filters: any): SearchFilters => {
  // Handle location parsing for city extraction
  const location = filters.location || ''
  const city = location.includes(',') ? location.split(',')[0].trim() : location
  
  return {
    location: location,
    city: city,
    type: filters.propertyType || undefined,
    propertyType: filters.propertyType || undefined,
    minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
    maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
    beds: filters.beds ? Number(filters.beds) : undefined,
    baths: filters.baths ? Number(filters.baths) : undefined,
    minSqft: filters.minSqft ? Number(filters.minSqft) : undefined,
    maxSqft: filters.maxSqft ? Number(filters.maxSqft) : undefined,
    features: filters.features || [],
    status: filters.status || undefined
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