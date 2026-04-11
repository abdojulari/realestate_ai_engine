import { defineEventHandler, createError, getHeader } from 'h3'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  try {
    const authHeader = getHeader(event, 'authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError({
        statusCode: 401,
        statusMessage: 'No token provided'
      })
    }

    const token = authHeader.split(' ')[1]
    if (!token) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid token format'
      })
    }
    
    const secret = process.env.JWT_SECRET || 'fallback-secret'
    const decoded = jwt.verify(token, secret) as { id: number }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        preferredContactTime: true,
        role: true,
        adminId: true,
        delegatedAdminPermissions: true,
        delegationExcludedUserIds: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    return user
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 401,
      statusMessage: error.statusMessage || 'Authentication failed'
    })
  }
})
