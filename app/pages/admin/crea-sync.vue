<template>
  <div class="mls-integration-premium min-h-screen pb-20">
    <div class="max-w-7xl mx-auto px-6 pt-12">
      <!-- Header Section -->
      <header class="mb-12 relative">
        <div class="flex items-center space-x-4 mb-3">
          <div class="h-px w-12 bg-gold opacity-50"></div>
          <span class="text-xs uppercase tracking-[0.3em] font-bold text-gold">DDF Synchronization</span>
        </div>
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 class="text-5xl font-serif text-slate-900 mb-3">CREA MLS Integration</h1>
            <p class="text-lg text-slate-500 font-light max-w-2xl leading-relaxed">
              Orchestrate real-time synchronization between the CREA DDF® API and your property portfolio.
            </p>
          </div>
          <div class="hidden lg:block">
            <div class="flex items-center space-x-2 px-4 py-2 bg-white rounded-full border border-slate-100 shadow-sm">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span class="text-xs font-semibold text-slate-600 uppercase tracking-wider">Gateway Active</span>
            </div>
          </div>
        </div>
      </header>

      <!-- Premium Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <!-- MLS Properties Card -->
        <div class="premium-card group hover:translate-y-[-4px] transition-all duration-500">
          <div class="p-8">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">MLS Portfolio</p>
                <p class="text-4xl font-serif text-slate-900">{{ stats.creaProperties || 0 }}</p>
              </div>
              <div class="p-3 bg-blue-50 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-500">
                <svg class="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                </svg>
              </div>
            </div>
            <div class="mt-6 pt-6 border-t border-slate-50">
              <p class="text-xs text-slate-400 font-medium italic">Verified CREA DDF Entries</p>
            </div>
          </div>
        </div>

        <!-- Manual Listings Card -->
        <div class="premium-card group hover:translate-y-[-4px] transition-all duration-500">
          <div class="p-8">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">In-House Listings</p>
                <p class="text-4xl font-serif text-slate-900">{{ stats.manualProperties || 0 }}</p>
              </div>
              <div class="p-3 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-500">
                <svg class="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"></path>
                </svg>
              </div>
            </div>
            <div class="mt-6 pt-6 border-t border-slate-50">
              <p class="text-xs text-slate-400 font-medium italic">Manually Curated Properties</p>
            </div>
          </div>
        </div>

        <!-- Last Sync Card -->
        <div class="premium-card group hover:translate-y-[-4px] transition-all duration-500">
          <div class="p-8">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Operational State</p>
                <p class="text-2xl font-serif text-slate-900 mt-2 leading-tight">{{ lastSyncFormatted }}</p>
              </div>
              <div class="p-3 bg-amber-50 rounded-2xl text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors duration-500">
                <svg class="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            </div>
            <div class="mt-6 pt-6 border-t border-slate-50">
              <p class="text-xs text-slate-400 font-medium italic">Last Successful Handshake</p>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <!-- Sync Controls Panel -->
        <div class="lg:col-span-5">
          <div class="premium-card sticky top-8">
            <div class="p-8 border-b border-slate-50 bg-slate-50/30">
              <h2 class="text-xl font-serif text-slate-900">Sync Parameters</h2>
              <p class="text-sm text-slate-500 mt-1">Configure your extraction filters</p>
            </div>
            <div class="p-8">
              <form @submit.prevent="startSync" class="space-y-8">
                <div class="space-y-6">
                  <div class="group">
                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Target Municipalities</label>
                    <input
                      v-model="syncFilters.city"
                      type="text"
                      placeholder="Toronto, Vancouver, Montreal"
                      class="premium-input"
                    >
                  </div>
                  <div class="group">
                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Minimum Valuation (CAD)</label>
                    <div class="relative">
                      <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-serif">$</span>
                      <input
                        v-model="syncFilters.minPrice"
                        type="number"
                        placeholder="0"
                        class="premium-input pl-10"
                      >
                    </div>
                  </div>
                </div>
                
                <div class="pt-4">
                  <button
                    type="submit"
                    :disabled="loading"
                    class="premium-button-primary w-full"
                  >
                    <svg v-if="loading" class="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{{ loading ? 'Synchronizing Archive...' : 'Initialize CREA Sync' }}</span>
                  </button>
                </div>

                <transition name="fade">
                  <div v-if="lastSyncResult" class="p-4 bg-slate-900 rounded-2xl text-white">
                    <div class="flex items-center justify-between mb-3">
                      <span class="text-[10px] uppercase tracking-widest font-bold opacity-60">Session Summary</span>
                      <span class="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">LIVE</span>
                    </div>
                    <div class="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p class="text-xl font-serif text-emerald-400">{{ lastSyncResult.stats?.created || 0 }}</p>
                        <p class="text-[9px] uppercase tracking-tighter opacity-60">New</p>
                      </div>
                      <div>
                        <p class="text-xl font-serif text-blue-400">{{ lastSyncResult.stats?.updated || 0 }}</p>
                        <p class="text-[9px] uppercase tracking-tighter opacity-60">Updated</p>
                      </div>
                      <div>
                        <p class="text-xl font-serif text-rose-400">{{ lastSyncResult.stats?.errors || 0 }}</p>
                        <p class="text-[9px] uppercase tracking-tighter opacity-60">Errors</p>
                      </div>
                    </div>
                  </div>
                </transition>
              </form>
            </div>
          </div>
        </div>

        <!-- Sync History Panel -->
        <div class="lg:col-span-7">
          <div class="premium-card h-full">
            <div class="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <div>
                <h2 class="text-xl font-serif text-slate-900">Audit Log</h2>
                <p class="text-sm text-slate-500 mt-1">Review historical synchronization telemetry</p>
              </div>
              <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last 10 Events</div>
            </div>
            <div class="p-8">
              <div v-if="syncHistory.length === 0" class="flex flex-col items-center justify-center py-24 text-center">
                <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <svg class="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <h3 class="text-lg font-serif text-slate-400">History Vacuum</h3>
                <p class="text-sm text-slate-400 max-w-xs mt-1 italic">Initiate a sync to populate this ledger with activity data.</p>
              </div>
              
              <div v-else class="space-y-6">
                <div
                  v-for="(sync, index) in syncHistory"
                  :key="index"
                  class="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl hover:border-slate-300 transition-colors duration-300 shadow-sm"
                >
                  <div class="flex items-center space-x-6">
                    <div class="relative">
                      <div :class="[
                        'w-3 h-3 rounded-full',
                        sync.success ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                      ]"></div>
                    </div>
                    <div>
                      <p class="text-sm font-semibold text-slate-900">{{ sync.message }}</p>
                      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{{ formatDate(sync.timestamp) }}</p>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="text-lg font-serif text-slate-900">{{ sync.stats?.total || 0 }}</p>
                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Properties</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Alert Messages -->
      <transition name="slide-fade">
        <div
          v-if="alert.message"
          :class="[
            'fixed bottom-8 right-8 max-w-sm px-6 py-4 rounded-2xl shadow-2xl z-50 flex items-center space-x-4 border-l-4 backdrop-blur-md',
            alert.type === 'success' ? 'bg-emerald-900/90 text-white border-emerald-400' : 'bg-rose-900/90 text-white border-rose-400'
          ]"
        >
          <div class="flex-shrink-0">
            <svg v-if="alert.type === 'success'" class="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <svg v-else class="h-6 w-6 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <p class="text-sm font-bold tracking-wide">{{ alert.message }}</p>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ARCHITECTURAL LOGIC: PRESERVED
 */
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
  if (!stats.value.lastSync) return 'Handshake Pending'
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
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
    
    syncHistory.value.unshift(lastSyncResult.value)
    if (syncHistory.value.length > 10) {
      syncHistory.value = syncHistory.value.slice(0, 10)
    }
    
    alert.value = {
      message: response.message || 'Synchronization sequence complete.',
      type: 'success'
    }
    
    await fetchStats()
  } catch (error) {
    console.error('Sync error:', error)
    alert.value = {
      message: `System Failure: ${error.data?.message || error.message}`,
      type: 'error'
    }
  } finally {
    loading.value = false
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
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(dateString))
}

onMounted(() => {
  fetchStats()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');

.mls-integration-premium {
  background-color: #fdfdfd;
  font-family: 'Inter', sans-serif;
  background-image: radial-gradient(at 0% 0%, rgba(241, 245, 249, 0.5) 0px, transparent 50%),
                    radial-gradient(at 100% 100%, rgba(241, 245, 249, 0.5) 0px, transparent 50%);
}

.font-serif {
  font-family: 'Playfair Display', serif;
}

.text-gold {
  color: #c5a059;
}

.bg-gold {
  background-color: #c5a059;
}

.premium-card {
  background: white;
  border-radius: 32px;
  border: 1px solid rgba(0, 0, 0, 0.04);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.02);
  overflow: hidden;
}

.premium-input {
  width: 100%;
  padding: 1rem 1.25rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  color: #1e293b;
  font-size: 0.95rem;
  transition: all 0.3s ease;
}

.premium-input:focus {
  outline: none;
  background: white;
  border-color: #c5a059;
  box-shadow: 0 0 0 4px rgba(197, 160, 89, 0.1);
}

.premium-button-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.15rem 2rem;
  background: #1e293b;
  color: white;
  border-radius: 18px;
  font-weight: 700;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
  box-shadow: 0 10px 20px rgba(30, 41, 59, 0.15);
}

.premium-button-primary:hover:not(:disabled) {
  background: #0f172a;
  transform: translateY(-2px);
  box-shadow: 0 15px 30px rgba(30, 41, 59, 0.25);
}

.premium-button-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  filter: grayscale(0.5);
}

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.5s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-fade-enter-active { transition: all 0.4s ease-out; }
.slide-fade-leave-active { transition: all 0.5s cubic-bezier(1, 0.5, 0.8, 1); }
.slide-fade-enter-from { transform: translateX(20px); opacity: 0; }
.slide-fade-leave-to { transform: translateX(10px); opacity: 0; }
</style>