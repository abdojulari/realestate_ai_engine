<template>
  <div class="blog-post-page">
    <!-- Loading State -->
    <div v-if="status === 'pending'" class="loading-container">
      <v-container>
        <v-skeleton-loader type="image" height="400" class="mb-8" />
        <v-skeleton-loader type="heading, paragraph@3" />
      </v-container>
    </div>

    <!-- Post Content -->
    <template v-else-if="post">
      <!-- Hero Section -->
      <section class="post-hero">
        <v-img
          v-if="post.coverImage"
          :src="post.coverImage"
          :alt="post.coverImageAlt || post.title"
          height="450"
          cover
          class="hero-image"
        >
          <div class="hero-overlay">
            <v-container>
              <v-row justify="center">
                <v-col cols="12" md="10" lg="8">
                  <div class="hero-content">
                    <v-chip
                      v-if="post.category"
                      :color="post.category.color"
                      variant="flat"
                      class="mb-4"
                    >
                      {{ post.category.name }}
                    </v-chip>
                    <h1 class="display-serif text-h3 text-md-h2 text-white mb-4">
                      {{ post.title }}
                    </h1>
                    <div class="d-flex align-center flex-wrap text-white">
                      <v-avatar v-if="post.author" size="44" class="mr-3">
                        <v-img v-if="post.author.avatar" :src="post.author.avatar" />
                        <span v-else class="text-body-1 font-weight-bold">
                          {{ post.author.firstName?.[0] }}{{ post.author.lastName?.[0] }}
                        </span>
                      </v-avatar>
                      <div v-if="post.author" class="mr-6">
                        <div class="text-body-2 font-weight-bold">
                          {{ post.author.firstName }} {{ post.author.lastName }}
                        </div>
                        <div class="text-caption opacity-80">Author</div>
                      </div>
                      <div class="d-flex align-center flex-wrap">
                        <span class="d-flex align-center mr-4">
                          <v-icon size="small" class="mr-1">mdi-calendar</v-icon>
                          {{ formatDate(post.publishedAt) }}
                        </span>
                        <span class="d-flex align-center mr-4">
                          <v-icon size="small" class="mr-1">mdi-clock-outline</v-icon>
                          {{ post.readTime || 5 }} min read
                        </span>
                        <span class="d-flex align-center">
                          <v-icon size="small" class="mr-1">mdi-eye</v-icon>
                          {{ post.views }} views
                        </span>
                      </div>
                    </div>
                  </div>
                </v-col>
              </v-row>
            </v-container>
          </div>
        </v-img>
        
        <!-- No Cover Image Fallback -->
        <div v-else class="hero-no-image">
          <v-container>
            <v-row justify="center">
              <v-col cols="12" md="10" lg="8">
                <v-chip
                  v-if="post.category"
                  :color="post.category.color"
                  variant="flat"
                  class="mb-4"
                >
                  {{ post.category.name }}
                </v-chip>
                <h1 class="display-serif text-h3 text-md-h2 mb-4">
                  {{ post.title }}
                </h1>
                <div class="d-flex align-center flex-wrap text-medium-emphasis">
                  <v-avatar v-if="post.author" size="44" color="primary" class="mr-3">
                    <v-img v-if="post.author.avatar" :src="post.author.avatar" />
                    <span v-else class="text-white font-weight-bold">
                      {{ post.author.firstName?.[0] }}{{ post.author.lastName?.[0] }}
                    </span>
                  </v-avatar>
                  <div v-if="post.author" class="mr-6">
                    <div class="text-body-2 font-weight-bold text-primary">
                      {{ post.author.firstName }} {{ post.author.lastName }}
                    </div>
                  </div>
                  <span class="d-flex align-center mr-4">
                    <v-icon size="small" class="mr-1">mdi-calendar</v-icon>
                    {{ formatDate(post.publishedAt) }}
                  </span>
                  <span class="d-flex align-center">
                    <v-icon size="small" class="mr-1">mdi-clock-outline</v-icon>
                    {{ post.readTime || 5 }} min read
                  </span>
                </div>
              </v-col>
            </v-row>
          </v-container>
        </div>
      </section>

      <!-- Article Content -->
      <section class="article-section py-12">
        <v-container>
          <v-row justify="center">
            <v-col cols="12" md="10" lg="8">
              <!-- Excerpt -->
              <p v-if="post.excerpt" class="excerpt text-h6 text-medium-emphasis mb-8">
                {{ post.excerpt }}
              </p>

              <!-- Main Content -->
              <article class="article-content" v-html="renderedContent"></article>

              <!-- Tags -->
              <div v-if="post.tags && post.tags.length > 0" class="tags-section mt-10 pt-6 border-top">
                <h4 class="text-subtitle-2 text-uppercase text-medium-emphasis mb-3">Tags</h4>
                <div class="d-flex flex-wrap gap-2">
                  <NuxtLink
                    v-for="tag in post.tags"
                    :key="tag"
                    :to="`/blog/tag/${encodeURIComponent(tag.toLowerCase().replace(/\s+/g, '-'))}`"
                    class="text-decoration-none"
                  >
                    <v-chip variant="outlined" class="tag-chip">
                      <v-icon start size="small">mdi-tag</v-icon>
                      {{ tag }}
                    </v-chip>
                  </NuxtLink>
                </div>
              </div>

              <!-- Share Section -->
              <div class="share-section mt-10 pt-6 border-top">
                <h4 class="text-subtitle-2 text-uppercase text-medium-emphasis mb-3">Share this article</h4>
                <div class="d-flex gap-2">
                  <v-btn
                    icon
                    variant="outlined"
                    color="primary"
                    @click="shareToTwitter"
                  >
                    <v-icon>mdi-twitter</v-icon>
                  </v-btn>
                  <v-btn
                    icon
                    variant="outlined"
                    color="primary"
                    @click="shareToFacebook"
                  >
                    <v-icon>mdi-facebook</v-icon>
                  </v-btn>
                  <v-btn
                    icon
                    variant="outlined"
                    color="primary"
                    @click="shareToLinkedIn"
                  >
                    <v-icon>mdi-linkedin</v-icon>
                  </v-btn>
                  <v-btn
                    icon
                    variant="outlined"
                    color="primary"
                    @click="copyLink"
                  >
                    <v-icon>mdi-link</v-icon>
                  </v-btn>
                </div>
              </div>

              <!-- Author Bio -->
              <div v-if="post.author && post.author.bio" class="author-section mt-10">
                <v-card class="author-card" elevation="0">
                  <v-card-text class="pa-6 d-flex align-start">
                    <v-avatar size="72" color="primary" class="mr-4">
                      <v-img v-if="post.author.avatar" :src="post.author.avatar" />
                      <span v-else class="text-h5 text-white font-weight-bold">
                        {{ post.author.firstName?.[0] }}{{ post.author.lastName?.[0] }}
                      </span>
                    </v-avatar>
                    <div>
                      <h4 class="text-h6 font-weight-bold mb-1">
                        {{ post.author.firstName }} {{ post.author.lastName }}
                      </h4>
                      <p class="text-body-2 text-medium-emphasis mb-0">
                        {{ post.author.bio }}
                      </p>
                    </div>
                  </v-card-text>
                </v-card>
              </div>
            </v-col>
          </v-row>
        </v-container>
      </section>

      <!-- Related Posts -->
      <section v-if="relatedPosts.length > 0" class="related-section py-12">
        <v-container>
          <h2 class="display-serif text-h4 mb-6">Related Articles</h2>
          <v-row>
            <v-col v-for="related in relatedPosts" :key="related.id" cols="12" md="4">
              <NuxtLink :to="`/blog/${related.slug}`" class="text-decoration-none">
                <v-card class="related-card h-100" elevation="0">
                  <v-img
                    :src="related.coverImage || '/images/placeholder.jpg'"
                    :alt="related.title"
                    height="180"
                    cover
                  />
                  <v-card-text class="pa-4">
                    <v-chip
                      v-if="related.category"
                      :color="related.category.color"
                      size="x-small"
                      variant="tonal"
                      class="mb-2"
                    >
                      {{ related.category.name }}
                    </v-chip>
                    <h3 class="text-body-1 font-weight-bold mb-2 related-title">
                      {{ related.title }}
                    </h3>
                    <div class="text-caption text-medium-emphasis">
                      {{ formatDate(related.publishedAt) }} · {{ related.readTime || 5 }} min read
                    </div>
                  </v-card-text>
                </v-card>
              </NuxtLink>
            </v-col>
          </v-row>
        </v-container>
      </section>

      <!-- Back to Blog -->
      <section class="back-section py-8 text-center">
        <NuxtLink to="/blog" class="text-decoration-none">
          <v-btn variant="outlined" size="large" prepend-icon="mdi-arrow-left">
            Back to Blog
          </v-btn>
        </NuxtLink>
      </section>
    </template>

    <!-- Not Found -->
    <div v-else class="not-found-container text-center py-16">
      <v-container>
        <v-icon size="80" color="grey-lighten-1">mdi-file-document-alert</v-icon>
        <h2 class="text-h4 mt-6">Post Not Found</h2>
        <p class="text-body-1 text-medium-emphasis mt-2">
          The article you're looking for doesn't exist or has been removed.
        </p>
        <NuxtLink to="/blog">
          <v-btn color="primary" class="mt-6">Browse All Posts</v-btn>
        </NuxtLink>
      </v-container>
    </div>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :timeout="2000">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'

const route = useRoute()
const slug = computed(() => route.params.slug as string)
const config = useRuntimeConfig()
const siteUrl = (config.public.siteUrl as string || '').replace(/\/$/, '')

// SSR-compatible data fetching — runs on server and client
const { data, status } = await useAsyncData(
  `blog-post-${slug.value}`,
  async () => {
    try {
      return await $fetch(`/api/blog/${slug.value}`)
    } catch (error) {
      console.error('Error fetching post:', error)
      return { post: null, relatedPosts: [] }
    }
  },
  { watch: [slug] }
)

const post = computed(() => (data.value as any)?.post || null)
const relatedPosts = computed(() => (data.value as any)?.relatedPosts || [])

// Return 404 status server-side when post is missing — prevents indexing of empty pages
if (import.meta.server && !post.value) {
  setResponseStatus(useRequestEvent()!, 404)
}

// Build absolute URL helper for SEO (crawlers need fully-qualified URLs)
const absoluteUrl = (path: string) => {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  if (!siteUrl) return path
  return `${siteUrl}${path.startsWith('/') ? '' : '/'}${path}`
}

const canonicalUrl = computed(() => {
  if (!post.value) return ''
  if (post.value.canonicalUrl) return absoluteUrl(post.value.canonicalUrl)
  return absoluteUrl(`/blog/${post.value.slug}`)
})

const ogImageUrl = computed(() => absoluteUrl(post.value?.ogImage || post.value?.coverImage || ''))

const snackbar = ref(false)
const snackbarText = ref('')

// SEO — reactive, renders during SSR because useAsyncData resolves server-side
useSeoMeta({
  title: () => post.value?.metaTitle || (post.value ? `${post.value.title} - Blog` : 'Blog'),
  description: () => post.value?.metaDescription || post.value?.excerpt || post.value?.title || '',
  keywords: () => (post.value?.metaKeywords || post.value?.tags || []).join(', '),
  ogTitle: () => post.value?.title || '',
  ogDescription: () => post.value?.metaDescription || post.value?.excerpt || '',
  ogImage: () => ogImageUrl.value,
  ogUrl: () => canonicalUrl.value,
  ogType: 'article',
  ogSiteName: 'Real Estate Portal',
  twitterCard: 'summary_large_image',
  twitterTitle: () => post.value?.title || '',
  twitterDescription: () => post.value?.metaDescription || post.value?.excerpt || '',
  twitterImage: () => ogImageUrl.value,
  articlePublishedTime: () => post.value?.publishedAt || '',
  articleModifiedTime: () => post.value?.updatedAt || '',
  articleAuthor: () => post.value?.author ? `${post.value.author.firstName} ${post.value.author.lastName}` : '',
  articleSection: () => post.value?.category?.name || '',
  articleTag: () => (post.value?.tags || []).join(', '),
  robots: () => post.value ? 'index, follow' : 'noindex, nofollow'
})

useHead({
  link: () => post.value && canonicalUrl.value ? [
    { rel: 'canonical', href: canonicalUrl.value }
  ] : [],
  script: () => post.value ? [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.value.title,
        description: post.value.excerpt || post.value.metaDescription,
        image: ogImageUrl.value || undefined,
        datePublished: post.value.publishedAt,
        dateModified: post.value.updatedAt,
        author: post.value.author ? {
          '@type': 'Person',
          name: `${post.value.author.firstName} ${post.value.author.lastName}`
        } : undefined,
        publisher: {
          '@type': 'Organization',
          name: 'Real Estate Portal',
          url: siteUrl || undefined
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': canonicalUrl.value
        },
        url: canonicalUrl.value
      })
    }
  ] : []
})

// Format date
const formatDate = (date: string) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

// Render markdown content
const renderedContent = computed(() => {
  if (!post.value?.content) return ''
  if (post.value.contentHtml) return post.value.contentHtml

  let content = post.value.content.trim()

  // Strip wrapping code fences (e.g. ```markdown ... ```)
  const codeFenceMatch = content.match(/^```\w*\n([\s\S]*?)\n```\s*$/)
  if (codeFenceMatch?.[1]) {
    content = codeFenceMatch[1]
  }

  try {
    return marked(content, { breaks: true })
  } catch {
    return post.value.content
  }
})

// Share functions
const getShareUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.href
  }
  return ''
}

const shareToTwitter = () => {
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(post.value.title)}&url=${encodeURIComponent(getShareUrl())}`
  window.open(url, '_blank')
}

const shareToFacebook = () => {
  const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl())}`
  window.open(url, '_blank')
}

const shareToLinkedIn = () => {
  const url = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(getShareUrl())}&title=${encodeURIComponent(post.value.title)}`
  window.open(url, '_blank')
}

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(getShareUrl())
    snackbarText.value = 'Link copied to clipboard!'
    snackbar.value = true
  } catch {
    snackbarText.value = 'Failed to copy link'
    snackbar.value = true
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600;700&display=swap');

.blog-post-page {
  font-family: 'Inter', sans-serif;
  background: #fcfcfb;
  min-height: 100vh;
}

.display-serif {
  font-family: 'Playfair Display', serif;
}

/* Hero */
.post-hero {
  position: relative;
}

.hero-image {
  position: relative;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 100%);
  display: flex;
  align-items: flex-end;
  padding-bottom: 60px;
}

.hero-content {
  max-width: 800px;
}

.hero-no-image {
  background: linear-gradient(135deg, #f8f7f4 0%, #fff 100%);
  padding: 80px 0;
  border-bottom: 1px solid rgba(0,0,0,0.05);
}

/* Article */
.article-section {
  background: white;
}

.excerpt {
  font-style: italic;
  line-height: 1.8;
  border-left: 4px solid #8c734b;
  padding-left: 24px;
}

.article-content {
  font-size: 1.1rem;
  line-height: 1.9;
  color: #333;
}

.article-content :deep(h1),
.article-content :deep(h2),
.article-content :deep(h3),
.article-content :deep(h4) {
  font-family: 'Playfair Display', serif;
  margin-top: 2rem;
  margin-bottom: 1rem;
  font-weight: 600;
}

.article-content :deep(h2) {
  font-size: 1.75rem;
}

.article-content :deep(h3) {
  font-size: 1.4rem;
}

.article-content :deep(p) {
  margin-bottom: 1.5rem;
}

.article-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 12px;
  margin: 2rem 0;
}

.article-content :deep(blockquote) {
  border-left: 4px solid #8c734b;
  padding-left: 24px;
  margin: 2rem 0;
  font-style: italic;
  color: #666;
}

.article-content :deep(code) {
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.9em;
}

.article-content :deep(pre) {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 20px;
  border-radius: 12px;
  overflow-x: auto;
  margin: 2rem 0;
}

.article-content :deep(pre code) {
  background: none;
  padding: 0;
}

.article-content :deep(ul),
.article-content :deep(ol) {
  margin-bottom: 1.5rem;
  padding-left: 1.5rem;
}

.article-content :deep(li) {
  margin-bottom: 0.5rem;
}

.article-content :deep(a) {
  color: #1976D2;
  text-decoration: underline;
}

/* Tags */
.border-top {
  border-top: 1px solid rgba(0,0,0,0.1);
}

.gap-2 {
  gap: 8px;
}

.tag-chip {
  transition: all 0.2s;
}

.tag-chip:hover {
  background: rgba(0,0,0,0.05);
}

/* Author */
.author-card {
  background: #f9f8f5 !important;
  border-radius: 16px !important;
}

/* Related */
.related-section {
  background: #f9f8f5;
}

.related-card {
  border-radius: 12px !important;
  overflow: hidden;
  transition: all 0.3s;
  border: 1px solid rgba(0,0,0,0.05);
  background: white !important;
}

.related-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.08);
}

.related-title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Back Section */
.back-section {
  background: white;
  border-top: 1px solid rgba(0,0,0,0.05);
}

/* Loading */
.loading-container,
.not-found-container {
  min-height: 60vh;
  display: flex;
  align-items: center;
}

/* Responsive */
@media (max-width: 960px) {
  .hero-overlay {
    padding-bottom: 40px;
  }
  
  .hero-content h1 {
    font-size: 1.75rem !important;
  }
  
  .article-content {
    font-size: 1rem;
  }
}
</style>
