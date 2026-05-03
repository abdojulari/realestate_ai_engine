import { readBody, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { upsertCrmClientFromPlatformContact } from '../../utils/crmClientSync'
import { sendMetaEvent, newMetaEventId } from '../../utils/metaPixel'
import { recordServerEvent } from '../../utils/eventsRecorder'
import { EVENT_NAMES } from '../../utils/eventConstants'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma
export default defineEventHandler(async (event) => {
  const slug = event.context.params?.slug
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'Missing form slug' })

  const form = await prisma.leadForm.findUnique({ where: { slug } })
  if (!form || form.status !== 'active') {
    throw createError({ statusCode: 404, statusMessage: 'Form not found or inactive' })
  }

  const body = await readBody(event)

  if (!body.name || !body.email) {
    throw createError({ statusCode: 400, statusMessage: 'Name and email are required' })
  }

  const lead = await prisma.chatLead.create({
    data: {
      adminId: form.adminId,
      name: body.name,
      email: body.email,
      phone: body.phone || null,
      message: body.message || null,
      source: 'lead_form',
      status: 'new',
      conversationLog: { formId: form.id, formTitle: form.title, formSlug: slug },
    },
  })

  await upsertCrmClientFromPlatformContact(prisma, {
    adminId: form.adminId,
    email: lead.email,
    fullName: lead.name,
    phone: lead.phone,
    source: 'lead_form',
    sourceId: lead.id,
  })

  await prisma.leadForm.update({
    where: { id: form.id },
    data: { submissions: { increment: 1 } },
  })

  // Meta CAPI Lead — surface the form title so realtors can segment in
  // Events Manager (e.g. "Buying funnel" vs "Seller funnel" forms).
  const metaEventId = body._metaEventId || newMetaEventId()
  const [firstName, ...rest] = (lead.name || '').trim().split(/\s+/)
  void sendMetaEvent({
    adminId: form.adminId,
    eventName: 'Lead',
    eventId: metaEventId,
    event,
    userData: {
      email: lead.email,
      phone: lead.phone,
      firstName: firstName || undefined,
      lastName: rest.length ? rest.join(' ') : undefined,
    },
    customData: {
      contentName: form.title,
      contentCategory: 'lead_form',
      contentIds: [form.id],
    },
  })

  void recordServerEvent(event, {
    adminId: form.adminId,
    name: EVENT_NAMES.FORM_SUBMITTED,
    email: lead.email,
    objectType: 'lead_form',
    objectId: form.id,
    properties: {
      formName: form.title,
      formSlug: slug,
      message: lead.message,
      name: lead.name,
    },
  })

  return {
    success: true,
    message: form.thankYouMessage || 'Thank you! We will be in touch shortly.',
    _metaEventId: metaEventId,
  }
})
