<template>
  <div class="premium-content-wrapper bg-[#F8FAFC] min-h-screen">
    <!-- TOP NAVIGATION BAR (PREMIUM LOOK) -->
    <div class="header-glass sticky top-0 z-50 px-8 py-4 border-b border-slate-200 backdrop-blur-md bg-white/80">
      <div class="max-w-[1600px] mx-auto d-flex align-center">
        <div>
          <div class="flex items-center space-x-2 mb-0">
            <span class="text-[10px] uppercase tracking-[0.3em] font-bold text-primary">CMS Dashboard</span>
          </div>
          <h1 class="text-h4 font-serif text-slate-900 font-weight-bold">Content Management</h1>
        </div>
        <v-spacer />
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          @click="openAddContentDialog"
          class="add-btn-premium"
          elevation="0"
        >
          Add Content
        </v-btn>
      </div>
    </div>

    <v-container fluid class="max-w-[1600px] px-8 pt-8 pb-16">
      <!-- Content Sections -->
      <v-row>
        <v-col cols="12" md="3">
          <v-card class="premium-card sticky top-24">
            <div class="p-6 border-b border-slate-100">
              <h3 class="text-subtitle-2 font-weight-bold text-slate-400 uppercase tracking-widest">Content Sections</h3>
            </div>
            <v-list nav class="p-2">
              <v-list-item
                v-for="section in contentSections"
                :key="section.id"
                :value="section"
                :active="selectedSection === section.id"
                @click="selectSection(section.id)"
                class="rounded-lg mb-1 premium-nav-item"
                :class="{ 'active-nav-item': selectedSection === section.id }"
              >
                <template v-slot:prepend>
                  <v-icon :icon="section.icon" class="mr-3" />
                </template>
                <v-list-item-title class="font-weight-bold">{{ section.title }}</v-list-item-title>
                <template v-slot:append>
                  <v-chip
                    size="small"
                    :color="section.hasUnpublished ? 'warning' : 'success'"
                    variant="flat"
                    class="premium-chip-small"
                  >
                    {{ section.items }}
                  </v-chip>
                </template>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>

        <v-col cols="12" md="9">
          <v-card class="premium-card">
            <div class="p-8 border-b border-slate-100 d-flex align-center">
              <div class="icon-orb mr-4">
                <v-icon color="primary" size="24">{{ getCurrentSection?.icon || 'mdi-file-document' }}</v-icon>
              </div>
              <h2 class="text-h6 font-weight-bold">{{ getCurrentSection?.title }}</h2>
              <v-spacer />
              <v-text-field
                v-model="search"
                append-inner-icon="mdi-magnify"
                label="Search"
                single-line
                hide-details
                variant="outlined"
                rounded="lg"
                class="max-width-300 premium-input"
                density="comfortable"
              />
            </div>

            <v-card-text class="p-0">
              <v-table class="premium-table">
                <thead>
                  <tr>
                    <th class="py-6 px-8 text-slate-400 uppercase tracking-widest text-caption font-weight-bold">Title</th>
                    <th class="py-6 text-slate-400 uppercase tracking-widest text-caption font-weight-bold">Key</th>
                    <th class="py-6 text-slate-400 uppercase tracking-widest text-caption font-weight-bold">Type</th>
                    <th class="py-6 text-slate-400 uppercase tracking-widest text-caption font-weight-bold">Status</th>
                    <th class="py-6 text-slate-400 uppercase tracking-widest text-caption font-weight-bold">Last Updated</th>
                    <th class="py-6 px-8 text-right text-slate-400 uppercase tracking-widest text-caption font-weight-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in filteredContent"
                    :key="item.id"
                    class="table-row-premium"
                  >
                    <td class="px-8 font-weight-bold text-slate-700">{{ item.title }}</td>
                    <td>
                      <code class="text-caption bg-slate-100 rounded px-2 py-1 font-mono">{{ item.key }}</code>
                    </td>
                    <td>
                      <v-chip
                        size="small"
                        :color="getTypeColor(item.type)"
                        variant="flat"
                        class="premium-chip-small"
                      >
                        {{ item.type }}
                      </v-chip>
                    </td>
                    <td>
                      <v-chip
                        size="small"
                        :color="item.published ? 'success' : 'warning'"
                        variant="flat"
                        class="premium-chip-small font-weight-bold"
                      >
                        {{ item.published ? 'Published' : 'Draft' }}
                      </v-chip>
                    </td>
                    <td class="text-slate-600 text-caption">{{ formatDateTime(item.updatedAt) }}</td>
                    <td class="text-right px-8">
                      <v-btn
                        icon="mdi-pencil"
                        variant="text"
                        size="small"
                        color="primary"
                        @click="editContent(item)"
                      />
                      <v-btn
                        :icon="item.published ? 'mdi-eye-off' : 'mdi-eye'"
                        variant="text"
                        size="small"
                        color="info"
                        @click="togglePublished(item)"
                      />
                      <v-btn
                        icon="mdi-content-copy"
                        variant="text"
                        size="small"
                        color="secondary"
                        @click="duplicateContent(item)"
                      />
                      <v-btn
                        icon="mdi-delete"
                        variant="text"
                        size="small"
                        color="error"
                        @click="deleteContent(item)"
                      />
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Add/Edit Content Dialog -->
    <v-dialog
      v-model="showAddContentDialog"
      max-width="900"
      scrollable
    >
      <v-card class="premium-card">
        <div class="p-8 bg-slate-900 text-white">
          <h2 class="text-h5 font-serif">{{ editingContent ? 'Edit Content' : 'Add New Content' }}</h2>
          <p class="text-caption text-slate-400 mb-0">Manage your website content and media</p>
        </div>
        <v-card-text class="p-8">
          <v-form v-model="isContentFormValid" @submit.prevent="saveContent">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="contentForm.title"
                  label="Title"
                  :rules="[v => !!v || 'Title is required']"
                  required
                  variant="outlined"
                  rounded="lg"
                  class="premium-input"
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-select
                  v-model="contentForm.key"
                  :items="keyOptions"
                  item-title="title"
                  item-value="value"
                  label="Key"
                  :rules="[v => !!v || 'Key is required']"
                  required
                  variant="outlined"
                  rounded="lg"
                  class="premium-input"
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-select
                  v-model="contentForm.section"
                  :items="pageSections"
                  item-title="label"
                  item-value="id"
                  label="Page"
                  required
                  :rules="[v => !!v || 'Page is required']"
                  variant="outlined"
                  rounded="lg"
                  class="premium-input"
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-select
                  v-model="contentForm.type"
                  :items="contentTypes"
                  label="Section"
                  required
                  :rules="[v => !!v || 'Section is required']"
                  variant="outlined"
                  rounded="lg"
                  class="premium-input"
                />
              </v-col>

              <v-col cols="12">
                <div v-if="contentForm.type === 'text'">
                  <v-textarea
                    v-model="contentForm.content"
                    label="Content"
                    rows="5"
                    :rules="[v => !!v || 'Content is required']"
                    required
                    variant="outlined"
                    rounded="lg"
                    class="premium-input"
                  />
                </div>

                <div v-else-if="contentForm.type === 'html'">
                  <!-- Simple HTML Editor -->
                  <v-textarea
                    v-model="contentForm.content"
                    label="HTML Content"
                    rows="12"
                    variant="outlined"
                    :rules="[v => !!v || 'Content is required']"
                    required
                    class="html-code-editor premium-input"
                    rounded="lg"
                    spellcheck="false"
                    auto-grow
                    hint="Enter your HTML content. Use Tab for indentation."
                    persistent-hint
                  />

                  <!-- Image uploader for About page content -->
                  <div v-if="contentForm.section === 'about'" class="mt-6">
                    <v-file-input
                      v-model="contentForm.uploadedImages"
                      label="Upload Images for About Page"
                      accept="image/*"
                      multiple
                      show-size
                      prepend-icon="mdi-camera-plus"
                      hint="Upload up to multiple images (jpg, png, gif, webp)"
                      persistent-hint
                      variant="outlined"
                      rounded="lg"
                      class="premium-input"
                      @update:model-value="uploadAboutImages"
                    />
                    
                    <!-- Display uploaded image paths -->
                    <div v-if="contentForm.metadata?.imagePaths?.length > 0" class="mt-4">
                      <v-card class="premium-card-inner border border-slate-200">
                        <div class="p-4 border-b border-slate-100 d-flex align-center">
                          <v-icon class="mr-2" color="primary">mdi-image-multiple</v-icon>
                          <h4 class="text-subtitle-2 font-weight-bold">Available Images</h4>
                        </div>
                        <div class="pa-4">
                          <div class="text-caption mb-3 text-slate-600">Copy these paths to use in your HTML content:</div>
                          <v-list density="compact" class="bg-transparent">
                            <v-list-item
                              v-for="(imagePath, index) in contentForm.metadata.imagePaths"
                              :key="index"
                              class="pa-2 mb-1 rounded-lg hover-bg-slate-50"
                            >
                              <template v-slot:prepend>
                                <v-icon size="small" color="primary">mdi-file-image</v-icon>
                              </template>
                              <v-list-item-title>
                                <code class="text-caption bg-slate-100 px-2 py-1 rounded font-mono">{{ imagePath }}</code>
                              </v-list-item-title>
                              <template v-slot:append>
                                <v-btn
                                  icon="mdi-content-copy"
                                  variant="text"
                                  size="small"
                                  color="primary"
                                  @click="copyToClipboard(imagePath)"
                                />
                              </template>
                            </v-list-item>
                          </v-list>
                        </div>
                      </v-card>
                    </div>
                  </div>
                </div>

                <div v-else-if="['image','hero'].includes(contentForm.key)">
                  <v-file-input
                    v-model="contentForm.file"
                    :label="contentForm.key === 'hero' ? 'Hero Banner' : 'Image'"
                    accept="image/*"
                    :rules="[v => !!v || 'Image is required']"
                    required
                    show-size
                    prepend-icon="mdi-camera"
                    variant="outlined"
                    rounded="lg"
                    class="premium-input"
                  />
                  <v-img
                    v-if="contentForm.content"
                    :src="contentForm.content"
                    max-height="200"
                    contain
                    class="mt-4 rounded-lg"
                  />
                </div>

                <div v-else-if="contentForm.key === 'testimonial'">
                  <v-text-field
                    v-model="contentForm.metadata.author"
                    label="Author Name"
                    :rules="[v => !!v || 'Author name is required']"
                    required
                    variant="outlined"
                    rounded="lg"
                    class="premium-input mb-4"
                  />
                  <v-text-field
                    v-model="contentForm.metadata.position"
                    label="Author Position/Company"
                    variant="outlined"
                    rounded="lg"
                    class="premium-input mb-4"
                  />
                  <v-textarea
                    v-model="contentForm.content"
                    label="Testimonial"
                    rows="4"
                    :rules="[v => !!v || 'Testimonial content is required']"
                    required
                    variant="outlined"
                    rounded="lg"
                    class="premium-input mb-4"
                  />
                  <v-file-input
                    v-model="contentForm.file"
                    label="Author Photo"
                    accept="image/*"
                    show-size
                    prepend-icon="mdi-camera"
                    variant="outlined"
                    rounded="lg"
                    class="premium-input"
                  />
                </div>
                <div v-else-if="contentForm.key === 'why-choose-us-item'">
                  <v-text-field
                    v-model="contentForm.metadata.icon"
                    label="Icon (mdi-*)"
                    hint="Example: mdi-home-search"
                    persistent-hint
                    variant="outlined"
                    rounded="lg"
                    class="premium-input mb-4"
                  />
                  <v-text-field
                    v-model="contentForm.title"
                    label="Card Title"
                    :rules="[v => !!v || 'Card title is required']"
                    required
                    variant="outlined"
                    rounded="lg"
                    class="premium-input mb-4"
                  />
                  <v-textarea
                    v-model="contentForm.content"
                    label="Card Description"
                    rows="4"
                    :rules="[v => !!v || 'Description is required']"
                    required
                    variant="outlined"
                    rounded="lg"
                    class="premium-input"
                  />
                </div>
                <div v-else>
                  <v-text-field
                    v-model="contentForm.content"
                    :label="contentForm.key?.replace(/-/g,' ') || 'Content'"
                    :rules="[v => !!v || 'Content is required']"
                    required
                    variant="outlined"
                    rounded="lg"
                    class="premium-input"
                  />
                </div>
              </v-col>

              <v-col cols="12">
                <div class="p-6 bg-blue-50 rounded-xl border border-blue-100">
                  <v-switch
                    v-model="contentForm.published"
                    label="Publish immediately"
                    color="primary"
                    class="premium-switch mb-0"
                    hide-details
                  />
                </div>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions class="p-8 pt-0">
          <v-spacer />
          <v-btn
            variant="text"
            @click="cancelForm"
            class="px-6"
          >
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            :loading="saving"
            :disabled="!isContentFormValid"
            @click="saveContent"
            class="action-btn-primary px-8"
          >
            {{ editingContent ? 'Save Changes' : 'Add Content' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Reusable Alert Dialog -->
    <AlertDialog
      v-model="showDialog"
      :type="alertType"
      :title="alertTitle"
      :message="alertMessage"
      :confirm-text="alertConfirmText"
      @confirm="closeAlert"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
// @ts-ignore
import { api } from '~/utils/api'

// Alert system
const { showDialog, alertType, alertTitle, alertMessage, alertConfirmText, showSuccess, showError, closeAlert } = useAlert()

const search = ref('')
const selectedSection = ref<string | null>(null)
const showAddContentDialog = ref(false)
const editingContent = ref(false)
const saving = ref(false)
const isContentFormValid = ref(false)

const contentSections = ref<any[]>([])

const pageSections = [
  { id: 'home', label: 'Home Page' },
  { id: 'about', label: 'About Us' },
  { id: 'testimonials', label: 'Testimonials' }
]

const contentTypes = [
  { title: 'Hero', value: 'hero' },
  { title: 'Hero Title', value: 'hero-title' },
  { title: 'Hero Subtitle', value: 'hero-subtitle' },
  { title: 'Why Choose Us Section', value: 'why-choose-us' },
  { title: 'Why Choose Us Item', value: 'why-choose-us-item' },
  { title: 'Text', value: 'text' },
  { title: 'HTML', value: 'html' },
  { title: 'Image', value: 'image' },
  { title: 'Testimonial', value: 'testimonial' }
]

const pageKeyOptions: Record<string, Array<{ title: string, value: string }>> = {
  home: [
    { title: 'Hero (image banner)', value: 'hero' },
    { title: 'Hero Title', value: 'hero-title' },
    { title: 'Hero Subtitle', value: 'hero-subtitle' },
    { title: 'Why Choose Us (section title)', value: 'why-choose-us' },
    { title: 'Why Choose Us Item', value: 'why-choose-us-item' }
  ],
  about: [
    { title: 'Hero Title', value: 'about.hero.title' },
    { title: 'Hero Subtitle', value: 'about.hero.subtitle' },
    { title: 'Hero Image', value: 'about.hero.image' },
    { title: 'Story Title', value: 'about.story.title' },
    { title: 'Story Content (HTML)', value: 'about.story.content' },
    { title: 'Core Value 1', value: 'about.values.1' },
    { title: 'Core Value 2', value: 'about.values.2' },
    { title: 'Core Value 3', value: 'about.values.3' },
    { title: 'Stat 1', value: 'about.stats.1' },
    { title: 'Stat 2', value: 'about.stats.2' },
    { title: 'Stat 3', value: 'about.stats.3' },
    { title: 'Stat 4', value: 'about.stats.4' },
    { title: 'CTA Title', value: 'about.cta.title' },
    { title: 'CTA Subtitle', value: 'about.cta.subtitle' },
    { title: 'Legacy: About Title', value: 'about-title' },
    { title: 'Legacy: About Body', value: 'about-body' },
    { title: 'Legacy: About Subtitle', value: 'about-subtitle' },
    { title: 'Legacy: About Image', value: 'about-image' }
  ],
  testimonials: [
    { title: 'Testimonial Item', value: 'testimonial' }
  ]
}

const keyOptions = computed(() => pageKeyOptions[contentForm.section] || [])

const contentForm = reactive<any>({
  title: '',
  key: '',
  section: 'home',
  type: 'text',
  content: '',
  published: true,
  file: null,
  uploadedImages: null,
  metadata: {
    author: '',
    position: '',
    icon: '',
    imagePaths: []
  }
})

const contentItems = ref<any[]>([])

const getCurrentSection = computed(() => {
  return contentSections.value.find(s => s.id === selectedSection.value)
})

const filteredContent = computed(() => {
  let items = contentItems.value
  if (selectedSection.value) {
    items = items.filter(item => item.section === selectedSection.value)
  }
  if (search.value) {
    const s = search.value.toLowerCase()
    items = items.filter(item => item.title.toLowerCase().includes(s) || item.key.toLowerCase().includes(s))
  }
  return items
})

const getTypeColor = (type: string) => {
  const colors: Record<string, string> = { text: 'primary', html: 'secondary', image: 'success', testimonial: 'info' }
  return colors[type] || 'grey'
}

const formatDateTime = (date: Date | string) => new Date(date).toLocaleString()

const selectSection = async (sectionId: string) => {
  selectedSection.value = sectionId
  try {
    const items = await api.get(`/api/admin/content?section=${sectionId}`)
    contentItems.value = items as any[]
  } catch (e) { console.error(e) }
}

const editContent = (item: any) => {
  editingContent.value = true
  const metadata = item.metadata || {}
  Object.assign(contentForm, { 
    ...item, 
    file: null,
    uploadedImages: null,
    metadata: {
      ...metadata,
      imagePaths: metadata.imagePaths || []
    }
  })
  showAddContentDialog.value = true
}

const togglePublished = async (item: any) => {
  try {
    await api.post(`/api/admin/content/${item.id}/toggle-published`, {})
    item.published = !item.published
  } catch (e) {
    console.error(e)
  }
}

const duplicateContent = async (item: any) => {
  try {
    const newItem = await api.post(`/api/admin/content/${item.id}/duplicate`, {})
    contentItems.value.push(newItem as any)
  } catch (e) {
    console.error(e)
  }
}

const deleteContent = async (item: any) => {
  if (!confirm('Are you sure you want to delete this content?')) return
  try {
    await api.delete(`/api/admin/content/${item.id}`)
    contentItems.value = contentItems.value.filter(i => i.id !== item.id)
  } catch (e) {
    console.error(e)
  }
}

const uploadAboutImages = async (files: File | File[] | null) => {
  if (!files) return
  
  // Normalize to array
  const fileArray = Array.isArray(files) ? files : [files]
  if (fileArray.length === 0) return
  
  try {
    const formData = new FormData()
    fileArray.forEach((file, index) => {
      formData.append(`image${index}`, file)
    })
    
    const response: any = await api.post('/api/admin/content/upload-about-images', formData)
    if (response?.images) {
      // Add new image paths to existing ones
      const existingPaths = contentForm.metadata?.imagePaths || []
      contentForm.metadata.imagePaths = [...existingPaths, ...response.images]
    }
  } catch (e) {
    console.error('Failed to upload images:', e)
    showError('Please check your internet connection and try again.', 'Failed to Upload Images')
  }
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    // You could add a toast notification here
  } catch (e) {
    console.error('Failed to copy to clipboard:', e)
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
  }
}


const resetForm = () => {
  Object.assign(contentForm, {
    title: '',
    key: '',
    section: 'home',
    type: 'text',
    content: '',
    published: true,
    file: null,
    uploadedImages: null,
    metadata: {
      author: '',
      position: '',
      icon: '',
      imagePaths: []
    }
  })
}

const cancelForm = () => {
  showAddContentDialog.value = false
  editingContent.value = false
  resetForm()
}

const openAddContentDialog = () => {
  resetForm()
  editingContent.value = false
  showAddContentDialog.value = true
}

const saveContent = async () => {
  saving.value = true
  try {
    const dataToSend = {
      title: contentForm.title,
      key: contentForm.key || contentForm.type,
      type: contentForm.type,
      section: contentForm.section,
      content: contentForm.content,
      published: contentForm.published,
      metadata: contentForm.metadata
    }
    
    const formData = new FormData()
    formData.append('data', JSON.stringify(dataToSend))
    // Upload image first if needed
    if (contentForm.file && ['hero', 'image'].includes(contentForm.key || contentForm.type)) {
      try {
        const imgForm = new FormData()
        imgForm.append('image', contentForm.file)
        const uploadRes: any = await api.post('/api/admin/content/upload', imgForm)
        if (uploadRes?.url) contentForm.content = uploadRes.url
      } catch (e) {
        console.error('Image upload failed:', e)
      }
    }

    const endpoint = editingContent.value ? `/api/admin/content/${contentForm.id}` : '/api/admin/content'
    const method = editingContent.value ? 'PUT' : 'POST'

    const saved = method === 'PUT'
      ? await api.put(endpoint, formData)
      : await api.post(endpoint, formData)

    if (editingContent.value) {
      const idx = contentItems.value.findIndex(i => i.id === (saved as any).id)
      if (idx !== -1) contentItems.value[idx] = saved as any
    } else {
      contentItems.value.push(saved as any)
    }

    showAddContentDialog.value = false
    editingContent.value = false
    resetForm()
    // reload items for current section to reflect any filters
    try {
      const items = await api.get(`/api/admin/content?section=${selectedSection.value}`)
      contentItems.value = items as any[]
    } catch {}
  } catch (e) {
    console.error('Save failed:', e)
    showError((e as any)?.message || 'Unknown error occurred', 'Save Failed')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const [sections, items] = await Promise.all([
      api.get('/api/admin/content/sections'),
      api.get('/api/admin/content?section=home')
    ])
    const defaults = [
      { id: 'home', title: 'Home Page', icon: 'mdi-home', items: 0, hasUnpublished: false },
      { id: 'about', title: 'About Us', icon: 'mdi-information', items: 0, hasUnpublished: false },
      { id: 'testimonials', title: 'Testimonials', icon: 'mdi-account-voice', items: 0, hasUnpublished: false }
    ]
    contentSections.value = (sections as any[])?.length ? (sections as any[]) : defaults
    contentItems.value = items as any[]
    if (!selectedSection.value && contentSections.value.length) {
      selectedSection.value = contentSections.value[0].id
    }
    // No extra preload needed; table shows the selected section already
  } catch (e) {
    console.error('Error loading content data:', e)
    // Fallback to defaults if API fails
    contentSections.value = [
      { id: 'home', title: 'Home Page', icon: 'mdi-home', items: 0, hasUnpublished: false },
      { id: 'about', title: 'About Us', icon: 'mdi-information', items: 0, hasUnpublished: false },
      { id: 'testimonials', title: 'Testimonials', icon: 'mdi-account-voice', items: 0, hasUnpublished: false }
    ]
    selectedSection.value = 'home'
  }
})

definePageMeta({ layout: 'admin', middleware: ['admin'] })
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@700&display=swap');

.premium-content-wrapper {
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

.premium-card-inner {
  background: white !important;
  border-radius: 12px !important;
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

.add-btn-premium {
  background: #10B981 !important;
  color: white !important;
  border-radius: 10px !important;
  text-transform: none !important;
  font-weight: 700 !important;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2) !important;
}

.add-btn-premium:hover {
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3) !important;
}

.premium-chip-small {
  height: 28px !important;
  font-size: 0.7rem !important;
  font-weight: 700 !important;
  border-radius: 8px !important;
}

.premium-switch :deep(.v-selection-control) {
  min-height: 40px !important;
}

/* HTML Editor */
.html-code-editor :deep(.v-field__input) {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace !important;
  font-size: 14px;
  line-height: 1.6;
  background: #F8FAFC !important;
  padding: 16px !important;
}

.html-code-editor :deep(.v-field) {
  background: #F8FAFC !important;
}

/* Utility Classes */
.bg-blue-50 {
  background: #EFF6FF !important;
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

.text-slate-400 {
  color: #94A3B8 !important;
}

.text-slate-600 {
  color: #475569 !important;
}

.text-slate-700 {
  color: #334155 !important;
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

.tracking-wider {
  letter-spacing: 0.05em !important;
}

.tracking-widest {
  letter-spacing: 0.1em !important;
}

.font-mono {
  font-family: 'Courier New', monospace !important;
}

.hover-bg-slate-50:hover {
  background: #F8FAFC !important;
}

.max-width-300 {
  max-width: 300px;
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

@media (max-width: 960px) {
  .header-glass {
    padding: 16px !important;
  }
  
  .premium-card .p-8 {
    padding: 24px !important;
  }
  
  .max-width-300 {
    max-width: 100%;
  }
}
</style>
