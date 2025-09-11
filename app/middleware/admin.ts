import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (to) => {
  // Skip middleware on server-side to avoid issues
  if (!process.client) return
  
  const auth = useAuthStore()
  
  try {
    // First, try to restore token from localStorage if not in store
    if (!auth.token) {
      const token = localStorage.getItem('token')
      if (token) {
        auth.setToken(token)
      } else {
        // No token found, redirect to login
        return navigateTo({
          path: '/auth/login',
          query: { redirect: to.fullPath }
        })
      }
    }
    
    // If we have a token but no user, restore user info
    if (auth.token && !auth.user) {
      try {
        await auth.checkAuth()
      } catch (error) {
        // Auth check failed, clear everything and redirect
        auth.clearAuth()
        return navigateTo({
          path: '/auth/login',
          query: { redirect: to.fullPath }
        })
      }
    }
    
    // Final check: ensure we have a user
    if (!auth.user) {
      return navigateTo({
        path: '/auth/login',
        query: { redirect: to.fullPath }
      })
    }

    // Check if user is an admin
    if (auth.user.role !== 'admin') {
      // User exists but is not admin, redirect to home
      return navigateTo('/')
    }
    
    // If we reach here, user is authenticated and is an admin
    
  } catch (error) {
    // Any unexpected error, redirect to login
    auth.clearAuth()
    return navigateTo({
      path: '/auth/login',
      query: { redirect: to.fullPath }
    })
  }
})
