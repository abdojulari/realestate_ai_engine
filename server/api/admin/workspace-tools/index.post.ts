import { createError, defineEventHandler, readBody } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { requireFeatureForUser, FEATURES } from '../../../utils/license'
import { getAdminIdForCreate } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


const ALLOWED_KINDS = new Set(['whiteboard'])
const ICON_RE = /^mdi-[a-z0-9-]{1,64}$/i

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  await requireFeatureForUser(FEATURES.WORKSPACE_TOOLS, user, event)
  const body = await readBody(event) as Record<string, unknown>

  const name = typeof body.name === 'string' ? body.name.replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, 120) : ''
  if (name.length < 2) {
    throw createError({ statusCode: 400, statusMessage: 'Name must be at least 2 characters' })
  }

  const description =
    typeof body.description === 'string' ? body.description.replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, 2000) : ''

  let icon = typeof body.icon === 'string' ? body.icon.trim() : 'mdi-draw'
  if (!ICON_RE.test(icon)) icon = 'mdi-draw'

  const kind = typeof body.kind === 'string' ? body.kind : 'whiteboard'
  if (!ALLOWED_KINDS.has(kind)) {
    throw createError({ statusCode: 400, statusMessage: 'Unsupported tool kind' })
  }

  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
  const slug = `${baseSlug || 'tool'}-${Date.now()}`
  const adminId = getAdminIdForCreate(user)

  try {
    const tool = await prisma.workspaceTool.create({
      data: {
        adminId,
        name,
        slug,
        description: description || null,
        icon,
        kind,
        sortOrder: typeof body.sortOrder === 'number' && Number.isFinite(body.sortOrder) ? body.sortOrder : 0,
      },
    })
    return { success: true, tool }
  } catch (e: any) {
    if (e?.code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'A tool with this slug already exists' })
    }
    throw e
  }
})
