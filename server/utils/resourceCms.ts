/**
 * Shared helpers for the homepage Resources system (the WYSIWYG-driven
 * articles surfaced in ResourcesSection.vue, distinct from MarketingResource).
 *
 * Lives in its own file because both admin and public endpoints need:
 *   - slug generation that's collision-free per-tenant
 *   - body HTML sanitization (the editor produces HTML — we MUST strip
 *     <script>, event handlers, etc. before persisting/rendering)
 *   - cookie name + token for the per-resource lead-gen unlock
 *   - external-link normalization (admin saves arbitrary input; public
 *     should only ever render http(s) URLs)
 */

import jwt from 'jsonwebtoken'

// ─── Slugs ──────────────────────────────────────────────────────────────
const SLUG_MAX = 80

/** Convert any string into a URL-safe lowercase slug (alphanum + dashes). */
export function slugify(input: string): string {
  return (input || '')
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX) || 'resource'
}

/**
 * Tenant-scoped uniqueness — try the requested slug, then suffix -2/-3/...
 * until we find one no other resource for THIS tenant uses. Excludes
 * `excludeId` so an in-place edit doesn't collide with itself.
 */
export async function ensureUniqueSlugForTenant(
  prisma: any,
  adminId: number,
  desired: string,
  excludeId: number | null = null,
): Promise<string> {
  const base = slugify(desired)
  let candidate = base
  let n = 2
  while (true) {
    const existing = await prisma.resource.findFirst({
      where: {
        adminId,
        slug: candidate,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    })
    if (!existing) return candidate
    candidate = `${base}-${n++}`
    if (n > 999) {
      // Defensive — should never happen in practice, but never loop forever.
      return `${base}-${Date.now()}`
    }
  }
}

// ─── HTML sanitization ──────────────────────────────────────────────────
// Conservative allowlist-style sanitizer for TipTap output. We don't pull
// in a full sanitizer library (sanitize-html, DOMPurify) because Nuxt's
// server runtime is Node and we want zero new deps for this feature. The
// editor is admin-only AND output is rendered with v-html inside the
// detail page — so a strict allowlist is the safest posture.

// Tags TipTap can produce with our extensions (StarterKit + Underline + Link):
//   p, br, strong, em, u, s, code, pre, blockquote, ul, ol, li, h2, h3, h1,
//   a, hr
const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'code', 'pre',
  'blockquote', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'a', 'hr', 'span', 'div',
])

/** Per-tag allowed attribute list. Anything not listed is dropped. */
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'rel', 'target']),
  span: new Set(['class']),
  div: new Set(['class']),
}

export function sanitizeHtml(input: string): string {
  if (!input) return ''
  let out = input

  // 1) Strip dangerous nodes outright (script, style, iframe, object, embed,
  //    svg, math). These should never reach v-html on a public page.
  out = out.replace(
    /<\s*(script|style|iframe|object|embed|svg|math|form|input|textarea|select|button)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
    '',
  )
  // Self-closing variants (e.g. <iframe src="..." />)
  out = out.replace(
    /<\s*(script|style|iframe|object|embed|svg|math|form|input|textarea|select|button)\b[^>]*\/?>/gi,
    '',
  )

  // 2) Strip on* event handler attributes from any tag (onerror, onclick, …)
  out = out.replace(/\s+on[a-z]+\s*=\s*"[^"]*"/gi, '')
  out = out.replace(/\s+on[a-z]+\s*=\s*'[^']*'/gi, '')
  out = out.replace(/\s+on[a-z]+\s*=\s*[^\s>]+/gi, '')

  // 3) Drop javascript:/data:/vbscript: protocols in href/src
  out = out.replace(
    /(href|src)\s*=\s*"\s*(?:javascript|data|vbscript):[^"]*"/gi,
    '$1="#"',
  )
  out = out.replace(
    /(href|src)\s*=\s*'\s*(?:javascript|data|vbscript):[^']*'/gi,
    "$1='#'",
  )

  // 4) Allowlist tags + attributes. Anything not in ALLOWED_TAGS is replaced
  //    with its inner text (open tag stripped, close tag stripped). We rely
  //    on regex here rather than a full HTML parser; for the narrow output
  //    surface of TipTap with our extensions this is sufficient and avoids
  //    a parser dep. If we expand the editor later, swap in `sanitize-html`.
  out = out.replace(/<\/?\s*([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (match, tagRaw, attrsRaw) => {
    const tag = String(tagRaw).toLowerCase()
    if (!ALLOWED_TAGS.has(tag)) return ''
    const isClosing = match.startsWith('</')
    if (isClosing) return `</${tag}>`

    const allowed = ALLOWED_ATTRS[tag]
    if (!allowed || allowed.size === 0) {
      return `<${tag}>`
    }
    // Extract surviving attributes.
    const kept: string[] = []
    const attrRegex = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g
    let m: RegExpExecArray | null
    while ((m = attrRegex.exec(String(attrsRaw))) !== null) {
      const name = m[1]!.toLowerCase()
      if (!allowed.has(name)) continue
      const value = m[3] ?? m[4] ?? m[5] ?? ''
      // Defensive: anchors must always be safe — force rel + target on links.
      if (tag === 'a' && name === 'href') {
        if (!/^(https?:|mailto:|tel:|#|\/)/i.test(value)) continue
      }
      kept.push(`${name}="${value.replace(/"/g, '&quot;')}"`)
    }
    if (tag === 'a') {
      // External-link safety (no opener leakage, no referrer to hostile sites).
      kept.push('rel="noopener noreferrer nofollow"')
      kept.push('target="_blank"')
    }
    return `<${tag}${kept.length ? ' ' + kept.join(' ') : ''}>`
  })

  return out.trim()
}

// ─── External-link normalization ────────────────────────────────────────

export interface ExternalLinkInput {
  label?: unknown
  url?: unknown
}

export interface ExternalLink {
  label: string
  url: string
}

/**
 * Coerce arbitrary client input into a clean array of { label, url } pairs.
 * Drops malformed rows silently; never throws — admins should be able to
 * save a partly-filled draft and come back to fix it.
 */
export function normalizeExternalLinks(input: unknown): ExternalLink[] {
  if (!Array.isArray(input)) return []
  const out: ExternalLink[] = []
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue
    const r = raw as ExternalLinkInput
    const label = String(r.label ?? '').trim().slice(0, 120)
    let url = String(r.url ?? '').trim()
    if (!url) continue
    // Auto-prefix bare domains so admins can paste "cmhc-schl.gc.ca".
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`
    // Final URL validity check.
    try {
      const u = new URL(url)
      if (u.protocol !== 'http:' && u.protocol !== 'https:') continue
    } catch {
      continue
    }
    out.push({ label: label || url, url })
  }
  return out.slice(0, 12) // hard cap — keeps the sidebar UI sane
}

// ─── Lead-gen unlock cookie ─────────────────────────────────────────────
// We mirror MarketingResource's pattern but namespace differently so the
// two systems' cookies never conflict on the same browser.

export function cookieNameForLearnSlug(slug: string): string {
  return `lr_${slug}`
}

export function signLearnAccessToken(slug: string, resourceId: number): string {
  const secret = process.env.JWT_SECRET || 'fallback-secret'
  return jwt.sign({ s: slug, r: resourceId }, secret, { expiresIn: '30d' })
}

export function verifyLearnAccessToken(
  token: string | undefined | null,
  slug: string,
  resourceId: number,
): boolean {
  if (!token) return false
  try {
    const secret = process.env.JWT_SECRET || 'fallback-secret'
    const payload = jwt.verify(token, secret) as { s?: string; r?: number }
    return payload.s === slug && payload.r === resourceId
  } catch {
    return false
  }
}
