/**
 * Cron: send email reminders for document important dates (e.g. financing condition).
 * Call: GET /api/cron/document-date-reminders?secret=YOUR_CRON_SECRET
 * Run daily (e.g. 8:00 AM): 0 8 * * * curl "https://yoursite.com/api/cron/document-date-reminders?secret=xxx"
 */
import { sendEmail } from '../../utils/email'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const cronSecret = process.env.CRON_SECRET || process.env.ALERT_SCHEDULER_SECRET || 'change-me-in-production'
  if (query.secret !== cronSecret) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const alerts = await prisma.documentDateAlert.findMany({
    where: {
      sentAt: null,
      dueDate: { gte: today },
    },
    include: {
      document: {
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      },
    },
  })

  const toSend: typeof alerts = []
  for (const a of alerts) {
    const reminderDate = new Date(a.dueDate)
    reminderDate.setDate(reminderDate.getDate() - a.daysBefore)
    reminderDate.setHours(0, 0, 0, 0)
    if (reminderDate.getTime() <= today.getTime()) {
      toSend.push(a)
    }
  }

  const superAdmins = await prisma.user.findMany({
    where: { role: 'super_admin' },
    select: { email: true },
  })
  const superAdminEmails = superAdmins.map((u) => u.email).filter(Boolean)

  let sent = 0
  for (const alert of toSend) {
    const doc = alert.document
    const ownerEmail = doc?.user?.email
    const recipients: string[] = []
    if (ownerEmail) recipients.push(ownerEmail)
    superAdminEmails.forEach((e) => {
      if (e && !recipients.includes(e)) recipients.push(e)
    })
    if (recipients.length === 0) {
      await prisma.documentDateAlert.update({
        where: { id: alert.id },
        data: { sentAt: new Date() },
      })
      continue
    }

    const dueStr = new Date(alert.dueDate).toLocaleDateString('en-CA', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    const docName = doc?.originalName || 'Document'
    const subject = `Reminder: ${alert.label} – ${docName}`
    const html = `
      <p>This is an automated reminder for an important date set in your document.</p>
      <p><strong>Document:</strong> ${docName}</p>
      <p><strong>Date:</strong> ${alert.label} – <strong>${dueStr}</strong></p>
      <p>You set a reminder ${alert.daysBefore} day(s) before this date. Please review the document and take any required action.</p>
      <p>This reminder was sent to the document owner and super admins.</p>
    `

    const ok = await sendEmail({ to: recipients, subject, html })
    if (ok) {
      await prisma.documentDateAlert.update({
        where: { id: alert.id },
        data: { sentAt: new Date() },
      })
      sent++
    }
  }

  return {
    success: true,
    checked: alerts.length,
    due: toSend.length,
    sent,
  }
})
