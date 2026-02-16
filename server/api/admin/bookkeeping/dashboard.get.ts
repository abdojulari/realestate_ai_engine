import { requireAdmin } from '../../../utils/auth'
import { getTenantAdminId } from '../../../utils/tenant'
import { getFinancialDashboard } from '../../../utils/bookkeeping/accounting.service'

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    const query = getQuery(event)

    const year = parseInt(query.year as string) || new Date().getFullYear()
    const adminId = getTenantAdminId(user)

    const summary = await getFinancialDashboard(adminId, year)

    return summary
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal server error',
    })
  }
})
