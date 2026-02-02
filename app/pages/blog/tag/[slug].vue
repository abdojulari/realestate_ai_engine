<template>
  <div class="blog-tag-page">
    <!-- Tag Header -->
    <section class="tag-hero">
      <v-container>
        <v-row justify="center">
          <v-col cols="12" md="10" lg="8" class="text-center">
            <v-icon size="48" color="primary" class="mb-4">mdi-tag</v-icon>
            <h1 class="display-serif text-h2 mb-4">
              #{{ tagName }}
            </h1>
            <div class="text-body-2 text-medium-emphasis">
              {{ pagination.total }} {{ pagination.total === 1 ? 'article' : 'articles' }} tagged with "{{ tagName }}"
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Posts Grid -->
    <section class="posts-section py-10">
      <v-container>
        <!-- Loading -->
        <v-row v-if="loading">
          <v-col v-for="i in 6" :key="i" cols="12" md="6" lg="4">
            <v-skeleton-loader type="image, article" />
          </v-col>
        </v-row>

        <!-- Posts -->
        <v-row v-else-if="posts.length > 0">
          <v-col v-for="post in posts" :key="post.id" cols="12" md="6" lg="4">
            <NuxtLink :to="`/blog/${post.slug}`" class="text-decoration-none">
              <v-card class="post-card h-100" elevation="0">
                <v-img
                  :src="post.coverImage || '/images/placeholder.jpg'"
                  :alt="post.title"
                  height="200"
                  cover
                />
                <v-card-text class="pa-4">
                  <v-chip
                    v-if="post.category"
                    :color="post.category.color"
                    size="x-small"
                    variant="tonal"
                    class="mb-2"
                  >
                    {{ post.category.name }}
                  </v-chip>
                  <h3 class="text-h6 font-weight-bold mb-2 post-title">{{ post.title }}</h3>
                  <p class="text-body-2 text-medium-emphasis post-excerpt">
                    {{ post.excerpt || truncateText(post.content, 100) }}
                  </p>
                  <div class="d-flex align-center mt-3 text-caption text-medium-emphasis">
                    <v-icon size="small" class="mr-1">mdi-calendar</v-icon>
                    {{ formatDate(post.publishedAt) }}
                    <v-icon size="small" class="ml-3 mr-1">mdi-clock-outline</v-icon>
                    {{ post.readTime || 5 }} min
                  </div>
                </v-card-text>
              </v-card>
            </NuxtLink>
          </v-col>
        </v-row>

        <!-- No Posts -->
        <div v-else class="text-center py-16">
          <v-icon size="80" color="grey-lighten-1">mdi-post-outline</v-icon>
          <h3 class="text-h5 mt-4">No posts with this tag</h3>
          <NuxtLink to="/blog">
            <v-btn color="primary" class="mt-4">Browse All Posts</v-btn>
          </NuxtLink>
        </div>

        <!-- Pagination -->
        <div v-if="pagination.totalPages > 1" class="d-flex justify-center mt-8">
          <v-pagination
            v-model="currentPage"
            :length="pagination.totalPages"
            :total-visible="7"
            rounded
            @update:modelValue="handlePageChange"
          />
        </div>
      </v-container>
    </section>

    <!-- All Tags Section -->
    <section class="all-tags-section py-10">
      <v-container>
        <h2 class="display-serif text-h5 mb-4">All Tags</h2>
        <div class="d-flex flex-wrap gap-2">
          <NuxtLink
            v-for="tag in allTags"
            :key="tag.id"
            :to="`/blog/tag/${tag.slug}`"
            class="text-decoration-none"
          >
            <v-chip
              :variant="tag.slug === tagSlug ? 'flat' : 'outlined'"
              :color="tag.slug === tagSlug ? 'primary' : undefined"
              class="tag-chip"
            >
              {{ tag.name }}
              <span class="text-caption ml-1">({{ tag.postCount }})</span>
            </v-chip>
          </NuxtLink>
        </div>
      </v-container>
    </section>

    <!-- Back Link -->
    <section class="py-8 text-center">
      <NuxtLink to="/blog">
        <v-btn variant="outlined" prepend-icon="mdi-arrow-left">All Posts</v-btn>
      </NuxtLink>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const tagSlug = computed(() => route.params.slug as string)
const tagName = computed(() => tagSlug.value.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))

// State
const loading = ref(true)
const posts = ref<any[]>([])
const allTags = ref<any[]>([])
const currentPage = ref(1)
const pagination = ref({
  page: 1,
  limit: 12,
  total: 0,
  totalPages: 0
})

// SEO
useHead({
  title: `#${tagName.value} - Blog`,
  meta: [
    { name: 'description', content: `Browse articles tagged with ${tagName.value}` },
    { property: 'og:title', content: `#${tagName.value} - Blog` }
  ],
  link: [
    { rel: 'canonical', href: `/blog/tag/${tagSlug.value}` }
  ]
})

// Format helpers
const formatDate = (date: string) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const truncateText = (text: string, length: number) => {
  if (!text) return ''
  const stripped = text.replace(/<[^>]*>/g, '').replace(/[#*`]/g, '')
  return stripped.length > length ? stripped.slice(0, length) + '...' : stripped
}

// Fetch all tags
const fetchTags = async () => {
  try {
    const data: any = await $fetch('/api/blog/tags')
    allTags.value = data.tags || []
  } catch (error) {
    console.error('Error fetching tags:', error)
  }
}

// Fetch posts by tag
const fetchPosts = async () => {
  loading.value = true
  
  try {
    const params = new URLSearchParams({
      page: currentPage.value.toString(),
      limit: '12',
      tag: tagName.value
    })
    
    const data: any = await $fetch(`/api/blog?${params}`)
    posts.value = data.posts || []
    pagination.value = data.pagination || pagination.value
  } catch (error) {
    console.error('Error fetching posts:', error)
  } finally {
    loading.value = false
  }
}

// Handle page change
const handlePageChange = (page: number) => {
  currentPage.value = page
  fetchPosts()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Watch for slug changes
watch(tagSlug, () => {
  currentPage.value = 1
  fetchPosts()
})

onMounted(() => {
  fetchTags()
  fetchPosts()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600;700&display=swap');

.blog-tag-page {
  font-family: 'Inter', sans-serif;
  background: #fcfcfb;
  min-height: 100vh;
}

.display-serif {
  font-family: 'Playfair Display', serif;
}

.tag-hero {
  background: linear-gradient(135deg, #f8f7f4 0%, #fff 100%);
  padding: 80px 0 60px;
  border-bottom: 1px solid rgba(0,0,0,0.05);
}

.posts-section {
  background: white;
}

.all-tags-section {
  background: #f9f8f5;
}

.gap-2 {
  gap: 8px;
}

.tag-chip {
  transition: all 0.2s;
}

.tag-chip:hover {
  transform: translateY(-2px);
}

.post-card {
  border-radius: 12px !important;
  overflow: hidden;
  transition: all 0.3s;
  border: 1px solid rgba(0,0,0,0.05);
  background: white !important;
}

.post-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.08);
}

.post-title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-excerpt {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
