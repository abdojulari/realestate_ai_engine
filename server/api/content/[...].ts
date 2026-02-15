import { createRouter, defineEventHandler, readBody } from 'h3'
import { PrismaClient } from '@prisma/client'
import { getPublicTenantFilter } from '../../utils/tenant'

const prisma = new PrismaClient()
const router = createRouter()

// Get all content blocks
router.get('/', defineEventHandler(async (event) => {
  const tenantFilter = await getPublicTenantFilter(event)
  const blocks = await prisma.contentBlock.findMany({ where: { ...tenantFilter } })
  return blocks
}))

// Get content block by key
router.get('/:key', defineEventHandler(async (event) => {
  const tenantFilter = await getPublicTenantFilter(event)
  const key = event.context.params?.key
  
  const block = await prisma.contentBlock.findFirst({
    where: { key, ...tenantFilter },
  })

  if (!block) {
    return { status: 404, body: { error: 'Content block not found' } }
  }

  return block
}))

// Create content block (admin only)
router.post('/', defineEventHandler(async (event) => {
  // TODO: Add admin authentication middleware
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
  // TODO: Add admin authentication middleware
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
  // TODO: Add admin authentication middleware
  const key = event.context.params?.key
  
  await prisma.contentBlock.delete({
    where: { key } as any,
  })

  return { status: 200, body: { message: 'Content block deleted successfully' } }
}))

export default router
