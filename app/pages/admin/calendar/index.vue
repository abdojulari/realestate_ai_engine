<template>
  <div class="admin-calendar px-md-8 py-md-6">
    <v-container fluid>
      <!-- Header -->
      <v-row class="mb-10 align-center">
        <v-col cols="12" md="6">
          <div class="d-flex align-center mb-2">
            <v-btn icon="mdi-arrow-left" variant="text" size="small" class="mr-2" to="/admin" />
            <div class="premium-accent-bar mr-4"></div>
            <span class="text-overline letter-spacing-2 text-gold">Productivity</span>
          </div>
          <h1 class="display-serif text-h3 mb-1">Activity Planner</h1>
          <p class="text-subtitle-1 text-medium-emphasis font-weight-light">
            Calendar, tasks, booking management & scheduling
          </p>
        </v-col>
        <v-col cols="12" md="6" class="text-md-right">
          <v-btn color="primary" class="premium-action-btn mr-2" prepend-icon="mdi-plus" @click="openEventDialog()">
            New Event
          </v-btn>
          <v-btn variant="tonal" class="premium-action-btn" prepend-icon="mdi-clock" @click="showSlotsDialog = true">
            Manage Slots
          </v-btn>
        </v-col>
      </v-row>

      <!-- Calendar Controls -->
      <v-row class="mb-6">
        <v-col cols="12">
          <v-card class="calendar-controls" elevation="0">
            <v-card-text class="pa-4">
              <div class="d-flex align-center flex-wrap ga-3">
                <v-btn icon variant="text" @click="navigateMonth(-1)"><v-icon>mdi-chevron-left</v-icon></v-btn>
                <span class="display-serif text-h5 mx-2">{{ currentMonthLabel }}</span>
                <v-btn icon variant="text" @click="navigateMonth(1)"><v-icon>mdi-chevron-right</v-icon></v-btn>
                <v-btn variant="tonal" size="small" @click="goToToday" class="ml-2">Today</v-btn>
                <v-spacer />
                <v-btn-toggle v-model="viewMode" mandatory density="compact" variant="outlined" class="rounded-lg">
                  <v-btn value="month" size="small">Month</v-btn>
                  <v-btn value="week" size="small">Week</v-btn>
                  <v-btn value="list" size="small">List</v-btn>
                </v-btn-toggle>
                <v-spacer />
                <div class="d-flex ga-2 flex-wrap">
                  <v-chip v-for="filter in eventTypeFilters" :key="filter.value"
                    :variant="activeFilters.includes(filter.value) ? 'flat' : 'outlined'"
                    :color="filter.color" size="small"
                    @click="toggleFilter(filter.value)"
                  >
                    {{ filter.label }}
                  </v-chip>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Calendar Grid (Month View) -->
      <v-row v-if="viewMode === 'month'" class="mb-6">
        <v-col cols="12">
          <v-card class="calendar-card" elevation="0">
            <v-card-text class="pa-0">
              <!-- Day Headers -->
              <div class="calendar-grid">
                <div v-for="day in weekDays" :key="day" class="calendar-header-cell">
                  {{ day }}
                </div>
                <!-- Calendar Days -->
                <div
                  v-for="(day, idx) in calendarDays"
                  :key="idx"
                  :class="['calendar-day-cell', {
                    'today': day.isToday,
                    'other-month': !day.isCurrentMonth,
                    'has-events': day.events.length > 0
                  }]"
                  @click="selectDay(day)"
                >
                  <div class="day-number" :class="{ 'today-number': day.isToday }">{{ day.date }}</div>
                  <div class="day-events">
                    <div
                      v-for="ev in day.events.slice(0, 3)"
                      :key="ev.id"
                      class="event-dot"
                      :style="{ backgroundColor: ev.color || '#2196F3' }"
                      @click.stop="editEvent(ev)"
                    >
                      <span class="event-dot-text">{{ ev.title }}</span>
                    </div>
                    <div v-if="day.events.length > 3" class="text-caption text-medium-emphasis">
                      +{{ day.events.length - 3 }} more
                    </div>
                  </div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- List View -->
      <v-row v-if="viewMode === 'list'" class="mb-6">
        <v-col cols="12">
          <v-card class="list-card" elevation="0">
            <v-card-text class="pa-0">
              <v-list bg-color="transparent">
                <template v-for="(group, date) in groupedEvents" :key="date">
                  <v-list-subheader class="font-weight-bold px-6">{{ date }}</v-list-subheader>
                  <v-list-item
                    v-for="ev in group"
                    :key="ev.id"
                    class="px-6 py-3 list-item-hover"
                    @click="editEvent(ev)"
                  >
                    <template #prepend>
                      <div class="event-indicator mr-4" :style="{ backgroundColor: ev.color || '#2196F3' }"></div>
                    </template>
                    <v-list-item-title class="font-weight-bold">{{ ev.title }}</v-list-item-title>
                    <v-list-item-subtitle>
                      {{ formatTime(ev.startTime) }}{{ ev.endTime ? ' - ' + formatTime(ev.endTime) : '' }}
                      <span v-if="ev.location" class="ml-2"><v-icon size="x-small">mdi-map-marker</v-icon> {{ ev.location }}</span>
                    </v-list-item-subtitle>
                    <template #append>
                      <v-chip :color="getTypeColor(ev.type)" size="x-small" class="text-uppercase">{{ ev.type }}</v-chip>
                    </template>
                  </v-list-item>
                  <v-divider class="opacity-10" />
                </template>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Upcoming Bookings -->
      <v-row class="mb-6">
        <v-col cols="12" md="6">
          <v-card class="bookings-card" elevation="0">
            <v-card-title class="pa-6 d-flex align-center">
              <span class="display-serif text-h5">Upcoming Bookings</span>
              <v-spacer />
              <v-chip size="small" color="success">{{ upcomingBookings.length }}</v-chip>
            </v-card-title>
            <v-divider class="opacity-10" />
            <v-card-text class="pa-0" style="max-height: 400px; overflow-y: auto;">
              <v-list bg-color="transparent">
                <v-list-item v-for="booking in upcomingBookings" :key="booking.id" class="px-6 py-3">
                  <template #prepend>
                    <v-avatar :color="booking.status === 'confirmed' ? 'success' : 'warning'" size="40">
                      <v-icon color="white" size="20">mdi-calendar-check</v-icon>
                    </v-avatar>
                  </template>
                  <v-list-item-title class="font-weight-bold">{{ booking.clientName }}</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ formatDateTime(booking.dateTime) }} - {{ booking.type }}
                  </v-list-item-subtitle>
                  <template #append>
                    <v-btn-group density="compact" variant="text">
                      <v-btn size="x-small" icon @click="updateBookingStatus(booking.id, 'completed')">
                        <v-icon color="success">mdi-check</v-icon>
                      </v-btn>
                      <v-btn size="x-small" icon @click="updateBookingStatus(booking.id, 'cancelled')">
                        <v-icon color="error">mdi-close</v-icon>
                      </v-btn>
                    </v-btn-group>
                  </template>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Tasks -->
        <v-col cols="12" md="6">
          <v-card class="tasks-card" elevation="0">
            <v-card-title class="pa-6 d-flex align-center">
              <span class="display-serif text-h5">Tasks & Reminders</span>
            </v-card-title>
            <v-divider class="opacity-10" />
            <v-card-text class="pa-0" style="max-height: 400px; overflow-y: auto;">
              <v-list bg-color="transparent">
                <v-list-item v-for="task in tasks" :key="task.id" class="px-6 py-3">
                  <template #prepend>
                    <v-checkbox
                      :model-value="task.status === 'completed'"
                      hide-details
                      density="compact"
                      @update:model-value="toggleTaskComplete(task)"
                    />
                  </template>
                  <v-list-item-title :class="{ 'text-decoration-line-through text-medium-emphasis': task.status === 'completed' }">
                    {{ task.title }}
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    <v-chip :color="getPriorityColor(task.priority)" size="x-small" class="mr-1">{{ task.priority }}</v-chip>
                    {{ formatDate(task.startTime) }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Event Dialog -->
      <v-dialog v-model="showEventDialog" max-width="600" persistent>
        <v-card class="rounded-xl">
          <v-card-title class="pa-6 d-flex align-center">
            <span class="display-serif text-h6">{{ editingEvent ? 'Edit Event' : 'New Event' }}</span>
            <v-spacer />
            <v-btn icon variant="text" @click="showEventDialog = false"><v-icon>mdi-close</v-icon></v-btn>
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-6">
            <v-row>
              <v-col cols="12">
                <v-text-field v-model="eventForm.title" label="Title" variant="outlined" required />
              </v-col>
              <v-col cols="12" md="6">
                <v-select v-model="eventForm.type" :items="eventTypes" label="Type" variant="outlined" />
              </v-col>
              <v-col cols="12" md="6">
                <v-select v-model="eventForm.priority" :items="['low', 'normal', 'high', 'urgent']" label="Priority" variant="outlined" />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="eventForm.startTime" label="Start" type="datetime-local" variant="outlined" />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="eventForm.endTime" label="End" type="datetime-local" variant="outlined" />
              </v-col>
              <v-col cols="12">
                <v-text-field v-model="eventForm.location" label="Location" variant="outlined" prepend-inner-icon="mdi-map-marker" />
              </v-col>
              <v-col cols="12">
                <v-textarea v-model="eventForm.description" label="Description" variant="outlined" rows="3" />
              </v-col>
              <v-col cols="12">
                <v-checkbox v-model="eventForm.allDay" label="All day event" hide-details />
              </v-col>
            </v-row>
          </v-card-text>
          <v-divider />
          <v-card-actions class="pa-6">
            <v-btn v-if="editingEvent" color="error" variant="text" @click="deleteEvent">Delete</v-btn>
            <v-spacer />
            <v-btn variant="text" @click="showEventDialog = false">Cancel</v-btn>
            <v-btn color="primary" @click="saveEvent" :loading="savingEvent">
              {{ editingEvent ? 'Update' : 'Create' }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Booking Slots Dialog -->
      <v-dialog v-model="showSlotsDialog" max-width="700" persistent scrollable>
        <v-card class="rounded-xl">
          <v-card-title class="pa-6 d-flex align-center">
            <span class="display-serif text-h6">Booking Availability</span>
            <v-spacer />
            <v-btn icon variant="text" @click="showSlotsDialog = false"><v-icon>mdi-close</v-icon></v-btn>
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-6">
            <div class="text-body-2 text-medium-emphasis mb-4">
              Configure when clients can book viewings and consultations
            </div>
            <v-row>
              <v-col v-for="day in weekDaysFull" :key="day.value" cols="12">
                <v-card elevation="0" class="pa-3 mb-2 rounded-lg" style="border: 1px solid rgba(0,0,0,0.08);">
                  <div class="d-flex align-center">
                    <span class="font-weight-bold" style="width: 100px;">{{ day.label }}</span>
                    <v-chip
                      v-for="slot in getSlotsByDay(day.value)"
                      :key="slot.id"
                      size="small"
                      class="mr-2"
                      closable
                      @click:close="removeSlot(slot.id)"
                    >
                      {{ slot.startTime }} - {{ slot.endTime }}
                    </v-chip>
                    <v-spacer />
                    <v-btn size="small" variant="tonal" prepend-icon="mdi-plus" @click="addSlotForDay(day.value)">
                      Add
                    </v-btn>
                  </div>
                </v-card>
              </v-col>
            </v-row>

            <!-- Add Slot Form -->
            <v-row v-if="addingSlotDay !== null" class="mt-4">
              <v-col cols="12">
                <v-card elevation="0" class="pa-4 rounded-lg" color="grey-lighten-5">
                  <div class="text-subtitle-2 mb-3">Add slot for {{ weekDaysFull.find(d => d.value === addingSlotDay)?.label }}</div>
                  <v-row>
                    <v-col cols="4">
                      <v-text-field v-model="slotForm.startTime" label="Start" type="time" variant="outlined" density="compact" />
                    </v-col>
                    <v-col cols="4">
                      <v-text-field v-model="slotForm.endTime" label="End" type="time" variant="outlined" density="compact" />
                    </v-col>
                    <v-col cols="4">
                      <v-select v-model="slotForm.duration" :items="[15, 30, 45, 60]" label="Duration (min)" variant="outlined" density="compact" />
                    </v-col>
                    <v-col cols="12" class="text-right">
                      <v-btn variant="text" @click="addingSlotDay = null" class="mr-2">Cancel</v-btn>
                      <v-btn color="primary" size="small" @click="createSlot" :loading="creatingSlot">Create</v-btn>
                    </v-col>
                  </v-row>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-dialog>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const getAuthHeaders = (): Record<string, string> => {
  if (process.client) {
    const token = localStorage.getItem('token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }
  return {}
}

const events = ref<any[]>([])
const bookings = ref<any[]>([])
const slots = ref<any[]>([])
const viewMode = ref('month')
const currentDate = ref(new Date())
const showEventDialog = ref(false)
const showSlotsDialog = ref(false)
const editingEvent = ref<any>(null)
const savingEvent = ref(false)
const creatingSlot = ref(false)
const addingSlotDay = ref<number | null>(null)
const activeFilters = ref<string[]>([])

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const weekDaysFull = [
  { value: 1, label: 'Monday' }, { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' }, { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' }, { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
]
const eventTypes = ['task', 'meeting', 'showing', 'open_house', 'reminder', 'personal']
const eventTypeFilters = [
  { label: 'Tasks', value: 'task', color: 'blue' },
  { label: 'Meetings', value: 'meeting', color: 'purple' },
  { label: 'Showings', value: 'showing', color: 'green' },
  { label: 'Bookings', value: 'booking', color: 'teal' },
]

const eventForm = ref({
  title: '', description: '', type: 'task', startTime: '', endTime: '',
  allDay: false, location: '', priority: 'normal'
})

const slotForm = ref({ startTime: '09:00', endTime: '17:00', duration: 30 })

const currentMonthLabel = computed(() => {
  return currentDate.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = firstDay.getDay()
  const days: any[] = []
  const today = new Date()

  // Previous month days
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    days.push({ date: d.getDate(), fullDate: d, isCurrentMonth: false, isToday: false, events: getEventsForDate(d) })
  }

  // Current month days
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d)
    days.push({
      date: d,
      fullDate: date,
      isCurrentMonth: true,
      isToday: d === today.getDate() && month === today.getMonth() && year === today.getFullYear(),
      events: getEventsForDate(date)
    })
  }

  // Next month days to fill grid
  const remaining = 42 - days.length
  for (let d = 1; d <= remaining; d++) {
    const date = new Date(year, month + 1, d)
    days.push({ date: d, fullDate: date, isCurrentMonth: false, isToday: false, events: getEventsForDate(date) })
  }

  return days
})

const upcomingBookings = computed(() =>
  bookings.value
    .filter(b => b.status === 'confirmed' && new Date(b.dateTime) >= new Date())
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
    .slice(0, 10)
)

const tasks = computed(() =>
  events.value
    .filter(e => e.type === 'task' || e.type === 'reminder')
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
)

const groupedEvents = computed(() => {
  const groups: Record<string, any[]> = {}
  const filtered = activeFilters.value.length > 0
    ? events.value.filter(e => activeFilters.value.includes(e.type))
    : events.value

  filtered.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .forEach(e => {
      const date = new Date(e.startTime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
      if (!groups[date]) groups[date] = []
      groups[date].push(e)
    })
  return groups
})

function getEventsForDate(date: Date) {
  return events.value.filter(e => {
    const eDate = new Date(e.startTime)
    return eDate.getDate() === date.getDate() &&
           eDate.getMonth() === date.getMonth() &&
           eDate.getFullYear() === date.getFullYear()
  })
}

function navigateMonth(offset: number) {
  const d = new Date(currentDate.value)
  d.setMonth(d.getMonth() + offset)
  currentDate.value = d
  loadEvents()
}

function goToToday() {
  currentDate.value = new Date()
  loadEvents()
}

function selectDay(day: any) {
  const date = day.fullDate as Date
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T09:00`
  eventForm.value.startTime = iso
  eventForm.value.endTime = iso.replace('09:00', '10:00')
  showEventDialog.value = true
}

function openEventDialog() {
  editingEvent.value = null
  const now = new Date()
  const iso = now.toISOString().slice(0, 16)
  eventForm.value = { title: '', description: '', type: 'task', startTime: iso, endTime: '', allDay: false, location: '', priority: 'normal' }
  showEventDialog.value = true
}

function editEvent(ev: any) {
  if (ev.bookingId) return // Don't edit bookings this way
  editingEvent.value = ev
  eventForm.value = {
    title: ev.title,
    description: ev.description || '',
    type: ev.type,
    startTime: new Date(ev.startTime).toISOString().slice(0, 16),
    endTime: ev.endTime ? new Date(ev.endTime).toISOString().slice(0, 16) : '',
    allDay: ev.allDay || false,
    location: ev.location || '',
    priority: ev.priority || 'normal'
  }
  showEventDialog.value = true
}

function toggleFilter(type: string) {
  const idx = activeFilters.value.indexOf(type)
  if (idx >= 0) activeFilters.value.splice(idx, 1)
  else activeFilters.value.push(type)
}

const formatTime = (t: string) => new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const formatDateTime = (d: string) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

const getTypeColor = (type: string) => {
  const c: Record<string, string> = { task: 'blue', meeting: 'purple', showing: 'green', open_house: 'orange', reminder: 'red', personal: 'grey', booking: 'teal' }
  return c[type] || 'primary'
}

const getPriorityColor = (p: string) => {
  const c: Record<string, string> = { low: 'grey', normal: 'blue', high: 'orange', urgent: 'red' }
  return c[p] || 'blue'
}

function getSlotsByDay(day: number) {
  return slots.value.filter(s => s.dayOfWeek === day)
}

function addSlotForDay(day: number) {
  addingSlotDay.value = day
  slotForm.value = { startTime: '09:00', endTime: '17:00', duration: 30 }
}

async function loadEvents() {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const start = new Date(year, month - 1, 1).toISOString()
  const end = new Date(year, month + 2, 0).toISOString()

  try {
    const res = await $fetch(`/api/admin/calendar?start=${start}&end=${end}`, { headers: getAuthHeaders() }) as any
    events.value = res.events || []
  } catch (e) {
    console.error('Error loading events:', e)
  }
}

async function loadBookings() {
  try {
    const res = await $fetch('/api/admin/bookings?status=confirmed', { headers: getAuthHeaders() }) as any
    bookings.value = res.bookings || []
  } catch (e) {
    console.error('Error loading bookings:', e)
  }
}

async function loadSlots() {
  try {
    const res = await $fetch('/api/admin/bookings/slots', { headers: getAuthHeaders() }) as any
    slots.value = res.slots || []
  } catch (e) {
    console.error('Error loading slots:', e)
  }
}

async function saveEvent() {
  if (!eventForm.value.title || !eventForm.value.startTime) return
  savingEvent.value = true
  try {
    if (editingEvent.value) {
      await $fetch(`/api/admin/calendar/${editingEvent.value.id}`, {
        method: 'PUT', headers: getAuthHeaders(), body: eventForm.value
      })
    } else {
      await $fetch('/api/admin/calendar', {
        method: 'POST', headers: getAuthHeaders(), body: eventForm.value
      })
    }
    showEventDialog.value = false
    await loadEvents()
  } finally {
    savingEvent.value = false
  }
}

async function deleteEvent() {
  if (!editingEvent.value) return
  await $fetch(`/api/admin/calendar/${editingEvent.value.id}`, {
    method: 'DELETE', headers: getAuthHeaders()
  })
  showEventDialog.value = false
  await loadEvents()
}

async function toggleTaskComplete(task: any) {
  const newStatus = task.status === 'completed' ? 'scheduled' : 'completed'
  await $fetch(`/api/admin/calendar/${task.id}`, {
    method: 'PUT', headers: getAuthHeaders(), body: { status: newStatus }
  })
  await loadEvents()
}

async function updateBookingStatus(id: number, status: string) {
  await $fetch(`/api/admin/bookings/${id}`, {
    method: 'PUT', headers: getAuthHeaders(), body: { status }
  })
  await loadBookings()
  await loadEvents()
}

async function createSlot() {
  if (addingSlotDay.value === null) return
  creatingSlot.value = true
  try {
    await $fetch('/api/admin/bookings/slots', {
      method: 'POST', headers: getAuthHeaders(),
      body: { dayOfWeek: addingSlotDay.value, ...slotForm.value }
    })
    addingSlotDay.value = null
    await loadSlots()
  } finally {
    creatingSlot.value = false
  }
}

async function removeSlot(id: number) {
  // For now, just reload; proper delete endpoint needed
  await loadSlots()
}

onMounted(() => {
  loadEvents()
  loadBookings()
  loadSlots()
})

definePageMeta({ layout: 'admin', middleware: ['admin'] })
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;600;700&display=swap');

.admin-calendar {
  background-color: #fcfcfb;
  font-family: 'Inter', sans-serif;
  min-height: 100vh;
}
.display-serif { font-family: 'Playfair Display', serif; }
.text-gold { color: #8c734b; }
.letter-spacing-2 { letter-spacing: 2px; }
.premium-accent-bar { width: 40px; height: 4px; background: #8c734b; border-radius: 2px; }
.premium-action-btn { border-radius: 12px !important; text-transform: none !important; font-weight: 700 !important; }

.calendar-controls, .calendar-card, .list-card, .bookings-card, .tasks-card {
  border-radius: 20px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  background: white !important;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.calendar-header-cell {
  padding: 12px;
  text-align: center;
  font-weight: 700;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #8c734b;
  border-bottom: 1px solid rgba(0,0,0,0.05);
}

.calendar-day-cell {
  min-height: 100px;
  padding: 8px;
  border: 1px solid rgba(0,0,0,0.03);
  cursor: pointer;
  transition: background 0.2s ease;
}
.calendar-day-cell:hover { background: #f9f9f9; }
.calendar-day-cell.other-month { opacity: 0.4; }
.calendar-day-cell.today { background: rgba(140, 115, 75, 0.05); }

.day-number {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
}
.today-number {
  background: #8c734b;
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.event-dot {
  border-radius: 4px;
  padding: 2px 6px;
  margin-bottom: 2px;
  font-size: 11px;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

.event-indicator {
  width: 4px;
  height: 36px;
  border-radius: 2px;
}

.list-item-hover:hover { background: #f9f9f9; }
</style>
