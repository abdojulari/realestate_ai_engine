<template>
  <v-container>
    <div class="d-flex align-center mb-6">
      <h1 class="text-h4">Content Management</h1>
      <v-spacer />
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        @click="openAddContentDialog"
      >
        Add Content
      </v-btn>
    </div>

    <!-- Content Sections -->
    <v-row>
      <v-col cols="12" md="3">
        <v-card>
          <v-list>
            <v-list-subheader>Content Sections</v-list-subheader>
            <v-list-item
              v-for="section in contentSections"
              :key="section.id"
              :value="section"
              :active="selectedSection === section.id"
              @click="selectSection(section.id)"
            >
              <template v-slot:prepend>
                <v-icon :icon="section.icon" />
              </template>
              <v-list-item-title>{{ section.title }}</v-list-item-title>
              <template v-slot:append>
                <v-chip
                  size="small"
                  :color="section.hasUnpublished ? 'warning' : 'success'"
                >
                  {{ section.items }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>

      <v-col cols="12" md="9">
        <v-card>
          <v-card-title class="d-flex align-center">
            {{ getCurrentSection?.title }}
            <v-spacer />
            <v-text-field
              v-model="search"
              append-inner-icon="mdi-magnify"
              label="Search"
              single-line
              hide-details
              density="compact"
              class="max-width-200"
            />
          </v-card-title>

          <v-card-text>
            <v-table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Key</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in filteredContent"
                  :key="item.id"
                >
                  <td>{{ item.title }}</td>
                  <td>
                    <code>{{ item.key }}</code>
                  </td>
                  <td>
                    <v-chip
                      size="small"
                      :color="getTypeColor(item.type)"
                    >
                      {{ item.type }}
                    </v-chip>
                  </td>
                  <td>
                    <v-chip
                      size="small"
                      :color="item.published ? 'success' : 'warning'"
                    >
                      {{ item.published ? 'Published' : 'Draft' }}
                    </v-chip>
                  </td>
                  <td>{{ formatDateTime(item.updatedAt) }}</td>
                  <td class="text-right">
                    <v-btn
                      icon="mdi-pencil"
                      variant="text"
                      size="small"
                      @click="editContent(item)"
                    />
                    <v-btn
                      :icon="item.published ? 'mdi-eye-off' : 'mdi-eye'"
                      variant="text"
                      size="small"
                      @click="togglePublished(item)"
                    />
                    <v-btn
                      icon="mdi-content-copy"
                      variant="text"
                      size="small"
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

    <!-- Add/Edit Content Dialog -->
    <v-dialog
      v-model="showAddContentDialog"
      max-width="800"
      scrollable
    >
      <v-card>
        <v-card-title>
          {{ editingContent ? 'Edit Content' : 'Add New Content' }}
        </v-card-title>
        <v-card-text>
          <v-form v-model="isContentFormValid" @submit.prevent="saveContent">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="contentForm.title"
                  label="Title"
                  :rules="[v => !!v || 'Title is required']"
                  required
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
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-select
                  v-model="contentForm.type"
                  :items="contentTypes"
                  label="Section"
                  required
                  :rules="[v => !!v || 'Section is required']"
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
                  />
                </div>

                <div v-else-if="contentForm.type === 'html'">
                  <!-- Monaco Code Editor for HTML -->
                  <div class="mb-4">
                    <label class="text-subtitle-2 mb-2 d-block">HTML Content</label>
                    <CodeEditor
                      v-model="contentForm.content"
                      language="html"
                      height="400px"
                      placeholder="Enter your HTML content here..."
                    />
                  </div>

                  <!-- Image uploader for About page content -->
                  <div v-if="contentForm.section === 'about'" class="mt-4">
                    <v-file-input
                      v-model="contentForm.uploadedImages"
                      label="Upload Images for About Page"
                      accept="image/*"
                      multiple
                      show-size
                      prepend-icon="mdi-camera-plus"
                      hint="Upload up to multiple images (jpg, png, gif, webp)"
                      persistent-hint
                      @update:model-value="uploadAboutImages"
                    />
                    
                    <!-- Display uploaded image paths -->
                    <div v-if="contentForm.metadata?.imagePaths?.length > 0" class="mt-3">
                      <v-card variant="outlined" class="pa-3">
                        <v-card-title class="text-subtitle-1 pa-0 mb-2">
                          <v-icon left>mdi-image-multiple</v-icon>
                          Available Images
                        </v-card-title>
                        <div class="text-caption mb-2">Copy these paths to use in your HTML content:</div>
                        <v-list density="compact">
                          <v-list-item
                            v-for="(imagePath, index) in contentForm.metadata.imagePaths"
                            :key="index"
                            class="pa-1"
                          >
                            <template v-slot:prepend>
                              <v-icon size="small">mdi-file-image</v-icon>
                            </template>
                            <v-list-item-title>
                              <code class="text-body-2">{{ imagePath }}</code>
                            </v-list-item-title>
                            <template v-slot:append>
                              <v-btn
                                icon="mdi-content-copy"
                                variant="text"
                                size="x-small"
                                @click="copyToClipboard(imagePath)"
                              />
                            </template>
                          </v-list-item>
                        </v-list>
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
                  />
                  <v-img
                    v-if="contentForm.content"
                    :src="contentForm.content"
                    max-height="200"
                    contain
                  />
                </div>

                <div v-else-if="contentForm.key === 'testimonial'">
                  <v-text-field
                    v-model="contentForm.metadata.author"
                    label="Author Name"
                    :rules="[v => !!v || 'Author name is required']"
                    required
                  />
                  <v-text-field
                    v-model="contentForm.metadata.position"
                    label="Author Position/Company"
                  />
                  <v-textarea
                    v-model="contentForm.content"
                    label="Testimonial"
                    rows="4"
                    :rules="[v => !!v || 'Testimonial content is required']"
                    required
                  />
                  <v-file-input
                    v-model="contentForm.file"
                    label="Author Photo"
                    accept="image/*"
                    show-size
                    prepend-icon="mdi-camera"
                  />
                </div>
                <div v-else-if="contentForm.key === 'why-choose-us-item'">
                  <v-text-field
                    v-model="contentForm.metadata.icon"
                    label="Icon (mdi-*)"
                    hint="Example: mdi-home-search"
                    persistent-hint
                  />
                  <v-text-field
                    v-model="contentForm.title"
                    label="Card Title"
                    :rules="[v => !!v || 'Card title is required']"
                    required
                  />
                  <v-textarea
                    v-model="contentForm.content"
                    label="Card Description"
                    rows="4"
                    :rules="[v => !!v || 'Description is required']"
                    required
                  />
                </div>
                <div v-else>
                  <v-text-field
                    v-model="contentForm.content"
                    :label="contentForm.key?.replace(/-/g,' ') || 'Content'"
                    :rules="[v => !!v || 'Content is required']"
                    required
                  />
                </div>
              </v-col>

              <v-col cols="12">
                <v-switch
                  v-model="contentForm.published"
                  label="Publish immediately"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="cancelForm"
          >
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            :loading="saving"
            :disabled="!isContentFormValid"
            @click="saveContent"
          >
            {{ editingContent ? 'Save Changes' : 'Add Content' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { api } from '~~/utils/api'

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
    { title: 'About Title', value: 'about-title' },
    { title: 'About Body', value: 'about-body' }
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
    alert('Failed to upload images. Please try again.')
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
    alert(`Save failed: ${(e as any)?.message || 'Unknown error'}`)
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

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] })
</script>

<style scoped>
.max-width-200 {
  max-width: 200px;
}
</style>
