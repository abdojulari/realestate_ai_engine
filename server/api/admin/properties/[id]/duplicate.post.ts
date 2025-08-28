import { defineEventHandler, createError } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const admin = (event as any).context?.user
  if (!admin) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  if (admin.role !== 'admin' && admin.role !== 'agent') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const id = Number((event.context.params as any)?.id)
  if (!Number.isFinite(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const p = await prisma.property.findUnique({ where: { id } })
  if (!p) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const copy = await prisma.property.create({
    data: {
      title: `${p.title} (Copy)`,
      description: p.description,
      price: p.price,
      beds: p.beds,
      baths: p.baths as any,
      sqft: p.sqft as any,
      type: p.type,
      status: p.status,
      address: p.address,
      city: p.city,
      province: p.province,
      postalCode: p.postalCode,
      latitude: p.latitude,
      longitude: p.longitude,
      features: p.features as any,
      images: p.images as any,
      userId: p.userId,
      views: 0
    }
  })

  return copy
})


