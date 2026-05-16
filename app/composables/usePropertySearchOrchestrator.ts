import type { Ref } from 'vue'
import {
  buildPropertySearchParams,
  cloneSearchParamsWithoutPagination,
  type AiSearchNormalizeContext,
} from '~/utils/aiSearchNormalize'

export type AiSearchPhase =
  | 'idle'
  | 'parsing'
  | 'normalizing'
  | 'fetching'
  | 'cancelled'

const PROVIDER_LABEL = 'Property listings API'

function mergeAbortSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  const c = new AbortController()
  const forward = () => {
    const reason =
      a.aborted ? a.reason : b.aborted ? b.reason : new DOMException('Aborted', 'AbortError')
    if (!c.signal.aborted) c.abort(reason)
  }
  if (a.aborted || b.aborted) {
    forward()
    return c.signal
  }
  a.addEventListener('abort', forward, { once: true })
  b.addEventListener('abort', forward, { once: true })
  return c.signal
}

function timeoutSignal(ms: number): AbortSignal {
  const AnyAbort = AbortSignal as typeof AbortSignal & { timeout?: (n: number) => AbortSignal }
  if (typeof AnyAbort.timeout === 'function') {
    return AnyAbort.timeout(ms)
  }
  const c = new AbortController()
  setTimeout(() => {
    c.abort(new DOMException(`Timed out after ${ms}ms`, 'TimeoutError'))
  }, ms)
  return c.signal
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const id = setTimeout(resolve, ms)
    const onAbort = () => {
      clearTimeout(id)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function backoffDelay(
  attempt: number,
  initialMs: number,
  maxMs: number,
  factor: number,
  jitter: boolean,
): number {
  const raw = Math.min(maxMs, initialMs * Math.pow(factor, Math.max(0, attempt - 1)))
  if (!jitter) return raw
  return Math.floor(raw * (0.5 + Math.random() * 0.5))
}

export interface PropertySearchOrchestratorOptions {
  searchQuery: Ref<string>
  selectedCity: Ref<string>
  selectedNeighborhoodName: Ref<string | null>
  itemsPerPage: number
  /** When true, requests only manual (builder / off-market) listings via `source=manual`. */
  builderOrOffMarketOnly?: Ref<boolean>
  parseTimeoutMs?: number
  fetchTimeoutMs?: number
  maxFetchRetries?: number
  fetchRetryInitialDelayMs?: number
}

export interface ParsePropertyQueryResponse {
  filters: Record<string, unknown>
  confidence?: number
  method?: string
  extractedFeatures?: string[]
  featureCount?: number
  originalQuery?: string
  [key: string]: unknown
}

export function usePropertySearchOrchestrator(opts: PropertySearchOrchestratorOptions) {
  const {
    searchQuery,
    selectedCity,
    selectedNeighborhoodName,
    itemsPerPage,
    builderOrOffMarketOnly,
    parseTimeoutMs = 22_000,
    fetchTimeoutMs = 55_000,
    maxFetchRetries = 3,
    fetchRetryInitialDelayMs = 900,
  } = opts

  const { $fetch } = useNuxtApp()

  const phase = ref<AiSearchPhase>('idle')
  const statusTitle = ref('')
  const statusSubtitle = ref('')
  const fetchAttempt = ref(0)
  const fetchMaxAttempts = ref(maxFetchRetries)
  const partialNotice = ref('')

  const errorMessage = ref('')
  const lastSearchFilters = ref<ParsePropertyQueryResponse | null>(null)
  const lastQueryBase = ref<string>('')

  let runId = 0
  let abortMaster: AbortController | null = null

  const isSearchBusy = computed(
    () => phase.value === 'parsing' || phase.value === 'normalizing' || phase.value === 'fetching',
  )

  function cancelSearch() {
    abortMaster?.abort(new DOMException('Cancelled by user', 'AbortError'))
    phase.value = 'cancelled'
    statusTitle.value = 'Cancelled'
    statusSubtitle.value = ''
    partialNotice.value = ''
    queueMicrotask(() => {
      if (phase.value === 'cancelled') {
        phase.value = 'idle'
        statusTitle.value = ''
      }
    })
  }

  async function parseQuery(signal: AbortSignal): Promise<ParsePropertyQueryResponse> {
    const body = { query: searchQuery.value.trim() }
    return $fetch<ParsePropertyQueryResponse>('/api/ai/parse-property-query', {
      method: 'POST',
      body,
      signal,
    })
  }

  async function fetchProperties(url: string, signal: AbortSignal): Promise<any> {
    return $fetch(url, { signal })
  }

  /**
   * Run AI search. Page 1 runs parse → normalize → fetch; later pages reuse saved query base (fetch only).
   */
  async function executeSearch(
    pageNum: number,
    handlers: {
      onResults: (response: any) => void
      onEmptyParse?: () => void
    },
  ): Promise<void> {
    const page = typeof pageNum === 'number' && !Number.isNaN(pageNum) ? pageNum : 1

    runId += 1
    const myRun = runId
    abortMaster?.abort()
    abortMaster = new AbortController()
    const userSignal = abortMaster.signal

    errorMessage.value = ''
    partialNotice.value = ''
    statusSubtitle.value = ''
    statusTitle.value = ''
    fetchAttempt.value = 0

    const trimmed = searchQuery.value.trim()
    if (page === 1 && !trimmed) {
      errorMessage.value = 'Enter a short description of what you are looking for.'
      phase.value = 'idle'
      statusTitle.value = ''
      handlers.onEmptyParse?.()
      return
    }

    try {
      let parseResult: ParsePropertyQueryResponse

      if (page > 1 && lastSearchFilters.value && lastQueryBase.value) {
        parseResult = lastSearchFilters.value
        phase.value = 'fetching'
        statusTitle.value = 'Fetching results…'
        statusSubtitle.value = `Page ${page} · ${PROVIDER_LABEL}`
      } else {
        phase.value = 'parsing'
        statusTitle.value = 'Parsing query…'
        statusSubtitle.value = 'Extracting filters and keywords'

        const parseSignal = mergeAbortSignals(userSignal, timeoutSignal(parseTimeoutMs))
        parseResult = await parseQuery(parseSignal)

        if (myRun !== runId) return

        lastSearchFilters.value = parseResult

        phase.value = 'normalizing'
        statusTitle.value = 'Building search request…'
        statusSubtitle.value = 'Mapping filters to the listings database'

        const ctx: AiSearchNormalizeContext = {
          searchQuery: searchQuery.value,
          selectedCity: selectedCity.value,
          selectedNeighborhoodName: selectedNeighborhoodName.value,
          itemsPerPage,
          page,
        }

        const params = buildPropertySearchParams(
          (parseResult.filters || {}) as Record<string, unknown>,
          ctx,
        )
        lastQueryBase.value = cloneSearchParamsWithoutPagination(params).toString()
      }

      if (myRun !== runId) return

      const base = lastQueryBase.value
      const merged = new URLSearchParams(base)
      merged.set('limit', String(itemsPerPage))
      merged.set('page', String(page))
      if (builderOrOffMarketOnly) {
        if (builderOrOffMarketOnly.value) merged.set('source', 'manual')
        else merged.delete('source')
      }

      phase.value = 'fetching'
      if (page === 1) {
        statusTitle.value = 'Fetching results…'
        statusSubtitle.value = PROVIDER_LABEL
      }

      let lastErr: unknown = null
      for (let attempt = 1; attempt <= maxFetchRetries; attempt++) {
        if (myRun !== runId) return

        fetchAttempt.value = attempt
        fetchMaxAttempts.value = maxFetchRetries

        if (attempt > 1) {
          statusTitle.value = `Retrying request (${attempt}/${maxFetchRetries})…`
          statusSubtitle.value = `${PROVIDER_LABEL} · previous attempt failed`
        }

        const fetchSignal = mergeAbortSignals(userSignal, timeoutSignal(fetchTimeoutMs))
        const url = `/api/properties?${merged.toString()}`

        try {
          const response = await fetchProperties(url, fetchSignal)
          if (myRun !== runId) return

          handlers.onResults(response)

          phase.value = 'idle'
          statusTitle.value = ''
          statusSubtitle.value = ''
          fetchAttempt.value = 0
          return
        } catch (e: unknown) {
          lastErr = e
          const err = e as { name?: string; cause?: { name?: string }; message?: string }
          const aborted =
            err?.name === 'AbortError' ||
            err?.cause?.name === 'AbortError' ||
            err?.message?.includes('aborted')
          const timeout =
            err?.name === 'TimeoutError' ||
            err?.cause?.name === 'TimeoutError' ||
            err?.message?.includes('Timed out')

          if (aborted && userSignal.aborted) {
            throw e
          }

          if (attempt >= maxFetchRetries) {
            break
          }

          const delayMs = backoffDelay(attempt, fetchRetryInitialDelayMs, 12_000, 2, true)
          if (timeout) {
            statusTitle.value = 'Timed out — retrying…'
            statusSubtitle.value = `${fetchTimeoutMs / 1000}s limit · ${PROVIDER_LABEL} · next attempt in ${Math.round(delayMs / 1000)}s`
          }
          try {
            await sleep(delayMs, userSignal)
          } catch {
            throw e
          }
        }
      }

      if (myRun !== runId) return

      const lastErrObj = lastErr as { data?: { statusMessage?: string }; message?: string }
      const msg =
        lastErrObj?.data?.statusMessage ||
        lastErrObj?.message ||
        'Search failed. Please try again.'
      errorMessage.value = msg
      partialNotice.value = ''

      statusTitle.value = 'Could not load listings'
      statusSubtitle.value = `${PROVIDER_LABEL} · failed after ${maxFetchRetries} attempts`

      handlers.onResults(null)
    } catch (e: unknown) {
      if (myRun !== runId) return

      const err = e as { name?: string; cause?: { name?: string }; message?: string; data?: { statusMessage?: string } }
      const aborted =
        err?.name === 'AbortError' ||
        err?.cause?.name === 'AbortError' ||
        err?.message?.includes('Cancelled')

      // User cancel aborts `userSignal`; parse/fetch timeouts abort only the merged child signal.
      if (aborted && userSignal.aborted) {
        phase.value = 'idle'
        statusTitle.value = ''
        statusSubtitle.value = ''
        errorMessage.value = ''
        partialNotice.value = ''
        return
      }

      const msg =
        err?.data?.statusMessage ||
        err?.message ||
        (err?.name === 'TimeoutError' ? 'Parsing timed out. Try a shorter query.' : 'Search failed.')
      errorMessage.value = msg
      handlers.onResults(null)
      phase.value = 'idle'
      statusTitle.value = ''
      statusSubtitle.value = ''
    } finally {
      if (myRun === runId && phase.value === 'fetching') {
        phase.value = 'idle'
        statusSubtitle.value = ''
        if (!errorMessage.value) {
          statusTitle.value = ''
        }
      }
    }
  }

  return {
    phase,
    statusTitle,
    statusSubtitle,
    fetchAttempt,
    fetchMaxAttempts,
    partialNotice,
    errorMessage,
    lastSearchFilters,
    lastQueryBase,
    isSearchBusy,
    executeSearch,
    cancelSearch,
    PROVIDER_LABEL,
  }
}
