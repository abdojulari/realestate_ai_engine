/**
 * POST /api/admin/automation-rules/seed-defaults
 *
 * Seeds three sane starter rules for a tenant. Idempotent — checks for
 * a unique-name match per tenant before inserting so re-running is safe.
 *
 * Defaults:
 *   1. "Hot lead alert"            — score >= 70  -> notify agent
 *   2. "New inquiry — instant ack" — inquiry_sent -> email lead (immediate ack)
 *   3. "Seller intent surfaced"    — intent=seller -> tag CRM "potential_seller"
 */
import { defineEventHandler, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import { getAdminIdForCreate } from '../../../utils/tenant'
import { invalidateAutomationCache } from '../../../utils/automationEngine'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

interface SeedDef {
  name: string
  description: string
  trigger: any
  action: any
  cooldownSeconds: number | null
}

const DEFAULTS: SeedDef[] = [
  {
    name: 'Hot lead alert',
    description: 'Email the agent the moment a contact crosses score 70 (high engagement).',
    trigger: { type: 'score', operator: '>=', value: 70 },
    action: {
      type: 'notify_admin',
      message:
        'Hot lead alert: {{email}} reached score {{leadScore}} after {{eventName}}. Consider reaching out within the hour.',
    },
    cooldownSeconds: 60 * 60 * 24, // once per visitor per day
  },
  {
    name: 'New inquiry — instant ack',
    description: 'Send the lead a friendly acknowledgement the second they submit a property inquiry.',
    trigger: { type: 'event', event: 'inquiry_sent' },
    action: {
      type: 'email',
      to: 'lead',
      subject: 'Thanks for getting in touch',
      body:
        "Hi {{name}},\n\nThanks for reaching out about a property on our site. I've received your message and will personally get back to you within a few hours.\n\nIn the meantime, feel free to reply to this email with any other details.\n\n— Your Realtor",
    },
    cooldownSeconds: null,
  },
  {
    name: 'Seller intent surfaced',
    description: 'Tag a CRM contact as "potential_seller" the moment we infer seller intent.',
    trigger: { type: 'intent', value: 'seller' },
    action: { type: 'crm_tag', tag: 'potential_seller' },
    cooldownSeconds: 60 * 60 * 24 * 30, // once per month
  },
]

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const adminId = getAdminIdForCreate(user)

    const existing = await prisma.automationRule.findMany({
      where: { adminId, name: { in: DEFAULTS.map((d) => d.name) } },
      select: { name: true },
    })
    const existingNames = new Set(existing.map((r) => r.name))
    const toCreate = DEFAULTS.filter((d) => !existingNames.has(d.name))

    if (toCreate.length === 0) {
      return { created: 0, message: 'All defaults already present.' }
    }

    await prisma.$transaction(
      toCreate.map((d) =>
        prisma.automationRule.create({
          data: {
            adminId,
            name: d.name,
            description: d.description,
            enabled: true,
            trigger: d.trigger,
            action: d.action,
            cooldownSeconds: d.cooldownSeconds,
          },
        })
      )
    )

    invalidateAutomationCache(adminId)
    return { created: toCreate.length, message: `Seeded ${toCreate.length} default rule(s).` }
  } catch (error: any) {
    if (error?.statusCode) throw error
    throw createError({ statusCode: 500, statusMessage: error?.message || 'Failed to seed defaults' })
  }
})
