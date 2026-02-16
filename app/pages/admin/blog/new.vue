<template>
  <div class="admin-blog-editor px-md-8 py-md-6">
    <v-container fluid>
      <!-- Page Header -->
      <v-row class="mb-6 align-center">
        <v-col cols="12" md="6">
          <div class="d-flex align-center mb-2">
            <v-btn icon variant="text" to="/admin/blog" class="mr-2">
              <v-icon>mdi-arrow-left</v-icon>
            </v-btn>
            <div class="premium-accent-bar mr-4"></div>
            <span class="text-overline letter-spacing-2 text-gold">New Post</span>
          </div>
          <h1 class="display-serif text-h4 mb-1">Create Blog Post</h1>
        </v-col>
        <v-col cols="12" md="6" class="text-md-right">
          <v-btn variant="outlined" class="mr-2" @click="saveDraft" :loading="saving && saveType === 'draft'">
            <v-icon start>mdi-content-save-outline</v-icon>
            Save Draft
          </v-btn>
          <v-btn color="primary" @click="publish" :loading="saving && saveType === 'publish'">
            <v-icon start>mdi-send</v-icon>
            Publish
          </v-btn>
        </v-col>
      </v-row>

      <v-row>
        <!-- Main Content Area -->
        <v-col cols="12" lg="8">
          <!-- Title & Slug -->
          <v-card class="editor-card mb-6" elevation="0">
            <v-card-text class="pa-6">
              <v-text-field density="compact"
                v-model="form.title"
                label="Post Title"
                placeholder="Enter an engaging title..."
                variant="outlined"
                class="title-input mb-4"
                :rules="[v => !!v || 'Title is required']"
                @blur="generateSlug"
              />
              
              <v-text-field
                v-model="form.slug"
                label="URL Slug"
                placeholder="post-url-slug"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-link"
                hint="The URL-friendly version of the title"
                persistent-hint
              />
            </v-card-text>
          </v-card>

          <!-- Excerpt -->
          <v-card class="editor-card mb-6" elevation="0">
            <v-card-title class="pa-4 pb-0">
              <span class="text-h6">Excerpt</span>
              <span class="text-caption text-medium-emphasis ml-2">(Brief summary for previews)</span>
            </v-card-title>
            <v-card-text class="pa-4">
              <v-textarea density="compact"
                v-model="form.excerpt"
                placeholder="Write a brief summary of your post..."
                variant="outlined"
                rows="3"
                counter="300"
                :rules="[v => !v || v.length <= 300 || 'Excerpt must be 300 characters or less']"
              />
            </v-card-text>
          </v-card>

          <!-- Content Editor -->
          <v-card class="editor-card mb-6" elevation="0">
            <v-card-title class="pa-4 pb-0 d-flex align-center">
              <span class="text-h6">Content</span>
              <v-spacer />
              <v-btn-toggle v-model="editorMode" mandatory density="compact" variant="outlined">
                <v-btn value="visual" size="small">
                  <v-icon start size="small">mdi-format-text</v-icon>
                  Visual
                </v-btn>
                <v-btn value="markdown" size="small">
                  <v-icon start size="small">mdi-language-markdown</v-icon>
                  Markdown
                </v-btn>
              </v-btn-toggle>
            </v-card-title>
            <v-card-text class="pa-4">
              <!-- Rich Text Toolbar -->
              <div v-if="editorMode === 'visual'" class="editor-toolbar mb-2">
                <v-btn-group density="compact" variant="text">
                  <v-btn @click="insertFormat('bold')"><v-icon size="small">mdi-format-bold</v-icon></v-btn>
                  <v-btn @click="insertFormat('italic')"><v-icon size="small">mdi-format-italic</v-icon></v-btn>
                  <v-btn @click="insertFormat('underline')"><v-icon size="small">mdi-format-underline</v-icon></v-btn>
                  <v-btn @click="insertFormat('h2')"><v-icon size="small">mdi-format-header-2</v-icon></v-btn>
                  <v-btn @click="insertFormat('h3')"><v-icon size="small">mdi-format-header-3</v-icon></v-btn>
                  <v-btn @click="insertFormat('ul')"><v-icon size="small">mdi-format-list-bulleted</v-icon></v-btn>
                  <v-btn @click="insertFormat('ol')"><v-icon size="small">mdi-format-list-numbered</v-icon></v-btn>
                  <v-btn @click="insertFormat('quote')"><v-icon size="small">mdi-format-quote-close</v-icon></v-btn>
                  <v-btn @click="insertFormat('code')"><v-icon size="small">mdi-code-tags</v-icon></v-btn>
                  <v-btn @click="insertFormat('link')"><v-icon size="small">mdi-link</v-icon></v-btn>
                  <v-btn @click="showImageDialog = true"><v-icon size="small">mdi-image</v-icon></v-btn>
                </v-btn-group>
              </div>
              
              <v-textarea density="compact"
                ref="contentEditor"
                v-model="form.content"
                :placeholder="editorMode === 'visual' ? 'Start writing your blog post...' : '# Your markdown content here...'"
                variant="outlined"
                rows="20"
                class="content-textarea"
                auto-grow
              />
            </v-card-text>
          </v-card>

          <!-- SEO Settings -->
          <v-card class="editor-card mb-6" elevation="0">
            <v-expansion-panels variant="accordion">
              <v-expansion-panel>
                <v-expansion-panel-title>
                  <v-icon start>mdi-magnify</v-icon>
                  SEO Settings
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-text-field
                    v-model="form.metaTitle"
                    label="Meta Title"
                    placeholder="SEO optimized title (defaults to post title)"
                    variant="outlined"
                    density="compact"
                    class="mb-4"
                    counter="60"
                  />
                  
                  <v-textarea
                    v-model="form.metaDescription"
                    label="Meta Description"
                    placeholder="SEO description for search engines..."
                    variant="outlined"
                    density="compact"
                    rows="2"
                    counter="160"
                    class="mb-4"
                  />
                  
                  <v-combobox
                    v-model="form.metaKeywords"
                    label="Meta Keywords"
                    placeholder="Add keywords..."
                    variant="outlined"
                    density="compact"
                    chips
                    multiple
                    closable-chips
                  />
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-card>
        </v-col>

        <!-- Sidebar -->
        <v-col cols="12" lg="4">
          <!-- Cover Image -->
          <v-card class="editor-card mb-6" elevation="0">
            <v-card-title class="pa-4 pb-2">
              <v-icon start>mdi-image</v-icon>
              Cover Image
            </v-card-title>
            <v-card-text class="pa-4 pt-0">
              <div 
                class="cover-upload-zone"
                :class="{ 'has-image': form.coverImage }"
                @click="triggerCoverUpload"
                @dragover.prevent
                @drop.prevent="handleCoverDrop"
              >
                <v-img
                  v-if="form.coverImage"
                  :src="form.coverImage"
                  height="180"
                  cover
                  class="rounded-lg"
                >
                  <div class="cover-overlay d-flex align-center justify-center">
                    <v-btn color="white" variant="flat" size="small" @click.stop="form.coverImage = ''">
                      <v-icon start>mdi-delete</v-icon>
                      Remove
                    </v-btn>
                  </div>
                </v-img>
                <div v-else class="upload-placeholder">
                  <v-icon size="48" color="grey-lighten-1">mdi-cloud-upload</v-icon>
                  <p class="text-body-2 mt-2">Click or drag to upload</p>
                  <p class="text-caption text-grey">Recommended: 1200x630px</p>
                </div>
              </div>
              <input
                ref="coverInput"
                type="file"
                accept="image/*"
                class="d-none"
                @change="handleCoverUpload"
              />
              
              <v-text-field
                v-model="form.coverImageAlt"
                label="Alt Text"
                placeholder="Describe the image..."
                variant="outlined"
                density="compact"
                class="mt-4"
              />
            </v-card-text>
          </v-card>

          <!-- Category & Tags -->
          <v-card class="editor-card mb-6" elevation="0">
            <v-card-title class="pa-4 pb-2">
              <v-icon start>mdi-tag</v-icon>
              Organization
            </v-card-title>
            <v-card-text class="pa-4 pt-0">
              <v-select
                v-model="form.categoryId"
                :items="categoryOptions"
                label="Category"
                variant="outlined"
                density="compact"
                class="mb-4"
                clearable
              />
              
              <v-combobox
                v-model="form.tags"
                label="Tags"
                placeholder="Add tags..."
                variant="outlined"
                density="compact"
                chips
                multiple
                closable-chips
                hint="Press Enter to add a tag"
                persistent-hint
              />
            </v-card-text>
          </v-card>

          <!-- Publishing Options -->
          <v-card class="editor-card mb-6" elevation="0">
            <v-card-title class="pa-4 pb-2">
              <v-icon start>mdi-cog</v-icon>
              Options
            </v-card-title>
            <v-card-text class="pa-4 pt-0">
              <v-switch
                v-model="form.isFeatured"
                label="Featured Post"
                color="primary"
                hide-details
                class="mb-4"
              />
              
              <v-switch
                v-model="form.allowComments"
                label="Allow Comments"
                color="primary"
                hide-details
                class="mb-4"
              />
              
              <v-switch
                v-model="form.syncToHashnode"
                label="Sync to Hashnode"
                color="primary"
                hide-details
                hint="Publish this post to your Hashnode blog"
              />
            </v-card-text>
          </v-card>

          <!-- Schedule -->
          <v-card class="editor-card" elevation="0">
            <v-card-title class="pa-4 pb-2">
              <v-icon start>mdi-calendar-clock</v-icon>
              Schedule
            </v-card-title>
            <v-card-text class="pa-4 pt-0">
              <v-switch
                v-model="scheduleEnabled"
                label="Schedule for later"
                color="primary"
                hide-details
                class="mb-4"
              />
              
              <v-text-field
                v-if="scheduleEnabled"
                v-model="form.scheduledAt"
                type="datetime-local"
                label="Publish Date"
                variant="outlined"
                density="compact"
              />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Image Upload Dialog -->
      <v-dialog v-model="showImageDialog" max-width="500">
        <v-card>
          <v-card-title>Insert Image</v-card-title>
          <v-card-text>
            <v-tabs v-model="imageTab">
              <v-tab value="upload">Upload</v-tab>
              <v-tab value="url">URL</v-tab>
            </v-tabs>
            
            <v-window v-model="imageTab" class="mt-4">
              <v-window-item value="upload">
                <v-file-input
                  v-model="inlineImage"
                  label="Choose image"
                  accept="image/*"
                  prepend-icon="mdi-camera"
                  variant="outlined"
                />
              </v-window-item>
              <v-window-item value="url">
                <v-text-field density="compact"
                  v-model="imageUrl"
                  label="Image URL"
                  placeholder="https://..."
                  variant="outlined"
                />
              </v-window-item>
            </v-window>
            
            <v-text-field density="compact"
              v-model="imageAlt"
              label="Alt Text"
              placeholder="Describe the image..."
              variant="outlined"
              class="mt-4"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="showImageDialog = false">Cancel</v-btn>
            <v-btn color="primary" @click="insertImage" :loading="uploadingImage">Insert</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Snackbar -->
      <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
        {{ snackbar.message }}
      </v-snackbar>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
// @ts-ignore
import { api } from '~/utils/api'

definePageMeta({
  layout: 'admin',
  middleware: ['admin']
})

const router = useRouter()

// Form state
const form = ref({
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  coverImage: '',
  coverImageAlt: '',
  categoryId: null as number | null,
  tags: [] as string[],
  isFeatured: false,
  allowComments: true,
  syncToHashnode: false,
  scheduledAt: '',
  metaTitle: '',
  metaDescription: '',
  metaKeywords: [] as string[]
})

// Editor state
const editorMode = ref('visual')
const contentEditor = ref<HTMLTextAreaElement | null>(null)
const scheduleEnabled = ref(false)

// Categories
const categories = ref<any[]>([])
const categoryOptions = computed(() => 
  categories.value.map(c => ({ title: c.name, value: c.id }))
)

// Image dialog
const showImageDialog = ref(false)
const imageTab = ref('upload')
const inlineImage = ref<File[]>([])
const imageUrl = ref('')
const imageAlt = ref('')
const uploadingImage = ref(false)

// Cover upload
const coverInput = ref<HTMLInputElement | null>(null)

// Saving state
const saving = ref(false)
const saveType = ref<'draft' | 'publish'>('draft')

// Snackbar
const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
})

// Generate slug from title
const generateSlug = () => {
  if (!form.value.slug && form.value.title) {
    form.value.slug = form.value.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100)
  }
}

// Format helpers
const insertFormat = (format: string) => {
  const textarea = (contentEditor.value as any)?.$el?.querySelector('textarea')
  if (!textarea) return
  
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const text = form.value.content
  const selectedText = text.substring(start, end)
  
  let insertText = ''
  let cursorOffset = 0
  
  switch (format) {
    case 'bold':
      insertText = `**${selectedText || 'bold text'}**`
      cursorOffset = selectedText ? 0 : -2
      break
    case 'italic':
      insertText = `*${selectedText || 'italic text'}*`
      cursorOffset = selectedText ? 0 : -1
      break
    case 'underline':
      insertText = `<u>${selectedText || 'underlined text'}</u>`
      cursorOffset = selectedText ? 0 : -4
      break
    case 'h2':
      insertText = `\n## ${selectedText || 'Heading 2'}\n`
      break
    case 'h3':
      insertText = `\n### ${selectedText || 'Heading 3'}\n`
      break
    case 'ul':
      insertText = `\n- ${selectedText || 'List item'}\n`
      break
    case 'ol':
      insertText = `\n1. ${selectedText || 'List item'}\n`
      break
    case 'quote':
      insertText = `\n> ${selectedText || 'Quote'}\n`
      break
    case 'code':
      insertText = selectedText.includes('\n') 
        ? `\n\`\`\`\n${selectedText || 'code'}\n\`\`\`\n`
        : `\`${selectedText || 'code'}\``
      break
    case 'link':
      insertText = `[${selectedText || 'link text'}](url)`
      break
  }
  
  form.value.content = text.substring(0, start) + insertText + text.substring(end)
}

// Cover image upload
const triggerCoverUpload = () => {
  coverInput.value?.click()
}

const handleCoverUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  
  await uploadImage(file, true)
}

const handleCoverDrop = async (event: DragEvent) => {
  const file = event.dataTransfer?.files?.[0]
  if (!file || !file.type.startsWith('image/')) return
  
  await uploadImage(file, true)
}

// Image upload helper
const uploadImage = async (file: File, isCover = false) => {
  const formData = new FormData()
  formData.append('image', file)
  
  try {
    const data: any = await api.upload('/api/admin/blog/upload-image', formData)
    
    if (isCover) {
      form.value.coverImage = data.url
    } else {
      return data.url
    }
  } catch (error) {
    console.error('Upload error:', error)
    showSnackbar('Failed to upload image', 'error')
    return null
  }
}

// Insert inline image
const insertImage = async () => {
  uploadingImage.value = true
  
  try {
    let url = imageUrl.value
    
    if (imageTab.value === 'upload' && inlineImage.value.length > 0) {
      url = await uploadImage(inlineImage.value[0] as File) || ''
    }
    
    if (url) {
      const imageMarkdown = `![${imageAlt.value || 'Image'}](${url})`
      form.value.content += `\n${imageMarkdown}\n`
    }
    
    showImageDialog.value = false
    inlineImage.value = []
    imageUrl.value = ''
    imageAlt.value = ''
  } catch (error) {
    console.error('Insert image error:', error)
  } finally {
    uploadingImage.value = false
  }
}

// Save draft
const saveDraft = async () => {
  if (!form.value.title || !form.value.content) {
    showSnackbar('Title and content are required', 'error')
    return
  }
  
  saving.value = true
  saveType.value = 'draft'
  
  try {
    const data: any = await api.post('/api/admin/blog', {
      ...form.value,
      status: 'draft'
    })
    
    showSnackbar('Draft saved successfully', 'success')
    router.push(`/admin/blog/${data.post.id}`)
  } catch (error: any) {
    showSnackbar(error.message || 'Failed to save draft', 'error')
  } finally {
    saving.value = false
  }
}

// Publish
const publish = async () => {
  if (!form.value.title || !form.value.content) {
    showSnackbar('Title and content are required', 'error')
    return
  }
  
  saving.value = true
  saveType.value = 'publish'
  
  try {
    const status = scheduleEnabled.value && form.value.scheduledAt ? 'scheduled' : 'published'
    
    const data: any = await api.post('/api/admin/blog', {
      ...form.value,
      status
    })
    
    // Sync to Hashnode if enabled
    if (form.value.syncToHashnode && status === 'published') {
      try {
        await api.post('/api/admin/blog/hashnode/publish', { postId: data.post.id })
        showSnackbar('Post published and synced to Hashnode!', 'success')
      } catch {
        showSnackbar('Post published but Hashnode sync failed', 'warning')
      }
    } else {
      showSnackbar(status === 'scheduled' ? 'Post scheduled successfully' : 'Post published successfully', 'success')
    }
    
    router.push('/admin/blog')
  } catch (error: any) {
    showSnackbar(error.message || 'Failed to publish', 'error')
  } finally {
    saving.value = false
  }
}

// Snackbar helper
const showSnackbar = (message: string, color: string) => {
  snackbar.value = { show: true, message, color }
}

// Fetch categories
const fetchCategories = async () => {
  try {
    const data: any = await api.get('/api/admin/blog/categories')
    categories.value = data.categories || []
  } catch (error) {
    console.error('Error fetching categories:', error)
  }
}

onMounted(() => {
  fetchCategories()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;500;600;700&display=swap');

.admin-blog-editor {
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

.editor-card {
  border-radius: 16px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  background: white !important;
}

.title-input :deep(input) {
  font-size: 1.25rem !important;
  font-weight: 600;
}

.content-textarea :deep(textarea) {
  font-family: 'Inter', monospace;
  font-size: 0.95rem;
  line-height: 1.8;
}

.editor-toolbar {
  padding: 8px;
  background: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #eee;
}

.cover-upload-zone {
  border: 2px dashed #ddd;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  overflow: hidden;
}

.cover-upload-zone:hover {
  border-color: #8c734b;
  background: #faf9f7;
}

.cover-upload-zone.has-image {
  border: none;
}

.upload-placeholder {
  padding: 40px;
  text-align: center;
}

.cover-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.5);
  opacity: 0;
  transition: opacity 0.2s;
}

.cover-upload-zone:hover .cover-overlay {
  opacity: 1;
}
</style>
