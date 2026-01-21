<template>
  <v-container class="py-16">
    <v-row justify="center">
      <v-col cols="12" md="10" lg="8">
        <!-- Hero Section -->
        <div class="text-center mb-12">
          <div class="premium-badge mb-4">Legal Documentation</div>
          <h1 class="display-serif mb-4">Terms & Conditions</h1>
          <p class="subtitle-text">Homes By Abdul Ojulari</p>
          <div class="elegant-divider mx-auto"></div>
        </div>

        <v-card class="premium-main-card" border>
          <v-card-text class="pa-10">
            <v-row align="center">
              <v-col cols="12" md="7">
                <div class="d-flex align-center mb-6">
                  <div class="icon-circle mr-4">
                    <v-icon icon="mdi-shield-check-outline" color="gold-darken-2" />
                  </div>
                  <h2 class="text-h5 font-weight-bold">Agreement Overview</h2>
                </div>
                
                <p class="text-body-1 text-secondary mb-8">
                  By accessing our digital services, you enter into a binding agreement with Homes By Abdul Ojulari. 
                  These terms govern your usage of our property platforms and the protection of your digital rights.
                </p>

                <v-btn 
                  block
                  height="56"
                  class="premium-action-btn"
                  @click="dialog = true"
                >
                  <v-icon left class="mr-2">mdi-text-box-search-outline</v-icon>
                  Review Full Disclosure
                </v-btn>
              </v-col>

              <v-col cols="12" md="5" class="border-left-md pl-md-10">
                <div class="metadata-item">
                  <span class="label">Last Updated</span>
                  <span class="value">September 18, 2025</span>
                </div>
                <div class="metadata-item">
                  <span class="label">Effective Date</span>
                  <span class="value">September 18, 2025</span>
                </div>
                <div class="metadata-item">
                  <span class="label">Jurisdiction</span>
                  <span class="value">Edmonton, Alberta, CA</span>
                </div>
                
                <v-alert
                  variant="text"
                  density="compact"
                  class="legal-alert pa-0 mt-6"
                  icon="mdi-information-outline"
                >
                  <small class="text-grey-darken-1">
                    Compliance with local RECA (Real Estate Council of Alberta) standards is maintained throughout these terms.
                  </small>
                </v-alert>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Full Screen Legal Dialog -->
    <v-dialog 
      v-model="dialog" 
      max-width="1000px" 
      transition="dialog-bottom-transition"
      scrollable
    >
      <v-card class="legal-dialog-card">
        <v-card-title class="pa-0">
          <div class="dialog-header px-8 py-6 d-flex align-center">
            <div>
              <h2 class="text-h5 font-weight-black mb-1">Detailed Terms of Service</h2>
              <p class="text-caption text-uppercase letter-spacing-1">Homes By Abdul Ojulari</p>
            </div>
            <v-spacer />
            <v-btn 
              icon="mdi-close" 
              variant="tonal" 
              density="comfortable" 
              @click="dialog = false" 
              class="rounded-lg"
            />
          </div>
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-0 bg-stone">
          <div class="legal-content-container pa-10">
            <!-- Table of Contents / Summary -->
            <div class="summary-box mb-12 pa-6 rounded-xl">
              <h3 class="text-subtitle-1 font-weight-bold mb-3">Key Highlights</h3>
              <p class="text-body-2 text-secondary mb-0">
                Welcome to <strong>Homes By Abdul Ojulari</strong>. By using our App, you agree to these Terms. 
                If you do not agree, please cease use immediately.
              </p>
            </div>

            <div class="legal-sections">
              <!-- Section 1 -->
              <section class="legal-section">
                <div class="section-number">01</div>
                <div class="section-body">
                  <h3 class="section-title">Acceptance of Terms</h3>
                  <p>These Terms apply to all users, including real estate agents, property seekers, and general visitors. Use of the app constitutes a formal digital signature of acceptance.</p>
                </div>
              </section>

              <!-- Section 2 -->
              <section class="legal-section">
                <div class="section-number">02</div>
                <div class="section-body">
                  <h3 class="section-title">Eligibility</h3>
                  <p>Usage is restricted to individuals 18 years of age or older. By proceeding, you warrant your legal capacity to enter into binding contracts.</p>
                </div>
              </section>

              <!-- Section 3 -->
              <section class="legal-section">
                <div class="section-number">03</div>
                <div class="section-body">
                  <h3 class="section-title">Data Collection & Privacy</h3>
                  <p>We prioritize the integrity of your personal information. Data collected includes:</p>
                  <ul class="premium-list">
                    <li>Full Legal Identity & Contact Metadata</li>
                    <li>Property Preferences & Search Behavior</li>
                    <li>Geospatial Location Data (Optional)</li>
                  </ul>
                  <p class="mt-4">This data is utilized for service optimization and curated marketing communications. You may opt out at any time via your account settings.</p>
                </div>
              </section>

              <!-- Contact Section -->
              <section class="legal-section contact-section mt-12">
                <div class="section-body">
                  <h3 class="section-title">Corporate Inquiries</h3>
                  <div class="contact-grid mt-6">
                    <div class="contact-card">
                      <v-icon icon="mdi-email-outline" size="small" />
                      <span>info@homesbyabdulojulari.ca</span>
                    </div>
                    <div class="contact-card">
                      <v-icon icon="mdi-phone-outline" size="small" />
                      <span>647-563-7235</span>
                    </div>
                    <div class="contact-card">
                      <v-icon icon="mdi-map-marker-outline" size="small" />
                      <span>Edmonton, Alberta, Canada</span>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-6 bg-white">
          <v-spacer />
          <v-btn 
            variant="flat" 
            color="#121212" 
            class="px-10 rounded-pill text-none font-weight-bold"
            height="50"
            @click="dialog = false"
          >
            I Acknowledge and Agree
          </v-btn>
          <v-spacer />
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'

const dialog = ref(false)

// Optional: SEO logic remains functional
if (typeof useHead !== 'undefined') {
  useHead({
    title: 'Legal | Homes By Abdul Ojulari',
    meta: [
      { name: 'description', content: 'Official Terms and Conditions for Homes By Abdul Ojulari real estate services.' }
    ]
  })
}
</script>

<style scoped>
/* Typography & Palette */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Inter:wght@300;400;600;700&display=swap');

.display-serif {
  font-family: 'Playfair Display', serif;
  font-size: 3.5rem;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: -0.02em;
}

.subtitle-text {
  font-family: 'Inter', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.3em;
  color: #8c734b; /* Muted Gold */
  font-weight: 600;
  font-size: 0.85rem;
}

/* UI Elements */
.premium-badge {
  display: inline-block;
  background: #f4f1ea;
  color: #8c734b;
  padding: 6px 16px;
  border-radius: 100px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.elegant-divider {
  width: 60px;
  height: 3px;
  background: #8c734b;
  margin-top: 1rem;
}

.premium-main-card {
  border-radius: 24px !important;
  background: #ffffff !important;
  border: 1px solid #e5e7eb !important;
  box-shadow: 0 20px 40px rgba(0,0,0,0.05) !important;
}

.icon-circle {
  width: 48px;
  height: 48px;
  background: #f4f1ea;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.premium-action-btn {
  background: #121212 !important;
  color: white !important;
  border-radius: 12px !important;
  text-transform: none !important;
  font-weight: 700 !important;
  font-size: 1rem !important;
  letter-spacing: 0;
  transition: all 0.3s ease;
}

.premium-action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(0,0,0,0.2) !important;
}

/* Metadata */
.metadata-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f3f4f6;
}

.metadata-item .label {
  font-size: 0.75rem;
  text-transform: uppercase;
  font-weight: 700;
  color: #9ca3af;
}

.metadata-item .value {
  font-size: 0.9rem;
  font-weight: 600;
  color: #111827;
}

/* Dialog Styles */
.legal-dialog-card {
  border-radius: 28px !important;
  overflow: hidden;
}

.dialog-header {
  background: #fff;
}

.bg-stone {
  background-color: #f9f9f8;
}

.summary-box {
  background: #ffffff;
  border: 1px solid #e5e7eb;
}

.legal-section {
  display: flex;
  gap: 24px;
  margin-bottom: 48px;
}

.section-number {
  font-family: 'Playfair Display', serif;
  font-size: 1.5rem;
  font-style: italic;
  color: #8c734b;
  opacity: 0.5;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: #111827;
  margin-bottom: 12px;
}

.section-body p {
  color: #4b5563;
  line-height: 1.8;
  font-size: 1.05rem;
}

.premium-list {
  list-style: none;
  padding-left: 0;
  margin-top: 16px;
}

.premium-list li {
  position: relative;
  padding-left: 28px;
  margin-bottom: 12px;
  color: #4b5563;
  font-weight: 500;
}

.premium-list li::before {
  content: "→";
  position: absolute;
  left: 0;
  color: #8c734b;
  font-weight: bold;
}

.contact-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.contact-card {
  background: #fff;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.9rem;
  font-weight: 600;
}

/* Responsive Fixes */
@media (min-width: 960px) {
  .border-left-md {
    border-left: 1px solid #f3f4f6 !important;
  }
}

@media (max-width: 600px) {
  .display-serif {
    font-size: 2.5rem;
  }
  .pa-10 {
    padding: 24px !important;
  }
  .legal-section {
    flex-direction: column;
    gap: 8px;
  }
}
</style>