<template>
  <div class="fb-deletion-status">
    <div class="status-card">
      <div class="brand-row">
        <div class="brand-mark">DeelBot</div>
        <div class="brand-sub">Facebook Data Deletion Status</div>
      </div>

      <div v-if="loading" class="state-loading">
        <v-progress-circular indeterminate color="primary" size="36" />
        <p class="mt-4 text-medium-emphasis">Looking up your deletion request…</p>
      </div>

      <div v-else-if="!code" class="state-error">
        <v-icon size="40" color="warning">mdi-help-circle-outline</v-icon>
        <h1 class="text-h5 mt-4 mb-2">Confirmation code required</h1>
        <p class="text-body-2 text-medium-emphasis">
          This page expects a <code>?code=</code> query parameter — the same
          code Facebook handed you when your data deletion was processed.
        </p>
      </div>

      <div v-else-if="!result?.found" class="state-error">
        <v-icon size="40" color="error">mdi-close-circle-outline</v-icon>
        <h1 class="text-h5 mt-4 mb-2">No record for that code</h1>
        <p class="text-body-2 text-medium-emphasis">
          We couldn't find a deletion request matching code
          <code class="code-pill">{{ code }}</code>. If you believe this is
          a mistake, contact
          <a href="mailto:support@deelbot.ai">support@deelbot.ai</a>.
        </p>
      </div>

      <div v-else class="state-ok">
        <v-icon size="44" color="success">mdi-check-decagram</v-icon>
        <h1 class="text-h5 mt-4 mb-2">Deletion complete</h1>
        <p class="text-body-2 text-medium-emphasis mb-4">
          Your data deletion request has been processed. We've removed the
          Facebook access tokens, page tokens, profile name and granted
          permissions associated with your Facebook account from DeelBot.
        </p>
        <div class="receipt">
          <div class="receipt-row">
            <span class="label">Confirmation code</span>
            <code class="code-pill">{{ code }}</code>
          </div>
          <div class="receipt-row">
            <span class="label">Completed</span>
            <span>{{ formattedCompletedAt }}</span>
          </div>
          <div class="receipt-row">
            <span class="label">Records scrubbed</span>
            <span>{{ result.detachedIntegrations || 0 }} connection(s)</span>
          </div>
        </div>
        <p class="text-caption text-medium-emphasis mt-4">
          Posts you previously published on your own Facebook Page through
          DeelBot remain on Facebook itself; we don't control content stored
          in your Facebook account. To remove those, edit or delete them
          directly on Facebook.
        </p>
      </div>

      <div class="footer-links">
        <NuxtLink to="/privacy">Privacy Policy</NuxtLink>
        <span class="sep">·</span>
        <NuxtLink to="/terms">Terms</NuxtLink>
        <span class="sep">·</span>
        <a href="mailto:support@deelbot.ai">Contact</a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// This is a PUBLIC page — no admin middleware, no auth requirement.
// Meta hands the user a deep link to this URL after they request data
// deletion via their Facebook account. They might be logged out of DeelBot
// entirely; we have to render correctly without any session.
definePageMeta({ layout: false })

const route = useRoute()
const code = computed(() => {
  const c = route.query.code
  return typeof c === 'string' ? c : ''
})

const loading = ref(true)
const result = ref<{
  found: boolean
  completedAt?: string
  detachedIntegrations?: number
} | null>(null)

const formattedCompletedAt = computed(() => {
  if (!result.value?.completedAt) return '—'
  try {
    return new Date(result.value.completedAt).toLocaleString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return result.value.completedAt
  }
})

onMounted(async () => {
  if (!code.value) {
    loading.value = false
    return
  }
  try {
    result.value = await $fetch('/api/facebook/deletion-status', {
      query: { code: code.value },
    }) as any
  } catch (err) {
    console.error('[Facebook deletion-status] lookup failed', err)
    result.value = { found: false }
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.fb-deletion-status {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8f9fb 0%, #ffffff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  font-family: 'Inter', system-ui, sans-serif;
}

.status-card {
  max-width: 560px;
  width: 100%;
  background: white;
  border-radius: 20px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.03),
    0 12px 40px rgba(0, 0, 0, 0.06);
  padding: 40px 36px;
}

.brand-row {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  padding-bottom: 16px;
  margin-bottom: 28px;
}
.brand-mark {
  font-family: 'Playfair Display', serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: #8c734b;
  letter-spacing: -0.5px;
}
.brand-sub {
  font-size: 0.78rem;
  letter-spacing: 1.5px;
  color: rgba(0, 0, 0, 0.5);
  text-transform: uppercase;
  margin-top: 2px;
}

.state-loading,
.state-error,
.state-ok {
  text-align: center;
  padding: 24px 0 8px;
}

.code-pill {
  background: rgba(0, 0, 0, 0.04);
  padding: 2px 8px;
  border-radius: 6px;
  font-family: 'JetBrains Mono', 'Menlo', monospace;
  font-size: 0.82rem;
  color: #1a1a2e;
}

.receipt {
  margin-top: 24px;
  padding: 16px 18px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.04);
  text-align: left;
}
.receipt-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  font-size: 0.88rem;
}
.receipt-row + .receipt-row {
  border-top: 1px dashed rgba(0, 0, 0, 0.06);
}
.label {
  color: rgba(0, 0, 0, 0.55);
  font-weight: 500;
}

.footer-links {
  margin-top: 32px;
  padding-top: 18px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  text-align: center;
  font-size: 0.78rem;
  color: rgba(0, 0, 0, 0.5);
}
.footer-links a {
  color: rgba(0, 0, 0, 0.5);
  text-decoration: none;
}
.footer-links a:hover {
  color: #8c734b;
  text-decoration: underline;
}
.footer-links .sep {
  margin: 0 8px;
}
</style>
