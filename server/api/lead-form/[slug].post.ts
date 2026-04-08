import { readBody, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { upsertCrmClientFromPlatformContact } from '../../utils/crmClientSync'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

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

  return {
    success: true,
    message: form.thankYouMessage || 'Thank you! We will be in touch shortly.',
  }
})
