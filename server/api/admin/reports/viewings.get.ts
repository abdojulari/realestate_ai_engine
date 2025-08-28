import { defineEventHandler } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)

  const rows = await prisma.viewingRequest.findMany({
    orderBy: { dateTime: 'desc' },
    take: 50,
    include: { property: { select: { title: true, images: true } }, user: { select: { firstName: true, lastName: true } } }
  })

  return rows.map((r: any) => ({
    id: r.id,
    property: { title: r.property?.title || 'Property', image: Array.isArray(r.property?.images) ? r.property.images[0] : '/favicon.ico' },
    user: { name: `${r.user?.firstName || ''} ${r.user?.lastName || ''}`.trim() },
    dateTime: r.dateTime,
    status: r.status || 'pending',
    agent: { name: '' },
    notes: r.notes || ''
  }))
})


