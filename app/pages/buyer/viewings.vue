<template>
  <div class="viewing-requests">
    <v-container>
      <!-- Page Header -->
      <v-row class="mb-6">
        <v-col>
          <h1 class="text-h4">My Viewings</h1>
          <p class="text-subtitle-1">Manage your property viewing appointments</p>
        </v-col>
      </v-row>

      <!-- Filter Tabs -->
      <v-row class="mb-6">
        <v-col cols="12">
          <v-tabs
            v-model="activeTab"
            color="primary"
          >
            <v-tab value="upcoming">Upcoming</v-tab>
            <v-tab value="past">Past</v-tab>
            <v-tab value="cancelled">Cancelled</v-tab>
          </v-tabs>
        </v-col>
      </v-row>

      <!-- Viewing Requests List -->
      <v-row>
        <v-col cols="12">
          <v-card v-if="filteredRequests.length > 0">
            <v-table>
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Date & Time</th>
                  <th>Agent</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="request in filteredRequests"
                  :key="request.id"
                >
                  <td>
                    <div class="d-flex align-center">
                      <v-img
                        :src="request.property.images[0]"
                        width="80"
                        height="60"
                        cover
                        class="rounded mr-3"
                      />
                      <div>
                        <div class="font-weight-medium">
                          {{ request.property.title }}
                        </div>
                        <div class="text-caption text-grey">
                          {{ request.property.address }}
                        </div>
                        <div class="text-caption">
                          ${{ request.property.price.toLocaleString() }}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>{{ formatDate(request.dateTime) }}</div>
                    <div class="text-caption">{{ formatTime(request.dateTime) }}</div>
                  </td>
                  <td>
                    <div>{{ request.property.agent?.name || (request.property.agent.firstName + ' ' + request.property.agent.lastName) }}</div>
                    <div class="text-caption">{{ request.property.agent?.agency || '' }}</div>
                  </td>
                  <td>
                    <v-chip
                      :color="getStatusColor(request.status)"
                      size="small"
                    >
                      {{ request.status }}
                    </v-chip>
                  </td>
                  <td>
                    <div class="d-flex gap-2">
                      <v-btn
                        icon="mdi-eye"
                        variant="text"
                        size="small"
                        :to="`/property/${request.property.id}`"
                        v-tooltip="'View Property'"
                      />
                      <v-btn
                        v-if="request.status === 'pending'"
                        icon="mdi-calendar-edit"
                        variant="text"
                        size="small"
                        color="primary"
                        @click="rescheduleViewing(request)"
                        v-tooltip="'Reschedule'"
                      />
                      <v-btn
                        v-if="request.status === 'pending'"
                        icon="mdi-close"
                        variant="text"
                        size="small"
                        color="error"
                        @click="cancelViewing(request)"
                        v-tooltip="'Cancel'"
                      />
                      <v-btn
                        v-if="request.status === 'approved'"
                        icon="mdi-map-marker"
                        variant="text"
                        size="small"
                        color="success"
                        @click="getDirections(request.property)"
                        v-tooltip="'Get Directions'"
                      />
                      <v-btn
                        v-if="request.status === 'approved'"
                        icon="mdi-phone"
                        variant="text"
                        size="small"
                        color="primary"
                        @click="request.property.agent && contactAgent(request.property.agent as any)"
                        v-tooltip="'Contact Agent'"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-card>

          <!-- Empty State -->
          <div
            v-else
            class="text-center py-12"
          >
            <v-icon
              icon="mdi-calendar-blank"
              size="64"
              color="grey-lighten-1"
              class="mb-4"
            />
            <div class="text-h5 text-grey-darken-1">No viewing requests</div>
            <div class="text-body-1 text-grey-darken-1 mb-4">
              {{ getEmptyStateMessage() }}
            </div>
            <v-btn
              v-if="!hasAnyRequests"
              color="primary"
              to="/map-search"
            >
              Browse Properties
            </v-btn>
          </div>
        </v-col>
      </v-row>
    </v-container>

    <!-- Reschedule Dialog -->
    <v-dialog
      v-model="showRescheduleDialog"
      max-width="500"
    >
      <v-card v-if="selectedRequest">
        <v-card-title>Reschedule Viewing</v-card-title>
        <v-card-text>
          <div class="mb-4">
            <div class="font-weight-medium">{{ selectedRequest.property.title }}</div>
            <div class="text-caption">{{ selectedRequest.property.address }}</div>
          </div>

          <v-form @submit.prevent="handleReschedule">
            <v-date-picker
              v-model="rescheduleDate"
              class="mb-4"
              :min="minDate"
            />

            <v-select
              v-model="rescheduleTime"
              :items="availableTimes"
              label="Select Time"
              required
            />

            <v-card-actions>
              <v-spacer />
              <v-btn
                variant="text"
                @click="showRescheduleDialog = false"
              >
                Cancel
              </v-btn>
              <v-btn
                color="primary"
                type="submit"
                :loading="submitting"
              >
                Reschedule
              </v-btn>
            </v-card-actions>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Cancel Dialog -->
    <v-dialog
      v-model="showCancelDialog"
      max-width="400"
    >
      <v-card>
        <v-card-title>Cancel Viewing</v-card-title>
        <v-card-text>
          Are you sure you want to cancel this viewing appointment?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="showCancelDialog = false"
          >
            No
          </v-btn>
          <v-btn
            color="error"
            @click="confirmCancel"
            :loading="submitting"
          >
            Yes, Cancel
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Contact Agent Dialog -->
    <v-dialog
      v-model="showContactDialog"
      max-width="400"
    >
      <v-card v-if="selectedAgent">
        <v-card-title>Contact Agent</v-card-title>
        <v-card-text>
          <div class="mb-4">
            <div class="font-weight-medium">{{ (selectedAgent as any).name || (selectedAgent?.firstName + ' ' + selectedAgent?.lastName) }}</div>
            <div class="text-caption">{{ (selectedAgent as any).agency || '' }}</div>
          </div>

          <v-list>
            <v-list-item
              prepend-icon="mdi-phone"
              :title="selectedAgent?.phone || ''"
              @click="selectedAgent?.phone && callAgent(selectedAgent.phone)"
            />
            <v-list-item
              prepend-icon="mdi-email"
              :title="selectedAgent.email"
              @click="emailAgent(selectedAgent.email)"
            />
          </v-list>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="showContactDialog = false"
          >
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Property } from '~/types'
// Remove this import as definePageMeta is auto-imported
import { propertyService } from '~/services/property.service'
import { formatDate, formatTime } from '../../../utils/formatters'

// State
const activeTab = ref('upcoming')
const viewingRequests = ref<ViewingRequest[]>([])
const showRescheduleDialog = ref(false)
const showCancelDialog = ref(false)
const showContactDialog = ref(false)
import type { ViewingRequest } from '~/types'

const selectedRequest = ref<ViewingRequest | null>(null)
import type { User } from '~/types'

const selectedAgent = ref<User | null>(null)
const rescheduleDate = ref('')
const rescheduleTime = ref('')
const submitting = ref(false)

// Computed
const filteredRequests = computed(() => {
  const now = new Date()
  
  return viewingRequests.value.filter((request: ViewingRequest) => {
    const viewingDate = new Date(request.dateTime)
    
    switch (activeTab.value) {
      case 'upcoming':
        return viewingDate > now && request.status !== 'cancelled'
      case 'past':
        return viewingDate < now && request.status !== 'cancelled'
      case 'cancelled':
        return request.status === 'cancelled'
      default:
        return true
    }
  })
})

const hasAnyRequests = computed(() => viewingRequests.value.length > 0)

const minDate = computed(() => {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return date.toISOString().split('T')[0]
})

const availableTimes = [
  { title: '9:00 AM', value: '09:00' },
  { title: '10:00 AM', value: '10:00' },
  { title: '11:00 AM', value: '11:00' },
  { title: '12:00 PM', value: '12:00' },
  { title: '1:00 PM', value: '13:00' },
  { title: '2:00 PM', value: '14:00' },
  { title: '3:00 PM', value: '15:00' },
  { title: '4:00 PM', value: '16:00' },
  { title: '5:00 PM', value: '17:00' }
]

// Methods
const loadViewings = async () => {
  try {
    const response = await propertyService.getMyViewingRequests()
    viewingRequests.value = response
  } catch (error) {
    console.error('Error loading viewing requests:', error)
    // Show error message
  }
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: 'warning',
    approved: 'success',
    rejected: 'error',
    completed: 'info',
    cancelled: 'grey'
  }
  return colors[status] || 'grey'
}

const getEmptyStateMessage = () => {
  switch (activeTab.value) {
    case 'upcoming':
      return hasAnyRequests.value
        ? 'You have no upcoming viewing appointments'
        : 'Schedule a viewing when you find a property you like'
    case 'past':
      return 'You have no past viewing appointments'
    case 'cancelled':
      return 'You have no cancelled viewing appointments'
    default:
      return 'No viewing appointments found'
  }
}

const rescheduleViewing = (request: ViewingRequest) => {
  selectedRequest.value = request
  rescheduleDate.value = new Date().toISOString().split('T')[0]
  rescheduleTime.value = '09:00'
  showRescheduleDialog.value = true
}

const handleReschedule = async () => {
  if (!selectedRequest.value) return
  
  submitting.value = true
  try {
    const dateTime = `${rescheduleDate.value}T${rescheduleTime.value}:00`
    await propertyService.updateViewingRequest(selectedRequest.value.id, { status: 'pending', dateTime } as any)
    await loadViewings()
    showRescheduleDialog.value = false
  } catch (error) {
    console.error('Error rescheduling viewing:', error)
    // Show error message
  } finally {
    submitting.value = false
  }
}

const cancelViewing = (request: ViewingRequest) => {
  selectedRequest.value = request
  showCancelDialog.value = true
}

const confirmCancel = async () => {
  submitting.value = true
  try {
    await propertyService.updateViewingRequest(selectedRequest.value!.id, { status: 'cancelled' } as any)
    await loadViewings()
    showCancelDialog.value = false
  } catch (error) {
    console.error('Error cancelling viewing:', error)
    // Show error message
  } finally {
    submitting.value = false
  }
}

const getDirections = (property: Property) => {
  const address = encodeURIComponent(property.address)
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${address}`, '_blank')
}

const contactAgent = (agent: User) => {
  selectedAgent.value = agent
  showContactDialog.value = true
}

const callAgent = (phone: string) => {
  window.location.href = `tel:${phone}`
}

const emailAgent = (email: string) => {
  window.location.href = `mailto:${email}`
}

// Load initial data
onMounted(() => {
  loadViewings()
})

// Define page meta
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})
</script>

<style scoped>
.viewing-requests {
  min-height: calc(100vh - 64px);
}

.gap-2 {
  gap: 8px;
}
</style>
