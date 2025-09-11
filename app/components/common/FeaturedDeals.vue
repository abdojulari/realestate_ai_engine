<template>
  <v-container fluid class="featured-deals bg-white">
    <!-- Header is handled by parent component -->
    
    <div class="modern-carousel bg-white">
      <div class="carousel-container bg-white">
        <v-btn
          icon="mdi-chevron-left"
          class="carousel-nav-btn carousel-nav-left"
          variant="flat"
          color="white"
          @click="prev"
        />
        
        <div class="viewport">
          <div class="track transition-fast" :style="trackStyle">
            <v-row v-for="(chunk, idx) in chunks" :key="idx" class="slide" no-gutters>
              <v-col
                v-for="property in chunk"
                :key="property.id"
                :cols="12 / perSlide"
                class="property-item pa-3"
              >
                <ModernPropertyCard :property="property" @click="$emit('select', property)" />
              </v-col>
            </v-row>
          </div>
        </div>
        
        <v-btn
          icon="mdi-chevron-right"
          class="carousel-nav-btn carousel-nav-right"
          variant="flat"
          color="white"
          @click="next"
        />
      </div>
      
      <!-- Dots indicator -->
      <v-row justify="center" class="carousel-dots">
        <button
          v-for="i in totalSlides"
          :key="i"
          class="dot"
          :class="{ active: i - 1 === currentSlide }"
          @click="go(i - 1)"
        />
      </v-row>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import ModernPropertyCard from '~/components/common/ModernPropertyCard.vue'

interface Property {
  id: number | string
  title: string
  price: number
  status: string
  type: string
  beds: number
  baths: number
  sqft: number
  address: string
  city?: string
  province?: string
  images: string[]
  isSaved?: boolean
}

const props = defineProps<{
  items: Property[]
}>()

// Responsive items per slide
const { width } = useDisplay()
const perSlide = computed(() => {
  if (width.value < 960) return 1  // mobile: 1 item
  if (width.value < 1280) return 2  // md: 2 items  
  return 3  // lg+: 3 items
})

const chunks = computed(() => {
  const result: Property[][] = []
  const list = props.items.slice(0, 10)
  for (let i = 0; i < list.length; i += perSlide.value) {
    result.push(list.slice(i, i + perSlide.value))
  }
  return result
})

const totalSlides = computed(() => Math.max(1, chunks.value.length))
const currentSlide = ref(0)

// Reset slide when screen size changes to prevent out of bounds
watch(totalSlides, (newTotal) => {
  if (currentSlide.value >= newTotal) {
    currentSlide.value = 0
  }
})

function prev() { currentSlide.value = (currentSlide.value - 1 + totalSlides.value) % totalSlides.value }
function next() { currentSlide.value = (currentSlide.value + 1) % totalSlides.value }
function go(i: number) { currentSlide.value = Math.min(Math.max(0, i), totalSlides.value - 1) }

const trackStyle = computed(() => ({
  transform: `translateX(-${currentSlide.value * 100}%)`
}))
</script>

<style scoped>
.featured-deals {
  position: relative;
}

.modern-carousel {
  position: relative;
}

.carousel-container {
  position: relative;
  display: flex;
  align-items: center;
  gap: 2rem;
}

.carousel-nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  width: 50px;
  height: 50px;
}

.carousel-nav-left {
  left: -25px;
}

.carousel-nav-right {
  right: -25px;
}

.viewport { 
  overflow: hidden; 
  width: 100%; 
  flex: 1;
}

.track { 
  display: flex; 
  width: 100%; 
}

.slide { 
  flex: 0 0 100%; 
  width: 100%;
}

.transition-fast { 
  transition: transform 300ms ease; 
}

.property-item {
  min-width: 300px;
}

.carousel-dots {
  gap: 0.5rem;
  margin-top: 2rem;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: none;
  background: #d1d5db;
  cursor: pointer;
  transition: background 0.2s ease;
}

.dot.active {
  background: #2c3e50;
}

.dot:hover {
  background: #6b7280;
}

@media (max-width: 960px) {
  .property-item {
    min-width: 280px;
  }
  
  .carousel-nav-left {
    left: -15px;
  }
  
  .carousel-nav-right {
    right: -15px;
  }
}

@media (max-width: 600px) {
  .property-item {
    min-width: 250px;
  }
  
  .carousel-nav-btn {
    width: 40px;
    height: 40px;
  }
  
  .carousel-nav-left {
    left: -10px;
  }
  
  .carousel-nav-right {
    right: -10px;
  }
}
</style>
