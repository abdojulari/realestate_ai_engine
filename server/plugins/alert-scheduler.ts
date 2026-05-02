/**
 * Alert Scheduler Plugin
 * Runs property alerts on schedule
 */

import { getInternalApiBase } from '../utils/tenantSiteUrl'

let alertInterval: NodeJS.Timeout | null = null

export default defineNitroPlugin((nitroApp) => {
  console.log('🔔 Initializing Property Alert Scheduler...')
  
  // Start the alert scheduler when server starts
  startAlertScheduler()
  
  // Clean up on server shutdown
  nitroApp.hooks.hook('close', () => {
    if (alertInterval) {
      clearInterval(alertInterval)
      console.log('🔔 Alert scheduler stopped')
    }
  })
})

function startAlertScheduler() {
  const config = useRuntimeConfig()
  // Self-loopback — the scheduler is just calling its own /api/alerts/run-due
  // endpoint on the same Node process, no need to round-trip through the
  // public proxy or pick a tenant URL.
  const baseUrl = getInternalApiBase()
  const schedulerSecret = config.alertSchedulerSecret
  // Clear any existing interval
  if (alertInterval) {
    clearInterval(alertInterval)
  }
  
  // Check for due alerts every hour
  alertInterval = setInterval(async () => {
    try {
      console.log('⏰ Running scheduled property alert check...')
      
      const response = await fetch(`${baseUrl}/api/alerts/run-due`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(schedulerSecret ? { 'x-alert-scheduler-secret': schedulerSecret } : {})
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('✅ Alert check completed:', result.message)
      } else {
        console.error('❌ Alert check failed:', response.statusText)
      }
    } catch (error) {
      console.error('❌ Alert scheduler error:', error)
    }
  }, 60 * 60 * 1000) // Every hour
  
  console.log('✅ Property Alert Scheduler started (runs every hour)')
}
