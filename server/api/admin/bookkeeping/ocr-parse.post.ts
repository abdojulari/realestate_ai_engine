import { requireAdmin } from '../../../utils/auth'
import { parseReceiptText } from '../../../utils/bookkeeping/ocr.service'
import { requireFeatureForUser, FEATURES } from '../../../utils/license'

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAdmin(event)
    await requireFeatureForUser(FEATURES.BOOKKEEPING, user, event)
    const body = await readBody(event)

    const { ocrText } = body

    if (!ocrText || typeof ocrText !== 'string') {
      throw createError({ statusCode: 400, message: 'ocrText is required and must be a string' })
    }

    const data = parseReceiptText(ocrText)

    return { success: true, data }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || error.message || 'Internal server error',
    })
  }
})
