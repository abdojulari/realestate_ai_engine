/**
 * Meta Pixel — client-side route-change tracking
 * ──────────────────────────────────────────────
 * The pixel itself (script + initial PageView) is SSR-injected from
 * `app/layouts/default.vue` so it loads with the HTML — no flash, no missed
 * first PageView, no extra network round-trip.
 *
 * This plugin only handles SUBSEQUENT client-side navigations: each route
 * change fires another PageView so SPA navigation is counted properly in
 * Meta Events Manager.
 *
 * Skips:
 *   • SSR (this is .client.ts but defensive guard for any odd lifecycle)
 *   • Routes whose path starts with `/admin` — admins shouldn't pollute
 *     marketing analytics with their own page views.
 *   • The very first navigation (already tracked by the SSR snippet).
 */

export default defineNuxtPlugin(() => {
  if (typeof window === 'undefined') return

  const router = useRouter()
  let isFirstNavigation = true

  router.afterEach((to, from) => {
    // Skip the initial page load — the SSR-injected snippet already fired
    // PageView for it, and the "afterEach" hook will run once with `from`
    // pointing at a placeholder route.
    if (isFirstNavigation) {
      isFirstNavigation = false
      return
    }

    // No-op when the user just stays on the same path (query/hash change).
    if (to.path === from.path) return

    // Don't track admin pages — they pollute the marketing dashboard.
    if (to.path.startsWith('/admin')) return

    if (typeof window.fbq !== 'function') return

    try {
      window.fbq('track', 'PageView')
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[meta-pixel] PageView on route change failed:', err)
      }
    }
  })
})
