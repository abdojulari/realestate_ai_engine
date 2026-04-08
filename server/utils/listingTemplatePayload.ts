import { createError } from 'h3'
import sanitizeHtml from 'sanitize-html'

const THEMES = new Set(['luxury', 'modern', 'classic', 'minimal'])
const LAYOUTS = new Set(['hero-gallery', 'slideshow', 'grid', 'split'])
const STATUSES = new Set(['draft', 'published'])
const FONT_ALLOW = new Set([
  'Playfair Display',
  'Inter',
  'Georgia',
  'Helvetica Neue',
  'Lora',
  'Montserrat',
])

const MAX_NAME = 200
const MAX_ADDRESS = 500
const MAX_DESCRIPTION_HTML = 120_000
const MAX_URL_LEN = 2048
const MAX_FEATURES = 80
const MAX_FEATURE_LEN = 200
const MAX_IMAGE_ITEMS = 40
const MAX_FLOOR_ITEMS = 20

const SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'u',
    'a',
    'ul',
    'ol',
    'li',
    'h2',
    'h3',
    'blockquote',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: {},
  allowProtocolRelative: false,
}

export type ListingTemplateTheme = 'luxury' | 'modern' | 'classic' | 'minimal'
export type ListingTemplateLayout = 'hero-gallery' | 'slideshow' | 'grid' | 'split'
export type ListingTemplateStatus = 'draft' | 'published'

export interface ListingTemplateImageItem {
  url: string
  type?: string
  caption?: string
  originalName?: string
  order?: number
}

export interface ListingTemplateFloorItem {
  url: string
  label?: string
}

export interface ParsedListingTemplateBody {
  name: string
  propertyId?: number | null
  propertyAddress?: string | null
  description: string | null
  theme: ListingTemplateTheme
  primaryColor: string
  accentColor: string
  fontFamily: string
  images: ListingTemplateImageItem[]
  floorPlans: ListingTemplateFloorItem[]
  brandingLogo: string | null
  features: string[]
  layout: ListingTemplateLayout
  status: ListingTemplateStatus
}

function assertHexColor(label: string, value: unknown, fallback: string): string {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value !== 'string') {
    throw createError({ statusCode: 400, statusMessage: `Invalid ${label}` })
  }
  const t = value.trim()
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(t)) {
    throw createError({ statusCode: 400, statusMessage: `Invalid ${label} format` })
  }
  return t
}

function safeUploadUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null
  const t = url.trim().slice(0, MAX_URL_LEN)
  if (!t) return null
  if (t.startsWith('/uploads/') && !/\s/.test(t) && !t.includes('//')) return t
  if (/^https:\/\/[a-z0-9][-a-z0-9.]*[a-z0-9]\/.+/i.test(t)) return t
  return null
}

function parseImages(raw: unknown): ListingTemplateImageItem[] {
  if (raw === undefined || raw === null) return []
  if (!Array.isArray(raw)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid images payload' })
  }
  if (raw.length > MAX_IMAGE_ITEMS) {
    throw createError({ statusCode: 400, statusMessage: 'Too many images' })
  }
  const out: ListingTemplateImageItem[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const url = safeUploadUrl(r.url)
    if (!url) continue
    const type =
      typeof r.type === 'string' && ['hero', 'gallery', 'floorplan'].includes(r.type) ? r.type : 'gallery'
    const caption = typeof r.caption === 'string' ? r.caption.trim().slice(0, 500) : ''
    const originalName =
      typeof r.originalName === 'string' ? r.originalName.trim().slice(0, 255) : undefined
    out.push({ url, type, caption, originalName })
  }
  return out
}

function parseFloorPlans(raw: unknown): ListingTemplateFloorItem[] {
  if (raw === undefined || raw === null) return []
  if (!Array.isArray(raw)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid floor plans payload' })
  }
  if (raw.length > MAX_FLOOR_ITEMS) {
    throw createError({ statusCode: 400, statusMessage: 'Too many floor plans' })
  }
  const out: ListingTemplateFloorItem[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const url = safeUploadUrl(r.url)
    if (!url) continue
    const label = typeof r.label === 'string' ? r.label.trim().slice(0, 200) : undefined
    out.push({ url, label })
  }
  return out
}

function parseFeatures(raw: unknown): string[] {
  if (raw === undefined || raw === null) return []
  if (!Array.isArray(raw)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid features payload' })
  }
  if (raw.length > MAX_FEATURES) {
    throw createError({ statusCode: 400, statusMessage: 'Too many features' })
  }
  const out: string[] = []
  for (const f of raw) {
    if (typeof f !== 'string') continue
    const t = f
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
      .replace(/[<>]/g, '')
      .trim()
      .slice(0, MAX_FEATURE_LEN)
    if (t) out.push(t)
  }
  return out
}

export function sanitizeListingDescriptionHtml(html: unknown): string | null {
  if (html === undefined || html === null) return null
  if (typeof html !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid description' })
  }
  if (html.length > MAX_DESCRIPTION_HTML) {
    throw createError({ statusCode: 400, statusMessage: 'Description is too long' })
  }
  const cleaned = sanitizeHtml(html, SANITIZE).trim()
  return cleaned.length ? cleaned : null
}

export function parseListingTemplateCreateBody(body: unknown): ParsedListingTemplateBody {
  if (!body || typeof body !== 'object') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid body' })
  }
  const b = body as Record<string, unknown>

  if (typeof b.name !== 'string' || !b.name.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Template name is required' })
  }
  const name = b.name
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, MAX_NAME)
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Template name is required' })
  }

  let propertyId: number | null | undefined
  if (b.propertyId !== undefined && b.propertyId !== null) {
    const n = Number(b.propertyId)
    if (!Number.isFinite(n) || n < 1) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid property id' })
    }
    propertyId = Math.floor(n)
  }

  let propertyAddress: string | null = null
  if (typeof b.propertyAddress === 'string') {
    propertyAddress =
      b.propertyAddress
        .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
        .replace(/[<>]/g, '')
        .trim()
        .slice(0, MAX_ADDRESS) || null
  }

  const themeRaw = typeof b.theme === 'string' ? b.theme : 'luxury'
  if (!THEMES.has(themeRaw)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid theme' })
  }
  const theme = themeRaw as ListingTemplateTheme

  const layoutRaw = typeof b.layout === 'string' ? b.layout : 'hero-gallery'
  if (!LAYOUTS.has(layoutRaw)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid layout' })
  }
  const layout = layoutRaw as ListingTemplateLayout

  let status: ListingTemplateStatus = 'draft'
  if (b.status !== undefined) {
    if (typeof b.status !== 'string' || !STATUSES.has(b.status)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid status' })
    }
    status = b.status as ListingTemplateStatus
  }

  const fontRaw = typeof b.fontFamily === 'string' ? b.fontFamily.trim() : 'Playfair Display'
  const fontFamily = FONT_ALLOW.has(fontRaw) ? fontRaw : 'Playfair Display'

  const defaults = themeDefaults(theme)
  const primaryColor = assertHexColor('primary color', b.primaryColor, defaults.primary)
  const accentColor = assertHexColor('accent color', b.accentColor, defaults.accent)

  const description = sanitizeListingDescriptionHtml(b.description)

  let brandingLogo: string | null = null
  if (b.brandingLogo !== undefined && b.brandingLogo !== null && b.brandingLogo !== '') {
    const u = safeUploadUrl(b.brandingLogo)
    if (!u) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid branding logo URL' })
    }
    brandingLogo = u
  }

  return {
    name,
    propertyId,
    propertyAddress,
    description,
    theme,
    primaryColor,
    accentColor,
    fontFamily,
    images: parseImages(b.images),
    floorPlans: parseFloorPlans(b.floorPlans),
    brandingLogo,
    features: parseFeatures(b.features),
    layout,
    status,
  }
}

export function parseListingTemplateUpdateBody(body: unknown): Partial<ParsedListingTemplateBody> & {
  aiDescription?: string | null
} {
  if (!body || typeof body !== 'object') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid body' })
  }
  const b = body as Record<string, unknown>
  const out: Partial<ParsedListingTemplateBody> & { aiDescription?: string | null } = {}

  if (b.name !== undefined) {
    if (typeof b.name !== 'string' || !b.name.trim()) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid name' })
    }
    out.name = b.name
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
      .replace(/[<>]/g, '')
      .trim()
      .slice(0, MAX_NAME)
  }
  if (b.propertyId !== undefined) {
    if (b.propertyId === null) out.propertyId = null
    else {
      const n = Number(b.propertyId)
      if (!Number.isFinite(n) || n < 1) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid property id' })
      }
      out.propertyId = Math.floor(n)
    }
  }
  if (b.propertyAddress !== undefined) {
    if (typeof b.propertyAddress !== 'string') {
      out.propertyAddress = null
    } else {
      const t = b.propertyAddress
        .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
        .replace(/[<>]/g, '')
        .trim()
        .slice(0, MAX_ADDRESS)
      out.propertyAddress = t || null
    }
  }
  if (b.description !== undefined) {
    out.description = sanitizeListingDescriptionHtml(b.description)
  }
  if (b.aiDescription !== undefined) {
    if (b.aiDescription === null) out.aiDescription = null
    else out.aiDescription = sanitizeListingDescriptionHtml(b.aiDescription)
  }
  if (b.theme !== undefined) {
    if (typeof b.theme !== 'string' || !THEMES.has(b.theme)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid theme' })
    }
    out.theme = b.theme as ListingTemplateTheme
  }
  if (b.layout !== undefined) {
    if (typeof b.layout !== 'string' || !LAYOUTS.has(b.layout)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid layout' })
    }
    out.layout = b.layout as ListingTemplateLayout
  }
  if (b.status !== undefined) {
    if (typeof b.status !== 'string' || !STATUSES.has(b.status)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid status' })
    }
    out.status = b.status as ListingTemplateStatus
  }
  if (b.fontFamily !== undefined) {
    const fontRaw = typeof b.fontFamily === 'string' ? b.fontFamily.trim() : ''
    if (!FONT_ALLOW.has(fontRaw)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid font family' })
    }
    out.fontFamily = fontRaw
  }
  if (b.primaryColor !== undefined) {
    out.primaryColor = assertHexColor('primary color', b.primaryColor, '#1a1a2e')
  }
  if (b.accentColor !== undefined) {
    out.accentColor = assertHexColor('accent color', b.accentColor, '#c9a96e')
  }
  if (b.images !== undefined) {
    out.images = parseImages(b.images)
  }
  if (b.floorPlans !== undefined) {
    out.floorPlans = parseFloorPlans(b.floorPlans)
  }
  if (b.brandingLogo !== undefined) {
    if (b.brandingLogo === null || b.brandingLogo === '') out.brandingLogo = null
    else {
      const u = safeUploadUrl(b.brandingLogo)
      if (!u) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid branding logo URL' })
      }
      out.brandingLogo = u
    }
  }
  if (b.features !== undefined) {
    out.features = parseFeatures(b.features)
  }

  return out
}

function themeDefaults(theme: ListingTemplateTheme) {
  const map: Record<ListingTemplateTheme, { primary: string; accent: string }> = {
    luxury: { primary: '#1a1a2e', accent: '#c9a96e' },
    modern: { primary: '#0f172a', accent: '#3b82f6' },
    classic: { primary: '#2c1810', accent: '#8b6914' },
    minimal: { primary: '#111111', accent: '#666666' },
  }
  return map[theme]
}
