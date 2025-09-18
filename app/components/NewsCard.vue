<template>
  <v-card
    class="news-card h-full"
    elevation="2"
    hover
    @click="openArticle"
    flat
  >
    <!-- Article Image -->
    <div v-if="article.image" class="news-image-container">
      <v-img
        :src="article.image"
        :alt="article.title"
        height="200"
        cover
        class="news-image"
      >
        <template v-slot:placeholder>
          <div class="d-flex align-center justify-center fill-height">
            <v-progress-circular
              color="blue-grey-lighten-5"
              indeterminate
            />
          </div>
        </template>
        <template v-slot:error>
          <div class="d-flex align-center justify-center fill-height bg-grey-lighten-2">
            <v-icon size="48" color="grey-lighten-1">mdi-image-off</v-icon>
          </div>
        </template>
      </v-img>
    </div>

    <!-- Fallback placeholder if no image -->
    <div v-else class="news-placeholder">
      <v-icon size="48" color="grey-lighten-1">mdi-newspaper-variant</v-icon>
    </div>

    <!-- Card Content -->
    <v-card-text class="news-content">
      <!-- Category Badge -->
      <v-chip
        :color="categoryColor"
        size="small"
        variant="tonal"
        class="mb-3"
      >
        <v-icon start size="small">mdi-tag</v-icon>
        {{ category }}
      </v-chip>

      <!-- Article Title -->
      <h3 class="news-title text-h6 font-weight-medium mb-2 line-clamp-2">
        {{ article.title }}
      </h3>

      <!-- Article Description -->
      <p class="news-description text-body-2 text-grey-darken-1 mb-3 line-clamp-3">
        {{ cleanDescription }}
      </p>

      <!-- Article Metadata -->
      <div class="news-meta d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon size="small" color="grey" class="mr-1">mdi-clock-outline</v-icon>
          <span class="text-caption text-grey">{{ formattedDate }}</span>
        </div>
        
        <v-btn
          variant="text"
          size="small"
          color="primary"
          @click.stop="openArticle"
        >
          Read More
          <v-icon size="small" class="ml-1">mdi-open-in-new</v-icon>
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface NewsArticle {
  title: string
  description: string
  link: string
  pubDate: string
  guid?: string
  category?: string
  author?: string
  image?: string
}

interface Props {
  article: NewsArticle
  category: string
  categoryColor: string
}

const props = defineProps<Props>()

// Clean up HTML tags from description
const cleanDescription = computed(() => {
  if (!props.article.description) return 'No description available'
  
  // Remove HTML tags and decode entities
  const cleaned = props.article.description
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&') // Replace &amp; with &
    .replace(/&lt;/g, '<') // Replace &lt; with <
    .replace(/&gt;/g, '>') // Replace &gt; with >
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .replace(/&#39;/g, "'") // Replace &#39; with '
    .trim()
  
  return cleaned || 'No description available'
})

// Format the publication date
const formattedDate = computed(() => {
  if (!props.article.pubDate) return 'Unknown date'
  
  try {
    const date = new Date(props.article.pubDate)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return '1 day ago'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`
    
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  } catch (error) {
    return 'Unknown date'
  }
})

// Open article in new tab
const openArticle = () => {
  if (props.article.link) {
    window.open(props.article.link, '_blank', 'noopener,noreferrer')
  }
}
</script>

<style scoped>
.news-card {
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
}

.news-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15) !important;
}

.news-image-container {
  position: relative;
}

.news-image {
  border-radius: 4px 4px 0 0;
}

.news-placeholder {
  height: 200px;
  background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px 4px 0 0;
}

.news-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.news-title {
  color: #1a1a1a;
  line-height: 1.4;
}

.news-description {
  flex: 1;
  line-height: 1.5;
}

.news-meta {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid #f0f0f0;
}

/* Line clamp utilities */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .news-card {
    margin-bottom: 1rem;
  }
  
  .news-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style>
