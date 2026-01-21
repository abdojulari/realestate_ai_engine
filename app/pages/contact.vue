<template>
  <div class="contact-page">
    <v-row no-gutters class="min-vh-100">
      <!-- Left Column: Visual & Brand Messaging -->
      <v-col cols="12" md="5" class="d-none d-md-flex position-relative overflow-hidden">
        <div class="parallax-wrapper">
          <div class="parallax-bg"></div>
          <div class="hero-overlay"></div>
          <div class="content-overlay pa-12 d-flex flex-column h-100">
            <div class="brand-badge mb-12 animate-fade-in">
              <NuxtLink to="/" class="text-decoration-none">
                <span class="text-h4 font-weight-black tracking-tighter text-white">AO<span class="text-primary">.</span></span>
              </NuxtLink>
            </div>

            <div class="mt-auto">
              <h2 class="premium-display text-h2 text-white mb-6">
                Personalized <br/>
                <span class="text-italic font-weight-light opacity-80">Consultation.</span>
              </h2>
              <p class="text-h6 text-white opacity-70 font-weight-light leading-relaxed max-w-400 mb-8">
                Whether you are refining your portfolio or searching for a legacy estate, our agents provide the data and discretion you require.
              </p>
              
              <div class="contact-details d-flex gap-8">
                <div class="detail-item">
                  <span class="premium-label text-white opacity-50 d-block mb-1">Direct Line</span>
                  <span class="text-body-1 text-white font-weight-medium">+1 (403) 555-0123</span>
                </div>
                <div class="detail-item">
                  <span class="premium-label text-white opacity-50 d-block mb-1">Inquiry Support</span>
                  <span class="text-body-1 text-white font-weight-medium">concierge@albertaone.ca</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </v-col>

      <!-- Right Column: The Form & Editorial Tips -->
      <v-col cols="12" md="7" class="form-column">
        <div class="scroll-container pa-6 pa-md-16">
          <div class="form-max-width">
            <div class="mb-10">
              <h1 class="text-h3 font-weight-black tracking-tighter mb-4">Connect With Us</h1>
              <p class="text-body-1 text-grey-darken-1">Please provide your details below. A licensed advisor will reach out within one business day.</p>
            </div>

            <v-form v-model="isValid" @submit.prevent="submit" class="mb-16">
              <v-row dense>
                <v-col cols="12" sm="6">
                  <div class="form-group mb-6">
                    <label class="premium-label mb-1">First Name</label>
                    <v-text-field
                      v-model="form.firstName"
                      :rules="[v => !!v || 'Required']"
                      variant="underlined"
                      placeholder="Jane"
                      color="black"
                      hide-details="auto"
                      class="premium-input"
                    />
                  </div>
                </v-col>
                <v-col cols="12" sm="6">
                  <div class="form-group mb-6">
                    <label class="premium-label mb-1">Last Name</label>
                    <v-text-field
                      v-model="form.lastName"
                      :rules="[v => !!v || 'Required']"
                      variant="underlined"
                      placeholder="Smith"
                      color="black"
                      hide-details="auto"
                      class="premium-input"
                    />
                  </div>
                </v-col>
              </v-row>

              <div class="form-group mb-6">
                <label class="premium-label mb-1">Email Address</label>
                <v-text-field
                  v-model="form.email"
                  type="email"
                  :rules="emailRules"
                  variant="underlined"
                  placeholder="jane@smith.com"
                  color="black"
                  hide-details="auto"
                  class="premium-input"
                />
              </div>

              <div class="form-group mb-6">
                <label class="premium-label mb-1">Phone Number (Optional)</label>
                <v-text-field
                  v-model="form.phone"
                  variant="underlined"
                  placeholder="+1 (403) 000-0000"
                  color="black"
                  hide-details="auto"
                  class="premium-input"
                />
              </div>

              <div class="form-group mb-10">
                <label class="premium-label mb-1">How can we assist you?</label>
                <v-textarea
                  v-model="form.message"
                  :rules="[v => !!v || 'Message required']"
                  variant="underlined"
                  placeholder="Tell us about your property goals..."
                  rows="3"
                  auto-grow
                  color="black"
                  hide-details="auto"
                  class="premium-input"
                />
              </div>

              <div class="d-flex flex-column flex-sm-row align-sm-center justify-space-between gap-6 pt-4">
                <p class="text-caption text-grey-darken-1 max-w-300">
                  By submitting this form, you acknowledge our <NuxtLink to="/privacy" class="text-black font-weight-bold">Privacy Policy</NuxtLink>.
                </p>
                <v-btn
                  color="black"
                  size="x-large"
                  rounded="pill"
                  class="px-10 font-weight-bold shadow-lg text-none"
                  :loading="submitting"
                  :disabled="!isValid"
                  @click="submit"
                >
                  Send Inquiry
                </v-btn>
              </div>
            </v-form>

            <!-- Editorial Tips Section -->
            <div class="tips-section pt-12 border-t">
              <div class="d-flex align-center justify-space-between mb-8">
                <h3 class="premium-label text-black font-weight-black">Expert Insights</h3>
                <div class="d-flex gap-2">
                  <v-btn icon="mdi-chevron-left" variant="text" density="comfortable" @click="scrollTips(-1)"></v-btn>
                  <v-btn icon="mdi-chevron-right" variant="text" density="comfortable" @click="scrollTips(1)"></v-btn>
                </div>
              </div>
              
              <div class="tips-container d-flex gap-6 overflow-x-auto pb-6 no-scrollbar" ref="tipsScroll">
                <v-card 
                  v-for="(t, i) in tips" 
                  :key="i"
                  flat 
                  class="tip-card flex-shrink-0"
                  min-width="280"
                  max-width="280"
                >
                  <div class="tip-number mb-4">0{{ i + 1 }}</div>
                  <h4 class="text-h6 font-weight-bold mb-2">{{ t.title }}</h4>
                  <p class="text-body-2 text-grey-darken-1 leading-relaxed">{{ t.text }}</p>
                </v-card>
              </div>
            </div>
          </div>
        </div>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const isValid = ref(false)
const submitting = ref(false)
const tipsScroll = ref<HTMLElement | null>(null)

const form = ref({ firstName:'', lastName:'', email:'', phone:'', message:'' })

const tips = [
  { title: 'The Art of Presentation', text: 'Curate your space to highlight architectural strengths rather than personal history.' },
  { title: 'Strategic Valuation', text: 'Assess market velocity and neighborhood micro-trends to find the optimal entry point.' },
  { title: 'Buyer Leverage', text: 'Secure pre-commitments to ensure your offer stands out in high-competition scenarios.' },
  { title: 'Atmospheric Appeal', text: 'Utilize lighting and scent profiles to evoke a sense of home from the first threshold.' }
]

const emailRules = [
  (v: string) => !!v || 'Required',
  (v: string) => /.+@.+\..+/.test(v) || 'Invalid email address'
]

const scrollTips = (dir: number) => {
  if (tipsScroll.value) {
    tipsScroll.value.scrollBy({ left: dir * 300, behavior: 'smooth' })
  }
}

const submit = async () => {
  submitting.value = true
  try {
    // Mocked fetch
    console.log('Sending message:', form.value)
    await new Promise(resolve => setTimeout(resolve, 1500))
    form.value = { firstName:'', lastName:'', email:'', phone:'', message:'' }
    isValid.value = false
  } catch (e) {
    console.error(e)
  } finally {
    submitting.value = false
  }
}

definePageMeta({ layout: 'default' })
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Inter:wght@300;400;500;600;800&display=swap');

.contact-page {
  font-family: 'Inter', sans-serif;
  background: #fff;
}

.min-vh-100 { min-height: 100vh; }

/* --- Left Column Hero --- */
.parallax-wrapper {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
}

.parallax-bg {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background-image: url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=2000&auto=format&fit=crop');
  background-size: cover;
  background-position: center;
  animation: slowZoom 20s infinite alternate;
}

@keyframes slowZoom {
  from { transform: scale(1); }
  to { transform: scale(1.1); }
}

.hero-overlay {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.85) 100%);
}

.content-overlay {
  position: relative;
  z-index: 2;
}

/* --- Form Column --- */
.form-column {
  background: #fff;
  display: flex;
  flex-direction: column;
}

.scroll-container {
  max-height: 100vh;
  overflow-y: auto;
}

.form-max-width {
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
}

/* --- Premium Typography --- */
.premium-display { font-family: 'Playfair Display', serif; }
.text-italic { font-style: italic; }

.premium-label {
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #64748b;
}

.premium-input :deep(.v-field__input) {
  font-size: 1.1rem;
  padding-left: 0;
  font-weight: 400;
}

/* --- Tips Styling --- */
.tip-card {
  border-left: 1px solid #e2e8f0;
  padding-left: 24px;
  background: transparent !important;
}

.tip-number {
  font-family: 'Playfair Display', serif;
  font-size: 1rem;
  font-style: italic;
  color: #94a3b8;
}

.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

.shadow-lg {
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
}

.max-w-400 { max-width: 400px; }
.max-w-300 { max-width: 300px; }
.gap-6 { gap: 1.5rem; }
.gap-8 { gap: 2rem; }

@media (max-width: 600px) {
  .scroll-container { max-height: none; }
}
</style>