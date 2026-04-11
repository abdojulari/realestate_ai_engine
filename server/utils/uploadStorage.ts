import path from 'node:path'
import { createError } from 'h3'

/**
 * All user-uploaded public files live here. URLs are always `/uploads/<subdir>/...`.
 *
 * `SUHANI_PUBLIC_UPLOADS_DIR` is set in Docker Compose so reads/writes stay correct even if
 * `process.cwd()` ever diverges from `/app`.
 */
export function getUploadRoot(): string {
  const override = process.env.SUHANI_PUBLIC_UPLOADS_DIR?.trim()
  if (override) {
    return path.resolve(override)
  }
  return path.resolve(process.cwd(), 'public', 'uploads')
}

/** Nitro catch-all param can be string or string[] depending on version. */
export function catchAllToRelativePath(pathParam: string | string[] | undefined): string {
  if (pathParam == null) return ''
  const raw = Array.isArray(pathParam) ? pathParam.join('/') : String(pathParam)
  return raw.replace(/^[/\\]+/, '').replace(/\\/g, '/')
}

/** Resolve a path under UPLOAD_ROOT and reject traversal (Nitro `[...path]` may be string | string[]). */
export function resolveSafeUploadFile(pathParam: string | string[] | undefined): string {
  const root = getUploadRoot()
  const rel = catchAllToRelativePath(pathParam)
  if (!rel) {
    throw createError({ statusCode: 400, statusMessage: 'Missing file path' })
  }
  const abs = path.resolve(root, ...rel.split('/').filter(Boolean))
  const relCheck = path.relative(root, abs)
  if (relCheck.startsWith('..') || path.isAbsolute(relCheck)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  return abs
}
