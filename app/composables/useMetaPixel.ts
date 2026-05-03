/**
 * useMetaPixel
 * ────────────
 * Browser-side helper for the Meta (Facebook) Pixel. Pairs with the
 * server-side Conversions API in `server/utils/metaPixel.ts`.
 *
 * Init flow:
 *   1. The default layout SSR-injects the official `fbq` snippet with the
 *      resolved pixel id (tenant override → platform default). That handles
 *      the initial PageView.
 *   2. `app/plugins/meta-pixel.client.ts` watches subsequent client-side
 *      route changes and emits PageView for each.
 *   3. Page components call `useMetaPixel().trackLead(...)` etc. on form
 *      submit success — passing the SAME `eventId` they sent to the API
 *      route so server-side CAPI can dedupe.
 *
 * If the pixel never initialised (no id configured for this tenant) every
 * helper here is a no-op — guards make it safe to call from any page.
 */

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void
      queue?: unknown[]
      loaded?: boolean
      version?: string
    }
    _fbq?: unknown
    /**
     * Set by the SSR-injected snippet so the client plugin and composable
     * know which pixel id is actually live for this request.
     */
    __metaPixelId?: string
  }
}

export interface MetaTrackOptions {
  /**
   * Stable id used for deduplication with a server-side CAPI event of the
   * same name. Generate ONCE per business event (e.g. one form submit) and
   * pass to both `fbq` and the API call. If omitted, no dedup is possible.
   */
  eventId?: string
  /** Custom-data payload — currency/value/contentName/etc. */
  custom?: Record<string, unknown>
}

/**
 * Internal: safely call fbq even if the snippet hasn't loaded yet (it
 * queues calls during the first ~50ms before the script downloads).
 */
function callFbq(...args: unknown[]): boolean {
  if (typeof window === 'undefined') return false
  const fbq = window.fbq
  if (typeof fbq !== 'function') return false
  try {
    fbq(...(args as []))
    return true
  } catch (err) {
    // Don't let a malformed payload break the page.
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[meta-pixel] fbq call failed:', err)
    }
    return false
  }
}

export function useMetaPixel() {
  const isReady = (): boolean =>
    typeof window !== 'undefined' && typeof window.fbq === 'function'

  const trackPageView = (): boolean => callFbq('track', 'PageView')

  const trackLead = (custom?: Record<string, unknown>, opts?: MetaTrackOptions): boolean => {
    const eventId = opts?.eventId
    if (eventId) {
      return callFbq('track', 'Lead', custom || {}, { eventID: eventId })
    }
    return callFbq('track', 'Lead', custom || {})
  }

  const trackSubscribe = (
    custom?: Record<string, unknown>,
    opts?: MetaTrackOptions
  ): boolean => {
    const eventId = opts?.eventId
    if (eventId) {
      return callFbq('track', 'Subscribe', custom || {}, { eventID: eventId })
    }
    return callFbq('track', 'Subscribe', custom || {})
  }

  const trackViewContent = (
    custom?: Record<string, unknown>,
    opts?: MetaTrackOptions
  ): boolean => {
    const eventId = opts?.eventId
    if (eventId) {
      return callFbq('track', 'ViewContent', custom || {}, { eventID: eventId })
    }
    return callFbq('track', 'ViewContent', custom || {})
  }

  const trackContact = (custom?: Record<string, unknown>, opts?: MetaTrackOptions): boolean => {
    const eventId = opts?.eventId
    if (eventId) {
      return callFbq('track', 'Contact', custom || {}, { eventID: eventId })
    }
    return callFbq('track', 'Contact', custom || {})
  }

  /**
   * Generic escape hatch — use one of the named trackers above when there
   * is one (Meta dashboards group standard events nicely).
   */
  const trackCustom = (
    eventName: string,
    custom?: Record<string, unknown>,
    opts?: MetaTrackOptions
  ): boolean => {
    const eventId = opts?.eventId
    if (eventId) {
      return callFbq('trackCustom', eventName, custom || {}, { eventID: eventId })
    }
    return callFbq('trackCustom', eventName, custom || {})
  }

  /**
   * Generate a UUID-ish event id usable by both browser pixel and server
   * CAPI for dedup. crypto.randomUUID is available in all evergreen
   * browsers and Node 18+; falls back to a Math.random hex on antique
   * browsers so we never throw.
   */
  const newEventId = (): string => {
    if (typeof window !== 'undefined' && typeof window.crypto?.randomUUID === 'function') {
      return window.crypto.randomUUID()
    }
    return (
      Math.random().toString(16).slice(2) +
      Date.now().toString(16) +
      Math.random().toString(16).slice(2)
    )
  }

  return {
    isReady,
    trackPageView,
    trackLead,
    trackSubscribe,
    trackViewContent,
    trackContact,
    trackCustom,
    newEventId,
  }
}
