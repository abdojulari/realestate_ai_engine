import { defineEventHandler, createError } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const admin = (event as any).context?.user
  if (!admin) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  if (admin.role !== 'admin' && admin.role !== 'agent') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const id = Number((event.context.params as any).id)
  const block = await prisma.contentBlock.findUnique({ where: { id } })
  if (!block) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const meta = ((): any => { try { return typeof block.metadata === 'string' ? JSON.parse(block.metadata) : block.metadata || {} } catch { return {} } })()
  const published = !(meta.published ?? true)
  const updated = await prisma.contentBlock.update({ where: { id }, data: { metadata: { ...meta, published } as any } })
  return updated
})


