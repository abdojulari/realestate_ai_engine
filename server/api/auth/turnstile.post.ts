import { defineEventHandler, readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const token = body.token || body['cf-turnstile-response']

  if (!token) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Turnstile token is required',
    })
  }

  const ip = event.headers.get('cf-connecting-ip') || event.headers.get('x-forwarded-for') || ''
  const config = useRuntimeConfig(event)
  const secretKey = config.turnstileSecretKey
  const verifyUrl = config.turnstileVerifyUrl

  const result = await fetch(verifyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: secretKey,
      response: token,
      remoteip: ip,
    }),
  })

  const data = await result.json()

  if (!data.success) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Turnstile verification failed. Please try again.',
    })
  }

  return { success: true }
})
