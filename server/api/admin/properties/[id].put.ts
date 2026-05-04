import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter, requireTenantAccess } from '../../../utils/tenant'
import { getCanonicalCityName } from '../../../utils/city-dictionary'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)

  const id = Number((event.context.params as any)?.id)
  if (!Number.isFinite(id)) throw createError({ statusCode: 400, message: 'Invalid id' })

  const existing = await prisma.property.findFirst({ where: { id, ...tenantFilter } })
  if (!existing) throw createError({ statusCode: 404, message: 'Property not found' })

  requireTenantAccess(user, existing.adminId)

  const body = await readBody(event)

  // Build update data – only include fields that were sent
  const data: any = {}
  if (body.title !== undefined) data.title = body.title
  if (body.description !== undefined) data.description = body.description
  if (body.price !== undefined) data.price = parseFloat(body.price)
  if (body.beds !== undefined) data.beds = parseInt(body.beds)
  if (body.baths !== undefined) data.baths = parseFloat(body.baths)
  if (body.sqft !== undefined) data.sqft = parseFloat(body.sqft)
  if (body.type !== undefined) data.type = body.type.toLowerCase()
  if (body.status !== undefined) data.status = body.status.toLowerCase().replace(' ', '_')
  if (body.address !== undefined) data.address = body.address
  // Canonicalise admin input through the city dictionary so updates can't
  // re-introduce "edmonton" / "St Albert" drift onto MLS rows.
  if (body.city !== undefined) data.city = getCanonicalCityName(body.city)
  if (body.province !== undefined) data.province = body.province
  if (body.postalCode !== undefined) data.postalCode = body.postalCode
  if (body.latitude !== undefined) data.latitude = body.latitude ? parseFloat(body.latitude) : null
  if (body.longitude !== undefined) data.longitude = body.longitude ? parseFloat(body.longitude) : null
  if (body.features !== undefined) data.features = body.features
  if (body.images !== undefined) data.images = body.images
  if (body.yearBuilt !== undefined) data.yearBuilt = body.yearBuilt ? parseInt(body.yearBuilt) : null
  if (body.stories !== undefined) data.stories = body.stories ? parseInt(body.stories) : null
  if (body.lotSizeArea !== undefined) data.lotSizeArea = body.lotSizeArea ? parseFloat(body.lotSizeArea) : null
  if (body.lotSizeDimensions !== undefined) data.lotSizeDimensions = body.lotSizeDimensions || null
  if (body.cityRegion !== undefined) data.cityRegion = body.cityRegion || null
  if (body.streetName !== undefined) data.streetName = body.streetName || null
  if (body.streetNumber !== undefined) data.streetNumber = body.streetNumber || null
  if (body.unitNumber !== undefined) data.unitNumber = body.unitNumber || null
  if (body.zoning !== undefined) data.zoning = body.zoning || null
  if (body.taxAnnualAmount !== undefined) data.taxAnnualAmount = body.taxAnnualAmount ? parseFloat(body.taxAnnualAmount) : null
  if (body.taxYear !== undefined) data.taxYear = body.taxYear ? parseInt(body.taxYear) : null

  const updated = await prisma.property.update({ where: { id }, data })
  return { success: true, property: updated }
})
