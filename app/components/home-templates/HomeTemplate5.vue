<template>
  <div class="home-page template-5">
    <section class="hero-centered">
      <div class="hero-bg-wrapper">
        <v-img
          :src="heroImage || 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=2070&auto=format&fit=crop'"
          alt="Beautiful Home"
          class="hero-background-img"
          cover
        />
        <div class="hero-overlay-gradient"></div>
      </div>
      <v-container class="hero-container-centered">
        <v-row justify="center" align="center" class="min-height-screen">
          <v-col cols="12" md="10" class="text-center">
            <span class="hero-badge-centered animate-fade-in">PREMIUM REAL ESTATE SOLUTIONS</span>
            <h1 class="hero-title-centered animate-slide-up">
              Welcome to Your<br>
              <span class="gradient-text">Future Home</span>
            </h1>
            <p class="hero-subtitle-centered animate-slide-up-delayed">
              Discover exceptional properties tailored to your lifestyle. 
              From urban condos to suburban estates, we have the perfect match for every buyer.
            </p>
            <div class="d-flex align-center justify-center gap-4 mt-10 animate-fade-in-delayed">
              <v-btn 
                color="primary" 
                size="x-large" 
                class="hero-cta-primary text-none font-weight-bold px-12"
                :to="{ path: '/properties', query: { status: 'for_sale' } }"
                rounded="xl"
                elevation="8"
              >
                Browse Properties
              </v-btn>
              <v-btn
                variant="outlined"
                color="white"
                size="x-large"
                class="hero-cta-secondary text-none font-weight-medium px-10"
                @click="searchActive = true"
                rounded="xl"
              >
                <v-icon start class="mr-2">mdi-magnify</v-icon>
                Start Search
              </v-btn>
            </div>
          </v-col>
        </v-row>
      </v-container>
      
      <div class="floating-stats">
        <v-container>
          <v-row>
            <v-col v-for="(stat, i) in stats" :key="i" cols="12" md="4">
              <div class="floating-stat-card" :style="{ transitionDelay: `${i * 150}ms` }">
                <div class="floating-stat-icon-box">
                  <v-icon size="42" color="primary">{{ stat.icon }}</v-icon>
                </div>
                <div class="floating-stat-number">{{ stat.value }}</div>
                <div class="floating-stat-label">{{ stat.label }}</div>
              </div>
            </v-col>
          </v-row>
        </v-container>
      </div>
    </section>

    <v-dialog
      v-model="searchActive"
      fullscreen
      hide-overlay
      transition="fade-transition"
      class="search-dialog"
    >
      <div class="search-overlay-wrapper">
        <v-btn
          icon="mdi-close"
          variant="text"
          color="white"
          class="close-search-btn"
          @click="searchActive = false"
        ></v-btn>

        <v-container>
          <v-row justify="center" align="center" class="fill-height">
            <v-col cols="12" md="11" lg="9" xl="8">
              <div class="search-card-glass">
                <div class="text-center mb-12">
                  <v-icon color="amber-lighten-2" size="48" class="mb-4">mdi-filter-variant</v-icon>
                  <span class="search-badge-premium">PREMIUM DISCOVERY</span>
                  <h3 class="search-title-premium">Find Your Dream Property</h3>
                  <p class="search-subtitle-premium">Use our advanced filters to find the perfect match</p>
                </div>
                
                <div class="premium-search-container">
                  <PropertySearch @search="handleSearch" />
                </div>
                
                <div class="text-center mt-12">
                  <v-btn 
                    variant="text" 
                    color="white" 
                    class="text-none letter-spacing-2 opacity-60" 
                    @click="searchActive = false"
                  >
                    CANCEL SEARCH
                  </v-btn>
                </div>
              </div>
            </v-col>
          </v-row>
        </v-container>
      </div>
    </v-dialog>

    <section class="properties-showcase" v-intersect="onIntersect">
      <v-container>
        <div class="showcase-header text-center mb-12">
          <span class="showcase-badge">FEATURED PROPERTIES</span>
          <h2 class="showcase-title">Handpicked for You</h2>
          <p class="showcase-subtitle">Each property is carefully selected to meet the highest standards</p>
        </div>
        
        <div class="properties-showcase-grid" :class="{ 'is-visible': isShowcaseVisible }">
          <FeaturedDeals @select="onSelectProperty" />
        </div>

        <div class="text-center mt-12">
          <v-btn color="primary" size="large" class="text-none px-10" :to="{ path: '/properties', query: { status: 'for_sale' } }" rounded="xl">
            Explore All Properties
            <v-icon end>mdi-chevron-right</v-icon>
          </v-btn>
        </div>
      </v-container>
    </section>

    <WhyChooseUs :template="5" />
    <ResourcesSection :template="5" />
    <TestimonialSlider :testimonials="featuredTestimonials" />

    <section class="cta-elegant">
      <v-container>
        <v-row justify="center">
          <v-col cols="12" md="8" class="text-center">
            <div class="cta-content-elegant">
              <span class="cta-badge-elegant text-orange-500">GET STARTED TODAY</span>
              <h2 class="cta-title-elegant">Begin Your Property Journey</h2>
              <p class="cta-text-elegant text-slate-400">Our team is ready to help you find the perfect home.</p>
              <v-btn size="x-large" color="primary" to="/contact" class="cta-button-elegant text-none px-12 mt-8" rounded="xl" elevation="12">
                <v-icon start class="mr-2">mdi-calendar-check</v-icon>
                Schedule Consultation
              </v-btn>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { buildPropertiesListingQuery } from '~/utils/propertiesListingQuery'

const props = defineProps<{
  featuredProperties?: any[]
  heroImage?: string
  featuredTestimonials?: any[]
  totalUsers?: number
  totalProperties?: number
  awardsCount?: number
}>()

const searchActive = ref(false)
const isShowcaseVisible = ref(false)

const stats = computed(() => [
  { icon: 'mdi-home-city-outline', value: `${props.totalProperties ?? 0}+`, label: 'Properties Available' },
  { icon: 'mdi-account-group-outline', value: `${props.totalUsers ?? 0}+`, label: 'Happy Families' },
  { icon: 'mdi-trophy-variant-outline', value: `${props.awardsCount ?? 0}+`, label: 'Awards Won' }
])

const onIntersect = (isIntersecting: boolean) => {
  if (isIntersecting) isShowcaseVisible.value = true
}

const handleSearch = (params: any) => {
  searchActive.value = false
  navigateTo({ path: '/properties', query: buildPropertiesListingQuery(params) })
}

function onSelectProperty(p: any) {
  navigateTo(`/property/${p.id}`)
}
</script>

<style scoped>
.home-page.template-5 {
  font-family: 'Inter', sans-serif;
  overflow-x: hidden;
  background: white;
}

/* Animations */
.animate-fade-in { animation: fadeIn 1.2s ease-out forwards; }
.animate-slide-up { animation: slideUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.animate-slide-up-delayed { animation: slideUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards; opacity: 0; }
.animate-fade-in-delayed { animation: fadeIn 1.2s ease-out 0.6s forwards; opacity: 0; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }

/* Hero */
.hero-centered { position: relative; min-height: 100vh; display: flex; align-items: center; overflow: hidden; }
.hero-bg-wrapper { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; }
.hero-overlay-gradient { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, rgba(15, 23, 42, 0.98) 100%); z-index: 2; }
.hero-container-centered { position: relative; z-index: 3; }
.hero-badge-centered { display: inline-block; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.25em; color: white; padding: 0.75rem 2rem; background: rgba(255, 255, 255, 0.08); border-radius: 50px; backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.15); margin-bottom: 2rem; }
.hero-title-centered { font-size: 5.5rem; font-weight: 900; color: white; line-height: 1.1; margin-bottom: 2rem; letter-spacing: -0.02em; }
.gradient-text { background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.hero-subtitle-centered { font-size: 1.25rem; color: rgba(255, 255, 255, 0.8); max-width: 700px; margin: 0 auto; line-height: 1.8; }
.hero-cta-primary { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important; color: white !important; }
.hero-cta-secondary { border: 1px solid rgba(255, 255, 255, 0.4); background: rgba(255, 255, 255, 0.05) !important; backdrop-filter: blur(10px); }

/* Stats */
.floating-stats { margin-top: -100px; position: relative; z-index: 10; }
.floating-stat-card { background: white; padding: 3rem 2rem; border-radius: 32px; box-shadow: 0 30px 90px rgba(0, 0, 0, 0.08); text-align: center; transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1); border: 1px solid rgba(0,0,0,0.03); }
.floating-stat-card:hover { transform: translateY(-12px); box-shadow: 0 40px 100px rgba(0, 0, 0, 0.12); }
.floating-stat-icon-box { margin-bottom: 1.5rem; }
.floating-stat-number { font-size: 2.25rem; font-weight: 900; color: #0f172a; margin-bottom: 0.5rem; }
.floating-stat-label { font-size: 0.85rem; font-weight: 700; color: #94a3b8; letter-spacing: 0.1em; text-transform: uppercase; }

/* --- FIXED SEARCH OVERLAY --- */
.search-card-glass {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 5rem 2rem;
  border-radius: 48px;
  box-shadow: 0 50px 120px rgba(0, 0, 0, 0.5);
  width: 100%;
  overflow: visible; /* CRITICAL: Allows floating search button to be seen */
  position: relative;
}

.premium-search-container {
  position: relative;
  width: 100%;
  padding: 0 20px; /* Gives room for the button to hang off if needed */
}

/* Add a subtle glow behind the search bar for depth */
.premium-search-container::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  height: 40px;
  background: rgba(59, 130, 246, 0.2);
  filter: blur(50px);
  z-index: -1;
}

.search-overlay-wrapper { background: rgba(10, 15, 28, 0.94); backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px); height: 100vh; width: 100vw; display: flex; align-items: center; justify-content: center; }
.close-search-btn { position: absolute; top: 40px; right: 40px; z-index: 100; background: rgba(255, 255, 255, 0.05) !important; border: 1px solid rgba(255, 255, 255, 0.1); }
.search-badge-premium { display: block; font-size: 0.75rem; font-weight: 800; color: #fbbf24; letter-spacing: 0.4em; margin-bottom: 1.5rem; }
.search-title-premium { font-size: 3.5rem; font-weight: 900; color: white; margin-bottom: 1rem; letter-spacing: -0.02em; }
.search-subtitle-premium { font-size: 1.15rem; color: rgba(255, 255, 255, 0.4); }
.letter-spacing-2 { letter-spacing: 2px !important; }

/* Grid Stagger */
.properties-showcase-grid { opacity: 0; transform: translateY(60px); transition: all 1.2s cubic-bezier(0.16, 1, 0.3, 1); }
.properties-showcase-grid.is-visible { opacity: 1; transform: translateY(0); }

/* Sections */
.properties-showcase { padding: 140px 0; background: #fafafa; }
.showcase-badge { font-size: 0.75rem; font-weight: 800; color: #94a3b8; letter-spacing: 0.3em; margin-bottom: 1.5rem; }
.showcase-title { font-size: 3.75rem; font-weight: 900; color: #0f172a; letter-spacing: -0.01em; }

.cta-elegant { padding: 140px 0; background: #0f172a; }
.cta-title-elegant { font-size: 3.75rem; font-weight: 900; color: white; margin-bottom: 2rem; }
.cta-button-elegant { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important; }

@media (max-width: 960px) {
  .hero-title-centered { font-size: 3.25rem; }
  .search-card-glass { padding: 3rem 1rem; border-radius: 24px; }
  .search-title-premium { font-size: 2.25rem; }
  .showcase-title, .cta-title-elegant { font-size: 2.75rem; }
}
</style>