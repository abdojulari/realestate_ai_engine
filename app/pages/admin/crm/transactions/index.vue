<template>
  <div class="admin-transactions px-md-8 py-md-6">
    <v-container fluid>
      <!-- Header -->
      <v-row class="mb-8 align-center">
        <v-col cols="12" md="6">
          <div class="d-flex align-center mb-2">
            <v-btn icon="mdi-arrow-left" variant="text" size="small" class="mr-2" to="/admin/crm" />
            <div class="premium-accent-bar mr-4"></div>
            <span class="text-overline letter-spacing-2 text-gold">CRM</span>
          </div>
          <h1 class="display-serif text-h3 mb-1">Transactions</h1>
          <p class="text-subtitle-1 text-medium-emphasis font-weight-light">
            Track all buying and selling transactions
          </p>
        </v-col>
      </v-row>

      <!-- Status Pipeline -->
      <v-row class="mb-8">
        <v-col cols="12">
          <v-card class="pipeline-overview" elevation="0">
            <v-card-text class="pa-6">
              <div class="d-flex justify-space-around text-center flex-wrap ga-4">
                <div v-for="status in statusPipeline" :key="status.value" class="pipeline-stage" @click="filterByStatus(status.value)">
                  <v-avatar :color="status.color" size="48" class="mb-2">
                    <span class="text-h6 font-weight-bold text-white">{{ summary.byStatus?.[status.value] || 0 }}</span>
                  </v-avatar>
                  <div class="text-caption font-weight-bold text-uppercase">{{ status.label }}</div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Filters -->
      <v-row class="mb-6">
        <v-col cols="12">
          <v-card class="filter-card" elevation="0">
            <v-card-text class="pa-4">
              <v-row align="center">
                <v-col cols="4">
                  <v-select v-model="statusFilter" :items="['All', ...statusOptions]" label="Status" variant="outlined" density="compact" @update:model-value="loadTransactions" />
                </v-col>
                <v-col cols="4">
                  <v-select v-model="typeFilter" :items="['All', 'buying', 'selling']" label="Type" variant="outlined" density="compact" @update:model-value="loadTransactions" />
                </v-col>
                <v-col cols="4" class="text-right">
                  <span class="text-body-2 font-weight-bold">{{ pagination.total }} transactions</span>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Transactions List -->
      <v-row>
        <v-col v-for="t in transactions" :key="t.id" cols="12" md="6" lg="4">
          <v-card class="transaction-card" elevation="0" @click="navigateTo(`/admin/crm/transactions/${t.id}`)">
            <v-card-text class="pa-5">
              <div class="d-flex justify-space-between align-center mb-3">
                <div class="d-flex align-center">
                  <v-avatar :color="t.type === 'buying' ? 'blue' : 'green'" size="36" class="mr-3 text-white">
                    {{ t.client?.firstName[0] }}{{ t.client?.lastName[0] }}
                  </v-avatar>
                  <div>
                    <div class="font-weight-bold">{{ t.client?.firstName }} {{ t.client?.lastName }}</div>
                    <div class="text-caption text-medium-emphasis text-capitalize">{{ t.type }}</div>
                  </div>
                </div>
                <v-chip :color="getStatusColor(t.status)" size="small" class="text-uppercase font-weight-bold">
                  {{ t.status }}
                </v-chip>
              </div>

              <div class="text-body-2 text-medium-emphasis mb-3">
                {{ t.propertyAddress || 'No property assigned' }}
              </div>

              <!-- Progress -->
              <div class="d-flex align-center mb-2">
                <v-progress-linear
                  :model-value="t.progress"
                  :color="getProgressColor(t.progress)"
                  height="8"
                  rounded
                  class="flex-grow-1 mr-3"
                />
                <span class="text-body-2 font-weight-bold">{{ t.progress }}%</span>
              </div>

              <!-- Checklist Summary -->
              <div class="d-flex justify-space-between text-caption text-medium-emphasis">
                <span>{{ t.checklist?.filter((c: any) => c.isCompleted).length || 0 }}/{{ t.checklist?.length || 0 }} steps</span>
                <span>{{ formatDate(t.updatedAt) }}</span>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-row v-if="pagination.pages > 1" class="mt-4">
        <v-col class="d-flex justify-center">
          <v-pagination v-model="pagination.page" :length="pagination.pages" rounded @update:model-value="loadTransactions" />
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const getAuthHeaders = (): Record<string, string> => {
  if (process.client) {
    const token = localStorage.getItem('token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }
  return {}
}

const transactions = ref<any[]>([])
const statusFilter = ref('All')
const typeFilter = ref('All')
const pagination = ref({ total: 0, page: 1, limit: 20, pages: 0 })
const summary = ref<any>({ byStatus: {} })

const statusOptions = ['active', 'conditional', 'firm', 'closed', 'cancelled']
const statusPipeline = [
  { value: 'active', label: 'Active', color: 'primary' },
  { value: 'conditional', label: 'Conditional', color: 'warning' },
  { value: 'firm', label: 'Firm', color: 'info' },
  { value: 'closed', label: 'Closed', color: 'success' },
]

const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const getStatusColor = (s: string) => {
  const c: Record<string, string> = { active: 'primary', conditional: 'warning', firm: 'info', closed: 'success', cancelled: 'error' }
  return c[s] || 'grey'
}
const getProgressColor = (p: number) => p >= 80 ? 'success' : p >= 50 ? 'info' : p >= 25 ? 'warning' : 'primary'

function filterByStatus(status: string) {
  statusFilter.value = status
  loadTransactions()
}

async function loadTransactions() {
  try {
    const params = new URLSearchParams()
    if (statusFilter.value !== 'All') params.set('status', statusFilter.value)
    if (typeFilter.value !== 'All') params.set('type', typeFilter.value)
    params.set('page', pagination.value.page.toString())

    const res = await $fetch(`/api/admin/crm/transactions?${params}`, { headers: getAuthHeaders() }) as any
    transactions.value = res.transactions || []
    pagination.value = res.pagination || pagination.value
    summary.value = res.summary || { byStatus: {} }
  } catch (e) {
    console.error('Error loading transactions:', e)
  }
}

onMounted(loadTransactions)

definePageMeta({ layout: 'admin', middleware: ['admin'] })
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;600;700&display=swap');

.admin-transactions { background-color: #fcfcfb; font-family: 'Inter', sans-serif; min-height: 100vh; }
.display-serif { font-family: 'Playfair Display', serif; }
.text-gold { color: #8c734b; }
.letter-spacing-2 { letter-spacing: 2px; }
.premium-accent-bar { width: 40px; height: 4px; background: #8c734b; border-radius: 2px; }

.pipeline-overview, .filter-card {
  border-radius: 20px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  background: white !important;
}

.pipeline-stage { cursor: pointer; transition: transform 0.2s; }
.pipeline-stage:hover { transform: translateY(-3px); }

.transaction-card {
  border-radius: 20px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  cursor: pointer;
  transition: all 0.3s ease;
}
.transaction-card:hover { transform: translateY(-5px); box-shadow: 0 12px 40px rgba(0,0,0,0.1) !important; }
</style>
