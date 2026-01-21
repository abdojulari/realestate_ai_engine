import type { Property } from '~/types'

interface CreaTokenResponse {
  access_token: string
  expires_in: number
  token_type: string
  scope: string
}

interface CreaProperty {
  ListingKey: string
  ListingId: string
  PropertySubType: string
  PropertyType?: string
  BusinessType?: string
  StructureType?: string
  PropertyClass?: string
  PropertyUse?: string
  CurrentUse?: string
  PossibleUse?: string
  ExistingLeaseType?: string
  ListPrice: number | null
  BedroomsTotal: number | null
  BathroomsTotalInteger: number | null
  LivingArea: number | null
  LivingAreaUnits: string | null
  StandardStatus: string
  UnparsedAddress: string
  City: string
  StateOrProvince: string
  PostalCode: string
  Latitude: number
  Longitude: number
  PublicRemarks: string
  Media: Array<{
    MediaURL: string
    PreferredPhotoYN: boolean
    Order: number
  }>
  ModificationTimestamp: string
  OriginalEntryTimestamp: string
  ListingURL: string
  
  // Agent and Office Relationships
  ListAgentKey: string
  ListOfficeKey: string
  CoListAgentKey?: string
  CoListAgentKey2?: string
  CoListAgentKey3?: string
  CoListOfficeKey?: string
  CoListOfficeKey2?: string
  CoListOfficeKey3?: string
  
  YearBuilt: number | null
  ParkingTotal: number | null
  Heating: string[]
  Cooling: string[]
  Appliances: string[]
  SecurityFeatures: string[]
  BuildingFeatures: string[]
  ExteriorFeatures: string[]
  InteriorFeatures: string[]
  LotFeatures: string[]
  
  // Residential-specific fields from CREA
  view?: string[]
  lotSizeArea?: number | null
  lotSizeDimensions?: string | null
  LotSizeUnits?: string | null
  poolFeatures?: string[]
  waterfrontFeatures?: string[]
  frontageLengthNumeric?: number | null
  FrontageLengthNumericUnits?: string | null
  fencing?: string[]
  buildingAreaTotal?: number | null
  BuildingAreaUnits?: string | null
  aboveGradeFinishedArea?: number | null
  AboveGradeFinishedAreaUnits?: string | null
  AboveGradeFinishedAreaSource?: string | null
  belowGradeFinishedArea?: number | null
  BelowGradeFinishedAreaUnits?: string | null
  BelowGradeFinishedAreaSource?: string | null
  fireplacesTotal?: number | null
  fireplaceYN?: boolean | null
  fireplaceFeatures?: string[]
  architecturalStyle?: string[]
  foundationDetails?: string[]
  basement?: string[]
  propertyCondition?: string[]
  roof?: string[]
  constructionMaterials?: string[]
  stories?: number | null
  propertyAttachedYN?: boolean | null
  accessibilityFeatures?: string[]
  bedroomsAboveGrade?: number | null
  bedroomsBelowGrade?: number | null
  cityRegion?: string | null
  directions?: string | null
  roadSurfaceType?: string[]
  utilities?: string[]
  waterSource?: string[]
  sewer?: string[]
  electric?: string[]
  irrigationSource?: string[]
  zoning?: string | null
  zoningDescription?: string | null
  taxAnnualAmount?: number | null
  taxYear?: number | null
  parcelNumber?: string | null
  StreetDirPrefix?: string | null
  StreetDirSuffix?: string | null
  streetName?: string | null
  streetNumber?: string | null
  StreetSuffix?: string | null
  unitNumber?: string | null
  Country?: string | null
  waterBodyName?: string | null
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
      throw new Error(`CREA API request failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async getProperties(filters: any = {}): Promise<CreaProperty[]> {
    const params = new URLSearchParams()

    // Build filter conditions array
    const filterConditions: string[] = []

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

    // For non-province specific queries, add residential-only filters
    // But keep them simple to avoid 400 errors
    if (!filters.province) {
      // Only add the most essential commercial exclusions
      filterConditions.push("PropertySubType ne 'Office'")
      filterConditions.push("PropertySubType ne 'Commercial'")
      filterConditions.push("PropertySubType ne 'Industrial'")
    }

    // Handle direct $filter parameter (for backward compatibility)
    if (filters.$filter && !filters.province) {
      filterConditions.push(filters.$filter)
    }

    // Build OData query string manually to avoid URL encoding of $ characters
    const queryParts: string[] = []
    
    // Combine all filter conditions
    if (filterConditions.length > 0) {
      queryParts.push(`$filter=${encodeURIComponent(filterConditions.join(' and '))}`)
    }

    // Handle $top parameter
    const topLimit = filters.$top || 100
    queryParts.push(`$top=${topLimit}`)
    
    const queryString = queryParts.join('&')
    const endpoint = `/odata/v1/Property${queryString ? `?${queryString}` : ''}`

    console.log('CREA API Query:', endpoint)
    const response: CreaApiResponse = await this.makeCreaRequest(endpoint)
    
    console.log(`CREA returned ${response.value?.length || 0} properties`)
    return (response.value as CreaProperty[]) || []
  }

  // Get total count of properties from CREA
  async getPropertiesCount(filters: any = {}): Promise<number> {
    const filterConditions: string[] = []

    if (filters.province) {
      filterConditions.push(`StateOrProvince eq '${filters.province}'`)
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
      const property: CreaProperty = await this.makeCreaRequest(`/odata/v1/Property/${listingKey}?$expand=Media`)
      return property
    } catch (error) {
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
    businessType?: string
    structureType?: string
    currentUse?: string
    propertyClass?: string
  }): string {
    if (!subType) return 'house'
    
    const type = subType.toLowerCase()
    
    // ENHANCED COMMERCIAL DETECTION - Check all available fields
    const allFields = [
      subType,
      additionalFields?.businessType,
      additionalFields?.structureType, 
      additionalFields?.currentUse,
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

    // Extract status
    let status = 'for_sale' // default
    if (creaProp.StandardStatus?.toLowerCase() === 'active') {
      status = 'for_sale'
    } else if (creaProp.StandardStatus?.toLowerCase() === 'sold') {
      status = 'sold'
    }

    // Extract images and sort by order (Media is included by default in CREA DDF OData API)
    const images = creaProp.Media
      ?.filter(media => media.MediaURL)
      .sort((a, b) => a.Order - b.Order)
      .map(media => media.MediaURL) || []
    
    // Log image count
    console.log(`📸 Property ${creaProp.ListingKey}: ${images.length} images`)

    // Build features object
    const features = {
      // Existing features
      heating: creaProp.Heating || [],
      cooling: creaProp.Cooling || [],
      appliances: creaProp.Appliances || [],
      security: creaProp.SecurityFeatures || [],
      building: creaProp.BuildingFeatures || [],
      exterior: creaProp.ExteriorFeatures || [],
      interior: creaProp.InteriorFeatures || [],
      lot: creaProp.LotFeatures || [],
      yearBuilt: creaProp.YearBuilt,
      parking: creaProp.ParkingTotal,
      listingUrl: creaProp.ListingURL,
      
      // Lot & Land Details (Priority 1)
      lotSizeArea: creaProp.lotSizeArea,
      lotSizeDimensions: creaProp.lotSizeDimensions,
      lotSizeUnits: creaProp.LotSizeUnits,
      roadSurfaceType: creaProp.roadSurfaceType || [],
      
      // Building Characteristics (Priority 2)
      stories: creaProp.stories,
      architecturalStyle: creaProp.architecturalStyle || [],
      propertyCondition: creaProp.propertyCondition || [],
      basement: creaProp.basement || [],
      foundationDetails: creaProp.foundationDetails || [],
      fireplacesTotal: creaProp.fireplacesTotal,
      fireplaceYN: creaProp.fireplaceYN,
      fireplaceFeatures: creaProp.fireplaceFeatures || [],
      roof: creaProp.roof || [],
      constructionMaterials: creaProp.constructionMaterials || [],
      propertyAttachedYN: creaProp.propertyAttachedYN,
      
      // Utilities & Infrastructure (Priority 3)
      utilities: creaProp.utilities || [],
      waterSource: creaProp.waterSource || [],
      sewer: creaProp.sewer || [],
      electric: creaProp.electric || [],
      irrigationSource: creaProp.irrigationSource || [],
      
      // Enhanced Location Features (Priority 4)
      view: creaProp.view || [],
      waterfrontFeatures: creaProp.waterfrontFeatures || [],
      waterBodyName: creaProp.waterBodyName,
      cityRegion: creaProp.cityRegion,
      directions: creaProp.directions,
      
      // Detailed Measurements (Priority 5)
      buildingAreaTotal: creaProp.buildingAreaTotal,
      buildingAreaUnits: creaProp.BuildingAreaUnits,
      aboveGradeFinishedArea: creaProp.aboveGradeFinishedArea,
      aboveGradeFinishedAreaUnits: creaProp.AboveGradeFinishedAreaUnits,
      aboveGradeFinishedAreaSource: creaProp.AboveGradeFinishedAreaSource,
      belowGradeFinishedArea: creaProp.belowGradeFinishedArea,
      belowGradeFinishedAreaUnits: creaProp.BelowGradeFinishedAreaUnits,
      belowGradeFinishedAreaSource: creaProp.BelowGradeFinishedAreaSource,
      livingAreaUnits: creaProp.LivingAreaUnits,
      
      // Additional Features
      poolFeatures: creaProp.poolFeatures || [],
      fencing: creaProp.fencing || [],
      frontageLengthNumeric: creaProp.frontageLengthNumeric,
      frontageLengthNumericUnits: creaProp.FrontageLengthNumericUnits,
      accessibilityFeatures: creaProp.accessibilityFeatures || [],
      bedroomsAboveGrade: creaProp.bedroomsAboveGrade,
      bedroomsBelowGrade: creaProp.bedroomsBelowGrade,
      
      // Legal/Property Information
      zoning: creaProp.zoning,
      zoningDescription: creaProp.zoningDescription,
      taxAnnualAmount: creaProp.taxAnnualAmount,
      taxYear: creaProp.taxYear,
      parcelNumber: creaProp.parcelNumber,
      
      // Enhanced Address Components
      streetDirPrefix: creaProp.StreetDirPrefix,
      streetDirSuffix: creaProp.StreetDirSuffix,
      streetName: creaProp.streetName,
      streetNumber: creaProp.streetNumber,
      streetSuffix: creaProp.StreetSuffix,
      unitNumber: creaProp.unitNumber,
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
      lotSizeArea: creaProp.lotSizeArea,
      lotSizeDimensions: creaProp.lotSizeDimensions,
      lotSizeUnits: creaProp.LotSizeUnits,
      stories: creaProp.stories,
      yearBuilt: creaProp.YearBuilt,
      propertyCondition: creaProp.propertyCondition?.[0] || null, // Take first condition
      cityRegion: creaProp.cityRegion,
      waterBodyName: creaProp.waterBodyName,
      zoning: creaProp.zoning,
      zoningDescription: creaProp.zoningDescription,
      taxAnnualAmount: creaProp.taxAnnualAmount,
      taxYear: creaProp.taxYear,
      parcelNumber: creaProp.parcelNumber,
      streetName: creaProp.streetName,
      streetNumber: creaProp.streetNumber,
      unitNumber: creaProp.unitNumber,
      
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
