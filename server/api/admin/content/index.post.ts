import { defineEventHandler, readMultipartFormData, readBody, createError } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  // Note: This endpoint is whitelisted in auth middleware, so no authentication required
  
  let payload: any = {}
  
  // Try to get JSON body first (direct API calls)
  try {
    const body = await readBody(event)
    if (body && typeof body === 'object') {
      payload = body
    }
  } catch {
    // If JSON body fails, try multipart form data (form uploads)
    try {
      const form = await readMultipartFormData(event)
      let dataField = form?.find(f => f.name === 'data' && typeof f.data === 'string')?.data as unknown as string
      if (!dataField && form && form.length === 1 && form[0].type === 'application/json') {
        dataField = form[0].data.toString('utf-8')
      }
      payload = dataField ? JSON.parse(dataField) : {}
    } catch (e) {
      console.error('[POST CONTENT] Failed to parse both JSON and form data:', e)
    }
  }

  const metadata = {
    ...(payload.metadata || {}),
    section: payload.section || 'general',
    published: payload.published !== false
  }

  const created = await prisma.contentBlock.create({
    data: {
      key: payload.key,
      title: payload.title,
      type: payload.type,
      content: payload.content || '',
      metadata: metadata as any
    }
  })

  return created
})


