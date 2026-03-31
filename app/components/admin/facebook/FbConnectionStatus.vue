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

          <!-- OAuth error -->
          <v-slide-y-transition>
            <v-alert v-if="oauthError" type="error" variant="tonal" class="mt-5 fb-alert-glass" closable @click:close="oauthError = ''">{{ oauthError }}</v-alert>
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

</template>

<script setup lang="ts">
import { ref } from 'vue'
import { getAuthHeaders } from '~/composables/useFacebookAdmin'

defineProps<{ status: any }>()
const emit = defineEmits<{ 'status-changed': [] }>()

const { initFacebookSDK, login: fbLogin, userAccessToken: oauthToken } = useFacebookAuth()

const testing = ref(false)
const testResults = ref<any>(null)
const connecting = ref(false)

// OAuth flow state
const oauthConnecting = ref(false)
const oauthError = ref('')
const showPagePicker = ref(false)
const oauthPages = ref<Array<{ id: string; name: string; access_token: string }>>([])
const selectedPageId = ref<string | null>(null)

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
  oauthError.value = ''
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
    oauthError.value = e.data?.message || e.message || 'Facebook login failed. Please try again.'
  } finally {
    oauthConnecting.value = false
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

</style>
