<template>
  <v-row class="mb-8">
    <v-col cols="12">
      <v-card class="connection-card" elevation="0">
        <v-card-text class="pa-8">
          <div class="d-flex align-center">
            <v-avatar size="64" color="#1877F2" class="mr-6">
              <v-icon size="32" color="white">mdi-facebook</v-icon>
            </v-avatar>
            <div class="flex-grow-1">
              <div v-if="status.connected" class="d-flex align-center mb-1">
                <v-icon color="success" size="small" class="mr-2">mdi-check-circle</v-icon>
                <span class="text-h6 font-weight-bold">Connected</span>
              </div>
              <div v-else class="text-h6 font-weight-bold text-medium-emphasis mb-1">Not Connected</div>
              <div v-if="status.connected" class="text-body-2 text-medium-emphasis">
                Page: {{ status.pageName }} | User: {{ status.userName }}
                <span v-if="status.tokenExpiry" class="ml-2">
                  Token expires: {{ formatDate(status.tokenExpiry) }}
                </span>
              </div>
              <div v-else class="text-body-2 text-medium-emphasis">Connect your Facebook page to start posting listings</div>
            </div>
            <v-btn v-if="!status.connected" color="#1877F2" variant="flat" size="large" prepend-icon="mdi-facebook" class="premium-action-btn" @click="showDialog = true">
              Connect Facebook
            </v-btn>
            <div v-else class="d-flex ga-2">
              <v-btn variant="tonal" color="info" @click="testConnection" :loading="testing" prepend-icon="mdi-connection">Test Connection</v-btn>
              <v-btn variant="outlined" color="error" @click="disconnect">Disconnect</v-btn>
            </div>
          </div>
        </v-card-text>
        <v-expand-transition>
          <v-card-text v-if="testResults" class="pt-0">
            <v-divider class="mb-4" />
            <div class="text-subtitle-2 font-weight-bold mb-2">Connection Diagnostics</div>
            <v-alert v-for="(tip, i) in testResults.advice" :key="i" :type="testResults.success ? 'success' : 'warning'" variant="tonal" density="compact" class="mb-2">{{ tip }}</v-alert>
            <div v-if="testResults.results?.tokenIdentity" class="text-caption text-medium-emphasis mt-2">
              Token resolves to: {{ testResults.results.tokenIdentity.name }} ({{ testResults.results.tokenIdentity.id }})
              <v-chip size="x-small" :color="testResults.results.tokenIdentity.isPageToken ? 'success' : 'warning'" class="ml-1">
                {{ testResults.results.tokenIdentity.isPageToken ? 'Page Token' : 'User Token' }}
              </v-chip>
            </div>
          </v-card-text>
        </v-expand-transition>
      </v-card>
    </v-col>
  </v-row>

  <v-dialog v-model="showDialog" max-width="600" persistent>
    <v-card class="rounded-xl">
      <v-card-title class="pa-6 display-serif text-h6">Connect Facebook Page</v-card-title>
      <v-divider />
      <v-card-text class="pa-6">
        <v-alert v-if="connectError" type="error" variant="tonal" class="mb-6" closable @click:close="connectError = ''">{{ connectError }}</v-alert>
        <v-tabs v-model="connectMethod" color="#1877F2" class="mb-6">
          <v-tab value="user_token">User Access Token (Recommended)</v-tab>
          <v-tab value="page_token">Page Access Token</v-tab>
        </v-tabs>
        <v-window v-model="connectMethod">
          <v-window-item value="user_token">
            <v-alert type="info" variant="tonal" class="mb-4" density="compact">
              <strong>How to get a User Access Token:</strong>
              <ol class="mt-2 text-body-2">
                <li>Go to <a href="https://developers.facebook.com/tools/explorer/" target="_blank" class="text-primary">Graph API Explorer</a></li>
                <li>Select your app, click <strong>"Generate Access Token"</strong></li>
                <li>Grant: <code>pages_manage_posts</code>, <code>pages_read_engagement</code></li>
                <li>Copy the token below</li>
              </ol>
            </v-alert>
            <v-text-field v-model="form.userAccessToken" label="User Access Token" variant="outlined" density="compact" :type="showToken ? 'text' : 'password'" :append-inner-icon="showToken ? 'mdi-eye-off' : 'mdi-eye'" @click:append-inner="showToken = !showToken" class="mb-4" hint="Paste the token from Graph API Explorer" persistent-hint />
            <v-text-field v-model="form.userName" label="Your Name" variant="outlined" density="compact" />
          </v-window-item>
          <v-window-item value="page_token">
            <v-alert type="warning" variant="tonal" class="mb-4" density="compact">
              <strong>Important:</strong> Page ID is NOT the App ID. Find it in Facebook Page → About.
            </v-alert>
            <v-text-field v-model="form.pageId" label="Facebook Page ID" variant="outlined" density="compact" class="mb-4" hint="Found in Facebook Page → About → Page ID" persistent-hint />
            <v-text-field v-model="form.pageName" label="Page Name" variant="outlined" density="compact" class="mb-4" />
            <v-text-field v-model="form.pageAccessToken" label="Page Access Token" variant="outlined" density="compact" :type="showToken ? 'text' : 'password'" :append-inner-icon="showToken ? 'mdi-eye-off' : 'mdi-eye'" @click:append-inner="showToken = !showToken" class="mb-4" hint="Generate from Graph API Explorer" persistent-hint />
            <v-text-field v-model="form.userName" label="Your Name" variant="outlined" density="compact" />
          </v-window-item>
        </v-window>
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-6">
        <v-spacer />
        <v-btn variant="text" @click="showDialog = false; connectError = ''">Cancel</v-btn>
        <v-btn color="#1877F2" variant="flat" @click="submitConnect" :loading="connecting" prepend-icon="mdi-connection">Validate & Connect</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { getAuthHeaders } from '~/composables/useFacebookAdmin'

defineProps<{ status: any }>()
const emit = defineEmits<{ 'status-changed': [] }>()

const testing = ref(false)
const testResults = ref<any>(null)
const showDialog = ref(false)
const connecting = ref(false)
const connectMethod = ref('user_token')
const connectError = ref('')
const showToken = ref(false)
const form = ref({ pageId: '', pageName: '', pageAccessToken: '', userAccessToken: '', userName: '' })

const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

async function submitConnect() {
  connecting.value = true; connectError.value = ''
  try {
    const token = connectMethod.value === 'user_token' ? form.value.userAccessToken : form.value.pageAccessToken
    if (!token) { connectError.value = 'Please enter an access token.'; return }
    await $fetch('/api/admin/facebook/connect', {
      method: 'POST', headers: getAuthHeaders(),
      body: {
        accessToken: token,
        pageAccessToken: connectMethod.value === 'page_token' ? token : undefined,
        pageId: connectMethod.value === 'page_token' ? form.value.pageId : undefined,
        pageName: form.value.pageName || undefined,
        userName: form.value.userName || undefined,
      }
    })
    showDialog.value = false; connectError.value = ''
    form.value = { pageId: '', pageName: '', pageAccessToken: '', userAccessToken: '', userName: '' }
    emit('status-changed')
  } catch (e: any) { connectError.value = e.data?.message || e.message || 'Connection failed' }
  finally { connecting.value = false }
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
