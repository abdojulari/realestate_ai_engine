import { defineEventHandler, readBody } from 'h3'
import { PrismaClient } from '@prisma/client'
import nodemailer from 'nodemailer'
import { resolveTenantFromRequest } from '../utils/tenant'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const body = await readBody<{ firstName:string; lastName:string; email:string; phone?:string; message:string }>(event)

  // Resolve tenant
  const adminId = await resolveTenantFromRequest(event)

  const runtime = useRuntimeConfig()

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOSTNAME || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USERNAME,
      pass: process.env.SMTP_PASSWORD
    }
  })

  const from = process.env.SMTP_SENDER || process.env.SMTP_USERNAME

  // Try to save as a ChatLead for the tenant
  try {
    await prisma.chatLead.create({
      data: {
        name: `${body.firstName} ${body.lastName}`.trim(),
        email: body.email,
        phone: body.phone || null,
        message: body.message,
        source: 'contact_form',
        status: 'new',
        ...(adminId ? { adminId } : {})
      }
    })
  } catch (err) {
    console.error('Failed to save contact as lead:', err)
    // Don't fail the request if lead save fails
  }

  await transporter.sendMail({
    from,
    to: process.env.SMTP_USERNAME,
    subject: `Website Contact: ${body.firstName} ${body.lastName}`,
    text: `${body.message}\n\nFrom: ${body.firstName} ${body.lastName}\nEmail: ${body.email}\nPhone: ${body.phone || ''}`
  })

  return { ok: true }
})


