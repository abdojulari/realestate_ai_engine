<template>
  <div class="premium-profile-wrapper bg-[#F8FAFC] min-h-screen">
    <!-- TOP NAVIGATION BAR (PREMIUM LOOK) -->
    <div class="header-glass sticky top-0 z-50 px-8 py-4 border-b border-slate-200 backdrop-blur-md bg-white/80">
      <div class="max-w-[1600px] mx-auto d-flex align-center">
        <div>
          <div class="flex items-center space-x-2 mb-0">
            <span class="text-[10px] uppercase tracking-[0.3em] font-bold text-primary">Account Management</span>
          </div>
          <h1 class="text-h4 font-serif text-slate-900 font-weight-bold">Admin Profile</h1>
        </div>
        <v-spacer />
        <v-chip 
          color="success" 
          variant="flat" 
          class="premium-chip font-weight-bold"
          elevation="0"
        >
          <v-icon start size="18">mdi-check-circle</v-icon>
          Active Admin
        </v-chip>
      </div>
    </div>

    <v-container fluid class="max-w-[1600px] px-8 pt-8 pb-16">
      <v-row>
        <!-- LEFT SECTION: Profile Info & Avatar -->
        <v-col cols="12" lg="4">
          <v-card class="premium-card mb-8">
            <div class="p-8 text-center">
              <div class="avatar-container mx-auto mb-6">
                <v-avatar size="120" class="avatar-premium">
                  <v-img
                    :src="profileForm.avatar || '/images/default-avatar.png'"
                    alt="Profile Picture"
                  />
                </v-avatar>
                <v-btn
                  icon="mdi-camera"
                  size="small"
                  color="primary"
                  class="avatar-edit-btn"
                  @click="triggerAvatarUpload"
                />
              </div>
              
              <h2 class="text-h5 font-weight-bold mb-1">{{ profileForm.firstName }} {{ profileForm.lastName }}</h2>
              <p class="text-caption text-slate-500 font-weight-medium mb-4">{{ profileForm.email }}</p>
              
              <v-chip
                color="primary"
                variant="tonal"
                size="small"
                class="mb-6 font-weight-bold"
              >
                {{ profileForm.role?.toUpperCase() || 'ADMIN' }}
              </v-chip>

              <v-divider class="mb-6" />

              <div class="stats-mini mb-4">
                <div class="stat-mini-item">
                  <div class="stat-mini-value">{{ stats.totalLogins || 0 }}</div>
                  <div class="stat-mini-label">Total Logins</div>
                </div>
                <div class="stat-mini-item">
                  <div class="stat-mini-value">{{ stats.lastLogin || 'Today' }}</div>
                  <div class="stat-mini-label">Last Login</div>
                </div>
              </div>

              <input
                ref="avatarInput"
                type="file"
                accept="image/*"
                style="display: none"
                @change="handleAvatarUpload"
              />
            </div>
          </v-card>

          <!-- Quick Actions Card -->
          <v-card class="premium-card">
            <div class="p-6 border-b border-slate-100">
              <h3 class="text-subtitle-1 font-weight-bold">Quick Actions</h3>
            </div>
            <v-list class="p-2">
              <v-list-item
                prepend-icon="mdi-key"
                title="Change Password"
                class="rounded-lg mb-1 quick-action-item"
                @click="showPasswordDialog = true"
              />
              <v-list-item
                prepend-icon="mdi-shield-lock"
                title="Two-Factor Auth"
                class="rounded-lg mb-1 quick-action-item"
                @click="show2FADialog = true"
              />
              <v-list-item
                prepend-icon="mdi-clock-outline"
                title="Activity Log"
                to="/admin/activity-log"
                class="rounded-lg quick-action-item"
              />
            </v-list>
          </v-card>
        </v-col>

        <!-- RIGHT SECTION: Profile Details -->
        <v-col cols="12" lg="8">
          <v-card class="premium-card mb-8">
            <div class="p-8 border-b border-slate-100 d-flex align-center">
              <div class="icon-orb mr-4">
                <v-icon color="primary" size="24">mdi-account-edit</v-icon>
              </div>
              <h2 class="text-h6 font-weight-bold">Personal Information</h2>
            </div>

            <v-card-text class="p-8">
              <v-form v-model="isProfileFormValid" @submit.prevent="saveProfile">
                <v-row>
                  <v-col cols="12" md="6">
                    <v-text-field density="compact"
                      v-model="profileForm.firstName"
                      label="First Name"
                      :rules="[v => !!v || 'First name is required']"
                      variant="outlined"
                      rounded="lg"
                      class="premium-input"
                      required
                    />
                  </v-col>

                  <v-col cols="12" md="6">
                    <v-text-field density="compact"
                      v-model="profileForm.lastName"
                      label="Last Name"
                      :rules="[v => !!v || 'Last name is required']"
                      variant="outlined"
                      rounded="lg"
                      class="premium-input"
                      required
                    />
                  </v-col>

                  <v-col cols="12" md="6">
                    <v-text-field density="compact"
                      v-model="profileForm.email"
                      label="Email Address"
                      type="email"
                      :rules="emailRules"
                      variant="outlined"
                      rounded="lg"
                      class="premium-input"
                      required
                    />
                  </v-col>

                  <v-col cols="12" md="6">
                    <v-text-field density="compact"
                      v-model="profileForm.phone"
                      label="Phone Number"
                      :rules="phoneRules"
                      variant="outlined"
                      rounded="lg"
                      class="premium-input"
                    />
                  </v-col>

                  <v-col cols="12">
                    <v-textarea density="compact"
                      v-model="profileForm.bio"
                      label="Bio / About Me"
                      rows="4"
                      variant="outlined"
                      rounded="lg"
                      class="premium-input"
                      hint="Tell us a bit about yourself"
                      persistent-hint
                    />
                  </v-col>
                </v-row>
              </v-form>
            </v-card-text>

            <v-card-actions class="px-8 pb-8">
              <v-spacer />
              <v-btn
                variant="outlined"
                class="action-btn-outline px-6"
                @click="resetProfileForm"
              >
                Cancel
              </v-btn>
              <v-btn
                color="primary"
                :loading="saving"
                :disabled="!isProfileFormValid"
                @click="saveProfile"
                class="action-btn-primary px-8"
              >
                Save Changes
              </v-btn>
            </v-card-actions>
          </v-card>

          <!-- Preferences Card -->
          <v-card class="premium-card">
            <div class="p-8 border-b border-slate-100 d-flex align-center">
              <div class="icon-orb mr-4 bg-purple-50">
                <v-icon color="purple" size="24">mdi-cog</v-icon>
              </div>
              <h2 class="text-h6 font-weight-bold">Preferences</h2>
            </div>

            <v-card-text class="p-8">
              <v-row>
                <v-col cols="12" md="6">
                  <v-select density="compact"
                    v-model="preferencesForm.timezone"
                    :items="timezones"
                    label="Timezone"
                    variant="outlined"
                    rounded="lg"
                    class="premium-input"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-select density="compact"
                    v-model="preferencesForm.language"
                    :items="languages"
                    label="Language"
                    variant="outlined"
                    rounded="lg"
                    class="premium-input"
                  />
                </v-col>

                <v-col cols="12">
                  <div class="p-6 bg-slate-50 rounded-xl border border-slate-100">
                    <h4 class="text-subtitle-2 font-weight-bold mb-4">Notification Preferences</h4>
                    <v-switch
                      v-model="preferencesForm.emailNotifications"
                      label="Email Notifications"
                      color="primary"
                      class="premium-switch mb-2"
                      hide-details
                    />
                    <v-switch
                      v-model="preferencesForm.pushNotifications"
                      label="Push Notifications"
                      color="primary"
                      class="premium-switch mb-2"
                      hide-details
                    />
                    <v-switch
                      v-model="preferencesForm.smsNotifications"
                      label="SMS Notifications"
                      color="primary"
                      class="premium-switch mb-0"
                      hide-details
                    />
                  </div>
                </v-col>
              </v-row>
            </v-card-text>

            <v-card-actions class="px-8 pb-8">
              <v-spacer />
              <v-btn
                color="primary"
                :loading="savingPreferences"
                @click="savePreferences"
                class="action-btn-primary px-8"
              >
                Save Preferences
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Change Password Dialog -->
    <v-dialog v-model="showPasswordDialog" max-width="500">
      <v-card class="premium-card">
        <div class="p-8 bg-slate-900 text-white">
          <h2 class="text-h5 font-serif">Change Password</h2>
          <p class="text-caption text-slate-400 mb-0">Enter your current and new password</p>
        </div>
        <v-card-text class="p-8">
          <v-form v-model="isPasswordFormValid">
            <v-text-field density="compact"
              v-model="passwordForm.currentPassword"
              label="Current Password"
              type="password"
              :rules="[v => !!v || 'Current password is required']"
              variant="outlined"
              rounded="lg"
              class="premium-input mb-4"
              required
            />
            <v-text-field density="compact"
              v-model="passwordForm.newPassword"
              label="New Password"
              type="password"
              :rules="passwordRules"
              variant="outlined"
              rounded="lg"
              class="premium-input mb-4"
              required
            />
            <v-text-field density="compact"
              v-model="passwordForm.confirmPassword"
              label="Confirm New Password"
              type="password"
              :rules="[
                v => !!v || 'Please confirm password',
                v => v === passwordForm.newPassword || 'Passwords do not match'
              ]"
              variant="outlined"
              rounded="lg"
              class="premium-input"
              required
            />
          </v-form>
        </v-card-text>
        <v-card-actions class="p-8 pt-0">
          <v-spacer />
          <v-btn variant="text" class="px-6" @click="showPasswordDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="changingPassword"
            :disabled="!isPasswordFormValid"
            @click="changePassword"
            class="action-btn-primary px-8"
          >
            Change Password
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 2FA Dialog -->
    <v-dialog v-model="show2FADialog" max-width="500">
      <v-card class="premium-card">
        <div class="p-8 bg-slate-900 text-white">
          <h2 class="text-h5 font-serif">Two-Factor Authentication</h2>
          <p class="text-caption text-slate-400 mb-0">Enhance your account security</p>
        </div>
        <v-card-text class="p-8">
          <div class="text-center mb-6">
            <v-icon size="64" color="primary" class="mb-4">mdi-shield-lock</v-icon>
            <p class="text-body-1 mb-4">
              {{ twoFactorEnabled ? 'Two-factor authentication is enabled' : 'Enable two-factor authentication for added security' }}
            </p>
            <v-chip
              :color="twoFactorEnabled ? 'success' : 'warning'"
              variant="flat"
              class="premium-chip font-weight-bold"
            >
              {{ twoFactorEnabled ? 'Enabled' : 'Disabled' }}
            </v-chip>
          </div>
        </v-card-text>
        <v-card-actions class="p-8 pt-0">
          <v-spacer />
          <v-btn variant="text" class="px-6" @click="show2FADialog = false">Close</v-btn>
          <v-btn
            :color="twoFactorEnabled ? 'error' : 'primary'"
            @click="toggle2FA"
            class="action-btn-primary px-8"
          >
            {{ twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <!-- Snackbar -->
    <v-snackbar v-model="snackShow" :color="snackColor" location="top right" rounded="lg" :timeout="4000">
      <div class="d-flex align-center">
        <v-icon class="mr-2">{{ snackColor === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle' }}</v-icon>
        {{ snackMsg }}
      </div>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
// @ts-ignore
import { api } from '~/utils/api'
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()

// State
const saving = ref(false)
const savingPreferences = ref(false)
const changingPassword = ref(false)
const isProfileFormValid = ref(false)
const isPasswordFormValid = ref(false)
const showPasswordDialog = ref(false)
const show2FADialog = ref(false)
const twoFactorEnabled = ref(false)
const avatarInput = ref<HTMLInputElement | null>(null)
const snackShow = ref(false)
const snackMsg = ref('')
const snackColor = ref<'success' | 'error'>('success')
const showToast = (msg: string, color: 'success' | 'error' = 'success') => {
  snackMsg.value = msg
  snackColor.value = color
  snackShow.value = true
}

// Stats
const stats = ref({
  totalLogins: 0,
  lastLogin: ''
})

// Forms
const profileForm = reactive({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  bio: '',
  avatar: '',
  role: 'admin'
})

const preferencesForm = reactive({
  timezone: 'America/New_York',
  language: 'English',
  emailNotifications: true,
  pushNotifications: true,
  smsNotifications: false
})

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// Validation Rules
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

// Options
const timezones = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Vancouver',
  'Europe/London',
  'Europe/Paris'
]

const languages = [
  'English',
  'French',
  'Spanish',
  'German'
]

// Methods
const loadProfile = async () => {
  try {
    const data: any = await api.get('/api/admin/profile')
    Object.assign(profileForm, data.profile || {})
    Object.assign(preferencesForm, data.preferences || {})
    twoFactorEnabled.value = data.twoFactorEnabled || false
    stats.value = data.stats || stats.value
  } catch (e) {
    console.error('Failed to load profile:', e)
    // Fallback to auth store user
    if (auth.user) {
      profileForm.firstName = auth.user.firstName || ''
      profileForm.lastName = auth.user.lastName || ''
      profileForm.email = auth.user.email || ''
      profileForm.role = auth.user.role || 'admin'
    }
  }
}

const saveProfile = async () => {
  saving.value = true
  try {
    await api.put('/api/admin/profile', profileForm)
    showToast('Profile updated successfully')
  } catch (e) {
    console.error('Failed to save profile:', e)
    showToast('Failed to save profile', 'error')
  } finally {
    saving.value = false
  }
}

const savePreferences = async () => {
  savingPreferences.value = true
  try {
    await api.put('/api/admin/profile/preferences', preferencesForm)
    showToast('Preferences updated successfully')
  } catch (e) {
    console.error('Failed to save preferences:', e)
    showToast('Failed to save preferences', 'error')
  } finally {
    savingPreferences.value = false
  }
}

const changePassword = async () => {
  changingPassword.value = true
  try {
    await api.post('/api/admin/profile/change-password', {
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    })
    showPasswordDialog.value = false
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
    showToast('Password changed successfully')
  } catch (e) {
    console.error('Failed to change password:', e)
    showToast('Failed to change password', 'error')
  } finally {
    changingPassword.value = false
  }
}

const toggle2FA = async () => {
  try {
    await api.post('/api/admin/profile/toggle-2fa', { enabled: !twoFactorEnabled.value })
    twoFactorEnabled.value = !twoFactorEnabled.value
    showToast(twoFactorEnabled.value ? '2FA enabled successfully' : '2FA disabled')
  } catch (e) {
    console.error('Failed to toggle 2FA:', e)
    showToast('Failed to toggle 2FA', 'error')
  }
}

const triggerAvatarUpload = () => {
  avatarInput.value?.click()
}

const handleAvatarUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    const formData = new FormData()
    formData.append('avatar', file)
    const response: any = await api.post('/api/admin/profile/upload-avatar', formData)
    if (response?.url) {
      profileForm.avatar = response.url
    }
    showToast('Avatar uploaded successfully')
  } catch (e) {
    console.error('Failed to upload avatar:', e)
    showToast('Failed to upload avatar', 'error')
  }
}

const resetProfileForm = () => {
  loadProfile()
}

onMounted(async () => {
  // Ensure auth is ready before loading profile
  if (!auth.token && process.client) {
    const token = localStorage.getItem('token')
    if (token) {
      auth.setToken(token)
      // Give a small delay for token to be properly set
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  
  // If still no auth, the middleware should have redirected already
  if (!auth.token) {
    console.error('[Profile] No authentication token found')
    return
  }
  
  await loadProfile()
})

definePageMeta({
  layout: 'admin',
  middleware: ['admin']
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@700&display=swap');

.premium-profile-wrapper {
  font-family: 'Inter', sans-serif;
  letter-spacing: -0.01em;
  min-height: 100vh;
}

.font-serif {
  font-family: 'Playfair Display', serif;
}

.header-glass {
  backdrop-filter: blur(12px);
  background: rgba(255, 255, 255, 0.8) !important;
}

/* Card Styling */
.premium-card {
  background: white !important;
  border: 1px solid #E2E8F0 !important;
  border-radius: 20px !important;
  box-shadow: 0 4px 25px rgba(0, 0, 0, 0.03) !important;
  transition: transform 0.2s ease;
  overflow: hidden;
}

.icon-orb {
  width: 48px;
  height: 48px;
  background: rgba(25, 118, 210, 0.08);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.bg-purple-50 {
  background: rgba(156, 39, 176, 0.08) !important;
}

/* Avatar Styling */
.avatar-container {
  position: relative;
  width: 120px;
  height: 120px;
}

.avatar-premium {
  border: 4px solid #E2E8F0 !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1) !important;
}

.avatar-edit-btn {
  position: absolute !important;
  bottom: 0;
  right: 0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2) !important;
}

/* Mini Stats */
.stats-mini {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.stat-mini-item {
  padding: 16px;
  background: #F8FAFC;
  border-radius: 12px;
  border: 1px solid #F1F5F9;
}

.stat-mini-value {
  font-size: 1.25rem;
  font-weight: 800;
  color: #1976d2;
  margin-bottom: 4px;
}

.stat-mini-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #94A3B8;
  letter-spacing: 0.05em;
}

/* Quick Actions */
.quick-action-item {
  transition: all 0.2s ease;
}

.quick-action-item:hover {
  background: #F1F5F9 !important;
}

/* Inputs & Buttons */
.premium-input :deep(.v-field__outline) {
  --v-field-border-opacity: 0.1;
  border-radius: 12px !important;
}

.premium-input :deep(.v-field) {
  border-radius: 12px !important;
}

.action-btn-primary {
  background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%) !important;
  color: white !important;
  border-radius: 12px !important;
  height: 52px !important;
  font-weight: 700 !important;
  text-transform: none !important;
  letter-spacing: 0.02em !important;
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.2) !important;
  transition: all 0.2s ease !important;
}

.action-btn-primary:hover {
  box-shadow: 0 6px 20px rgba(25, 118, 210, 0.3) !important;
  transform: translateY(-1px);
}

.action-btn-outline {
  border: 2px solid #E2E8F0 !important;
  border-radius: 12px !important;
  height: 52px !important;
  text-transform: none !important;
  font-weight: 700 !important;
  color: #475569 !important;
}

.premium-chip {
  height: 36px !important;
  font-size: 0.75rem !important;
  letter-spacing: 0.02em !important;
  border-radius: 10px !important;
}

.premium-switch :deep(.v-selection-control) {
  min-height: 40px !important;
}

/* Utility Classes */
.bg-slate-50 {
  background: #F8FAFC !important;
}

.border-slate-100 {
  border-color: #F1F5F9 !important;
}

.border-slate-200 {
  border-color: #E2E8F0 !important;
}

.text-slate-400 {
  color: #94A3B8 !important;
}

.text-slate-500 {
  color: #64748B !important;
}

.text-slate-900 {
  color: #0F172A !important;
}

.rounded-lg {
  border-radius: 12px !important;
}

.rounded-xl {
  border-radius: 16px !important;
}

.sticky {
  position: sticky;
}

.top-0 {
  top: 0;
}

.z-50 {
  z-index: 50;
}

@media (max-width: 960px) {
  .header-glass {
    padding: 16px !important;
  }
  
  .premium-card .p-8 {
    padding: 24px !important;
  }
}
</style>

