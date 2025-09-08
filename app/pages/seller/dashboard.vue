<template>
  <div class="seller-dashboard">
    <v-container>
      <!-- Page Header -->
      <v-row class="mb-6">
        <v-col>
          <div class="d-flex align-center">
            <div>
              <h1 class="text-h4">Seller Dashboard</h1>
              <p class="text-subtitle-1">Manage your property listings and inquiries</p>
            </div>
            <v-spacer />
            <v-btn
              color="primary"
              prepend-icon="mdi-plus"
              to="/seller/list-property"
            >
              List New Property
            </v-btn>
          </div>
        </v-col>
      </v-row>

      <!-- Stats Cards -->
      <v-row class="mb-6">
        <v-col cols="12" md="3">
          <v-card>
            <v-card-text class="text-center">
              <div class="text-h3 mb-2">{{ stats.activeListings }}</div>
              <div class="text-subtitle-1">Active Listings</div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3">
          <v-card>
            <v-card-text class="text-center">
              <div class="text-h3 mb-2">{{ stats.totalViews }}</div>
              <div class="text-subtitle-1">Total Views</div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3">
          <v-card>
            <v-card-text class="text-center">
              <div class="text-h3 mb-2">{{ stats.pendingInquiries }}</div>
              <div class="text-subtitle-1">Pending Inquiries</div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3">
          <v-card>
            <v-card-text class="text-center">
              <div class="text-h3 mb-2">{{ stats.scheduledViewings }}</div>
              <div class="text-subtitle-1">Scheduled Viewings</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Property Listings -->
      <v-row class="mb-6">
        <v-col cols="12">
          <v-card>
            <v-card-title class="d-flex align-center">
              My Listings
              <v-spacer />
              <v-text-field
                v-model="search"
                append-inner-icon="mdi-magnify"
                label="Search listings"
                density="compact"
                hide-details
                class="max-w-xs"
              />
            </v-card-title>

            <v-card-text>
              <v-table>
                <thead>
                  <tr>
                    <th>Property</th>
                    <th>Status</th>
                    <th>Price</th>
                    <th>Views</th>
                    <th>Inquiries</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="property in filteredProperties"
                    :key="property.id"
                  >
                    <td>
                      <div class="d-flex align-center">
                        <v-img
                          :src="property.images[0]"
                          width="80"
                          height="60"
                          cover
                          class="rounded mr-3"
                        />
                        <div>
                          <div class="font-weight-medium">
                            {{ property.title }}
                          </div>
                          <div class="text-caption text-grey">
                            {{ property.address }}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <v-chip
                        :color="getStatusColor(property.status)"
                        size="small"
                      >
                        {{ property.status }}
                      </v-chip>
                    </td>
                    <td>${{ property.price.toLocaleString() }}</td>
                    <td>{{ property.views }}</td>
                    <td>{{ property.inquiries }}</td>
                    <td>
                      <div class="d-flex gap-2">
                        <v-btn
                          icon="mdi-eye"
                          variant="text"
                          size="small"
                          :to="`/property/${property.id}`"
                          v-tooltip="'View Property'"
                        />
                        <v-btn
                          icon="mdi-pencil"
                          variant="text"
                          size="small"
                          :to="`/seller/edit-property/${property.id}`"
                          v-tooltip="'Edit Property'"
                        />
                        <v-btn
                          icon="mdi-chart-line"
                          variant="text"
                          size="small"
                          @click="viewAnalytics(property)"
                          v-tooltip="'View Analytics'"
                        />
                        <v-menu>
                          <template v-slot:activator="{ props }">
                            <v-btn
                              icon="mdi-dots-vertical"
                              variant="text"
                              size="small"
                              v-bind="props"
                            />
                          </template>
                          <v-list>
                            <v-list-item
                              v-if="property.status === 'active'"
                              @click="updateStatus(property, 'pending')"
                              title="Mark as Pending"
                            />
                            <v-list-item
                              v-if="property.status === 'active'"
                              @click="updateStatus(property, 'sold')"
                              title="Mark as Sold"
                            />
                            <v-list-item
                              v-if="property.status !== 'active'"
                              @click="updateStatus(property, 'active')"
                              title="Mark as Active"
                            />
                            <v-list-item
                              @click="duplicateListing(property)"
                              title="Duplicate Listing"
                            />
                            <v-list-item
                              @click="deleteListing(property)"
                              title="Delete"
                              color="error"
                            />
                          </v-list>
                        </v-menu>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </v-table>

              <!-- Empty State -->
              <div
                v-if="properties.length === 0"
                class="text-center py-8"
              >
                <v-icon
                  icon="mdi-home"
                  size="64"
                  color="grey-lighten-1"
                  class="mb-4"
                />
                <div class="text-h6 text-grey-darken-1">No properties listed</div>
                <div class="text-body-1 text-grey-darken-1 mb-4">
                  Start by listing your first property
                </div>
                <v-btn
                  color="primary"
                  to="/seller/list-property"
                >
                  List a Property
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Recent Inquiries -->
      <v-row>
        <v-col cols="12">
          <v-card>
            <v-card-title>Recent Inquiries</v-card-title>

            <v-card-text>
              <v-table>
                <thead>
                  <tr>
                    <th>Property</th>
                    <th>Inquirer</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="inquiry in recentInquiries"
                    :key="inquiry.id"
                  >
                    <td>
                      <div class="d-flex align-center">
                        <v-img
                          :src="inquiry.property.images[0]"
                          width="60"
                          height="40"
                          cover
                          class="rounded mr-2"
                        />
                        <div class="text-caption">
                          {{ inquiry.property.title }}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>{{ inquiry.user.firstName }} {{ inquiry.user.lastName }}</div>
                      <div class="text-caption">{{ inquiry.user.email }}</div>
                    </td>
                    <td>{{ inquiry.type }}</td>
                    <td>{{ formatDate(inquiry.createdAt) }}</td>
                    <td>
                      <v-chip
                        :color="getInquiryStatusColor(inquiry.status)"
                        size="small"
                      >
                        {{ inquiry.status }}
                      </v-chip>
                    </td>
                    <td>
                      <div class="d-flex gap-2">
                        <v-btn
                          icon="mdi-eye"
                          variant="text"
                          size="small"
                          @click="viewInquiry(inquiry)"
                          v-tooltip="'View Details'"
                        />
                        <v-btn
                          icon="mdi-email"
                          variant="text"
                          size="small"
                          @click="respondToInquiry(inquiry)"
                          v-tooltip="'Respond'"
                        />
                        <v-btn
                          v-if="inquiry.type === 'viewing'"
                          icon="mdi-calendar"
                          variant="text"
                          size="small"
                          @click="scheduleViewing(inquiry)"
                          v-tooltip="'Schedule Viewing'"
                        />
                      </div>
                    </td>
                  </tr>
                </tbody>
              </v-table>

              <!-- Empty State -->
              <div
                v-if="recentInquiries.length === 0"
                class="text-center py-8"
              >
                <v-icon
                  icon="mdi-email-outline"
                  size="64"
                  color="grey-lighten-1"
                  class="mb-4"
                />
                <div class="text-h6 text-grey-darken-1">No recent inquiries</div>
                <div class="text-body-1 text-grey-darken-1">
                  Inquiries from potential buyers will appear here
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Analytics Dialog -->
    <v-dialog
      v-model="showAnalyticsDialog"
      max-width="800"
    >
      <v-card v-if="selectedProperty">
        <v-card-title>Property Analytics</v-card-title>
        <v-card-text>
          <!-- Analytics content -->
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Inquiry Dialog -->
    <v-dialog
      v-model="showInquiryDialog"
      max-width="600"
    >
      <v-card v-if="selectedInquiry">
        <v-card-title>Inquiry Details</v-card-title>
        <v-card-text>
          <!-- Inquiry details -->
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog
      v-model="showDeleteDialog"
      max-width="400"
    >
      <v-card>
        <v-card-title>Delete Listing</v-card-title>
        <v-card-text>
          Are you sure you want to delete this property listing? This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="showDeleteDialog = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="error"
            @click="confirmDelete"
            :loading="deleting"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Property, PropertyInquiry } from '~/types'
import { propertyService } from '~/services/property.service'
import { formatDate } from '../../../utils/formatters'
import { useProperty } from '~/composables/useProperty'

// State
const search = ref('')
const properties = ref<Property[]>([])
const recentInquiries = ref<PropertyInquiry[]>([])
const showAnalyticsDialog = ref(false)
const showInquiryDialog = ref(false)
const showDeleteDialog = ref(false)
const selectedProperty = ref<Property | null>(null)
const selectedInquiry = ref<PropertyInquiry | null>(null)
const propertyToDelete = ref<Property | null>(null)
const deleting = ref(false)

// Mock stats
const stats = ref({
  activeListings: 0,
  totalViews: 0,
  pendingInquiries: 0,
  scheduledViewings: 0
})

// Computed
const filteredProperties = computed<Property[]>(() => {
  if (!search.value) return properties.value

  const searchTerm = search.value.toLowerCase()
  return properties.value.filter((property: Property) => {
    return (
      property.title.toLowerCase().includes(searchTerm) ||
      property.address.toLowerCase().includes(searchTerm)
    )
  })
})

// Methods
const loadData = async () => {
  try {
    const [propertiesData, inquiriesData] = await Promise.all([
      propertyService.getMyListings(),
      propertyService.getMyInquiries()
    ])
    
    const { filterResidentialProperties } = await import('../../../utils/propertyFilters')
    properties.value = filterResidentialProperties(propertiesData)
    recentInquiries.value = inquiriesData

    // Update stats
    stats.value = {
      activeListings: propertiesData.filter((p: Property) => p.status === 'active').length,
      totalViews: propertiesData.reduce((sum: number, p: Property) => sum + (p.views || 0), 0),
      pendingInquiries: inquiriesData.filter((i: PropertyInquiry) => i.status === 'pending').length,
      scheduledViewings: inquiriesData.filter((i: PropertyInquiry) => i.type === 'viewing' && i.status === 'approved').length
    }
  } catch (error) {
    console.error('Error loading dashboard data:', error)
    // Show error message
  }
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    active: 'success',
    pending: 'warning',
    sold: 'info',
    inactive: 'grey'
  }
  return colors[status] || 'grey'
}

const getInquiryStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: 'warning',
    responded: 'success',
    scheduled: 'info',
    cancelled: 'error'
  }
  return colors[status] || 'grey'
}

const viewAnalytics = (property: any) => {
  selectedProperty.value = property
  showAnalyticsDialog.value = true
}

const viewInquiry = (inquiry: any) => {
  selectedInquiry.value = inquiry
  showInquiryDialog.value = true
}

const updateStatus = async (property: any, status: string) => {
  try {
    await propertyService.update(property.id, { status })
    property.status = status
  } catch (error) {
    console.error('Error updating status:', error)
    // Show error message
  }
}

const duplicateListing = async (property: any) => {
  try {
    const newProperty = await propertyService.create({
      ...property,
      title: `${property.title} (Copy)`,
      status: 'inactive'
    })
    properties.value.push(newProperty)
  } catch (error) {
    console.error('Error duplicating listing:', error)
    // Show error message
  }
}

const deleteListing = (property: any) => {
  propertyToDelete.value = property
  showDeleteDialog.value = true
}

const confirmDelete = async () => {
  if (!propertyToDelete.value) return

  deleting.value = true
  try {
    await propertyService.delete(propertyToDelete.value.id)
    properties.value = properties.value.filter(p => p.id !== propertyToDelete.value!.id)
    showDeleteDialog.value = false
    propertyToDelete.value = null
  } catch (error) {
    console.error('Error deleting property:', error)
    // Show error message
  } finally {
    deleting.value = false
  }
}

const respondToInquiry = (inquiry: any) => {
  // Implement response functionality
}

const scheduleViewing = (inquiry: any) => {
  // Implement viewing scheduling
}

// Load initial data
onMounted(() => {
  loadData()
})

// Define page meta
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})
</script>

<style scoped>
.seller-dashboard {
  min-height: calc(100vh - 64px);
}

.max-w-xs {
  max-width: 300px;
}

.gap-2 {
  gap: 8px;
}
</style>