<template>
  <div class="admin-templates-premium px-md-8 py-md-6">
    <v-container fluid>
      <!-- Page Header -->
      <v-row class="mb-8 align-center">
        <v-col cols="12" md="8">
          <div class="d-flex align-center mb-2">
            <v-btn icon="mdi-arrow-left" variant="text" :to="'/admin/newsletter'" class="mr-3"></v-btn>
            <div class="premium-accent-bar mr-4"></div>
            <span class="text-overline letter-spacing-2 text-gold">Template Library</span>
          </div>
          <h1 class="display-serif text-h3 mb-1">Email Templates</h1>
        </v-col>
        <v-col cols="12" md="4" class="text-md-right">
          <v-btn 
            color="primary" 
            prepend-icon="mdi-file-plus"
            @click="showTemplateDialog = true"
          >
            Create Template
          </v-btn>
        </v-col>
      </v-row>

      <!-- Filters -->
      <v-row class="mb-6">
        <v-col cols="12" md="4">
          <v-select
            v-model="categoryFilter"
            :items="categoryOptions"
            label="Category"
            variant="outlined"
            density="comfortable"
            @update:model-value="loadTemplates"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-select
            v-model="activeFilter"
            :items="activeOptions"
            label="Status"
            variant="outlined"
            density="comfortable"
            @update:model-value="loadTemplates"
          />
        </v-col>
      </v-row>

      <!-- Templates Grid -->
      <v-row>
        <v-col v-for="template in templates" :key="template.id" cols="12" md="6" lg="4">
          <v-card class="template-card-premium" elevation="0">
            <v-card-text class="pa-6">
              <div class="d-flex justify-space-between align-start mb-4">
                <v-chip
                  :color="template.isActive ? 'success' : 'grey'"
                  size="small"
                  variant="flat"
                >
                  {{ template.isActive ? 'Active' : 'Inactive' }}
                </v-chip>
                <v-menu>
                  <template v-slot:activator="{ props }">
                    <v-btn icon="mdi-dots-vertical" variant="text" size="small" v-bind="props"></v-btn>
                  </template>
                  <v-list>
                    <v-list-item @click="editTemplate(template)">
                      <v-list-item-title>
                        <v-icon icon="mdi-pencil" size="small" class="mr-2" />
                        Edit
                      </v-list-item-title>
                    </v-list-item>
                    <v-list-item @click="duplicateTemplate(template)">
                      <v-list-item-title>
                        <v-icon icon="mdi-content-copy" size="small" class="mr-2" />
                        Duplicate
                      </v-list-item-title>
                    </v-list-item>
                    <v-list-item @click="deleteTemplate(template.id)">
                      <v-list-item-title class="text-error">
                        <v-icon icon="mdi-delete" size="small" class="mr-2" />
                        Delete
                      </v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </div>

              <div class="template-icon mb-4">
                <v-icon icon="mdi-file-document-outline" size="48" color="#8c734b" />
              </div>

              <h3 class="text-h6 font-weight-bold mb-2">{{ template.name }}</h3>
              <p class="text-caption text-medium-emphasis mb-2">{{ template.subject }}</p>
              
              <div v-if="template.category" class="mb-4">
                <v-chip size="x-small" variant="tonal">{{ template.category }}</v-chip>
              </div>

              <v-divider class="my-4" />

              <div class="d-flex justify-space-between align-center text-caption text-medium-emphasis">
                <span>
                  <v-icon icon="mdi-email" size="small" class="mr-1" />
                  {{ template._count?.newsletters || 0 }} campaigns
                </span>
                <span>{{ formatDate(template.updatedAt) }}</span>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Pagination -->
      <div v-if="pagination.totalPages > 1" class="d-flex justify-center mt-8">
        <v-pagination
          v-model="pagination.page"
          :length="pagination.totalPages"
          :total-visible="7"
          @update:model-value="loadTemplates"
        />
      </div>
    </v-container>

    <!-- Template Dialog -->
    <v-dialog v-model="showTemplateDialog" max-width="900" scrollable>
      <v-card>
        <v-card-title class="pa-6">
          <span class="display-serif text-h5">{{ editingTemplate ? 'Edit' : 'Create' }} Template</span>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-6">
          <v-form ref="form">
            <v-text-field
              v-model="formData.name"
              label="Template Name"
              variant="outlined"
              class="mb-4"
              :rules="[v => !!v || 'Name is required']"
            />
            <v-text-field
              v-model="formData.subject"
              label="Email Subject"
              variant="outlined"
              class="mb-4"
              :rules="[v => !!v || 'Subject is required']"
            />
            <v-select
              v-model="formData.category"
              :items="['market-update', 'property-showcase', 'tips', 'announcement']"
              label="Category"
              variant="outlined"
              class="mb-4"
            />
            <v-textarea
              v-model="formData.content"
              label="Email Content (HTML)"
              variant="outlined"
              rows="10"
              class="mb-4"
              :rules="[v => !!v || 'Content is required']"
            />
            <v-text-field
              v-model="formData.previewText"
              label="Preview Text"
              variant="outlined"
              class="mb-4"
            />
            <v-switch
              v-model="formData.isActive"
              label="Active"
              color="primary"
            />
          </v-form>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-6">
          <v-spacer />
          <v-btn variant="text" @click="closeTemplateDialog">Cancel</v-btn>
          <v-btn color="primary" @click="saveTemplate" :loading="saving">
            {{ editingTemplate ? 'Update' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { formatDate } from '~/utils/formatters'

const getAuthHeaders = () => {
  if (process.client) {
    const token = localStorage.getItem('token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }
  return {}
}

const templates = ref<any[]>([])
const loading = ref(false)
const saving = ref(false)
const categoryFilter = ref('')
const activeFilter = ref('')
const pagination = ref({ page: 1, limit: 12, total: 0, totalPages: 0 })
const showTemplateDialog = ref(false)
const editingTemplate = ref<any>(null)
const formData = ref({
  name: '',
  subject: '',
  content: '',
  previewText: '',
  category: '',
  isActive: true
})

const categoryOptions = [
  { title: 'All Categories', value: '' },
  { title: 'Market Update', value: 'market-update' },
  { title: 'Property Showcase', value: 'property-showcase' },
  { title: 'Tips', value: 'tips' },
  { title: 'Announcement', value: 'announcement' }
]

const activeOptions = [
  { title: 'All', value: '' },
  { title: 'Active', value: 'true' },
  { title: 'Inactive', value: 'false' }
]

const loadTemplates = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.value.page,
      limit: pagination.value.limit
    }
    if (categoryFilter.value) params.category = categoryFilter.value
    if (activeFilter.value !== '') params.isActive = activeFilter.value

    const data = await $fetch('/api/admin/newsletter/templates', {
      headers: getAuthHeaders(),
      params
    }) as any

    templates.value = data.templates
    pagination.value = data.pagination
  } catch (error) {
    console.error('Error loading templates:', error)
  } finally {
    loading.value = false
  }
}

const editTemplate = (template: any) => {
  editingTemplate.value = template
  formData.value = {
    name: template.name,
    subject: template.subject,
    content: template.content,
    previewText: template.previewText || '',
    category: template.category || '',
    isActive: template.isActive
  }
  showTemplateDialog.value = true
}

const duplicateTemplate = (template: any) => {
  formData.value = {
    name: `${template.name} (Copy)`,
    subject: template.subject,
    content: template.content,
    previewText: template.previewText || '',
    category: template.category || '',
    isActive: false
  }
  showTemplateDialog.value = true
}

const deleteTemplate = async (id: number) => {
  if (!confirm('Are you sure you want to delete this template?')) return

  try {
    await $fetch(`/api/admin/newsletter/templates/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    await loadTemplates()
  } catch (error) {
    console.error('Error deleting template:', error)
  }
}

const saveTemplate = async () => {
  saving.value = true
  try {
    if (editingTemplate.value) {
      await $fetch(`/api/admin/newsletter/templates/${editingTemplate.value.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: formData.value
      })
    } else {
      await $fetch('/api/admin/newsletter/templates', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData.value
      })
    }
    closeTemplateDialog()
    await loadTemplates()
  } catch (error: any) {
    console.error('Error saving template:', error)
    alert(error.data?.message || 'An error occurred')
  } finally {
    saving.value = false
  }
}

const closeTemplateDialog = () => {
  showTemplateDialog.value = false
  editingTemplate.value = null
  formData.value = {
    name: '',
    subject: '',
    content: '',
    previewText: '',
    category: '',
    isActive: true
  }
}

onMounted(() => {
  loadTemplates()
})

definePageMeta({
  layout: 'admin',
  middleware: ['admin']
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;600;700&display=swap');

.admin-templates-premium {
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

.template-card-premium {
  border-radius: 20px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  background: white !important;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.template-card-premium:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.08) !important;
}

.template-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: rgba(140, 115, 75, 0.1);
  border-radius: 16px;
}
</style>
