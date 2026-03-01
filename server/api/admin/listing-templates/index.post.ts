import { requireAdmin } from '../../../utils/auth'
import { getAdminIdForCreate } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const body = await readBody(event)

    const {
      name, propertyId, propertyAddress, description,
      theme = 'luxury', primaryColor, accentColor, fontFamily,
      images, floorPlans, brandingLogo, features, layout = 'hero-gallery'
    } = body

    if (!name) {
      throw createError({ statusCode: 400, message: 'Template name is required' })
    }

    // Generate slug
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const uniqueSlug = `${slug}-${Date.now()}`

    const template = await prisma.listingTemplate.create({
      data: {
        name,
        propertyId,
        propertyAddress,
        description,
        theme,
        primaryColor: primaryColor || getThemeColors(theme)!.primary,
        accentColor: accentColor || getThemeColors(theme)!.accent,
        fontFamily: fontFamily || getThemeFont(theme),
        images: images || [],
        floorPlans: floorPlans || [],
        brandingLogo,
        features: features || [],
        layout,
        slug: uniqueSlug,
        status: 'draft',
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

function getThemeColors(theme: string) {
  const themes: Record<string, { primary: string; accent: string }> = {
    luxury: { primary: '#1a1a2e', accent: '#c9a96e' },
    modern: { primary: '#0f172a', accent: '#3b82f6' },
    classic: { primary: '#2c1810', accent: '#8b6914' },
    minimal: { primary: '#111111', accent: '#666666' }
  }
  return themes[theme] || themes.luxury
}

function getThemeFont(theme: string) {
  const fonts: Record<string, string> = {
    luxury: 'Playfair Display',
    modern: 'Inter',
    classic: 'Georgia',
    minimal: 'Helvetica Neue'
  }
  return fonts[theme] || 'Playfair Display'
}
