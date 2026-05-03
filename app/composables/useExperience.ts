/**
 * useExperience — fetch the personalized variant for a placement.
 *
 * Example:
 *   const { variant, isLoading } = useExperience('hero')
 *   <h1>{{ variant?.headline || 'Find your home' }}</h1>
 *
 * Returns reactive refs so the template can render an SSR fallback
 * immediately and swap to the personalised copy once /api/personalize
 * resolves. This avoids hydration mismatches — SSR always renders the
 * `default` variant; the client upgrades on mount.
 */
import { ref, onMounted } from 'vue'

export interface ExperienceVariant {
  headline: string
  subheadline?: string
  ctaLabel?: string
  ctaHref?: string
}

interface ExperienceResponse {
  variant: ExperienceVariant
  source: string
}

export function useExperience(placement: string) {
  const variant = ref<ExperienceVariant | null>(null)
  const source = ref<string>('default')
  const isLoading = ref(false)

  async function load() {
    if (typeof window === 'undefined') return
    isLoading.value = true
    try {
      const res = await $fetch<ExperienceResponse>('/api/personalize', {
        params: { placement },
      })
      variant.value = res?.variant || null
      source.value = res?.source || 'default'
    } catch (err) {
      // Silently fall through to template fallback.
      if (process.env.NODE_ENV !== 'production') console.warn('[useExperience]', err)
    } finally {
      isLoading.value = false
    }
  }

  onMounted(load)

  return { variant, source, isLoading, refresh: load }
}
