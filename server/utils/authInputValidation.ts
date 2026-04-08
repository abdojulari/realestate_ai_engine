import { createError } from 'h3'

const EMAIL_MAX = 254
const PASSWORD_MAX = 128
const PASSWORD_MIN_REGISTER = 8
const NAME_MAX = 80
const PHONE_MAX = 32

const CTRL = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/

/** Practical check: one @, non-empty local + domain, length caps (Prisma parameterizes queries — no string SQL) */
function isReasonableEmail(t: string): boolean {
  const at = t.indexOf('@')
  if (at <= 0 || at !== t.lastIndexOf('@')) return false
  const local = t.slice(0, at)
  const domain = t.slice(at + 1)
  if (!local.length || local.length > 64) return false
  if (!domain.length || domain.length > 253) return false
  return true
}

function assertNoCtrl(label: string, value: string) {
  if (CTRL.test(value)) {
    throw createError({ statusCode: 400, statusMessage: `Invalid characters in ${label}` })
  }
}

export function assertLoginEmail(email: unknown): string {
  if (typeof email !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Email is required' })
  }
  const t = email.trim().toLowerCase()
  if (!t || t.length > EMAIL_MAX) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid email' })
  }
  assertNoCtrl('email', t)
  if (!isReasonableEmail(t)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid email format' })
  }
  return t
}

export function assertLoginPassword(password: unknown): string {
  if (typeof password !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Password is required' })
  }
  if (!password.length || password.length > PASSWORD_MAX) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid password' })
  }
  // Do not reject control characters on login: rare encodings / paste quirks should not lock users out;
  // bcrypt compare still validates the real secret.
  return password
}

export function assertRegisterEmail(email: unknown): string {
  return assertLoginEmail(email)
}

export function assertRegisterPassword(password: unknown): string {
  if (typeof password !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Password is required' })
  }
  if (password.length < PASSWORD_MIN_REGISTER || password.length > PASSWORD_MAX) {
    throw createError({
      statusCode: 400,
      statusMessage: `Password must be between ${PASSWORD_MIN_REGISTER} and ${PASSWORD_MAX} characters`,
    })
  }
  if (CTRL.test(password)) {
    throw createError({ statusCode: 400, statusMessage: 'Password contains invalid control characters' })
  }
  return password
}

export function assertPersonName(value: unknown, field: 'first name' | 'last name'): string {
  if (typeof value !== 'string') {
    throw createError({ statusCode: 400, statusMessage: `${field} is required` })
  }
  const t = value.trim()
  if (!t || t.length > NAME_MAX) {
    throw createError({ statusCode: 400, statusMessage: `Invalid ${field}` })
  }
  assertNoCtrl(field, t)
  return t
}

export function optionalPhone(phone: unknown): string | undefined {
  if (phone === undefined || phone === null || phone === '') return undefined
  if (typeof phone !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid phone' })
  }
  const t = phone.trim()
  if (!t) return undefined
  if (t.length > PHONE_MAX) {
    throw createError({ statusCode: 400, statusMessage: 'Phone is too long' })
  }
  assertNoCtrl('phone', t)
  return t
}

export function optionalPreferredContactTime(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid contact time preference' })
  }
  const t = value.trim().slice(0, 120)
  assertNoCtrl('preferred contact time', t)
  return t || undefined
}
