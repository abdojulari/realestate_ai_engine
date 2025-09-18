import { PrismaClient } from '@prisma/client'
import * as nodemailer from 'nodemailer'

const prisma = new PrismaClient()

interface EmailSettings {
  provider: string
  fromEmail: string
  fromName: string
  smtp: {
    host: string
    port: string
    username: string
    password: string
    secure: boolean
  }
}

interface EmailTemplate {
  id: number
  name: string
  subject: string
  content: string
  variables?: string[]
}

// Cache for email settings to avoid database calls on every email
let cachedEmailSettings: EmailSettings | null = null
let settingsCacheTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function getEmailSettings(): Promise<EmailSettings> {
  const now = Date.now()
  
  // Return cached settings if still valid
  if (cachedEmailSettings && (now - settingsCacheTime) < CACHE_DURATION) {
    return cachedEmailSettings
  }

  try {
    // Get email settings from database
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          startsWith: 'email.'
        }
      }
    })

    const settingsMap = settings.reduce((acc, setting) => {
      const key = setting.key.replace('email.', '')
      try {
        acc[key] = key === 'smtp' ? JSON.parse(setting.value) : setting.value
      } catch {
        acc[key] = setting.value
      }
      return acc
    }, {} as Record<string, any>)

    // Fallback to environment variables if no database settings
    const emailSettings: EmailSettings = {
      provider: settingsMap.provider || 'SMTP',
      fromEmail: settingsMap.fromEmail || process.env.SMTP_SENDER || 'noreply@example.com',
      fromName: settingsMap.fromName || 'Real Estate Platform',
      smtp: settingsMap.smtp || {
        host: process.env.SMTP_HOSTNAME || 'localhost',
        port: process.env.SMTP_PORT || '587',
        username: process.env.SMTP_USERNAME || '',
        password: process.env.SMTP_PASSWORD || '',
        secure: process.env.SMTP_PORT === '465'
      }
    }

    // Cache the settings
    cachedEmailSettings = emailSettings
    settingsCacheTime = now

    return emailSettings
  } catch (error) {
    console.error('Failed to load email settings, using environment fallback:', error)
    
    // Fallback to environment variables
    return {
      provider: 'SMTP',
      fromEmail: process.env.SMTP_SENDER || 'noreply@example.com',
      fromName: 'Real Estate Platform',
      smtp: {
        host: process.env.SMTP_HOSTNAME || 'localhost',
        port: process.env.SMTP_PORT || '587',
        username: process.env.SMTP_USERNAME || '',
        password: process.env.SMTP_PASSWORD || '',
        secure: process.env.SMTP_PORT === '465'
      }
    }
  }
}

export async function getEmailTemplate(templateName: string): Promise<EmailTemplate | null> {
  try {
    const template = await prisma.emailTemplate.findFirst({
      where: {
        name: templateName,
        isActive: true
      }
    })

    return template
  } catch (error) {
    console.error('Failed to load email template:', error)
    return null
  }
}

export async function sendEmail(options: {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  templateName?: string
  templateData?: Record<string, string>
  replyTo?: string
}) {
  try {
    const emailSettings = await getEmailSettings()
    
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: emailSettings.smtp.host,
      port: parseInt(emailSettings.smtp.port),
      secure: emailSettings.smtp.secure,
      auth: {
        user: emailSettings.smtp.username,
        pass: emailSettings.smtp.password
      }
    })

    let { subject, html, text } = options
    
    // Use template if specified
    if (options.templateName) {
      const template = await getEmailTemplate(options.templateName)
      if (template) {
        subject = template.subject
        html = template.content
        
        // Replace template variables
        if (options.templateData) {
          for (const [key, value] of Object.entries(options.templateData)) {
            const placeholder = `{{${key}}}`
            subject = subject.replace(new RegExp(placeholder, 'g'), value)
            html = html.replace(new RegExp(placeholder, 'g'), value)
          }
        }
      }
    }

    // Send email
    const mailOptions = {
      from: emailSettings.fromName ? `${emailSettings.fromName} <${emailSettings.fromEmail}>` : emailSettings.fromEmail,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject,
      html,
      text,
      replyTo: options.replyTo
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('✅ Email sent successfully:', info.messageId)
    
    return {
      success: true,
      messageId: info.messageId
    }
  } catch (error: any) {
    console.error('❌ Failed to send email:', error)
    throw new Error(`Failed to send email: ${error.message}`)
  }
}

// Clear settings cache (useful when settings are updated)
export function clearEmailSettingsCache() {
  cachedEmailSettings = null
  settingsCacheTime = 0
}
