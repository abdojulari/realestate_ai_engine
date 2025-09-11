import { useAuthStore } from '~/stores/auth'

export const useSessionTimeout = () => {
  const auth = useAuthStore()
  let timeoutId: NodeJS.Timeout | null = null
  let warningTimeoutId: NodeJS.Timeout | null = null
  
  // Session timeout settings
  const SESSION_TIMEOUT = 60 * 60 * 1000 // 1 hour in milliseconds
  const WARNING_TIME = 5 * 60 * 1000 // Show warning 5 minutes before timeout
  
  const clearTimeouts = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    if (warningTimeoutId) {
      clearTimeout(warningTimeoutId)
      warningTimeoutId = null
    }
  }
  
  const showSessionWarning = () => {
    // Show a warning dialog 5 minutes before session expires
    if (confirm('Your session will expire in 5 minutes. Do you want to extend your session?')) {
      // User wants to extend session - make an API call to refresh token
      refreshSession()
    }
  }
  
  const refreshSession = async () => {
    try {
      // Check if current token is still valid by making a request
      await auth.checkAuth()
      // If successful, reset the timeout
      resetTimeout()
    } catch (error) {
      // Token is expired or invalid, logout user
      handleSessionExpired()
    }
  }
  
  const handleSessionExpired = () => {
    auth.logout()
    alert('Your session has expired. Please log in again.')
    navigateTo('/auth/login')
  }
  
  const resetTimeout = () => {
    if (!process.client || !auth.isAuthenticated) return
    
    clearTimeouts()
    
    // Set warning timeout (55 minutes)
    warningTimeoutId = setTimeout(() => {
      showSessionWarning()
    }, SESSION_TIMEOUT - WARNING_TIME)
    
    // Set logout timeout (60 minutes)
    timeoutId = setTimeout(() => {
      handleSessionExpired()
    }, SESSION_TIMEOUT)
  }
  
  const startSessionTimeout = () => {
    if (!process.client) return
    resetTimeout()
    
    // Reset timeout on user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    const resetOnActivity = () => {
      if (auth.isAuthenticated) {
        resetTimeout()
      }
    }
    
    events.forEach(event => {
      document.addEventListener(event, resetOnActivity, true)
    })
    
    // Cleanup function
    return () => {
      clearTimeouts()
      events.forEach(event => {
        document.removeEventListener(event, resetOnActivity, true)
      })
    }
  }
  
  const stopSessionTimeout = () => {
    clearTimeouts()
  }
  
  return {
    startSessionTimeout,
    stopSessionTimeout,
    resetTimeout,
    refreshSession
  }
}
