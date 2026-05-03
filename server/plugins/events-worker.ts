/**
 * Boots the Bull processor for the `events` queue.
 *
 * On every job:
 *   • Reads the EventLog row from Postgres (single source of truth).
 *   • Hands the payload to `processEventInline` which recomputes
 *     CrmClient lead intelligence and fires automation rules.
 *
 * Falls back to a no-op when Redis isn't configured — `recordEventFromBrowser`
 * already inline-processes events in that case so single-instance dev still works.
 */
import { getEventsQueue } from '../utils/eventsQueue'
import { processEventInline } from '../utils/eventsWorker'

export default defineNitroPlugin(() => {
  const queue = getEventsQueue()
  if (!queue) {
    console.log('⚠️  Events worker disabled — Redis not available (inline mode active)')
    return
  }
  // Concurrency 5: each job is small (a few writes + maybe one outbound HTTP).
  queue.process(5, async (job) => {
    try {
      await processEventInline(job.data)
      return { ok: true }
    } catch (err) {
      console.error('[events-worker] job failed', err)
      throw err
    }
  })
  console.log('✅ Events worker registered (concurrency 5)')
})
