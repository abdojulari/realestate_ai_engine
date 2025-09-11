<template>
  <v-app>
    <!-- Navigation Drawer -->
    <v-navigation-drawer
      v-model="drawer"
      :rail="rail"
      permanent
      @click="rail = false"
    >
      <v-list-item
        prepend-icon="mdi-shield-account"
        :title="rail ? '' : 'Admin Panel'"
        nav
      >
        <template v-slot:append>
          <v-btn
            variant="text"
            icon="mdi-chevron-left"
            @click.stop="rail = !rail"
          />
        </template>
      </v-list-item>

      <v-divider />

      <v-list nav>
        <v-list-item
          v-for="item in menuItems"
          :key="item.title"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="rail ? '' : item.title"
          :value="item.title"
        >
          <template v-slot:append v-if="!rail && item.badge">
            <v-badge
              :content="item.badge"
              color="error"
              floating
            />
          </template>
        </v-list-item>
      </v-list>

      <template v-slot:append>
        <v-list nav>
          <v-list-item
            prepend-icon="mdi-cog"
            :title="rail ? '' : 'Settings'"
            to="/admin/settings"
          />
          <v-list-item
            prepend-icon="mdi-help-circle"
            :title="rail ? '' : 'Help'"
            href="https://docs.example.com"
            target="_blank"
          />
          <v-divider class="my-2" />
          <v-list-item
            prepend-icon="mdi-logout"
            :title="rail ? '' : 'Logout'"
            @click="handleLogout"
          />
        </v-list>
      </template>
    </v-navigation-drawer>

    <!-- App Bar -->
    <v-app-bar>
      <v-app-bar-nav-icon
        @click="rail = !rail"
        class="d-none d-md-flex"
      />

      <v-app-bar-title>{{ currentPageTitle }}</v-app-bar-title>

      <v-spacer />

      <!-- Search -->
      <v-text-field
        v-model="search"
        prepend-inner-icon="mdi-magnify"
        label="Search"
        hide-details
        density="compact"
        class="max-w-xs mr-4"
      />

      <!-- Notifications -->
      <v-btn
        icon="mdi-bell"
        variant="text"
        @click="showNotifications = true"
      >
        <v-badge
          :content="unreadNotifications"
          color="error"
          floating
        />
      </v-btn>

      <!-- User Menu -->
      <v-menu>
        <template v-slot:activator="{ props }">
          <v-btn
            class="ml-2"
            v-bind="props"
          >
            <v-avatar size="32" class="mr-2">
              <v-img
                :src="user.avatar || '/images/default-avatar.png'"
                alt="Avatar"
              />
            </v-avatar>
            {{ user.firstName }}
            <v-icon end>mdi-chevron-down</v-icon>
          </v-btn>
        </template>

        <v-list>
          <v-list-item
            prepend-icon="mdi-account"
            title="Profile"
            to="/admin/profile"
          />
          <v-list-item
            prepend-icon="mdi-cog"
            title="Settings"
            to="/admin/settings"
          />
          <v-divider />
          <v-list-item
            prepend-icon="mdi-logout"
            title="Logout"
            @click="handleLogout"
          />
        </v-list>
      </v-menu>
    </v-app-bar>

    <!-- Main Content -->
    <v-main>
      <slot />
    </v-main>

    <!-- Notifications Drawer -->
    <v-navigation-drawer
      v-model="showNotifications"
      location="right"
      temporary
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

      <template v-slot:append>
        <div class="pa-4">
          <v-btn
            block
            variant="text"
            to="/admin/notifications"
            @click="showNotifications = false"
          >
            View All Notifications
          </v-btn>
        </div>
      </template>
    </v-navigation-drawer>
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { formatTime } from '../../utils/formatters'
import { useRouter, useRoute } from 'vue-router'
// @ts-ignore
import { api } from '~~/utils/api'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

// State
const drawer = ref(true)
const rail = ref(false)
const search = ref('')
const showNotifications = ref(false)

// User from auth store
const user = ref<any>({ firstName: '', lastName: '', avatar: null })

// Notifications from API
const notifications = ref<any[]>([])

// Navigation menu items (badge is dynamic for Users)
const userBadge = ref<number | undefined>(undefined)
const menuItems = computed(() => [
  { title: 'Dashboard', icon: 'mdi-view-dashboard', to: '/admin' },
  { title: 'Site', icon: 'mdi-home', to: '/' },
  { title: 'Users', icon: 'mdi-account-group', to: '/admin/users', badge: userBadge.value ? String(userBadge.value) : undefined },
  { title: 'Properties', icon: 'mdi-home-group', to: '/admin/properties' },
  { title: 'Content', icon: 'mdi-file-document', to: '/admin/content' },
  { title: 'Reports', icon: 'mdi-chart-box', to: '/admin/reports' },
 
])

// Computed
const currentPageTitle = computed(() => {
  const currentRoute = route.path
  const item = menuItems.value.find(item => item.to === currentRoute)
  return item ? item.title : 'Admin Panel'
})

const unreadNotifications = computed(() => notifications.value.filter(n => !n.read).length)
const unreadNotificationsList = computed(() => notifications.value.filter(n => !n.read))
const readNotificationsList = computed(() => notifications.value.filter(n => n.read))

// Methods
const handleLogout = async () => {
  try {
    await auth.logout()
    router.push('/auth/login')
  } catch (error) {
    console.error('Logout error:', error)
  }
}

const getNotificationIcon = (type: string) => {
  const icons: Record<string, string> = { user: 'mdi-account', property: 'mdi-home', system: 'mdi-cog', alert: 'mdi-alert' }
  return icons[type] || 'mdi-bell'
}

// Watch for notification drawer close to mark as read
watch(showNotifications, (value) => {
  if (!value) notifications.value = notifications.value.map(n => ({ ...n, read: true }))
})

// Load header data
async function loadHeaderData() {
  try {
    // user info
    if (auth.user) user.value = { ...auth.user, avatar: null }
    // notifications and counts
    const data: any = await api.get('/api/admin/notifications')
    notifications.value = data.notifications || []
    userBadge.value = await api.get('/api/admin/users').then((arr: any) => arr?.length || 0)
  } catch (e) {
    console.error('Header data load failed:', e)
  }
}

// Load header data - middleware should have already handled auth
onMounted(async () => {
  // Trust that middleware has handled authentication
  // If we're here, the user should be authenticated and admin
  await loadHeaderData()
})
</script>

<style scoped>
.max-w-xs {
  max-width: 300px;
}

:deep(.v-navigation-drawer--rail) {
  .v-list-item__prepend > .v-icon {
    margin-inline-end: 0;
  }
}
</style>