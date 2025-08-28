// User types
export interface User {
  id: number
  email: string
  firstName: string
  lastName: string
  phone?: string | null
  preferredContactTime?: string | null
  role: string
  provider?: string | null
  providerId?: string | null
  createdAt: string
  updatedAt: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  preferredContactTime?: string
}

export interface AuthResponse {
  user: User
  token: string
}

// Property types based on actual API response
export interface Property {
  id: number
  title: string
  description: string
  price: number
  beds: number
  baths: number
  sqft: number
  type: string // house, condo, townhouse
  status: string // for_sale, for_rent, sold
  address: string
  city: string
  province: string
  postalCode: string
  latitude: number
  longitude: number
  features: Record<string, any>
  images: string[]
  views: number
  userId: number
  createdAt: string
  updatedAt: string
  // UI-specific flags
  isSaved?: boolean
  user: {
    id: number
    firstName: string
    lastName: string
    email: string
    phone?: string | null
  }
  agent: {
    id: number
    firstName: string
    lastName: string
    email: string
    phone?: string | null
    name?: string
    agency?: string
    role?: string
  }
}

export interface PropertyFilter {
  minPrice?: number
  maxPrice?: number
  beds?: number
  baths?: number
  type?: string
  status?: string
  city?: string
  province?: string
  location?: string
  propertyType?: string
  sqftMin?: number
  sqftMax?: number
  // additional fields used in pages
  minSqft?: number
  maxSqft?: number
  features?: any
  bounds?: any
}

// Viewing Request types
export interface ViewingRequest {
  id: number
  userId: number
  propertyId: number
  user: User
  property: Property
  dateTime: string
  message?: string
  status: string // pending, approved, rejected, completed
  createdAt: string
  updatedAt: string
}

// Property Inquiry types
export interface PropertyInquiry {
  id: number
  userId: number
  propertyId: number
  user: User
  property: Property
  message: string
  status: string // pending, responded, closed
  createdAt: string
  updatedAt: string
}

// Saved Search types
export interface SavedSearch {
  id: number
  userId: number
  name: string
  filters: PropertyFilter
  createdAt: string
  updatedAt: string
}

// Content types
export interface ContentItem {
  id: number
  key: string
  value: string
  createdAt: string
  updatedAt: string
}

// Analytics
export interface PageView {
  path: string
  title?: string
  timestamp?: string
}