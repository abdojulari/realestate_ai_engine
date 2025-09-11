<template>
  <div class="home-page">
    <!-- Hero Section -->
    <section class="hero-section">
      <v-container class="hero-container pr-0 mr-0">
        <v-row align="center" class="min-height-screen ma-0">
          <v-col cols="12" md="6" class="hero-content ">
            <div class="hero-text">
              <h1 class="hero-title">
                Find A House<br>
                <span class="hero-title-accent">That Suits you</span>
              </h1>
              <p class="hero-subtitle">
                Want to find a home? We are ready to help you find<br>
                one that suits your Lifestyle and needs
              </p>
              <v-btn 
                color="grey-darken-4" 
                size="large" 
                class="hero-cta-btn text-none font-weight-medium"
                to="/properties"
              >
                Get Started
              </v-btn>
            </div>

            <!-- Stats -->
            <div class="hero-stats mb-5">
              <div class="stat-item">
                <div class="stat-number">{{ totalProperties }}</div>
                <div class="stat-label">Listed Properties</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">4500+</div>
                <div class="stat-label">Happy Customers</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">100+</div>
                <div class="stat-label">Awards</div>
              </div>
            </div>
          </v-col>
          <v-col cols="12" md="6" class="hero-image-col pa-0"> 
              <v-img
                :src="heroImage || 'https://www.newhomeco.com/_next/image?url=https%3A%2F%2F48078207.fs1.hubspotusercontent-na1.net%2Fhub%2F48078207%2Fhubfs%2FApproved%2520Division%2520Assets%2FColorado%2FThe%2520Cottages%2520Collection%2520at%2520Ridgeline%2520Vista%2F07%2520-%2520Model%2520Photography%2FRidgeline-Vista-Plan-3502-Web-7.jpg&w=3840&q=75'"
                alt="Modern House"
                class="hero-house"
                cover
              />
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Floating Search Section -->
    <div class="floating-search-section">
      <v-container>
        <v-row justify="center">
          <v-col cols="12" lg="10" xl="8">
            <div class="floating-search-container">
              <h3 class="floating-search-title">Search for available properties</h3>
              <PropertySearch 
                elevation="3" 
                @search="handleSearch"
                class="floating-search"
              />
            </div>
          </v-col>
        </v-row>
      </v-container>
    </div>

    <!-- Featured Properties -->
    <section class="featured-section">
      <v-container>
        <div class="section-header">
          <div class="section-label">POPULAR</div>
          <h2 class="section-title">Our Popular Homes</h2>
          <v-btn 
            variant="text" 
            color="grey-darken-3" 
            class="explore-btn text-none"
            to="/properties"
          >
            Explore All
            <v-icon end>mdi-arrow-right</v-icon>
          </v-btn>
        </div>
        
        <div class="properties-carousel">
          <FeaturedDeals :items="featuredProperties" @select="onSelectProperty" />
        </div>
      </v-container>
    </section>

    <!-- Why Choose Us -->
    <WhyChooseUs />

    <!-- Resources-->
    <ResourcesSection />

    <!-- Testimonials -->
    <section class="testimonials-section">
      <v-container>
        <h2 class="text-h4 text-center mb-8">What Our Clients Say</h2>
        <div class="d-flex justify-center">
          <v-slide-group
            show-arrows
            class="pa-4"
            center-active
          >
            <v-slide-group-item
              v-for="testimonial in testimonials"
              :key="testimonial.id"
            >
              <v-card
                class="mx-2"
                width="300"
                flat
              >
                <v-card-text class="text-center">
                  <v-avatar
                    :image="testimonial.avatar"
                    size="80"
                    class="mb-4"
                  />
                  <blockquote class="text-body-1 mb-4">
                    "{{ testimonial.content }}"
                  </blockquote>
                  <div class="text-h6">{{ testimonial.name }}</div>
                  <div class="text-caption text-grey">{{ testimonial.location }}</div>
                </v-card-text>
              </v-card>
            </v-slide-group-item>
          </v-slide-group>
        </div>
      </v-container>
    </section>

    <!-- CTA Section -->
    <section class="cta-section">
      <v-container>
        <v-row align="center" justify="center">
          <v-col cols="12" md="8" class="text-center">
            <h2 class="cta-title">
              Ready to Find Your Dream Home?
            </h2>
            <p class="cta-subtitle">
              Let us help you find the perfect property that matches your needs
            </p>
            <v-btn
              size="x-large"
              color="grey-darken-4"
              to="/contact"
              class=" text-none font-weight-medium"
            >
              Contact Us Today
            </v-btn>
          </v-col>
          
        </v-row>
      </v-container>
    </section>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const featuredProperties = ref<any[]>([])
const heroImage = ref<string>('')
const heroTitle = ref<string>('')
const heroSubtitle = ref<string>('')
const whyTitle = ref<string>('')

const totalProperties = computed(() => {
  return featuredProperties.value.length > 0 ? `${featuredProperties.value.length}+` : '1200+'
})
onMounted(async () => {
  console.log('🏡 Starting featured homes loading process...')
  try {
    // Detect user's city using geolocation
    let userCity = ''
    try {
      if (navigator.geolocation) {
        console.log('🌍 Requesting geolocation...')
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
            enableHighAccuracy: false
          })
        })
        
        // Reverse geocode to get city name
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`
        )
        const locationData = await response.json()
        userCity = locationData.city || locationData.locality || ''
        console.log('🌍 Detected user city:', userCity)
      }
    } catch (geoError) {
      console.log('📍 Geolocation not available or denied, showing general featured homes')
    }
    
    // Load featured properties directly with city filtering
    try {
      console.log('🔄 Loading featured properties...')
      
      // Build API query with city filter
      const featuredQuery = new URLSearchParams()
      featuredQuery.append('limit', '50') // Get more to filter from
      featuredQuery.append('includeCrea', 'true')
      featuredQuery.append('includeManual', 'true')
      
      if (userCity) {
        featuredQuery.append('city', userCity)
        console.log('🏙️ Loading featured properties for city:', userCity)
      }
      
      // Call featured properties API directly
      const allProperties = await $fetch(`/api/properties/featured?${featuredQuery.toString()}`)
      
      console.log('📦 Featured API returned:', allProperties?.length || 0, 'properties')
      
      if (allProperties && allProperties.length > 0) {
        // Filter for ONLY houses - be strict about what we consider a house
        const houses = allProperties.filter(property => {
          const type = property.type?.toLowerCase() || ''
          const title = property.title?.toLowerCase() || ''
          
          // Must be explicitly a house
          const isHouse = type === 'house' || 
                         type === 'single-family' || 
                         type === 'detached' ||
                         type === 'single family' ||
                         type === 'detached house'
          
          // Must have bedrooms (actual living space)
          const hasBedrooms = parseInt(property.beds) > 0
          
          // Exclude obvious non-residential
          const notCommercial = !['commercial', 'industrial', 'office', 'retail'].includes(type) &&
                               !title.includes('commercial') &&
                               !title.includes('industrial') &&
                               !title.includes('office')
          
          const notLand = !['land', 'vacant', 'lot'].includes(type) &&
                         !title.includes('vacant') &&
                         !title.includes(' lot ') &&
                         !(title.includes('acre') && parseInt(property.beds) === 0)
          
          return isHouse && hasBedrooms && notCommercial && notLand
        })
        
        console.log('🏠 Found', houses.length, 'houses for', userCity || 'all cities')
        
        // Houses are already filtered by city from the API
        let sortedHouses = houses
        
        // Sort by quality: views, recency, then price variety
        const finalHouses = sortedHouses.sort((a, b) => {
          // 1. Sort by views (popularity)
          const aViews = a.views || 0
          const bViews = b.views || 0
          if (aViews !== bViews) return bViews - aViews
          
          // 2. Sort by recency
          const aDate = new Date(a.updatedAt || a.createdAt || 0).getTime()
          const bDate = new Date(b.updatedAt || b.createdAt || 0).getTime()
          if (aDate !== bDate) return bDate - aDate
          
          // 3. Price variety
          return (a.price || 0) - (b.price || 0)
        }).slice(0, 10)
        
        featuredProperties.value = finalHouses
        console.log('✅ Featured houses loaded:', featuredProperties.value.length, 'houses')
        console.log('🔍 House details:', featuredProperties.value.map(p => ({
          title: p.title,
          type: p.type,
          beds: p.beds,
          city: p.city,
          price: p.price
        })))
        
      } else {
        console.warn('⚠️ Service worker returned no properties, trying direct API...')
        throw new Error('Service worker failed')
      }
      
    } catch (serviceWorkerError) {
      console.log('⚠️ Service worker not available, using direct API')
      
      // Fallback to direct API calls
      console.log('🔄 Falling back to direct API calls...')
      try {
        // Get properties directly from API with high limits
        const response = await $fetch('/api/properties?limit=1000&status=for_sale')
        const apiProperties = Array.isArray(response) ? response : response?.properties || []
        
        console.log('📦 Direct API returned:', apiProperties.length, 'properties')
        
        // Apply same house filtering
        const houses = apiProperties.filter(property => {
          const type = property.type?.toLowerCase() || ''
          const isHouse = type === 'house' || type === 'single-family' || type === 'detached'
          const hasBedrooms = parseInt(property.beds) > 0
          return isHouse && hasBedrooms
        })
        
        featuredProperties.value = houses.slice(0, 10)
        console.log('✅ API fallback loaded:', featuredProperties.value.length, 'houses')
        
      } catch (apiError) {
        console.error('❌ API fallback also failed:', apiError)
        featuredProperties.value = []
      }
    }
    
  } catch (e) {
    console.error('❌ Complete failure loading featured homes:', e)
    featuredProperties.value = []
  }
  try {
    const page = await $fetch('/api/content/page/home')
    const items: any[] = (page as any).items || []
    const hero = items.find(i => i.key === 'hero')
    const title = items.find(i => i.key === 'hero-title')
    const subtitle = items.find(i => i.key === 'hero-subtitle')
    const why = items.find(i => i.key === 'why-choose-us')
    const whyItems = items.filter(i => i.key === 'why-choose-us-item')
    if (hero?.content) heroImage.value = hero.content
    if (title?.content) heroTitle.value = title.content
    if (subtitle?.content) heroSubtitle.value = subtitle.content
    if (why?.title) whyTitle.value = why.title
    if (whyItems?.length) {
      features.splice(0, features.length, ...whyItems.map(i => ({ icon: i.metadata?.icon || 'mdi-check', title: i.title, description: i.content })))
    }
  } catch {}
  try {
    const tpage: any = await $fetch('/api/content/page/testimonials')
    const titems: any[] = tpage.items || []
    testimonials.value = titems
      .filter(i => i.type === 'testimonial')
      .map(i => ({
        id: i.id,
        name: i.metadata?.author || 'Client',
        location: i.metadata?.position || '',
        content: i.content,
        avatar: i.metadata?.avatar || '/favicon.ico'
      }))
  } catch {}
})

const features = reactive<any[]>([])

const testimonials = ref<any[]>([])


const handleSearch = (params: any) => {
  console.log('Search params:', params)
  // Navigate to search results page with params
  navigateTo({
    path: '/properties',
    query: params
  })
}

const toggleFavorite = (propertyId: number) => {
  const property = featuredProperties.value.find(p => p.id === propertyId)
  if (property) {
    property.isFavorite = !property.isFavorite
  }
}

function onSelectProperty(p: any) {
  navigateTo(`/property/${p.id}`)
}


const scrollToSearch = () => {
  const element = document.getElementById('search-section')
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' })
  }
}
</script>

<style scoped>
.home-page {
  background: #f8f9fa;
}

/* Hero Section */
.hero-section {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  min-height: 60vh;
  padding: 2rem 0 0 0;
  position: relative;
  overflow: hidden;
}

.hero-container {
  height: 100%;
  max-width: none !important;
  padding-right: 0 !important;
  padding-bottom: 0 !important;
  margin-right: 0 !important;
  margin-bottom: 0 !important;
}

.hero-container .v-row {
  margin-bottom: 0 !important;
}

.hero-container .v-col {
  padding-bottom: 0 !important;
}

.min-height-screen {
  min-height: 60vh;
}

.hero-content {
  padding: 1rem 4rem;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 700;
  color: #2c3e50;
  line-height: 1.2;
  margin-bottom: 1.5rem;
}

.hero-title-accent {
  color: #6c757d;
  font-weight: 400;
}

.hero-subtitle {
  font-size: 1.1rem;
  color: #6c757d;
  line-height: 1.6;
  margin-bottom: 2.5rem;
}

/* .hero-cta-btn {
  padding: 1rem 2.5rem;
  border-radius: 8px;
  margin-bottom: 1rem;
} */

/* Hero Stats */
.hero-stats {
  display: flex;
  gap: 3rem;
  margin-top: 1rem;
}

.stat-item {
  text-align: left;
}

.stat-number {
  font-size: 1.8rem;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.9rem;
  color: #6c757d;
  font-weight: 500;
}

/* Hero Image */
.hero-image-col {
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding-right: 0 !important;
  padding-bottom: 0 !important;
  margin-right: 0 !important;
  margin-bottom: 0 !important;
  position: relative;
  height: 100%;
}

.hero-house {
  width: calc(100% + 3rem);
  height: 730px;
  border-radius: 20px 0 0 0;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  margin-right: -3rem;
  margin-bottom: 0;
  object-fit: cover;
}

/* Floating Search Section */
.floating-search-section {
  position: absolute;
  top: 95vh;
  left: 0;
  right: 0;
  z-index: 50;
  pointer-events: none;
}

.floating-search-container {
  background: white;
  padding: 2.5rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  pointer-events: all;
}

.floating-search-title {
  font-size: 1.8rem;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 2rem;
  text-align: center;
}

/* Featured Properties Section */
.featured-section {
  background: white;
  padding: 6rem 0 4rem 0;
  margin-top: -2rem;
  position: relative;
  z-index: 10;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  margin-top: 4rem;
}

.section-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.section-title {
  font-size: 2.2rem;
  font-weight: 700;
  color: #2c3e50;
  margin: 0.5rem 0;
}

.explore-btn {
  color: #6c757d;
  font-weight: 500;
}

/* Property Cards */
.properties-carousel {
  margin-top: 2rem;
  background-color: white;
}


/* Testimonials Section */
.testimonials-section {
  background: #2c3e50;
  padding: 6rem 0;
  color: white;
}

.testimonial-content {
  display: flex;
  align-items: center;
  gap: 4rem;
  max-width: 1000px;
  margin: 0 auto;
}

.testimonial-text {
  flex: 1;
}

.testimonial-author {
  margin-bottom: 2rem;
}

.author-name {
  font-size: 1.8rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.author-title {
  color: #adb5bd;
  font-size: 1rem;
}

.testimonial-quote {
  font-size: 1.1rem;
  line-height: 1.8;
  font-style: italic;
  color: #e9ecef;
}

.testimonial-image {
  flex: 0 0 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quote-mark {
  font-size: 8rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.1);
  line-height: 1;
}

/* CTA Section */
.cta-section {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  padding: 6rem 0;
}

.cta-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 1rem;
}

.cta-subtitle {
  font-size: 1.1rem;
  color: #6c757d;
  margin-bottom: 2.5rem;
}

.cta-btn {
  padding: 1.2rem 3rem;
  border-radius: 10px;
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .hero-title {
    font-size: 2.5rem;
  }
  
  .hero-stats {
    justify-content: space-between;
    gap: 1rem;
  }
  
  .stat-number {
    font-size: 1.5rem;
  }
  
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .floating-search-section {
    top: 50vh;
  }
  
  .hero-section {
    min-height: 50vh;
    padding: 1rem 0 0 0;
  }
  
  .min-height-screen {
    min-height: 50vh;
  }
  
  .floating-search-container {
    padding: 1.5rem;
    margin: 0 1rem;
  }
  
  .floating-search-title {
    font-size: 1.4rem;
  }
  
  .testimonial-content {
    flex-direction: column;
    text-align: center;
    gap: 2rem;
  }
  
  .hero-image-col {
    padding-right: 1rem !important;
    padding-left: 1rem !important;
  }
  
  .hero-house {
    width: 100%;
    height: 300px;
    border-radius: 20px;
    margin-top: 2rem;
  }
}

@media (max-width: 480px) {
  .hero-title {
    font-size: 2rem;
  }
  
  .cta-title {
    font-size: 2rem;
  }
  
  .hero-stats {
    flex-direction: column;
    gap: 1.5rem;
    text-align: center;
  }
}
</style>
