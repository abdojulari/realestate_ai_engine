// Shared utilities for the CRM celebration system.
//
// Owns:
//   • Celebration kind enum + helpers
//   • Default email subjects + HTML bodies (per kind)
//   • Placeholder rendering (`{{firstName}}`, `{{adminName}}`, ...)
//   • Date matching (today is your birthday/anniversary regardless of year)
//   • Tenant settings ensure-or-create
//
// Usage:
//   import { CELEBRATION_KINDS, renderTemplate, ensureCelebrationSettings,
//            getDefaultTemplate, isCelebrationToday } from '~/server/utils/celebrations'

import type { CrmClient, CelebrationSettings, User } from '@prisma/client'

export const CELEBRATION_KINDS = [
  'birthday',
  'anniversary',     // wedding anniversary
  'closing',         // anniversary of a successful closing
  'christmas',       // fixed: Dec 25
  'new_year',        // fixed: Jan 1
  'eid',             // open: admin sets the date manually
] as const

export type CelebrationKind = typeof CELEBRATION_KINDS[number]

export interface CelebrationDefault {
  subject: string
  body: string  // HTML; supports {{placeholders}}
}

// Defaults are deliberately warm and short. The admin can override per-tenant in
// CelebrationSettings. {{adminName}} resolves to the tenant admin's full name
// (firstName lastName) so messages feel personal.
const DEFAULTS: Record<CelebrationKind, CelebrationDefault> = {
  birthday: {
    subject: 'Happy Birthday, {{firstName}}!',
    body: `<p>Dear {{firstName}},</p>
<p>Wishing you a wonderful birthday filled with joy, good health, and the company of those you love. Thank you for being part of our journey.</p>
<p>Warmest wishes,<br/><strong>{{adminName}}</strong></p>`,
  },
  anniversary: {
    subject: 'Happy Anniversary, {{firstName}} & family',
    body: `<p>Dear {{firstName}},</p>
<p>Sending you and your loved one our warmest congratulations on your wedding anniversary. May this year bring you continued love, laughter, and shared adventures.</p>
<p>With heartfelt wishes,<br/><strong>{{adminName}}</strong></p>`,
  },
  closing: {
    subject: 'A year in your home — congratulations, {{firstName}}!',
    body: `<p>Dear {{firstName}},</p>
<p>It's hard to believe a full year has passed since we closed on your home. We hope it has been everything you imagined, and more. Thank you for trusting us with such a meaningful chapter of your life.</p>
<p>If we can ever be of help — for you, friends, or family — we would be honoured.</p>
<p>With gratitude,<br/><strong>{{adminName}}</strong></p>`,
  },
  christmas: {
    subject: 'Merry Christmas from {{adminName}}',
    body: `<p>Dear {{firstName}},</p>
<p>May your Christmas sparkle with moments of love, laughter, and goodwill. Thank you for your business.</p>
<p>— <strong>{{adminName}}</strong></p>`,
  },
  new_year: {
    subject: 'Happy New Year, {{firstName}}',
    body: `<p>Dear {{firstName}},</p>
<p>Reflecting on the past year, we're reminded of how invaluable your partnership has been. Happy New Year — messages like these are just a small token of our appreciation!</p>
<p>— <strong>{{adminName}}</strong></p>`,
  },
  eid: {
    subject: 'Eid Mubarak, {{firstName}}',
    body: `<p>Dear {{firstName}},</p>
<p>Wishing you and your family a blessed Eid filled with peace, joy, and togetherness. Eid Mubarak!</p>
<p>Warm regards,<br/><strong>{{adminName}}</strong></p>`,
  },
}

export function getDefaultTemplate(kind: CelebrationKind): CelebrationDefault {
  return DEFAULTS[kind]
}

/**
 * Resolve effective subject/body for a tenant + kind. Per-tenant overrides win;
 * otherwise we fall back to the bundled defaults above.
 */
export function getEffectiveTemplate(
  kind: CelebrationKind,
  settings: CelebrationSettings | null | undefined,
): CelebrationDefault {
  const def = DEFAULTS[kind]
  if (!settings) return def
  const subjectKey = `${kind === 'new_year' ? 'newYear' : kind}Subject` as keyof CelebrationSettings
  const templateKey = `${kind === 'new_year' ? 'newYear' : kind}Template` as keyof CelebrationSettings
  return {
    subject: (settings[subjectKey] as string | null) || def.subject,
    body: (settings[templateKey] as string | null) || def.body,
  }
}

/**
 * Replace `{{placeholders}}` (case-insensitive, whitespace-tolerant) in a string.
 * Unknown placeholders are left intact so the user notices and fixes their template.
 */
export function renderTemplate(template: string, vars: Record<string, string | undefined>): string {
  if (!template) return ''
  return template.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (match, key: string) => {
    const v = vars[key] ?? vars[key.toLowerCase()] ?? vars[key.replace(/([A-Z])/g, '_$1').toLowerCase()]
    return v === undefined || v === null ? match : String(v)
  })
}

/**
 * Build the standard placeholder map for a (client, admin) pair.
 */
export function buildVars(client: Pick<CrmClient, 'firstName' | 'lastName' | 'email'>, admin: Pick<User, 'firstName' | 'lastName' | 'email'>) {
  const adminName = [admin.firstName, admin.lastName].filter(Boolean).join(' ').trim() || admin.email || 'Your Agent'
  return {
    firstName: client.firstName || '',
    lastName: client.lastName || '',
    fullName: [client.firstName, client.lastName].filter(Boolean).join(' '),
    email: client.email || '',
    adminName,
    adminFirstName: admin.firstName || '',
    adminLastName: admin.lastName || '',
    year: String(new Date().getFullYear()),
  }
}

/**
 * Returns true if the given month/day matches today (in the server's timezone).
 * Year is ignored intentionally — anniversaries recur.
 */
export function isAnniversaryToday(date: Date | string | null | undefined, today = new Date()): boolean {
  if (!date) return false
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return false
  return d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
}

/**
 * Returns the number of full years between `from` and `today`. Handy for
 * "1-year closing anniversary" guards.
 */
export function fullYearsBetween(from: Date | string | null | undefined, today = new Date()): number {
  if (!from) return 0
  const d = typeof from === 'string' ? new Date(from) : from
  if (isNaN(d.getTime())) return 0
  let years = today.getFullYear() - d.getFullYear()
  const beforeAnniv = today.getMonth() < d.getMonth() || (today.getMonth() === d.getMonth() && today.getDate() < d.getDate())
  if (beforeAnniv) years -= 1
  return years
}

/**
 * Days until the next occurrence of an anniversary date (month+day).
 *   • Today returns 0
 *   • Tomorrow returns 1
 *   • If the date already passed this year, returns days until next year's date
 */
export function daysUntilNextAnniversary(date: Date | string | null | undefined, today = new Date()): number | null {
  if (!date) return null
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return null
  const next = new Date(today.getFullYear(), d.getMonth(), d.getDate())
  if (next < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
    next.setFullYear(today.getFullYear() + 1)
  }
  const ms = next.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

/**
 * Map a celebration kind to the holidayExceptions key used on CrmClient.
 * Per-client opt-outs only apply to fixed/open celebrations, not personal ones.
 */
export function exceptionKeyFor(kind: CelebrationKind): string | null {
  switch (kind) {
    case 'christmas': return 'christmas'
    case 'new_year':  return 'new_year'
    case 'eid':       return 'eid'
    default:          return null
  }
}
