import { defineEventHandler, createError } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  // Note: This endpoint is whitelisted in auth middleware, so no authentication required
  const id = Number((event.context.params as any).id)
  const block = await prisma.contentBlock.findUnique({ where: { id } })
  if (!block) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const copy = await prisma.contentBlock.create({
    data: {
      key: `${block.key}.copy.${Date.now()}`.slice(0, 191),
      title: `${block.title} (Copy)` ,
      type: block.type,
      content: block.content,
      metadata: block.metadata as any
    }
  })
  return copy
})


