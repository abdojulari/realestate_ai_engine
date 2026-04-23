<template>
  <div class="admin-blog-editor px-md-8 py-md-6">
    <v-container fluid>
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-16">
        <v-progress-circular indeterminate size="64" color="primary" />
        <p class="mt-4 text-medium-emphasis">Loading post...</p>
      </div>

      <template v-else>
        <!-- Page Header -->
        <v-row class="mb-6 align-center">
          <v-col cols="12" md="6">
            <div class="d-flex align-center mb-2">
              <v-btn icon variant="text" to="/admin/blog" class="mr-2">
                <v-icon>mdi-arrow-left</v-icon>
              </v-btn>
              <div class="premium-accent-bar mr-4"></div>
              <span class="text-overline letter-spacing-2 text-gold">Edit Post</span>
              <v-chip 
                :color="getStatusColor(form.status)" 
                size="small" 
                class="ml-4 text-uppercase"
                variant="flat"
              >
                {{ form.status }}
              </v-chip>
            </div>
            <h1 class="display-serif text-h4 mb-1">{{ form.title || 'Untitled Post' }}</h1>
          </v-col>
          <v-col cols="12" md="6" class="text-md-right">
            <!-- Live auto-save indicator: tells the author their changes are safe. -->
            <span class="autosave-indicator mr-3" :class="`autosave-${autoSave.status.value}`">
              <v-icon size="small" class="mr-1">{{ autoSaveIcon }}</v-icon>
              {{ autoSaveLabel }}
            </span>
            <v-tooltip text="Save now (Ctrl/Cmd+S)" location="bottom">
              <template #activator="{ props: tip }">
                <v-btn v-bind="tip" variant="outlined" class="mr-2" @click="saveChanges" :loading="saving && saveType === 'save'">
                  <v-icon start>mdi-content-save</v-icon>
                  Save
                </v-btn>
              </template>
            </v-tooltip>
            <v-tooltip v-if="form.status === 'draft'" text="Make this post live on the public blog" location="bottom">
              <template #activator="{ props: tip }">
                <v-btn
                  v-bind="tip"
                  color="primary"
                  @click="publish"
                  :loading="saving && saveType === 'publish'"
                >
                  <v-icon start>mdi-send</v-icon>
                  Publish
                </v-btn>
              </template>
            </v-tooltip>
            <v-tooltip v-else-if="form.status === 'published'" text="Hide from the public blog (post becomes a draft)" location="bottom">
              <template #activator="{ props: tip }">
                <v-btn
                  v-bind="tip"
                  color="warning"
                  variant="outlined"
                  @click="unpublish"
                >
                  <v-icon start>mdi-eye-off</v-icon>
                  Unpublish
                </v-btn>
              </template>
            </v-tooltip>
            <v-tooltip v-if="form.status === 'published' && form.slug" text="Open the published post in a new tab" location="bottom">
              <template #activator="{ props: tip }">
                <v-btn
                  v-bind="tip"
                  variant="text"
                  color="info"
                  class="ml-2"
                  :href="`/blog/${form.slug}`"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <v-icon start>mdi-open-in-new</v-icon>
                  View live
                </v-btn>
              </template>
            </v-tooltip>
            <v-btn
              v-if="form.syncToHashnode"
              color="info"
              variant="outlined"
              class="ml-2"
              @click="syncToHashnode"
              :loading="syncing"
            >
              <v-icon start>mdi-sync</v-icon>
              Sync Hashnode
            </v-btn>
          </v-col>
        </v-row>

        <!-- First-time author guidance — dismissible, persisted in localStorage. -->
        <v-alert
          v-if="showHelp"
          type="info"
          variant="tonal"
          density="comfortable"
          class="mb-6"
          closable
          @click:close="dismissHelp"
        >
          <strong>New to the blog editor?</strong>
          Drafts auto-save every couple of seconds — no need to hit Save constantly.
          When you're happy, click <strong>Publish</strong> to push the post live.
          Use the toolbar above the content area to format text, and drop an image into the
          cover panel on the right (15&nbsp;MB max).
        </v-alert>

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
                  :placeholder="editorMode === 'visual' ? 'Write your content using the toolbar above...' : '# Your markdown content here...'"
                  variant="outlined"
                  :rows="editorMode === 'visual' ? 12 : 20"
                  :class="editorMode === 'markdown' ? 'content-textarea markdown-mode' : 'content-textarea'"
                  auto-grow
                  @mouseup="saveSelection"
                  @keyup="saveSelection"
                  @select="saveSelection"
                  @focus="saveSelection"
                />

                <!-- Live Preview (Visual mode) -->
                <div v-if="editorMode === 'visual'" class="visual-preview mt-4">
                  <div class="preview-header">
                    <v-icon size="small" class="mr-1">mdi-eye</v-icon>
                    Preview
                  </div>
                  <div class="preview-content" v-html="renderedPreview" />
                </div>
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
                      placeholder="SEO optimized title"
                      variant="outlined"
                      density="compact"
                      class="mb-4"
                      counter="60"
                    />
                    
                    <v-textarea
                      v-model="form.metaDescription"
                      label="Meta Description"
                      placeholder="SEO description..."
                      variant="outlined"
                      density="compact"
                      rows="2"
                      counter="160"
                      class="mb-4"
                    />
                    
                    <v-combobox
                      v-model="form.metaKeywords"
                      label="Meta Keywords"
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

            <!-- Post Stats -->
            <v-card class="editor-card" elevation="0">
              <v-card-text class="pa-4">
                <v-row>
                  <v-col cols="3" class="text-center">
                    <div class="text-h5 font-weight-bold">{{ form.views }}</div>
                    <div class="text-caption text-medium-emphasis">Views</div>
                  </v-col>
                  <v-col cols="3" class="text-center">
                    <div class="text-h5 font-weight-bold">{{ form.readTime || 1 }}</div>
                    <div class="text-caption text-medium-emphasis">Min Read</div>
                  </v-col>
                  <v-col cols="3" class="text-center">
                    <div class="text-body-2 font-weight-bold">{{ formatDate(form.createdAt) }}</div>
                    <div class="text-caption text-medium-emphasis">Created</div>
                  </v-col>
                  <v-col cols="3" class="text-center">
                    <div class="text-body-2 font-weight-bold">{{ formatDate(form.updatedAt) }}</div>
                    <div class="text-caption text-medium-emphasis">Updated</div>
                  </v-col>
                </v-row>
              </v-card-text>
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
                    <p class="text-caption text-medium-emphasis mb-0">
                      JPEG, PNG, GIF, WebP · up to {{ Math.round(BLOG_IMAGE_MAX_BYTES / 1024 / 1024) }}MB
                    </p>
                  </div>
                </div>
                <v-progress-linear
                  v-if="uploadProgress !== null"
                  :model-value="uploadProgress"
                  color="primary"
                  height="6"
                  rounded
                  class="mt-2"
                />
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
                  variant="outlined"
                  density="compact"
                  chips
                  multiple
                  closable-chips
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
                />
                
                <!-- Hashnode Info -->
                <div v-if="form.hashnodeId" class="mt-4 pa-3 bg-grey-lighten-4 rounded-lg">
                  <div class="text-caption text-medium-emphasis mb-1">Hashnode Post</div>
                  <a :href="form.hashnodeUrl" target="_blank" class="text-body-2 text-primary">
                    {{ form.hashnodeUrl }}
                  </a>
                  <div class="text-caption text-medium-emphasis mt-1">
                    Last synced: {{ formatDate(form.lastSyncedAt) }}
                  </div>
                </div>
              </v-card-text>
            </v-card>

            <!-- Danger Zone -->
            <v-card class="editor-card border-error" elevation="0">
              <v-card-title class="pa-4 pb-2 text-error">
                <v-icon start color="error">mdi-alert</v-icon>
                Danger Zone
              </v-card-title>
              <v-card-text class="pa-4 pt-0">
                <v-btn 
                  color="error" 
                  variant="outlined" 
                  block 
                  @click="confirmDelete"
                >
                  <v-icon start>mdi-delete</v-icon>
                  Delete Post
                </v-btn>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </template>

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

      <!-- Delete Confirmation Dialog -->
      <v-dialog v-model="deleteDialog" max-width="400">
        <v-card>
          <v-card-title class="text-h6">Delete Post</v-card-title>
          <v-card-text>
            Are you sure you want to delete this post? This action cannot be undone.
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
            <v-btn color="error" variant="flat" :loading="deleting" @click="deletePost">Delete</v-btn>
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
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { marked } from 'marked'
// @ts-ignore
import { api } from '~/utils/api'
// @ts-ignore
import { formatDate } from '~/utils/formatters'
import {
  uploadBlogImage,
  useBlogAutoSave,
  BLOG_IMAGE_MAX_BYTES,
} from '~/composables/useBlogEditor'

definePageMeta({
  layout: 'admin',
  middleware: ['admin']
})

const route = useRoute()
const router = useRouter()
const postId = computed(() => parseInt(route.params.id as string))

const HELP_DISMISS_KEY = 'blog-editor-help-dismissed-v1'
const showHelp = ref(false)
const dismissHelp = () => {
  showHelp.value = false
  if (typeof localStorage !== 'undefined') localStorage.setItem(HELP_DISMISS_KEY, '1')
}

const uploadProgress = ref<number | null>(null)

// State
const loading = ref(true)
const form = ref<any>({})
const categories = ref<any[]>([])
const editorMode = ref('visual')
const contentEditor = ref<HTMLTextAreaElement | null>(null)
const savedSelection = ref({ start: 0, end: 0 })

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
const saveType = ref<'save' | 'publish'>('save')
const syncing = ref(false)

// Delete dialog
const deleteDialog = ref(false)
const deleting = ref(false)

// Snackbar
const snackbar = ref({ show: false, message: '', color: 'success' })

// Category options
const categoryOptions = computed(() => 
  categories.value.map(c => ({ title: c.name, value: c.id }))
)

// Status color
const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    published: 'success',
    draft: 'warning',
    scheduled: 'info',
    archived: 'grey'
  }
  return colors[status] || 'grey'
}

// Fetch post
const fetchPost = async () => {
  loading.value = true
  try {
    const data: any = await api.get(`/api/admin/blog/${postId.value}`)
    form.value = data.post || {}
    // Ensure tags is an array
    if (!Array.isArray(form.value.tags)) {
      form.value.tags = form.value.tags ? [form.value.tags] : []
    }
    if (!Array.isArray(form.value.metaKeywords)) {
      form.value.metaKeywords = form.value.metaKeywords || []
    }
  } catch (error) {
    console.error('Error fetching post:', error)
    showSnackbar('Failed to load post', 'error')
  } finally {
    loading.value = false
  }
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

const saveSelection = () => {
  const textarea = (contentEditor.value as any)?.$el?.querySelector('textarea')
  if (textarea) {
    savedSelection.value = {
      start: textarea.selectionStart ?? 0,
      end: textarea.selectionEnd ?? 0
    }
  }
}

const insertFormat = (format: string) => {
  const { start, end } = savedSelection.value
  const text = form.value.content || ''
  const selectedText = text.substring(start, end)

  let insertText = ''

  switch (format) {
    case 'bold': insertText = `**${selectedText || 'bold text'}**`; break
    case 'italic': insertText = `*${selectedText || 'italic text'}*`; break
    case 'h2': insertText = `\n## ${selectedText || 'Heading 2'}\n`; break
    case 'h3': insertText = `\n### ${selectedText || 'Heading 3'}\n`; break
    case 'ul': insertText = `\n- ${selectedText || 'List item'}\n`; break
    case 'ol': insertText = `\n1. ${selectedText || 'List item'}\n`; break
    case 'quote': insertText = `\n> ${selectedText || 'Quote'}\n`; break
    case 'code': insertText = `\`${selectedText || 'code'}\``; break
    case 'link': insertText = `[${selectedText || 'link text'}](url)`; break
  }

  form.value.content = text.substring(0, start) + insertText + text.substring(end)

  nextTick(() => {
    const textarea = (contentEditor.value as any)?.$el?.querySelector('textarea')
    if (textarea) {
      textarea.focus()
      const newPos = start + insertText.length
      textarea.setSelectionRange(newPos, newPos)
      savedSelection.value = { start: newPos, end: newPos }
    }
  })
}

const renderedPreview = computed(() => {
  const content = form.value.content
  if (!content) return '<p style="color: #999;">Start writing to see a preview...</p>'

  let cleanContent = content.trim()
  const codeFenceMatch = cleanContent.match(/^```\w*\n([\s\S]*?)\n```\s*$/)
  if (codeFenceMatch?.[1]) {
    cleanContent = codeFenceMatch[1]
  }

  try {
    return marked(cleanContent, { breaks: true })
  } catch {
    return content
  }
})

// Cover image
const triggerCoverUpload = () => coverInput.value?.click()

const handleCoverUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) await uploadImage(file, true)
}

const handleCoverDrop = async (event: DragEvent) => {
  const file = event.dataTransfer?.files?.[0]
  if (file?.type.startsWith('image/')) await uploadImage(file, true)
}

const uploadImage = async (file: File, isCover = false): Promise<string | null> => {
  uploadProgress.value = 0
  const result = await uploadBlogImage(file, (p) => {
    uploadProgress.value = p.percent
  })
  uploadProgress.value = null

  if (!result.ok) {
    // Surface the *actual* server reason so authors know why a large/oversized
    // image silently failed instead of seeing a generic toast.
    showSnackbar(result.message, result.code === 'PAYLOAD_TOO_LARGE' ? 'warning' : 'error')
    return null
  }

  if (isCover) {
    form.value.coverImage = result.url
    return result.url
  }
  return result.url
}

const insertImage = async () => {
  uploadingImage.value = true
  try {
    let url = imageUrl.value
    if (imageTab.value === 'upload' && inlineImage.value.length > 0) {
      url = await uploadImage(inlineImage.value[0] as File) || ''
    }
    if (url) {
      form.value.content += `\n![${imageAlt.value || 'Image'}](${url})\n`
    }
    showImageDialog.value = false
    inlineImage.value = []
    imageUrl.value = ''
    imageAlt.value = ''
  } finally {
    uploadingImage.value = false
  }
}

// Save changes
const saveChanges = async () => {
  saving.value = true
  saveType.value = 'save'
  
  try {
    await api.put(`/api/admin/blog/${postId.value}`, form.value)
    showSnackbar('Changes saved successfully', 'success')
  } catch (error: any) {
    showSnackbar(error.message || 'Failed to save', 'error')
  } finally {
    saving.value = false
  }
}

// Publish
const publish = async () => {
  saving.value = true
  saveType.value = 'publish'
  
  try {
    await api.put(`/api/admin/blog/${postId.value}`, { ...form.value, status: 'published' })
    form.value.status = 'published'
    form.value.publishedAt = new Date().toISOString()
    showSnackbar('Post published successfully', 'success')
    
    // Sync to Hashnode if enabled
    if (form.value.syncToHashnode) {
      await syncToHashnode()
    }
  } catch (error: any) {
    showSnackbar(error.message || 'Failed to publish', 'error')
  } finally {
    saving.value = false
  }
}

// Unpublish
const unpublish = async () => {
  try {
    await api.put(`/api/admin/blog/${postId.value}`, { status: 'draft' })
    form.value.status = 'draft'
    showSnackbar('Post unpublished', 'success')
  } catch (error: any) {
    showSnackbar(error.message || 'Failed to unpublish', 'error')
  }
}

// Sync to Hashnode
const syncToHashnode = async () => {
  syncing.value = true
  try {
    const data: any = await api.post('/api/admin/blog/hashnode/publish', { postId: postId.value })
    form.value.hashnodeId = data.hashnodeId
    form.value.hashnodeUrl = data.hashnodeUrl
    form.value.lastSyncedAt = new Date().toISOString()
    showSnackbar(data.message, 'success')
  } catch (error: any) {
    showSnackbar(error.message || 'Hashnode sync failed', 'error')
  } finally {
    syncing.value = false
  }
}

// Delete
const confirmDelete = () => {
  deleteDialog.value = true
}

const deletePost = async () => {
  deleting.value = true
  try {
    await api.delete(`/api/admin/blog/${postId.value}`)
    showSnackbar('Post deleted', 'success')
    router.push('/admin/blog')
  } catch (error: any) {
    showSnackbar(error.message || 'Failed to delete', 'error')
  } finally {
    deleting.value = false
  }
}

// Snackbar helper
const showSnackbar = (message: string, color: string) => {
  snackbar.value = { show: true, message, color }
}

// ── Auto-save ─────────────────────────────────────────────────────────────
// Disabled while a manual save is in flight so we never collide with the user.
const autoSaveEnabled = computed(() => !saving.value && !loading.value && !!form.value?.id)
const autoSave = useBlogAutoSave({
  postId: () => postId.value,
  form,
  enabled: autoSaveEnabled,
  onSaved: (post) => {
    if (post?.updatedAt) form.value.updatedAt = post.updatedAt
  },
})

const autoSaveLabel = computed(() => {
  switch (autoSave.status.value) {
    case 'saving': return 'Saving…'
    case 'pending': return 'Unsaved changes'
    case 'saved':
      return autoSave.lastSavedAt.value
        ? `Saved · ${autoSave.lastSavedAt.value.toLocaleTimeString()}`
        : 'Saved'
    case 'error': return autoSave.lastError.value || 'Auto-save failed'
    default: return 'All changes saved'
  }
})

const autoSaveIcon = computed(() => {
  switch (autoSave.status.value) {
    case 'saving': return 'mdi-cloud-upload-outline'
    case 'pending': return 'mdi-cloud-clock-outline'
    case 'saved': return 'mdi-cloud-check-outline'
    case 'error': return 'mdi-cloud-alert-outline'
    default: return 'mdi-cloud-outline'
  }
})

// Cmd/Ctrl+S → manual save (most authors expect this).
const handleKeydown = (e: KeyboardEvent) => {
  const isSave = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's'
  if (!isSave) return
  e.preventDefault()
  void saveChanges()
}

onMounted(() => {
  fetchPost()
  fetchCategories()
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeydown)
    if (localStorage.getItem(HELP_DISMISS_KEY) !== '1') {
      showHelp.value = true
    }
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeydown)
  }
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;500;600;700&display=swap');

.admin-blog-editor {
  background-color: #fcfcfb;
  font-family: 'Inter', sans-serif;
  min-height: 100vh;
}

.display-serif { font-family: 'Playfair Display', serif; }
.text-gold { color: #8c734b; }
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

.border-error {
  border-color: rgba(255, 82, 82, 0.3) !important;
}

.title-input :deep(input) {
  font-size: 1.25rem !important;
  font-weight: 600;
}

.content-textarea :deep(textarea) {
  font-family: 'Inter', sans-serif;
  font-size: 0.95rem;
  line-height: 1.8;
}

.markdown-mode :deep(textarea) {
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace !important;
  font-size: 0.9rem;
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 16px;
  border-radius: 8px;
}

.editor-toolbar {
  padding: 8px;
  background: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #eee;
}

.visual-preview {
  border-top: 1px solid #eee;
  padding-top: 16px;
}

.preview-header {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #999;
  margin-bottom: 12px;
  font-weight: 500;
}

.preview-content {
  padding: 24px;
  background: #fafafa;
  border-radius: 12px;
  border: 1px solid #eee;
  min-height: 200px;
  font-size: 1rem;
  line-height: 1.8;
  color: #333;
}

.preview-content :deep(h1),
.preview-content :deep(h2),
.preview-content :deep(h3),
.preview-content :deep(h4) {
  font-family: 'Playfair Display', serif;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  font-weight: 600;
}

.preview-content :deep(h1) { font-size: 2rem; }
.preview-content :deep(h2) { font-size: 1.5rem; }
.preview-content :deep(h3) { font-size: 1.25rem; }

.preview-content :deep(p) {
  margin-bottom: 1rem;
}

.preview-content :deep(strong) {
  font-weight: 700;
}

.preview-content :deep(blockquote) {
  border-left: 4px solid #8c734b;
  padding-left: 16px;
  margin: 1rem 0;
  color: #666;
  font-style: italic;
}

.preview-content :deep(code) {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
}

.preview-content :deep(pre) {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 1rem 0;
}

.preview-content :deep(pre code) {
  background: none;
  padding: 0;
}

.preview-content :deep(ul),
.preview-content :deep(ol) {
  padding-left: 1.5rem;
  margin-bottom: 1rem;
}

.preview-content :deep(li) {
  margin-bottom: 0.25rem;
}

.preview-content :deep(a) {
  color: #1976D2;
  text-decoration: underline;
}

.preview-content :deep(img) {
  max-width: 100%;
  border-radius: 8px;
  margin: 1rem 0;
}

.preview-content :deep(hr) {
  border: none;
  border-top: 1px solid #eee;
  margin: 2rem 0;
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

/* Auto-save indicator — colour changes with status so authors can see at a
   glance whether their work is on the server. */
.autosave-indicator {
  display: inline-flex;
  align-items: center;
  font-size: 0.8125rem;
  color: rgba(0, 0, 0, 0.55);
  vertical-align: middle;
  white-space: nowrap;
}
.autosave-saving { color: #1976d2; }
.autosave-saved  { color: #2e7d32; }
.autosave-pending { color: #b26a00; }
.autosave-error  { color: #c62828; }
</style>
