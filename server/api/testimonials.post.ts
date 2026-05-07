import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { resolveTenantAdminIdForTestimonialSubmit } from '../utils/tenant'
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
      if (field.name === 'photo' && field.filename) {
        photoFile = field
      } else if (field.data && !field.filename) {
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

    // Handle photo upload (public, anonymous endpoint — be strict).
    //
    // We validate MIME type (not just extension), enforce a hard size cap,
    // and fail the entire request on a bad upload instead of silently saving
    // the testimonial without the photo. Prior behaviour let attackers POST
    // arbitrary bytes up to Nitro's default 50 MB body limit.
    const MAX_PHOTO_BYTES = 5 * 1024 * 1024 // 5 MB
    const ALLOWED_PHOTO_MIME = new Set([
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ])
    const MIME_TO_EXT: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
    }

    let avatarPath: string | null = null
    if (photoFile && photoFile.data) {
      const mime = String(photoFile.type || '').toLowerCase()
      if (!ALLOWED_PHOTO_MIME.has(mime)) {
        throw createError({
          statusCode: 415,
          statusMessage: 'Photo must be a JPEG, PNG, GIF, or WebP image.',
        })
      }
      if (photoFile.data.length > MAX_PHOTO_BYTES) {
        throw createError({
          statusCode: 413,
          statusMessage: `Photo is too large. Maximum size is ${Math.round(
            MAX_PHOTO_BYTES / (1024 * 1024)
          )} MB.`,
        })
      }

      try {
        const uploadRoot = getUploadRoot()
        const uploadsDir = join(uploadRoot, 'testimonials')
        await mkdir(uploadsDir, { recursive: true })

        // Derive the on-disk extension from the validated MIME, never from
        // the client-supplied filename (which could carry `.exe` etc).
        const fileExtension = MIME_TO_EXT[mime] || 'jpg'
        const fileName = `${randomUUID()}.${fileExtension}`
        const filePath = join(uploadsDir, fileName)

        await writeFile(filePath, photoFile.data)
        avatarPath = `/uploads/testimonials/${fileName}`
      } catch (error) {
        console.error('[Testimonial] Error writing photo:', error)
        throw createError({
          statusCode: 500,
          statusMessage: 'Could not save photo. Please try again or omit the photo.',
        })
      }
    }

    // Get client info for spam prevention
    const clientIP = event.node.req.headers['x-forwarded-for'] || event.node.req.connection?.remoteAddress || 'unknown'
    const userAgent = event.node.req.headers['user-agent']

    // Scope to domain tenant — required (no null adminId); Referer/Origin back Host when proxies lie.
    const adminId = await resolveTenantAdminIdForTestimonialSubmit(event)

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
        adminId,
      }
    })

    if (data.email) {
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
