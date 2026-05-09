import Bull from 'bull'
import { getRedisClient } from './redis'
import { sendEmail } from './email'
import { getTenantSender } from './tenantSiteUrl'

function escapeForPre(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

interface EmailJob {
  to: string
  subject: string
  text: string
  html?: string
  from?: string
  /**
   * Per-tenant identity. When provided AND `from` isn't explicit, the
   * worker derives:
   *   - From: "<TenantBusinessName>" <SMTP_USERNAME> (display-name only)
   *   - Reply-To: <tenant admin email>
   * See server/utils/tenantSiteUrl.ts → getTenantSender for resolution.
   */
  adminId?: number | null
  requestId?: string
}

async function resolveQueueSender(
  job: EmailJob,
): Promise<{ from: string; replyTo: string | null }> {
  if (job.from) {
    return { from: job.from, replyTo: null }
  }
  if (job.adminId != null) {
    try {
      const sender = await getTenantSender(job.adminId)
      return { from: sender.formatted, replyTo: sender.replyTo }
    } catch (err) {
      console.warn('[emailQueue] tenant sender lookup failed, falling back to global SMTP:', err)
    }
  }
  return {
    from: process.env.SMTP_SENDER || process.env.SMTP_USERNAME || '',
    replyTo: null,
  }
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
      // Prefer REDIS_URL (canonical) so the password baked into the URL is used;
      // the legacy REDIS_HOST/REDIS_PORT/REDIS_PASSWORD path silently dropped auth
      // when only REDIS_URL was set, which Bull would then connect to an authed Redis without a password.
      const redisUrl = process.env.REDIS_URL
      emailQueue = new Bull<EmailJob>('email', {
        redis: redisUrl
          ? redisUrl
          : {
              host: process.env.REDIS_HOST || 'localhost',
              port: Number(process.env.REDIS_PORT) || 6379,
              password: process.env.REDIS_PASSWORD,
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
      emailQueue.process(5, async (job) => {
        const { to, subject, text, html, requestId } = job.data

        const logPrefix = requestId ? `[${requestId}]` : '[EMAIL]'
        console.log(`${logPrefix} Processing email job: ${subject} to ${to}`)

        try {
          const { from, replyTo } = await resolveQueueSender(job.data)
          const safeHtml = html || `<pre style="font-family:system-ui, sans-serif;white-space:pre-wrap">${escapeForPre(text)}</pre>`
          const ok = await sendEmail({
            to,
            subject,
            html: safeHtml,
            text,
            adminId: job.data.adminId,
            from,
            ...(replyTo ? { replyTo } : {}),
          })
          if (!ok) throw new Error('sendEmail returned false')
          console.log(`${logPrefix} Email sent successfully`)
          return { ok: true }
        } catch (error) {
          console.error(`${logPrefix} Email send failed:`, error)
          throw error
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
    const { from, replyTo } = await resolveQueueSender(emailData)
    const safeHtml =
      emailData.html ||
      `<pre style="font-family:system-ui, sans-serif;white-space:pre-wrap">${escapeForPre(emailData.text)}</pre>`
    const ok = await sendEmail({
      to: emailData.to,
      subject: emailData.subject,
      html: safeHtml,
      text: emailData.text,
      adminId: emailData.adminId,
      from,
      ...(replyTo ? { replyTo } : {}),
    })
    const logPrefix = emailData.requestId ? `[${emailData.requestId}]` : '[EMAIL]'
    console.log(`${logPrefix} Email sent directly: ${emailData.subject}`)
    return ok
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
