<template>
  <div class="premium-site-management bg-[#F8FAFC] min-h-screen">
    <!-- Header -->
    <div class="header-glass sticky top-0 z-50 px-8 py-4 border-b border-slate-200 backdrop-blur-md bg-white/80">
      <div class="max-w-[1600px] mx-auto d-flex align-center">
        <div>
          <div class="flex items-center space-x-2 mb-0">
            <span class="text-[10px] uppercase tracking-[0.3em] font-bold text-primary">Site Configuration</span>
          </div>
          <h1 class="text-h4 font-serif text-slate-900 font-weight-bold">Site Management</h1>
        </div>
        <v-spacer />
      </div>
    </div>

    <v-container fluid class="max-w-[1600px] px-8 pt-8 pb-16">
      <!-- Home Page Templates Section -->
      <v-row>
        <v-col cols="12">
          <v-card class="premium-card">
            <div class="p-8 border-b border-slate-100 bg-slate-50/50 d-flex align-center">
              <div class="icon-orb mr-5">
                <v-icon color="primary" size="24">mdi-palette</v-icon>
              </div>
              <div>
                <h2 class="text-h5 font-serif text-slate-900">Home Page Templates</h2>
                <p class="text-caption text-slate-500 font-medium italic mb-0">Choose and activate a home page design template</p>
              </div>
            </div>

            <v-card-text class="p-8">
              <v-alert
                v-if="saveSuccess"
                type="success"
                variant="tonal"
                class="mb-6"
                closable
                @click:close="saveSuccess = false"
              >
                Template activated successfully! The changes will be visible on your home page.
              </v-alert>

              <v-alert
                v-if="saveError"
                type="error"
                variant="tonal"
                class="mb-6"
                closable
                @click:close="saveError = false"
              >
                {{ saveError }}
              </v-alert>

              <div class="templates-grid">
                <div
                  v-for="template in templates"
                  :key="template.id"
                  class="template-card"
                  :class="{ 'template-active': template.id === activeTemplate }"
                  @click="selectTemplate(template.id)"
                >
                  <div class="template-preview">
                    <img
                      :src="template.preview"
                      :alt="template.name"
                      class="template-image"
                    />
                    <div v-if="template.id === activeTemplate" class="active-badge">
                      <v-icon color="white" size="20">mdi-check-circle</v-icon>
                      <span>Active</span>
                    </div>
                  </div>
                  <div class="template-info">
                    <h3 class="template-name">{{ template.name }}</h3>
                    <p class="template-description">{{ template.description }}</p>
                    <div class="template-features">
                      <v-chip
                        v-for="feature in template.features"
                        :key="feature"
                        size="small"
                        variant="outlined"
                        class="mr-2 mb-2"
                      >
                        {{ feature }}
                      </v-chip>
                    </div>
                  </div>
                  <div class="template-actions">
                    <v-btn
                      v-if="template.id === activeTemplate"
                      color="success"
                      variant="flat"
                      disabled
                      class="text-none"
                      block
                    >
                      Currently Active
                    </v-btn>
                    <v-btn
                      v-else
                      color="primary"
                      variant="elevated"
                      class="text-none font-weight-bold"
                      block
                      :loading="saving && selectedTemplateId === template.id"
                      @click.stop="activateTemplate(template.id)"
                    >
                      Activate Template
                    </v-btn>
                  </div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '~/utils/api'

const activeTemplate = ref(1)
const selectedTemplateId = ref<number | null>(null)
const saving = ref(false)
const saveSuccess = ref(false)
const saveError = ref<string | null>(null)

const templates = [
  {
    id: 1,
    name: 'Classic Modern',
    description: 'Clean and sophisticated design with a split hero section and dark featured properties section.',
    preview: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800&auto=format&fit=crop',
    features: ['Split Layout', 'Dark Theme', 'Parallax CTA']
  },
  {
    id: 2,
    name: 'Full-Width Hero',
    description: 'Bold full-width hero with overlay, floating stats cards, and elegant gradient sections.',
    preview: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=800&auto=format&fit=crop',
    features: ['Full Hero', 'Floating Stats', 'Gradient CTA']
  },
  {
    id: 3,
    name: 'Minimal Clean',
    description: 'Minimalist design with clean lines, subtle colors, and focused content presentation.',
    preview: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800&auto=format&fit=crop',
    features: ['Minimal Design', 'Clean Layout', 'Simple CTA']
  },
  {
    id: 4,
    name: 'Bold Split',
    description: 'Dramatic split-screen hero with bold typography and high-contrast dark sections.',
    preview: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=800&auto=format&fit=crop',
    features: ['Split Screen', 'Bold Typography', 'High Contrast']
  },
  {
    id: 5,
    name: 'Centered Elegant',
    description: 'Centered hero design with elegant gradients, floating stat cards, and premium aesthetics.',
    preview: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=800&auto=format&fit=crop',
    features: ['Centered Layout', 'Elegant Design', 'Premium Aesthetics']
  }
]

const selectTemplate = (templateId: number) => {
  selectedTemplateId.value = templateId
}

const activateTemplate = async (templateId: number) => {
  saving.value = true
  saveSuccess.value = false
  saveError.value = null
  selectedTemplateId.value = templateId

  try {
    const response = await api.post('/api/admin/settings/home-template', {
      template: templateId
    })

    if (response.success) {
      activeTemplate.value = templateId
      saveSuccess.value = true
      console.log(`✅ Template ${templateId} activated successfully`)
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        saveSuccess.value = false
      }, 5000)
      
      // Show a message to refresh the home page
      setTimeout(() => {
        if (confirm(`Template ${templateId} has been activated! Would you like to view the home page to see the changes?`)) {
          window.open('/', '_blank')
        }
      }, 1000)
    } else {
      throw new Error('Failed to activate template')
    }
  } catch (error: any) {
    console.error('Failed to activate template:', error)
    // Provide more specific error messages
    if (error.message?.includes('Failed to fetch') || error.message?.includes('network')) {
      saveError.value = 'Unable to connect to server. Please ensure the server is running and try again.'
    } else if (error.statusCode === 401 || error.statusMessage?.includes('token')) {
      saveError.value = 'Authentication failed. Please log in again.'
    } else if (error.statusCode === 403) {
      saveError.value = 'You do not have permission to perform this action.'
    } else {
      saveError.value = error.message || error.statusMessage || 'Failed to activate template. Please try again.'
    }
  } finally {
    saving.value = false
    selectedTemplateId.value = null
  }
}

onMounted(async () => {
  try {
    const data = await api.get('/api/admin/settings/home-template')
    activeTemplate.value = data.template || 1
  } catch (error: any) {
    console.error('Failed to load active template:', error)
    // Show error if it's not a network issue (network issues are expected if server is down)
    if (error.statusCode && error.statusCode !== 0) {
      saveError.value = 'Failed to load current template. Please refresh the page.'
    }
  }
})
</script>

<style scoped>
.premium-site-management {
  font-family: 'Inter', sans-serif;
}

.header-glass {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.premium-card {
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(226, 232, 240, 0.8);
}

.icon-orb {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.template-card {
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

.template-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  border-color: #3b82f6;
}

.template-card.template-active {
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.template-preview {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
  background: #f1f5f9;
}

.template-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.template-card:hover .template-image {
  transform: scale(1.05);
}

.active-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: #10b981;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 50px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.template-info {
  padding: 1.5rem;
  flex-grow: 1;
}

.template-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 0.5rem;
}

.template-description {
  font-size: 0.875rem;
  color: #64748b;
  line-height: 1.6;
  margin-bottom: 1rem;
}

.template-features {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.template-actions {
  padding: 1rem 1.5rem 1.5rem;
  border-top: 1px solid #e2e8f0;
}

/* Mobile Responsive */
@media (max-width: 960px) {
  .templates-grid {
    grid-template-columns: 1fr;
  }
  
  .template-preview {
    height: 180px;
  }
}
</style>
