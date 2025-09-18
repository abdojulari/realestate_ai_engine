import Bull from 'bull'
import nodemailer from 'nodemailer'
import { getRedisClient } from './redis'

interface EmailJob {
  to: string
  subject: string
  text: string
  html?: string
  from?: string
  requestId?: string
}

let emailQueue: Bull.Queue<EmailJob> | null = null

export function getEmailQueue(): Bull.Queue<EmailJob> | null {
  if (!emailQueue) {
    const redis = getRedisClient()
    
    // Only create queue if Redis is available
    if (!redis) {
      console.log('⚠️  Email queue disabled - Redis not available')
      return null
    }

    try {
      emailQueue = new Bull<EmailJob>('email', {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: Number(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD
        },
        defaultJobOptions: {
          removeOnComplete: 10, // Keep 10 completed jobs
          removeOnFail: 50, // Keep 50 failed jobs for debugging
          attempts: 3, // Retry failed jobs up to 3 times
          backoff: {
            type: 'exponential',
            delay: 2000 // Start with 2 second delay, exponentially increase
          }
        }
      })

      // Process email jobs
      emailQueue.process(5, async (job) => { // Process up to 5 emails concurrently
        const { to, subject, text, html, from, requestId } = job.data
        
        const logPrefix = requestId ? `[${requestId}]` : '[EMAIL]'
        console.log(`${logPrefix} Processing email job: ${subject} to ${to}`)

        try {
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOSTNAME || 'smtp.gmail.com',
            port: Number(process.env.SMTP_PORT || 587),
            secure: false,
            auth: {
              user: process.env.SMTP_USERNAME,
              pass: process.env.SMTP_PASSWORD
            }
          })

          const mailOptions = {
            from: from || process.env.SMTP_SENDER || process.env.SMTP_USERNAME,
            to,
            subject,
            text,
            ...(html && { html })
          }

          const result = await transporter.sendMail(mailOptions)
          console.log(`${logPrefix} Email sent successfully:`, result.messageId)
          
          return result
        } catch (error) {
          console.error(`${logPrefix} Email send failed:`, error)
          throw error // This will trigger job retry
        }
      })

      // Queue event handlers
      emailQueue.on('completed', (job) => {
        const requestId = job.data.requestId
        const logPrefix = requestId ? `[${requestId}]` : '[EMAIL]'
        console.log(`${logPrefix} Email job completed: ${job.data.subject}`)
      })

      emailQueue.on('failed', (job, err) => {
        const requestId = job.data.requestId
        const logPrefix = requestId ? `[${requestId}]` : '[EMAIL]'
        console.error(`${logPrefix} Email job failed: ${job.data.subject}`, err.message)
      })

      emailQueue.on('stalled', (job) => {
        const requestId = job.data.requestId
        const logPrefix = requestId ? `[${requestId}]` : '[EMAIL]'
        console.warn(`${logPrefix} Email job stalled: ${job.data.subject}`)
      })

      console.log('✅ Email queue initialized')
    } catch (error) {
      console.error('❌ Failed to initialize email queue:', error)
      emailQueue = null
    }
  }

  return emailQueue
}

export async function queueEmail(emailData: EmailJob): Promise<boolean> {
  const queue = getEmailQueue()
  
  if (!queue) {
    // Fallback to direct email sending if queue is not available
    console.log('📧 Sending email directly (queue not available)')
    return sendEmailDirectly(emailData)
  }

  try {
    await queue.add('send-email', emailData, {
      priority: emailData.subject.includes('estimate') ? 1 : 0, // Prioritize estimate emails
      delay: 0 // Send immediately
    })
    
    const logPrefix = emailData.requestId ? `[${emailData.requestId}]` : '[EMAIL]'
    console.log(`${logPrefix} Email queued: ${emailData.subject}`)
    return true
  } catch (error) {
    console.error('Failed to queue email:', error)
    // Fallback to direct sending
    return sendEmailDirectly(emailData)
  }
}

async function sendEmailDirectly(emailData: EmailJob): Promise<boolean> {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOSTNAME || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD
      }
    })

    const mailOptions = {
      from: emailData.from || process.env.SMTP_SENDER || process.env.SMTP_USERNAME,
      to: emailData.to,
      subject: emailData.subject,
      text: emailData.text,
      ...(emailData.html && { html: emailData.html })
    }

    await transporter.sendMail(mailOptions)
    
    const logPrefix = emailData.requestId ? `[${emailData.requestId}]` : '[EMAIL]'
    console.log(`${logPrefix} Email sent directly: ${emailData.subject}`)
    return true
  } catch (error) {
    const logPrefix = emailData.requestId ? `[${emailData.requestId}]` : '[EMAIL]'
    console.error(`${logPrefix} Direct email send failed:`, error)
    return false
  }
}

export async function getQueueStats() {
  const queue = getEmailQueue()
  if (!queue) return null

  try {
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed()
    ])

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length
    }
  } catch (error) {
    console.error('Failed to get queue stats:', error)
    return null
  }
}
