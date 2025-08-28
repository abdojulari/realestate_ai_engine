<template>
  <v-container>
    <div class="d-flex align-center mb-6">
      <h1 class="text-h4">User Management</h1>
      <v-spacer />
      <v-btn
        color="primary"
        prepend-icon="mdi-account-plus"
        @click="showAddUserDialog = true"
      >
        Add User
      </v-btn>
    </div>

    <!-- Filters -->
    <v-card class="mb-6">
      <v-card-text>
        <v-row>
          <v-col cols="12" sm="4">
            <v-text-field
              v-model="filters.search"
              label="Search Users"
              prepend-inner-icon="mdi-magnify"
              clearable
              @update:model-value="applyFilters"
            />
          </v-col>

          <v-col cols="12" sm="4">
            <v-select
              v-model="filters.role"
              :items="roleOptions"
              label="Role"
              clearable
              @update:model-value="applyFilters"
            />
          </v-col>

          <v-col cols="12" sm="4">
            <v-select
              v-model="filters.status"
              :items="statusOptions"
              label="Status"
              clearable
              @update:model-value="applyFilters"
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Users Table -->
    <v-card>
      <v-data-table
        :headers="headers as any"
        :items="users"
        :loading="loading"
        :items-per-page="10"
        class="elevation-1"
      >
        <!-- User Info -->
        <template v-slot:item.user="{ item }">
          <div class="d-flex align-center">
            <v-avatar
              :color="(item as any).status === 'active' ? 'primary' : 'grey'"
              class="mr-3"
            >
              {{ getInitials((item as any).firstName, (item as any).lastName) }}
            </v-avatar>
            <div>
              <div>{{ (item as any).firstName }} {{ (item as any).lastName }}</div>
              <div class="text-caption">{{ (item as any).email }}</div>
            </div>
          </div>
        </template>

        <!-- Role -->
        <template v-slot:item.role="{ item }">
          <v-chip
            :color="getRoleColor((item as any).role)"
            size="small"
          >
            {{ (item as any).role }}
          </v-chip>
        </template>

        <!-- Status -->
        <template v-slot:item.status="{ item }">
          <v-chip
            :color="getStatusColor((item as any).status)"
            size="small"
          >
            {{ (item as any).status }}
          </v-chip>
        </template>

        <!-- Last Login -->
        <template v-slot:item.lastLogin="{ item }">
          {{ formatDateTime((item as any).lastLogin) }}
        </template>

        <!-- Actions -->
        <template v-slot:item.actions="{ item }">
          <v-btn
            icon="mdi-pencil"
            variant="text"
            size="small"
            @click="editUser(item as any)"
          />
          <v-btn
            icon="mdi-lock-reset"
            variant="text"
            size="small"
            @click="resetPassword(item as any)"
          />
          <v-btn
            :icon="(item as any).status === 'active' ? 'mdi-account-off' : 'mdi-account-check'"
            variant="text"
            size="small"
            :color="(item as any).status === 'active' ? 'error' : 'success'"
            @click="toggleUserStatus(item as any)"
          />
        </template>
      </v-data-table>
    </v-card>

    <!-- Add/Edit User Dialog -->
    <v-dialog
      v-model="showAddUserDialog"
      max-width="600"
    >
      <v-card>
        <v-card-title>
          {{ editingUser ? 'Edit User' : 'Add New User' }}
        </v-card-title>
        <v-card-text>
          <v-form v-model="isUserFormValid" @submit.prevent="saveUser">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="userForm.firstName"
                  label="First Name"
                  :rules="[v => !!v || 'First name is required']"
                  required
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  v-model="userForm.lastName"
                  label="Last Name"
                  :rules="[v => !!v || 'Last name is required']"
                  required
                />
              </v-col>

              <v-col cols="12">
                <v-text-field
                  v-model="userForm.email"
                  label="Email"
                  type="email"
                  :rules="emailRules"
                  required
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-select
                  v-model="userForm.role"
                  :items="roleOptions"
                  label="Role"
                  required
                  :rules="[v => !!v || 'Role is required']"
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-select
                  v-model="userForm.status"
                  :items="statusOptions"
                  label="Status"
                  required
                  :rules="[v => !!v || 'Status is required']"
                />
              </v-col>

              <v-col cols="12">
                <v-text-field
                  v-model="userForm.phone"
                  label="Phone"
                  :rules="phoneRules"
                />
              </v-col>

              <v-col v-if="!editingUser" cols="12">
                <v-text-field
                  v-model="userForm.password"
                  label="Password"
                  type="password"
                  :rules="passwordRules"
                  required
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="showAddUserDialog = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            :loading="saving"
            :disabled="!isUserFormValid"
            @click="saveUser"
          >
            {{ editingUser ? 'Save Changes' : 'Add User' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Reset Password Dialog -->
    <v-dialog
      v-model="showResetDialog"
      max-width="400"
    >
      <v-card>
        <v-card-title>Reset Password</v-card-title>
        <v-card-text>
          <p class="mb-4">Are you sure you want to reset the password for {{ selectedUser?.email }}?</p>
          <p class="text-caption">A temporary password will be sent to their email address.</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="showResetDialog = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            :loading="resetting"
            @click="confirmResetPassword"
          >
            Reset Password
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const loading = ref(false)
const saving = ref(false)
const resetting = ref(false)
const showAddUserDialog = ref(false)
const showResetDialog = ref(false)
const isUserFormValid = ref(false)
const editingUser = ref(false)
const selectedUser = ref(null)

const filters = ref({
  search: '',
  role: null,
  status: null
})

const userForm = ref({
  firstName: '',
  lastName: '',
  email: '',
  role: '',
  status: 'active',
  phone: '',
  password: ''
})

const headers = [
  { title: 'User', key: 'user', sortable: false },
  { title: 'Role', key: 'role', align: 'center' },
  { title: 'Status', key: 'status', align: 'center' },
  { title: 'Last Login', key: 'lastLogin' },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' }
]

const roleOptions = [
  'user',
  'agent',
  'admin'
]

const statusOptions = [
  'active',
  'inactive',
  'pending'
]

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
  return `${firstName[0]}${lastName[0]}`.toUpperCase()
}

const getRoleColor = (role: string) => {
  const colors = {
    admin: 'error',
    agent: 'warning',
    user: 'primary'
  }
  return colors[role as keyof typeof colors] || 'grey'
}

const getStatusColor = (status: string) => {
  const colors = {
    active: 'success',
    inactive: 'error',
    pending: 'warning'
  }
  return colors[status as keyof typeof colors] || 'grey'
}

const formatDateTime = (date: Date) => {
  return new Date(date).toLocaleString()
}

const applyFilters = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (filters.value.search) params.append('search', filters.value.search)
    if (filters.value.role) params.append('role', filters.value.role)
    const url = params.toString() ? `/api/admin/users?${params.toString()}` : '/api/admin/users'
    const data = await $fetch<any[]>(url, {
      headers: (() => {
        try { const t = localStorage.getItem('token'); return t ? { Authorization: `Bearer ${t}` } : {} } catch { return {} }
      })()
    })
    users.value = data
  } catch (error) {
    console.error('Error applying filters:', error)
  } finally {
    loading.value = false
  }
}

const editUser = (user: any) => {
  editingUser.value = true
  userForm.value = { ...user }
  showAddUserDialog.value = true
}

const resetPassword = (user: any) => {
  selectedUser.value = user
  showResetDialog.value = true
}

const toggleUserStatus = async (user: any) => {
  try {
    // Replace with actual API call
    await fetch(`/api/admin/users/${user.id}/toggle-status`, {
      method: 'POST'
    })
    user.status = user.status === 'active' ? 'inactive' : 'active'
  } catch (error) {
    console.error('Error toggling user status:', error)
  }
}

const saveUser = async () => {
  saving.value = true
  try {
    // Replace with actual API call
    const endpoint = editingUser.value
      ? `/api/admin/users/${userForm.value.id}`
      : '/api/admin/users'
    
    const method = editingUser.value ? 'PUT' : 'POST'
    
    await fetch(endpoint, {
      method,
      body: JSON.stringify(userForm.value)
    })

    showAddUserDialog.value = false
    // Refresh users list
    applyFilters()
  } catch (error) {
    console.error('Error saving user:', error)
  } finally {
    saving.value = false
  }
}

const confirmResetPassword = async () => {
  if (!selectedUser.value) return

  resetting.value = true
  try {
    // Replace with actual API call
    await fetch(`/api/admin/users/${selectedUser.value.id}/reset-password`, {
      method: 'POST'
    })
    showResetDialog.value = false
  } catch (error) {
    console.error('Error resetting password:', error)
  } finally {
    resetting.value = false
  }
}

onMounted(() => {
  applyFilters()
})

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin']
})
</script>
