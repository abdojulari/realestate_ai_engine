import { readBody, createError } from 'h3'
import { requireAdmin } from '../../../../utils/auth'
import { getTenantFilter } from '../../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)
  const id = Number(event.context.params?.id)
  const body = await readBody(event)

  const existing = await prisma.leadForm.findFirst({ where: { id, ...tenantFilter } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Form not found' })

  const form = await prisma.leadForm.update({
    where: { id },
    data: {
      title: body.title ?? existing.title,
      description: body.description ?? existing.description,
      fields: body.fields ?? existing.fields,
      disclaimerText: body.disclaimerText ?? existing.disclaimerText,
      privacyText: body.privacyText ?? existing.privacyText,
      thankYouMessage: body.thankYouMessage ?? existing.thankYouMessage,
      brandColor: body.brandColor ?? existing.brandColor,
      status: body.status ?? existing.status,
    },
  })

  return form
})
