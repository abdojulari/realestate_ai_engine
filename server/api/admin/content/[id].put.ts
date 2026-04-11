import { defineEventHandler, readMultipartFormData, readBody, createError } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter } from '../../../utils/tenant'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma


export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)

  const id = Number((event.context.params as any).id)
  
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
      if (!dataField && form && form.length === 1 && form[0]!.type === 'application/json') {
        dataField = form[0]!.data.toString('utf-8')
      }
      payload = dataField ? JSON.parse(dataField) : {}
    } catch (e) {
      console.error('[PUT CONTENT] Failed to parse both JSON and form data:', e)
    }
  }
  
  // Debug log for development
  if (process.env.NODE_ENV === 'development') {
    console.log('[PUT CONTENT] Updating ID:', id, 'content length:', payload.content?.length || 0)
  }

  // Verify ownership: find the block scoped to the tenant
  const block = await prisma.contentBlock.findFirst({ where: { id, ...tenantFilter } })
  if (!block) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const existingMeta = ((): any => { try { return typeof block.metadata === 'string' ? JSON.parse(block.metadata) : block.metadata || {} } catch { return {} } })()
  const metadata = {
    ...existingMeta,
    ...(payload.metadata || {}),
    section: payload.section ?? existingMeta.section ?? 'general',
    published: payload.published ?? existingMeta.published ?? true
  }

  const dataToUpdate = {
    key: payload.key ?? block.key,
    title: payload.title ?? block.title,
    type: payload.type ?? block.type,
    content: payload.content ?? block.content,
    metadata: metadata as any
  }
  
  console.log('[PUT CONTENT] Data being saved to database:', {
    ...dataToUpdate,
    content: `${dataToUpdate.content?.substring(0, 100)}...` // Show first 100 chars
  })
  
  console.log('[PUT CONTENT] About to execute database update...')
  
  try {
    const updated = await prisma.contentBlock.update({
      where: { id },
      data: dataToUpdate
    })
    
    console.log('[PUT CONTENT] ✅ Successfully updated content in database')
    console.log('[PUT CONTENT] Updated record ID:', updated.id)
    
    // Verify the update worked
    const verification = await prisma.contentBlock.findUnique({ where: { id } })
    console.log('[PUT CONTENT] Verification - content length after save:', verification?.content?.length || 0)
    
    return updated
  } catch (dbError) {
    console.error('[PUT CONTENT] ❌ Database update failed:', dbError)
    throw dbError
  }
})
