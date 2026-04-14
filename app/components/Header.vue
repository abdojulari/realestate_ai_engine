<template>
  <header class="site-header">
    <div class="header-container">
      <!-- Logo (from TenantSettings DB) -->
      <div class="logo-section">
        <NuxtLink to="/" class="logo-link">
            <img 
                :src="logoUrl" 
                :alt="businessName || 'Logo'" 
                class="logo-image"
            />
        </NuxtLink>
      </div>

      <!-- Desktop Navigation -->
      <nav class="desktop-nav">
        <ul class="nav-list">
          <!-- Power Search Dropdown -->
          <li class="dropdown-item">
            <v-menu 
              location="bottom"
              transition="slide-y-transition"
              :close-on-content-click="true"
            >
              <template v-slot:activator="{ props }">
                <v-btn 
                  class="nav-link dropdown-trigger text-capitalize" 
                  v-bind="props"
                  variant="tonal"
                  color="white"
                >
                  <span class="text-black">Power Search</span>
                  <v-icon size="small" class="dropdown-icon text-black">mdi-chevron-down</v-icon>
                </v-btn>
            
              </template>
              <v-list class="dropdown-menu glass-menu" density="compact" :ripple="false">
                <v-list-item
                  v-for="item in powerSearchItems"
                  :key="item.title"
                  :to="item.to"
                  :prepend-icon="item.icon"
                  :title="item.title"
                  class="dropdown-list-item hover:bg-transparent"
                />
              </v-list>
            </v-menu>
          </li>

          <!-- Client Resources Dropdown -->
          <li class="dropdown-item">
            <v-menu 
              location="bottom"
              transition="slide-y-transition"
              :close-on-content-click="true"
            >
              <template v-slot:activator="{ props }">
                <v-btn 
                  class="nav-link dropdown-trigger text-capitalize" 
                  v-bind="props"
                  variant="tonal"
                  color="white"
                >
                  <span class="text-black">Client Services</span>
                  <v-icon size="small" class="dropdown-icon text-black">mdi-chevron-down</v-icon>
                </v-btn>
              </template>
              <v-list class="dropdown-menu glass-menu" density="compact" :ripple="false">
                <v-list-item
                  v-for="item in clientServiceItems"
                  :key="item.title"
                  :to="item.to"
                  :prepend-icon="item.icon"
                  :title="item.title"
                  class="dropdown-list-item"
                />
              </v-list>
            </v-menu>
          </li>
          
          <!-- Regular Menu Items -->
          <li v-for="item in menuItems" :key="item.title">
            <NuxtLink :to="item.to" class="nav-link">
              {{ item.title }}
            </NuxtLink>
          </li>
        </ul>
      </nav>

      <!-- Auth Section -->
      <div class="auth-section">
        <ClientOnly>
          <template v-if="!isAuthenticated">
            <NuxtLink to="/auth/login" class="auth-link-premium">
              <span class="auth-text">LOGIN</span>
              <div class="auth-line"></div>
            </NuxtLink>
          </template>
          <template v-else>
            <v-menu 
              location="bottom"
              transition="slide-y-transition"
              :close-on-content-click="true"
            >
              <template v-slot:activator="{ props }">
                <v-btn 
                  class="profile-btn" 
                  v-bind="props"
                  variant="text"
                  :ripple="false"
                  icon
                >
                  <v-icon>mdi-account-circle</v-icon>
                </v-btn>
              </template>
              <v-list density="compact" >
                <v-list-item
                  to="/profile"
                  prepend-icon="mdi-account"
                  title="Profile"
                />
                <v-list-item
                  v-if="isAdmin"
                  to="/admin"
                  prepend-icon="mdi-shield-account"
                  title="Admin Dashboard"
                />
                <v-list-item
                  @click="handleLogout"
                  prepend-icon="mdi-logout"
                  title="Logout"
                />
              </v-list>
            </v-menu>
          </template>
          <template #fallback>
            <NuxtLink to="/auth/login" class="auth-link-premium">
              <span class="auth-text">LOGIN</span>
              <div class="auth-line"></div>
            </NuxtLink>
          </template>
        </ClientOnly>
      </div>

      <!-- Mobile Menu Button -->
      <button 
        class="mobile-menu-btn"
        @click="mobileMenuOpen = !mobileMenuOpen"
        :class="{ active: mobileMenuOpen }"
      >
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
      </button>
    </div>

    <!-- Mobile Navigation Overlay -->
    <div 
      class="mobile-nav-overlay" 
      :class="{ active: mobileMenuOpen }"
      @click="mobileMenuOpen = false"
    ></div>

    <!-- Mobile Navigation -->
    <nav class="mobile-nav" :class="{ active: mobileMenuOpen }">
      <!-- Close button -->
      <button class="mobile-close-btn" @click="mobileMenuOpen = false" aria-label="Close menu">
        <v-icon size="24">mdi-close</v-icon>
      </button>

      <ul class="mobile-nav-list">
        <!-- Auth Section for Mobile -->
        <ClientOnly>
          <template v-if="!isAuthenticated">
            <li>
              <NuxtLink 
                to="/auth/login" 
                class="mobile-nav-link auth-mobile-link"
                @click="mobileMenuOpen = false"
              >
                <v-icon class="mobile-nav-icon">mdi-login</v-icon>
                Login
              </NuxtLink>
            </li>
            <li class="mobile-divider"></li>
          </template>
          <template v-else>
            <li>
              <NuxtLink 
                to="/profile" 
                class="mobile-nav-link"
                @click="mobileMenuOpen = false"
              >
                <v-icon class="mobile-nav-icon">mdi-account</v-icon>
                Profile
              </NuxtLink>
            </li>
            <li v-if="isAdmin">
              <NuxtLink 
                to="/admin" 
                class="mobile-nav-link"
                @click="mobileMenuOpen = false"
              >
                <v-icon class="mobile-nav-icon">mdi-shield-account</v-icon>
                Admin Dashboard
              </NuxtLink>
            </li>
            <li>
              <a 
                class="mobile-nav-link logout-link"
                @click="handleLogout"
              >
                <v-icon class="mobile-nav-icon">mdi-logout</v-icon>
                Logout
              </a>
            </li>
            <li class="mobile-divider"></li>
          </template>
          <template #fallback>
            <li>
              <NuxtLink 
                to="/auth/login" 
                class="mobile-nav-link auth-mobile-link"
                @click="mobileMenuOpen = false"
              >
                <v-icon class="mobile-nav-icon">mdi-login</v-icon>
                Login
              </NuxtLink>
            </li>
            <li class="mobile-divider"></li>
          </template>
        </ClientOnly>
        
        <!-- Power Search Items -->
        <li class="mobile-section-header">Power Search</li>
        <li v-for="item in powerSearchItems" :key="item.title">
          <NuxtLink 
            :to="item.to" 
            class="mobile-nav-link"
            @click="mobileMenuOpen = false"
          >
            <v-icon class="mobile-nav-icon">{{ item.icon }}</v-icon>
            {{ item.title }}
          </NuxtLink>
        </li>
        
        <!-- Client Service Items -->
        <li class="mobile-section-header">Client Services</li>
        <li v-for="item in clientServiceItems" :key="item.title">
          <NuxtLink 
            :to="item.to" 
            class="mobile-nav-link"
            @click="mobileMenuOpen = false"
          >
            <v-icon class="mobile-nav-icon">{{ item.icon }}</v-icon>
            {{ item.title }}
          </NuxtLink>
        </li>
        
        <!-- Regular Menu Items -->
        <li v-for="item in menuItems" :key="item.title">
          <NuxtLink 
            :to="item.to" 
            class="mobile-nav-link"
            @click="mobileMenuOpen = false"
          >
            <v-icon class="mobile-nav-icon">{{ item.icon }}</v-icon>
            {{ item.title }}
          </NuxtLink>
        </li>
      </ul>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useLicense, FEATURES } from '~/composables/useLicense'

const route = useRoute()
const mobileMenuOpen = ref(false)
const auth = useAuthStore()

watch(() => route.fullPath, () => {
  mobileMenuOpen.value = false
})
const { canUseChatbot, canUseAISearch, hasFullAccess } = useLicense()

// Tenant settings from DB (replaces hardcoded logo/name)
const { logoUrl, businessName } = useTenantSettings()

const isAuthenticated = computed(() => auth.isAuthenticated)
const isAdmin = computed(() => auth.isAdmin)

// All power search items with their required feature
const allPowerSearchItems = [
  { title: 'MLS Search', to: '/map-search', icon: 'mdi-map-search', feature: null },
  { title: 'AI Search', to: '/ai-search', icon: 'mdi-brain', feature: FEATURES.AI_SEARCH },
  { title: 'AI Concierge', to: '/chat', icon: 'mdi-chat-processing-outline', feature: FEATURES.CHATBOT },
  { title: 'Market Overview', to: '/market-overview', icon: 'mdi-chart-line', feature: null }
]

// Filtered power search items based on user's tier
const powerSearchItems = computed(() => {
  // Admin and Platinum users see everything
  if (hasFullAccess.value) {
    return allPowerSearchItems
  }
  
  return allPowerSearchItems.filter(item => {
    if (!item.feature) return true
    if (item.feature === FEATURES.CHATBOT) return canUseChatbot.value
    if (item.feature === FEATURES.AI_SEARCH) return canUseAISearch.value
    return true
  })
})

const clientServiceItems = [
  { title: 'Buy', to: '/buying', icon: 'mdi-home-search' },
  { title: 'Sell', to: '/selling', icon: 'mdi-home-export-outline' },
  { title: "Home Estimate", to: '/seller/homeestimate', icon: 'mdi-calculator' }
]

const menuItems = [
  { title: 'Blog', to: '/blog', icon: 'mdi-post-outline' },
  { title: 'News and Resources', to: '/news', icon: 'mdi-newspaper' },
  { title: 'About', to: '/about', icon: 'mdi-information' },
  { title: 'Contact', to: '/contact', icon: 'mdi-email' }
]

const handleLogout = () => {
  // Close mobile menu if open
  mobileMenuOpen.value = false
  
  auth.logout()
  navigateTo('/auth/login')
}
</script>

<style scoped>
/* 1. STRUCTURAL STABILITY */
.site-header {
  background: rgba(255, 255, 255, 0.98);
  border-bottom: 1px solid #f1f1f1;
  position: sticky;
  top: 0;
  z-index: 1000;
  height: 85px;
  backdrop-filter: blur(12px);
}

.header-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 40px;
  display: flex;
  align-items: center;
  height: 100%;
  gap: 24px;
  box-sizing: border-box;
  position: relative;
}

.logo-section { 
  flex-shrink: 0; 
  display: flex;
  align-items: center;
}

.desktop-nav { flex: 1; display: flex; justify-content: center; }
.auth-section { flex-shrink: 0; display: flex; align-items: center; }

/* 2. LOGO ENHANCEMENTS */
.logo-image {
  height: 56px;
  width: auto;
  max-width: 220px;
  object-fit: contain;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.05)); 
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
}

.logo-link:hover .logo-image { 
  transform: scale(1.05);
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));
}

/* 3. NAVIGATION LINKS */
.nav-list {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 32px;
  align-items: center;
}

.nav-link {
  text-decoration: none;
  color: #1a1a1a;
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.08em; 
  text-transform: uppercase;
  line-height: 1;
  padding: 12px 0;
  white-space: nowrap;
  transition: color 0.3s ease;
  position: relative;
}

.nav-link::after {
  content: '';
  position: absolute;
  bottom: 6px;
  left: 0;
  width: 0;
  height: 1.5px;
  background: #000;
  transition: width 0.3s ease;
}
.nav-link:hover::after,
.nav-link.router-link-active::after {
  width: 100%;
}

/* Dropdown Triggers */
.dropdown-trigger {
  font-weight: 600 !important;
  font-size: 13px !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase !important;
}

.glass-menu {
  background: rgba(255, 255, 255, 0.98) !important;
  backdrop-filter: blur(16px);
  border: 1px solid rgba(0,0,0,0.06) !important;
  box-shadow: 0 15px 35px rgba(0,0,0,0.12) !important;
  border-radius: 12px !important;
  margin-top: 12px !important;
}

/* 4. PREMIUM LOGIN BUTTON */
.auth-link-premium {
  text-decoration: none;
  position: relative;
  padding: 12px 32px;
  background: #000;
  color: #fff !important;
  border-radius: 2px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.2em;
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.auth-link-premium:hover {
  background: #1a1a1a;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
}

.auth-line {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  width: 0;
  background: #fff;
  transition: width 0.4s ease;
}

.auth-link-premium:hover .auth-line {
  width: 100%;
}

/* MOBILE */
.mobile-menu-btn {
  display: none;
  flex-direction: column;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
}
.hamburger-line {
  width: 22px;
  height: 1.5px;
  background: #111;
  margin: 3px 0;
  transition: 0.3s;
  transform-origin: center;
}
.mobile-menu-btn.active .hamburger-line:nth-child(1) {
  transform: translateY(4.5px) rotate(45deg);
}
.mobile-menu-btn.active .hamburger-line:nth-child(2) {
  opacity: 0;
}
.mobile-menu-btn.active .hamburger-line:nth-child(3) {
  transform: translateY(-4.5px) rotate(-45deg);
}

@media (max-width: 1100px) {
  .header-container { padding: 0 20px; }
  .nav-list { gap: 16px; }
}

@media (max-width: 900px) {
  .desktop-nav, .auth-section { display: none; }
  .mobile-menu-btn { display: flex; }
  .header-container { justify-content: space-between; }
}

.mobile-nav-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
  z-index: 1100;
}
.mobile-nav-overlay.active { opacity: 1; pointer-events: auto; }

.mobile-nav {
  position: fixed;
  top: 0;
  right: -300px;
  width: 280px;
  height: 100vh;
  background: white;
  transition: right 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
  z-index: 1200;
  padding: 56px 20px 40px;
  overflow-y: auto;
}
.mobile-nav.active { right: 0; }

.mobile-close-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  background: none;
  border: none;
  cursor: pointer;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
  color: #1a1a1a;
}
.mobile-close-btn:hover {
  background: #f0f0f0;
}

.mobile-nav-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.mobile-nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  color: #1a1a1a;
  text-decoration: none;
  font-size: 15px;
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.mobile-nav-link:hover {
  background: #f5f5f5;
  color: #000;
}

.mobile-nav-icon {
  font-size: 20px;
}

.mobile-section-header {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #999;
  padding: 20px 16px 8px;
  margin-top: 12px;
}

.mobile-divider {
  height: 1px;
  background: #e5e5e5;
  margin: 16px 0;
}

.auth-mobile-link {
  background: #000;
  color: #fff !important;
  font-weight: 700;
  margin-bottom: 8px;
}

.auth-mobile-link:hover {
  background: #1a1a1a !important;
  color: #fff !important;
}

.logout-link {
  cursor: pointer;
  color: #dc2626;
}

.logout-link:hover {
  background: #fef2f2 !important;
  color: #dc2626 !important;
}

.profile-btn {
  color: #1a1a1a !important;
  font-size: 28px !important;
}
</style>
