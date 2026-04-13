import type { PrismaClient } from '@prisma/client'

/**
 * Extracts unique SubdivisionName values from property features JSON,
 * creates Neighborhood records, and links properties via PropertyNeighborhood.
 */
export async function populateNeighborhoods(prisma: PrismaClient) {
  const properties = await prisma.property.findMany({
    where: {
      features: { not: null }
    },
    select: {
      id: true,
      city: true,
      province: true,
      latitude: true,
      longitude: true,
      price: true,
      features: true,
    }
  })

  const stats = {
    totalProperties: properties.length,
    propertiesWithSubdivision: 0,
    neighborhoodsCreated: 0,
    neighborhoodsUpdated: 0,
    linksCreated: 0,
    linksSkipped: 0,
    errors: 0
  }

  // Group properties by subdivision+city+province
  const neighborhoodMap = new Map<string, {
    name: string
    city: string
    province: string
    properties: typeof properties
  }>()

  for (const prop of properties) {
    const features = prop.features as any
    const subdivisionName = features?.subdivisionName
    if (!subdivisionName || typeof subdivisionName !== 'string' || !subdivisionName.trim()) continue
    if (!prop.city) continue

    stats.propertiesWithSubdivision++
    const key = `${subdivisionName.trim()}|${prop.city}|${prop.province || 'Alberta'}`

    if (!neighborhoodMap.has(key)) {
      neighborhoodMap.set(key, {
        name: subdivisionName.trim(),
        city: prop.city,
        province: prop.province || 'Alberta',
        properties: []
      })
    }
    neighborhoodMap.get(key)!.properties.push(prop)
  }

  console.log(`📍 Found ${neighborhoodMap.size} unique neighborhoods from ${stats.propertiesWithSubdivision} properties`)

  for (const [, data] of neighborhoodMap) {
    try {
      const propList = data.properties
      const prices = propList.map(p => p.price).filter((p): p is number => p !== null && p > 0)
      const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null

      const lats = propList.map(p => p.latitude).filter((l): l is number => l !== null)
      const lngs = propList.map(p => p.longitude).filter((l): l is number => l !== null)
      const centerLat = lats.length > 0 ? lats.reduce((a, b) => a + b, 0) / lats.length : null
      const centerLng = lngs.length > 0 ? lngs.reduce((a, b) => a + b, 0) / lngs.length : null

      const neighborhood = await prisma.neighborhood.upsert({
        where: {
          name_city_province: {
            name: data.name,
            city: data.city,
            province: data.province
          }
        },
        update: {
          propertyCount: propList.length,
          averagePrice: avgPrice,
          centerLatitude: centerLat,
          centerLongitude: centerLng,
          updatedAt: new Date()
        },
        create: {
          name: data.name,
          city: data.city,
          province: data.province,
          country: 'Canada',
          propertyCount: propList.length,
          averagePrice: avgPrice,
          centerLatitude: centerLat,
          centerLongitude: centerLng
        }
      })

      if (neighborhood.createdAt.getTime() === neighborhood.updatedAt.getTime()) {
        stats.neighborhoodsCreated++
      } else {
        stats.neighborhoodsUpdated++
      }

      for (const prop of propList) {
        try {
          await prisma.propertyNeighborhood.upsert({
            where: { propertyId: prop.id },
            update: {
              neighborhoodId: neighborhood.id,
              lastLookup: new Date()
            },
            create: {
              propertyId: prop.id,
              neighborhoodId: neighborhood.id,
              confidence: 100
            }
          })
          stats.linksCreated++
        } catch {
          stats.linksSkipped++
        }
      }
    } catch (err: any) {
      console.error(`❌ Error processing neighborhood ${data.name} in ${data.city}:`, err.message)
      stats.errors++
    }
  }

  return stats
}
