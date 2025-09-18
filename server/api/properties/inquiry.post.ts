import { defineEventHandler, readBody, createError, getQuery, getHeader } from 'h3'
import { PrismaClient } from '@prisma/client'
import nodemailer from 'nodemailer'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

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

    // Create inquiry record
    const inquiry = await prisma.propertyInquiry.create({
      data: {
        userId: userId, // Can be null for guest users
        propertyId: propertyId,
        message: body.message,
        status: 'pending'
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

    // Send email notification
    await sendInquiryEmail({
      inquirerName: body.name,
      inquirerEmail: body.email,
      inquirerPhone: body.phone,
      message: body.message,
      property: property,
      propertySnapshot: body.property,
      config: config
    })

    return inquiry
  } catch (error) {
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
  config
}: {
  inquirerName: string
  inquirerEmail: string
  inquirerPhone?: string
  message: string
  property: any
  propertySnapshot?: any
  config: any
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

    const from = config.smtpSender || config.smtpUsername
    
    // Determine recipient email - use configured agent emails
    const recipientEmail = config.agentEmail || 'real4ojulari@gmail.com'
    
    // Use property snapshot if available, otherwise use property from DB
    const propertyInfo = propertySnapshot || property
    const propertyTitle = propertyInfo.title || 'Property'
    const propertyAddress = propertyInfo.address || 'Address not available'
    const propertyCity = propertyInfo.city || ''
    const propertyPrice = propertyInfo.price ? `$${propertyInfo.price.toLocaleString()}` : 'Price not available'
    const mlsNumber = propertyInfo.mlsNumber || 'N/A'
    const propertyUrl = propertySnapshot?.url || `${process.env.SITE_URL || 'https://your-site.com'}/property/${property.id}`

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
                <p><strong>Title:</strong> ${propertyTitle}</p>
                <p><strong>Address:</strong> ${propertyAddress}, ${propertyCity}</p>
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
