import { defineEventHandler, readBody, createError, getQuery, getHeader } from 'h3'
import nodemailer from 'nodemailer'
import jwt from 'jsonwebtoken'
import { resolveTenantFromRequest } from '../../utils/tenant'
import { getTenantSender, getTenantSiteUrlForEvent } from '../../utils/tenantSiteUrl'
import { sendMetaEvent, newMetaEventId } from '../../utils/metaPixel'
import { recordServerEvent } from '../../utils/eventsRecorder'
import { EVENT_NAMES } from '../../utils/eventConstants'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const propertyId = parseInt(query.propertyId as string)
    const body = await readBody<{
      name: string
      email: string
      phone?: string
      message: string
      property?: any // Property snapshot for email context
      /**
       * Optional dedup id from the browser pixel. If the client also fires
       * `fbq('track', 'Lead', ..., { eventID })` with this same value Meta
       * will dedupe the browser + CAPI events into one. Generated server-
       * side if absent so the CAPI event still has a stable id.
       */
      _metaEventId?: string
    }>(event)
    
    const config = useRuntimeConfig()

    if (!propertyId || isNaN(propertyId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid property ID'
      })
    }

    // Validate required fields
    if (!body.name || !body.email || !body.message) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Name, email, and message are required'
      })
    }

    // Get property details
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      }
    })

    if (!property) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Property not found'
      })
    }

    // Get user from token if available (for authenticated users)
    let userId: number | null = null
    const authHeader = getHeader(event, 'authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7)
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any
        userId = decoded.userId
      } catch (error) {
        // Token invalid or expired, continue as guest inquiry
        console.log('Invalid token for inquiry, continuing as guest')
      }
    }

    // Resolve tenant for this inquiry
    const adminId = await resolveTenantFromRequest(event)

    // Create inquiry record
    const inquiry = await prisma.propertyInquiry.create({
      data: {
        userId: userId, // Can be null for guest users
        propertyId: propertyId,
        message: body.message,
        status: 'pending',
        ...(adminId ? { adminId } : {})
      },
      include: {
        user: userId ? {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        } : false,
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            city: true,
            province: true,
            price: true,
            mlsNumber: true
          }
        }
      }
    })

    // Resolve the absolute URL for THIS tenant before email build (so the
    // realtor receives links pointing to their own subdomain / custom domain
    // rather than a global default).
    const tenantSiteUrl = await getTenantSiteUrlForEvent(event, adminId)

    await sendInquiryEmail({
      inquirerName: body.name,
      inquirerEmail: body.email,
      inquirerPhone: body.phone,
      message: body.message,
      property: property,
      propertySnapshot: body.property,
      config: config,
      tenantSiteUrl,
      adminId,
    })

    // Meta CAPI: server-side Lead event (deduped with browser pixel via
    // shared event_id). Fire-and-forget — failure here must not break the
    // user's inquiry submission.
    const metaEventId = body._metaEventId || newMetaEventId()
    const [firstName, ...rest] = (body.name || '').trim().split(/\s+/)
    void sendMetaEvent({
      adminId,
      eventName: 'Lead',
      eventId: metaEventId,
      event,
      userData: {
        email: body.email,
        phone: body.phone,
        firstName: firstName || undefined,
        lastName: rest.length > 0 ? rest.join(' ') : undefined,
        city: property.city || undefined,
        province: property.province || undefined,
        postalCode: property.postalCode || undefined,
      },
      customData: {
        currency: 'CAD',
        value: typeof property.price === 'number' ? property.price : undefined,
        contentName: property.title || `Property #${property.id}`,
        contentCategory: 'property_inquiry',
        contentIds: [property.id],
      },
    })

    // First-party event log: drives lead scoring + automation rules.
    // Fire-and-forget — analytics must not block the user response.
    void recordServerEvent(event, {
      adminId,
      name: EVENT_NAMES.INQUIRY_SENT,
      email: body.email,
      objectType: 'property',
      objectId: property.id,
      properties: {
        propertyTitle: property.title || null,
        city: property.city || null,
        province: property.province || null,
        price: typeof property.price === 'number' ? property.price : null,
        message: body.message,
        formName: 'property_inquiry',
      },
    })

    return { ...inquiry, _metaEventId: metaEventId }
  } catch (error: any) {
    console.error('Error creating property inquiry:', error)
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create inquiry'
    })
  }
})

async function sendInquiryEmail({
  inquirerName,
  inquirerEmail,
  inquirerPhone,
  message,
  property,
  propertySnapshot,
  config,
  tenantSiteUrl,
  adminId,
}: {
  inquirerName: string
  inquirerEmail: string
  inquirerPhone?: string
  message: string
  property: any
  propertySnapshot?: any
  config: any
  tenantSiteUrl: string
  adminId: number | null
}) {
  try {
    const transporter = nodemailer.createTransport({
      host: config.smtpHostname || 'smtp.gmail.com',
      port: Number(config.smtpPort || 587),
      secure: false,
      auth: {
        user: config.smtpUsername,
        pass: config.smtpPassword
      }
    })

    // Resolve recipient: route to the actual tenant admin (per the
    // subdomain the visitor was on), not a global AGENT_EMAIL hardcode.
    // Falls back to env when no tenant resolves.
    let recipientEmail = config.agentEmail || 'real4ojulari@gmail.com'
    if (adminId) {
      try {
        const tenantAdmin = await prisma.user.findUnique({
          where: { id: adminId },
          select: { email: true },
        })
        if (tenantAdmin?.email) recipientEmail = tenantAdmin.email
      } catch (err) {
        console.warn('[inquiry] tenant admin lookup failed, using config.agentEmail:', err)
      }
    }

    // Resolve branded From + Reply-To. Visitor's email goes in Reply-To
    // (so admin can reply directly); From shows the tenant's business
    // name with the SMTP-authenticated address as the envelope.
    const tenantSender = await getTenantSender(adminId)
    const from = tenantSender.formatted
    
    // Use property snapshot if available, otherwise use property from DB
    const propertyInfo = propertySnapshot || property
    const propertyTitle = propertyInfo.title || 'Property'
    const propertyAddress = propertyInfo.address || 'Address not available'
    const propertyCity = propertyInfo.city || ''
    const propertyPrice = propertyInfo.price ? `$${propertyInfo.price.toLocaleString()}` : 'Price not available'
    const mlsNumber = propertyInfo.mlsNumber || 'N/A'
    // Always derive the link from the resolved tenant URL — never from
    // `propertySnapshot.url`. The snapshot is mirrored from the request
    // body, which is whatever origin the visitor's browser was on. A
    // dev session at http://localhost:3000 submitting an inquiry would
    // otherwise put a localhost link into the realtor's inbox; a tenant
    // visiting `acme.deelbot.ai` would burn that one tenant's host
    // into mail going to a realtor on a different tenant. Trusting
    // tenantSiteUrl (Host header → tenantSettings → apex fallback)
    // keeps the canonical URL correct in all paths.
    const propertyUrl = `${tenantSiteUrl}/property/${property.id}`

    const emailSubject = `New Property Inquiry: ${propertyTitle}`
    
    const emailText = `
New Property Inquiry Received

Property Details:
- Title: ${propertyTitle}
- Address: ${propertyAddress}, ${propertyCity}
- Price: ${propertyPrice}
- MLS Number: ${mlsNumber}
- Property URL: ${propertyUrl}

Inquirer Information:
- Name: ${inquirerName}
- Email: ${inquirerEmail}
- Phone: ${inquirerPhone || 'Not provided'}

Message:
${message}

---
This inquiry was submitted through your real estate website.
Please respond to the inquirer directly at ${inquirerEmail}.
    `.trim()

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>New Property Inquiry</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .property-info { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #2563eb; }
        .inquirer-info { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #10b981; }
        .message-box { background-color: white; padding: 15px; margin: 15px 0; border: 1px solid #e5e7eb; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .btn { display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>New Property Inquiry</h1>
        </div>
        
        <div class="content">
            <div class="property-info">
                <h3>Property Details</h3>
                <p><strong>Title:</strong> <a href="${propertyUrl}" style="color: #2563eb; text-decoration: none;">${propertyTitle}</a></p>
                <p><strong>Address:</strong> <a href="${propertyUrl}" style="color: #333; text-decoration: none;">${propertyAddress}, ${propertyCity}</a></p>
                <p><strong>Price:</strong> ${propertyPrice}</p>
                <p><strong>MLS Number:</strong> ${mlsNumber}</p>
                <p><a href="${propertyUrl}" class="btn">View Property</a></p>
            </div>
            
            <div class="inquirer-info">
                <h3>Inquirer Information</h3>
                <p><strong>Name:</strong> ${inquirerName}</p>
                <p><strong>Email:</strong> <a href="mailto:${inquirerEmail}">${inquirerEmail}</a></p>
                <p><strong>Phone:</strong> ${inquirerPhone || 'Not provided'}</p>
            </div>
            
            <div class="message-box">
                <h3>Message</h3>
                <p>${message.replace(/\n/g, '<br>')}</p>
            </div>
        </div>
        
        <div class="footer">
            <p>This inquiry was submitted through your real estate website.</p>
            <p>Please respond to the inquirer directly at <a href="mailto:${inquirerEmail}">${inquirerEmail}</a>.</p>
        </div>
    </div>
</body>
</html>
    `.trim()

    await transporter.sendMail({
      from,
      to: recipientEmail,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
      replyTo: inquirerEmail // Allow easy reply to the inquirer
    })

    console.log(`✅ Inquiry email sent successfully to ${recipientEmail}`)
  } catch (error) {
    console.error('❌ Failed to send inquiry email:', error)
    // Don't throw error here - we don't want to fail the inquiry creation if email fails
  }
}
