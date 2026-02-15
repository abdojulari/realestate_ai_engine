import { defineEventHandler } from 'h3'
import { PrismaClient } from '@prisma/client'
import { getPublicTenantFilter } from '../../../utils/tenant'

const prisma = new PrismaClient()

function parseMeta(raw: any) {
  try { return typeof raw === 'string' ? JSON.parse(raw) : (raw || {}) } catch { return {} }
}

export default defineEventHandler(async (event) => {
  const tenantFilter = await getPublicTenantFilter(event)
  const page = (event.context.params as any)?.page || 'home'
  const all = await prisma.contentBlock.findMany({ where: { ...tenantFilter }, orderBy: { updatedAt: 'desc' } })
  const items = all
    .map((b: any) => ({ ...b, metadata: parseMeta(b.metadata) }))
    .filter((b: any) => (b.metadata?.section || 'general') === page)
    .filter((b: any) => b.metadata?.published !== false)

  return { page, items }
})


