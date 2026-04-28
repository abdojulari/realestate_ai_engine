/**
 * Calendar helpers — generate downloadable .ics files and quick-add Google
 * Calendar URLs for important dates extracted from a legal document review.
 *
 * The .ics output conforms to RFC 5545 (VCALENDAR/VEVENT/VALARM) so it imports
 * cleanly into Apple Calendar, Outlook, Google Calendar, etc.
 */

export interface CalendarEventInput {
  /** Short title shown in the calendar entry. */
  label: string
  /** Due date as `YYYY-MM-DD` (we treat it as an all-day event). */
  date: string
  /** How many days before the due date the alarm should fire. Defaults to 2. */
  daysBefore?: number
  /** Optional free-text context appended to the event description. */
  context?: string
}

/** Convert a `YYYY-MM-DD` date to the `YYYYMMDD` form required by VEVENT all-day. */
function toIcsDate(d: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((d || '').trim())
  if (!m) return ''
  return `${m[1]}${m[2]}${m[3]}`
}

/** Add `n` days to a `YYYY-MM-DD` date and return another `YYYY-MM-DD` string. */
function shiftDate(d: string, days: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d)
  if (!m) return d
  const dt = new Date(Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!))
  dt.setUTCDate(dt.getUTCDate() + days)
  const y = dt.getUTCFullYear()
  const mo = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const da = String(dt.getUTCDate()).padStart(2, '0')
  return `${y}-${mo}-${da}`
}

/** Escape a value to be embedded in an ICS field per RFC 5545 §3.3.11. */
function escapeIcs(value: string): string {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

/** ICS lines should be folded at 75 octets; we conservatively wrap long lines. */
function foldLine(line: string): string {
  if (line.length <= 73) return line
  const chunks: string[] = []
  let i = 0
  while (i < line.length) {
    chunks.push((i === 0 ? '' : ' ') + line.slice(i, i + 73))
    i += 73
  }
  return chunks.join('\r\n')
}

/** Stable UID per (document, label, date) so re-imports overwrite cleanly. */
function makeUid(documentId: number | string | undefined, label: string, date: string): string {
  const safe = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32)
  const docPart = documentId != null ? String(documentId) : 'doc'
  return `legal-${docPart}-${safe(label) || 'event'}-${date}@deelbot`
}

function nowStamp(): string {
  // UTC timestamp for DTSTAMP — `YYYYMMDDTHHMMSSZ`.
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T` +
    `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  )
}

/**
 * Build a single `BEGIN:VEVENT … END:VEVENT` block (with a VALARM for the
 * email-style reminder) from a date-alert input.
 */
function buildVEvent(
  ev: CalendarEventInput,
  documentName: string | undefined,
  documentId: number | string | undefined,
): string | null {
  const start = toIcsDate(ev.date)
  if (!start) return null
  const end = toIcsDate(shiftDate(ev.date, 1)) // all-day event spans one day
  const summary = ev.label || 'Important date'
  const descParts: string[] = []
  if (ev.context) descParts.push(ev.context)
  if (documentName) descParts.push(`Document: ${documentName}`)
  const description = descParts.join('\n')
  const daysBefore = Math.max(0, Math.floor(ev.daysBefore ?? 2))

  const lines: string[] = [
    'BEGIN:VEVENT',
    `UID:${makeUid(documentId, summary, ev.date)}`,
    `DTSTAMP:${nowStamp()}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${escapeIcs(summary)}`,
  ]
  if (description) lines.push(`DESCRIPTION:${escapeIcs(description)}`)
  // Reminder N days before, at 09:00 local time on the alarm day.
  // VALARM with DISPLAY action is the broadly-supported choice; calendar apps
  // turn this into push/email reminders per the user's settings.
  if (daysBefore > 0) {
    lines.push('BEGIN:VALARM')
    lines.push('ACTION:DISPLAY')
    lines.push(`DESCRIPTION:${escapeIcs(`Reminder: ${summary}`)}`)
    lines.push(`TRIGGER:-P${daysBefore}D`)
    lines.push('END:VALARM')
  }
  lines.push('END:VEVENT')
  return lines.map(foldLine).join('\r\n')
}

/** Build a complete VCALENDAR string from a list of date alerts. */
export function buildIcsCalendar(
  events: CalendarEventInput[],
  opts: { documentName?: string; documentId?: number | string } = {},
): string {
  const eventBlocks = events
    .map((e) => buildVEvent(e, opts.documentName, opts.documentId))
    .filter((s): s is string => Boolean(s))

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DeelBot//Legal Review//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...eventBlocks,
    'END:VCALENDAR',
  ].join('\r\n')
}

/** Trigger a download for the given .ics calendar string. */
export function downloadIcs(filename: string, ics: string): void {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Defer revoke — some browsers cancel the download if revoked synchronously.
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

/**
 * Build a Google Calendar quick-add URL for a single date alert. Opens a
 * pre-filled event creation page for the user.
 */
export function buildGoogleCalendarUrl(
  ev: CalendarEventInput,
  documentName?: string,
): string {
  const start = toIcsDate(ev.date)
  const end = toIcsDate(shiftDate(ev.date, 1))
  if (!start || !end) return 'https://calendar.google.com/'
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.label || 'Important date',
    dates: `${start}/${end}`,
  })
  const desc: string[] = []
  if (ev.context) desc.push(ev.context)
  if (documentName) desc.push(`Document: ${documentName}`)
  if (typeof ev.daysBefore === 'number' && ev.daysBefore > 0) {
    desc.push(`Reminder set ${ev.daysBefore} day(s) before.`)
  }
  if (desc.length) params.set('details', desc.join('\n'))
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/** Sanitise a string for use in a downloaded filename. */
export function safeFilename(name: string, fallback = 'document'): string {
  const cleaned = (name || fallback)
    .replace(/\.[^/.]+$/, '') // strip extension
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
  return cleaned || fallback
}
