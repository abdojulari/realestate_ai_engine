<template>
  <header class="site-header">
    <div class="header-container">
      <!-- Logo -->
      <div class="logo-section">
        <NuxtLink to="/" class="logo-link">
            <img 
                src="/images/avatars/logo.png" 
                alt="Logo" 
                class="logo-image "
                object-fit="contain"
                width="100"
            />
        </NuxtLink>
      </div>

      <!-- Desktop Navigation -->
      <nav class="desktop-nav">
        <ul class="nav-list">
          <!-- Power Search Dropdown -->
          <li class="dropdown-item">
            <v-menu>
              <template v-slot:activator="{ props }">
                <button class="nav-link dropdown-trigger" v-bind="props">
                  Power Search
                  <v-icon size="small" class="dropdown-icon">mdi-chevron-down</v-icon>
                </button>
              </template>
              <v-list class="dropdown-menu">
                <v-list-item
                  v-for="item in powerSearchItems"
                  :key="item.title"
                  :to="item.to"
                  :prepend-icon="item.icon"
                  :title="item.title"
                  class="dropdown-list-item"
                />
              </v-list>
            </v-menu>
          </li>

          <!-- Client Service Centre Dropdown -->
          <li class="dropdown-item">
            <v-menu>
              <template v-slot:activator="{ props }">
                <button class="nav-link dropdown-trigger" v-bind="props">
                  Client Service Centre
                  <v-icon size="small" class="dropdown-icon">mdi-chevron-down</v-icon>
                </button>
              </template>
              <v-list class="dropdown-menu">
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
        <template v-if="!isAuthenticated">
          <NuxtLink to="/auth/login" class="auth-link border rounded-xl">
            Login
          </NuxtLink>
          <NuxtLink to="/auth/register" class="auth-link border rounded-xl">
            Sign up
          </NuxtLink>
        </template>
        <template v-else>
          <v-menu>
            <template v-slot:activator="{ props }">
              <button class="profile-btn" v-bind="props">
                <v-icon>mdi-account-circle</v-icon>
              </button>
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
      <ul class="mobile-nav-list">
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
        
        <!-- Mobile Auth Links -->
        <template v-if="!isAuthenticated">
          <li class="mobile-auth-section">
            <NuxtLink 
              to="/auth/login" 
              class="mobile-auth-link login"
              @click="mobileMenuOpen = false"
            >
              Login
            </NuxtLink>
            <NuxtLink 
              to="/auth/register" 
              class="mobile-auth-link register"
              @click="mobileMenuOpen = false"
            >
              Register
            </NuxtLink>
          </li>
        </template>
      </ul>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'

const mobileMenuOpen = ref(false)
const auth = useAuthStore()

const isAuthenticated = computed(() => auth.isAuthenticated)
const isAdmin = computed(() => auth.isAdmin)

const powerSearchItems = [
  { title: 'Map Search', to: '/map-search', icon: 'mdi-map-search' },
  { title: 'AI Search', to: '/ai-search', icon: 'mdi-brain' }
]

const clientServiceItems = [
  { title: 'Buy', to: '/buying', icon: 'mdi-home-search' },
  { title: 'Sell', to: '/selling', icon: 'mdi-home-export-outline' },
  { title: "Home Estimate", to: '/seller/homeestimate', icon: 'mdi-calculator' }
]

const menuItems = [
  { title: 'News', to: '/news', icon: 'mdi-newspaper' },
  { title: 'Get to know Abdul', to: '/about', icon: 'mdi-information' },
  { title: 'Contact', to: '/contact', icon: 'mdi-email' }
]

const handleLogout = () => {
  auth.logout()
  navigateTo('/auth/login')
}
</script>

<style scoped>
.site-header {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  z-index: 100;
  height: 66px;
}

.header-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
  display: flex;
  align-items: center;
  height: 64px;
  gap: 32px;
  /* Prevent layout shifts */
  box-sizing: border-box;
}

/* Logo */
.logo-section {
  flex-shrink: 0;
}

.logo-link {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: #1976d2;
}

.logo-icon {
  transition: color 0.2s ease;
}

.logo-link:hover .logo-icon {
  color: #1565c0;
}

/* Desktop Navigation */
.desktop-nav {
  flex: 1;
  display: flex;
  justify-content: center;
}

.nav-list {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 40px;
  align-items: center;
}

.nav-list li {
  /* Fixed dimensions to prevent layout shifts */
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: fit-content;
  flex-shrink: 0;
  flex-grow: 0;
}

.nav-link {
  text-decoration: none;
  color: #374151;
  font-weight: 500;
  font-size: 16px;
  transition: color 0.2s ease;
  position: relative;
  padding: 8px 0;
}

.nav-link:hover {
  color: #1976d2;
}

.nav-link.router-link-active,
.nav-link.router-link-exact-active {
  color: #ff6b35;
}

/* Auth Section */
.auth-section {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 16px;
}

.auth-link {
  text-decoration: none;
  font-weight: 500;
  font-size: 14px;
  padding: 8px 16px;
  border-radius: 6px;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}


.profile-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
}

.profile-btn:hover {
  background: #f3f4f6;
}

/* Mobile Menu Button */
.mobile-menu-btn {
  display: none;
  flex-direction: column;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  width: 40px;
  height: 40px;
  justify-content: center;
  align-items: center;
  gap: 4px;
}

.hamburger-line {
  width: 24px;
  height: 2px;
  background: #374151;
  transition: all 0.3s ease;
  border-radius: 2px;
}

.mobile-menu-btn.active .hamburger-line:nth-child(1) {
  transform: rotate(45deg) translate(5px, 5px);
}

.mobile-menu-btn.active .hamburger-line:nth-child(2) {
  opacity: 0;
}

.mobile-menu-btn.active .hamburger-line:nth-child(3) {
  transform: rotate(-45deg) translate(7px, -6px);
}

/* Mobile Navigation */
.mobile-nav-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
  z-index: 200;
}

.mobile-nav-overlay.active {
  opacity: 1;
  visibility: visible;
}

.mobile-nav {
  position: fixed;
  top: 64px;
  right: -300px;
  width: 280px;
  height: calc(100vh - 64px);
  background: white;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
  transition: right 0.3s ease;
  z-index: 300;
  overflow-y: auto;
}

.mobile-nav.active {
  right: 0;
}

.mobile-nav-list {
  list-style: none;
  margin: 0;
  padding: 20px 0;
}

.mobile-nav-list li {
  margin: 0;
}

.mobile-nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  text-decoration: none;
  color: #374151;
  font-weight: 500;
  transition: background 0.2s ease;
}

.mobile-nav-link:hover {
  background: #f9fafb;
  color: #1976d2;
}

.mobile-nav-link.router-link-active,
.mobile-nav-link.router-link-exact-active {
  background: #fef3f2;
  color: #ff6b35;
}

.mobile-nav-icon {
  font-size: 20px;
}

.mobile-auth-section {
  border-top: 1px solid #e5e7eb;
  margin-top: 20px;
  padding-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-left: 24px;
  padding-right: 24px;
}

.mobile-auth-link {
  text-decoration: none;
  font-weight: 500;
  padding: 12px;
  border-radius: 6px;
  text-align: center;
  transition: all 0.2s ease;
}

.mobile-auth-link.login {
  color: #374151;
  border: 1px solid #d1d5db;
}

.mobile-auth-link.login:hover {
  background: #f9fafb;
}

.mobile-auth-link.register {
  background: #1976d2;
  color: white;
}

.mobile-auth-link.register:hover {
  background: #1565c0;
}

/* Power Search Dropdown */
.dropdown-item {
  position: relative;
}

.dropdown-trigger {
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: inherit;
  font-family: inherit;
  transition: all 0.2s ease;
}

.dropdown-trigger:hover {
  color: #1976d2;
}

.dropdown-icon {
  transition: transform 0.2s ease;
}

.dropdown-trigger:hover .dropdown-icon {
  transform: rotate(180deg);
}

.dropdown-menu {
  min-width: 200px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden;
}

.dropdown-list-item {
  transition: background 0.2s ease;
}

.dropdown-list-item:hover {
  background: #f5f5f5;
}

/* Global stability rules */
.site-header * {
  box-sizing: border-box;
}

/* Prevent any text selection that might cause layout shifts */
.nav-link,
.auth-link {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

/* Responsive Design */
@media (max-width: 768px) {
  .desktop-nav,
  .auth-section {
    display: none;
  }
  
  .mobile-menu-btn {
    display: flex;
  }
  
  .header-container {
    padding: 0 16px;
    justify-content: space-between;
  }
}

@media (max-width: 480px) {
  .header-container {
    padding: 0 12px;
  }
  
  .mobile-nav {
    width: 100%;
    right: -100%;
  }
}
</style>
