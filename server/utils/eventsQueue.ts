import Bull from 'bull'
import { getRedisClient } from './redis'

/**
 * Event jobs handed to the events worker. Enqueued by:
 *   • `/api/events.post.ts`               (browser-emitted events)
 *   • `recordServerEvent()` (this file)   (trusted server-side events)
 *
 * Worker (registered in `serverEventsWorker.ts` via the existing
 * Nitro plugin loader) consumes these to:
 *   1. Recompute leadScore / intent / lifecycleStage / lastTouchAt
 *      on the matching CrmClient (when an email or visitorId.crmClientId
 *      can be resolved).
 *   2. Evaluate AutomationRules and fire actions.
 */
export interface EventJobPayload {
  eventLogId: string // BigInt serialized as string for Bull JSON
  adminId: number | null
  visitorId: number | null
  sessionId: number | null
  email: string | null
  name: string
  objectType: string | null
  objectId: number | null
  properties: Record<string, unknown> | null
  createdAt: string // ISO
}

let eventsQueue: Bull.Queue<EventJobPayload> | null = null

/**
 * Lazily create the Bull queue. Returns null if Redis isn't configured —
 * the rest of the platform falls back to inline processing in that case.
 */
export function getEventsQueue(): Bull.Queue<EventJobPayload> | null {
  if (eventsQueue) return eventsQueue

  const redis = getRedisClient()
  if (!redis) {
    // Redis is optional in dev. Inline processing in /api/events keeps
    // the platform usable without it.
    return null
  }

  try {
    const redisUrl = process.env.REDIS_URL
    eventsQueue = new Bull<EventJobPayload>('events', {
      redis: redisUrl
        ? redisUrl
        : {
            host: process.env.REDIS_HOST || 'localhost',
            port: Number(process.env.REDIS_PORT) || 6379,
            password: process.env.REDIS_PASSWORD,
          },
      defaultJobOptions: {
        // Events are very cheap and very many — keep history short.
        removeOnComplete: 100,
        removeOnFail: 200,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1500 },
      },
    })
    console.log('✅ Events queue initialized')
  } catch (err) {
    console.error('❌ Failed to initialize events queue', err)
    eventsQueue = null
  }
  return eventsQueue
}

/**
 * Enqueue an EventLog row for the worker to process. Best-effort:
 * if the queue is unavailable, returns false and the caller should
 * decide whether to inline-process or drop.
 */
export async function enqueueEvent(payload: EventJobPayload): Promise<boolean> {
  const queue = getEventsQueue()
  if (!queue) return false
  try {
    await queue.add('process-event', payload, { delay: 0 })
    return true
  } catch (err) {
    console.error('[eventsQueue] enqueue failed', err)
    return false
  }
}
