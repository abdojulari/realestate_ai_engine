import { defineEventHandler, readBody, createError, getHeader, setHeader } from 'h3'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { rateLimit, rateLimitConfigs } from '../utils/rateLimiter'
import { queueEmail } from '../utils/emailQueue'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  // Apply rate limiting for estimate submissions
  const rateLimitResult = await rateLimit(event, rateLimitConfigs.estimates)
  
  // Set rate limit headers
  setHeader(event, 'X-RateLimit-Limit', rateLimitConfigs.estimates.maxRequests.toString())
  setHeader(event, 'X-RateLimit-Remaining', rateLimitResult.remaining.toString())
  setHeader(event, 'X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString())
  
  if (!rateLimitResult.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many estimate requests. Please try again later.'
    })
  }

  try {
    const body = await readBody<{
      property: {
        address: string
        postalCode: string
        propertyType: string
        beds: number
        baths: number
        sqft: number
        yearBuilt: number
        lotSize: string
      }
      features: {
        condition: string
        selectedFeatures: string[]
        renovations: string[]
        additionalInfo?: string
      }
      contact: {
        firstName: string
        lastName: string
        email: string
        phone: string
        timeframe: string
        contactPreference: boolean
      }
    }>(event)

    // Validate required fields
    if (!body.property || !body.features || !body.contact) {
      throw createError({
        statusCode: 400,
        statusMessage: 'All form sections are required'
      })
    }

    if (!body.contact.firstName || !body.contact.lastName || !body.contact.email || !body.contact.phone) {
      throw createError({
        statusCode: 400,
        statusMessage: 'All contact fields are required'
      })
    }

    if (!body.property.address || !body.property.postalCode || !body.property.propertyType) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Address, postal code, and property type are required'
      })
    }

    // Validate property details
    if (body.property.beds === undefined || body.property.beds === null || body.property.beds < 0 || body.property.beds > 20) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bedrooms must be between 0 and 20'
      })
    }

    if (body.property.baths === undefined || body.property.baths === null || body.property.baths < 0 || body.property.baths > 20) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bathrooms must be between 0 and 20'
      })
    }

    if (!body.property.sqft || body.property.sqft < 100 || body.property.sqft > 50000) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Square footage must be between 100 and 50,000'
      })
    }

    const currentYear = new Date().getFullYear()
    if (!body.property.yearBuilt || body.property.yearBuilt < 1800 || body.property.yearBuilt > currentYear) {
      throw createError({
        statusCode: 400,
        statusMessage: `Year built must be between 1800 and ${currentYear}`
      })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.contact.email)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Please provide a valid email address'
      })
    }

    // Check if user is authenticated (optional)
    let userId: number | null = null
    const authHeader = getHeader(event, 'authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7)
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any
        userId = decoded.userId
      } catch (error) {
        // Token invalid or expired, continue as guest submission
        console.log('Invalid token for estimate, continuing as guest')
      }
    }

    // Create home estimate record
    const estimate = await prisma.homeEstimate.create({
      data: {
        userId: userId,
        // Property Details
        address: body.property.address,
        postalCode: body.property.postalCode,
        propertyType: body.property.propertyType,
        beds: body.property.beds,
        baths: body.property.baths,
        sqft: body.property.sqft,
        yearBuilt: body.property.yearBuilt,
        lotSize: body.property.lotSize,
        // Features
        condition: body.features.condition,
        features: body.features.selectedFeatures,
        renovations: body.features.renovations,
        additionalInfo: body.features.additionalInfo || null,
        // Contact
        firstName: body.contact.firstName,
        lastName: body.contact.lastName,
        email: body.contact.email,
        phone: body.contact.phone,
        timeframe: body.contact.timeframe,
        contactPreference: body.contact.contactPreference
      },
      include: {
        user: userId ? {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        } : false
      }
    })

    // Queue email notifications (non-blocking)
    const requestId = event.context.requestId
    queueEstimateEmails(estimate, requestId)

    return estimate
  } catch (error) {
    console.error('Error creating home estimate:', error)
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create home estimate request'
    })
  }
})

async function queueEstimateEmails(estimate: any, requestId?: string) {
  try {
    // Queue notification to admin
    const adminEmailBody = `
New Home Estimate Request #${estimate.id}

Property Details:
- Address: ${estimate.address}
- Postal Code: ${estimate.postalCode}
- Property Type: ${estimate.propertyType}
- Bedrooms: ${estimate.beds}
- Bathrooms: ${estimate.baths}
- Square Feet: ${estimate.sqft}
- Year Built: ${estimate.yearBuilt}
- Lot Size: ${estimate.lotSize}

Property Features:
- Condition: ${estimate.condition}
- Features: ${Array.isArray(estimate.features) ? estimate.features.join(', ') : 'None selected'}
- Recent Renovations: ${Array.isArray(estimate.renovations) ? estimate.renovations.join(', ') : 'None'}
- Additional Info: ${estimate.additionalInfo || 'None provided'}

Contact Information:
- Name: ${estimate.firstName} ${estimate.lastName}
- Email: ${estimate.email}
- Phone: ${estimate.phone}
- Timeframe: ${estimate.timeframe}
- Preferred Contact: ${estimate.contactPreference ? 'Email' : 'Phone'}

Submitted: ${new Date(estimate.createdAt).toLocaleString()}

Please log into the admin dashboard to respond to this request.
    `

    await queueEmail({
      to: process.env.SMTP_USERNAME || '', // Admin email
      subject: `New Home Estimate Request - ${estimate.firstName} ${estimate.lastName}`,
      text: adminEmailBody,
      requestId
    })

    // Queue confirmation to user
    const userEmailBody = `
Dear ${estimate.firstName},

Thank you for requesting a home value estimate! We've received your information for the property at ${estimate.address}.

What happens next:
1. One of our experienced real estate professionals will review your property details
2. We'll research recent comparable sales in your area
3. You'll receive a detailed market analysis within 24-48 hours

Your submission details:
- Property: ${estimate.address}, ${estimate.postalCode}
- Type: ${estimate.propertyType}
- Size: ${estimate.beds} bed, ${estimate.baths} bath, ${estimate.sqft} sq ft

If you have any immediate questions, feel free to contact us directly.

Best regards,
The Real Estate Team
    `

    await queueEmail({
      to: estimate.email,
      subject: 'Your Home Estimate Request - Confirmation',
      text: userEmailBody,
      requestId
    })

    const logPrefix = requestId ? `[${requestId}]` : '[EMAIL]'
    console.log(`${logPrefix} Estimate emails queued for request #${estimate.id}`)
  } catch (error) {
    const logPrefix = requestId ? `[${requestId}]` : '[EMAIL]'
    console.error(`${logPrefix} Error queueing estimate emails:`, error)
    // Don't throw error here - we don't want email issues to break the estimate submission
  }
}
