/**
 * Visitor + session cookie bootstrap (browser-only).
 *
 * The server-side recorder is the source of truth — it sets `vid`/`sid`
 * with `httpOnly: false` so that on a fully client-side navigation
 * (no SSR fetch) we still read the same identifiers when posting events.
 *
 * This plugin's responsibilities:
 *   1. Capture UTM parameters from the URL on first hit and stash them
 *      in localStorage as a 7-day attribution window.
 *   2. On every router navigation, fire a `page_view` event via the
 *      `useTrack` composable.
 *   3. Track first-load PageView. Subsequent navigations are handled by
 *      the same router hook.
 *
 * Skips entirely on `/admin` routes — no point tracking the agent
 * inside their own dashboard.
 */
import { useTrack } from '~/composables/useTrack'

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const
const UTM_STORAGE_KEY = '__deelbot_utm'
const UTM_TTL_MS = 7 * 24 * 60 * 60 * 1000

interface StoredUtm {
  source?: string
  medium?: string
  campaign?: string
  term?: string
  content?: string
  capturedAt: number
}

function captureUtmFromUrl(): StoredUtm | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const candidate: StoredUtm = { capturedAt: Date.now() }
  let any = false
  if (params.get('utm_source')) { candidate.source = params.get('utm_source')!; any = true }
  if (params.get('utm_medium')) { candidate.medium = params.get('utm_medium')!; any = true }
  if (params.get('utm_campaign')) { candidate.campaign = params.get('utm_campaign')!; any = true }
  if (params.get('utm_term')) { candidate.term = params.get('utm_term')!; any = true }
  if (params.get('utm_content')) { candidate.content = params.get('utm_content')!; any = true }
  if (!any) return null
  try { localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(candidate)) } catch { /* ignore */ }
  return candidate
}

function loadStoredUtm(): StoredUtm | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(UTM_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredUtm
    if (!parsed?.capturedAt || Date.now() - parsed.capturedAt > UTM_TTL_MS) {
      localStorage.removeItem(UTM_STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function isAdminPath(path: string): boolean {
  return path === '/admin' || path.startsWith('/admin/')
}

export default defineNuxtPlugin(() => {
  if (typeof window === 'undefined') return

  // 1. Stash UTM (capture overrides any older window).
  const fresh = captureUtmFromUrl()
  if (!fresh) loadStoredUtm()

  const { track } = useTrack()
  const router = useRouter()

  // 2. First page_view.
  if (!isAdminPath(window.location.pathname)) {
    void track('page_view', {
      properties: { title: document.title },
    })
  }

  // 3. Subsequent navigations.
  router.afterEach((to) => {
    const path = to.fullPath
    if (isAdminPath(path)) return
    void track('page_view', {
      path,
      properties: { title: typeof document !== 'undefined' ? document.title : undefined },
    })
  })
})
