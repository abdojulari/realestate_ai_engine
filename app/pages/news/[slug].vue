<template>
  <div class="flash-news-page">
    <!-- Loading -->
    <div v-if="loading" class="loading-container">
      <v-container>
        <v-skeleton-loader type="heading" class="mb-6" />
        <v-skeleton-loader type="paragraph@3" />
      </v-container>
    </div>

    <!-- Content -->
    <template v-else-if="item">
      <section class="news-hero">
        <div class="hero-bg">
          <v-container>
            <v-row justify="center">
              <v-col cols="12" md="10" lg="8">
                <NuxtLink to="/" class="back-link mb-6 d-inline-flex align-center">
                  <v-icon size="18" class="mr-1">mdi-arrow-left</v-icon>
                  Back to Home
                </NuxtLink>
                <div class="d-flex align-center mb-4">
                  <v-chip color="warning" variant="flat" size="small" class="mr-3">
                    <v-icon start size="14">mdi-lightning-bolt</v-icon>
                    Flash News
                  </v-chip>
                  <span class="text-caption" style="color: rgba(255,255,255,0.6)">
                    {{ formatDate(item.createdAt) }}
                  </span>
                </div>
                <h1 class="display-serif text-h3 text-md-h2 text-white mb-4">
                  {{ item.headline }}
                </h1>
              </v-col>
            </v-row>
          </v-container>
        </div>
      </section>

      <v-container class="py-12">
        <v-row justify="center">
          <v-col cols="12" md="10" lg="8">
            <v-card elevation="0" rounded="lg" class="pa-8 pa-md-12">
              <div class="news-content text-body-1" style="line-height: 1.8; white-space: pre-wrap;">{{ item.content }}</div>

              <div v-if="item.ctaUrl" class="mt-8">
                <v-btn
                  :href="item.ctaUrl"
                  :target="isExternal(item.ctaUrl) ? '_blank' : undefined"
                  color="primary"
                  size="large"
                  :append-icon="isExternal(item.ctaUrl) ? 'mdi-open-in-new' : 'mdi-arrow-right'"
                >
                  {{ item.ctaLabel || 'Learn More' }}
                </v-btn>
              </div>
            </v-card>

            <div class="text-center mt-8">
              <v-btn variant="outlined" to="/" prepend-icon="mdi-arrow-left">
                Back to Home
              </v-btn>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </template>

    <!-- Not Found -->
    <template v-else>
      <v-container class="py-16 text-center">
        <v-icon size="80" color="grey-lighten-2" class="mb-4">mdi-newspaper-variant-outline</v-icon>
        <h2 class="text-h5 mb-2">News Not Found</h2>
        <p class="text-medium-emphasis mb-6">This news item may have expired or been removed.</p>
        <v-btn to="/" color="primary" prepend-icon="mdi-home">Back to Home</v-btn>
      </v-container>
    </template>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const loading = ref(true)
const item = ref<any>(null)

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function isExternal(url: string | null): boolean {
  if (!url) return false
  return url.startsWith('http://') || url.startsWith('https://')
}

async function fetchItem() {
  loading.value = true
  try {
    const data: any = await $fetch(`/api/flash-news/${route.params.slug}`)
    item.value = data.item
  } catch {
    item.value = null
  } finally {
    loading.value = false
  }
}

useHead(() => ({
  title: item.value?.headline || 'News',
}))

onMounted(fetchItem)
</script>

<style scoped>
.flash-news-page {
  min-height: 80vh;
}

.news-hero {
  position: relative;
}

.hero-bg {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  padding: 60px 0 80px;
}

.back-link {
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
}

.back-link:hover {
  color: #C9A96E;
}

.display-serif {
  font-family: 'Playfair Display', Georgia, serif;
}

.news-content {
  color: rgba(0, 0, 0, 0.8);
}
</style>
