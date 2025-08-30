<template>
  <div>
    <!-- Hero Section -->
    <section class="hero-section bg-primary text-white py-16">
      <v-container>
        <v-row align="center" justify="center" class="text-center">
          <v-col cols="12" md="8">
            <h1 class="text-h3 mb-4">{{ heroTitle || 'About Us' }}</h1>
            <p class="text-h6 mb-0">{{ heroSubtitle || 'Your trusted real estate partner in Edmonton' }}</p>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Stats Section -->
    <section class="stats-section py-12 bg-grey-lighten-4">
      <v-container>
        <v-row>
          <v-col 
            v-for="stat in stats" 
            :key="stat.key"
            cols="6" 
            md="3"
            class="text-center"
          >
            <div class="text-h3 text-primary mb-2">{{ stat.value }}</div>
            <div class="text-h6">{{ stat.label }}</div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Main Content Section -->
    <section class="content-section py-12">
      <v-container>
        <v-row justify="center">
          <v-col cols="12" md="10" lg="8">
            <div v-if="mainContent" v-html="mainContent" class="about-content"></div>
            <div v-else class="text-body-1">
              <h2 class="text-h4 mb-4">Our Story</h2>
              <p>We help buyers and sellers in Alberta with data-driven insights and local expertise. Our team is dedicated to making your real estate journey as smooth and successful as possible.</p>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>
  </div>
</template>

<script setup lang="ts">
const heroTitle = ref<string>('')
const heroSubtitle = ref<string>('')
const mainContent = ref<string>('')
const stats = ref<any[]>([])

onMounted(async () => {
  try {
    const page = await $fetch('/api/content/page/about')
    const items: any[] = page.items || []
    
    // Load hero content
    const heroTitleItem = items.find(i => i.key === 'about.hero.title' || i.key === 'about-title')
    const heroSubtitleItem = items.find(i => i.key === 'about.hero.subtitle' || i.key === 'about-subtitle')
    
    // Look for HTML content - try specific keys first, then any HTML content
    let mainContentItem = items.find(i => i.key === 'about.main.content')
    if (!mainContentItem) {
      mainContentItem = items.find(i => i.key === 'about-body' || i.key === 'about.body')
    }
    if (!mainContentItem) {
      // Find any HTML content in the about section
      mainContentItem = items.find(i => i.type === 'html' && i.content && i.content.length > 50)
    }
    
    if (heroTitleItem?.content) heroTitle.value = heroTitleItem.content
    if (heroSubtitleItem?.content) heroSubtitle.value = heroSubtitleItem.content
    if (mainContentItem?.content) {
      mainContent.value = mainContentItem.content
    }
    
    // Load stats
    const statItems = items.filter(i => i.key.startsWith('about.stats.'))
    stats.value = statItems.map(item => ({
      key: item.key,
      value: item.content,
      label: item.title
    }))
    
  } catch (error) {
    console.error('Error loading about content:', error)
  }
})

// SEO
useHead({
  title: 'About Us - Your Edmonton Real Estate Experts',
  meta: [
    { name: 'description', content: 'Learn about our Edmonton real estate team. With over 10 years of experience, we help families find their perfect home and investors build their portfolio.' }
  ]
})
</script>

<style scoped>
.hero-section {
  background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
}

.about-content :deep(h2) {
  color: #1976d2;
  margin-bottom: 1rem;
  margin-top: 2rem;
}

.about-content :deep(h3) {
  color: #424242;
  margin-bottom: 0.75rem;
  margin-top: 1.5rem;
}

.about-content :deep(ul) {
  margin: 1rem 0;
}

.about-content :deep(li) {
  margin-bottom: 0.5rem;
}

.about-content :deep(strong) {
  color: #1976d2;
}
</style>

