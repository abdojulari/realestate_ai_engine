/**
 * Generate iCalendar (.ics) content for calendar invites.
 * Follows RFC 5545 spec for broad client compatibility.
 */

interface IcsEvent {
  uid: string
  summary: string
  description?: string
  location?: string
  start: Date
  end: Date
  organizerName?: string
  organizerEmail?: string
  attendeeName?: string
  attendeeEmail?: string
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function formatIcsDate(d: Date): string {
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  )
}

function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

export function generateIcs(event: IcsEvent): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Suhani//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(event.start)}`,
    `DTEND:${formatIcsDate(event.end)}`,
    `SUMMARY:${escapeIcs(event.summary)}`,
  ]

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcs(event.description)}`)
  }
  if (event.location) {
    lines.push(`LOCATION:${escapeIcs(event.location)}`)
  }
  if (event.organizerEmail) {
    const cn = event.organizerName ? `;CN=${escapeIcs(event.organizerName)}` : ''
    lines.push(`ORGANIZER${cn}:mailto:${event.organizerEmail}`)
  }
  if (event.attendeeEmail) {
    const cn = event.attendeeName ? `;CN=${escapeIcs(event.attendeeName)}` : ''
    lines.push(`ATTENDEE;RSVP=TRUE;PARTSTAT=NEEDS-ACTION${cn}:mailto:${event.attendeeEmail}`)
  }

  lines.push(
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    `BEGIN:VALARM`,
    `TRIGGER:-PT30M`,
    `ACTION:DISPLAY`,
    `DESCRIPTION:Reminder`,
    `END:VALARM`,
    'END:VEVENT',
    'END:VCALENDAR'
  )

  return lines.join('\r\n')
}
