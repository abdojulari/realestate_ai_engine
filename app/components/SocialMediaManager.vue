<template>
  <v-card class="mx-auto" max-width="1200">
    <v-card-title class="bg-primary text-white">
      <v-icon icon="mdi-share-variant" class="mr-2"></v-icon>
      Social Media Manager
    </v-card-title>

    <v-card-text class="pa-4">
      <!-- Authentication Section -->
      <v-row class="mb-4">
        <v-col cols="12" md="6">
          <v-card elevation="2">
            <v-card-subtitle>Facebook Authentication</v-card-subtitle>
            <v-card-text>
              <div v-if="!fbAuth.isLoggedIn.value">
                <v-btn @click="loginFacebook" color="primary" block>
                  <v-icon left>mdi-facebook</v-icon>
                  Login with Facebook
                </v-btn>
              </div>
              <div v-else>
                <v-chip color="success" class="mb-2">
                  <v-icon left>mdi-check-circle</v-icon>
                  Connected to Facebook
                </v-chip>
                <v-btn @click="logoutFacebook" color="error" size="small" block>
                  Logout
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-card elevation="2">
            <v-card-subtitle>Threads Authentication</v-card-subtitle>
            <v-card-text>
              <div v-if="!threadsAuth.isLoggedIn.value">
                <v-btn @click="loginThreads" color="primary" block>
                  <v-icon left>mdi-at</v-icon>
                  Login with Threads
                </v-btn>
              </div>
              <div v-else>
                <v-chip color="success" class="mb-2">
                  <v-icon left>mdi-check-circle</v-icon>
                  Connected to Threads
                </v-chip>
                <v-btn @click="logoutThreads" color="error" size="small" block>
                  Logout
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- AI Content Generation -->
      <v-card elevation="2" class="mb-4">
        <v-card-subtitle>AI Content Generator (Google Gemini - Free Tier)</v-card-subtitle>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="4">
              <v-select
                v-model="selectedCategory"
                :items="categories"
                label="Content Category"
                density="comfortable"
              ></v-select>
            </v-col>
            <v-col cols="12" md="4">
              <v-select
                v-model="selectedPlatform"
                :items="platforms"
                label="Platform"
                density="comfortable"
              ></v-select>
            </v-col>
            <v-col cols="12" md="4">
              <v-btn @click="generateContent" color="primary" block :loading="generating">
                <v-icon left>mdi-auto-fix</v-icon>
                Generate Content
              </v-btn>
            </v-col>
          </v-row>

          <v-textarea density="compact"
            v-model="postContent"
            label="Post Content"
            rows="4"
            :counter="selectedPlatform === 'threads' ? 500 : undefined"
            class="mt-3"
          ></v-textarea>

          <v-text-field
            v-model="imageUrl"
            label="Image URL (Optional)"
            density="comfortable"
            class="mt-2"
          ></v-text-field>
        </v-card-text>
      </v-card>

      <!-- Facebook Pages Selection -->
      <v-card v-if="fbAuth.isLoggedIn.value && pages.length > 0" elevation="2" class="mb-4">
        <v-card-subtitle>Select Facebook Page</v-card-subtitle>
        <v-card-text>
          <v-select
            v-model="selectedPage"
            :items="pages"
            item-title="name"
            item-value="id"
            label="Choose a page to post to"
            density="comfortable"
            return-object
          ></v-select>
        </v-card-text>
      </v-card>

      <!-- Post Actions -->
      <v-row>
        <v-col cols="12" md="6">
          <v-btn
            @click="postToFacebook"
            color="primary"
            block
            size="large"
            :disabled="!fbAuth.isLoggedIn.value || !postContent || !selectedPage"
            :loading="postingFacebook"
          >
            <v-icon left>mdi-facebook</v-icon>
            Post to Facebook
          </v-btn>
        </v-col>

        <v-col cols="12" md="6">
          <v-btn
            @click="postToThreads"
            color="primary"
            block
            size="large"
            :disabled="!threadsAuth.isLoggedIn.value || !postContent"
            :loading="postingThreads"
          >
            <v-icon left>mdi-at</v-icon>
            Post to Threads
          </v-btn>
        </v-col>
      </v-row>

      <!-- Status Messages -->
      <v-alert
        v-if="statusMessage"
        :type="statusType"
        class="mt-4"
        closable
        @click:close="statusMessage = ''"
      >
        {{ statusMessage }}
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
const fbAuth = useFacebookAuth()
const threadsAuth = useThreadsAuth()
const aiContent = useAIContent()

const selectedCategory = ref('buying')
const selectedPlatform = ref('facebook')
const postContent = ref('')
const imageUrl = ref('')
const pages = ref<any[]>([])
const selectedPage = ref<any>(null)
const generating = ref(false)
const postingFacebook = ref(false)
const postingThreads = ref(false)
const statusMessage = ref('')
const statusType = ref<'success' | 'error' | 'warning' | 'info'>('info')

const categories = [
  { title: 'Buying Tips', value: 'buying' },
  { title: 'Selling Tips', value: 'selling' },
  { title: 'Investing', value: 'investing' },
  { title: 'Market Trends', value: 'market-trends' },
  { title: 'Home Maintenance', value: 'home-maintenance' }
]

const platforms = [
  { title: 'Facebook', value: 'facebook' },
  { title: 'Threads', value: 'threads' }
]

// Initialize Facebook SDK on mount
onMounted(async () => {
  await fbAuth.initFacebookSDK()
})

// Watch for Facebook login status
watch(() => fbAuth.isLoggedIn.value, async (isLoggedIn) => {
  if (isLoggedIn) {
    try {
      pages.value = await fbAuth.getPages()
      if (pages.value.length > 0) {
        selectedPage.value = pages.value[0]
      }
    } catch (error) {
      console.error('Error loading pages:', error)
    }
  }
})

const loginFacebook = async () => {
  try {
    await fbAuth.login()
    showStatus('Successfully logged in to Facebook!', 'success')
  } catch (error: any) {
    showStatus(error.message || 'Failed to login to Facebook', 'error')
  }
}

const logoutFacebook = async () => {
  await fbAuth.logout()
  pages.value = []
  selectedPage.value = null
  showStatus('Logged out from Facebook', 'info')
}

const loginThreads = async () => {
  try {
    await threadsAuth.login()
    showStatus('Successfully logged in to Threads!', 'success')
  } catch (error: any) {
    showStatus(error.message || 'Failed to login to Threads', 'error')
  }
}

const logoutThreads = async () => {
  await threadsAuth.logout()
  showStatus('Logged out from Threads', 'info')
}

const generateContent = async () => {
  generating.value = true
  try {
    const result = await aiContent.generateSocialPost(
      selectedCategory.value,
      selectedPlatform.value as 'facebook' | 'threads'
    )
    postContent.value = `${result.text}\n\n${result.hashtags.join(' ')}`
    showStatus('Content generated successfully!', 'success')
  } catch (error: any) {
    showStatus(error.message || 'Failed to generate content', 'error')
  } finally {
    generating.value = false
  }
}

const postToFacebook = async () => {
  if (!selectedPage.value) {
    showStatus('Please select a Facebook page', 'warning')
    return
  }

  postingFacebook.value = true
  try {
    await fbAuth.postToPage(
      selectedPage.value.id,
      selectedPage.value.access_token,
      postContent.value,
      imageUrl.value || undefined
    )
    showStatus('Successfully posted to Facebook!', 'success')
    postContent.value = ''
    imageUrl.value = ''
  } catch (error: any) {
    showStatus(error.message || 'Failed to post to Facebook', 'error')
  } finally {
    postingFacebook.value = false
  }
}

const postToThreads = async () => {
  // Validate Threads character limit
  if (postContent.value.length > 500) {
    showStatus('Threads posts must be 500 characters or less', 'warning')
    return
  }

  postingThreads.value = true
  try {
    if (imageUrl.value) {
      await threadsAuth.createMediaPost(postContent.value, imageUrl.value)
    } else {
      await threadsAuth.createPost(postContent.value)
    }
    showStatus('Successfully posted to Threads!', 'success')
    postContent.value = ''
    imageUrl.value = ''
  } catch (error: any) {
    const errorMsg = error.message || 'Failed to post to Threads'
    if (errorMsg.includes('Threads API access not configured')) {
      showStatus(
        'Threads API requires additional setup. Please configure your Meta app for Threads.',
        'warning'
      )
    } else {
      showStatus(errorMsg, 'error')
    }
  } finally {
    postingThreads.value = false
  }
}

const showStatus = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
  statusMessage.value = message
  statusType.value = type
}
</script>

