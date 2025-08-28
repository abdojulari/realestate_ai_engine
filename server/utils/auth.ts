import { createError, getHeader } from 'h3'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function requireAuth(event: any) {
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
    const decoded = jwt.verify(token, secret) as { id: number, email: string }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true
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
      statusCode: 401,
      statusMessage: 'Invalid token'
    })
  }
}

export async function requireAdmin(event: any) {
  const user = await requireAuth(event)
  
  if (user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Admin access required'
    })
  }
  
  return user
}
