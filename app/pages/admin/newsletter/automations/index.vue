<template>
  <div class="admin-automations-premium px-md-8 py-md-6">
    <v-container fluid>
      <!-- Page Header -->
      <v-row class="mb-8 align-center">
        <v-col cols="12" md="8">
          <div class="d-flex align-center mb-2">
            <v-btn icon="mdi-arrow-left" variant="text" :to="'/admin/newsletter'" class="mr-3"></v-btn>
            <div class="premium-accent-bar mr-4"></div>
            <span class="text-overline letter-spacing-2 text-gold">Marketing Automation</span>
          </div>
          <h1 class="display-serif text-h3 mb-1">Automations</h1>
          <p class="text-subtitle-1 text-medium-emphasis font-weight-light">
            Schedule and automate your newsletter campaigns
          </p>
        </v-col>
        <v-col cols="12" md="4" class="text-md-right">
          <v-btn 
            color="primary" 
            prepend-icon="mdi-robot-outline"
            @click="showAutomationDialog = true"
          >
            Create Automation
          </v-btn>
        </v-col>
      </v-row>

      <!-- Automations List -->
      <v-row>
        <v-col v-for="automation in automations" :key="automation.id" cols="12" md="6">
          <v-card class="automation-card-premium" elevation="0">
            <v-card-text class="pa-6">
              <div class="d-flex justify-space-between align-start mb-4">
                <div class="d-flex align-items-center">
                  <v-switch
                    :model-value="automation.isActive"
                    color="success"
                    density="compact"
                    hide-details
                    @update:model-value="toggleAutomation(automation)"
                  />
                  <v-chip
                    :color="automation.isActive ? 'success' : 'grey'"
                    size="small"
                    class="ml-3"
                    variant="flat"
                  >
                    {{ automation.isActive ? 'Active' : 'Inactive' }}
                  </v-chip>
                </div>
                <v-menu>
                  <template v-slot:activator="{ props }">
                    <v-btn icon="mdi-dots-vertical" variant="text" size="small" v-bind="props"></v-btn>
                  </template>
                  <v-list>
                    <v-list-item @click="editAutomation(automation)">
                      <v-list-item-title>
                        <v-icon icon="mdi-pencil" size="small" class="mr-2" />
                        Edit
                      </v-list-item-title>
                    </v-list-item>
                    <v-list-item @click="deleteAutomation(automation.id)">
                      <v-list-item-title class="text-error">
                        <v-icon icon="mdi-delete" size="small" class="mr-2" />
                        Delete
                      </v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </div>

              <div class="automation-icon mb-4">
                <v-icon icon="mdi-robot-outline" size="40" color="#8c734b" />
              </div>

              <h3 class="text-h6 font-weight-bold mb-2">{{ automation.name }}</h3>
              <p v-if="automation.description" class="text-caption text-medium-emphasis mb-4">
                {{ automation.description }}
              </p>

              <div class="automation-details mb-4">
                <div class="detail-item">
                  <v-icon icon="mdi-calendar-clock" size="small" class="mr-2" />
                  <span class="text-body-2">{{ getFrequencyText(automation) }}</span>
                </div>
                <div class="detail-item">
                  <v-icon icon="mdi-clock-outline" size="small" class="mr-2" />
                  <span class="text-body-2">{{ automation.timeOfDay || '09:00' }}</span>
                </div>
                <div v-if="automation.templateId" class="detail-item">
                  <v-icon icon="mdi-file-document-outline" size="small" class="mr-2" />
                  <span class="text-body-2">Uses template</span>
                </div>
              </div>

              <v-divider class="my-4" />

              <div class="d-flex justify-space-between align-center">
                <div class="text-caption text-medium-emphasis">
                  <div>Runs: {{ automation.runCount }}</div>
                  <div v-if="automation.lastRun">Last: {{ formatDate(automation.lastRun) }}</div>
                </div>
                <div v-if="automation.nextRun && automation.isActive" class="text-caption font-weight-bold text-success">
                  Next: {{ formatDate(automation.nextRun) }}
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Empty State -->
      <v-row v-if="!loading && automations.length === 0">
        <v-col cols="12">
          <v-card class="text-center pa-12" elevation="0">
            <v-icon icon="mdi-robot-outline" size="64" color="#cbd5e1" class="mb-4" />
            <h3 class="text-h5 mb-2">No Automations Yet</h3>
            <p class="text-medium-emphasis mb-6">Create your first automation to schedule newsletters automatically</p>
            <v-btn color="primary" prepend-icon="mdi-plus" @click="showAutomationDialog = true">
              Create Automation
            </v-btn>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Automation Dialog -->
    <v-dialog v-model="showAutomationDialog" max-width="700" scrollable>
      <v-card>
        <v-card-title class="pa-6">
          <span class="display-serif text-h5">{{ editingAutomation ? 'Edit' : 'Create' }} Automation</span>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-6">
          <v-form ref="form">
            <v-text-field density="compact"
              v-model="formData.name"
              label="Automation Name"
              variant="outlined"
              class="mb-4"
              :rules="[v => !!v || 'Name is required']"
            />
            <v-textarea density="compact"
              v-model="formData.description"
              label="Description (Optional)"
              variant="outlined"
              rows="2"
              class="mb-4"
            />
            
            <h4 class="text-subtitle-1 font-weight-bold mb-3">Schedule</h4>
            <v-select density="compact"
              v-model="formData.frequency"
              :items="['daily', 'weekly', 'monthly']"
              label="Frequency"
              variant="outlined"
              class="mb-4"
              :rules="[v => !!v || 'Frequency is required']"
            />
            
            <v-select density="compact"
              v-if="formData.frequency === 'weekly'"
              v-model="formData.dayOfWeek"
              :items="dayOptions"
              label="Day of Week"
              variant="outlined"
              class="mb-4"
            />
            
            <v-text-field density="compact"
              v-if="formData.frequency === 'monthly'"
              v-model.number="formData.dayOfMonth"
              type="number"
              min="1"
              max="31"
              label="Day of Month"
              variant="outlined"
              class="mb-4"
            />
            
            <v-text-field density="compact"
              v-model="formData.timeOfDay"
              type="time"
              label="Time of Day"
              variant="outlined"
              class="mb-4"
            />

            <v-text-field density="compact"
              v-model="formData.subject"
              label="Email Subject (Optional)"
              variant="outlined"
              class="mb-4"
              hint="Leave empty to use template subject"
            />
            
            <v-switch
              v-model="formData.isActive"
              label="Activate immediately"
              color="primary"
            />
          </v-form>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-6">
          <v-spacer />
          <v-btn variant="text" @click="closeAutomationDialog">Cancel</v-btn>
          <v-btn color="primary" @click="saveAutomation" :loading="saving">
            {{ editingAutomation ? 'Update' : 'Create' }}
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

const automations = ref<any[]>([])
const loading = ref(false)
const saving = ref(false)
const showAutomationDialog = ref(false)
const editingAutomation = ref<any>(null)
const formData = ref({
  name: '',
  description: '',
  frequency: 'weekly',
  dayOfWeek: 1,
  dayOfMonth: 1,
  timeOfDay: '09:00',
  subject: '',
  isActive: true
})

const dayOptions = [
  { title: 'Monday', value: 1 },
  { title: 'Tuesday', value: 2 },
  { title: 'Wednesday', value: 3 },
  { title: 'Thursday', value: 4 },
  { title: 'Friday', value: 5 },
  { title: 'Saturday', value: 6 },
  { title: 'Sunday', value: 0 }
]

const getFrequencyText = (automation: any) => {
  if (automation.frequency === 'daily') {
    return 'Daily'
  } else if (automation.frequency === 'weekly') {
    const day = dayOptions.find(d => d.value === automation.dayOfWeek)
    return `Weekly on ${day?.title || 'Monday'}`
  } else if (automation.frequency === 'monthly') {
    return `Monthly on day ${automation.dayOfMonth}`
  }
  return automation.frequency
}

const loadAutomations = async () => {
  loading.value = true
  try {
    const data = await $fetch('/api/admin/newsletter/automations', {
      headers: getAuthHeaders()
    }) as any

    automations.value = data.automations
  } catch (error) {
    console.error('Error loading automations:', error)
  } finally {
    loading.value = false
  }
}

const editAutomation = (automation: any) => {
  editingAutomation.value = automation
  formData.value = {
    name: automation.name,
    description: automation.description || '',
    frequency: automation.frequency || 'weekly',
    dayOfWeek: automation.dayOfWeek || 1,
    dayOfMonth: automation.dayOfMonth || 1,
    timeOfDay: automation.timeOfDay || '09:00',
    subject: automation.subject || '',
    isActive: automation.isActive
  }
  showAutomationDialog.value = true
}

const toggleAutomation = async (automation: any) => {
  try {
    await $fetch(`/api/admin/newsletter/automations/${automation.id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: { isActive: !automation.isActive }
    })
    await loadAutomations()
  } catch (error) {
    console.error('Error toggling automation:', error)
  }
}

const deleteAutomation = async (id: number) => {
  if (!confirm('Are you sure you want to delete this automation?')) return

  try {
    await $fetch(`/api/admin/newsletter/automations/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    await loadAutomations()
  } catch (error) {
    console.error('Error deleting automation:', error)
  }
}

const saveAutomation = async () => {
  saving.value = true
  try {
    if (editingAutomation.value) {
      await $fetch(`/api/admin/newsletter/automations/${editingAutomation.value.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: formData.value
      })
    } else {
      await $fetch('/api/admin/newsletter/automations', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData.value
      })
    }
    closeAutomationDialog()
    await loadAutomations()
  } catch (error: any) {
    console.error('Error saving automation:', error)
    alert(error.data?.message || 'An error occurred')
  } finally {
    saving.value = false
  }
}

const closeAutomationDialog = () => {
  showAutomationDialog.value = false
  editingAutomation.value = null
  formData.value = {
    name: '',
    description: '',
    frequency: 'weekly',
    dayOfWeek: 1,
    dayOfMonth: 1,
    timeOfDay: '09:00',
    subject: '',
    isActive: true
  }
}

onMounted(() => {
  loadAutomations()
})

definePageMeta({
  layout: 'admin',
  middleware: ['admin']
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;600;700&display=swap');

.admin-automations-premium {
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

.automation-card-premium {
  border-radius: 20px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  background: white !important;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.automation-card-premium:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.08) !important;
}

.automation-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 70px;
  height: 70px;
  background: rgba(140, 115, 75, 0.1);
  border-radius: 16px;
}

.automation-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-item {
  display: flex;
  align-items: center;
  color: #64748b;
}
</style>
