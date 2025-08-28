<template>
  <div>
    <!-- Hero Section -->
    <section class="hero-section">
      <v-img
        :src="heroImage || '/images/hero-bg.jpg'"
        height="600"
        cover
        class="hero-image"
      >
        <v-overlay
          color="black"
          opacity="0.4"
          scrim
        />
        
        <v-container class="fill-height">
          <v-row align="center" justify="center" class=" bg-white py-10">
            <v-col cols="12" md="10" lg="8" class="text-center">
              <h1 class="text-h2 text-gray-darken-1 font-weight-bold mb-4">
                {{ heroTitle || 'Find Your Dream Home' }}
              </h1>
              <p class="text-h6 text-gray-darken-1 mb-8">
                {{ heroSubtitle || 'Search properties for sale and to rent in your area' }}
              </p>
              
              <PropertySearch elevation="3" @search="handleSearch"/>
            </v-col>
          </v-row>
        </v-container>
      </v-img>
    </section>

    <!-- Featured Properties -->
    <section class="py-12 bg-surface">
      <v-container>
        <h2 class="text-h4 text-center mb-8">Featured Properties</h2>
        <FeaturedDeals :items="featuredProperties" @select="onSelectProperty" />
        <div class="text-center mt-8">
          <v-btn color="primary" variant="outlined" size="large" to="/properties">View All Properties</v-btn>
        </div>
      </v-container>
    </section>

    <!-- Why Choose Us -->
    <WhyChooseUs />

    <!-- Testimonials -->
    <section class="py-12 bg-white">
      <v-container>
        <h2 class="text-h4 text-center mb-8">What Our Clients Say</h2>
        <v-row justify="center">
          <v-col cols="12" md="10">
            <v-slide-group
              show-arrows
              class="pa-4"
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
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- CTA Section -->
    <section class="py-12 bg-primary">
      <v-container>
        <v-row align="center" justify="center">
          <v-col cols="12" md="8" class="text-center">
            <h2 class="text-h4 text-white mb-4">
              Ready to Find Your Dream Home?
            </h2>
            <p class="text-h6 text-white-darken-1 mb-8">
              Let us help you find the perfect property that matches your needs
            </p>
            <v-btn
              size="x-large"
              color="white"
              to="/contact"
              class="px-8"
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
onMounted(async () => {
  try {
    featuredProperties.value = await $fetch('/api/properties/featured')
  } catch (e) {
    // fallback minimal mock to avoid blank UI
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

const formatPrice = (price: number) => {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
</script>

<style scoped>
.hero-section {
  position: relative;
}

.hero-image {
  position: relative;
}

.feature-card {
  height: 100%;
  transition: transform 0.2s;
}

.feature-card:hover {
  transform: translateY(-4px);
}
</style>
