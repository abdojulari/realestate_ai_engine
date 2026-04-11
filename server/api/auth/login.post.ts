import { defineEventHandler, readBody, createError } from 'h3'
import {
  assertLoginEmail,
  assertLoginPassword,
} from '../../utils/authInputValidation'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
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
    const body = await readBody(event)
    const email = assertLoginEmail(body?.email)
    const password = assertLoginPassword(body?.password)
    const twoFactorCode =
      body?.twoFactorCode === undefined || body?.twoFactorCode === null || body?.twoFactorCode === ''
        ? undefined
        : typeof body.twoFactorCode === 'string'
          ? body.twoFactorCode.trim().slice(0, 16)
          : undefined

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        role: true,
        adminId: true,
        delegatedAdminPermissions: true,
        delegationExcludedUserIds: true,
        twoFactorEnabled: true,
        twoFactorCode: true,
        twoFactorCodeExpiry: true,
        loginCount: true,
        mustChangePassword: true,
      }
    })

    if (!user || !user.password) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid credentials'
      })
    }

    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid credentials'
      })
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // If 2FA code is provided, verify it
      if (twoFactorCode) {
        // Check if code exists and hasn't expired
        if (!user.twoFactorCode || !user.twoFactorCodeExpiry) {
          throw createError({
            statusCode: 400,
            statusMessage: '2FA code not found. Please request a new code.'
          })
        }

        // Check if code has expired
        if (new Date() > new Date(user.twoFactorCodeExpiry)) {
          throw createError({
            statusCode: 400,
            statusMessage: '2FA code has expired. Please request a new code.'
          })
        }

        // Verify the code
        if (user.twoFactorCode !== twoFactorCode) {
          throw createError({
            statusCode: 401,
            statusMessage: 'Invalid 2FA code'
          })
        }

        // Clear the 2FA code after successful verification
        await prisma.user.update({
          where: { id: user.id },
          data: {
            twoFactorCode: null,
            twoFactorCodeExpiry: null,
            lastLoginAt: new Date(),
            loginCount: (user.loginCount || 0) + 1
          }
        })

        // Log activity
        await prisma.activityLog.create({
          data: {
            userId: user.id,
            action: 'login',
            description: 'Logged in with 2FA verification',
            ipAddress: getRequestIP(event),
            userAgent: getRequestHeader(event, 'user-agent')
          }
        })

        // Generate token and return user
        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role },
          process.env.JWT_SECRET || 'fallback-secret',
          { expiresIn: '24h' }
        )

        const { password: _, twoFactorCode: __, twoFactorCodeExpiry: ___, ...userWithoutSensitiveData } = user

        return {
          user: userWithoutSensitiveData,
          token,
          mustChangePassword: user.mustChangePassword || false,
        }
      } else {
        // Generate 2FA code
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

        // Send 2FA code via email (SMTP_* from container env — see server/utils/email.ts)
        const sent = await sendEmail({
            to: user.email,
            subject: 'Your Two-Factor Authentication Code',
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
                  <div class="icon">🔐</div>
                  <h1>Verify Your Identity</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">Two-Factor Authentication</p>
                </div>
                
                <p style="font-size: 16px;">Hi <strong>${user.firstName || 'there'}</strong>,</p>
                
                <p>We received a login request for your account. To complete the sign-in process, please enter the verification code below:</p>
                
                <div class="code-box">${code}</div>
                
                <div class="info-box">
                  <strong>⏰ Important:</strong><br>
                  This code will expire in <strong>5 minutes</strong> (at ${expiryTime.toLocaleTimeString()}).<br>
                  For security reasons, please do not share this code with anyone.
                </div>
                
                <p style="margin-top: 30px;">If you didn't request this code, please ignore this email and ensure your account is secure.</p>
                
                <div class="footer">
                  <p><strong>Need help?</strong> Contact our support team if you have any questions.</p>
                  <p style="margin-top: 10px; color: #adb5bd;">This is an automated message, please do not reply to this email.</p>
                </div>
              </body>
              </html>
            `,
            text: `
Your Two-Factor Authentication Code

Hi ${user.firstName || 'there'},

We received a login request for your account. To complete the sign-in process, please enter the verification code below:

Verification Code: ${code}

This code will expire in 5 minutes (at ${expiryTime.toLocaleTimeString()}).

For security reasons, please do not share this code with anyone.

If you didn't request this code, please ignore this email and ensure your account is secure.
            `.trim()
          })

        if (!sent) {
          console.error(`❌ 2FA SMTP failed for ${user.email} — check SMTP_USERNAME, SMTP_PASSWORD, SMTP_HOSTNAME on the server`)
          throw createError({
            statusCode: 503,
            statusMessage:
              'Could not send verification email. Check SMTP settings on the server (Gmail: use an app password; allow port 587 outbound).',
          })
        }
        console.log(`✅ 2FA code sent to ${user.email}`)

        // Return response indicating 2FA is required
        return {
          requiresTwoFactor: true,
          message: 'A verification code has been sent to your email',
          email: user.email
        }
      }
    }

    // If 2FA is not enabled, proceed with normal login
    // Update login stats
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        loginCount: (user.loginCount || 0) + 1
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'login',
        description: 'Logged in successfully',
        ipAddress: getRequestIP(event),
        userAgent: getRequestHeader(event, 'user-agent')
      }
    })

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    )

    const { password: _, twoFactorCode: __, twoFactorCodeExpiry: ___, ...userWithoutSensitiveData } = user

    return {
      user: userWithoutSensitiveData,
      token,
      mustChangePassword: user.mustChangePassword || false,
    }
  } catch (error: unknown) {
    // Preserve H3 errors (validation 400, invalid credentials 401, etc.) — do not wrap or status becomes 500.
    const e = error as { statusCode?: number; statusMessage?: string; message?: string }
    if (typeof e?.statusCode === 'number') {
      throw error
    }
    console.error('[auth/login] unexpected error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: e?.message || 'Authentication failed',
    })
  }
})
