/**
 * Canonical event names emitted by the platform.
 *
 * Anything not in this set is still accepted by `/api/events` — that's
 * intentional so each tenant can emit custom events — but ONLY the
 * names below are guaranteed to be interpreted by the events worker
 * (lead scoring, intent inference, automation triggers).
 *
 * Keep names lowercase snake_case. Past-tense for completed actions.
 */
export const EVENT_NAMES = {
  // Page-level
  PAGE_VIEW: 'page_view',

  // Listings
  LISTING_VIEW: 'listing_view',
  LISTING_FAVORITE: 'listing_favorite',
  LISTING_SHARE: 'listing_share',

  // Forms
  FORM_STARTED: 'form_started',
  FORM_SUBMITTED: 'form_submitted',

  // Resources / blog
  RESOURCE_VIEW: 'resource_view',
  RESOURCE_UNLOCK: 'resource_unlock',
  BLOG_READ: 'blog_read',

  // CTAs
  CTA_CLICKED: 'cta_clicked',

  // Inbound contact
  PHONE_CLICKED: 'phone_clicked',
  EMAIL_CLICKED: 'email_clicked',
  CHAT_OPENED: 'chat_opened',

  // Conversion (server-emitted)
  LEAD_CREATED: 'lead_created',
  ESTIMATE_REQUESTED: 'estimate_requested',
  INQUIRY_SENT: 'inquiry_sent',
  NEWSLETTER_SUBSCRIBED: 'newsletter_subscribed',
} as const

export type EventName = (typeof EVENT_NAMES)[keyof typeof EVENT_NAMES]

/**
 * Lead-scoring weights. Recomputed in `eventsWorker.ts`.
 * Designed so a contact with two listing views + one form submit lands
 * around 30, comfortably below the default `score >= 70` automation
 * threshold. Tweakable per-tenant later — for now globals are fine.
 */
export const SCORE_WEIGHTS: Record<string, number> = {
  [EVENT_NAMES.PAGE_VIEW]: 1,
  [EVENT_NAMES.LISTING_VIEW]: 5,
  [EVENT_NAMES.LISTING_FAVORITE]: 10,
  [EVENT_NAMES.LISTING_SHARE]: 8,
  [EVENT_NAMES.RESOURCE_VIEW]: 4,
  [EVENT_NAMES.RESOURCE_UNLOCK]: 15,
  [EVENT_NAMES.BLOG_READ]: 3,
  [EVENT_NAMES.CTA_CLICKED]: 4,
  [EVENT_NAMES.PHONE_CLICKED]: 12,
  [EVENT_NAMES.EMAIL_CLICKED]: 12,
  [EVENT_NAMES.CHAT_OPENED]: 8,
  [EVENT_NAMES.FORM_STARTED]: 5,
  [EVENT_NAMES.FORM_SUBMITTED]: 25,
  [EVENT_NAMES.LEAD_CREATED]: 30,
  [EVENT_NAMES.ESTIMATE_REQUESTED]: 30,
  [EVENT_NAMES.INQUIRY_SENT]: 25,
  [EVENT_NAMES.NEWSLETTER_SUBSCRIBED]: 10,
}

/** Cap so a single noisy session can't push a score to 1000+. */
export const MAX_LEAD_SCORE = 100

/**
 * Number of days of inactivity after which a contact's score is
 * recomputed from scratch (excluding stale events). Keeps "Hot Leads"
 * actually hot.
 */
export const SCORE_LOOKBACK_DAYS = 30

/** Cookie names used by the visitor-id plugin and event endpoint. */
export const COOKIE_VID = 'vid'
export const COOKIE_SID = 'sid'
/**
 * 30 minutes of idle => new session (industry-standard default and what
 * GA4 / Mixpanel use, so dashboards stay comparable).
 */
export const SESSION_IDLE_MINUTES = 30
