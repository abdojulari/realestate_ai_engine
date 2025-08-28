import { defineEventHandler } from 'h3'

export default defineEventHandler((event) => {
  const url = new URL(event.node.req.url || '/', `http://${event.node.req.headers.host}`)
  const origin = `${url.protocol}//${url.host}`
  return Response.redirect(`${origin}/admin/users`, 302)
})


