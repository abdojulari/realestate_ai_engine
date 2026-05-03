import { readBody, createError, setCookie, getRequestIP, getRequestHeader } from 'h3'
import { PrismaClient } from '@prisma/client'
import {
  cookieNameForResourceSlug,
  signResourceAccessToken,
} from '../../../../utils/marketingResourceStorage'
import { sendMetaEvent, newMetaEventId } from '../../../../utils/metaPixel'
import { recordServerEvent } from '../../../../utils/eventsRecorder'
import { EVENT_NAMES } from '../../../../utils/eventConstants'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma
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
  // Secure cookies are not sent over plain HTTP. Production behind TLS (or localhost HTTPS) must use https
  // or the browser drops the cookie and the PDF iframe gets 403 on /file.
  const forwardedProto = getRequestHeader(event, 'x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase()
  const tlsDirect = Boolean((event.node.req as { socket?: { encrypted?: boolean } }).socket?.encrypted)
  const isHttps = forwardedProto === 'https' || (forwardedProto !== 'http' && tlsDirect)
  const secure = process.env.NODE_ENV === 'production' && isHttps

  setCookie(event, cookieNameForResourceSlug(slug), token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })

  // Meta CAPI Lead — PDF gates are explicit lead magnets.
  const metaEventId = body?._metaEventId || newMetaEventId()
  void sendMetaEvent({
    adminId: resource.adminId,
    eventName: 'Lead',
    eventId: metaEventId,
    event,
    userData: { email, phone, firstName, lastName },
    customData: {
      contentName: resource.title,
      contentCategory: 'resource_download',
      contentIds: [resource.id],
    },
  })

  void recordServerEvent(event, {
    adminId: resource.adminId,
    name: EVENT_NAMES.RESOURCE_UNLOCK,
    email,
    objectType: 'resource',
    objectId: resource.id,
    properties: {
      resourceTitle: resource.title,
      resourceSlug: slug,
      formName: 'resource_download',
      firstName,
      lastName,
    },
  })

  return {
    success: true,
    thankYouMessage: resource.thankYouMessage || 'Thank you! Your resource is ready below.',
    _metaEventId: metaEventId,
  }
})
