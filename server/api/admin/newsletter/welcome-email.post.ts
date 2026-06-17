import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { requireFeature, FEATURES } from '../../../utils/license'
import { getAdminIdForCreate } from '../../../utils/tenant'
import { WELCOME_SETTING_KEYS } from '../../../utils/newsletterWelcomeEmail'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma


// Hard caps on admin-supplied content so a malicious / accidental paste
// doesn't blow up the DB column or downstream email rendering.
const SUBJECT_MAX = 200
const INTRO_MAX = 20_000

/**
 * Save welcome-email overrides for the calling tenant.
 *
 * Body:
 *  { enabled?: boolean, subject?: string, intro?: string }
 *
 * Field semantics:
 *  • `enabled` defaults to true at the renderer layer when no Setting row
 *    exists — saving an explicit `false` opts the tenant OUT of welcome
 *    emails. Saving `true` (or unset) keeps them ON.
 *  • Empty `subject` / `intro` strings DELETE the override and fall back to
 *    the platform default copy.
 *
 * Tenancy:
 *  Like every /api/admin/settings/* endpoint, the row's adminId is set
 *  from getAdminIdForCreate(user). Delegated sub-admins write under their
 *  parent tenant's id.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  await requireFeature(FEATURES.NEWSLETTER, event)
  const adminId = getAdminIdForCreate(user)

  const body = await readBody(event)
  const rawEnabled = body?.enabled
  const rawSubject = body?.subject
  const rawIntro = body?.intro

  const enabledIsProvided = Object.prototype.hasOwnProperty.call(body || {}, 'enabled')
  const subjectIsProvided = Object.prototype.hasOwnProperty.call(body || {}, 'subject')
  const introIsProvided = Object.prototype.hasOwnProperty.call(body || {}, 'intro')

  // Normalise inputs early so validation errors don't depend on the field
  // arriving on the wire vs. arriving as an empty string.
  const enabled =
    rawEnabled === true ||
    rawEnabled === 'true' ||
    rawEnabled === 1 ||
    rawEnabled === '1'

  const subject = subjectIsProvided ? String(rawSubject ?? '').trim() : null
  const intro = introIsProvided ? String(rawIntro ?? '').trim() : null

  if (subject !== null && subject.length > SUBJECT_MAX) {
    throw createError({ statusCode: 400, statusMessage: `Subject must be ${SUBJECT_MAX} characters or fewer.` })
  }
  if (intro !== null && intro.length > INTRO_MAX) {
    throw createError({ statusCode: 400, statusMessage: `Intro content must be ${INTRO_MAX} characters or fewer.` })
  }

  // Upsert helper. An empty-string override is interpreted as "remove the
  // saved override" so the default copy comes back through — store an
  // explicit DELETE rather than a row with value=""; that way the GET
  // endpoint sees a missing key and reports the field as "default".
  async function persistOrDelete(key: string, value: string | null) {
    const existing = await prisma.setting.findFirst({ where: { key, adminId } })
    if (value === null) {
      // Field absent from body — leave existing value alone.
      return
    }
    if (value === '') {
      if (existing) {
        await prisma.setting.delete({ where: { id: existing.id } })
      }
      return
    }
    if (existing) {
      await prisma.setting.update({ where: { id: existing.id }, data: { value } })
    } else {
      await prisma.setting.create({ data: { key, value, adminId } })
    }
  }

  try {
    const writes: Promise<unknown>[] = []
    if (enabledIsProvided) {
      writes.push(persistOrDelete(WELCOME_SETTING_KEYS.enabled, enabled ? 'true' : 'false'))
    }
    if (subjectIsProvided) {
      writes.push(persistOrDelete(WELCOME_SETTING_KEYS.subject, subject))
    }
    if (introIsProvided) {
      writes.push(persistOrDelete(WELCOME_SETTING_KEYS.intro, intro))
    }

    await Promise.all(writes)

    return {
      success: true,
      message: 'Welcome email settings saved.',
    }
  } catch (err) {
    console.error('[newsletter:welcome] save failed:', err)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to save welcome email settings.',
    })
  }
})
