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
          v-if="auth.isPrincipalAdmin"
          color="success"
          variant="flat"
          class="premium-chip font-weight-bold"
          elevation="0"
        >
          <v-icon start size="18">mdi-check-circle</v-icon>
          Account owner
        </v-chip>
        <v-chip
          v-else
          color="info"
          variant="flat"
          class="premium-chip font-weight-bold"
          elevation="0"
        >
          <v-icon start size="18">mdi-shield-account-outline</v-icon>
          Delegated access
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

          <!-- InstaConnect card (per-user digital business card) -->
          <v-card class="premium-card mb-8">
            <div class="p-8 border-b border-slate-100 d-flex align-center">
              <div class="icon-orb mr-4 bg-indigo-50">
                <v-icon color="indigo" size="24">mdi-cellphone-arrow-down</v-icon>
              </div>
              <div class="flex-grow-1">
                <h2 class="text-h6 font-weight-bold">InstaConnect</h2>
                <p class="text-caption text-slate-500 mb-0">
                  Install the InstaConnect app on your phone. From the app you can share your card with clients in person — they save your contact and send you theirs.
                </p>
              </div>
              <v-switch
                v-model="instaForm.enabled"
                color="primary"
                hide-details
                density="compact"
                @update:model-value="saveInstaSettings"
              />
            </div>

            <v-card-text class="p-8">
              <v-row>
                <v-col cols="12" md="7">
                  <v-text-field
                    v-model="instaForm.slug"
                    label="Public handle"
                    variant="outlined"
                    density="comfortable"
                    :prefix="instaUrlPrefix"
                    hint="Lowercase letters, numbers and hyphens. 3–64 chars."
                    persistent-hint
                    class="mb-3"
                  />
                  <v-text-field
                    v-model="instaForm.headline"
                    label="Headline (e.g. Real Estate Agent)"
                    variant="outlined"
                    density="comfortable"
                    class="mb-3"
                  />
                  <v-text-field
                    v-model="instaForm.company"
                    label="Company / brokerage (optional)"
                    variant="outlined"
                    density="comfortable"
                    class="mb-3"
                  />
                  <v-text-field
                    v-model="instaForm.primaryColor"
                    label="Brand color"
                    variant="outlined"
                    density="comfortable"
                    placeholder="#1976D2"
                    class="mb-4"
                  >
                    <template #append-inner>
                      <div
                        class="insta-color-swatch"
                        :style="{ background: instaForm.primaryColor || '#1976D2' }"
                      />
                    </template>
                  </v-text-field>

                  <div class="d-flex flex-wrap gap-2">
                    <v-btn
                      color="primary"
                      :loading="instaSaving"
                      class="action-btn-primary px-6"
                      @click="saveInstaSettings"
                    >
                      Save
                    </v-btn>
                    <v-btn
                      v-if="instaSettings?.publicPath"
                      variant="outlined"
                      class="action-btn-outline px-4"
                      :href="instaSettings.publicPath"
                      target="_blank"
                      prepend-icon="mdi-eye-outline"
                    >
                      Preview customer view
                    </v-btn>
                  </div>
                </v-col>

                <v-col cols="12" md="5">
                  <div class="insta-qr-card">
                    <div class="insta-qr-tag">
                      <v-icon size="14" color="primary" class="mr-1">mdi-cellphone</v-icon>
                      Install on your phone
                    </div>
                    <div v-if="instaInstallQrDataUrl" class="insta-qr-img-wrap">
                      <img :src="instaInstallQrDataUrl" alt="Install QR code" class="insta-qr-img" />
                    </div>
                    <div v-else class="insta-qr-placeholder">
                      <v-icon size="40" color="grey-lighten-1">mdi-qrcode</v-icon>
                      <span class="text-caption text-slate-500 mt-2">
                        Save settings to generate a QR
                      </span>
                    </div>
                    <p class="text-caption text-slate-500 text-center mb-3 px-3">
                      Scan with your phone camera to install the InstaConnect app. Once installed, open it to share your card with clients in person.
                    </p>
                    <v-btn
                      block
                      variant="tonal"
                      color="primary"
                      :disabled="!instaInstallQrDataUrl"
                      prepend-icon="mdi-download"
                      @click="downloadInstaQr"
                    >
                      Download install QR
                    </v-btn>
                  </div>
                </v-col>
              </v-row>

              <v-divider class="my-6" />

              <div class="d-flex align-center mb-3">
                <h3 class="text-subtitle-1 font-weight-bold">Recent captures</h3>
                <v-spacer />
                <v-btn
                  size="small"
                  variant="text"
                  color="primary"
                  to="/admin/lead-generation?tab=instaconnect"
                  append-icon="mdi-arrow-right"
                >
                  Review all
                </v-btn>
              </div>
              <div v-if="instaCapturesLoading" class="text-caption text-slate-500">Loading…</div>
              <div v-else-if="instaCaptures.length === 0" class="insta-empty">
                <v-icon size="32" color="grey-lighten-1">mdi-inbox-outline</v-icon>
                <p class="text-caption text-slate-500 mt-2 mb-0">
                  No captures yet. Share your QR to start collecting contacts.
                </p>
              </div>
              <v-list v-else density="compact" class="rounded-lg">
                <v-list-item
                  v-for="c in instaCaptures"
                  :key="c.id"
                  class="insta-capture-row"
                >
                  <template #prepend>
                    <v-avatar size="36" color="primary" variant="tonal">
                      <span class="text-caption font-weight-bold">
                        {{ initials(c.firstName, c.lastName) }}
                      </span>
                    </v-avatar>
                  </template>
                  <v-list-item-title class="font-weight-bold">
                    {{ c.firstName }} {{ c.lastName }}
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-caption">
                    {{ c.email }} · {{ c.phone }}
                    <span v-if="c.company"> · {{ c.company }}</span>
                  </v-list-item-subtitle>
                  <template #append>
                    <v-chip
                      size="x-small"
                      :color="captureStatusColor(c.status)"
                      variant="tonal"
                      class="font-weight-bold mr-2"
                    >
                      {{ c.status }}
                    </v-chip>
                    <v-btn
                      v-if="c.status === 'pending'"
                      size="small"
                      color="success"
                      variant="tonal"
                      @click="acceptCapture(c.id)"
                    >
                      Accept
                    </v-btn>
                  </template>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>

          <v-card v-if="auth.isPrincipalAdmin" class="premium-card mb-8">
            <div class="p-8 border-b border-slate-100 d-flex align-center">
              <div class="icon-orb mr-4 bg-teal-50">
                <v-icon color="teal" size="24">mdi-account-supervisor</v-icon>
              </div>
              <div>
                <h2 class="text-h6 font-weight-bold">Team admin access</h2>
                <p class="text-caption text-slate-500 mb-0">
                  Grant assistants access to the admin panel and set permissions per product area (CRM, CMA, Facebook, etc.).
                </p>
              </div>
            </div>
            <v-card-text class="p-8">
              <v-select
                v-model="delegationUserId"
                :items="assistants"
                item-title="label"
                item-value="id"
                label="Team member"
                variant="outlined"
                density="comfortable"
                clearable
                :loading="delegationLoading"
                class="mb-2"
                hint="Users on your team (standard accounts only). Create one below if the list is empty."
                persistent-hint
              />
              <div class="d-flex flex-wrap align-center gap-2 mb-6">
                <v-btn
                  color="primary"
                  variant="tonal"
                  prepend-icon="mdi-account-plus"
                  @click="openAddTeamMemberDialog"
                >
                  Add team member
                </v-btn>
                <v-btn
                  variant="text"
                  color="primary"
                  size="small"
                  prepend-icon="mdi-open-in-new"
                  to="/admin/users"
                >
                  User management
                </v-btn>
              </div>
              <template v-if="delegationUserId">
                <p class="text-body-2 text-slate-600 mb-4">
                  Read: view and lists. Write: create. Edit: update. Delete: remove records.
                </p>
                <v-expansion-panels variant="accordion" multiple>
                  <v-expansion-panel
                    v-for="key in delegationFeatureKeys"
                    :key="key"
                    :title="delegationLabel(key)"
                  >
                    <v-expansion-panel-text>
                      <div class="d-flex flex-wrap gap-2 align-center">
                        <v-checkbox
                          v-model="delegationPerm[key].read"
                          label="Read"
                          hide-details
                          density="compact"
                        />
                        <v-checkbox
                          v-model="delegationPerm[key].write"
                          label="Write"
                          hide-details
                          density="compact"
                        />
                        <v-checkbox
                          v-model="delegationPerm[key].edit"
                          label="Edit"
                          hide-details
                          density="compact"
                        />
                        <v-checkbox
                          v-model="delegationPerm[key].delete"
                          label="Delete"
                          hide-details
                          density="compact"
                        />
                        <v-spacer />
                        <v-btn size="small" variant="tonal" @click="setDelegationRowAll(key, true)">All</v-btn>
                        <v-btn size="small" variant="text" @click="setDelegationRowAll(key, false)">Clear</v-btn>
                      </div>
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                </v-expansion-panels>

                <v-divider class="my-8" />
                <h3 class="text-subtitle-1 font-weight-bold mb-2">Hide specific users</h3>
                <p class="text-body-2 text-slate-600 mb-4">
                  Accounts you add here stay on your team but are hidden from this assistant in user management,
                  contact search, and related actions (e.g. high-profile clients).
                </p>
                <v-select
                  v-model="exclusionIds"
                  :items="tenantUserOptions"
                  item-title="title"
                  item-value="value"
                  label="Excluded users"
                  variant="outlined"
                  multiple
                  chips
                  closable-chips
                  density="comfortable"
                  class="mb-4"
                />
                <v-btn
                  variant="tonal"
                  color="secondary"
                  :loading="exclusionSaving"
                  :disabled="!delegationUserId"
                  class="mb-6"
                  @click="saveDelegationExclusions"
                >
                  Save exclusion list
                </v-btn>

                <div class="d-flex flex-wrap gap-3 mt-2">
                  <v-btn
                    color="primary"
                    :loading="delegationSaving"
                    @click="saveDelegationMatrix"
                  >
                    Save access
                  </v-btn>
                  <v-btn
                    color="error"
                    variant="tonal"
                    :loading="delegationSaving"
                    @click="revokeDelegationAccess"
                  >
                    Revoke all
                  </v-btn>
                </div>
              </template>
              <v-alert v-else type="info" variant="tonal" density="comfortable" class="mb-0">
                <span v-if="assistants.length === 0">
                  No standard team accounts yet. Use <strong>Add team member</strong> to create one with a login, then choose them above to grant admin access.
                </span>
                <span v-else>
                  Select a team member to configure delegated admin permissions.
                </span>
              </v-alert>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Add team member (standard user on your tenant) -->
    <v-dialog v-model="showAddTeamMemberDialog" max-width="520" persistent>
      <v-card class="premium-card">
        <div class="p-6 border-b border-slate-100 d-flex align-center justify-space-between">
          <div>
            <div class="text-overline text-slate-500 letter-spacing-1 mb-1">Team</div>
            <h2 class="text-h6 font-weight-bold mb-0">Add team member</h2>
            <p class="text-caption text-slate-500 mb-0">
              Creates a <strong>standard</strong> account on your team. They can sign in with this email and password; then you can assign admin permissions.
            </p>
          </div>
          <v-btn icon="mdi-close" variant="text" @click="showAddTeamMemberDialog = false" />
        </div>
        <v-card-text class="pa-6 pt-4">
          <v-form v-model="isAddTeamMemberFormValid">
            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="addTeamMemberForm.firstName"
                  label="First name"
                  variant="outlined"
                  density="comfortable"
                  :rules="[(v: string) => !!v || 'Required']"
                  required
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="addTeamMemberForm.lastName"
                  label="Last name"
                  variant="outlined"
                  density="comfortable"
                  :rules="[(v: string) => !!v || 'Required']"
                  required
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="addTeamMemberForm.email"
                  label="Email"
                  type="email"
                  variant="outlined"
                  density="comfortable"
                  :rules="emailRules"
                  required
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="addTeamMemberForm.phone"
                  label="Phone (optional)"
                  variant="outlined"
                  density="comfortable"
                  :rules="phoneRules"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="addTeamMemberForm.password"
                  label="Initial password"
                  type="password"
                  variant="outlined"
                  density="comfortable"
                  :rules="passwordRules"
                  hint="At least 8 characters. They can change it after signing in."
                  persistent-hint
                  required
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions class="px-6 pb-6 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="showAddTeamMemberDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="addTeamMemberSaving"
            :disabled="!isAddTeamMemberFormValid"
            @click="submitAddTeamMember"
          >
            Create & select
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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
import { ref, reactive, computed, onMounted, watch } from 'vue'
// @ts-ignore
import { api } from '~/utils/api'
import { useAuthStore } from '~/stores/auth'
import {
  DELEGATION_FEATURE_LABELS,
  DELEGATION_FEATURE_ORDER,
} from '~/utils/delegatedAdminClient'
import { generateQrDataUrl, downloadDataUrl } from '~/utils/qr'

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

type PermRow = { read: boolean; write: boolean; edit: boolean; delete: boolean }

const delegationFeatureKeys = DELEGATION_FEATURE_ORDER
const delegationLabel = (k: string) => DELEGATION_FEATURE_LABELS[k] || k

const assistants = ref<
  { id: number; email: string; firstName: string; lastName: string; label?: string }[]
>([])
const delegationUserId = ref<number | null>(null)
const delegationLoading = ref(false)
const delegationSaving = ref(false)
const exclusionIds = ref<number[]>([])
const tenantUserOptions = ref<{ title: string; value: number }[]>([])
const exclusionSaving = ref(false)

const showAddTeamMemberDialog = ref(false)
const addTeamMemberSaving = ref(false)
const isAddTeamMemberFormValid = ref(false)
const addTeamMemberForm = reactive({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
})

// ── InstaConnect ──
interface InstaSettings {
  slug: string | null
  enabled: boolean
  branding: {
    headline?: string | null
    company?: string | null
    primaryColor?: string | null
    coverImage?: string | null
    socialLinks?: Array<{ icon?: string | null; name: string; url: string }>
  }
  shareUrl: string | null
  publicPath: string | null
  manifestPath: string | null
  vcardPath: string | null
}

const instaSettings = ref<InstaSettings | null>(null)
const instaSaving = ref(false)
const instaInstallQrDataUrl = ref<string | null>(null)
const instaCaptures = ref<any[]>([])
const instaCapturesLoading = ref(false)

const instaForm = reactive({
  slug: '',
  enabled: true,
  headline: '',
  company: '',
  primaryColor: '#1976D2',
})

const instaUrlPrefix = computed(() => {
  if (process.client) return `${window.location.origin}/connect/`
  return '/connect/'
})

// Customer-facing card URL — used for "Preview customer view".
const instaShareUrl = computed(() => {
  if (!instaSettings.value?.publicPath) return ''
  if (process.client) return `${window.location.origin}${instaSettings.value.publicPath}`
  return instaSettings.value.publicPath
})

// URL the admin scans on their own phone to install the PWA. This points at the
// agent-facing /me page where the manifest is linked.
const instaInstallUrl = computed(() => {
  if (!instaSettings.value?.slug) return ''
  const path = `/connect/${instaSettings.value.slug}/me`
  if (process.client) return `${window.location.origin}${path}`
  return path
})

async function loadInstaSettings() {
  try {
    const res: any = await api.get('/api/admin/insta-connect/settings')
    instaSettings.value = res
    instaForm.slug = res.slug || ''
    instaForm.enabled = !!res.enabled
    instaForm.headline = res.branding?.headline || ''
    instaForm.company = res.branding?.company || ''
    instaForm.primaryColor = res.branding?.primaryColor || '#1976D2'
    await rebuildInstaQr()
  } catch (e) {
    console.error('Failed to load InstaConnect settings', e)
  }
}

async function rebuildInstaQr() {
  if (!instaInstallUrl.value) {
    instaInstallQrDataUrl.value = null
    return
  }
  try {
    instaInstallQrDataUrl.value = await generateQrDataUrl(instaInstallUrl.value, {
      size: 480,
      color: { dark: '#0F172A', light: '#FFFFFF' },
    })
  } catch (e) {
    console.error('QR generation failed', e)
  }
}

async function saveInstaSettings() {
  instaSaving.value = true
  try {
    const res: any = await api.put('/api/admin/insta-connect/settings', {
      slug: instaForm.slug || null,
      enabled: instaForm.enabled,
      branding: {
        headline: instaForm.headline || null,
        company: instaForm.company || null,
        primaryColor: instaForm.primaryColor || null,
      },
    })
    instaSettings.value = { ...(instaSettings.value || ({} as InstaSettings)), ...res }
    instaForm.slug = res.slug || ''
    await rebuildInstaQr()
    showToast('InstaConnect settings saved')
  } catch (e: any) {
    showToast(e?.data?.statusMessage || e?.statusMessage || 'Could not save', 'error')
  } finally {
    instaSaving.value = false
  }
}

function downloadInstaQr() {
  if (!instaInstallQrDataUrl.value || !instaSettings.value?.slug) return
  downloadDataUrl(instaInstallQrDataUrl.value, `${instaSettings.value.slug}-instaconnect-install.png`)
}

async function loadInstaCaptures() {
  instaCapturesLoading.value = true
  try {
    const res: any = await api.get('/api/admin/insta-connect/captures?limit=5')
    instaCaptures.value = res.captures || []
  } catch (e) {
    console.error('Failed to load captures', e)
  } finally {
    instaCapturesLoading.value = false
  }
}

async function acceptCapture(id: number) {
  try {
    await api.post(`/api/admin/insta-connect/captures/${id}/accept`, {})
    await loadInstaCaptures()
    showToast('Promoted to CRM')
  } catch (e: any) {
    showToast(e?.data?.statusMessage || 'Could not accept', 'error')
  }
}

function captureStatusColor(s: string): string {
  return s === 'pending' ? 'warning' : s === 'accepted' ? 'success' : 'grey'
}

function initials(first?: string | null, last?: string | null): string {
  const f = (first || '').charAt(0)
  const l = (last || '').charAt(0)
  return (f + l).toUpperCase() || 'U'
}

const delegationPerm = reactive<Record<string, PermRow>>({})

function emptyPerm(): PermRow {
  return { read: false, write: false, edit: false, delete: false }
}

function resetDelegationMatrix() {
  for (const key of DELEGATION_FEATURE_ORDER) {
    delegationPerm[key] = emptyPerm()
  }
}
resetDelegationMatrix()

function openAddTeamMemberDialog() {
  addTeamMemberForm.firstName = ''
  addTeamMemberForm.lastName = ''
  addTeamMemberForm.email = ''
  addTeamMemberForm.phone = ''
  addTeamMemberForm.password = ''
  showAddTeamMemberDialog.value = true
}

async function submitAddTeamMember() {
  if (!isAddTeamMemberFormValid.value) return
  addTeamMemberSaving.value = true
  try {
    const created: any = await api.post('/api/admin/users', {
      firstName: addTeamMemberForm.firstName.trim(),
      lastName: addTeamMemberForm.lastName.trim(),
      email: addTeamMemberForm.email.trim(),
      phone: addTeamMemberForm.phone.trim() || null,
      password: addTeamMemberForm.password,
      role: 'user',
      status: 'active',
    })
    showAddTeamMemberDialog.value = false
    await loadAssistantsList()
    const id = Number(created?.id)
    if (Number.isInteger(id)) {
      delegationUserId.value = id
    }
    showToast('Team member created. Set their admin access below.')
  } catch (e: any) {
    const msg =
      e?.data?.statusMessage ||
      e?.statusMessage ||
      e?.message ||
      'Could not create team member'
    showToast(msg, 'error')
  } finally {
    addTeamMemberSaving.value = false
  }
}

async function loadAssistantsList() {
  if (!auth.isPrincipalAdmin) return
  delegationLoading.value = true
  try {
    const data: any = await api.get('/api/admin/delegation/assistants')
    const list = data.assistants || []
    assistants.value = list.map((a: any) => ({
      ...a,
      label:
        `${a.firstName || ''} ${a.lastName || ''}`.trim() + ` (${a.email})`,
    }))
  } catch (e) {
    console.error(e)
    showToast('Could not load team members', 'error')
  } finally {
    delegationLoading.value = false
  }
}

async function loadTenantUserOptions() {
  if (!auth.isPrincipalAdmin || !delegationUserId.value) {
    tenantUserOptions.value = []
    return
  }
  try {
    const rows: any[] = await api.get('/api/admin/users')
    const sid = delegationUserId.value
    tenantUserOptions.value = rows
      .filter((u: any) => u.id !== sid)
      .map((u: any) => ({
        value: u.id,
        title:
          `${u.firstName || ''} ${u.lastName || ''}`.trim() + ` (${u.email})`,
      }))
  } catch (e) {
    console.error(e)
    tenantUserOptions.value = []
  }
}

watch(delegationUserId, async (id) => {
  resetDelegationMatrix()
  exclusionIds.value = []
  tenantUserOptions.value = []
  if (!id) return
  try {
    const data: any = await api.get(`/api/admin/delegation/${id}`)
    const raw = data.delegatedAdminPermissions
    if (raw && typeof raw === 'object') {
      for (const key of DELEGATION_FEATURE_ORDER) {
        const p = (raw as Record<string, unknown>)[key]
        if (p && typeof p === 'object' && p !== null && !Array.isArray(p)) {
          const o = p as Record<string, unknown>
          delegationPerm[key] = {
            read: Boolean(o.read),
            write: Boolean(o.write),
            edit: Boolean(o.edit),
            delete: Boolean(o.delete),
          }
        }
      }
    }
    const ex = data.delegationExcludedUserIds
    exclusionIds.value = Array.isArray(ex) ? ex.map((n: unknown) => Number(n)).filter((n) => Number.isInteger(n)) : []
    await loadTenantUserOptions()
  } catch (e) {
    showToast('Could not load permissions', 'error')
  }
})

function setDelegationRowAll(key: string, on: boolean) {
  delegationPerm[key] = {
    read: on,
    write: on,
    edit: on,
    delete: on,
  }
}

async function saveDelegationMatrix() {
  if (!delegationUserId.value) return
  delegationSaving.value = true
  try {
    const permissions: Record<string, PermRow> = {}
    for (const key of DELEGATION_FEATURE_ORDER) {
      const r = delegationPerm[key]
      if (r?.read || r?.write || r?.edit || r?.delete) {
        permissions[key] = { ...r }
      }
    }
    await api.put(`/api/admin/delegation/${delegationUserId.value}`, { permissions })
    showToast('Team access saved')
  } catch (e) {
    showToast('Failed to save access', 'error')
  } finally {
    delegationSaving.value = false
  }
}

async function revokeDelegationAccess() {
  if (!delegationUserId.value) return
  delegationSaving.value = true
  try {
    await api.put(`/api/admin/delegation/${delegationUserId.value}`, {
      permissions: null,
    })
    await api.put(`/api/admin/delegation/${delegationUserId.value}/exclusions`, {
      excludedUserIds: [],
    })
    resetDelegationMatrix()
    exclusionIds.value = []
    showToast('Delegated admin access removed')
  } catch (e) {
    showToast('Failed to revoke access', 'error')
  } finally {
    delegationSaving.value = false
  }
}

async function saveDelegationExclusions() {
  if (!delegationUserId.value) return
  exclusionSaving.value = true
  try {
    await api.put(`/api/admin/delegation/${delegationUserId.value}/exclusions`, {
      excludedUserIds: exclusionIds.value,
    })
    showToast('Exclusion list saved')
  } catch (e) {
    showToast('Failed to save exclusions', 'error')
  } finally {
    exclusionSaving.value = false
  }
}

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
  await loadAssistantsList()
  await loadInstaSettings()
  await loadInstaCaptures()
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

.bg-teal-50 {
  background: rgba(0, 150, 136, 0.1) !important;
}

.bg-indigo-50 {
  background: rgba(67, 56, 202, 0.1) !important;
}

/* InstaConnect */
.insta-color-swatch {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid #E2E8F0;
}

.insta-qr-card {
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.insta-qr-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #EEF2FF;
  color: #1D4ED8;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  margin-bottom: 12px;
}

.insta-qr-img-wrap {
  background: white;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid #E2E8F0;
  margin-bottom: 12px;
}

.insta-qr-img {
  width: 180px;
  height: 180px;
  display: block;
  image-rendering: pixelated;
}

.insta-qr-placeholder {
  background: white;
  width: 100%;
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: 1px dashed #CBD5E1;
  margin-bottom: 12px;
}

.insta-empty {
  background: #F8FAFC;
  border: 1px dashed #CBD5E1;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
}

.insta-capture-row {
  border: 1px solid #F1F5F9;
  border-radius: 12px;
  margin-bottom: 6px;
  background: white;
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

