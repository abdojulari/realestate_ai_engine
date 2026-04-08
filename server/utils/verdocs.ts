/**
 * Verdocs e-sign API (server-side only).
 * Auth: https://developers.verdocs.com/sdks/js-ts/authentication — client_credentials via @verdocs/js-sdk.
 */

import {
  VerdocsEndpoint,
  authenticate,
  DEFAULT_FIELD_HEIGHTS,
  DEFAULT_FIELD_WIDTHS,
  getInPersonLink,
} from '@verdocs/js-sdk'

type EndpointCache = { endpoint: VerdocsEndpoint; expiresAt: number }

let cached: EndpointCache | null = null

/**
 * SDK calls are relative to this host (e.g. POST /v2/oauth2/token). If VERDOCS_API_BASE is a full
 * token URL or includes /v2, normalize to origin so paths are not doubled.
 * VERDOCS_API_URL is accepted as a fallback when teams only set that in .env (matches nuxt runtimeConfig).
 */
export function resolveVerdocsApiBase(): string {
  const primary = (process.env.VERDOCS_API_BASE || '').trim()
  const fallback = (process.env.VERDOCS_API_URL || '').trim()
  let raw = primary || fallback || 'https://api.verdocs.com'
  if (!/^https?:\/\//i.test(raw)) {
    raw = `https://${raw.replace(/^\/+/, '')}`
  }
  try {
    const u = new URL(raw)
    const path = (u.pathname || '').replace(/\/$/, '') || ''
    const origin = `${u.protocol}//${u.host}`
    if (!path || path === '/') return origin
    if (path.includes('oauth')) return origin
    if (path === '/v2' || path.startsWith('/v2/')) return origin
    return `${origin}${path}`
  } catch {
    return (primary || fallback || 'https://api.verdocs.com').replace(/\/$/, '') || 'https://api.verdocs.com'
  }
}

function getConfig() {
  const clientId = (process.env.VERDOCS_CLIENT_ID || '').trim()
  const clientSecret = (process.env.VERDOCS_CLIENT_SECRET || '').trim()
  const apiBase = resolveVerdocsApiBase().replace(/\/$/, '')

  return { clientId, clientSecret, apiBase }
}

export function isVerdocsConfigured(): boolean {
  const { clientId, clientSecret } = getConfig()
  return Boolean(clientId && clientSecret)
}

/**
 * Authenticated SDK endpoint (token cached until shortly before expiry).
 * Uses `persist: false` so nothing is written to browser storage on Node.
 */
export async function getVerdocsEndpoint(): Promise<VerdocsEndpoint> {
  const { clientId, clientSecret, apiBase } = getConfig()
  if (!clientId || !clientSecret) {
    throw new Error('Verdocs is not configured (missing VERDOCS_CLIENT_ID or VERDOCS_CLIENT_SECRET)')
  }

  const now = Date.now()
  if (cached && cached.expiresAt > now + 60_000) {
    return cached.endpoint
  }

  const endpoint = new VerdocsEndpoint({ persist: false })
  endpoint.setBaseURL(apiBase).setClientID(clientId)

  let authResult: Awaited<ReturnType<typeof authenticate>>
  try {
    authResult = await authenticate(endpoint, {
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    })
  } catch (e: unknown) {
    cached = null
    throw e
  }

  endpoint.setToken(authResult.access_token)

  const expiresIn = Number(authResult.expires_in) || 3600
  cached = {
    endpoint,
    expiresAt: now + expiresIn * 1000,
  }
  return endpoint
}

export async function getVerdocsAccessToken(): Promise<string> {
  const endpoint = await getVerdocsEndpoint()
  const token = endpoint.getToken()
  if (!token) {
    throw new Error('Verdocs token missing after authenticate')
  }
  return token
}

export type VerdocsSignerInput = { name: string; email: string; phone?: string }

/** `fixed_first_page`: auto layout on page 1. `signer_places`: page 0 — signers drag in Verdocs. `on_document`: caller supplies page/x/y per field (e.g. click-to-place in your UI). */
export type VerdocsFieldPlacementMode = 'fixed_first_page' | 'signer_places' | 'on_document'

/** One placed field from the PDF picker (signer index 0-based, PDF page 1-based, x/y in PDF user space). */
export type VerdocsManualFieldInput = {
  signerIndex: number
  type: 'signature' | 'initial' | 'timestamp'
  page: number
  x: number
  y: number
}

export type VerdocsDirectFieldOptions = {
  placement: Exclude<VerdocsFieldPlacementMode, 'on_document'>
  includeInitial?: boolean
  includeDateSigned?: boolean
}

export type VerdocsDirectEnvelopeField = {
  document_id: number
  name: string
  role_name: string
  type: 'signature' | 'initial' | 'timestamp'
  page: number
  x: number
  y: number
  width?: number
  height?: number
  required?: boolean
  readonly?: boolean
  label?: string
}

/**
 * Build `fields` for `createEnvelope` (direct / non-template).
 * Each signer gets a signature; optional initial + timestamp (“date signed”) per Verdocs field types.
 */
export function buildVerdocsDirectFields(
  signerCount: number,
  options: VerdocsDirectFieldOptions
): VerdocsDirectEnvelopeField[] {
  const placement = options.placement
  const includeInitial = options.includeInitial !== false
  const includeDateSigned = options.includeDateSigned !== false

  const fields: VerdocsDirectEnvelopeField[] = []

  const baseY = 640
  const rowGap = 112
  const initX = 56
  const sigX = 152
  const stampX = 276

  const xy = (fixedX: number, fixedY: number) =>
    placement === 'signer_places'
      ? { page: 0 as const, x: 0, y: 0 }
      : { page: 1 as const, x: fixedX, y: fixedY }

  for (let i = 0; i < signerCount; i++) {
    const role = `Signer_${i + 1}`
    const yRow = placement === 'signer_places' ? 0 : baseY - i * rowGap

    fields.push({
      document_id: 0,
      name: `sig_${role}`,
      role_name: role,
      type: 'signature',
      ...xy(sigX, yRow),
      width: DEFAULT_FIELD_WIDTHS.signature,
      height: DEFAULT_FIELD_HEIGHTS.signature,
      required: true,
      label: 'Sign',
    })

    if (includeInitial) {
      fields.push({
        document_id: 0,
        name: `initial_${role}`,
        role_name: role,
        type: 'initial',
        ...xy(initX, yRow),
        width: DEFAULT_FIELD_WIDTHS.initial,
        height: DEFAULT_FIELD_HEIGHTS.initial,
        required: true,
        label: 'Initial',
      })
    }

    if (includeDateSigned) {
      fields.push({
        document_id: 0,
        name: `datesigned_${role}`,
        role_name: role,
        type: 'timestamp',
        ...xy(stampX, yRow),
        width: DEFAULT_FIELD_WIDTHS.timestamp,
        height: DEFAULT_FIELD_HEIGHTS.timestamp,
        required: false,
        readonly: true,
        label: 'Date signed',
      })
    }
  }

  return fields
}

export function buildVerdocsManualEnvelopeFields(manual: VerdocsManualFieldInput[]): VerdocsDirectEnvelopeField[] {
  const out: VerdocsDirectEnvelopeField[] = []
  for (let i = 0; i < manual.length; i++) {
    const m = manual[i]!
    const role = `Signer_${m.signerIndex + 1}`
    const t = m.type
    out.push({
      document_id: 0,
      name: `placed_${m.signerIndex}_${t}_${i}`,
      role_name: role,
      type: t,
      page: m.page,
      x: m.x,
      y: m.y,
      width: DEFAULT_FIELD_WIDTHS[t],
      height: DEFAULT_FIELD_HEIGHTS[t],
      required: t !== 'timestamp',
      readonly: t === 'timestamp' ? true : undefined,
      label: t === 'signature' ? 'Sign' : t === 'initial' ? 'Initial' : 'Date signed',
    })
  }
  return out
}

export async function verdocsApi(
  method: string,
  path: string,
  options: { json?: unknown; headers?: Record<string, string> } = {}
): Promise<{ ok: boolean; status: number; data: any; raw: string }> {
  const endpoint = await getVerdocsEndpoint()
  const url = path.startsWith('http') ? path : `${path.startsWith('/') ? '' : '/'}${path}`

  try {
    const res = await endpoint.api.request({
      method,
      url,
      data: options.json,
      headers: options.headers,
      validateStatus: () => true,
    })
    const data = res.data
    const raw = typeof data === 'string' ? data : JSON.stringify(data ?? null)
    return {
      ok: res.status >= 200 && res.status < 300,
      status: res.status,
      data,
      raw,
    }
  } catch (e: any) {
    const status = e.response?.status ?? 500
    const data = e.response?.data ?? { message: e.message }
    const raw = typeof data === 'string' ? data : JSON.stringify(data)
    return { ok: false, status, data, raw }
  }
}

/** Split display name into Verdocs first/last (both required on create). */
export function splitSignerName(full: string): { first_name: string; last_name: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return { first_name: 'Signer', last_name: 'Signer' }
  }
  if (parts.length === 1) {
    return { first_name: parts[0]!, last_name: parts[0]! }
  }
  return { first_name: parts[0]!, last_name: parts.slice(1).join(' ') }
}

export type VerdocsSigningPayload = {
  signingUrl?: string
  embeddedUrl?: string
  signerLinks?: Array<{ email?: string; name?: string; url?: string }>
  verdocsDocumentId?: string
  envelopeId?: string
}

function recipientSigningUrl(r: Record<string, unknown>): string | undefined {
  const candidates = [
    r.signing_url,
    r.signingUrl,
    r.sign_url,
    r.signUrl,
    r.signing_link,
    r.signingLink,
    r.invite_url,
    r.inviteUrl,
    r.url,
    r.href,
    r.link,
  ]
  for (const c of candidates) {
    if (typeof c === 'string' && (c.startsWith('http://') || c.startsWith('https://'))) return c
  }
  return undefined
}

function signingPayloadHasUrl(p: VerdocsSigningPayload): boolean {
  if (p.signingUrl) return true
  return Boolean(p.signerLinks?.some((l) => typeof l.url === 'string' && l.url.length > 0))
}

/** Normalize signing URLs from various Verdocs response shapes (including IEnvelope). */
export function extractSigningPayload(data: any): VerdocsSigningPayload {
  if (!data || typeof data !== 'object') return {}

  // createEnvelope / getEnvelope — IEnvelope
  if (typeof data.id === 'string' && Array.isArray(data.recipients)) {
    const signerLinks: Array<{ email?: string; name?: string; url?: string }> = []
    for (const r of data.recipients) {
      if (!r || r.type !== 'signer') continue
      const url =
        recipientSigningUrl(r as Record<string, unknown>) ||
        r.signing_url ||
        r.signingUrl ||
        r.invite_url ||
        r.inviteUrl ||
        (r as any).link ||
        undefined
      if (url) {
        signerLinks.push({
          email: r.email,
          name: [r.first_name, r.last_name].filter(Boolean).join(' ').trim() || undefined,
          url: String(url),
        })
      }
    }
    const signingUrl = signerLinks.length === 1 ? signerLinks[0]?.url : undefined
    return {
      envelopeId: data.id,
      verdocsDocumentId: data.id,
      signerLinks,
      signingUrl,
    }
  }

  const root = data.data ?? data.document ?? data

  const verdocsDocumentId =
    root.id ||
    root.document_id ||
    root.documentId ||
    data.id ||
    data.document_id ||
    data.envelope_id ||
    data.envelopeId

  let signingUrl =
    root.signing_url ||
    root.signingUrl ||
    data.signing_url ||
    data.signingUrl

  let embeddedUrl =
    root.embedded_url ||
    root.embeddedUrl ||
    data.embedded_url ||
    data.embeddedUrl

  const signerLinks: Array<{ email?: string; name?: string; url?: string }> = []

  const signers = root.signers || data.signers
  if (Array.isArray(signers)) {
    for (const s of signers) {
      const url =
        recipientSigningUrl(s as Record<string, unknown>) ||
        (typeof s.signing_url === 'string' ? s.signing_url : undefined) ||
        (typeof s.signingUrl === 'string' ? s.signingUrl : undefined) ||
        (typeof s.url === 'string' ? s.url : undefined)
      if (url) {
        signerLinks.push({
          email: s.email,
          name: s.name,
          url,
        })
      }
    }
  }

  if (!signingUrl && signerLinks.length === 1) {
    signingUrl = signerLinks[0]?.url
  }

  const idStr = verdocsDocumentId != null ? String(verdocsDocumentId) : undefined
  return {
    signingUrl,
    embeddedUrl,
    signerLinks,
    verdocsDocumentId: idStr,
    envelopeId: idStr,
  }
}

/**
 * POST /v2/envelopes often omits signing URLs on recipients. Use getInPersonLink per signer role
 * when the envelope JSON has no links (SDK: IInPersonLinkResponse.link).
 */
export async function enrichEnvelopeSigningLinks(
  endpoint: VerdocsEndpoint,
  envelope: unknown
): Promise<VerdocsSigningPayload> {
  const base = extractSigningPayload(envelope)
  if (signingPayloadHasUrl(base)) {
    return base
  }

  const env = envelope as {
    id?: string
    recipients?: Array<{
      type?: string
      role_name?: string
      email?: string
      first_name?: string
      last_name?: string
    }>
  }

  const envelopeId = env?.id
  if (!envelopeId || !Array.isArray(env.recipients)) {
    return base
  }

  const signerLinks: NonNullable<VerdocsSigningPayload['signerLinks']> = []

  for (const r of env.recipients) {
    if (!r || r.type !== 'signer' || !r.role_name) continue
    try {
      const res = await getInPersonLink(endpoint, envelopeId, r.role_name)
      if (typeof res?.link === 'string' && res.link.length > 0) {
        signerLinks.push({
          email: r.email,
          name: [r.first_name, r.last_name].filter(Boolean).join(' ').trim() || undefined,
          url: res.link,
        })
      }
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: unknown }; message?: string }
      console.error(
        '[Verdocs] getInPersonLink failed:',
        r.role_name,
        err?.response?.status,
        err?.response?.data || err?.message || e
      )
    }
  }

  if (signerLinks.length === 0) {
    return base
  }

  return {
    ...base,
    envelopeId: base.envelopeId || envelopeId,
    verdocsDocumentId: base.verdocsDocumentId || envelopeId,
    signerLinks,
    signingUrl: signerLinks.length === 1 ? signerLinks[0]?.url : undefined,
  }
}

/** True when Verdocs rejected the uploaded PDF (parser / invalid bytes). */
export function isVerdocsPdfParseError(e: unknown): boolean {
  const err = e as { response?: { data?: unknown }; message?: string }
  const data = err?.response?.data
  const parts: string[] = [String(err?.message || '')]
  if (typeof data === 'string') parts.push(data)
  else if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>
    if (typeof o.message === 'string') parts.push(o.message)
    try {
      parts.push(JSON.stringify(data))
    } catch {
      parts.push(String(data))
    }
  }
  const blob = parts.join(' ').toLowerCase()
  return /failed to parse pdf|parse pdf document|could not parse pdf|invalid pdf file/i.test(blob)
}

/** Axios/fetch-style error → short message for API responses (avoid leaking secrets). */
export function formatVerdocsAxiosError(e: unknown): string {
  const err = e as {
    message?: string
    response?: { status?: number; statusText?: string; data?: unknown }
  }
  const status = err?.response?.status
  const data = err?.response?.data
  let detail = ''
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>
    if (typeof o.message === 'string') detail = o.message
    else if (typeof o.error === 'string') detail = o.error
    else if (Array.isArray(o.errors)) detail = String(o.errors.join('; '))
    else try {
      detail = JSON.stringify(data).slice(0, 400)
    } catch {
      detail = String(data).slice(0, 400)
    }
  } else if (typeof data === 'string') {
    detail = data.replace(/<[^>]+>/g, ' ').slice(0, 400).trim()
  }
  const base =
    (status != null ? `Verdocs HTTP ${status}` : 'Verdocs request failed') +
    (err?.response?.statusText ? ` (${err.response.statusText})` : '')
  if (detail) return `${base}: ${detail}`.slice(0, 500)
  if (err?.message) return `${base}: ${err.message}`.slice(0, 500)
  return base.slice(0, 500)
}
