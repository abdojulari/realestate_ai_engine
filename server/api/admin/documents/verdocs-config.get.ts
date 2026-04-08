import { requireAdmin } from '../../../utils/auth'
import { isVerdocsConfigured } from '../../../utils/verdocs'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return {
    configured: isVerdocsConfigured(),
    webhookPath: '/api/webhooks/verdocs',
  }
})
