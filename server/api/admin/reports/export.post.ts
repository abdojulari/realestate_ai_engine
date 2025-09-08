import { defineEventHandler, readBody, createError, setHeader } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const { format, dateRange, customRange, type } = await readBody(event)

  try {
    // Get data based on the report type
    let data: any[] = []
    
    switch (type) {
      case 'listings':
        data = await getListingsData(dateRange, customRange)
        break
      case 'users':
        data = await getUsersData(dateRange, customRange)
        break
      case 'inquiries':
        data = await getInquiriesData(dateRange, customRange)
        break
      case 'viewings':
        data = await getViewingsData(dateRange, customRange)
        break
      default:
        data = await getListingsData(dateRange, customRange)
    }

    if (format === 'excel') {
      return generateExcelReport(event, data, type)
    } else if (format === 'pdf') {
      return generatePDFReport(event, data, type)
    } else {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid format. Use "excel" or "pdf"'
      })
    }
  } catch (error: any) {
    console.error('Export error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate report'
    })
  }
})

async function getListingsData(dateRange: string, customRange?: any) {
  const where: any = { status: 'for_sale' }
  
  // Add date filtering if needed
  if (dateRange !== 'all') {
    const dateFilter = getDateFilter(dateRange, customRange)
    if (dateFilter) {
      where.createdAt = dateFilter
    }
  }

  const properties = await prisma.property.findMany({
    where,
    include: {
      user: { select: { firstName: true, lastName: true, email: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  return properties.map(p => ({
    id: p.id,
    title: p.title,
    price: p.price,
    beds: p.beds,
    baths: p.baths,
    sqft: p.sqft,
    type: p.type,
    city: p.city,
    address: p.address,
    agent: `${p.user.firstName} ${p.user.lastName}`,
    views: p.views,
    createdAt: p.createdAt,
    source: p.source
  }))
}

async function getUsersData(dateRange: string, customRange?: any) {
  const where: any = {}
  
  if (dateRange !== 'all') {
    const dateFilter = getDateFilter(dateRange, customRange)
    if (dateFilter) {
      where.createdAt = dateFilter
    }
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  })

  return users.map(u => ({
    id: u.id,
    name: `${u.firstName} ${u.lastName}`,
    email: u.email,
    phone: u.phone,
    role: u.role,
    createdAt: u.createdAt
  }))
}

async function getInquiriesData(dateRange: string, customRange?: any) {
  // For now, return empty array since inquiries table might not have data
  return []
}

async function getViewingsData(dateRange: string, customRange?: any) {
  // For now, return empty array since viewings table might not have data
  return []
}

function getDateFilter(dateRange: string, customRange?: any) {
  const now = new Date()
  
  switch (dateRange) {
    case 'last_7_days':
      return { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
    case 'last_30_days':
      return { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
    case 'last_90_days':
      return { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) }
    case 'this_year':
      return { gte: new Date(now.getFullYear(), 0, 1) }
    case 'custom':
      if (customRange?.start && customRange?.end) {
        return {
          gte: new Date(customRange.start),
          lte: new Date(customRange.end)
        }
      }
      return null
    default:
      return null
  }
}

async function generateExcelReport(event: any, data: any[], type: string) {
  // Generate CSV format (which Excel can open properly)
  if (data.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No data to export'
    })
  }

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        // Escape quotes and wrap in quotes if contains comma
        const stringValue = String(value || '')
        return stringValue.includes(',') ? `"${stringValue.replace(/"/g, '""')}"` : stringValue
      }).join(',')
    )
  ].join('\n')

  // Set proper headers for CSV download (Excel will open it)
  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="${type}-report.csv"`)
  
  return csvContent
}

async function generatePDFReport(event: any, data: any[], type: string) {
  // Generate HTML format for now (browsers can save as PDF)
  if (data.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No data to export'
    })
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${type.charAt(0).toUpperCase() + type.slice(1)} Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #1976d2; border-bottom: 2px solid #1976d2; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9f9f9; }
      </style>
    </head>
    <body>
      <h1>${type.charAt(0).toUpperCase() + type.slice(1)} Report</h1>
      <p>Generated on: ${new Date().toLocaleString()}</p>
      <p>Total Records: ${data.length}</p>
      
      <table>
        <thead>
          <tr>
            ${Object.keys(data[0] || {}).map(key => `<th>${key}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map(row => 
            `<tr>${Object.values(row).map(value => `<td>${value || ''}</td>`).join('')}</tr>`
          ).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `

  // Set proper headers for HTML download (user can save as PDF)
  setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="${type}-report.html"`)
  
  return htmlContent
}
