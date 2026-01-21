import { defineEventHandler, getQuery } from 'h3'
import { creaService } from '../../utils/crea.service'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const province = query.province as string || 'Alberta'

  try {
    const count = await creaService.getPropertiesCount({ province })
    
    return {
      success: true,
      province,
      count
    }
  } catch (error: any) {
    console.error('Failed to get CREA count:', error)
    return {
      success: false,
      province,
      count: 0,
      error: error.message
    }
  }
})
