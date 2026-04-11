import { createError, defineEventHandler, readBody } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { requireTenantAccess } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'
import { parseListingTemplateUpdateBody } from '../../../utils/listingTemplatePayload'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const id = parseInt(event.context.params?.id || '0')
    const raw = await readBody(event)

    if (!id) throw createError({ statusCode: 400, message: 'Invalid template ID' })

    const existing = await prisma.listingTemplate.findUnique({ where: { id } })
    if (!existing) throw createError({ statusCode: 404, message: 'Template not found' })
    requireTenantAccess(user, existing.adminId)

    const patch = parseListingTemplateUpdateBody(raw)

    const template = await prisma.listingTemplate.update({
      where: { id },
      data: {
        ...(patch.name !== undefined && { name: patch.name }),
        ...(patch.propertyId !== undefined && { propertyId: patch.propertyId }),
        ...(patch.propertyAddress !== undefined && { propertyAddress: patch.propertyAddress }),
        ...(patch.description !== undefined && { description: patch.description }),
        ...(patch.aiDescription !== undefined && { aiDescription: patch.aiDescription }),
        ...(patch.theme !== undefined && { theme: patch.theme }),
        ...(patch.primaryColor !== undefined && { primaryColor: patch.primaryColor }),
        ...(patch.accentColor !== undefined && { accentColor: patch.accentColor }),
        ...(patch.fontFamily !== undefined && { fontFamily: patch.fontFamily }),
        ...(patch.images !== undefined && { images: patch.images }),
        ...(patch.floorPlans !== undefined && { floorPlans: patch.floorPlans }),
        ...(patch.brandingLogo !== undefined && { brandingLogo: patch.brandingLogo }),
        ...(patch.features !== undefined && { features: patch.features }),
        ...(patch.layout !== undefined && { layout: patch.layout }),
        ...(patch.status !== undefined && { status: patch.status }),
      }
    })

    return { success: true, message: 'Template updated', template }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error'
    })
  }
})
