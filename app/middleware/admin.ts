import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore()
  
  // On client-side, try to restore auth state if not already loaded
  if (process.client && !auth.user && !auth.token) {
    const token = localStorage.getItem('token')
    if (token) {
      console.log('[ADMIN MIDDLEWARE] Found token, checking auth...')
      auth.setToken(token)
      try {
        await auth.checkAuth()
        console.log('[ADMIN MIDDLEWARE] Auth check completed, user:', auth.user?.email)
      } catch (error) {
        console.error('[ADMIN MIDDLEWARE] Auth check failed:', error)
        auth.clearAuth()
      }
    }
  }

  const user = auth.user

  // Check if user is authenticated and is an admin
  if (!user || user.role !== 'admin') {
    console.log('[ADMIN MIDDLEWARE] Access denied - user:', user?.email, 'role:', user?.role)
    return navigateTo({
      path: '/auth/login',
      query: { redirect: to.fullPath }
    })
  }
  
  console.log('[ADMIN MIDDLEWARE] Access granted for admin:', user.email)
})
