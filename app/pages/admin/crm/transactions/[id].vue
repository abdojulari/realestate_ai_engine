<template>
  <div class="admin-transaction-detail px-md-8 py-md-6">
    <v-container fluid>
      <!-- Back -->
      <v-btn variant="text" to="/admin/crm/transactions" prepend-icon="mdi-arrow-left" class="mb-4 text-medium-emphasis">
        Back to Transactions
      </v-btn>

      <!-- Header -->
      <v-row class="mb-8 align-center" v-if="transaction">
        <v-col cols="12" md="8">
          <div class="d-flex align-center mb-2">
            <div class="premium-accent-bar mr-4"></div>
            <span class="text-overline letter-spacing-2 text-gold">{{ transaction.type === 'buying' ? 'Buyer' : 'Seller' }} Transaction</span>
          </div>
          <h1 class="display-serif text-h3 mb-2">
            {{ transaction.client?.firstName }} {{ transaction.client?.lastName }}
          </h1>
          <div class="text-subtitle-1 text-medium-emphasis">
            {{ transaction.propertyAddress || 'No property assigned yet' }}
          </div>
        </v-col>
        <v-col cols="12" md="4" class="text-md-right">
          <v-chip :color="getStatusColor(transaction.status)" size="large" class="text-uppercase font-weight-bold mr-2">
            {{ transaction.status }}
          </v-chip>
          <v-btn icon variant="text" @click="showEditDialog = true">
            <v-icon>mdi-pencil</v-icon>
          </v-btn>
        </v-col>
      </v-row>

      <!-- Progress Overview -->
      <v-row class="mb-8" v-if="transaction">
        <v-col cols="12">
          <v-card class="progress-card" elevation="0">
            <v-card-text class="pa-8">
              <div class="d-flex align-center mb-4">
                <div class="flex-grow-1 mr-6">
                  <div class="d-flex justify-space-between mb-2">
                    <span class="text-h6 font-weight-bold">Overall Progress</span>
                    <span class="text-h4 font-weight-bold" :class="getProgressTextColor(transaction.progress)">
                      {{ transaction.progress }}%
                    </span>
                  </div>
                  <v-progress-linear
                    :model-value="transaction.progress"
                    :color="getProgressColor(transaction.progress)"
                    height="16"
                    rounded
                  />
                </div>
              </div>

              <!-- Stage Indicators -->
              <div class="d-flex justify-space-between flex-wrap ga-2 mt-6">
                <div v-for="stage in stages" :key="stage.id" class="stage-indicator text-center">
                  <v-avatar
                    :color="isStageComplete(stage.id) ? 'success' : isCurrentStage(stage.id) ? 'primary' : 'grey-lighten-3'"
                    size="40"
                    class="mb-2"
                  >
                    <v-icon :color="isStageComplete(stage.id) || isCurrentStage(stage.id) ? 'white' : 'grey'" size="20">
                      {{ isStageComplete(stage.id) ? 'mdi-check' : stage.icon }}
                    </v-icon>
                  </v-avatar>
                  <div class="text-caption font-weight-bold" :class="isCurrentStage(stage.id) ? 'text-primary' : 'text-medium-emphasis'">
                    {{ stage.label }}
                  </div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Checklist & Details -->
      <v-row v-if="transaction">
        <v-col cols="12" md="8">
          <v-card class="checklist-card" elevation="0">
            <v-card-title class="pa-6 d-flex align-center">
              <span class="display-serif text-h5">Transaction Checklist</span>
              <v-spacer />
              <span class="text-body-2 text-medium-emphasis">
                {{ completedCount }}/{{ requiredCount }} completed
              </span>
            </v-card-title>
            <v-divider class="opacity-10" />
            <v-card-text class="pa-0">
              <template v-for="(items, category) in groupedChecklist" :key="category">
                <div class="category-header px-6 py-3 d-flex align-center">
                  <v-icon size="small" :color="isCategoryComplete(category) ? 'success' : 'grey'" class="mr-2">
                    {{ isCategoryComplete(category) ? 'mdi-check-circle' : 'mdi-circle-outline' }}
                  </v-icon>
                  <span class="text-overline font-weight-bold text-uppercase letter-spacing-1">
                    {{ formatCategory(category) }}
                  </span>
                  <v-spacer />
                  <span class="text-caption text-medium-emphasis">
                    {{ items.filter((i: any) => i.isCompleted).length }}/{{ items.length }}
                  </span>
                </div>

                <v-list bg-color="transparent" density="compact" class="py-0">
                  <v-list-item
                    v-for="item in items"
                    :key="item.id"
                    class="px-6 checklist-item"
                    :class="{ 'completed-item': item.isCompleted }"
                  >
                    <template #prepend>
                      <v-checkbox
                        :model-value="item.isCompleted"
                        hide-details
                        density="compact"
                        :color="item.isCompleted ? 'success' : 'primary'"
                        @update:model-value="toggleChecklistItem(item)"
                      />
                    </template>
                    <v-list-item-title :class="{ 'text-decoration-line-through text-medium-emphasis': item.isCompleted }">
                      {{ item.label }}
                      <v-chip v-if="!item.isRequired" size="x-small" variant="outlined" class="ml-2">Optional</v-chip>
                    </v-list-item-title>
                    <v-list-item-subtitle v-if="item.description" class="text-caption">
                      {{ item.description }}
                    </v-list-item-subtitle>
                    <template #append>
                      <div v-if="item.completedAt" class="text-caption text-success">
                        <v-icon size="x-small" class="mr-1">mdi-check</v-icon>
                        {{ formatDate(item.completedAt) }}
                      </div>
                      <div v-else-if="item.dueDate" class="text-caption" :class="isPastDue(item.dueDate) ? 'text-error' : 'text-medium-emphasis'">
                        Due: {{ formatDate(item.dueDate) }}
                      </div>
                    </template>
                  </v-list-item>
                </v-list>
                <v-divider class="opacity-10" />
              </template>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Transaction Details Sidebar -->
        <v-col cols="12" md="4">
          <!-- Client Info -->
          <v-card class="detail-card mb-6" elevation="0">
            <v-card-title class="pa-4">
              <span class="text-subtitle-1 font-weight-bold">Client Details</span>
            </v-card-title>
            <v-divider class="opacity-10" />
            <v-card-text class="pa-4">
              <div class="d-flex align-center mb-4">
                <v-avatar :color="transaction.type === 'buying' ? 'blue' : 'green'" size="48" class="mr-3 text-white">
                  {{ transaction.client?.firstName[0] }}{{ transaction.client?.lastName[0] }}
                </v-avatar>
                <div>
                  <div class="font-weight-bold">{{ transaction.client?.firstName }} {{ transaction.client?.lastName }}</div>
                  <v-chip :color="transaction.type === 'buying' ? 'blue' : 'green'" size="x-small" class="text-uppercase">
                    {{ transaction.client?.type }}
                  </v-chip>
                </div>
              </div>
              <div v-if="transaction.client?.email" class="text-body-2 mb-2">
                <v-icon size="small" class="mr-2">mdi-email</v-icon>{{ transaction.client.email }}
              </div>
              <div v-if="transaction.client?.phone" class="text-body-2">
                <v-icon size="small" class="mr-2">mdi-phone</v-icon>{{ transaction.client.phone }}
              </div>
            </v-card-text>
          </v-card>

          <!-- Transaction Info -->
          <v-card class="detail-card mb-6" elevation="0">
            <v-card-title class="pa-4">
              <span class="text-subtitle-1 font-weight-bold">Transaction Info</span>
            </v-card-title>
            <v-divider class="opacity-10" />
            <v-card-text class="pa-4">
              <div class="detail-row">
                <span class="text-caption text-medium-emphasis">Type</span>
                <span class="font-weight-bold text-capitalize">{{ transaction.type }}</span>
              </div>
              <div class="detail-row">
                <span class="text-caption text-medium-emphasis">Status</span>
                <v-chip :color="getStatusColor(transaction.status)" size="x-small" class="text-uppercase">{{ transaction.status }}</v-chip>
              </div>
              <div v-if="transaction.salePrice" class="detail-row">
                <span class="text-caption text-medium-emphasis">Sale Price</span>
                <span class="font-weight-bold">${{ transaction.salePrice.toLocaleString() }}</span>
              </div>
              <div v-if="transaction.closingDate" class="detail-row">
                <span class="text-caption text-medium-emphasis">Closing Date</span>
                <span>{{ formatDate(transaction.closingDate) }}</span>
              </div>
              <div v-if="transaction.possessionDate" class="detail-row">
                <span class="text-caption text-medium-emphasis">Possession</span>
                <span>{{ formatDate(transaction.possessionDate) }}</span>
              </div>
              <div class="detail-row">
                <span class="text-caption text-medium-emphasis">Created</span>
                <span>{{ formatDate(transaction.createdAt) }}</span>
              </div>
            </v-card-text>
          </v-card>

          <!-- Status Change -->
          <v-card class="detail-card" elevation="0">
            <v-card-title class="pa-4">
              <span class="text-subtitle-1 font-weight-bold">Update Status</span>
            </v-card-title>
            <v-divider class="opacity-10" />
            <v-card-text class="pa-4">
              <v-select
                :model-value="transaction.status"
                :items="statusOptions"
                variant="outlined"
                density="compact"
                @update:model-value="updateStatus"
              />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Edit Dialog -->
      <v-dialog v-model="showEditDialog" max-width="500" persistent>
        <v-card class="rounded-xl">
          <v-card-title class="pa-6 display-serif text-h6">Edit Transaction</v-card-title>
          <v-divider />
          <v-card-text class="pa-6">
            <v-text-field density="compact" v-model="editForm.propertyAddress" label="Property Address" variant="outlined" class="mb-4" />
            <v-text-field density="compact" v-model="editForm.salePrice" label="Sale Price" variant="outlined" type="number" prefix="$" class="mb-4" />
            <v-text-field density="compact" v-model="editForm.closingDate" label="Closing Date" variant="outlined" type="date" class="mb-4" />
            <v-text-field density="compact" v-model="editForm.possessionDate" label="Possession Date" variant="outlined" type="date" class="mb-4" />
            <v-textarea density="compact" v-model="editForm.notes" label="Notes" variant="outlined" rows="3" />
          </v-card-text>
          <v-divider />
          <v-card-actions class="pa-6">
            <v-spacer />
            <v-btn variant="text" @click="showEditDialog = false">Cancel</v-btn>
            <v-btn color="primary" @click="saveEdit" :loading="saving">Save</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const transactionId = computed(() => parseInt(route.params.id as string))

const getAuthHeaders = (): Record<string, string> => {
  if (process.client) {
    const token = localStorage.getItem('token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }
  return {}
}

const transaction = ref<any>(null)
const showEditDialog = ref(false)
const saving = ref(false)
const editForm = ref({ propertyAddress: '', salePrice: null, closingDate: '', possessionDate: '', notes: '' })

const statusOptions = ['active', 'conditional', 'firm', 'closed', 'cancelled']

const stages = computed(() => {
  if (!transaction.value) return []
  return transaction.value.type === 'buying'
    ? [
        { id: 'initial', label: 'Initial', icon: 'mdi-handshake' },
        { id: 'pre-approval', label: 'Pre-Approval', icon: 'mdi-bank' },
        { id: 'showing', label: 'Showings', icon: 'mdi-home-search' },
        { id: 'offer', label: 'Offer', icon: 'mdi-file-document-edit' },
        { id: 'conditions', label: 'Conditions', icon: 'mdi-clipboard-check' },
        { id: 'closing', label: 'Closing', icon: 'mdi-key-variant' },
      ]
    : [
        { id: 'initial', label: 'Initial', icon: 'mdi-handshake' },
        { id: 'preparation', label: 'Preparation', icon: 'mdi-camera' },
        { id: 'active', label: 'Active', icon: 'mdi-home' },
        { id: 'offer', label: 'Offers', icon: 'mdi-file-document-multiple' },
        { id: 'conditions', label: 'Conditions', icon: 'mdi-clipboard-check' },
        { id: 'closing', label: 'Closing', icon: 'mdi-key-variant' },
      ]
})

const groupedChecklist = computed(() => {
  if (!transaction.value?.checklist) return {}
  const groups: Record<string, any[]> = {}
  transaction.value.checklist.forEach((item: any) => {
    const cat = item.category || 'general'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(item)
  })
  return groups
})

const completedCount = computed(() => transaction.value?.checklist?.filter((i: any) => i.isCompleted).length || 0)
const requiredCount = computed(() => transaction.value?.checklist?.filter((i: any) => i.isRequired).length || 0)

function isStageComplete(stageId: string) {
  if (!transaction.value?.checklist) return false
  const items = transaction.value.checklist.filter((i: any) => i.category === stageId && i.isRequired)
  return items.length > 0 && items.every((i: any) => i.isCompleted)
}

function isCurrentStage(stageId: string) {
  return transaction.value?.currentStage === stageId
}

function isCategoryComplete(category: string) {
  const items = transaction.value?.checklist?.filter((i: any) => i.category === category && i.isRequired)
  return items?.length > 0 && items.every((i: any) => i.isCompleted)
}

function formatCategory(cat: string) {
  return cat.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
const isPastDue = (d: string) => new Date(d) < new Date()

const getStatusColor = (s: string) => {
  const c: Record<string, string> = { active: 'primary', conditional: 'warning', firm: 'info', closed: 'success', cancelled: 'error' }
  return c[s] || 'grey'
}
const getProgressColor = (p: number) => p >= 80 ? 'success' : p >= 50 ? 'info' : p >= 25 ? 'warning' : 'primary'
const getProgressTextColor = (p: number) => p >= 80 ? 'text-success' : p >= 50 ? 'text-info' : 'text-primary'

async function loadTransaction() {
  try {
    transaction.value = await $fetch(`/api/admin/crm/transactions/${transactionId.value}`, { headers: getAuthHeaders() }) as any
  } catch (e) {
    console.error('Error loading transaction:', e)
  }
}

async function toggleChecklistItem(item: any) {
  try {
    const res = await $fetch('/api/admin/crm/transactions/checklist', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: { checklistItemId: item.id, isCompleted: !item.isCompleted }
    }) as any

    // Update local state
    item.isCompleted = !item.isCompleted
    item.completedAt = item.isCompleted ? new Date().toISOString() : null
    if (res.progress !== undefined) transaction.value.progress = res.progress
    if (res.currentStage) transaction.value.currentStage = res.currentStage
    if (res.status) transaction.value.status = res.status
  } catch (e) {
    console.error('Error toggling checklist:', e)
  }
}

async function updateStatus(status: string) {
  try {
    await $fetch(`/api/admin/crm/transactions/${transactionId.value}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: { status }
    })
    transaction.value.status = status
  } catch (e) {
    console.error('Error updating status:', e)
  }
}

async function saveEdit() {
  saving.value = true
  try {
    await $fetch(`/api/admin/crm/transactions/${transactionId.value}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: editForm.value
    })
    showEditDialog.value = false
    await loadTransaction()
  } finally {
    saving.value = false
  }
}

onMounted(loadTransaction)

definePageMeta({ layout: 'admin', middleware: ['admin'] })
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;600;700&display=swap');

.admin-transaction-detail { background-color: #fcfcfb; font-family: 'Inter', sans-serif; min-height: 100vh; }
.display-serif { font-family: 'Playfair Display', serif; }
.text-gold { color: #8c734b; }
.letter-spacing-2 { letter-spacing: 2px; }
.letter-spacing-1 { letter-spacing: 1px; }
.premium-accent-bar { width: 40px; height: 4px; background: #8c734b; border-radius: 2px; }

.progress-card, .checklist-card, .detail-card {
  border-radius: 20px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  background: white !important;
}

.stage-indicator { flex: 1; min-width: 80px; }

.category-header { background: #f9f9f9; }

.checklist-item {
  transition: background 0.2s ease;
}
.checklist-item:hover { background: #f9f9f9; }
.completed-item { opacity: 0.7; }

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(0,0,0,0.03);
}
.detail-row:last-child { border-bottom: none; }
</style>
