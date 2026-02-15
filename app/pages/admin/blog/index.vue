<template>
  <div class="admin-blog-premium px-md-8 py-md-6">
    <v-container fluid>
      <!-- Page Header -->
      <v-row class="mb-8 align-center">
        <v-col cols="12" md="6">
          <div class="d-flex align-center mb-2">
            <div class="premium-accent-bar mr-4"></div>
            <span class="text-overline letter-spacing-2 text-gold">Content Management</span>
          </div>
          <h1 class="display-serif text-h3 mb-1">Blog Posts</h1>
          <p class="text-subtitle-1 text-medium-emphasis font-weight-light">Create and manage your blog content</p>
        </v-col>
        <v-col cols="12" md="6" class="text-md-right">
          <v-btn
            color="primary"
            size="large"
            prepend-icon="mdi-plus"
            to="/admin/blog/new"
            class="mr-2"
          >
            New Post
          </v-btn>
          <v-btn
            variant="outlined"
            size="large"
            prepend-icon="mdi-folder"
            to="/admin/blog/categories"
          >
            Categories
          </v-btn>
        </v-col>
      </v-row>

      <!-- Status Tabs & Filters -->
      <v-row class="mb-6">
        <v-col cols="12">
          <v-card class="filter-card-premium" elevation="0">
            <v-card-text class="pa-4">
              <v-row align="center">
                <v-col cols="12" md="6">
                  <v-tabs v-model="activeTab" color="primary" class="status-tabs">
                    <v-tab value="all">
                      All
                      <v-chip size="x-small" class="ml-2" variant="tonal">{{ counts.all }}</v-chip>
                    </v-tab>
                    <v-tab value="published">
                      Published
                      <v-chip size="x-small" class="ml-2" color="success" variant="tonal">{{ counts.published }}</v-chip>
                    </v-tab>
                    <v-tab value="draft">
                      Drafts
                      <v-chip size="x-small" class="ml-2" color="warning" variant="tonal">{{ counts.draft }}</v-chip>
                    </v-tab>
                    <v-tab value="scheduled">
                      Scheduled
                      <v-chip size="x-small" class="ml-2" color="info" variant="tonal">{{ counts.scheduled }}</v-chip>
                    </v-tab>
                  </v-tabs>
                </v-col>
                <v-col cols="12" md="3">
                  <v-select
                    v-model="selectedCategory"
                    :items="categoryOptions"
                    label="Category"
                    density="compact"
                    variant="outlined"
                    clearable
                    hide-details
                  />
                </v-col>
                <v-col cols="12" md="3">
                  <v-text-field
                    v-model="searchQuery"
                    prepend-inner-icon="mdi-magnify"
                    label="Search posts..."
                    density="compact"
                    variant="outlined"
                    clearable
                    hide-details
                    @keyup.enter="fetchPosts"
                  />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Posts Table -->
      <v-row>
        <v-col cols="12">
          <v-card class="posts-table-card" elevation="0">
            <v-data-table
              :headers="headers"
              :items="posts"
              :loading="loading"
              :items-per-page="pagination.limit"
              :items-length="pagination.total"
              class="premium-data-table"
              @update:page="handlePageChange"
            >
              <!-- Title Column -->
              <template v-slot:item.title="{ item }">
                <div class="d-flex align-center py-2">
                  <v-img
                    v-if="item.coverImage"
                    :src="item.coverImage"
                    width="60"
                    height="40"
                    cover
                    class="rounded-lg mr-3"
                  />
                  <div v-else class="cover-placeholder rounded-lg mr-3">
                    <v-icon size="20" color="grey">mdi-image</v-icon>
                  </div>
                  <div>
                    <div class="font-weight-bold text-body-1">{{ item.title }}</div>
                    <div class="text-caption text-medium-emphasis">/blog/{{ item.slug }}</div>
                  </div>
                </div>
              </template>

              <!-- Category Column -->
              <template v-slot:item.category="{ item }">
                <v-chip
                  v-if="item.category"
                  :color="item.category.color"
                  size="small"
                  variant="tonal"
                >
                  {{ item.category.name }}
                </v-chip>
                <span v-else class="text-grey">—</span>
              </template>

              <!-- Author Column -->
              <template v-slot:item.author="{ item }">
                <div v-if="item.author" class="d-flex align-center">
                  <v-avatar size="28" class="mr-2" color="primary">
                    <v-img v-if="item.author.avatar" :src="item.author.avatar" />
                    <span v-else class="text-caption text-white">
                      {{ item.author.firstName?.[0] }}{{ item.author.lastName?.[0] }}
                    </span>
                  </v-avatar>
                  <span class="text-body-2">{{ item.author.firstName }} {{ item.author.lastName }}</span>
                </div>
                <span v-else class="text-grey">—</span>
              </template>

              <!-- Status Column -->
              <template v-slot:item.status="{ item }">
                <v-chip
                  :color="getStatusColor(item.status)"
                  size="small"
                  variant="flat"
                  class="text-uppercase font-weight-bold"
                >
                  {{ item.status }}
                </v-chip>
              </template>

              <!-- Date Column -->
              <template v-slot:item.publishedAt="{ item }">
                <div class="text-body-2">
                  {{ item.publishedAt ? formatDate(item.publishedAt) : formatDate(item.createdAt) }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ item.views }} views
                </div>
              </template>

              <!-- Actions Column -->
              <template v-slot:item.actions="{ item }">
                <div class="d-flex gap-1">
                  <v-btn
                    icon
                    size="small"
                    variant="text"
                    color="primary"
                    :to="`/admin/blog/${item.id}`"
                  >
                    <v-icon>mdi-pencil</v-icon>
                    <v-tooltip activator="parent">Edit</v-tooltip>
                  </v-btn>
                  <v-btn
                    icon
                    size="small"
                    variant="text"
                    color="info"
                    :href="`/blog/${item.slug}`"
                    target="_blank"
                    :disabled="item.status !== 'published'"
                  >
                    <v-icon>mdi-eye</v-icon>
                    <v-tooltip activator="parent">View</v-tooltip>
                  </v-btn>
                  <v-btn
                    icon
                    size="small"
                    variant="text"
                    color="error"
                    @click="confirmDelete(item)"
                  >
                    <v-icon>mdi-delete</v-icon>
                    <v-tooltip activator="parent">Delete</v-tooltip>
                  </v-btn>
                </div>
              </template>

              <!-- Loading State -->
              <template v-slot:loading>
                <v-skeleton-loader type="table-row@5" />
              </template>

              <!-- No Data -->
              <template v-slot:no-data>
                <div class="text-center py-8">
                  <v-icon size="64" color="grey-lighten-1">mdi-post-outline</v-icon>
                  <p class="text-h6 mt-4">No posts found</p>
                  <p class="text-body-2 text-medium-emphasis">Create your first blog post to get started</p>
                  <v-btn color="primary" to="/admin/blog/new" class="mt-4">
                    Create Post
                  </v-btn>
                </div>
              </template>
            </v-data-table>
          </v-card>
        </v-col>
      </v-row>

      <!-- Delete Confirmation Dialog -->
      <v-dialog v-model="deleteDialog" max-width="400">
        <v-card>
          <v-card-title class="text-h6">Delete Post</v-card-title>
          <v-card-text>
            Are you sure you want to delete "{{ postToDelete?.title }}"? This action cannot be undone.
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
            <v-btn color="error" variant="flat" :loading="deleting" @click="deletePost">
              Delete
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
// @ts-ignore
import { api } from '~/utils/api'
// @ts-ignore
import { formatDate } from '~/utils/formatters'

definePageMeta({
  layout: 'admin',
  middleware: ['admin']
})

// State
const loading = ref(true)
const posts = ref<any[]>([])
const categories = ref<any[]>([])
const activeTab = ref('all')
const selectedCategory = ref<number | null>(null)
const searchQuery = ref('')
const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0
})
const counts = ref({
  all: 0,
  draft: 0,
  published: 0,
  scheduled: 0,
  archived: 0
})

// Delete dialog
const deleteDialog = ref(false)
const postToDelete = ref<any>(null)
const deleting = ref(false)

// Table headers
const headers = [
  { title: 'Post', key: 'title', sortable: true, width: '35%' },
  { title: 'Category', key: 'category', sortable: false, width: '15%' },
  { title: 'Author', key: 'author', sortable: false, width: '15%' },
  { title: 'Status', key: 'status', sortable: true, width: '10%' },
  { title: 'Date', key: 'publishedAt', sortable: true, width: '15%' },
  { title: 'Actions', key: 'actions', sortable: false, width: '10%', align: 'end' as const }
]

// Category options for dropdown
const categoryOptions = computed(() => {
  return [
    { title: 'All Categories', value: null },
    ...categories.value.map(c => ({ title: c.name, value: c.id }))
  ]
})

// Status color mapping
const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    published: 'success',
    draft: 'warning',
    scheduled: 'info',
    archived: 'grey'
  }
  return colors[status] || 'grey'
}

// Fetch posts
const fetchPosts = async () => {
  loading.value = true
  
  try {
    const params: any = {
      page: pagination.value.page,
      limit: pagination.value.limit
    }
    
    if (activeTab.value !== 'all') {
      params.status = activeTab.value
    }
    
    if (selectedCategory.value) {
      params.categoryId = selectedCategory.value
    }
    
    if (searchQuery.value) {
      params.search = searchQuery.value
    }
    
    const queryString = new URLSearchParams(params).toString()
    const data: any = await api.get(`/api/admin/blog?${queryString}`)
    
    posts.value = data.posts || []
    pagination.value = data.pagination || pagination.value
    counts.value = data.counts || counts.value
  } catch (error) {
    console.error('Error fetching posts:', error)
  } finally {
    loading.value = false
  }
}

// Fetch categories
const fetchCategories = async () => {
  try {
    const data: any = await api.get('/api/admin/blog/categories?includeInactive=true')
    categories.value = data.categories || []
  } catch (error) {
    console.error('Error fetching categories:', error)
  }
}

// Handle page change
const handlePageChange = (page: number) => {
  pagination.value.page = page
  fetchPosts()
}

// Confirm delete
const confirmDelete = (post: any) => {
  postToDelete.value = post
  deleteDialog.value = true
}

// Delete post
const deletePost = async () => {
  if (!postToDelete.value) return
  
  deleting.value = true
  
  try {
    await api.delete(`/api/admin/blog/${postToDelete.value.id}`)
    deleteDialog.value = false
    postToDelete.value = null
    fetchPosts()
  } catch (error) {
    console.error('Error deleting post:', error)
  } finally {
    deleting.value = false
  }
}

// Watch for filter changes
watch([activeTab, selectedCategory], () => {
  pagination.value.page = 1
  fetchPosts()
})

// Initialize
onMounted(() => {
  fetchPosts()
  fetchCategories()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;500;600;700&display=swap');

.admin-blog-premium {
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

.filter-card-premium {
  border-radius: 16px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  background: white !important;
}

.posts-table-card {
  border-radius: 20px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  background: white !important;
  overflow: hidden;
}

.premium-data-table {
  font-family: 'Inter', sans-serif;
}

.cover-placeholder {
  width: 60px;
  height: 40px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-tabs :deep(.v-tab) {
  text-transform: none;
  font-weight: 500;
  letter-spacing: 0;
}

.gap-1 {
  gap: 4px;
}
</style>
