import { defineEventHandler, readBody, createError } from 'h3'
import {
  assertRegisterEmail,
  assertRegisterPassword,
  assertPersonName,
  optionalPhone,
  optionalPreferredContactTime,
} from '../../utils/authInputValidation'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { resolveTenantFromRequest } from '../../utils/tenant'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const email = assertRegisterEmail(body?.email)
    const password = assertRegisterPassword(body?.password)
    const firstName = assertPersonName(body?.firstName, 'first name')
    const lastName = assertPersonName(body?.lastName, 'last name')
    const phone = optionalPhone(body?.phone)
    const preferredContactTime = optionalPreferredContactTime(body?.preferredContactTime)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      throw createError({
        statusCode: 400,
        statusMessage: 'User already exists'
      })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Derive the tenant admin from the subdomain the visitor signed up
    // on (e.g. tonahomes.deelbot.ai → Tona Homes admin id). Without
    // this every signup becomes a tenant-orphan: User.adminId stays
    // null, downstream tenant scoping (alerts, inquiries, dashboards)
    // either skips them or attaches them to the wrong realtor. This
    // resolver also handles customDomain (acmesrealty.com) and the
    // X-Tenant-Domain header used by some integrations.
    //
    // null is acceptable here only when the request lands on the
    // canonical apex (deelbot.ai) without a tenant context — in that
    // case the user is signing up to the SaaS shell, not a realtor's
    // site, and adminId stays null on purpose.
    const tenantAdminId = await resolveTenantFromRequest(event)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        ...(phone !== undefined && { phone }),
        ...(preferredContactTime !== undefined && { preferredContactTime }),
        ...(tenantAdminId ? { adminId: tenantAdminId } : {}),
      }
    })

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '1h' }
    )

    const { password: _, ...userWithoutPassword } = user

    return {
      user: userWithoutPassword,
      token
    }
  } catch (error: unknown) {
    const e = error as { statusCode?: number }
    if (typeof e?.statusCode === 'number') {
      throw error
    }
    console.error('[auth/register] unexpected error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Registration failed',
    })
  }
})
