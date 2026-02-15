<template>
  <div class="admin-listing-templates px-md-8 py-md-6">
    <v-container fluid>
      <!-- Page Header -->
      <v-row class="mb-10 align-center">
        <v-col cols="12" md="8">
          <div class="d-flex align-center mb-2">
            <v-btn icon="mdi-arrow-left" variant="text" size="small" class="mr-2" to="/admin" />
            <div class="premium-accent-bar mr-4"></div>
            <span class="text-overline letter-spacing-2 text-gold">Listing Templates</span>
          </div>
          <h1 class="display-serif text-h3 mb-1">Smart Listing Creator</h1>
          <p class="text-subtitle-1 text-medium-emphasis font-weight-light">
            Create stunning, premium listing pages with automated styling
          </p>
        </v-col>
        <v-col cols="12" md="4" class="text-md-right">
          <v-btn
            color="primary"
            size="large"
            prepend-icon="mdi-plus"
            class="premium-action-btn"
            @click="showCreateDialog = true"
          >
            Create Template
          </v-btn>
        </v-col>
      </v-row>

      <!-- Stats -->
      <v-row class="mb-10">
        <v-col cols="12" sm="4">
          <v-card class="stat-card-premium" elevation="0">
            <v-card-text>
              <div class="d-flex align-center mb-4">
                <div class="icon-orb primary-orb mr-3">
                  <v-icon icon="mdi-file-document-multiple" />
                </div>
              </div>
              <div class="text-h3 font-weight-bold mb-1">{{ templates.length }}</div>
              <div class="text-overline text-medium-emphasis">Total Templates</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" sm="4">
          <v-card class="stat-card-premium" elevation="0">
            <v-card-text>
              <div class="d-flex align-center mb-4">
                <div class="icon-orb success-orb mr-3">
                  <v-icon icon="mdi-check-circle" />
                </div>
              </div>
              <div class="text-h3 font-weight-bold mb-1">{{ templates.filter(t => t.status === 'published').length }}</div>
              <div class="text-overline text-medium-emphasis">Published</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" sm="4">
          <v-card class="stat-card-premium" elevation="0">
            <v-card-text>
              <div class="d-flex align-center mb-4">
                <div class="icon-orb gold-orb mr-3">
                  <v-icon icon="mdi-eye" />
                </div>
              </div>
              <div class="text-h3 font-weight-bold mb-1">{{ totalViews }}</div>
              <div class="text-overline text-medium-emphasis">Total Views</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Templates Grid -->
      <v-row>
        <v-col v-for="template in templates" :key="template.id" cols="12" sm="6" lg="4">
          <v-card class="template-card" elevation="0" @click="editTemplate(template)">
            <!-- Preview Image -->
            <div class="template-preview" :style="getPreviewStyle(template)">
              <div class="template-overlay">
                <v-chip
                  :color="template.status === 'published' ? 'success' : 'warning'"
                  size="small"
                  class="ma-3 text-uppercase font-weight-bold"
                >
                  {{ template.status }}
                </v-chip>
              </div>
              <div class="preview-content">
                <div class="text-h5 font-weight-bold text-white">{{ template.name }}</div>
                <div v-if="template.propertyAddress" class="text-body-2 text-white mt-1 opacity-80">
                  {{ template.propertyAddress }}
                </div>
              </div>
            </div>

            <v-card-text class="pa-4">
              <div class="d-flex justify-space-between align-center mb-2">
                <v-chip size="x-small" variant="tonal" :color="getThemeColor(template.theme)">
                  {{ template.theme }}
                </v-chip>
                <span class="text-caption text-medium-emphasis">
                  <v-icon size="x-small" class="mr-1">mdi-eye</v-icon>{{ template.views || 0 }}
                </span>
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ formatDate(template.createdAt) }}
              </div>
            </v-card-text>

            <v-card-actions class="px-4 pb-4 pt-0">
              <v-btn size="small" variant="tonal" prepend-icon="mdi-pencil" @click.stop="editTemplate(template)">
                Edit
              </v-btn>
              <v-btn
                v-if="template.status === 'published' && template.slug"
                size="small"
                variant="tonal"
                color="success"
                prepend-icon="mdi-open-in-new"
                @click.stop="viewListing(template)"
              >
                View
              </v-btn>
              <v-spacer />
              <v-btn size="small" icon variant="text" color="error" @click.stop="confirmDelete(template)">
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>

        <!-- Empty State -->
        <v-col v-if="templates.length === 0" cols="12">
          <v-card class="text-center pa-12" elevation="0" style="border: 2px dashed rgba(0,0,0,0.1); border-radius: 24px;">
            <v-icon size="80" color="grey-lighten-1" class="mb-4">mdi-image-plus</v-icon>
            <div class="text-h5 font-weight-bold mb-2">No listing templates yet</div>
            <div class="text-body-1 text-medium-emphasis mb-6">
              Create your first premium listing page with automated styling
            </div>
            <v-btn color="primary" size="large" prepend-icon="mdi-plus" @click="showCreateDialog = true">
              Create Your First Template
            </v-btn>
          </v-card>
        </v-col>
      </v-row>

      <!-- Create/Edit Dialog -->
      <v-dialog v-model="showCreateDialog" max-width="1000" persistent scrollable>
        <v-card class="rounded-xl">
          <v-card-title class="pa-6 d-flex align-center">
            <span class="display-serif text-h5">{{ editingTemplate ? 'Edit' : 'Create' }} Listing Template</span>
            <v-spacer />
            <v-btn icon variant="text" @click="closeDialog"><v-icon>mdi-close</v-icon></v-btn>
          </v-card-title>

          <v-divider />

          <v-card-text class="pa-6" style="max-height: 70vh; overflow-y: auto;">
            <v-row>
              <!-- Basic Info -->
              <v-col cols="12">
                <div class="text-overline text-gold mb-3">Basic Information</div>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="form.name" label="Template Name" variant="outlined" required />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="form.propertyAddress" label="Property Address" variant="outlined" />
              </v-col>

              <!-- Theme Selection -->
              <v-col cols="12">
                <div class="text-overline text-gold mb-3">Design Theme</div>
              </v-col>
              <v-col cols="12">
                <v-row>
                  <v-col v-for="theme in themes" :key="theme.id" cols="6" sm="3">
                    <v-card
                      :class="['theme-card', { 'selected': form.theme === theme.id }]"
                      elevation="0"
                      @click="selectTheme(theme)"
                    >
                      <div class="theme-preview" :style="{ background: theme.gradient }">
                        <div class="text-body-2 font-weight-bold text-white">{{ theme.name }}</div>
                      </div>
                    </v-card>
                  </v-col>
                </v-row>
              </v-col>

              <!-- Layout Selection -->
              <v-col cols="12" md="6">
                <v-select
                  v-model="form.layout"
                  :items="layouts"
                  item-title="name"
                  item-value="id"
                  label="Page Layout"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="form.fontFamily"
                  :items="fonts"
                  label="Font Family"
                  variant="outlined"
                />
              </v-col>

              <!-- Description -->
              <v-col cols="12">
                <div class="d-flex align-center mb-3">
                  <span class="text-overline text-gold">Description</span>
                  <v-spacer />
                  <v-btn
                    size="small"
                    variant="tonal"
                    color="primary"
                    prepend-icon="mdi-auto-fix"
                    :loading="generatingDescription"
                    @click="generateDescription"
                  >
                    AI Generate
                  </v-btn>
                </div>
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="form.description"
                  label="Listing Description"
                  variant="outlined"
                  rows="5"
                  hint="Write or AI-generate a compelling listing description"
                />
              </v-col>

              <!-- Image Upload -->
              <v-col cols="12">
                <div class="text-overline text-gold mb-3">Property Images</div>
              </v-col>
              <v-col cols="12">
                <v-file-input
                  v-model="selectedImages"
                  label="Upload Images"
                  variant="outlined"
                  multiple
                  accept="image/*"
                  prepend-icon="mdi-camera"
                  hint="Upload high-quality property photos (max 10MB each)"
                  @update:model-value="uploadImages"
                  :loading="uploadingImages"
                />
              </v-col>

              <!-- Uploaded Images Grid -->
              <v-col v-if="form.images && form.images.length > 0" cols="12">
                <v-row>
                  <v-col v-for="(img, idx) in form.images" :key="idx" cols="6" sm="4" md="3">
                    <v-card class="image-card" elevation="0">
                      <v-img :src="img.url" height="120" cover class="rounded-lg" />
                      <div class="image-actions">
                        <v-btn icon size="x-small" color="error" variant="flat" @click="removeImage(idx)">
                          <v-icon size="small">mdi-close</v-icon>
                        </v-btn>
                      </div>
                      <v-select
                        v-model="img.type"
                        :items="['hero', 'gallery', 'floorplan']"
                        density="compact"
                        variant="plain"
                        class="mt-1"
                        hide-details
                      />
                    </v-card>
                  </v-col>
                </v-row>
              </v-col>

              <!-- Floor Plans -->
              <v-col cols="12">
                <div class="text-overline text-gold mb-3">Floor Plans (Optional)</div>
                <v-file-input
                  v-model="selectedFloorPlans"
                  label="Upload Floor Plans"
                  variant="outlined"
                  multiple
                  accept="image/*,.pdf"
                  prepend-icon="mdi-floor-plan"
                  @update:model-value="uploadFloorPlans"
                  :loading="uploadingFloorPlans"
                />
              </v-col>

              <!-- Branding -->
              <v-col cols="12">
                <div class="text-overline text-gold mb-3">Branding (Optional)</div>
              </v-col>
              <v-col cols="12" md="6">
                <v-file-input
                  v-model="selectedLogo"
                  label="Upload Logo"
                  variant="outlined"
                  accept="image/*"
                  prepend-icon="mdi-image"
                  @update:model-value="uploadLogo"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field
                  v-model="form.primaryColor"
                  label="Primary Color"
                  variant="outlined"
                  type="color"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field
                  v-model="form.accentColor"
                  label="Accent Color"
                  variant="outlined"
                  type="color"
                />
              </v-col>

              <!-- Features -->
              <v-col cols="12">
                <div class="text-overline text-gold mb-3">Key Features</div>
                <v-combobox
                  v-model="form.features"
                  label="Add features (press Enter)"
                  variant="outlined"
                  multiple
                  chips
                  closable-chips
                />
              </v-col>
            </v-row>
          </v-card-text>

          <v-divider />

          <v-card-actions class="pa-6">
            <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
            <v-spacer />
            <v-btn variant="tonal" @click="saveTemplate('draft')" :loading="saving">
              Save as Draft
            </v-btn>
            <v-btn color="primary" @click="saveTemplate('published')" :loading="saving">
              Publish
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Delete Confirmation -->
      <v-dialog v-model="showDeleteDialog" max-width="400">
        <v-card class="rounded-xl">
          <v-card-title class="pa-6">Delete Template?</v-card-title>
          <v-card-text>
            This action cannot be undone. The listing page will be removed.
          </v-card-text>
          <v-card-actions class="pa-6 pt-0">
            <v-spacer />
            <v-btn variant="text" @click="showDeleteDialog = false">Cancel</v-btn>
            <v-btn color="error" @click="deleteTemplate" :loading="deleting">Delete</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const getAuthHeaders = (): Record<string, string> => {
  if (process.client) {
    const token = localStorage.getItem('token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }
  return {}
}

const templates = ref<any[]>([])
const showCreateDialog = ref(false)
const showDeleteDialog = ref(false)
const editingTemplate = ref<any>(null)
const deletingTemplate = ref<any>(null)
const saving = ref(false)
const deleting = ref(false)
const generatingDescription = ref(false)
const uploadingImages = ref(false)
const uploadingFloorPlans = ref(false)
const selectedImages = ref<File[]>([])
const selectedFloorPlans = ref<File[]>([])
const selectedLogo = ref<File | null>(null)

const form = ref({
  name: '',
  propertyAddress: '',
  description: '',
  theme: 'luxury',
  layout: 'hero-gallery',
  fontFamily: 'Playfair Display',
  primaryColor: '#1a1a2e',
  accentColor: '#c9a96e',
  images: [] as any[],
  floorPlans: [] as any[],
  brandingLogo: '',
  features: [] as string[]
})

const themes = [
  { id: 'luxury', name: 'Luxury', gradient: 'linear-gradient(135deg, #1a1a2e, #c9a96e)' },
  { id: 'modern', name: 'Modern', gradient: 'linear-gradient(135deg, #0f172a, #3b82f6)' },
  { id: 'classic', name: 'Classic', gradient: 'linear-gradient(135deg, #2c1810, #8b6914)' },
  { id: 'minimal', name: 'Minimal', gradient: 'linear-gradient(135deg, #111111, #666666)' },
]

const layouts = [
  { id: 'hero-gallery', name: 'Hero + Gallery' },
  { id: 'slideshow', name: 'Full Slideshow' },
  { id: 'grid', name: 'Grid Layout' },
  { id: 'split', name: 'Split View' },
]

const fonts = ['Playfair Display', 'Inter', 'Georgia', 'Helvetica Neue', 'Lora', 'Montserrat']

const totalViews = computed(() => templates.value.reduce((sum, t) => sum + (t.views || 0), 0))

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const getPreviewStyle = (template: any) => {
  const heroImage = template.images?.find?.((i: any) => i.type === 'hero') || template.images?.[0]
  if (heroImage?.url) {
    return { backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7)), url(${heroImage.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
  }
  const t = themes.find(th => th.id === template.theme)
  return { background: t?.gradient || themes[0]?.gradient }
}

const getThemeColor = (theme: string) => {
  const colors: Record<string, string> = { luxury: 'amber', modern: 'blue', classic: 'brown', minimal: 'grey' }
  return colors[theme] || 'primary'
}

function selectTheme(theme: any) {
  form.value.theme = theme.id
  const colors: Record<string, { primary: string; accent: string }> = {
    luxury: { primary: '#1a1a2e', accent: '#c9a96e' },
    modern: { primary: '#0f172a', accent: '#3b82f6' },
    classic: { primary: '#2c1810', accent: '#8b6914' },
    minimal: { primary: '#111111', accent: '#666666' }
  }
  const c = colors[theme.id] || colors.luxury
  form.value.primaryColor = c!.primary
  form.value.accentColor = c!.accent
}

function editTemplate(template: any) {
  editingTemplate.value = template
  form.value = {
    name: template.name,
    propertyAddress: template.propertyAddress || '',
    description: template.description || '',
    theme: template.theme || 'luxury',
    layout: template.layout || 'hero-gallery',
    fontFamily: template.fontFamily || 'Playfair Display',
    primaryColor: template.primaryColor || '#1a1a2e',
    accentColor: template.accentColor || '#c9a96e',
    images: template.images || [],
    floorPlans: template.floorPlans || [],
    brandingLogo: template.brandingLogo || '',
    features: template.features || []
  }
  showCreateDialog.value = true
}

function closeDialog() {
  showCreateDialog.value = false
  editingTemplate.value = null
  resetForm()
}

function resetForm() {
  form.value = {
    name: '', propertyAddress: '', description: '', theme: 'luxury',
    layout: 'hero-gallery', fontFamily: 'Playfair Display',
    primaryColor: '#1a1a2e', accentColor: '#c9a96e',
    images: [], floorPlans: [], brandingLogo: '', features: []
  }
  selectedImages.value = []
  selectedFloorPlans.value = []
  selectedLogo.value = null
}

async function uploadImages() {
  if (!selectedImages.value?.length) return
  uploadingImages.value = true
  try {
    for (const file of selectedImages.value) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', 'gallery')
      const res = await $fetch('/api/admin/listing-templates/upload-image', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: fd
      }) as any
      if (res.success) {
        form.value.images.push({ url: res.url, type: 'gallery', caption: '', originalName: res.originalName })
      }
    }
  } finally {
    uploadingImages.value = false
    selectedImages.value = []
  }
}

async function uploadFloorPlans() {
  if (!selectedFloorPlans.value?.length) return
  uploadingFloorPlans.value = true
  try {
    for (const file of selectedFloorPlans.value) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', 'floorplan')
      const res = await $fetch('/api/admin/listing-templates/upload-image', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: fd
      }) as any
      if (res.success) {
        form.value.floorPlans.push({ url: res.url, label: file.name })
      }
    }
  } finally {
    uploadingFloorPlans.value = false
    selectedFloorPlans.value = []
  }
}

async function uploadLogo() {
  if (!selectedLogo.value) return
  const fd = new FormData()
  fd.append('file', selectedLogo.value)
  fd.append('type', 'branding')
  const res = await $fetch('/api/admin/listing-templates/upload-image', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: fd
  }) as any
  if (res.success) {
    form.value.brandingLogo = res.url
  }
}

function removeImage(idx: number) {
  form.value.images.splice(idx, 1)
}

async function generateDescription() {
  generatingDescription.value = true
  try {
    const res = await $fetch('/api/admin/listing-templates/generate-description', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: { propertyAddress: form.value.propertyAddress, features: form.value.features, description: form.value.description }
    }) as any
    if (res.success) form.value.description = res.description
  } catch (e) {
    console.error('Failed to generate description:', e)
  } finally {
    generatingDescription.value = false
  }
}

async function saveTemplate(status: string) {
  if (!form.value.name) return
  saving.value = true
  try {
    const method = editingTemplate.value ? 'PUT' : 'POST'
    const url = editingTemplate.value
      ? `/api/admin/listing-templates/${editingTemplate.value.id}`
      : '/api/admin/listing-templates'

    await $fetch(url, {
      method,
      headers: getAuthHeaders(),
      body: { ...form.value, status }
    })

    await loadTemplates()
    closeDialog()
  } finally {
    saving.value = false
  }
}

function confirmDelete(template: any) {
  deletingTemplate.value = template
  showDeleteDialog.value = true
}

async function deleteTemplate() {
  if (!deletingTemplate.value) return
  deleting.value = true
  try {
    await $fetch(`/api/admin/listing-templates/${deletingTemplate.value.id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    await loadTemplates()
    showDeleteDialog.value = false
  } finally {
    deleting.value = false
  }
}

function viewListing(template: any) {
  window.open(`/listing/${template.slug}`, '_blank')
}

async function loadTemplates() {
  try {
    const res = await $fetch('/api/admin/listing-templates', { headers: getAuthHeaders() }) as any
    templates.value = res.templates || []
  } catch (e) {
    console.error('Error loading templates:', e)
  }
}

onMounted(loadTemplates)

definePageMeta({ layout: 'admin', middleware: ['admin'] })
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;600;700&display=swap');

.admin-listing-templates {
  background-color: #fcfcfb;
  font-family: 'Inter', sans-serif;
  min-height: 100vh;
}

.display-serif { font-family: 'Playfair Display', serif; }
.text-gold { color: #8c734b; }
.letter-spacing-2 { letter-spacing: 2px; }
.premium-accent-bar { width: 40px; height: 4px; background: #8c734b; border-radius: 2px; }

.stat-card-premium {
  border-radius: 20px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  background: white !important;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.stat-card-premium:hover { transform: translateY(-5px); border-color: #8c734b !important; }

.icon-orb { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.primary-orb { background: rgba(var(--v-theme-primary), 0.1); color: rgb(var(--v-theme-primary)); }
.success-orb { background: rgba(var(--v-theme-success), 0.1); color: rgb(var(--v-theme-success)); }
.gold-orb { background: rgba(140, 115, 75, 0.1); color: #8c734b; }

.template-card {
  border-radius: 20px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
}
.template-card:hover { transform: translateY(-5px); box-shadow: 0 12px 40px rgba(0,0,0,0.1) !important; }

.template-preview {
  height: 180px;
  position: relative;
  display: flex;
  align-items: flex-end;
  padding: 16px;
}
.template-overlay { position: absolute; top: 0; left: 0; right: 0; }
.preview-content { position: relative; z-index: 1; }

.theme-card {
  border-radius: 12px !important;
  border: 2px solid transparent !important;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
}
.theme-card.selected { border-color: #8c734b !important; box-shadow: 0 0 0 2px rgba(140, 115, 75, 0.3) !important; }

.theme-preview {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
}

.image-card { position: relative; border-radius: 12px !important; border: 1px solid rgba(0,0,0,0.05) !important; }
.image-actions { position: absolute; top: 4px; right: 4px; }

.premium-action-btn {
  border-radius: 12px !important;
  text-transform: none !important;
  font-weight: 700 !important;
  letter-spacing: 0.5px !important;
}
</style>
