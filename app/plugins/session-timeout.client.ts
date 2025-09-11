export default defineNuxtPlugin(() => {
  const auth = useAuthStore()
  const { startSessionTimeout, stopSessionTimeout } = useSessionTimeout()
  
  // Watch for authentication state changes
  watch(() => auth.isAuthenticated, (isAuthenticated) => {
    if (isAuthenticated) {
      // Start session timeout when user logs in
      startSessionTimeout()
    } else {
      // Stop session timeout when user logs out
      stopSessionTimeout()
    }
  }, { immediate: true })
  
  // Start session timeout if already authenticated on page load
  if (process.client && auth.isAuthenticated) {
    startSessionTimeout()
  }
})
