<template>
  <FeatureGate :feature="FEATURES.REPORTS" :show-upgrade-prompt="true">
    <div class="premium-reports-wrapper bg-[#F8FAFC] min-h-screen">
      <!-- PREMIUM TOP BAR -->
      <div class="header-glass sticky top-0 z-50 px-8 py-4 border-b border-slate-200 backdrop-blur-md bg-white/80">
        <div class="max-w-[1600px] mx-auto d-flex align-center">
          <div>
            <div class="flex items-center space-x-2 mb-0">
              <span class="text-[10px] uppercase tracking-[0.3em] font-bold text-primary">Intelligence & Data</span>
            </div>
            <h1 class="text-h4 font-serif text-slate-900 font-weight-bold">Reports & Analytics</h1>
          </div>
        <v-spacer />
        <div class="d-flex align-center gap-3">
          <v-btn
            variant="flat"
            color="success"
            class="premium-action-btn font-weight-bold"
            prepend-icon="mdi-file-excel"
            @click="exportReport('excel')"
            :loading="exporting === 'excel'"
          >
            Export CSV
          </v-btn>
          <v-btn
            variant="flat"
            color="error"
            class="premium-action-btn font-weight-bold"
            prepend-icon="mdi-file-pdf-box"
            @click="exportReport('pdf')"
            :loading="exporting === 'pdf'"
          >
            Generate PDF
          </v-btn>
        </div>
      </div>
    </div>

    <v-container fluid class="max-w-[1600px] px-8 pt-8 pb-16">
      <!-- DATE RANGE SELECTOR (PREMIUM) -->
      <v-card class="premium-card mb-8 border-t-4 border-t-primary">
        <v-card-text class="p-6">
          <v-row align="center">
            <v-col cols="12" md="4">
              <div class="text-caption font-weight-black text-slate-400 uppercase tracking-widest mb-2">Temporal Filter</div>
              <v-select
                v-model="dateRange"
                :items="dateRanges"
                label="Select Period"
                variant="outlined"
                rounded="lg"
                density="comfortable"
                hide-details
                class="premium-input"
                @update:model-value="updateReports"
              />
            </v-col>

            <v-col cols="12" md="4">
              <div class="text-caption font-weight-black text-slate-400 uppercase tracking-widest mb-2">Start Date</div>
              <v-text-field
                v-model="customRange.start"
                type="date"
                variant="outlined"
                rounded="lg"
                density="comfortable"
                hide-details
                class="premium-input"
                :disabled="dateRange !== 'custom'"
                @update:model-value="updateReports"
              />
            </v-col>

            <v-col cols="12" md="4">
              <div class="text-caption font-weight-black text-slate-400 uppercase tracking-widest mb-2">End Date</div>
              <v-text-field
                v-model="customRange.end"
                type="date"
                variant="outlined"
                rounded="lg"
                density="comfortable"
                hide-details
                class="premium-input"
                :disabled="dateRange !== 'custom'"
                @update:model-value="updateReports"
              />
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- OVERVIEW STATS (PREMIUM CARDS) -->
      <v-row class="mb-8">
        <!-- Total Listings -->
        <v-col cols="12" sm="6" md="3">
          <v-card class="luxury-stat-card">
            <div class="d-flex justify-space-between align-start mb-4">
              <div class="stat-icon-wrapper bg-blue-50">
                <v-icon color="blue" size="24">mdi-home-analytics</v-icon>
              </div>
              <div class="growth-pill" :class="stats.listingGrowth >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'">
                <v-icon size="14" class="mr-1">{{ stats.listingGrowth >= 0 ? 'mdi-arrow-up' : 'mdi-arrow-down' }}</v-icon>
                {{ Math.abs(stats.listingGrowth) }}%
              </div>
            </div>
            <div class="stat-value-large">{{ formatCompact(stats.totalListings) }}</div>
            <div class="text-caption font-weight-bold text-slate-400 uppercase tracking-widest">Active Listings</div>
          </v-card>
        </v-col>

        <!-- Total Users -->
        <v-col cols="12" sm="6" md="3">
          <v-card class="luxury-stat-card">
            <div class="d-flex justify-space-between align-start mb-4">
              <div class="stat-icon-wrapper bg-purple-50">
                <v-icon color="purple" size="24">mdi-account-group</v-icon>
              </div>
              <div class="growth-pill" :class="stats.userGrowth >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'">
                <v-icon size="14" class="mr-1">{{ stats.userGrowth >= 0 ? 'mdi-arrow-up' : 'mdi-arrow-down' }}</v-icon>
                {{ Math.abs(stats.userGrowth) }}%
              </div>
            </div>
            <div class="stat-value-large">{{ formatCompact(stats.totalUsers) }}</div>
            <div class="text-caption font-weight-bold text-slate-400 uppercase tracking-widest">Network Growth</div>
          </v-card>
        </v-col>

        <!-- Total Views -->
        <v-col cols="12" sm="6" md="3">
          <v-card class="luxury-stat-card">
            <div class="d-flex justify-space-between align-start mb-4">
              <div class="stat-icon-wrapper bg-orange-50">
                <v-icon color="orange" size="24">mdi-eye</v-icon>
              </div>
              <div class="growth-pill" :class="stats.viewGrowth >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'">
                <v-icon size="14" class="mr-1">{{ stats.viewGrowth >= 0 ? 'mdi-arrow-up' : 'mdi-arrow-down' }}</v-icon>
                {{ Math.abs(stats.viewGrowth) }}%
              </div>
            </div>
            <div class="stat-value-large">{{ formatCompact(stats.totalViews) }}</div>
            <div class="text-caption font-weight-bold text-slate-400 uppercase tracking-widest">Total Impressions</div>
          </v-card>
        </v-col>

        <!-- Revenue -->
        <v-col cols="12" sm="6" md="3">
          <v-card class="luxury-stat-card">
            <div class="d-flex justify-space-between align-start mb-4">
              <div class="stat-icon-wrapper bg-green-50">
                <v-icon color="green" size="24">mdi-currency-usd</v-icon>
              </div>
              <div class="growth-pill" :class="stats.revenueGrowth >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'">
                <v-icon size="14" class="mr-1">{{ stats.revenueGrowth >= 0 ? 'mdi-arrow-up' : 'mdi-arrow-down' }}</v-icon>
                {{ Math.abs(stats.revenueGrowth) }}%
              </div>
            </div>
            <div class="stat-value-large">${{ formatCompact(stats.totalRevenue) }}</div>
            <div class="text-caption font-weight-bold text-slate-400 uppercase tracking-widest">Sold Volume</div>
          </v-card>
        </v-col>
      </v-row>

      <!-- AI PREDICTIONS SECTION -->
      <v-row class="mb-8">
        <v-col cols="12">
          <v-card class="premium-card ai-section">
            <div class="p-6 border-b border-slate-100 d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <div class="ai-icon-wrapper mr-4">
                  <v-icon color="white" size="24">mdi-brain</v-icon>
                </div>
                <div>
                  <h3 class="text-subtitle-1 font-weight-bold text-slate-800 uppercase tracking-wide">AI Market Forecast</h3>
                  <p class="text-caption text-slate-500 mb-0">TensorFlow.js powered predictions</p>
                </div>
              </div>
              <div class="d-flex gap-2">
                <v-btn
                  size="small"
                  variant="tonal"
                  color="primary"
                  :loading="loadingPrediction"
                  @click="loadPrediction"
                >
                  <v-icon start size="16">mdi-refresh</v-icon>
                  Refresh
                </v-btn>
                <v-btn
                  size="small"
                  variant="flat"
                  color="primary"
                  :loading="training"
                  @click="trainModel"
                >
                  <v-icon start size="16">mdi-cog</v-icon>
                  Train Model
                </v-btn>
              </div>
            </div>
            <v-card-text class="p-6">
              <v-row v-if="prediction.hasPrediction">
                <!-- Predicted Sales -->
                <v-col cols="12" md="4">
                  <div class="prediction-card">
                    <div class="d-flex justify-space-between align-center mb-3">
                      <span class="text-caption font-weight-bold text-slate-400 uppercase">Predicted Sales</span>
                      <v-chip 
                        size="x-small" 
                        :color="prediction.changes.soldChange >= 0 ? 'success' : 'error'"
                        variant="flat"
                      >
                        {{ prediction.changes.soldChange >= 0 ? '+' : '' }}{{ prediction.changes.soldChange }}%
                      </v-chip>
                    </div>
                    <div class="text-h4 font-weight-black text-slate-800">{{ prediction.prediction.soldCount }}</div>
                    <div class="text-caption text-slate-500">properties in next 3 months</div>
                  </div>
                </v-col>
                
                <!-- Predicted Avg Price -->
                <v-col cols="12" md="4">
                  <div class="prediction-card">
                    <div class="d-flex justify-space-between align-center mb-3">
                      <span class="text-caption font-weight-bold text-slate-400 uppercase">Predicted Avg Price</span>
                      <v-chip 
                        size="x-small" 
                        :color="prediction.changes.priceChange >= 0 ? 'success' : 'error'"
                        variant="flat"
                      >
                        {{ prediction.changes.priceChange >= 0 ? '+' : '' }}{{ prediction.changes.priceChange }}%
                      </v-chip>
                    </div>
                    <div class="text-h4 font-weight-black text-slate-800">${{ formatCompact(prediction.prediction.avgPrice) }}</div>
                    <div class="text-caption text-slate-500">average sold price forecast</div>
                  </div>
                </v-col>
                
                <!-- Predicted Inventory -->
                <v-col cols="12" md="4">
                  <div class="prediction-card">
                    <div class="d-flex justify-space-between align-center mb-3">
                      <span class="text-caption font-weight-bold text-slate-400 uppercase">Predicted Inventory</span>
                      <v-chip 
                        size="x-small" 
                        :color="prediction.changes.inventoryChange >= 0 ? 'warning' : 'success'"
                        variant="flat"
                      >
                        {{ prediction.changes.inventoryChange >= 0 ? '+' : '' }}{{ prediction.changes.inventoryChange }}%
                      </v-chip>
                    </div>
                    <div class="text-h4 font-weight-black text-slate-800">{{ formatCompact(prediction.prediction.inventory) }}</div>
                    <div class="text-caption text-slate-500">active listings expected</div>
                  </div>
                </v-col>
              </v-row>
              
              <div v-else class="text-center py-8">
                <v-icon size="48" color="slate-300" class="mb-4">mdi-robot-confused</v-icon>
                <div class="text-body-1 text-slate-600 mb-2">{{ prediction.error || 'No predictions available' }}</div>
                <v-btn color="primary" variant="tonal" size="small" @click="trainModel" :loading="training">
                  Train Model to Generate Predictions
                </v-btn>
              </div>
              
              <!-- Model Info -->
              <div v-if="prediction.hasPrediction" class="mt-4 pt-4 border-t border-slate-100">
                <div class="d-flex justify-space-between text-caption text-slate-400">
                  <span>Model trained: {{ prediction.modelInfo?.trainedAt ? formatDate(new Date(prediction.modelInfo.trainedAt)) : 'Unknown' }}</span>
                  <span>Confidence: {{ prediction.prediction.confidence }}%</span>
                  <span>Data range: {{ prediction.modelInfo?.dataRange }}</span>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- MARKET INSIGHTS -->
      <v-row v-if="marketInsights.length > 0" class="mb-8">
        <v-col cols="12">
          <v-card class="premium-card">
            <div class="p-6 border-b border-slate-100 d-flex align-center">
              <v-icon color="amber" class="mr-3">mdi-lightbulb</v-icon>
              <h3 class="text-subtitle-1 font-weight-bold text-slate-800 uppercase tracking-wide">Market Insights</h3>
            </div>
            <v-card-text class="p-6">
              <div class="d-flex flex-wrap gap-3">
                <v-chip
                  v-for="(insight, idx) in marketInsights"
                  :key="idx"
                  size="small"
                  variant="tonal"
                  color="primary"
                  class="font-weight-medium"
                >
                  <v-icon start size="14">mdi-arrow-right</v-icon>
                  {{ insight }}
                </v-chip>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- CHARTS SECTION -->
      <v-row class="mb-8">
        <v-col cols="12" lg="8">
          <v-card class="premium-card h-full">
            <div class="p-6 border-b border-slate-100 d-flex align-center">
              <v-icon color="primary" class="mr-3">mdi-chart-line</v-icon>
              <h3 class="text-subtitle-1 font-weight-bold text-slate-800 uppercase tracking-wide">Market Engagement Trends</h3>
            </div>
            <v-card-text class="p-8">
              <EChart :option="listingsViewsOption" height="400px" />
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" lg="4">
          <v-card class="premium-card h-full">
            <div class="p-6 border-b border-slate-100 d-flex align-center">
              <v-icon color="primary" class="mr-3">mdi-chart-pie</v-icon>
              <h3 class="text-subtitle-1 font-weight-bold text-slate-800 uppercase tracking-wide">Inventory Mix</h3>
            </div>
            <v-card-text class="p-8">
              <EChart :option="typesPieOption" height="400px" />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- DATA TABLES (PREMIUM) -->
      <v-card class="premium-card overflow-hidden">
        <v-tabs v-model="activeTab" class="premium-tabs px-4 pt-4" color="primary">
          <v-tab value="listings" class="font-weight-bold text-caption">Property Inventory</v-tab>
          <v-tab value="users" class="font-weight-bold text-caption">User Dynamics</v-tab>
          <v-tab value="crm" class="font-weight-bold text-caption">CRM Users</v-tab>
          <v-tab value="inquiries" class="font-weight-bold text-caption">Lead Pipeline</v-tab>
          <v-tab value="viewings" class="font-weight-bold text-caption">On-Site Logistics</v-tab>
        </v-tabs>

        <v-divider />

        <v-card-text class="p-0">
          <v-window v-model="activeTab">
            <!-- Listings -->
            <v-window-item value="listings">
              <v-table class="premium-table">
                <thead>
                  <tr>
                    <th class="px-8 text-slate-400 uppercase tracking-widest text-caption font-weight-bold">Property Profile</th>
                    <th class="text-slate-400 uppercase tracking-widest text-caption font-weight-bold">Engagement</th>
                    <th class="text-slate-400 uppercase tracking-widest text-caption font-weight-bold">Status</th>
                    <th class="px-8 text-slate-400 uppercase tracking-widest text-caption font-weight-bold">Listing Age</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="listing in listingsReport" :key="listing.id" class="table-row-premium">
                    <td class="px-8 py-4">
                      <div class="d-flex align-center">
                        <v-img :src="listing.image" width="64" height="44" cover class="rounded-lg mr-4 border border-slate-200 property-thumb" />
                        <div>
                          <div class="font-weight-black text-slate-800">{{ listing.title }}</div>
                          <div class="text-caption font-mono text-primary font-weight-bold">${{ formatNumber(listing.price) }}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div class="d-flex gap-4">
                        <div class="text-center">
                          <div class="text-caption font-weight-black text-slate-800">{{ listing.views }}</div>
                          <div class="text-[9px] uppercase tracking-tighter text-slate-400">Views</div>
                        </div>
                        <div class="text-center">
                          <div class="text-caption font-weight-black text-slate-800">{{ listing.inquiries }}</div>
                          <div class="text-[9px] uppercase tracking-tighter text-slate-400">Leads</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <v-chip :color="getStatusColor(listing.status)" size="x-small" variant="flat" class="font-weight-black uppercase">
                        {{ listing.status }}
                      </v-chip>
                    </td>
                    <td class="px-8 text-caption text-slate-500 font-weight-medium">{{ formatDate(listing.listedDate) }}</td>
                  </tr>
                </tbody>
              </v-table>
            </v-window-item>

            <!-- User Activity -->
            <v-window-item value="users">
              <v-table class="premium-table">
                <thead>
                  <tr>
                    <th class="px-8 text-slate-400 uppercase tracking-widest text-caption font-weight-bold">User Identity</th>
                    <th class="text-slate-400 uppercase tracking-widest text-caption font-weight-bold">Last Activity</th>
                    <th class="text-slate-400 uppercase tracking-widest text-caption font-weight-bold">Engagement</th>
                    <th class="px-8 text-slate-400 uppercase tracking-widest text-caption font-weight-bold">Member Since</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="user in userReport" :key="user.id" class="table-row-premium">
                    <td class="px-8 py-4">
                      <div class="d-flex align-center">
                        <v-avatar :color="user.status === 'active' ? 'primary' : 'slate-300'" size="36" class="mr-4 text-caption font-weight-black">
                          {{ getInitials(user.name) }}
                        </v-avatar>
                        <div>
                          <div class="font-weight-black text-slate-800">{{ user.name }}</div>
                          <div class="text-caption text-slate-400">{{ user.email }}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <v-chip size="x-small" variant="tonal" class="font-weight-bold">
                        {{ formatTimeAgo(user.lastActive) }}
                      </v-chip>
                    </td>
                    <td>
                      <div class="d-flex gap-4 text-caption">
                        <span class="font-weight-bold text-slate-600">Saved: {{ user.savedProperties }}</span>
                        <span class="font-weight-bold text-slate-600">Inq: {{ user.inquiries }}</span>
                      </div>
                    </td>
                    <td class="px-8 text-caption text-slate-500">{{ formatDate(user.registrationDate) }}</td>
                  </tr>
                </tbody>
              </v-table>
            </v-window-item>

            <!-- CRM Users -->
            <v-window-item value="crm">
              <v-table class="premium-table">
                <thead>
                  <tr>
                    <th class="px-8 text-slate-400 uppercase tracking-widest text-caption font-weight-bold">User Identity</th>
                    <th class="text-slate-400 uppercase tracking-widest text-caption font-weight-bold">Last Activity</th>
                    <th class="text-slate-400 uppercase tracking-widest text-caption font-weight-bold">Engagement</th>
                    <th class="px-8 text-slate-400 uppercase tracking-widest text-caption font-weight-bold">Member Since</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="user in crmUserReport" :key="user.id" class="table-row-premium">
                    <td class="px-8 py-4">
                      <div class="d-flex align-center">
                        <v-avatar :color="user.status === 'active' ? 'primary' : 'slate-300'" size="36" class="mr-4 text-caption font-weight-black">
                          {{ getInitials(user.name) }}
                        </v-avatar>
                        <div>
                          <div class="font-weight-black text-slate-800">{{ user.name }}</div>
                          <div class="text-caption text-slate-400">{{ user.email }}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <v-chip size="x-small" variant="tonal" class="font-weight-bold">
                        {{ formatTimeAgo(user.lastActive) }}
                      </v-chip>
                    </td>
                    <td>
                      <div class="d-flex gap-4 text-caption">
                        <span class="font-weight-bold text-slate-600">Saved: {{ user.savedProperties }}</span>
                        <span class="font-weight-bold text-slate-600">Inq: {{ user.inquiries }}</span>
                      </div>
                    </td>
                    <td class="px-8 text-caption text-slate-500">{{ formatDate(user.registrationDate) }}</td>
                  </tr>
                </tbody>
              </v-table>
            </v-window-item>

            <!-- Inquiries (Pipeline) -->
            <v-window-item value="inquiries">
              <v-table class="premium-table">
                <thead>
                  <tr>
                    <th class="px-8 text-slate-400 uppercase tracking-widest text-caption font-weight-bold">Target Asset</th>
                    <th class="text-slate-400 uppercase tracking-widest text-caption font-weight-bold">Requester</th>
                    <th class="text-slate-400 uppercase tracking-widest text-caption font-weight-bold">Status</th>
                    <th class="px-8 text-slate-400 uppercase tracking-widest text-caption font-weight-bold">Response Speed</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="inquiry in inquiryReport" :key="inquiry.id" class="table-row-premium">
                    <td class="px-8 py-4">
                      <div class="d-flex align-center">
                        <v-img :src="inquiry.property.image" width="64" height="44" cover class="rounded-lg mr-4 border border-slate-200 property-thumb" />
                        <span class="text-caption font-weight-bold">{{ inquiry.property.title }}</span>
                      </div>
                    </td>
                    <td class="text-caption font-weight-bold text-slate-600">{{ inquiry.user.name }}</td>
                    <td>
                      <v-chip :color="getInquiryStatusColor(inquiry.status)" size="x-small" variant="flat" class="font-weight-black uppercase">
                        {{ inquiry.status }}
                      </v-chip>
                    </td>
                    <td class="px-8 text-caption text-slate-500 italic">{{ inquiry.responseTime }}</td>
                  </tr>
                </tbody>
              </v-table>
            </v-window-item>

            <!-- Viewings -->
            <v-window-item value="viewings">
              <v-table class="premium-table">
                <thead>
                  <tr>
                    <th class="px-8 text-slate-400 uppercase tracking-widest text-caption font-weight-bold">Scheduled Asset</th>
                    <th class="text-slate-400 uppercase tracking-widest text-caption font-weight-bold">Client / Agent</th>
                    <th class="text-slate-400 uppercase tracking-widest text-caption font-weight-bold">Timestamp</th>
                    <th class="px-8 text-slate-400 uppercase tracking-widest text-caption font-weight-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="viewing in viewingReport" :key="viewing.id" class="table-row-premium">
                    <td class="px-8 py-4">
                      <div class="d-flex align-center">
                        <v-img :src="viewing.property.image" width="64" height="44" cover class="rounded-lg mr-4 border border-slate-200 property-thumb" />
                        <span class="text-caption font-weight-bold">{{ viewing.property.title }}</span>
                      </div>
                    </td>
                    <td>
                      <div class="text-caption font-weight-bold text-slate-700">C: {{ viewing.user.name }}</div>
                      <div class="text-[10px] text-primary font-weight-black uppercase tracking-tighter">A: {{ viewing.agent.name }}</div>
                    </td>
                    <td class="text-caption text-slate-600 font-weight-bold">{{ formatDateTime(viewing.dateTime) }}</td>
                    <td class="px-8">
                      <v-chip :color="getViewingStatusColor(viewing.status)" size="x-small" variant="flat" class="font-weight-black uppercase">
                        {{ viewing.status }}
                      </v-chip>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </v-window-item>
          </v-window>
        </v-card-text>
      </v-card>
    </v-container>

    <!-- Global Snackbar Notifications -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="snackbar.timeout"
      location="top right"
      rounded="lg"
      class="mt-4"
    >
      <div class="d-flex align-center">
        <v-icon 
          v-if="snackbar.color === 'success'" 
          class="mr-2"
        >mdi-check-circle</v-icon>
        <v-icon 
          v-else-if="snackbar.color === 'error'" 
          class="mr-2"
        >mdi-alert-circle</v-icon>
        <v-icon 
          v-else-if="snackbar.color === 'warning'" 
          class="mr-2"
        >mdi-alert</v-icon>
        <v-icon 
          v-else 
          class="mr-2"
        >mdi-information</v-icon>
        <span>{{ snackbar.message }}</span>
      </div>
      <template #actions>
        <v-btn
          variant="text"
          size="small"
          @click="snackbar.show = false"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </div>
  </FeatureGate>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, reactive } from 'vue'
import EChart from '~/components/charts/EChart.vue'
import FeatureGate from '~/components/FeatureGate.vue'
import { FEATURES } from '~/composables/useLicense'

// Helper function to safely get auth headers
const getAuthHeaders = (): Record<string, string> => {
  if (process.client) {
    const token = localStorage.getItem('token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }
  return {}
}

// --- START OF ORIGINAL LOGIC PRESERVATION ---

const dateRange = ref('last_30_days')
const customRange = ref({
  start: '',
  end: ''
})
const activeTab = ref('listings')
const exporting = ref('')

// ML State
const loadingPrediction = ref(false)
const training = ref(false)
const prediction = ref<any>({
  hasPrediction: false,
  error: null,
  prediction: { soldCount: 0, avgPrice: 0, inventory: 0, confidence: 0 },
  changes: { soldChange: 0, priceChange: 0, inventoryChange: 0 },
  modelInfo: null
})
const marketInsights = ref<string[]>([])

// Snackbar state for notifications
const snackbar = ref({
  show: false,
  message: '',
  color: 'success',
  timeout: 5000
})

const showNotification = (message: string, color: 'success' | 'error' | 'info' | 'warning' = 'success', timeout = 5000) => {
  snackbar.value = {
    show: true,
    message,
    color,
    timeout
  }
}

const dateRanges = [
  { title: 'Last 7 Days', value: 'last_7_days' },
  { title: 'Last 30 Days', value: 'last_30_days' },
  { title: 'Last 90 Days', value: 'last_90_days' },
  { title: 'This Year', value: 'this_year' },
  { title: 'Custom Range', value: 'custom' }
]

const stats = ref({
  totalListings: 0,
  listingGrowth: 0,
  totalUsers: 0,
  userGrowth: 0,
  totalViews: 0,
  viewGrowth: 0,
  totalRevenue: 0,
  revenueGrowth: 0
})

const listingsReport = ref<any[]>([])
const userReport = ref<any[]>([])
const inquiryReport = ref<any[]>([])
const viewingReport = ref<any[]>([])
const crmUserReport = computed(() => {
  return userReport.value.filter((u: any) => !['admin', 'agent'].includes(u.role || ''))
})

const formatNumber = (num: number) => {
  if (!num) return '0'
  return Math.round(num).toLocaleString()
}

// Format large numbers compactly (e.g., 4.9B, 530M, 50K)
const formatCompact = (num: number) => {
  if (!num) return '0'
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B'
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(0) + 'K'
  }
  return Math.round(num).toLocaleString()
}

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString()
}

const formatDateTime = (date: Date) => {
  return new Date(date).toLocaleString()
}

const formatTimeAgo = (date: Date) => {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000)
  let interval = seconds / 31536000
  if (interval > 1) return Math.floor(interval) + ' years ago'
  interval = seconds / 2592000
  if (interval > 1) return Math.floor(interval) + ' months ago'
  interval = seconds / 86400
  if (interval > 1) return Math.floor(interval) + ' days ago'
  interval = seconds / 3600
  if (interval > 1) return Math.floor(interval) + ' hours ago'
  interval = seconds / 60
  if (interval > 1) return Math.floor(interval) + ' minutes ago'
  return Math.floor(seconds) + ' seconds ago'
}

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase()
}

const getStatusColor = (status: string) => {
  const colors = { active: 'success', pending: 'warning', sold: 'error', inactive: 'grey' }
  return colors[status as keyof typeof colors] || 'grey'
}

const getInquiryStatusColor = (status: string) => {
  const colors = { new: 'warning', responded: 'success', closed: 'grey' }
  return colors[status as keyof typeof colors] || 'grey'
}

const getViewingStatusColor = (status: string) => {
  const colors = { scheduled: 'primary', completed: 'success', cancelled: 'error', pending: 'warning' }
  return colors[status as keyof typeof colors] || 'grey'
}

const updateReports = async () => {
  try {
    const headers = (() => { try { const t = localStorage.getItem('token'); return t ? { Authorization: `Bearer ${t}` } : {} } catch { return {} } })()
    const params = new URLSearchParams()
    params.append('range', dateRange.value)
    if (dateRange.value === 'custom' && customRange.value.start && customRange.value.end) {
      params.append('start', customRange.value.start)
      params.append('end', customRange.value.end)
    }
    const [s, listings, users, inquiries, viewings] = await Promise.all([
      //@ts-ignore
      $fetch(`/api/admin/reports/stats?${params.toString()}`, { headers }),
      //@ts-ignore
      $fetch('/api/admin/reports/listings', { headers }),
      //@ts-ignore
      $fetch('/api/admin/reports/users', { headers }),
      //@ts-ignore
      $fetch('/api/admin/reports/inquiries', { headers }),
      //@ts-ignore
      $fetch('/api/admin/reports/viewings', { headers })
    ])
    stats.value = s as any
    listingsReport.value = listings as any[]
    userReport.value = users as any[]
    inquiryReport.value = inquiries as any[]
    viewingReport.value = viewings as any[]
  } catch (error) {
    console.error('Error updating reports:', error)
  }
}

const listingsViewsOption = computed(() => {
  const x = listingsReport.value.map((i: any) => i.title)
  const views = listingsReport.value.map((i: any) => i.views)
  return {
    color: ['#1976D2'],
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: x, axisLabel: { show: false } },
    yAxis: { type: 'value' },
    series: [{ 
      name: 'Views', 
      type: 'bar', 
      data: views, 
      itemStyle: { borderRadius: [5, 5, 0, 0] },
      barWidth: '40%'
    }]
  }
})

const typesPieOption = computed(() => {
  const groups: Record<string, number> = {}
  listingsReport.value.forEach((i: any) => { const key = (i.type || 'unknown'); groups[key] = (groups[key] || 0) + 1 })
  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: '0%', left: 'center' },
    series: [{ 
      type: 'pie', 
      radius: ['40%', '70%'], 
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      data: Object.entries(groups).map(([name, value]) => ({ name, value })) 
    }]
  }
})

const exportReport = async (format: string) => {
  exporting.value = format
  try {
    const response = await fetch('/api/admin/reports/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({
        format,
        dateRange: dateRange.value,
        customRange: dateRange.value === 'custom' ? customRange.value : undefined,
        type: activeTab.value
      })
    })
    if (!response.ok) throw new Error(`Export failed: ${response.statusText}`)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const extension = format === 'excel' ? 'csv' : 'html'
    const fileName = `property-report-${dateRange.value}-${new Date().toISOString().split('T')[0]}.${extension}`
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error exporting report:', error)
  } finally {
    exporting.value = ''
  }
}

// --- END OF ORIGINAL LOGIC PRESERVATION ---

// --- ML FUNCTIONS ---

const loadPrediction = async () => {
  loadingPrediction.value = true
  try {
    const response: any = await $fetch('/api/ml/predict', {
      headers: getAuthHeaders()
    })
    prediction.value = response
  } catch (error) {
    console.error('Error loading prediction:', error)
    prediction.value = { hasPrediction: false, error: 'Failed to load prediction' }
  } finally {
    loadingPrediction.value = false
  }
}

const loadAnalytics = async () => {
  try {
    const response: any = await $fetch('/api/ml/analytics', {
      headers: getAuthHeaders()
    })
    if (response.success && response.insights) {
      marketInsights.value = response.insights
    }
  } catch (error) {
    console.error('Error loading analytics:', error)
  }
}

const trainModel = async () => {
  training.value = true
  try {
    const response: any = await $fetch('/api/ml/train', {
      method: 'POST',
      headers: getAuthHeaders()
    })
    
    if (response.success) {
      showNotification(
        `Model trained! ${response.stats.samplesUsed} samples, ${response.stats.epochs} epochs, Loss: ${response.stats.finalLoss?.toFixed(4)}, Time: ${response.stats.trainingTime}`,
        'success',
        8000
      )
      
      // Reload prediction with new model
      await loadPrediction()
    }
  } catch (error: any) {
    console.error('Error training model:', error)
    showNotification(
      `Training failed: ${error.data?.statusMessage || error.message || 'Unknown error'}`,
      'error',
      8000
    )
  } finally {
    training.value = false
  }
}

// --- END ML FUNCTIONS ---

onMounted(() => {
  updateReports()
  // Load ML data
  loadPrediction()
  loadAnalytics()
})

watch([dateRange, customRange], () => {
  if (dateRange.value !== 'custom' || (customRange.value.start && customRange.value.end)) {
    updateReports()
  }
})

definePageMeta({
  layout: 'admin',
  middleware: ['admin']
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700;800&display=swap');

.premium-reports-wrapper {
  font-family: 'Inter', sans-serif;
  letter-spacing: -0.01em;
}

.font-serif {
  font-family: 'Playfair Display', serif;
}

/* Card Styling */
.premium-card {
  background: white !important;
  border: 1px solid #E2E8F0 !important;
  border-radius: 20px !important;
  box-shadow: 0 4px 25px rgba(0, 0, 0, 0.03) !important;
}

/* AI Section */
.ai-section {
  background: linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%) !important;
  border: 1px solid #bae6fd !important;
}

.ai-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.prediction-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 20px;
  height: 100%;
  transition: all 0.2s ease;
}

.prediction-card:hover {
  border-color: #6366f1;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
}

/* Luxury Stats Cards */
.luxury-stat-card {
  background: white !important;
  border: 1px solid #E2E8F0 !important;
  border-radius: 24px !important;
  padding: 28px !important;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 180px;
  display: flex;
  flex-direction: column;
}

.luxury-stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.06) !important;
  border-color: #1976D2 !important;
}

.stat-icon-wrapper {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-value-large {
  font-size: 2.5rem;
  font-weight: 900;
  color: #1e293b;
  letter-spacing: -0.02em;
  line-height: 1.1;
  margin-bottom: 4px;
  white-space: nowrap;
}

.growth-pill {
  padding: 4px 10px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 800;
  display: flex;
  align-items: center;
}

/* Buttons */
.premium-action-btn {
  border-radius: 12px !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
  height: 48px !important;
  padding: 0 24px !important;
}

/* Table styling */
.premium-table :deep(th) {
  background: #F8FAFC !important;
  height: 64px !important;
  border-bottom: 1px solid #F1F5F9 !important;
}

.table-row-premium {
  transition: background 0.2s ease;
}

.table-row-premium:hover {
  background: #F8FAFC !important;
}

/* Input Fields */
.premium-input :deep(.v-field__outline) {
  --v-field-border-opacity: 0.1;
}

.premium-input :deep(.v-field--focused .v-field__outline) {
  --v-field-border-opacity: 1;
}

/* Tab styling */
.premium-tabs :deep(.v-tab) {
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding-bottom: 16px !important;
}

/* Uniform property thumbnails */
.property-thumb {
  min-width: 64px;
  max-width: 64px;
  min-height: 44px;
  max-height: 44px;
  flex-shrink: 0;
  object-fit: cover;
  background: #f1f5f9;
}
</style>