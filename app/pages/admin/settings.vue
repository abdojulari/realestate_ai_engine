<template>
  <v-container>
    <div class="d-flex align-center mb-6">
      <h1 class="text-h4">System Settings</h1>
      <v-spacer />
      <v-chip :color="syncStatus === 'running' ? 'warning' : 'success'" variant="tonal">
        <v-icon start>{{ syncStatus === 'running' ? 'mdi-sync' : 'mdi-check-circle' }}</v-icon>
        {{ syncStatus === 'running' ? 'Sync Running' : 'System Ready' }}
      </v-chip>
    </div>

    <!-- CREA MLS Integration Section -->
    <v-card class="mb-6">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-3" color="primary">mdi-database-sync</v-icon>
        CREA MLS Data Sync
      </v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <div class="d-flex align-center mb-4">
              <v-icon class="mr-2" color="success">mdi-check-circle</v-icon>
              <span>Connected to CREA DDF API</span>
            </div>
            
            <!-- Sync Statistics -->
            <v-card variant="outlined" class="mb-4">
              <v-card-text>
                <h3 class="text-h6 mb-3">Current Data Status</h3>
                <div class="stats-grid">
                  <div class="stat-item">
                    <div class="stat-value">{{ stats.totalProperties?.toLocaleString() || '0' }}</div>
                    <div class="stat-label">Total Properties</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-value">{{ stats.creaProperties?.toLocaleString() || '0' }}</div>
                    <div class="stat-label">MLS Properties</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-value">{{ stats.manualProperties?.toLocaleString() || '0' }}</div>
                    <div class="stat-label">Manual Properties</div>
                  </div>
                </div>
                <div class="mt-3">
                  <div class="text-caption">Last Sync: {{ formatDateTime(stats.lastSyncAt) || 'Never' }}</div>
                </div>
              </v-card-text>
            </v-card>

            <!-- Manual Sync Controls -->
            <div class="sync-controls">
              <h3 class="text-h6 mb-3">Manual Sync</h3>
              <v-row>
                <v-col cols="12" sm="8">
                  <v-select
                    v-model="syncCity"
                    :items="cities"
                    item-title="name"
                    item-value="name"
                    label="City (Optional)"
                    variant="outlined"
                    density="compact"
                    clearable
                  >
                    <template v-slot:selection="{ item }">
                      {{ item.raw.name }} ({{ item.raw.count }} properties)
                    </template>
                  </v-select>
                </v-col>
                <v-col cols="12" sm="4">
                  <v-btn
                    color="primary"
                    block
                    :loading="syncing"
                    :disabled="syncStatus === 'running'"
                    @click="startManualSync"
                  >
                    <v-icon start>mdi-sync</v-icon>
                    Sync Now
                  </v-btn>
                </v-col>
              </v-row>
            </div>
          </v-col>

          <v-col cols="12" md="6">
            <!-- Automatic Sync Settings -->
            <v-card variant="outlined">
              <v-card-text>
                <h3 class="text-h6 mb-3">Automatic Sync</h3>
                
                <v-switch
                  v-model="autoSyncEnabled"
                  label="Enable automatic daily sync"
                  color="primary"
                  @update:model-value="updateAutoSyncSetting"
                />
                
                <div v-if="autoSyncEnabled" class="mt-3">
                  <v-select
                    v-model="autoSyncTime"
                    :items="timeOptions"
                    label="Sync Time"
                    variant="outlined"
                    density="compact"
                    @update:model-value="updateAutoSyncSetting"
                  />
                  <div class="text-caption mt-2">
                    Next sync: {{ nextSyncTime }}
                  </div>
                </div>

                <v-alert
                  v-if="autoSyncEnabled"
                  type="info"
                  variant="tonal"
                  class="mt-4"
                >
                  <div class="text-body-2">
                    <strong>Automatic Sync:</strong> New MLS properties will be synced daily at {{ autoSyncTime }}. 
                    This happens in the background without affecting site performance.
                  </div>
                </v-alert>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Sync Progress/Results -->
    <v-card v-if="lastSyncResult || syncing">
      <v-card-title>
        <v-icon class="mr-3">mdi-history</v-icon>
        Sync Activity
      </v-card-title>
      <v-card-text>
        <!-- Current Sync Progress -->
        <div v-if="syncing" class="mb-4">
          <div class="d-flex align-center mb-2">
            <v-progress-circular
              indeterminate
              size="20"
              width="2"
              color="primary"
              class="mr-2"
            />
            <span>Syncing properties from CREA...</span>
          </div>
          <v-progress-linear
            :model-value="syncProgress"
            color="primary"
            height="4"
            rounded
          />
          <div class="text-caption mt-1">{{ syncProgressText }}</div>
        </div>

        <!-- Last Sync Results -->
        <div v-if="lastSyncResult">
          <h4 class="text-subtitle-1 mb-2">Last Sync Results</h4>
          <div class="sync-results">
            <v-chip color="success" class="mr-2 mb-2">
              <v-icon start>mdi-plus</v-icon>
              {{ lastSyncResult.created || 0 }} Created
            </v-chip>
            <v-chip color="info" class="mr-2 mb-2">
              <v-icon start>mdi-update</v-icon>
              {{ lastSyncResult.updated || 0 }} Updated
            </v-chip>
            <v-chip v-if="lastSyncResult.total" color="primary" class="mr-2 mb-2">
              <v-icon start>mdi-database</v-icon>
              {{ lastSyncResult.total }} Total
            </v-chip>
            <v-chip v-if="lastSyncResult.errors > 0" color="error" class="mr-2 mb-2">
              <v-icon start>mdi-alert</v-icon>
              {{ lastSyncResult.errors }} Errors
            </v-chip>
          </div>
          
          <!-- Error details if any -->
          <v-alert
            v-if="lastSyncResult.error"
            type="error"
            variant="tonal"
            class="mt-3"
          >
            <div class="text-body-2">
              <strong>Sync Error:</strong> {{ lastSyncResult.error }}
            </div>
          </v-alert>
          
          <div class="text-caption mt-2">
            Completed: {{ formatDateTime(lastSyncResult.timestamp) }}
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- Other Settings Sections -->
    <v-row>
      <v-col cols="12" md="3">
        <v-card>
          <v-list nav>
            <v-list-item
              v-for="section in settingSections"
              :key="section.id"
              :value="section"
              :active="activeSection === section.id"
              @click="activeSection = section.id"
            >
              <template v-slot:prepend>
                <v-icon :icon="section.icon" />
              </template>
              <v-list-item-title>{{ section.title }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>

      <v-col cols="12" md="9">
        <!-- General Settings -->
        <v-card v-if="activeSection === 'general'" class="mb-6">
          <v-card-title>General Settings</v-card-title>
      <v-card-text>
            <v-form v-model="isGeneralFormValid" @submit.prevent="saveGeneralSettings">
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="generalSettings.siteName"
                    label="Site Name"
                    :rules="[v => !!v || 'Site name is required']"
                    variant="outlined"
                    density="compact"
                    required
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="generalSettings.supportEmail"
                    label="Support Email"
                    type="email"
                    :rules="emailRules"
                    variant="outlined"
                    density="compact"
                    required
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="generalSettings.phone"
                    label="Contact Phone"
                    :rules="phoneRules"
                    variant="outlined"
                    density="compact"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-select
                    v-model="generalSettings.timezone"
                    :items="timezones"
                    label="Default Timezone"
                    variant="outlined"
                    density="compact"
                    required
                    :rules="[v => !!v || 'Timezone is required']"
                  />
                </v-col>

                <v-col cols="12">
                  <v-file-input
                    v-model="generalSettings.logo"
                    label="Site Logo"
                    accept="image/*"
                    variant="outlined"
                    density="compact"
                    show-size
                    prepend-icon="mdi-camera"
                  />
                </v-col>
              </v-row>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn
              color="primary"
              :loading="saving"
              :disabled="!isGeneralFormValid"
              @click="saveGeneralSettings"
            >
              Save Changes
            </v-btn>
          </v-card-actions>
        </v-card>

        <!-- Email Settings -->
        <v-card v-if="activeSection === 'email'" class="mb-6">
          <v-card-title>Email Settings</v-card-title>
          <v-card-text>
            <v-form v-model="isEmailFormValid" @submit.prevent="saveEmailSettings">
              <v-row>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="emailSettings.provider"
                    :items="emailProviders"
                    label="Email Provider"
                    variant="outlined"
                    density="compact"
                    required
                    :rules="[v => !!v || 'Email provider is required']"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="emailSettings.fromEmail"
                    label="From Email"
                    type="email"
                    :rules="emailRules"
                    variant="outlined"
                    density="compact"
                    required
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="emailSettings.fromName"
                    label="From Name"
                    :rules="[v => !!v || 'From name is required']"
                    variant="outlined"
                    density="compact"
                    required
                  />
                </v-col>

                <v-col cols="12">
                  <v-expansion-panels>
                    <v-expansion-panel title="SMTP Settings">
                      <v-expansion-panel-text>
                        <v-row>
                          <v-col cols="12" md="6">
                            <v-text-field
                              v-model="emailSettings.smtp.host"
                              label="SMTP Host"
                              :rules="[v => !!v || 'SMTP host is required']"
                              variant="outlined"
                              density="compact"
                            />
                          </v-col>

                          <v-col cols="12" md="6">
                            <v-text-field
                              v-model="emailSettings.smtp.port"
                              label="SMTP Port"
                              type="number"
                              :rules="[v => !!v || 'SMTP port is required']"
                              variant="outlined"
                              density="compact"
                            />
                          </v-col>

                          <v-col cols="12" md="6">
                            <v-text-field
                              v-model="emailSettings.smtp.username"
                              label="SMTP Username"
                              variant="outlined"
                              density="compact"
                            />
                          </v-col>

                          <v-col cols="12" md="6">
                            <v-text-field
                              v-model="emailSettings.smtp.password"
                              label="SMTP Password"
                              type="password"
                              autocomplete="new-password"
                              variant="outlined"
                              density="compact"
                              />
                          </v-col>

                          <v-col cols="12">
                            <v-switch
                              v-model="emailSettings.smtp.secure"
                              label="Use SSL/TLS"
                              variant="outlined"
                              density="compact"
                            />
                          </v-col>
                        </v-row>
                      </v-expansion-panel-text>
                    </v-expansion-panel>

                    <v-expansion-panel title="Email Templates">
                      <v-expansion-panel-text>
                        <v-table>
                          <thead>
                            <tr>
                              <th>Template</th>
                              <th>Subject</th>
                              <th class="text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr
                              v-for="template in emailTemplates"
                              :key="template.id"
                            >
                              <td>{{ template.name }}</td>
                              <td>{{ template.subject }}</td>
                              <td class="text-right">
                                <v-btn
                                  icon="mdi-pencil"
                                  variant="text"
                                  size="small"
                                  @click="editTemplate(template)"
                                />
                                <v-btn
                                  icon="mdi-eye"
                                  variant="text"
                                  size="small"
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
                  >
                    Test Email Settings
                  </v-btn>
                </v-col>
              </v-row>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn
              color="primary"
              :loading="saving"
              :disabled="!isEmailFormValid"
              @click="saveEmailSettings"
            >
              Save Changes
            </v-btn>
          </v-card-actions>
        </v-card>

        <!-- API Settings -->
        <v-card v-if="activeSection === 'api'" class="mb-6">
          <v-card-title>API Settings</v-card-title>
          <v-card-text>
            <v-form v-model="isApiFormValid" @submit.prevent="saveApiSettings">
              <v-row>
                <v-col cols="12">
                  <v-expansion-panels>
                    <v-expansion-panel
                      v-for="api in apiSettings"
                      :key="api.name"
                      :title="api.name"
                    >
                      <v-expansion-panel-text>
                        <v-row>
                          <v-col cols="12">
                            <v-text-field
                              v-model="api.apiKey"
                              :label="api.name + ' API Key'"
                              type="password"
                              autocomplete="new-password"
                              variant="outlined"
                              density="compact"
                            />
                          </v-col>

                          <v-col cols="12">
                            <v-text-field
                              v-model="api.apiSecret"
                              :label="api.name + ' API Secret'"
                              type="password"
                              autocomplete="new-password"
                              variant="outlined"
                              density="compact"
                            />
                          </v-col>

                          <v-col cols="12">
                            <v-switch
                              v-model="api.enabled"
                              :label="'Enable ' + api.name"
                              variant="outlined"
                              density="compact"
                            />
                          </v-col>

                          <v-col cols="12">
                            <v-btn
                              color="info"
                              prepend-icon="mdi-check-circle"
                              @click="verifyApiCredentials(api)"
                              :loading="api.verifying"
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
          <v-card-actions>
            <v-spacer />
            <v-btn
              color="primary"
              :loading="saving"
              :disabled="!isApiFormValid"
              @click="saveApiSettings"
            >
              Save Changes
            </v-btn>
          </v-card-actions>
        </v-card>

        <!-- Security Settings -->
        <v-card v-if="activeSection === 'security'" class="mb-6">
          <v-card-title>Security Settings</v-card-title>
          <v-card-text>
            <v-form v-model="isSecurityFormValid" @submit.prevent="saveSecuritySettings">
              <v-row>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="securitySettings.sessionTimeout"
                    :items="sessionTimeouts"
                    label="Session Timeout"
                    required
                    :rules="[v => !!v || 'Session timeout is required']"
                    variant="outlined"
                    density="compact"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-select
                    v-model="securitySettings.passwordPolicy"
                    :items="passwordPolicies"
                    label="Password Policy"
                    required
                    :rules="[v => !!v || 'Password policy is required']"
                    variant="outlined"
                    density="compact"
                  />
                </v-col>

                <v-col cols="12">
                  <v-switch
                    v-model="securitySettings.twoFactorAuth"
                    label="Enable Two-Factor Authentication"
                    variant="outlined"
                    density="compact"
                  />
                </v-col>

                <v-col cols="12">
                  <v-switch
                    v-model="securitySettings.ipWhitelisting"
                    label="Enable IP Whitelisting"
                    variant="outlined"
                    density="compact"
                  />
                </v-col>

                <v-col
                  v-if="securitySettings.ipWhitelisting"
                  cols="12"
                >
                  <v-textarea
                    v-model="securitySettings.whitelistedIps"
                    label="Whitelisted IPs"
                    hint="Enter one IP address per line"
                    persistent-hint
                    rows="4"
                    variant="outlined"
                    density="compact"
                  />
                </v-col>
              </v-row>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn
              color="primary"
              :loading="saving"
              :disabled="!isSecurityFormValid"
              @click="saveSecuritySettings"
            >
              Save Changes
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Template Editor Dialog -->
    <v-dialog
      v-model="showTemplateDialog"
      max-width="800"
      scrollable
    >
      <v-card v-if="selectedTemplate">
        <v-card-title>Edit Template: {{ selectedTemplate.name }}</v-card-title>
        <v-card-text>
          <v-form v-model="isTemplateFormValid" @submit.prevent="saveTemplate">
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="templateForm.subject"
                  label="Email Subject"
                  :rules="[v => !!v || 'Subject is required']"
                  required
                  variant="outlined"
                  density="compact"
                />
              </v-col>

              <v-col cols="12">
                <v-textarea
                  v-model="templateForm.content"
                  label="Template Content"
                  :rules="[v => !!v || 'Content is required']"
                  required
                  rows="15"
                  variant="outlined"
                  density="compact"
                />
              </v-col>

              <v-col cols="12">
                <v-expansion-panels>
                  <v-expansion-panel>
                    <v-expansion-panel-title>Available Variables</v-expansion-panel-title>
                    <v-expansion-panel-text>
                      <v-chip-group>
                        <v-chip
                          v-for="variable in templateVariables"
                          :key="variable"
                          @click="insertVariable(variable)"
                          variant="outlined"
                          density="compact"
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
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            density="compact"
            @click="showTemplateDialog = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            density="compact"
            :loading="saving"
            :disabled="!isTemplateFormValid"
            @click="saveTemplate"
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
      <v-card v-if="selectedTemplate">
        <v-card-title>Preview: {{ selectedTemplate.name }}</v-card-title>
        <v-card-text>
          <div class="preview-container">
            <div class="preview-subject mb-4">
              <strong>Subject:</strong> {{ selectedTemplate.subject }}
            </div>
            <div class="preview-content" v-html="previewContent" />
        </div>
      </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="primary"
            density="compact"
            @click="showPreviewDialog = false"
          >
            Close
          </v-btn>
        </v-card-actions>
    </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
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
  logo: null
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
    const response = await fetch('/api/admin/settings/general', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(generalSettings.value)
    })
    
    if (!response.ok) {
      throw new Error('Failed to save general settings')
    }
    
    console.log('✅ General settings saved successfully')
    // TODO: Show success toast notification
  } catch (error) {
    console.error('❌ Error saving general settings:', error)
    // TODO: Show error toast notification
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
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(emailSettings.value)
    })
    
    if (!response.ok) {
      throw new Error('Failed to save email settings')
    }
    
    console.log('✅ Email settings saved successfully')
    // TODO: Show success toast notification
  } catch (error) {
    console.error('❌ Error saving email settings:', error)
    // TODO: Show error toast notification
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
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(apiSettings.value)
    })
    
    if (!response.ok) {
      throw new Error('Failed to save API settings')
    }
    
    console.log('✅ API settings saved successfully')
    // TODO: Show success toast notification
  } catch (error) {
    console.error('❌ Error saving API settings:', error)
    // TODO: Show error toast notification
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
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(securitySettings.value)
    })
    
    if (!response.ok) {
      throw new Error('Failed to save security settings')
    }
    
    console.log('✅ Security settings saved successfully')
    // TODO: Show success toast notification
  } catch (error) {
    console.error('❌ Error saving security settings:', error)
    // TODO: Show error toast notification
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
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(emailSettings.value)
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.statusMessage || 'Failed to test email settings')
    }
    
    const result = await response.json()
    console.log('✅ Test email sent successfully:', result.messageId)
    // TODO: Show success toast notification with result.message
  } catch (error: any) {
    console.error('❌ Error testing email settings:', error)
    // TODO: Show error toast notification with error.message
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
    console.log('✅ Template saved successfully')
    // TODO: Show success toast notification
  } catch (error) {
    console.error('❌ Error saving template:', error)
    // TODO: Show error toast notification
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
        'Authorization': `Bearer ${localStorage.getItem('token')}`
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
        'Authorization': `Bearer ${localStorage.getItem('token')}`
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
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
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
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
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
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
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
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
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
    const [generalRes, emailRes, apiRes, securityRes, templatesRes] = await Promise.all([
      fetch('/api/admin/settings/general', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      }),
      fetch('/api/admin/settings/email', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      }),
      fetch('/api/admin/settings/api', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      }),
      fetch('/api/admin/settings/security', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      }),
      fetch('/api/admin/settings/email/templates', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
    ])

    // Update settings with loaded data
    if (generalRes.ok) {
      const data = await generalRes.json()
      generalSettings.value = data
    }

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
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
}

.stat-item {
  text-align: center;
  padding: 16px;
  background: #f5f5f5;
  border-radius: 8px;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1976d2;
}

.stat-label {
  font-size: 0.875rem;
  color: #666;
  margin-top: 4px;
}

.sync-controls {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.sync-results {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preview-container {
  padding: 20px;
  background: #f5f5f5;
  border-radius: 4px;
}

.preview-subject {
  padding: 10px;
  background: white;
  border-radius: 4px;
}

.preview-content {
  padding: 20px;
  background: white;
  border-radius: 4px;
}
</style>
