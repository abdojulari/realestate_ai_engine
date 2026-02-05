<template>
  <div class="home-page template-3">
    <!-- Minimal Hero Section -->
    <section class="hero-minimal">
      <v-container>
        <v-row align="center" class="min-height-screen">
          <v-col cols="12" md="7">
            <div class="hero-content-minimal">
              <div class="hero-tag">LUXURY REAL ESTATE</div>
              <h1 class="hero-heading">
                Discover Your<br>
                <span class="text-primary">Perfect Home</span>
              </h1>
              <p class="hero-text-minimal">
                Browse through our carefully curated selection of premium properties. 
                Each home is chosen for its unique character, prime location, and exceptional quality.
              </p>
              <div class="d-flex align-center gap-3 mt-8">
                <v-btn 
                  color="primary" 
                  size="x-large" 
                  class="text-none font-weight-bold px-10"
                  to="/properties"
                  rounded="lg"
                >
                  Browse Properties
                </v-btn>
                <v-btn
                  variant="text"
                  size="x-large"
                  class="text-none"
                  @click="scrollToSearch"
                >
                  Search
                </v-btn>
              </div>
            </div>
          </v-col>
          <v-col cols="12" md="5">
            <div class="hero-image-wrapper">
              <v-img
                :src="heroImage || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop'"
                alt="Modern Home"
                class="hero-image-minimal"
                cover
              />
            </div>
          </v-col>
        </v-row>
        
        <!-- Stats Row -->
        <v-row class="stats-row">
          <v-col cols="12" md="4">
            <div class="stat-box">
              <div class="stat-number-minimal">{{ totalProperties }}</div>
              <div class="stat-label-minimal">Available Properties</div>
            </div>
          </v-col>
          <v-col cols="12" md="4">
            <div class="stat-box">
              <div class="stat-number-minimal">{{ totalUsers > 0 ? `${totalUsers}+` : '500+' }}</div>
              <div class="stat-label-minimal">Satisfied Clients</div>
            </div>
          </v-col>
          <v-col cols="12" md="4">
            <div class="stat-box">
              <div class="stat-number-minimal">100+</div>
              <div class="stat-label-minimal">Industry Awards</div>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Inline Search Section -->
    <section class="search-section-inline" id="search-section">
      <v-container>
        <div class="search-wrapper">
          <h3 class="search-heading">Start Your Search</h3>
          <PropertySearch @search="handleSearch" />
        </div>
      </v-container>
    </section>

    <!-- Properties Grid Section -->
    <section class="properties-section-minimal">
      <v-container>
        <div class="d-flex align-center justify-space-between mb-10">
          <div>
            <div class="section-tag">FEATURED</div>
            <h2 class="section-heading-minimal">Premium Listings</h2>
          </div>
          <v-btn 
            variant="outlined" 
            color="primary"
            class="text-none"
            to="/properties"
            rounded="lg"
          >
            View All
            <v-icon end>mdi-arrow-right</v-icon>
          </v-btn>
        </div>
        <div class="properties-wrapper">
          <FeaturedDeals @select="onSelectProperty" />
        </div>
      </v-container>
    </section>

    <!-- Why Choose Us -->
    <WhyChooseUs :template="3" />

    <!-- Resources-->
    <ResourcesSection :template="3" />

    <!-- Testimonials -->
    <TestimonialSlider :testimonials="featuredTestimonials" />

    <!-- Simple CTA -->
    <section class="cta-section-minimal">
      <v-container>
        <v-row justify="center">
          <v-col cols="12" md="8" class="text-center">
            <h2 class="cta-heading-minimal">Let's Find Your Next Home</h2>
            <p class="cta-text-minimal">
              Our team of experienced real estate professionals is here to help you 
              navigate the market and find the perfect property for your needs.
            </p>
            <v-btn
              size="x-large"
              color="primary"
              to="/contact"
              class="text-none font-weight-bold px-12 mt-6"
              rounded="lg"
            >
              Contact Us
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
.home-page.template-3 {
  font-family: 'Inter', sans-serif;
  overflow-x: hidden;
  background: #ffffff;
}

/* Minimal Hero */
.hero-minimal {
  padding: 80px 0 60px;
  background: linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%);
}

.hero-content-minimal {
  padding: 2rem 0;
}

.hero-tag {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: #64748b;
  margin-bottom: 1.5rem;
}

.hero-heading {
  font-size: 4.5rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.1;
  letter-spacing: -0.03em;
  margin-bottom: 1.5rem;
}

.hero-text-minimal {
  font-size: 1.15rem;
  color: #64748b;
  line-height: 1.8;
  max-width: 550px;
}

.hero-image-wrapper {
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
}

.hero-image-minimal {
  width: 100%;
  height: 600px;
}

.stats-row {
  margin-top: 4rem;
  padding-top: 4rem;
  border-top: 1px solid #e2e8f0;
}

.stat-box {
  text-align: center;
}

.stat-number-minimal {
  font-size: 3rem;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 0.5rem;
}

.stat-label-minimal {
  font-size: 0.9rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

/* Search Section */
.search-section-inline {
  padding: 60px 0;
  background: white;
}

.search-wrapper {
  max-width: 900px;
  margin: 0 auto;
}

.search-heading {
  font-size: 2rem;
  font-weight: 700;
  color: #0f172a;
  text-align: center;
  margin-bottom: 2rem;
}

/* Properties Section */
.properties-section-minimal {
  padding: 100px 0;
  background: #f8fafc;
}

.section-tag {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: #64748b;
  margin-bottom: 0.5rem;
}

.section-heading-minimal {
  font-size: 3rem;
  font-weight: 800;
  color: #0f172a;
}

.properties-wrapper {
  margin-top: 3rem;
}

/* CTA Section */
.cta-section-minimal {
  padding: 100px 0;
  background: white;
}

.cta-heading-minimal {
  font-size: 3rem;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 1.5rem;
}

.cta-text-minimal {
  font-size: 1.1rem;
  color: #64748b;
  line-height: 1.8;
  max-width: 600px;
  margin: 0 auto;
}

/* Mobile */
@media (max-width: 960px) {
  .hero-heading {
    font-size: 2.5rem;
  }
  
  .hero-image-minimal {
    height: 400px;
    margin-top: 2rem;
  }
  
  .section-heading-minimal, .cta-heading-minimal {
    font-size: 2rem;
  }
  
  .stats-row {
    margin-top: 2rem;
    padding-top: 2rem;
  }
}
</style>
