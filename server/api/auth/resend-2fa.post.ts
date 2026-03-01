import { defineEventHandler, readBody, createError } from 'h3'
import crypto from 'crypto'
import { sendEmail } from '../../utils/email'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  try {
    const { email } = await readBody(event)

    if (!email) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Email is required'
      })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        twoFactorEnabled: true
      }
    })

    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    if (!user.twoFactorEnabled) {
      throw createError({
        statusCode: 400,
        statusMessage: '2FA is not enabled for this account'
      })
    }

    // Generate new 2FA code
    const code = crypto.randomInt(100000, 999999).toString()
    const expiryTime = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

    // Save code to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorCode: code,
        twoFactorCodeExpiry: expiryTime
      }
    })

    // Send 2FA code via email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Your New Two-Factor Authentication Code',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .container {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 16px;
                padding: 40px;
                text-align: center;
                color: white;
                margin-bottom: 30px;
              }
              .code-box {
                background: white;
                color: #667eea;
                font-size: 48px;
                font-weight: bold;
                letter-spacing: 12px;
                padding: 30px;
                border-radius: 12px;
                margin: 30px 0;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
              }
              .info-box {
                background: #f8f9fa;
                border-left: 4px solid #667eea;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                text-align: left;
              }
              .footer {
                text-align: center;
                color: #6c757d;
                font-size: 14px;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #dee2e6;
              }
              .icon {
                font-size: 64px;
                margin-bottom: 20px;
              }
              h1 {
                margin: 0;
                font-size: 28px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">🔄</div>
              <h1>New Verification Code</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Two-Factor Authentication</p>
            </div>
            
            <p style="font-size: 16px;">Hi <strong>${user.firstName || 'there'}</strong>,</p>
            
            <p>You requested a new verification code. Here's your fresh code to complete the sign-in process:</p>
            
            <div class="code-box">${code}</div>
            
            <div class="info-box">
              <strong>⏰ Important:</strong><br>
              This code will expire in <strong>5 minutes</strong> (at ${expiryTime.toLocaleTimeString()}).<br>
              For security reasons, please do not share this code with anyone.
            </div>
            
            <p style="margin-top: 30px;">If you didn't request this code, please secure your account immediately.</p>
            
            <div class="footer">
              <p><strong>Need help?</strong> Contact our support team if you have any questions.</p>
              <p style="margin-top: 10px; color: #adb5bd;">This is an automated message, please do not reply to this email.</p>
            </div>
          </body>
          </html>
        `,
        text: `
Your New Two-Factor Authentication Code

Hi ${user.firstName || 'there'},

You requested a new verification code. Here's your fresh code to complete the sign-in process:

Verification Code: ${code}

This code will expire in 5 minutes (at ${expiryTime.toLocaleTimeString()}).

For security reasons, please do not share this code with anyone.

If you didn't request this code, please secure your account immediately.
        `.trim()
      })
      
      console.log(`✅ Resent 2FA code to ${user.email}`)
    } catch (emailError) {
      console.error('❌ Failed to send 2FA email:', emailError)
      // Still log the code as fallback
      console.log(`2FA Code for ${user.email}: ${code}`)
    }

    return {
      success: true,
      message: 'A new verification code has been sent to your email'
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to resend verification code'
    })
  }
})

