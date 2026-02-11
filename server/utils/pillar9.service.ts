import type { Property } from '~/types'

interface Pillar9TokenResponse {
  access_token: string
  expires_in: number
  token_type: string
  scope?: string
}

interface Pillar9Property {
  ListingId: string  // Primary identifier in Matrix API
  ListingKeyNumeric?: number  // Used for Media API (ResourceRecordKeyNumeric)
  MlsStatus: string // 'A' = Active, 'S' = Sold, 'P' = Pending, 'LEAS', 'W', 'X', 'T', 'I'
  PropertySubType?: string
  PropertyType?: string
  ListPrice: number | null
  ClosePrice?: number | null
  BedroomsTotal: number | null
  BathroomsTotalInteger: number | null
  LivingArea?: number | null
  LivingAreaSF?: number | null  // Matrix API field name
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
  LotSizeAcres?: number | null  // Matrix API field name
  LotSizeDimensions?: string | null
  LotSizeUnits?: string | null

  // Building Details
  Stories?: number | null
  StoriesTotal?: number | null  // Matrix API field name
  BuildingAreaTotal?: number | null
  BuildingAreaTotalSF?: number | null  // Matrix API field name
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
   * Make authenticated request to Matrix Web API with 401 retry (token refresh)
   */
  private async makeApiRequest<T>(query: string, pathOverride?: string): Promise<T> {
    const basePath = pathOverride ?? this.apiPath
    const url = `https://${this.apiHost}${basePath}${query}`

    const doRequest = async (token: string): Promise<Response> => {
      return fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })
    }

    let token = await this.getToken()
    let response = await doRequest(token)

    // On 401, refresh token and retry once
    if (response.status === 401) {
      console.log('🔐 Pillar9: 401 received, refreshing token and retrying...')
      this.accessToken = null
      this.tokenExpiresAt = 0
      await new Promise((r) => setTimeout(r, 1000))
      token = await this.getToken()
      response = await doRequest(token)
    }

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Pillar9 API request failed: ${response.status} - ${errorText}`)
    }

    return response.json()
  }

  /** MLS status codes supported by Matrix API */
  /** Matrix API accepts A,P,S,W,X,T,I (LEAS is not a valid enum value) */
  static readonly MLS_STATUSES = ['A', 'P', 'S', 'W', 'X', 'T', 'I'] as const

  getMlsStatuses(): readonly string[] {
    return Pillar9Service.MLS_STATUSES
  }

  /**
   * Fetch properties from Pillar9/Matrix API
   * Use cityCode (4-digit) to batch by city and avoid "too many results". When cityCode is set, no default minPrice is applied.
   */
  async getProperties(filters: {
    status?: 'A' | 'P' | 'S' | 'LEAS' | 'W' | 'X' | 'T' | 'I' | 'all'
    /** 4-digit city code (e.g. '0046' = Calgary). When set, filter is applied in API and no default minPrice is used. */
    cityCode?: string
    city?: string
    minPrice?: number
    maxPrice?: number
    province?: string
    limit?: number
    skip?: number
    select?: string[]
  } = {}): Promise<Pillar9Property[]> {
    const filterConditions: string[] = []

    if (filters.status && filters.status !== 'all') {
      filterConditions.push(`MlsStatus eq '${filters.status}'`)
    } else if (!filters.status) {
      filterConditions.push("MlsStatus eq 'A'")
    }

    // Only add province filter when not filtering by city (city codes are Alberta-specific; Matrix may not support StateOrProvince in filter)
    if (filters.province && !filters.cityCode) {
      filterConditions.push(`StateOrProvince eq '${filters.province}'`)
    }

    // City filter by code (Matrix API uses codes e.g. 0046 = Calgary)
    if (filters.cityCode) {
      filterConditions.push(`City eq '${filters.cityCode}'`)
    }

    // Price filters: when cityCode is set we don't add default minPrice so we get all in that city
    if (filters.minPrice != null) {
      filterConditions.push(`ListPrice ge ${filters.minPrice}`)
    } else if (!filters.cityCode) {
      filterConditions.push(`ListPrice ge 2000000`)
    }
    if (filters.maxPrice != null) {
      filterConditions.push(`ListPrice le ${filters.maxPrice}`)
    }

    const queryParts: string[] = []
    if (filterConditions.length > 0) {
      queryParts.push(`$filter=${encodeURIComponent(filterConditions.join(' and '))}`)
    }

    const limit = Math.min(filters.limit ?? 200, 200)
    queryParts.push(`$top=${limit}`)
    if (filters.skip != null && filters.skip > 0) {
      queryParts.push(`$skip=${filters.skip}`)
    }

    // Must match test_matrix_api.js MINIMAL_FIELDS exactly - Matrix API rejects unknown property names
    const defaultSelect = [
      'ListingId', 'ListingKeyNumeric', 'MlsStatus',
      'ListPrice', 'BedroomsTotal', 'BathroomsTotalInteger',
      'UnparsedAddress', 'City', 'PostalCode',
      'LivingAreaSF', 'YearBuilt', 'PropertyType',
      'ListAgentFullName', 'ListOfficeName',
      'PhotosCount', 'DaysOnMarket', 'ModificationTimestamp'
    ]
    const select = filters.select?.length ? filters.select : defaultSelect
    queryParts.push(`$select=${encodeURIComponent(select.join(','))}`)

    const query = `?${queryParts.join('&')}`
    const response: Pillar9ApiResponse = await this.makeApiRequest(query)
    let properties = response.value || []

    if (filters.city && !filters.cityCode && properties.length > 0) {
      const cityLower = filters.city.toLowerCase()
      properties = properties.filter(p => p.City?.toLowerCase().includes(cityLower))
    }

    console.log(`📦 Pillar9: Retrieved ${properties.length} properties`)
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
   * Fetch property images/media from Matrix Media endpoint (ResourceRecordKeyNumeric = ListingKeyNumeric)
   */
  async getPropertyMedia(listingKeyNumeric: number | string): Promise<string[]> {
    try {
      const filter = `ResourceRecordKeyNumeric eq ${listingKeyNumeric}`
      const query = `?$filter=${encodeURIComponent(filter)}`
      const response: any = await this.makeApiRequest(query, '/MatrixWebAPI/local/Media')
      const list = response.value || []
      const urls = list
        .slice(0, 30)
        .sort((a: any, b: any) => (a.Order ?? 0) - (b.Order ?? 0))
        .map((m: any) => {
          const paths = m.MediaPath as Array<{ MediaSize?: number; MediaUrl?: string }> | undefined
          if (!paths?.length) return null
          const preferred = paths.find((p: any) => p.MediaSize === 3 || p.MediaSize === 7)?.MediaUrl ?? paths[0]?.MediaUrl
          return preferred
        })
        .filter(Boolean)
      return urls
    } catch (error) {
      console.warn(`⚠️ Pillar9: Failed to fetch media for listing ${listingKeyNumeric}:`, (error as Error).message)
      return []
    }
  }

  /**
   * Map Pillar9/Matrix MlsStatus to local status (all statuses captured)
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
      case 'LEAS':
      case 'LEASED':
        return 'leased'
      case 'W':
      case 'WITHDRAWN':
        return 'withdrawn'
      case 'X':
      case 'EXPIRED':
        return 'expired'
      case 'T':
      case 'TERMINATED':
        return 'terminated'
      case 'I':
      case 'INCOMPLETE':
        return 'incomplete'
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
    const livingArea = p9Prop.LivingAreaSF ?? p9Prop.LivingArea
    const hasNoLivingArea = !livingArea || livingArea === 0
    
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
      lotSizeArea: p9Prop.LotSizeAcres ?? p9Prop.LotSizeArea,
      lotSizeDimensions: p9Prop.LotSizeDimensions,
      lotSizeUnits: p9Prop.LotSizeUnits,
      stories: p9Prop.StoriesTotal ?? p9Prop.Stories,
      architecturalStyle: p9Prop.ArchitecturalStyle || [],
      basement: p9Prop.Basement || [],
      foundationDetails: p9Prop.FoundationDetails || [],
      roof: p9Prop.Roof || [],
      constructionMaterials: p9Prop.ConstructionMaterials || [],
      buildingAreaTotal: p9Prop.BuildingAreaTotalSF ?? p9Prop.BuildingAreaTotal,
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
      sqft: (p9Prop.LivingAreaSF ?? p9Prop.LivingArea) || 0,
      type,
      status,
      address: p9Prop.UnparsedAddress,
      city: p9Prop.City,
      province: p9Prop.StateOrProvince || 'AB',
      postalCode: p9Prop.PostalCode || '',
      latitude: p9Prop.Latitude || null,
      longitude: p9Prop.Longitude || null,
      features,
      images,
      views: 0,
      userId: null as any,
      source: 'pillar9' as const,
      externalId: (p9Prop.ListingKeyNumeric != null ? String(p9Prop.ListingKeyNumeric) : null) ?? p9Prop.ListingId,
      mlsNumber: p9Prop.ListingId,
      
      // Enhanced fields
      lotSizeArea: (p9Prop.LotSizeAcres ?? p9Prop.LotSizeArea) ?? null,
      lotSizeDimensions: p9Prop.LotSizeDimensions ?? null,
      lotSizeUnits: p9Prop.LotSizeUnits ?? null,
      stories: (p9Prop.StoriesTotal ?? p9Prop.Stories) ?? null,
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
   * Alberta city codes (Matrix API) for batch sync - avoids "too many results"
   */
  getAlbertaCityCodes(): string[] {
    return [
      '0046', '0047', '0100', '0102', '0114', '0134', '0141', '0264', '0265', '0380',
      '0150', '0152', '0154', '0156', '0159', '0161', '0165', '0167', '0170', '0172',
      '0201', '0203', '0205', '0125', '0145', '0168', '0182', '0184', '0187', '0190',
      '0192', '0195', '0197', '0199', '0200', '0202', '0204', '0206', '0208', '0210',
      '0212', '0214', '0216', '0218', '0220', '0222', '0224', '0226', '0228', '0230',
      '0232', '0234', '0236', '0238', '0240', '0242', '0244', '0246', '0248', '0250',
      '0252', '0254', '0256', '0258', '0300', '0302', '0304', '0306', '0308', '0310',
      '0312', '0314', '0316', '0318', '0320', '0322', '0324', '0326', '0328', '0330',
      '0332', '0334', '0336', '0338', '0340', '0342', '0344', '0346', '0348', '0350',
      '0352', '0354', '0356', '0358', '0360', '0362', '0364', '0366', '0368', '0370',
      '0372', '0374', '0376', '0378', '0381', '0383', '0385', '0387', '0389', '0391',
      '0393', '0395', '0397', '0399', '0401', '0403', '0405', '0407', '0409', '0411',
      '0413', '0415', '0417', '0419', '0421', '0423', '0425', '0427', '0429', '0431',
      '0433', '0435', '0437', '0439', '0441', '0443', '0445', '0447', '0449', '0451',
      '0453', '0455', '0457', '0459', '0461', '0463', '0465', '0467', '0469', '0471',
      '0473', '0475', '0477', '0479', '0481', '0483', '0485', '0487', '0489', '0491',
      '0493', '0495', '0497', '0499', '0501', '0503', '0505', '0507', '0509', '0511',
      '0513', '0515', '0517', '0519', '0521', '0523', '0525', '0527', '0529', '0531',
      '0533', '0535', '0537', '0539', '0541', '0543', '0545', '0547', '0549', '0551',
      '0553', '0555', '0557', '0559', '0561', '0563', '0565', '0567', '0569', '0571',
      '0573', '0575', '0577', '0579', '0581', '0583', '0585', '0587', '0589', '0591'
    ]
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
