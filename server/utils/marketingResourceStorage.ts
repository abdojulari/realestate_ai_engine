import path from 'path'
import { promises as fs } from 'fs'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'

export const MARKETING_RESOURCE_DIR = path.join(process.cwd(), 'storage', 'marketing-resources')

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
])

const EXT_BY_MIME: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
}

export function isAllowedMarketingResourceMime(mime: string | undefined): boolean {
  if (!mime) return false
  return ALLOWED_MIME.has(mime.toLowerCase())
}

export function extensionForMime(mime: string): string {
  return EXT_BY_MIME[mime.toLowerCase()] || ''
}

const MIME_BY_EXT: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
}

export function mimeFromFilename(filename: string | undefined, fallback: string): string {
  if (!filename) return fallback
  const ext = path.extname(filename).toLowerCase()
  return MIME_BY_EXT[ext] || fallback
}

export async function ensureMarketingResourceDir(): Promise<void> {
  await fs.mkdir(MARKETING_RESOURCE_DIR, { recursive: true })
}

export function newStorageKey(mime: string): string {
  const ext = extensionForMime(mime)
  return `${crypto.randomUUID()}${ext}`
}

export function absolutePathForStorageKey(storageKey: string): string {
  const base = path.resolve(MARKETING_RESOURCE_DIR)
  const resolved = path.resolve(MARKETING_RESOURCE_DIR, storageKey)
  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    throw new Error('Invalid storage key')
  }
  return resolved
}

export async function writeMarketingResourceFile(
  storageKey: string,
  data: Buffer
): Promise<void> {
  await ensureMarketingResourceDir()
  const dest = absolutePathForStorageKey(storageKey)
  await fs.writeFile(dest, data)
}

export async function deleteMarketingResourceFile(storageKey: string): Promise<void> {
  try {
    await fs.unlink(absolutePathForStorageKey(storageKey))
  } catch {
    /* ignore missing file */
  }
}

export function cookieNameForResourceSlug(publicSlug: string): string {
  return `mr_${publicSlug}`
}

export function signResourceAccessToken(
  publicSlug: string,
  resourceId: number
): string {
  const secret = process.env.JWT_SECRET || 'fallback-secret'
  return jwt.sign({ s: publicSlug, r: resourceId }, secret, { expiresIn: '30d' })
}

export function verifyResourceAccessToken(
  token: string,
  publicSlug: string,
  resourceId: number
): boolean {
  try {
    const secret = process.env.JWT_SECRET || 'fallback-secret'
    const payload = jwt.verify(token, secret) as { s?: string; r?: number }
    return payload.s === publicSlug && payload.r === resourceId
  } catch {
    return false
  }
}
