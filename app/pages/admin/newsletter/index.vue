<template>
  <div class="admin-newsletter-dashboard-premium px-md-8 py-md-6">
    <v-container fluid>
      <!-- Page Header -->
      <v-row class="mb-10 align-center">
        <v-col cols="12" md="8">
          <div class="d-flex align-center mb-2">
            <div class="premium-accent-bar mr-4"></div>
            <span class="text-overline letter-spacing-2 text-gold">Newsletter Management</span>
          </div>
          <h1 class="display-serif text-h3 mb-1">Email Marketing Hub</h1>
          <p class="text-subtitle-1 text-medium-emphasis font-weight-light">
            Manage subscribers, campaigns, and automation
          </p>
        </v-col>
        <v-col cols="12" md="4" class="text-md-right">
          <v-btn 
            color="primary" 
            size="large" 
            prepend-icon="mdi-email-plus"
            class="premium-action-btn"
            to="/admin/newsletter/campaigns/new"
          >
            Create Campaign
          </v-btn>
        </v-col>
      </v-row>

      <!-- Stats Cards -->
      <v-row class="mb-10">
        <v-col v-for="(card, index) in statsCards" :key="index" cols="12" sm="6" md="3">
          <v-card class="stat-card-premium" elevation="0">
            <v-card-text>
              <div class="d-flex justify-space-between align-start mb-4">
                <div :class="['icon-orb', card.orb]">
                  <v-icon :icon="card.icon" />
                </div>
                <div v-if="card.badge" class="text-caption text-success font-weight-bold growth-chip">
                  <v-icon size="x-small">{{ card.badge.icon }}</v-icon> {{ card.badge.text }}
                </div>
              </div>
              <div class="text-h3 font-weight-bold mb-1 letter-spacing-tight">{{ card.value }}</div>
              <div class="text-overline text-medium-emphasis lh-1 mb-1">{{ card.label }}</div>
              <div class="text-caption opacity-60">{{ card.subtitle }}</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Quick Actions -->
      <v-row class="mb-10">
        <v-col cols="12">
          <v-card class="action-card-premium" elevation="0">
            <v-card-title class="text-overline letter-spacing-1 pt-6 px-8">Quick Actions</v-card-title>
            <v-card-text class="pa-8 pt-2">
              <v-row>
                <v-col v-for="action in quickActions" :key="action.title" cols="12" sm="6" md="3">
                  <v-btn
                    :prepend-icon="action.icon"
                    :color="action.color"
                    :to="action.to"
                    block
                    height="54"
                    variant="flat"
                    class="premium-action-btn"
                  >
                    {{ action.title }}
                  </v-btn>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Engagement Metrics -->
      <v-row class="mb-10">
        <v-col cols="12" md="6">
          <v-card class="metrics-card" elevation="0">
            <v-card-title class="pa-6">
              <span class="display-serif text-h5">Engagement Rates</span>
            </v-card-title>
            <v-divider class="opacity-10" />
            <v-card-text class="pa-6">
              <div class="metric-item">
                <div class="d-flex justify-space-between align-center mb-2">
                  <span class="text-body-1">Open Rate</span>
                  <span class="text-h6 font-weight-bold text-success">{{ stats.engagement.openRate }}%</span>
                </div>
                <v-progress-linear 
                  :model-value="stats.engagement.openRate" 
                  color="success" 
                  height="8" 
                  rounded
                />
              </div>
              <div class="metric-item mt-6">
                <div class="d-flex justify-space-between align-center mb-2">
                  <span class="text-body-1">Click Rate</span>
                  <span class="text-h6 font-weight-bold text-primary">{{ stats.engagement.clickRate }}%</span>
                </div>
                <v-progress-linear 
                  :model-value="stats.engagement.clickRate" 
                  color="primary" 
                  height="8" 
                  rounded
                />
              </div>
              <div class="metric-item mt-6">
                <div class="d-flex justify-space-between align-center mb-2">
                  <span class="text-body-1">Total Emails Sent</span>
                  <span class="text-h6 font-weight-bold">{{ stats.engagement.totalSent.toLocaleString() }}</span>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-card class="metrics-card" elevation="0">
            <v-card-title class="pa-6">
              <span class="display-serif text-h5">Recent Campaigns</span>
            </v-card-title>
            <v-divider class="opacity-10" />
            <v-card-text class="pa-0" style="max-height: 300px; overflow-y: auto;">
              <v-list bg-color="transparent" class="py-2">
                <v-list-item
                  v-for="campaign in stats.recentActivity.campaigns"
                  :key="campaign.id"
                  class="px-6 py-3 list-item-hover"
                  :to="`/admin/newsletter/campaigns/${campaign.id}`"
                >
                  <v-list-item-title class="font-weight-bold text-body-1">
                    {{ campaign.name }}
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-caption text-medium-emphasis">
                    {{ campaign.recipientCount }} recipients • {{ formatDate(campaign.sentAt || campaign.createdAt) }}
                  </v-list-item-subtitle>
                  <template v-slot:append>
                    <v-chip
                      :color="getStatusColor(campaign.status)"
                      size="x-small"
                      class="text-uppercase font-weight-black letter-spacing-1"
                      variant="flat"
                    >
                      {{ campaign.status }}
                    </v-chip>
                  </template>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Recent Subscribers -->
      <v-row>
        <v-col cols="12">
          <v-card class="subscribers-card" elevation="0">
            <v-card-title class="d-flex align-center pa-6">
              <span class="display-serif text-h5">Recent Subscribers</span>
              <v-spacer />
              <v-btn variant="tonal" to="/admin/newsletter/subscribers" size="small" class="rounded-lg">
                View All
              </v-btn>
            </v-card-title>
            <v-divider class="opacity-10" />
            <v-card-text class="pa-0" style="max-height: 400px; overflow-y: auto;">
              <v-list bg-color="transparent" class="py-2">
                <v-list-item
                  v-for="subscriber in stats.recentActivity.subscribers"
                  :key="subscriber.id"
                  class="px-6 py-3 list-item-hover"
                >
                  <template v-slot:prepend>
                    <v-avatar color="#f4f1ea" class="text-primary" size="48">
                      <v-icon icon="mdi-email" size="24" />
                    </v-avatar>
                  </template>

                  <v-list-item-title class="font-weight-bold text-body-1">
                    {{ subscriber.email }}
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-caption text-medium-emphasis">
                    {{ subscriber.firstName }} {{ subscriber.lastName }} • {{ subscriber.source }}
                  </v-list-item-subtitle>

                  <template v-slot:append>
                    <div class="text-caption font-weight-medium opacity-60">
                      {{ formatDate(subscriber.subscribedAt) }}
                    </div>
                  </template>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { formatDate } from '/utils/formatters'

// Helper function to safely get auth headers
const getAuthHeaders = () => {
  if (process.client) {
    const token = localStorage.getItem('token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }
  return {}
}

const stats = ref<any>({
  subscribers: { total: 0, active: 0, byStatus: {} },
  campaigns: { total: 0, sent: 0, byStatus: {} },
  templates: { total: 0, active: 0 },
  automations: { total: 0, active: 0 },
  engagement: { totalSent: 0, totalOpens: 0, totalClicks: 0, openRate: 0, clickRate: 0 },
  recentActivity: { subscribers: [], campaigns: [] }
})

const statsCards = computed(() => [
  {
    value: stats.value.subscribers.active || 0,
    label: 'Active Subscribers',
    subtitle: `${stats.value.subscribers.total} total`,
    icon: 'mdi-account-group-outline',
    orb: 'primary-orb'
  },
  {
    value: stats.value.campaigns.sent || 0,
    label: 'Campaigns Sent',
    subtitle: `${stats.value.campaigns.total} total`,
    icon: 'mdi-email-send-outline',
    orb: 'success-orb'
  },
  {
    value: stats.value.templates.active || 0,
    label: 'Active Templates',
    subtitle: `${stats.value.templates.total} total`,
    icon: 'mdi-file-document-outline',
    orb: 'info-orb'
  },
  {
    value: stats.value.automations.active || 0,
    label: 'Active Automations',
    subtitle: `${stats.value.automations.total} total`,
    icon: 'mdi-robot-outline',
    orb: 'gold-orb',
    badge: stats.value.automations.active > 0 ? { icon: 'mdi-check', text: 'Running' } : null
  }
])

const quickActions = [
  { title: 'Subscribers', icon: 'mdi-account-multiple', color: 'primary', to: '/admin/newsletter/subscribers' },
  { title: 'Campaigns', icon: 'mdi-email-multiple', color: 'success', to: '/admin/newsletter/campaigns' },
  { title: 'Templates', icon: 'mdi-file-document-multiple', color: 'info', to: '/admin/newsletter/templates' },
  { title: 'Automation', icon: 'mdi-robot', color: 'warning', to: '/admin/newsletter/automations' }
]

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    sent: 'success',
    scheduled: 'info',
    draft: 'warning',
    sending: 'primary',
    cancelled: 'grey'
  }
  return colors[status] || 'grey'
}

onMounted(async () => {
  try {
    const data = await $fetch('/api/admin/newsletter/stats', {
      headers: getAuthHeaders()
    }) as any
    stats.value = data
  } catch (error) {
    console.error('Error loading newsletter stats:', error)
  }
})

definePageMeta({
  layout: 'admin',
  middleware: ['admin']
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;600;700&display=swap');

.admin-newsletter-dashboard-premium {
  background-color: #fcfcfb;
  font-family: 'Inter', sans-serif;
  min-height: 100vh;
}

.display-serif {
  font-family: 'Playfair Display', serif;
}

.text-gold {
  color: #8c734b;
}

.letter-spacing-2 { letter-spacing: 2px; }
.letter-spacing-1 { letter-spacing: 1px; }
.letter-spacing-tight { letter-spacing: -1px; }
.lh-1 { line-height: 1; }

.premium-accent-bar {
  width: 40px;
  height: 4px;
  background: #8c734b;
  border-radius: 2px;
}

/* Stat Cards */
.stat-card-premium {
  border-radius: 20px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  background: white !important;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.stat-card-premium:hover {
  transform: translateY(-5px);
  border-color: #8c734b !important;
}

.icon-orb {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.primary-orb { background: rgba(var(--v-theme-primary), 0.1); color: rgb(var(--v-theme-primary)); }
.success-orb { background: rgba(var(--v-theme-success), 0.1); color: rgb(var(--v-theme-success)); }
.info-orb { background: rgba(var(--v-theme-info), 0.1); color: rgb(var(--v-theme-info)); }
.gold-orb { background: rgba(140, 115, 75, 0.1); color: #8c734b; }

.growth-chip {
  padding: 2px 8px;
  background: rgba(var(--v-theme-success), 0.1);
  border-radius: 100px;
}

/* Action Card */
.action-card-premium {
  border-radius: 24px !important;
  background: #121212 !important;
  color: white !important;
}

.premium-action-btn {
  border-radius: 12px !important;
  text-transform: none !important;
  font-weight: 700 !important;
  letter-spacing: 0.5px !important;
}

/* Cards */
.metrics-card,
.subscribers-card {
  border-radius: 24px !important;
  background: white !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
}

.list-item-hover:hover {
  background-color: #fcfcfb;
}

.metric-item {
  padding: 12px 0;
}
</style>
