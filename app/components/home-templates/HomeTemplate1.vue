<template>
  <div class="home-page">
    <!-- Hero Section -->
    <section class="hero-section">
      <v-container class="hero-container pr-0 mr-0">
        <v-row align="center" class="min-height-screen ma-0">
          <v-col cols="12" md="6" class="hero-content">
            <div class="hero-text">
              <span class="premium-label mb-4">EXCEPTIONAL REAL ESTATE</span>
              <h1 class="hero-title">
                Find A House<br>
                <span class="hero-title-accent">That Suits You</span>
              </h1>
              <p class="hero-subtitle">
                Discover a curated collection of properties designed for your lifestyle. 
                Our dedicated team ensures your journey to a new home is seamless and sophisticated.
              </p>
              <div class="d-flex align-center gap-4">
                <v-btn 
                  color="grey-darken-4" 
                  size="x-large" 
                  class="hero-cta-btn text-none font-weight-bold px-10"
                  to="/properties"
                  elevation="0"
                >
                  Get Started
                </v-btn>
                <v-btn
                  variant="text"
                  size="x-large"
                  class="text-none font-weight-medium"
                  @click="scrollToSearch"
                >
                  View Listings
                </v-btn>
              </div>
            </div>

            <!-- Stats -->
            <div class="hero-stats">
              <div class="stat-item">
                <div class="stat-number">{{ totalProperties }}</div>
                <div class="stat-label">Properties</div>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <div class="stat-number">{{ totalUsers > 0 ? `${totalUsers}+` : '500+' }}</div>
                <div class="stat-label">Clients</div>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <div class="stat-number">100+</div>
                <div class="stat-label">Awards</div>
              </div>
            </div>
          </v-col>
          <v-col cols="12" md="6" class="pa-0"> 
              <v-img
                :src="heroImage || 'https://images.unsplash.com/photo-1678575326996-a1bf09b86158?q=80&w=1932&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'"
                alt="Modern House"
                class="hero-house"
                cover
              />
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Floating Search Section -->
    <div class="floating-search-section" id="search-section">
      <v-container>
        <v-row justify="center">
          <v-col cols="12" lg="10" xl="8">
            <div class="floating-search-container mt-n16">
              <div class="text-center mb-8">
                <span class="premium-label mb-2">Refine Search</span>
                <h3 class="floating-search-title">Curated Property Search</h3>
              </div>
              <PropertySearch @search="handleSearch" />
            </div>
          </v-col>
        </v-row>
      </v-container>
    </div>

    <!-- Popular Homes Section (Blackish/Moody Theme) -->
    <section class="featured-section dark-theme">
      <v-container>
        <div class="section-header">
          <div>
            <div class="premium-label text-grey-lighten-1">SELECTED COLLECTIONS</div>
            <h2 class="section-title text-white">Our Popular Homes</h2>
          </div>
          <v-btn 
            variant="outlined" 
            color="white" 
            class="explore-btn text-none px-6"
            to="/properties"
            rounded="0"
          >
            Explore All
            <v-icon end size="small">mdi-arrow-right</v-icon>
          </v-btn>
        </div>
        
        <div class="properties-carousel mt-12">
          <FeaturedDeals @select="onSelectProperty" />
        </div>
      </v-container>
    </section>

    <!-- Why Choose Us -->
    <WhyChooseUs :template="1" />

    <!-- Resources-->
    <ResourcesSection :template="1" />

    <!-- Testimonials -->
    <TestimonialSlider :testimonials="featuredTestimonials" />

    <!-- Enhanced Parallax CTA Section -->
    <section class="parallax-cta-section">
      <div class="parallax-bg-wrapper">
         <div class="parallax-bg-image"></div>
      </div>
      <div class="contact-cta-overlay">
        <v-container>
          <v-row align="center" justify="center">
            <v-col cols="12" md="8" class="text-center parallax-content">
              <span class="premium-label text-white mb-6">ESTABLISH YOUR LEGACY</span>
              <h2 class="contact-cta-title">
                Ready to Find Your<br>Dream Home?
              </h2>
              <p class="contact-cta-subtitle mb-10">
                A home is more than just a place; it's the foundation of your future. 
                Let us help you find the space where your stories begin.
              </p>
              <v-btn
                size="x-large"
                color="white"
                to="/contact"
                class="contact-cta-btn text-none font-weight-bold px-12"
                rounded="0"
                variant="elevated"
                elevation="20"
              >
                Schedule a Consultation
              </v-btn>
            </v-col>
          </v-row>
        </v-container>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

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
  navigateTo({ path: '/properties', query: params })
}

function onSelectProperty(p: any) {
  navigateTo(`/property/${p.id}`)
}

const scrollToSearch = () => {
  document.getElementById('search-section')?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

.home-page {
  font-family: 'Inter', sans-serif;
  overflow-x: hidden;
}

.premium-label {
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.3em;
  color: #94a3b8;
  display: block;
}

/* Hero Section */
.hero-section {
  background: #ffffff;
  min-height: 90vh;
  display: flex;
  align-items: center;
  position: relative;
  z-index: 1;
}

.hero-content {
  padding: 0 4% !important;
  position: relative;
  z-index: 2;
}

.hero-title {
  font-size: 4.8rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.0;
  letter-spacing: -0.05em;
  margin-bottom: 2rem;
}

.hero-title-accent {
  color: #cbd5e1;
  font-weight: 300;
}

.hero-subtitle {
  font-size: 1.1rem;
  color: #64748b;
  line-height: 1.8;
  margin-bottom: 3rem;
  max-width: 480px;
}

.hero-stats {
  display: flex;
  align-items: center;
  gap: 3rem;
  margin-top: 2rem;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: #f1f5f9;
}

.stat-number {
  font-size: 1.8rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.03em;
}

.stat-label {
  font-size: 0.7rem;
  color: #94a3b8;
  text-transform: uppercase;
  font-weight: 700;
}

.hero-house {
  height: 100vh;
  width: 100%;
  border-radius: 60px 0 0 60px;
  position: relative;
  z-index: 1;
}

/* Floating Search */
.floating-search-container {
  background: white;
  padding: 4rem;
  box-shadow: 0 50px 100px rgba(0, 0, 0, 0.08);
  border: 1px solid #f1f5f9;
  z-index: 100;
  top:-50px;
  position: relative;
}

.floating-search-section {
  background: white;
  position: relative;
  z-index: 100;
}

.floating-search-title {
  font-size: 2.5rem;
  font-weight: 800;
  letter-spacing: -0.04em;
}

/* Popular Homes (Dark Theme) */
.featured-section.dark-theme {
  padding: 160px 0 120px;
  background: #111111;
  position: relative;
  z-index: 5;
}

.featured-section.dark-theme .section-title {
  font-size: 3.5rem;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.section-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

/* Parallax CTA Section */
.parallax-cta-section {
  position: relative;
  height: 80vh;
  min-height: 600px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.parallax-bg-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 120%;
  z-index: 1;
}

.parallax-bg-image {
  width: 100%;
  height: 100%;
  background-image: url('https://images.unsplash.com/photo-1448630360428-65456885c650?q=80&w=2067&auto=format&fit=crop');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
}

@supports (-webkit-overflow-scrolling: touch) {
  .parallax-bg-image {
    background-attachment: scroll;
  }
}

.contact-cta-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.8) 100%);
  z-index: 2;
  display: flex;
  align-items: center;
}

.parallax-content {
  position: relative;
  z-index: 3;
}

.contact-cta-title {
  font-size: 4.5rem;
  font-weight: 800;
  line-height: 1.0;
  letter-spacing: -0.04em;
  color: white;
  margin-bottom: 1.5rem;
}

.contact-cta-subtitle {
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.7);
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.8;
}

.contact-cta-btn {
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
}

.contact-cta-btn:hover {
  transform: translateY(-5px);
  background-color: #f8fafc !important;
}

/* Mobile Adjustments */
@media (max-width: 960px) {
  .hero-title, .contact-cta-title {
    font-size: 3rem;
  }
  
  .hero-content {
    padding: 60px 24px !important;
  }
  
  .hero-house {
    height: 400px;
    border-radius: 0;
  }
  
  .featured-section.dark-theme .section-title {
    font-size: 2.5rem;
  }
  
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 2rem;
  }
}
</style>
