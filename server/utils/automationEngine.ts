/**
 * Automation rule engine.
 *
 * Called by the events worker for every event. Loads enabled rules
 * for the tenant (cached for 60s), evaluates each trigger, and runs
 * the matching action via `executeAutomationAction`.
 *
 * Design notes:
 *   • Cooldown per (rule, visitor) prevents an identified contact from
 *     re-triggering the same rule on every page view.
 *   • Cache is per-process. With multiple Nitro workers each holds its
 *     own copy; that's fine because rules change rarely and the cache
 *     is invalidated explicitly by the admin CRUD endpoints (see
 *     `invalidateAutomationCache`).
 */
import { PrismaClient } from '@prisma/client'
import type { EventJobPayload } from './eventsQueue'
import { executeAutomationAction } from './automationActions'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

interface CachedRule {
  id: number
  adminId: number
  name: string
  enabled: boolean
  trigger: any
  action: any
  cooldownSeconds: number | null
}

const CACHE_TTL_MS = 60 * 1000
const ruleCache = new Map<number, { fetchedAt: number; rules: CachedRule[] }>()

export function invalidateAutomationCache(adminId?: number): void {
  if (adminId == null) {
    ruleCache.clear()
    return
  }
  ruleCache.delete(adminId)
}

async function getRules(adminId: number): Promise<CachedRule[]> {
  const hit = ruleCache.get(adminId)
  if (hit && Date.now() - hit.fetchedAt < CACHE_TTL_MS) return hit.rules
  const rows = await prisma.automationRule.findMany({
    where: { adminId, enabled: true },
    select: {
      id: true,
      adminId: true,
      name: true,
      enabled: true,
      trigger: true,
      action: true,
      cooldownSeconds: true,
    },
  })
  ruleCache.set(adminId, { fetchedAt: Date.now(), rules: rows as CachedRule[] })
  return rows as CachedRule[]
}

/** Trigger schema:
 *   { type: "event",  event: "form_submitted", filters?: { objectType?, ... } }
 *   { type: "score",  operator: ">=" | ">" | "==", value: number }
 *   { type: "intent", value: "buyer" | "seller" | ... }
 *   { type: "any",    triggers: Trigger[] }   – OR
 *   { type: "all",    triggers: Trigger[] }   – AND
 */
function matchesTrigger(
  trigger: any,
  ctx: {
    event: EventJobPayload
    crmClient: { leadScore: number; lifecycleStage: string | null } | null
    inferredIntent: string | null
  }
): boolean {
  if (!trigger || typeof trigger !== 'object') return false
  switch (trigger.type) {
    case 'event': {
      if (trigger.event && trigger.event !== ctx.event.name) return false
      if (trigger.filters?.objectType && ctx.event.objectType !== trigger.filters.objectType) return false
      return true
    }
    case 'score': {
      if (!ctx.crmClient) return false
      const v = Number(trigger.value)
      const s = ctx.crmClient.leadScore || 0
      switch (trigger.operator) {
        case '>': return s > v
        case '>=': return s >= v
        case '==': return s === v
        case '<': return s < v
        case '<=': return s <= v
        default: return false
      }
    }
    case 'intent': {
      const intent = ctx.inferredIntent
      return !!intent && intent === trigger.value
    }
    case 'lifecycle': {
      if (!ctx.crmClient) return false
      return ctx.crmClient.lifecycleStage === trigger.value
    }
    case 'any': {
      const list = Array.isArray(trigger.triggers) ? trigger.triggers : []
      return list.some((t: any) => matchesTrigger(t, ctx))
    }
    case 'all': {
      const list = Array.isArray(trigger.triggers) ? trigger.triggers : []
      return list.every((t: any) => matchesTrigger(t, ctx))
    }
    default:
      return false
  }
}

async function isOnCooldown(rule: CachedRule, visitorId: number | null, email: string | null): Promise<boolean> {
  if (!rule.cooldownSeconds || rule.cooldownSeconds <= 0) return false
  const since = new Date(Date.now() - rule.cooldownSeconds * 1000)
  // Look at the most recent successful run for this rule + identifier.
  const last = await prisma.automationRunLog.findFirst({
    where: {
      ruleId: rule.id,
      status: 'success',
      OR: [
        ...(visitorId ? [{ visitorId }] : []),
        ...(email ? [{ email }] : []),
      ],
      createdAt: { gte: since },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })
  return !!last
}

export async function evaluateAutomationRules(args: {
  adminId: number
  eventPayload: EventJobPayload
  crmClient: { id: number; leadScore: number; lifecycleStage: string | null } | null
  inferredIntent: string | null
}): Promise<void> {
  const { adminId, eventPayload, crmClient, inferredIntent } = args
  const rules = await getRules(adminId)
  if (rules.length === 0) return

  for (const rule of rules) {
    if (!matchesTrigger(rule.trigger, { event: eventPayload, crmClient, inferredIntent })) continue

    if (await isOnCooldown(rule, eventPayload.visitorId, eventPayload.email)) {
      await prisma.automationRunLog
        .create({
          data: {
            ruleId: rule.id,
            adminId,
            visitorId: eventPayload.visitorId ?? undefined,
            email: eventPayload.email ?? undefined,
            status: 'skipped_cooldown',
            message: `cooldown ${rule.cooldownSeconds}s`,
          },
        })
        .catch(() => undefined)
      continue
    }

    try {
      const message = await executeAutomationAction({
        adminId,
        action: rule.action,
        eventPayload,
        crmClientId: crmClient?.id ?? null,
        inferredIntent,
      })
      await prisma.$transaction([
        prisma.automationRule.update({
          where: { id: rule.id },
          data: { fireCount: { increment: 1 }, lastFiredAt: new Date() },
        }),
        prisma.automationRunLog.create({
          data: {
            ruleId: rule.id,
            adminId,
            visitorId: eventPayload.visitorId ?? undefined,
            email: eventPayload.email ?? undefined,
            status: 'success',
            message,
          },
        }),
      ])
    } catch (err: any) {
      console.error(`[automationEngine] rule ${rule.id} failed`, err)
      await prisma.automationRunLog
        .create({
          data: {
            ruleId: rule.id,
            adminId,
            visitorId: eventPayload.visitorId ?? undefined,
            email: eventPayload.email ?? undefined,
            status: 'error',
            message: err?.message || String(err),
          },
        })
        .catch(() => undefined)
    }
  }
}
