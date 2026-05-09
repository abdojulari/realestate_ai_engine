/**
 * Per-tenant outbound email channel (SMTP vs MailerLite API).
 * Stored in Setting rows alongside existing email.* keys.
 */

import { PrismaClient } from '@prisma/client'
import { sendMailerSendSms } from './mailersendSms'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

const TTL_MS = 5 * 60_000

export type EmailOutboundChannel = 'smtp' | 'mailerlite'

export interface TenantEmailOutbound {
  channel: EmailOutboundChannel
  /** UI + future hooks — SMS itself uses MailerSend env vars when enabled. */
  mailerliteSmsEnabled: boolean
}

interface Cached {
  value: TenantEmailOutbound
  expiresAt: number
}

const cache = new Map<number, Cached>()

export function clearTenantEmailOutboundCache(adminId: number) {
  cache.delete(adminId)
}

/**
 * Verified MailerLite `from` address must match tenant marketing From email.
 */
export async function getTenantMailerLiteFromIdentity(
  adminId: number,
): Promise<{ fromEmail: string; fromName: string } | null> {
  try {
    const rows = await prisma.setting.findMany({
      where: { adminId, key: { in: ['email.fromEmail', 'email.fromName'] } },
      select: { key: true, value: true },
    })
    const fromEmail = rows.find((r) => r.key === 'email.fromEmail')?.value?.trim() || ''
    if (!fromEmail) return null
    const fromName =
      rows.find((r) => r.key === 'email.fromName')?.value?.trim() || 'Notifications'
    return { fromEmail, fromName }
  } catch (e) {
    console.warn('[tenantEmailOutbound] from identity lookup failed:', e)
    return null
  }
}

export async function getTenantEmailOutbound(adminId: number | null | undefined): Promise<TenantEmailOutbound> {
  const defaultOut: TenantEmailOutbound = { channel: 'smtp', mailerliteSmsEnabled: false }
  if (adminId == null) return defaultOut

  const now = Date.now()
  const hit = cache.get(adminId)
  if (hit && hit.expiresAt > now) return hit.value

  try {
    const rows = await prisma.setting.findMany({
      where: {
        adminId,
        key: { in: ['email.outbound_delivery', 'email.mailerlite_sms_enabled'] },
      },
    })
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))
    const raw = (map['email.outbound_delivery'] || 'smtp').toLowerCase()
    const channel: EmailOutboundChannel = raw === 'mailerlite' ? 'mailerlite' : 'smtp'
    const smsRaw = map['email.mailerlite_sms_enabled']
    const mailerliteSmsEnabled =
      smsRaw === 'true' ||
      smsRaw === '1' ||
      (typeof smsRaw === 'string' && smsRaw.toLowerCase() === 'true')

    const value: TenantEmailOutbound = { channel, mailerliteSmsEnabled }
    cache.set(adminId, { value, expiresAt: now + TTL_MS })
    return value
  } catch (e) {
    console.warn('[tenantEmailOutbound] lookup failed:', e)
    return defaultOut
  }
}

/**
 * Sends SMS via MailerSend only when the tenant enabled the MailerLite SMS toggle
 * and MailerSend env vars are configured. Call from notification flows that should
 * respect admin preferences.
 */
export async function sendTenantSmsIfEnabled(
  adminId: number | null | undefined,
  params: { toE164: string[]; text: string },
): Promise<boolean> {
  if (adminId == null) return false
  const o = await getTenantEmailOutbound(adminId)
  if (!o.mailerliteSmsEnabled) return false
  return sendMailerSendSms(params)
}
