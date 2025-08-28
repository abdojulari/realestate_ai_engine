import { defineEventHandler, createError } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const admin = (event as any).context?.user
  if (!admin) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  if (admin.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const id = Number((event.context.params as any)?.id)
  if (!Number.isFinite(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  await prisma.property.delete({ where: { id } })
  return { ok: true }
})


