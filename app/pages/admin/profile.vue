<template>
  <div class="premium-profile-wrapper min-h-screen">
    <!-- Decorative aurora background (purely visual, behind everything) -->
    <div class="aurora-bg" aria-hidden="true">
      <span class="aurora aurora--a" />
      <span class="aurora aurora--b" />
      <span class="aurora aurora--c" />
    </div>

    <!-- TOP NAVIGATION BAR -->
    <div class="header-glass sticky top-0 z-50 px-8 py-4">
      <div class="max-w-[1600px] mx-auto d-flex align-center">
        <div>
          <div class="eyebrow mb-1">Account · Profile</div>
          <h1 class="font-serif" style="font-size: 22px; line-height: 1.2; margin: 0;">
            Admin Profile
          </h1>
        </div>
        <v-spacer />
        <v-chip
          v-if="auth.isPrincipalAdmin"
          variant="flat"
          class="premium-chip"
          elevation="0"
        >
          <v-icon start size="13">mdi-check-circle-outline</v-icon>
          Account owner
        </v-chip>
        <v-chip
          v-else
          variant="flat"
          class="premium-chip"
          elevation="0"
        >
          <v-icon start size="13">mdi-shield-account-outline</v-icon>
          Delegated access
        </v-chip>
      </div>
    </div>

    <v-container fluid class="max-w-[1600px] px-8 pt-8 pb-16">
      <v-row>
        <!-- LEFT SECTION: Profile Info & Avatar -->
        <v-col cols="12" lg="4">
          <v-card class="premium-card mb-6">
            <div class="p-8 text-center">
              <div class="avatar-container mx-auto" style="position: relative;">
                <v-avatar size="88" class="avatar-premium">
                  <v-img
                    :src="profileForm.avatar || '/images/default-avatar.png'"
                    alt="Profile Picture"
                  />
                </v-avatar>
                <v-btn
                  icon="mdi-camera"
                  size="x-small"
                  variant="flat"
                  class="avatar-edit-btn"
                  @click="triggerAvatarUpload"
                />
              </div>

              <h2 class="identity-name">{{ profileForm.firstName }} {{ profileForm.lastName }}</h2>
              <p class="identity-email">{{ profileForm.email }}</p>

              <span class="identity-role">
                {{ (profileForm.role || 'admin').replace(/_/g, ' ') }}
              </span>

              <div class="stats-mini">
                <div class="stat-mini-item">
                  <div class="stat-mini-value">{{ stats.totalLogins || 0 }}</div>
                  <div class="stat-mini-label">Total logins</div>
                </div>
                <div class="stat-mini-item">
                  <div class="stat-mini-value">{{ stats.lastLogin || 'Today' }}</div>
                  <div class="stat-mini-label">Last login</div>
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
            <div class="p-6 border-b border-slate-100 d-flex align-center">
              <div class="icon-orb icon-orb--sm">
                <v-icon size="13">mdi-flash-outline</v-icon>
              </div>
              <h3 class="text-subtitle-1 mb-0">Quick actions</h3>
            </div>
            <v-list class="pa-2 bg-transparent">
              <v-list-item
                prepend-icon="mdi-tune-variant"
                title="Preferences"
                subtitle="Timezone, language & notifications"
                class="rounded-lg mb-1 quick-action-item"
                @click="showPreferencesDialog = true"
              />
              <v-list-item
                v-if="auth.isPrincipalAdmin"
                prepend-icon="mdi-account-supervisor"
                title="Team admin access"
                subtitle="Delegate permissions to teammates"
                class="rounded-lg mb-1 quick-action-item"
                @click="showDelegationDialog = true"
              />
              <v-divider class="my-2 opacity-40" />
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
          <v-card class="premium-card mb-6">
            <div class="p-6 border-b border-slate-100 d-flex align-center">
              <div class="icon-orb">
                <v-icon size="15">mdi-account-edit-outline</v-icon>
              </div>
              <div>
                <div class="eyebrow" style="margin-bottom: 2px;">Identity</div>
                <h2 class="text-h6">Personal information</h2>
              </div>
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

            <v-card-actions class="px-6 pb-6 pt-0">
              <v-spacer />
              <v-btn
                variant="outlined"
                class="action-btn-outline"
                @click="resetProfileForm"
              >
                Cancel
              </v-btn>
              <v-btn
                :loading="saving"
                :disabled="!isProfileFormValid"
                class="action-btn-primary ml-2"
                @click="saveProfile"
              >
                Save changes
              </v-btn>
            </v-card-actions>
          </v-card>

          <!-- InstaConnect card (per-user digital business card) -->
          <v-card class="premium-card mb-6">
            <div class="p-6 border-b border-slate-100 d-flex align-center">
              <div class="icon-orb">
                <v-icon size="15">mdi-cellphone-arrow-down</v-icon>
              </div>
              <div class="flex-grow-1">
                <div class="eyebrow" style="margin-bottom: 2px;">Digital card</div>
                <h2 class="text-h6">InstaConnect</h2>
                <p class="text-caption mb-0" style="margin-top: 4px; max-width: 540px;">
                  Install the InstaConnect app on your phone. From the app you can share your card with clients in person — they save your contact and send you theirs.
                </p>
              </div>
              <v-switch
                v-model="instaForm.enabled"
                color="primary"
                hide-details
                density="compact"
                class="premium-switch ml-3"
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
                      :loading="instaSaving"
                      class="action-btn-primary"
                      @click="saveInstaSettings"
                    >
                      Save
                    </v-btn>
                    <v-btn
                      v-if="instaSettings?.publicPath"
                      variant="outlined"
                      class="action-btn-outline"
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

        </v-col>
      </v-row>
    </v-container>

    <!-- Preferences Modal -->
    <v-dialog v-model="showPreferencesDialog" max-width="680" scrollable>
      <v-card class="premium-card glass-card">
        <div class="p-6 border-b border-slate-100 d-flex align-center">
          <div class="icon-orb">
            <v-icon size="15">mdi-tune-variant</v-icon>
          </div>
          <div class="flex-grow-1">
            <div class="eyebrow" style="margin-bottom: 2px;">Settings</div>
            <h2 class="text-h6 mb-0">Preferences</h2>
          </div>
          <v-btn icon="mdi-close" variant="text" size="small" @click="showPreferencesDialog = false" />
        </div>

        <v-card-text class="pa-6">
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

        <v-card-actions class="px-6 pb-6 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="showPreferencesDialog = false">Cancel</v-btn>
          <v-btn
            :loading="savingPreferences"
            class="action-btn-primary ml-2"
            @click="savePreferences"
          >
            Save preferences
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Team Admin Access Modal -->
    <v-dialog
      v-if="auth.isPrincipalAdmin"
      v-model="showDelegationDialog"
      max-width="860"
      scrollable
    >
      <v-card class="premium-card glass-card">
        <div class="p-6 border-b border-slate-100 d-flex align-center">
          <div class="icon-orb">
            <v-icon size="15">mdi-account-supervisor-outline</v-icon>
          </div>
          <div class="flex-grow-1">
            <div class="eyebrow" style="margin-bottom: 2px;">Permissions</div>
            <h2 class="text-h6 mb-0">Team admin access</h2>
            <p class="text-caption mb-0" style="margin-top: 4px;">
              Grant assistants access to the admin panel and set permissions per product area.
            </p>
          </div>
          <v-btn icon="mdi-close" variant="text" size="small" @click="showDelegationDialog = false" />
        </div>

        <v-card-text class="pa-6" style="max-height: 70vh;">
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
              class="mb-2"
              @click="saveDelegationExclusions"
            >
              Save exclusion list
            </v-btn>
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

        <v-card-actions v-if="delegationUserId" class="px-6 pb-6 pt-0">
          <v-spacer />
          <v-btn
            variant="text"
            color="error"
            :loading="delegationSaving"
            @click="revokeDelegationAccess"
          >
            Revoke all
          </v-btn>
          <v-btn
            class="action-btn-primary ml-2"
            :loading="delegationSaving"
            @click="saveDelegationMatrix"
          >
            Save access
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add team member (standard user on your tenant) -->
    <v-dialog v-model="showAddTeamMemberDialog" max-width="500" persistent>
      <v-card class="premium-card">
        <div class="p-6 border-b border-slate-100 d-flex align-start">
          <div class="icon-orb">
            <v-icon size="15">mdi-account-plus-outline</v-icon>
          </div>
          <div class="flex-grow-1">
            <div class="eyebrow" style="margin-bottom: 2px;">Team</div>
            <h2 class="text-h6 mb-0">Add team member</h2>
            <p class="text-caption mb-0" style="margin-top: 4px;">
              Creates a standard account on your team. They can sign in with this email and password; then you can assign admin permissions.
            </p>
          </div>
          <v-btn icon="mdi-close" variant="text" size="small" @click="showAddTeamMemberDialog = false" />
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
            :loading="addTeamMemberSaving"
            :disabled="!isAddTeamMemberFormValid"
            class="action-btn-primary ml-2"
            @click="submitAddTeamMember"
          >
            Create &amp; select
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Change Password Dialog -->
    <v-dialog v-model="showPasswordDialog" max-width="480" @update:model-value="onPasswordDialogToggle">
      <v-card class="premium-card">
        <div class="p-6 border-b border-slate-100 d-flex align-center">
          <div class="icon-orb">
            <v-icon size="15">mdi-key-outline</v-icon>
          </div>
          <div class="flex-grow-1">
            <div class="eyebrow" style="margin-bottom: 2px;">Security</div>
            <h2 class="text-h6 mb-0">Change password</h2>
          </div>
          <v-btn icon="mdi-close" variant="text" size="small" @click="closePasswordDialog" />
        </div>
        <v-card-text class="pa-6">
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
        <v-card-actions class="px-6 pb-6 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="closePasswordDialog">Cancel</v-btn>
          <v-btn
            :loading="changingPassword"
            :disabled="!isPasswordFormValid || !passwordsMatch"
            class="action-btn-primary ml-2"
            @click="changePassword"
          >
            Change password
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 2FA Dialog -->
    <v-dialog v-model="show2FADialog" max-width="460">
      <v-card class="premium-card">
        <div class="p-6 border-b border-slate-100 d-flex align-center">
          <div class="icon-orb">
            <v-icon size="15">mdi-shield-lock-outline</v-icon>
          </div>
          <div class="flex-grow-1">
            <div class="eyebrow" style="margin-bottom: 2px;">Security</div>
            <h2 class="text-h6 mb-0">Two-factor authentication</h2>
          </div>
          <v-btn icon="mdi-close" variant="text" size="small" @click="show2FADialog = false" />
        </div>
        <v-card-text class="pa-6">
          <div class="d-flex align-center" style="gap: 14px;">
            <div class="icon-orb" style="width:42px !important;height:42px !important;border-radius:10px !important;">
              <v-icon size="20">mdi-shield-lock-outline</v-icon>
            </div>
            <div class="flex-grow-1">
              <div class="text-body-2" style="font-size: 13.5px; color: var(--c-text); font-weight: 500;">
                {{ twoFactorEnabled ? 'Two-factor authentication is enabled' : 'Add a second verification step at sign-in' }}
              </div>
              <div class="text-caption" style="margin-top: 2px;">
                {{ twoFactorEnabled ? 'You\'ll be prompted for a code each time you sign in.' : 'Strongly recommended for admin accounts.' }}
              </div>
            </div>
            <span class="status-pill" :data-on="twoFactorEnabled">
              <span class="status-dot" />
              {{ twoFactorEnabled ? 'Enabled' : 'Disabled' }}
            </span>
          </div>
        </v-card-text>
        <v-card-actions class="px-6 pb-6 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="show2FADialog = false">Close</v-btn>
          <v-btn
            :class="twoFactorEnabled ? 'action-btn-outline ml-2' : 'action-btn-primary ml-2'"
            @click="toggle2FA"
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
const showPreferencesDialog = ref(false)
const showDelegationDialog = ref(false)
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

const resetPasswordForm = () => {
  passwordForm.currentPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
}

// Vuetify only re-runs a field's :rules when that field's own v-model changes,
// so the Confirm Password field would otherwise stay marked "valid" if the
// user went back and edited New Password after typing the confirmation.
// Watching newPassword and clearing confirmPassword forces a re-validation
// pass on the confirm field the next time the user touches it, and the
// passwordsMatch computed below also gates the submit button.
watch(() => passwordForm.newPassword, () => {
  if (passwordForm.confirmPassword) {
    passwordForm.confirmPassword = ''
  }
})

const passwordsMatch = computed(() =>
  passwordForm.newPassword.length > 0 &&
  passwordForm.newPassword === passwordForm.confirmPassword
)

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

const closePasswordDialog = () => {
  showPasswordDialog.value = false
  resetPasswordForm()
}

const onPasswordDialogToggle = (open: boolean | null) => {
  // Vuetify emits update:modelValue when the user clicks outside or hits Esc.
  // Mirror Cancel/X behaviour so password fields never linger in memory.
  if (!open) resetPasswordForm()
}

const extractServerMessage = (e: any): string | null => {
  const candidates = [
    e?.data?.statusMessage,
    e?.data?.message,
    e?.statusMessage,
    e?.response?._data?.statusMessage,
    e?.response?._data?.message,
  ]
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length > 0) return c.trim()
  }
  return null
}

const changePassword = async () => {
  changingPassword.value = true
  try {
    await api.post('/api/admin/profile/change-password', {
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    })
    showPasswordDialog.value = false
    resetPasswordForm()
    showToast('Password changed successfully')
  } catch (e) {
    console.error('Failed to change password:', e)
    const msg = extractServerMessage(e) || 'Failed to change password'
    showToast(msg, 'error')
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
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap');

/* ── Design tokens ─────────────────────────────────────────────────── */
.premium-profile-wrapper {
  --c-bg: #FAFAFB;
  --c-surface: #FFFFFF;
  --c-surface-2: #F6F7F9;
  --c-surface-3: #EEF0F3;
  --c-border: #E6E8EC;
  --c-border-strong: #D5D9DF;
  --c-text: #0B0D12;
  --c-text-2: #4B5563;
  --c-text-3: #8B93A1;
  --c-accent: #0B0D12;
  --c-accent-hover: #1F2937;
  --c-focus: #2563EB;
  --shadow-xs: 0 1px 0 rgba(15, 23, 42, 0.04);
  --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 0 rgba(15, 23, 42, 0.02);
  --shadow-md: 0 8px 24px -12px rgba(15, 23, 42, 0.10), 0 2px 4px rgba(15, 23, 42, 0.04);
  --r-card: 14px;
  --r-input: 10px;

  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11', 'ss01';
  letter-spacing: -0.011em;
  color: var(--c-text);
  background: var(--c-bg);
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
}

/* Subtle dot grid — replaces the rainbow auroras */
.premium-profile-wrapper::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: radial-gradient(circle at 1px 1px, rgba(15, 23, 42, 0.04) 1px, transparent 0);
  background-size: 26px 26px;
  -webkit-mask-image: linear-gradient(180deg, rgba(0,0,0,0.55), transparent 65%);
  mask-image: linear-gradient(180deg, rgba(0,0,0,0.55), transparent 65%);
}
.premium-profile-wrapper > * { position: relative; z-index: 1; }

/* Hide the legacy aurora markup */
.aurora-bg, .aurora { display: none !important; }

/* ── Type ──────────────────────────────────────────────────────────── */
.font-serif {
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  letter-spacing: -0.025em;
}
.eyebrow,
:deep(.text-overline) {
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 10.5px !important;
  font-weight: 500 !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase !important;
  color: var(--c-text-3) !important;
}

/* ── Header ────────────────────────────────────────────────────────── */
.header-glass {
  background: rgba(255, 255, 255, 0.78) !important;
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid var(--c-border) !important;
  box-shadow: none !important;
}

/* ── Cards ─────────────────────────────────────────────────────────── */
.premium-card {
  background: var(--c-surface) !important;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  border: 1px solid var(--c-border) !important;
  border-radius: var(--r-card) !important;
  box-shadow: var(--shadow-sm) !important;
  overflow: hidden;
  position: relative;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.premium-card::before { display: none !important; }
.premium-card:hover {
  border-color: var(--c-border-strong) !important;
  box-shadow: var(--shadow-md) !important;
}
.glass-card { background: var(--c-surface) !important; }

/* Section heads (the bordered top strip in each card) */
.premium-card .border-b.border-slate-100,
.premium-card > div.p-8.border-b,
.premium-card > div.p-6.border-b {
  padding: 18px 22px !important;
  border-bottom: 1px solid var(--c-border) !important;
}

/* Card body padding override */
.premium-card .p-8 { padding: 22px !important; }
.premium-card .p-6 { padding: 18px 22px !important; }

/* Inner section titles */
.premium-card .text-h6 {
  font-size: 14.5px !important;
  font-weight: 600 !important;
  letter-spacing: -0.01em !important;
  line-height: 1.3 !important;
  color: var(--c-text);
}
.premium-card .text-h5 {
  font-size: 17px !important;
  font-weight: 600 !important;
  letter-spacing: -0.02em !important;
}
.premium-card .text-subtitle-1 {
  font-size: 13px !important;
  font-weight: 600 !important;
  letter-spacing: -0.005em !important;
}
.premium-card .text-caption {
  font-size: 12.5px !important;
  color: var(--c-text-3) !important;
  line-height: 1.55 !important;
}

/* ── Icon orbs (neutralised) ───────────────────────────────────────── */
.icon-orb {
  width: 32px !important;
  height: 32px !important;
  background: var(--c-surface-2) !important;
  border: 1px solid var(--c-border) !important;
  border-radius: 8px !important;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 12px !important;
  box-shadow: none !important;
}
.icon-orb--sm { width: 26px !important; height: 26px !important; border-radius: 7px !important; }
.icon-orb :deep(.v-icon) { color: var(--c-text) !important; font-size: 16px !important; }
.icon-orb--sm :deep(.v-icon) { font-size: 13px !important; }

/* Force every legacy color helper to stay neutral */
.bg-amber-50,
.bg-purple-50,
.bg-teal-50,
.bg-indigo-50 {
  background: var(--c-surface-2) !important;
  border-color: var(--c-border) !important;
}

/* ── Avatar block ──────────────────────────────────────────────────── */
.avatar-container { width: 88px; height: 88px; }
.avatar-premium {
  border: 1px solid var(--c-border) !important;
  box-shadow: var(--shadow-xs) !important;
}
.avatar-edit-btn {
  position: absolute !important;
  bottom: -2px;
  right: -2px;
  background: var(--c-surface) !important;
  color: var(--c-text) !important;
  border: 1px solid var(--c-border);
  box-shadow: var(--shadow-sm) !important;
}
.avatar-edit-btn :deep(.v-icon) { font-size: 14px !important; }

/* Identity name + meta */
.identity-name {
  font-family: 'Inter', sans-serif;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.018em;
  margin-top: 14px;
  margin-bottom: 2px;
  color: var(--c-text);
}
.identity-email {
  font-size: 13px;
  color: var(--c-text-3);
  font-feature-settings: 'tnum';
  margin-bottom: 12px;
}
.identity-role {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: -0.005em;
  color: var(--c-text-2);
  background: var(--c-surface-2);
  border: 1px solid var(--c-border);
  padding: 4px 10px;
  border-radius: 999px;
}
.identity-role::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #16A34A;
}
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: -0.005em;
  color: var(--c-text-2);
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  padding: 4px 10px;
  border-radius: 999px;
  white-space: nowrap;
}
.status-pill .status-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #9CA3AF;
}
.status-pill[data-on="true"] .status-dot { background: #16A34A; }

/* ── Stats (edge-to-edge, hairline divider) ────────────────────────── */
.stats-mini {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  border-top: 1px solid var(--c-border);
  margin: 24px -22px -22px;
}
.stat-mini-item {
  padding: 16px 18px;
  background: transparent;
  border: 0;
  border-right: 1px solid var(--c-border);
  border-radius: 0;
  text-align: left;
}
.stat-mini-item:last-child { border-right: 0; }
.stat-mini-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--c-text);
  letter-spacing: -0.022em;
  font-variant-numeric: tabular-nums;
  margin-bottom: 2px;
}
.stat-mini-label {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9.5px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--c-text-3);
}

/* ── Quick Actions list ────────────────────────────────────────────── */
.quick-action-item {
  border-radius: 8px !important;
  margin: 1px 4px !important;
  min-height: 46px !important;
  border: 1px solid transparent;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.quick-action-item :deep(.v-list-item__prepend) {
  color: var(--c-text-2) !important;
  margin-right: 10px !important;
}
.quick-action-item :deep(.v-list-item__prepend > .v-icon) { font-size: 17px; opacity: 0.9; }
.quick-action-item :deep(.v-list-item-title) {
  font-size: 13.5px !important;
  font-weight: 500 !important;
  color: var(--c-text) !important;
  letter-spacing: -0.005em;
}
.quick-action-item :deep(.v-list-item-subtitle) {
  font-size: 11.5px !important;
  color: var(--c-text-3) !important;
  opacity: 1 !important;
  margin-top: 1px !important;
}
.quick-action-item:hover {
  background: var(--c-surface-2) !important;
  border-color: var(--c-border) !important;
  transform: none;
}
.quick-action-item:hover :deep(.v-list-item__prepend) { color: var(--c-text) !important; }

/* ── Inputs ────────────────────────────────────────────────────────── */
.premium-input :deep(.v-field) {
  border-radius: var(--r-input) !important;
  background: var(--c-surface) !important;
  --v-field-border-opacity: 1;
}
.premium-input :deep(.v-field__outline) {
  --v-field-border-opacity: 1 !important;
  color: var(--c-border) !important;
}
.premium-input :deep(.v-field--focused .v-field__outline) {
  color: var(--c-text) !important;
}
.premium-input :deep(.v-label) {
  font-size: 13px !important;
  color: var(--c-text-3) !important;
  letter-spacing: -0.005em;
}

/* ── Buttons ───────────────────────────────────────────────────────── */
.action-btn-primary {
  background: var(--c-accent) !important;
  color: #fff !important;
  border-radius: var(--r-input) !important;
  height: 38px !important;
  min-height: 38px !important;
  padding: 0 16px !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  letter-spacing: -0.005em !important;
  text-transform: none !important;
  box-shadow: 0 1px 2px rgba(15,23,42,0.10), inset 0 1px 0 rgba(255,255,255,0.06) !important;
  transition: background 0.15s ease, box-shadow 0.15s ease !important;
}
.action-btn-primary:hover {
  background: var(--c-accent-hover) !important;
  box-shadow: 0 2px 6px rgba(15,23,42,0.16), inset 0 1px 0 rgba(255,255,255,0.06) !important;
  transform: none !important;
}
.action-btn-outline {
  background: var(--c-surface) !important;
  border: 1px solid var(--c-border) !important;
  color: var(--c-text) !important;
  border-radius: var(--r-input) !important;
  height: 38px !important;
  min-height: 38px !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  text-transform: none !important;
  letter-spacing: -0.005em !important;
  box-shadow: var(--shadow-xs) !important;
}
.action-btn-outline:hover {
  border-color: var(--c-border-strong) !important;
  background: var(--c-surface-2) !important;
}

/* Generic v-btn polish (size override only — no color) */
.premium-card .v-btn,
.v-dialog .v-btn {
  text-transform: none;
  letter-spacing: -0.005em;
  font-weight: 500;
}

/* ── Chips / pills ─────────────────────────────────────────────────── */
.premium-chip {
  height: 26px !important;
  font-size: 11.5px !important;
  font-weight: 500 !important;
  letter-spacing: -0.005em !important;
  border-radius: 7px !important;
  padding: 0 10px !important;
  background: var(--c-surface-2) !important;
  color: var(--c-text) !important;
  border: 1px solid var(--c-border) !important;
}
.premium-chip :deep(.v-icon) {
  color: var(--c-text-2) !important;
  font-size: 13px !important;
}

/* ── Switches ──────────────────────────────────────────────────────── */
.premium-switch :deep(.v-selection-control) { min-height: 34px !important; }
.premium-switch :deep(.v-label) {
  font-size: 13px !important;
  color: var(--c-text) !important;
  opacity: 1 !important;
}

/* ── Dividers ──────────────────────────────────────────────────────── */
.premium-card .v-divider,
.v-dialog .v-divider {
  border-color: var(--c-border) !important;
  opacity: 1 !important;
}

/* ── InstaConnect ──────────────────────────────────────────────────── */
.insta-color-swatch {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1px solid var(--c-border);
}
.insta-qr-card {
  background: var(--c-surface-2);
  border: 1px solid var(--c-border);
  border-radius: var(--r-card);
  padding: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.insta-qr-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  background: var(--c-surface);
  color: var(--c-text-2);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--c-border);
  margin-bottom: 14px;
}
.insta-qr-tag :deep(.v-icon) { color: var(--c-text-2) !important; }
.insta-qr-img-wrap {
  background: #fff;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--c-border);
  margin-bottom: 12px;
}
.insta-qr-img { width: 168px; height: 168px; display: block; image-rendering: pixelated; }
.insta-qr-placeholder {
  background: #fff;
  width: 100%;
  height: 192px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: 1px dashed var(--c-border-strong);
  margin-bottom: 12px;
}
.insta-empty {
  background: var(--c-surface-2);
  border: 1px dashed var(--c-border-strong);
  border-radius: 12px;
  padding: 24px;
  text-align: center;
}
.insta-capture-row {
  border: 1px solid var(--c-border);
  border-radius: 10px;
  margin-bottom: 6px;
  background: var(--c-surface);
  transition: background 0.15s ease, border-color 0.15s ease;
}
.insta-capture-row:hover {
  background: var(--c-surface-2);
  border-color: var(--c-border-strong);
}

/* ── Utilities ─────────────────────────────────────────────────────── */
.bg-slate-50 { background: var(--c-surface-2) !important; }
.border-slate-100 { border-color: var(--c-border) !important; }
.border-slate-200 { border-color: var(--c-border) !important; }
.text-slate-400 { color: var(--c-text-3) !important; }
.text-slate-500 { color: var(--c-text-2) !important; }
.text-slate-600 { color: var(--c-text-2) !important; }
.text-slate-900 { color: var(--c-text) !important; }
.rounded-lg { border-radius: 10px !important; }
.rounded-xl { border-radius: 12px !important; }
.sticky { position: sticky; }
.top-0 { top: 0; }
.z-50 { z-index: 50; }

/* Dialogs sit above everything cleanly */
:deep(.v-overlay__scrim) { background: rgba(11, 13, 18, 0.42) !important; }
:deep(.v-dialog .v-card) { border-radius: var(--r-card) !important; }

@media (max-width: 960px) {
  .header-glass { padding: 16px !important; }
  .premium-card .p-8 { padding: 18px !important; }
  .premium-card .p-6 { padding: 16px !important; }
  .stats-mini { margin: 20px -18px -18px; }
}
</style>

