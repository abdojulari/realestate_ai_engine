<template>
  <div class="home-page template-2">
    <section class="hero-section-full">
      <div class="hero-background-overlay"></div>
      <v-img
        :src="heroImage || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2075&auto=format&fit=crop'"
        alt="Luxury Home"
        class="hero-bg-image"
        cover
      />
      <v-container class="hero-content-container">
        <v-row align="center" class="min-height-screen">
          <v-col cols="12" class="text-center">
            <div class="hero-badge-container mb-4">
              <v-icon size="small" color="amber-darken-2" class="mr-2">mdi-rhombus-split</v-icon>
              <span class="hero-badge">Premium Real Estate</span>
            </div>
            
            <h1 class="hero-title-large">
              Your Dream Home<br>
              <span class="hero-title-highlight">Awaits</span>
            </h1>
            
            <p class="hero-description">
              Experience luxury living with our exclusive collection of premium properties. 
              From modern condos to sprawling estates, find the perfect space that reflects your lifestyle.
            </p>
            
            <div class="d-flex align-center justify-center gap-6 mt-10">
              <v-btn 
                color="amber-darken-2" 
                size="x-large" 
                class="hero-btn-primary text-none font-weight-bold px-12"
                to="/properties"
                elevation="12"
              >
                Explore Properties
              </v-btn>
              <v-btn
                variant="outlined"
                color="white"
                size="x-large"
                class="hero-btn-secondary text-none font-weight-medium px-8"
                @click="scrollToSearch"
              >
                <v-icon start>mdi-magnify</v-icon>
                Search Now
              </v-btn>
            </div>
            
            <div class="hero-stats-grid mt-16">
              <div class="stat-card">
                <div class="stat-icon-wrapper">
                  <v-icon class="stat-icon" color="amber-lighten-3">mdi-home-city-outline</v-icon>
                </div>
                <div class="stat-value">{{ totalProperties }}</div>
                <div class="stat-text">Properties</div>
              </div>
              <div class="stat-card">
                <div class="stat-icon-wrapper">
                  <v-icon class="stat-icon" color="amber-lighten-3">mdi-account-group-outline</v-icon>
                </div>
                <div class="stat-value">{{ totalUsers > 0 ? `${totalUsers}+` : '500+' }}</div>
                <div class="stat-text">Happy Clients</div>
              </div>
              <div class="stat-card">
                <div class="stat-icon-wrapper">
                  <v-icon class="stat-icon" color="amber-lighten-3">mdi-trophy-variant-outline</v-icon>
                </div>
                <div class="stat-value">100+</div>
                <div class="stat-text">Awards</div>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <div class="search-bar-section" id="search-section">
      <v-container>
        <v-row justify="center">
          <v-col cols="12" lg="10">
            <div class="search-card">
              <div class="d-flex align-center justify-center mb-6">
                <v-icon color="amber-darken-3" class="mr-3">mdi-tune-vertical</v-icon>
                <h3 class="search-title">Find Your Perfect Property</h3>
              </div>
              <PropertySearch @search="handleSearch" />
            </div>
          </v-col>
        </v-row>
      </v-container>
    </div>

    <section class="featured-properties-section">
      <v-container>
        <div class="section-header-center mb-12">
          <span class="section-badge">Featured Collections</span>
          <h2 class="section-title-main">Premium Properties</h2>
          <div class="section-divider"></div>
          <p class="section-subtitle">Handpicked selections for discerning buyers</p>
        </div>
        <div class="properties-grid">
          <FeaturedDeals @select="onSelectProperty" />
        </div>
        <div class="text-center mt-12">
          <v-btn 
            color="grey-darken-4" 
            size="large"
            class="text-none px-10"
            to="/properties"
            rounded="0"
          >
            View All Properties
            <v-icon end>mdi-arrow-right</v-icon>
          </v-btn>
        </div>
      </v-container>
    </section>

    <WhyChooseUs :template="2" />

    <ResourcesSection :template="2" />

    <TestimonialSlider :testimonials="featuredTestimonials" />

    <section class="cta-section-gradient">
      <v-container>
        <v-row align="center" justify="center">
          <v-col cols="12" md="8" class="text-center">
            <v-icon size="x-large" color="amber-darken-2" class="mb-6">mdi-crown-outline</v-icon>
            <h2 class="cta-title">Ready to Start Your Journey?</h2>
            <p class="cta-description">
              Let our expert team guide you through every step of finding your perfect home. 
              Schedule a consultation today and discover what's possible.
            </p>
            <v-btn
              size="x-large"
              color="amber-darken-2"
              to="/contact"
              class="cta-button text-none font-weight-bold px-12 mt-8"
              rounded="0"
              variant="elevated"
              elevation="8"
            >
              Get Started Today
            </v-btn>
          </v-col>
        </v-row>
      </v-container>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  featuredProperties?: any[]
  heroImage?: string
  featuredTestimonials?: any[]
  totalUsers?: number
}>()

const totalProperties = computed(() => {
  return props.featuredProperties && props.featuredProperties.length > 0 
    ? `${props.featuredProperties.length}+` 
    : '1200+'
})

const handleSearch = (params: any) => {
  // Note: Standard Vue Router uses useRouter() or navigateTo in Nuxt
  // Replacing with a generic handler if navigateTo isn't globally defined
  console.log('Searching with:', params)
}

function onSelectProperty(p: any) {
  console.log('Selected property:', p.id)
}

const scrollToSearch = () => {
  document.getElementById('search-section')?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Plus+Jakarta+Sans:wght@300;400;600;700&display=swap');

.home-page.template-2 {
  font-family: 'Plus Jakarta Sans', sans-serif;
  overflow-x: hidden;
  background-color: #fff;
}

/* Hero Section - Full Width */
.hero-section-full {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  overflow: hidden;
  background-color: #0f172a;
}

.hero-bg-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.hero-background-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at center, rgba(15, 23, 42, 0.75) 0%, rgba(2, 6, 23, 0.9) 100%);
  z-index: 2;
}

.hero-content-container {
  position: relative;
  z-index: 3;
}

.hero-badge-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-badge {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3em;
  color: rgba(255, 255, 255, 0.9);
}

.hero-title-large {
  font-family: 'Playfair Display', serif;
  font-size: 5.5rem;
  font-weight: 700;
  color: white;
  line-height: 1.1;
  letter-spacing: -0.02em;
  margin: 1.5rem 0;
}

.hero-title-highlight {
  font-style: italic;
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-description {
  font-size: 1.15rem;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.8;
  max-width: 650px;
  margin: 0 auto;
  font-weight: 300;
}

.hero-btn-primary {
  background-color: #d97706 !important;
  color: white !important;
}

.hero-btn-secondary {
  border: 1px solid rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(5px);
}

.hero-stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  max-width: 1000px;
  margin: 0 auto;
}

.stat-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 2.5rem 1rem;
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
}

.stat-card:hover {
  transform: translateY(-8px);
  border-color: #fbbf24;
  background: rgba(255, 255, 255, 0.08);
}

.stat-icon-wrapper {
  margin-bottom: 1rem;
}

.stat-icon {
  font-size: 2.25rem;
}

.stat-value {
  font-family: 'Playfair Display', serif;
  font-size: 2.5rem;
  font-weight: 700;
  color: white;
  margin-bottom: 0.25rem;
}

.stat-text {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-weight: 600;
}

/* Search Bar Section */
.search-bar-section {
  padding: 0;
  background: transparent;
  margin-top: -60px;
  position: relative;
  z-index: 10;
}

.search-card {
  background: white;
  padding: 3rem;
  border-radius: 4px;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.12);
}

.search-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.01em;
}

/* Featured Properties */
.featured-properties-section {
  padding: 140px 0;
}

.section-header-center {
  text-align: center;
}

.section-badge {
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.25em;
  color: #d97706;
  display: block;
  margin-bottom: 0.5rem;
}

.section-title-main {
  font-family: 'Playfair Display', serif;
  font-size: 3.5rem;
  font-weight: 700;
  color: #0f172a;
}

.section-divider {
  width: 50px;
  height: 3px;
  background: #fbbf24;
  margin: 1.5rem auto;
}

.section-subtitle {
  font-size: 1.1rem;
  color: #64748b;
  font-weight: 400;
}

/* CTA Section */
.cta-section-gradient {
  padding: 120px 0;
  background: #020617;
  position: relative;
}

.cta-title {
  font-family: 'Playfair Display', serif;
  font-size: 3.5rem;
  font-weight: 700;
  color: white;
  margin-bottom: 1.5rem;
}

.cta-description {
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.8;
  max-width: 650px;
  margin: 0 auto;
}

.cta-button {
  background-color: #d97706 !important;
  color: white !important;
  letter-spacing: 1px;
}

/* Mobile */
@media (max-width: 960px) {
  .hero-title-large {
    font-size: 3.25rem;
  }
  
  .hero-stats-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .section-title-main, .cta-title {
    font-size: 2.5rem;
  }
  
  .search-card {
    padding: 2rem 1.5rem;
  }
}
</style>