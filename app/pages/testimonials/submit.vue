<template>
  <div class="testimonial-submit-page">
    <!-- Hero Section -->
    <v-img
      height="300"
      cover
      src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2070&auto=format&fit=crop"
      gradient="to bottom, rgba(0,0,0,.4), rgba(0,0,0,.7)"
      referrerpolicy="no-referrer"
    >
      <div class="d-flex flex-column align-center justify-center text-center h-100 px-4">
        <h1 class="text-h3 text-white mb-3 font-weight-bold">Share Your Experience</h1>
        <p class="text-h6 text-white" style="max-width: 600px;">
          Help other families find their dream home by sharing your story with us
        </p>
      </div>
    </v-img>

    <v-container class="py-12">
      <v-row justify="center">
        <v-col cols="12" md="8" lg="6">
          <!-- Success State -->
          <v-card v-if="submitted" flat class="text-center pa-8">
            <v-icon size="80" color="success" class="mb-4">
              mdi-check-circle-outline
            </v-icon>
            <h2 class="text-h4 mb-4">Thank You!</h2>
            <p class="text-body-1 mb-6">
              Your testimonial has been submitted successfully. We'll review it and publish it on our website soon.
            </p>
            <div class="d-flex justify-center gap-4">
              <v-btn color="primary" to="/">
                Back to Home
              </v-btn>
              <v-btn variant="outlined" @click="resetForm">
                Submit Another
              </v-btn>
            </div>
          </v-card>

          <!-- Testimonial Form -->
          <v-card v-else flat elevation="2" class="pa-6">
            <v-card-title class="text-h4 text-center mb-6 pa-0">
              Share Your Story
            </v-card-title>
            
            <v-form v-model="formValid" @submit.prevent="submitTestimonial">
              <!-- Personal Information -->
              <div class="mb-6">
                <h3 class="text-h6 mb-4 text-primary">Personal Information</h3>
                <v-row>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="form.name"
                      label="Your Full Name"
                      :rules="[rules.required]"
                      variant="outlined"
                      density="compact"
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
                      density="compact"
                      required
                    />
                  </v-col>
                </v-row>

                <v-row>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="form.phone"
                      label="Phone Number (Optional)"
                      variant="outlined"
                      density="compact"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="form.location"
                      label="Location (e.g., Edmonton, AB)"
                      :rules="[rules.required]"
                      variant="outlined"
                      density="compact"
                      required
                    />
                  </v-col>
                </v-row>
              </div>

              <!-- Experience Details -->
              <div class="mb-6">
                <h3 class="text-h6 mb-4 text-primary">Your Experience</h3>
                
                <v-row>
                  <v-col cols="12" md="6">
                    <v-select
                      v-model="form.propertyType"
                      :items="propertyTypes"
                      label="Service Type"
                      :rules="[rules.required]"
                      variant="outlined"
                      density="compact"
                      required
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <div class="mb-2">
                      <label class="text-subtitle-2 text-grey-darken-1">Rate Your Experience</label>
                    </div>
                    <v-rating
                      v-model="form.rating"
                      color="amber"
                      size="large"
                      hover
                      :rules="[rules.required]"
                    />
                    <div class="text-caption text-grey mt-1">
                      {{ getRatingText(form.rating) }}
                    </div>
                  </v-col>
                </v-row>

                <v-textarea
                  v-model="form.content"
                  label="Tell us about your experience"
                  :rules="[rules.required, rules.minLength(50)]"
                  hint="Please share details about your experience working with us (minimum 50 characters)"
                  rows="5"
                  variant="outlined"
                  counter="500"
                  :max-length="500"
                  required
                />
              </div>

              <!-- Photo Upload -->
              <div class="mb-6">
                <h3 class="text-h6 mb-4 text-primary">Profile Photo (Optional)</h3>
                
                <div v-if="form.avatar" class="mb-4 text-center">
                  <v-avatar size="100" class="mb-2">
                    <v-img :src="form.avatar" alt="Preview" cover />
                  </v-avatar>
                  <div>
                    <v-btn
                      size="small"
                      variant="outlined"
                      color="error"
                      @click="removePhoto"
                    >
                      Remove Photo
                    </v-btn>
                  </div>
                </div>

                <v-file-input
                  v-model="photoFile"
                  label="Upload your photo"
                  accept="image/*"
                  variant="outlined"
                  density="compact"
                  prepend-icon="mdi-camera"
                  :rules="photoFile ? [rules.fileSize, rules.fileType] : []"
                  @update:model-value="handlePhotoUpload"
                />
                <div class="text-caption text-grey">
                  Optional: Upload a professional photo (Max 2MB, JPG/PNG only)
                </div>
              </div>

              <!-- Consent -->
              <div class="mb-6">
                <v-checkbox
                  v-model="form.consent"
                  :rules="[rules.required]"
                  required
                >
                  <template #label>
                    <div class="text-body-2">
                      I consent to having my testimonial and photo displayed on the website and marketing materials. 
                      <span class="text-primary">*</span>
                    </div>
                  </template>
                </v-checkbox>
              </div>

              <!-- Submit Button -->
              <div class="text-center">
                <v-btn
                  type="submit"
                  color="primary"
                  size="large"
                  :loading="submitting"
                  :disabled="!formValid"
                  class="px-8"
                >
                  Submit Testimonial
                </v-btn>
              </div>
            </v-form>
          </v-card>
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
    return file.size <= 2 * 1024 * 1024 || 'File size must be less than 2MB'
  },
  fileType: (files: File[]) => {
    if (!files || files.length === 0) return true
    const file = files[0]
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

const handlePhotoUpload = async (files: File[]) => {
  if (!files || files.length === 0) {
    form.avatar = ''
    return
  }

  const file = files[0]
  
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
      formData.append('photo', photoFile.value[0])
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
  background: #fafafa;
}

.gap-4 {
  gap: 16px;
}

/* Mobile responsive */
@media (max-width: 600px) {
  .text-h3 {
    font-size: 1.8rem !important;
  }
  
  .text-h6 {
    font-size: 1.1rem !important;
  }
}
</style>
