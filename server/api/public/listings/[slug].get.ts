import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const slug = event.context.params?.slug

    if (!slug) throw createError({ statusCode: 400, message: 'Invalid slug' })

    const template = await prisma.listingTemplate.findFirst({
      where: { slug, status: 'published' }
    })

    if (!template) throw createError({ statusCode: 404, message: 'Listing not found' })

    // Increment views
    await prisma.listingTemplate.update({
      where: { id: template.id },
      data: { views: { increment: 1 } }
    })

    // Get tenant branding
    let branding = null
    if (template.adminId) {
      branding = await prisma.tenantSettings.findFirst({
        where: { adminId: template.adminId },
        select: {
          businessName: true,
          tagline: true,
          logoUrl: true,
          primaryColor: true,
          phone: true,
          email: true,
        }
      })
    }

    return { template, branding }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
