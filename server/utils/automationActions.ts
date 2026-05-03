/**
 * Automation actions executed by the rule engine.
 *
 * Action shape examples:
 *   { type: "email",        to: "agent" | "lead", subject: "...", body: "..." }
 *   { type: "notify_admin", message: "Hot lead alert: {{email}}" }
 *   { type: "meta_capi",    event: "Lead", value?: number }
 *   { type: "crm_tag",      tag: "hot" }
 *   { type: "lifecycle",    stage: "qualified" }
 *   { type: "webhook",      url: "https://...", method?: "POST" }
 *
 * Templates support `{{path}}`, `{{email}}`, `{{name}}`,
 * `{{leadScore}}`, `{{intent}}` placeholders.
 *
 * Returns a short message suitable for the AutomationRunLog.
 */
import { PrismaClient } from '@prisma/client'
import { queueEmail } from './emailQueue'
import { sendMetaEvent } from './metaPixel'
import type { EventJobPayload } from './eventsQueue'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

interface ActionContext {
  adminId: number
  action: any
  eventPayload: EventJobPayload
  crmClientId: number | null
  inferredIntent: string | null
}

function interpolate(template: string, vars: Record<string, string | number | null | undefined>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const v = vars[key]
    return v === undefined || v === null ? '' : String(v)
  })
}

async function getTenantContacts(adminId: number): Promise<{ agentEmail: string | null; tenantName: string | null }> {
  // TenantSettings stores the public-facing email under `email` (the column
  // shown on the contact page). When that's blank, fall back to the admin's
  // own login email which is always present.
  const settings = await prisma.tenantSettings.findUnique({
    where: { adminId },
    select: { businessName: true, email: true },
  })
  let agentEmail = settings?.email || null
  if (!agentEmail) {
    const admin = await prisma.user.findUnique({ where: { id: adminId }, select: { email: true } })
    agentEmail = admin?.email || null
  }
  return { agentEmail, tenantName: settings?.businessName || null }
}

export async function executeAutomationAction(ctx: ActionContext): Promise<string> {
  const { adminId, action, eventPayload, crmClientId, inferredIntent } = ctx
  if (!action || typeof action !== 'object') return 'noop:invalid action'

  const tplVars = {
    path: eventPayload.properties?.path as string | undefined,
    email: eventPayload.email,
    leadScore: (eventPayload.properties?.leadScore as number) ?? null,
    intent: inferredIntent,
    name: (eventPayload.properties?.name as string) || '',
    eventName: eventPayload.name,
  }

  switch (action.type) {
    case 'email': {
      const tenant = await getTenantContacts(adminId)
      const recipient =
        action.to === 'lead'
          ? eventPayload.email
          : action.to === 'agent'
            ? tenant.agentEmail
            : action.to // explicit address

      if (!recipient) return `email skipped:no ${action.to} address`

      const subject = interpolate(action.subject || `New activity from {{email}}`, tplVars)
      const text = interpolate(action.body || `Event: {{eventName}}\nLead: {{email}}\nPath: {{path}}`, tplVars)
      const html = action.html ? interpolate(action.html, tplVars) : undefined
      await queueEmail({ to: recipient, subject, text, html })
      return `email queued -> ${recipient}`
    }

    case 'notify_admin': {
      const tenant = await getTenantContacts(adminId)
      const to = tenant.agentEmail
      if (!to) return 'notify_admin skipped:no agent email'
      const message = interpolate(action.message || '{{eventName}} fired for {{email}}', tplVars)
      await queueEmail({
        to,
        subject: `🔔 ${tenant.tenantName || 'Realtor'} alert`,
        text: message,
      })
      return `notify_admin queued -> ${to}`
    }

    case 'meta_capi': {
      const result = await sendMetaEvent({
        adminId,
        eventName: action.event || 'Lead',
        userData: { email: eventPayload.email || undefined },
        customData: action.value ? { value: action.value, currency: action.currency || 'CAD' } : undefined,
      } as any)
      return `meta_capi:${result.ok ? 'sent' : result.reason || 'failed'}`
    }

    case 'crm_tag': {
      if (!crmClientId) return 'crm_tag skipped:no client'
      const tag = String(action.tag || '').trim()
      if (!tag) return 'crm_tag skipped:empty tag'
      const existing = await prisma.crmClient.findUnique({
        where: { id: crmClientId },
        select: { tags: true },
      })
      const current = Array.isArray(existing?.tags) ? (existing!.tags as string[]) : []
      if (current.includes(tag)) return `crm_tag noop:already has ${tag}`
      await prisma.crmClient.update({
        where: { id: crmClientId },
        data: { tags: [...current, tag] as any },
      })
      return `crm_tag added:${tag}`
    }

    case 'lifecycle': {
      if (!crmClientId) return 'lifecycle skipped:no client'
      const stage = String(action.stage || '').trim()
      if (!stage) return 'lifecycle skipped:empty stage'
      await prisma.crmClient.update({
        where: { id: crmClientId },
        data: { lifecycleStage: stage },
      })
      return `lifecycle set:${stage}`
    }

    case 'webhook': {
      const url = String(action.url || '').trim()
      if (!url) return 'webhook skipped:empty url'
      try {
        const res = await fetch(url, {
          method: action.method || 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: eventPayload.name,
            adminId,
            email: eventPayload.email,
            objectType: eventPayload.objectType,
            objectId: eventPayload.objectId,
            properties: eventPayload.properties,
            inferredIntent,
            createdAt: eventPayload.createdAt,
          }),
        })
        return `webhook ${res.status}`
      } catch (err: any) {
        throw new Error(`webhook failed: ${err?.message || err}`)
      }
    }

    default:
      return `noop:unknown action ${action.type}`
  }
}
