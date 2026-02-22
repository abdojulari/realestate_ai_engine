<template>
  <v-card class="section-card" elevation="0">
    <v-card-title class="pa-6">
      <v-icon class="mr-2">mdi-pencil-ruler</v-icon>
      <span class="display-serif text-h5">Compose Post</span>
    </v-card-title>
    <v-divider class="opacity-10" />
    <v-card-text class="pa-6">
      <v-row dense>
        <v-col cols="12" sm="6">
          <v-select v-model="form.postType" :items="postTypes" item-title="label" item-value="value" label="Post Type" variant="outlined" density="compact" />
        </v-col>
        <v-col cols="12" sm="6">
          <v-autocomplete v-if="form.postType === 'listing'" v-model="form.propertyId" :items="properties" item-title="displayName" item-value="id" label="Select Property" variant="outlined" density="compact" @update:model-value="$emit('property-selected', $event)" />
        </v-col>
      </v-row>

      <v-text-field v-model="form.header" label="Header / Title" variant="outlined" density="compact" class="mt-2" placeholder="e.g. Stunning Home in Edmonton" />
      <v-text-field v-if="form.postType === 'listing'" v-model="form.listingPrice" label="Listing Price" variant="outlined" density="compact" class="mt-2" placeholder="e.g. $710,000" prepend-inner-icon="mdi-currency-usd" />
      <v-text-field v-model="form.tagline" label="Tagline" variant="outlined" density="compact" class="mt-2" placeholder="e.g. Your Dream Home Awaits" />
      <v-textarea v-model="form.content" label="Description / Body" variant="outlined" rows="4" density="compact" class="mt-2" placeholder="Write your post description..." />
      <v-row dense class="mt-2">
        <v-col cols="12" sm="6">
          <v-text-field v-model="form.link" label="Link (optional)" variant="outlined" density="compact" prepend-inner-icon="mdi-link" />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field v-model="form.scheduledFor" label="Schedule (optional)" type="datetime-local" variant="outlined" density="compact" prepend-inner-icon="mdi-clock" />
        </v-col>
      </v-row>
      <v-row dense class="mt-2">
        <v-col cols="12">
          <v-text-field v-model="form.ctaText" label="Call to Action" variant="outlined" density="compact" placeholder="e.g. What are you waiting for? Reach out now." prepend-inner-icon="mdi-bullhorn" />
        </v-col>
        <v-col cols="12">
          <v-text-field v-model="form.contactInfo" label="Contact Info" variant="outlined" density="compact" placeholder="e.g. 647-563-7235 | your@email.com" prepend-inner-icon="mdi-card-account-phone" />
        </v-col>
      </v-row>

      <!-- Media Uploads -->
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
            <v-btn icon size="x-small" color="error" variant="flat" class="media-thumb__remove" @click="$emit('logo-remove')"><v-icon size="14">mdi-close</v-icon></v-btn>
          </div>
        </div>
        <v-btn v-else variant="tonal" size="small" prepend-icon="mdi-upload" @click="logoInput?.click()">Upload Logo</v-btn>
        <input ref="logoInput" type="file" accept="image/*" class="d-none" @change="(e: Event) => $emit('logo-change', e)" />
      </div>

      <!-- Images -->
      <div class="mb-4">
        <div class="text-caption font-weight-bold mb-2 text-medium-emphasis">IMAGES <span class="font-weight-regular">(up to 10)</span></div>
        <div class="media-thumb-row">
          <div v-for="(img, i) in imagePreviews" :key="i" class="media-thumb">
            <img :src="img" class="media-thumb__img" />
            <v-btn icon size="x-small" color="error" variant="flat" class="media-thumb__remove" @click="$emit('image-remove', i)"><v-icon size="14">mdi-close</v-icon></v-btn>
          </div>
          <div v-if="imagePreviews.length < 10" class="media-thumb media-thumb--add" @click="imageInput?.click()">
            <v-icon size="24" color="grey">mdi-plus</v-icon>
          </div>
        </div>
        <input ref="imageInput" type="file" accept="image/*" multiple class="d-none" @change="(e: Event) => $emit('images-change', e)" />
      </div>

      <!-- Video -->
      <div class="mb-2">
        <div class="text-caption font-weight-bold mb-2 text-medium-emphasis">VIDEO</div>
        <div v-if="videoPreview" class="media-thumb-row">
          <div class="media-thumb media-thumb--video">
            <video :src="videoPreview" class="media-thumb__img" muted />
            <v-icon class="media-thumb__play" size="28" color="white">mdi-play-circle</v-icon>
            <v-btn icon size="x-small" color="error" variant="flat" class="media-thumb__remove" @click="$emit('video-remove')"><v-icon size="14">mdi-close</v-icon></v-btn>
          </div>
        </div>
        <v-btn v-else variant="tonal" size="small" prepend-icon="mdi-video-plus" @click="videoInput?.click()">Upload Video</v-btn>
        <input ref="videoInput" type="file" accept="video/*" class="d-none" @change="(e: Event) => $emit('video-change', e)" />
      </div>
    </v-card-text>

    <v-divider class="opacity-10" />
    <v-card-actions class="pa-6">
      <v-spacer />
      <v-btn variant="tonal" @click="$emit('save-draft')" :loading="savingDraft">Save Draft</v-btn>
      <v-btn color="#1877F2" variant="flat" @click="$emit('publish')" :loading="publishing" prepend-icon="mdi-send">
        {{ form.scheduledFor ? 'Schedule' : 'Post Now' }}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  form: any
  postTypes: Array<{ label: string; value: string }>
  properties: any[]
  logoPreview: string
  imagePreviews: string[]
  videoPreview: string
  publishing: boolean
  savingDraft: boolean
}>()

defineEmits<{
  publish: []
  'save-draft': []
  'property-selected': [id: number]
  'logo-change': [e: Event]
  'logo-remove': []
  'images-change': [e: Event]
  'image-remove': [idx: number]
  'video-change': [e: Event]
  'video-remove': []
}>()

const logoInput = ref<HTMLInputElement | null>(null)
const imageInput = ref<HTMLInputElement | null>(null)
const videoInput = ref<HTMLInputElement | null>(null)
</script>

<style scoped>
.media-thumb-row { display: flex; flex-wrap: wrap; gap: 10px; }
.media-thumb {
  position: relative; width: 80px; height: 80px; border-radius: 10px;
  overflow: hidden; border: 1px solid #e8e8e8; background: #fafafa;
}
.media-thumb--add {
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; border: 2px dashed #ccc; background: transparent; transition: all 0.2s;
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
</style>
