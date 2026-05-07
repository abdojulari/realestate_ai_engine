/**
 * Query params for GET `/api/properties` (see `server/api/properties/index.get.ts`).
 * Defaults consumer flows to active listings (`status=for_sale`).
 */
export function buildPropertiesListingQuery(input: Record<string, unknown>): Record<string, string> {
  const q: Record<string, string> = {}

  const loc =
    (typeof input.city === 'string' && input.city.trim()) ||
    (typeof input.location === 'string' && input.location.trim()) ||
    ''
  if (loc) q.city = loc

  const typ = input.type ?? input.propertyType
  if (typ != null && typ !== '' && String(typ) !== 'all') q.type = String(typ)

  const mp = input.minPrice
  if (mp != null && mp !== '') q.minPrice = String(mp)
  const xp = input.maxPrice
  if (xp != null && xp !== '') q.maxPrice = String(xp)

  if (input.beds != null && input.beds !== '') q.beds = String(input.beds)
  if (input.baths != null && input.baths !== '') q.baths = String(input.baths)
  if (input.minSqft != null && input.minSqft !== '') q.minSqft = String(input.minSqft)
  if (input.maxSqft != null && input.maxSqft !== '') q.maxSqft = String(input.maxSqft)

  const st = input.status
  if (st != null && String(st).trim()) q.status = String(st).trim()
  else q.status = 'for_sale'

  if (input.noHoaFee === true) q.noHoaFee = 'true'
  if (input.maxDaysOnMarket != null && input.maxDaysOnMarket !== '')
    q.maxDaysOnMarket = String(input.maxDaysOnMarket)
  if (input.minParking != null && input.minParking !== '') q.minParking = String(input.minParking)

  const feats = input.features
  if (Array.isArray(feats) && feats.length) q.features = feats.join(',')

  return q
}
