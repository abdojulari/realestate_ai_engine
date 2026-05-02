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
 *
 * IMPORTANT — call this ONCE during component setup, never inside a computed
 * or watcher. It depends on `useRequestEvent()` / `useNuxtApp()` which only
 * exist while the Nuxt request scope is active. Calling it later (e.g. from
 * a `computed` that re-evaluates during unhead's post-render walk) throws
 * "[nuxt] instance unavailable" and 500s the page. Capture the value and
 * use {@link absolutizeUrl} for downstream string ops.
 */
export function useSiteUrl(): string {
  if (import.meta.server) {
    try {
      const event = useRequestEvent()
      if (event) {
        const host = getRequestHeader(event, 'host') || ''
        if (host) {
          const xfProto = getRequestHeader(event, 'x-forwarded-proto') || ''
          const proto =
            xfProto.split(',')[0]?.trim() ||
            (host.includes('localhost') || host.startsWith('127.') ? 'http' : 'https')
          return `${proto}://${host}`.replace(/\/$/, '')
        }
      }
    } catch {
      // useRequestEvent unavailable (static prerender, post-render head walk, …)
      // — fall through to runtime-config / window fallbacks.
    }
  } else if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '')
  }

  // Defensive: if useRuntimeConfig() is invoked outside an active Nuxt scope
  // (which can happen if a caller misuses this composable inside a computed),
  // it throws. Swallow and return '' — callers should treat that as
  // "no absolute URL available" and emit a relative URL instead.
  try {
    return ((useRuntimeConfig().public?.siteUrl as string) || '').replace(/\/$/, '')
  } catch {
    return ''
  }
}

/**
 * Convert a relative path (e.g. "/uploads/foo.png") to an absolute URL.
 *
 * **Pure** — no Nuxt composable calls. Safe to invoke from computeds, watchers,
 * and unhead resolvers. Capture `origin` once via {@link useSiteUrl} at setup
 * and pass it in.
 */
export function absolutizeUrl(origin: string, path: string | null | undefined): string {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  if (!origin) return path
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`
}

/**
 * @deprecated Calls {@link useSiteUrl} internally — unsafe inside computeds /
 * head resolvers (causes "[nuxt] instance unavailable" 500s during the
 * post-render head walk). Capture `siteUrl` once at setup and use
 * {@link absolutizeUrl} instead.
 *
 * Kept for backwards compatibility with callers that invoke it directly during
 * setup (where the Nuxt scope is still active).
 */
export function useAbsoluteUrl(path: string | null | undefined): string {
  return absolutizeUrl(useSiteUrl(), path)
}
