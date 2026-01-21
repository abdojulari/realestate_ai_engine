import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    // Verify admin authentication
    const user = await requireAdmin(event)



    // Get subscriber stats
    const subscriberStats = await prisma.newsletterSubscriber.groupBy({
      by: ['status'],
      _count: true
    })

    const totalSubscribers = await prisma.newsletterSubscriber.count()
    const activeSubscribers = await prisma.newsletterSubscriber.count({
      where: { status: 'active' }
    })

    // Get campaign stats
    const campaignStats = await prisma.newsletter.groupBy({
      by: ['status'],
      _count: true
    })

    const totalCampaigns = await prisma.newsletter.count()
    const sentCampaigns = await prisma.newsletter.count({
      where: { status: 'sent' }
    })

    // Get recent activity
    const recentSubscribers = await prisma.newsletterSubscriber.findMany({
      take: 5,
      orderBy: { subscribedAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        subscribedAt: true,
        source: true
      }
    })

    const recentCampaigns = await prisma.newsletter.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        subject: true,
        status: true,
        recipientCount: true,
        openCount: true,
        clickCount: true,
        sentAt: true,
        createdAt: true
      }
    })

    // Get template count
    const totalTemplates = await prisma.newsletterTemplate.count()
    const activeTemplates = await prisma.newsletterTemplate.count({
      where: { isActive: true }
    })

    // Get automation count
    const totalAutomations = await prisma.newsletterAutomation.count()
    const activeAutomations = await prisma.newsletterAutomation.count({
      where: { isActive: true }
    })

    // Calculate engagement metrics
    const sentNewsletters = await prisma.newsletter.findMany({
      where: { status: 'sent' },
      select: {
        recipientCount: true,
        openCount: true,
        clickCount: true
      }
    })

    const totalSent = sentNewsletters.reduce((sum, n) => sum + n.recipientCount, 0)
    const totalOpens = sentNewsletters.reduce((sum, n) => sum + n.openCount, 0)
    const totalClicks = sentNewsletters.reduce((sum, n) => sum + n.clickCount, 0)

    const openRate = totalSent > 0 ? ((totalOpens / totalSent) * 100).toFixed(2) : 0
    const clickRate = totalSent > 0 ? ((totalClicks / totalSent) * 100).toFixed(2) : 0

    return {
      subscribers: {
        total: totalSubscribers,
        active: activeSubscribers,
        byStatus: subscriberStats.reduce((acc: any, stat) => {
          acc[stat.status] = stat._count
          return acc
        }, {})
      },
      campaigns: {
        total: totalCampaigns,
        sent: sentCampaigns,
        byStatus: campaignStats.reduce((acc: any, stat) => {
          acc[stat.status] = stat._count
          return acc
        }, {})
      },
      templates: {
        total: totalTemplates,
        active: activeTemplates
      },
      automations: {
        total: totalAutomations,
        active: activeAutomations
      },
      engagement: {
        totalSent,
        totalOpens,
        totalClicks,
        openRate: parseFloat(openRate as string),
        clickRate: parseFloat(clickRate as string)
      },
      recentActivity: {
        subscribers: recentSubscribers,
        campaigns: recentCampaigns
      }
    }
  } catch (error: any) {
    console.error('Error fetching newsletter stats:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
