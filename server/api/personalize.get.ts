/**
 * GET /api/personalize?placement=hero
 *
 * Returns the variant to render for a given on-page placement.
 *
 * Resolution order (cheap to expensive, cached for 60s in Redis):
 *   1. Identified visitor.crmClientId  -> intent / lifecycleStage / leadScore
 *   2. Anonymous visitor with stored utm -> campaign-driven variant
 *   3. Default fallback variant
 *
 * Variant set lives in code today (see `VARIANT_LIBRARY` below). Phase
 * 5 lifts it into a tenant-editable table once the user actually wants
 * to override copy per tenant — until then, hardcoded variants work
 * and keep the surface area small.
 *
 * Response shape:
 *   { variant: { headline, subheadline, ctaLabel, ctaHref }, source: string }
 */
import { defineEventHandler, getQuery, getCookie } from 'h3'
import { PrismaClient } from '@prisma/client'
import { resolveTenantFromRequest } from '../utils/tenant'
import { COOKIE_VID } from '../utils/eventConstants'
import { getCached, setCache } from '../utils/redis'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

interface Variant {
  headline: string
  subheadline?: string
  ctaLabel?: string
  ctaHref?: string
}

// `default` is required so pickVariant always has a fallback.
type VariantTable = { default: Variant } & Record<string, Variant>

/** Per-placement variant library. Add new placements here. */
const VARIANT_LIBRARY: Record<string, VariantTable> = {
  hero: {
    default: {
      headline: 'Find your next home',
      subheadline: 'Search homes for sale across the country.',
      ctaLabel: 'Browse listings',
      ctaHref: '/properties',
    },
    buyer: {
      headline: 'Ready to buy? Let’s start with the right home.',
      subheadline: 'Save searches, get instant alerts, and tour faster.',
      ctaLabel: 'See homes for sale',
      ctaHref: '/properties',
    },
    seller: {
      headline: 'Thinking of selling? Get an honest home value.',
      subheadline: 'Free, no-obligation estimate from a local expert.',
      ctaLabel: 'Get my home value',
      ctaHref: '/seller/homeestimate',
    },
    investor: {
      headline: 'Investor opportunities, hand-picked.',
      subheadline: 'Cash-flow positive properties before they hit the market.',
      ctaLabel: 'Browse off-market',
      ctaHref: '/properties',
    },
    renter: {
      headline: 'From renting to owning — sooner than you think.',
      subheadline: 'See how today’s rent could become tomorrow’s mortgage.',
      ctaLabel: 'Rent vs Buy calculator',
      ctaHref: '/buyers-playground',
    },
    returning_hot: {
      headline: 'Welcome back. Pick up where you left off.',
      subheadline: 'Your saved searches and recent listings are waiting.',
      ctaLabel: 'Continue browsing',
      ctaHref: '/properties',
    },
  },
  cta_block: {
    default: {
      headline: 'Talk to a real human',
      subheadline: 'No bots — straight through to your local agent.',
      ctaLabel: 'Contact us',
      ctaHref: '/contact',
    },
    seller: {
      headline: 'Wondering what your home is worth?',
      subheadline: 'A real local agent will personally review and reply.',
      ctaLabel: 'Get my estimate',
      ctaHref: '/seller/homeestimate',
    },
    buyer: {
      headline: 'Skip the pre-approval headache',
      subheadline: 'We’ll connect you with a trusted mortgage partner.',
      ctaLabel: 'Talk to an agent',
      ctaHref: '/contact',
    },
  },
}

const CACHE_TTL = 60

function pickVariant(table: VariantTable, key: string): Variant {
  return table[key] || table.default
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const placement = String(query.placement || 'hero')
  const table = VARIANT_LIBRARY[placement]
  if (!table) {
    return { variant: { headline: '' }, source: 'unknown_placement' }
  }

  const adminId = await resolveTenantFromRequest(event).catch(() => null)
  const vid = getCookie(event, COOKIE_VID)

  // Cache key uses (adminId, vid, placement). 60s window keeps personalisation
  // snappy without hammering Postgres on every page render.
  const cacheKey = `personalize:${adminId || 'global'}:${vid || 'anon'}:${placement}`
  const cached = await getCached<{ variant: Variant; source: string }>(cacheKey)
  if (cached) return cached

  let key = 'default'
  let source = 'default'

  if (vid) {
    try {
      const visitor = await prisma.visitor.findUnique({
        where: { vid },
        select: {
          crmClientId: true,
          utmCampaign: true,
          utmMedium: true,
        },
      })
      if (visitor?.crmClientId) {
        const client = await prisma.crmClient.findUnique({
          where: { id: visitor.crmClientId },
          select: { intent: true, leadScore: true, lifecycleStage: true },
        })
        if (client) {
          if (client.leadScore && client.leadScore >= 50 && table.returning_hot) {
            key = 'returning_hot'
            source = 'returning_hot'
          } else if (client.intent && table[client.intent]) {
            key = client.intent
            source = `intent:${client.intent}`
          }
        }
      }
      // UTM-based fallback. Common pattern: utm_medium=cpc + campaign keyword.
      if (key === 'default' && visitor?.utmCampaign) {
        const campaign = visitor.utmCampaign.toLowerCase()
        if (campaign.includes('seller') && table.seller) { key = 'seller'; source = 'utm:seller' }
        else if (campaign.includes('buyer') && table.buyer) { key = 'buyer'; source = 'utm:buyer' }
        else if (campaign.includes('invest') && table.investor) { key = 'investor'; source = 'utm:investor' }
        else if (campaign.includes('rent') && table.renter) { key = 'renter'; source = 'utm:renter' }
      }
    } catch (err) {
      // Personalisation must never block rendering; fall back silently.
      console.warn('[personalize] visitor lookup failed', err)
    }
  }

  const result = { variant: pickVariant(table, key), source }
  await setCache(cacheKey, result, CACHE_TTL)
  return result
})
