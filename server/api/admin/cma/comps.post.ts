import { defineEventHandler, readBody } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'

const prisma = new PrismaClient()

type Subject = {
  address?: string
  city?: string
  province?: string
  postalCode?: string
  beds?: number
  baths?: number
  sqft?: number
  yearBuilt?: number
  lotSize?: string
  condition?: string
  features?: string[]
  latitude?: number
  longitude?: number
}

function parseDateRange(range?: string, startDate?: string, endDate?: string) {
  const now = new Date()
  if (range && range !== 'custom') {
    const days = range === 'last_30' ? 30
      : range === 'last_90' ? 90
      : range === 'last_180' ? 180
      : range === 'last_365' ? 365
      : null
    if (days) {
      return { gte: new Date(now.getTime() - days * 24 * 60 * 60 * 1000), lte: now }
    }
  }
  if (startDate && endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      return { gte: start, lte: end }
    }
  }
  return null
}

function toRad(value: number) {
  return (value * Math.PI) / 180
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

function normalizeFeature(value: string) {
  return value.toLowerCase().replace(/\s+/g, '')
}

function extractPropertyFeatures(property: any): Set<string> {
  const set = new Set<string>()
  const features = typeof property.features === 'string' ? JSON.parse(property.features) : property.features || {}
  const description = (property.description || '').toLowerCase()

  const push = (f: string) => set.add(normalizeFeature(f))

  const arrays = [
    features.appliances,
    features.exterior,
    features.interior,
    features.building,
    features.lot,
    features.utilities,
    features.view,
    features.architecturalStyle
  ]

  arrays.forEach(arr => {
    if (Array.isArray(arr)) {
      arr.forEach((v: string) => push(v))
    }
  })

  if (description.includes('garage') || description.includes('carport') || description.includes('parking')) push('garage')
  if (description.includes('basement')) push('basement')
  if (description.includes('fireplace')) push('fireplace')
  if (description.includes('pool')) push('pool')
  if (description.includes('central air') || description.includes('air conditioning')) push('centralac')

  return set
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const subject: Subject = body?.subject || {}
  const filters = body?.filters || {}
  const radiusKm = Number(filters.radiusKm || 5)
  const limit = Number(filters.limit || 20)

  const where: any = { status: 'sold' }
  if (filters.province || subject.province) where.province = filters.province || subject.province
  if (filters.city || subject.city) where.city = { contains: (filters.city || subject.city) as string, mode: 'insensitive' }

  const dateFilter = parseDateRange(filters.range, filters.startDate, filters.endDate)
  if (dateFilter) {
    where.updatedAt = dateFilter
  }

  const properties = await prisma.property.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: 200,
    select: {
      id: true,
      title: true,
      price: true,
      beds: true,
      baths: true,
      sqft: true,
      type: true,
      status: true,
      address: true,
      city: true,
      province: true,
      latitude: true,
      longitude: true,
      images: true,
      features: true,
      description: true,
      updatedAt: true
    }
  })

  const subjectFeatures = (subject.features || []).map(normalizeFeature)
  const subjectFeatureSet = new Set(subjectFeatures)

  const subjectCoords = subject.latitude && subject.longitude
    ? { lat: subject.latitude, lng: subject.longitude }
    : null

  const comps = properties
    .map((property) => {
      const featureSet = extractPropertyFeatures(property)
      const matches = subjectFeatures.filter(f => featureSet.has(f))
      const matchScore = subjectFeatures.length ? Math.round((matches.length / subjectFeatures.length) * 100) : 0
      const distance = subjectCoords && property.latitude && property.longitude
        ? distanceKm(subjectCoords, { lat: property.latitude, lng: property.longitude })
        : null

      return {
        ...property,
        images: typeof property.images === 'string' ? JSON.parse(property.images || '[]') : property.images,
        matchScore,
        matchedFeatures: matches,
        subjectExtraFeatures: subjectFeatures.filter(f => !featureSet.has(f)),
        distanceKm: distance
      }
    })
    .filter((property) => {
      if (!subjectCoords || property.distanceKm == null) return true
      return property.distanceKm <= radiusKm
    })
    .slice(0, limit)

  const prices = comps.map(p => p.price || 0).filter(p => p > 0)
  const avgPrice = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0

  return {
    subject,
    comps,
    stats: {
      count: comps.length,
      avgPrice,
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0
    }
  }
})
