import { createRouter, defineEventHandler, readBody, useBase, createError } from 'h3'
import { getPublicTenantFilter, getTenantFilter, getAdminIdForCreate, type TenantUser } from '../../utils/tenant'
import { requireAdmin } from '../../utils/auth'
import {
  contentBlockUsesRichHtml,
  sanitizeContentBlockHtml,
} from '../../utils/contentBlockSanitize'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


function normalizeMetadata(raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null) return undefined
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {}
    } catch {
      return {}
    }
  }
  if (typeof raw === 'object') return raw as Record<string, unknown>
  return undefined
}


const router = createRouter()

// Get all content blocks (public read)
router.get('/', defineEventHandler(async (event) => {
  const tenantFilter = await getPublicTenantFilter(event)
  const blocks = await prisma.contentBlock.findMany({ where: { ...tenantFilter } })
  return blocks
}))

// Get content block by key (public read)
router.get('/:key', defineEventHandler(async (event) => {
  const tenantFilter = await getPublicTenantFilter(event)
  const key = event.context.params?.key

  const block = await prisma.contentBlock.findFirst({
    where: { key, ...tenantFilter },
  })

  if (!block) {
    throw createError({ statusCode: 404, statusMessage: 'Content block not found' })
  }

  return block
}))

// Create content block (admin only) — tenant-scoped; ignores spoofed adminId.
router.post('/', defineEventHandler(async (event) => {
  const user = await requireAdmin(event) as TenantUser
  const adminId = getAdminIdForCreate(user)
  const body = (await readBody(event)) || {}
  const {
    id: _id,
    adminId: _ignoredAdmin,
    createdAt: _c,
    updatedAt: _u,
    key,
    title,
    type,
    content,
    metadata,
  } = body as Record<string, unknown>

  if (typeof key !== 'string' || !key.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'key is required' })
  }

  let safeContent = typeof content === 'string' ? content : ''
  const payloadType = typeof type === 'string' ? type : 'text'
  if (contentBlockUsesRichHtml({ type: payloadType, key })) {
    safeContent = sanitizeContentBlockHtml(safeContent)
  }

  const block = await prisma.contentBlock.create({
    data: {
      key: key.trim(),
      title: typeof title === 'string' ? title : '',
      type: payloadType,
      content: safeContent,
      metadata: normalizeMetadata(metadata) as any,
      adminId,
    },
  })

  return block
}))

// Update content block (admin only) — scoped to caller tenant.
router.put('/:key', defineEventHandler(async (event) => {
  const user = await requireAdmin(event) as TenantUser
  const tenantFilter = getTenantFilter(user)
  const key = event.context.params?.key as string
  const body = (await readBody(event)) || {}

  const existing = await prisma.contentBlock.findFirst({
    where: { key, ...tenantFilter },
  })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Content block not found' })
  }

  const nextKey = typeof body.key === 'string' ? body.key : existing.key
  const nextType = typeof body.type === 'string' ? body.type : existing.type
  const nextTitle = typeof body.title === 'string' ? body.title : existing.title
  let nextContent =
    typeof body.content === 'string' ? body.content : existing.content

  if (typeof body.content === 'string' && contentBlockUsesRichHtml({ type: nextType, key: nextKey })) {
    nextContent = sanitizeContentBlockHtml(nextContent)
  }

  const mergedMeta = {
    ...(typeof existing.metadata === 'object' && existing.metadata !== null
      ? (existing.metadata as Record<string, unknown>)
      : {}),
    ...normalizeMetadata(body.metadata),
  }

  const block = await prisma.contentBlock.update({
    where: { id: existing.id },
    data: {
      key: nextKey,
      title: nextTitle,
      type: nextType,
      content: nextContent,
      metadata: mergedMeta as any,
    },
  })

  return block
}))

// Delete content block (admin only) — scoped to caller tenant.
router.delete('/:key', defineEventHandler(async (event) => {
  const user = await requireAdmin(event) as TenantUser
  const tenantFilter = getTenantFilter(user)
  const key = event.context.params?.key as string

  const existing = await prisma.contentBlock.findFirst({
    where: { key, ...tenantFilter },
  })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Content block not found' })
  }

  await prisma.contentBlock.delete({
    where: { id: existing.id },
  })

  return { success: true, message: 'Content block deleted successfully' }
}))

export default useBase('/api/content', router.handler)
