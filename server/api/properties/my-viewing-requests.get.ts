import { defineEventHandler } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    return []
  }

  const requests = await prisma.viewingRequest.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      property: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } }
        }
      }
    }
  })

  return requests.map((vr) => ({
    ...vr,
    property: {
      ...vr.property,
      images: typeof vr.property.images === 'string' ? JSON.parse(vr.property.images as any) : vr.property.images,
      features: typeof vr.property.features === 'string' ? JSON.parse(vr.property.features as any) : vr.property.features,
      agent: vr.property.user
    }
  }))
})


