<template>
  <div>
    <v-navigation-drawer
      v-model="drawer"
      temporary
      class="d-md-none"
    >
      <v-list>
        <v-list-item
          v-for="item in menuItems"
          :key="item.title"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
          @click="handleNav(item.to)"
        />
      </v-list>
    </v-navigation-drawer>

    <v-app-bar
      color="white"
      flat
    >
      <template v-slot:prepend>
        <v-app-bar-nav-icon
          @click="drawer = !drawer"
          class="d-md-none"
        />
        <NuxtLink to="/" class="text-decoration-none">
          <v-icon size="36" class="mr-4">mdi-home</v-icon>
        </NuxtLink>
      </template>

      <v-spacer />

      <!-- Desktop Navigation -->
      <div class="d-none d-md-flex align-center">
        <v-btn
          v-for="item in menuItems"
          :key="item.title"
          :to="item.to"
          variant="text"
          class="mx-2"
          @click="handleNav(item.to)"
        >
          {{ item.title }}
        </v-btn>
      </div>

      <v-spacer />

      <!-- Auth Buttons -->
      <template v-if="!isAuthenticated">
        <v-btn
          variant="text"
          to="/auth/login"
          class="mx-2"
        >
          Login
        </v-btn>
        <v-btn
          color="primary"
          to="/auth/register"
          class="mx-2"
        >
          Register
        </v-btn>
      </template>
      <template v-else>
        <v-menu>
          <template v-slot:activator="{ props }">
            <v-btn
              icon
              v-bind="props"
            >
              <v-icon>mdi-account-circle</v-icon>
            </v-btn>
          </template>
          <v-list>
            <v-list-item
              to="/profile"
              prepend-icon="mdi-account"
              title="Profile"
            />
            <v-list-item
              v-if="isAdmin"
              to="/admin"
              prepend-icon="mdi-shield-account"
              title="Admin"
            />
            <v-list-item
              @click="handleLogout"
              prepend-icon="mdi-logout"
              title="Logout"
            />
          </v-list>
        </v-menu>
      </template>
    </v-app-bar>

    <v-main>
      <slot />
    </v-main>

    <v-footer
      class="d-flex flex-column"
      style="background-color: white !important;"
      color="white"
    >
      <v-container>
        <v-row>
          <v-col cols="12" md="4">
            <h3 class="text-h6 mb-4">Contact Us</h3>
            <div class="mb-2">
              <v-icon size="small" class="mr-2">mdi-phone</v-icon>
              +1 (780) 234 2333
            </div>
            <div class="mb-2">
              <v-icon size="small" class="mr-2">mdi-email</v-icon>
              info@realestate.com
            </div>
          </v-col>
          <v-col cols="12" md="4">
            <h3 class="text-h6 mb-4">Quick Links</h3>
            <v-list density="compact" bg-color="transparent">
              <v-list-item
                v-for="item in footerLinks"
                :key="item.title"
                :to="item.to"
                :title="item.title"
                class="px-0"
              />
            </v-list>
          </v-col>
          <v-col cols="12" md="4">
            <h3 class="text-h6 mb-4">Follow Us</h3>
            <div class="d-flex gap-4">
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
        <v-divider class="my-4" />
        <div class="text-center">
          © {{ new Date().getFullYear() }} Real Estate Portal. All rights reserved. Powered by
          <a href="https://www.realtor.ca/en" target="_blank">REALTOR.ca</a> and Developed by Abdul Ojulari
        </div>
      </v-container>
    </v-footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'

const drawer = ref(false)
const auth = useAuthStore()

const isAuthenticated = computed(() => auth.isAuthenticated)
const isAdmin = computed(() => auth.isAdmin)

const menuItems = [
  { title: 'Home', to: '/', icon: 'mdi-home' },
  { title: 'Map Search', to: '/map-search', icon: 'mdi-map-search' },
  { title: 'Buy', to: '/buying', icon: 'mdi-home-search' },
  { title: 'Sell', to: '/selling', icon: 'mdi-home-export-outline' },
  { title: "What's My Home Worth?", to: '/seller/homeestimate', icon: 'mdi-calculator' },
  { title: 'Contact', to: '/contact', icon: 'mdi-email' }
]

const footerLinks = [
  { title: 'About Us', to: '/about' },
  { title: 'Terms of Service', to: '/terms' },
  { title: 'Privacy Policy', to: '/privacy' },
  { title: 'Contact Us', to: '/contact' }
]

const socialLinks = [
  { icon: 'mdi-facebook', link: 'https://facebook.com' },
  { icon: 'mdi-twitter', link: 'https://twitter.com' },
  { icon: 'mdi-instagram', link: 'https://instagram.com' },
  { icon: 'mdi-linkedin', link: 'https://linkedin.com' }
]

const handleLogout = () => {
  auth.logout()
  navigateTo('/auth/login')
}

const handleNav = (to: string) => {
  // Debug log to verify paths clicked and current route
  // eslint-disable-next-line no-console
  console.log('[nav-click]', { to, current: useRoute().fullPath })
}
</script>

<style scoped>
.v-list-item--density-compact {
  min-height: 32px;
}
.v-list-item:hover > .v-list-item__overlay {
      opacity: 0 !important; 
    }
</style>

<style>
/* Force white background on footer and all its children */
.v-footer,
.v-footer *,
.v-footer .v-container,
.v-footer .v-row,
.v-footer .v-col,
.v-footer .v-list {
  background-color: white !important;
  background: white !important;
}

/* Override any Vuetify background classes */
.v-footer.bg-grey-lighten-1 {
  background-color: white !important;
  background: white !important;
}

/* More specific overrides */
.v-footer .v-list-item {
  background-color: transparent !important;
  background: transparent !important;
}
</style>
