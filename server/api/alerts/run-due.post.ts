import { defineEventHandler } from 'h3'
import { PrismaClient } from '@prisma/client'
import nodemailer from 'nodemailer'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    // Find all alerts that are due to run
    const dueAlerts = await prisma.propertyAlert.findMany({
      where: {
        isActive: true,
        nextRun: {
          lte: new Date()
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            marketingConsent: true
          }
        }
      }
    })

    if (dueAlerts.length > 0) {
      console.log(`🔔 Processing ${dueAlerts.length} due alerts`)
    }

    if (dueAlerts.length === 0) {
      return { success: true, message: 'No alerts due', processed: 0 }
    }

    let processed = 0
    let errors = 0

    // Process each due alert
    for (const alert of dueAlerts) {
      try {
        // Skip if user hasn't consented to marketing
        if (!alert.user.marketingConsent) {
          console.log(`⚠️ Skipping alert - user ${alert.user.email} has not consented to marketing`)
          continue
        }

        // Run the property search with stored filters
        const searchResults = await runPropertySearch(alert.parsedFilters, alert.city)
        
        // Filter for NEW properties only (not sent in previous alerts)
        const lastResultIds = alert.lastResults ? (alert.lastResults as any).propertyIds || [] : []
        const currentResultIds = searchResults.map((p: any) => p.id)
        const newPropertyIds = currentResultIds.filter((id: number) => !lastResultIds.includes(id))
        const newProperties = searchResults.filter((p: any) => newPropertyIds.includes(p.id))

        // Only send email if there are new properties
        if (newProperties.length > 0) {
          await sendAlertEmail(alert.user, alert, newProperties)
          console.log(`✅ Sent alert email to ${alert.user.email} with ${newProperties.length} new properties`)
        }

        // Update alert with next run time and last results
        const nextRun = calculateNextRun(alert.frequency)
        await prisma.propertyAlert.update({
          where: { id: alert.id },
          data: {
            lastRun: new Date(),
            nextRun,
            lastResults: { propertyIds: currentResultIds },
            totalSent: alert.totalSent + newProperties.length
          }
        })

        processed++
      } catch (alertError) {
        console.error(`❌ Error processing alert ${alert.id}:`, alertError)
        errors++
      }
    }

    return {
      success: true,
      processed,
      errors,
      message: `Processed ${processed} alerts, ${errors} errors`
    }
  } catch (error: any) {
    console.error('❌ Alert scheduler error:', error)
    return {
      success: false,
      error: error.message
    }
  }
})

// Run property search with filters
async function runPropertySearch(filters: any, city?: string) {
  const queryParams = new URLSearchParams()
  
  // Add filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      if (key === 'beds') {
        queryParams.append('bedsExact', String(value))
      } else if (key === 'garageSpaces' || key === 'garage') {
        queryParams.append('features', 'garage')
      } else if (key === 'basement') {
        queryParams.append('features', 'basement')
      } else if (key === 'features' && typeof value === 'object') {
        Object.entries(value).forEach(([featureKey, featureValue]) => {
          if (featureValue) {
            queryParams.append('features', featureKey)
          }
        })
      } else {
        queryParams.append(key, String(value))
      }
    }
  })
  
  // Add city filter
  if (city) {
    queryParams.append('city', city)
  }
  
  // Get all results (no pagination for alerts)
  queryParams.append('limit', '1000')
  
  // Make API request
  const response = await fetch(`http://localhost:3000/api/properties?${queryParams.toString()}`)
  const data = await response.json()
  
  return data.properties || []
}

// Send alert email to user
async function sendAlertEmail(user: any, alert: any, properties: any[]) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOSTNAME,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USERNAME,
      pass: process.env.SMTP_PASSWORD
    }
  })

  const propertyListHtml = properties.slice(0, 10).map(property => `
    <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <h3 style="margin: 0 0 8px 0; color: #1976d2;">${property.title}</h3>
      <p style="font-size: 18px; font-weight: bold; color: #2e7d32; margin: 0 0 8px 0;">$${property.price?.toLocaleString()}</p>
      <p style="margin: 0 0 8px 0;">${property.address}, ${property.city}</p>
      <p style="margin: 0 0 8px 0;">${property.beds} beds • ${property.baths} baths • ${property.sqft} sqft</p>
      <p style="margin: 0; font-size: 14px; color: #666;">${property.description?.substring(0, 150)}...</p>
    </div>
  `).join('')

  const emailHtml = `
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1976d2; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">New Properties Found!</h1>
          <p style="margin: 8px 0 0 0;">Matching your search: "${alert.naturalQuery}"</p>
        </div>
        
        <div style="padding: 20px;">
          <p>Hi ${user.firstName},</p>
          <p>We found <strong>${properties.length} new properties</strong> matching your search criteria:</p>
          
          ${propertyListHtml}
          
          ${properties.length > 10 ? `<p><em>... and ${properties.length - 10} more properties</em></p>` : ''}
          
          <div style="margin: 30px 0; padding: 20px; background: #f5f5f5; border-radius: 8px;">
            <p style="margin: 0 0 10px 0;"><strong>Your Alert Settings:</strong></p>
            <p style="margin: 0;">• Search: "${alert.naturalQuery}"</p>
            <p style="margin: 0;">• City: ${alert.city || 'All cities'}</p>
            <p style="margin: 0;">• Frequency: ${getFrequencyLabel(alert.frequency)}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NUXT_PUBLIC_SITE_URL}/buyer/alerts" 
               style="background: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              Manage Your Alerts
            </a>
          </div>
          
          <p style="font-size: 12px; color: #666; margin-top: 30px;">
            You're receiving this email because you created a property alert and consented to marketing communications. 
            You can unsubscribe or modify your alerts anytime in your account settings.
          </p>
        </div>
      </body>
    </html>
  `

  const mailOptions = {
    from: process.env.SMTP_SENDER || process.env.SMTP_USERNAME,
    to: user.email,
    subject: `New Properties: ${alert.naturalQuery}`,
    html: emailHtml
  }

  await transporter.sendMail(mailOptions)
}

function calculateNextRun(frequency: string): Date {
  const now = new Date()
  
  switch (frequency) {
    case '2h': return new Date(now.getTime() + 2 * 60 * 60 * 1000)
    case '4h': return new Date(now.getTime() + 4 * 60 * 60 * 1000)
    case '12h': return new Date(now.getTime() + 12 * 60 * 60 * 1000)
    case '24h': return new Date(now.getTime() + 24 * 60 * 60 * 1000)
    case '7d': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    case '14d': return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    case '30d': return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    default: return new Date(now.getTime() + 24 * 60 * 60 * 1000)
  }
}

function getFrequencyLabel(frequency: string): string {
  const labels: Record<string, string> = {
    '2h': 'every 2 hours',
    '4h': 'every 4 hours',
    '12h': 'every 12 hours',
    '24h': 'daily',
    '7d': 'weekly',
    '14d': 'bi-weekly',
    '30d': 'monthly'
  }
  return labels[frequency] || 'daily'
}
