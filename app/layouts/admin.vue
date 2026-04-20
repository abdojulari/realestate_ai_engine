<template>
  <div class="admin-layout">
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
          :key="item.to"
          :to="item.to"
          :title="rail ? '' : item.title"
          :value="item.title"
        >
          <template #prepend>
            <v-icon>{{ item.icon }}</v-icon>
          </template>
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
            v-if="showSettingsDrawerLink"
            prepend-icon="mdi-cog"
            :title="rail ? '' : 'Settings'"
            to="/admin/settings"
          />
          <v-list-item
            v-if="showHelpDrawerLink"
            prepend-icon="mdi-help-circle"
            :title="rail ? '' : 'Help'"
            to="/admin/help"
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
        outlined
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
      <v-menu offset-y>
        <template v-slot:activator="{ props }">
          <v-btn
            v-bind="props"
            variant="text"
            class="ml-2 text-none user-menu-btn"
            rounded="lg"
          >
            <v-avatar 
              size="40" 
              class="mr-2 user-avatar"
              color="primary"
            >
              <v-img
                v-if="user.avatar"
                :src="user.avatar"
                alt="User Avatar"
                cover
              >
                <template v-slot:placeholder>
                  <v-row
                    class="fill-height ma-0"
                    align="center"
                    justify="center"
                  >
                    <v-progress-circular
                      indeterminate
                      color="primary"
                      size="20"
                    />
                  </v-row>
                </template>
              </v-img>
              <span v-else class="text-h6 font-weight-bold">
                {{ getUserInitials() }}
              </span>
            </v-avatar>
            <div class="d-flex flex-column align-start mr-2 d-none d-sm-flex">
              <span class="text-body-2 font-weight-bold">{{ user.firstName }} {{ user.lastName }}</span>
              <span class="text-caption text-medium-emphasis">{{ displayRoleLabel(user.role) }}</span>
            </div>
            <v-icon>mdi-chevron-down</v-icon>
          </v-btn>
        </template>

        <v-list class="user-menu-list" min-width="240">
          <v-list-item class="py-3">
            <div class="d-flex align-center">
              <v-avatar 
                size="48" 
                color="primary"
                class="mr-3"
              >
                <v-img
                  v-if="user.avatar"
                  :src="user.avatar"
                  alt="User Avatar"
                  cover
                />
                <span v-else class="text-h6 font-weight-bold">
                  {{ getUserInitials() }}
                </span>
              </v-avatar>
              <div>
                <div class="text-body-1 font-weight-bold">{{ user.firstName }} {{ user.lastName }}</div>
                <div class="text-caption text-medium-emphasis">{{ user.email }}</div>
              </div>
            </div>
          </v-list-item>
          
          <v-divider class="my-2" />
          
          <v-list-item
            prepend-icon="mdi-account"
            title="My Profile"
            subtitle="Manage your account"
            to="/admin/profile"
            class="rounded-lg mx-2"
          />
          <v-list-item
            v-if="showSettingsDrawerLink"
            prepend-icon="mdi-cog"
            title="Settings"
            subtitle="Preferences & configuration"
            to="/admin/settings"
            class="rounded-lg mx-2"
          />
          
          <v-divider class="my-2" />
          
          <v-list-item
            prepend-icon="mdi-logout"
            title="Logout"
            subtitle="Sign out of your account"
            class="rounded-lg mx-2"
            @click="handleLogout"
          />
        </v-list>
      </v-menu>
    </v-app-bar>

    <!-- Main Content -->
    <v-main class="admin-main-content">
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
          :to="(notification as any).href || undefined"
          :link="!!(notification as any).href"
          @click="(notification as any).href ? (showNotifications = false) : null"
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
          :to="(notification as any).href || undefined"
          :link="!!(notification as any).href"
          @click="(notification as any).href ? (showNotifications = false) : null"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useLicense, FEATURES } from '~/composables/useLicense'
import {
  delegateFeatureAllowsRead,
  userHasDelegatedAdminAccess,
} from '~/utils/delegatedAdminClient'
// @ts-ignore
import { formatTime } from '~/utils/formatters'
import { useRouter, useRoute } from 'vue-router'
// @ts-ignore
import { api } from '~/utils/api'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

// License-based feature access
const { 
  fetchLicense, 
  hasFeature, 
  currentTier, 
  tierDisplayName,
  canUseCMA,
  canUseForecast,
  canUseNewsletter,
  canUseCREASync,
  canUsePillar9Sync
} = useLicense()

// State
const drawer = ref(true)
const rail = ref(false)
const search = ref('')
const showNotifications = ref(false)

// User from auth store
const user = ref<any>({ 
  firstName: '', 
  lastName: '', 
  email: '',
  role: 'Admin',
  avatar: null 
})

// Notifications from API
const notifications = ref<any[]>([])

// Navigation menu items (badge is dynamic for Users)
// Items are filtered based on license tier
const userBadge = ref<number | undefined>(undefined)
const crmBadge = ref<number | undefined>(undefined)

// Menu metadata: delegateFeature = key needed for read access; principalOnly = owners only; skipDelegateFeatureCheck = always for delegates (e.g. public site link)
const allMenuItems = [
  { title: 'Dashboard', icon: 'mdi-view-dashboard', to: '/admin', requiresFeature: null, delegateFeature: 'core' },
  { title: 'Site', icon: 'mdi-home', to: '/', requiresFeature: null, skipDelegateFeatureCheck: true },
  { title: 'Site Management', icon: 'mdi-palette', to: '/admin/site-management', requiresFeature: null, delegateFeature: 'site_management' },
  { title: 'Users', icon: 'mdi-account-group', to: '/admin/users', requiresFeature: null, delegateFeature: 'user_management', getBadge: () => userBadge.value },
  { title: 'CRM', icon: 'mdi-account-multiple', to: '/admin/crm', requiresFeature: null, delegateFeature: 'crm', getBadge: () => crmBadge.value },
  { title: 'Properties', icon: 'mdi-home-group', to: '/admin/properties', requiresFeature: null, delegateFeature: 'properties' },
  { title: 'Listing Templates', icon: 'mdi-image-multiple', to: '/admin/listing-templates', requiresFeature: FEATURES.LISTING_TEMPLATES, tier: 'gold', delegateFeature: 'listing_templates' },
  { title: 'Best Deals', icon: 'mdi-tag-arrow-down', to: '/admin/deals', requiresFeature: FEATURES.BEST_DEALS, tier: 'basic', delegateFeature: 'best_deals' },
  { title: 'Off-Market', icon: 'mdi-home-off-outline', to: '/admin/off-market', requiresFeature: null, superAdminOnly: true, delegateFeature: 'off_market' },
  { title: 'Calendar', icon: 'mdi-calendar-clock', to: '/admin/calendar', requiresFeature: null, delegateFeature: 'calendar' },
  { title: 'Facebook', icon: 'mdi-facebook', to: '/admin/facebook', requiresFeature: null, delegateFeature: 'facebook' },
  { title: 'Blog', icon: 'mdi-post-outline', to: '/admin/blog', requiresFeature: null, delegateFeature: 'blog' },
  { title: 'Testimonials', icon: 'mdi-comment-quote', to: '/admin/testimonials', requiresFeature: null, delegateFeature: 'content' },
  { title: 'Flash News', icon: 'mdi-newspaper-variant', to: '/admin/flash-news', requiresFeature: null, delegateFeature: 'content' },
  { title: 'CMA', icon: 'mdi-scale-balance', to: '/admin/cma', requiresFeature: FEATURES.CMA, tier: 'silver', delegateFeature: 'cma' },
  { title: 'CREA Sync', icon: 'mdi-cloud-sync', to: '/admin/crea-sync', requiresFeature: FEATURES.CREA_SYNC, tier: 'basic', delegateFeature: 'crea_sync' },
  { title: 'Pillar9 Sync', icon: 'mdi-database-sync', to: '/admin/pillar9-sync', requiresFeature: FEATURES.PILLAR9_SYNC, tier: 'basic', delegateFeature: 'pillar9_sync' },
  { title: 'Newsletter', icon: 'mdi-email-newsletter', to: '/admin/newsletter', requiresFeature: FEATURES.NEWSLETTER, tier: 'basic', delegateFeature: 'newsletter' },
  { title: 'Lead Generation', icon: 'mdi-account-search', to: '/admin/lead-generation', requiresFeature: FEATURES.LEAD_GENERATION, tier: 'gold', delegateFeature: 'lead_generation' },
  { title: 'Tools', icon: 'mdi-draw', to: '/admin/tools', requiresFeature: FEATURES.WORKSPACE_TOOLS, tier: 'silver', delegateFeature: 'workspace_tools' },
  { title: 'Content', icon: 'mdi-file-document', to: '/admin/content', requiresFeature: null, delegateFeature: 'content' },
  { title: 'Resources', icon: 'mdi-folder-download', to: '/admin/resources', requiresFeature: null, delegateFeature: 'resources' },
  { title: 'Documents', icon: 'mdi-file-cabinet', to: '/admin/documents', requiresFeature: FEATURES.DOCUMENTS, tier: 'silver', delegateFeature: 'documents' },
  { title: 'Reports', icon: 'mdi-chart-box', to: '/admin/reports', requiresFeature: FEATURES.REPORTS, tier: 'silver', delegateFeature: 'reports' },
  { title: 'Book Keeping', icon: 'mdi-book-open-page-variant', to: '/admin/bookkeeping', requiresFeature: FEATURES.BOOKKEEPING, tier: 'basic', delegateFeature: 'bookkeeping' },
]

const isDelegatedAssistant = computed(
  () => auth.user != null && userHasDelegatedAdminAccess(auth.user as any)
)

const showSettingsDrawerLink = computed(() => {
  if (auth.user?.role === 'admin' || auth.user?.role === 'super_admin') return true
  return delegateFeatureAllowsRead(auth.user as any, 'settings')
})

const showHelpDrawerLink = computed(() => {
  if (auth.user?.role === 'admin' || auth.user?.role === 'super_admin') return true
  return delegateFeatureAllowsRead(auth.user as any, 'core')
})

// Filter menu items based on license + delegated feature matrix
const menuItems = computed(() => {
  const u = auth.user as any

  const passDelegate = (item: any) => {
    if (!isDelegatedAssistant.value) return true
    if (item.principalOnly) return false
    if (item.skipDelegateFeatureCheck) return true
    if (item.delegateFeature != null && item.delegateFeature !== '') {
      return delegateFeatureAllowsRead(u, item.delegateFeature)
    }
    return true
  }

  // Super admin always sees all menu items (license not applied)
  if (auth.user?.role === 'super_admin') {
    return allMenuItems
      .filter(passDelegate)
      .map(item => ({
        title: item.title,
        icon: item.icon,
        to: item.to,
        badge: item.getBadge ? (item.getBadge() ? String(item.getBadge()) : undefined) : undefined
      }))
  }
  return allMenuItems
    .filter((item: any) => {
      if (!passDelegate(item)) return false
      if (item.superAdminOnly) return false
      if (!item.requiresFeature) return true
      return hasFeature(item.requiresFeature as any)
    })
    .map(item => ({
      title: item.title,
      icon: item.icon,
      to: item.to,
      badge: item.getBadge ? (item.getBadge() ? String(item.getBadge()) : undefined) : undefined
    }))
})

// Computed
const currentPageTitle = computed(() => {
  const currentRoute = route.path
  const item = menuItems.value.find(item => item.to === currentRoute)
  if (item) return item.title
  if (currentRoute.startsWith('/admin/tools/') && currentRoute !== '/admin/tools') {
    return 'Workspace tool'
  }
  return 'Admin Panel'
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
  const icons: Record<string, string> = {
    user: 'mdi-account',
    property: 'mdi-home',
    system: 'mdi-cog',
    alert: 'mdi-alert',
    instaconnect: 'mdi-qrcode-scan',
  }
  return icons[type] || 'mdi-bell'
}

// Watch for notification drawer close to mark as read
watch(showNotifications, (value) => {
  if (!value) notifications.value = notifications.value.map(n => ({ ...n, read: true }))
})

// Get user initials for avatar fallback
const getUserInitials = () => {
  const first = user.value.firstName?.charAt(0) || ''
  const last = user.value.lastName?.charAt(0) || ''
  return (first + last).toUpperCase() || 'U'
}

function displayRoleLabel(role: string | undefined | null) {
  if (auth.user && userHasDelegatedAdminAccess(auth.user as any)) return 'Delegated access'
  if (role === 'super_admin') return 'Super Admin'
  if (role === 'admin') return 'Admin'
  return role || 'Admin'
}

// Load header data
async function loadHeaderData() {
  try {
    // Fetch user profile with avatar
    const profileData: any = await api.get('/api/admin/profile')
    if (profileData?.profile) {
      user.value = {
        firstName: profileData.profile.firstName || '',
        lastName: profileData.profile.lastName || '',
        email: profileData.profile.email || '',
        role: profileData.profile.role || 'Admin',
        avatar: profileData.profile.avatar || null
      }
    } else if (auth.user) {
      // Fallback to auth store if profile API fails
      user.value = { 
        ...auth.user,
        avatar: (auth.user as any).avatar || null
      }
    }
    
    // Load notifications and counts
    const data: any = await api.get('/api/admin/notifications')
    notifications.value = data.notifications || []
    if (auth.user?.role === 'admin' || auth.user?.role === 'super_admin') {
      try {
        userBadge.value = await api.get('/api/admin/users').then((arr: any) => arr?.length || 0)
        crmBadge.value = await api.get('/api/admin/users?role=crm').then((arr: any) => arr?.length || 0)
      } catch {
        userBadge.value = undefined
        crmBadge.value = undefined
      }
    } else {
      userBadge.value = undefined
      crmBadge.value = undefined
    }
  } catch (e) {
    console.error('Header data load failed:', e)
    // Fallback to auth store on error
    if (auth.user) {
      user.value = { 
        ...auth.user,
        avatar: (auth.user as any).avatar || null
      }
    }
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

/* Premium User Menu Styling */
.user-menu-btn {
  padding: 8px 12px !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.user-menu-btn:hover {
  background-color: rgba(var(--v-theme-primary), 0.08);
}

.user-avatar {
  border: 2px solid rgba(var(--v-theme-primary), 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.user-menu-btn:hover .user-avatar {
  border-color: rgba(var(--v-theme-primary), 0.5);
  box-shadow: 0 4px 12px rgba(var(--v-theme-primary), 0.3);
  transform: scale(1.05);
}

.user-menu-list {
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
  overflow: hidden;
}

.user-menu-list .v-list-item {
  transition: all 0.2s ease;
}

.user-menu-list .v-list-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.08);
  transform: translateX(4px);
}

.user-menu-list .v-list-item--active {
  background-color: rgba(var(--v-theme-primary), 0.12);
}

/* Ensure main content area uses full width and scrolls; prevents right-side cutoff */
.admin-main-content {
  overflow-x: auto;
  min-width: 0;
}

/* Avatar placeholder with gradient */
.user-avatar:not(:has(img)) {
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, rgb(var(--v-theme-secondary)) 100%);
}
</style>