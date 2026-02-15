import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../../../utils/auth'
import { pillar9Service } from '../../../utils/pillar9.service'

const prisma = new PrismaClient()

/**
 * One-time utility: converts Pillar9 city codes (e.g. '0046') to
 * human-readable names (e.g. 'Calgary') on existing properties.
 * Safe to run multiple times – skips properties that already have names.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  if (user.role !== 'super_admin') {
    throw createError({ statusCode: 403, message: 'Super admin only' })
  }

  // Find Pillar9 properties whose city looks like a 4-digit code
  const candidates = await prisma.property.findMany({
    where: {
      source: 'pillar9',
      city: { not: '' },
    },
    select: { id: true, city: true, title: true },
  })

  let updated = 0
  let skipped = 0

  for (const prop of candidates) {
    // Only fix values that look like numeric codes (e.g. '0046', '0100')
    if (!/^\d{3,4}$/.test(prop.city)) {
      skipped++
      continue
    }

    const cityName = pillar9Service.getCityName(prop.city)
    if (cityName === prop.city) {
      // No mapping found – leave as-is
      skipped++
      continue
    }

    // Update city and title
    const newTitle = prop.title?.replace(prop.city, cityName) || prop.title
    await prisma.property.update({
      where: { id: prop.id },
      data: { city: cityName, title: newTitle },
    })
    updated++
  }

  return {
    success: true,
    message: `Updated ${updated} properties, skipped ${skipped}`,
    updated,
    skipped,
  }
})
