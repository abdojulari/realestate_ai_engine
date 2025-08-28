export default defineNuxtPlugin(async () => {
  const { useAuthStore } = await import('~/stores/auth')
  const authStore = useAuthStore()
  const router = useRouter()

  // Initialize auth state from localStorage
  if (process.client) {
    const token = localStorage.getItem('token')
    if (token) {
      authStore.setToken(token)
      try {
        await authStore.checkAuth()
      } catch (error) {
        console.error('Auth initialization error:', error)
        authStore.clearAuth()
      }
    }
  }

  // Add navigation guard
  router.beforeEach(async (to) => {
    // Allowlist for public pages (and their subpaths)
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

    if (publicPrefixes.some(p => to.path === p || to.path.startsWith(p + '/'))) {
      return true
    }

    // Gate property details behind auth
    if (to.path.startsWith('/property/') && !authStore.isAuthenticated) {
      if (process.client) localStorage.setItem('redirectAfterLogin', to.fullPath)
      return '/auth/login'
    }

    // Gate clearly private sections
    const protectedPrefixes = ['/admin', '/buyer', '/profile', '/seller/dashboard', '/seller/list-property']
    if (protectedPrefixes.some(p => to.path.startsWith(p)) && !authStore.isAuthenticated) {
      if (process.client) localStorage.setItem('redirectAfterLogin', to.fullPath)
      return '/auth/login'
    }

    return true
  })
})