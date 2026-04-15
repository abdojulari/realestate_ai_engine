<template>
  <Transition name="flash-banner">
    <div v-if="newsItems.length > 0" class="flash-news-banner">
      <div class="flash-news-inner">
        <!-- Label -->
        <div class="flash-label">
          <v-icon size="16" class="flash-icon">mdi-lightning-bolt</v-icon>
          <span>BREAKING</span>
        </div>

        <!-- Headlines carousel -->
        <div class="flash-content">
          <TransitionGroup name="headline-slide" tag="div" class="headline-wrapper">
            <div
              v-for="(item, idx) in newsItems"
              v-show="idx === activeIndex"
              :key="item.id"
              class="headline-item"
            >
              <NuxtLink
                :to="item.ctaUrl || `/news/${item.slug}`"
                class="headline-link"
                :target="isExternalUrl(item.ctaUrl) ? '_blank' : undefined"
              >
                <span class="headline-text">{{ item.headline }}</span>
                <v-btn
                  v-if="item.ctaLabel"
                  size="x-small"
                  variant="outlined"
                  class="cta-btn ml-3"
                  :append-icon="isExternalUrl(item.ctaUrl) ? 'mdi-open-in-new' : 'mdi-arrow-right'"
                >
                  {{ item.ctaLabel }}
                </v-btn>
                <v-icon
                  v-else
                  size="16"
                  class="read-more-icon ml-2"
                >
                  mdi-arrow-right
                </v-icon>
              </NuxtLink>
            </div>
          </TransitionGroup>
        </div>

        <!-- Navigation (only if multiple items) -->
        <div v-if="newsItems.length > 1" class="flash-nav">
          <button class="nav-btn" aria-label="Previous" @click="prev">
            <v-icon size="18">mdi-chevron-left</v-icon>
          </button>
          <span class="nav-counter">{{ activeIndex + 1 }}/{{ newsItems.length }}</span>
          <button class="nav-btn" aria-label="Next" @click="next">
            <v-icon size="18">mdi-chevron-right</v-icon>
          </button>
        </div>

        <!-- Close -->
        <button class="close-btn" aria-label="Dismiss" @click="dismiss">
          <v-icon size="18">mdi-close</v-icon>
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
interface FlashNewsItem {
  id: number
  headline: string
  slug: string
  ctaLabel: string | null
  ctaUrl: string | null
}

const newsItems = ref<FlashNewsItem[]>([])
const activeIndex = ref(0)
const dismissed = ref(false)
let autoplayTimer: ReturnType<typeof setInterval> | null = null

const AUTOPLAY_MS = 5 * 60 * 1000

function isExternalUrl(url: string | null): boolean {
  if (!url) return false
  return url.startsWith('http://') || url.startsWith('https://')
}

function next() {
  activeIndex.value = (activeIndex.value + 1) % newsItems.value.length
  resetAutoplay()
}

function prev() {
  activeIndex.value = (activeIndex.value - 1 + newsItems.value.length) % newsItems.value.length
  resetAutoplay()
}

function dismiss() {
  dismissed.value = true
  newsItems.value = []
  stopAutoplay()
}

function startAutoplay() {
  stopAutoplay()
  if (newsItems.value.length <= 1) return
  autoplayTimer = setInterval(() => {
    activeIndex.value = (activeIndex.value + 1) % newsItems.value.length
  }, AUTOPLAY_MS)
}

function stopAutoplay() {
  if (autoplayTimer) {
    clearInterval(autoplayTimer)
    autoplayTimer = null
  }
}

function resetAutoplay() {
  startAutoplay()
}

async function fetchFlashNews() {
  try {
    const data: any = await $fetch('/api/flash-news')
    newsItems.value = data.items || []
    if (newsItems.value.length > 0) {
      startAutoplay()
    }
  } catch {
    // Silently fail — banner just won't show
  }
}

onMounted(() => {
  if (!dismissed.value) {
    fetchFlashNews()
  }
})

onUnmounted(stopAutoplay)
</script>

<style scoped>
.flash-news-banner {
  width: 100%;
  background: rgba(10, 10, 12, 0.88);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid rgba(201, 169, 110, 0.2);
  position: relative;
  z-index: 100;
  height: 52px;
  display: flex;
  align-items: center;
}

.flash-news-inner {
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 16px;
  height: 100%;
}

.flash-label {
  display: flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, #C9A96E 0%, #8B7355 100%);
  color: #fff;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.5px;
  white-space: nowrap;
  flex-shrink: 0;
}

.flash-icon {
  color: #fff;
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.flash-content {
  flex: 1;
  overflow: hidden;
  position: relative;
  min-width: 0;
}

.headline-wrapper {
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
}

.headline-item {
  width: 100%;
}

.headline-link {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.92);
  transition: color 0.2s;
}

.headline-link:hover {
  color: #C9A96E;
}

.headline-link:hover .read-more-icon {
  color: #C9A96E;
  transform: translateX(3px);
}

.headline-text {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}

.cta-btn {
  color: #C9A96E !important;
  border-color: rgba(201, 169, 110, 0.4) !important;
  font-size: 11px !important;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}

.cta-btn:hover {
  background: rgba(201, 169, 110, 0.15) !important;
  border-color: #C9A96E !important;
}

.read-more-icon {
  color: rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
  transition: all 0.2s;
}

.flash-nav {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s;
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(201, 169, 110, 0.4);
  color: #C9A96E;
}

.nav-counter {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  min-width: 30px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.close-btn:hover {
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.1);
}

/* Transition: banner enter/leave */
.flash-banner-enter-active,
.flash-banner-leave-active {
  transition: all 0.4s ease;
}

.flash-banner-enter-from {
  opacity: 0;
  transform: translateY(-100%);
}

.flash-banner-leave-to {
  opacity: 0;
  height: 0;
  overflow: hidden;
}

/* Transition: headline slide */
.headline-slide-enter-active,
.headline-slide-leave-active {
  transition: all 0.5s ease;
}

.headline-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.headline-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
  position: absolute;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .flash-news-inner {
    padding: 0 12px;
    gap: 8px;
  }

  .flash-label span {
    display: none;
  }

  .flash-label {
    padding: 4px 8px;
  }

  .headline-text {
    font-size: 13px;
  }

  .cta-btn {
    display: none !important;
  }

  .nav-counter {
    display: none;
  }
}
</style>
