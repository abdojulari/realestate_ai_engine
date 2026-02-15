<template>
  <div class="pillar9-integration min-h-screen pb-20">
    <div class="max-w-7xl mx-auto px-6 pt-12">
      <!-- Header Section -->
      <header class="mb-12 relative">
        <div class="flex items-center space-x-4 mb-3">
          <div class="h-px w-12 bg-amber-500 opacity-50"></div>
          <span class="text-xs uppercase tracking-[0.3em] font-bold text-amber-600">Matrix Web API</span>
        </div>
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 class="text-5xl font-serif text-slate-900 mb-3">Pillar9 MLS Integration</h1>
            <p class="text-lg text-slate-500 font-light max-w-2xl leading-relaxed">
              Sync Alberta MLS listings with Active, Sold, and Pending status support for comprehensive market analysis.
            </p>
          </div>
          <div class="hidden lg:block">
            <div class="flex items-center space-x-2 px-4 py-2 bg-white rounded-full border border-slate-100 shadow-sm">
              <span class="relative flex h-2 w-2">
                <span :class="[
                  'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                  status.configured ? 'bg-emerald-400' : 'bg-rose-400'
                ]"></span>
                <span :class="[
                  'relative inline-flex rounded-full h-2 w-2',
                  status.configured ? 'bg-emerald-500' : 'bg-rose-500'
                ]"></span>
              </span>
              <span class="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {{ status.configured ? 'API Connected' : 'Not Configured' }}
              </span>
            </div>
          </div>
        </div>
      </header>

      <!-- Configuration Warning -->
      <div v-if="!status.configured" class="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-2xl">
        <div class="flex items-start space-x-4">
          <div class="p-2 bg-amber-100 rounded-xl">
            <svg class="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-amber-800">API Configuration Required</h3>
            <p class="text-sm text-amber-700 mt-1">{{ status.message }}</p>
            <p class="text-xs text-amber-600 mt-3 font-mono">
              Required environment variables:<br>
              PILLAR9_CLIENT_ID, PILLAR9_CLIENT_SECRET
            </p>
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <!-- Active Listings -->
        <div class="premium-card group hover:translate-y-[-4px] transition-all duration-500">
          <div class="p-6">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Active</p>
                <p class="text-3xl font-serif text-slate-900">{{ status.localCounts?.active || 0 }}</p>
              </div>
              <div class="p-2 bg-emerald-50 rounded-xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-500">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            </div>
            <div class="mt-4 pt-4 border-t border-slate-50">
              <p class="text-xs text-slate-400 font-medium">For Sale Listings</p>
            </div>
          </div>
        </div>

        <!-- Sold Listings -->
        <div class="premium-card group hover:translate-y-[-4px] transition-all duration-500">
          <div class="p-6">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Sold</p>
                <p class="text-3xl font-serif text-slate-900">{{ status.localCounts?.sold || 0 }}</p>
              </div>
              <div class="p-2 bg-blue-50 rounded-xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-500">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
              </div>
            </div>
            <div class="mt-4 pt-4 border-t border-slate-50">
              <p class="text-xs text-slate-400 font-medium">For CMA Analysis</p>
            </div>
          </div>
        </div>

        <!-- Pending Listings -->
        <div class="premium-card group hover:translate-y-[-4px] transition-all duration-500">
          <div class="p-6">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Pending</p>
                <p class="text-3xl font-serif text-slate-900">{{ status.localCounts?.pending || 0 }}</p>
              </div>
              <div class="p-2 bg-amber-50 rounded-xl text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors duration-500">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            </div>
            <div class="mt-4 pt-4 border-t border-slate-50">
              <p class="text-xs text-slate-400 font-medium">Under Contract</p>
            </div>
          </div>
        </div>

        <!-- Last Sync -->
        <div class="premium-card group hover:translate-y-[-4px] transition-all duration-500">
          <div class="p-6">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Last Sync</p>
                <p class="text-lg font-serif text-slate-900 mt-1">{{ lastSyncFormatted }}</p>
              </div>
              <div class="p-2 bg-slate-50 rounded-xl text-slate-600 group-hover:bg-slate-600 group-hover:text-white transition-colors duration-500">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
              </div>
            </div>
            <div class="mt-4 pt-4 border-t border-slate-50">
              <p class="text-xs text-slate-400 font-medium">Synchronization Time</p>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <!-- Sync Controls Panel -->
        <div class="lg:col-span-5">
          <div class="premium-card sticky top-8">
            <div class="p-8 border-b border-slate-50 bg-slate-50/30">
              <h2 class="text-xl font-serif text-slate-900">Sync Configuration</h2>
              <p class="text-sm text-slate-500 mt-1">Configure property sync parameters</p>
            </div>
            <div class="p-8">
              <form @submit.prevent="startSync" class="space-y-6">
                <!-- Status Options -->
                <div class="space-y-4">
                  <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest">Property Status</label>
                  
                  <div class="space-y-3">
                    <label class="flex items-center space-x-3 cursor-pointer">
                      <input type="checkbox" v-model="syncOptions.syncActive" disabled checked class="rounded text-emerald-600 focus:ring-emerald-500">
                      <span class="text-sm text-slate-700">Active Listings (Always synced)</span>
                    </label>
                    
                    <label class="flex items-center space-x-3 cursor-pointer">
                      <input type="checkbox" v-model="syncOptions.syncSold" class="rounded text-blue-600 focus:ring-blue-500">
                      <span class="text-sm text-slate-700">Sold Properties (For CMA)</span>
                    </label>
                    
                    <label class="flex items-center space-x-3 cursor-pointer">
                      <input type="checkbox" v-model="syncOptions.syncPending" class="rounded text-amber-600 focus:ring-amber-500">
                      <span class="text-sm text-slate-700">Pending Properties</span>
                    </label>
                  </div>
                </div>

                <!-- Deduplication Option -->
                <div class="pt-4 border-t border-slate-100">
                  <label class="flex items-center space-x-3 cursor-pointer">
                    <input type="checkbox" v-model="syncOptions.deduplicateWithCrea" class="rounded text-slate-600 focus:ring-slate-500">
                    <div>
                      <span class="text-sm text-slate-700 font-medium">Deduplicate with CREA</span>
                      <p class="text-xs text-slate-400 mt-0.5">Skip properties already synced from CREA</p>
                    </div>
                  </label>
                </div>

                <!-- Location Filters -->
                <div class="space-y-4 pt-4 border-t border-slate-100">
                  <div class="group">
                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">City Filter</label>
                    <input
                      v-model="syncFilters.city"
                      type="text"
                      placeholder="Calgary, Edmonton, Red Deer"
                      class="premium-input"
                    >
                  </div>
                  
                  <div class="group">
                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Minimum Price (CAD)</label>
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

                  <div class="group">
                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Limit</label>
                    <input
                      v-model="syncFilters.limit"
                      type="number"
                      placeholder="100"
                      class="premium-input"
                    >
                  </div>
                </div>

                <!-- Sync Button -->
                <div class="pt-6">
                  <button
                    type="submit"
                    :disabled="loading || !status.configured"
                    class="premium-button-primary w-full"
                  >
                    <svg v-if="loading" class="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{{ loading ? 'Synchronizing...' : 'Start Pillar9 Sync' }}</span>
                  </button>
                </div>

                <!-- Sync Result -->
                <transition name="fade">
                  <div v-if="lastSyncResult" class="p-4 bg-slate-900 rounded-2xl text-white">
                    <div class="flex items-center justify-between mb-3">
                      <span class="text-[10px] uppercase tracking-widest font-bold opacity-60">Sync Summary</span>
                      <span :class="[
                        'text-[10px] px-2 py-0.5 rounded-full font-bold',
                        lastSyncResult.success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      ]">{{ lastSyncResult.success ? 'SUCCESS' : 'FAILED' }}</span>
                    </div>
                    <div class="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <p class="text-xl font-serif text-emerald-400">{{ lastSyncResult.stats?.created || 0 }}</p>
                        <p class="text-[9px] uppercase tracking-tighter opacity-60">Created</p>
                      </div>
                      <div>
                        <p class="text-xl font-serif text-blue-400">{{ lastSyncResult.stats?.updated || 0 }}</p>
                        <p class="text-[9px] uppercase tracking-tighter opacity-60">Updated</p>
                      </div>
                      <div>
                        <p class="text-xl font-serif text-amber-400">{{ lastSyncResult.stats?.duplicates || 0 }}</p>
                        <p class="text-[9px] uppercase tracking-tighter opacity-60">Duplicates</p>
                      </div>
                      <div>
                        <p class="text-xl font-serif text-rose-400">{{ lastSyncResult.stats?.errors || 0 }}</p>
                        <p class="text-[9px] uppercase tracking-tighter opacity-60">Errors</p>
                      </div>
                    </div>
                    
                    <!-- Status breakdown -->
                    <div v-if="lastSyncResult.stats?.byStatus" class="mt-4 pt-4 border-t border-white/10">
                      <p class="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-2">By Status</p>
                      <div class="grid grid-cols-3 gap-2 text-center text-xs">
                        <div>
                          <span class="text-emerald-400">Active:</span>
                          <span class="ml-1">{{ lastSyncResult.stats.byStatus.active?.created || 0 }} new</span>
                        </div>
                        <div>
                          <span class="text-blue-400">Sold:</span>
                          <span class="ml-1">{{ lastSyncResult.stats.byStatus.sold?.created || 0 }} new</span>
                        </div>
                        <div>
                          <span class="text-amber-400">Pending:</span>
                          <span class="ml-1">{{ lastSyncResult.stats.byStatus.pending?.created || 0 }} new</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </transition>
              </form>
            </div>
          </div>
        </div>

        <!-- Info & Settings Panel -->
        <div class="lg:col-span-7 space-y-8">
          <!-- CMA Use Case Info -->
          <div class="premium-card">
            <div class="p-8 border-b border-slate-50 bg-gradient-to-r from-blue-50/50 to-emerald-50/50">
              <h2 class="text-xl font-serif text-slate-900">CMA & Market Analysis</h2>
              <p class="text-sm text-slate-500 mt-1">Leverage sold data for property valuations</p>
            </div>
            <div class="p-8">
              <div class="space-y-6">
                <div class="flex items-start space-x-4">
                  <div class="p-3 bg-blue-100 rounded-2xl text-blue-600 flex-shrink-0">
                    <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 class="text-lg font-semibold text-slate-900">Comparative Market Analysis</h3>
                    <p class="text-sm text-slate-500 mt-1">
                      Use sold property data from the same community to predict and forecast what a subject property can cost. 
                      Help sellers get accurate pricing insights based on recent comparable sales.
                    </p>
                  </div>
                </div>

                <div class="flex items-start space-x-4">
                  <div class="p-3 bg-emerald-100 rounded-2xl text-emerald-600 flex-shrink-0">
                    <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 class="text-lg font-semibold text-slate-900">Price Forecasting</h3>
                    <p class="text-sm text-slate-500 mt-1">
                      Analyze trends from sold records to provide data-driven price recommendations and market timing advice.
                    </p>
                  </div>
                </div>

                <div class="flex items-start space-x-4">
                  <div class="p-3 bg-amber-100 rounded-2xl text-amber-600 flex-shrink-0">
                    <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 class="text-lg font-semibold text-slate-900">Backup Data Source</h3>
                    <p class="text-sm text-slate-500 mt-1">
                      Use Pillar9 as an alternative data source when CREA is missing properties, images, or detailed information for Alberta listings.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Sync Settings -->
          <div class="premium-card">
            <div class="p-8 border-b border-slate-50 bg-slate-50/30">
              <h2 class="text-xl font-serif text-slate-900">Auto-Sync Settings</h2>
              <p class="text-sm text-slate-500 mt-1">Configure automatic synchronization schedule</p>
            </div>
            <div class="p-8">
              <form @submit.prevent="saveSettings" class="space-y-6">
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-sm font-semibold text-slate-900">Enable Auto-Sync</h3>
                    <p class="text-xs text-slate-500 mt-0.5">Automatically sync properties on schedule</p>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" v-model="settings.autoSyncEnabled" class="sr-only peer">
                    <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div class="group">
                  <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Sync Time (Daily)</label>
                  <input
                    v-model="settings.autoSyncTime"
                    type="time"
                    class="premium-input"
                  >
                </div>

                <div class="group">
                  <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Default Province</label>
                  <select v-model="settings.defaultProvince" class="premium-input">
                    <option value="AB">Alberta</option>
                    <option value="BC">British Columbia</option>
                    <option value="SK">Saskatchewan</option>
                    <option value="MB">Manitoba</option>
                  </select>
                </div>

                <div class="space-y-3">
                  <label class="flex items-center space-x-3 cursor-pointer">
                    <input type="checkbox" v-model="settings.syncSold" class="rounded text-blue-600 focus:ring-blue-500">
                    <span class="text-sm text-slate-700">Include Sold Properties in Auto-Sync</span>
                  </label>
                  
                  <label class="flex items-center space-x-3 cursor-pointer">
                    <input type="checkbox" v-model="settings.syncPending" class="rounded text-amber-600 focus:ring-amber-500">
                    <span class="text-sm text-slate-700">Include Pending Properties in Auto-Sync</span>
                  </label>
                  
                  <label class="flex items-center space-x-3 cursor-pointer">
                    <input type="checkbox" v-model="settings.deduplicateCrea" class="rounded text-slate-600 focus:ring-slate-500">
                    <span class="text-sm text-slate-700">Deduplicate with CREA Data</span>
                  </label>
                </div>

                <button
                  type="submit"
                  :disabled="savingSettings"
                  class="premium-button-secondary w-full"
                >
                  {{ savingSettings ? 'Saving...' : 'Save Settings' }}
                </button>
              </form>
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
// @ts-ignore
import { api } from '~/utils/api'

interface SyncFilters {
  city?: string
  minPrice?: number
  limit?: number
}

interface SyncOptions {
  syncActive: boolean
  syncSold: boolean
  syncPending: boolean
  deduplicateWithCrea: boolean
}

interface SyncResult {
  success: boolean
  stats: {
    total: number
    created: number
    updated: number
    skipped: number
    duplicates: number
    errors: number
    byStatus: {
      active: { created: number; updated: number }
      sold: { created: number; updated: number }
      pending: { created: number; updated: number }
    }
  }
  message: string
}

interface Pillar9Status {
  configured: boolean
  message: string
  localCounts: {
    active: number
    sold: number
    pending: number
    total: number
  }
  apiCounts: {
    active: number
    sold: number
    pending: number
    total: number
  } | null
  lastSync: string | null
}

interface Settings {
  autoSyncEnabled: boolean
  autoSyncTime: string
  syncSold: boolean
  syncPending: boolean
  deduplicateCrea: boolean
  defaultProvince: string
}

definePageMeta({
  middleware: 'auth',
  layout: 'admin'
})

const loading = ref(false)
const savingSettings = ref(false)

const status = ref<Pillar9Status>({
  configured: false,
  message: 'Loading...',
  localCounts: { active: 0, sold: 0, pending: 0, total: 0 },
  apiCounts: null,
  lastSync: null
})

const syncFilters = ref<SyncFilters>({})

const syncOptions = ref<SyncOptions>({
  syncActive: true,
  syncSold: true,
  syncPending: false,
  deduplicateWithCrea: true
})

const settings = ref<Settings>({
  autoSyncEnabled: false,
  autoSyncTime: '01:00',
  syncSold: true,
  syncPending: false,
  deduplicateCrea: true,
  defaultProvince: 'AB'
})

const lastSyncResult = ref<SyncResult | null>(null)
const alert = ref({ message: '', type: 'success' as 'success' | 'error' })

const lastSyncFormatted = computed(() => {
  if (!status.value.lastSync) return 'Never'
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(status.value.lastSync))
})

const fetchStatus = async () => {
  try {
    const data = await $fetch<Pillar9Status>('/api/admin/pillar9/sync-status')
    status.value = data
  } catch (error) {
    console.error('Error fetching status:', error)
  }
}

const fetchSettings = async () => {
  try {
    const data = await api.get<Settings>('/api/admin/settings/pillar9-sync')
    settings.value = {
      autoSyncEnabled: data.autoSyncEnabled,
      autoSyncTime: data.autoSyncTime,
      syncSold: data.syncSold,
      syncPending: data.syncPending,
      deduplicateCrea: data.deduplicateCrea,
      defaultProvince: data.defaultProvince
    }
  } catch (error) {
    console.error('Error fetching settings:', error)
  }
}

const startSync = async () => {
  loading.value = true
  alert.value.message = ''

  try {
    const response = await api.post<SyncResult>('/api/admin/pillar9/sync', {
      filters: syncFilters.value,
      syncSold: syncOptions.value.syncSold,
      syncPending: syncOptions.value.syncPending,
      deduplicateWithCrea: syncOptions.value.deduplicateWithCrea
    })

    lastSyncResult.value = response

    alert.value = {
      message: response.message || 'Sync completed successfully',
      type: 'success'
    }

    // Refresh status
    await fetchStatus()
  } catch (error: any) {
    console.error('Sync error:', error)
    alert.value = {
      message: `Sync failed: ${error.data?.message || error.message}`,
      type: 'error'
    }
  } finally {
    loading.value = false
    setTimeout(() => {
      alert.value.message = ''
    }, 5000)
  }
}

const saveSettings = async () => {
  savingSettings.value = true

  try {
    await api.post('/api/admin/settings/pillar9-sync', settings.value)

    alert.value = {
      message: 'Settings saved successfully',
      type: 'success'
    }
  } catch (error: any) {
    console.error('Settings error:', error)
    alert.value = {
      message: `Failed to save settings: ${error.data?.message || error.message}`,
      type: 'error'
    }
  } finally {
    savingSettings.value = false
    setTimeout(() => {
      alert.value.message = ''
    }, 5000)
  }
}

onMounted(() => {
  fetchStatus()
  fetchSettings()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');

.pillar9-integration {
  background-color: #fdfdfd;
  font-family: 'Inter', sans-serif;
  background-image: radial-gradient(at 0% 0%, rgba(251, 191, 36, 0.05) 0px, transparent 50%),
                    radial-gradient(at 100% 100%, rgba(241, 245, 249, 0.5) 0px, transparent 50%);
}

.font-serif {
  font-family: 'Playfair Display', serif;
}

.premium-card {
  background: white;
  border-radius: 24px;
  border: 1px solid rgba(0, 0, 0, 0.04);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.02);
  overflow: hidden;
}

.premium-input {
  width: 100%;
  padding: 0.875rem 1rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  color: #1e293b;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.premium-input:focus {
  outline: none;
  background: white;
  border-color: #f59e0b;
  box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.1);
}

.premium-button-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
  box-shadow: 0 10px 20px rgba(245, 158, 11, 0.2);
}

.premium-button-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 15px 30px rgba(245, 158, 11, 0.3);
}

.premium-button-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(0.3);
}

.premium-button-secondary {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.875rem 1.5rem;
  background: #1e293b;
  color: white;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.875rem;
  transition: all 0.3s ease;
}

.premium-button-secondary:hover:not(:disabled) {
  background: #0f172a;
}

.premium-button-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.5s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-fade-enter-active { transition: all 0.4s ease-out; }
.slide-fade-leave-active { transition: all 0.5s cubic-bezier(1, 0.5, 0.8, 1); }
.slide-fade-enter-from { transform: translateX(20px); opacity: 0; }
.slide-fade-leave-to { transform: translateX(10px); opacity: 0; }
</style>
