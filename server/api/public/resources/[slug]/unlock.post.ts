import { readBody, createError, setCookie, getRequestIP, getRequestHeader } from 'h3'
import { PrismaClient } from '@prisma/client'
import {
  cookieNameForResourceSlug,
  signResourceAccessToken,
} from '../../../../utils/marketingResourceStorage'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default defineEventHandler(async (event) => {
  const slug = event.context.params?.slug
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'Missing slug' })

  const resource = await prisma.marketingResource.findFirst({
    where: { publicSlug: slug, published: true },
  })
  if (!resource) {
    throw createError({ statusCode: 404, statusMessage: 'Resource not found' })
  }

  const body = await readBody(event)
  const firstName = String(body?.firstName || '').trim()
  const lastName = String(body?.lastName || '').trim()
  const email = String(body?.email || '').trim().toLowerCase()
  const phone = String(body?.phone || '').trim()

  if (!firstName || !lastName) {
    throw createError({ statusCode: 400, statusMessage: 'First and last name are required' })
  }
  if (!email || !EMAIL_RE.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'A valid email is required' })
  }
  if (!phone) {
    throw createError({ statusCode: 400, statusMessage: 'Phone number is required' })
  }

  const ip = getRequestIP(event, { xForwardedFor: true }) || null
  const userAgent = getRequestHeader(event, 'user-agent') || null

  await prisma.resourceDownloadLead.create({
    data: {
      resourceId: resource.id,
      adminId: resource.adminId,
      firstName,
      lastName,
      email,
      phone,
      ipAddress: ip,
      userAgent,
    },
  })

  const token = signResourceAccessToken(slug, resource.id)
  const secure = process.env.NODE_ENV === 'production'

  setCookie(event, cookieNameForResourceSlug(slug), token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })

  return {
    success: true,
    thankYouMessage: resource.thankYouMessage || 'Thank you! Your resource is ready below.',
  }
})
