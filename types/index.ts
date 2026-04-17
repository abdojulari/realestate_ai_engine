// User types
/** Per-feature flags when a team member has delegated admin access (role user). */
export type DelegatedFeaturePermission = Partial<{
  read: boolean
  write: boolean
  edit: boolean
  delete: boolean
}>

export interface User {
  id: number
  email: string
  firstName: string
  lastName: string
  phone?: string | null
  preferredContactTime?: string | null
  role: string
  adminId?: number | null
  delegatedAdminPermissions?: Record<string, DelegatedFeaturePermission> | null
  delegationExcludedUserIds?: number[]
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
  latitude: number | null
  longitude: number | null
  features: Record<string, any>
  images: string[]
  views: number
  userId: number | null
  createdAt: string
  updatedAt: string
  // CREA Integration fields
  source: string // "manual" or "crea"
  externalId?: string | null // CREA ListingKey for MLS properties
  mlsNumber?: string | null // MLS listing number
  lastSyncAt?: string | null // Last time synced from CREA
  originalEntryTimestamp?: string | Date | null // When listing was first entered
  daysOnMarket?: number | null // Days since originalEntryTimestamp
  
  // Enhanced Residential Fields (from schema)
  lotSizeArea?: number | null
  lotSizeDimensions?: string | null
  lotSizeUnits?: string | null
  stories?: number | null
  yearBuilt?: number | null
  propertyCondition?: string | null
  cityRegion?: string | null
  waterBodyName?: string | null
  zoning?: string | null
  zoningDescription?: string | null
  taxAnnualAmount?: number | null
  taxYear?: number | null
  parcelNumber?: string | null
  streetName?: string | null
  streetNumber?: string | null
  unitNumber?: string | null
  
  // Simple agent/office fields for display
  listingAgent?: string | null // Agent name for display
  listingOffice?: string | null // Office name for display
  
  // UI-specific flags
  isSaved?: boolean
  user?: {
    id: number
    firstName: string
    lastName: string
    email: string
    phone?: string | null
  }
  agent?: {
    id: number
    firstName: string
    lastName: string
    email: string
    phone?: string | null
    name?: string
    agency?: string
    role?: string
  }
  
  // Enhanced CREA Agent and Office Data
  listingAgentData?: {
    memberKey: string
    mlsId: string
    fullName: string
    firstName: string
    lastName: string
    email?: string
    directPhone?: string
    mobilePhone?: string
    officePhone?: string
    license?: string
    designations?: string[]
    photoURL?: string
  } | null
  
  listingOfficeData?: {
    officeKey: string
    officeId: string
    name: string
    phone?: string
    email?: string
    address?: string
    city?: string
    province?: string
    postalCode?: string
    country?: string
    website?: string
  } | null
  
  coListingAgentsData?: Array<{
    memberKey: string
    mlsId: string
    fullName: string
    firstName: string
    lastName: string
    email?: string
    directPhone?: string
    mobilePhone?: string
    officePhone?: string
    license?: string
    designations?: string[]
    photoURL?: string
  }>
  
  coListingOfficesData?: Array<{
    officeKey: string
    officeId: string
    name: string
    phone?: string
    email?: string
    address?: string
    city?: string
    province?: string
    postalCode?: string
    country?: string
    website?: string
  }>
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
  // neighborhood/subdivision filtering
  neighborhood?: string
  neighborhoodId?: number | null
  subdivision?: string
  // HOA/Condo fee filter
  noHoaFee?: boolean
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
  userId?: number | null
  propertyId: number
  user?: User | null
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