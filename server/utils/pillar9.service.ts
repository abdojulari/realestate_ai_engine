import type { Property } from '~/types'

interface Pillar9Property {
  ListingId: string
  ListingKeyNumeric?: number
  MlsStatus: string
  PropertySubType?: string
  PropertyType?: string
  ListPrice: number | null
  OriginalListPrice?: number | null
  PreviousListPrice?: number | null
  PriceChangeTimestamp?: string | null
  MajorChangeTimestamp?: string | null
  MajorChangeType?: string | null
  ClosePrice?: number | null
  BedroomsTotal: number | null
  BathroomsTotalInteger: number | null
  LivingArea?: number | null
  LivingAreaSF?: number | null
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
  PhotosChangeTimestamp?: string
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
  LotSizeAcres?: number | null
  LotSizeDimensions?: string | null
  LotSizeUnits?: string | null

  // Building Details
  Stories?: number | null
  StoriesTotal?: number | null
  BuildingAreaTotal?: number | null
  BuildingAreaTotalSF?: number | null
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
  DaysOnMarket?: number | null

  // 2026 schema update (only fields confirmed available in Matrix API)
  SubdivisionName?: string | null
}

interface Pillar9ApiResponse {
  value: Pillar9Property[]
  '@odata.count'?: number
  '@odata.nextLink'?: string
}

/**
 * Mapping of Pillar9 / Matrix city codes → human-readable Alberta city names.
 * This covers the major cities plus surrounding municipalities.
 * Codes not found here will fall through to the raw code string.
 */
const PILLAR9_CITY_CODE_MAP: Record<string, string> = {
  '0046': 'Calgary',
  '0047': 'Calgary (NW)',
  '0100': 'Edmonton',
  '0102': 'St. Albert',
  '0114': 'Red Deer',
  '0134': 'Lethbridge',
  '0141': 'Medicine Hat',
  '0264': 'Airdrie',
  '0265': 'Cochrane',
  '0380': 'Okotoks',
  '0150': 'Spruce Grove',
  '0152': 'Stony Plain',
  '0154': 'Leduc',
  '0156': 'Fort Saskatchewan',
  '0159': 'Sherwood Park',
  '0161': 'Beaumont',
  '0165': 'Morinville',
  '0167': 'Devon',
  '0170': 'Camrose',
  '0172': 'Wetaskiwin',
  '0201': 'Grande Prairie',
  '0203': 'Fort McMurray',
  '0205': 'Lloydminster',
  '0125': 'Sylvan Lake',
  '0145': 'Brooks',
  '0168': 'Drayton Valley',
  '0182': 'Lacombe',
  '0184': 'Ponoka',
  '0187': 'Innisfail',
  '0190': 'Olds',
  '0192': 'Didsbury',
  '0195': 'Carstairs',
  '0197': 'Crossfield',
  '0199': 'Irricana',
  '0200': 'Chestermere',
  '0202': 'Strathmore',
  '0204': 'High River',
  '0206': 'Nanton',
  '0208': 'Claresholm',
  '0210': 'Vulcan',
  '0212': 'Taber',
  '0214': 'Coaldale',
  '0216': 'Raymond',
  '0218': 'Cardston',
  '0220': 'Pincher Creek',
  '0222': 'Crowsnest Pass',
  '0224': 'Canmore',
  '0226': 'Banff',
  '0228': 'Jasper',
  '0230': 'Hinton',
  '0232': 'Edson',
  '0234': 'Whitecourt',
  '0236': 'Slave Lake',
  '0238': 'Athabasca',
  '0240': 'Westlock',
  '0242': 'Barrhead',
  '0244': 'Peace River',
  '0246': 'Fairview',
  '0248': 'High Level',
  '0250': 'Bonnyville',
  '0252': 'Cold Lake',
  '0254': 'Vegreville',
  '0256': 'Vermilion',
  '0258': 'Wainwright',
  '0300': 'Stettler',
  '0302': 'Hanna',
  '0304': 'Drumheller',
  '0306': 'Three Hills',
  '0308': 'Trochu',
  '0310': 'Sundre',
  '0312': 'Rocky Mountain House',
  '0314': 'Rimbey',
  '0316': 'Bentley',
  '0318': 'Blackfalds',
  '0320': 'Penhold',
}

class Pillar9Service {
  private apiHost = 'abrls.matrixwebapi.com'
  private apiPath = '/MatrixWebAPI/local/Property'
  private clientId: string | null = null
  private clientSecret: string | null = null
  private configInitialized = false

  /**
   * Initialize config from runtime config (call this from API handlers).
   * Empty strings are treated as unset so process.env fallback still works
   * (Nuxt runtimeConfig bakes '' at build time when env vars are absent).
   */
  initConfig(config: { 
    clientId?: string
    clientSecret?: string
    apiHost?: string 
  }) {
    if (config.clientId) this.clientId = config.clientId
    if (config.clientSecret) this.clientSecret = config.clientSecret
    if (config.apiHost) this.apiHost = config.apiHost
    this.configInitialized = true
    this.ensureConfig()
  }

  /**
   * Fill any still-missing credentials from process.env.
   * Always runs — covers both the "initConfig never called" path and the
   * "initConfig called with empty runtimeConfig values" path (Docker builds
   * where PILLAR9_* aren't available at nuxt build but are injected at runtime
   * via env_file / docker-compose environment).
   */
  private ensureConfig() {
    if (!this.clientId) {
      this.clientId = process.env.PILLAR9_CLIENT_ID || null
    }
    if (!this.clientSecret) {
      this.clientSecret = process.env.PILLAR9_CLIENT_SECRET || null
    }
    if (!this.apiHost || this.apiHost === 'abrls.matrixwebapi.com') {
      this.apiHost = process.env.PILLAR9_API_HOST || this.apiHost
    }
  }

  private getBasicAuthHeader(): string {
    this.ensureConfig()
    if (!this.clientId || !this.clientSecret) {
      throw new Error('Pillar9 API credentials not configured. Set PILLAR9_CLIENT_ID and PILLAR9_CLIENT_SECRET environment variables.')
    }
    return `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
  }

  /**
   * Make authenticated request to Matrix Web API using Basic Auth.
   * 404 → returns { value: [] } (end-of-pagination / no data for this query).
   * 400 with "not a valid enumeration" → throws with code 'INVALID_ENUM'.
   * Other errors → throws normally.
   */
  private async makeApiRequest<T>(query: string, pathOverride?: string): Promise<T> {
    const basePath = pathOverride ?? this.apiPath
    const url = `https://${this.apiHost}${basePath}${query}`

    const response = await fetch(url, {
      headers: {
        'Authorization': this.getBasicAuthHeader(),
        'Accept': 'application/json'
      }
    })

    if (response.status === 404) {
      return { value: [] } as unknown as T
    }

    if (!response.ok) {
      const errorText = await response.text()
      const err = new Error(`Pillar9 API request failed: ${response.status} - ${errorText}`)
      ;(err as any).statusCode = response.status
      ;(err as any).body = errorText
      throw err
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

    // Matrix OData $select: every field that transformToLocalProperty reads.
    // Unknown names are rejected by the API — only add fields that actually exist in the Matrix schema.
    // Fields verified against the Matrix OData schema (Basic Auth).
    // Removed after testing: ClosePrice, CloseDate, LivingArea, BuildingAreaUnits,
    // Stories, LotSizeArea, LotSizeUnits, TaxAnnualAmount, TaxYear, ParcelNumber,
    // ZoningDescription, ListDate, ListAgentKey, SecurityFeatures, View.
    const defaultSelect = [
      // Core identifiers
      'ListingId', 'ListingKeyNumeric', 'MlsStatus',
      // Pricing — incl. RESO standard original / previous list prices so the
      // Best Deals page can detect reductions that happened before we started
      // tracking the listing. Matrix returns null for any of these the board
      // doesn't publish, so they're safe to request unconditionally.
      'ListPrice',
      'OriginalListPrice',
      'PreviousListPrice',
      'PriceChangeTimestamp',
      'MajorChangeTimestamp',
      'MajorChangeType',
      // Rooms & size
      'BedroomsTotal', 'BathroomsTotalInteger',
      'LivingAreaSF',
      'BuildingAreaTotalSF', 'BuildingAreaTotal',
      // Location
      'UnparsedAddress', 'StreetName', 'StreetNumber', 'UnitNumber',
      'City', 'StateOrProvince', 'PostalCode',
      'Latitude', 'Longitude',
      // Type & structure
      'PropertyType', 'PropertySubType',
      'YearBuilt', 'StoriesTotal',
      // Lot
      'LotSizeAcres', 'LotSizeDimensions',
      // Parking
      'ParkingTotal', 'GarageSpaces',
      // Tax
      'Zoning',
      // Description
      'PublicRemarks',
      // Dates & meta
      'DaysOnMarket', 'ModificationTimestamp', 'PhotosCount', 'PhotosChangeTimestamp',
      // Agent
      'ListAgentFullName', 'ListAgentEmail', 'ListAgentDirectPhone',
      'ListOfficeName',
      // Features (array fields — Matrix returns [] or null for these)
      'Heating', 'Cooling', 'Appliances',
      'ExteriorFeatures', 'InteriorFeatures',
      'ArchitecturalStyle', 'Basement', 'FoundationDetails',
      'Roof', 'ConstructionMaterials',
      'Utilities', 'WaterSource', 'Sewer', 'Electric',
      'PoolFeatures', 'WaterfrontFeatures',
      // 2026 schema additions (only fields confirmed available in Matrix API)
      'SubdivisionName',
    ]
    const select = filters.select?.length ? filters.select : defaultSelect
    queryParts.push(`$select=${encodeURIComponent(select.join(','))}`)
    queryParts.push(`$orderby=${encodeURIComponent('ListingKeyNumeric asc')}`)

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

    const sub = (subType || '').toLowerCase()
    const prop = (propertyType || '').toLowerCase()

    // Commercial indicators (check both fields)
    const combined = `${sub} ${prop}`
    const commercialIndicators = [
      'office', 'commercial', 'retail', 'industrial', 'warehouse',
      'manufacturing', 'business', 'store', 'shop', 'plaza', 'medical'
    ]

    if (commercialIndicators.some(indicator => combined.includes(indicator))) {
      if (combined.includes('industrial') || combined.includes('warehouse')) {
        return 'industrial'
      }
      return 'commercial'
    }

    if (combined.includes('vacant land') || prop === 'land') return 'land'

    // PropertyType "Condo"/"Condominium" = always condo (apartment === condo)
    // regardless of building type (townhouse condo is still a condo)
    if (prop.includes('condo') || prop.includes('condominium')) return 'condo'

    // PropertySubType-based mapping (building type)
    if (sub.includes('apartment') || sub.includes('apt')) return 'condo'
    if (sub.includes('townhouse') || sub.includes('town') || sub.includes('row house') || sub.includes('row/')) return 'townhouse'
    if (sub.includes('duplex') || sub.includes('half duplex')) return 'duplex'
    if (sub.includes('multi-family') || sub.includes('multiplex') ||
        sub.includes('fourplex') || sub.includes('4plex') || sub.includes('four-plex') ||
        sub.includes('triplex') || sub.includes('3plex') || sub.includes('tri-plex')) return 'multi-family'

    if (sub.includes('single family') || sub.includes('detached') || sub.includes('house')) return 'house'

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

    // Build features object — aligned with CREA feature keys for uniform API responses
    const features = {
      // Property classification (mirrors CREA features.propertySubType / propertyType)
      propertySubType: p9Prop.PropertySubType,
      propertyType: p9Prop.PropertyType,

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
      subdivisionName: p9Prop.SubdivisionName ?? null,
    }

    const price = status === 'sold' && p9Prop.ClosePrice 
      ? p9Prop.ClosePrice 
      : (p9Prop.ListPrice || 0)

    // Resolve city code to readable name (e.g. '0046' → 'Calgary')
    const cityName = this.getCityName(p9Prop.City)

    return {
      title: `${p9Prop.UnparsedAddress}, ${cityName}`,
      description: p9Prop.PublicRemarks || `${p9Prop.PropertySubType || 'Property'} in ${cityName}`,
      price,
      beds: p9Prop.BedroomsTotal || 0,
      baths: p9Prop.BathroomsTotalInteger || 0,
      sqft: (p9Prop.LivingAreaSF ?? p9Prop.LivingArea) || 0,
      type,
      status,
      address: p9Prop.UnparsedAddress,
      city: cityName,
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
      
      // Fields CREA provides but Pillar9 doesn't — set explicitly to avoid undefined
      propertyCondition: null,
      cityRegion: null,
      waterBodyName: null,

      daysOnMarket: p9Prop.DaysOnMarket ?? (p9Prop.ListDate
        ? Math.floor((Date.now() - new Date(p9Prop.ListDate).getTime()) / (1000 * 60 * 60 * 24))
        : null),
      originalEntryTimestamp: p9Prop.ListDate ? new Date(p9Prop.ListDate) : null,

      // RESO standard MLS price tracking — surfaces reductions that pre-date
      // our first ingest (used by Best Deals page).
      originalListPrice: typeof p9Prop.OriginalListPrice === 'number' ? p9Prop.OriginalListPrice : null,
      previousListPrice: typeof p9Prop.PreviousListPrice === 'number' ? p9Prop.PreviousListPrice : null,
      priceChangeTimestamp: p9Prop.PriceChangeTimestamp
        ? new Date(p9Prop.PriceChangeTimestamp)
        : (p9Prop.MajorChangeTimestamp ? new Date(p9Prop.MajorChangeTimestamp) : null),

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
   * Map a Pillar9 city code to a human-readable city name.
   * Falls through to the raw code when no mapping exists.
   */
  getCityName(code: string): string {
    return PILLAR9_CITY_CODE_MAP[code] ?? code
  }

  /**
   * Reverse lookup: given a city name, return all codes that map to it.
   */
  getCodesForCityName(name: string): string[] {
    const lower = name.toLowerCase()
    return Object.entries(PILLAR9_CITY_CODE_MAP)
      .filter(([, cityName]) => cityName.toLowerCase() === lower)
      .map(([code]) => code)
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
