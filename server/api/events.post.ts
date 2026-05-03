/**
 * POST /api/events
 *
 * Public, unauthenticated event ingestion endpoint. Accepts a single
 * event object emitted from the browser via the `useTrack()` composable.
 *
 * Request body:
 *   {
 *     name:         string  (required, lowercase snake_case, see EVENT_NAMES)
 *     properties?:  Record<string, unknown>
 *     objectType?:  string
 *     objectId?:    number
 *     email?:       string         // when known (post form-submit)
 *     path?:        string
 *     referrer?:    string
 *     utm?:         { source, medium, campaign, term, content }
 *   }
 *
 * Response:
 *   { ok: true, visitorId, sessionId }
 *
 * Notes:
 *   • Cookies `vid` (1y) and `sid` (30 min idle) are set on the response
 *     by the recorder so subsequent events stitch correctly.
 *   • Failures never return 5xx — analytics must not break the page.
 *   • Tenant adminId is resolved from the request domain.
 */
import { defineEventHandler, readBody, getMethod, setResponseStatus } from 'h3'
import { recordEventFromBrowser, type BrowserEventBody } from '../utils/eventsRecorder'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') {
    setResponseStatus(event, 405)
    return { ok: false, error: 'Method not allowed' }
  }

  let body: BrowserEventBody
  try {
    body = await readBody<BrowserEventBody>(event)
  } catch {
    setResponseStatus(event, 400)
    return { ok: false, error: 'Invalid JSON body' }
  }

  if (!body || typeof body.name !== 'string') {
    setResponseStatus(event, 400)
    return { ok: false, error: 'name is required' }
  }

  const result = await recordEventFromBrowser(event, body).catch((err) => {
    console.error('[/api/events] recorder failed', err)
    return { ok: false } as const
  })

  // Always 200 from the browser's perspective so a fetch in beacon mode
  // doesn't surface a console error for end users.
  return result.ok
    ? { ok: true, visitorId: result.visitorId, sessionId: result.sessionId, eventLogId: result.eventLogId }
    : { ok: false }
})
