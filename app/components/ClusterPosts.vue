<template>
  <section v-if="posts && posts.length > 0" class="cluster-posts-section">
    <v-container class="py-12">
      <div class="cluster-header mb-8">
        <div class="cluster-label mb-2">{{ label }}</div>
        <div class="d-flex align-end justify-space-between flex-wrap gap-3">
          <div>
            <h2 class="cluster-title">{{ title }}</h2>
            <p v-if="subtitle" class="cluster-subtitle mt-2">{{ subtitle }}</p>
          </div>
          <NuxtLink :to="`/blog/category/${categorySlug}`" class="text-decoration-none">
            <v-btn variant="text" color="primary" class="text-none">
              View all guides
              <v-icon end size="18">mdi-arrow-right</v-icon>
            </v-btn>
          </NuxtLink>
        </div>
        <div class="cluster-bar mt-4"></div>
      </div>

      <v-row>
        <v-col
          v-for="post in posts"
          :key="post.id"
          cols="12"
          md="6"
          lg="4"
        >
          <NuxtLink :to="`/blog/${post.slug}`" class="text-decoration-none">
            <v-card flat border class="cluster-card h-100">
              <v-img
                v-if="post.coverImage"
                :src="post.coverImage"
                :alt="post.coverImageAlt || post.title"
                height="200"
                cover
              />
              <div v-else class="cluster-card-fallback">
                <v-icon size="40" color="grey-lighten-1">mdi-file-document-outline</v-icon>
              </div>
              <v-card-text class="pa-5">
                <div v-if="post.category" class="cluster-card-category mb-2">
                  {{ post.category.name }}
                </div>
                <h3 class="cluster-card-title mb-2">{{ post.title }}</h3>
                <p v-if="post.excerpt" class="cluster-card-excerpt">
                  {{ truncate(post.excerpt, 120) }}
                </p>
                <div class="cluster-card-meta mt-3">
                  <v-icon size="14" class="mr-1">mdi-calendar-outline</v-icon>
                  {{ formatDate(post.publishedAt) }}
                  <span v-if="post.readTime" class="ml-3">
                    <v-icon size="14" class="mr-1">mdi-clock-outline</v-icon>
                    {{ post.readTime }} min read
                  </span>
                </div>
              </v-card-text>
            </v-card>
          </NuxtLink>
        </v-col>
      </v-row>
    </v-container>
  </section>
</template>

<script setup lang="ts">
interface ClusterPost {
  id: string | number
  slug: string
  title: string
  excerpt?: string | null
  coverImage?: string | null
  coverImageAlt?: string | null
  publishedAt?: string | Date | null
  readTime?: number | null
  category?: { id: number; name: string; slug: string } | null
}

const props = withDefaults(
  defineProps<{
    categorySlug: string
    title: string
    subtitle?: string
    label?: string
    limit?: number
  }>(),
  {
    subtitle: '',
    label: 'DEEP-DIVE GUIDES',
    limit: 6,
  }
)

// SSR-safe fetch so cluster links are visible to crawlers (this is the
// signal that turns the pillar + posts into a topic cluster for Google).
const { data } = await useAsyncData(
  `cluster-posts-${props.categorySlug}`,
  async () => {
    try {
      return await $fetch<{ posts: ClusterPost[] }>('/api/blog', {
        params: {
          category: props.categorySlug,
          limit: props.limit,
          sort: 'latest',
        },
      })
    } catch {
      return { posts: [] }
    }
  }
)

const posts = computed(() => data.value?.posts || [])

const truncate = (text: string, max: number) => {
  if (!text) return ''
  return text.length > max ? text.slice(0, max).trim() + '…' : text
}

const formatDate = (date: string | Date | null | undefined) => {
  if (!date) return ''
  try {
    return new Date(date).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}
</script>

<style scoped>
.cluster-posts-section {
  background: #fafafa;
  border-top: 1px solid #eee;
}

.cluster-label {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #FF9800;
}

.cluster-title {
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1.15;
  color: #111;
}

.cluster-subtitle {
  color: #555;
  font-size: 1rem;
  max-width: 640px;
}

.cluster-bar {
  width: 56px;
  height: 3px;
  background: #111;
}

.cluster-card {
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
  border-color: #eee !important;
  border-radius: 12px;
  overflow: hidden;
}

.cluster-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.06) !important;
  border-color: #111 !important;
}

.cluster-card-fallback {
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

.cluster-card-category {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #FF9800;
}

.cluster-card-title {
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1.3;
  color: #111;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cluster-card-excerpt {
  font-size: 0.92rem;
  color: #555;
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cluster-card-meta {
  font-size: 0.78rem;
  color: #888;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}
</style>
