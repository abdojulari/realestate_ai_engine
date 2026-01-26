import { defineEventHandler, getQuery } from 'h3'
import { creaService } from '../../utils/crea.service'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const province = query.province as string || 'Alberta'
  const city = query.city as string || null

  const filters: any = { province }
  if (city) {
    filters.city = city
  }

  const locationLabel = city ? `${city}, ${province}` : province

  try {
    const count = await creaService.getPropertiesCount(filters)
    
    return {
      success: true,
      province,
      city: city || undefined,
      location: locationLabel,
      count
    }
  } catch (error: any) {
    console.error('Failed to get CREA count:', error)
    return {
      success: false,
      province,
      city: city || undefined,
      count: 0,
      error: error.message
    }
  }
})
