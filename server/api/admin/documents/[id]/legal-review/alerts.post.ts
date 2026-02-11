import { H3Event } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../../utils/auth'
import { requireFeatureForUser, FEATURES } from '../../../../../utils/license'

const prisma = new PrismaClient()

export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAdmin(event)
  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, role: true, subscriptionTier: true, adminId: true },
  })
  if (!fullUser) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  await requireFeatureForUser(FEATURES.DOCUMENTS_LEGAL_REVIEW, fullUser, event)

  const id = parseInt(event.context.params?.id || '0')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid document ID' })

  const body = await readBody(event)
  const alerts = Array.isArray(body.alerts) ? body.alerts : []

  const document = await prisma.document.findFirst({
    where: { id, userId: user.id },
    include: { legalReview: true },
  })
  if (!document) throw createError({ statusCode: 404, statusMessage: 'Document not found' })
  if (!document.legalReview) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Run Legal Review first before setting date alerts.',
    })
  }

  const toCreate: Array<{ documentId: number; label: string; dueDate: Date; daysBefore: number }> = []
  for (const a of alerts) {
    const label = typeof a.label === 'string' ? a.label.trim() : ''
    const dueDate = a.dueDate ? new Date(a.dueDate) : null
    const daysBefore = typeof a.daysBefore === 'number' ? Math.max(0, a.daysBefore) : 2
    if (label && dueDate && !isNaN(dueDate.getTime())) {
      toCreate.push({ documentId: id, label, dueDate, daysBefore })
    }
  }

  await prisma.documentDateAlert.deleteMany({ where: { documentId: id } })
  if (toCreate.length > 0) {
    await prisma.documentDateAlert.createMany({ data: toCreate })
  }

  const updated = await prisma.documentDateAlert.findMany({
    where: { documentId: id },
    orderBy: { dueDate: 'asc' },
  })

  return {
    success: true,
    alerts: updated.map((a) => ({
      id: a.id,
      label: a.label,
      dueDate: a.dueDate,
      daysBefore: a.daysBefore,
      sentAt: a.sentAt,
    })),
  }
})
