import { createRouter, defineEventHandler, readBody, useBase } from 'h3'
import { getPublicTenantFilter } from '../../utils/tenant'
import { requireAdmin } from '../../utils/auth'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
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

// Create content block (admin only)
router.post('/', defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)
  
  const block = await prisma.contentBlock.create({
    data: {
      ...body,
      metadata: body.metadata ? JSON.stringify(body.metadata) : null,
    },
  })

  return block
}))

// Update content block (admin only)
router.put('/:key', defineEventHandler(async (event) => {
  await requireAdmin(event)
  const key = event.context.params?.key
  const body = await readBody(event)
  
  const block = await prisma.contentBlock.update({
    where: { key } as any,
    data: {
      ...body,
      metadata: body.metadata ? JSON.stringify(body.metadata) : null,
    },
  })

  return block
}))

// Delete content block (admin only)
router.delete('/:key', defineEventHandler(async (event) => {
  await requireAdmin(event)
  const key = event.context.params?.key
  
  await prisma.contentBlock.delete({
    where: { key } as any,
  })

  return { success: true, message: 'Content block deleted successfully' }
}))

export default useBase('/api/content', router.handler)
