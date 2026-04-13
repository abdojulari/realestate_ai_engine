export default defineNuxtPlugin(async () => {
  if (!process.client || !('serviceWorker' in navigator)) {
    return
  }

  // Only register for admin pages -- the service worker cannot carry auth
  // tokens and spams 401 errors for regular visitors. Server-side cron
  // (cron-sync.sh) is the reliable mechanism for scheduled syncs.
  if (!window.location.pathname.startsWith('/admin')) {
    return
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw-crea-scheduler.js', {
      scope: '/'
    })

    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, timestamp, scheduled } = event.data

      switch (type) {
        case 'CREA_SYNC_STARTED':
          if (window.location.pathname.includes('/admin/settings')) {
            window.dispatchEvent(new CustomEvent('crea-sync-started', {
              detail: { timestamp, scheduled }
            }))
          }
          break
      }
    })

    if (registration.active) {
      registration.active.postMessage({ type: 'START_SCHEDULER' })
    }

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated') {
            newWorker.postMessage({ type: 'START_SCHEDULER' })
          }
        })
      }
    })

  } catch (error) {
    console.error('Failed to register CREA Scheduler Service Worker:', error)
  }
})
