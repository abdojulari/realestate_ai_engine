import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const admin = (event as any).context?.user
  if (!admin) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  if (admin.role !== 'admin' && admin.role !== 'agent') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const form = await readMultipartFormData(event)
  let dataField = form?.find(f => f.name === 'data' && typeof f.data === 'string')?.data as unknown as string
  if (!dataField && form && form.length === 1 && form[0].type === 'application/json') {
    dataField = form[0].data.toString('utf-8')
  }
  const payload = dataField ? JSON.parse(dataField) : {}

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


