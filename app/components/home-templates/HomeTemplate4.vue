<template>
  <div class="home-page template-4">
    <!-- Split Hero Section -->
    <section class="hero-split">
      <v-row no-gutters class="min-height-screen">
        <v-col cols="12" md="6" class="hero-left">
          <div class="hero-content-split pl-16">
            <span class="hero-label">EXCLUSIVE REAL ESTATE</span>
            <h1 class="hero-title-split">
              Find Your<br>
              <span class="accent-text">Perfect Match</span>
            </h1>
            <p class="hero-description-split">
              We specialize in connecting you with exceptional properties that match your vision. 
              Experience personalized service and expert guidance throughout your journey.
            </p>
            <div class="d-flex align-center gap-4 mt-8">
              <v-btn 
                color="black" 
                size="x-large" 
                class="text-white text-none font-weight-bold px-10"
                to="/properties"
                rounded="0"
              >
                Explore Now
              </v-btn>
              <v-btn
                variant="outlined"
                color="black"
                size="x-large"
                class="text-none font-weight-medium px-8"
                @click="scrollToSearch"
                rounded="0"
              >
                Search
              </v-btn>
            </div>
            
            <!-- Inline Stats -->
            <div class="hero-stats-inline mt-12">
              <div class="stat-inline">
                <span class="stat-value-split">{{ totalProperties }}</span>
                <span class="stat-label-split">Properties</span>
              </div>
              <div class="stat-divider-inline"></div>
              <div class="stat-inline">
                <span class="stat-value-split">{{ totalUsers > 0 ? `${totalUsers}+` : '500+' }}</span>
                <span class="stat-label-split">Clients</span>
              </div>
              <div class="stat-divider-inline"></div>
              <div class="stat-inline">
                <span class="stat-value-split">100+</span>
                <span class="stat-label-split">Awards</span>
              </div>
            </div>
          </div>
        </v-col>
        <v-col cols="12" md="6" class="hero-right pa-0">
          <v-img
            :src="heroImage || 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2053&auto=format&fit=crop'"
            alt="Luxury Property"
            class="hero-image-split"
            cover
          />
        </v-col>
      </v-row>
    </section>

    <!-- Compact Search Section -->
    <section class="search-compact" id="search-section">
      <v-container>
        <v-row justify="center">
          <v-col cols="12" lg="9">
            <div class="search-box-compact">
              <h4 class="search-label-compact mb-4">Find Your Property</h4>
              <PropertySearch @search="handleSearch" />
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Featured Section with Dark Background -->
    <section class="featured-dark-section">
      <v-container>
        <div class="section-header-dark mb-10">
          <div>
            <span class="section-label-dark">CURATED SELECTIONS</span>
            <h2 class="section-title-dark">Featured Properties</h2>
          </div>
          <v-btn 
            variant="outlined" 
            color="white"
            class="text-none"
            to="/properties"
            rounded="0"
          >
            View All
            <v-icon end>mdi-arrow-right</v-icon>
          </v-btn>
        </div>
        <div class="properties-container-dark">
          <FeaturedDeals @select="onSelectProperty" />
        </div>
      </v-container>
    </section>

    <!-- Why Choose Us -->
    <WhyChooseUs :template="4" />

    <!-- Resources-->
    <ResourcesSection :template="4" />

    <!-- Testimonials -->
    <TestimonialSlider :testimonials="featuredTestimonials" />

    <!-- Bold CTA Section -->
    <section class="cta-bold-section">
      <v-container>
        <v-row align="center" justify="center">
          <v-col cols="12" md="9" class="text-center">
            <h2 class="cta-title-bold">
              Ready to Make<br>
              Your Move?
            </h2>
            <p class="cta-description-bold">
              Join thousands of satisfied clients who found their dream home with us. 
              Let's start your property search today.
            </p>
            <v-btn
              size="x-large"
              color="white"
              to="/contact"
              class="cta-btn-bold text-black text-none font-weight-bold px-12 mt-8"
              rounded="0"
              variant="elevated"
              elevation="12"
            >
              Get Started
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
.home-page.template-4 {
  font-family: 'Inter', sans-serif;
  overflow-x: hidden;
}

/* Split Hero */
.hero-split {
  background: #ffffff;
}

.hero-left {
  display: flex;
  align-items: center;
  padding: 80px 60px;
  background: #ffffff;
}

.hero-content-split {
  max-width: 600px;
}

.hero-label {
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.3em;
  color: #64748b;
  display: block;
  margin-bottom: 2rem;
}

.hero-title-split {
  font-size: 5rem;
  font-weight: 900;
  color: #0f172a;
  line-height: 1.0;
  letter-spacing: -0.04em;
  margin-bottom: 2rem;
}

.accent-text {
  color: #0f172a;
  position: relative;
}

.accent-text::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 12px;
  background: #fbbf24;
  opacity: 0.4;
  z-index: -1;
}

.hero-description-split {
  font-size: 1.15rem;
  color: #475569;
  line-height: 1.8;
  margin-bottom: 2rem;
}

.hero-stats-inline {
  display: flex;
  align-items: center;
  gap: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e2e8f0;
}

.stat-inline {
  display: flex;
  flex-direction: column;
}

.stat-value-split {
  font-size: 2.5rem;
  font-weight: 900;
  color: #0f172a;
  line-height: 1;
}

.stat-label-split {
  font-size: 0.75rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-top: 0.5rem;
}

.stat-divider-inline {
  width: 1px;
  height: 50px;
  background: #e2e8f0;
}

.hero-right {
  background: #0f172a;
}

.hero-image-split {
  width: 100%;
  height: 100vh;
  min-height: 600px;
}

/* Compact Search */
.search-compact {
  padding: 60px 0;
  background: #f8fafc;
  margin-top: -40px;
  position: relative;
  z-index: 10;
}

.search-box-compact {
  background: white;
  padding: 2.5rem;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
}

.search-label-compact {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  text-align: center;
}

/* Featured Dark Section */
.featured-dark-section {
  padding: 120px 0;
  background: #0f172a;
}

.section-header-dark {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.section-label-dark {
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.3em;
  color: rgba(255, 255, 255, 0.6);
  display: block;
  margin-bottom: 0.5rem;
}

.section-title-dark {
  font-size: 3.5rem;
  font-weight: 900;
  color: white;
}

.properties-container-dark {
  margin-top: 3rem;
}

/* Bold CTA */
.cta-bold-section {
  padding: 120px 0;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
}

.cta-title-bold {
  font-size: 4.5rem;
  font-weight: 900;
  color: white;
  line-height: 1.1;
  letter-spacing: -0.03em;
  margin-bottom: 2rem;
}

.cta-description-bold {
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.8;
  max-width: 700px;
  margin: 0 auto;
}

.cta-btn-bold {
  background: white !important;
}

/* Mobile */
@media (max-width: 960px) {
  .hero-left {
    padding: 60px 24px;
  }
  
  .hero-title-split {
    font-size: 3rem;
  }
  
  .hero-image-split {
    height: 500px;
  }
  
  .section-title-dark, .cta-title-bold {
    font-size: 2.5rem;
  }
  
  .hero-stats-inline {
    flex-wrap: wrap;
    gap: 1rem;
  }
  
  .stat-divider-inline {
    display: none;
  }
}
</style>
