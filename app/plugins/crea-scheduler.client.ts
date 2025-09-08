export default defineNuxtPlugin(async () => {
  // Only run in browser and if service workers are supported
  if (!process.client || !('serviceWorker' in navigator)) {
    return
  }

  try {
    // Register the CREA scheduler service worker
    const registration = await navigator.serviceWorker.register('/sw-crea-scheduler.js', {
      scope: '/'
    })

    console.log('✅ CREA Scheduler Service Worker registered:', registration.scope)

    // Listen for messages from the service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, timestamp, scheduled } = event.data

      switch (type) {
        case 'CREA_SYNC_STARTED':
          console.log('🔄 CREA sync started via service worker:', { timestamp, scheduled })
          
          // Show notification to admin users if they're on the settings page
          if (window.location.pathname.includes('/admin/settings')) {
            // Could emit an event here to update the UI
            window.dispatchEvent(new CustomEvent('crea-sync-started', {
              detail: { timestamp, scheduled }
            }))
          }
          break
      }
    })

    // Ensure service worker starts the scheduler
    if (registration.active) {
      registration.active.postMessage({ type: 'START_SCHEDULER' })
    }

    // Handle service worker updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated') {
            console.log('🔄 CREA Scheduler Service Worker updated')
            newWorker.postMessage({ type: 'START_SCHEDULER' })
          }
        })
      }
    })

  } catch (error) {
    console.error('❌ Failed to register CREA Scheduler Service Worker:', error)
  }
})
