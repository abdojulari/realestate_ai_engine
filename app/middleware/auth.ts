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

  // On client-side, try to restore auth state if not already loaded
  if (process.client && !auth.user && !auth.token) {
    const token = localStorage.getItem('token')
    if (token) {
      console.log('[AUTH MIDDLEWARE] Found token, restoring auth state...')
      auth.setToken(token)
      try {
        await auth.checkAuth()
        console.log('[AUTH MIDDLEWARE] Auth restored, user:', auth.user?.email)
      } catch (error) {
        console.error('[AUTH MIDDLEWARE] Auth restoration failed:', error)
        auth.clearAuth()
      }
    }
  }

  if (to.path.startsWith('/property/') && !auth.isAuthenticated) {
    if (process.client) localStorage.setItem('redirectAfterLogin', to.fullPath)
    return navigateTo('/auth/login')
  }

  // Only enforce auth for clearly private sections when not already handled by page meta
  const protectedPrefixes = ['/admin', '/buyer', '/profile', '/seller/dashboard', '/seller/list-property']
  if ((to.path.startsWith('/property/') || protectedPrefixes.some(p => to.path.startsWith(p))) && !auth.isAuthenticated) {
    if (process.client) localStorage.setItem('redirectAfterLogin', to.fullPath)
    return navigateTo('/auth/login')
  }

  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return navigateTo('/')
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return navigateTo('/')
  }
})
