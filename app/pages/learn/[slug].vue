<template>
  <div class="learn-page">
    <!-- Loading state -->
    <div v-if="status === 'pending'" class="learn-loading">
      <v-container>
        <v-skeleton-loader type="image" height="380" class="mb-8" />
        <v-skeleton-loader type="heading, paragraph@4" />
      </v-container>
    </div>

    <!-- 404 -->
    <div v-else-if="!resource" class="learn-404">
      <v-container class="text-center py-16">
        <v-icon size="64" color="grey-lighten-1">mdi-bookshelf</v-icon>
        <h1 class="text-h4 font-weight-bold mt-4 mb-2">Resource not found</h1>
        <p class="text-body-1 text-medium-emphasis mb-6">
          The article you're looking for may have been removed or the link is incorrect.
        </p>
        <v-btn color="primary" variant="flat" to="/" class="text-none" prepend-icon="mdi-arrow-left">
          Back to homepage
        </v-btn>
      </v-container>
    </div>

    <template v-else>
      <!-- Hero -->
      <section
        class="learn-hero"
        :class="{ 'learn-hero--no-cover': !resource.coverImage }"
        :style="resource.coverImage ? { backgroundImage: `url(${resource.coverImage})` } : undefined"
      >
        <div class="learn-hero__overlay">
          <v-container>
            <v-btn
              variant="text"
              color="white"
              prepend-icon="mdi-arrow-left"
              class="text-none mb-6 learn-back"
              to="/"
            >
              Back to homepage
            </v-btn>
            <div class="learn-hero__content">
              <v-chip
                v-if="resource.category"
                color="white"
                variant="flat"
                size="small"
                class="font-weight-bold mb-3"
              >
                {{ resource.category }}
              </v-chip>
              <h1 class="learn-title">{{ resource.title }}</h1>
              <p v-if="resource.subtitle" class="learn-subtitle">{{ resource.subtitle }}</p>
              <div class="learn-meta">
                <span v-if="publishedLabel">
                  <v-icon size="14">mdi-calendar-blank-outline</v-icon>
                  {{ publishedLabel }}
                </span>
                <span v-if="resource.sourceName">
                  <v-icon size="14">mdi-source-branch</v-icon>
                  {{ resource.sourceName }}
                </span>
              </div>
            </div>
          </v-container>
        </div>
      </section>

      <!-- Body + sidebar -->
      <v-container class="learn-body">
        <v-row>
          <v-col cols="12" md="8">
            <!-- Excerpt — always visible regardless of unlock state -->
            <p v-if="resource.excerpt" class="learn-excerpt">
              {{ resource.excerpt }}
            </p>

            <!-- Unlocked: full article -->
            <article
              v-if="isUnlocked"
              class="learn-article"
              v-html="bodyHtml"
            />

            <!-- Locked: preview + lead-gen card -->
            <template v-else>
              <div class="learn-preview-wrapper">
                <p class="learn-preview">{{ resource.bodyPreview }}</p>
                <div class="learn-preview__fade" />
              </div>
              <v-card class="learn-gate" rounded="xl" elevation="0">
                <div class="learn-gate__icon">
                  <v-icon size="32" color="primary">mdi-lock-open-variant-outline</v-icon>
                </div>
                <h2 class="learn-gate__title">Read the full guide — free</h2>
                <p class="learn-gate__lede">
                  Tell us where to send your copy. We'll unlock it instantly and email
                  you new resources as they're published. No spam, unsubscribe anytime.
                </p>

                <v-alert
                  v-if="formError"
                  type="error"
                  variant="tonal"
                  density="compact"
                  closable
                  class="mb-4"
                  @click:close="formError = ''"
                >
                  {{ formError }}
                </v-alert>

                <v-form @submit.prevent="onUnlock">
                  <v-row dense>
                    <v-col cols="12">
                      <v-text-field
                        v-model="form.name"
                        label="Full name *"
                        variant="outlined"
                        density="comfortable"
                        prepend-inner-icon="mdi-account-outline"
                        :disabled="submitting"
                        autocomplete="name"
                        hide-details="auto"
                      />
                    </v-col>
                    <v-col cols="12" sm="6">
                      <v-text-field
                        v-model="form.email"
                        label="Email *"
                        type="email"
                        variant="outlined"
                        density="comfortable"
                        prepend-inner-icon="mdi-email-outline"
                        :disabled="submitting"
                        autocomplete="email"
                        hide-details="auto"
                      />
                    </v-col>
                    <v-col cols="12" sm="6">
                      <v-text-field
                        v-model="form.phone"
                        label="Phone (optional)"
                        type="tel"
                        variant="outlined"
                        density="comfortable"
                        prepend-inner-icon="mdi-phone-outline"
                        :disabled="submitting"
                        autocomplete="tel"
                        hide-details="auto"
                      />
                    </v-col>
                    <v-col cols="12">
                      <v-checkbox
                        v-model="form.consent"
                        :disabled="submitting"
                        density="compact"
                        hide-details
                        color="primary"
                      >
                        <template #label>
                          <span class="text-body-2">
                            I agree to receive this resource and occasional follow-up emails.
                            I can unsubscribe at any time.
                          </span>
                        </template>
                      </v-checkbox>
                    </v-col>
                    <v-col cols="12">
                      <v-btn
                        type="submit"
                        color="primary"
                        size="large"
                        block
                        variant="flat"
                        class="text-none font-weight-bold"
                        :loading="submitting"
                        :disabled="!canSubmit"
                        prepend-icon="mdi-lock-open-outline"
                      >
                        Unlock the full guide
                      </v-btn>
                    </v-col>
                  </v-row>
                </v-form>

                <p class="text-caption text-medium-emphasis mt-3 mb-0">
                  Already have an account?
                  <NuxtLink to="/auth/login" class="text-primary font-weight-bold">Sign in</NuxtLink>
                  — your details will be linked automatically.
                </p>
              </v-card>
            </template>
          </v-col>

          <!-- Sidebar -->
          <v-col cols="12" md="4">
            <div class="learn-sidebar">
              <!-- Source attribution -->
              <v-card v-if="resource.sourceName || resource.sourceUrl" class="learn-side-card pa-4" variant="outlined" rounded="lg">
                <div class="text-overline font-weight-bold text-medium-emphasis mb-2">Source</div>
                <div class="font-weight-bold mb-1">{{ resource.sourceName || resource.sourceUrl }}</div>
                <a
                  v-if="resource.sourceUrl"
                  :href="resource.sourceUrl"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  class="text-body-2 text-primary text-decoration-none d-inline-flex align-center mt-1"
                >
                  Visit source
                  <v-icon size="14" class="ml-1">mdi-open-in-new</v-icon>
                </a>
              </v-card>

              <!-- External links -->
              <v-card
                v-if="externalLinks.length > 0"
                class="learn-side-card pa-4 mt-4"
                variant="outlined"
                rounded="lg"
              >
                <div class="text-overline font-weight-bold text-medium-emphasis mb-3">Related links</div>
                <ul class="learn-links">
                  <li v-for="(link, i) in externalLinks" :key="i">
                    <a
                      :href="link.url"
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      class="d-inline-flex align-center"
                    >
                      <v-icon size="14" class="mr-2">mdi-link-variant</v-icon>
                      <span>{{ link.label }}</span>
                    </a>
                  </li>
                </ul>
              </v-card>

              <!-- Always-visible CTA back to homepage -->
              <v-card class="learn-side-card learn-side-card--cta pa-5 mt-4" rounded="lg" elevation="0">
                <div class="font-weight-bold text-h6 mb-2">More guides</div>
                <p class="text-body-2 text-medium-emphasis mb-4">
                  Browse our full library of homebuyer &amp; owner resources.
                </p>
                <v-btn
                  to="/"
                  variant="tonal"
                  color="primary"
                  block
                  class="text-none"
                  prepend-icon="mdi-arrow-left"
                >
                  Back to homepage
                </v-btn>
              </v-card>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))

// Best-effort: read the visitor's auth token from localStorage so logged-in
// users skip the lead-gen wall. The endpoint accepts the token but doesn't
// require it — anonymous visitors still get a locked response with a preview.
function clientAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const t = window.localStorage.getItem('token')
    return t ? { Authorization: `Bearer ${t}` } : {}
  } catch {
    return {}
  }
}

interface ExternalLink { label: string; url: string }
interface PublicResource {
  id: number
  slug: string
  title: string
  subtitle: string | null
  excerpt: string | null
  body: string
  bodyPreview: string | null
  coverImage: string | null
  sourceName: string | null
  sourceUrl: string | null
  externalLinks: ExternalLink[] | null
  category: string | null
  publishedAt: string | null
  updatedAt: string
}
interface DetailResponse {
  success: boolean
  unlocked: boolean
  resource: PublicResource
}

// useAsyncData (vs useFetch) so we can re-trigger after the unlock POST and
// fold the new body in without a full page reload. SSR fetches anonymously
// (no localStorage on the server) — the client-side refetch on hydration
// then attaches the Bearer header, so signed-in users skip the lead wall
// after their first paint.
const { data, status, refresh } = await useAsyncData<DetailResponse | null>(
  () => `learn-${slug.value}`,
  async () => {
    try {
      return await $fetch<DetailResponse>(`/api/public/learn/${slug.value}`, {
        headers: clientAuthHeader(),
      })
    } catch (e: any) {
      // Return null on 404 so the template can show its own friendly state.
      return null
    }
  },
  { watch: [slug] },
)

// On the client, if SSR returned a locked response but we DO have an auth
// token, re-fetch immediately so the body lands without a manual refresh.
// (SSR can't see localStorage, so logged-in visitors initially see locked.)
if (import.meta.client && data.value && !data.value.unlocked) {
  const hasToken = (() => {
    try { return !!window.localStorage.getItem('token') } catch { return false }
  })()
  if (hasToken) {
    refresh().catch(() => {})
  }
}

// SSR 404 — set the response status if the page didn't load.
if (import.meta.server && !data.value) {
  setResponseStatus(useRequestEvent()!, 404)
}

const resource = computed(() => data.value?.resource ?? null)
const isUnlocked = computed(() => !!data.value?.unlocked || unlockedClient.value)

// After the visitor unlocks, the POST returns the full body inline. We hold
// it in a local ref so we don't have to wait for refresh() to round-trip.
const unlockedClient = ref(false)
const inlineBody = ref<string>('')
const bodyHtml = computed(() => {
  if (inlineBody.value) return inlineBody.value
  return resource.value?.body || ''
})

const externalLinks = computed<ExternalLink[]>(() => {
  const raw = resource.value?.externalLinks
  if (!Array.isArray(raw)) return []
  return raw.filter((l) => l && typeof l === 'object' && l.url)
})

const publishedLabel = computed(() => {
  const iso = resource.value?.publishedAt
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return ''
  }
})

// ── Lead-gen unlock form ───────────────────────────────────────────────
const form = ref<{ name: string; email: string; phone: string; consent: boolean }>({
  name: '',
  email: '',
  phone: '',
  consent: false,
})
const submitting = ref(false)
const formError = ref('')

const canSubmit = computed(() => {
  return (
    !!form.value.name?.trim() &&
    !!form.value.email?.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email.trim()) &&
    form.value.consent === true
  )
})

async function onUnlock() {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true
  formError.value = ''
  try {
    const res = await $fetch<{ success: boolean; body: string }>(
      `/api/public/learn/${slug.value}/unlock`,
      {
        method: 'POST',
        body: {
          name: form.value.name.trim(),
          email: form.value.email.trim().toLowerCase(),
          phone: form.value.phone?.trim() || undefined,
          consent: form.value.consent,
        },
      },
    )
    if (res?.success) {
      inlineBody.value = res.body || ''
      unlockedClient.value = true
      // Refresh in the background so the cookie + view counter stay in sync,
      // but don't block the user reading.
      refresh().catch(() => {})
    }
  } catch (e: any) {
    formError.value =
      e?.data?.statusMessage ||
      e?.statusMessage ||
      'We couldn\'t unlock this resource. Please double-check your details and try again.'
  } finally {
    submitting.value = false
  }
}

// ── SEO / sharing ──────────────────────────────────────────────────────
useSeoMeta({
  title: () => (resource.value?.title ? `${resource.value.title} — Resources` : 'Resource'),
  description: () =>
    resource.value?.excerpt ||
    resource.value?.subtitle ||
    'A free resource for homebuyers and owners.',
  ogTitle: () => resource.value?.title || 'Resource',
  ogDescription: () =>
    resource.value?.excerpt ||
    resource.value?.subtitle ||
    'A free resource for homebuyers and owners.',
  ogImage: () => resource.value?.coverImage || undefined,
  ogType: 'article',
  twitterCard: 'summary_large_image',
})

// JSON-LD Article schema for richer Google snippets. Only emit when we have
// a published resource — empty / 404 pages don't deserve structured data.
useHead(() => {
  const r = resource.value
  if (!r) return {}
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: r.title,
    description: r.excerpt || r.subtitle || '',
    image: r.coverImage ? [r.coverImage] : undefined,
    datePublished: r.publishedAt || undefined,
    dateModified: r.updatedAt || undefined,
    publisher: r.sourceName ? { '@type': 'Organization', name: r.sourceName } : undefined,
  }
  return {
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify(ld),
      },
    ],
  }
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Plus+Jakarta+Sans:wght@300;400;600;700&display=swap');

.learn-page {
  background: #fff;
  font-family: 'Plus Jakarta Sans', sans-serif;
}

.learn-loading,
.learn-404 {
  padding-top: 64px;
  padding-bottom: 64px;
}

/* Hero */
.learn-hero {
  background-color: #0f172a;
  background-size: cover;
  background-position: center;
  position: relative;
  min-height: 380px;
  display: flex;
  align-items: stretch;
}
.learn-hero--no-cover {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
}
.learn-hero__overlay {
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.55) 0%, rgba(15, 23, 42, 0.85) 100%);
  width: 100%;
  padding: 72px 0 56px;
}
.learn-back {
  letter-spacing: 0.02em;
}
.learn-hero__content {
  max-width: 820px;
  color: #fff;
}
.learn-title {
  font-family: 'Playfair Display', serif;
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 700;
  line-height: 1.15;
  margin-bottom: 12px;
}
.learn-subtitle {
  font-size: 1.1rem;
  opacity: 0.9;
  margin-bottom: 16px;
}
.learn-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 0.85rem;
  opacity: 0.85;
}
.learn-meta span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* Body */
.learn-body {
  padding-top: 48px;
  padding-bottom: 80px;
  max-width: 1200px;
}
.learn-excerpt {
  font-size: 1.05rem;
  line-height: 1.7;
  color: #475569;
  font-weight: 500;
  border-left: 3px solid #fbbf24;
  padding-left: 16px;
  margin-bottom: 24px;
}

/* Unlocked article — TipTap output */
.learn-article {
  font-size: 1rem;
  line-height: 1.75;
  color: #1f2937;
}
.learn-article :deep(h1),
.learn-article :deep(h2),
.learn-article :deep(h3) {
  font-family: 'Playfair Display', serif;
  font-weight: 700;
  margin: 1.5em 0 0.5em;
  line-height: 1.25;
}
.learn-article :deep(h1) { font-size: 1.85rem; }
.learn-article :deep(h2) { font-size: 1.5rem; }
.learn-article :deep(h3) { font-size: 1.2rem; }
.learn-article :deep(p) { margin: 0 0 1.1em; }
.learn-article :deep(ul),
.learn-article :deep(ol) {
  margin: 0.5em 0 1.2em;
  padding-left: 1.5em;
}
.learn-article :deep(li) { margin-bottom: 0.4em; }
.learn-article :deep(blockquote) {
  border-left: 4px solid #cbd5e1;
  padding-left: 16px;
  color: #475569;
  font-style: italic;
  margin: 1.2em 0;
}
.learn-article :deep(a) {
  color: #2563eb;
  text-decoration: underline;
  word-break: break-word;
}
.learn-article :deep(code) {
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
}
.learn-article :deep(hr) {
  border: 0;
  border-top: 1px solid #e2e8f0;
  margin: 2em 0;
}

/* Locked preview */
.learn-preview-wrapper {
  position: relative;
  max-height: 200px;
  overflow: hidden;
  margin-bottom: 0;
}
.learn-preview {
  font-size: 1rem;
  line-height: 1.75;
  color: #475569;
  margin: 0;
  white-space: pre-wrap;
}
.learn-preview__fade {
  position: absolute;
  inset: auto 0 0 0;
  height: 80px;
  background: linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 100%);
  pointer-events: none;
}

/* Lead-gen gate card */
.learn-gate {
  margin-top: 32px;
  padding: 32px;
  background: linear-gradient(135deg, #eff6ff 0%, #faf5ff 100%);
  border: 1px solid #dbeafe;
}
.learn-gate__icon {
  width: 56px;
  height: 56px;
  background: #fff;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  box-shadow: 0 6px 20px rgba(37, 99, 235, 0.15);
}
.learn-gate__title {
  font-family: 'Playfair Display', serif;
  font-weight: 700;
  font-size: 1.5rem;
  color: #0f172a;
  margin: 0 0 8px;
}
.learn-gate__lede {
  color: #475569;
  font-size: 0.95rem;
  line-height: 1.6;
  margin: 0 0 18px;
}

/* Sidebar */
.learn-sidebar {
  position: sticky;
  top: 24px;
}
.learn-side-card {
  background: #fff;
}
.learn-side-card--cta {
  background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%);
  border: 1px solid #e2e8f0;
}
.learn-links {
  list-style: none;
  padding: 0;
  margin: 0;
}
.learn-links li {
  margin-bottom: 8px;
}
.learn-links li:last-child {
  margin-bottom: 0;
}
.learn-links a {
  color: #1e293b;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: color 0.15s ease;
}
.learn-links a:hover {
  color: #2563eb;
}

@media (max-width: 768px) {
  .learn-sidebar { position: static; margin-top: 32px; }
  .learn-hero__overlay { padding: 48px 0 36px; }
  .learn-gate { padding: 24px; }
}
</style>
