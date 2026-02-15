<template>
  <div class="testimonial-submit-page">
    <v-container fluid class="pa-0 fill-height">
      <v-row no-gutters class="fill-height">
        <!-- Left Side - Animated Hero Section -->
        <v-col cols="12" lg="6" class="hero-section d-none d-lg-flex">
          <div class="hero-overlay"></div>
          
          <!-- Animated Background Images -->
          <div class="hero-images">
            <transition-group name="fade-slide" tag="div" class="image-carousel">
              <div 
                v-for="(slide, index) in slides" 
                :key="index"
                v-show="currentSlide === index"
                class="slide-image"
                :style="{ backgroundImage: `url(${slide.image})` }"
              ></div>
            </transition-group>
          </div>
          
          <!-- Content Overlay -->
          <div class="hero-content">
            <!-- Logo/Brand -->
            <div class="brand-section mb-8">
              <div class="brand-icon">
                <v-icon size="48" color="white">mdi-home-heart</v-icon>
              </div>
              <h2 class="brand-title">Abdul Ojulari</h2>
              <p class="brand-subtitle">Licensed REALTOR®</p>
            </div>
            
            <!-- Animated Statements -->
            <div class="statement-container">
              <transition name="slide-fade" mode="out-in">
                <div :key="currentSlide" class="statement-content">
                  <div class="statement-icon mb-4">
                    <v-icon :icon="slides[currentSlide]?.icon" size="32" color="white"></v-icon>
                  </div>
                  <p class="statement-text">{{ slides[currentSlide]?.statement }}</p>
                </div>
              </transition>
            </div>
            
            <!-- Slide Indicators -->
            <div class="slide-indicators">
              <button 
                v-for="(_, index) in slides" 
                :key="index"
                :class="['indicator', { active: currentSlide === index }]"
                @click="goToSlide(index)"
              ></button>
            </div>
            
            <!-- Trust Badges -->
            <div class="trust-badges mt-8">
              <div class="badge">
                <v-icon size="20" color="white">mdi-shield-check</v-icon>
                <span>20+ Years Experience in IT</span>
              </div>
              <div class="badge">
                <v-icon size="20" color="white">mdi-certificate</v-icon>
                <span>Licensed REALTOR®</span>
              </div>
              <div class="badge">
                <v-icon size="20" color="white">mdi-star</v-icon>
                <span>Trusted by Hundreds</span>
              </div>
            </div>
          </div>
        </v-col>
        
        <!-- Right Side - Form Section -->
        <v-col cols="12" lg="6" class="form-section py-12">
          <div class="form-wrapper">
            <!-- Mobile Hero (shown only on mobile) -->
            <div class="mobile-hero d-lg-none mb-8">
              <div class="mobile-hero-bg" :style="{ backgroundImage: `url(${slides[currentSlide]?.image})` }"></div>
              <div class="mobile-hero-overlay"></div>
              <div class="mobile-hero-content">
                <v-icon size="40" color="white" class="mb-2">mdi-home-heart</v-icon>
                <h2 class="text-h5 text-white font-weight-bold">Share Your Experience</h2>
                <p class="text-body-2 text-white-darken-1 mt-2">{{ slides[currentSlide]?.statement }}</p>
              </div>
            </div>
            
            <!-- Form Header -->
            <div class="form-header mb-8 d-none d-lg-block">
              <span class="section-tag">TESTIMONIALS</span>
              <h1 class="form-title">Share Your Story</h1>
              <p class="form-subtitle">Help other families find their dream home by sharing your experience with us</p>
            </div>
            
            <!-- Success State -->
            <v-card v-if="submitted" flat class="success-card text-center">
              <div class="success-icon-wrapper mb-6">
                <v-icon size="80" color="success">mdi-check-circle</v-icon>
              </div>
              <h2 class="text-h4 font-weight-bold mb-4">Thank You!</h2>
              <p class="text-body-1 text-grey-darken-1 mb-8">
                Your testimonial has been submitted successfully. We'll review it and publish it on our website soon.
              </p>
              <div class="d-flex justify-center flex-wrap ga-4">
                <v-btn color="primary" size="large" to="/" rounded="lg" class="px-8">
                  <v-icon start>mdi-home</v-icon>
                  Back to Home
                </v-btn>
                <v-btn variant="outlined" size="large" rounded="lg" class="px-8" @click="resetForm">
                  <v-icon start>mdi-refresh</v-icon>
                  Submit Another
                </v-btn>
              </div>
            </v-card>

            <!-- Testimonial Form -->
            <v-card v-else flat class="form-card">
              <v-form v-model="formValid" @submit.prevent="submitTestimonial">
                <!-- Personal Information Section -->
                <div class="form-section-group mb-8">
                  <div class="section-header mb-4">
                    <div class="section-icon">
                      <v-icon size="20" color="primary">mdi-account</v-icon>
                    </div>
                    <h3 class="section-title">Personal Information</h3>
                  </div>
                  
                  <v-row dense>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="form.name"
                        label="Full Name"
                        :rules="[rules.required]"
                        variant="outlined"
                        rounded="lg"
                        density="compact"
                        prepend-inner-icon="mdi-account-outline"
                        required
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="form.email"
                        label="Email Address"
                        type="email"
                        :rules="[rules.required, rules.email]"
                        variant="outlined"
                        rounded="lg"
                        density="compact"
                        prepend-inner-icon="mdi-email-outline"
                        required
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="form.phone"
                        label="Phone Number (Optional)"
                        variant="outlined"
                        rounded="lg"
                        density="compact"
                        prepend-inner-icon="mdi-phone-outline"
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="form.location"
                        label="Location (e.g., Edmonton, AB)"
                        :rules="[rules.required]"
                        variant="outlined"
                        rounded="lg"
                        density="compact"
                        prepend-inner-icon="mdi-map-marker-outline"
                        required
                      />
                    </v-col>
                  </v-row>
                </div>

                <!-- Experience Section -->
                <div class="form-section-group mb-8">
                  <div class="section-header mb-4">
                    <div class="section-icon">
                      <v-icon size="20" color="primary">mdi-star</v-icon>
                    </div>
                    <h3 class="section-title">Your Experience</h3>
                  </div>
                  
                  <v-row dense>
                    <v-col cols="12" md="6">
                      <v-select
                        v-model="form.propertyType"
                        :items="propertyTypes"
                        label="Service Type"
                        :rules="[rules.required]"
                        variant="outlined"
                        rounded="lg"
                        density="compact"
                        prepend-inner-icon="mdi-home-city-outline"
                        required
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <div class="rating-field">
                        <label class="rating-label">Rate Your Experience</label>
                        <div class="rating-wrapper">
                          <v-rating
                            v-model="form.rating"
                            color="amber-darken-1"
                            active-color="amber-darken-1"
                            size="32"
                            hover
                            density="compact"
                          />
                          <span class="rating-text">{{ getRatingText(form.rating) }}</span>
                        </div>
                      </div>
                    </v-col>
                  </v-row>

                  <v-textarea
                    v-model="form.content"
                    label="Tell us about your experience"
                    :rules="[rules.required, rules.minLength(50)]"
                    hint="Share details about your experience working with us (minimum 50 characters)"
                    rows="4"
                    variant="outlined"
                    rounded="lg"
                    counter="500"
                    :max-length="500"
                    required
                    class="mt-2"
                  />
                </div>

                <!-- Photo Upload Section -->
                <div class="form-section-group mb-8">
                  <div class="section-header mb-4">
                    <div class="section-icon">
                      <v-icon size="20" color="primary">mdi-camera</v-icon>
                    </div>
                    <h3 class="section-title">Profile Photo <span class="optional-tag">(Optional)</span></h3>
                  </div>
                  
                  <div v-if="form.avatar" class="photo-preview mb-4">
                    <v-avatar size="100" class="elevation-4">
                      <v-img :src="form.avatar" alt="Preview" cover />
                    </v-avatar>
                    <v-btn
                      size="small"
                      variant="tonal"
                      color="error"
                      rounded="lg"
                      class="mt-3"
                      @click="removePhoto"
                    >
                      <v-icon start size="16">mdi-trash-can-outline</v-icon>
                      Remove
                    </v-btn>
                  </div>

                  <v-file-input
                    v-model="photoFile"
                    label="Upload your photo"
                    accept="image/*"
                    variant="outlined"
                    rounded="lg"
                    density="compact"
                    prepend-icon=""
                    prepend-inner-icon="mdi-cloud-upload-outline"
                    :rules="photoFile ? [rules.fileSize, rules.fileType] : []"
                    @update:model-value="handlePhotoUpload"
                  />
                  <p class="text-caption text-grey mt-1">Max 2MB, JPG/PNG only</p>
                </div>

                <!-- Consent Section -->
                <div class="consent-section mb-8">
                  <v-checkbox
                    v-model="form.consent"
                    :rules="[rules.required]"
                    color="primary"
                    hide-details
                    required
                  >
                    <template #label>
                      <span class="consent-text">
                        I consent to having my testimonial and photo displayed on the website and marketing materials.
                        <span class="text-error">*</span>
                      </span>
                    </template>
                  </v-checkbox>
                </div>

                <!-- Submit Button -->
                <v-btn
                  type="submit"
                  color="primary"
                  size="x-large"
                  block
                  rounded="lg"
                  :loading="submitting"
                  :disabled="!formValid"
                  class="submit-btn"
                >
                  <v-icon start>mdi-send</v-icon>
                  Submit Testimonial
                </v-btn>
                
                <p class="privacy-note text-center mt-4">
                  <v-icon size="14" class="mr-1">mdi-shield-check</v-icon>
                  Your information is secure and will never be shared without consent.
                </p>
              </v-form>
            </v-card>
          </div>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup lang="ts">
// Meta
definePageMeta({
  layout: 'default'
})

// Slides data with statements
const slides = ref([
  {
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1973&auto=format&fit=crop',
    statement: 'Your real estate journey starts with Abdul.',
    icon: 'mdi-rocket-launch'
  },
  {
    image: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?q=80&w=2096&auto=format&fit=crop',
    statement: 'Begin your real estate journey with confidence — begin with Abdul.',
    icon: 'mdi-shield-star'
  },
  {
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2075&auto=format&fit=crop',
    statement: 'Where smart real estate decisions begin: Abdul.',
    icon: 'mdi-lightbulb-on'
  },
  {
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop',
    statement: 'Working with an expert like Abdul creates a smooth, memorable, and rewarding real estate experience.',
    icon: 'mdi-trophy'
  },
  {
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2053&auto=format&fit=crop',
    statement: 'Partnering with Abdul means an experience you\'ll remember for all the right reasons.',
    icon: 'mdi-handshake'
  },
  {
    image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?q=80&w=2070&auto=format&fit=crop',
    statement: 'Working with a licensed realtor is about more than just a transaction — it\'s about protecting your money, saving time, and eliminating stress.',
    icon: 'mdi-shield-check'
  },
  {
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop',
    statement: 'With over 20 years of proven experience as a real estate expert, investor, and technology professional, Abdul delivers a seamless, secure, and modern experience.',
    icon: 'mdi-certificate'
  }
])

const currentSlide = ref(0)
let slideInterval: ReturnType<typeof setInterval> | null = null

// Auto-advance slides
const startSlideshow = () => {
  slideInterval = setInterval(() => {
    currentSlide.value = (currentSlide.value + 1) % slides.value.length
  }, 6000)
}

const goToSlide = (index: number) => {
  currentSlide.value = index
  // Reset interval
  if (slideInterval) clearInterval(slideInterval)
  startSlideshow()
}

onMounted(() => {
  startSlideshow()
})

onUnmounted(() => {
  if (slideInterval) clearInterval(slideInterval)
})

// Reactive state
const formValid = ref(false)
const submitted = ref(false)
const submitting = ref(false)
const photoFile = ref<File[]>([])

const form = reactive({
  name: '',
  email: '',
  phone: '',
  location: '',
  propertyType: '',
  rating: 5,
  content: '',
  avatar: '',
  consent: false
})

// Form options
const propertyTypes = [
  { title: 'Home Buyer', value: 'Buyer' },
  { title: 'Home Seller', value: 'Seller' },
  { title: 'Rental Client', value: 'Rental' },
  { title: 'Property Investor', value: 'Investor' },
  { title: 'First-Time Buyer', value: 'First-Time Buyer' }
]

// Validation rules
const rules = {
  required: (v: any) => !!v || 'This field is required',
  email: (v: string) => {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return pattern.test(v) || 'Please enter a valid email address'
  },
  minLength: (min: number) => (v: string) => 
    (v && v.length >= min) || `Minimum ${min} characters required`,
  fileSize: (files: File[]) => {
    if (!files || files.length === 0) return true
    const file = files[0]
    return !file || file.size <= 2 * 1024 * 1024 || 'File size must be less than 2MB'
  },
  fileType: (files: File[]) => {
    if (!files || files.length === 0) return true
    const file = files[0]
    if (!file) return true
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
    return allowedTypes.includes(file.type) || 'Only JPG and PNG files are allowed'
  }
}

// Methods
const getRatingText = (rating: number) => {
  const texts = {
    1: 'Poor',
    2: 'Fair', 
    3: 'Good',
    4: 'Very Good',
    5: 'Excellent'
  }
  return texts[rating as keyof typeof texts] || ''
}

const handlePhotoUpload = async (files: File | File[] | null) => {
  if (!files || (Array.isArray(files) && files.length === 0)) {
    form.avatar = ''
    return
  }

  const file = Array.isArray(files) ? files[0] : files
  if (!file) return
  
  // Validate file
  if (file.size > 2 * 1024 * 1024) {
    return // Error will be shown by rules
  }

  // Create preview
  const reader = new FileReader()
  reader.onload = (e) => {
    form.avatar = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

const removePhoto = () => {
  form.avatar = ''
  photoFile.value = []
}

const submitTestimonial = async () => {
  if (!formValid.value) return

  submitting.value = true
  try {
    const formData = new FormData()
    
    // Add form fields
    Object.entries(form).forEach(([key, value]) => {
      if (key !== 'avatar') {
        formData.append(key, String(value))
      }
    })

    // Add photo if uploaded
    if (photoFile.value && photoFile.value.length > 0) {
      formData.append('photo', photoFile.value[0] as any)
    }

    const response = await fetch('/api/testimonials', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.statusMessage || 'Failed to submit testimonial')
    }

    submitted.value = true
  } catch (error: any) {
    console.error('Error submitting testimonial:', error)
    // You might want to show an error dialog here
    alert('Failed to submit testimonial. Please try again.')
  } finally {
    submitting.value = false
  }
}

const resetForm = () => {
  // Reset form
  Object.assign(form, {
    name: '',
    email: '',
    phone: '',
    location: '',
    propertyType: '',
    rating: 5,
    content: '',
    avatar: '',
    consent: false
  })
  photoFile.value = []
  submitted.value = false
}
</script>

<style scoped>
.testimonial-submit-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

/* Hero Section - Left Side */
.hero-section {
  position: relative;
  background: #1a1a2e;
  overflow: hidden;
  min-height: 100vh;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(26, 26, 46, 0.95) 0%,
    rgba(22, 33, 62, 0.85) 50%,
    rgba(26, 26, 46, 0.9) 100%
  );
  z-index: 1;
}

.hero-images {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.image-carousel {
  position: relative;
  width: 100%;
  height: 100%;
}

.slide-image {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  transition: opacity 1s ease-in-out;
}

.hero-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding: 3rem;
  text-align: center;
}

/* Brand Section */
.brand-section {
  text-align: center;
}

.brand-icon {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  box-shadow: 0 10px 40px rgba(102, 126, 234, 0.4);
}

.brand-title {
  font-size: 2rem;
  font-weight: 700;
  color: white;
  margin-bottom: 0.25rem;
  letter-spacing: -0.02em;
}

.brand-subtitle {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.15em;
}

/* Statement Container */
.statement-container {
  max-width: 500px;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.statement-content {
  text-align: center;
}

.statement-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.statement-text {
  font-size: 1.35rem;
  line-height: 1.6;
  color: white;
  font-weight: 300;
  letter-spacing: 0.01em;
}

/* Slide Indicators */
.slide-indicators {
  display: flex;
  gap: 10px;
  margin-top: 2rem;
}

.indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.4);
  background: transparent;
  cursor: pointer;
  transition: all 0.3s ease;
}

.indicator:hover {
  border-color: rgba(255, 255, 255, 0.8);
}

.indicator.active {
  background: white;
  border-color: white;
  transform: scale(1.2);
}

/* Trust Badges */
.trust-badges {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.badge span {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
}

/* Form Section - Right Side */
.form-section {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  min-height: 100vh;
  overflow-y: auto;
}

.form-wrapper {
  width: 100%;
  max-width: 580px;
}

/* Mobile Hero */
.mobile-hero {
  position: relative;
  height: 200px;
  border-radius: 20px;
  overflow: hidden;
  margin: -2rem -2rem 0;
  margin-bottom: 2rem;
}

.mobile-hero-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
}

.mobile-hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(26, 26, 46, 0.9), rgba(22, 33, 62, 0.85));
}

.mobile-hero-content {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  text-align: center;
}

/* Form Header */
.form-header {
  text-align: left;
}

.section-tag {
  display: inline-block;
  padding: 0.35rem 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  border-radius: 50px;
  margin-bottom: 1rem;
}

.form-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 0.75rem;
  letter-spacing: -0.02em;
}

.form-subtitle {
  font-size: 1.1rem;
  color: #64748b;
  line-height: 1.6;
}

/* Form Card */
.form-card {
  background: white;
  border-radius: 24px;
  padding: 2.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.05);
}

.success-card {
  background: white;
  border-radius: 24px;
  padding: 3rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.05);
}

.success-icon-wrapper {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #10b98120, #059669 10);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

/* Form Section Groups */
.form-section-group {
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #f1f5f9;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.section-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #667eea15, #764ba215);
  display: flex;
  align-items: center;
  justify-content: center;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1a1a2e;
}

.optional-tag {
  font-weight: 400;
  color: #94a3b8;
  font-size: 0.875rem;
}

/* Rating Field */
.rating-field {
  padding: 0.75rem 0;
}

.rating-label {
  font-size: 0.875rem;
  color: #64748b;
  margin-bottom: 0.5rem;
  display: block;
}

.rating-wrapper {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.rating-text {
  font-size: 0.875rem;
  color: #f59e0b;
  font-weight: 500;
}

/* Photo Preview */
.photo-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem;
  background: #f8fafc;
  border-radius: 16px;
}

/* Consent Section */
.consent-section {
  padding: 1rem 1.25rem;
  background: #f8fafc;
  border-radius: 12px;
}

.consent-text {
  font-size: 0.9rem;
  color: #475569;
  line-height: 1.5;
}

/* Submit Button */
.submit-btn {
  height: 56px;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.submit-btn:hover {
  box-shadow: 0 10px 40px rgba(102, 126, 234, 0.4);
  transform: translateY(-2px);
}

/* Privacy Note */
.privacy-note {
  font-size: 0.8rem;
  color: #94a3b8;
}

/* Animations */
.slide-fade-enter-active {
  transition: all 0.6s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.4s ease-in;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 1s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
}

/* Responsive */
@media (max-width: 1280px) {
  .hero-content {
    padding: 2rem;
  }
  
  .statement-text {
    font-size: 1.2rem;
  }
  
  .form-wrapper {
    max-width: 100%;
  }
}

@media (max-width: 960px) {
  .form-section {
    padding: 0;
  }
  
  .form-wrapper {
    padding: 1.5rem;
  }
  
  .form-card {
    padding: 1.5rem;
    border-radius: 0;
  }
  
  .mobile-hero {
    border-radius: 0;
    margin: 0 -1.5rem 2rem;
  }
}

@media (max-width: 600px) {
  .form-title {
    font-size: 1.75rem;
  }
  
  .trust-badges {
    flex-direction: column;
    align-items: center;
  }
}
</style>
