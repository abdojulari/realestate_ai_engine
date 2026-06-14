import { resolveAnonymousSubmitTenantAdminId } from '../../utils/tenant'
import { upsertCrmClientFromPlatformContact } from '../../utils/crmClientSync'
import { sendMetaEvent, newMetaEventId } from '../../utils/metaPixel'
import { recordServerEvent } from '../../utils/eventsRecorder'
import { EVENT_NAMES } from '../../utils/eventConstants'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { email, firstName, lastName, source = 'website', _metaEventId } = body || {}

    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return {
        success: false,
        message: 'Please provide a valid email address'
      }
    }

    // Strict tenant attribution (Host → Referer → Origin → dev-only fallback).
    // Refuse to create a subscriber with null adminId or silently attribute to
    // the "first admin in DB" — both are tenant leaks.
    const adminId = await resolveAnonymousSubmitTenantAdminId(event)
    if (adminId == null) {
      return {
        success: false,
        message:
          'Could not determine which brokerage you are subscribing to. Please subscribe from the brokerage website.',
      }
    }
    const metaEventId: string = _metaEventId || newMetaEventId()

    // Get IP and user agent for tracking
    const headers = getHeaders(event)
    const ipAddress = headers['x-forwarded-for'] || headers['x-real-ip'] || 'unknown'
    const userAgent = headers['user-agent'] || 'unknown'

    // Check if subscriber already exists for this tenant (adminId + email uniqueness)
    const existingSubscriber = await prisma.newsletterSubscriber.findFirst({
      where: { email: email.toLowerCase(), adminId }
    })

    if (existingSubscriber) {
      // If they were unsubscribed, reactivate them
      if (existingSubscriber.status === 'unsubscribed') {
        const updated = await prisma.newsletterSubscriber.update({
          where: { id: existingSubscriber.id },
          data: {
            status: 'active',
            subscribedAt: new Date(),
            firstName: firstName || existingSubscriber.firstName,
            lastName: lastName || existingSubscriber.lastName,
            source,
            ipAddress,
            userAgent
          }
        })

        await upsertCrmClientFromPlatformContact(prisma, {
          adminId,
          email: updated.email,
          firstName: updated.firstName || undefined,
          lastName: updated.lastName || undefined,
          source: 'newsletter',
          sourceId: updated.id,
        })

        void sendMetaEvent({
          adminId,
          eventName: 'Subscribe',
          eventId: metaEventId,
          event,
          userData: {
            email: updated.email,
            firstName: updated.firstName,
            lastName: updated.lastName,
          },
          customData: {
            contentName: 'Newsletter',
            contentCategory: 'newsletter',
          },
        })

        return {
          success: true,
          message: 'Welcome back! You have been resubscribed to our newsletter.',
          _metaEventId: metaEventId,
        }
      }

      return {
        success: true,
        message: 'You are already subscribed to our newsletter.',
        _metaEventId: metaEventId,
      }
    }

    // Create new subscriber
    const created = await prisma.newsletterSubscriber.create({
      data: {
        email: email.toLowerCase(),
        firstName,
        lastName,
        status: 'active',
        source,
        ipAddress,
        userAgent,
        adminId,
      }
    })

    await upsertCrmClientFromPlatformContact(prisma, {
      adminId,
      email: created.email,
      firstName: created.firstName || undefined,
      lastName: created.lastName || undefined,
      source: 'newsletter',
      sourceId: created.id,
    })

    void sendMetaEvent({
      adminId,
      eventName: 'Subscribe',
      eventId: metaEventId,
      event,
      userData: {
        email: created.email,
        firstName: created.firstName,
        lastName: created.lastName,
      },
      customData: {
        contentName: 'Newsletter',
        contentCategory: 'newsletter',
      },
    })

    void recordServerEvent(event, {
      adminId,
      name: EVENT_NAMES.NEWSLETTER_SUBSCRIBED,
      email: created.email,
      objectType: 'newsletter',
      objectId: created.id,
      properties: {
        formName: 'newsletter',
        source,
        firstName: created.firstName,
        lastName: created.lastName,
      },
    })

    return {
      success: true,
      message: 'Thank you for subscribing! You will receive our curated property collections and market insights.',
      _metaEventId: metaEventId,
    }
  } catch (error) {
    console.error('Newsletter subscription error:', error)
    return {
      success: false,
      message: 'An error occurred while subscribing. Please try again later.'
    }
  }
})
