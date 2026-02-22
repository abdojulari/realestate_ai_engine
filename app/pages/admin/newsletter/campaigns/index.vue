<template>
  <div class="admin-campaigns-premium px-md-8 py-md-6">
    <v-container fluid>
      <!-- Page Header -->
      <v-row class="mb-8 align-center">
        <v-col cols="12" md="8">
          <div class="d-flex align-center mb-2">
            <v-btn icon="mdi-arrow-left" variant="text" :to="'/admin/newsletter'" class="mr-3"></v-btn>
            <div class="premium-accent-bar mr-4"></div>
            <span class="text-overline letter-spacing-2 text-gold">Campaign Management</span>
          </div>
          <h1 class="display-serif text-h3 mb-1">Campaigns</h1>
        </v-col>
        <v-col cols="12" md="4" class="text-md-right">
          <v-btn 
            color="primary" 
            prepend-icon="mdi-email-plus"
            to="/admin/newsletter/campaigns/new"
          >
            Create Campaign
          </v-btn>
        </v-col>
      </v-row>

      <!-- Filters -->
      <v-row class="mb-6">
        <v-col cols="12" md="4">
          <v-select
            v-model="statusFilter"
            :items="statusOptions"
            label="Status"
            variant="outlined"
            density="comfortable"
            @update:model-value="loadCampaigns"
          />
        </v-col>
        <v-col cols="12" md="8" class="d-flex justify-end align-center">
          <div class="stats-chips">
            <v-chip class="mr-2" v-for="(count, status) in stats" :key="status">
              {{ status }}: {{ count }}
            </v-chip>
          </div>
        </v-col>
      </v-row>

      <!-- Campaigns Grid -->
      <v-row>
        <v-col v-for="campaign in campaigns" :key="campaign.id" cols="12" md="6" lg="4">
          <v-card class="campaign-card-premium" elevation="0" :to="`/admin/newsletter/campaigns/${campaign.id}`">
            <v-card-text class="pa-6">
              <div class="d-flex justify-space-between align-start mb-4">
                <v-chip
                  :color="getStatusColor(campaign.status)"
                  size="small"
                  class="text-uppercase font-weight-black"
                  variant="flat"
                >
                  {{ campaign.status }}
                </v-chip>
                <v-menu>
                  <template v-slot:activator="{ props }">
                    <v-btn icon="mdi-dots-vertical" variant="text" size="small" v-bind="props" @click.prevent></v-btn>
                  </template>
                  <v-list>
                    <v-list-item @click="editCampaign(campaign.id)">
                      <v-list-item-title>
                        <v-icon icon="mdi-pencil" size="small" class="mr-2" />
                        Edit
                      </v-list-item-title>
                    </v-list-item>
                    <v-list-item v-if="campaign.status === 'draft'" @click="sendCampaign(campaign.id)">
                      <v-list-item-title>
                        <v-icon icon="mdi-send" size="small" class="mr-2" />
                        Send Now
                      </v-list-item-title>
                    </v-list-item>
                    <v-list-item @click="deleteCampaign(campaign.id)">
                      <v-list-item-title class="text-error">
                        <v-icon icon="mdi-delete" size="small" class="mr-2" />
                        Delete
                      </v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </div>

              <h3 class="text-h6 font-weight-bold mb-2">{{ campaign.name }}</h3>
              <p class="text-caption text-medium-emphasis mb-4">{{ campaign.subject }}</p>

              <div class="campaign-stats">
                <div class="stat-item">
                  <v-icon icon="mdi-account-group" size="small" class="mr-1" />
                  <span class="text-caption">{{ campaign.recipientCount }} recipients</span>
                </div>
                <div v-if="campaign.status === 'sent'" class="stat-item">
                  <v-icon icon="mdi-email-open" size="small" class="mr-1" />
                  <span class="text-caption">{{ campaign.openCount }} opens</span>
                </div>
                <div v-if="campaign.status === 'sent'" class="stat-item">
                  <v-icon icon="mdi-cursor-pointer" size="small" class="mr-1" />
                  <span class="text-caption">{{ campaign.clickCount }} clicks</span>
                </div>
              </div>

              <v-divider class="my-4" />

              <div class="d-flex justify-space-between align-center text-caption text-medium-emphasis">
                <span v-if="campaign.sentAt">
                  Sent {{ formatDate(campaign.sentAt) }}
                </span>
                <span v-else-if="campaign.scheduledFor">
                  Scheduled {{ formatDate(campaign.scheduledFor) }}
                </span>
                <span v-else>
                  Created {{ formatDate(campaign.createdAt) }}
                </span>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Pagination -->
      <div v-if="pagination.totalPages > 1" class="d-flex justify-center mt-8">
        <v-pagination
          v-model="pagination.page"
          :length="pagination.totalPages"
          :total-visible="7"
          @update:model-value="loadCampaigns"
        />
      </div>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { formatDate } from '~/utils/formatters'

const getAuthHeaders = (): Record<string, string> => {
  if (process.client) {
    const token = localStorage.getItem('token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }
  return {}
}

const campaigns = ref<any[]>([])
const loading = ref(false)
const statusFilter = ref('')
const pagination = ref({ page: 1, limit: 12, total: 0, totalPages: 0 })
const stats = ref<any>({})

const statusOptions = [
  { title: 'All Status', value: '' },
  { title: 'Draft', value: 'draft' },
  { title: 'Scheduled', value: 'scheduled' },
  { title: 'Sending', value: 'sending' },
  { title: 'Sent', value: 'sent' },
  { title: 'Cancelled', value: 'cancelled' }
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

const loadCampaigns = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.value.page,
      limit: pagination.value.limit
    }
    if (statusFilter.value) params.status = statusFilter.value

    const data = await $fetch('/api/admin/newsletter/campaigns', {
      headers: getAuthHeaders(),
      params
    }) as any

    campaigns.value = data.campaigns
    pagination.value = data.pagination
    stats.value = data.stats
  } catch (error) {
    console.error('Error loading campaigns:', error)
  } finally {
    loading.value = false
  }
}

const editCampaign = (id: number) => {
  navigateTo(`/admin/newsletter/campaigns/${id}`)
}

const sendCampaign = async (id: number) => {
  if (!confirm('Are you sure you want to send this campaign now?')) return

  try {
    await $fetch(`/api/admin/newsletter/campaigns/${id}/send`, {
      method: 'POST',
      headers: getAuthHeaders()
    })
    await loadCampaigns()
  } catch (error) {
    console.error('Error sending campaign:', error)
    alert('Failed to send campaign')
  }
}

const deleteCampaign = async (id: number) => {
  if (!confirm('Are you sure you want to delete this campaign?')) return

  try {
    await $fetch(`/api/admin/newsletter/campaigns/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    await loadCampaigns()
  } catch (error) {
    console.error('Error deleting campaign:', error)
  }
}

onMounted(() => {
  loadCampaigns()
})

definePageMeta({
  layout: 'admin',
  middleware: ['admin']
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;600;700&display=swap');

.admin-campaigns-premium {
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

.premium-accent-bar {
  width: 40px;
  height: 4px;
  background: #8c734b;
  border-radius: 2px;
}

.campaign-card-premium {
  border-radius: 20px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  background: white !important;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  cursor: pointer;
}

.campaign-card-premium:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.08) !important;
}

.campaign-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-item {
  display: flex;
  align-items: center;
  color: #64748b;
}

.stats-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
