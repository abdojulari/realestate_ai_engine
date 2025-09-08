<template>
  <v-container>
    <div class="d-flex align-center mb-6">
      <h1 class="text-h4">System Settings</h1>
      <v-spacer />
      <v-chip :color="syncStatus === 'running' ? 'warning' : 'success'" variant="tonal">
        <v-icon start>{{ syncStatus === 'running' ? 'mdi-sync' : 'mdi-check-circle' }}</v-icon>
        {{ syncStatus === 'running' ? 'Sync Running' : 'System Ready' }}
      </v-chip>
    </div>

    <!-- CREA MLS Integration Section -->
    <v-card class="mb-6">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-3" color="primary">mdi-database-sync</v-icon>
        CREA MLS Data Sync
      </v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <div class="d-flex align-center mb-4">
              <v-icon class="mr-2" color="success">mdi-check-circle</v-icon>
              <span>Connected to CREA DDF API</span>
            </div>
            
            <!-- Sync Statistics -->
            <v-card variant="outlined" class="mb-4">
              <v-card-text>
                <h3 class="text-h6 mb-3">Current Data Status</h3>
                <div class="stats-grid">
                  <div class="stat-item">
                    <div class="stat-value">{{ stats.totalProperties?.toLocaleString() || '0' }}</div>
                    <div class="stat-label">Total Properties</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-value">{{ stats.creaProperties?.toLocaleString() || '0' }}</div>
                    <div class="stat-label">MLS Properties</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-value">{{ stats.manualProperties?.toLocaleString() || '0' }}</div>
                    <div class="stat-label">Manual Properties</div>
                  </div>
                </div>
                <div class="mt-3">
                  <div class="text-caption">Last Sync: {{ formatDateTime(stats.lastSyncAt) || 'Never' }}</div>
                </div>
              </v-card-text>
            </v-card>

            <!-- Manual Sync Controls -->
            <div class="sync-controls">
              <h3 class="text-h6 mb-3">Manual Sync</h3>
              <v-row>
                <v-col cols="12" sm="8">
                  <v-select
                    v-model="syncCity"
                    :items="cities"
                    item-title="name"
                    item-value="name"
                    label="City (Optional)"
                    variant="outlined"
                    density="compact"
                    clearable
                  >
                    <template v-slot:selection="{ item }">
                      {{ item.raw.name }} ({{ item.raw.count }} properties)
                    </template>
                  </v-select>
                </v-col>
                <v-col cols="12" sm="4">
                  <v-btn
                    color="primary"
                    block
                    :loading="syncing"
                    :disabled="syncStatus === 'running'"
                    @click="startManualSync"
                  >
                    <v-icon start>mdi-sync</v-icon>
                    Sync Now
                  </v-btn>
                </v-col>
              </v-row>
            </div>
          </v-col>

          <v-col cols="12" md="6">
            <!-- Automatic Sync Settings -->
            <v-card variant="outlined">
              <v-card-text>
                <h3 class="text-h6 mb-3">Automatic Sync</h3>
                
                <v-switch
                  v-model="autoSyncEnabled"
                  label="Enable automatic daily sync"
                  color="primary"
                  @update:model-value="updateAutoSyncSetting"
                />
                
                <div v-if="autoSyncEnabled" class="mt-3">
                  <v-select
                    v-model="autoSyncTime"
                    :items="timeOptions"
                    label="Sync Time"
                    variant="outlined"
                    density="compact"
                    @update:model-value="updateAutoSyncSetting"
                  />
                  <div class="text-caption mt-2">
                    Next sync: {{ nextSyncTime }}
                  </div>
                </div>

                <v-alert
                  v-if="autoSyncEnabled"
                  type="info"
                  variant="tonal"
                  class="mt-4"
                >
                  <div class="text-body-2">
                    <strong>Automatic Sync:</strong> New MLS properties will be synced daily at {{ autoSyncTime }}. 
                    This happens in the background without affecting site performance.
                  </div>
                </v-alert>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Sync Progress/Results -->
    <v-card v-if="lastSyncResult || syncing">
      <v-card-title>
        <v-icon class="mr-3">mdi-history</v-icon>
        Sync Activity
      </v-card-title>
      <v-card-text>
        <!-- Current Sync Progress -->
        <div v-if="syncing" class="mb-4">
          <div class="d-flex align-center mb-2">
            <v-progress-circular
              indeterminate
              size="20"
              width="2"
              color="primary"
              class="mr-2"
            />
            <span>Syncing properties from CREA...</span>
          </div>
          <v-progress-linear
            :model-value="syncProgress"
            color="primary"
            height="4"
            rounded
          />
          <div class="text-caption mt-1">{{ syncProgressText }}</div>
        </div>

        <!-- Last Sync Results -->
        <div v-if="lastSyncResult">
          <h4 class="text-subtitle-1 mb-2">Last Sync Results</h4>
          <div class="sync-results">
            <v-chip color="success" class="mr-2">
              <v-icon start>mdi-plus</v-icon>
              {{ lastSyncResult.created }} Created
            </v-chip>
            <v-chip color="info" class="mr-2">
              <v-icon start>mdi-update</v-icon>
              {{ lastSyncResult.updated }} Updated
            </v-chip>
            <v-chip v-if="lastSyncResult.errors > 0" color="error" class="mr-2">
              <v-icon start>mdi-alert</v-icon>
              {{ lastSyncResult.errors }} Errors
            </v-chip>
          </div>
          <div class="text-caption mt-2">
            Completed: {{ formatDateTime(lastSyncResult.timestamp) }}
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- Other Settings Sections -->
    <v-card class="mb-6">
      <v-card-title>
        <v-icon class="mr-3">mdi-cog</v-icon>
        General Settings
      </v-card-title>
      <v-card-text>
        <div class="text-body-2 text-grey-darken-1">
          Additional system settings will be added here as needed.
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
const syncing = ref(false)
const syncStatus = ref('ready') // 'ready', 'running', 'error'
const syncProgress = ref(0)
const syncProgressText = ref('')
const lastSyncResult = ref<any>(null)
const stats = ref<any>({})
const cities = ref<any[]>([])
const syncCity = ref<string>('')

// Auto-sync settings
const autoSyncEnabled = ref(false)
const autoSyncTime = ref('00:00')
const timeOptions = [
  '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
]

const nextSyncTime = computed(() => {
  if (!autoSyncEnabled.value) return 'Disabled'
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const syncTime = new Date(today.getTime() + parseInt(autoSyncTime.value.split(':')[0]) * 60 * 60 * 1000)
  
  if (syncTime <= now) {
    // Next sync is tomorrow
    syncTime.setDate(syncTime.getDate() + 1)
  }
  
  return syncTime.toLocaleString()
})

const startManualSync = async () => {
  syncing.value = true
  syncStatus.value = 'running'
  syncProgress.value = 0
  syncProgressText.value = 'Starting sync...'
  
  try {
    // Start background sync without blocking UI
    const syncPayload: any = {}
    if (syncCity.value) {
      syncPayload.filters = { city: syncCity.value }
    }
    
    syncProgressText.value = 'Connecting to CREA API...'
    syncProgress.value = 10
    
    // Call background sync endpoint (non-blocking)
    const response = await fetch('/api/admin/crea/background-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(syncPayload)
    })
    
    syncProgress.value = 50
    syncProgressText.value = 'Processing properties...'
    
    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    syncProgress.value = 100
    syncProgressText.value = 'Background sync started!'
    
    // Show immediate feedback
    alert(`Background sync started! The system will sync CREA properties without affecting performance. Check back in a few minutes for results.`)
    
    // Set up polling to check for completion
    pollForSyncCompletion()
    
  } catch (error: any) {
    console.error('Sync failed:', error)
    syncStatus.value = 'error'
    alert(`Sync failed: ${error.message}`)
  } finally {
    syncing.value = false
    syncStatus.value = 'ready'
    setTimeout(() => {
      syncProgress.value = 0
      syncProgressText.value = ''
    }, 3000)
  }
}

const updateAutoSyncSetting = async () => {
  try {
    const settings = {
      autoSyncEnabled: autoSyncEnabled.value,
      autoSyncTime: autoSyncTime.value
    }
    
    await fetch('/api/admin/settings/crea-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(settings)
    })
    
    console.log('Auto-sync settings updated:', settings)
  } catch (error) {
    console.error('Failed to update auto-sync settings:', error)
  }
}

const loadStats = async () => {
  try {
    const data = await fetch('/api/admin/dashboard', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }).then(r => r.json())
    
    stats.value = data.stats || {}
  } catch (error) {
    console.error('Failed to load stats:', error)
  }
}

const loadCities = async () => {
  try {
    const data = await fetch('/api/properties/cities').then(r => r.json())
    cities.value = data || []
  } catch (error) {
    console.error('Failed to load cities:', error)
  }
}

const loadAutoSyncSettings = async () => {
  try {
    const data = await fetch('/api/admin/settings/crea-sync', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }).then(r => r.json())
    
    autoSyncEnabled.value = data.autoSyncEnabled || false
    autoSyncTime.value = data.autoSyncTime || '00:00'
  } catch (error) {
    console.error('Failed to load auto-sync settings:', error)
  }
}

const formatDateTime = (date: Date | string) => {
  if (!date) return 'Never'
  return new Date(date).toLocaleString()
}

const pollForSyncCompletion = () => {
  // Poll for sync completion every 30 seconds
  const pollInterval = setInterval(async () => {
    try {
      await loadStats()
      
      // Check if sync is still running by looking at recent activity
      // You could also create a sync status API endpoint
      const now = new Date()
      const recentSync = stats.value.lastSyncAt ? new Date(stats.value.lastSyncAt) : null
      
      if (recentSync && (now.getTime() - recentSync.getTime()) < 60000) {
        // Sync completed recently
        clearInterval(pollInterval)
        syncing.value = false
        syncStatus.value = 'ready'
        syncProgressText.value = 'Sync completed!'
        
        // Refresh the page data
        await loadStats()
      }
    } catch (error) {
      console.error('Error polling sync status:', error)
    }
  }, 30000)
  
  // Stop polling after 10 minutes max
  setTimeout(() => {
    clearInterval(pollInterval)
    if (syncing.value) {
      syncing.value = false
      syncStatus.value = 'ready'
    }
  }, 600000)
}

onMounted(async () => {
  await Promise.all([
    loadStats(),
    loadCities(),
    loadAutoSyncSettings()
  ])
})

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin']
})
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
}

.stat-item {
  text-align: center;
  padding: 16px;
  background: #f5f5f5;
  border-radius: 8px;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1976d2;
}

.stat-label {
  font-size: 0.875rem;
  color: #666;
  margin-top: 4px;
}

.sync-controls {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.sync-results {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
