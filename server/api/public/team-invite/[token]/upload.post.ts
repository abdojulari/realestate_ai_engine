import { defineEventHandler, readMultipartFormData, createError, getRouterParam } from 'h3'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { PrismaClient } from '@prisma/client'
import { hashInviteToken } from '../../../../utils/partnershipsShared'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

const MAX_BYTES = 8 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

function fail(statusCode: number, message: string) {
  return createError({ statusCode, statusMessage: message })
}

export default defineEventHandler(async (event) => {
  const raw = getRouterParam(event, 'token') || ''
  const token = decodeURIComponent(raw).trim()
  if (!token || token.length > 200) {
    throw fail(400, 'Invalid invitation link')
  }

  const tokenHash = hashInviteToken(token)
  const invite = await prisma.partnershipTeamInvite.findUnique({
    where: { tokenHash },
    select: { id: true, expiresAt: true, redeemedAt: true },
  })

  if (!invite) {
    throw fail(404, 'Invitation not found')
  }
  if (invite.redeemedAt) {
    throw fail(400, 'This invitation link has already been used')
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    throw fail(400, 'This invitation has expired')
  }

  let formData
  try {
    formData = await readMultipartFormData(event)
  } catch {
    throw fail(413, `Image too large (max ${Math.round(MAX_BYTES / (1024 * 1024))}MB)`)
  }

  const file = formData?.find((f) => f.name === 'image' || f.name === 'file')
  if (!file?.data) {
    throw fail(400, 'No image file found')
  }

  if (!ALLOWED_TYPES.includes(file.type || '')) {
    throw fail(415, 'Use JPEG, PNG, GIF, or WebP')
  }

  if (file.data.length > MAX_BYTES) {
    throw fail(413, 'Image too large')
  }

  try {
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'partnerships')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const ext = (file.filename?.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 10)
    const filename = `invite-${invite.id}-${timestamp}-${randomStr}.${ext}`

    await writeFile(join(uploadDir, filename), file.data)

    return {
      success: true,
      url: `/uploads/partnerships/${filename}`,
    }
  } catch (err: unknown) {
    console.error('[team-invite upload]', err)
    throw fail(500, 'Could not save image')
  }
})
