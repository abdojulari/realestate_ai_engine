<template>
  <v-card
    class="testimonial-card"
    flat
    :width="width"
    max-width="1200"
    min-height="400"
    
  >
    <v-row no-gutters class="fill-height" style="min-height: 400px;">
      <!-- Left Side - Image -->
      <v-col cols="12" md="6" class="d-flex" style="min-height: 400px;">
        <v-card
          flat
          class="position-relative"
          width="100%"
        >
          <!-- Background Image (always show with fallback) -->
          <transition name="image-fade" mode="out-in">
            <v-img
              v-if="currentTestimonial"
              :key="`avatar-${currentTestimonial.id}`"
              :src="getAvatarImage"
              :alt="`${currentTestimonial.name} avatar`"
              contain
              class="position-absolute top-10  bottom-10 w-100 z-10"
              
            />
          </transition>
          
          <!-- Dark Overlay (always show when image exists) -->
          <div v-if="currentTestimonial" class="bg-black opacity-50 position-absolute fill-height w-75"></div>
          
          <!-- Content Overlay -->
          <div class="position-absolute fill-height w-100" style="z-index: 10;">
            <!-- Top Quote Mark -->
            <div class="quote-mark-top" style="position: absolute; top: 20px; left: 20px; z-index: 15;">
                <v-icon size="80">mdi-format-quote-open</v-icon>
            </div>
            
            <!-- Testimonial Label -->
            <div class="position-absolute d-flex flex-column align-start" style="bottom: 40px; left: 30px; z-index: 15;">
              <span class="testimonial-text">TESTIMONIAL</span>
            </div>
            
            <!-- Bottom Quote Mark -->
            <div class="quote-mark-bottom" style="position: absolute; bottom: 20px; right: 10px; z-index: 15;">
                <v-icon size="80">mdi-format-quote-close</v-icon>
            </div>
          </div>
        </v-card>
      </v-col>

      <!-- Right Side - Content -->
      <v-col cols="12" md="6" class="d-flex">
        <v-card-text class="d-flex flex-column justify-space-between pa-8 fill-height">
          <!-- Animated Content -->
          <transition name="content-fade" mode="out-in">
            <div v-if="currentTestimonial" :key="`content-${currentTestimonial.id}`">
              <!-- Title - Generated from testimonial data -->
              <h3 class="text-h5 font-weight-bold text-grey-darken-3 mb-4">
                {{ generateTitle }}
              </h3>
              
              <!-- Content -->
              <p class="text-body-1 text-grey-darken-1 mb-6" style="line-height: 1.6;">
                {{ truncatedContent }}
              </p>
            </div>
          </transition>
          
          <div>
            <!-- Author Info -->
            <transition name="content-fade" mode="out-in">
              <div v-if="currentTestimonial" :key="`author-${currentTestimonial.id}`" class="mb-4">
                <div class="text-h6 font-weight-medium text-grey-darken-3 mb-1">
                  {{ currentTestimonial.name }}
                </div>
                <div class="text-body-2 text-grey d-flex align-center">
                  <v-icon size="small" class="mr-1">mdi-map-marker</v-icon>
                  {{ currentTestimonial.location }}
                </div>
              </div>
            </transition>

            <!-- Rating -->
            <transition name="content-fade" mode="out-in">
              <div v-if="currentTestimonial" :key="`rating-${currentTestimonial.id}`" class="mb-4">
                <v-rating
                  :model-value="currentTestimonial.rating || 5"
                  readonly
                  color="amber"
                  size="small"
                  density="compact"
                />
              </div>
            </transition>

            <!-- Pagination Dots -->
            <div v-if="props.testimonials.length > 1" class="d-flex justify-end">
              <v-btn
                v-for="(_, index) in props.testimonials"
                :key="`dot-${index}`"
                :variant="currentSlide === index ? 'flat' : 'text'"
                :color="currentSlide === index ? 'grey-darken-3' : 'grey'"
                size="x-small"
                icon
                class="mx-1"
                @click="goToSlide(index)"
              >
                <v-icon size="8">mdi-circle</v-icon>
              </v-btn>
            </div>
          </div>
        </v-card-text>
      </v-col>
    </v-row>
  </v-card>
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
  testimonials: Testimonial[]
  width?: string | number
  elevation?: number
  large?: boolean
  showDate?: boolean
  autoPlay?: boolean
  autoPlayInterval?: number
}

const props = withDefaults(defineProps<Props>(), {
  width: '100%',
  elevation: 4,
  large: false,
  showDate: false,
  autoPlay: true,
  autoPlayInterval: 5000
})

// Reactive state for slider
const currentSlide = ref(0)
const autoPlayActive = ref(props.autoPlay)
let autoPlayTimer: NodeJS.Timeout | null = null

// Fallback avatar images - diverse professional people
const fallbackAvatars = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1494790108755-2616b612b830?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face'
]

// Current testimonial computed
const currentTestimonial = computed(() => {
  if (props.testimonials.length === 0) return null
  return props.testimonials[currentSlide.value] || props.testimonials[0]
})

// Get avatar with fallback
const getAvatarImage = computed(() => {
  if (!currentTestimonial.value) return fallbackAvatars[0]
  
  // If testimonial has avatar, use it
  if (currentTestimonial.value.avatar) {
    return currentTestimonial.value.avatar
  }
  
  // Otherwise use a consistent fallback based on testimonial ID
  const fallbackIndex = (currentTestimonial.value.id || 0) % fallbackAvatars.length
  return fallbackAvatars[fallbackIndex]
})

// Computed properties
const truncatedContent = computed(() => {
  if (!currentTestimonial.value?.content) return ''
  
  const content = currentTestimonial.value.content
  if (content.length <= 200) return content
  
  // Find the last complete word within 200 characters
  const truncated = content.substring(0, 200)
  const lastSpaceIndex = truncated.lastIndexOf(' ')
  
  // If we found a space, cut at that point, otherwise use the full 200 chars
  const finalText = lastSpaceIndex > 150 ? truncated.substring(0, lastSpaceIndex) : truncated
  
  return finalText + '...'
})

const generateTitle = computed(() => {
  if (!currentTestimonial.value) return 'Client Testimonial'
  
  const { propertyType, rating = 5, content } = currentTestimonial.value
  
  // Create dynamic title based on testimonial data
  if (propertyType) {
    if (rating >= 5) {
      return `Exceptional ${propertyType} Experience`
    } else if (rating >= 4) {
      return `Outstanding ${propertyType} Service`
    } else {
      return `${propertyType} Experience`
    }
  }
  
  // Fallback: extract key words from content
  if (content) {
    const words = content.toLowerCase()
    if (words.includes('amazing') || words.includes('excellent')) {
      return 'Amazing Real Estate Experience'
    } else if (words.includes('professional') || words.includes('helpful')) {
      return 'Professional Service Experience'
    } else if (words.includes('recommend') || words.includes('satisfied')) {
      return 'Highly Recommended Service'
    }
  }
  
  // Final fallback
  return 'Client Testimonial'
})

// Slider methods
const nextSlide = () => {
  if (props.testimonials.length > 1) {
    currentSlide.value = (currentSlide.value + 1) % props.testimonials.length
  }
}

const previousSlide = () => {
  if (props.testimonials.length > 1) {
    currentSlide.value = currentSlide.value === 0 ? props.testimonials.length - 1 : currentSlide.value - 1
  }
}

const goToSlide = (index: number) => {
  currentSlide.value = index
}

const startAutoPlay = () => {
  if (props.testimonials.length > 1 && autoPlayActive.value) {
    autoPlayTimer = setInterval(nextSlide, props.autoPlayInterval)
  }
}

const stopAutoPlay = () => {
  if (autoPlayTimer) {
    clearInterval(autoPlayTimer)
    autoPlayTimer = null
  }
}

const formatDate = (dateString?: string) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Lifecycle
onMounted(() => {
  if (autoPlayActive.value) {
    startAutoPlay()
  }
})

onUnmounted(() => {
  stopAutoPlay()
})
</script>

<style scoped>
.testimonial-card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.testimonial-card:hover {
  transform: translateY(-5px);
}

.image-section {
  overflow: hidden;
  max-width: 100%;
  min-height: 400px;
}

.image-section .v-img {
  width: 100% !important;
  min-height: 400px !important;
  height: 100% !important;
}

.image-overlay {
  background: rgba(0, 0, 0, 0.4);
  top: 0;
  left: 0;
  z-index: 1;
}

.testimonial-text {
  font-size: 32px;
  font-weight: 900;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 2px;
  line-height: 0.9;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  position: relative;
  z-index: 2;
}

.quote-mark-top,
.quote-mark-bottom {
  font-size: 80px;
  font-weight: 900;
  color: #FFD700;
  line-height: 1;
  font-family: serif;
  position: relative;
  z-index: 10;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
}

.quote-mark-top {
  transform: rotate(180deg);
}

.quote-mark-bottom {
  transform: none;
}

/* Ensure overlay content is above the dark overlay */
.position-absolute.fill-height.w-100.d-flex {
  z-index: 2;
}

/* Transition animations */
.content-fade-enter-active,
.content-fade-leave-active {
  transition: all 0.3s ease;
}

.content-fade-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.content-fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.image-fade-enter-active,
.image-fade-leave-active {
  transition: opacity 0.4s ease;
}

.image-fade-enter-from,
.image-fade-leave-to {
  opacity: 0;
}

/* Mobile responsive adjustments */
@media (max-width: 960px) {
  .testimonial-text {
    font-size: 24px;
  }
}

@media (max-width: 600px) {
  .testimonial-text {
    font-size: 20px;
  }
}
</style>
