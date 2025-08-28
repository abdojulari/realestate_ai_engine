export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()

  const publicPrefixes = [
    '/',
    '/buying',
    '/selling',
    '/seller/homeestimate',
    '/seller',
    '/contact',
    '/map-search',
    '/properties',
    '/about',
    '/terms',
    '/privacy',
    '/auth/login',
    '/auth/register'
  ]
  // if (publicPrefixes.some(p => to.path === p || to.path.startsWith(p + '/'))) {
  //   return
  // }
  // Match all paths that start with public routes
  // Allow all public paths (and their subpaths)
  if (publicPrefixes.some(p => to.path === p || to.path.startsWith(p + '/'))) return

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
