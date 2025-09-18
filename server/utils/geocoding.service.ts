import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface OpenCageResponse {
  results: Array<{
    formatted: string
    components: {
      neighbourhood?: string
      suburb?: string
      town?: string
      city?: string
      county?: string
      state_district?: string
      state?: string
      province?: string
      country?: string
      road?: string
      village?: string
      hamlet?: string
      city_district?: string
      quarter?: string
    }
    confidence: number
    geometry: {
      lat: number
      lng: number
    }
    bounds?: {
      northeast: { lat: number, lng: number }
      southwest: { lat: number, lng: number }
    }
  }>
  status: {
    code: number
    message: string
  }
  total_results: number
}

class GeocodingService {
  private apiKey: string
  private baseUrl = 'https://api.opencagedata.com/geocode/v1/json'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * Reverse geocode coordinates to get neighborhood information
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<OpenCageResponse> {
    if (!this.apiKey) {
      throw new Error('OpenCage API key not configured')
    }

    const url = `${this.baseUrl}?q=${latitude}+${longitude}&key=${this.apiKey}&limit=1&no_annotations=1&language=en`
    
    try {
      console.log(`🔍 Geocoding ${latitude}, ${longitude}`)
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`OpenCage API error: ${response.status} ${response.statusText}`)
      }

      const data: OpenCageResponse = await response.json()
      
      if (data.status.code !== 200) {
        throw new Error(`OpenCage API error: ${data.status.message}`)
      }

      return data
    } catch (error) {
      console.error('🚨 Geocoding failed:', error)
      throw error
    }
  }

  /**
   * Extract neighborhood name from OpenCage response
   */
  extractNeighborhood(result: OpenCageResponse['results'][0]): {
    name: string
    city: string
    province: string
    country: string
    confidence: number
    components: any
    formattedAddress: string
  } {
    const components = result.components
    
    // Prioritize neighborhood extraction in order of specificity
    const neighborhoodName = 
      components.neighbourhood ||
      components.suburb ||
      components.city_district ||
      components.quarter ||
      components.village ||
      components.hamlet ||
      components.town ||
      components.city ||
      'Unknown'

    const city = 
      components.city ||
      components.town ||
      components.village ||
      components.hamlet ||
      components.county ||
      'Unknown'

    const province = 
      components.province ||
      components.state ||
      components.state_district ||
      'Unknown'

    const country = components.country || 'Canada'

    return {
      name: neighborhoodName,
      city,
      province,
      country,
      confidence: result.confidence,
      components: result.components,
      formattedAddress: result.formatted
    }
  }

  /**
   * Find or create neighborhood in database
   */
  async findOrCreateNeighborhood(neighborhoodData: {
    name: string
    city: string
    province: string
    country: string
    confidence: number
    components: any
    formattedAddress: string
    centerLatitude?: number
    centerLongitude?: number
  }) {
    // First try to find existing neighborhood
    let neighborhood = await prisma.neighborhood.findFirst({
      where: {
        name: neighborhoodData.name,
        city: neighborhoodData.city,
        province: neighborhoodData.province
      }
    })

    if (!neighborhood) {
      // Create new neighborhood
      neighborhood = await prisma.neighborhood.create({
        data: {
          name: neighborhoodData.name,
          city: neighborhoodData.city,
          province: neighborhoodData.province,
          country: neighborhoodData.country,
          centerLatitude: neighborhoodData.centerLatitude,
          centerLongitude: neighborhoodData.centerLongitude,
          formattedAddress: neighborhoodData.formattedAddress,
          confidence: neighborhoodData.confidence,
          components: neighborhoodData.components,
          propertyCount: 0
        }
      })
      
      console.log(`✅ Created new neighborhood: ${neighborhood.name}, ${neighborhood.city}`)
    }

    return neighborhood
  }

  /**
   * Link property to neighborhood
   */
  async linkPropertyToNeighborhood(propertyId: number, neighborhoodId: number, confidence: number) {
    // Check if link already exists
    const existingLink = await prisma.propertyNeighborhood.findUnique({
      where: { propertyId }
    })

    if (existingLink) {
      // Update existing link
      await prisma.propertyNeighborhood.update({
        where: { propertyId },
        data: {
          neighborhoodId,
          confidence,
          lastLookup: new Date()
        }
      })
      console.log(`🔄 Updated neighborhood link for property ${propertyId}`)
    } else {
      // Create new link
      await prisma.propertyNeighborhood.create({
        data: {
          propertyId,
          neighborhoodId,
          confidence,
          lastLookup: new Date()
        }
      })
      console.log(`🔗 Linked property ${propertyId} to neighborhood ${neighborhoodId}`)
    }

    // Update neighborhood property count
    await this.updateNeighborhoodStats(neighborhoodId)
  }

  /**
   * Update neighborhood statistics
   */
  async updateNeighborhoodStats(neighborhoodId: number) {
    const stats = await prisma.propertyNeighborhood.findMany({
      where: { neighborhoodId },
      include: { property: true }
    })

    const propertyCount = stats.length
    const averagePrice = stats.length > 0 
      ? stats.reduce((sum, pn) => sum + pn.property.price, 0) / stats.length 
      : null

    await prisma.neighborhood.update({
      where: { id: neighborhoodId },
      data: {
        propertyCount,
        averagePrice
      }
    })
  }

  /**
   * Process a single property for neighborhood lookup
   */
  async processPropertyNeighborhood(propertyId: number, latitude: number, longitude: number) {
    try {
      // Skip if property already has neighborhood (unless forced refresh)
      const existingLink = await prisma.propertyNeighborhood.findUnique({
        where: { propertyId }
      })

      if (existingLink) {
        console.log(`⏭️ Property ${propertyId} already has neighborhood, skipping`)
        return existingLink
      }

      // Geocode the coordinates
      const geocodeResult = await this.reverseGeocode(latitude, longitude)
      
      if (geocodeResult.results.length === 0) {
        console.warn(`⚠️ No geocoding results for property ${propertyId}`)
        return null
      }

      const result = geocodeResult.results[0]
      const neighborhoodData = this.extractNeighborhood(result)

      // Find or create neighborhood
      const neighborhood = await this.findOrCreateNeighborhood({
        ...neighborhoodData,
        centerLatitude: latitude,
        centerLongitude: longitude
      })

      // Link property to neighborhood
      await this.linkPropertyToNeighborhood(propertyId, neighborhood.id, neighborhoodData.confidence)

      return {
        propertyId,
        neighborhoodId: neighborhood.id,
        neighborhoodName: neighborhood.name,
        city: neighborhood.city,
        province: neighborhood.province,
        confidence: neighborhoodData.confidence
      }

    } catch (error) {
      console.error(`❌ Failed to process neighborhood for property ${propertyId}:`, error)
      return null
    }
  }

  /**
   * Get neighborhood statistics
   */
  async getNeighborhoodStats() {
    const stats = await prisma.neighborhood.findMany({
      include: {
        _count: {
          select: { properties: true }
        }
      },
      orderBy: [
        { propertyCount: 'desc' },
        { name: 'asc' }
      ]
    })

    return stats.map(neighborhood => ({
      id: neighborhood.id,
      name: neighborhood.name,
      city: neighborhood.city,
      province: neighborhood.province,
      propertyCount: neighborhood.propertyCount,
      averagePrice: neighborhood.averagePrice,
      confidence: neighborhood.confidence
    }))
  }
}

export { GeocodingService }
export default GeocodingService
