<template>
  <div class="admin-facebook px-md-8 py-md-6">
    <v-container fluid>
      <!-- Header -->
      <v-row class="mb-10 align-center">
        <v-col cols="12" md="8">
          <div class="d-flex align-center mb-2">
            <v-btn icon="mdi-arrow-left" variant="text" size="small" class="mr-2" to="/admin" />
            <div class="premium-accent-bar mr-4"></div>
            <span class="text-overline letter-spacing-2 text-gold">Social Media</span>
          </div>
          <h1 class="display-serif text-h3 mb-1">Facebook Integration</h1>
          <p class="text-subtitle-1 text-medium-emphasis font-weight-light">
            Post listings and campaigns directly to Facebook
          </p>
        </v-col>
      </v-row>

      <!-- Connection Status -->
      <v-row class="mb-8">
        <v-col cols="12">
          <v-card class="connection-card" elevation="0">
            <v-card-text class="pa-8">
              <div class="d-flex align-center">
                <v-avatar size="64" color="#1877F2" class="mr-6">
                  <v-icon size="32" color="white">mdi-facebook</v-icon>
                </v-avatar>
                <div class="flex-grow-1">
                  <div v-if="fbStatus.connected" class="d-flex align-center mb-1">
                    <v-icon color="success" size="small" class="mr-2">mdi-check-circle</v-icon>
                    <span class="text-h6 font-weight-bold">Connected</span>
                  </div>
                  <div v-else class="text-h6 font-weight-bold text-medium-emphasis mb-1">
                    Not Connected
                  </div>
                  <div v-if="fbStatus.connected" class="text-body-2 text-medium-emphasis">
                    Page: {{ fbStatus.pageName }} | User: {{ fbStatus.userName }}
                    <span v-if="fbStatus.tokenExpiry" class="ml-2">
                      Token expires: {{ formatDate(fbStatus.tokenExpiry) }}
                    </span>
                  </div>
                  <div v-else class="text-body-2 text-medium-emphasis">
                    Connect your Facebook page to start posting listings
                  </div>
                </div>
                <v-btn
                  v-if="!fbStatus.connected"
                  color="#1877F2"
                  variant="flat"
                  size="large"
                  prepend-icon="mdi-facebook"
                  class="premium-action-btn"
                  @click="connectFacebook"
                >
                  Connect Facebook
                </v-btn>
                <div v-else class="d-flex ga-2">
                  <v-btn variant="tonal" color="info" @click="testConnection" :loading="testing" prepend-icon="mdi-connection">
                    Test Connection
                  </v-btn>
                  <v-btn variant="outlined" color="error" @click="disconnectFacebook">
                    Disconnect
                  </v-btn>
                </div>
              </div>
            </v-card-text>
            <v-expand-transition>
              <v-card-text v-if="testResults" class="pt-0">
                <v-divider class="mb-4" />
                <div class="text-subtitle-2 font-weight-bold mb-2">Connection Diagnostics</div>
                <v-alert v-for="(tip, i) in testResults.advice" :key="i" :type="testResults.success ? 'success' : 'warning'" variant="tonal" density="compact" class="mb-2">
                  {{ tip }}
                </v-alert>
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

      <!-- Post Stats -->
      <v-row v-if="fbStatus.connected" class="mb-8">
        <v-col v-for="(count, status) in fbStatus.postStats" :key="status" cols="6" sm="3">
          <v-card class="stat-card-premium" elevation="0">
            <v-card-text class="text-center">
              <div class="text-h4 font-weight-bold mb-1">{{ count }}</div>
              <div class="text-overline text-medium-emphasis text-capitalize">{{ status }}</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Post Alerts -->
      <v-row v-if="postError || postSuccess" class="mb-4">
        <v-col cols="12">
          <v-alert v-if="postError" type="error" variant="tonal" closable @click:close="postError = ''">{{ postError }}</v-alert>
          <v-alert v-if="postSuccess" type="success" variant="tonal" closable @click:close="postSuccess = ''">{{ postSuccess }}</v-alert>
        </v-col>
      </v-row>

      <!-- ═══════════════ TEMPLATE SELECTOR ═══════════════ -->
      <v-row v-if="fbStatus.connected" class="mb-6">
        <v-col cols="12">
          <v-card class="section-card" elevation="0">
            <v-card-title class="pa-6 d-flex align-center">
              <v-icon class="mr-2">mdi-palette-swatch-variant</v-icon>
              <span class="display-serif text-h5">Choose Template</span>
            </v-card-title>
            <v-divider class="opacity-10" />
            <v-card-text class="pa-6">
              <!-- Template Grid -->
              <div class="template-grid mb-6">
                <div
                  v-for="t in templates"
                  :key="t.id"
                  class="template-thumb"
                  :class="{ 'template-thumb--active': selectedTemplate === t.id }"
                  @click="selectedTemplate = t.id"
                >
                  <div class="template-thumb__preview" :style="getTemplateThumbStyle(t.id)">
                    <div class="template-thumb__label">{{ t.label }}</div>
                  </div>
                  <div class="text-caption text-center mt-1 font-weight-medium">{{ t.label }}</div>
                </div>
              </div>

              <!-- Color Palette -->
              <div class="text-subtitle-2 font-weight-bold mb-3">Accent Color</div>
              <div class="color-palette">
                <button
                  v-for="c in colorPalette"
                  :key="c.value"
                  class="color-swatch"
                  :class="{ 'color-swatch--active': selectedColor === c.value }"
                  :style="{ background: c.value }"
                  :title="c.label"
                  @click="selectedColor = c.value"
                />
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- ═══════════════ CREATE POST ═══════════════ -->
      <v-row v-if="fbStatus.connected" class="mb-8">
        <v-col cols="12" md="7">
          <v-card class="section-card" elevation="0">
            <v-card-title class="pa-6">
              <v-icon class="mr-2">mdi-pencil-ruler</v-icon>
              <span class="display-serif text-h5">Compose Post</span>
            </v-card-title>
            <v-divider class="opacity-10" />
            <v-card-text class="pa-6">
              <v-row dense>
                <v-col cols="12" sm="6">
                  <v-select v-model="postForm.postType" :items="postTypes" item-title="label" item-value="value" label="Post Type" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-autocomplete v-if="postForm.postType === 'listing'" v-model="postForm.propertyId" :items="availableProperties" item-title="displayName" item-value="id" label="Select Property" variant="outlined" density="compact" @update:model-value="onPropertySelected" />
                </v-col>
              </v-row>

              <v-text-field v-model="postForm.header" label="Header / Title" variant="outlined" density="compact" class="mt-2" placeholder="e.g. Stunning Home in Edmonton" />
              <v-text-field v-model="postForm.tagline" label="Tagline" variant="outlined" density="compact" class="mt-2" placeholder="e.g. Your Dream Home Awaits" />
              <v-textarea v-model="postForm.content" label="Description / Body" variant="outlined" rows="4" density="compact" class="mt-2" placeholder="Write your post description..." />
              <v-row dense class="mt-2">
                <v-col cols="12" sm="6">
                  <v-text-field v-model="postForm.link" label="Link (optional)" variant="outlined" density="compact" prepend-inner-icon="mdi-link" />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field v-model="postForm.scheduledFor" label="Schedule (optional)" type="datetime-local" variant="outlined" density="compact" prepend-inner-icon="mdi-clock" />
                </v-col>
              </v-row>

              <!-- ── Media Uploads ── -->
              <v-divider class="my-5 opacity-10" />
              <div class="text-subtitle-2 font-weight-bold mb-4">
                <v-icon size="small" class="mr-1">mdi-image-multiple</v-icon> Media
              </div>

              <!-- Logo -->
              <div class="mb-4">
                <div class="text-caption font-weight-bold mb-2 text-medium-emphasis">LOGO</div>
                <div v-if="logoPreview" class="media-thumb-row">
                  <div class="media-thumb">
                    <img :src="logoPreview" class="media-thumb__img" />
                    <v-btn icon size="x-small" color="error" variant="flat" class="media-thumb__remove" @click="removeLogo"><v-icon size="14">mdi-close</v-icon></v-btn>
                  </div>
                </div>
                <v-btn v-else variant="tonal" size="small" prepend-icon="mdi-upload" @click="($refs.logoInput as HTMLInputElement)?.click()">Upload Logo</v-btn>
                <input ref="logoInput" type="file" accept="image/*" class="d-none" @change="onLogoChange" />
              </div>

              <!-- Images -->
              <div class="mb-4">
                <div class="text-caption font-weight-bold mb-2 text-medium-emphasis">IMAGES <span class="font-weight-regular">(up to 10)</span></div>
                <div class="media-thumb-row">
                  <div v-for="(img, i) in imagePreviews" :key="i" class="media-thumb">
                    <img :src="img" class="media-thumb__img" />
                    <v-btn icon size="x-small" color="error" variant="flat" class="media-thumb__remove" @click="removeImage(i)"><v-icon size="14">mdi-close</v-icon></v-btn>
                  </div>
                  <div v-if="imagePreviews.length < 10" class="media-thumb media-thumb--add" @click="($refs.imageInput as HTMLInputElement).click()">
                    <v-icon size="24" color="grey">mdi-plus</v-icon>
                  </div>
                </div>
                <input ref="imageInput" type="file" accept="image/*" multiple class="d-none" @change="onImagesChange" />
              </div>

              <!-- Video -->
              <div class="mb-2">
                <div class="text-caption font-weight-bold mb-2 text-medium-emphasis">VIDEO</div>
                <div v-if="videoPreview" class="media-thumb-row">
                  <div class="media-thumb media-thumb--video">
                    <video :src="videoPreview" class="media-thumb__img" muted />
                    <v-icon class="media-thumb__play" size="28" color="white">mdi-play-circle</v-icon>
                    <v-btn icon size="x-small" color="error" variant="flat" class="media-thumb__remove" @click="removeVideo"><v-icon size="14">mdi-close</v-icon></v-btn>
                  </div>
                </div>
                <v-btn v-else variant="tonal" size="small" prepend-icon="mdi-video-plus" @click="($refs.videoInput as HTMLInputElement).click()">Upload Video</v-btn>
                <input ref="videoInput" type="file" accept="video/*" class="d-none" @change="onVideoChange" />
              </div>
            </v-card-text>

            <v-divider class="opacity-10" />
            <v-card-actions class="pa-6">
              <v-spacer />
              <v-btn variant="tonal" @click="saveDraft" :loading="posting">Save Draft</v-btn>
              <v-btn color="#1877F2" variant="flat" @click="publishPost" :loading="posting" prepend-icon="mdi-send">
                {{ postForm.scheduledFor ? 'Schedule' : 'Post Now' }}
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>

        <!-- ═══════════════ LIVE PREVIEW ═══════════════ -->
        <v-col cols="12" md="5">
          <v-card class="section-card sticky-preview" elevation="0">
            <v-card-title class="pa-4 d-flex align-center">
              <v-icon size="small" class="mr-2">mdi-eye</v-icon>
              <span class="text-subtitle-1 font-weight-bold">Live Preview</span>
            </v-card-title>
            <v-divider class="opacity-10" />
            <v-card-text class="pa-4">
              <!-- Facebook Post Frame -->
              <div class="fb-frame">
                <div class="d-flex align-center mb-3">
                  <v-avatar size="36" color="#1877F2" class="mr-2">
                    <v-icon size="18" color="white">mdi-facebook</v-icon>
                  </v-avatar>
                  <div>
                    <div class="text-body-2 font-weight-bold">{{ fbStatus.pageName || 'Your Page' }}</div>
                    <div class="text-caption text-medium-emphasis">Just now · <v-icon size="12">mdi-earth</v-icon></div>
                  </div>
                </div>

                <!-- Template Render Area -->
                <div class="template-render" :style="getTemplateStyle()">
                  <!-- Logo -->
                  <img v-if="logoPreview" :src="logoPreview" class="template-logo" :style="{ borderColor: selectedColor }" />

                  <!-- Header -->
                  <div v-if="postForm.header" class="template-header" :class="getTemplateTextClass()" :style="{ color: getHeaderColor() }">
                    {{ postForm.header }}
                  </div>

                  <!-- Tagline -->
                  <div v-if="postForm.tagline" class="template-tagline" :class="getTemplateTaglineClass()" :style="{ color: getTaglineColor() }">
                    {{ postForm.tagline }}
                  </div>

                  <!-- Image carousel -->
                  <div v-if="imagePreviews.length" class="template-images mt-3">
                    <img :src="imagePreviews[activeImageIndex] || imagePreviews[0]" class="template-main-image" />
                    <div v-if="imagePreviews.length > 1" class="template-image-dots">
                      <span v-for="(_, i) in imagePreviews" :key="i" class="dot" :class="{ 'dot--active': i === activeImageIndex }" @click="activeImageIndex = i" />
                    </div>
                  </div>

                  <!-- Description -->
                  <div v-if="postForm.content" class="template-description" :class="getTemplateBodyClass()" :style="{ color: getBodyColor() }">
                    {{ postForm.content }}
                  </div>

                  <!-- Placeholder when empty -->
                  <div v-if="!postForm.header && !postForm.content && !imagePreviews.length" class="text-center py-8 text-medium-emphasis">
                    <v-icon size="48" class="mb-2">mdi-image-text</v-icon>
                    <div class="text-body-2">Start composing to see preview</div>
                  </div>
                </div>

                <!-- Link preview -->
                <div v-if="postForm.link" class="fb-link-bar mt-2">
                  <v-icon size="14" class="mr-1">mdi-link</v-icon>
                  <span class="text-caption text-truncate">{{ postForm.link }}</span>
                </div>

                <!-- Reactions bar -->
                <div class="fb-reactions mt-3">
                  <div class="d-flex ga-1">
                    <span>👍</span><span>❤️</span><span>😮</span>
                    <span class="text-caption text-medium-emphasis ml-1">0</span>
                  </div>
                  <div class="text-caption text-medium-emphasis">0 Comments · 0 Shares</div>
                </div>
                <v-divider class="my-2" />
                <div class="d-flex justify-space-around">
                  <v-btn variant="text" size="small" prepend-icon="mdi-thumb-up-outline" class="text-medium-emphasis">Like</v-btn>
                  <v-btn variant="text" size="small" prepend-icon="mdi-comment-outline" class="text-medium-emphasis">Comment</v-btn>
                  <v-btn variant="text" size="small" prepend-icon="mdi-share-outline" class="text-medium-emphasis">Share</v-btn>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- ═══════════════ POST HISTORY ═══════════════ -->
      <v-row v-if="fbStatus.connected">
        <v-col cols="12">
          <v-card class="section-card" elevation="0">
            <v-card-title class="pa-6 d-flex align-center">
              <v-icon class="mr-2">mdi-history</v-icon>
              <span class="display-serif text-h5">Post History</span>
              <v-spacer />
              <v-btn v-if="posts.length" variant="tonal" color="error" size="small" prepend-icon="mdi-delete-sweep" class="mr-3" @click="showClearDialog = true">
                Clear All
              </v-btn>
              <v-select v-model="postFilter" :items="['all','posted','scheduled','draft','failed']" variant="outlined" density="compact" style="max-width: 150px;" @update:model-value="loadPosts" />
            </v-card-title>
            <v-divider class="opacity-10" />
            <v-card-text v-if="!posts.length" class="pa-8 text-center">
              <v-icon size="48" class="mb-2 text-disabled">mdi-post-outline</v-icon>
              <div class="text-body-2 text-medium-emphasis">No posts yet</div>
            </v-card-text>
            <v-list v-else bg-color="transparent">
              <v-list-item v-for="post in posts" :key="post.id" class="px-6 py-4 list-item-hover">
                <template #prepend>
                  <v-avatar size="36" :color="getPostStatusColor(post.status)" variant="tonal" class="mr-3">
                    <v-icon size="18">{{ getPostIcon(post.status) }}</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title class="font-weight-bold text-body-2">
                  {{ post.content?.substring(0, 100) }}{{ (post.content?.length || 0) > 100 ? '...' : '' }}
                </v-list-item-title>
                <v-list-item-subtitle class="mt-1">
                  <v-chip :color="getPostStatusColor(post.status)" size="x-small" class="mr-2 text-uppercase">{{ post.status }}</v-chip>
                  {{ post.postedAt ? formatDateTime(post.postedAt) : formatDateTime(post.createdAt) }}
                  <span v-if="post.errorMessage" class="text-error ml-2 text-caption">{{ post.errorMessage }}</span>
                </v-list-item-subtitle>
                <template #append>
                  <v-btn icon size="small" variant="text" color="error" @click="deletePost(post.id)">
                    <v-icon size="18">mdi-delete-outline</v-icon>
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>
      </v-row>

      <!-- Setup Guide (not connected) -->
      <v-row v-if="!fbStatus.connected" class="mb-8">
        <v-col cols="12">
          <v-card class="section-card" elevation="0">
            <v-card-title class="pa-6"><span class="display-serif text-h5">Setup Guide</span></v-card-title>
            <v-divider class="opacity-10" />
            <v-card-text class="pa-6">
              <v-timeline density="compact" side="end">
                <v-timeline-item dot-color="#1877F2" size="small">
                  <div class="mb-2"><strong>1. Create a Facebook App</strong></div>
                  <div class="text-body-2 text-medium-emphasis">Go to <a href="https://developers.facebook.com/" target="_blank">developers.facebook.com</a> and create a new app (Business type).</div>
                </v-timeline-item>
                <v-timeline-item dot-color="#1877F2" size="small">
                  <div class="mb-2"><strong>2. Add "Facebook Login for Business"</strong></div>
                  <div class="text-body-2 text-medium-emphasis">In your app dashboard, add the product and configure it.</div>
                </v-timeline-item>
                <v-timeline-item dot-color="#1877F2" size="small">
                  <div class="mb-2"><strong>3. Generate an Access Token</strong></div>
                  <div class="text-body-2 text-medium-emphasis">Go to the <a href="https://developers.facebook.com/tools/explorer/" target="_blank">Graph API Explorer</a>, select your app, grant <code>pages_manage_posts</code> + <code>pages_read_engagement</code>, then generate.</div>
                </v-timeline-item>
                <v-timeline-item dot-color="success" size="small">
                  <div class="mb-2"><strong>4. Connect Here</strong></div>
                  <div class="text-body-2 text-medium-emphasis">Paste the token and we'll find your page automatically.</div>
                </v-timeline-item>
              </v-timeline>
              <v-alert type="info" variant="tonal" class="mt-4" density="compact">
                <strong>Tip:</strong> Use a <strong>User Access Token</strong> from the Graph API Explorer, not the Client Token from App Settings.
              </v-alert>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Connect Dialog (keep as-is) -->
      <v-dialog v-model="showConnectDialog" max-width="600" persistent>
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
                <v-text-field v-model="connectForm.userAccessToken" label="User Access Token" variant="outlined" :type="showToken ? 'text' : 'password'" :append-inner-icon="showToken ? 'mdi-eye-off' : 'mdi-eye'" @click:append-inner="showToken = !showToken" class="mb-4" hint="Paste the token from Graph API Explorer" persistent-hint />
                <v-text-field v-model="connectForm.userName" label="Your Name" variant="outlined" />
              </v-window-item>
              <v-window-item value="page_token">
                <v-alert type="warning" variant="tonal" class="mb-4" density="compact">
                  <strong>Important:</strong> Page ID is NOT the App ID. Find it in Facebook Page → About.
                </v-alert>
                <v-text-field v-model="connectForm.pageId" label="Facebook Page ID" variant="outlined" class="mb-4" hint="Found in Facebook Page → About → Page ID" persistent-hint />
                <v-text-field v-model="connectForm.pageName" label="Page Name" variant="outlined" class="mb-4" />
                <v-text-field v-model="connectForm.pageAccessToken" label="Page Access Token" variant="outlined" :type="showToken ? 'text' : 'password'" :append-inner-icon="showToken ? 'mdi-eye-off' : 'mdi-eye'" @click:append-inner="showToken = !showToken" class="mb-4" hint="Generate from Graph API Explorer" persistent-hint />
                <v-text-field v-model="connectForm.userName" label="Your Name" variant="outlined" />
              </v-window-item>
            </v-window>
          </v-card-text>
          <v-divider />
          <v-card-actions class="pa-6">
            <v-spacer />
            <v-btn variant="text" @click="showConnectDialog = false; connectError = ''">Cancel</v-btn>
            <v-btn color="#1877F2" variant="flat" @click="submitConnect" :loading="connecting" prepend-icon="mdi-connection">Validate & Connect</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Clear History Dialog -->
      <v-dialog v-model="showClearDialog" max-width="400">
        <v-card class="rounded-xl">
          <v-card-title class="pa-6">Clear Post History?</v-card-title>
          <v-card-text class="px-6 pb-2">This will permanently delete all post records. This cannot be undone.</v-card-text>
          <v-card-actions class="pa-6 pt-2">
            <v-spacer />
            <v-btn variant="text" @click="showClearDialog = false">Cancel</v-btn>
            <v-btn color="error" variant="flat" @click="clearAllPosts" :loading="clearing">Clear All</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({ layout: 'admin', middleware: ['admin'] })

const getAuthHeaders = (): Record<string, string> => {
  if (process.client) {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }
  return {}
}

// ─── State ───
const fbStatus = ref<any>({ connected: false, postStats: {} })
const posts = ref<any[]>([])
const availableProperties = ref<any[]>([])
const posting = ref(false)
const connecting = ref(false)
const testing = ref(false)
const clearing = ref(false)
const testResults = ref<any>(null)
const showConnectDialog = ref(false)
const showClearDialog = ref(false)
const postFilter = ref('all')
const activeImageIndex = ref(0)

// ─── Templates ───
const templates = [
  { id: 'plain',         label: 'Plain' },
  { id: 'glassmorphism', label: 'Glass' },
  { id: 'gradient',      label: 'Gradient' },
  { id: 'bold',          label: 'Bold' },
  { id: 'minimal',       label: 'Minimal' },
  { id: 'elegant',       label: 'Elegant' },
]
const selectedTemplate = ref('plain')

const colorPalette = [
  { label: 'Blue',   value: '#1877F2' },
  { label: 'Orange', value: '#FF6B35' },
  { label: 'Red',    value: '#E74C3C' },
  { label: 'Green',  value: '#27AE60' },
  { label: 'Purple', value: '#8E44AD' },
  { label: 'Teal',   value: '#1ABC9C' },
  { label: 'Gold',   value: '#D4A537' },
  { label: 'Dark',   value: '#2C3E50' },
]
const selectedColor = ref('#1877F2')

// ─── Post Form ───
const postForm = ref({
  content: '',
  header: '',
  tagline: '',
  link: '',
  propertyId: null as number | null,
  scheduledFor: '',
  postType: 'listing',
})
const postError = ref('')
const postSuccess = ref('')

const postTypes = [
  { label: 'Property Listing', value: 'listing' },
  { label: 'Campaign / Promo', value: 'campaign' },
  { label: 'Custom Post', value: 'custom' },
]

// ─── Connect Form ───
const connectMethod = ref('user_token')
const connectError = ref('')
const showToken = ref(false)
const connectForm = ref({ pageId: '', pageName: '', pageAccessToken: '', userAccessToken: '', userName: '' })

// ─── Media ───
const logoFile = ref<File | null>(null)
const logoPreview = ref('')
const imageFiles = ref<File[]>([])
const imagePreviews = ref<string[]>([])
const videoFile = ref<File | null>(null)
const videoPreview = ref('')

function onLogoChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  logoFile.value = f
  logoPreview.value = URL.createObjectURL(f)
}
function removeLogo() {
  logoFile.value = null
  logoPreview.value = ''
}

function onImagesChange(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files) return
  const remaining = 10 - imagePreviews.value.length
  for (let i = 0; i < Math.min(files.length, remaining); i++) {
    imageFiles.value.push(files[i]!)
    imagePreviews.value.push(URL.createObjectURL(files[i]!))
  }
  ;(e.target as HTMLInputElement).value = ''
}
function removeImage(idx: number) {
  imageFiles.value.splice(idx, 1)
  imagePreviews.value.splice(idx, 1)
  if (activeImageIndex.value >= imagePreviews.value.length) activeImageIndex.value = Math.max(0, imagePreviews.value.length - 1)
}

function onVideoChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  videoFile.value = f
  videoPreview.value = URL.createObjectURL(f)
}
function removeVideo() {
  videoFile.value = null
  videoPreview.value = ''
}

// ─── Template Styles ───
function getTemplateThumbStyle(id: string) {
  const c = selectedColor.value
  switch (id) {
    case 'plain':         return { background: '#fff', border: '1px solid #e0e0e0' }
    case 'glassmorphism': return { background: 'linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.05))', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)', backgroundColor: c + '33' }
    case 'gradient':      return { background: `linear-gradient(135deg, ${c}, ${c}cc)`, color: '#fff' }
    case 'bold':          return { background: '#1a1a1a', color: '#fff' }
    case 'minimal':       return { background: '#fafafa', border: `2px solid ${c}33` }
    case 'elegant':       return { background: '#faf8f5', borderBottom: `3px solid ${c}` }
    default:              return {}
  }
}

function getTemplateStyle() {
  const c = selectedColor.value
  switch (selectedTemplate.value) {
    case 'plain':         return { background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e8e8e8' }
    case 'glassmorphism': return { background: `linear-gradient(135deg, ${c}18, ${c}08)`, backdropFilter: 'blur(20px)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.4)', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }
    case 'gradient':      return { background: `linear-gradient(135deg, ${c}, ${c}bb)`, padding: '28px', borderRadius: '16px', color: '#fff' }
    case 'bold':          return { background: '#111', padding: '28px', borderRadius: '14px', color: '#fff' }
    case 'minimal':       return { background: '#fff', padding: '28px', borderRadius: '8px', border: `1.5px solid ${c}44` }
    case 'elegant':       return { background: 'linear-gradient(180deg, #faf8f5, #f5f0ea)', padding: '28px', borderRadius: '12px', borderBottom: `4px solid ${c}` }
    default:              return {}
  }
}

function getTemplateTextClass() {
  switch (selectedTemplate.value) {
    case 'elegant': return 'font-serif'
    case 'bold': return 'font-weight-black text-uppercase'
    default: return 'font-weight-bold'
  }
}
function getTemplateTaglineClass() {
  switch (selectedTemplate.value) {
    case 'elegant': return 'font-italic text-body-2'
    case 'bold': return 'text-uppercase text-caption letter-spacing-2'
    default: return 'text-body-2'
  }
}
function getTemplateBodyClass() {
  switch (selectedTemplate.value) {
    case 'elegant': return 'text-body-2 font-weight-light'
    case 'bold': return 'text-body-2'
    default: return 'text-body-2'
  }
}

function getHeaderColor() {
  const t = selectedTemplate.value
  if (t === 'gradient' || t === 'bold') return '#fff'
  if (t === 'elegant') return '#2c2c2c'
  return selectedColor.value
}
function getTaglineColor() {
  const t = selectedTemplate.value
  if (t === 'gradient' || t === 'bold') return 'rgba(255,255,255,0.8)'
  return '#666'
}
function getBodyColor() {
  const t = selectedTemplate.value
  if (t === 'gradient' || t === 'bold') return 'rgba(255,255,255,0.9)'
  return '#444'
}

// ─── Formatting ───
const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const formatDateTime = (d: string) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
const getPostStatusColor = (s: string) => ({ posted: 'success', scheduled: 'info', draft: 'warning', failed: 'error' } as any)[s] || 'grey'
const getPostIcon = (s: string) => ({ posted: 'mdi-check', scheduled: 'mdi-clock', draft: 'mdi-pencil', failed: 'mdi-alert' } as any)[s] || 'mdi-post'

// ─── Actions ───
function connectFacebook() { showConnectDialog.value = true }

async function submitConnect() {
  connecting.value = true; connectError.value = ''
  try {
    const token = connectMethod.value === 'user_token' ? connectForm.value.userAccessToken : connectForm.value.pageAccessToken
    if (!token) { connectError.value = 'Please enter an access token.'; return }
    await $fetch('/api/admin/facebook/connect', {
      method: 'POST', headers: getAuthHeaders(),
      body: { accessToken: token, pageAccessToken: connectMethod.value === 'page_token' ? token : undefined, pageId: connectMethod.value === 'page_token' ? connectForm.value.pageId : undefined, pageName: connectForm.value.pageName || undefined, userName: connectForm.value.userName || undefined }
    })
    showConnectDialog.value = false; connectError.value = ''
    connectForm.value = { pageId: '', pageName: '', pageAccessToken: '', userAccessToken: '', userName: '' }
    await loadStatus(); await loadPosts()
  } catch (e: any) { connectError.value = e.data?.message || e.message || 'Connection failed' }
  finally { connecting.value = false }
}

async function testConnection() {
  testing.value = true; testResults.value = null
  try { testResults.value = await $fetch('/api/admin/facebook/test', { method: 'POST', headers: getAuthHeaders() }) as any }
  catch (e: any) { testResults.value = { success: false, advice: [e.data?.message || e.message || 'Test failed'], results: {} } }
  finally { testing.value = false }
}

async function disconnectFacebook() {
  await $fetch('/api/admin/facebook/disconnect', { method: 'POST', headers: getAuthHeaders() })
  await loadStatus()
}

function onPropertySelected(id: number) {
  const prop = availableProperties.value.find((p: any) => p.id === id)
  if (prop) {
    postForm.value.header = prop.title || prop.address || ''
    postForm.value.tagline = `${prop.beds} bed · ${prop.baths} bath · ${prop.sqft?.toLocaleString() || ''} sqft`
    postForm.value.content = `$${prop.price?.toLocaleString()}\n\n${prop.description?.substring(0, 300) || ''}`
    postForm.value.link = `${window.location.origin}/properties/${prop.id}`
  }
}

async function publishPost() {
  if (!postForm.value.content && !postForm.value.header) return
  posting.value = true; postError.value = ''; postSuccess.value = ''
  try {
    // Build the full message from template fields
    const parts: string[] = []
    if (postForm.value.header) parts.push(postForm.value.header)
    if (postForm.value.tagline) parts.push(postForm.value.tagline)
    if (postForm.value.content) parts.push(postForm.value.content)
    const fullContent = parts.join('\n\n')

    const res = await $fetch('/api/admin/facebook/posts', {
      method: 'POST', headers: getAuthHeaders(),
      body: { ...postForm.value, content: fullContent }
    }) as any
    if (res.success) {
      postSuccess.value = res.message || 'Posted successfully!'
      postForm.value = { content: '', header: '', tagline: '', link: '', propertyId: null, scheduledFor: '', postType: 'listing' }
      imagePreviews.value = []; imageFiles.value = []; removeLogo(); removeVideo()
    } else { postError.value = res.message || 'Failed to post' }
    await loadPosts(); await loadStatus()
  } catch (e: any) { postError.value = e.data?.message || e.message || 'Failed to post' }
  finally { posting.value = false }
}

async function saveDraft() {
  posting.value = true
  try {
    const parts: string[] = []
    if (postForm.value.header) parts.push(postForm.value.header)
    if (postForm.value.tagline) parts.push(postForm.value.tagline)
    if (postForm.value.content) parts.push(postForm.value.content)
    await $fetch('/api/admin/facebook/posts', { method: 'POST', headers: getAuthHeaders(), body: { ...postForm.value, content: parts.join('\n\n'), scheduledFor: undefined } })
    await loadPosts()
  } finally { posting.value = false }
}

async function deletePost(id: number) {
  try {
    await $fetch(`/api/admin/facebook/posts?id=${id}`, { method: 'DELETE', headers: getAuthHeaders() })
    await loadPosts(); await loadStatus()
  } catch (e) { console.error('Delete failed:', e) }
}

async function clearAllPosts() {
  clearing.value = true
  try {
    await $fetch('/api/admin/facebook/posts', { method: 'DELETE', headers: getAuthHeaders() })
    showClearDialog.value = false
    await loadPosts(); await loadStatus()
  } finally { clearing.value = false }
}

async function loadStatus() {
  try { fbStatus.value = await $fetch('/api/admin/facebook/status', { headers: getAuthHeaders() }) as any }
  catch (e) { console.error('Error loading FB status:', e) }
}
async function loadPosts() {
  try {
    const params = postFilter.value !== 'all' ? `?status=${postFilter.value}` : ''
    const res = await $fetch(`/api/admin/facebook/posts${params}`, { headers: getAuthHeaders() }) as any
    posts.value = res.posts || []
  } catch (e) { console.error('Error loading posts:', e) }
}
async function loadProperties() {
  try {
    const res = await $fetch('/api/admin/properties?limit=100', { headers: getAuthHeaders() }) as any
    availableProperties.value = (res.properties || []).map((p: any) => ({ ...p, displayName: `${p.address}, ${p.city} - $${p.price?.toLocaleString()}` }))
  } catch (e) { console.error('Error loading properties:', e) }
}

onMounted(() => { loadStatus(); loadPosts(); loadProperties() })
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;600;700;900&display=swap');

.admin-facebook { background-color: #fcfcfb; font-family: 'Inter', sans-serif; min-height: 100vh; }
.display-serif { font-family: 'Playfair Display', serif; }
.font-serif { font-family: 'Playfair Display', serif !important; }
.text-gold { color: #8c734b; }
.letter-spacing-2 { letter-spacing: 2px; }
.premium-accent-bar { width: 40px; height: 4px; background: #8c734b; border-radius: 2px; }
.premium-action-btn { border-radius: 12px !important; text-transform: none !important; font-weight: 700 !important; }

.section-card, .connection-card, .stat-card-premium {
  border-radius: 20px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  background: white !important;
}

/* Template Grid */
.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
}
.template-thumb {
  cursor: pointer;
  transition: all 0.2s ease;
}
.template-thumb__preview {
  height: 72px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  overflow: hidden;
}
.template-thumb__label {
  font-size: 11px;
  font-weight: 600;
  opacity: 0.7;
}
.template-thumb--active .template-thumb__preview {
  box-shadow: 0 0 0 3px currentColor, 0 4px 12px rgba(0,0,0,0.15);
  transform: translateY(-2px);
}

/* Color Palette */
.color-palette { display: flex; gap: 10px; flex-wrap: wrap; }
.color-swatch {
  width: 36px; height: 36px; border-radius: 50%; border: 3px solid transparent;
  cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 6px rgba(0,0,0,0.12);
}
.color-swatch:hover { transform: scale(1.15); }
.color-swatch--active { border-color: #333; transform: scale(1.2); box-shadow: 0 4px 12px rgba(0,0,0,0.25); }

/* Media Thumbs */
.media-thumb-row { display: flex; flex-wrap: wrap; gap: 10px; }
.media-thumb {
  position: relative; width: 80px; height: 80px; border-radius: 10px;
  overflow: hidden; border: 1px solid #e8e8e8; background: #fafafa;
}
.media-thumb--add {
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; border: 2px dashed #ccc; background: transparent;
  transition: all 0.2s; 
}
.media-thumb--add:hover { border-color: #999; background: #f5f5f5; }
.media-thumb__img { width: 100%; height: 100%; object-fit: cover; }
.media-thumb__remove {
  position: absolute !important; top: 2px; right: 2px; z-index: 2;
  width: 20px !important; height: 20px !important;
}
.media-thumb--video { position: relative; }
.media-thumb__play {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  pointer-events: none; text-shadow: 0 2px 8px rgba(0,0,0,0.5);
}

/* Sticky Preview */
.sticky-preview { position: sticky; top: 80px; }

/* Facebook Frame */
.fb-frame {
  background: #fff; border-radius: 12px; padding: 16px;
  border: 1px solid #ddd; box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.fb-link-bar {
  background: #f0f2f5; border-radius: 6px; padding: 8px 12px;
  display: flex; align-items: center;
}
.fb-reactions { display: flex; justify-content: space-between; align-items: center; }

/* Template Render */
.template-render { transition: all 0.35s ease; min-height: 120px; }
.template-logo {
  width: 48px; height: 48px; border-radius: 50%; object-fit: cover;
  margin-bottom: 12px; border: 2px solid; box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.template-header { font-size: 20px; line-height: 1.3; margin-bottom: 6px; }
.template-tagline { margin-bottom: 10px; opacity: 0.85; }
.template-description { white-space: pre-wrap; line-height: 1.6; }
.template-images { border-radius: 10px; overflow: hidden; }
.template-main-image { width: 100%; max-height: 220px; object-fit: cover; border-radius: 10px; }
.template-image-dots { display: flex; justify-content: center; gap: 6px; margin-top: 8px; }
.dot {
  width: 8px; height: 8px; border-radius: 50%; background: #ccc; cursor: pointer;
  transition: all 0.2s;
}
.dot--active { background: #333; transform: scale(1.3); }

.list-item-hover:hover { background: #f9f9f9; }
</style>
