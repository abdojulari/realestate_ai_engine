import { createError, defineEventHandler, readBody } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { getAdminIdForCreate } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'
import { parseListingTemplateCreateBody } from '../../../utils/listingTemplatePayload'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const raw = await readBody(event)
    const body = parseListingTemplateCreateBody(raw)

    // Generate slug
    const slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const uniqueSlug = `${slug}-${Date.now()}`

    const template = await prisma.listingTemplate.create({
      data: {
        name: body.name,
        propertyId: body.propertyId ?? undefined,
        propertyAddress: body.propertyAddress ?? undefined,
        description: body.description ?? undefined,
        theme: body.theme,
        primaryColor: body.primaryColor,
        accentColor: body.accentColor,
        fontFamily: body.fontFamily,
        images: body.images,
        floorPlans: body.floorPlans,
        brandingLogo: body.brandingLogo ?? undefined,
        features: body.features,
        layout: body.layout,
        slug: uniqueSlug,
        status: body.status,
        createdBy: user.id,
        adminId: getAdminIdForCreate(user)
      }
    })

    return {
      success: true,
      message: 'Listing template created successfully',
      template
    }
  } catch (error: any) {
    console.error('Error creating listing template:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
