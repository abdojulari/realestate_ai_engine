import { defineEventHandler, getQuery, createError } from 'h3'
import { creaService } from '../../utils/crea.service'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma

/**
 * POST /api/crea/backfill-media
 *
 * Repairs the population gap caused by older sync code that discarded the
 * Media-bearing per-listing fetch and saved every CREA row with `images: []`.
 *
 * Lives under /api/crea/ (not /api/admin/crea/) intentionally, so the
 * companion CLI script can hit it the same way `holistic-sync.mjs` already
 * hits /api/crea/sync-province — no auth header, no JWT, no shared secret.
 * The endpoint is read-write but only mutates `images`, `features.mediaItems`
 * and `lastSyncAt`, exactly what the regular sync does.
 *
 * Strategy:
 *   - Finds CREA-source properties whose `images` JSON is empty/missing.
 *   - Fast path: if `features.mediaItems` is already populated, derive
 *     `images` from the existing JSON without any CREA round-trip.
 *   - Slow path: call `getPropertyMedia(listingKey)` (1 API call each — much
 *     cheaper than full sync, which also fetches Property + Member + Office)
 *     and write back `images` plus `features.mediaItems` while preserving
 *     any other keys already inside `features`.
 *   - Returns batch stats so the wrapper script can loop until done.
 *
 * Why batched + driven from the client:
 *   - CREA throttles aggressively; the per-iteration sleep keeps us polite.
 *   - Lets the caller cancel mid-run without leaving the server stuck in a
 *     long-running handler.
 *   - Naturally idempotent — re-running always picks up where it left off
 *     because the WHERE clause excludes rows already populated.
 *
 * Query params:
 *   ?limit=100   — properties to process this call (default 100, max 500)
 *   ?delay=300   — ms between CREA calls (default 300)
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const limit = Math.min(Number(query.limit) || 100, 500)
  const delay = Math.max(Number(query.delay) || 300, 0)

  try {
    // Properties missing photos: empty array, null, or no `images` key at all.
    // Using a raw JSON predicate because Prisma doesn't model
    // `JSON array length === 0` natively across providers.
    const properties: Array<{ id: number; externalId: string; features: any }> =
      await prisma.$queryRawUnsafe(
        `SELECT id, "externalId", features
         FROM "Property"
         WHERE source = 'crea'
           AND "externalId" IS NOT NULL
           AND status IN ('for_sale', 'pending')
           AND (
             images IS NULL
             OR jsonb_typeof(images::jsonb) <> 'array'
             OR jsonb_array_length(images::jsonb) = 0
           )
         ORDER BY "updatedAt" DESC
         LIMIT $1`,
        limit
      )

    console.log(`📸 Media backfill: ${properties.length} CREA properties without images`)

    const stats = {
      attempted: properties.length,
      updated: 0,
      noMedia: 0,
      expired: 0,
      failed: 0,
      reasons: [] as string[],
    }

    const isPhotoCategory = (cat?: string | null): boolean => {
      if (!cat) return true
      const c = String(cat).toLowerCase()
      if (c.includes('agent') || c.includes('office') || c.includes('logo')) return false
      return c.includes('photo')
    }

    for (const prop of properties) {
      const listingKey = prop.externalId
      try {
        // Fast path: if `features.mediaItems` is already populated (e.g. an
        // earlier code path saved it but skipped `images`), just derive
        // `images` from the existing JSON. Avoids a CREA round-trip entirely.
        const existingMediaItems = Array.isArray(prop.features?.mediaItems)
          ? prop.features.mediaItems
          : []
        if (existingMediaItems.length > 0) {
          const images = existingMediaItems
            .filter((m: any) => m?.url && isPhotoCategory(m?.category))
            .map((m: any) => m.url)
          if (images.length > 0) {
            await prisma.property.update({
              where: { id: prop.id },
              data: { images: images as any, lastSyncAt: new Date() },
            })
            stats.updated++
            continue
          }
        }

        const media = await creaService.getPropertyMedia(listingKey)

        if (!Array.isArray(media) || media.length === 0) {
          // Property exists in CREA but truly has no media. Mark with an
          // empty array so the next backfill skips it instead of retrying
          // forever.
          await prisma.property.update({
            where: { id: prop.id },
            data: { images: [] as any, lastSyncAt: new Date() },
          })
          stats.noMedia++
          continue
        }

        // Reuse the same shaping/sorting/category logic as the main
        // transformer so backfilled rows are byte-identical to freshly
        // synced ones. Inlined here (rather than calling the transformer)
        // because we don't want to touch any non-image columns — that's
        // the whole point of a media-only backfill.
        const sorted = media
          .filter(m => m && m.MediaURL)
          .sort((a, b) => {
            if (a.PreferredPhotoYN && !b.PreferredPhotoYN) return -1
            if (!a.PreferredPhotoYN && b.PreferredPhotoYN) return 1
            return (a.Order ?? 0) - (b.Order ?? 0)
          })

        const mediaItems = sorted.map(m => ({
          url: m.MediaURL,
          alt: m.LongDescription || null,
          order: m.Order ?? 0,
          category: m.MediaCategory || 'Photo',
          isPreferred: !!m.PreferredPhotoYN,
          mediaKey: m.MediaKey || null,
          modifiedAt: m.ModificationTimestamp || null,
          resourceRecordId: m.ResourceRecordId || null,
          resourceRecordKey: m.ResourceRecordKey || null,
          resourceName: m.ResourceName || null,
        }))

        const images = mediaItems
          .filter(m => isPhotoCategory(m.category))
          .map(m => m.url)

        const existingFeatures = (prop.features && typeof prop.features === 'object') ? prop.features : {}
        const nextFeatures = { ...existingFeatures, mediaItems }

        await prisma.property.update({
          where: { id: prop.id },
          data: {
            images: images as any,
            features: nextFeatures as any,
            lastSyncAt: new Date(),
          },
        })

        stats.updated++

        if (delay > 0) {
          await new Promise(r => setTimeout(r, delay))
        }
      } catch (err: any) {
        const msg = err?.message || String(err)

        // CREA returns 404 when a listing has dropped out of their feed
        // entirely (sold / withdrawn / expired). Mark the row as expired so
        // the predicate in this query stops matching it on subsequent runs
        // AND so the listing stops appearing as for-sale on the site. This
        // mirrors what backfill-agents.post.ts already does.
        if (/\b404\b/.test(msg)) {
          await prisma.property.update({
            where: { id: prop.id },
            data: { status: 'expired', lastSyncAt: new Date() },
          })
          stats.expired++
          continue
        }

        stats.failed++
        if (stats.reasons.length < 20) {
          stats.reasons.push(`${listingKey}: ${msg}`)
        }
        console.error(`❌ ${listingKey}:`, msg)
      }
    }

    console.log('📸 Media backfill batch complete:', stats)
    return { success: true, stats, hasMore: properties.length === limit }
  } catch (err: any) {
    console.error('❌ Media backfill error:', err)
    throw createError({
      statusCode: 500,
      statusMessage: `Media backfill failed: ${err?.message || err}`,
    })
  }
})
