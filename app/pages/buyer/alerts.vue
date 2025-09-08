<template>
  <v-container>
    <div class="d-flex align-center mb-6">
      <h1 class="text-h4">My Property Alerts</h1>
      <v-spacer />
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        to="/ai-search"
      >
        Create New Alert
      </v-btn>
    </div>

    <!-- Active Alerts -->
    <v-card v-if="alerts.length > 0">
      <v-card-title>Active Alerts</v-card-title>
      <v-card-text>
        <div v-for="alert in alerts" :key="alert.id" class="alert-item mb-4">
          <v-card variant="outlined">
            <v-card-text>
              <div class="d-flex align-center justify-space-between">
                <div class="alert-info flex-grow-1">
                  <h3 class="text-h6 mb-2">{{ alert.naturalQuery }}</h3>
                  <div class="alert-details">
                    <v-chip size="small" color="info" class="mr-2">
                      <v-icon start>mdi-map-marker</v-icon>
                      {{ alert.city || 'All cities' }}
                    </v-chip>
                    <v-chip size="small" color="primary" class="mr-2">
                      <v-icon start>mdi-clock</v-icon>
                      {{ getFrequencyLabel(alert.frequency) }}
                    </v-chip>
                    <v-chip size="small" color="success" class="mr-2">
                      <v-icon start>mdi-email</v-icon>
                      {{ alert.totalSent }} sent
                    </v-chip>
                  </div>
                  <div class="text-caption mt-2">
                    Next check: {{ formatDateTime(alert.nextRun) }}
                  </div>
                </div>
                
                <div class="alert-actions">
                  <v-btn
                    icon="mdi-pause"
                    variant="text"
                    size="small"
                    color="warning"
                    @click="toggleAlert(alert)"
                    v-if="alert.isActive"
                  />
                  <v-btn
                    icon="mdi-play"
                    variant="text"
                    size="small"
                    color="success"
                    @click="toggleAlert(alert)"
                    v-else
                  />
                  <v-btn
                    icon="mdi-delete"
                    variant="text"
                    size="small"
                    color="error"
                    @click="deleteAlert(alert)"
                  />
                </div>
              </div>
            </v-card-text>
          </v-card>
        </div>
      </v-card-text>
    </v-card>

    <!-- Empty State -->
    <v-card v-else>
      <v-card-text class="text-center py-12">
        <v-icon size="64" color="grey" class="mb-4">mdi-bell-outline</v-icon>
        <h2 class="text-h6 mb-2">No Property Alerts</h2>
        <p class="text-body-2 text-grey mb-6">
          Create your first property alert to get notified when new listings match your criteria.
        </p>
        <v-btn color="primary" to="/ai-search">
          <v-icon start>mdi-plus</v-icon>
          Create Your First Alert
        </v-btn>
      </v-card-text>
    </v-card>

    <!-- Marketing Consent Status -->
    <v-card class="mt-6">
      <v-card-title>Privacy & Marketing Preferences</v-card-title>
      <v-card-text>
        <div class="d-flex align-center">
          <v-icon :color="user?.marketingConsent ? 'success' : 'warning'" class="mr-3">
            {{ user?.marketingConsent ? 'mdi-check-circle' : 'mdi-alert-circle' }}
          </v-icon>
          <div>
            <div class="font-weight-medium">
              Marketing Consent: {{ user?.marketingConsent ? 'Granted' : 'Not Granted' }}
            </div>
            <div class="text-caption">
              {{ user?.marketingConsent 
                ? `Granted on ${formatDateTime(user.consentDate)}` 
                : 'Required to receive property alerts' }}
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
const alerts = ref<any[]>([])
const loading = ref(false)

// Get user info for consent display
const authStore = useAuthStore()
const user = computed(() => authStore.user)

const loadAlerts = async () => {
  loading.value = true
  try {
    const data = await $fetch('/api/buyer/alerts', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    alerts.value = data || []
  } catch (error) {
    console.error('Failed to load alerts:', error)
  } finally {
    loading.value = false
  }
}

const toggleAlert = async (alert: any) => {
  try {
    await $fetch(`/api/buyer/alerts/${alert.id}`, {
      method: 'PUT',
      body: { isActive: !alert.isActive },
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    alert.isActive = !alert.isActive
    console.log(`Alert ${alert.isActive ? 'activated' : 'paused'}`)
  } catch (error) {
    console.error('Failed to toggle alert:', error)
  }
}

const deleteAlert = async (alert: any) => {
  if (!confirm('Are you sure you want to delete this property alert?')) return
  
  try {
    await $fetch(`/api/buyer/alerts/${alert.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    alerts.value = alerts.value.filter(a => a.id !== alert.id)
    console.log('Alert deleted')
  } catch (error) {
    console.error('Failed to delete alert:', error)
  }
}

const getFrequencyLabel = (frequency: string): string => {
  const labels: Record<string, string> = {
    '2h': 'Every 2 hours',
    '4h': 'Every 4 hours',
    '12h': 'Every 12 hours', 
    '24h': 'Daily',
    '7d': 'Weekly',
    '14d': 'Bi-weekly',
    '30d': 'Monthly'
  }
  return labels[frequency] || 'Daily'
}

const formatDateTime = (date: Date | string) => {
  return new Date(date).toLocaleString()
}

onMounted(() => {
  loadAlerts()
})

definePageMeta({
  middleware: ['auth']
})
</script>

<style scoped>
.alert-item {
  transition: all 0.2s;
}

.alert-item:hover {
  transform: translateY(-2px);
}

.alert-details {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.alert-actions {
  display: flex;
  gap: 4px;
}
</style>
