import { sendNewsletterBatch } from '../../utils/email'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


/**
 * Cron job endpoint to run newsletter automations
 * This should be called periodically (e.g., every hour) by a cron service
 * 
 * Setup with cron:
 * 0 * * * * curl https://yoursite.com/api/cron/newsletter-automations?secret=YOUR_SECRET
 */
export default defineEventHandler(async (event) => {
  try {
    // Verify cron secret for security
    const query = getQuery(event)
    const cronSecret = process.env.CRON_SECRET || 'change-me-in-production'
    
    if (query.secret !== cronSecret) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    const now = new Date()
    console.log(`[Newsletter Automation] Running check at ${now.toISOString()}`)

    // Find automations that are due to run
    const dueAutomations = await prisma.newsletterAutomation.findMany({
      where: {
        isActive: true,
        nextRun: {
          lte: now
        }
      }
    })

    console.log(`[Newsletter Automation] Found ${dueAutomations.length} due automations`)

    const results = []

    for (const automation of dueAutomations) {
      try {
        console.log(`[Newsletter Automation] Processing automation: ${automation.name} (ID: ${automation.id})`)

        // Get active subscribers based on filters
        const where: any = { status: 'active' }
        if (automation.targetFilters) {
          // Apply additional filters if defined
          // This is where you can add more sophisticated filtering
        }

        const subscribers = await prisma.newsletterSubscriber.findMany({
          where,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        })

        if (subscribers.length === 0) {
          console.log(`[Newsletter Automation] No subscribers found for automation ${automation.id}`)
          continue
        }

        // Get template if specified
        let template = null
        if (automation.templateId) {
          template = await prisma.newsletterTemplate.findUnique({
            where: { id: automation.templateId }
          })
        }

        // Create a campaign for this automation run
        const campaign = await prisma.newsletter.create({
          data: {
            name: `${automation.name} - ${now.toISOString()}`,
            subject: automation.subject || template?.subject || 'Newsletter Update',
            content: template?.content || '<p>Newsletter content</p>',
            plainTextContent: template?.plainTextContent || null,
            status: 'sending',
            recipientCount: subscribers.length,
            frequency: automation.frequency || null
          }
        })

        console.log(`[Newsletter Automation] Created campaign ${campaign.id} with ${subscribers.length} recipients`)

        const sendResults = await sendNewsletterBatch(
          subscribers as any,
          campaign as any,
          { adminId: automation.adminId }
        )

        // Update campaign status
        await prisma.newsletter.update({
          where: { id: campaign.id },
          data: {
            status: 'sent',
            sentAt: new Date(),
            recipientCount: subscribers.length,
            openCount: 0,
            clickCount: 0
          }
        })

        // Create sent newsletter records
        const sentRecords = subscribers.map(subscriber => ({
          newsletterId: campaign.id,
          subscriberId: subscriber.id,
          status: 'sent',
          sentAt: new Date()
        }))

        await prisma.sentNewsletter.createMany({
          data: sentRecords
        })

        // Calculate next run time
        const nextRun = calculateNextRun(automation)

        // Update automation
        await prisma.newsletterAutomation.update({
          where: { id: automation.id },
          data: {
            lastRun: now,
            nextRun,
            runCount: automation.runCount + 1
          }
        })

        console.log(`[Newsletter Automation] Completed automation ${automation.id}. Next run: ${nextRun.toISOString()}`)

        results.push({
          automationId: automation.id,
          automationName: automation.name,
          campaignId: campaign.id,
          success: true,
          sent: sendResults.success,
          failed: sendResults.failed,
          nextRun: nextRun.toISOString()
        })
      } catch (error) {
        console.error(`[Newsletter Automation] Error processing automation ${automation.id}:`, error)
        results.push({
          automationId: automation.id,
          automationName: automation.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return {
      success: true,
      timestamp: now.toISOString(),
      processed: dueAutomations.length,
      results
    }
  } catch (error: any) {
    console.error('[Newsletter Automation] Cron job error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})

/**
 * Calculate next run time based on automation schedule
 */
function calculateNextRun(automation: any): Date {
  const now = new Date()
  const [hours, minutes] = (automation.timeOfDay || '09:00').split(':').map(Number)
  
  const nextRun = new Date(now)
  nextRun.setHours(hours!, minutes!, 0, 0)
  
  if (automation.frequency === 'daily') {
    // If today's time has passed, schedule for tomorrow
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1)
    }
  } else if (automation.frequency === 'weekly' && automation.dayOfWeek !== undefined) {
    // Calculate next occurrence of the specified day of week
    const currentDay = nextRun.getDay()
    const targetDay = automation.dayOfWeek
    let daysUntilTarget = (targetDay - currentDay + 7) % 7
    
    // If same day but time has passed, schedule for next week
    if (daysUntilTarget === 0 && nextRun <= now) {
      daysUntilTarget = 7
    }
    
    nextRun.setDate(nextRun.getDate() + daysUntilTarget)
  } else if (automation.frequency === 'monthly' && automation.dayOfMonth) {
    // Set to specified day of month
    nextRun.setDate(automation.dayOfMonth)
    
    // If that day has passed this month, move to next month
    if (nextRun <= now) {
      nextRun.setMonth(nextRun.getMonth() + 1)
    }
  }
  
  return nextRun
}
