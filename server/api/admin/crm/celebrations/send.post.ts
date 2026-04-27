import { requireAdmin } from '../../../../utils/auth'
import { getAdminIdForCreate, requireTenantAccess } from '../../../../utils/tenant'
import { sendEmail, generateEmailTemplate } from '../../../../utils/email'
import {
  CELEBRATION_KINDS,
  buildVars,
  getEffectiveTemplate,
  renderTemplate,
  type CelebrationKind,
} from '../../../../utils/celebrations'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

/**
 * POST /api/admin/crm/celebrations/send
 * Body: { clientId, kind, mode?: 'auto' | 'custom', subject?, body? }
 *
 *   • mode='auto'   → use tenant template (or default), render placeholders, send & log
 *   • mode='custom' → use admin-supplied subject/body verbatim, render placeholders, send & log
 *
 * Returns { success, log } so the UI can show "Sent ✓ at hh:mm".
 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const adminId = getAdminIdForCreate(user)
    const body = (await readBody(event)) || {}

    const clientId = parseInt(String(body.clientId || 0), 10)
    const kind = String(body.kind || '') as CelebrationKind
    const mode = (body.mode === 'custom' ? 'custom' : 'auto') as 'auto' | 'custom'
    if (!clientId) throw createError({ statusCode: 400, message: 'clientId is required' })
    if (!CELEBRATION_KINDS.includes(kind)) throw createError({ statusCode: 400, message: 'Invalid celebration kind' })

    const client = await prisma.crmClient.findUnique({ where: { id: clientId } })
    if (!client) throw createError({ statusCode: 404, message: 'Client not found' })
    requireTenantAccess(user, client.adminId)

    if (!client.email) {
      throw createError({ statusCode: 400, message: 'Client has no email on file' })
    }

    const settings = await prisma.celebrationSettings.findUnique({ where: { adminId } })
    const fullAdmin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { firstName: true, lastName: true, email: true },
    })
    if (!fullAdmin) throw createError({ statusCode: 500, message: 'Admin record not found' })

    const eff = getEffectiveTemplate(kind, settings)
    const vars = buildVars(client, fullAdmin)

    const subjectTemplate = mode === 'custom' && body.subject ? String(body.subject) : eff.subject
    const bodyTemplate = mode === 'custom' && body.body ? String(body.body) : eff.body
    const subject = renderTemplate(subjectTemplate, vars)
    const renderedBody = renderTemplate(bodyTemplate, vars)
    const html = generateEmailTemplate(renderedBody, { title: subject })

    let status: 'ok' | 'failed' = 'ok'
    let error: string | null = null
    try {
      const ok = await sendEmail({ to: client.email, subject, html })
      if (!ok) { status = 'failed'; error = 'sendEmail returned false' }
    } catch (e: any) {
      status = 'failed'; error = e?.message || 'Unknown send error'
    }

    const log = await prisma.celebrationLog.create({
      data: {
        adminId,
        clientId: client.id,
        kind,
        subject,
        body: renderedBody,
        mode,
        status,
        error: error || undefined,
      },
    })

    if (status === 'failed') {
      throw createError({ statusCode: 502, message: `Failed to send: ${error}` })
    }
    return { success: true, log }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
