export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore()

  const publicPrefixes = [
    '/',
    '/buying',
    '/selling',
    '/seller/homeestimate',
    '/seller',
    '/contact',
    '/map-search',
    '/ai-search',
    '/properties',
    '/about',
    '/terms',
    '/privacy',
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password'
  ]
  
  // Allow all public paths (and their subpaths)
  if (publicPrefixes.some(p => to.path === p || to.path.startsWith(p + '/'))) return

  // On client-side, ensure auth state is restored before checking authentication
  if (process.client) {
    // If no token in store but one exists in localStorage, restore it first
    if (!auth.token) {
      const token = localStorage.getItem('token')
      if (token) {
        auth.setToken(token)
      }
    }
    
    // If we have a token but no user, try to restore user info
    if (auth.token && !auth.user) {
      try {
        await auth.checkAuth()
      } catch (error) {
        // If auth check fails, clear everything and redirect
        auth.clearAuth()
        if (process.client) localStorage.setItem('redirectAfterLogin', to.fullPath)
        return navigateTo('/auth/login')
      }
    }
  }

  // Define protected routes that require authentication
  const protectedPrefixes = ['/admin', '/buyer', '/profile', '/seller/dashboard', '/seller/list-property']
  const isProtectedRoute = to.path.startsWith('/property/') || protectedPrefixes.some(p => to.path.startsWith(p))

  // Check authentication for protected routes
  if (isProtectedRoute && !auth.isAuthenticated) {
    if (process.client) localStorage.setItem('redirectAfterLogin', to.fullPath)
    return navigateTo('/auth/login')
  }

  // Check admin access
  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return navigateTo('/')
  }

  // Redirect authenticated users away from guest-only pages
  if (to.meta.guestOnly && auth.isAuthenticated) {
    const redirectTo = (to.query.redirect as string) || '/'
    return navigateTo(redirectTo)
  }
})
