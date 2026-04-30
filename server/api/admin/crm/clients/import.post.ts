import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import * as XLSX from 'xlsx'
import { PrismaClient, Prisma } from '@prisma/client'
import { requireAdmin } from '../../../../utils/auth'
import { getAdminIdForCreate } from '../../../../utils/tenant'
import {
  CLIENT_COLUMNS,
  mapHeaderToKey,
  parseClientRow,
  type ParsedClientRow,
} from '../../../../utils/crmClientImport'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma

const MAX_BYTES = 10 * 1024 * 1024 // 10MB — well above any realistic client list
const MAX_ROWS = 5000              // sane cap so a runaway sheet can't lock the DB

const ALLOWED_EXTENSIONS = ['xlsx', 'xls', 'csv'] as const

function fail(statusCode: number, code: string, message: string) {
  return createError({
    statusCode,
    statusMessage: message,
    data: { code, message },
  })
}

function detectExtension(filename: string | undefined, mimetype: string | undefined): string | null {
  const fromName = (filename || '').toLowerCase().split('.').pop() || ''
  if ((ALLOWED_EXTENSIONS as ReadonlyArray<string>).includes(fromName)) return fromName
  // Fallbacks based on mime — Excel sometimes ships csv files as application/octet-stream.
  if (mimetype?.includes('spreadsheetml')) return 'xlsx'
  if (mimetype === 'application/vnd.ms-excel') return 'xls'
  if (mimetype?.includes('csv')) return 'csv'
  return null
}

/**
 * POST /api/admin/crm/clients/import   (multipart/form-data, field "file")
 * Optional form field `mode`:
 *   "skip"   (default) — leave existing client (matched by email) untouched
 *   "update"           — overwrite existing client fields with values from the sheet
 *
 * Returns:
 * {
 *   total, created, updated, skipped, failed,
 *   errors: [{ row, name, reason }]
 * }
 */
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const adminId = getAdminIdForCreate(user)

  let formData
  try {
    formData = await readMultipartFormData(event)
  } catch (err: any) {
    console.error('[CRM Client Import] Multipart parse failed:', err?.message || err)
    throw fail(
      413,
      'PAYLOAD_TOO_LARGE',
      `File too large. Maximum size is ${Math.round(MAX_BYTES / (1024 * 1024))}MB.`,
    )
  }

  if (!formData || formData.length === 0) {
    throw fail(400, 'NO_FILE', 'No file was attached to the request.')
  }

  const file = formData.find(f => f.name === 'file')
  if (!file || !file.data) {
    throw fail(400, 'NO_FILE', 'No file was found in the upload (field must be named "file").')
  }

  if (file.data.length > MAX_BYTES) {
    throw fail(
      413,
      'PAYLOAD_TOO_LARGE',
      `File is ${(file.data.length / (1024 * 1024)).toFixed(1)}MB. Maximum is ${Math.round(MAX_BYTES / (1024 * 1024))}MB.`,
    )
  }

  const ext = detectExtension(file.filename, file.type)
  if (!ext) {
    throw fail(415, 'INVALID_TYPE', `Unsupported file type. Upload .xlsx, .xls, or .csv (got "${file.filename || file.type}").`)
  }

  const modeRaw = formData.find(f => f.name === 'mode')?.data?.toString()
  const mode: 'skip' | 'update' = modeRaw === 'update' ? 'update' : 'skip'

  // ── Parse the workbook ────────────────────────────────────────────────────
  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(file.data, { type: 'buffer', cellDates: true })
  } catch (err: any) {
    console.error('[CRM Client Import] XLSX parse failed:', err?.message || err)
    throw fail(400, 'PARSE_FAILED', 'Could not read the file. Make sure it is a valid Excel or CSV file.')
  }

  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    throw fail(400, 'EMPTY_FILE', 'The file does not contain any sheets.')
  }
  const sheet = workbook.Sheets[sheetName]

  // sheet_to_json with header:1 → array of arrays so we can do header mapping ourselves.
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: '',
    raw: false,
  })

  if (aoa.length < 2) {
    throw fail(400, 'EMPTY_FILE', 'The file has no data rows. Use the template and add at least one client row.')
  }

  const rawHeaders = (aoa[0] as unknown[]).map(h => String(h ?? ''))
  const headerKeys = rawHeaders.map(h => mapHeaderToKey(h))

  const knownKeys = new Set(CLIENT_COLUMNS.map(c => c.key))
  const recognised = headerKeys.filter(k => k && knownKeys.has(k))
  if (recognised.length === 0) {
    throw fail(
      400,
      'NO_RECOGNISED_HEADERS',
      'None of the columns matched the expected template. Download the template and use those exact headers.',
    )
  }
  if (!headerKeys.includes('firstName') || !headerKeys.includes('lastName')) {
    throw fail(
      400,
      'MISSING_REQUIRED_COLUMNS',
      'Required columns "First Name" and "Last Name" are missing.',
    )
  }

  const dataRows = aoa.slice(1)
  if (dataRows.length > MAX_ROWS) {
    throw fail(413, 'TOO_MANY_ROWS', `Too many rows (${dataRows.length}). Maximum per import is ${MAX_ROWS}.`)
  }

  // ── Validate rows ─────────────────────────────────────────────────────────
  const seenEmails = new Set<string>()
  const parsedRows: ParsedClientRow[] = []
  const errors: Array<{ row: number; name: string; reason: string }> = []

  for (let i = 0; i < dataRows.length; i++) {
    const rowNumber = i + 2 // +1 for header, +1 for 1-indexing
    const cells = dataRows[i] as unknown[]

    // Skip fully blank rows silently.
    if (cells.every(c => c === '' || c === null || c === undefined)) continue

    const raw: Record<string, unknown> = {}
    for (let c = 0; c < headerKeys.length; c++) {
      const key = headerKeys[c]
      if (!key) continue
      raw[key] = cells[c]
    }

    const parsed = parseClientRow(raw, rowNumber)
    const name = `${parsed.data.firstName} ${parsed.data.lastName}`.trim() || `Row ${rowNumber}`

    // Treat soft warnings (defaulted enum values) as info — don't block insert.
    // Only fail the row when required fields are missing or fields couldn't be parsed at all.
    const blocking = parsed.errors.filter(e =>
      e.includes('required') || e.includes('could not be parsed') || e.includes('looks invalid'),
    )

    if (blocking.length > 0) {
      errors.push({ row: rowNumber, name, reason: blocking.join('; ') })
      continue
    }

    if (parsed.data.email) {
      if (seenEmails.has(parsed.data.email)) {
        errors.push({ row: rowNumber, name, reason: `Duplicate email "${parsed.data.email}" within the file` })
        continue
      }
      seenEmails.add(parsed.data.email)
    }

    parsedRows.push(parsed)
  }

  if (parsedRows.length === 0) {
    return {
      success: true,
      total: dataRows.length,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: errors.length,
      errors,
    }
  }

  // ── Pre-load existing emails so we can decide create-vs-update without
  //    a per-row roundtrip and without violating the [adminId, email] unique.
  const incomingEmails = parsedRows.map(p => p.data.email).filter((e): e is string => !!e)
  const existing = incomingEmails.length
    ? await prisma.crmClient.findMany({
        where: { adminId, email: { in: incomingEmails } },
        select: { id: true, email: true },
      })
    : []
  const existingByEmail = new Map(existing.map(e => [e.email!.toLowerCase(), e.id]))

  let created = 0
  let updated = 0
  let skipped = 0

  // Run in a transaction so a mid-import failure doesn't leave a half-imported list.
  await prisma.$transaction(async (tx) => {
    for (const parsed of parsedRows) {
      const d = parsed.data
      const existingId = d.email ? existingByEmail.get(d.email) : undefined

      const baseData: Prisma.CrmClientUncheckedCreateInput = {
        adminId,
        firstName: d.firstName,
        lastName: d.lastName,
        email: d.email,
        phone: d.phone,
        type: d.type,
        status: d.status,
        source: 'import',
        notes: d.notes,
        tags: d.tags,
        dateOfBirth: d.dateOfBirth,
        weddingAnniversary: d.weddingAnniversary,
        closingAnniversary: d.closingAnniversary,
        holidayExceptions: d.holidayExceptions,
      }

      try {
        if (existingId && mode === 'update') {
          await tx.crmClient.update({
            where: { id: existingId },
            // Don't overwrite adminId/source on update.
            data: {
              firstName: baseData.firstName,
              lastName: baseData.lastName,
              email: baseData.email,
              phone: baseData.phone,
              type: baseData.type,
              status: baseData.status,
              notes: baseData.notes,
              tags: baseData.tags as Prisma.InputJsonValue,
              dateOfBirth: baseData.dateOfBirth,
              weddingAnniversary: baseData.weddingAnniversary,
              closingAnniversary: baseData.closingAnniversary,
              holidayExceptions: baseData.holidayExceptions,
            },
          })
          updated++
        } else if (existingId) {
          skipped++
          errors.push({
            row: parsed.rowNumber,
            name: `${d.firstName} ${d.lastName}`,
            reason: `A client with email "${d.email}" already exists — skipped (use "Update existing" to overwrite)`,
          })
        } else {
          await tx.crmClient.create({
            data: {
              ...baseData,
              tags: baseData.tags as Prisma.InputJsonValue,
            },
          })
          created++
        }
      } catch (err: any) {
        // Don't abort the whole transaction for a single bad row — record it
        // and let the rest of the batch through. Prisma's known-error codes:
        //   P2002 = unique constraint violation.
        const reason = err?.code === 'P2002'
          ? `A client with this email already exists`
          : (err?.message || 'Database error')
        errors.push({
          row: parsed.rowNumber,
          name: `${d.firstName} ${d.lastName}`,
          reason,
        })
      }
    }
  })

  return {
    success: true,
    total: dataRows.length,
    created,
    updated,
    skipped,
    failed: errors.length - skipped, // distinguish hard failures from "skipped duplicates"
    errors,
  }
})
