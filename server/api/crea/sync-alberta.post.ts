import { defineEventHandler, readBody, createError } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Enhanced CREA data transformer for Alberta properties
function getValidNumber(value: any, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function resolvePrice(creaProperty: any): number {
  // Prefer ListPrice, then CurrentPrice, then OriginalListPrice
  const candidates = [
    creaProperty.ListPrice,
    creaProperty.CurrentPrice,
    creaProperty.OriginalListPrice
  ]
  
  console.log(`🔍 Resolving price for ${creaProperty.ListingKey}:`, {
    ListPrice: creaProperty.ListPrice,
    CurrentPrice: creaProperty.CurrentPrice,
    OriginalListPrice: creaProperty.OriginalListPrice
  })
  
  for (const v of candidates) {
    const p = getValidNumber(v)
    if (p > 0) {
      console.log(`✅ Found valid price: ${p}`)
      return p
    }
  }
  
  console.warn(`⚠️ No valid price found for ${creaProperty.ListingKey}, returning 0`)
  return 0
}

function transformCreaaProperty(creaProperty: any, systemUserId: number) {
  // Enhanced field mapping with fallbacks
  const resolvedPrice = resolvePrice(creaProperty)

  const property = {
    title: creaProperty.UnparsedAddress || `${creaProperty.City} Property`,
    description: creaProperty.PublicRemarks || 
                `${creaProperty.PropertySubType || 'Property'} in ${creaProperty.City}, Alberta. ${creaProperty.BedroomsTotal || 0} bedrooms, ${creaProperty.BathroomsTotalInteger || 0} bathrooms.`,
    
    // Price mapping with robust fallbacks
    price: resolvedPrice,
    
    // Room counts
    beds: creaProperty.BedroomsTotal || 0,
    baths: creaProperty.BathroomsTotalInteger || creaProperty.BathroomsTotal || 0,
    sqft: creaProperty.LivingArea || creaProperty.BuildingAreaTotal || creaProperty.AboveGradeFinishedArea || 0,
    
    // Property type mapping
    type: mapPropertyType(creaProperty.PropertySubType || creaProperty.PropertyType),
    status: mapListingStatus(creaProperty.StandardStatus),
    
    // Location data
    address: creaProperty.UnparsedAddress || `${creaProperty.City}, Alberta`,
    city: creaProperty.City,
    province: 'Alberta', // Force Alberta
    postalCode: creaProperty.PostalCode || '',
    latitude: getValidNumber(creaProperty.Latitude, 0),
    longitude: getValidNumber(creaProperty.Longitude, 0),
    
    // Enhanced features mapping - convert to boolean values for UI filters
    features: {
      // Boolean features for filtering
      garage: !!(creaProperty.GarageSpaces > 0 || creaProperty.CarportSpaces > 0 || 
                 creaProperty.ParkingTotal > 0 ||
                 (creaProperty.Appliances && creaProperty.Appliances.some(a => 
                   a.toLowerCase().includes('garage'))) ||
                 // GARAGE DOOR OPENER = GARAGE EXISTS (basic logic!)
                 (creaProperty.Appliances && creaProperty.Appliances.some(a => 
                   a.toLowerCase().includes('garage door opener') || 
                   a.toLowerCase().includes('garage door remote') ||
                   a.toLowerCase().includes('opener'))) ||
                 // Check description for garage mentions
                 (creaProperty.PublicRemarks && (
                   creaProperty.PublicRemarks.toLowerCase().includes('garage') ||
                   creaProperty.PublicRemarks.toLowerCase().includes('parking') ||
                   creaProperty.PublicRemarks.toLowerCase().includes('attached') ||
                   creaProperty.PublicRemarks.toLowerCase().includes('detached')))),
      pool: !!(creaProperty.PoolFeatures && creaProperty.PoolFeatures.length > 0),
      waterfront: !!(creaProperty.WaterBodyName || 
                     (creaProperty.ExteriorFeatures && creaProperty.ExteriorFeatures.some(f => 
                       f.toLowerCase().includes('waterfront') || f.toLowerCase().includes('water')))),
      centralAC: !!(creaProperty.Cooling && creaProperty.Cooling.some(c => 
                     c.toLowerCase().includes('central') || c.toLowerCase().includes('air'))),
      fireplace: !!(creaProperty.FireplaceFeatures && creaProperty.FireplaceFeatures.length > 0),
      basement: !!(creaProperty.Basement && creaProperty.Basement.length > 0),
      smartHome: !!(creaProperty.InteriorFeatures && creaProperty.InteriorFeatures.some(f =>
                     f.toLowerCase().includes('smart') || f.toLowerCase().includes('automated'))),
      solarPanels: !!(creaProperty.ExteriorFeatures && creaProperty.ExteriorFeatures.some(f =>
                      f.toLowerCase().includes('solar'))),
      
      // Property details
      yearBuilt: creaProperty.YearBuilt,
      lotSize: creaProperty.LotSizeAcres || creaProperty.LotSizeSquareFeet,
      garageSpaces: creaProperty.GarageSpaces || creaProperty.CarportSpaces || 0,
      
      // Raw arrays for detailed view
      heating: creaProperty.Heating || [],
      cooling: creaProperty.Cooling || [],
      appliances: creaProperty.Appliances || [],
      flooring: creaProperty.Flooring || [],
      exteriorFeatures: creaProperty.ExteriorFeatures || [],
      poolFeatures: creaProperty.PoolFeatures || [],
      interiorFeatures: creaProperty.InteriorFeatures || [],
      fireplaceFeatures: creaProperty.FireplaceFeatures || [],
      basementFeatures: creaProperty.Basement || [],
      
      // Financial
      taxes: creaProperty.TaxAnnualAmount,
      taxYear: creaProperty.TaxYear,
      hoaFee: creaProperty.AssociationFee,
      
      // Listing details
      listingUrl: creaProperty.ListingURL,
      virtualTourUrl: creaProperty.VirtualTourURLBranded,
      daysOnMarket: creaProperty.DaysOnMarket,
      listingAgent: creaProperty.ListAgentFullName,
      listingOffice: creaProperty.ListOfficeName,
    },
    
    // Enhanced image handling - get all available images
    images: extractImages(creaProperty),
    
    // CREA integration fields
    source: 'crea',
    externalId: creaProperty.ListingKey,
    mlsNumber: creaProperty.ListingId || creaProperty.MLSNumber,
    lastSyncAt: new Date(),
    
    // System fields
    userId: systemUserId,
    views: 0
  }

  return property
}

function mapPropertyType(subType: string): string {
  if (!subType) return 'house'
  
  const type = subType.toLowerCase()
  
  // Map CREA PropertySubType to our system types
  if (type.includes('vacant land') || type.includes('land')) return 'land'
  if (type.includes('single family') || type.includes('single-family')) return 'house'
  if (type.includes('condo') || type.includes('apartment') || type.includes('condominium')) return 'condo'
  if (type.includes('townhouse') || type.includes('town') || type.includes('row house')) return 'townhouse'
  if (type.includes('multi-family') || type.includes('duplex') || type.includes('multiplex')) return 'multi-family'
  if (type.includes('industrial')) return 'industrial'
  if (type.includes('office')) return 'commercial'
  if (type.includes('retail') || type.includes('business')) return 'commercial'
  if (type.includes('other')) return 'other'
  
  return 'house' // Default for residential
}

function mapListingStatus(status: string): string {
  if (!status) return 'for_sale'
  
  const s = status.toLowerCase()
  if (s.includes('sold')) return 'sold'
  if (s.includes('pending')) return 'pending'
  return 'for_sale'
}

function extractImages(creaProperty: any): string[] {
  const images: string[] = []
  
  console.log(`📸 Extracting images for ${creaProperty.ListingKey}, Media count: ${creaProperty.Media?.length || 0}`)
  
  // Primary: Check Media array (already included in CREA response)
  if (creaProperty.Media && Array.isArray(creaProperty.Media)) {
    // Filter to property photos; prefer PreferredPhotoYN, then sort by Order
    const mediaPhotos = creaProperty.Media.filter((m: any) => m.MediaCategory === 'Property Photo' && m.MediaURL)
    const preferred = mediaPhotos.filter((m: any) => m.PreferredPhotoYN)
    const others = mediaPhotos.filter((m: any) => !m.PreferredPhotoYN)
    const sortedPreferred = preferred.sort((a: any, b: any) => (a.Order || 0) - (b.Order || 0))
    const sortedOthers = others.sort((a: any, b: any) => (a.Order || 0) - (b.Order || 0))
    const sortedMedia = [...sortedPreferred, ...sortedOthers]
    
    for (const media of sortedMedia) {
      if (media.MediaURL) {
        images.push(media.MediaURL)
        console.log(`✅ Found image #${media.Order}: ${media.MediaURL}`)
      }
    }
  }
  
  // Secondary: Try alternate image fields if no Media found
  if (images.length === 0) {
    const alternateFields = ['Photo', 'PhotoURL', 'ImageURL', 'PictureURL', 'ListingURL']
    for (const field of alternateFields) {
      if (creaProperty[field] && typeof creaProperty[field] === 'string') {
        // Only add if it looks like an image URL
        if (creaProperty[field].includes('.jpg') || creaProperty[field].includes('.jpeg') || 
            creaProperty[field].includes('.png') || creaProperty[field].includes('.webp')) {
          images.push(creaProperty[field])
          console.log(`✅ Found alternate image: ${creaProperty[field]}`)
          break
        }
      }
    }
  }
  
  // CRITICAL: NEVER use placeholders for CREA/MLS properties
  // MLS requires minimum 14 images - if none found, this is a data/API issue
  if (images.length === 0) {
    console.error(`🚨 CRITICAL: No images found for CREA property ${creaProperty.ListingKey}`)
    console.error(`🚨 This should NEVER happen - MLS requires images!`)
    console.error(`🚨 Raw Media data:`, JSON.stringify(creaProperty.Media, null, 2))
    
    // Return empty array - we'll handle this in the main sync to skip this property
    return []
  } else {
    console.log(`🎉 Successfully extracted ${images.length} images for ${creaProperty.ListingKey}`)
  }
  
  return images // Return ALL images - no limits
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { limit = 1000, city, maxPrice, minPrice, propertyType, batchSize = 50 } = body

    console.log(`🍁 Starting Alberta CREA sync (target: ${limit === 1000 ? 'ALL' : limit} properties, batch size: ${batchSize})`)

    // Get CREA token
    const tokenResponse = await fetch('https://identity.crea.ca/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.CREA_CLIENT_ID!,
        client_secret: process.env.CREA_CLIENT_SECRET!,
      }),
    })

    if (!tokenResponse.ok) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to get CREA token'
      })
    }

    const tokenData = await tokenResponse.json()
    const token = tokenData.access_token

    // Build base OData query for Alberta properties
    let baseQuery = `$filter=StateOrProvince eq 'Alberta'`
    
    if (city) {
      baseQuery += ` and City eq '${city}'`
    }
    
    if (minPrice) {
      baseQuery += ` and ListPrice ge ${minPrice}`
    }
    
    if (maxPrice) {
      baseQuery += ` and ListPrice le ${maxPrice}`
    }
    
    if (propertyType) {
      baseQuery += ` and PropertySubType eq '${propertyType}'`
    }

    // First, get total count
    const countQuery = `${baseQuery}&$count=true&$top=1`
    console.log(`🔍 Getting total count with query: ${countQuery}`)
    
    const countResponse = await fetch(`https://ddfapi.realtor.ca/odata/v1/Property?${countQuery}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    })

    if (!countResponse.ok) {
      throw createError({
        statusCode: 500,
        statusMessage: `CREA API error: ${countResponse.status}`
      })
    }

    const countData = await countResponse.json()
    const totalCount = countData['@odata.count'] || countData.value?.length || 0
    console.log(`📊 Total Alberta properties available: ${totalCount}`)

    // Process in batches
    let allCreaProperties: any[] = []
    let processed = 0
    const targetCount = limit === 1000 && totalCount > 1000 ? totalCount : Math.min(limit, totalCount)
    
    while (processed < targetCount) {
      const currentBatch = Math.min(batchSize, targetCount - processed)
      const query = `${baseQuery}&$top=${currentBatch}&$skip=${processed}`
      
      console.log(`📦 Fetching batch ${Math.floor(processed/batchSize) + 1}: ${currentBatch} properties (${processed + 1}-${processed + currentBatch} of ${targetCount})`)

      const propertiesResponse = await fetch(`https://ddfapi.realtor.ca/odata/v1/Property?${query}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      })

      if (!propertiesResponse.ok) {
        console.error(`❌ Failed to fetch batch at offset ${processed}`)
        break
      }

      const propertiesData = await propertiesResponse.json()
      const batchProperties = propertiesData.value || []
      
      if (batchProperties.length === 0) {
        console.log(`ℹ️ No more properties returned, stopping at ${processed}`)
        break
      }

      allCreaProperties.push(...batchProperties)
      processed += batchProperties.length
      
      console.log(`✅ Batch complete. Total fetched: ${allCreaProperties.length}`)
      
      // Small delay to avoid rate limiting
      if (processed < targetCount) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    console.log(`📍 Successfully fetched ${allCreaProperties.length} Alberta properties from CREA`)
    const creaProperties = allCreaProperties

    // Get or create system user
    let systemUser = await prisma.user.findFirst({
      where: { email: 'alberta@abdul.com' }
    })

    if (!systemUser) {
      systemUser = await prisma.user.create({
        data: {
          email: 'alberta@abdul.com',
          firstName: 'Alberta',
          lastName: 'MLS',
          role: 'agent',
          provider: 'system'
        }
      })
    }

    // Process and insert properties
    const results = []
    let created = 0
    let updated = 0
    let skipped = 0

    for (const creaProperty of creaProperties) {
      try {
        // Check if property already exists
        const existingProperty = await prisma.property.findFirst({
          where: {
            source: 'crea',
            externalId: creaProperty.ListingKey
          }
        })

        const transformedProperty = transformCreaaProperty(creaProperty, systemUser.id)

        // CRITICAL: Skip CREA properties without images or without valid price
        if (!transformedProperty.images || transformedProperty.images.length === 0) {
          console.error(`🚨 SKIPPING property ${creaProperty.ListingKey} - no images found!`)
          console.error(`🚨 MLS properties MUST have images - this indicates a data issue`)
          skipped++
          continue
        }
        if (!transformedProperty.price || transformedProperty.price <= 0) {
          console.error(`🚨 SKIPPING property ${creaProperty.ListingKey} - invalid price (${transformedProperty.price})`)
          console.error(`🚨 CREA data:`, {
            ListPrice: creaProperty.ListPrice,
            CurrentPrice: creaProperty.CurrentPrice,
            OriginalListPrice: creaProperty.OriginalListPrice,
            title: creaProperty.UnparsedAddress
          })
          skipped++
          continue
        }
        if (!transformedProperty.latitude || !transformedProperty.longitude) {
          console.error(`🚨 SKIPPING property ${creaProperty.ListingKey} - missing coordinates`)
          skipped++
          continue
        }

        if (existingProperty) {
          // Update existing property
          await prisma.property.update({
            where: { id: existingProperty.id },
            data: {
              ...transformedProperty,
              images: JSON.stringify(transformedProperty.images),
              features: JSON.stringify(transformedProperty.features),
              lastSyncAt: new Date()
            }
          })
          updated++
          console.log(`🔄 Updated: ${transformedProperty.title} (${transformedProperty.images.length} images)`)
        } else {
          // Create new property
          await prisma.property.create({
            data: {
              ...transformedProperty,
              images: JSON.stringify(transformedProperty.images),
              features: JSON.stringify(transformedProperty.features)
            }
          })
          created++
          console.log(`✅ Created: ${transformedProperty.title} (${transformedProperty.images.length} images)`)
        }

        results.push({
          success: true,
          title: transformedProperty.title,
          city: transformedProperty.city,
          price: transformedProperty.price,
          externalId: transformedProperty.externalId
        })

      } catch (error) {
        console.error(`❌ Error processing property ${creaProperty.ListingKey}:`, error)
        skipped++
        results.push({
          success: false,
          title: creaProperty.UnparsedAddress || 'Unknown Property',
          error: (error as Error).message
        })
      }
    }

    console.log(`🎉 Alberta sync complete! Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`)

    return {
      success: true,
      message: `Alberta CREA sync complete`,
      total: creaProperties.length,
      created,
      updated,
      skipped,
      results: results.slice(0, 10) // Return first 10 results
    }

  } catch (error) {
    console.error('❌ Alberta CREA sync failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Alberta sync failed: ${(error as Error).message}`
    })
  }
})
