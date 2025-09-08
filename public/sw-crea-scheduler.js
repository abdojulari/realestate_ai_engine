/**
 * Service Worker for CREA Auto-Sync Scheduling
 * Handles automatic midnight syncing of CREA data
 */

const CACHE_NAME = 'crea-scheduler-v1'
const SYNC_CHECK_INTERVAL = 60 * 1000 // Check every minute
let syncCheckTimer = null

// Install event
self.addEventListener('install', (event) => {
  console.log('🔧 CREA Scheduler Service Worker installing...')
  self.skipWaiting()
})

// Activate event
self.addEventListener('activate', (event) => {
  console.log('✅ CREA Scheduler Service Worker activated')
  
  // Start the sync scheduler
  startSyncScheduler()
  
  event.waitUntil(clients.claim())
})

// Start the sync scheduler
function startSyncScheduler() {
  console.log('⏰ Starting CREA sync scheduler...')
  
  // Clear existing timer
  if (syncCheckTimer) {
    clearInterval(syncCheckTimer)
  }
  
  // Check every minute if it's time to sync
  syncCheckTimer = setInterval(checkForSyncTime, SYNC_CHECK_INTERVAL)
}

// Check if it's time to run the sync
async function checkForSyncTime() {
  try {
    // Get auto-sync settings
    const settingsResponse = await fetch('/api/admin/settings/crea-sync')
    if (!settingsResponse.ok) return
    
    const settings = await settingsResponse.json()
    
    if (!settings.autoSyncEnabled) {
      return // Auto-sync is disabled
    }
    
    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    
    // Check if it's the scheduled time (within 1 minute window)
    if (currentTime === settings.autoSyncTime) {
      console.log('⏰ Time for scheduled CREA sync:', currentTime)
      await performScheduledSync()
    }
  } catch (error) {
    console.error('❌ Error checking sync time:', error)
  }
}

// Perform the scheduled sync
async function performScheduledSync() {
  try {
    console.log('🔄 Starting scheduled CREA sync...')
    
    // Call the background sync endpoint
    const response = await fetch('/api/admin/crea/background-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filters: {}, // Sync all cities
        scheduled: true
      })
    })
    
    if (response.ok) {
      console.log('✅ Scheduled CREA sync started successfully')
      
      // Notify any open admin tabs
      const clients = await self.clients.matchAll()
      clients.forEach(client => {
        client.postMessage({
          type: 'CREA_SYNC_STARTED',
          timestamp: new Date().toISOString(),
          scheduled: true
        })
      })
    } else {
      console.error('❌ Scheduled sync failed:', response.statusText)
    }
  } catch (error) {
    console.error('❌ Error performing scheduled sync:', error)
  }
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data
  
  switch (type) {
    case 'CHECK_SYNC_STATUS':
      // Return current sync status
      event.ports[0].postMessage({
        type: 'SYNC_STATUS',
        running: syncCheckTimer !== null
      })
      break
      
    case 'FORCE_SYNC_CHECK':
      // Force a sync time check
      checkForSyncTime()
      break
      
    case 'STOP_SCHEDULER':
      // Stop the scheduler
      if (syncCheckTimer) {
        clearInterval(syncCheckTimer)
        syncCheckTimer = null
      }
      break
      
    case 'START_SCHEDULER':
      // Start the scheduler
      startSyncScheduler()
      break
  }
})

// Handle fetch events (for caching if needed)
self.addEventListener('fetch', (event) => {
  // Let all requests pass through for now
  // Could add caching for CREA API responses here if needed
})

console.log('🚀 CREA Scheduler Service Worker loaded')
