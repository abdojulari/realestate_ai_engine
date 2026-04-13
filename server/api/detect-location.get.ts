import { defineEventHandler, getHeader, getQuery } from 'h3'

/**
 * GET /api/detect-location
 * Detects user's city from their IP address using free geolocation APIs.
 * Also supports reverse-geocoding browser coordinates passed as ?lat=&lng=
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const lat = parseFloat(query.lat as string)
  const lng = parseFloat(query.lng as string)

  // If browser coordinates are provided, reverse geocode them (most accurate)
  if (!isNaN(lat) && !isNaN(lng)) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
        {
          headers: { 'User-Agent': 'DeelBot-RealEstate/1.0' },
          signal: AbortSignal.timeout(5000)
        }
      )
      const data = await res.json()
      if (data.address) {
        return {
          city: data.address.city || data.address.town || data.address.municipality || data.address.village || '',
          province: data.address.state || '',
          country: data.address.country || 'Canada',
          latitude: lat,
          longitude: lng,
          source: 'reverse-geocode'
        }
      }
    } catch (e) {
      console.warn('Nominatim reverse geocode failed:', (e as Error).message)
    }
  }

  // Fall back to IP-based geolocation
  const forwarded = getHeader(event, 'x-forwarded-for')
  const cfIp = getHeader(event, 'cf-connecting-ip')
  const realIp = getHeader(event, 'x-real-ip')
  const ip = cfIp || (forwarded?.split(',')[0]?.trim()) || realIp || ''

  const isPrivate = !ip || ip === '127.0.0.1' || ip === '::1' ||
    ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')

  if (!isPrivate && ip) {
    try {
      const res = await fetch(
        `http://ip-api.com/json/${ip}?fields=status,city,regionName,country,lat,lon`,
        { signal: AbortSignal.timeout(3000) }
      )
      const data = await res.json()
      if (data.status === 'success' && data.city) {
        return {
          city: data.city,
          province: data.regionName || '',
          country: data.country || 'Canada',
          latitude: data.lat,
          longitude: data.lon,
          source: 'ip-geolocation'
        }
      }
    } catch (e) {
      console.warn('ip-api.com failed:', (e as Error).message)
    }
  }

  return {
    city: '',
    province: '',
    country: '',
    latitude: null,
    longitude: null,
    source: 'none'
  }
})
