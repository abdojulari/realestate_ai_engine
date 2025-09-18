<template>
  <div class="testimonial-slider">
    <v-container>
      <div class="text-center mb-12">
        <h2 class="text-h4 font-weight-bold mb-4">What Our Clients Say</h2>
        <p class="text-subtitle-1 text-grey-darken-1 mx-auto" style="max-width: 600px;">
          Real stories from satisfied clients who found their dream homes with us
        </p>
      </div>

      <div v-if="testimonials.length > 0" class="single-testimonial-container">
        <!-- Single Testimonial Display with built-in controls -->
        <div class="testimonial-display">
          <TestimonialCard
            :testimonials="testimonials"
            :auto-play="autoPlay"
            :auto-play-interval="autoPlayInterval"
            class="single-testimonial"
          />
        </div>

      </div>

      <!-- No testimonials state -->
      <div v-else class="text-center py-12">
        <v-icon size="64" color="grey-lighten-1" class="mb-4">
          mdi-comment-text-outline
        </v-icon>
        <h3 class="text-h6 text-grey-darken-1 mb-2">No testimonials yet</h3>
        <p class="text-body-2 text-grey">
          Be the first to share your experience with us!
        </p>
        <v-btn
          color="primary"
          class="mt-4"
          to="/testimonials/submit"
        >
          Share Your Story
        </v-btn>
      </div>
    </v-container>
  </div>
</template>

<script setup lang="ts">
interface Testimonial {
  id: number
  name: string
  content: string
  location: string
  avatar?: string
  rating?: number
  propertyType?: string
  createdAt?: string
  featured?: boolean
}

interface Props {
  testimonials?: Testimonial[]
  autoPlayInterval?: number
  visibleSlides?: number
}

const props = withDefaults(defineProps<Props>(), {
  testimonials: () => [],
  autoPlayInterval: 30000, // 30 seconds
  visibleSlides: 1
})

// Reactive state
const autoPlay = ref(true)

// Methods
const toggleAutoPlay = () => {
  autoPlay.value = !autoPlay.value
}
</script>

<style scoped>
.testimonial-slider {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  padding: 80px 0;
  
}

.single-testimonial-container {
  position: relative;
  max-width: 1000px;
  margin: 0 auto;
}



.testimonial-display {
  display: flex;
  justify-content: center;
  align-items: center;
 
}

.single-testimonial {
  width: 100%;
}

/* Fade transition */
.testimonial-fade-enter-active,
.testimonial-fade-leave-active {
  transition: all 0.5s ease;
}

.testimonial-fade-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.testimonial-fade-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

.slider-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
}

.pagination-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.3);
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.pagination-dot:hover {
  background: rgba(0, 0, 0, 0.5);
  transform: scale(1.2);
}

.pagination-active {
  background: #2c3e50;
  transform: scale(1.3);
}

/* Mobile responsive */
@media (max-width: 960px) {
  .testimonial-slider {
    padding: 60px 0;
  }
  
  .nav-arrow-left {
    left: -40px;
  }
  
  .nav-arrow-right {
    right: -40px;
  }
}

@media (max-width: 768px) {
  .testimonial-slider {
    padding: 40px 0;
  }
  
  .nav-arrow-left {
    left: -20px;
  }
  
  .nav-arrow-right {
    right: -20px;
  }
  
  .nav-arrow {
    width: 40px !important;
    height: 40px !important;
  }
  
  .nav-arrow .v-icon {
    font-size: 24px !important;
  }
}

@media (max-width: 600px) {
  .text-h4 {
    font-size: 1.5rem !important;
  }
  
  .navigation-controls {
    display: none; /* Hide arrows on mobile, use swipe instead */
  }
  
  .single-testimonial-container {
    padding: 0 20px;
  }
}
</style>
