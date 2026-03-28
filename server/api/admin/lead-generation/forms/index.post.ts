import { readBody, createError } from 'h3'
import { requireAdmin } from '../../../../utils/auth'
import { getAdminIdForCreate } from '../../../../utils/tenant'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const adminId = getAdminIdForCreate(user)
  const body = await readBody(event)

  if (!body.title) {
    throw createError({ statusCode: 400, statusMessage: 'Title is required' })
  }

  const slug = crypto.randomBytes(6).toString('base64url')

  const form = await prisma.leadForm.create({
    data: {
      adminId,
      slug,
      title: body.title,
      description: body.description || null,
      fields: body.fields || ['name', 'email', 'phone', 'message'],
      disclaimerText: body.disclaimerText || null,
      privacyText: body.privacyText || null,
      thankYouMessage: body.thankYouMessage || 'Thank you! We will be in touch shortly.',
      brandColor: body.brandColor || '#1976D2',
    },
  })

  return form
})
