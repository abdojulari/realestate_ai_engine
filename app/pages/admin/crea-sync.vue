<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-6xl mx-auto">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">CREA MLS Integration</h1>
        <p class="text-gray-600">Manage synchronization with CREA DDF API for MLS listings</p>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">MLS Properties</p>
              <p class="text-2xl font-semibold text-gray-900">{{ stats.creaProperties || 0 }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"></path>
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Manual Listings</p>
              <p class="text-2xl font-semibold text-gray-900">{{ stats.manualProperties || 0 }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Last Sync</p>
              <p class="text-2xl font-semibold text-gray-900">{{ lastSyncFormatted }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Sync Controls -->
      <div class="bg-white rounded-lg shadow mb-8">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-xl font-semibold text-gray-900">Sync Properties</h2>
          <p class="text-sm text-gray-600 mt-1">Synchronize MLS listings from CREA DDF API</p>
        </div>
        <div class="p-6">
          <form @submit.prevent="startSync" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">City Filter</label>
                <input
                  v-model="syncFilters.city"
                  type="text"
                  placeholder="e.g., Toronto, Vancouver"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Min Price</label>
                <input
                  v-model="syncFilters.minPrice"
                  type="number"
                  placeholder="0"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
              </div>
            </div>
            
            <div class="flex items-center space-x-4">
              <button
                type="submit"
                :disabled="loading"
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg v-if="loading" class="-ml-1 mr-3 h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ loading ? 'Syncing...' : 'Start Sync' }}
              </button>
              
              <div v-if="lastSyncResult" class="text-sm text-gray-600">
                Last result: {{ lastSyncResult.stats?.created || 0 }} created, 
                {{ lastSyncResult.stats?.updated || 0 }} updated, 
                {{ lastSyncResult.stats?.errors || 0 }} errors
              </div>
            </div>
          </form>
        </div>
      </div>

      <!-- Sync History -->
      <div class="bg-white rounded-lg shadow">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-xl font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div class="p-6">
          <div v-if="syncHistory.length === 0" class="text-center text-gray-500 py-8">
            No sync history available. Start your first sync above.
          </div>
          
          <div v-else class="space-y-4">
            <div
              v-for="(sync, index) in syncHistory"
              :key="index"
              class="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div class="flex items-center space-x-4">
                <div :class="[
                  'w-3 h-3 rounded-full',
                  sync.success ? 'bg-green-500' : 'bg-red-500'
                ]"></div>
                <div>
                  <p class="font-medium text-gray-900">{{ sync.message }}</p>
                  <p class="text-sm text-gray-500">{{ formatDate(sync.timestamp) }}</p>
                </div>
              </div>
              <div class="text-sm text-gray-500">
                {{ sync.stats?.total || 0 }} properties processed
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Alert Messages -->
      <div
        v-if="alert.message"
        :class="[
          'fixed top-4 right-4 max-w-sm p-4 rounded-lg shadow-lg z-50',
          alert.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        ]"
      >
        {{ alert.message }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface SyncFilters {
  city?: string
  minPrice?: number
}

interface SyncResult {
  success: boolean
  stats: {
    total: number
    created: number
    updated: number
    errors: number
  }
  message: string
  timestamp: string
}

definePageMeta({
  middleware: 'auth',
  layout: 'admin'
})

const loading = ref(false)
const stats = ref({
  creaProperties: 0,
  manualProperties: 0,
  lastSync: null as Date | null
})
const syncFilters = ref<SyncFilters>({})
const lastSyncResult = ref<SyncResult | null>(null)
const syncHistory = ref<SyncResult[]>([])
const alert = ref({ message: '', type: 'success' })

const lastSyncFormatted = computed(() => {
  if (!stats.value.lastSync) return 'Never'
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(stats.value.lastSync))
})

const startSync = async () => {
  loading.value = true
  alert.value.message = ''
  
  try {
    const response = await $fetch('/api/admin/crea/sync', {
      method: 'POST',
      body: {
        filters: syncFilters.value
      }
    })

    lastSyncResult.value = {
      ...response,
      timestamp: new Date().toISOString()
    }
    
    // Add to history
    syncHistory.value.unshift(lastSyncResult.value)
    if (syncHistory.value.length > 10) {
      syncHistory.value = syncHistory.value.slice(0, 10)
    }
    
    alert.value = {
      message: response.message || 'Sync completed successfully!',
      type: 'success'
    }
    
    // Refresh stats
    await fetchStats()
  } catch (error) {
    console.error('Sync error:', error)
    alert.value = {
      message: `Sync failed: ${error.data?.message || error.message}`,
      type: 'error'
    }
  } finally {
    loading.value = false
    
    // Clear alert after 5 seconds
    setTimeout(() => {
      alert.value.message = ''
    }, 5000)
  }
}

const fetchStats = async () => {
  try {
    const [creaProps, manualProps] = await Promise.all([
      $fetch('/api/properties?source=crea&status=for_sale'),
      $fetch('/api/properties?source=manual&status=for_sale')
    ])
    
    stats.value = {
      creaProperties: creaProps.length,
      manualProperties: manualProps.length,
      lastSync: creaProps.length > 0 ? new Date() : null
    }
  } catch (error) {
    console.error('Error fetching stats:', error)
  }
}

const formatDate = (dateString: string) => {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(dateString))
}

// Initialize
onMounted(() => {
  fetchStats()
})
</script>
