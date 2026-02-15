import { defineEventHandler, readBody, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import { getAdminIdForCreate } from '../../../utils/tenant'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const adminId = getAdminIdForCreate(user)

  const body = await readBody(event)

  // Validate required fields
  const required = ['title', 'address', 'city', 'price', 'beds', 'baths', 'sqft', 'type'] as const
  for (const field of required) {
    if (!body[field] && body[field] !== 0) {
      throw createError({ statusCode: 400, message: `${field} is required` })
    }
  }

  const property = await prisma.property.create({
    data: {
      title: body.title,
      description: body.description || '',
      price: parseFloat(body.price),
      beds: parseInt(body.beds),
      baths: parseFloat(body.baths),
      sqft: parseFloat(body.sqft),
      type: body.type.toLowerCase(),
      status: (body.status || 'for_sale').toLowerCase().replace(' ', '_'),
      address: body.address,
      city: body.city,
      province: body.province || 'AB',
      postalCode: body.postalCode || '',
      latitude: body.latitude ? parseFloat(body.latitude) : null,
      longitude: body.longitude ? parseFloat(body.longitude) : null,
      features: body.features || {},
      images: body.images || [],
      source: 'manual',
      userId: user.id,
      adminId,
      views: 0,
      yearBuilt: body.yearBuilt ? parseInt(body.yearBuilt) : null,
      stories: body.stories ? parseInt(body.stories) : null,
      lotSizeArea: body.lotSizeArea ? parseFloat(body.lotSizeArea) : null,
      lotSizeDimensions: body.lotSizeDimensions || null,
      cityRegion: body.cityRegion || null,
      streetName: body.streetName || null,
      streetNumber: body.streetNumber || null,
      unitNumber: body.unitNumber || null,
      zoning: body.zoning || null,
      zoningDescription: body.zoningDescription || null,
      taxAnnualAmount: body.taxAnnualAmount ? parseFloat(body.taxAnnualAmount) : null,
      taxYear: body.taxYear ? parseInt(body.taxYear) : null,
    },
  })

  return { success: true, property }
})
