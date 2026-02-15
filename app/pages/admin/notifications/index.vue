<template>
  <div class="admin-notifications-premium px-md-8 py-md-6">
    <v-container fluid>
      <!-- Premium Header Section -->
      <v-row class="mb-8 align-center">
        <v-col cols="12" md="7">
          <div class="d-flex align-center mb-2">
            <v-btn icon="mdi-arrow-left" variant="text" size="small" class="mr-2" to="/admin" />
            <div class="premium-accent-bar mr-4"></div>
            <span class="text-overline letter-spacing-2 text-gold">Communications</span>
          </div>
          <h1 class="display-serif text-h3 mb-1">Notifications</h1>
          <p class="text-subtitle-1 text-medium-emphasis font-weight-light">Manage system alerts and administrative broadcasts</p>
        </v-col>
        <v-col cols="12" md="5" class="d-flex flex-column flex-sm-row align-center justify-md-end gap-4">
          <div class="status-toggle-box px-4 py-1 mr-md-4">
            <v-switch 
              v-model="enabled" 
              label="Active Stream" 
              color="primary"
              hide-details
              inset
              density="compact"
              class="premium-switch"
              @change="saveSettings" 
            />
          </div>
          <div class="d-flex gap-2">
            <v-btn variant="tonal" class="premium-btn" @click="markAllRead" prepend-icon="mdi-check-all">
              Mark all read
            </v-btn>
            <v-btn color="error" variant="text" class="premium-btn" @click="clearAll" prepend-icon="mdi-bell-off-outline">
              Clear
            </v-btn>
          </div>
        </v-col>
      </v-row>

      <!-- Main Notifications Feed -->
      <v-row>
        <v-col cols="12" xl="10" class="mx-auto">
          <v-card class="notifications-container-premium" elevation="0">
            <v-list class="pa-0 bg-transparent" lines="three">
              <template v-for="(n, index) in notifications" :key="n.id">
                <v-list-item
                  class="notification-item-premium py-6 px-6"
                  :class="{ 'unread-item': lastSeenAt && new Date(n.createdAt) > lastSeenAt }"
                >
                  <template #prepend>
                    <div class="icon-wrapper mr-6">
                      <v-avatar size="48" variant="tonal" :color="getIconColor(n.type)" class="premium-avatar">
                        <v-icon size="24">{{ icon(n.type) }}</v-icon>
                      </v-avatar>
                    </div>
                  </template>

                  <v-list-item-title class="text-h6 font-weight-bold mb-1 d-flex align-center">
                    {{ n.title }}
                    <v-chip 
                      v-if="lastSeenAt && new Date(n.createdAt) > lastSeenAt" 
                      color="primary" 
                      size="x-small" 
                      class="ml-3 px-2 text-uppercase font-weight-black"
                    >
                      New
                    </v-chip>
                  </v-list-item-title>
                  
                  <v-list-item-subtitle class="text-body-1 text-medium-emphasis lh-base pr-12">
                    {{ n.message }}
                  </v-list-item-subtitle>

                  <template #append>
                    <div class="d-flex flex-column align-end justify-space-between fill-height py-1">
                      <span class="text-caption font-weight-bold text-uppercase letter-spacing-1 opacity-60 mb-4">
                        {{ formatTime(n.createdAt) }}
                      </span>
                      <v-tooltip text="Dismiss" location="left">
                        <template v-slot:activator="{ props }">
                          <v-btn 
                            v-bind="props"
                            size="small" 
                            variant="text" 
                            icon="mdi-close-circle-outline" 
                            class="dismiss-btn"
                            @click="dismiss(n)" 
                          />
                        </template>
                      </v-tooltip>
                    </div>
                  </template>
                </v-list-item>
                <v-divider v-if="index < notifications.length - 1" class="mx-6 opacity-10" />
              </template>

              <!-- Empty State -->
              <div v-if="notifications.length === 0" class="py-16 text-center">
                <v-icon size="64" color="grey-lighten-2" class="mb-4">mdi-bell-outline</v-icon>
                <h3 class="text-h5 font-weight-light text-grey-darken-1">No active notifications</h3>
                <p class="text-caption text-grey">All caught up with the system logs</p>
              </div>
            </v-list>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
// @ts-ignore
import { api } from '~/utils/api'
// @ts-ignore
import { formatTime } from '~/utils/formatters'

// --- LOGIC PRESERVED ---
const notifications = ref<any[]>([])
const enabled = ref(true)
const dismissedIds = ref<string[]>([])
const lastSeenAt = ref<Date | null>(null)

function icon(type: string) { 
  return ({ 
    user: 'mdi-account-outline', 
    property: 'mdi-home-outline', 
    system: 'mdi-shield-check-outline', 
    alert: 'mdi-alert-circle-outline' 
  } as any)[type] || 'mdi-bell-outline' 
}

// Added for premium visual variety
function getIconColor(type: string) {
  return ({
    user: 'primary',
    property: 'success',
    system: 'secondary',
    alert: 'error'
  } as any)[type] || 'grey'
}

async function load() {
  const data: any = await api.get('/api/admin/notifications')
  notifications.value = data.notifications || []
  enabled.value = typeof data.enabled === 'boolean' ? data.enabled : true
  lastSeenAt.value = data.lastSeenAt ? new Date(data.lastSeenAt) : null
}

async function saveSettings() {
  await api.post('/api/admin/notifications/settings', { 
    enabled: enabled.value, 
    dismissedIds: dismissedIds.value, 
    lastSeenAt: lastSeenAt.value?.toISOString() 
  })
}

async function markAllRead() {
  lastSeenAt.value = new Date()
  await saveSettings()
  await load()
}

async function dismiss(n: any) {
  dismissedIds.value = [...new Set([...dismissedIds.value, n.id])]
  await saveSettings()
  await load()
}

async function clearAll() {
  // Add every visible notification to the dismissed list
  const allIds = notifications.value.map((n: any) => n.id)
  dismissedIds.value = [...new Set([...dismissedIds.value, ...allIds])]
  await saveSettings()
  await load()
}

onMounted(load)

definePageMeta({ layout: 'admin', middleware: ['admin'] })
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;600;700&display=swap');

.admin-notifications-premium {
  background-color: #fcfcfb;
  font-family: 'Inter', sans-serif;
  min-height: 100vh;
}

.display-serif { font-family: 'Playfair Display', serif; }
.text-gold { color: #8c734b; }
.letter-spacing-2 { letter-spacing: 2px; }
.letter-spacing-1 { letter-spacing: 1px; }
.lh-base { line-height: 1.6 !important; }

.premium-accent-bar {
  width: 40px;
  height: 4px;
  background: #8c734b;
  border-radius: 2px;
}

/* Toggle Styling */
.status-toggle-box {
  background: white;
  border: 1px solid rgba(0,0,0,0.05);
  border-radius: 12px;
}

.premium-switch :deep(.v-label) {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Button Styling */
.premium-btn {
  border-radius: 10px !important;
  text-transform: none !important;
  font-weight: 600 !important;
  letter-spacing: 0.3px !important;
}

/* Notifications Container */
.notifications-container-premium {
  background: white !important;
  border-radius: 24px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  overflow: hidden;
}

.notification-item-premium {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.notification-item-premium:hover {
  background-color: #f9f9f7;
}

.unread-item {
  background-color: rgba(var(--v-theme-primary), 0.02);
  border-left: 4px solid rgb(var(--v-theme-primary));
}

/* Avatar/Icon Effects */
.icon-wrapper {
  perspective: 1000px;
}

.premium-avatar {
  border: 1px solid rgba(0,0,0,0.03);
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
}

.dismiss-btn {
  opacity: 0.2;
  transition: opacity 0.2s;
}

.notification-item-premium:hover .dismiss-btn {
  opacity: 1;
}

.gap-2 { gap: 8px; }
.gap-4 { gap: 16px; }

@media (max-width: 600px) {
  .notification-item-premium {
    padding-left: 16px !important;
    padding-right: 16px !important;
  }
}
</style>