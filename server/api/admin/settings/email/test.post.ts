import { defineEventHandler, readBody, createError } from 'h3'
import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../../utils/auth'
import * as nodemailer from 'nodemailer'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const emailSettings = await readBody(event)
  const { smtp, fromEmail, fromName } = emailSettings

  try {
    // Create transporter with provided settings
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: parseInt(smtp.port),
      secure: smtp.secure,
      auth: {
        user: smtp.username,
        pass: smtp.password
      }
    })

    // Send test email
    const testEmail = {
      from: fromName ? `${fromName} <${fromEmail}>` : fromEmail,
      to: fromEmail, // Send test email to the configured from address
      subject: 'Email Settings Test - Success!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1976d2;">Email Configuration Test</h2>
          <p>Congratulations! Your email settings are working correctly.</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <strong>Configuration Details:</strong><br>
            Provider: ${emailSettings.provider}<br>
            SMTP Host: ${smtp.host}<br>
            SMTP Port: ${smtp.port}<br>
            From Email: ${fromEmail}<br>
            From Name: ${fromName}
          </div>
          <p style="color: #666; font-size: 14px;">
            This test email was sent from your admin panel to verify the email configuration.
          </p>
        </div>
      `
    }

    const info = await transporter.sendMail(testEmail)
    
    console.log('✅ Test email sent successfully:', info.messageId)

    return {
      success: true,
      messageId: info.messageId,
      message: 'Test email sent successfully! Check your inbox.'
    }
  } catch (error: any) {
    console.error('❌ Failed to send test email:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to send test email: ${error.message}`
    })
  }
})
