<template>
  <div class="admin-categories-premium px-md-8 py-md-6">
    <v-container fluid>
      <!-- Page Header -->
      <v-row class="mb-8 align-center">
        <v-col cols="12" md="6">
          <div class="d-flex align-center mb-2">
            <v-btn icon variant="text" to="/admin/blog" class="mr-2">
              <v-icon>mdi-arrow-left</v-icon>
            </v-btn>
            <div class="premium-accent-bar mr-4"></div>
            <span class="text-overline letter-spacing-2 text-gold">Blog</span>
          </div>
          <h1 class="display-serif text-h3 mb-1">Categories</h1>
          <p class="text-subtitle-1 text-medium-emphasis font-weight-light">Organize your blog content</p>
        </v-col>
        <v-col cols="12" md="6" class="text-md-right">
          <v-btn color="primary" size="large" prepend-icon="mdi-plus" @click="openCreateDialog">
            New Category
          </v-btn>
        </v-col>
      </v-row>

      <!-- Categories List -->
      <v-row>
        <v-col cols="12">
          <v-card class="categories-card" elevation="0">
            <v-data-table
              :headers="headers"
              :items="categories"
              :loading="loading"
              class="premium-data-table"
            >
              <!-- Name Column -->
              <template v-slot:item.name="{ item }">
                <div class="d-flex align-center py-2">
                  <v-avatar :color="item.color" size="36" class="mr-3">
                    <v-icon color="white" size="small">{{ item.icon }}</v-icon>
                  </v-avatar>
                  <div>
                    <div class="font-weight-bold">{{ item.name }}</div>
                    <div class="text-caption text-medium-emphasis">/blog/category/{{ item.slug }}</div>
                  </div>
                </div>
              </template>

              <!-- Description Column -->
              <template v-slot:item.description="{ item }">
                <span class="text-body-2">{{ item.description || '—' }}</span>
              </template>

              <!-- Posts Column -->
              <template v-slot:item.postCount="{ item }">
                <v-chip size="small" variant="tonal" color="primary">
                  {{ item.postCount }} posts
                </v-chip>
              </template>

              <!-- Status Column -->
              <template v-slot:item.isActive="{ item }">
                <v-chip
                  :color="item.isActive ? 'success' : 'grey'"
                  size="small"
                  variant="flat"
                >
                  {{ item.isActive ? 'Active' : 'Inactive' }}
                </v-chip>
              </template>

              <!-- Actions Column -->
              <template v-slot:item.actions="{ item }">
                <v-btn icon size="small" variant="text" color="primary" @click="openEditDialog(item)">
                  <v-icon>mdi-pencil</v-icon>
                </v-btn>
                <v-btn 
                  icon 
                  size="small" 
                  variant="text" 
                  color="error"
                  :disabled="item.postCount > 0"
                  @click="confirmDelete(item)"
                >
                  <v-icon>mdi-delete</v-icon>
                  <v-tooltip activator="parent" v-if="item.postCount > 0">
                    Cannot delete category with posts
                  </v-tooltip>
                </v-btn>
              </template>

              <!-- Loading State -->
              <template v-slot:loading>
                <v-skeleton-loader type="table-row@5" />
              </template>

              <!-- No Data -->
              <template v-slot:no-data>
                <div class="text-center py-8">
                  <v-icon size="64" color="grey-lighten-1">mdi-folder-outline</v-icon>
                  <p class="text-h6 mt-4">No categories yet</p>
                  <p class="text-body-2 text-medium-emphasis">Create your first category to organize posts</p>
                  <v-btn color="primary" class="mt-4" @click="openCreateDialog">
                    Create Category
                  </v-btn>
                </div>
              </template>
            </v-data-table>
          </v-card>
        </v-col>
      </v-row>

      <!-- Create/Edit Dialog -->
      <v-dialog v-model="dialog" max-width="500">
        <v-card>
          <v-card-title class="text-h6">
            {{ editingCategory ? 'Edit Category' : 'New Category' }}
          </v-card-title>
          <v-card-text>
            <v-text-field
              v-model="formData.name"
              label="Category Name"
              variant="outlined"
              class="mb-4"
              :rules="[v => !!v || 'Name is required']"
              @blur="generateSlug"
            />
            
            <v-text-field
              v-model="formData.slug"
              label="URL Slug"
              variant="outlined"
              class="mb-4"
              prepend-inner-icon="mdi-link"
            />
            
            <v-textarea
              v-model="formData.description"
              label="Description"
              variant="outlined"
              rows="2"
              class="mb-4"
            />
            
            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model="formData.color"
                  label="Color"
                  variant="outlined"
                  type="color"
                />
              </v-col>
              <v-col cols="6">
                <v-select
                  v-model="formData.icon"
                  :items="iconOptions"
                  label="Icon"
                  variant="outlined"
                >
                  <template v-slot:item="{ item, props }">
                    <v-list-item v-bind="props">
                      <template v-slot:prepend>
                        <v-icon>{{ item.value }}</v-icon>
                      </template>
                    </v-list-item>
                  </template>
                  <template v-slot:selection="{ item }">
                    <v-icon class="mr-2">{{ item.value }}</v-icon>
                    {{ item.title }}
                  </template>
                </v-select>
              </v-col>
            </v-row>
            
            <v-text-field
              v-model.number="formData.sortOrder"
              label="Sort Order"
              variant="outlined"
              type="number"
              class="mb-4"
            />
            
            <v-switch
              v-model="formData.isActive"
              label="Active"
              color="primary"
              hide-details
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="dialog = false">Cancel</v-btn>
            <v-btn color="primary" @click="saveCategory" :loading="saving">
              {{ editingCategory ? 'Update' : 'Create' }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Delete Confirmation Dialog -->
      <v-dialog v-model="deleteDialog" max-width="400">
        <v-card>
          <v-card-title class="text-h6">Delete Category</v-card-title>
          <v-card-text>
            Are you sure you want to delete "{{ categoryToDelete?.name }}"?
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
            <v-btn color="error" @click="deleteCategory" :loading="deleting">Delete</v-btn>
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
import { ref, onMounted } from 'vue'
// @ts-ignore
import { api } from '~/utils/api'

definePageMeta({
  layout: 'admin',
  middleware: ['admin']
})

// State
const loading = ref(true)
const categories = ref<any[]>([])
const dialog = ref(false)
const editingCategory = ref<any>(null)
const formData = ref({
  name: '',
  slug: '',
  description: '',
  color: '#1976D2',
  icon: 'mdi-folder',
  sortOrder: 0,
  isActive: true
})
const saving = ref(false)

// Delete
const deleteDialog = ref(false)
const categoryToDelete = ref<any>(null)
const deleting = ref(false)

// Snackbar
const snackbar = ref({ show: false, message: '', color: 'success' })

// Table headers
const headers = [
  { title: 'Category', key: 'name', sortable: true },
  { title: 'Description', key: 'description', sortable: false },
  { title: 'Posts', key: 'postCount', sortable: true },
  { title: 'Status', key: 'isActive', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const }
]

// Icon options
const iconOptions = [
  { title: 'Folder', value: 'mdi-folder' },
  { title: 'Home', value: 'mdi-home' },
  { title: 'Star', value: 'mdi-star' },
  { title: 'Heart', value: 'mdi-heart' },
  { title: 'Lightbulb', value: 'mdi-lightbulb' },
  { title: 'Code', value: 'mdi-code-braces' },
  { title: 'Book', value: 'mdi-book' },
  { title: 'Camera', value: 'mdi-camera' },
  { title: 'Music', value: 'mdi-music' },
  { title: 'Chart', value: 'mdi-chart-line' },
  { title: 'Finance', value: 'mdi-currency-usd' },
  { title: 'Travel', value: 'mdi-airplane' },
  { title: 'Food', value: 'mdi-food' },
  { title: 'Health', value: 'mdi-heart-pulse' },
  { title: 'Education', value: 'mdi-school' }
]

// Fetch categories
const fetchCategories = async () => {
  loading.value = true
  try {
    const data: any = await api.get('/api/admin/blog/categories?includeInactive=true')
    categories.value = data.categories || []
  } catch (error) {
    console.error('Error fetching categories:', error)
  } finally {
    loading.value = false
  }
}

// Generate slug
const generateSlug = () => {
  if (!formData.value.slug && formData.value.name) {
    formData.value.slug = formData.value.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }
}

// Open create dialog
const openCreateDialog = () => {
  editingCategory.value = null
  formData.value = {
    name: '',
    slug: '',
    description: '',
    color: '#1976D2',
    icon: 'mdi-folder',
    sortOrder: 0,
    isActive: true
  }
  dialog.value = true
}

// Open edit dialog
const openEditDialog = (category: any) => {
  editingCategory.value = category
  formData.value = { ...category }
  dialog.value = true
}

// Save category
const saveCategory = async () => {
  if (!formData.value.name) {
    showSnackbar('Name is required', 'error')
    return
  }
  
  saving.value = true
  
  try {
    if (editingCategory.value) {
      await api.put(`/api/admin/blog/categories/${editingCategory.value.id}`, formData.value)
      showSnackbar('Category updated', 'success')
    } else {
      await api.post('/api/admin/blog/categories', formData.value)
      showSnackbar('Category created', 'success')
    }
    
    dialog.value = false
    fetchCategories()
  } catch (error: any) {
    showSnackbar(error.message || 'Failed to save', 'error')
  } finally {
    saving.value = false
  }
}

// Confirm delete
const confirmDelete = (category: any) => {
  categoryToDelete.value = category
  deleteDialog.value = true
}

// Delete category
const deleteCategory = async () => {
  if (!categoryToDelete.value) return
  
  deleting.value = true
  
  try {
    await api.delete(`/api/admin/blog/categories/${categoryToDelete.value.id}`)
    showSnackbar('Category deleted', 'success')
    deleteDialog.value = false
    fetchCategories()
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

onMounted(() => {
  fetchCategories()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;500;600;700&display=swap');

.admin-categories-premium {
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

.categories-card {
  border-radius: 20px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  background: white !important;
  overflow: hidden;
}

.premium-data-table {
  font-family: 'Inter', sans-serif;
}
</style>
