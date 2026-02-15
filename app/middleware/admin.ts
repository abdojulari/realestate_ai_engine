import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (to) => {
  console.log('[Admin Middleware] Starting for route:', to.fullPath)
  
  // Skip middleware on server-side to avoid issues
  if (!process.client) {
    console.log('[Admin Middleware] Skipping on server-side')
    return
  }
  
  const auth = useAuthStore()
  console.log('[Admin Middleware] Auth store state:', { 
    hasToken: !!auth.token, 
    hasUser: !!auth.user,
    userRole: auth.user?.role 
  })
  
  try {
    // First, try to restore token from localStorage if not in store
    if (!auth.token) {
      console.log('[Admin Middleware] No token in store, checking localStorage')
      const token = localStorage.getItem('token')
      if (token) {
        console.log('[Admin Middleware] Token found in localStorage, restoring')
        auth.setToken(token)
      } else {
        // No token found, redirect to login
        console.log('[Admin Middleware] No token found, redirecting to login')
        return navigateTo({
          path: '/auth/login',
          query: { redirect: to.fullPath }
        })
      }
    }
    
    // If we have a token but no user, restore user info
    if (auth.token && !auth.user) {
      console.log('[Admin Middleware] Have token but no user, checking auth')
      try {
        await auth.checkAuth()
        console.log('[Admin Middleware] Auth check successful, user:', auth.user?.email)
      } catch (error) {
        // Auth check failed, clear everything and redirect
        console.error('[Admin Middleware] Auth check failed:', error)
        auth.clearAuth()
        return navigateTo({
          path: '/auth/login',
          query: { redirect: to.fullPath }
        })
      }
    }
    
    // Final check: ensure we have a user
    if (!auth.user) {
      console.log('[Admin Middleware] No user found after checks, redirecting to login')
      return navigateTo({
        path: '/auth/login',
        query: { redirect: to.fullPath }
      })
    }

    // Check if user is an admin or super_admin
    if (auth.user.role !== 'admin' && auth.user.role !== 'super_admin') {
      // User exists but is not admin, redirect to home
      console.log('[Admin Middleware] User is not admin, role:', auth.user.role)
      return navigateTo('/')
    }
    
    console.log('[Admin Middleware] All checks passed, allowing access')
    // If we reach here, user is authenticated and is an admin
    
  } catch (error) {
    // Any unexpected error, redirect to login
    console.error('[Admin Middleware] Unexpected error:', error)
    auth.clearAuth()
    return navigateTo({
      path: '/auth/login',
      query: { redirect: to.fullPath }
    })
  }
})
