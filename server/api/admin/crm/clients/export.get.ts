import * as XLSX from 'xlsx'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../utils/auth'
import { getTenantFilter } from '../../../../utils/tenant'
import {
  CLIENT_COLUMNS,
  TEMPLATE_HEADERS,
  clientToExportRow,
} from '../../../../utils/crmClientImport'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma

/**
 * GET /api/admin/crm/clients/export?format=xlsx|csv&type=&status=&search=
 *
 * Streams the current tenant's clients as a spreadsheet using the same column
 * layout as the import template, so an exported file can be edited and
 * re-imported (e.g. for bulk edits in Excel).
 */
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)
  const query = getQuery(event)

  const format = (query.format as string)?.toLowerCase() === 'csv' ? 'csv' : 'xlsx'
  const type = query.type as string | undefined
  const status = query.status as string | undefined
  const search = query.search as string | undefined

  const where: Record<string, unknown> = { ...tenantFilter }
  if (type && type !== 'All') where.type = type
  if (status && status !== 'All') where.status = status
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ]
  }

  const clients = await prisma.crmClient.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  const rows = clients.map(clientToExportRow)
  const ws = XLSX.utils.json_to_sheet(rows, { header: [...TEMPLATE_HEADERS] })
  ws['!cols'] = CLIENT_COLUMNS.map(col => ({ wch: Math.max(16, Math.min(48, col.header.length + 2)) }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Clients')

  const stamp = new Date().toISOString().slice(0, 10)
  const filename = `crm-clients-${stamp}.${format}`

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
