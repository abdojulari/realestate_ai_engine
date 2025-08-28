<template>
  <v-footer
    class="bg-grey-lighten-1"
  >
    <v-container>
      <v-row>
        <!-- Company Info -->
        <v-col cols="12" md="4">
          <v-img
            src="/logo.png"
            alt="Logo"
            max-width="150"
            class="mb-4"
          />
          <p class="text-body-1 mb-4">
            Your trusted partner in finding your dream home. We make real estate simple and accessible.
          </p>
          <div class="d-flex align-center mb-4">
            <v-icon size="small" class="mr-2">mdi-phone</v-icon>
            <a href="tel:+17807880008" class="text-decoration-none">
              +1 (780) 788-0008
            </a>
          </div>
          <div class="d-flex align-center">
            <v-icon size="small" class="mr-2">mdi-email</v-icon>
            <a href="mailto:info@realestate.com" class="text-decoration-none">
              info@realestate.com
            </a>
          </div>
        </v-col>

        <!-- Quick Links -->
        <v-col cols="12" md="2">
          <h3 class="text-h6 mb-4">Quick Links</h3>
          <v-list density="compact" bg-color="transparent">
            <v-list-item
              v-for="link in quickLinks"
              :key="link.title"
              :to="link.to"
              :title="link.title"
              class="px-0"
            />
          </v-list>
        </v-col>

        <!-- Resources -->
        <v-col cols="12" md="2">
          <h3 class="text-h6 mb-4">Resources</h3>
          <v-list density="compact" bg-color="transparent">
            <v-list-item
              v-for="link in resources"
              :key="link.title"
              :to="link.to"
              :title="link.title"
              class="px-0"
            />
          </v-list>
        </v-col>

        <!-- Legal -->
        <v-col cols="12" md="2">
          <h3 class="text-h6 mb-4">Legal</h3>
          <v-list density="compact" bg-color="transparent">
            <v-list-item
              v-for="link in legal"
              :key="link.title"
              :to="link.to"
              :title="link.title"
              class="px-0"
            />
          </v-list>
        </v-col>

        <!-- Newsletter -->
        <v-col cols="12" md="2">
          <h3 class="text-h6 mb-4">Newsletter</h3>
          <p class="text-body-2 mb-4">
            Subscribe to our newsletter for the latest updates and exclusive offers.
          </p>
          <v-form @submit.prevent="subscribe">
            <v-text-field
              v-model="email"
              label="Email"
              type="email"
              variant="outlined"
              density="compact"
              :rules="[v => !!v || 'Email is required', v => /.+@.+\..+/.test(v) || 'Email must be valid']"
              required
              class="mb-2"
            />
            <v-btn
              type="submit"
              color="primary"
              block
              :loading="subscribing"
            >
              Subscribe
            </v-btn>
          </v-form>
        </v-col>
      </v-row>

      <v-divider class="my-4" />

      <!-- Bottom Bar -->
      <v-row align="center">
        <v-col cols="12" md="6">
          <div class="text-center text-md-left">
            © {{ new Date().getFullYear() }} Real Estate Portal. All rights reserved.
          </div>
        </v-col>

        <v-col cols="12" md="6">
          <div class="d-flex justify-center justify-md-end gap-4">
            <v-btn
              v-for="social in socialLinks"
              :key="social.icon"
              :href="social.link"
              target="_blank"
              icon
              variant="text"
            >
              <v-icon>{{ social.icon }}</v-icon>
            </v-btn>
          </div>
        </v-col>
      </v-row>
    </v-container>
  </v-footer>
</template>

<script setup lang="ts">
const email = ref('')
const subscribing = ref(false)

const quickLinks = [
  { title: 'Home', to: '/' },
  { title: 'Buy', to: '/buying' },
  { title: 'Sell', to: '/selling' },
  { title: 'Search', to: '/map-search' },
  { title: 'Contact', to: '/contact' }
]

const resources = [
  { title: 'Blog', to: '/blog' },
  { title: 'Market Reports', to: '/market-reports' },
  { title: 'Mortgage Calculator', to: '/mortgage-calculator' },
  { title: 'FAQs', to: '/faqs' },
  { title: 'Help Center', to: '/help' }
]

const legal = [
  { title: 'Terms of Service', to: '/terms' },
  { title: 'Privacy Policy', to: '/privacy' },
  { title: 'Cookie Policy', to: '/cookies' },
  { title: 'Disclaimer', to: '/disclaimer' },
  { title: 'Accessibility', to: '/accessibility' }
]

const socialLinks = [
  { icon: 'mdi-facebook', link: 'https://facebook.com' },
  { icon: 'mdi-twitter', link: 'https://twitter.com' },
  { icon: 'mdi-instagram', link: 'https://instagram.com' },
  { icon: 'mdi-linkedin', link: 'https://linkedin.com' },
  { icon: 'mdi-youtube', link: 'https://youtube.com' }
]

const subscribe = async () => {
  subscribing.value = true
  try {
    // Replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    email.value = ''
    // Show success message
  } catch (error) {
    console.error('Error subscribing:', error)
    // Show error message
  } finally {
    subscribing.value = false
  }
}
</script>

<style scoped>
.v-footer {
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}

:deep(.v-list-item) {
  min-height: 32px;
}

:deep(.v-list-item__content) {
  padding: 4px 0;
}

.gap-4 {
  gap: 16px;
}
</style>
