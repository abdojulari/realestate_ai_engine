<template>
  <div class="blog-page">
    <!-- Hero Section -->
    <section class="blog-hero">
      <v-container>
        <v-row justify="center">
          <v-col cols="12" md="10" lg="8" class="text-center">
            <h1 class="display-serif text-h2 text-md-h1 mb-4">Insights & Stories</h1>
            <p class="text-subtitle-1 text-medium-emphasis mx-auto" style="max-width: 600px;">
              Expert advice, market insights, and tips to help you navigate the real estate journey
            </p>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Category Pills -->
    <section class="category-section py-6">
      <v-container>
        <div class="d-flex justify-center flex-wrap gap-2">
          <v-chip
            :variant="!selectedCategory ? 'flat' : 'outlined'"
            :color="!selectedCategory ? 'primary' : undefined"
            size="large"
            class="category-chip"
            @click="selectCategory(null)"
          >
            All Posts
          </v-chip>
          <v-chip
            v-for="cat in categories"
            :key="cat.id"
            :variant="selectedCategory === cat.slug ? 'flat' : 'outlined'"
            :color="selectedCategory === cat.slug ? cat.color : undefined"
            size="large"
            class="category-chip"
            @click="selectCategory(cat.slug)"
          >
            <v-icon start size="small">{{ cat.icon }}</v-icon>
            {{ cat.name }}
            <span class="text-caption ml-1">({{ cat.postCount }})</span>
          </v-chip>
        </div>
      </v-container>
    </section>

    <!-- Featured Posts -->
    <section v-if="!selectedCategory && featuredPosts.length > 0" class="featured-section py-8">
      <v-container>
        <h2 class="display-serif text-h4 mb-6">Featured</h2>
        <v-row>
          <v-col v-for="post in featuredPosts.slice(0, 3)" :key="post.id" cols="12" md="4">
            <NuxtLink :to="`/blog/${post.slug}`" class="text-decoration-none">
              <v-card class="featured-card h-100" elevation="0">
                <v-img
                  :src="post.coverImage || '/images/placeholder.jpg'"
                  :alt="post.coverImageAlt || post.title"
                  height="220"
                  cover
                  class="featured-image"
                >
                  <div class="featured-overlay">
                    <v-chip
                      v-if="post.category"
                      :color="post.category.color"
                      size="small"
                      variant="flat"
                      class="ma-3"
                    >
                      {{ post.category.name }}
                    </v-chip>
                  </div>
                </v-img>
                <v-card-text class="pa-4">
                  <h3 class="text-h6 font-weight-bold mb-2 post-title">{{ post.title }}</h3>
                  <p class="text-body-2 text-medium-emphasis mb-3 post-excerpt">
                    {{ post.excerpt || truncateText(post.content, 120) }}
                  </p>
                  <div class="d-flex align-center text-caption text-medium-emphasis">
                    <v-icon size="small" class="mr-1">mdi-calendar</v-icon>
                    {{ formatDate(post.publishedAt) }}
                    <v-icon size="small" class="ml-3 mr-1">mdi-clock-outline</v-icon>
                    {{ post.readTime || 5 }} min read
                  </div>
                </v-card-text>
              </v-card>
            </NuxtLink>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- All Posts Grid -->
    <section class="posts-section py-8">
      <v-container>
        <div class="d-flex justify-space-between align-center mb-6">
          <h2 class="display-serif text-h4">
            {{ selectedCategory ? getCategoryName(selectedCategory) : 'Latest Posts' }}
          </h2>
          <v-text-field
            v-model="searchQuery"
            prepend-inner-icon="mdi-magnify"
            placeholder="Search articles..."
            variant="outlined"
            density="compact"
            hide-details
            style="max-width: 300px;"
            clearable
            @keyup.enter="handleSearch"
            @click:clear="handleSearch"
          />
        </div>

        <!-- Loading State -->
        <v-row v-if="loading">
          <v-col v-for="i in 6" :key="i" cols="12" md="6" lg="4">
            <v-skeleton-loader type="image, article" />
          </v-col>
        </v-row>

        <!-- Posts Grid -->
        <v-row v-else-if="posts.length > 0">
          <v-col v-for="post in posts" :key="post.id" cols="12" md="6" lg="4">
            <NuxtLink :to="`/blog/${post.slug}`" class="text-decoration-none">
              <v-card class="post-card h-100" elevation="0">
                <v-img
                  :src="post.coverImage || '/images/placeholder.jpg'"
                  :alt="post.coverImageAlt || post.title"
                  height="200"
                  cover
                  class="post-image"
                />
                <v-card-text class="pa-4">
                  <div class="d-flex align-center mb-2">
                    <v-chip
                      v-if="post.category"
                      :color="post.category.color"
                      size="x-small"
                      variant="tonal"
                    >
                      {{ post.category.name }}
                    </v-chip>
                    <v-spacer />
                    <span class="text-caption text-medium-emphasis">
                      {{ post.readTime || 5 }} min
                    </span>
                  </div>
                  <h3 class="text-h6 font-weight-bold mb-2 post-title">{{ post.title }}</h3>
                  <p class="text-body-2 text-medium-emphasis post-excerpt">
                    {{ post.excerpt || truncateText(post.content, 100) }}
                  </p>
                  <div class="d-flex align-center mt-3">
                    <v-avatar v-if="post.author" size="32" class="mr-2">
                      <v-img v-if="post.author.avatar" :src="post.author.avatar" />
                      <span v-else class="text-caption">
                        {{ post.author.firstName?.[0] }}{{ post.author.lastName?.[0] }}
                      </span>
                    </v-avatar>
                    <div>
                      <div v-if="post.author" class="text-caption font-weight-medium">
                        {{ post.author.firstName }} {{ post.author.lastName }}
                      </div>
                      <div class="text-caption text-medium-emphasis">
                        {{ formatDate(post.publishedAt) }}
                      </div>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </NuxtLink>
          </v-col>
        </v-row>

        <!-- No Posts -->
        <div v-else class="text-center py-16">
          <v-icon size="80" color="grey-lighten-1">mdi-post-outline</v-icon>
          <h3 class="text-h5 mt-4">No posts found</h3>
          <p class="text-body-1 text-medium-emphasis">
            {{ searchQuery ? 'Try different search terms' : 'Check back soon for new content' }}
          </p>
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

    <!-- Newsletter CTA -->
    <section class="newsletter-section py-12">
      <v-container>
        <v-card class="newsletter-card mx-auto" max-width="700" elevation="0">
          <v-card-text class="text-center pa-8">
            <v-icon size="48" color="primary" class="mb-4">mdi-email-newsletter</v-icon>
            <h3 class="display-serif text-h4 mb-3">Stay Informed</h3>
            <p class="text-body-1 text-medium-emphasis mb-6">
              Get the latest real estate insights delivered to your inbox
            </p>
            <v-row justify="center">
              <v-col cols="12" sm="8">
                <v-text-field density="compact"
                  v-model="newsletterEmail"
                  placeholder="Your email address"
                  variant="outlined"
                  append-inner-icon="mdi-send"
                  hide-details
                  @click:append-inner="subscribeNewsletter"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-container>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// SEO Meta
useHead({
  title: 'Blog - Real Estate Insights & Tips',
  meta: [
    { name: 'description', content: 'Expert real estate advice, market insights, buying and selling tips from experienced professionals.' },
    { name: 'keywords', content: 'real estate blog, home buying tips, property investment, market analysis, selling guide' },
    { property: 'og:title', content: 'Blog - Real Estate Insights & Tips' },
    { property: 'og:description', content: 'Expert real estate advice, market insights, buying and selling tips.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' }
  ],
  link: [
    { rel: 'canonical', href: '/blog' }
  ]
})

const route = useRoute()
const router = useRouter()

// State
const loading = ref(true)
const posts = ref<any[]>([])
const featuredPosts = ref<any[]>([])
const categories = ref<any[]>([])
const selectedCategory = ref<string | null>(null)
const searchQuery = ref('')
const currentPage = ref(1)
const pagination = ref({
  page: 1,
  limit: 12,
  total: 0,
  totalPages: 0
})
const newsletterEmail = ref('')

// Format date
const formatDate = (date: string) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

// Truncate text
const truncateText = (text: string, length: number) => {
  if (!text) return ''
  const stripped = text.replace(/<[^>]*>/g, '').replace(/[#*`]/g, '')
  return stripped.length > length ? stripped.slice(0, length) + '...' : stripped
}

// Get category name
const getCategoryName = (slug: string) => {
  const cat = categories.value.find(c => c.slug === slug)
  return cat?.name || 'Posts'
}

// Fetch posts
const fetchPosts = async () => {
  loading.value = true
  
  try {
    const params: any = {
      page: currentPage.value,
      limit: 12
    }
    
    if (selectedCategory.value) {
      params.category = selectedCategory.value
    }
    
    if (searchQuery.value) {
      params.search = searchQuery.value
    }
    
    const queryString = new URLSearchParams(params).toString()
    const data: any = await $fetch(`/api/blog?${queryString}`)
    
    posts.value = data.posts || []
    pagination.value = data.pagination || pagination.value
  } catch (error) {
    console.error('Error fetching posts:', error)
  } finally {
    loading.value = false
  }
}

// Fetch featured posts
const fetchFeaturedPosts = async () => {
  try {
    const data: any = await $fetch('/api/blog/featured?limit=3')
    featuredPosts.value = data.posts || []
  } catch (error) {
    console.error('Error fetching featured posts:', error)
  }
}

// Fetch categories
const fetchCategories = async () => {
  try {
    const data: any = await $fetch('/api/blog/categories')
    categories.value = data.flat || []
  } catch (error) {
    console.error('Error fetching categories:', error)
  }
}

// Select category
const selectCategory = (slug: string | null) => {
  selectedCategory.value = slug
  currentPage.value = 1
  
  // Update URL
  if (slug) {
    router.push({ query: { category: slug } })
  } else {
    router.push({ query: {} })
  }
  
  fetchPosts()
}

// Handle search
const handleSearch = () => {
  currentPage.value = 1
  fetchPosts()
}

// Handle page change
const handlePageChange = (page: number) => {
  currentPage.value = page
  fetchPosts()
  
  // Scroll to top of posts section
  window.scrollTo({ top: 400, behavior: 'smooth' })
}

// Subscribe newsletter
const meta = useMetaPixel()
const subscribeNewsletter = async () => {
  if (!newsletterEmail.value) return

  const metaEventId = meta.newEventId()
  try {
    await $fetch('/api/newsletter/subscribe', {
      method: 'POST',
      body: { email: newsletterEmail.value, _metaEventId: metaEventId }
    })
    meta.trackSubscribe(
      { content_name: 'Newsletter', content_category: 'newsletter' },
      { eventId: metaEventId }
    )
    newsletterEmail.value = ''
    // Show success message
  } catch (error) {
    console.error('Newsletter error:', error)
  }
}

// Watch route for category query
watch(() => route.query.category, (newVal) => {
  selectedCategory.value = newVal as string || null
  fetchPosts()
}, { immediate: true })

// Initialize
onMounted(async () => {
  await Promise.all([
    fetchCategories(),
    fetchFeaturedPosts()
  ])
  
  // Check for category in query
  if (route.query.category) {
    selectedCategory.value = route.query.category as string
  }
  
  await fetchPosts()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600;700&display=swap');

.blog-page {
  font-family: 'Inter', sans-serif;
  background: #fcfcfb;
  min-height: 100vh;
}

.display-serif {
  font-family: 'Playfair Display', serif;
}

/* Hero */
.blog-hero {
  background: linear-gradient(135deg, #f8f7f4 0%, #fff 100%);
  padding: 80px 0 60px;
  border-bottom: 1px solid rgba(0,0,0,0.05);
}

/* Category Section */
.category-section {
  background: white;
  border-bottom: 1px solid rgba(0,0,0,0.05);
}

.category-chip {
  font-weight: 500;
  transition: all 0.2s;
}

.category-chip:hover {
  transform: translateY(-2px);
}

.gap-2 {
  gap: 8px;
}

/* Featured Section */
.featured-section {
  background: #f9f8f5;
}

.featured-card {
  border-radius: 16px !important;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(0,0,0,0.05);
  background: white !important;
}

.featured-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
}

.featured-image {
  position: relative;
}

.featured-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 40%);
}

/* Posts Grid */
.posts-section {
  background: white;
}

.post-card {
  border-radius: 12px !important;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(0,0,0,0.05);
  background: white !important;
}

.post-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.08);
}

.post-image {
  transition: transform 0.3s;
}

.post-card:hover .post-image {
  transform: scale(1.05);
}

.post-title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
}

.post-excerpt {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Newsletter */
.newsletter-section {
  background: #f9f8f5;
}

.newsletter-card {
  border-radius: 24px !important;
  border: 1px solid rgba(0,0,0,0.05);
  background: white !important;
}

/* Responsive */
@media (max-width: 960px) {
  .blog-hero {
    padding: 60px 0 40px;
  }
  
  .blog-hero h1 {
    font-size: 2rem !important;
  }
}
</style>
