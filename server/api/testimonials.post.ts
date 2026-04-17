import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { resolveTenantFromRequest } from '../utils/tenant'
import { upsertCrmClientFromPlatformContact } from '../utils/crmClientSync'
import { getUploadRoot } from '../utils/uploadStorage'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  try {
    const formData = await readMultipartFormData(event)
    if (!formData) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No form data received'
      })
    }

    // Parse form fields
    const data: any = {}
    let photoFile: any = null

    formData.forEach((field) => {
      if (field.name === 'photo' && field.type?.startsWith('image/')) {
        photoFile = field
      } else if (field.data) {
        data[field.name || ''] = field.data.toString()
      }
    })

    // Validate required fields
    const requiredFields = ['name', 'email', 'location', 'propertyType', 'content', 'consent']
    for (const field of requiredFields) {
      if (!data[field]) {
        throw createError({
          statusCode: 400,
          statusMessage: `${field} is required`
        })
      }
    }

    // Validate consent
    if (data.consent !== 'true') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Consent is required to submit testimonial'
      })
    }

    // Validate rating
    const rating = parseInt(data.rating) || 5
    if (rating < 1 || rating > 5) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Rating must be between 1 and 5'
      })
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(data.email)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Please provide a valid email address'
      })
    }

    // Handle photo upload
    let avatarPath = null
    if (photoFile && photoFile.data) {
      try {
        const uploadRoot = getUploadRoot()
        const uploadsDir = join(uploadRoot, 'testimonials')
        await mkdir(uploadsDir, { recursive: true })

        const fileExtension = photoFile.filename?.split('.').pop() || 'jpg'
        const fileName = `${randomUUID()}.${fileExtension}`
        const filePath = join(uploadsDir, fileName)

        await writeFile(filePath, photoFile.data)
        avatarPath = `/uploads/testimonials/${fileName}`
        console.log(`[Testimonial] Photo saved: ${filePath} → ${avatarPath}`)
      } catch (error) {
        console.error('[Testimonial] Error uploading photo:', error)
      }
    }

    // Get client info for spam prevention
    const clientIP = event.node.req.headers['x-forwarded-for'] || event.node.req.connection?.remoteAddress || 'unknown'
    const userAgent = event.node.req.headers['user-agent']

    // Resolve tenant
    const adminId = await resolveTenantFromRequest(event)

    // Create testimonial record
    const testimonial = await prisma.testimonial.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        location: data.location,
        content: data.content,
        rating: rating,
        propertyType: data.propertyType,
        avatar: avatarPath,
        approved: false, // Admin approval required
        featured: false, // Not featured by default
        ipAddress: (clientIP || null) as any,
        userAgent: userAgent || null,
        ...(adminId ? { adminId } : {})
      }
    })

    if (adminId && data.email) {
      await upsertCrmClientFromPlatformContact(prisma, {
        adminId,
        email: data.email,
        fullName: data.name,
        phone: data.phone || null,
        source: 'testimonial',
        sourceId: testimonial.id,
      })
    }

    // Send notification email to admin (optional)
    try {
      // You can add email notification here using your existing email system
      console.log(`New testimonial submitted by ${data.name} (ID: ${testimonial.id})`)
    } catch (emailError) {
      console.error('Failed to send admin notification:', emailError)
      // Don't fail the request if email fails
    }

    return {
      success: true,
      message: 'Testimonial submitted successfully',
      id: testimonial.id
    }

  } catch (error: any) {
    console.error('Error creating testimonial:', error)
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to submit testimonial'
    })
  }
})
