<template>
  <div class="admin-subscribers-premium px-md-8 py-md-6">
    <v-container fluid>
      <!-- Page Header -->
      <v-row class="mb-8 align-center">
        <v-col cols="12" md="8">
          <div class="d-flex align-center mb-2">
            <v-btn icon="mdi-arrow-left" variant="text" :to="'/admin/newsletter'" class="mr-3"></v-btn>
            <div class="premium-accent-bar mr-4"></div>
            <span class="text-overline letter-spacing-2 text-gold">Subscriber Management</span>
          </div>
          <h1 class="display-serif text-h3 mb-1">Subscribers</h1>
        </v-col>
        <v-col cols="12" md="4" class="text-md-right">
          <v-btn 
            color="primary" 
            prepend-icon="mdi-account-plus"
            @click="showAddDialog = true"
          >
            Add Subscriber
          </v-btn>
        </v-col>
      </v-row>

      <!-- Filters & Search -->
      <v-row class="mb-6">
        <v-col cols="12" md="4">
          <v-text-field
            v-model="search"
            prepend-inner-icon="mdi-magnify"
            label="Search subscribers"
            variant="outlined"
            density="comfortable"
            clearable
            @update:model-value="debouncedSearch"
          />
        </v-col>
        <v-col cols="12" md="3">
          <v-select
            v-model="statusFilter"
            :items="statusOptions"
            label="Status"
            variant="outlined"
            density="comfortable"
            @update:model-value="loadSubscribers"
          />
        </v-col>
        <v-col cols="12" md="5" class="d-flex justify-end align-center">
          <div class="stats-chips">
            <v-chip class="mr-2">
              <v-icon icon="mdi-account-check" size="small" class="mr-1" />
              Active: {{ stats.active || 0 }}
            </v-chip>
            <v-chip>
              <v-icon icon="mdi-account-off" size="small" class="mr-1" />
              Unsubscribed: {{ stats.unsubscribed || 0 }}
            </v-chip>
          </div>
        </v-col>
      </v-row>

      <!-- Subscribers Table -->
      <v-card class="table-card-premium" elevation="0">
        <v-data-table
          :headers="headers"
          :items="subscribers"
          :loading="loading"
          :items-per-page="pagination.limit"
          hide-default-footer
        >
          <template v-slot:item.email="{ item }">
            <div class="d-flex align-center">
              <v-avatar color="#f4f1ea" class="text-primary mr-3" size="36">
                <v-icon icon="mdi-email" size="20" />
              </v-avatar>
              <div>
                <div class="font-weight-bold">{{ item.email }}</div>
                <div v-if="item.firstName || item.lastName" class="text-caption text-medium-emphasis">
                  {{ item.firstName }} {{ item.lastName }}
                </div>
              </div>
            </div>
          </template>

          <template v-slot:item.status="{ item }">
            <v-chip
              :color="item.status === 'active' ? 'success' : item.status === 'unsubscribed' ? 'grey' : 'warning'"
              size="small"
              variant="flat"
            >
              {{ item.status }}
            </v-chip>
          </template>

          <template v-slot:item.source="{ item }">
            <v-chip size="small" variant="tonal">
              {{ item.source }}
            </v-chip>
          </template>

          <template v-slot:item.subscribedAt="{ item }">
            {{ formatDate(item.subscribedAt) }}
          </template>

          <template v-slot:item.actions="{ item }">
            <v-btn
              icon="mdi-pencil"
              variant="text"
              size="small"
              @click="editSubscriber(item)"
            />
            <v-btn
              icon="mdi-delete"
              variant="text"
              size="small"
              color="error"
              @click="deleteSubscriber(item)"
            />
          </template>
        </v-data-table>

        <!-- Pagination -->
        <v-divider />
        <div class="d-flex justify-space-between align-center pa-4">
          <div class="text-caption text-medium-emphasis">
            Showing {{ (pagination.page - 1) * pagination.limit + 1 }} - 
            {{ Math.min(pagination.page * pagination.limit, pagination.total) }} of {{ pagination.total }}
          </div>
          <v-pagination
            v-model="pagination.page"
            :length="pagination.totalPages"
            :total-visible="5"
            @update:model-value="loadSubscribers"
          />
        </div>
      </v-card>
    </v-container>

    <!-- Add/Edit Dialog -->
    <v-dialog v-model="showAddDialog" max-width="600">
      <v-card>
        <v-card-title class="pa-6">
          <span class="display-serif text-h5">{{ editingSubscriber ? 'Edit' : 'Add' }} Subscriber</span>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-6">
          <v-form ref="form">
            <v-text-field density="compact"
              v-model="formData.email"
              label="Email Address"
              type="email"
              variant="outlined"
              :rules="[v => !!v || 'Email is required', v => /.+@.+\..+/.test(v) || 'Email must be valid']"
              class="mb-4"
            />
            <v-row>
              <v-col cols="6">
                <v-text-field density="compact"
                  v-model="formData.firstName"
                  label="First Name"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field density="compact"
                  v-model="formData.lastName"
                  label="Last Name"
                  variant="outlined"
                />
              </v-col>
            </v-row>
            <v-select density="compact"
              v-model="formData.status"
              :items="['active', 'unsubscribed', 'bounced']"
              label="Status"
              variant="outlined"
            />
          </v-form>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-6">
          <v-spacer />
          <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
          <v-btn color="primary" @click="saveSubscriber" :loading="saving">
            {{ editingSubscriber ? 'Update' : 'Add' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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

const subscribers = ref<any[]>([])
const loading = ref(false)
const saving = ref(false)
const search = ref('')
const statusFilter = ref('')
const pagination = ref({ page: 1, limit: 50, total: 0, totalPages: 0 })
const stats = ref<any>({})
const showAddDialog = ref(false)
const editingSubscriber = ref<any>(null)
const formData = ref({ email: '', firstName: '', lastName: '', status: 'active' })

const statusOptions = [
  { title: 'All Status', value: '' },
  { title: 'Active', value: 'active' },
  { title: 'Unsubscribed', value: 'unsubscribed' },
  { title: 'Bounced', value: 'bounced' }
]

const headers: any[] = [
  { title: 'Email', key: 'email', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Source', key: 'source', sortable: false },
  { title: 'Subscribed', key: 'subscribedAt', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' }
]

let searchTimeout: any = null
const debouncedSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    pagination.value.page = 1
    loadSubscribers()
  }, 500)
}

const loadSubscribers = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.value.page,
      limit: pagination.value.limit
    }
    if (statusFilter.value) params.status = statusFilter.value
    if (search.value) params.search = search.value

    const data = await $fetch('/api/admin/newsletter/subscribers', {
      headers: getAuthHeaders(),
      params
    }) as any

    subscribers.value = data.subscribers
    pagination.value = data.pagination
    stats.value = data.stats
  } catch (error) {
    console.error('Error loading subscribers:', error)
  } finally {
    loading.value = false
  }
}

const editSubscriber = (subscriber: any) => {
  editingSubscriber.value = subscriber
  formData.value = {
    email: subscriber.email,
    firstName: subscriber.firstName || '',
    lastName: subscriber.lastName || '',
    status: subscriber.status
  }
  showAddDialog.value = true
}

const deleteSubscriber = async (subscriber: any) => {
  if (!confirm('Are you sure you want to delete this subscriber?')) return

  try {
    await $fetch(`/api/admin/newsletter/subscribers/${subscriber.id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    await loadSubscribers()
  } catch (error) {
    console.error('Error deleting subscriber:', error)
  }
}

const saveSubscriber = async () => {
  saving.value = true
  try {
    if (editingSubscriber.value) {
      await $fetch(`/api/admin/newsletter/subscribers/${editingSubscriber.value.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: formData.value
      })
    } else {
      await $fetch('/api/admin/newsletter/subscribers', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData.value
      })
    }
    closeDialog()
    await loadSubscribers()
  } catch (error: any) {
    console.error('Error saving subscriber:', error)
    alert(error.data?.message || 'An error occurred')
  } finally {
    saving.value = false
  }
}

const closeDialog = () => {
  showAddDialog.value = false
  editingSubscriber.value = null
  formData.value = { email: '', firstName: '', lastName: '', status: 'active' }
}

onMounted(() => {
  loadSubscribers()
})

definePageMeta({
  layout: 'admin',
  middleware: ['admin']
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;600;700&display=swap');

.admin-subscribers-premium {
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

.table-card-premium {
  border-radius: 24px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  background: white !important;
}

.stats-chips {
  display: flex;
  gap: 8px;
}
</style>
