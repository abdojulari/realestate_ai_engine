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
      <FbConnectionStatus :status="fbStatus" @status-changed="handleStatusChanged" />

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

      <!-- Template Selector -->
      <FbTemplateSelector
        v-if="fbStatus.connected"
        :templates="templates"
        :color-palette="colorPalette"
        :selected-template="selectedTemplate"
        :selected-color="selectedColor"
        @update:template="selectedTemplate = $event"
        @update:color="selectedColor = $event"
      />

      <!-- Compose Post + Live Preview -->
      <v-row v-if="fbStatus.connected" class="mb-8">
        <v-col cols="12" md="7">
          <FbComposeForm
            :form="postForm"
            :post-types="postTypes"
            :properties="availableProperties"
            :logo-preview="logoPreview"
            :image-previews="imagePreviews"
            :video-preview="videoPreview"
            :publishing="publishing"
            :saving-draft="savingDraft"
            @publish="handlePublish"
            @save-draft="saveDraft"
            @property-selected="onPropertySelected"
            @logo-change="onLogoChange"
            @logo-remove="removeLogo"
            @images-change="onImagesChange"
            @image-remove="removeImage"
            @video-change="onVideoChange"
            @video-remove="removeVideo"
          />
        </v-col>
        <v-col cols="12" md="5">
          <FbLivePreview
            ref="previewRef"
            :form="postForm"
            :page-name="fbStatus.pageName"
            :selected-template="selectedTemplate"
            :selected-color="selectedColor"
            :logo-preview="logoPreview"
            :image-previews="imagePreviews"
            :active-image-index="activeImageIndex"
            @update:active-image-index="activeImageIndex = $event"
          />
        </v-col>
      </v-row>

      <!-- Post History -->
      <FbPostHistory
        v-if="fbStatus.connected"
        :posts="posts"
        :post-filter="postFilter"
        :clearing="clearing"
        @update:post-filter="(val: string) => { postFilter = val; loadPosts() }"
        @delete="deletePost"
        @clear-all="clearAllPosts"
      />

      <!-- Setup Guide -->
      <FbSetupGuide v-if="!fbStatus.connected" />
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({ layout: 'admin', middleware: ['admin'] })

const previewRef = ref<any>(null)

const route = useRoute()

const {
  fbStatus, posts, availableProperties, publishing, savingDraft,
  postFilter, activeImageIndex, postError, postSuccess, clearing,
  templates, selectedTemplate, colorPalette, selectedColor,
  postForm, postTypes,
  logoPreview, imagePreviews, videoPreview,
  onLogoChange, removeLogo, onImagesChange, removeImage, onVideoChange, removeVideo,
  onPropertySelected, prefillProperty, publishPost, saveDraft, deletePost, clearAllPosts,
  loadStatus, loadPosts, initialize,
} = useFacebookAdmin()

async function handleStatusChanged() {
  await loadStatus()
  await loadPosts()
}

async function handlePublish() {
  const templateImage = await previewRef.value?.captureTemplate() || null
  await publishPost(templateImage)
}

onMounted(async () => {
  await initialize()
  const pid = route.query.propertyId
  if (pid) await prefillProperty(Number(pid))
})
</script>

<style>
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
</style>
