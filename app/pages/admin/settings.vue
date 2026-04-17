<template>
  <div class="premium-settings-wrapper bg-[#F8FAFC] min-h-screen">
    <!-- TOP NAVIGATION BAR (PREMIUM LOOK) -->
    <div class="header-glass sticky top-0 z-50 px-8 py-4 border-b border-slate-200 backdrop-blur-md bg-white/80">
      <div class="max-w-[1600px] mx-auto d-flex align-center">
        <div>
          <div class="flex items-center space-x-2 mb-0">
            <span class="text-[10px] uppercase tracking-[0.3em] font-bold text-primary">System Architecture</span>
          </div>
          <h1 class="text-h4 font-serif text-slate-900 font-weight-bold">System Settings</h1>
        </div>
        <v-spacer />
        <div class="d-flex align-center gap-4">
          <v-chip 
            :color="syncStatus === 'running' ? 'warning' : 'success'" 
            variant="flat" 
            class="premium-chip font-weight-bold"
            elevation="0"
          >
            <v-icon start size="18">{{ syncStatus === 'running' ? 'mdi-loading mdi-spin' : 'mdi-check-circle' }}</v-icon>
            {{ syncStatus === 'running' ? 'Sync Running' : 'System Ready' }}
          </v-chip>
        </div>
      </div>
    </div>

    <v-container fluid class="max-w-[1600px] px-8 pt-8 pb-16">

      <!-- CREA MLS Integration Section -->
      <v-row>
        <v-col cols="12">
          <v-card class="premium-card mb-8">
            <div class="p-8 border-b border-slate-100 bg-slate-50/50 d-flex align-center">
              <div class="icon-orb mr-5">
                <v-icon color="primary" size="24">mdi-database-sync</v-icon>
              </div>
              <div>
                <h2 class="text-h5 font-serif text-slate-900">CREA MLS Data Sync</h2>
                <p class="text-caption text-slate-500 font-medium italic mb-0">Synchronize property listings with the DDF® endpoint</p>
              </div>
            </div>

            <v-card-text class="p-8">
              <v-row>
                <v-col cols="12" md="6">
                  <div class="d-flex align-center mb-6 status-badge px-4 py-2 bg-green-50 rounded-lg w-fit">
                    <v-icon class="mr-2" color="success">mdi-check-circle</v-icon>
                    <span class="text-success font-weight-bold text-caption uppercase tracking-wider">Connected to CREA DDF API</span>
                  </div>
                  
                  <!-- Sync Statistics -->
                  <div class="luxury-stats-container mb-6">
                    <h3 class="text-subtitle-2 font-weight-bold text-slate-400 uppercase tracking-widest mb-4">Live Analytics</h3>
                    <div class="stats-grid-premium">
                      <div class="stat-item-luxury">
                        <span class="stat-value">{{ stats.totalProperties?.toLocaleString() || '0' }}</span>
                        <span class="stat-label">Total</span>
                      </div>
                      <div class="stat-item-luxury">
                        <span class="stat-value">{{ stats.creaProperties?.toLocaleString() || '0' }}</span>
                        <span class="stat-label">MLS DDF</span>
                      </div>
                      <div class="stat-item-luxury">
                        <span class="stat-value">{{ stats.manualProperties?.toLocaleString() || '0' }}</span>
                        <span class="stat-label">Private</span>
                      </div>
                    </div>
                  </div>

                  <div class="last-sync-pill d-flex align-center justify-space-between px-6 py-4 rounded-xl bg-slate-50 border border-slate-100 mb-6">
                    <div>
                      <span class="text-caption text-slate-400 font-weight-bold uppercase block mb-1">Latest Transmission</span>
                      <span class="text-subtitle-1 font-mono font-weight-bold text-slate-800">{{ formatDateTime(stats.lastSyncAt) || 'Never' }}</span>
                    </div>
                    <v-icon color="slate-300">mdi-clock-outline</v-icon>
                  </div>

                  <!-- Manual Sync Controls -->
                  <div class="sync-controls-premium">
                    <h3 class="text-subtitle-2 font-weight-bold text-slate-400 uppercase tracking-widest mb-4">Manual Sync</h3>
                    <v-select density="compact"
                      v-model="syncCity"
                      :items="cities"
                      item-title="name"
                      item-value="name"
                      label="City (Optional)"
                      variant="outlined"
                      rounded="lg"
                      class="mb-4 premium-input"
                      clearable
                    >
                      <template v-slot:selection="{ item }">
                        {{ item.raw.name }} ({{ item.raw.count }} properties)
                      </template>
                    </v-select>
                    <v-btn
                      color="primary"
                      block
                      :loading="syncing"
                      :disabled="syncStatus === 'running'"
                      @click="startManualSync"
                      class="action-btn-primary"
                      elevation="0"
                    >
                      <v-icon start>mdi-sync</v-icon>
                      {{ syncing ? 'Syncing...' : 'Force Manual Update' }}
                    </v-btn>
                  </div>
                </v-col>

                <v-col cols="12" md="6">
                  <div class="pl-md-8 border-l border-slate-100 h-full">
                    <h3 class="text-h6 font-serif mb-6">Automation Controls</h3>
                    
                    <v-switch
                      v-model="autoSyncEnabled"
                      color="primary"
                      label="Enable Automated Synchronization"
                      inset
                      class="premium-switch mb-4"
                      hide-details
                      @update:model-value="updateAutoSyncSetting"
                    ></v-switch>

                    <v-select density="compact"
                      v-model="autoSyncTime"
                      :items="timeOptions"
                      label="Sync Time"
                      variant="outlined"
                      rounded="lg"
                      class="mb-4 premium-input"
                      :disabled="!autoSyncEnabled"
                      @update:model-value="updateAutoSyncSetting"
                    ></v-select>

                    <div v-if="autoSyncEnabled" class="next-sync-info px-6 py-4 rounded-xl bg-blue-50 border border-blue-100 mb-6">
                      <div class="text-caption text-blue-600 font-weight-bold uppercase mb-1">Next Scheduled Sync</div>
                      <div class="text-subtitle-2 font-weight-bold text-blue-900">{{ nextSyncTime }}</div>
                    </div>

                    <v-alert
                      v-if="autoSyncEnabled"
                      type="info"
                      variant="tonal"
                      class="mb-0"
                      density="compact"
                    >
                      <div class="text-caption">
                        <strong>Automatic Sync:</strong> New MLS properties will be synced daily at {{ autoSyncTime }}. 
                        This happens in the background without affecting site performance.
                      </div>
                    </v-alert>
                  </div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Sync Progress/Results -->
      <v-row v-if="lastSyncResult || syncing">
        <v-col cols="12">
          <v-card class="premium-card">
            <div class="p-8 border-b border-slate-100 d-flex align-center">
              <v-icon class="mr-3" color="primary">mdi-history</v-icon>
              <h2 class="text-h6 font-weight-bold">Sync Activity</h2>
            </div>
            <v-card-text class="p-8">
              <!-- Current Sync Progress -->
              <div v-if="syncing" class="mb-6 p-6 bg-blue-50 rounded-xl border border-blue-100">
                <div class="d-flex align-center mb-3">
                  <v-progress-circular
                    indeterminate
                    size="20"
                    width="2"
                    color="primary"
                    class="mr-3"
                  />
                  <span class="font-weight-bold text-blue-900">Syncing properties from CREA...</span>
                </div>
                <v-progress-linear
                  :model-value="syncProgress"
                  color="primary"
                  height="6"
                  rounded
                  class="mb-2"
                />
                <div class="text-caption text-blue-700 font-weight-medium">{{ syncProgressText }}</div>
              </div>

              <!-- Last Sync Results -->
              <div v-if="lastSyncResult">
                <h4 class="text-subtitle-2 font-weight-bold text-slate-400 uppercase tracking-widest mb-4">Last Sync Results</h4>
                <div class="sync-results d-flex flex-wrap gap-3 mb-4">
                  <v-chip color="success" variant="flat" class="premium-chip-result">
                    <v-icon start size="16">mdi-plus</v-icon>
                    {{ lastSyncResult.created || 0 }} Created
                  </v-chip>
                  <v-chip color="info" variant="flat" class="premium-chip-result">
                    <v-icon start size="16">mdi-update</v-icon>
                    {{ lastSyncResult.updated || 0 }} Updated
                  </v-chip>
                  <v-chip v-if="lastSyncResult.total" color="primary" variant="flat" class="premium-chip-result">
                    <v-icon start size="16">mdi-database</v-icon>
                    {{ lastSyncResult.total }} Total
                  </v-chip>
                  <v-chip v-if="lastSyncResult.errors > 0" color="error" variant="flat" class="premium-chip-result">
                    <v-icon start size="16">mdi-alert</v-icon>
                    {{ lastSyncResult.errors }} Errors
                  </v-chip>
                </div>
                
                <!-- Error details if any -->
                <v-alert
                  v-if="lastSyncResult.error"
                  type="error"
                  variant="tonal"
                  class="mb-4"
                  rounded="lg"
                >
                  <div class="text-body-2">
                    <strong>Sync Error:</strong> {{ lastSyncResult.error }}
                  </div>
                </v-alert>
                
                <div class="text-caption text-slate-500">
                  Completed: {{ formatDateTime(lastSyncResult.timestamp) }}
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Other Settings Sections -->
      <v-row class="mt-8">
        <v-col cols="12">
          <h2 class="text-h4 font-serif text-slate-900 mb-6 d-flex align-center">
            <v-icon size="32" class="mr-4" color="primary">mdi-cog-outline</v-icon>
            System Configuration
          </h2>
        </v-col>

        <v-col cols="12" md="3">
          <v-card class="premium-card sticky top-24">
            <v-list nav class="p-2">
              <v-list-item
                v-for="section in settingSections"
                :key="section.id"
                :value="section"
                :active="activeSection === section.id"
                @click="activeSection = section.id"
                class="rounded-lg mb-1 premium-nav-item"
                :class="{ 'active-nav-item': activeSection === section.id }"
              >
                <template v-slot:prepend>
                  <v-icon :icon="section.icon" class="mr-3" />
                </template>
                <v-list-item-title class="font-weight-bold">{{ section.title }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>

        <v-col cols="12" md="9">
          <!-- General Settings -->
          <v-card v-if="activeSection === 'general'" class="premium-card mb-6">
            <div class="p-8 border-b border-slate-100 d-flex align-center">
              <v-icon color="primary" class="mr-3">mdi-cog</v-icon>
              <h2 class="text-h6 font-weight-bold">General Settings</h2>
            </div>
            <v-card-text class="p-8">
              <v-alert type="info" variant="tonal" density="compact" class="mb-6">
                Site name, logo, contact info, and branding are managed in
                <router-link to="/admin/content" class="font-weight-bold text-primary">Content &rarr; Site Branding</router-link>.
              </v-alert>
              <v-form v-model="isGeneralFormValid" @submit.prevent="saveGeneralSettings">
                <v-row>
                  <v-col cols="12" md="6">
                    <v-select density="compact"
                      v-model="generalSettings.timezone"
                      :items="timezones"
                      label="Default Timezone"
                      variant="outlined"
                      rounded="lg"
                      class="premium-input"
                      required
                      :rules="[v => !!v || 'Timezone is required']"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field density="compact"
                      v-model="generalSettings.googleReviewUrl"
                      label="Google Review URL"
                      placeholder="https://g.page/r/..."
                      variant="outlined"
                      rounded="lg"
                      class="premium-input"
                      hint="Shown on the testimonial page so clients can also leave a Google review"
                      persistent-hint
                      prepend-inner-icon="mdi-google"
                    />
                  </v-col>
                </v-row>
              </v-form>
            </v-card-text>
            <v-card-actions class="px-8 pb-8">
              <v-spacer />
              <v-btn
                color="primary"
                :loading="saving"
                :disabled="!isGeneralFormValid"
                @click="saveGeneralSettings"
                class="action-btn-primary px-8"
              >
                Save Changes
              </v-btn>
            </v-card-actions>
          </v-card>

          <!-- Email Settings -->
          <v-card v-if="activeSection === 'email'" class="premium-card mb-6">
            <div class="p-8 border-b border-slate-100 d-flex align-center">
              <v-icon color="primary" class="mr-3">mdi-email</v-icon>
              <h2 class="text-h6 font-weight-bold">Email Settings</h2>
            </div>
            <v-card-text class="p-8">
              <v-form v-model="isEmailFormValid" @submit.prevent="saveEmailSettings">
                <v-row>
                  <v-col cols="12" md="6">
                    <v-select density="compact"
                      v-model="emailSettings.provider"
                      :items="emailProviders"
                      label="Email Provider"
                      variant="outlined"
                      rounded="lg"
                      class="premium-input"
                      required
                      :rules="[v => !!v || 'Email provider is required']"
                    />
                  </v-col>

                  <v-col cols="12" md="6">
                    <v-text-field density="compact"
                      v-model="emailSettings.fromEmail"
                      label="From Email"
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
                      v-model="emailSettings.fromName"
                      label="From Name"
                      :rules="[v => !!v || 'From name is required']"
                      variant="outlined"
                      rounded="lg"
                      class="premium-input"
                      required
                    />
                  </v-col>

                  <v-col cols="12">
                    <v-expansion-panels class="premium-expansion">
                      <v-expansion-panel class="premium-panel">
                        <v-expansion-panel-title class="font-weight-bold">
                          <v-icon start>mdi-server</v-icon>
                          SMTP Settings
                        </v-expansion-panel-title>
                        <v-expansion-panel-text class="pt-4">
                          <v-row>
                            <v-col cols="12" md="6">
                              <v-text-field density="compact"
                                v-model="emailSettings.smtp.host"
                                label="SMTP Host"
                                :rules="[v => !!v || 'SMTP host is required']"
                                variant="outlined"
                                rounded="lg"
                                class="premium-input"
                              />
                            </v-col>

                            <v-col cols="12" md="6">
                              <v-text-field density="compact"
                                v-model="emailSettings.smtp.port"
                                label="SMTP Port"
                                type="number"
                                :rules="[v => !!v || 'SMTP port is required']"
                                variant="outlined"
                                rounded="lg"
                                class="premium-input"
                              />
                            </v-col>

                            <v-col cols="12" md="6">
                              <v-text-field density="compact"
                                v-model="emailSettings.smtp.username"
                                label="SMTP Username"
                                variant="outlined"
                                rounded="lg"
                                class="premium-input"
                              />
                            </v-col>

                            <v-col cols="12" md="6">
                              <v-text-field density="compact"
                                v-model="emailSettings.smtp.password"
                                label="SMTP Password"
                                type="password"
                                autocomplete="new-password"
                                variant="outlined"
                                rounded="lg"
                                class="premium-input"
                              />
                            </v-col>

                            <v-col cols="12">
                              <v-switch
                                v-model="emailSettings.smtp.secure"
                                label="Use SSL/TLS"
                                color="primary"
                                class="premium-switch"
                                hide-details
                              />
                            </v-col>
                          </v-row>
                        </v-expansion-panel-text>
                      </v-expansion-panel>

                      <v-expansion-panel class="premium-panel">
                        <v-expansion-panel-title class="font-weight-bold">
                          <v-icon start>mdi-text-box-multiple</v-icon>
                          Email Templates
                        </v-expansion-panel-title>
                        <v-expansion-panel-text class="pt-4">
                          <v-table class="premium-table">
                            <thead>
                              <tr>
                                <th class="text-caption font-weight-bold text-slate-400 uppercase">Template</th>
                                <th class="text-caption font-weight-bold text-slate-400 uppercase">Subject</th>
                                <th class="text-right text-caption font-weight-bold text-slate-400 uppercase">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr
                                v-for="template in emailTemplates"
                                :key="template.id"
                                class="table-row-premium"
                              >
                                <td class="font-weight-bold text-slate-700">{{ template.name }}</td>
                                <td class="text-slate-600">{{ template.subject }}</td>
                                <td class="text-right">
                                  <v-btn
                                    icon="mdi-pencil"
                                    variant="text"
                                    size="small"
                                    color="slate-400"
                                    @click="editTemplate(template)"
                                  />
                                  <v-btn
                                    icon="mdi-eye"
                                    variant="text"
                                    size="small"
                                    color="primary"
                                    @click="previewTemplate(template)"
                                  />
                                </td>
                              </tr>
                            </tbody>
                          </v-table>
                        </v-expansion-panel-text>
                      </v-expansion-panel>
                    </v-expansion-panels>
                  </v-col>

                  <v-col cols="12">
                    <v-btn
                      color="info"
                      prepend-icon="mdi-email-check"
                      @click="testEmailSettings"
                      :loading="testing"
                      variant="tonal"
                      class="px-6"
                      rounded="lg"
                    >
                      Test Email Settings
                    </v-btn>
                  </v-col>
                </v-row>
              </v-form>
            </v-card-text>
            <v-card-actions class="px-8 pb-8">
              <v-spacer />
              <v-btn
                color="primary"
                :loading="saving"
                :disabled="!isEmailFormValid"
                @click="saveEmailSettings"
                class="action-btn-primary px-8"
              >
                Save Changes
              </v-btn>
            </v-card-actions>
          </v-card>

          <!-- API Settings -->
          <v-card v-if="activeSection === 'api'" class="premium-card mb-6">
            <div class="p-8 border-b border-slate-100 d-flex align-center">
              <v-icon color="primary" class="mr-3">mdi-api</v-icon>
              <h2 class="text-h6 font-weight-bold">API Integration</h2>
            </div>
            <v-card-text class="p-8">
              <v-form v-model="isApiFormValid" @submit.prevent="saveApiSettings">
                <v-row>
                  <v-col cols="12">
                    <v-expansion-panels class="premium-expansion">
                      <v-expansion-panel
                        v-for="api in apiSettings"
                        :key="api.name"
                        class="premium-panel"
                      >
                        <v-expansion-panel-title class="font-weight-bold">
                          <v-icon start>mdi-key</v-icon>
                          {{ api.name }}
                        </v-expansion-panel-title>
                        <v-expansion-panel-text class="pt-4">
                          <v-row>
                            <v-col cols="12">
                              <v-text-field density="compact"
                                v-model="api.apiKey"
                                :label="api.name + ' API Key'"
                                type="password"
                                autocomplete="new-password"
                                variant="outlined"
                                rounded="lg"
                                class="premium-input"
                              />
                            </v-col>

                            <v-col cols="12">
                              <v-text-field density="compact"
                                v-model="api.apiSecret"
                                :label="api.name + ' API Secret'"
                                type="password"
                                autocomplete="new-password"
                                variant="outlined"
                                rounded="lg"
                                class="premium-input"
                              />
                            </v-col>

                            <v-col cols="12">
                              <v-switch
                                v-model="api.enabled"
                                :label="'Enable ' + api.name"
                                color="primary"
                                class="premium-switch"
                                hide-details
                              />
                            </v-col>

                            <v-col cols="12" class="mt-4">
                              <v-btn
                                color="info"
                                prepend-icon="mdi-check-circle"
                                @click="verifyApiCredentials(api)"
                                :loading="api.verifying"
                                variant="tonal"
                                rounded="lg"
                                class="px-6"
                              >
                                Verify Credentials
                              </v-btn>
                            </v-col>
                          </v-row>
                        </v-expansion-panel-text>
                      </v-expansion-panel>
                    </v-expansion-panels>
                  </v-col>
                </v-row>
              </v-form>
            </v-card-text>
            <v-card-actions class="px-8 pb-8">
              <v-spacer />
              <v-btn
                color="primary"
                :loading="saving"
                :disabled="!isApiFormValid"
                @click="saveApiSettings"
                class="action-btn-primary px-8"
              >
                Save Changes
              </v-btn>
            </v-card-actions>
          </v-card>

          <!-- Security Settings -->
          <v-card v-if="activeSection === 'security'" class="premium-card mb-6 border-error-subtle">
            <div class="p-8 border-b border-slate-100 d-flex align-center">
              <v-icon color="error" class="mr-3">mdi-shield</v-icon>
              <h2 class="text-h6 font-weight-bold">Security Settings</h2>
            </div>
            <v-card-text class="p-8">
              <v-form v-model="isSecurityFormValid" @submit.prevent="saveSecuritySettings">
                <v-row>
                  <v-col cols="12" md="6">
                    <v-select density="compact"
                      v-model="securitySettings.sessionTimeout"
                      :items="sessionTimeouts"
                      label="Session Timeout"
                      required
                      :rules="[v => !!v || 'Session timeout is required']"
                      variant="outlined"
                      rounded="lg"
                      class="premium-input"
                    />
                  </v-col>

                  <v-col cols="12" md="6">
                    <v-select density="compact"
                      v-model="securitySettings.passwordPolicy"
                      :items="passwordPolicies"
                      label="Password Policy"
                      required
                      :rules="[v => !!v || 'Password policy is required']"
                      variant="outlined"
                      rounded="lg"
                      class="premium-input"
                    />
                  </v-col>

                  <v-col cols="12">
                    <div class="p-6 bg-red-50 rounded-xl border border-red-100 mb-4">
                      <v-switch
                        v-model="securitySettings.twoFactorAuth"
                        label="Enable Two-Factor Authentication"
                        color="error"
                        class="premium-switch mb-0"
                        hide-details
                      />
                    </div>
                  </v-col>

                  <v-col cols="12">
                    <v-switch
                      v-model="securitySettings.ipWhitelisting"
                      label="Enable IP Whitelisting"
                      color="error"
                      class="premium-switch"
                      hide-details
                    />
                  </v-col>

                  <v-col
                    v-if="securitySettings.ipWhitelisting"
                    cols="12"
                  >
                    <v-textarea density="compact"
                      v-model="securitySettings.whitelistedIps"
                      label="Whitelisted IPs"
                      hint="Enter one IP address per line"
                      persistent-hint
                      rows="4"
                      variant="outlined"
                      rounded="lg"
                      class="premium-input"
                    />
                  </v-col>
                </v-row>
              </v-form>
            </v-card-text>
            <v-card-actions class="px-8 pb-8">
              <v-spacer />
              <v-btn
                color="error"
                :loading="saving"
                :disabled="!isSecurityFormValid"
                @click="saveSecuritySettings"
                class="action-btn-primary px-8"
                variant="flat"
              >
                Update Security
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Template Editor Dialog -->
    <v-dialog
      v-model="showTemplateDialog"
      max-width="800"
      scrollable
    >
      <v-card v-if="selectedTemplate" class="premium-card">
        <div class="p-8 bg-slate-900 text-white">
          <h2 class="text-h5 font-serif">Edit Template: {{ selectedTemplate.name }}</h2>
          <p class="text-caption text-slate-400 mb-0">Customize email content and variables</p>
        </div>
        <v-card-text class="p-8">
          <v-form v-model="isTemplateFormValid" @submit.prevent="saveTemplate">
            <v-row>
              <v-col cols="12">
                <v-text-field density="compact"
                  v-model="templateForm.subject"
                  label="Email Subject"
                  :rules="[v => !!v || 'Subject is required']"
                  required
                  variant="outlined"
                  rounded="lg"
                  class="premium-input"
                />
              </v-col>

              <v-col cols="12">
                <v-textarea density="compact"
                  v-model="templateForm.content"
                  label="Template Content"
                  :rules="[v => !!v || 'Content is required']"
                  required
                  rows="15"
                  variant="outlined"
                  rounded="lg"
                  class="premium-input"
                />
              </v-col>

              <v-col cols="12">
                <v-expansion-panels class="premium-expansion">
                  <v-expansion-panel class="premium-panel">
                    <v-expansion-panel-title class="font-weight-bold">
                      <v-icon start>mdi-code-braces</v-icon>
                      Available Variables
                    </v-expansion-panel-title>
                    <v-expansion-panel-text class="pt-4">
                      <v-chip-group>
                        <v-chip
                          v-for="variable in templateVariables"
                          :key="variable"
                          @click="insertVariable(variable)"
                          variant="outlined"
                          color="primary"
                          class="font-mono"
                        >
                          {{ variable }}
                        </v-chip>
                      </v-chip-group>
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                </v-expansion-panels>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions class="p-8 pt-0">
          <v-spacer />
          <v-btn
            variant="text"
            class="px-6"
            @click="showTemplateDialog = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            :loading="saving"
            :disabled="!isTemplateFormValid"
            @click="saveTemplate"
            class="action-btn-primary px-8"
          >
            Save Template
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Template Preview Dialog -->
    <v-dialog
      v-model="showPreviewDialog"
      max-width="600"
    >
      <v-card v-if="selectedTemplate" class="premium-card">
        <div class="p-8 bg-slate-900 text-white">
          <h2 class="text-h5 font-serif">Preview: {{ selectedTemplate.name }}</h2>
          <p class="text-caption text-slate-400 mb-0">How your email will appear to recipients</p>
        </div>
        <v-card-text class="p-8">
          <div class="preview-container">
            <div class="preview-subject mb-6 p-6 bg-slate-50 rounded-xl">
              <div class="text-caption text-slate-400 font-weight-bold uppercase mb-2">Subject Line</div>
              <div class="text-subtitle-1 font-weight-bold text-slate-900">{{ selectedTemplate.subject }}</div>
            </div>
            <div class="preview-content p-6 bg-white rounded-xl border border-slate-200" v-html="previewContent" />
          </div>
        </v-card-text>
        <v-card-actions class="p-8 pt-0">
          <v-spacer />
          <v-btn
            color="primary"
            @click="showPreviewDialog = false"
            class="action-btn-primary px-8"
          >
            Close
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
// Helper function to safely get auth headers
const getAuthHeaders = (): Record<string, string> => {
  if (process.client) {
    const token = localStorage.getItem('token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }
  return {}
}

const snackShow = ref(false)
const snackMsg = ref('')
const snackColor = ref<'success' | 'error'>('success')
const showToast = (msg: string, color: 'success' | 'error' = 'success') => {
  snackMsg.value = msg
  snackColor.value = color
  snackShow.value = true
}

const syncing = ref(false)
const syncStatus = ref('ready') // 'ready', 'running', 'error'
const syncProgress = ref(0)
const syncProgressText = ref('')
const lastSyncResult = ref<any>(null)
const stats = ref<any>({})
const cities = ref<any[]>([])
const syncCity = ref<string>('')

// Auto-sync settings
const autoSyncEnabled = ref(false)
const autoSyncTime = ref('00:00')
const timeOptions = [
  '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
]

// Settings sections and forms
const activeSection = ref('general')
const saving = ref(false)
const testing = ref(false)
const showTemplateDialog = ref(false)
const showPreviewDialog = ref(false)
const selectedTemplate = ref<any>(null)
const isGeneralFormValid = ref(false)
const isEmailFormValid = ref(false)
const isApiFormValid = ref(false)
const isSecurityFormValid = ref(false)
const isTemplateFormValid = ref(false)

const settingSections = [
  { id: 'general', title: 'General', icon: 'mdi-cog' },
  { id: 'email', title: 'Email', icon: 'mdi-email' },
  { id: 'api', title: 'API Integration', icon: 'mdi-api' },
  { id: 'security', title: 'Security', icon: 'mdi-shield' }
]

const generalSettings = ref({
  siteName: '',
  supportEmail: '',
  phone: '',
  timezone: '',
  googleReviewUrl: '',
  logo: null as any
})

const emailSettings = ref({
  provider: '',
  fromEmail: '',
  fromName: '',
  smtp: {
    host: '',
    port: '',
    username: '',
    password: '',
    secure: true
  }
})

const apiSettings = ref([
  {
    name: 'Google Maps',
    apiKey: '',
    apiSecret: '',
    enabled: true,
    verifying: false
  },
  {
    name: 'Stripe',
    apiKey: '',
    apiSecret: '',
    enabled: true,
    verifying: false
  }
])

const securitySettings = ref({
  sessionTimeout: '30',
  passwordPolicy: 'medium',
  twoFactorAuth: false,
  ipWhitelisting: false,
  whitelistedIps: ''
})

const templateForm = ref({
  subject: '',
  content: ''
})

const emailProviders = [
  'SMTP',
  'SendGrid',
  'Mailgun',
  'Amazon SES'
]

const timezones = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles'
]

const sessionTimeouts = [
  { title: '15 minutes', value: '15' },
  { title: '30 minutes', value: '30' },
  { title: '1 hour', value: '60' },
  { title: '2 hours', value: '120' }
]

const passwordPolicies = [
  { title: 'Basic', value: 'basic' },
  { title: 'Medium', value: 'medium' },
  { title: 'Strong', value: 'strong' }
]

const emailTemplates = ref([
  {
    id: 1,
    name: 'Welcome Email',
    subject: 'Welcome to our platform!',
    content: 'Hello {{name}}, welcome to our platform...'
  },
  {
    id: 2,
    name: 'Password Reset',
    subject: 'Password Reset Request',
    content: 'Click the link below to reset your password...'
  }
])

const templateVariables = [
  '{{name}}',
  '{{email}}',
  '{{resetLink}}',
  '{{siteName}}'
]

const emailRules = [
  (v: string) => !!v || 'Email is required',
  (v: string) => /.+@.+\..+/.test(v) || 'Email must be valid'
]

const phoneRules = [
  (v: string) => !v || /^\+?[\d\s-]{10,}$/.test(v) || 'Please enter a valid phone number'
]

const nextSyncTime = computed(() => {
  if (!autoSyncEnabled.value) return 'Disabled'
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const timeValue = autoSyncTime.value || '00:00'
  const timeParts = timeValue.split(':')
  const hour = parseInt(timeParts[0] || '0')
  const syncTime = new Date(today.getTime() + hour * 60 * 60 * 1000)
  
  if (syncTime <= now) {
    // Next sync is tomorrow
    syncTime.setDate(syncTime.getDate() + 1)
  }
  
  return syncTime.toLocaleString()
})

const saveGeneralSettings = async () => {
  saving.value = true
  try {
    const { googleReviewUrl, ...rest } = generalSettings.value
    const response = await fetch('/api/admin/settings/general', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(rest)
    })
    
    if (!response.ok) {
      throw new Error('Failed to save general settings')
    }

    await fetch('/api/admin/tenant-settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ googleReviewUrl: googleReviewUrl || null })
    })
    
    showToast('General settings saved successfully')
  } catch (error) {
    console.error('Error saving general settings:', error)
    showToast('Failed to save general settings', 'error')
  } finally {
    saving.value = false
  }
}

const saveEmailSettings = async () => {
  saving.value = true
  try {
    const response = await fetch('/api/admin/settings/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(emailSettings.value)
    })
    
    if (!response.ok) {
      throw new Error('Failed to save email settings')
    }
    
    showToast('Email settings saved successfully')
  } catch (error) {
    console.error('Error saving email settings:', error)
    showToast('Failed to save email settings', 'error')
  } finally {
    saving.value = false
  }
}

const saveApiSettings = async () => {
  saving.value = true
  try {
    const response = await fetch('/api/admin/settings/api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(apiSettings.value)
    })
    
    if (!response.ok) {
      throw new Error('Failed to save API settings')
    }
    
    showToast('API settings saved successfully')
  } catch (error) {
    console.error('Error saving API settings:', error)
    showToast('Failed to save API settings', 'error')
  } finally {
    saving.value = false
  }
}

const saveSecuritySettings = async () => {
  saving.value = true
  try {
    const response = await fetch('/api/admin/settings/security', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(securitySettings.value)
    })
    
    if (!response.ok) {
      throw new Error('Failed to save security settings')
    }
    
    showToast('Security settings saved successfully')
  } catch (error) {
    console.error('Error saving security settings:', error)
    showToast('Failed to save security settings', 'error')
  } finally {
    saving.value = false
  }
}

const testEmailSettings = async () => {
  testing.value = true
  try {
    const response = await fetch('/api/admin/settings/email/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(emailSettings.value)
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.statusMessage || 'Failed to test email settings')
    }
    
    const result = await response.json()
    showToast(result.message || 'Test email sent successfully')
  } catch (error: any) {
    console.error('Error testing email settings:', error)
    showToast(error.message || 'Failed to send test email', 'error')
  } finally {
    testing.value = false
  }
}

const verifyApiCredentials = async (api: any) => {
  api.verifying = true
  try {
    // Replace with actual API call
    await fetch(`/api/admin/settings/api/${api.name}/verify`, {
      method: 'POST',
      body: JSON.stringify({
        apiKey: api.apiKey,
        apiSecret: api.apiSecret
      })
    })
    // Show success message
  } catch (error) {
    console.error('Error verifying API credentials:', error)
  } finally {
    api.verifying = false
  }
}

const editTemplate = (template: any) => {
  selectedTemplate.value = template
  templateForm.value = {
    subject: template.subject,
    content: template.content
  }
  showTemplateDialog.value = true
}

const previewTemplate = (template: any) => {
  selectedTemplate.value = template
  showPreviewDialog.value = true
}

const insertVariable = (variable: string) => {
  const textarea = document.querySelector('textarea')
  if (textarea) {
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    templateForm.value.content = 
      templateForm.value.content.substring(0, start) +
      variable +
      templateForm.value.content.substring(end)
  }
}

const saveTemplate = async () => {
  if (!selectedTemplate.value) return

  saving.value = true
  try {
    const response = await fetch(`/api/admin/settings/email/templates/${selectedTemplate.value.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(templateForm.value)
    })
    
    if (!response.ok) {
      throw new Error('Failed to save template')
    }
    
    const result = await response.json()
    
    // Update the template in the list
    const templateIndex = emailTemplates.value.findIndex(t => t.id === selectedTemplate.value.id)
    if (templateIndex !== -1) {
      emailTemplates.value[templateIndex] = result.template
    }
    
    showTemplateDialog.value = false
    showToast('Template saved successfully')
  } catch (error) {
    console.error('Error saving template:', error)
    showToast('Failed to save template', 'error')
  } finally {
    saving.value = false
  }
}

const previewContent = computed(() => {
  if (!selectedTemplate.value) return ''
  
  // Replace variables with sample data
  let content = selectedTemplate.value.content
  content = content.replace(/{{name}}/g, 'John Doe')
  content = content.replace(/{{email}}/g, 'john@example.com')
  content = content.replace(/{{resetLink}}/g, 'https://example.com/reset')
  content = content.replace(/{{siteName}}/g, generalSettings.value.siteName)
  
  return content
})

const startManualSync = async () => {
  syncing.value = true
  syncStatus.value = 'running'
  syncProgress.value = 0
  syncProgressText.value = 'Starting sync...'
  
  try {
    // Start background sync without blocking UI
    const syncPayload: any = {}
    if (syncCity.value) {
      syncPayload.filters = { city: syncCity.value }
    }
    
    // Call background sync endpoint (non-blocking)
    const response = await fetch('/api/admin/crea/background-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(syncPayload)
    })
    
    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    // Show immediate feedback
    console.log('Background sync started successfully')
    
    // Set up real-time polling to check for progress and completion
    pollForSyncStatus()
    
  } catch (error: any) {
    console.error('Sync failed:', error)
    syncStatus.value = 'error'
    syncing.value = false
    alert(`Sync failed: ${error.message}`)
  }
}

const updateAutoSyncSetting = async () => {
  try {
    const settings = {
      autoSyncEnabled: autoSyncEnabled.value,
      autoSyncTime: autoSyncTime.value
    }
    
    await fetch('/api/admin/settings/crea-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(settings)
    })
    
    console.log('Auto-sync settings updated:', settings)
  } catch (error) {
    console.error('Failed to update auto-sync settings:', error)
  }
}

const loadStats = async () => {
  try {
    const data = await fetch('/api/admin/dashboard', {
      headers: getAuthHeaders()
    }).then(r => r.json())
    
    stats.value = data.stats || {}
  } catch (error) {
    console.error('Failed to load stats:', error)
  }
}

const loadCities = async () => {
  try {
    const data = await fetch('/api/properties/cities').then(r => r.json())
    cities.value = data || []
  } catch (error) {
    console.error('Failed to load cities:', error)
  }
}

const loadAutoSyncSettings = async () => {
  try {
    const data = await fetch('/api/admin/settings/crea-sync', {
      headers: getAuthHeaders()
    }).then(r => r.json())
    
    autoSyncEnabled.value = data.autoSyncEnabled || false
    autoSyncTime.value = data.autoSyncTime || '00:00'
  } catch (error) {
    console.error('Failed to load auto-sync settings:', error)
  }
}

const loadCurrentSyncStatus = async () => {
  try {
    const response = await fetch('/api/admin/crea/sync-status', {
      headers: getAuthHeaders()
    })
    
    if (!response.ok) return
    
    const statusData = await response.json()
    
    // Load last sync result if available
    if (statusData.lastSyncResult) {
      lastSyncResult.value = statusData.lastSyncResult
    }
    
    // Check if a sync is currently running
    if (statusData.syncStatus === 'running') {
      syncing.value = true
      syncStatus.value = 'running'
      
      if (statusData.syncProgress) {
        syncProgress.value = statusData.syncProgress.progress || 0
        syncProgressText.value = statusData.syncProgress.text || 'Sync in progress...'
      }
      
      // Start polling for updates
      pollForSyncStatus()
    }
    
  } catch (error) {
    console.error('Failed to load current sync status:', error)
  }
}

const formatDateTime = (date: Date | string) => {
  if (!date) return 'Never'
  return new Date(date).toLocaleString()
}

const pollForSyncStatus = () => {
  // Poll for sync status every 3 seconds for real-time updates
  const pollInterval = setInterval(async () => {
    try {
      const response = await fetch('/api/admin/crea/sync-status', {
        headers: getAuthHeaders()
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch sync status')
      }
      
      const statusData = await response.json()
      
      // Update progress
      if (statusData.syncProgress) {
        syncProgress.value = statusData.syncProgress.progress || 0
        syncProgressText.value = statusData.syncProgress.text || ''
      }
      
      // Update sync results if available
      if (statusData.lastSyncResult) {
        lastSyncResult.value = statusData.lastSyncResult
      }
      
      // Check if sync is completed or failed
      if (statusData.syncStatus === 'completed') {
        clearInterval(pollInterval)
        syncing.value = false
        syncStatus.value = 'ready'
        syncProgress.value = 100
        syncProgressText.value = 'Sync completed successfully!'
        
        // Refresh stats and show completion message
        await loadStats()
        
        setTimeout(() => {
          syncProgress.value = 0
          syncProgressText.value = ''
        }, 5000)
        
      } else if (statusData.syncStatus === 'error') {
        clearInterval(pollInterval)
        syncing.value = false
        syncStatus.value = 'error'
        syncProgressText.value = 'Sync failed!'
        
        setTimeout(() => {
          syncProgress.value = 0
          syncProgressText.value = ''
          syncStatus.value = 'ready'
        }, 5000)
        
      } else if (statusData.syncStatus === 'running') {
        // Continue polling
        syncStatus.value = 'running'
      }
      
    } catch (error) {
      console.error('Error polling sync status:', error)
    }
  }, 3000)
  
  // Stop polling after 15 minutes max
  setTimeout(() => {
    clearInterval(pollInterval)
    if (syncing.value) {
      syncing.value = false
      syncStatus.value = 'ready'
      syncProgress.value = 0
      syncProgressText.value = ''
    }
  }, 900000)
}

const loadAllSettings = async () => {
  try {
    // Load all settings in parallel
    const headers = getAuthHeaders()
    const [generalRes, emailRes, apiRes, securityRes, templatesRes] = await Promise.all([
      fetch('/api/admin/settings/general', { headers }),
      fetch('/api/admin/settings/email', { headers }),
      fetch('/api/admin/settings/api', { headers }),
      fetch('/api/admin/settings/security', { headers }),
      fetch('/api/admin/settings/email/templates', { headers })
    ])

    // Update settings with loaded data
    if (generalRes.ok) {
      const data = await generalRes.json()
      generalSettings.value = { ...generalSettings.value, ...data }
    }

    // Load googleReviewUrl from tenant settings
    try {
      const tenantRes = await fetch('/api/admin/tenant-settings', { headers })
      if (tenantRes.ok) {
        const tenantData = await tenantRes.json()
        generalSettings.value.googleReviewUrl = tenantData.googleReviewUrl || ''
      }
    } catch (e) { /* ignore */ }

    if (emailRes.ok) {
      const data = await emailRes.json()
      emailSettings.value = data
    }

    if (apiRes.ok) {
      const data = await apiRes.json()
      apiSettings.value = data
    }

    if (securityRes.ok) {
      const data = await securityRes.json()
      securitySettings.value = data
    }

    if (templatesRes.ok) {
      const data = await templatesRes.json()
      emailTemplates.value.splice(0, emailTemplates.value.length, ...data)
    }

    console.log('✅ All settings loaded successfully')
  } catch (error) {
    console.error('❌ Failed to load settings:', error)
  }
}

onMounted(async () => {
  await Promise.all([
    loadStats(),
    loadCities(),
    loadAutoSyncSettings(),
    loadCurrentSyncStatus(),
    loadAllSettings()
  ])
})

definePageMeta({
  layout: 'admin',
  middleware: ['admin']
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@700&display=swap');

.premium-settings-wrapper {
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

.premium-card:hover {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06) !important;
}

.border-error-subtle {
  border-color: #FEE2E2 !important;
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

/* Luxury Stats */
.stats-grid-premium {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.stat-item-luxury {
  background: #F8FAFC;
  border: 1px solid #F1F5F9;
  padding: 20px 10px;
  border-radius: 16px;
  text-align: center;
  transition: all 0.2s ease;
}

.stat-item-luxury:hover {
  background: white;
  border-color: #CBD5E1;
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.stat-value {
  display: block;
  font-size: 1.75rem;
  font-weight: 800;
  color: #1E293B;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  color: #94A3B8;
  letter-spacing: 0.05em;
}

.last-sync-pill {
  transition: all 0.2s ease;
}

.sync-controls-premium {
  background: #F8FAFC;
  padding: 24px;
  border-radius: 16px;
  border: 1px solid #F1F5F9;
}

.next-sync-info {
  transition: all 0.2s ease;
}

/* Table styling */
.premium-table :deep(th) {
  background: #F8FAFC !important;
  height: 60px !important;
  border-bottom: 1px solid #F1F5F9 !important;
  font-weight: 700 !important;
}

.premium-table :deep(td) {
  height: 60px !important;
  border-bottom: 1px solid #F8FAFC !important;
}

.table-row-premium {
  transition: background 0.15s ease;
}

.table-row-premium:hover {
  background: #F1F5F9 !important;
}

/* Navigation Items */
.premium-nav-item {
  transition: all 0.2s ease;
}

.premium-nav-item:hover {
  background: #F1F5F9 !important;
}

.active-nav-item {
  background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%) !important;
  color: white !important;
}

.active-nav-item :deep(.v-list-item-title) {
  color: white !important;
}

.active-nav-item :deep(.v-icon) {
  color: white !important;
}

/* Inputs & Buttons */
.premium-input :deep(.v-field__outline) {
  --v-field-border-opacity: 0.1;
  border-radius: 12px !important;
}

.premium-input :deep(.v-field) {
  border-radius: 12px !important;
}

.premium-input-filled :deep(.v-field) {
  border-radius: 12px !important;
  background: #F1F5F9 !important;
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

.add-btn-premium {
  background: #10B981 !important;
  color: white !important;
  border-radius: 10px !important;
  text-transform: none !important;
  font-weight: 700 !important;
}

.premium-chip {
  height: 36px !important;
  font-size: 0.75rem !important;
  letter-spacing: 0.02em !important;
  border-radius: 10px !important;
}

.premium-chip-result {
  height: 32px !important;
  font-size: 0.75rem !important;
  font-weight: 700 !important;
  border-radius: 8px !important;
}

.premium-switch :deep(.v-selection-control) {
  min-height: 40px !important;
}

/* Expansion Panels */
.premium-expansion :deep(.v-expansion-panel) {
  border-radius: 12px !important;
  margin-bottom: 12px !important;
  border: 1px solid #E2E8F0 !important;
}

.premium-expansion :deep(.v-expansion-panel-title) {
  padding: 20px 24px !important;
  border-radius: 12px !important;
}

.premium-panel {
  background: white !important;
}

.sync-results {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preview-container {
  padding: 0;
}

.preview-subject {
  transition: all 0.2s ease;
}

.preview-content {
  min-height: 200px;
}

/* Utility Classes */
.bg-green-50 {
  background: #F0FDF4 !important;
}

.bg-blue-50 {
  background: #EFF6FF !important;
}

.bg-red-50 {
  background: #FEF2F2 !important;
}

.bg-slate-50 {
  background: #F8FAFC !important;
}

.border-slate-100 {
  border-color: #F1F5F9 !important;
}

.border-slate-200 {
  border-color: #E2E8F0 !important;
}

.border-blue-100 {
  border-color: #DBEAFE !important;
}

.border-red-100 {
  border-color: #FEE2E2 !important;
}

.text-slate-400 {
  color: #94A3B8 !important;
}

.text-slate-500 {
  color: #64748B !important;
}

.text-slate-600 {
  color: #475569 !important;
}

.text-slate-700 {
  color: #334155 !important;
}

.text-slate-800 {
  color: #1E293B !important;
}

.text-slate-900 {
  color: #0F172A !important;
}

.text-blue-600 {
  color: #2563EB !important;
}

.text-blue-700 {
  color: #1D4ED8 !important;
}

.text-blue-900 {
  color: #1E3A8A !important;
}

.rounded-lg {
  border-radius: 12px !important;
}

.rounded-xl {
  border-radius: 16px !important;
}

.tracking-wider {
  letter-spacing: 0.05em !important;
}

.tracking-widest {
  letter-spacing: 0.1em !important;
}

.font-mono {
  font-family: 'Courier New', monospace !important;
}

.w-fit {
  width: fit-content;
}

.sticky {
  position: sticky;
}

.top-0 {
  top: 0;
}

.top-24 {
  top: 96px;
}

.z-50 {
  z-index: 50;
}

.gap-3 {
  gap: 12px;
}

.gap-4 {
  gap: 16px;
}

@media (max-width: 960px) {
  .stats-grid-premium {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .header-glass {
    padding: 16px !important;
  }
  
  .premium-card .p-8 {
    padding: 24px !important;
  }
}
</style>
