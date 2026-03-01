import { H3Event } from 'h3'
import path from 'path'
import fs from 'fs'
import { requireAdmin } from '../../../../utils/auth'
import { sendEmail, generateEmailTemplate, isValidEmail } from '../../../../utils/email'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

/**
 * POST /api/admin/documents/:id/email
 *
 * Send a document as an email attachment to a CRM contact.
 *
 * Body:
 *  - recipientEmail: string (required)
 *  - recipientName: string (optional)
 *  - subject: string (optional, defaults to "Document: <filename>")
 *  - message: string (optional, custom message body)
 */
export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAdmin(event)

  const id = parseInt(event.context.params?.id || '0')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid document ID' })
  }

  const body = await readBody(event)
  const recipientEmail = (body.recipientEmail || '').trim()
  const recipientName = (body.recipientName || '').trim()
  const customSubject = (body.subject || '').trim()
  const customMessage = (body.message || '').trim()

  if (!recipientEmail || !isValidEmail(recipientEmail)) {
    throw createError({ statusCode: 400, statusMessage: 'A valid recipient email is required.' })
  }

  // Fetch the document owned by this admin
  const document = await prisma.document.findFirst({
    where: { id, userId: user.id },
  })

  if (!document) {
    throw createError({ statusCode: 404, statusMessage: 'Document not found' })
  }

  // Resolve the file on disk
  const absolutePath = path.join(process.cwd(), 'public', document.filePath)
  if (!fs.existsSync(absolutePath)) {
    throw createError({ statusCode: 404, statusMessage: 'Document file not found on server' })
  }

  const fileBuffer = fs.readFileSync(absolutePath)
  const ext = (document.type || 'pdf').toLowerCase()
  const mimeType = ext === 'pdf' ? 'application/pdf' : 'application/octet-stream'

  // Build email content
  const senderName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'AgentOS'
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hello,'
  const messageBody = customMessage
    || `Please find the attached document for your review.`

  const htmlContent = generateEmailTemplate(
    `
      <p>${greeting}</p>
      <p>${messageBody.replace(/\n/g, '<br>')}</p>
      <p style="margin-top: 20px; color: #666; font-size: 14px;">
        Sent by <strong>${senderName}</strong> via AgentOS Document Management.
      </p>
    `,
    {
      title: customSubject || `Document: ${document.originalName}`,
      footerText: 'This document was shared with you by your real estate professional.',
    }
  )

  const subject = customSubject || `Document: ${document.originalName}`

  try {
    const sent = await sendEmail({
      to: recipientEmail,
      subject,
      html: htmlContent,
      attachments: [
        {
          filename: document.originalName,
          content: fileBuffer,
          contentType: mimeType,
        },
      ],
    })

    if (!sent) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to send email. Please check SMTP settings.' })
    }

    return {
      success: true,
      message: `Document sent to ${recipientEmail}`,
    }
  } catch (error: any) {
    console.error('[document-email] Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || error.message || 'Failed to send email',
    })
  }
})
