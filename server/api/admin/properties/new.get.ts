import { defineEventHandler } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { getTenantFilter } from '../../../utils/tenant'

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const tenantFilter = getTenantFilter(user)

  const url = new URL(event.node.req.url || '/', `http://${event.node.req.headers.host}`)
  const origin = `${url.protocol}//${url.host}`
  return Response.redirect(`${origin}/seller/list-property`, 302)
})
