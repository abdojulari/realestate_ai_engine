<template>
  <v-row class="mb-8">
    <v-col cols="12">
      <v-card class="fb-connection-card" elevation="0">
        <!-- Connected state: subtle green glow at top -->
        <div v-if="status.connected" class="fb-status-indicator fb-status-connected"></div>
        <div v-else class="fb-status-indicator fb-status-disconnected"></div>

        <v-card-text class="pa-8">
          <div class="d-flex align-center flex-wrap ga-4">
            <!-- Avatar with pulse ring when connected -->
            <div class="fb-avatar-wrap">
              <div v-if="status.connected" class="fb-pulse-ring"></div>
              <v-avatar size="68" class="fb-avatar-icon">
                <v-icon size="34" color="white">mdi-facebook</v-icon>
              </v-avatar>
            </div>

            <div class="flex-grow-1">
              <div v-if="status.connected" class="d-flex align-center ga-2 mb-1">
                <v-icon color="#27AE60" size="20">mdi-check-decagram</v-icon>
                <span class="text-h6 font-weight-bold" style="letter-spacing: -0.3px;">Connected</span>
                <v-chip size="x-small" color="#27AE60" variant="tonal" class="ml-1 font-weight-bold">Active</v-chip>
              </div>
              <div v-else class="mb-1">
                <span class="text-h6 font-weight-bold text-medium-emphasis" style="letter-spacing: -0.3px;">Not Connected</span>
              </div>

              <div v-if="status.connected" class="d-flex align-center flex-wrap ga-3 text-body-2 text-medium-emphasis">
                <span class="d-flex align-center ga-1">
                  <v-icon size="14" color="#1877F2">mdi-file-document-outline</v-icon>
                  {{ status.pageName }}
                </span>
                <span class="fb-detail-dot"></span>
                <span class="d-flex align-center ga-1">
                  <v-icon size="14" color="#8c734b">mdi-account-outline</v-icon>
                  {{ status.userName }}
                </span>
                <template v-if="status.tokenExpiry">
                  <span class="fb-detail-dot"></span>
                  <span class="d-flex align-center ga-1">
                    <v-icon size="14">mdi-clock-outline</v-icon>
                    Expires {{ formatDate(status.tokenExpiry) }}
                  </span>
                </template>
              </div>
              <div v-else class="text-body-2 text-medium-emphasis" style="max-width: 360px;">
                Connect your Facebook page to start posting listings directly from your dashboard.
              </div>
            </div>

            <!-- Action buttons -->
            <div v-if="!status.connected" class="d-flex ga-3 align-center">
              <v-btn color="#1877F2" variant="flat" size="large" prepend-icon="mdi-facebook" class="fb-login-btn" :loading="oauthConnecting" @click="handleOAuthLogin">
                Login with Facebook
              </v-btn>
            </div>
            <div v-else class="d-flex ga-2">
              <v-btn variant="tonal" color="info" @click="testConnection" :loading="testing" prepend-icon="mdi-lan-check" class="fb-action-btn">Test</v-btn>
              <v-btn variant="tonal" color="error" @click="disconnect" prepend-icon="mdi-link-off" class="fb-action-btn">Disconnect</v-btn>
            </div>
          </div>

          <!-- Pre-connect consent / scope explainer.
               Shown only in the disconnected state. Lists exactly which
               permissions we'll request and how each is used. Two reasons:
               (1) Meta App Reviewers screen-record this view — having
                   explicit consent copy on-screen meaningfully raises
                   approval odds and shortens the review back-and-forth.
               (2) Tenants are nervous about what "Login with Facebook"
                   actually authorises — being upfront about it converts
                   better than a bare button. -->
          <div v-if="!status.connected" class="fb-consent-panel mt-6">
            <div class="d-flex align-center ga-2 mb-3">
              <v-icon size="16" color="#1877F2">mdi-shield-lock-outline</v-icon>
              <span class="text-subtitle-2 font-weight-bold">What we'll ask Facebook for</span>
            </div>
            <div class="fb-scope-list">
              <div class="fb-scope-row" v-for="s in scopeExplainers" :key="s.scope">
                <code class="fb-scope-code">{{ s.scope }}</code>
                <span class="fb-scope-desc">{{ s.description }}</span>
              </div>
            </div>
            <div class="text-caption text-medium-emphasis mt-3">
              We never post anything without your explicit click. Tokens are
              stored encrypted, scoped to your account only, and can be
              revoked any time via the Disconnect button or directly on
              <a href="https://www.facebook.com/settings?tab=business_tools" target="_blank" rel="noopener">facebook.com → Apps and Websites</a>.
              See our
              <NuxtLink to="/privacy" target="_blank">Privacy Policy</NuxtLink>
              and
              <NuxtLink to="/terms" target="_blank">Terms</NuxtLink>.
            </div>
          </div>

          <!-- OAuth error.
               When the failure mode is `not_authorized` we surface a
               Request-Access CTA: that's the exact case where DeelBot's FB
               App is still pre-review and the user's FB account isn't a
               Tester yet. For other kinds (genuine cancel, popup blocked,
               SDK fail) we just show the message with a Try Again hint. -->
          <v-slide-y-transition>
            <v-alert
              v-if="oauthError"
              :type="needsAccessRequest ? 'warning' : 'error'"
              variant="tonal"
              class="mt-5 fb-alert-glass"
              closable
              @click:close="clearOauthError"
            >
              <div class="d-flex align-start ga-3 flex-wrap">
                <div class="flex-grow-1" style="min-width: 220px;">{{ oauthError }}</div>
                <v-btn
                  v-if="needsAccessRequest"
                  color="#1877F2"
                  variant="flat"
                  size="small"
                  prepend-icon="mdi-account-arrow-right-outline"
                  class="fb-login-btn"
                  @click="openAccessRequest"
                >
                  Request Access
                </v-btn>
              </div>
            </v-alert>
          </v-slide-y-transition>
        </v-card-text>

        <!-- Diagnostics panel -->
        <v-expand-transition>
          <div v-if="testResults">
            <v-divider class="mx-6 opacity-10" />
            <v-card-text class="px-8 pb-6 pt-5">
              <div class="d-flex align-center ga-2 mb-3">
                <v-icon size="18" :color="testResults.success ? '#27AE60' : '#E67E22'">{{ testResults.success ? 'mdi-shield-check' : 'mdi-shield-alert' }}</v-icon>
                <span class="text-subtitle-2 font-weight-bold">Connection Diagnostics</span>
              </div>
              <div class="fb-diagnostics-grid">
                <v-alert
                  v-for="(tip, i) in testResults.advice"
                  :key="i"
                  :type="testResults.success ? 'success' : 'warning'"
                  variant="tonal"
                  density="compact"
                  class="mb-2 fb-alert-glass"
                >{{ tip }}</v-alert>
              </div>
              <div v-if="testResults.results?.tokenIdentity" class="d-flex align-center ga-2 mt-3 text-caption text-medium-emphasis">
                <v-icon size="14">mdi-identifier</v-icon>
                {{ testResults.results.tokenIdentity.name }} ({{ testResults.results.tokenIdentity.id }})
                <v-chip size="x-small" :color="testResults.results.tokenIdentity.isPageToken ? 'success' : 'warning'" variant="tonal" class="font-weight-bold">
                  {{ testResults.results.tokenIdentity.isPageToken ? 'Page Token' : 'User Token' }}
                </v-chip>
              </div>
            </v-card-text>
          </div>
        </v-expand-transition>
      </v-card>
    </v-col>
  </v-row>

  <!-- Page Picker Dialog (OAuth flow) -->
  <v-dialog v-model="showPagePicker" max-width="520" persistent>
    <v-card class="fb-dialog-card">
      <div class="fb-dialog-header">
        <v-avatar size="44" class="fb-avatar-icon mr-4">
          <v-icon size="22" color="white">mdi-facebook</v-icon>
        </v-avatar>
        <div>
          <div class="text-h6 font-weight-bold display-serif" style="letter-spacing: -0.3px;">Select a Page</div>
          <div class="text-caption text-medium-emphasis">{{ oauthPages.length }} page{{ oauthPages.length > 1 ? 's' : '' }} available</div>
        </div>
      </div>
      <v-divider class="opacity-10" />
      <v-card-text class="pa-5">
        <v-list lines="two" class="fb-page-list" density="comfortable">
          <v-list-item
            v-for="page in oauthPages"
            :key="page.id"
            :value="page.id"
            :active="selectedPageId === page.id"
            @click="selectedPageId = page.id"
            rounded="xl"
            class="fb-page-item mb-2"
          >
            <template #prepend>
              <v-avatar color="#1877F2" size="42" class="elevation-1">
                <v-icon color="white" size="20">mdi-flag-variant</v-icon>
              </v-avatar>
            </template>
            <v-list-item-title class="font-weight-bold text-body-1">{{ page.name }}</v-list-item-title>
            <v-list-item-subtitle class="text-caption">ID: {{ page.id }}</v-list-item-subtitle>
            <template #append>
              <v-scale-transition>
                <v-icon v-if="selectedPageId === page.id" color="#27AE60" size="24">mdi-check-circle</v-icon>
                <v-icon v-else color="grey-lighten-2" size="24">mdi-circle-outline</v-icon>
              </v-scale-transition>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
      <v-divider class="opacity-10" />
      <v-card-actions class="pa-5">
        <v-spacer />
        <v-btn variant="text" class="fb-action-btn" @click="cancelPagePicker">Cancel</v-btn>
        <v-btn color="#1877F2" variant="flat" :disabled="!selectedPageId" :loading="connecting" @click="connectSelectedPage" prepend-icon="mdi-check" class="fb-login-btn" style="min-width: 160px;">Connect Page</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Request Access Dialog.
       Bridge UX for the gap between *now* and *App Review approved*. The
       tenant captures their Facebook account email + (optional) profile
       URL + free-text note explaining what they want to post. We log the
       request to the Setting table and email the platform admin so they
       can whitelist the FB account as a Tester from the FB Developer
       Console. Once App Review passes, this whole flow becomes
       unnecessary — every FB user can connect directly. -->
  <v-dialog v-model="showAccessRequest" max-width="520" persistent>
    <v-card class="fb-dialog-card">
      <div class="fb-dialog-header">
        <v-avatar size="44" class="fb-avatar-icon mr-4">
          <v-icon size="22" color="white">mdi-account-arrow-right-outline</v-icon>
        </v-avatar>
        <div>
          <div class="text-h6 font-weight-bold display-serif" style="letter-spacing: -0.3px;">Request Facebook Access</div>
          <div class="text-caption text-medium-emphasis">We'll whitelist your account within one business day</div>
        </div>
      </div>
      <v-divider class="opacity-10" />
      <v-card-text class="pa-5">
        <v-alert v-if="accessRequestSent" type="success" variant="tonal" class="fb-alert-glass mb-3" density="compact">
          {{ accessRequestMessage }}
        </v-alert>
        <template v-else>
          <p class="text-body-2 text-medium-emphasis mb-4">
            Our Facebook App is currently in Meta's review queue. While we
            wait, we can manually whitelist your Facebook account so you
            can connect right away. Provide the email tied to your
            Facebook account and we'll send you an invite directly from
            Facebook.
          </p>
          <v-text-field
            v-model="accessRequest.fbEmail"
            label="Facebook account email *"
            placeholder="you@example.com"
            variant="outlined"
            density="compact"
            type="email"
            :rules="[(v) => !!v || 'Required', (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Enter a valid email']"
            hide-details="auto"
            class="mb-3"
            autofocus
          />
          <v-text-field
            v-model="accessRequest.fbProfileUrl"
            label="Facebook profile URL (optional)"
            placeholder="https://www.facebook.com/your-handle"
            variant="outlined"
            density="compact"
            hide-details
            class="mb-3"
          />
          <v-textarea
            v-model="accessRequest.notes"
            label="What pages will you be posting to? (optional)"
            placeholder="e.g. AOhomes Calgary Listings page; mostly listing posts + price-drop alerts"
            variant="outlined"
            density="compact"
            rows="3"
            auto-grow
            hide-details
          />
          <v-alert
            v-if="accessRequestError"
            type="error"
            variant="tonal"
            density="compact"
            class="mt-3 fb-alert-glass"
          >{{ accessRequestError }}</v-alert>
        </template>
      </v-card-text>
      <v-divider class="opacity-10" />
      <v-card-actions class="pa-5">
        <v-spacer />
        <v-btn variant="text" class="fb-action-btn" @click="closeAccessRequest">
          {{ accessRequestSent ? 'Close' : 'Cancel' }}
        </v-btn>
        <v-btn
          v-if="!accessRequestSent"
          color="#1877F2"
          variant="flat"
          :loading="submittingAccessRequest"
          :disabled="!isAccessRequestValid"
          prepend-icon="mdi-send-outline"
          class="fb-login-btn"
          style="min-width: 160px;"
          @click="submitAccessRequest"
        >
          Send Request
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { getAuthHeaders } from '~/composables/useFacebookAdmin'
import { FacebookLoginError, type FbLoginErrorKind } from '~/composables/useFacebookAuth'

defineProps<{ status: any }>()
const emit = defineEmits<{ 'status-changed': [] }>()

const { initFacebookSDK, login: fbLogin, userAccessToken: oauthToken } = useFacebookAuth()

const testing = ref(false)
const testResults = ref<any>(null)
const connecting = ref(false)

// OAuth flow state
const oauthConnecting = ref(false)
const oauthError = ref('')
// Track WHY the last login failed so we can show the right next-step CTA.
// `not_authorized` is the one we route to the Request-Access flow — see
// app/composables/useFacebookAuth.ts for the discrimination logic.
const oauthErrorKind = ref<FbLoginErrorKind | null>(null)
const needsAccessRequest = computed(() => oauthErrorKind.value === 'not_authorized')
const showPagePicker = ref(false)
const oauthPages = ref<Array<{ id: string; name: string; access_token: string }>>([])
const selectedPageId = ref<string | null>(null)

// Explainer rows rendered above the Connect button (pre-connect consent
// surface). Edits here propagate to Meta's App Review screencast — keep
// the copy honest about what each scope is used for, since reviewers
// compare it to the actual API calls we make.
const scopeExplainers = [
  {
    scope: 'pages_show_list',
    description: 'List the Facebook Pages you manage so you can choose which one to connect.',
  },
  {
    scope: 'pages_manage_posts',
    description: 'Publish listing + marketing posts to the page you select — only when you click Post.',
  },
  {
    scope: 'pages_read_engagement',
    description: 'Read reactions, comments and reach on the posts we publish so you can see what worked.',
  },
  {
    scope: 'email',
    description: 'Identifies which Facebook account is connecting (no contact emails are sent).',
  },
]

// Request-Access dialog state.
const showAccessRequest = ref(false)
const submittingAccessRequest = ref(false)
const accessRequestSent = ref(false)
const accessRequestError = ref('')
const accessRequestMessage = ref('')
const accessRequest = reactive({
  fbEmail: '',
  fbProfileUrl: '',
  notes: '',
})
const isAccessRequestValid = computed(
  () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accessRequest.fbEmail.trim()),
)

const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

async function fetchPages(token: string): Promise<Array<{ id: string; name: string; access_token: string }>> {
  const pages = await $fetch('/api/facebook/pages', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: { userAccessToken: token }
  })
  return pages as Array<{ id: string; name: string; access_token: string }>
}

async function handleOAuthLogin() {
  oauthConnecting.value = true
  clearOauthError()
  try {
    await initFacebookSDK()
    await fbLogin()

    if (!oauthToken.value) {
      oauthError.value = 'Login succeeded but no access token was returned.'
      return
    }

    const pages = await fetchPages(oauthToken.value)

    if (!pages || pages.length === 0) {
      oauthError.value = 'No Facebook Pages found. Make sure your account manages at least one Facebook Page.'
      return
    }

    if (pages.length === 1) {
      oauthPages.value = pages
      selectedPageId.value = pages[0].id
      await connectSelectedPage()
    } else {
      oauthPages.value = pages
      selectedPageId.value = pages[0].id
      showPagePicker.value = true
    }
  } catch (e: any) {
    // Preserve the typed `kind` from useFacebookAuth when we have one —
    // that's what drives whether we show the Request-Access CTA. The
    // composable throws FacebookLoginError; the connect step throws plain
    // h3 errors with `data.message`.
    if (e instanceof FacebookLoginError) {
      oauthErrorKind.value = e.kind
      oauthError.value = e.message
    } else {
      oauthErrorKind.value = null
      oauthError.value = e.data?.message || e.message || 'Facebook login failed. Please try again.'
    }
  } finally {
    oauthConnecting.value = false
  }
}

function clearOauthError() {
  oauthError.value = ''
  oauthErrorKind.value = null
}

function openAccessRequest() {
  accessRequestSent.value = false
  accessRequestError.value = ''
  accessRequestMessage.value = ''
  showAccessRequest.value = true
}

function closeAccessRequest() {
  showAccessRequest.value = false
  // Reset only if the request actually went through — otherwise keep the
  // form populated so a re-open after a recoverable error doesn't make
  // the tenant re-type everything.
  if (accessRequestSent.value) {
    accessRequest.fbEmail = ''
    accessRequest.fbProfileUrl = ''
    accessRequest.notes = ''
    accessRequestSent.value = false
    // Also clear the OAuth error banner — the user has a path forward now.
    clearOauthError()
  }
}

async function submitAccessRequest() {
  if (!isAccessRequestValid.value) return
  submittingAccessRequest.value = true
  accessRequestError.value = ''
  try {
    const res = await $fetch('/api/admin/facebook/request-access', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: {
        fbEmail: accessRequest.fbEmail.trim(),
        fbProfileUrl: accessRequest.fbProfileUrl.trim() || undefined,
        notes: accessRequest.notes.trim() || undefined,
      },
    }) as any
    accessRequestSent.value = true
    accessRequestMessage.value =
      res?.message ||
      "Thanks — your request has been logged. We'll whitelist your Facebook account within one business day."
  } catch (e: any) {
    accessRequestError.value =
      e.data?.message || e.message || 'Failed to submit your request. Please try again.'
  } finally {
    submittingAccessRequest.value = false
  }
}

async function connectSelectedPage() {
  if (!selectedPageId.value || !oauthToken.value) return
  connecting.value = true
  oauthError.value = ''
  try {
    const page = oauthPages.value.find(p => p.id === selectedPageId.value)
    await $fetch('/api/admin/facebook/connect', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: {
        accessToken: oauthToken.value,
        pageId: page?.id,
        pageName: page?.name,
      }
    })
    showPagePicker.value = false
    oauthPages.value = []
    selectedPageId.value = null
    emit('status-changed')
  } catch (e: any) {
    oauthError.value = e.data?.message || e.message || 'Failed to connect the selected page.'
    showPagePicker.value = false
  } finally {
    connecting.value = false
  }
}

function cancelPagePicker() {
  showPagePicker.value = false
  oauthPages.value = []
  selectedPageId.value = null
}

async function testConnection() {
  testing.value = true; testResults.value = null
  try { testResults.value = await $fetch('/api/admin/facebook/test', { method: 'POST', headers: getAuthHeaders() }) as any }
  catch (e: any) { testResults.value = { success: false, advice: [e.data?.message || e.message || 'Test failed'], results: {} } }
  finally { testing.value = false }
}

async function disconnect() {
  await $fetch('/api/admin/facebook/disconnect', { method: 'POST', headers: getAuthHeaders() })
  emit('status-changed')
}
</script>

<style scoped>
.fb-connection-card {
  border-radius: 24px !important;
  border: 1px solid rgba(0, 0, 0, 0.04) !important;
  background: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.04),
    0 8px 32px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
  overflow: hidden;
  position: relative;
}

.fb-status-indicator {
  height: 3px;
  width: 100%;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
}

.fb-status-connected {
  background: linear-gradient(90deg, #27AE60 0%, #2ECC71 50%, #27AE60 100%);
  background-size: 200% 100%;
  animation: fb-shimmer 3s ease infinite;
}

.fb-status-disconnected {
  background: linear-gradient(90deg, rgba(0,0,0,0.03) 0%, rgba(0,0,0,0.06) 50%, rgba(0,0,0,0.03) 100%);
}

@keyframes fb-shimmer {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.fb-avatar-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fb-avatar-icon {
  background: linear-gradient(135deg, #1877F2 0%, #0d65d9 100%) !important;
  box-shadow: 0 4px 16px rgba(24, 119, 242, 0.3);
}

.fb-pulse-ring {
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 2px solid rgba(39, 174, 96, 0.3);
  animation: fb-pulse 2.5s ease-out infinite;
}

@keyframes fb-pulse {
  0% { transform: scale(0.85); opacity: 1; }
  100% { transform: scale(1.15); opacity: 0; }
}

.fb-detail-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.2);
  display: inline-block;
}

.fb-login-btn {
  border-radius: 14px !important;
  text-transform: none !important;
  font-weight: 700 !important;
  letter-spacing: -0.2px !important;
  padding: 0 28px !important;
  box-shadow: 0 4px 16px rgba(24, 119, 242, 0.25) !important;
  transition: all 0.2s ease !important;
}

.fb-login-btn:hover {
  box-shadow: 0 6px 24px rgba(24, 119, 242, 0.35) !important;
  transform: translateY(-1px);
}

.fb-action-btn {
  border-radius: 12px !important;
  text-transform: none !important;
  font-weight: 600 !important;
  letter-spacing: -0.1px !important;
}

.fb-alert-glass {
  border-radius: 14px !important;
  border: 1px solid rgba(0, 0, 0, 0.04) !important;
  backdrop-filter: blur(8px);
}

/* Dialog styles */
.fb-dialog-card {
  border-radius: 24px !important;
  overflow: hidden;
  box-shadow:
    0 24px 80px rgba(0, 0, 0, 0.12),
    0 0 1px rgba(0, 0, 0, 0.1) !important;
}

.fb-dialog-header {
  display: flex;
  align-items: center;
  padding: 24px 24px 20px;
  background: linear-gradient(180deg, rgba(248, 249, 250, 0.8) 0%, rgba(255, 255, 255, 0) 100%);
}

.fb-page-list {
  background: transparent !important;
}

.fb-page-item {
  border: 1.5px solid transparent !important;
  transition: all 0.15s ease !important;
}

.fb-page-item:hover {
  background: rgba(24, 119, 242, 0.03) !important;
}

.fb-page-item.v-list-item--active {
  background: rgba(24, 119, 242, 0.05) !important;
  border-color: rgba(24, 119, 242, 0.2) !important;
}

/* Pre-connect consent panel */
.fb-consent-panel {
  background: rgba(24, 119, 242, 0.025);
  border: 1px solid rgba(24, 119, 242, 0.1);
  border-radius: 14px;
  padding: 16px 18px;
}

.fb-scope-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fb-scope-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 0.82rem;
  line-height: 1.45;
}

.fb-scope-code {
  background: rgba(24, 119, 242, 0.08);
  color: #0d65d9;
  font-family: 'JetBrains Mono', 'Menlo', monospace;
  font-size: 0.74rem;
  padding: 2px 7px;
  border-radius: 6px;
  white-space: nowrap;
  font-weight: 600;
  flex-shrink: 0;
  margin-top: 1px;
}

.fb-scope-desc {
  color: rgba(0, 0, 0, 0.7);
}

</style>
