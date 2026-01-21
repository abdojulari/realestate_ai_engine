import { defineEventHandler, getHeader } from 'h3'
import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  
  const response: any = {
    hasAuthHeader: !!authHeader,
    authHeader: authHeader || 'None',
    context: {
      hasUser: !!event.context.user,
      user: event.context.user || null
    }
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    response.hasToken = !!token
    
    if (token) {
      try {
        const secret = process.env.JWT_SECRET || 'fallback-secret'
        const decoded = jwt.verify(token, secret)
        response.tokenValid = true
        response.decoded = decoded
      } catch (error: any) {
        response.tokenValid = false
        response.tokenError = error.message
      }
    }
  }

  // Check localStorage (client-side, this won't work server-side)
  if (process.client) {
    response.clientStorage = {
      hasToken: !!localStorage.getItem('token')
    }
  }

  return response
})

