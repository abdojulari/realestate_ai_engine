<template>
  <div class="image-gallery">
    <!-- Main View -->
    <div class="gallery-main" @click="openFullscreen">
      <v-img
        :src="images[currentIndex]"
        :alt="`Property image ${currentIndex + 1}`"
        height="500"
        cover
        class="main-image"
      >
        <template v-slot:placeholder>
          <v-row class="fill-height ma-0" align="center" justify="center">
            <v-progress-circular indeterminate color="grey-lighten-5" />
          </v-row>
        </template>

        <!-- Navigation Arrows -->
        <v-btn
          v-if="images.length > 1"
          icon="mdi-chevron-left"
          variant="text"
          size="x-large"
          color="white"
          class="nav-btn prev-btn"
          @click.stop="prevImage"
        />
        <v-btn
          v-if="images.length > 1"
          icon="mdi-chevron-right"
          variant="text"
          size="x-large"
          color="white"
          class="nav-btn next-btn"
          @click.stop="nextImage"
        />

        <!-- Image Counter -->
        <div class="image-counter">
          {{ currentIndex + 1 }} / {{ images.length }}
        </div>
      </v-img>
    </div>

    <!-- Thumbnails -->
    <div v-if="showThumbnails && images.length > 1" class="gallery-thumbnails">
      <v-slide-group
        v-model="currentIndex"
        class="pa-2"
        selected-class="selected"
        show-arrows
      >
        <v-slide-group-item
          v-for="(image, index) in images"
          :key="index"
          v-slot="{ isSelected, toggle }"
        >
          <v-img
            :src="image"
            :alt="`Thumbnail ${index + 1}`"
            width="120"
            height="80"
            cover
            class="thumbnail mx-1"
            :class="{ 'selected': isSelected }"
            @click="selectImage(index)"
          >
            <template v-slot:placeholder>
              <v-row class="fill-height ma-0" align="center" justify="center">
                <v-progress-circular indeterminate color="grey-lighten-5" size="20" />
              </v-row>
            </template>
          </v-img>
        </v-slide-group-item>
      </v-slide-group>
    </div>

    <!-- Fullscreen Dialog -->
    <v-dialog
      v-model="showFullscreen"
      fullscreen
      :scrim="false"
      transition="dialog-bottom-transition"
    >
      <v-card>
        <!-- Toolbar -->
        <v-toolbar dark color="black">
          <v-btn
            icon="mdi-close"
            @click="showFullscreen = false"
          />
          <v-toolbar-title>Gallery</v-toolbar-title>
          <v-spacer />
          <div class="text-body-2">
            {{ currentFullscreenIndex + 1 }} / {{ images.length }}
          </div>
          <v-btn
            icon="mdi-download"
            @click="downloadImage"
          />
        </v-toolbar>

        <!-- Fullscreen Carousel -->
        <v-carousel
          v-model="currentFullscreenIndex"
          height="100vh"
          hide-delimiter-background
          show-arrows="hover"
          @update:model-value="currentIndex = $event"
        >
          <v-carousel-item
            v-for="(image, index) in images"
            :key="index"
            :src="image"
            cover
          >
            <template v-slot:placeholder>
              <v-row class="fill-height ma-0" align="center" justify="center">
                <v-progress-circular indeterminate color="grey-lighten-5" />
              </v-row>
            </template>
          </v-carousel-item>
        </v-carousel>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  images: {
    type: Array as () => string[],
    required: true
  },
  showThumbnails: {
    type: Boolean,
    default: true
  }
})

const currentIndex = ref(0)
const showFullscreen = ref(false)
const currentFullscreenIndex = ref(0)

const selectImage = (index: number) => {
  currentIndex.value = index
}

const prevImage = (event: Event) => {
  event.stopPropagation()
  currentIndex.value = (currentIndex.value - 1 + props.images.length) % props.images.length
}

const nextImage = (event: Event) => {
  event.stopPropagation()
  currentIndex.value = (currentIndex.value + 1) % props.images.length
}

const openFullscreen = () => {
  currentFullscreenIndex.value = currentIndex.value
  showFullscreen.value = true
}

const downloadImage = async () => {
  try {
    const image = props.images[currentFullscreenIndex.value]
    const response = await fetch(image)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `property-image-${currentFullscreenIndex.value + 1}.jpg`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  } catch (error) {
    console.error('Error downloading image:', error)
  }
}

// Handle keyboard navigation
onMounted(() => {
  const handleKeydown = (event: KeyboardEvent) => {
    if (showFullscreen.value) {
      if (event.key === 'ArrowLeft') {
        currentFullscreenIndex.value = (currentFullscreenIndex.value - 1 + props.images.length) % props.images.length
      } else if (event.key === 'ArrowRight') {
        currentFullscreenIndex.value = (currentFullscreenIndex.value + 1) % props.images.length
      } else if (event.key === 'Escape') {
        showFullscreen.value = false
      }
    }
  }

  window.addEventListener('keydown', handleKeydown)

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
  })
})
</script>

<style scoped>
.image-gallery {
  position: relative;
}

.gallery-main {
  position: relative;
  cursor: pointer;
}

.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.prev-btn {
  left: 16px;
}

.next-btn {
  right: 16px;
}

.gallery-main:hover .nav-btn {
  opacity: 1;
}

.image-counter {
  position: absolute;
  bottom: 16px;
  right: 16px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 14px;
}

.gallery-thumbnails {
  margin-top: 8px;
}

.thumbnail {
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.thumbnail:hover {
  opacity: 0.8;
}

.thumbnail.selected {
  border-color: var(--v-primary-base);
}

:deep(.v-carousel) {
  background: black;
}

:deep(.v-carousel__item) {
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.v-carousel__item img) {
  max-height: 100vh;
  max-width: 100%;
  object-fit: contain !important;
}
</style>
