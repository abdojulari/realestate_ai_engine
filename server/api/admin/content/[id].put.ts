import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const admin = (event as any).context?.user
  if (!admin) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  if (admin.role !== 'admin' && admin.role !== 'agent') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const id = Number((event.context.params as any).id)
  const form = await readMultipartFormData(event)
  let dataField = form?.find(f => f.name === 'data' && typeof f.data === 'string')?.data as unknown as string
  if (!dataField && form && form.length === 1 && form[0].type === 'application/json') {
    dataField = form[0].data.toString('utf-8')
  }
  const payload = dataField ? JSON.parse(dataField) : {}

  const block = await prisma.contentBlock.findUnique({ where: { id } })
  if (!block) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const existingMeta = ((): any => { try { return typeof block.metadata === 'string' ? JSON.parse(block.metadata) : block.metadata || {} } catch { return {} } })()
  const metadata = {
    ...existingMeta,
    ...(payload.metadata || {}),
    section: payload.section ?? existingMeta.section ?? 'general',
    published: payload.published ?? existingMeta.published ?? true
  }

  const updated = await prisma.contentBlock.update({
    where: { id },
    data: {
      key: payload.key ?? block.key,
      title: payload.title ?? block.title,
      type: payload.type ?? block.type,
      content: payload.content ?? block.content,
      metadata: metadata as any
    }
  })

  return updated
})


