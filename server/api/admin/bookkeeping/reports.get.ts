import { requireAdmin } from '../../../utils/auth'
import { getTenantAdminId } from '../../../utils/tenant'
import {
  calculateProfitLoss,
  getMonthRange,
  getQuarterRange,
  getMidYearRange,
  getAnnualRange,
  getCustomRange,
} from '../../../utils/bookkeeping/accounting.service'
import type { DateRange } from '../../../utils/bookkeeping/accounting.service'
import { requireFeatureForUser, FEATURES } from '../../../utils/license'

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    await requireFeatureForUser(FEATURES.BOOKKEEPING, user, event)
    const query = getQuery(event)

    const period = (query.period as string) || 'monthly'
    const year = parseInt(query.year as string) || new Date().getFullYear()
    const month = parseInt(query.month as string) || new Date().getMonth() + 1
    const quarter = parseInt(query.quarter as string) || 1
    const startDate = query.startDate as string
    const endDate = query.endDate as string

    const adminId = getTenantAdminId(user)

    let range: DateRange

    switch (period) {
      case 'monthly':
        range = getMonthRange(year, month)
        break
      case 'quarterly':
        range = getQuarterRange(year, quarter)
        break
      case 'midyear':
        range = getMidYearRange(year)
        break
      case 'annual':
        range = getAnnualRange(year)
        break
      case 'custom':
        if (!startDate || !endDate) {
          throw createError({
            statusCode: 400,
            message: 'startDate and endDate are required for custom period',
          })
        }
        range = getCustomRange(startDate, endDate)
        break
      default:
        range = getMonthRange(year, month)
    }

    const report = await calculateProfitLoss(adminId, range)

    return { report }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || error.message || 'Internal server error',
    })
  }
})
