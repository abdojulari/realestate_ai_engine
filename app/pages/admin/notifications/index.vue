<template>
  <v-container>
    <div class="d-flex align-center mb-6">
      <h1 class="text-h4">Notifications</h1>
      <v-spacer />
      <v-switch v-model="enabled" label="Enable notifications" class="mr-4" @change="saveSettings" />
      <v-btn color="primary" variant="text" @click="markAllRead" prepend-icon="mdi-check-all">Mark all read</v-btn>
      <v-btn color="error" variant="text" @click="clearDismissed" prepend-icon="mdi-bell-off">Clear dismissed</v-btn>
    </div>

    <v-card>
      <v-list>
        <v-list-item
          v-for="n in notifications"
          :key="n.id"
          :title="n.title"
          :subtitle="n.message"
          :prepend-icon="icon(n.type)"
        >
          <template #append>
            <div class="d-flex align-center">
              <span class="text-caption mr-3">{{ formatTime(n.createdAt) }}</span>
              <v-btn size="small" variant="text" icon="mdi-bell-remove" @click="dismiss(n)" />
            </div>
          </template>
        </v-list-item>
      </v-list>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '~~/utils/api'
import { formatTime } from '~~/utils/formatters'

const notifications = ref<any[]>([])
const enabled = ref(true)
const dismissedIds = ref<string[]>([])
const lastSeenAt = ref<Date | null>(null)

function icon(type: string) { return ({ user: 'mdi-account', property: 'mdi-home', system: 'mdi-cog', alert: 'mdi-alert' } as any)[type] || 'mdi-bell' }

async function load() {
  const data: any = await api.get('/api/admin/notifications')
  notifications.value = data.notifications || []
  enabled.value = typeof data.enabled === 'boolean' ? data.enabled : true
  lastSeenAt.value = data.lastSeenAt ? new Date(data.lastSeenAt) : null
}

async function saveSettings() {
  await api.post('/api/admin/notifications/settings', { enabled: enabled.value, dismissedIds: dismissedIds.value, lastSeenAt: lastSeenAt.value?.toISOString() })
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

async function clearDismissed() {
  dismissedIds.value = []
  await saveSettings()
  await load()
}

onMounted(load)

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] })
</script>


