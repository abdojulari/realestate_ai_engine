import * as XLSX from 'xlsx'
import { requireAdmin } from '../../../../utils/auth'
import {
  CLIENT_COLUMNS,
  TEMPLATE_HEADERS,
  TEMPLATE_EXAMPLE_ROWS,
} from '../../../../utils/crmClientImport'

/**
 * GET /api/admin/crm/clients/template?format=xlsx|csv
 *
 * Returns a starter template populated with the canonical header row plus two
 * example client rows. Re-uploading the same file (after editing the rows) is
 * guaranteed to round-trip through /import — same column order, same headers.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const format = (getQuery(event).format as string)?.toLowerCase() === 'csv' ? 'csv' : 'xlsx'

  // Build a 2D array: [headers, ...exampleRows] — keeps column order deterministic.
  const aoa: (string | number)[][] = [
    [...TEMPLATE_HEADERS],
    ...TEMPLATE_EXAMPLE_ROWS.map(row => CLIENT_COLUMNS.map(col => row[col.key] ?? '')),
  ]

  const ws = XLSX.utils.aoa_to_sheet(aoa)

  // Reasonable column widths so the headers don't get truncated in Excel.
  ws['!cols'] = CLIENT_COLUMNS.map(col => ({ wch: Math.max(16, Math.min(48, col.header.length + 2)) }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Clients')

  const filename = `crm-clients-template.${format}`

  if (format === 'csv') {
    const csv = XLSX.utils.sheet_to_csv(ws)
    event.node.res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    event.node.res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    return csv
  }

  const buf: Buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  event.node.res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  event.node.res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  return buf
})
