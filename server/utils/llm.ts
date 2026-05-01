/**
 * Multi-provider LLM caller with failover.
 *
 * Why this exists:
 *   The compliance-review pipeline used to call Groq directly. When Groq
 *   rate-limited or slowed under load, we ran past upstream proxy timeouts
 *   (504s). This wrapper lets us fall through to Cerebras (and optionally
 *   OpenRouter) on retry-eligible errors so the pipeline keeps moving.
 *
 * Failover policy:
 *   We only fall through on retry-eligible errors:
 *     - 408 (request timeout)
 *     - 429 (rate limit)
 *     - 5xx (server error)
 *     - network / fetch errors with no status
 *   Hard 4xx (400, 401, 403, 404, 422) are propagated immediately — no
 *   point burning another provider's quota on a request that will also fail.
 *
 * Provider chains are *phase-specific* so we can route each phase to the
 * model that's best at that job:
 *   - 'extract'   → fast, cheap, called once per chunk
 *   - 'summarize' → smarter, called once per review
 *
 * Providers without a configured API key are silently skipped at chain build
 * time, so adding/removing providers is just a matter of setting/unsetting an
 * env var. If ALL providers in a chain are unconfigured, the call throws a
 * clear configuration error (not a silent miss).
 *
 * Train-safety:
 *   Groq + Cerebras free tiers do NOT use customer prompts for training per
 *   their privacy policies (verified May 2026). OpenRouter free tier policy
 *   varies per upstream model — we keep it as overflow only.
 */

export type LlmPhase = 'extract' | 'summarize'

export interface LlmCallOptions {
  phase: LlmPhase
  system: string
  user: string
  /** Per-call retries for 429s within a single provider before falling through. */
  retries?: number
}

interface ProviderSpec {
  name: string
  model: string
  apiKey: string
  apiUrl: string
  /** Optional headers required by the provider (e.g. OpenRouter referer). */
  extraHeaders?: Record<string, string>
}

// ─── OpenAI-compatible call (used by Groq, Cerebras, OpenRouter) ───────────
async function callOpenAiCompat(p: ProviderSpec, opts: LlmCallOptions): Promise<string> {
  const retries = opts.retries ?? 3
  let lastErr: any
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await $fetch<{ choices?: Array<{ message?: { content?: string } }> }>(
        `${p.apiUrl.replace(/\/$/, '')}/chat/completions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${p.apiKey}`,
            'Content-Type': 'application/json',
            ...(p.extraHeaders || {}),
          },
          body: {
            model: p.model,
            temperature: 0.2,
            messages: [
              { role: 'system', content: opts.system },
              { role: 'user', content: opts.user },
            ],
            // We intentionally do NOT send `response_format: json_object` —
            // support varies across our providers (Cerebras + some OpenRouter
            // upstream models reject it). The system prompts already mandate
            // JSON-only output, and `safeParse` in the caller strips markdown
            // fences defensively. Keep it simple and portable.
          },
          // Keep this tight — we have a bigger pipeline-level budget upstream;
          // we'd rather fall through to the next provider than wait 60s here.
          timeout: 30_000,
        },
      )
      return res.choices?.[0]?.message?.content?.trim() || '{}'
    } catch (e: any) {
      const status = e?.status || e?.statusCode || e?.response?.status || 0
      lastErr = e
      // 429 with retries left → in-provider backoff before the failover layer
      // tries the next provider. Backoff is bounded so we don't blow the budget.
      if (status === 429 && attempt < retries) {
        const wait = Math.min(1500 * (attempt + 1), 4000)
        console.log(`[llm] ${p.name} 429 — backoff ${wait}ms (attempt ${attempt + 1}/${retries})`)
        await new Promise((r) => setTimeout(r, wait))
        continue
      }
      throw e
    }
  }
  throw lastErr
}

// ─── Provider chain construction ────────────────────────────────────────────
function buildProviders(phase: LlmPhase): ProviderSpec[] {
  const cfg = useRuntimeConfig()
  const groqKey = (cfg.groqApiKey as string) || process.env.GROQ_API_KEY || ''
  const groqUrl =
    (cfg.groqApiUrl as string) || process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1'
  const cerebrasKey = (cfg.cerebrasApiKey as string) || process.env.CEREBRAS_API_KEY || ''
  const cerebrasUrl =
    (cfg.cerebrasApiUrl as string) ||
    process.env.CEREBRAS_API_URL ||
    'https://api.cerebras.ai/v1'
  const openrouterKey = (cfg.openrouterApiKey as string) || process.env.OPENROUTER_API_KEY || ''
  const openrouterUrl =
    (cfg.openrouterApiUrl as string) ||
    process.env.OPENROUTER_API_URL ||
    'https://openrouter.ai/api/v1'
  const openrouterReferer =
    (cfg.openrouterReferer as string) ||
    process.env.OPENROUTER_REFERER ||
    'https://homebyabdul.com'

  // Phase-specific model picks. Rationale:
  //   - extract: high call-volume per review (one per chunk). Use the
  //     fastest, cheapest models available.
  //   - summarize: one call per review, benefits from broader synthesis.
  //     Cerebras gpt-oss-120b leads here on quality; Groq gpt-oss-20b is
  //     a fast smart-enough fallback.
  const candidates: ProviderSpec[] =
    phase === 'extract'
      ? [
          {
            name: 'groq:llama-3.1-8b-instant',
            model: 'llama-3.1-8b-instant',
            apiKey: groqKey,
            apiUrl: groqUrl,
          },
          {
            name: 'cerebras:gpt-oss-120b',
            model: 'gpt-oss-120b',
            apiKey: cerebrasKey,
            apiUrl: cerebrasUrl,
          },
          {
            name: 'openrouter:llama-3.3-70b-instruct:free',
            model: 'meta-llama/llama-3.3-70b-instruct:free',
            apiKey: openrouterKey,
            apiUrl: openrouterUrl,
            extraHeaders: {
              'HTTP-Referer': openrouterReferer,
              'X-Title': 'DeelBot Compliance Review',
            },
          },
        ]
      : [
          {
            name: 'cerebras:gpt-oss-120b',
            model: 'gpt-oss-120b',
            apiKey: cerebrasKey,
            apiUrl: cerebrasUrl,
          },
          {
            name: 'groq:openai/gpt-oss-20b',
            model: 'openai/gpt-oss-20b',
            apiKey: groqKey,
            apiUrl: groqUrl,
          },
          {
            name: 'openrouter:llama-3.3-70b-instruct:free',
            model: 'meta-llama/llama-3.3-70b-instruct:free',
            apiKey: openrouterKey,
            apiUrl: openrouterUrl,
            extraHeaders: {
              'HTTP-Referer': openrouterReferer,
              'X-Title': 'DeelBot Compliance Review',
            },
          },
        ]

  return candidates.filter((p) => !!p.apiKey)
}

function isFailoverEligible(err: any): boolean {
  const status = err?.status || err?.statusCode || err?.response?.status || 0
  if (status === 408 || status === 429) return true
  if (status >= 500 && status < 600) return true
  // Network / fetch error with no status (DNS, ECONNREFUSED, abort/timeout)
  if (status === 0) return true
  return false
}

// ─── Public entry point ─────────────────────────────────────────────────────
export async function callLlm(opts: LlmCallOptions): Promise<string> {
  const providers = buildProviders(opts.phase)
  if (providers.length === 0) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'No LLM provider configured. Set at least one of GROQ_API_KEY, CEREBRAS_API_KEY, or OPENROUTER_API_KEY.',
    })
  }

  let lastErr: any
  for (let i = 0; i < providers.length; i++) {
    const p = providers[i]!
    try {
      const out = await callOpenAiCompat(p, opts)
      // Log only when we actually had to fall through, otherwise it's noise.
      if (i > 0) console.log(`[llm] succeeded via ${p.name} (fallback #${i})`)
      return out
    } catch (e: any) {
      lastErr = e
      const status = e?.status || e?.statusCode || e?.response?.status || 0
      if (isFailoverEligible(e) && i < providers.length - 1) {
        console.warn(
          `[llm] ${p.name} failed (status=${status || 'network'}) — falling through to next provider`,
        )
        continue
      }
      // Non-retryable error, OR last provider in the chain.
      // If this is the final provider AND the error was "would-have-been-retryable"
      // (rate-limited / transient), we re-wrap it as a friendly user-facing
      // message — they don't need to know we tried 3 providers in sequence.
      if (i === providers.length - 1 && isFailoverEligible(e)) {
        const status = e?.status || e?.statusCode || e?.response?.status || 0
        console.error(
          `[llm] All ${providers.length} provider(s) failed. Last error from ${p.name}: status=${status || 'network'}`,
        )
        throw createError({
          statusCode: 503,
          statusMessage:
            'Our AI service is briefly overloaded. Please try again in a minute or two — your document is fine.',
        })
      }
      throw e
    }
  }
  // Unreachable in practice (loop above either returns or throws), but keep
  // TypeScript happy.
  throw lastErr ?? createError({ statusCode: 503, statusMessage: 'AI service temporarily unavailable. Please try again.' })
}

/**
 * Diagnostic helper — useful for /admin/system or a status endpoint to show
 * which providers are wired in for each phase. Doesn't reveal keys.
 */
export function describeLlmChain(): Record<LlmPhase, string[]> {
  return {
    extract: buildProviders('extract').map((p) => p.name),
    summarize: buildProviders('summarize').map((p) => p.name),
  }
}
