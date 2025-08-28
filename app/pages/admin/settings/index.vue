<template>
  <v-container>
    <h1 class="text-h4 mb-6">System Settings</h1>

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
                    required
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="generalSettings.supportEmail"
                    label="Support Email"
                    type="email"
                    :rules="emailRules"
                    required
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="generalSettings.phone"
                    label="Contact Phone"
                    :rules="phoneRules"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-select
                    v-model="generalSettings.timezone"
                    :items="timezones"
                    label="Default Timezone"
                    required
                    :rules="[v => !!v || 'Timezone is required']"
                  />
                </v-col>

                <v-col cols="12">
                  <v-file-input
                    v-model="generalSettings.logo"
                    label="Site Logo"
                    accept="image/*"
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
                    required
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="emailSettings.fromName"
                    label="From Name"
                    :rules="[v => !!v || 'From name is required']"
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
                            />
                          </v-col>

                          <v-col cols="12" md="6">
                            <v-text-field
                              v-model="emailSettings.smtp.port"
                              label="SMTP Port"
                              type="number"
                              :rules="[v => !!v || 'SMTP port is required']"
                            />
                          </v-col>

                          <v-col cols="12" md="6">
                            <v-text-field
                              v-model="emailSettings.smtp.username"
                              label="SMTP Username"
                            />
                          </v-col>

                          <v-col cols="12" md="6">
                            <v-text-field
                              v-model="emailSettings.smtp.password"
                              label="SMTP Password"
                              type="password"
                              autocomplete="new-password"
                            />
                          </v-col>

                          <v-col cols="12">
                            <v-switch
                              v-model="emailSettings.smtp.secure"
                              label="Use SSL/TLS"
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
                            />
                          </v-col>

                          <v-col cols="12">
                            <v-text-field
                              v-model="api.apiSecret"
                              :label="api.name + ' API Secret'"
                              type="password"
                              autocomplete="new-password"
                            />
                          </v-col>

                          <v-col cols="12">
                            <v-switch
                              v-model="api.enabled"
                              :label="'Enable ' + api.name"
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
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-select
                    v-model="securitySettings.passwordPolicy"
                    :items="passwordPolicies"
                    label="Password Policy"
                    required
                    :rules="[v => !!v || 'Password policy is required']"
                  />
                </v-col>

                <v-col cols="12">
                  <v-switch
                    v-model="securitySettings.twoFactorAuth"
                    label="Enable Two-Factor Authentication"
                  />
                </v-col>

                <v-col cols="12">
                  <v-switch
                    v-model="securitySettings.ipWhitelisting"
                    label="Enable IP Whitelisting"
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
                />
              </v-col>

              <v-col cols="12">
                <v-textarea
                  v-model="templateForm.content"
                  label="Template Content"
                  :rules="[v => !!v || 'Content is required']"
                  required
                  rows="15"
                />
              </v-col>

              <v-col cols="12">
                <v-expansion-panel>
                  <v-expansion-panel-title>Available Variables</v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <v-chip-group>
                      <v-chip
                        v-for="variable in templateVariables"
                        :key="variable"
                        @click="insertVariable(variable)"
                      >
                        {{ variable }}
                      </v-chip>
                    </v-chip-group>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="showTemplateDialog = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="primary"
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
import { ref } from 'vue'

const activeSection = ref('general')
const saving = ref(false)
const testing = ref(false)
const showTemplateDialog = ref(false)
const showPreviewDialog = ref(false)
const selectedTemplate = ref(null)
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

const emailTemplates = [
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
]

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

const saveGeneralSettings = async () => {
  saving.value = true
  try {
    // Replace with actual API call
    await fetch('/api/admin/settings/general', {
      method: 'POST',
      body: JSON.stringify(generalSettings.value)
    })
    // Show success message
  } catch (error) {
    console.error('Error saving general settings:', error)
  } finally {
    saving.value = false
  }
}

const saveEmailSettings = async () => {
  saving.value = true
  try {
    // Replace with actual API call
    await fetch('/api/admin/settings/email', {
      method: 'POST',
      body: JSON.stringify(emailSettings.value)
    })
    // Show success message
  } catch (error) {
    console.error('Error saving email settings:', error)
  } finally {
    saving.value = false
  }
}

const saveApiSettings = async () => {
  saving.value = true
  try {
    // Replace with actual API call
    await fetch('/api/admin/settings/api', {
      method: 'POST',
      body: JSON.stringify(apiSettings.value)
    })
    // Show success message
  } catch (error) {
    console.error('Error saving API settings:', error)
  } finally {
    saving.value = false
  }
}

const saveSecuritySettings = async () => {
  saving.value = true
  try {
    // Replace with actual API call
    await fetch('/api/admin/settings/security', {
      method: 'POST',
      body: JSON.stringify(securitySettings.value)
    })
    // Show success message
  } catch (error) {
    console.error('Error saving security settings:', error)
  } finally {
    saving.value = false
  }
}

const testEmailSettings = async () => {
  testing.value = true
  try {
    // Replace with actual API call
    await fetch('/api/admin/settings/email/test', {
      method: 'POST',
      body: JSON.stringify(emailSettings.value)
    })
    // Show success message
  } catch (error) {
    console.error('Error testing email settings:', error)
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
    // Replace with actual API call
    await fetch(`/api/admin/settings/email/templates/${selectedTemplate.value.id}`, {
      method: 'PUT',
      body: JSON.stringify(templateForm.value)
    })
    showTemplateDialog.value = false
    // Show success message
  } catch (error) {
    console.error('Error saving template:', error)
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

onMounted(async () => {
  try {
    // Replace with actual API calls
    // const [general, email, api, security] = await Promise.all([
    //   fetch('/api/admin/settings/general').then(r => r.json()),
    //   fetch('/api/admin/settings/email').then(r => r.json()),
    //   fetch('/api/admin/settings/api').then(r => r.json()),
    //   fetch('/api/admin/settings/security').then(r => r.json())
    // ])
    // generalSettings.value = general
    // emailSettings.value = email
    // apiSettings.value = api
    // securitySettings.value = security
  } catch (error) {
    console.error('Error loading settings:', error)
  }
})
</script>

<style scoped>
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
