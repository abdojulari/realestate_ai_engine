import { requireAdmin } from '../../../utils/auth'
import { parseReceiptText } from '../../../utils/bookkeeping/ocr.service'

export default defineEventHandler(async (event) => {
  try {
    await requireAdmin(event)
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
      message: error.message || 'Internal server error',
    })
  }
})
