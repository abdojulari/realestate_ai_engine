import { defineEventHandler, readBody, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import nodemailer from 'nodemailer'
import { resolveTenantFromRequest } from '../../utils/tenant'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    name: string
    email: string
    phone?: string
    message?: string
    conversationLog?: Array<{ role: string; content: string }>
  }>(event)

  // Validate required fields
  if (!body.name?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Name is required'
    })
  }

  if (!body.email?.trim() || !isValidEmail(body.email)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Valid email is required'
    })
  }

  // Resolve tenant
  const adminId = await resolveTenantFromRequest(event)

  // Save lead to database
  const lead = await prisma.chatLead.create({
    data: {
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      phone: body.phone?.trim() || null,
      message: body.message?.trim() || null,
      conversationLog: (body.conversationLog || null) as any,
      source: 'chat_widget',
      status: 'new',
      ...(adminId ? { adminId } : {})
    }
  })

  // Send email notification to agent
  try {
    await sendLeadNotification({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      message: lead.message,
      conversationLog: body.conversationLog
    })
  } catch (emailError) {
    console.error('Failed to send lead notification email:', emailError)
    // Don't throw - lead is saved, email is secondary
  }

  return {
    success: true,
    message: 'Thank you! An agent will be in touch shortly.',
    leadId: lead.id
  }
})

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function sendLeadNotification(lead: {
  name: string
  email: string
  phone: string | null
  message: string | null
  conversationLog?: Array<{ role: string; content: string }>
}) {
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
  const to = process.env.AGENT_EMAIL || process.env.SMTP_USERNAME

  // Format conversation log if present
  let conversationHtml = ''
  if (lead.conversationLog?.length) {
    conversationHtml = `
      <h3 style="color: #334155; margin-top: 24px;">Chat Conversation</h3>
      <div style="background: #f8fafc; padding: 16px; border-radius: 8px; font-size: 14px;">
        ${lead.conversationLog.map(msg => `
          <p style="margin: 8px 0;">
            <strong style="color: ${msg.role === 'user' ? '#1e40af' : '#166534'};">
              ${msg.role === 'user' ? 'Visitor' : 'Concierge'}:
            </strong>
            ${msg.content}
          </p>
        `).join('')}
      </div>
    `
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 22px;">New Chat Lead</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">From AO Concierge Widget</p>
      </div>
      <div style="background: white; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
        <h3 style="color: #334155; margin-top: 0;">Contact Information</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; width: 100px;">Name:</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: 600;">${lead.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Email:</td>
            <td style="padding: 8px 0;"><a href="mailto:${lead.email}" style="color: #2563eb;">${lead.email}</a></td>
          </tr>
          ${lead.phone ? `
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Phone:</td>
            <td style="padding: 8px 0;"><a href="tel:${lead.phone}" style="color: #2563eb;">${lead.phone}</a></td>
          </tr>
          ` : ''}
        </table>
        
        ${lead.message ? `
          <h3 style="color: #334155; margin-top: 24px;">Message</h3>
          <p style="color: #475569; line-height: 1.6; background: #f8fafc; padding: 16px; border-radius: 8px;">
            ${lead.message}
          </p>
        ` : ''}
        
        ${conversationHtml}
        
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
          <a href="mailto:${lead.email}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Reply to ${lead.name.split(' ')[0]}
          </a>
        </div>
      </div>
    </div>
  `

  await transporter.sendMail({
    from,
    to,
    subject: `New Chat Lead: ${lead.name}`,
    html
  })
}
