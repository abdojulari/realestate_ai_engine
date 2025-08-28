<template>
  <v-app-bar
    color="white"
    elevation="1"
  >
    <!-- Mobile Menu Button -->
    <v-app-bar-nav-icon
      @click="drawer = !drawer"
      class="d-md-none"
    />

    <!-- Logo -->
    <NuxtLink to="/" class="text-decoration-none">
      <v-img
        src="/logo.png"
        alt="Logo"
        max-width="150"
        class="mr-4"
      />
    </NuxtLink>

    <!-- Desktop Navigation -->
    <div class="d-none d-md-flex align-center">
      <v-btn
        v-for="item in menuItems"
        :key="item.title"
        :to="item.to"
        variant="text"
        class="mx-2"
      >
        {{ item.title }}
      </v-btn>
    </div>

    <v-spacer />

    <!-- Search Button -->
    <v-btn
      icon="mdi-magnify"
      variant="text"
      to="/map-search"
      class="mr-2"
    />

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
      <!-- Notifications -->
      <v-btn
        icon="mdi-bell"
        variant="text"
        class="mr-2"
        @click="showNotifications = true"
      >
        <v-badge
          v-if="unreadNotifications"
          :content="unreadNotifications"
          color="error"
        />
      </v-btn>

      <!-- User Menu -->
      <v-menu>
        <template v-slot:activator="{ props }">
          <v-btn
            v-bind="props"
            :prepend-avatar="undefined"
          >
            {{ user?.firstName }}
            <v-icon end>mdi-chevron-down</v-icon>
          </v-btn>
        </template>

        <v-list>
          <v-list-item
            v-for="item in userMenuItems"
            :key="item.title"
            :to="item.to"
            :prepend-icon="item.icon"
            :title="item.title"
          />
          <v-divider />
          <v-list-item
            prepend-icon="mdi-logout"
            title="Logout"
            @click="handleLogout"
          />
        </v-list>
      </v-menu>
    </template>

    <!-- Mobile Navigation Drawer -->
    <v-navigation-drawer
      v-model="drawer"
      temporary
      location="left"
      class="d-md-none"
    >
      <v-list>
        <v-list-item
          v-for="item in menuItems"
          :key="item.title"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
        />
      </v-list>
    </v-navigation-drawer>

    <!-- Notifications Drawer -->
    <v-navigation-drawer
      v-model="showNotifications"
      temporary
      location="right"
      width="400"
    >
      <v-toolbar title="Notifications">
        <v-spacer />
        <v-btn
          icon="mdi-close"
          variant="text"
          @click="showNotifications = false"
        />
      </v-toolbar>

      <v-list>
        <v-list-subheader>New</v-list-subheader>
        <v-list-item
          v-for="notification in unreadNotificationsList"
          :key="notification.id"
          :title="notification.title"
          :subtitle="notification.message"
          :prepend-icon="getNotificationIcon(notification.type)"
        >
          <template v-slot:append>
            <div class="text-caption">
              {{ formatTime(notification.createdAt) }}
            </div>
          </template>
        </v-list-item>

        <v-divider />

        <v-list-subheader>Earlier</v-list-subheader>
        <v-list-item
          v-for="notification in readNotificationsList"
          :key="notification.id"
          :title="notification.title"
          :subtitle="notification.message"
          :prepend-icon="getNotificationIcon(notification.type)"
        >
          <template v-slot:append>
            <div class="text-caption">
              {{ formatTime(notification.createdAt) }}
            </div>
          </template>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
  </v-app-bar>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { formatTime } from '../../../utils/formatters'

const auth = useAuthStore()
const drawer = ref(false)
const showNotifications = ref(false)

const isAuthenticated = computed(() => auth.isAuthenticated)
const user = computed(() => auth.user)

const menuItems = [
  { title: 'Buy', to: '/buying', icon: 'mdi-home-search' },
  { title: 'Sell', to: '/selling', icon: 'mdi-home-export-outline' },
  { title: "What's My Home Worth?", to: '/seller/homeestimate', icon: 'mdi-calculator' },
  { title: 'Contact', to: '/contact', icon: 'mdi-email' }
]

const userMenuItems = computed(() => {
  const items = [
    { title: 'My Profile', to: '/profile', icon: 'mdi-account' },
    { title: 'Saved Properties', to: '/buyer/saved', icon: 'mdi-heart' },
    { title: 'My Viewings', to: '/buyer/viewings', icon: 'mdi-calendar-clock' }
  ]

  if (auth.isAgent) {
    items.push(
      { title: 'My Listings', to: '/seller/listings', icon: 'mdi-home-city' },
      { title: 'Inquiries', to: '/seller/inquiries', icon: 'mdi-message' }
    )
  }

  if (auth.isAdmin) {
    items.push({ title: 'Admin Panel', to: '/admin', icon: 'mdi-shield-account' })
  }

  return items
})

// Mock notifications - replace with API calls
const notifications = ref([
  {
    id: 1,
    type: 'viewing',
    title: 'Viewing Request Approved',
    message: 'Your viewing request for 123 Main St has been approved',
    createdAt: new Date(Date.now() - 3600000),
    read: false
  },
  {
    id: 2,
    type: 'property',
    title: 'Price Reduced',
    message: 'A property in your saved list has reduced its price',
    createdAt: new Date(Date.now() - 86400000),
    read: true
  }
])

const unreadNotifications = computed(() => {
  return notifications.value.filter(n => !n.read).length
})

const unreadNotificationsList = computed(() => {
  return notifications.value.filter(n => !n.read)
})

const readNotificationsList = computed(() => {
  return notifications.value.filter(n => n.read)
})

const getNotificationIcon = (type: string) => {
  const icons = {
    viewing: 'mdi-calendar-clock',
    property: 'mdi-home',
    message: 'mdi-message',
    system: 'mdi-bell'
  }
  return icons[type as keyof typeof icons] || 'mdi-bell'
}

const handleLogout = () => {
  auth.logout()
  navigateTo('/auth/login')
}

// Mark notifications as read when opening drawer
watch(showNotifications, (value) => {
  if (value) {
    notifications.value = notifications.value.map(n => ({ ...n, read: true }))
  }
})
</script>

<style scoped>
.v-app-bar {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

:deep(.v-badge__badge) {
  min-width: 18px;
  height: 18px;
  font-size: 12px;
}
</style>
