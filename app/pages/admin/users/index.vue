<template>
  <div class="admin-users-premium px-md-8 py-md-6">
    <v-container fluid>
      <!-- Premium Header Section -->
      <v-row class="mb-8 align-center">
        <v-col cols="12" md="8">
          <div class="d-flex align-center mb-2">
            <div class="premium-accent-bar mr-4"></div>
            <span class="text-overline letter-spacing-2 text-gold">Identity & Access</span>
          </div>
          <h1 class="display-serif text-h3 mb-1">User Management</h1>
          <p class="text-subtitle-1 text-medium-emphasis font-weight-light">Control platform permissions and monitor account activity</p>
        </v-col>
        <v-col cols="12" md="4" class="text-md-right">
          <v-btn
            color="primary"
            prepend-icon="mdi-account-plus"
            size="large"
            elevation="0"
            class="premium-btn px-8"
            @click="showAddUserDialog = true"
          >
            New Account
          </v-btn>
        </v-col>
      </v-row>

      <!-- Advanced Filters Card -->
      <v-card class="filter-card-premium mb-8" elevation="0">
        <v-card-text class="pa-6">
          <v-row align="center">
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="filters.search"
                label="Search Users"
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                density="comfortable"
                hide-details
                color="primary"
                class="premium-input"
                @update:model-value="applyFilters"
              />
            </v-col>

            <v-col cols="12" sm="4">
            <v-select
              v-model="filters.role"
              :items="roleFilterOptions"
                label="Filter by Role"
                variant="outlined"
                density="comfortable"
                hide-details
                color="primary"
                class="premium-input"
                @update:model-value="applyFilters"
              />
            </v-col>

            <v-col cols="12" sm="4">
              <v-select
                v-model="filters.status"
                :items="statusOptions"
                label="Status Indicator"
                variant="outlined"
                density="comfortable"
                hide-details
                color="primary"
                class="premium-input"
                @update:model-value="applyFilters"
              />
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Premium Data Table -->
      <v-card class="table-card-premium" elevation="0">
        <v-data-table
          :headers="headers as any"
          :items="users"
          :loading="loading"
          :items-per-page="10"
          class="premium-table"
        >
          <!-- User Info Slot -->
          <template v-slot:item.user="{ item }">
            <div class="d-flex align-center py-4">
              <v-avatar
                :color="(item as any).status === 'active' ? '#121212' : '#e0e0e0'"
                size="44"
                class="mr-4 elevation-2 font-weight-bold"
              >
                <span :class="(item as any).status === 'active' ? 'text-gold' : 'text-grey-darken-1'">
                  {{ getInitials((item as any).firstName, (item as any).lastName) }}
                </span>
              </v-avatar>
              <div>
                <div class="text-subtitle-1 font-weight-bold lh-1 mb-1">{{ (item as any).firstName }} {{ (item as any).lastName }}</div>
                <div class="text-caption text-medium-emphasis">{{ (item as any).email }}</div>
              </div>
            </div>
          </template>

          <!-- Role Slot -->
          <template v-slot:item.role="{ item }">
            <v-chip
              :color="getRoleColor((item as any).role)"
              size="x-small"
              variant="flat"
              class="text-uppercase font-weight-black letter-spacing-1 px-3"
            >
              {{ (item as any).role }}
            </v-chip>
          </template>

          <!-- Tenant Slot (super_admin cross-tenant view only) -->
          <template v-if="isPlatformOwner" v-slot:item.tenant="{ item }">
            <div class="d-flex flex-column align-center">
              <template v-if="(item as any).tenant">
                <span
                  class="text-caption font-weight-bold"
                  :class="(item as any).tenant.self ? 'text-gold' : ''"
                >
                  {{ (item as any).tenant.name }}
                </span>
                <span
                  v-if="!(item as any).tenant.self"
                  class="text-caption text-medium-emphasis"
                >
                  {{ (item as any).tenant.email }}
                </span>
              </template>
              <span v-else class="text-caption text-medium-emphasis">—</span>
            </div>
          </template>

          <!-- Status Slot -->
          <template v-slot:item.status="{ item }">
            <div class="d-flex align-center justify-center">
              <v-badge
                dot
                :color="getStatusColor((item as any).status)"
                inline
                class="mr-2"
              ></v-badge>
              <span class="text-caption font-weight-bold text-uppercase letter-spacing-1">
                {{ (item as any).status }}
              </span>
            </div>
          </template>

          <!-- Last Login Slot -->
          <template v-slot:item.lastLogin="{ item }">
            <div class="text-caption font-weight-medium">
               {{ (item as any).lastLogin ? formatDateTime((item as any).lastLogin) : 'Never' }}
            </div>
          </template>

          <!-- Actions Slot -->
          <template v-slot:item.actions="{ item }">
            <div class="d-flex justify-end gap-2">
              <v-tooltip text="Edit Profile" location="top">
                <template v-slot:activator="{ props }">
                  <v-btn v-bind="props" icon="mdi-pencil-outline" variant="tonal" size="x-small" class="rounded-lg mr-1" @click="editUser(item as any)" />
                </template>
              </v-tooltip>
              
              <v-tooltip text="Reset Credentials" location="top">
                <template v-slot:activator="{ props }">
                  <v-btn v-bind="props" icon="mdi-lock-reset" variant="tonal" size="x-small" class="rounded-lg mr-1" @click="resetPassword(item as any)" />
                </template>
              </v-tooltip>

              <v-tooltip :text="(item as any).status === 'active' ? 'Deactivate' : 'Activate'" location="top">
                <template v-slot:activator="{ props }">
                  <v-btn 
                    v-bind="props" 
                    :icon="(item as any).status === 'active' ? 'mdi-account-off-outline' : 'mdi-account-check-outline'" 
                    variant="tonal" 
                    size="x-small" 
                    class="rounded-lg mr-1"
                    :color="(item as any).status === 'active' ? 'warning' : 'success'" 
                    @click="toggleUserStatus(item as any)" 
                  />
                </template>
              </v-tooltip>

              <v-tooltip text="Remove Account" location="top">
                <template v-slot:activator="{ props }">
                  <v-btn v-bind="props" icon="mdi-trash-can-outline" variant="tonal" size="x-small" class="rounded-lg" color="error" @click="confirmDeleteUser(item as any)" />
                </template>
              </v-tooltip>
            </div>
          </template>
        </v-data-table>
      </v-card>

      <!-- Premium Form Dialog -->
      <v-dialog v-model="showAddUserDialog" max-width="650" persistent transition="dialog-bottom-transition">
        <v-card class="premium-dialog-card">
          <v-card-title class="pa-8 pb-4">
            <div class="text-overline text-gold letter-spacing-2 mb-2">Account Details</div>
            <div class="display-serif text-h4">{{ editingUser ? 'Edit System User' : 'Create New Account' }}</div>
          </v-card-title>
          
          <v-card-text class="pa-8 pt-2">
            <v-form v-model="isUserFormValid" @submit.prevent="saveUser">
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field density="compact"
                    v-model="userForm.firstName"
                    label="First Name"
                    variant="underlined"
                    :rules="[v => !!v || 'First name is required']"
                    required
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field density="compact"
                    v-model="userForm.lastName"
                    label="Last Name"
                    variant="underlined"
                    :rules="[v => !!v || 'Last name is required']"
                    required
                  />
                </v-col>

                <v-col cols="12">
                  <v-text-field density="compact"
                    v-model="userForm.email"
                    label="Email Address"
                    type="email"
                    variant="underlined"
                    :rules="emailRules"
                    required
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-select density="compact"
                    v-model="userForm.role"
                    :items="roleOptions"
                    label="Security Role"
                    variant="underlined"
                    required
                    :rules="[v => !!v || 'Role is required']"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-select density="compact"
                    v-model="userForm.status"
                    :items="statusOptions"
                    label="Initial Status"
                    variant="underlined"
                    required
                    :rules="[v => !!v || 'Status is required']"
                  />
                </v-col>

                <v-col cols="12">
                  <v-text-field density="compact"
                    v-model="userForm.phone"
                    label="Contact Number (Optional)"
                    variant="underlined"
                    :rules="phoneRules"
                  />
                </v-col>

                <v-col v-if="!editingUser" cols="12">
                  <v-text-field density="compact"
                    v-model="userForm.password"
                    label="Security Password"
                    type="password"
                    variant="underlined"
                    :rules="passwordRules"
                    required
                  />
                </v-col>
              </v-row>
            </v-form>
          </v-card-text>
          
          <v-divider class="opacity-10" />
          
          <v-card-actions class="pa-8">
            <v-spacer />
            <v-btn variant="text" class="px-6" @click="showAddUserDialog = false">Cancel</v-btn>
            <v-btn
              color="primary"
              variant="flat"
              class="premium-btn px-10"
              height="48"
              :loading="saving"
              :disabled="!isUserFormValid"
              @click="saveUser"
            >
              {{ editingUser ? 'Apply Changes' : 'Authorize User' }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Confirmation Dialogs (Reset/Delete) -->
      <v-dialog v-model="showResetDialog" max-width="450">
        <v-card class="premium-dialog-card pa-4">
          <v-card-title class="display-serif text-h5">Reset Credentials</v-card-title>
          <v-card-text class="py-4">
            <p class="mb-2">Initiate password recovery for <strong>{{ selectedUser?.email }}</strong>?</p>
            <p class="text-caption opacity-70">The system will generate a temporary key for the next login session.</p>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="showResetDialog = false">Abort</v-btn>
            <v-btn color="primary" variant="flat" class="rounded-pill px-6" :loading="resetting" @click="confirmResetPassword">Confirm Reset</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="showDeleteDialog" max-width="450">
        <v-card class="premium-dialog-card pa-4 border-error">
          <v-card-title class="display-serif text-h5 text-error">Decommission Account</v-card-title>
          <v-card-text class="py-4">
            <p class="mb-2">Are you certain you want to purge <strong>{{ selectedUser?.firstName }} {{ selectedUser?.lastName }}</strong> from the records?</p>
            <p class="text-caption text-error font-weight-bold">This operation is irreversible.</p>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="showDeleteDialog = false">Cancel</v-btn>
            <v-btn color="error" variant="flat" class="rounded-pill px-6" :loading="deleting" @click="deleteUser">Permanent Delete</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Alert Component -->
      <AlertDialog
        v-model="showDialog"
        :type="alertType"
        :title="alertTitle"
        :message="alertMessage"
        :confirm-text="alertConfirmText"
        @confirm="closeAlert"
      />
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '~/stores/auth'

// Helper function to safely get auth headers
const getAuthHeaders = (): Record<string, string> => {
  if (process.client) {
    const token = localStorage.getItem('token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }
  return {}
}

// NO LOGIC CHANGES BELOW
const { showDialog, alertType, alertTitle, alertMessage, alertConfirmText, showSuccess, showError, closeAlert } = useAlert()
const route = useRoute()
const authStore = useAuthStore()

// Platform owner gets a cross-tenant view of every User row; everyone else
// stays scoped to their own tenant. Drives the conditional "Tenant" column.
const isPlatformOwner = computed(() => authStore.user?.role === 'super_admin')

const loading = ref(false)
const saving = ref(false)
const resetting = ref(false)
const deleting = ref(false)
const showAddUserDialog = ref(false)
const showResetDialog = ref(false)
const showDeleteDialog = ref(false)
const isUserFormValid = ref(false)
const editingUser = ref(false)
const selectedUser = ref<any>(null)

const filters = ref<{ search: string; role: string | null; status: string | null }>({
  search: '',
  role: null,
  status: null
})

const userForm = ref({
  id: undefined as string | undefined,
  firstName: '',
  lastName: '',
  email: '',
  role: '',
  status: 'active',
  phone: '',
  password: ''
})

const headers = computed(() => {
  const base: any[] = [
    { title: 'Identity', key: 'user', sortable: false },
    { title: 'Security Role', key: 'role', align: 'center' },
  ]
  if (isPlatformOwner.value) {
    base.push({ title: 'Tenant', key: 'tenant', align: 'center', sortable: false })
  }
  base.push(
    { title: 'Platform Status', key: 'status', align: 'center' },
    { title: 'Last Session', key: 'lastLogin' },
    { title: 'Operations', key: 'actions', sortable: false, align: 'end' }
  )
  return base
})

const roleOptions = ['user', 'agent', 'admin']
const roleFilterOptions = ['user', 'agent', 'admin']
const statusOptions = ['active', 'inactive', 'pending']
const users = ref<any[]>([])

const emailRules = [
  (v: string) => !!v || 'Email is required',
  (v: string) => /.+@.+\..+/.test(v) || 'Email must be valid'
]

const phoneRules = [
  (v: string) => !v || /^\+?[\d\s-]{10,}$/.test(v) || 'Please enter a valid phone number'
]

const passwordRules = [
  (v: string) => !!v || 'Password is required',
  (v: string) => v.length >= 8 || 'Password must be at least 8 characters'
]

const getInitials = (firstName: string, lastName: string) => {
  if (!firstName || !lastName) return '?'
  return `${firstName[0]}${lastName[0]}`.toUpperCase()
}

const getRoleColor = (role: string) => {
  const colors = { admin: '#121212', agent: '#8c734b', user: '#607d8b' }
  return colors[role as keyof typeof colors] || 'grey'
}

const getStatusColor = (status: string) => {
  const colors = { active: 'success', inactive: 'error', pending: 'warning' }
  return colors[status as keyof typeof colors] || 'grey'
}

const formatDateTime = (date: any) => {
  if (!date) return 'Never'
  return new Date(date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
}

const applyFilters = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (filters.value.search) params.append('search', filters.value.search)
    if (filters.value.role) params.append('role', filters.value.role)
    if (filters.value.status) params.append('status', filters.value.status)
    const url = params.toString() ? `/api/admin/users?${params.toString()}` : '/api/admin/users'
    const data = await $fetch<any[]>(url, {
      headers: getAuthHeaders()
    })
    users.value = data
  } catch (error) {
    console.error('Error applying filters:', error)
  } finally {
    loading.value = false
  }
}

const syncFiltersFromRoute = () => {
  const role = (route.query.role as string) || null
  if (role && roleFilterOptions.includes(role)) {
    filters.value.role = role
  }
}

const editUser = (user: any) => {
  editingUser.value = true
  userForm.value = { 
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    status: user.status,
    phone: user.phone || '',
    password: '' 
  }
  showAddUserDialog.value = true
}

const resetPassword = (user: any) => {
  selectedUser.value = user
  showResetDialog.value = true
}

const toggleUserStatus = async (user: any) => {
  try {
    const response = await fetch(`/api/admin/users/${user.id}/toggle-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    user.status = user.status === 'active' ? 'inactive' : 'active'
  } catch (error: any) {
    showError(error.message, 'Failed to Toggle User Status')
  }
}

const saveUser = async () => {
  saving.value = true
  try {
    const endpoint = editingUser.value ? `/api/admin/users/${userForm.value.id}` : '/api/admin/users'
    const method = editingUser.value ? 'PUT' : 'POST'
    const response = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(userForm.value)
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.statusMessage || `HTTP ${response.status}`)
    }
    userForm.value = { id: undefined, firstName: '', lastName: '', email: '', role: '', status: 'active', phone: '', password: '' }
    editingUser.value = false
    showAddUserDialog.value = false
    await applyFilters()
  } catch (error: any) {
    showError(error.message, 'Failed to Save User')
  } finally {
    saving.value = false
  }
}

const confirmResetPassword = async () => {
  if (!selectedUser.value) return
  resetting.value = true
  try {
    const response = await fetch(`/api/admin/users/${selectedUser.value.id}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const result = await response.json()
    showResetDialog.value = false
    if (result.temporaryPassword) {
      showSuccess(`Temporary password: ${result.temporaryPassword}`, 'Password Reset Successful')
    } else {
      showSuccess('Temporary password sent to user\'s email.', 'Password Reset Successful')
    }
  } catch (error: any) {
    showError(error.message, 'Failed to Reset Password')
  } finally {
    resetting.value = false
  }
}

const confirmDeleteUser = (user: any) => {
  selectedUser.value = user
  showDeleteDialog.value = true
}

const deleteUser = async () => {
  if (!selectedUser.value) return
  deleting.value = true
  try {
    const response = await fetch(`/api/admin/users/${selectedUser.value.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    showDeleteDialog.value = false
    selectedUser.value = null
    await applyFilters()
    showSuccess('User has been removed.', 'User Deleted')
  } catch (error: any) {
    showError(error.message, 'Failed to Delete User')
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  syncFiltersFromRoute()
  applyFilters()
})

watch(
  () => route.query,
  () => {
    syncFiltersFromRoute()
    applyFilters()
  }
)

definePageMeta({
  layout: 'admin',
  middleware: ['admin', 'delegate-feature'],
  delegateFeature: 'user_management',
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;600;700&display=swap');

.admin-users-premium {
  background-color: #fcfcfb;
  font-family: 'Inter', sans-serif;
  min-height: 100vh;
}

.display-serif { font-family: 'Playfair Display', serif; }
.text-gold { color: #8c734b; }
.letter-spacing-2 { letter-spacing: 2px; }
.letter-spacing-1 { letter-spacing: 1px; }
.lh-1 { line-height: 1; }

.premium-accent-bar {
  width: 40px;
  height: 4px;
  background: #8c734b;
  border-radius: 2px;
}

/* Premium Button Styling */
.premium-btn {
  border-radius: 12px !important;
  text-transform: none !important;
  font-weight: 700 !important;
  letter-spacing: 0.5px !important;
}

/* Filter Card */
.filter-card-premium {
  border-radius: 20px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  background: white !important;
}

.premium-input :deep(.v-field__outline) {
  --v-field-border-opacity: 0.1;
}

/* Table Styling */
.table-card-premium {
  border-radius: 24px !important;
  background: white !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  overflow: hidden;
}

.premium-table {
  background: transparent !important;
}

.premium-table :deep(th) {
  background: #f9f9f7 !important;
  text-transform: uppercase !important;
  font-size: 0.7rem !important;
  letter-spacing: 1.5px !important;
  font-weight: 800 !important;
  color: #999 !important;
  padding: 16px 24px !important;
  height: auto !important;
}

.premium-table :deep(td) {
  padding: 12px 24px !important;
  border-bottom: 1px solid #f1f1ee !important;
}

.premium-table :deep(.v-data-table__tr:hover) {
  background-color: #fcfcfb !important;
}

/* Dialog Styling */
.premium-dialog-card {
  border-radius: 28px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
}

.gap-2 { gap: 8px; }

/* Custom Badge Positioning */
:deep(.v-badge--dot .v-badge__badge) {
  width: 10px;
  height: 10px;
}
</style>