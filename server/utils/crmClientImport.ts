/**
 * CRM Client Import / Export Schema
 * ─────────────────────────────────
 * Single source of truth for the column order, friendly headers, and
 * parse/validate/format rules used by the template download, the export
 * download, and the .xlsx/.csv importer.
 *
 * Keeping these in one place means the template a user downloads is
 * GUARANTEED to round-trip back through the importer without surprises.
 */

export const CLIENT_TYPES = ['lead', 'buyer', 'seller', 'investor'] as const
export const CLIENT_STATUSES = ['active', 'inactive', 'closed'] as const
export const HOLIDAY_KEYS = ['christmas', 'new_year', 'eid'] as const

export type ClientType = (typeof CLIENT_TYPES)[number]
export type ClientStatus = (typeof CLIENT_STATUSES)[number]

// Column order = template column order = export column order.
// `key` is the internal field name; `header` is what the user sees in Excel.
export const CLIENT_COLUMNS: ReadonlyArray<{ key: string; header: string }> = [
  { key: 'firstName',           header: 'First Name *' },
  { key: 'lastName',            header: 'Last Name *' },
  { key: 'email',               header: 'Email' },
  { key: 'phone',               header: 'Phone' },
  { key: 'type',                header: 'Type (lead | buyer | seller | investor)' },
  { key: 'status',              header: 'Status (active | inactive | closed)' },
  { key: 'notes',               header: 'Notes' },
  { key: 'dateOfBirth',         header: 'Date of Birth (YYYY-MM-DD)' },
  { key: 'weddingAnniversary',  header: 'Wedding Anniversary (YYYY-MM-DD)' },
  { key: 'closingAnniversary',  header: 'Closing Anniversary (YYYY-MM-DD)' },
  { key: 'holidayExceptions',   header: 'Holiday Exceptions (comma-separated: christmas, new_year, eid)' },
  { key: 'tags',                header: 'Tags (comma-separated)' },
] as const

// Two example rows that ship in the template so users see the expected shape.
export const TEMPLATE_EXAMPLE_ROWS: ReadonlyArray<Record<string, string>> = [
  {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@example.com',
    phone: '+1 403 555 0142',
    type: 'buyer',
    status: 'active',
    notes: 'Pre-approved up to $850k. Prefers SW Calgary.',
    dateOfBirth: '1988-04-12',
    weddingAnniversary: '2014-09-20',
    closingAnniversary: '',
    holidayExceptions: '',
    tags: 'first-time-buyer, downtown',
  },
  {
    firstName: 'Ahmed',
    lastName: 'Khan',
    email: 'ahmed@example.com',
    phone: '',
    type: 'lead',
    status: 'active',
    notes: '',
    dateOfBirth: '',
    weddingAnniversary: '',
    closingAnniversary: '2024-06-01',
    holidayExceptions: 'christmas',
    tags: '',
  },
]

// Build a lookup from any header variant the user might send back to our internal `key`.
// We accept either the exact label, or just the part before parens/asterisks
// (so users renaming the column to "Email" or "First Name" still works).
function normalizeHeader(s: string): string {
  return String(s ?? '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, '') // strip parenthesised hints
    .replace(/\*/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim()
}

const HEADER_LOOKUP: Record<string, string> = (() => {
  const out: Record<string, string> = {}
  for (const c of CLIENT_COLUMNS) {
    out[normalizeHeader(c.header)] = c.key
    out[normalizeHeader(c.key)] = c.key
  }
  // Common aliases tenants tend to type by hand:
  out[normalizeHeader('first name')] = 'firstName'
  out[normalizeHeader('last name')] = 'lastName'
  out[normalizeHeader('mobile')] = 'phone'
  out[normalizeHeader('telephone')] = 'phone'
  out[normalizeHeader('e-mail')] = 'email'
  out[normalizeHeader('dob')] = 'dateOfBirth'
  out[normalizeHeader('birthday')] = 'dateOfBirth'
  out[normalizeHeader('anniversary')] = 'weddingAnniversary'
  return out
})()

export function mapHeaderToKey(rawHeader: string): string | null {
  return HEADER_LOOKUP[normalizeHeader(rawHeader)] ?? null
}

// ── Cell-level coercion helpers ─────────────────────────────────────────────

function trimOrEmpty(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

/**
 * Excel cells with `cellDates: true` come through as JS Date objects; raw
 * strings ("2024-06-01" or "06/01/2024") come through as strings; CSVs are
 * always strings. Normalise all three to a Date or null.
 */
function coerceDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === '') return null
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v
  const s = String(v).trim()
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

function coerceList(v: unknown): string[] {
  const s = trimOrEmpty(v)
  if (!s) return []
  return s
    .split(/[,;|]/)
    .map(x => x.trim())
    .filter(Boolean)
}

export interface ParsedClientRow {
  rowNumber: number              // 1-indexed row in the source sheet (header = row 1)
  data: {
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
    type: ClientType
    status: ClientStatus
    notes: string | null
    dateOfBirth: Date | null
    weddingAnniversary: Date | null
    closingAnniversary: Date | null
    holidayExceptions: string[]
    tags: string[]
  }
  errors: string[]               // empty => row is valid
}

/**
 * Validate + coerce a raw row (already keyed by internal field names).
 * Returns the row even on error so the caller can show a useful error report.
 */
export function parseClientRow(raw: Record<string, unknown>, rowNumber: number): ParsedClientRow {
  const errors: string[] = []

  const firstName = trimOrEmpty(raw.firstName)
  const lastName = trimOrEmpty(raw.lastName)
  if (!firstName) errors.push('First Name is required')
  if (!lastName) errors.push('Last Name is required')

  const email = trimOrEmpty(raw.email).toLowerCase()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push(`Email "${email}" looks invalid`)
  }

  const typeRaw = trimOrEmpty(raw.type).toLowerCase()
  const type: ClientType = (CLIENT_TYPES as ReadonlyArray<string>).includes(typeRaw)
    ? (typeRaw as ClientType)
    : 'lead'
  if (typeRaw && type !== typeRaw) {
    errors.push(`Type "${typeRaw}" is not one of ${CLIENT_TYPES.join(', ')} — defaulted to "lead"`)
  }

  const statusRaw = trimOrEmpty(raw.status).toLowerCase()
  const status: ClientStatus = (CLIENT_STATUSES as ReadonlyArray<string>).includes(statusRaw)
    ? (statusRaw as ClientStatus)
    : 'active'
  if (statusRaw && status !== statusRaw) {
    errors.push(`Status "${statusRaw}" is not one of ${CLIENT_STATUSES.join(', ')} — defaulted to "active"`)
  }

  const dob = coerceDate(raw.dateOfBirth)
  if (raw.dateOfBirth && !dob) errors.push(`Date of Birth "${raw.dateOfBirth}" could not be parsed`)
  const wedding = coerceDate(raw.weddingAnniversary)
  if (raw.weddingAnniversary && !wedding) errors.push(`Wedding Anniversary "${raw.weddingAnniversary}" could not be parsed`)
  const closing = coerceDate(raw.closingAnniversary)
  if (raw.closingAnniversary && !closing) errors.push(`Closing Anniversary "${raw.closingAnniversary}" could not be parsed`)

  const holidayExceptions = coerceList(raw.holidayExceptions)
    .map(h => h.toLowerCase().replace(/[\s-]+/g, '_'))
    .filter(h => (HOLIDAY_KEYS as ReadonlyArray<string>).includes(h))

  return {
    rowNumber,
    data: {
      firstName,
      lastName,
      email: email || null,
      phone: trimOrEmpty(raw.phone) || null,
      type,
      status,
      notes: trimOrEmpty(raw.notes) || null,
      dateOfBirth: dob,
      weddingAnniversary: wedding,
      closingAnniversary: closing,
      holidayExceptions,
      tags: coerceList(raw.tags),
    },
    errors,
  }
}

// ── Export helpers ──────────────────────────────────────────────────────────

function fmtDate(d: Date | null | undefined): string {
  if (!d) return ''
  const dt = d instanceof Date ? d : new Date(d)
  if (isNaN(dt.getTime())) return ''
  return dt.toISOString().slice(0, 10)
}

export interface ExportableClient {
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  type: string
  status: string
  notes: string | null
  dateOfBirth: Date | null
  weddingAnniversary: Date | null
  closingAnniversary: Date | null
  holidayExceptions: string[]
  tags: unknown
}

/**
 * Convert a Prisma CrmClient row to a record keyed by the user-facing column
 * headers, ready to hand to xlsx.utils.json_to_sheet.
 */
export function clientToExportRow(c: ExportableClient): Record<string, string> {
  const tags = Array.isArray(c.tags) ? (c.tags as unknown[]).map(String).join(', ') : ''
  const headerFor = (key: string) => CLIENT_COLUMNS.find(col => col.key === key)!.header
  return {
    [headerFor('firstName')]:           c.firstName ?? '',
    [headerFor('lastName')]:            c.lastName ?? '',
    [headerFor('email')]:               c.email ?? '',
    [headerFor('phone')]:               c.phone ?? '',
    [headerFor('type')]:                c.type ?? '',
    [headerFor('status')]:              c.status ?? '',
    [headerFor('notes')]:               c.notes ?? '',
    [headerFor('dateOfBirth')]:         fmtDate(c.dateOfBirth),
    [headerFor('weddingAnniversary')]:  fmtDate(c.weddingAnniversary),
    [headerFor('closingAnniversary')]:  fmtDate(c.closingAnniversary),
    [headerFor('holidayExceptions')]:   (c.holidayExceptions || []).join(', '),
    [headerFor('tags')]:                tags,
  }
}

export const TEMPLATE_HEADERS: string[] = CLIENT_COLUMNS.map(c => c.header)
