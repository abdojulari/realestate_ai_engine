<template>
  <div class="premium-page-wrapper">
    <!-- Sophisticated Hero Header -->
    <v-img
      height="320"
      cover
      src="https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?q=80&w=1920&auto=format&fit=crop"
      gradient="to bottom, rgba(18, 18, 18, 0.4), rgba(18, 18, 18, 0.9)"
      class="hero-section"
      referrerpolicy="no-referrer"
    >
      <v-container class="h-100 d-flex flex-column justify-center align-center text-center">
        <div class="premium-badge-light mb-4">Security & Trust</div>
        <h1 class="display-serif-large text-white mb-4">Privacy Policy</h1>
        <div class="elegant-divider-gold"></div>
        <p class="text-overline text-white mt-6 letter-spacing-2">PropertyMatch Integrity Standards</p>
      </v-container>
    </v-img>

    <!-- Main Content Interface -->
    <v-container class="py-12">
      <v-row justify="center">
        <!-- Sidebar Navigation (Desktop) -->
        <v-col cols="12" md="3" class="d-none d-md-block">
          <div class="sticky-nav">
            <NuxtLink to="/" class="back-link mb-8 d-flex align-center">
              <v-icon icon="mdi-arrow-left" size="small" class="mr-2" />
              Return to Platform
            </NuxtLink>
            
            <div class="nav-header">Document Sections</div>
            <v-list bg-color="transparent" density="compact" class="legal-nav-list">
              <v-list-item title="Definitions" @click="scrollTo('definitions')" />
              <v-list-item title="Data Collection" @click="scrollTo('collection')" />
              <v-list-item title="Use of Information" @click="scrollTo('usage')" />
              <v-list-item title="Data Security" @click="scrollTo('security')" />
              <v-list-item title="Contact Support" @click="scrollTo('contact')" />
            </v-list>

            <div class="update-card mt-10">
              <div class="text-caption text-uppercase font-weight-bold text-grey">Revision Date</div>
              <div class="text-body-2 font-weight-bold">September 3, 2025</div>
            </div>
          </div>
        </v-col>

        <!-- Main Editorial Content -->
        <v-col cols="12" md="8" lg="7">
          <v-card variant="flat" class="editorial-card pa-md-10 pa-6">
            
            <section class="intro-text mb-12">
              <p class="text-h5 font-weight-light line-height-relaxed text-grey-darken-3">
                At PropertyMatch, we recognize that your privacy is the cornerstone of our relationship. 
                This policy outlines our rigorous standards for safeguarding your digital footprint.
              </p>
            </section>

            <!-- Definitions -->
            <section id="definitions" class="mb-12">
              <h2 class="section-title-premium mb-6">01. Interpretation & Definitions</h2>
              <p class="mb-6">The following terminology governs the interpretation of your rights and our obligations under this framework.</p>
              
              <div class="definition-grid">
                <div class="def-item">
                  <span class="def-term">Account</span>
                  <span class="def-desc">A unique credential set created for Your exclusive access to our premium real estate services.</span>
                </div>
                <div class="def-item">
                  <span class="def-term">Personal Data</span>
                  <span class="def-desc">Any specific metadata that relates to an identified or identifiable individual using our platform.</span>
                </div>
                <div class="def-item">
                  <span class="def-term">Application</span>
                  <span class="def-desc">Refers to PropertyMatch, the proprietary software architecture provided by the Company.</span>
                </div>
              </div>
            </section>

            <!-- Collection -->
            <section id="collection" class="mb-12">
              <h2 class="section-title-premium mb-6">02. Data Acquisition Standards</h2>
              <h3 class="text-subtitle-1 font-weight-bold mb-4 text-uppercase letter-spacing-1">Directly Provided Information</h3>
              <p class="mb-4">While navigating our luxury services, we may require specific identifying markers to provide a bespoke experience:</p>
              
              <v-row class="mb-8">
                <v-col cols="12" sm="6">
                  <div class="data-pill"><v-icon icon="mdi-check" color="gold" class="mr-2"/> Legal Identity Mapping</div>
                  <div class="data-pill"><v-icon icon="mdi-check" color="gold" class="mr-2"/> Secure Communication Channels</div>
                </v-col>
                <v-col cols="12" sm="6">
                  <div class="data-pill"><v-icon icon="mdi-check" color="gold" class="mr-2"/> Geospatial Preferences</div>
                  <div class="data-pill"><v-icon icon="mdi-check" color="gold" class="mr-2"/> Transactional Metadata</div>
                </v-col>
              </v-row>

              <h3 class="text-subtitle-1 font-weight-bold mb-4">Automated Usage Analytics</h3>
              <p class="text-body-1 text-grey-darken-2">
                Usage Data is harvested automatically to ensure platform stability. This encompasses IP addresses, browser architectural details, and interaction duration to optimize your search journey.
              </p>
            </section>

            <!-- Usage -->
            <section id="usage" class="mb-12">
              <h2 class="section-title-premium mb-6">03. Strategic Application of Data</h2>
              <p class="mb-6">The Company utilizes your Personal Data for specific, high-value purposes:</p>
              
              <div class="purpose-card mb-4" v-for="item in ['Service Continuity', 'Account Governance', 'Contractual Compliance', 'Curated Market News']" :key="item">
                <v-icon icon="mdi-shield-crown-outline" color="#8c734b" class="mr-4" />
                <span class="font-weight-bold text-grey-darken-4">{{ item }}</span>
              </div>
            </section>

            <!-- Security -->
            <section id="security" class="mb-12">
              <v-alert
                border="start"
                color="#121212"
                theme="dark"
                variant="flat"
                class="security-alert rounded-xl pa-8"
              >
                <template v-slot:prepend>
                  <v-icon size="48" icon="mdi-lock-outline" color="#8c734b" />
                </template>
                <h3 class="text-h5 font-weight-bold mb-2">Security Architecture</h3>
                <p class="text-body-2 opacity-80">
                  While no digital transmission is infallible, we employ enterprise-grade encryption and commercially accepted protocols to maintain the sanctity of your private information.
                </p>
              </v-alert>
            </section>

            <!-- Contact -->
            <section id="contact" class="mt-16">
              <div class="contact-footer-card">
                <h2 class="display-serif text-h4 mb-4">Concierge Support</h2>
                <p class="mb-8">Should you require further clarification regarding our privacy protocols, our legal concierge is at your disposal.</p>
                
                <v-list bg-color="transparent">
                  <v-list-item 
                    prepend-icon="mdi-email-golden" 
                    title="abdul.ojulari@exprealty.com" 
                    subtitle="Primary Correspondence"
                    class="px-0"
                  />
                  <v-list-item 
                    prepend-icon="mdi-phone-golden" 
                    title="647-803-7236" 
                    subtitle="Direct Legal Inquiries"
                    class="px-0"
                  />
                  <v-list-item 
                    prepend-icon="mdi-web-golden" 
                    title="www.propertymatch.estate" 
                    subtitle="Digital Portal"
                    class="px-0"
                  />
                </v-list>
              </div>
            </section>

          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const scrollTo = (id: string) => {
  const element = document.getElementById(id)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Inter:wght@300;400;500;600;700&display=swap');

.premium-page-wrapper {
  background-color: #fcfcfb;
  font-family: 'Inter', sans-serif;
}

.display-serif-large {
  font-family: 'Playfair Display', serif;
  font-size: 4rem;
  letter-spacing: -0.03em;
}

.display-serif {
  font-family: 'Playfair Display', serif;
}

.elegant-divider-gold {
  width: 80px;
  height: 4px;
  background: linear-gradient(90deg, #8c734b, #d4af37);
  border-radius: 2px;
}

.premium-badge-light {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  color: #fff;
  padding: 8px 20px;
  border-radius: 100px;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  border: 1px solid rgba(255,255,255,0.2);
}

/* Sidebar & Navigation */
.sticky-nav {
  position: sticky;
  top: 100px;
}

.back-link {
  text-decoration: none;
  color: #8c734b;
  font-weight: 700;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.nav-header {
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  color: #9ca3af;
  margin-bottom: 16px;
  letter-spacing: 0.1em;
}

.legal-nav-list .v-list-item {
  border-radius: 8px;
  margin-bottom: 4px;
  font-weight: 500;
  color: #4b5563;
  transition: all 0.2s;
}

.legal-nav-list .v-list-item:hover {
  background: #f4f1ea !important;
  color: #8c734b;
}

.update-card {
  border-top: 1px solid #e5e7eb;
  padding-top: 24px;
}

/* Editorial Content */
.editorial-card {
  border-radius: 32px !important;
  background: transparent !important;
}

.section-title-premium {
  font-family: 'Playfair Display', serif;
  font-size: 1.75rem;
  color: #121212;
  position: relative;
  display: flex;
  align-items: center;
}

.section-title-premium::after {
  content: "";
  flex-grow: 1;
  height: 1px;
  background: #e5e7eb;
  margin-left: 24px;
}

.definition-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.def-item {
  background: #fff;
  padding: 20px;
  border-radius: 16px;
  border: 1px solid #f1f1ee;
  box-shadow: 0 4px 12px rgba(0,0,0,0.02);
}

.def-term {
  display: block;
  font-weight: 800;
  color: #8c734b;
  font-size: 0.9rem;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.def-desc {
  font-size: 1rem;
  color: #4b5563;
  line-height: 1.6;
}

.data-pill {
  background: #fff;
  padding: 12px 16px;
  border-radius: 12px;
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  border: 1px solid #e5e7eb;
  color: #1f2937;
}

.purpose-card {
  background: #fff;
  padding: 16px 24px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  border: 1px solid #f1f1ee;
}

.contact-footer-card {
  background: #121212;
  color: white;
  padding: 60px;
  border-radius: 40px;
  text-align: center;
}

.contact-footer-card p {
  opacity: 0.7;
}

.mdi-email-golden::before { content: "\F01EE"; color: #8c734b; }
.mdi-phone-golden::before { content: "\F03F2"; color: #8c734b; }
.mdi-web-golden::before { content: "\F02FB"; color: #8c734b; }

.letter-spacing-2 { letter-spacing: 2px; }
.letter-spacing-1 { letter-spacing: 1px; }

@media (max-width: 960px) {
  .display-serif-large {
    font-size: 2.5rem;
  }
  .contact-footer-card {
    padding: 30px;
  }
}
</style>