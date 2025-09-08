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
  ListAgentKey: string
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
}

interface CreaApiResponse {
  value: CreaProperty[]
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

    // Add OData query parameters
    if (filters.city) {
      params.append('$filter', `City eq '${filters.city}'`)
    }
    if (filters.minPrice || filters.maxPrice) {
      let priceFilter = ''
      if (filters.minPrice) priceFilter += `ListPrice ge ${filters.minPrice}`
      if (filters.maxPrice) {
        if (priceFilter) priceFilter += ' and '
        priceFilter += `ListPrice le ${filters.maxPrice}`
      }
      if (priceFilter) {
        const existingFilter = params.get('$filter')
        params.set('$filter', existingFilter ? `${existingFilter} and ${priceFilter}` : priceFilter)
      }
    }
    if (filters.beds) {
      const existingFilter = params.get('$filter')
      const bedsFilter = `BedroomsTotal ge ${filters.beds}`
      params.set('$filter', existingFilter ? `${existingFilter} and ${bedsFilter}` : bedsFilter)
    }

    params.append('$top', '100') // Limit to 100 results per request
    
    const queryString = params.toString()
    const endpoint = `/odata/v1/Property${queryString ? `?${queryString}` : ''}`

    const response: CreaApiResponse = await this.makeCreaRequest(endpoint)
    return response.value
  }

  async getPropertyById(listingKey: string): Promise<CreaProperty | null> {
    try {
      const property: CreaProperty = await this.makeCreaRequest(`/odata/v1/Property/${listingKey}`)
      return property
    } catch (error) {
      console.error('Error fetching CREA property:', error)
      return null
    }
  }

  /**
   * Transform CREA property to Suhani Property format
   */
  transformToSuhaniProperty(creaProp: CreaProperty, systemUserId: number): Omit<Property, 'id' | 'createdAt' | 'updatedAt'> {
    // Extract property type from PropertySubType
    let type = 'house' // default
    const subType = creaProp.PropertySubType?.toLowerCase() || ''
    if (subType.includes('condo') || subType.includes('apartment')) {
      type = 'condo'
    } else if (subType.includes('townhouse') || subType.includes('town')) {
      type = 'townhouse'
    }

    // Extract status
    let status = 'for_sale' // default
    if (creaProp.StandardStatus?.toLowerCase() === 'active') {
      status = 'for_sale'
    } else if (creaProp.StandardStatus?.toLowerCase() === 'sold') {
      status = 'sold'
    }

    // Extract images and sort by order
    const images = creaProp.Media
      ?.filter(media => media.MediaURL)
      .sort((a, b) => a.Order - b.Order)
      .map(media => media.MediaURL) || []

    // Build features object
    const features = {
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
      postalCode: creaProp.PostalCode,
      latitude: creaProp.Latitude,
      longitude: creaProp.Longitude,
      features,
      images,
      views: 0,
      userId: systemUserId,
      source: 'crea' as const,
      externalId: creaProp.ListingKey,
      mlsNumber: creaProp.ListingId,
      lastSyncAt: new Date(),
      // User/Agent info
      user: {
        id: systemUserId,
        firstName: 'MLS',
        lastName: 'Listing',
        email: 'mls@suhani.com',
        phone: null,
      },
      agent: {
        id: systemUserId,
        firstName: 'MLS',
        lastName: 'Listing',
        email: 'mls@suhani.com',
        phone: null,
        name: 'MLS Listing',
        agency: 'CREA DDF',
        role: 'agent',
      },
    }
  }
}

export const creaService = new CreaService()
