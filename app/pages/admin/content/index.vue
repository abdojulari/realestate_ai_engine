<template>
  <v-container>
    <div class="d-flex align-center mb-6">
      <h1 class="text-h4">Content Management</h1>
      <v-spacer />
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        @click="showAddContentDialog = true"
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
                  <!-- Add rich text editor component here -->
                  <v-textarea
                    v-model="contentForm.content"
                    label="HTML Content"
                    rows="10"
                    :rules="[v => !!v || 'Content is required']"
                    required
                  />
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
            @click="showAddContentDialog = false"
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
import { ref, computed, onMounted } from 'vue'
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

const keyOptions = computed(() => pageKeyOptions[contentForm.value.section] || [])

const contentForm = ref<any>({
  title: '',
  key: '',
  section: 'home',
  type: 'text',
  content: '',
  published: true,
  file: null,
  metadata: {
    author: '',
    position: '',
    icon: ''
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
  contentForm.value = { ...item, file: null }
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

const saveContent = async () => {
  saving.value = true
  try {
    const formData = new FormData()
    formData.append('data', JSON.stringify({
      title: contentForm.value.title,
      key: contentForm.value.key || contentForm.value.type,
      type: contentForm.value.type,
      section: contentForm.value.section,
      content: contentForm.value.content,
      published: contentForm.value.published,
      metadata: contentForm.value.metadata
    }))
    // Upload image first if needed
    if (contentForm.value.file && ['hero', 'image'].includes(contentForm.value.key || contentForm.value.type)) {
      try {
        const imgForm = new FormData()
        imgForm.append('image', contentForm.value.file)
        const uploadRes: any = await api.post('/api/admin/content/upload', imgForm)
        if (uploadRes?.url) contentForm.value.content = uploadRes.url
      } catch (e) {
        console.error('Image upload failed:', e)
      }
    }

    const endpoint = editingContent.value ? `/api/admin/content/${contentForm.value.id}` : '/api/admin/content'
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
    // reload items for current section to reflect any filters
    try {
      const items = await api.get(`/api/admin/content?section=${selectedSection.value}`)
      contentItems.value = items as any[]
    } catch {}
  } catch (e) {
    console.error(e)
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
