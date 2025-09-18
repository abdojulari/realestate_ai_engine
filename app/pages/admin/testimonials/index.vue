<template>
  <div class="testimonials-admin">
    <v-card flat>
      <v-card-title class="d-flex align-center justify-space-between">
        <div>
          <h2 class="text-h4">Testimonials</h2>
          <p class="text-body-2 text-grey-darken-1 mt-1">
            Manage client testimonials and reviews
          </p>
        </div>
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          href="/testimonials/submit"
          target="_blank"
        >
          Preview Form
        </v-btn>
      </v-card-title>

      <!-- Filters -->
      <v-card-text>
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="search"
              prepend-inner-icon="mdi-magnify"
              label="Search testimonials..."
              variant="outlined"
              density="compact"
              clearable
              @input="debouncedSearch"
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="statusFilter"
              :items="statusOptions"
              label="Status"
              variant="outlined"
              density="compact"
              @update:model-value="loadTestimonials"
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-btn
              color="success"
              variant="outlined"
              @click="bulkApprove"
              :disabled="!selectedItems.length"
            >
              Approve Selected
            </v-btn>
          </v-col>
          <v-col cols="12" md="3" class="text-right">
            <v-chip :color="getStatsColor('total')" class="mr-2">
              Total: {{ stats.total }}
            </v-chip>
            <v-chip :color="getStatsColor('pending')" class="mr-2">
              Pending: {{ stats.pending }}
            </v-chip>
            <v-chip :color="getStatsColor('featured')">
              Featured: {{ stats.featured }}
            </v-chip>
          </v-col>
        </v-row>
      </v-card-text>

      <!-- Data Table -->
      <v-data-table
        v-model="selectedItems"
        :headers="headers"
        :items="testimonials"
        :loading="loading"
        :items-per-page="itemsPerPage"
        :page="currentPage"
        show-select
        item-value="id"
        class="elevation-1"
      >
        <!-- Avatar -->
        <template #item.avatar="{ item }">
          <v-avatar size="40" color="grey-lighten-2">
            <v-img
              v-if="item.avatar"
              :src="item.avatar"
              :alt="`${item.name} avatar`"
              cover
            />
            <v-icon v-else size="20" color="grey-darken-1">
              mdi-account-circle
            </v-icon>
          </v-avatar>
        </template>

        <!-- Client Info -->
        <template #item.client="{ item }">
          <div>
            <div class="font-weight-medium">{{ item.name }}</div>
            <div class="text-caption text-grey">{{ item.location }}</div>
            <div class="text-caption text-primary">{{ item.propertyType }}</div>
          </div>
        </template>

        <!-- Rating -->
        <template #item.rating="{ item }">
          <v-rating
            :model-value="item.rating"
            readonly
            color="amber"
            size="small"
            density="compact"
          />
        </template>

        <!-- Content Preview -->
        <template #item.content="{ item }">
          <div class="content-preview">
            {{ truncateText(item.content, 100) }}
          </div>
        </template>

        <!-- Status -->
        <template #item.approved="{ item }">
          <v-chip
            :color="item.approved ? 'success' : 'warning'"
            size="small"
            variant="tonal"
          >
            {{ item.approved ? 'Approved' : 'Pending' }}
          </v-chip>
        </template>

        <!-- Featured -->
        <template #item.featured="{ item }">
          <v-switch
            :model-value="item.featured"
            color="primary"
            density="compact"
            hide-details
            @update:model-value="toggleFeatured(item, $event)"
          />
        </template>

        <!-- Date -->
        <template #item.createdAt="{ item }">
          <div class="text-caption">
            {{ formatDate(item.createdAt) }}
          </div>
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <div class="d-flex gap-2">
            <v-btn
              size="small"
              variant="outlined"
              color="primary"
              @click="viewTestimonial(item)"
            >
              View
            </v-btn>
            <v-btn
              v-if="!item.approved"
              size="small"
              color="success"
              @click="approveTestimonial(item)"
            >
              Approve
            </v-btn>
            <v-btn
              size="small"
              variant="outlined"
              color="error"
              @click="deleteTestimonial(item)"
            >
              Delete
            </v-btn>
          </div>
        </template>
      </v-data-table>

      <!-- Pagination -->
      <div v-if="pagination.pages > 1" class="d-flex justify-center pa-4">
        <v-pagination
          v-model="currentPage"
          :length="pagination.pages"
          @update:model-value="loadTestimonials"
        />
      </div>
    </v-card>

    <!-- View Dialog -->
    <v-dialog v-model="showViewDialog" max-width="600">
      <v-card v-if="selectedTestimonial">
        <v-card-title class="d-flex align-center">
          <v-avatar class="mr-3" size="48">
            <v-img
              v-if="selectedTestimonial.avatar"
              :src="selectedTestimonial.avatar"
              cover
            />
            <v-icon v-else>mdi-account-circle</v-icon>
          </v-avatar>
          <div>
            <div class="text-h6">{{ selectedTestimonial.name }}</div>
            <div class="text-caption text-grey">{{ selectedTestimonial.location }}</div>
          </div>
        </v-card-title>

        <v-card-text>
          <div class="mb-4">
            <v-rating
              :model-value="selectedTestimonial.rating"
              readonly
              color="amber"
              size="small"
            />
            <span class="ml-2 text-body-2">{{ selectedTestimonial.propertyType }}</span>
          </div>

          <blockquote class="testimonial-content mb-4">
            "{{ selectedTestimonial.content }}"
          </blockquote>

          <div class="d-flex justify-space-between align-center">
            <div>
              <v-chip
                :color="selectedTestimonial.approved ? 'success' : 'warning'"
                size="small"
                class="mr-2"
              >
                {{ selectedTestimonial.approved ? 'Approved' : 'Pending' }}
              </v-chip>
              <v-chip
                v-if="selectedTestimonial.featured"
                color="primary"
                size="small"
              >
                Featured
              </v-chip>
            </div>
            <div class="text-caption text-grey">
              {{ formatDate(selectedTestimonial.createdAt) }}
            </div>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            v-if="!selectedTestimonial.approved"
            color="success"
            @click="approveTestimonial(selectedTestimonial)"
          >
            Approve
          </v-btn>
          <v-btn
            variant="outlined"
            @click="showViewDialog = false"
          >
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { api } from '~/utils/api'

// Meta
definePageMeta({
  layout: 'admin'
})

// Types
interface Testimonial {
  id: number
  name: string
  email: string
  location: string
  content: string
  rating: number
  propertyType: string
  avatar?: string
  approved: boolean
  featured: boolean
  createdAt: string
}

// Reactive state
const loading = ref(false)
const testimonials = ref<Testimonial[]>([])
const selectedItems = ref<number[]>([])
const search = ref('')
const statusFilter = ref('all')
const currentPage = ref(1)
const itemsPerPage = ref(20)
const showViewDialog = ref(false)
const selectedTestimonial = ref<Testimonial | null>(null)

const pagination = ref({
  page: 1,
  pages: 1,
  total: 0,
  limit: 20
})

const stats = ref({
  total: 0,
  pending: 0,
  featured: 0
})

// Table headers
const headers = [
  { title: 'Avatar', key: 'avatar', sortable: false },
  { title: 'Client', key: 'client', sortable: false },
  { title: 'Rating', key: 'rating', width: 120 },
  { title: 'Content', key: 'content', sortable: false },
  { title: 'Status', key: 'approved', width: 100 },
  { title: 'Featured', key: 'featured', width: 100 },
  { title: 'Date', key: 'createdAt', width: 100 },
  { title: 'Actions', key: 'actions', sortable: false, width: 200 }
]

// Filter options
const statusOptions = [
  { title: 'All', value: 'all' },
  { title: 'Pending', value: 'pending' },
  { title: 'Approved', value: 'approved' }
]

// Debounced search
const debouncedSearch = debounce(() => {
  currentPage.value = 1
  loadTestimonials()
}, 500)

// Methods
const loadTestimonials = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: currentPage.value.toString(),
      limit: itemsPerPage.value.toString(),
      ...(search.value && { search: search.value }),
      ...(statusFilter.value !== 'all' && { status: statusFilter.value })
    })

    const response = await api.get(`/admin/testimonials?${params}`)
    testimonials.value = response.testimonials
    pagination.value = response.pagination
    
    // Update stats
    await loadStats()
  } catch (error) {
    console.error('Error loading testimonials:', error)
  } finally {
    loading.value = false
  }
}

const loadStats = async () => {
  try {
    const [allResponse, pendingResponse, featuredResponse] = await Promise.all([
      api.get('/admin/testimonials?limit=0'),
      api.get('/admin/testimonials?status=pending&limit=0'),
      api.get('/testimonials?featured=true&limit=0')
    ])
    
    stats.value = {
      total: allResponse.pagination?.total || 0,
      pending: pendingResponse.pagination?.total || 0,
      featured: featuredResponse.length || 0
    }
  } catch (error) {
    console.error('Error loading stats:', error)
  }
}

const approveTestimonial = async (testimonial: Testimonial) => {
  try {
    await api.patch(`/admin/testimonials/${testimonial.id}`, {
      approved: true
    })
    testimonial.approved = true
    await loadStats()
  } catch (error) {
    console.error('Error approving testimonial:', error)
  }
}

const toggleFeatured = async (testimonial: Testimonial, featured: boolean) => {
  try {
    await api.patch(`/admin/testimonials/${testimonial.id}`, {
      featured
    })
    testimonial.featured = featured
    await loadStats()
  } catch (error) {
    console.error('Error updating featured status:', error)
  }
}

const deleteTestimonial = async (testimonial: Testimonial) => {
  if (!confirm(`Are you sure you want to delete ${testimonial.name}'s testimonial?`)) {
    return
  }

  try {
    await api.delete(`/admin/testimonials/${testimonial.id}`)
    await loadTestimonials()
  } catch (error) {
    console.error('Error deleting testimonial:', error)
  }
}

const bulkApprove = async () => {
  if (!selectedItems.value.length) return

  try {
    await Promise.all(
      selectedItems.value.map(id =>
        api.patch(`/admin/testimonials/${id}`, { approved: true })
      )
    )
    selectedItems.value = []
    await loadTestimonials()
  } catch (error) {
    console.error('Error bulk approving:', error)
  }
}

const viewTestimonial = (testimonial: Testimonial) => {
  selectedTestimonial.value = testimonial
  showViewDialog.value = true
}

// Utility functions
const truncateText = (text: string, maxLength: number) => {
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const getStatsColor = (type: string) => {
  const colors = {
    total: 'primary',
    pending: 'warning',
    featured: 'success'
  }
  return colors[type as keyof typeof colors] || 'grey'
}

function debounce(func: Function, wait: number) {
  let timeout: NodeJS.Timeout
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Lifecycle
onMounted(() => {
  loadTestimonials()
})
</script>

<style scoped>
.gap-2 {
  gap: 8px;
}

.content-preview {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.testimonial-content {
  font-style: italic;
  padding: 16px;
  background: rgba(var(--v-theme-surface-variant), 0.1);
  border-left: 4px solid rgb(var(--v-theme-primary));
  border-radius: 4px;
}
</style>
