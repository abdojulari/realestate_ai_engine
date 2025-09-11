<template>
  <div class="news-feeds-page">
    <div class="container mx-auto px-4 py-8">
      <!-- Page Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-800 mb-2">Real Estate News</h1>
        <p class="text-gray-600">Stay updated with the latest market trends and property insights</p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center py-12">
        <v-progress-circular
          indeterminate
          color="primary"
          size="64"
        />
      </div>

      <!-- Error State -->
      <v-alert
        v-if="error && !loading"
        type="error"
        variant="tonal"
        class="mb-6"
        :text="error"
        closable
      />

      <!-- News Content -->
      <div v-if="!loading && !error" class="space-y-8">
        <!-- Market News Section -->
        <section class="news-section">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-semibold text-gray-800 flex items-center">
              <v-icon class="mr-2 text-blue-600">mdi-chart-line</v-icon>
              Market News
            </h2>
            <v-btn
              variant="outlined"
              size="small"
              @click="refreshMarketNews"
              :loading="refreshingMarket"
            >
              <v-icon size="small" class="mr-1">mdi-refresh</v-icon>
              Refresh
            </v-btn>
          </div>

          <div v-if="marketNews.length > 0" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <NewsCard
              v-for="article in marketNews"
              :key="article.guid || article.link"
              :article="article"
              category="Market"
              category-color="blue"
            />
          </div>
          <div v-else class="text-center py-8 text-gray-500">
            <v-icon size="48" class="mb-2">mdi-newspaper-variant-outline</v-icon>
            <p>No market news available at the moment</p>
          </div>
        </section>

        <!-- Property News Section -->
        <section class="news-section">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-semibold text-gray-800 flex items-center">
              <v-icon class="mr-2 text-green-600">mdi-home-variant</v-icon>
              Property News
            </h2>
            <v-btn
              variant="outlined"
              size="small"
              @click="refreshPropertyNews"
              :loading="refreshingProperty"
            >
              <v-icon size="small" class="mr-1">mdi-refresh</v-icon>
              Refresh
            </v-btn>
          </div>

          <!-- Property News Tabs -->
          <v-tabs v-model="activePropertyTab" class="mb-6">
            <v-tab value="finance">
              <v-icon class="mr-2">mdi-bank</v-icon>
              Finance
            </v-tab>
            <v-tab value="multi-residential">
              <v-icon class="mr-2">mdi-apartment</v-icon>
              Multi-Residential
            </v-tab>
            <v-tab value="apartments">
              <v-icon class="mr-2">mdi-building</v-icon>
              Apartments
            </v-tab>
            <v-tab value="insider">
              <v-icon class="mr-2">mdi-account-tie</v-icon>
              CRE Insider
            </v-tab>
            <v-tab value="senior-housing">
              <v-icon class="mr-2">mdi-wheelchair-accessibility</v-icon>
              Senior Housing
            </v-tab>
            <v-tab value="student-housing">
              <v-icon class="mr-2">mdi-school</v-icon>
              Student Housing
            </v-tab>
          </v-tabs>

          <v-window v-model="activePropertyTab">
            <!-- Finance Tab -->
            <v-window-item value="finance">
              <div v-if="propertyNews.finance?.length > 0" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <NewsCard
                  v-for="article in propertyNews.finance"
                  :key="article.guid || article.link"
                  :article="article"
                  category="Finance"
                  category-color="green"
                />
              </div>
              <div v-else class="text-center py-8 text-gray-500">
                <v-icon size="48" class="mb-2">mdi-bank-outline</v-icon>
                <p>No finance news available at the moment</p>
              </div>
            </v-window-item>

            <!-- Multi-Residential Tab -->
            <v-window-item value="multi-residential">
              <div v-if="propertyNews.multiResidential?.length > 0" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <NewsCard
                  v-for="article in propertyNews.multiResidential"
                  :key="article.guid || article.link"
                  :article="article"
                  category="Multi-Residential"
                  category-color="orange"
                />
              </div>
              <div v-else class="text-center py-8 text-gray-500">
                <v-icon size="48" class="mb-2">mdi-apartment</v-icon>
                <p>No multi-residential news available at the moment</p>
              </div>
            </v-window-item>

            <!-- Apartments Tab -->
            <v-window-item value="apartments">
              <div v-if="propertyNews.apartments?.length > 0" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <NewsCard
                  v-for="article in propertyNews.apartments"
                  :key="article.guid || article.link"
                  :article="article"
                  category="Apartments"
                  category-color="purple"
                />
              </div>
              <div v-else class="text-center py-8 text-gray-500">
                <v-icon size="48" class="mb-2">mdi-building</v-icon>
                <p>No apartment news available at the moment</p>
              </div>
            </v-window-item>

            <!-- CRE Insider Tab -->
            <v-window-item value="insider">
              <div v-if="propertyNews.insider?.length > 0" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <NewsCard
                  v-for="article in propertyNews.insider"
                  :key="article.guid || article.link"
                  :article="article"
                  category="CRE Insider"
                  category-color="indigo"
                />
              </div>
              <div v-else class="text-center py-8 text-gray-500">
                <v-icon size="48" class="mb-2">mdi-account-tie</v-icon>
                <p>No CRE insider news available at the moment</p>
              </div>
            </v-window-item>

            <!-- Senior Housing Tab -->
            <v-window-item value="senior-housing">
              <div v-if="propertyNews.seniorHousing?.length > 0" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <NewsCard
                  v-for="article in propertyNews.seniorHousing"
                  :key="article.guid || article.link"
                  :article="article"
                  category="Senior Housing"
                  category-color="teal"
                />
              </div>
              <div v-else class="text-center py-8 text-gray-500">
                <v-icon size="48" class="mb-2">mdi-wheelchair-accessibility</v-icon>
                <p>No senior housing news available at the moment</p>
              </div>
            </v-window-item>

            <!-- Student Housing Tab -->
            <v-window-item value="student-housing">
              <div v-if="propertyNews.studentHousing?.length > 0" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <NewsCard
                  v-for="article in propertyNews.studentHousing"
                  :key="article.guid || article.link"
                  :article="article"
                  category="Student Housing"
                  category-color="cyan"
                />
              </div>
              <div v-else class="text-center py-8 text-gray-500">
                <v-icon size="48" class="mb-2">mdi-school</v-icon>
                <p>No student housing news available at the moment</p>
              </div>
            </v-window-item>
          </v-window>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

// SEO Meta
useHead({
  title: 'Real Estate News - Market Updates & Property Insights',
  meta: [
    { name: 'description', content: 'Stay updated with the latest real estate market news, property insights, and industry trends from trusted sources.' },
    { name: 'keywords', content: 'real estate news, market updates, property news, housing market, commercial real estate' }
  ]
})

// Types
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

interface PropertyNews {
  finance: NewsArticle[]
  multiResidential: NewsArticle[]
  apartments: NewsArticle[]
  insider: NewsArticle[]
  seniorHousing: NewsArticle[]
  studentHousing: NewsArticle[]
}

// Reactive state
const loading = ref(false)
const error = ref<string | null>(null)
const refreshingMarket = ref(false)
const refreshingProperty = ref(false)
const activePropertyTab = ref('finance')

const marketNews = ref<NewsArticle[]>([])
const propertyNews = ref<PropertyNews>({
  finance: [],
  multiResidential: [],
  apartments: [],
  insider: [],
  seniorHousing: [],
  studentHousing: []
})

// API endpoints configuration
const NEWS_FEEDS = {
  market: 'https://www.connectcre.ca/feed?story-market=alberta-and-prairies',
  property: {
    finance: 'https://www.connectcre.ca/feed?property-sector=finance',
    multiResidential: 'https://www.connectcre.ca/feed?property-sector=multi-residential-housing',
    apartments: 'https://www.connectcre.ca/feed?property-sector=apartments',
    insider: 'https://www.connectcre.ca/feed?property-sector=cre-insider',
    seniorHousing: 'https://www.connectcre.ca/feed?property-sector=senior-housing',
    studentHousing: 'https://www.connectcre.ca/feed?property-sector=student-housing'
  }
}

// Fetch news data
const fetchNews = async () => {
  loading.value = true
  error.value = null

  try {
    const [marketResponse, financeResponse, multiResResponse, apartmentsResponse, insiderResponse, seniorHousingResponse, studentHousingResponse] = await Promise.all([
      $fetch<NewsArticle[]>('/api/news/feed', { 
        method: 'POST', 
        body: { url: NEWS_FEEDS.market } 
      }),
      $fetch<NewsArticle[]>('/api/news/feed', { 
        method: 'POST', 
        body: { url: NEWS_FEEDS.property.finance } 
      }),
      $fetch<NewsArticle[]>('/api/news/feed', { 
        method: 'POST', 
        body: { url: NEWS_FEEDS.property.multiResidential } 
      }),
      $fetch<NewsArticle[]>('/api/news/feed', { 
        method: 'POST', 
        body: { url: NEWS_FEEDS.property.apartments } 
      }),
      $fetch<NewsArticle[]>('/api/news/feed', { 
        method: 'POST', 
        body: { url: NEWS_FEEDS.property.insider } 
      }),
      $fetch<NewsArticle[]>('/api/news/feed', { 
        method: 'POST', 
        body: { url: NEWS_FEEDS.property.seniorHousing } 
      }),
      $fetch<NewsArticle[]>('/api/news/feed', { 
        method: 'POST', 
        body: { url: NEWS_FEEDS.property.studentHousing } 
      })
    ])

    marketNews.value = marketResponse || []
    propertyNews.value = {
      finance: financeResponse || [],
      multiResidential: multiResResponse || [],
      apartments: apartmentsResponse || [],
      insider: insiderResponse || [],
      seniorHousing: seniorHousingResponse || [],
      studentHousing: studentHousingResponse || []
    }
  } catch (err: any) {
    console.error('Error fetching news:', err)
    error.value = err.message || 'Failed to fetch news. Please try again later.'
  } finally {
    loading.value = false
  }
}

// Refresh market news
const refreshMarketNews = async () => {
  refreshingMarket.value = true
  try {
    const response = await $fetch<NewsArticle[]>('/api/news/feed', { 
      method: 'POST', 
      body: { url: NEWS_FEEDS.market } 
    })
    marketNews.value = response || []
  } catch (err: any) {
    console.error('Error refreshing market news:', err)
    error.value = 'Failed to refresh market news'
  } finally {
    refreshingMarket.value = false
  }
}

// Refresh property news
const refreshPropertyNews = async () => {
  refreshingProperty.value = true
  try {
    const [financeResponse, multiResResponse, apartmentsResponse, insiderResponse, seniorHousingResponse, studentHousingResponse] = await Promise.all([
      $fetch<NewsArticle[]>('/api/news/feed', { 
        method: 'POST', 
        body: { url: NEWS_FEEDS.property.finance } 
      }),
      $fetch<NewsArticle[]>('/api/news/feed', { 
        method: 'POST', 
        body: { url: NEWS_FEEDS.property.multiResidential } 
      }),
      $fetch<NewsArticle[]>('/api/news/feed', { 
        method: 'POST', 
        body: { url: NEWS_FEEDS.property.apartments } 
      }),
      $fetch<NewsArticle[]>('/api/news/feed', { 
        method: 'POST', 
        body: { url: NEWS_FEEDS.property.insider } 
      }),
      $fetch<NewsArticle[]>('/api/news/feed', { 
        method: 'POST', 
        body: { url: NEWS_FEEDS.property.seniorHousing } 
      }),
      $fetch<NewsArticle[]>('/api/news/feed', { 
        method: 'POST', 
        body: { url: NEWS_FEEDS.property.studentHousing } 
      })
    ])

    propertyNews.value = {
      finance: financeResponse || [],
      multiResidential: multiResResponse || [],
      apartments: apartmentsResponse || [],
      insider: insiderResponse || [],
      seniorHousing: seniorHousingResponse || [],
      studentHousing: studentHousingResponse || []
    }
  } catch (err: any) {
    console.error('Error refreshing property news:', err)
    error.value = 'Failed to refresh property news'
  } finally {
    refreshingProperty.value = false
  }
}

// Initialize
onMounted(() => {
  fetchNews()
})
</script>

<style scoped>
.news-feeds-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.container {
  max-width: 1400px;
}

.news-section {
  background: white;
  padding: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.news-section:hover {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.3s ease-in-out;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .container {
    padding: 1rem;
  }
  
  .news-section {
    padding: 1.5rem;
  }
  
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
