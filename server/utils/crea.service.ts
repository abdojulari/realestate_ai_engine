import type { Property } from '~/types'

interface CreaTokenResponse {
  access_token: string
  expires_in: number
  token_type: string
  scope: string
}

interface CreaProperty {
  // Core Listing Identifiers
  ListingKey: string
  ListingId: string
  ListingURL: string
  OriginatingSystemName?: string
  
  // Property Classification
  PropertySubType: string
  PropertyType?: string
  BusinessType?: string | string[]
  StructureType?: string | string[]
  PropertyClass?: string
  PropertyUse?: string
  CurrentUse?: string | string[]
  PossibleUse?: string | string[]
  CommonInterest?: string
  
  // Pricing & Lease Information
  ListPrice: number | null
  LeaseAmount?: number | null
  LeaseAmountFrequency?: string
  LeasePerUnit?: string
  PricePerUnit?: string
  TotalActualRent?: number | null
  ExistingLeaseType?: string | string[]
  
  // Association/HOA Details
  AssociationFee?: number | null
  AssociationFeeFrequency?: string
  AssociationName?: string
  AssociationFeeIncludes?: string[]
  
  // Status & Timestamps
  StandardStatus: string
  StatusChangeTimestamp?: string
  OriginalEntryTimestamp: string
  ModificationTimestamp: string
  AvailabilityDate?: string
  PhotosChangeTimestamp?: string
  
  // Listing Details
  PublicRemarks: string
  Inclusions?: string
  DocumentsAvailable?: string[]
  InternetEntireListingDisplayYN?: boolean
  InternetAddressDisplayYN?: boolean
  PhotosCount?: number
  
  // Agent and Office Relationships
  ListAgentKey: string
  ListOfficeKey: string
  CoListAgentKey?: string
  CoListAgentKey2?: string
  CoListAgentKey3?: string
  CoListOfficeKey?: string
  CoListOfficeKey2?: string
  CoListOfficeKey3?: string
  ListAOR?: string
  ListAORKey?: string
  
  // Location - Address Components
  UnparsedAddress: string
  StreetNumber?: string | null
  StreetName?: string | null
  StreetDirPrefix?: string | null
  StreetDirSuffix?: string | null
  StreetSuffix?: string | null
  UnitNumber?: string | null
  City: string
  CityRegion?: string | null
  StateOrProvince: string
  PostalCode: string
  Country?: string | null
  SubdivisionName?: string
  Directions?: string | null
  
  // Location - Coordinates
  Latitude: number
  Longitude: number
  MapCoordinateVerifiedYN?: boolean
  GeocodeManualYN?: boolean
  
  // Property Size & Dimensions
  LotSizeArea?: number | null
  LotSizeDimensions?: string | null
  LotSizeUnits?: string | null
  LotFeatures?: string[]
  BuildingAreaTotal?: number | null
  BuildingAreaUnits?: string | null
  LivingArea: number | null
  LivingAreaUnits: string | null
  LivingAreaSource?: string
  LivingAreaMinimum?: number | null
  LivingAreaMaximum?: number | null
  AboveGradeFinishedArea?: number | null
  AboveGradeFinishedAreaUnits?: string | null
  AboveGradeFinishedAreaSource?: string | null
  AboveGradeFinishedAreaMinimum?: number | null
  AboveGradeFinishedAreaMaximum?: number | null
  BelowGradeFinishedArea?: number | null
  BelowGradeFinishedAreaUnits?: string | null
  BelowGradeFinishedAreaSource?: string | null
  BelowGradeFinishedAreaMinimum?: number | null
  BelowGradeFinishedAreaMaximum?: number | null
  FrontageLengthNumeric?: number | null
  FrontageLengthNumericUnits?: string | null
  
  // Building Details
  YearBuilt: number | null
  Stories?: number | null
  NumberOfBuildings?: number | null
  NumberOfUnitsTotal?: number | null
  PropertyAttachedYN?: boolean | null
  ArchitecturalStyle?: string[]
  ConstructionMaterials?: string[]
  FoundationDetails?: string[]
  Roof?: string[]
  PropertyCondition?: string[]
  Basement?: string[]
  
  // Rooms & Bedrooms
  BedroomsTotal: number | null
  BedroomsAboveGrade?: number | null
  BedroomsBelowGrade?: number | null
  BathroomsTotalInteger: number | null
  BathroomsPartial?: number | null
  Rooms?: Array<{
    RoomKey: string
    ListingId: string
    ListingKey: string
    ModificationTimestamp: string
    RoomDescription?: string
    RoomDimensions?: string
    RoomLength?: number
    RoomLevel?: string
    RoomWidth?: number
    RoomLengthWidthUnits?: string
    RoomType?: string
  }>
  
  // Interior Features
  Appliances?: string[]
  Flooring?: string[]
  InteriorFeatures?: string[]
  FireplacesTotal?: number | null
  FireplaceYN?: boolean | null
  FireplaceFeatures?: string[]
  AccessibilityFeatures?: string[]
  SecurityFeatures?: string[]
  OtherEquipment?: string[]
  
  // Exterior Features
  ExteriorFeatures?: string[]
  BuildingFeatures?: string[]
  Fencing?: string[]
  PoolFeatures?: string[]
  
  // Parking
  ParkingTotal: number | null
  ParkingFeatures?: string[]
  
  // Climate Control
  Heating?: string[]
  Cooling?: string[]
  
  // Utilities
  Utilities?: string[]
  WaterSource?: string[]
  Sewer?: string[]
  Electric?: string[]
  IrrigationSource?: string[]
  
  // Views & Water Features
  View?: string[]
  WaterfrontFeatures?: string[]
  WaterBodyName?: string | null
  
  // Land & Road
  RoadSurfaceType?: string[]
  CommunityFeatures?: string[]
  AnchorsCoTenants?: string
  
  // Legal & Tax Information
  Zoning?: string | null
  ZoningDescription?: string | null
  TaxAnnualAmount?: number | null
  TaxYear?: number | null
  TaxBlock?: string
  TaxLot?: string
  ParcelNumber?: string | null
  
  // Media
  Media?: Array<{
    MediaKey?: string
    MediaURL: string
    PreferredPhotoYN: boolean
    Order: number
    LongDescription?: string
    ModificationTimestamp?: string
    ResourceRecordId?: string
    ResourceRecordKey?: string
    ResourceName?: string
    MediaCategory?: string
  }>
}

interface CreaMember {
  MemberKey: string
  MemberMlsId: string
  MemberFirstName: string
  MemberLastName: string
  MemberFullName: string
  MemberEmail?: string
  MemberDirectPhone?: string
  MemberMobilePhone?: string
  MemberOfficePhone?: string
  MemberStateLicense?: string
  MemberDesignation?: string[]
  MemberPhotoURL?: string
  OfficeKey: string
  OfficeName?: string
  ModificationTimestamp: string
}

interface CreaOffice {
  OfficeKey: string
  OfficeId: string
  OfficeName: string
  OfficePhone?: string
  OfficeEmail?: string
  OfficeAddress1?: string
  OfficeAddress2?: string
  OfficeCity?: string
  OfficeStateOrProvince?: string
  OfficePostalCode?: string
  OfficeCountry?: string
  OfficeWebsiteURL?: string
  OfficeBrokerKey?: string
  OfficeBrokerMlsId?: string
  ModificationTimestamp: string
}

interface CreaApiResponse {
  value: CreaProperty[] | CreaMember[] | CreaOffice[]
  '@odata.nextLink'?: string
}

class CreaService {
  private baseURL = process.env.CREA_BASE_URL || 'https://ddfapi.realtor.ca'
  private clientId = process.env.CREA_CLIENT_ID
  private clientSecret = process.env.CREA_CLIENT_SECRET
  private tokenEndpoint = 'https://identity.crea.ca/connect/token'
  
  private accessToken: string | null = null
  private tokenExpiresAt: number = 0

  private async getToken(): Promise<string> {
    // Check if token is still valid (with 5-minute buffer)
    if (this.accessToken && Date.now() < (this.tokenExpiresAt - 5 * 60 * 1000)) {
      return this.accessToken
    }

    const response = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId!,
        client_secret: this.clientSecret!,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to get CREA token: ${response.status}`)
    }

    const tokenData: CreaTokenResponse = await response.json()
    this.accessToken = tokenData.access_token
    this.tokenExpiresAt = Date.now() + (tokenData.expires_in * 1000)

    return this.accessToken
  }

  private async makeCreaRequest<T>(endpoint: string): Promise<T> {
    const token = await this.getToken()
    const url = `${this.baseURL}${endpoint}`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '')
      console.error(`CREA API error [${response.status}]: ${errorBody.substring(0, 500)}`)
      throw new Error(`CREA API request failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async getProperties(filters: any = {}): Promise<CreaProperty[]> {
    const params = new URLSearchParams()

    // Build filter conditions array
    const filterConditions: string[] = []
    
    if (filters.standardStatus) {
      const statuses = Array.isArray(filters.standardStatus) ? filters.standardStatus : [filters.standardStatus]
      const clause = statuses.map((s: string) => `StandardStatus eq '${s}'`).join(' or ')
      filterConditions.push(statuses.length > 1 ? `(${clause})` : clause)
    } else if (filters.includeSold) {
      filterConditions.push("(StandardStatus eq 'Active' or StandardStatus eq 'Sold')")
    } else {
      filterConditions.push("StandardStatus eq 'Active'")
    }

    // Handle province filter (simplified approach for Alberta sync)
    if (filters.province) {
      filterConditions.push(`StateOrProvince eq '${filters.province}'`)
    }

    // Add other filters
    if (filters.city) {
      filterConditions.push(`City eq '${filters.city}'`)
    }
    
    if (filters.minPrice || filters.maxPrice) {
      let priceFilter = ''
      if (filters.minPrice) priceFilter += `ListPrice ge ${filters.minPrice}`
      if (filters.maxPrice) {
        if (priceFilter) priceFilter += ' and '
        priceFilter += `ListPrice le ${filters.maxPrice}`
      }
      if (priceFilter) {
        filterConditions.push(priceFilter)
      }
    }
    
    if (filters.beds) {
      filterConditions.push(`BedroomsTotal ge ${filters.beds}`)
    }

    const buildEndpoint = (conditions: string[]) => {
      const queryParts: string[] = []
      if (conditions.length > 0) {
        queryParts.push(`$filter=${encodeURIComponent(conditions.join(' and '))}`)
      }
      const topLimit = filters.$top || 100
      queryParts.push(`$top=${topLimit}`)
      const queryString = queryParts.join('&')
      return `/odata/v1/Property${queryString ? `?${queryString}` : ''}`
    }

    // Preferred filter set (includes commercial exclusions and optional $filter)
    const preferredConditions = [...filterConditions]
    if (!filters.province) {
      preferredConditions.push("PropertySubType ne 'Office'")
      preferredConditions.push("PropertySubType ne 'Commercial'")
      preferredConditions.push("PropertySubType ne 'Industrial'")
      if (filters.$filter) {
        preferredConditions.push(filters.$filter)
      }
    }

    // Fallback filter set (basic filters only)
    const fallbackConditions = [...filterConditions]

    try {
      const endpoint = buildEndpoint(preferredConditions)
      console.log('CREA API Query:', endpoint)
      const response: CreaApiResponse = await this.makeCreaRequest(endpoint)
      console.log(`CREA returned ${response.value?.length || 0} properties`)
      return (response.value as CreaProperty[]) || []
    } catch (error: any) {
      const message = error?.message || ''
      if (message.includes('400')) {
        const fallbackEndpoint = buildEndpoint(fallbackConditions)
        console.warn('CREA query failed with 400, retrying with fallback filters:', fallbackEndpoint)
        const response: CreaApiResponse = await this.makeCreaRequest(fallbackEndpoint)
        console.log(`CREA returned ${response.value?.length || 0} properties (fallback)`)
        return (response.value as CreaProperty[]) || []
      }
      throw error
    }
  }

  // Get total count of properties from CREA
  async getPropertiesCount(filters: any = {}): Promise<number> {
    const filterConditions: string[] = []

    // Always filter to Active listings only (consistent with getProperties)
    filterConditions.push("StandardStatus eq 'Active'")

    if (filters.province) {
      filterConditions.push(`StateOrProvince eq '${filters.province}'`)
    }
    
    if (filters.city) {
      filterConditions.push(`City eq '${filters.city}'`)
    }

    const queryParts: string[] = []
    
    if (filterConditions.length > 0) {
      queryParts.push(`$filter=${encodeURIComponent(filterConditions.join(' and '))}`)
    }

    // Only get count, no actual data
    queryParts.push('$top=0')
    queryParts.push('$count=true')
    
    const queryString = queryParts.join('&')
    const endpoint = `/odata/v1/Property${queryString ? `?${queryString}` : ''}`

    console.log('CREA Count Query:', endpoint)
    const response: any = await this.makeCreaRequest(endpoint)
    
    return response['@odata.count'] || 0
  }

  async getPropertyById(listingKey: string): Promise<CreaProperty | null> {
    try {
      const safeKey = encodeURIComponent(listingKey)
      const property: CreaProperty = await this.makeCreaRequest(`/odata/v1/Property('${safeKey}')?$expand=Media`)
      return property
    } catch (error: any) {
      if (error?.message?.includes('400')) {
        try {
          const result: { value: CreaProperty[] } = await this.makeCreaRequest(
            `/odata/v1/Property?$filter=ListingKey eq '${safeKey}'&$expand=Media&$top=1`
          )
          return result.value?.[0] || null
        } catch {
          console.error('Error fetching CREA property (fallback):', error)
          return null
        }
      }
      console.error('Error fetching CREA property:', error)
      return null
    }
  }

  async getMemberById(memberKey: string): Promise<CreaMember | null> {
    try {
      const response: { value: CreaMember[] } = await this.makeCreaRequest(`/odata/v1/Member?$filter=MemberKey eq '${memberKey}'`)
      return response.value[0] || null
    } catch (error) {
      console.error('Error fetching CREA member:', error)
      return null
    }
  }

  async getOfficeById(officeKey: string): Promise<CreaOffice | null> {
    try {
      const response: { value: CreaOffice[] } = await this.makeCreaRequest(`/odata/v1/Office?$filter=OfficeKey eq '${officeKey}'`)
      return response.value[0] || null
    } catch (error) {
      console.error('Error fetching CREA office:', error)
      return null
    }
  }

  async getMembersByKeys(memberKeys: string[]): Promise<CreaMember[]> {
    if (!memberKeys.length) return []
    
    try {
      const keyFilter = memberKeys.map(key => `MemberKey eq '${key}'`).join(' or ')
      const response: { value: CreaMember[] } = await this.makeCreaRequest(`/odata/v1/Member?$filter=${keyFilter}`)
      return response.value || []
    } catch (error) {
      console.error('Error fetching CREA members:', error)
      return []
    }
  }

  async getOfficesByKeys(officeKeys: string[]): Promise<CreaOffice[]> {
    if (!officeKeys.length) return []
    
    try {
      const keyFilter = officeKeys.map(key => `OfficeKey eq '${key}'`).join(' or ')
      const response: { value: CreaOffice[] } = await this.makeCreaRequest(`/odata/v1/Office?$filter=${keyFilter}`)
      return response.value || []
    } catch (error) {
      console.error('Error fetching CREA offices:', error)
      return []
    }
  }

  /**
   * Get property with complete agent and office information
   */
  async getPropertyWithAgentDetails(listingKey: string): Promise<{
    property: CreaProperty | null
    listingAgent: CreaMember | null
    listingOffice: CreaOffice | null
    coListingAgents: CreaMember[]
    coListingOffices: CreaOffice[]
  }> {
    const property = await this.getPropertyById(listingKey)
    
    if (!property) {
      return {
        property: null,
        listingAgent: null,
        listingOffice: null,
        coListingAgents: [],
        coListingOffices: []
      }
    }

    // Collect all agent and office keys
    const agentKeys = [property.ListAgentKey, property.CoListAgentKey, property.CoListAgentKey2, property.CoListAgentKey3].filter((key): key is string => Boolean(key))
    const officeKeys = [property.ListOfficeKey, property.CoListOfficeKey, property.CoListOfficeKey2, property.CoListOfficeKey3].filter((key): key is string => Boolean(key))

    // Fetch all agents and offices in parallel
    const [agents, offices] = await Promise.all([
      this.getMembersByKeys(agentKeys),
      this.getOfficesByKeys(officeKeys)
    ])

    // Map agents and offices by their keys for easy lookup
    const agentMap = new Map(agents.map(agent => [agent.MemberKey, agent]))
    const officeMap = new Map(offices.map(office => [office.OfficeKey, office]))

    return {
      property,
      listingAgent: agentMap.get(property.ListAgentKey) || null,
      listingOffice: officeMap.get(property.ListOfficeKey) || null,
      coListingAgents: [
        property.CoListAgentKey && agentMap.get(property.CoListAgentKey),
        property.CoListAgentKey2 && agentMap.get(property.CoListAgentKey2),
        property.CoListAgentKey3 && agentMap.get(property.CoListAgentKey3)
      ].filter((agent): agent is CreaMember => Boolean(agent)),
      coListingOffices: [
        property.CoListOfficeKey && officeMap.get(property.CoListOfficeKey),
        property.CoListOfficeKey2 && officeMap.get(property.CoListOfficeKey2),
        property.CoListOfficeKey3 && officeMap.get(property.CoListOfficeKey3)
      ].filter((office): office is CreaOffice => Boolean(office))
    }
  }

  /**
   * Map CREA PropertySubType to our system property types with enhanced commercial detection
   */
  private mapPropertyType(subType: string, additionalFields?: {
    businessType?: string | string[]
    structureType?: string | string[]
    currentUse?: string | string[]
    propertyClass?: string
  }): string {
    if (!subType) return 'house'
    
    const type = subType.toLowerCase()
    
    // Helper to flatten arrays or strings into array of strings
    const toStringArray = (val: string | string[] | undefined): string[] => {
      if (!val) return []
      if (Array.isArray(val)) return val
      return [val]
    }
    
    // ENHANCED COMMERCIAL DETECTION - Check all available fields
    const allFields = [
      subType,
      ...toStringArray(additionalFields?.businessType),
      ...toStringArray(additionalFields?.structureType), 
      ...toStringArray(additionalFields?.currentUse),
      additionalFields?.propertyClass
    ].filter((f): f is string => Boolean(f) && typeof f === 'string').map(f => f.toLowerCase())
    
    const commercialIndicators = [
      'office', 'commercial', 'retail', 'industrial', 'warehouse', 'manufacturing',
      'business', 'store', 'shop', 'plaza', 'mall', 'medical', 'professional',
      'mixed use', 'mixed-use', 'agriculture', 'farm', 'investment'
    ]
    
    // If ANY field contains commercial indicators, mark as commercial
    const isCommercial = allFields.some(field => 
      field && typeof field === 'string' && commercialIndicators.some(indicator => field.includes(indicator))
    )
    
    if (isCommercial) {
      console.log(`🏢 Commercial property detected: ${subType} (${allFields.join(', ')})`)
      if (type.includes('industrial') || type.includes('warehouse') || type.includes('manufacturing')) {
        return 'industrial'
      }
      return 'commercial'
    }
    
    // RESIDENTIAL TYPE MAPPING
    if (type.includes('vacant land') || type.includes('land')) return 'land'
    if (type.includes('single family') || type.includes('single-family') || type.includes('detached')) return 'house'
    if (type.includes('condo') || type.includes('apartment') || type.includes('condominium')) return 'condo'
    if (type.includes('townhouse') || type.includes('town') || type.includes('row house')) return 'townhouse'
    if (type.includes('multi-family') || type.includes('duplex') || type.includes('multiplex') || 
        type.includes('fourplex') || type.includes('triplex')) return 'multi-family'
    
    // Special handling for properties with 0 bedrooms - likely commercial
    // This will be checked in the transform function
    
    // Log unknown types for debugging
    console.warn(`⚠️ Unknown PropertySubType: "${subType}" - defaulting to 'house'`)
    
    return 'house' // Default for residential
  }

  /**
   * Transform CREA property to Local Property format
   */
  transformToLocalProperty(creaProp: CreaProperty, agentData?: {
    listingAgent?: CreaMember | null
    listingOffice?: CreaOffice | null
    coListingAgents?: CreaMember[]
    coListingOffices?: CreaOffice[]
  }): Omit<Property, 'id' | 'createdAt' | 'updatedAt'> | null {
    // Extract property type using enhanced commercial detection
    // Handle BusinessType, StructureType, CurrentUse which can be string or array
    const type = this.mapPropertyType(creaProp.PropertySubType || creaProp.PropertyType || '', {
      businessType: creaProp.BusinessType,
      structureType: creaProp.StructureType,
      currentUse: creaProp.CurrentUse,
      propertyClass: creaProp.PropertyClass
    })
    
    // Additional check: Properties with 0 bedrooms and no living area are likely commercial
    const hasNoBedrooms = !creaProp.BedroomsTotal || creaProp.BedroomsTotal === 0
    const hasNoLivingArea = !creaProp.LivingArea || creaProp.LivingArea === 0
    const isLikelyCommercial = hasNoBedrooms && hasNoLivingArea && type === 'house'
    
    if (isLikelyCommercial) {
      console.log(`🏢 Commercial property detected by bedroom/area analysis: ${creaProp.PropertySubType}`)
      return null // Return null to indicate this should be filtered out
    }

    let status = 'for_sale'
    const creaStatus = creaProp.StandardStatus?.toLowerCase() || ''
    if (creaStatus.includes('active') || creaStatus === 'a - active') {
      status = 'for_sale'
    } else if (creaStatus.includes('sold') || creaStatus.includes('closed')) {
      status = 'sold'
    } else if (creaStatus.includes('terminated') || creaStatus.includes('cancel')) {
      status = 'terminated'
    } else if (creaStatus.includes('withdrawn')) {
      status = 'withdrawn'
    } else if (creaStatus.includes('expired')) {
      status = 'expired'
    }

    // Extract images and sort by order (Media is included by default in CREA DDF OData API)
    const images = creaProp.Media
      ?.filter(media => media.MediaURL)
      .sort((a, b) => a.Order - b.Order)
      .map(media => media.MediaURL) || []
    
    // Log image count
    console.log(`📸 Property ${creaProp.ListingKey}: ${images.length} images`)

    const normalizeDate = (value?: string | null) => {
      if (!value) return null
      // Remove surrounding quotes (handles multiple layers and escaped quotes)
      let trimmed = value.replace(/^["'\\]+|["'\\]+$/g, '')
      // Also handle cases like \"date\" where backslash-quote is used
      trimmed = trimmed.replace(/\\"/g, '').replace(/\\'/g, '')
      const date = new Date(trimmed)
      if (isNaN(date.getTime())) {
        return null
      }
      return date.toISOString()
    }

    const normalizedStatusDate = normalizeDate(creaProp.StatusChangeTimestamp)


    // Helper to normalize array fields (CREA sometimes returns string or array)
    const toArray = (val: string | string[] | undefined | null): string[] => {
      if (!val) return []
      if (Array.isArray(val)) return val
      return [val]
    }

    // Build comprehensive features object with ALL CREA fields
    const features = {
      // ===== TIMESTAMPS (Critical for CMA) =====
      statusChangeTimestamp: normalizedStatusDate,
      originalEntryTimestamp: normalizeDate(creaProp.OriginalEntryTimestamp),
      modificationTimestamp: normalizeDate(creaProp.ModificationTimestamp),
      availabilityDate: normalizeDate(creaProp.AvailabilityDate),
      photosChangeTimestamp: normalizeDate(creaProp.PhotosChangeTimestamp),
      
      // ===== LISTING DETAILS =====
      listingUrl: creaProp.ListingURL,
      listingId: creaProp.ListingId,
      originatingSystemName: creaProp.OriginatingSystemName,
      inclusions: creaProp.Inclusions,
      documentsAvailable: creaProp.DocumentsAvailable || [],
      internetEntireListingDisplayYN: creaProp.InternetEntireListingDisplayYN,
      internetAddressDisplayYN: creaProp.InternetAddressDisplayYN,
      photosCount: creaProp.PhotosCount,
      commonInterest: creaProp.CommonInterest,
      listAOR: creaProp.ListAOR,
      
      // ===== PROPERTY CLASSIFICATION =====
      propertySubType: creaProp.PropertySubType,
      propertyType: creaProp.PropertyType,
      businessType: toArray(creaProp.BusinessType),
      structureType: toArray(creaProp.StructureType),
      propertyClass: creaProp.PropertyClass,
      propertyUse: creaProp.PropertyUse,
      currentUse: toArray(creaProp.CurrentUse),
      possibleUse: toArray(creaProp.PossibleUse),
      
      // ===== PRICING & LEASE =====
      leaseAmount: creaProp.LeaseAmount,
      leaseAmountFrequency: creaProp.LeaseAmountFrequency,
      leasePerUnit: creaProp.LeasePerUnit,
      pricePerUnit: creaProp.PricePerUnit,
      totalActualRent: creaProp.TotalActualRent,
      existingLeaseType: toArray(creaProp.ExistingLeaseType),
      
      // ===== ASSOCIATION/HOA =====
      associationFee: creaProp.AssociationFee,
      associationFeeFrequency: creaProp.AssociationFeeFrequency,
      associationName: creaProp.AssociationName,
      associationFeeIncludes: creaProp.AssociationFeeIncludes || [],
      
      // ===== CLIMATE CONTROL =====
      heating: creaProp.Heating || [],
      cooling: creaProp.Cooling || [],
      
      // ===== INTERIOR FEATURES =====
      appliances: creaProp.Appliances || [],
      flooring: creaProp.Flooring || [],
      interior: creaProp.InteriorFeatures || [],
      security: creaProp.SecurityFeatures || [],
      otherEquipment: creaProp.OtherEquipment || [],
      accessibilityFeatures: creaProp.AccessibilityFeatures || [],
      
      // ===== FIREPLACE =====
      fireplacesTotal: creaProp.FireplacesTotal,
      fireplaceYN: creaProp.FireplaceYN,
      fireplaceFeatures: creaProp.FireplaceFeatures || [],
      
      // ===== EXTERIOR & BUILDING =====
      exterior: creaProp.ExteriorFeatures || [],
      building: creaProp.BuildingFeatures || [],
      fencing: creaProp.Fencing || [],
      poolFeatures: creaProp.PoolFeatures || [],
      
      // ===== PARKING =====
      parking: creaProp.ParkingTotal,
      parkingFeatures: creaProp.ParkingFeatures || [],
      
      // ===== LOT & LAND =====
      lot: creaProp.LotFeatures || [],
      lotSizeArea: creaProp.LotSizeArea,
      lotSizeDimensions: creaProp.LotSizeDimensions,
      lotSizeUnits: creaProp.LotSizeUnits,
      roadSurfaceType: creaProp.RoadSurfaceType || [],
      frontageLengthNumeric: creaProp.FrontageLengthNumeric,
      frontageLengthNumericUnits: creaProp.FrontageLengthNumericUnits,
      
      // ===== BUILDING CHARACTERISTICS =====
      yearBuilt: creaProp.YearBuilt,
      stories: creaProp.Stories,
      numberOfBuildings: creaProp.NumberOfBuildings,
      numberOfUnitsTotal: creaProp.NumberOfUnitsTotal,
      propertyAttachedYN: creaProp.PropertyAttachedYN,
      architecturalStyle: creaProp.ArchitecturalStyle || [],
      constructionMaterials: creaProp.ConstructionMaterials || [],
      foundationDetails: creaProp.FoundationDetails || [],
      roof: creaProp.Roof || [],
      propertyCondition: creaProp.PropertyCondition || [],
      basement: creaProp.Basement || [],
      
      // ===== ROOM DETAILS =====
      bedroomsAboveGrade: creaProp.BedroomsAboveGrade,
      bedroomsBelowGrade: creaProp.BedroomsBelowGrade,
      bathroomsPartial: creaProp.BathroomsPartial,
      rooms: creaProp.Rooms || [],
      
      // ===== DETAILED MEASUREMENTS =====
      buildingAreaTotal: creaProp.BuildingAreaTotal,
      buildingAreaUnits: creaProp.BuildingAreaUnits,
      livingAreaUnits: creaProp.LivingAreaUnits,
      livingAreaSource: creaProp.LivingAreaSource,
      livingAreaMinimum: creaProp.LivingAreaMinimum,
      livingAreaMaximum: creaProp.LivingAreaMaximum,
      aboveGradeFinishedArea: creaProp.AboveGradeFinishedArea,
      aboveGradeFinishedAreaUnits: creaProp.AboveGradeFinishedAreaUnits,
      aboveGradeFinishedAreaSource: creaProp.AboveGradeFinishedAreaSource,
      aboveGradeFinishedAreaMinimum: creaProp.AboveGradeFinishedAreaMinimum,
      aboveGradeFinishedAreaMaximum: creaProp.AboveGradeFinishedAreaMaximum,
      belowGradeFinishedArea: creaProp.BelowGradeFinishedArea,
      belowGradeFinishedAreaUnits: creaProp.BelowGradeFinishedAreaUnits,
      belowGradeFinishedAreaSource: creaProp.BelowGradeFinishedAreaSource,
      belowGradeFinishedAreaMinimum: creaProp.BelowGradeFinishedAreaMinimum,
      belowGradeFinishedAreaMaximum: creaProp.BelowGradeFinishedAreaMaximum,
      
      // ===== UTILITIES =====
      utilities: creaProp.Utilities || [],
      waterSource: creaProp.WaterSource || [],
      sewer: creaProp.Sewer || [],
      electric: creaProp.Electric || [],
      irrigationSource: creaProp.IrrigationSource || [],
      
      // ===== VIEWS & WATER =====
      view: creaProp.View || [],
      waterfrontFeatures: creaProp.WaterfrontFeatures || [],
      waterBodyName: creaProp.WaterBodyName,
      
      // ===== LOCATION FEATURES =====
      cityRegion: creaProp.CityRegion,
      directions: creaProp.Directions,
      subdivisionName: creaProp.SubdivisionName,
      communityFeatures: creaProp.CommunityFeatures || [],
      anchorsCoTenants: creaProp.AnchorsCoTenants,
      mapCoordinateVerifiedYN: creaProp.MapCoordinateVerifiedYN,
      geocodeManualYN: creaProp.GeocodeManualYN,
      
      // ===== LEGAL & TAX =====
      zoning: creaProp.Zoning,
      zoningDescription: creaProp.ZoningDescription,
      taxAnnualAmount: creaProp.TaxAnnualAmount,
      taxYear: creaProp.TaxYear,
      taxBlock: creaProp.TaxBlock,
      taxLot: creaProp.TaxLot,
      parcelNumber: creaProp.ParcelNumber,
      
      // ===== ADDRESS COMPONENTS =====
      streetDirPrefix: creaProp.StreetDirPrefix,
      streetDirSuffix: creaProp.StreetDirSuffix,
      streetName: creaProp.StreetName,
      streetNumber: creaProp.StreetNumber,
      streetSuffix: creaProp.StreetSuffix,
      unitNumber: creaProp.UnitNumber,
      country: creaProp.Country,
    }

    return {
      title: `${creaProp.UnparsedAddress}, ${creaProp.City}`,
      description: creaProp.PublicRemarks || `${creaProp.PropertySubType} in ${creaProp.City}`,
      price: creaProp.ListPrice || 0,
      beds: creaProp.BedroomsTotal || 0,
      baths: creaProp.BathroomsTotalInteger || 0,
      sqft: creaProp.LivingArea || 0,
      type,
      status,
      address: creaProp.UnparsedAddress,
      city: creaProp.City,
      province: creaProp.StateOrProvince,
      postalCode: creaProp.PostalCode || '',
      latitude: creaProp.Latitude,
      longitude: creaProp.Longitude,
      features,
      images,
      views: 0,
      userId: null as any, // CREA properties are not owned by any user
      source: 'crea' as const,
      externalId: creaProp.ListingKey,
      mlsNumber: creaProp.ListingId,
      
      // Enhanced Residential Fields (now in schema)
      lotSizeArea: creaProp.LotSizeArea,
      lotSizeDimensions: creaProp.LotSizeDimensions,
      lotSizeUnits: creaProp.LotSizeUnits,
      stories: creaProp.Stories,
      yearBuilt: creaProp.YearBuilt,
      propertyCondition: creaProp.PropertyCondition?.[0] || null, // Take first condition
      cityRegion: creaProp.CityRegion,
      waterBodyName: creaProp.WaterBodyName,
      zoning: creaProp.Zoning,
      zoningDescription: creaProp.ZoningDescription,
      taxAnnualAmount: creaProp.TaxAnnualAmount,
      taxYear: creaProp.TaxYear,
      parcelNumber: creaProp.ParcelNumber,
      streetName: creaProp.StreetName,
      streetNumber: creaProp.StreetNumber,
      unitNumber: creaProp.UnitNumber,
      
      // Days on Market calculation from OriginalEntryTimestamp
      originalEntryTimestamp: creaProp.OriginalEntryTimestamp 
        ? new Date(creaProp.OriginalEntryTimestamp) 
        : null,
      daysOnMarket: creaProp.OriginalEntryTimestamp 
        ? Math.floor((Date.now() - new Date(creaProp.OriginalEntryTimestamp).getTime()) / (1000 * 60 * 60 * 24))
        : null,
      
      // Store raw agent and office data for detailed display
      listingAgentData: agentData?.listingAgent ? {
        memberKey: agentData.listingAgent.MemberKey,
        mlsId: agentData.listingAgent.MemberMlsId,
        fullName: agentData.listingAgent.MemberFullName,
        firstName: agentData.listingAgent.MemberFirstName,
        lastName: agentData.listingAgent.MemberLastName,
        email: agentData.listingAgent.MemberEmail,
        directPhone: agentData.listingAgent.MemberDirectPhone,
        mobilePhone: agentData.listingAgent.MemberMobilePhone,
        officePhone: agentData.listingAgent.MemberOfficePhone,
        license: agentData.listingAgent.MemberStateLicense,
        designations: agentData.listingAgent.MemberDesignation,
        photoURL: agentData.listingAgent.MemberPhotoURL
      } : null,
      
      listingOfficeData: agentData?.listingOffice ? {
        officeKey: agentData.listingOffice.OfficeKey,
        officeId: agentData.listingOffice.OfficeId,
        name: agentData.listingOffice.OfficeName,
        phone: agentData.listingOffice.OfficePhone,
        email: agentData.listingOffice.OfficeEmail,
        address: [
          agentData.listingOffice.OfficeAddress1,
          agentData.listingOffice.OfficeAddress2
        ].filter(Boolean).join(', '),
        city: agentData.listingOffice.OfficeCity,
        province: agentData.listingOffice.OfficeStateOrProvince,
        postalCode: agentData.listingOffice.OfficePostalCode,
        country: agentData.listingOffice.OfficeCountry,
        website: agentData.listingOffice.OfficeWebsiteURL
      } : null,
      
      coListingAgentsData: agentData?.coListingAgents?.map(agent => ({
        memberKey: agent.MemberKey,
        mlsId: agent.MemberMlsId,
        fullName: agent.MemberFullName,
        firstName: agent.MemberFirstName,
        lastName: agent.MemberLastName,
        email: agent.MemberEmail,
        directPhone: agent.MemberDirectPhone,
        mobilePhone: agent.MemberMobilePhone,
        officePhone: agent.MemberOfficePhone,
        license: agent.MemberStateLicense,
        designations: agent.MemberDesignation,
        photoURL: agent.MemberPhotoURL
      })) || [],
      
      coListingOfficesData: agentData?.coListingOffices?.map(office => ({
        officeKey: office.OfficeKey,
        officeId: office.OfficeId,
        name: office.OfficeName,
        phone: office.OfficePhone,
        email: office.OfficeEmail,
        address: [office.OfficeAddress1, office.OfficeAddress2].filter(Boolean).join(', '),
        city: office.OfficeCity,
        province: office.OfficeStateOrProvince,
        postalCode: office.OfficePostalCode,
        country: office.OfficeCountry,
        website: office.OfficeWebsiteURL
      })) || [],
    }
  }
}

export const creaService = new CreaService()
