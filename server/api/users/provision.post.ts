// POST /api/users/provision - Provision a new user from SaaS Control Plane
// This endpoint is called when a user completes their subscription
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Generate a random secure password
function generateRandomPassword(length = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const special = '!@#$%^&*'
  const allChars = uppercase + lowercase + numbers + special
  
  let password = ''
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += special[Math.floor(Math.random() * special.length)]
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

// Validate subscription tier
function validateTier(plan: string): string {
  const validTiers = ['basic', 'silver', 'gold', 'platinum', 'enterprise']
  const tier = plan.toLowerCase()
  return validTiers.includes(tier) ? tier : 'basic'
}

export default defineEventHandler(async (event) => {
  try {
    // Verify the request is from the control plane
    const apiKey = getHeader(event, 'x-api-key')
    const expectedApiKey = process.env.CONTROL_PLANE_API_KEY
    
    if (!expectedApiKey) {
      console.warn('[Provision] CONTROL_PLANE_API_KEY not set, allowing request')
    } else if (apiKey !== expectedApiKey) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized: Invalid API key'
      })
    }

    const body = await readBody(event)
    
    const { email, firstName, lastName, phone, plan, tenantId, domain } = body
    
    if (!email || !firstName || !lastName || !plan) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: email, firstName, lastName, plan'
      })
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })
    
    // Validate and normalize the subscription tier
    const subscriptionTier = validateTier(plan)
    
    if (existingUser) {
      // Update existing user's subscription tier
      // Only update if they're already an admin
      if (existingUser.role === 'admin' || existingUser.role === 'super_admin') {
        await prisma.user.update({
          where: { email },
          data: { subscriptionTier }
        })
      } else {
        // Upgrade to admin if they weren't before
        await prisma.user.update({
          where: { email },
          data: { 
            role: 'admin',
            subscriptionTier 
          }
        })
      }
      
      return {
        success: true,
        message: 'User already exists, subscription updated',
        userId: existingUser.id,
        email: existingUser.email,
        isExisting: true,
        role: 'admin',
        subscriptionTier
      }
    }
    
    // Generate random password
    const rawPassword = generateRandomPassword(14)
    const hashedPassword = await bcrypt.hash(rawPassword, 12)
    
    // All subscribers become admins with their subscription tier
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone: phone || null,
        role: 'admin', // All subscribers are admins
        subscriptionTier, // Their plan determines feature access
        provider: 'saas-control-plane',
        providerId: tenantId || null,
        marketingConsent: true,
        consentDate: new Date(),
      }
    })
    
    console.log(`[Provision] Created admin ${email} with subscription tier ${subscriptionTier}`)
    
    return {
      success: true,
      message: 'Admin user created successfully',
      userId: user.id,
      email: user.email,
      role: user.role,
      subscriptionTier: user.subscriptionTier,
      firstName: user.firstName,
      lastName: user.lastName,
      isExisting: false,
      // Return the raw password so it can be emailed to the user
      temporaryPassword: rawPassword
    }
    
  } catch (error: any) {
    console.error('[Provision] Error:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to provision user'
    })
  }
})
