import type { Property } from '~/types'

interface Pillar9TokenResponse {
  access_token: string
  expires_in: number
  token_type: string
  scope?: string
}

interface Pillar9Property {
  ListingId: string  // Primary identifier in Matrix API
  MlsStatus: string // 'A' = Active, 'S' = Sold, 'P' = Pending
  PropertySubType?: string
  PropertyType?: string
  ListPrice: number | null
  ClosePrice?: number | null
  BedroomsTotal: number | null
  BathroomsTotalInteger: number | null
  LivingArea: number | null
  LivingAreaUnits?: string | null
  UnparsedAddress: string
  City: string
  StateOrProvince: string
  PostalCode: string
  Latitude?: number
  Longitude?: number
  PublicRemarks?: string
  PhotosCount?: number
  Media?: Array<{
    MediaURL: string
    PreferredPhotoYN?: boolean
    Order?: number
  }>
  ModificationTimestamp?: string
  OriginalEntryTimestamp?: string
  ListingURL?: string
  
  // Agent and Office Relationships
  ListAgentKey?: string
  ListOfficeName?: string
  ListAgentFullName?: string
  ListAgentEmail?: string
  ListAgentDirectPhone?: string
  
  // Property Details
  YearBuilt?: number | null
  ParkingTotal?: number | null
  GarageSpaces?: number | null
  Heating?: string[]
  Cooling?: string[]
  Appliances?: string[]
  
  // Lot Details
  LotSizeArea?: number | null
  LotSizeDimensions?: string | null
  LotSizeUnits?: string | null
  
  // Building Details
  Stories?: number | null
  BuildingAreaTotal?: number | null
  BuildingAreaUnits?: string | null
  ArchitecturalStyle?: string[]
  FoundationDetails?: string[]
  Basement?: string[]
  Roof?: string[]
  ConstructionMaterials?: string[]
  
  // Features
  ExteriorFeatures?: string[]
  InteriorFeatures?: string[]
  SecurityFeatures?: string[]
  PoolFeatures?: string[]
  WaterfrontFeatures?: string[]
  View?: string[]
  
  // Utilities
  Utilities?: string[]
  WaterSource?: string[]
  Sewer?: string[]
  Electric?: string[]
  
  // Tax & Legal
  TaxAnnualAmount?: number | null
  TaxYear?: number | null
  ParcelNumber?: string | null
  Zoning?: string | null
  ZoningDescription?: string | null
  
  // Address components
  StreetNumber?: string | null
  StreetName?: string | null
  StreetSuffix?: string | null
  UnitNumber?: string | null
  Country?: string | null
  
  // Dates
  CloseDate?: string | null
  ListDate?: string | null
  OnMarketDate?: string | null
  PendingTimestamp?: string | null
}

interface Pillar9ApiResponse {
  value: Pillar9Property[]
  '@odata.count'?: number
  '@odata.nextLink'?: string
}

class Pillar9Service {
  // Pillar9/Matrix API configuration
  private tokenHost = 'pillarnine.clareityiam.net'
  private tokenPath = '/idp/profile/oidc/token?grant_type=client_credentials&scope=openid'
  private apiHost = 'abrls.matrixwebapi.com'
  private apiPath = '/MatrixWebAPI/local/Property'
  private clientId: string | null = null
  private clientSecret: string | null = null
  
  private accessToken: string | null = null
  private tokenExpiresAt: number = 0
  private configInitialized = false

  /**
   * Initialize config from runtime config (call this from API handlers)
   */
  initConfig(config: { 
    clientId?: string
    clientSecret?: string
    tokenHost?: string
    apiHost?: string 
  }) {
    if (config.clientId) this.clientId = config.clientId
    if (config.clientSecret) this.clientSecret = config.clientSecret
    if (config.tokenHost) this.tokenHost = config.tokenHost
    if (config.apiHost) this.apiHost = config.apiHost
    this.configInitialized = true
  }

  /**
   * Try to load config from process.env as fallback
   */
  private ensureConfig() {
    if (!this.configInitialized) {
      // Fallback to process.env
      this.clientId = this.clientId || process.env.PILLAR9_CLIENT_ID || null
      this.clientSecret = this.clientSecret || process.env.PILLAR9_CLIENT_SECRET || null
      this.tokenHost = process.env.PILLAR9_TOKEN_HOST || this.tokenHost
      this.apiHost = process.env.PILLAR9_API_HOST || this.apiHost
    }
  }

  /**
   * Get OAuth2 access token from Clareity IAM
   */
  private async getToken(): Promise<string> {
    // Ensure config is loaded
    this.ensureConfig()
    
    // Check if token is still valid (with 5-minute buffer)
    if (this.accessToken && Date.now() < (this.tokenExpiresAt - 5 * 60 * 1000)) {
      return this.accessToken
    }

    if (!this.clientId || !this.clientSecret) {
      throw new Error('Pillar9 API credentials not configured. Set PILLAR9_CLIENT_ID and PILLAR9_CLIENT_SECRET environment variables.')
    }

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')
    const tokenUrl = `https://${this.tokenHost}${this.tokenPath}`

    console.log('🔐 Pillar9: Requesting access token from Clareity IAM...')

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to get Pillar9 token: ${response.status} - ${errorText}`)
    }

    const tokenData: Pillar9TokenResponse = await response.json()
    this.accessToken = tokenData.access_token
    this.tokenExpiresAt = Date.now() + (tokenData.expires_in * 1000)

    console.log('✅ Pillar9: Access token received, expires in', tokenData.expires_in, 'seconds')

    return this.accessToken
  }

  /**
   * Make authenticated request to Matrix Web API
   */
  private async makeApiRequest<T>(query: string): Promise<T> {
    const token = await this.getToken()
    const url = `https://${this.apiHost}${this.apiPath}${query}`

    console.log('📡 Pillar9 API Request:', url)

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Pillar9 API request failed: ${response.status} - ${errorText}`)
    }

    return response.json()
  }

  /**
   * Fetch properties from Pillar9/Matrix API
   * @param filters - Filter options including status (Active, Sold, Pending)
   */
  async getProperties(filters: {
    status?: 'A' | 'S' | 'P' | 'all' // Active, Sold, Pending, or all
    city?: string
    minPrice?: number
    maxPrice?: number
    province?: string
    limit?: number
    select?: string[]
  } = {}): Promise<Pillar9Property[]> {
    const filterConditions: string[] = []

    // Handle status filter - MlsStatus: 'A' = Active, 'S' = Sold, 'P' = Pending
    if (filters.status && filters.status !== 'all') {
      filterConditions.push(`MlsStatus eq '${filters.status}'`)
    } else if (!filters.status) {
      // Default to Active listings only
      filterConditions.push("MlsStatus eq 'A'")
    }

    // Province filter (StateOrProvince)
    if (filters.province) {
      filterConditions.push(`StateOrProvince eq '${filters.province}'`)
    }

    // Note: City field in Matrix API is a CODE (e.g., "0046"), not a name (e.g., "Edmonton")
    // City filtering by name is not supported - we would need a city code lookup table
    // For now, we skip city filtering in the API query

    // Price filters - IMPORTANT: Matrix API requires restrictive filters to reduce result count
    // The API has strict limits - even 400k returns "too many results"
    // Default to 2M+ like the working test script, or use user-provided values
    if (filters.minPrice) {
      filterConditions.push(`ListPrice ge ${filters.minPrice}`)
    } else {
      // Default to high minimum price (2M) - API requires very restrictive filters
      filterConditions.push(`ListPrice ge 2000000`)
    }
    if (filters.maxPrice) {
      filterConditions.push(`ListPrice le ${filters.maxPrice}`)
    }

    // Build query
    const queryParts: string[] = []
    
    if (filterConditions.length > 0) {
      queryParts.push(`$filter=${encodeURIComponent(filterConditions.join(' and '))}`)
    }

    // Limit results
    const limit = filters.limit || 100
    queryParts.push(`$top=${limit}`)

    // Select specific fields if provided
    if (filters.select && filters.select.length > 0) {
      queryParts.push(`$select=${encodeURIComponent(filters.select.join(','))}`)
    }

    const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : ''

    const response: Pillar9ApiResponse = await this.makeApiRequest(query)
    
    let properties = response.value || []
    
    // Post-filter by city if specified (API doesn't support city filter directly)
    if (filters.city && properties.length > 0) {
      const cityLower = filters.city.toLowerCase()
      properties = properties.filter(p => 
        p.City?.toLowerCase().includes(cityLower)
      )
      console.log(`📦 Pillar9: Filtered to ${properties.length} properties in ${filters.city}`)
    } else {
      console.log(`📦 Pillar9: Retrieved ${properties.length} properties`)
    }
    
    return properties
  }

  /**
   * Get count of properties matching filters
   * Note: Matrix API requires restrictive filters and doesn't support $count
   * We return 0 for counts since the API is too restrictive for broad queries
   */
  async getPropertiesCount(filters: {
    status?: 'A' | 'S' | 'P' | 'all'
    province?: string
  } = {}): Promise<number> {
    // Matrix API is too restrictive for count queries without specific price filters
    // Return 0 to indicate counts are not available
    // The actual sync will use proper filters
    return 0
  }

  /**
   * Fetch property images/media
   */
  async getPropertyMedia(listingKey: string): Promise<string[]> {
    try {
      // Matrix API typically includes media in property response or has separate endpoint
      const query = `('${listingKey}')/Media`
      const response: any = await this.makeApiRequest(query)
      
      if (response.value && Array.isArray(response.value)) {
        return response.value
          .filter((m: any) => m.MediaURL)
          .sort((a: any, b: any) => (a.Order || 0) - (b.Order || 0))
          .map((m: any) => m.MediaURL)
      }
      
      return []
    } catch (error) {
      console.warn(`⚠️ Failed to fetch media for property ${listingKey}:`, error)
      return []
    }
  }

  /**
   * Map Pillar9 status to local status
   */
  private mapStatus(mlsStatus: string): string {
    switch (mlsStatus?.toUpperCase()) {
      case 'A':
      case 'ACTIVE':
        return 'for_sale'
      case 'S':
      case 'SOLD':
        return 'sold'
      case 'P':
      case 'PENDING':
        return 'pending'
      default:
        return 'for_sale'
    }
  }

  /**
   * Map property type
   */
  private mapPropertyType(subType: string, propertyType?: string): string {
    if (!subType && !propertyType) return 'house'
    
    const type = (subType || propertyType || '').toLowerCase()
    
    // Commercial indicators
    const commercialIndicators = [
      'office', 'commercial', 'retail', 'industrial', 'warehouse', 
      'manufacturing', 'business', 'store', 'shop', 'plaza', 'medical'
    ]
    
    if (commercialIndicators.some(indicator => type.includes(indicator))) {
      if (type.includes('industrial') || type.includes('warehouse')) {
        return 'industrial'
      }
      return 'commercial'
    }
    
    // Residential mapping
    if (type.includes('vacant land') || type.includes('land')) return 'land'
    if (type.includes('single family') || type.includes('single-family') || type.includes('detached')) return 'house'
    if (type.includes('condo') || type.includes('apartment') || type.includes('condominium')) return 'condo'
    if (type.includes('townhouse') || type.includes('town') || type.includes('row house')) return 'townhouse'
    if (type.includes('multi-family') || type.includes('duplex') || type.includes('multiplex')) return 'multi-family'
    
    return 'house'
  }

  /**
   * Transform Pillar9 property to local Property format
   */
  transformToLocalProperty(p9Prop: Pillar9Property): Omit<Property, 'id' | 'createdAt' | 'updatedAt'> | null {
    const type = this.mapPropertyType(p9Prop.PropertySubType || '', p9Prop.PropertyType)
    const status = this.mapStatus(p9Prop.MlsStatus)
    
    // Skip properties with no bedrooms and no living area (likely commercial)
    const hasNoBedrooms = !p9Prop.BedroomsTotal || p9Prop.BedroomsTotal === 0
    const hasNoLivingArea = !p9Prop.LivingArea || p9Prop.LivingArea === 0
    
    if (hasNoBedrooms && hasNoLivingArea && type === 'house') {
      console.log(`🏢 Pillar9: Skipping likely commercial property: ${p9Prop.ListingId}`)
      return null
    }

    // Build images array
    const images = p9Prop.Media
      ?.filter(m => m.MediaURL)
      .sort((a, b) => (a.Order || 0) - (b.Order || 0))
      .map(m => m.MediaURL) || []

    // Build features object
    const features = {
      heating: p9Prop.Heating || [],
      cooling: p9Prop.Cooling || [],
      appliances: p9Prop.Appliances || [],
      security: p9Prop.SecurityFeatures || [],
      exterior: p9Prop.ExteriorFeatures || [],
      interior: p9Prop.InteriorFeatures || [],
      yearBuilt: p9Prop.YearBuilt,
      parking: p9Prop.ParkingTotal,
      garageSpaces: p9Prop.GarageSpaces,
      lotSizeArea: p9Prop.LotSizeArea,
      lotSizeDimensions: p9Prop.LotSizeDimensions,
      lotSizeUnits: p9Prop.LotSizeUnits,
      stories: p9Prop.Stories,
      architecturalStyle: p9Prop.ArchitecturalStyle || [],
      basement: p9Prop.Basement || [],
      foundationDetails: p9Prop.FoundationDetails || [],
      roof: p9Prop.Roof || [],
      constructionMaterials: p9Prop.ConstructionMaterials || [],
      buildingAreaTotal: p9Prop.BuildingAreaTotal,
      buildingAreaUnits: p9Prop.BuildingAreaUnits,
      utilities: p9Prop.Utilities || [],
      waterSource: p9Prop.WaterSource || [],
      sewer: p9Prop.Sewer || [],
      electric: p9Prop.Electric || [],
      poolFeatures: p9Prop.PoolFeatures || [],
      waterfrontFeatures: p9Prop.WaterfrontFeatures || [],
      view: p9Prop.View || [],
      zoning: p9Prop.Zoning,
      zoningDescription: p9Prop.ZoningDescription,
      taxAnnualAmount: p9Prop.TaxAnnualAmount,
      taxYear: p9Prop.TaxYear,
      parcelNumber: p9Prop.ParcelNumber,
      listDate: p9Prop.ListDate,
      closeDate: p9Prop.CloseDate,
      closePrice: p9Prop.ClosePrice,
    }

    // Determine price - use ClosePrice for sold properties
    const price = status === 'sold' && p9Prop.ClosePrice 
      ? p9Prop.ClosePrice 
      : (p9Prop.ListPrice || 0)

    return {
      title: `${p9Prop.UnparsedAddress}, ${p9Prop.City}`,
      description: p9Prop.PublicRemarks || `${p9Prop.PropertySubType || 'Property'} in ${p9Prop.City}`,
      price,
      beds: p9Prop.BedroomsTotal || 0,
      baths: p9Prop.BathroomsTotalInteger || 0,
      sqft: p9Prop.LivingArea || 0,
      type,
      status,
      address: p9Prop.UnparsedAddress,
      city: p9Prop.City,
      province: p9Prop.StateOrProvince,
      postalCode: p9Prop.PostalCode || '',
      latitude: p9Prop.Latitude || null,
      longitude: p9Prop.Longitude || null,
      features,
      images,
      views: 0,
      userId: null as any,
      source: 'pillar9' as const,
      externalId: p9Prop.ListingId,
      mlsNumber: p9Prop.ListingId,
      
      // Enhanced fields
      lotSizeArea: p9Prop.LotSizeArea || null,
      lotSizeDimensions: p9Prop.LotSizeDimensions || null,
      lotSizeUnits: p9Prop.LotSizeUnits || null,
      stories: p9Prop.Stories || null,
      yearBuilt: p9Prop.YearBuilt || null,
      streetName: p9Prop.StreetName || null,
      streetNumber: p9Prop.StreetNumber || null,
      unitNumber: p9Prop.UnitNumber || null,
      zoning: p9Prop.Zoning || null,
      zoningDescription: p9Prop.ZoningDescription || null,
      taxAnnualAmount: p9Prop.TaxAnnualAmount || null,
      taxYear: p9Prop.TaxYear || null,
      parcelNumber: p9Prop.ParcelNumber || null,
      
      // Agent data (simplified - Pillar9 provides less agent detail than CREA)
      listingAgentData: p9Prop.ListAgentFullName ? {
        memberKey: p9Prop.ListAgentKey || '',
        mlsId: '',
        fullName: p9Prop.ListAgentFullName,
        firstName: p9Prop.ListAgentFullName.split(' ')[0] || '',
        lastName: p9Prop.ListAgentFullName.split(' ').slice(1).join(' ') || '',
        email: p9Prop.ListAgentEmail,
        directPhone: p9Prop.ListAgentDirectPhone,
      } : null,
      
      listingOfficeData: p9Prop.ListOfficeName ? {
        officeKey: '',
        officeId: '',
        name: p9Prop.ListOfficeName,
      } : null,
      
      coListingAgentsData: [],
      coListingOfficesData: [],
    }
  }

  /**
   * Check if API credentials are configured
   */
  isConfigured(): boolean {
    this.ensureConfig()
    return !!(this.clientId && this.clientSecret)
  }

  /**
   * Get configuration status
   */
  getConfigStatus(): { configured: boolean; message: string } {
    this.ensureConfig()
    if (!this.clientId || !this.clientSecret) {
      return {
        configured: false,
        message: 'Pillar9 API credentials not configured. Set PILLAR9_CLIENT_ID and PILLAR9_CLIENT_SECRET environment variables.'
      }
    }
    return {
      configured: true,
      message: 'Pillar9 API is configured and ready.'
    }
  }
}

export const pillar9Service = new Pillar9Service()
