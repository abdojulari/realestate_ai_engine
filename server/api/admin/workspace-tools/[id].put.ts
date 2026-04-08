import { createError, defineEventHandler, readBody } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { requireFeatureForUser, FEATURES } from '../../../utils/license'
import { requireTenantAccess } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

const ICON_RE = /^mdi-[a-z0-9-]{1,64}$/i

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  await requireFeatureForUser(FEATURES.WORKSPACE_TOOLS, user, event)
  const id = parseInt(event.context.params?.id || '0', 10)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const existing = await prisma.workspaceTool.findUnique({ where: { id } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Tool not found' })
  requireTenantAccess(user, existing.adminId)

  const body = await readBody(event) as Record<string, unknown>

  const data: Record<string, unknown> = {}

  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, 120) : ''
    if (name.length < 2) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid name' })
    }
    data.name = name
  }

  if (body.description !== undefined) {
    data.description =
      typeof body.description === 'string'
        ? body.description.replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, 2000) || null
        : null
  }

  if (body.icon !== undefined && typeof body.icon === 'string') {
    const icon = body.icon.trim()
    data.icon = ICON_RE.test(icon) ? icon : existing.icon
  }

  if (body.sortOrder !== undefined && typeof body.sortOrder === 'number' && Number.isFinite(body.sortOrder)) {
    data.sortOrder = Math.floor(body.sortOrder)
  }

  if (body.isActive !== undefined && typeof body.isActive === 'boolean') {
    data.isActive = body.isActive
  }

  if (body.sceneData !== undefined) {
    if (body.sceneData === null) {
      data.sceneData = null
    } else if (typeof body.sceneData === 'object' && body.sceneData !== null) {
      const raw = JSON.stringify(body.sceneData)
      if (raw.length > 8_000_000) {
        throw createError({ statusCode: 400, statusMessage: 'Scene data is too large' })
      }
      data.sceneData = body.sceneData as object
    }
  }

  const tool = await prisma.workspaceTool.update({
    where: { id },
    data: data as any,
  })

  return { success: true, tool }
})
