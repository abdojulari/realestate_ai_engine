import { defineEventHandler, readBody, createError } from 'h3'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  const { accessToken } = await readBody(event)

  if (!accessToken) {
    throw createError({ statusCode: 400, statusMessage: 'Missing Facebook access token' })
  }

  const res = await fetch(
    `https://graph.facebook.com/v24.0/me?fields=id,name,email,first_name,last_name,picture&access_token=${encodeURIComponent(accessToken)}`
  )
  const info = await res.json() as any

  if (info.error) {
    throw createError({ statusCode: 401, statusMessage: `Facebook API error: ${info.error.message}` })
  }

  if (!info.email) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Facebook did not return an email address. Please ensure email permission is granted.'
    })
  }

  const user = await prisma.user.upsert({
    where: { email: info.email },
    update: {
      firstName: info.first_name || 'Facebook',
      lastName: info.last_name || 'User',
      provider: 'facebook',
      providerId: info.id,
    },
    create: {
      email: info.email,
      firstName: info.first_name || 'Facebook',
      lastName: info.last_name || 'User',
      role: 'user',
      provider: 'facebook',
      providerId: info.id,
    },
  })

  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: '1h' }
  )

  return { token, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } }
})
