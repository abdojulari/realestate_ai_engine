import { defineEventHandler, readBody, createError, getRouterParam } from 'h3'
import { PrismaClient } from '@prisma/client'
import {
  hashInviteToken,
  normalizeEmail,
  parseInviteSubmittedPhotoUrl,
  trimOpt,
  trimStr,
} from '../../../utils/partnershipsShared'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

export default defineEventHandler(async (event) => {
  const raw = getRouterParam(event, 'token') || ''
  const token = decodeURIComponent(raw).trim()
  if (!token || token.length > 200) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid invitation link' })
  }

  const tokenHash = hashInviteToken(token)
  const body = await readBody(event)

  const contactName = trimStr(body?.contactName, 200)
  const organization = trimStr(body?.organization, 300)
  const phone = trimStr(body?.phone, 80)
  const email = normalizeEmail(body?.email)
  const address = trimStr(body?.address, 2000)
  const bio = trimOpt(body?.bio, 4000)
  const credentials = trimOpt(body?.credentials, 2000)
  const photoUrl = parseInviteSubmittedPhotoUrl(body?.photoUrl)

  if (!contactName) throw createError({ statusCode: 400, statusMessage: 'Contact name is required' })
  if (!organization) {
    throw createError({ statusCode: 400, statusMessage: 'Brokerage, bank, or firm name is required' })
  }
  if (!phone) throw createError({ statusCode: 400, statusMessage: 'Phone is required' })
  if (!address) throw createError({ statusCode: 400, statusMessage: 'Address is required' })

  try {
    const result = await prisma.$transaction(async (tx) => {
      const invite = await tx.partnershipTeamInvite.findUnique({
        where: { tokenHash },
      })
      if (!invite) {
        throw createError({ statusCode: 404, statusMessage: 'Invitation not found' })
      }
      if (invite.redeemedAt) {
        throw createError({ statusCode: 400, statusMessage: 'This invitation link has already been used' })
      }
      if (invite.expiresAt.getTime() < Date.now()) {
        throw createError({ statusCode: 400, statusMessage: 'This invitation has expired' })
      }

      const member = await tx.partnershipTeamMember.create({
        data: {
          adminId: invite.adminId,
          category: invite.category,
          contactName,
          organization,
          phone,
          email,
          address,
          bio,
          credentials,
          photoUrl,
          approved: false,
          inviteId: invite.id,
        },
        select: { id: true },
      })

      await tx.partnershipTeamInvite.update({
        where: { id: invite.id },
        data: { redeemedAt: new Date() },
      })

      return member
    })

    return { ok: true, id: result.id }
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'statusCode' in e) throw e
    console.error('[team-invite submit]', e)
    throw createError({ statusCode: 500, statusMessage: 'Could not save your profile' })
  }
})
