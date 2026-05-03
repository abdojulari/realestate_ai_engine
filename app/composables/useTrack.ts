/**
 * useTrack — browser-side helper for posting events to /api/events.
 *
 * Example:
 *   const { track } = useTrack()
 *   track('listing_view', { objectType: 'property', objectId: 123 })
 *   track('form_submitted', { properties: { formName: 'inquiry' } })
 *
 * Behaviour:
 *   • Reads the 7-day UTM window stashed by `visitor-id.client.ts` and
 *     attaches it to every event so the server can attribute downstream.
 *   • Uses `navigator.sendBeacon` when the page is unloading (works for
 *     "user clicked an outbound link" cases). Otherwise plain fetch.
 *   • Never throws; failures are console-warned only.
 *   • No-ops on the server (SSR) so `track()` is safe to call from
 *     anywhere — `onMounted` not required.
 */
const UTM_STORAGE_KEY = '__deelbot_utm'

interface StoredUtm {
  source?: string
  medium?: string
  campaign?: string
  term?: string
  content?: string
  capturedAt?: number
}

function readStoredUtm(): StoredUtm | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = localStorage.getItem(UTM_STORAGE_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as StoredUtm
    return parsed && (parsed.source || parsed.medium || parsed.campaign) ? parsed : undefined
  } catch {
    return undefined
  }
}

export interface TrackOptions {
  /** Foreign key to a domain entity, e.g. 'property' | 'resource' | 'blog' */
  objectType?: string
  objectId?: number
  /** Email known at this point (e.g. after form submit). */
  email?: string
  /** Override path (defaults to current `location.pathname`). */
  path?: string
  /** Free-form structured payload. Keep small. */
  properties?: Record<string, unknown>
  /** Use sendBeacon (ignored if not available). */
  beacon?: boolean
}

export function useTrack() {
  const track = async (name: string, options: TrackOptions = {}): Promise<void> => {
    if (typeof window === 'undefined') return

    const utm = readStoredUtm()
    const body: Record<string, unknown> = {
      name,
      objectType: options.objectType ?? null,
      objectId: options.objectId ?? null,
      email: options.email ?? null,
      path: options.path ?? window.location.pathname + window.location.search,
      referrer: document.referrer || undefined,
      properties: options.properties ?? null,
      ...(utm
        ? {
            utm: {
              source: utm.source,
              medium: utm.medium,
              campaign: utm.campaign,
              term: utm.term,
              content: utm.content,
            },
          }
        : {}),
    }

    try {
      if (options.beacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([JSON.stringify(body)], { type: 'application/json' })
        navigator.sendBeacon('/api/events', blob)
        return
      }
      // `keepalive: true` so an in-flight event survives a page navigation.
      void fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'same-origin',
        keepalive: true,
      }).catch((err) => {
        if (process.env.NODE_ENV !== 'production') console.warn('[useTrack]', err)
      })
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.warn('[useTrack] fatal', err)
    }
  }

  return { track }
}
