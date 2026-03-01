import { requireAdmin } from '../../../utils/auth'
import { requireTenantAccess } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const id = parseInt(event.context.params?.id || '0')
    const body = await readBody(event)

    if (!id) throw createError({ statusCode: 400, message: 'Invalid template ID' })

    const existing = await prisma.listingTemplate.findUnique({ where: { id } })
    if (!existing) throw createError({ statusCode: 404, message: 'Template not found' })
    requireTenantAccess(user, existing.adminId)

    const {
      name, propertyId, propertyAddress, description, aiDescription,
      theme, primaryColor, accentColor, fontFamily,
      images, floorPlans, brandingLogo, features, layout, status
    } = body

    const template = await prisma.listingTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(propertyId !== undefined && { propertyId }),
        ...(propertyAddress !== undefined && { propertyAddress }),
        ...(description !== undefined && { description }),
        ...(aiDescription !== undefined && { aiDescription }),
        ...(theme !== undefined && { theme }),
        ...(primaryColor !== undefined && { primaryColor }),
        ...(accentColor !== undefined && { accentColor }),
        ...(fontFamily !== undefined && { fontFamily }),
        ...(images !== undefined && { images }),
        ...(floorPlans !== undefined && { floorPlans }),
        ...(brandingLogo !== undefined && { brandingLogo }),
        ...(features !== undefined && { features }),
        ...(layout !== undefined && { layout }),
        ...(status !== undefined && { status }),
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
