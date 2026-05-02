/**
 * Per-request site origin resolver.
 *
 * Why this exists
 * ───────────────
 * The Nuxt build is shared across every tenant subdomain (aohomes.deelbot.ai,
 * tonahomes.deelbot.ai, …). A single `NUXT_PUBLIC_SITE_URL` baked into the
 * client bundle would force every tenant's <link rel=canonical>, og:url, and
 * JSON-LD `url` to point at one host — wrong for SEO and the same root cause
 * as the cross-tenant CORS incident on `NUXT_PUBLIC_API_BASE`.
 *
 * Resolution order
 *   1. SSR: the incoming `Host` header (+ `x-forwarded-proto`) → the actual
 *      tenant the request landed on.
 *   2. Client hydration: `window.location.origin`.
 *   3. Fallback: `runtimeConfig.public.siteUrl` if explicitly configured
 *      (single-tenant deploys), else "" (callers should treat empty as
 *      "skip absolute-URL features" and emit relative URLs instead).
 *
 * The returned value never has a trailing slash.
 */
export function useSiteUrl(): string {
  if (import.meta.server) {
    try {
      const event = useRequestEvent()
      if (event) {
        const host = getRequestHeader(event, 'host') || ''
        if (host) {
          const xfProto = getRequestHeader(event, 'x-forwarded-proto') || ''
          const proto = xfProto.split(',')[0]?.trim() || (host.includes('localhost') || host.startsWith('127.') ? 'http' : 'https')
          return `${proto}://${host}`.replace(/\/$/, '')
        }
      }
    } catch {
      // useRequestEvent is unavailable during static prerender — fall through.
    }
  } else if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '')
  }

  const fallback = ((useRuntimeConfig().public?.siteUrl as string) || '').replace(/\/$/, '')
  return fallback
}

/**
 * Convert a relative path (e.g. "/uploads/foo.png") to an absolute URL using
 * the per-request origin. Returns the input unchanged if it's already absolute
 * or if no origin could be resolved.
 */
export function useAbsoluteUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  const origin = useSiteUrl()
  if (!origin) return path
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`
}
