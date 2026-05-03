/**
 * Events worker — recomputes lead intelligence + fires automation rules.
 *
 * Two execution modes, same code path (`processEventInline`):
 *   1. Bull queue: `serverEventsWorker.ts` boot plugin registers
 *      a Bull processor that calls processEventInline.
 *   2. Inline: `recordEventFromBrowser` falls back to direct invocation
 *      when Redis isn't available (single-instance dev).
 *
 * What it does for every event:
 *   • Resolves a CrmClient (by visitor.crmClientId, then by email).
 *   • Adds the event's score weight to leadScore (capped at MAX_LEAD_SCORE).
 *   • Updates intent + lifecycleStage using rule-based heuristics.
 *   • Touches lastTouchAt (and firstTouchAt on first touch).
 *   • Evaluates AutomationRules and calls `executeAutomationAction`
 *     for each that matches and isn't on cooldown.
 *
 * Pure rule-based today; Phase 4 swaps the rule classifier for
 * Gemini on long free-text and TF.js for scoring once we have data.
 */
import { PrismaClient, Prisma } from '@prisma/client'
import {
  EVENT_NAMES,
  SCORE_WEIGHTS,
  MAX_LEAD_SCORE,
  SCORE_LOOKBACK_DAYS,
} from './eventConstants'
import type { EventJobPayload } from './eventsQueue'
import { evaluateAutomationRules } from './automationEngine'
import { classifyIntent } from './intentClassifier'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

const CONVERSION_EVENTS = new Set<string>([
  EVENT_NAMES.LEAD_CREATED,
  EVENT_NAMES.ESTIMATE_REQUESTED,
  EVENT_NAMES.INQUIRY_SENT,
  EVENT_NAMES.NEWSLETTER_SUBSCRIBED,
  EVENT_NAMES.RESOURCE_UNLOCK,
  EVENT_NAMES.FORM_SUBMITTED,
])

const SELLER_KEYWORDS = ['sell', 'list', 'value', 'estimate', 'appraisal', 'cma', 'home worth']
const BUYER_KEYWORDS = ['buy', 'purchase', 'mortgage', 'preapproval', 'pre-approval', 'showing', 'viewing']
const RENTER_KEYWORDS = ['rent', 'lease', 'tenant']
const INVESTOR_KEYWORDS = ['invest', 'roi', 'cash flow', 'cap rate', 'investor']

/**
 * Lightweight rule-based intent inference.
 *
 * Phase 4 augments this with a Gemini call for free-text contact-form
 * messages — see `intentClassifier.ts`. The rule version always runs
 * first because it's free, instant, and "good enough" to drive the
 * basic automation rules.
 */
function inferIntent(
  name: string,
  properties: Record<string, unknown> | null,
  objectType?: string | null
): string | null {
  if (name === EVENT_NAMES.ESTIMATE_REQUESTED) return 'seller'
  if (name === EVENT_NAMES.INQUIRY_SENT || name === EVENT_NAMES.LISTING_VIEW) return 'buyer'
  if (objectType === 'property') return 'buyer'
  if (objectType === 'estimate') return 'seller'

  const text = (
    (properties?.message as string) ||
    (properties?.formName as string) ||
    (properties?.path as string) ||
    ''
  ).toLowerCase()
  if (!text) return null
  if (SELLER_KEYWORDS.some((k) => text.includes(k))) return 'seller'
  if (BUYER_KEYWORDS.some((k) => text.includes(k))) return 'buyer'
  if (RENTER_KEYWORDS.some((k) => text.includes(k))) return 'renter'
  if (INVESTOR_KEYWORDS.some((k) => text.includes(k))) return 'investor'
  return null
}

/**
 * Promote lifecycle stage if the new event warrants it. We never
 * downgrade automatically (a returning client shouldn't drop back to "lead").
 */
function nextLifecycleStage(current: string | null | undefined, eventName: string, score: number): string | null {
  const stages = ['visitor', 'lead', 'engaged', 'qualified', 'client']
  const idx = current ? stages.indexOf(current) : 0
  let target = idx < 0 ? 0 : idx
  if (CONVERSION_EVENTS.has(eventName)) target = Math.max(target, 1)
  if (score >= 30) target = Math.max(target, 2)
  if (score >= 70) target = Math.max(target, 3)
  const next = stages[target]
  return next === current ? null : next || null
}

/**
 * Find or attach a CrmClient for this event.
 * Priority:
 *   1. visitor.crmClientId  (already-identified visitor)
 *   2. CrmClient lookup by email (links visitor -> crmClientId on hit)
 */
async function resolveCrmClient(
  payload: EventJobPayload
): Promise<{ id: number; adminId: number | null; lifecycleStage: string | null; leadScore: number } | null> {
  if (payload.visitorId) {
    const visitor = await prisma.visitor.findUnique({
      where: { id: payload.visitorId },
      select: { crmClientId: true },
    })
    if (visitor?.crmClientId) {
      const client = await prisma.crmClient.findUnique({
        where: { id: visitor.crmClientId },
        select: { id: true, adminId: true, lifecycleStage: true, leadScore: true },
      })
      if (client) return client
    }
  }

  if (payload.email && payload.adminId) {
    const client = await prisma.crmClient.findUnique({
      where: { adminId_email: { adminId: payload.adminId, email: payload.email } },
      select: { id: true, adminId: true, lifecycleStage: true, leadScore: true },
    })
    if (client) {
      // Stitch the visitor to the identified client for future events.
      if (payload.visitorId) {
        await prisma.visitor
          .update({
            where: { id: payload.visitorId },
            data: { crmClientId: client.id },
          })
          .catch(() => undefined)
      }
      return client
    }
  }

  return null
}

/**
 * Decay the score before applying the new event's weight: any event
 * older than SCORE_LOOKBACK_DAYS no longer counts. This keeps "Hot
 * Leads" actually hot and prevents a contact from staying at 100 forever.
 */
async function recomputeScoreFromHistory(crmClientId: number, adminId: number | null): Promise<number> {
  if (!adminId) return 0
  const since = new Date(Date.now() - SCORE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)

  // Pull recent events for either the linked visitor(s) or the email.
  // Limit hard so a single bot can't OOM the worker.
  const visitors = await prisma.visitor.findMany({
    where: { crmClientId },
    select: { id: true },
  })
  const visitorIds = visitors.map((v) => v.id)

  const client = await prisma.crmClient.findUnique({
    where: { id: crmClientId },
    select: { email: true },
  })

  const events = await prisma.eventLog.findMany({
    where: {
      adminId,
      createdAt: { gte: since },
      OR: [
        ...(visitorIds.length ? [{ visitorId: { in: visitorIds } }] : []),
        ...(client?.email ? [{ email: client.email }] : []),
      ],
    },
    select: { name: true },
    take: 500,
    orderBy: { createdAt: 'desc' },
  })

  let total = 0
  for (const e of events) total += SCORE_WEIGHTS[e.name] ?? 0
  return Math.min(MAX_LEAD_SCORE, total)
}

/**
 * Main entry point. Idempotent — safe to retry.
 */
export async function processEventInline(payload: EventJobPayload): Promise<void> {
  // Stage A: cheap rule-based intent.
  let inferredIntent: string | null = inferIntent(payload.name, payload.properties, payload.objectType)

  // Stage B: when there's a meaningful free-text message and Gemini is
  // configured, upgrade the intent classification. Falls back to the rule
  // result on any error / when the API key is missing.
  // Only runs on conversion events to keep the Gemini bill bounded.
  if (CONVERSION_EVENTS.has(payload.name)) {
    const text = (payload.properties as any)?.message
    if (typeof text === 'string' && text.trim().length >= 30) {
      try {
        const llmIntent = await classifyIntent(text)
        if (llmIntent && llmIntent !== 'other') inferredIntent = llmIntent
      } catch (err) {
        console.warn('[eventsWorker] gemini intent failed, keeping rule result', err)
      }
    }
  }

  // Stage 1 — update CrmClient if we can resolve one.
  const client = await resolveCrmClient(payload)
  if (client && client.adminId) {
    const newScore = await recomputeScoreFromHistory(client.id, client.adminId)
    const stage = nextLifecycleStage(client.lifecycleStage, payload.name, newScore)
    const data: Prisma.CrmClientUpdateInput = {
      leadScore: newScore,
      lastTouchAt: new Date(),
    }
    if (inferredIntent) data.intent = inferredIntent
    if (stage) data.lifecycleStage = stage
    // firstTouchAt set only if absent
    await prisma.crmClient
      .update({
        where: { id: client.id },
        data: {
          ...data,
          firstTouchAt: { set: undefined } as any,
        },
      })
      .catch(async () => {
        // Fallback for environments where the conditional `set: undefined`
        // is rejected — just write everything.
        await prisma.crmClient.update({ where: { id: client.id }, data })
      })
    // Set firstTouchAt only when null.
    await prisma.crmClient
      .updateMany({
        where: { id: client.id, firstTouchAt: null },
        data: { firstTouchAt: new Date() },
      })
      .catch(() => undefined)
  }

  // Stage 2 — automation rules.
  if (payload.adminId) {
    try {
      await evaluateAutomationRules({
        adminId: payload.adminId,
        eventPayload: payload,
        crmClient: client
          ? { id: client.id, leadScore: client.leadScore, lifecycleStage: client.lifecycleStage }
          : null,
        inferredIntent,
      })
    } catch (err) {
      console.error('[eventsWorker] automation engine error', err)
    }
  }
}
