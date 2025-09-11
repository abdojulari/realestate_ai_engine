<template>
  <v-container>
    <div class="d-flex align-center mb-6">
      <h1 class="text-h4">Properties Management</h1>
      <v-spacer />
      <v-btn
        color="primary"
        prepend-icon="mdi-home-plus"
        to="/seller/list-property"
        variant="flat"
      >
        Add Property
      </v-btn>
    </div>

    <!-- Filters -->
    <v-card class="mb-6">
      <v-card-text>
        <v-row>
          <v-col cols="12" sm="5" md="2">
            <v-text-field
              v-model="filters.search"
              label="Search Properties"
              prepend-inner-icon="mdi-magnify"
              clearable
              @keyup.enter="applyFilters"
              @click:clear="applyFilters"
              variant="outlined"
              density="compact"
            />
          </v-col>
          
          <v-col cols="12" sm="6" md="3">
            <v-select
              v-model="filters.type"
              :items="propertyTypes"
              label="Property Type"
              clearable
              variant="outlined"
              density="compact"
            />
          </v-col>

          <v-col cols="12" sm="6" md="2">
            <v-select
              v-model="filters.status"
              :items="propertyStatuses"
              label="Status"
              clearable
              variant="outlined"
              density="compact"
            />
          </v-col>

          <v-col cols="12" sm="6" md="2">
            <v-select
              v-model="filters.sortBy"
              :items="sortOptions"
              label="Sort By"
              variant="outlined"
              density="compact"
            />
          </v-col>
          <v-col cols="12" sm="6" md="3" >
            <v-btn
              color="primary"
              @click="applyFilters"
              :loading="loading"
              variant="flat"
              prepend-icon="mdi-magnify"
              rounded="lg"
            >
              Search
            </v-btn>
          </v-col>
          
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular
        indeterminate
        color="primary"
        size="64"
      />
      <div class="mt-4 text-h6">Loading properties...</div>
    </div>

    <!-- Empty State -->
    <v-card v-else-if="properties.length === 0" class="text-center py-12">
      <v-card-text>
        <v-icon size="64" color="grey-lighten-2" class="mb-4">mdi-home-search</v-icon>
        <div class="text-h6 mb-2">No properties found</div>
        <div class="text-body-1 text-grey">Try adjusting your filters or add a new property</div>
      </v-card-text>
    </v-card>

    <!-- Properties Grid -->
    <v-row v-else>
      <v-col
        v-for="property in properties"
        :key="property.id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <v-card>
          <v-img
            :src="property.images?.[0] || '/images/placeholder-property.jpg'"
            height="200"
            cover
            class="property-image"
          >
            <template v-slot:placeholder>
              <v-row
                class="fill-height ma-0"
                align="center"
                justify="center"
              >
                <v-progress-circular
                  indeterminate
                  color="grey-lighten-5"
                />
              </v-row>
            </template>

            <div class="status-overlay">
              <v-chip
                :color="getStatusColor(property.status)"
                size="small"
              >
                {{ property.status }}
              </v-chip>
            </div>
          </v-img>

          <v-card-text>
            <div class="d-flex align-center mb-2">
              <span class="text-h6">${{ formatPrice(property.price) }}</span>
              <v-spacer />
              <v-chip
                size="small"
                :color="getTypeColor(property.type)"
              >
                {{ property.type }}
              </v-chip>
            </div>

            <div class="text-subtitle-1 mb-2">{{ property.title }}</div>
            <div class="text-body-2 text-grey mb-2">{{ property.address }}</div>

            <div class="d-flex align-center text-body-2 text-grey">
              <v-icon size="small" class="mr-1">mdi-bed</v-icon>
              <span class="mr-3">{{ property.beds }}</span>
              <v-icon size="small" class="mr-1">mdi-shower</v-icon>
              <span class="mr-3">{{ property.baths }}</span>
              <v-icon size="small" class="mr-1">mdi-ruler-square</v-icon>
              <span>{{ property.sqft }} sqft</span>
            </div>
          </v-card-text>

          <v-divider />

          <v-card-actions>
            <v-btn
              variant="text"
              :to="`/property/${property.id}`"
              target="_blank"
            >
              View
            </v-btn>
            <v-btn
              variant="text"
              :to="`/admin/properties/${property.id}/edit`"
            >
              Edit
            </v-btn>
            <v-spacer />
            <v-menu>
              <template v-slot:activator="{ props }">
                <v-btn
                  icon="mdi-dots-vertical"
                  variant="text"
                  v-bind="props"
                />
              </template>
              <v-list>
                <v-list-item
                  @click="toggleFeatured(property)"
                >
                  <template v-slot:prepend>
                    <v-icon>{{ property.isFeatured ? 'mdi-star-off' : 'mdi-star' }}</v-icon>
                  </template>
                  <v-list-item-title>
                    {{ property.isFeatured ? 'Remove from Featured' : 'Mark as Featured' }}
                  </v-list-item-title>
                </v-list-item>

                <v-list-item
                  @click="showAnalytics(property)"
                >
                  <template v-slot:prepend>
                    <v-icon>mdi-chart-line</v-icon>
                  </template>
                  <v-list-item-title>Analytics</v-list-item-title>
                </v-list-item>

                <v-list-item
                  @click="duplicateProperty(property)"
                >
                  <template v-slot:prepend>
                    <v-icon>mdi-content-copy</v-icon>
                  </template>
                  <v-list-item-title>Duplicate</v-list-item-title>
                </v-list-item>

                <v-divider />

                <v-list-item
                  color="error"
                  @click="deleteProperty(property)"
                >
                  <template v-slot:prepend>
                    <v-icon color="error">mdi-delete</v-icon>
                  </template>
                  <v-list-item-title>Delete</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Pagination -->
    <div v-if="!loading && properties.length > 0" class="mt-6">
      <!-- Pagination Info -->
      <div v-if="totalProperties > 0" class="text-center mb-4">
        <v-chip variant="outlined" color="primary">
          Showing {{ ((currentPage - 1) * 12) + 1 }}-{{ Math.min(currentPage * 12, totalProperties) }} of {{ totalProperties }} properties
        </v-chip>
      </div>
      
      <!-- Pagination Controls -->
      <div v-if="totalPages > 1" class="text-center">
        <v-pagination
          v-model="currentPage"
          :length="totalPages"
          :total-visible="7"
          @update:model-value="loadPage"
        />
      </div>
    </div>

    <!-- Analytics Dialog -->
    <v-dialog
      v-model="showAnalyticsDialog"
      max-width="800"
    >
      <v-card v-if="selectedProperty">
        <v-card-title>Analytics - {{ selectedProperty.title }}</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <v-card flat>
                <v-card-title>Views Over Time</v-card-title>
                <v-card-text>
                  <!-- Add chart component here -->
                  <div class="chart-placeholder" style="height: 200px; background: #f5f5f5;" />
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" md="6">
              <v-card flat>
                <v-card-title>Inquiries</v-card-title>
                <v-card-text>
                  <!-- Add chart component here -->
                  <div class="chart-placeholder" style="height: 200px; background: #f5f5f5;" />
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12">
              <v-list>
                <v-list-subheader>Recent Activity</v-list-subheader>
                <v-list-item
                  v-for="activity in propertyActivity"
                  :key="activity.id"
                >
                  <v-list-item-title>{{ activity.action }}</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ activity.user }} - {{ formatDateTime(activity.timestamp) }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="primary"
            @click="showAnalyticsDialog = false"
          >
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const loading = ref(false)
const currentPage = ref(1)
const totalPages = ref(1)
const totalProperties = ref(0)
const showAnalyticsDialog = ref(false)
const selectedProperty = ref<any>(null)

const filters = ref({
  search: '',
  type: null,
  status: null,
  sortBy: 'newest'
})

const propertyTypes = [
  'House',
  'Condo', 
  'Duplex',
  'Townhouse'
]

const propertyStatuses = [
  'For sale',
  'For rent',
  'Sold',
  'Pending'
]

const sortOptions = [
  { title: 'Newest First', value: 'newest' },
  { title: 'Price: Low to High', value: 'price_asc' },
  { title: 'Price: High to Low', value: 'price_desc' },
  { title: 'Most Viewed', value: 'views' }
]

const properties = ref<any[]>([])

const propertyActivity = ref([
  {
    id: 1,
    action: 'Property viewed',
    user: 'John Doe',
    timestamp: new Date(Date.now() - 3600000)
  }
])

const getStatusColor = (status: string) => {
  const colors = {
    'For sale': 'success',
    'For rent': 'info',
    'Sold': 'error',
    'Pending': 'warning'
  }
  return colors[status as keyof typeof colors] || 'grey'
}

const getTypeColor = (type: string) => {
  const colors = {
    'House': 'primary',
    'Condo': 'secondary',
    'Duplex': 'info',
    'Townhouse': 'success'
  }
  return colors[type as keyof typeof colors] || 'grey'
}

const formatPrice = (price: number) => {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const formatDateTime = (date: Date) => {
  return new Date(date).toLocaleString()
}


const applyFilters = async () => {
  if (loading.value) return
  
  console.log('🚀 applyFilters called')
  
  loading.value = true
  currentPage.value = 1
  
  try {
    const params = new URLSearchParams()
    if (filters.value.search && filters.value.search.trim()) {
      params.append('search', filters.value.search.trim())
    }
    if (filters.value.type && filters.value.type !== null && filters.value.type !== '') {
      params.append('type', filters.value.type)
    }
    if (filters.value.status && filters.value.status !== null && filters.value.status !== '') {
      params.append('status', filters.value.status)
    }
    params.append('sortBy', filters.value.sortBy || 'newest')
    params.append('page', '1')
    params.append('exclude_crea', 'true')
    
    const url = `/api/admin/properties?${params.toString()}`
    
    const response = await $fetch(url, {
      headers: (() => { 
        try { 
          const t = localStorage.getItem('token')
          return t ? { Authorization: `Bearer ${t}` } : undefined
        } catch { 
          return undefined
        } 
      })()
    }) as any
    
    // Handle new paginated response format
    console.log('🔍 API Response:', { 
      hasData: !!response.data, 
      hasPagination: !!response.pagination,
      dataLength: response.data?.length,
      isArray: Array.isArray(response)
    })
    
    if (response.data && response.pagination) {
      properties.value = response.data
      totalPages.value = response.pagination.totalPages
      totalProperties.value = response.pagination.total
      currentPage.value = response.pagination.page
      console.log('✅ Using new format:', { 
        propertiesCount: properties.value.length,
        totalPages: totalPages.value,
        totalProperties: totalProperties.value 
      })
    } else {
      // Fallback for old format
      properties.value = Array.isArray(response) ? response : (response.data || [])
      totalPages.value = response.totalPages || 1
      totalProperties.value = properties.value.length
      console.log('⚠️ Using fallback format:', { 
        propertiesCount: properties.value.length,
        totalPages: totalPages.value 
      })
    }
  } catch (error) {
    console.error('Error applying filters:', error)
    properties.value = []
    totalPages.value = 1
    totalProperties.value = 0
  } finally {
    loading.value = false
  }
}

const loadPage = async (page: number) => {
  if (loading.value) return
  
  loading.value = true
  currentPage.value = page
  
  try {
    const params = new URLSearchParams()
    if (filters.value.search && filters.value.search.trim()) {
      params.append('search', filters.value.search.trim())
    }
    if (filters.value.type && filters.value.type !== null && filters.value.type !== '') {
      params.append('type', filters.value.type)
    }
    if (filters.value.status && filters.value.status !== null && filters.value.status !== '') {
      params.append('status', filters.value.status)
    }
    params.append('sortBy', filters.value.sortBy || 'newest')
    params.append('page', page.toString())
    params.append('exclude_crea', 'true')
    
    const response = await $fetch(`/api/admin/properties?${params.toString()}`, {
      headers: (() => { 
        try { 
          const t = localStorage.getItem('token')
          return t ? { Authorization: `Bearer ${t}` } : undefined
        } catch { 
          return undefined
        } 
      })()
    }) as any
    
    // Handle new paginated response format
    console.log('🔍 API Response:', { 
      hasData: !!response.data, 
      hasPagination: !!response.pagination,
      dataLength: response.data?.length,
      isArray: Array.isArray(response)
    })
    
    if (response.data && response.pagination) {
      properties.value = response.data
      totalPages.value = response.pagination.totalPages
      totalProperties.value = response.pagination.total
      currentPage.value = response.pagination.page
      console.log('✅ Using new format:', { 
        propertiesCount: properties.value.length,
        totalPages: totalPages.value,
        totalProperties: totalProperties.value 
      })
    } else {
      // Fallback for old format
      properties.value = Array.isArray(response) ? response : (response.data || [])
      totalPages.value = response.totalPages || 1
      totalProperties.value = properties.value.length
      console.log('⚠️ Using fallback format:', { 
        propertiesCount: properties.value.length,
        totalPages: totalPages.value 
      })
    }
  } catch (error) {
    console.error('Error loading page:', error)
    properties.value = []
    totalPages.value = 1
  } finally {
    loading.value = false
  }
}

const toggleFeatured = async (property: any) => {
  try {
    await $fetch(`/api/admin/properties/${property.id}/featured`, {
      method: 'POST',
      body: { featured: !property.isFeatured },
      headers: (() => { 
        try { 
          const t = localStorage.getItem('token')
          return t ? { Authorization: `Bearer ${t}` } : undefined
        } catch { 
          return undefined
        } 
      })()
    })
    property.isFeatured = !property.isFeatured
  } catch (error) {
    console.error('Error toggling featured status:', error)
  }
}

const showAnalytics = (property: any) => {
  selectedProperty.value = property
  showAnalyticsDialog.value = true
}

const duplicateProperty = async (property: any) => {
  try {
    await $fetch(`/api/admin/properties/${property.id}/duplicate`, {
      method: 'POST',
      headers: (() => { 
        try { 
          const t = localStorage.getItem('token')
          return t ? { Authorization: `Bearer ${t}` } : undefined
        } catch { 
          return undefined
        } 
      })()
    })
    // Simple local update instead of full refresh
    console.log('Property duplicated successfully')
  } catch (error) {
    console.error('Error duplicating property:', error)
  }
}

const deleteProperty = async (property: any) => {
  if (!confirm('Are you sure you want to delete this property?')) return

  try {
    await $fetch(`/api/admin/properties/${property.id}`, {
      method: 'DELETE',
      headers: (() => { 
        try { 
          const t = localStorage.getItem('token')
          return t ? { Authorization: `Bearer ${t}` } : undefined
        } catch { 
          return undefined
        } 
      })()
    })
    // Remove from local array instead of full refresh
    properties.value = properties.value.filter(p => p.id !== property.id)
  } catch (error) {
    console.error('Error deleting property:', error)
  }
}

onMounted(() => {
  console.log('🏠 Admin Properties page mounted')
  applyFilters()
})

definePageMeta({
  layout: 'admin',
  middleware: ['admin']
})
</script>

<style scoped>
.property-image {
  position: relative;
}

.status-overlay {
  position: absolute;
  top: 8px;
  right: 8px;
}
</style>
