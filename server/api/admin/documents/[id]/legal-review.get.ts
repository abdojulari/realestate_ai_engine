import { H3Event } from 'h3'
import { requireAdmin } from '../../../../utils/auth'
import { requireFeatureForUser, FEATURES } from '../../../../utils/license'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

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

  const document = await prisma.document.findFirst({
    where: { id, userId: user.id },
  })

  if (!document) throw createError({ statusCode: 404, statusMessage: 'Document not found' })

  const [legalReview, dateAlerts] = await Promise.all([
    prisma.documentLegalReview.findUnique({ where: { documentId: id } }),
    prisma.documentDateAlert.findMany({ where: { documentId: id }, orderBy: { dueDate: 'asc' } }),
  ])

  return {
    success: true,
    review: legalReview
      ? {
          id: legalReview.id,
          redFlags: legalReview.redFlags,
          importantNotes: legalReview.importantNotes,
          importantDates: legalReview.importantDates,
          legalSummary: legalReview.legalSummary,
          buyerImpact: legalReview.buyerImpact,
          sellerImpact: legalReview.sellerImpact,
          partyRepresenting: legalReview.partyRepresenting,
          reviewedAt: legalReview.reviewedAt,
        }
      : null,
    dateAlerts: dateAlerts.map((a) => ({
      id: a.id,
      label: a.label,
      dueDate: a.dueDate,
      daysBefore: a.daysBefore,
      sentAt: a.sentAt,
    })),
  }
})
