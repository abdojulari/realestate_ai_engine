export default defineNuxtRouteMiddleware((to, from) => {
  // Skip transition for initial page load
  if (!from) return

  // Add transition name based on route depth
  const toDepth = to.path.split('/').length
  const fromDepth = from.path.split('/').length

  to.meta.pageTransition = {
    name: toDepth < fromDepth ? 'slide-right' : 'slide-left',
    mode: 'out-in'
  }
})
