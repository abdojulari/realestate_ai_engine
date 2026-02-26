<template>
  <footer class="site-footer" :class="{ 'is-map-page': isMapSearchPage }">
    <div class="footer-container">
      <div v-if="!isMapSearchPage" class="footer-main">
        <v-row>
          <!-- Brand & Contact (from TenantSettings DB) -->
          <v-col cols="12" md="4" class="mb-8 mb-md-0">
            <div class="footer-brand mb-6">
              <template v-if="logoUrl && logoUrl !== '/images/logos/logo.png'">
                <img :src="logoUrl" :alt="businessName || 'Logo'" class="footer-tenant-logo" />
              </template>
              <template v-else>
                <img src="/images/logos/agentos-logo.png" alt="AgentOS" class="footer-agentos-logo" />
              </template>
              <p class="premium-tagline mt-2">{{ tagline || 'Intelligence for Realtors' }}</p>
            </div>
            
            <div class="contact-group">
              <div v-if="phone" class="contact-item">
                <span class="premium-label">Direct</span>
                <a :href="`tel:${phone.replace(/[^+\d]/g, '')}`" class="contact-link">{{ phone }}</a>
              </div>
              <div v-if="contactEmail" class="contact-item">
                <span class="premium-label">Inquiries</span>
                <a :href="`mailto:${contactEmail}`" class="contact-link">{{ contactEmail }}</a>
              </div>
            </div>

            <div v-if="brokerageLogoUrl" class="mt-8">
              <img 
                :src="brokerageLogoUrl" 
                :alt="brokerageName || 'Brokerage Logo'" 
                class="brand-logo grayscale" 
                width="60" 
              />
            </div>
          </v-col>

          <!-- Navigation Links -->
          <v-col cols="6" md="2">
            <h3 class="premium-label mb-6">Company</h3>
            <ul class="footer-links-list">
              <li v-for="link in footerLinks" :key="link.title">
                <NuxtLink :to="link.to" class="footer-nav-link">{{ link.title }}</NuxtLink>
              </li>
            </ul>
          </v-col>

          <!-- Social Presence (from TenantSettings DB) -->
          <v-col v-if="socialLinks.length" cols="6" md="2">
            <h3 class="premium-label mb-6">Presence</h3>
            <ul class="footer-links-list">
              <li v-for="social in socialLinks" :key="social.name">
                <a :href="social.url" target="_blank" class="footer-nav-link">
                  {{ social.name }}
                </a>
              </li>
            </ul>
          </v-col>

          <!-- Newsletter/Call to Action -->
          <v-col cols="12" md="4">
            <h3 class="premium-label mb-6">Newsletter</h3>
            <p class="text-body-2 text-grey-darken-1 mb-4 leading-relaxed">
              Receive curated property collections and market insights directly to your inbox.
            </p>
            <form @submit.prevent="handleSubscribe" class="newsletter-input-wrapper">
              <input 
                v-model="email" 
                type="email" 
                placeholder="Your email address" 
                class="premium-footer-input"
                :disabled="subscribeLoading"
                required
              />
              <v-btn 
                icon="mdi-arrow-right" 
                variant="text" 
                size="small" 
                class="ml-2"
                type="submit"
                :loading="subscribeLoading"
              ></v-btn>
            </form>
            <transition name="fade">
              <p v-if="message" :class="['newsletter-message', messageType]">
                {{ message }}
              </p>
            </transition>
          </v-col>
        </v-row>
      </div>

      <!-- Legal & Copyright (from TenantSettings DB) -->
      <div class="footer-bottom">
        <div v-if="footerDisclaimer" class="legal-disclaimer">
          <p class="disclaimer-text mb-6">{{ footerDisclaimer }}</p>
        </div>
        
        <div class="d-flex flex-column flex-md-row justify-space-between align-center py-6 border-t">
          <p class="copyright-text">
            © {{ new Date().getFullYear() }} <span class="font-weight-bold">{{ copyrightName }}</span>.
            All rights reserved.
          </p>
          <p v-if="developerName" class="copyright-text mt-2 mt-md-0">
            Developed by <span class="text-black font-weight-medium"><a v-if="developerUrl" :href="developerUrl" target="_blank">{{ developerName }}</a><template v-else>{{ developerName }}</template></span>
          </p>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
const route = useRoute()
const {
  businessName,
  tagline,
  logoUrl,
  phone,
  contactEmail,
  socialLinks,
  brokerageName,
  brokerageLogoUrl,
  footerDisclaimer,
  copyrightName,
  developerName,
  developerUrl,
} = useTenantSettings()

const isMapSearchPage = computed(() => route.name === 'map-search')

const footerLinks = [
  { title: 'About Us', to: '/about' },
  { title: 'FAQs', to: '/faq' },
  { title: 'Terms of Service', to: '/terms' },
  { title: 'Privacy Policy', to: '/privacy' },
  { title: 'Contact Us', to: '/contact' }
]

// Newsletter subscription
const email = ref('')
const subscribeLoading = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

const handleSubscribe = async () => {
  if (!email.value || subscribeLoading.value) return

  subscribeLoading.value = true
  message.value = ''

  try {
    const response = await $fetch('/api/newsletter/subscribe', {
      method: 'POST',
      body: {
        email: email.value,
        source: 'website'
      }
    }) as any

    if (response.success) {
      messageType.value = 'success'
      message.value = response.message
      email.value = ''
    } else {
      messageType.value = 'error'
      message.value = response.message
    }
  } catch (error: any) {
    messageType.value = 'error'
    message.value = error.data?.message || 'An error occurred. Please try again.'
  } finally {
    subscribeLoading.value = false
    
    // Clear message after 5 seconds
    setTimeout(() => {
      message.value = ''
    }, 5000)
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;800&display=swap');

.site-footer {
  background: #ffffff;
  color: #1a1a1a;
  font-family: 'Inter', sans-serif;
  border-top: 1px solid #f1f5f9;
}

/* Hide footer on map page if needed, or adjust padding */
.site-footer.is-map-page {
  display: none;
}

.footer-container {
  max-width: 1300px;
  margin: 0 auto;
  padding: 80px 24px 20px;
}

/* --- Premium Labels --- */
.footer-tenant-logo {
  max-height: 48px;
  width: auto;
  object-fit: contain;
}

.footer-agentos-logo {
  max-height: 86px;
  width: auto;
  object-fit: contain;
}

.premium-label {
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #94a3b8;
  display: block;
}

.premium-tagline {
  font-size: 0.65rem;
  letter-spacing: 0.3em;
  font-weight: 500;
  color: #64748b;
}

/* --- Links & Navigation --- */
.footer-links-list {
  list-style: none;
  padding: 0;
}

.footer-nav-link {
  color: #475569;
  text-decoration: none;
  font-size: 0.95rem;
  line-height: 2.2;
  transition: all 0.3s ease;
  display: inline-block;
}

.footer-nav-link:hover {
  color: #000;
  transform: translateX(4px);
}

/* --- Contact Section --- */
.contact-group {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.contact-link {
  color: #000;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 500;
  transition: opacity 0.2s ease;
}

.contact-link:hover {
  opacity: 0.7;
}

/* --- Newsletter --- */
.newsletter-input-wrapper {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 8px;
  transition: border-color 0.3s ease;
}

.newsletter-input-wrapper:focus-within {
  border-bottom-color: #8c734b;
}

.premium-footer-input {
  width: 100%;
  border: none;
  background: transparent;
  padding: 8px 0;
  font-size: 0.9rem;
  outline: none;
}

.premium-footer-input::placeholder {
  color: #cbd5e1;
}

.premium-footer-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.newsletter-message {
  margin-top: 12px;
  font-size: 0.85rem;
  font-weight: 500;
  padding: 8px 12px;
  border-radius: 6px;
  animation: slideInUp 0.3s ease;
}

.newsletter-message.success {
  color: #16a34a;
  background: rgba(22, 163, 74, 0.1);
}

.newsletter-message.error {
  color: #dc2626;
  background: rgba(220, 38, 38, 0.1);
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* --- Visual Assets --- */
.brand-logo.grayscale {
  filter: grayscale(1) opacity(0.6);
  transition: filter 0.3s ease;
}

.brand-logo:hover {
  filter: grayscale(0) opacity(1);
}

/* --- Bottom Legal Area --- */
.footer-bottom {
  margin-top: 60px;
}

.disclaimer-text {
  font-size: 0.75rem;
  line-height: 1.8;
  color: #94a3b8;
  max-width: 1000px;
}

.copyright-text {
  font-size: 0.8rem;
  color: #64748b;
}

.leading-relaxed {
  line-height: 1.6;
}

.border-t {
  border-top: 1px solid #f1f5f9;
}

.tracking-tighter {
  letter-spacing: -0.05em;
}

@media (max-width: 960px) {
  .footer-container {
    padding: 60px 20px 20px;
  }
}
</style>
