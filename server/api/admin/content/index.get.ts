import { defineEventHandler, getQuery } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


function mapBlock(block: any) {
  const metadata = ((): any => {
    try { return typeof block.metadata === 'string' ? JSON.parse(block.metadata) : block.metadata || {} } catch { return {} }
  })()
  return {
    id: block.id,
    key: block.key,
    title: block.title,
    type: block.type,
    content: block.content,
    section: metadata.section || 'general',
    published: metadata.published ?? true,
    metadata,
    createdAt: block.createdAt,
    updatedAt: block.updatedAt
  }
}

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)

  const q = getQuery(event)
  const search = (q.search as string) || ''
  const section = (q.section as string) || undefined

  const where: any = { ...tenantFilter }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { key: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } }
    ]
  }

  const blocks = await prisma.contentBlock.findMany({ where, orderBy: { updatedAt: 'desc' } })
  const mapped = blocks.map(mapBlock).filter(b => (section ? b.section === section : true))
  return mapped
})
