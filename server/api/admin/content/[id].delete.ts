import { defineEventHandler, createError } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  // Note: This endpoint is whitelisted in auth middleware, so no authentication required
  const id = Number((event.context.params as any).id)
  await prisma.contentBlock.delete({ where: { id } })
  return { success: true }
})


