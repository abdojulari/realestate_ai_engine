import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { PrismaClient } from '@prisma/client'
import { pillar9Service } from '../../../utils/pillar9.service'
import { requireAdmin } from '../../../utils/auth'

const prisma = new PrismaClient()

/** Allow request if sync secret is configured and provided (for cron). Otherwise require admin. */
async function requireAdminOrSyncSecret(event: any) {
  const config = useRuntimeConfig()
  const secret = config.pillar9SyncSecret as string | undefined
  if (secret && secret.length > 0) {
    const keyHeader = getHeader(event, 'x-pillar9-sync-key')
    const authHeader = getHeader(event, 'authorization')
    const provided = keyHeader ?? (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null)
    if (provided === secret) return
  }
  await requireAdmin(event)
}

const BATCH_LIMIT = 200
const DELAY_BETWEEN_BATCHES_MS = 2500
const DELAY_BETWEEN_MEDIA_MS = 350
const MAX_RETRIES_ON_401 = 3
/** Retry 429 until success so we never record rate-limit as error. */
const MAX_RETRIES_ON_429 = 30
const DELAY_ON_429_BASE_MS = 10000
const MAX_MEDIA_RETRIES_ON_429 = 6
const DELAY_MEDIA_429_MS = 5000

/** Fetch media with retry on 429; returns [] on final failure (no error thrown). */
async function getPropertyMediaWithRetry(
  listingKeyNumeric: number,
  delayFn: (ms: number) => Promise<void>
): Promise<string[]> {
  let lastErr: Error | null = null
  for (let r = 0; r <= MAX_MEDIA_RETRIES_ON_429; r++) {
    try {
      return await pillar9Service.getPropertyMedia(listingKeyNumeric)
    } catch (e: any) {
      lastErr = e
      const msg = e?.message ?? String(e)
      if (msg.includes('429') && r < MAX_MEDIA_RETRIES_ON_429) {
        const wait = DELAY_MEDIA_429_MS * (r + 1)
        await delayFn(wait)
        continue
      }
      break
    }
  }
  return []
}

/** Map MLS status code to stats key */
function statusToKey(s: string): string {
  const map: Record<string, string> = {
    A: 'active',
    P: 'pending',
    S: 'sold',
    LEAS: 'leased',
    W: 'withdrawn',
    X: 'expired',
    T: 'terminated',
    I: 'incomplete'
  }
  return map[s] ?? 'other'
}

export default defineEventHandler(async (event) => {
  await requireAdminOrSyncSecret(event)

  const config = useRuntimeConfig()
  pillar9Service.initConfig({
    clientId: config.pillar9ClientId,
    clientSecret: config.pillar9ClientSecret,
    tokenHost: config.pillar9TokenHost,
    apiHost: config.pillar9ApiHost
  })

  const body = await readBody(event).catch(() => ({}))
  const {
    filters = {},
    syncSold = false,
    syncPending = false,
    /** Sync all MLS statuses (A,P,S,LEAS,W,X,T,I). Default true for full data. */
    syncAllStatuses = true,
    /** Override: only sync these statuses. Ignored if syncAllStatuses is true. */
    syncStatuses = [] as string[],
    deduplicateWithCrea = true,
    /** Fetch images from Media API when not on property. Slower but complete. */
    includeMedia = true,
    /** City codes to sync (e.g. ['0046','0047']). Empty = all Alberta cities. */
    cityCodes = [] as string[],
    /** Delay (ms) between API batches. Default 2500 to avoid 429. */
    delayBetweenBatchesMs = DELAY_BETWEEN_BATCHES_MS
  } = body

  try {
    const configStatus = pillar9Service.getConfigStatus()
    if (!configStatus.configured) {
      throw createError({
        statusCode: 400,
        statusMessage: configStatus.message
      })
    }

    const statusesToSync: string[] = syncAllStatuses
      ? [...pillar9Service.getMlsStatuses()]
      : ['A', ...(syncSold ? ['S'] : []), ...(syncPending ? ['P'] : []), ...syncStatuses]

    const citiesToSync = cityCodes.length > 0 ? cityCodes : pillar9Service.getAlbertaCityCodes()

    const byStatus: Record<string, { created: number; updated: number }> = {}
    for (const s of statusesToSync) {
      byStatus[statusToKey(s)] = { created: 0, updated: 0 }
    }

    let syncStats = {
      total: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      duplicates: 0,
      errors: 0,
      errorDetails: [] as string[],
      byStatus
    }

    console.log('🏠 Starting Pillar9 property sync (city-code batching)...', {
      statuses: statusesToSync,
      cities: citiesToSync.length,
      includeMedia,
      deduplicateWithCrea
    })

    const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

    for (const cityCode of citiesToSync) {
      for (const status of statusesToSync) {
        let skip = 0
        let hasMore = true

        while (hasMore) {
          let retries401 = 0
          let retries429 = 0
          let success = false
          let properties: Awaited<ReturnType<typeof pillar9Service.getProperties>> = []

          while (!success) {
            try {
              properties = await pillar9Service.getProperties({
                status: status as 'A' | 'P' | 'S' | 'LEAS' | 'W' | 'X' | 'T' | 'I',
                cityCode,
                province: filters.province || 'AB',
                limit: BATCH_LIMIT,
                skip,
                minPrice: filters.minPrice,
                maxPrice: filters.maxPrice
              })
              success = true
            } catch (batchError: any) {
              const msg = batchError?.message ?? String(batchError)
              if (msg.includes('401') && retries401 < MAX_RETRIES_ON_401) {
                retries401++
                console.log(`🔐 Pillar9: 401 on batch, retry ${retries401}/${MAX_RETRIES_ON_401}...`)
                await delay(1000)
              } else if (msg.includes('429') && retries429 < MAX_RETRIES_ON_429) {
                retries429++
                const backoffMs = Math.min(DELAY_ON_429_BASE_MS * retries429, 120000)
                console.log(`⏳ Pillar9: 429 rate limit, waiting ${backoffMs / 1000}s then retry ${retries429}/${MAX_RETRIES_ON_429}...`)
                await delay(backoffMs)
              } else {
                console.error(`❌ Batch error city=${cityCode} status=${status} skip=${skip}:`, msg)
                syncStats.errors++
                syncStats.errorDetails.push(`Batch city ${cityCode} status ${status}: ${msg}`)
                hasMore = false
                break
              }
            }
          }

          if (!success || properties.length === 0) {
              hasMore = false
              break
            }

            syncStats.total += properties.length

            for (const p9Prop of properties) {
              try {
                let transformedProperty = pillar9Service.transformToLocalProperty(p9Prop)
                if (!transformedProperty) {
                  syncStats.skipped++
                  continue
                }

                if (deduplicateWithCrea && transformedProperty.mlsNumber) {
                  const existingCrea = await prisma.property.findFirst({
                    where: {
                      source: 'crea',
                      mlsNumber: transformedProperty.mlsNumber
                    }
                  })
                  if (existingCrea) {
                    // When Pillar9 has a non-active status (sold, terminated, etc.)
                    // update the CREA property's status so CMA/off-market pages can use it
                    const p9Status = transformedProperty.status as string
                    const statusUpdateNeeded = ['sold', 'terminated', 'withdrawn', 'expired'].includes(p9Status)
                      && existingCrea.status !== p9Status
                    if (statusUpdateNeeded) {
                      try {
                        const updateData: any = { status: p9Status, lastSyncAt: new Date() }
                        // For sold properties, merge closeDate/closePrice into features
                        if (p9Status === 'sold' && transformedProperty.features) {
                          const existingFeatures = typeof existingCrea.features === 'string'
                            ? JSON.parse(existingCrea.features || '{}')
                            : (existingCrea as any).features || {}
                          const p9Features = typeof transformedProperty.features === 'string'
                            ? JSON.parse(transformedProperty.features as string)
                            : transformedProperty.features
                          updateData.features = {
                            ...existingFeatures,
                            closeDate: (p9Features as any)?.closeDate || null,
                            closePrice: (p9Features as any)?.closePrice || null,
                            statusChangeTimestamp: new Date().toISOString(),
                          }
                          // Use close price if available
                          if ((p9Features as any)?.closePrice) {
                            updateData.price = (p9Features as any).closePrice
                          }
                        }
                        await prisma.property.update({
                          where: { id: existingCrea.id },
                          data: updateData
                        })
                        if (p9Status === 'sold') {
                          await (prisma as any).propertyPriceHistory.create({
                            data: {
                              propertyId: existingCrea.id,
                              price: existingCrea.price,
                              event: 'sold',
                              source: 'pillar9'
                            }
                          }).catch(() => {})
                        }
                        syncStats.updated++
                        const sKey = statusToKey(status)
                        if (syncStats.byStatus[sKey]) {
                          syncStats.byStatus[sKey]!.updated++
                        }
                      } catch (_err) {
                        // Non-critical
                      }
                    }
                    syncStats.duplicates++
                    continue
                  }
                }

                if (includeMedia && (!transformedProperty.images || (transformedProperty.images as string[]).length === 0) && p9Prop.ListingKeyNumeric != null) {
                  const mediaUrls = await getPropertyMediaWithRetry(p9Prop.ListingKeyNumeric, delay)
                  if (mediaUrls.length > 0) {
                    transformedProperty = { ...transformedProperty, images: mediaUrls }
                  }
                  await delay(DELAY_BETWEEN_MEDIA_MS)
                }

                const { user, agent, isSaved, ...propertyData } = transformedProperty as any
                const externalId = p9Prop.ListingKeyNumeric != null ? String(p9Prop.ListingKeyNumeric) : p9Prop.ListingId

                const existingProperty: any = await prisma.property.findFirst({
                  where: {
                    source: 'pillar9',
                    externalId
                  }
                })

                const statusKey = statusToKey(status)
                const newPrice = propertyData.price || 0

                const data = {
                  ...propertyData,
                  lastSyncAt: new Date(),
                  ...(existingProperty
                    ? {
                        views: existingProperty.views,
                        createdAt: existingProperty.createdAt,
                        // Never overwrite firstEntryPrice once set
                        firstEntryPrice: existingProperty.firstEntryPrice ?? existingProperty.price
                      }
                    : {
                        // First sync – both prices are identical
                        firstEntryPrice: newPrice
                      })
                }

                let saved = false
                for (let attempt = 1; attempt <= 2 && !saved; attempt++) {
                  try {
                    if (existingProperty) {
                      // Detect price change and record it
                      const oldPrice = existingProperty.price
                      if (oldPrice && newPrice && oldPrice !== newPrice) {
                        const changeAmt = newPrice - oldPrice
                        const changePct = parseFloat(((changeAmt / oldPrice) * 100).toFixed(2))
                        const priceEvent = changeAmt < 0 ? 'price_decrease' : 'price_increase'
                        try {
                          await (prisma as any).propertyPriceHistory.create({
                            data: {
                              propertyId: existingProperty.id,
                              price: newPrice,
                              event: priceEvent,
                              changeAmt,
                              changePct,
                              source: 'pillar9'
                            }
                          })
                        } catch (_priceErr) {
                          // Non-critical – don't fail the sync
                        }
                      }

                      await (prisma.property as any).update({
                        where: { id: existingProperty.id },
                        data
                      })
                      syncStats.updated++
                      if (syncStats.byStatus[statusKey]) {
                        syncStats.byStatus[statusKey].updated++
                      }
                    } else {
                      const created: any = await (prisma.property as any).create({
                        data: { ...propertyData, lastSyncAt: new Date(), firstEntryPrice: newPrice }
                      })
                      // Record initial listing price
                      try {
                        await (prisma as any).propertyPriceHistory.create({
                          data: {
                            propertyId: created.id,
                            price: newPrice,
                            event: 'listed',
                            source: 'pillar9'
                          }
                        })
                      } catch (_priceErr) {
                        // Non-critical
                      }
                      syncStats.created++
                      if (syncStats.byStatus[statusKey]) {
                        syncStats.byStatus[statusKey].created++
                      }
                    }
                    saved = true
                  } catch (saveError: any) {
                    if (attempt === 1) {
                      await delay(1000)
                    } else {
                      syncStats.errors++
                      syncStats.errorDetails.push(`Property ${p9Prop.ListingId}: ${saveError.message}`)
                    }
                  }
                }
              } catch (propError: any) {
                syncStats.errors++
                syncStats.errorDetails.push(`Property ${p9Prop.ListingId}: ${propError.message}`)
              }
            }

          if (properties.length < BATCH_LIMIT) {
            hasMore = false
          } else {
            skip += BATCH_LIMIT
          }

          await delay(delayBetweenBatchesMs)
        }
      }
    }

    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const staleProperties = await prisma.property.updateMany({
      where: {
        source: 'pillar9',
        lastSyncAt: { lt: cutoffDate },
        status: 'for_sale'
      },
      data: { status: 'expired' }
    })

    // System-level setting — use first super_admin as owner
    const sysAdmin = await prisma.user.findFirst({ where: { role: 'super_admin' }, select: { id: true } })
    const sysAdminId = sysAdmin?.id ?? null
    await (prisma.setting as any).upsert({
      where: { adminId_key: { adminId: sysAdminId!, key: 'pillar9_last_sync' } },
      update: { value: new Date().toISOString() },
      create: { adminId: sysAdminId, key: 'pillar9_last_sync', value: new Date().toISOString() }
    })

    console.log('\n✅ Pillar9 sync completed:', syncStats)

    return {
      success: true,
      stats: syncStats,
      stalePropertiesMarked: staleProperties.count,
      message: `Sync completed: ${syncStats.created} created, ${syncStats.updated} updated, ${syncStats.duplicates} duplicates skipped, ${syncStats.errors} errors`
    }
  } catch (error: any) {
    console.error('❌ Pillar9 sync error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Sync failed: ${error.message}`
    })
  }
})
