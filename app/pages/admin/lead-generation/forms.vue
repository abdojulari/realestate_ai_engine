<template>
  <div class="admin-leads px-md-8 py-md-6">
    <v-container fluid>
      <!-- Header -->
      <v-row class="mb-10 align-center">
        <v-col cols="12" md="8">
          <div class="d-flex align-center mb-2">
            <v-btn icon="mdi-arrow-left" variant="text" size="small" class="mr-2" to="/admin/lead-generation" />
            <div class="premium-accent-bar mr-4"></div>
            <span class="text-overline letter-spacing-2 text-gold">Lead Capture</span>
          </div>
          <h1 class="display-serif text-h3 mb-1">Lead Capture Forms</h1>
          <p class="text-subtitle-1 text-medium-emphasis font-weight-light">
            Create shareable links to capture leads from social media, email campaigns, and beyond
          </p>
        </v-col>
        <v-col cols="12" md="4" class="text-md-right">
          <v-btn color="primary" class="premium-action-btn" prepend-icon="mdi-plus" @click="showCreate = true">
            Create Form
          </v-btn>
        </v-col>
      </v-row>

      <!-- Loading -->
      <v-row v-if="loading">
        <v-col v-for="i in 3" :key="i" cols="12" md="4">
          <v-skeleton-loader type="card" class="rounded-xl" />
        </v-col>
      </v-row>

      <!-- Empty state -->
      <v-row v-else-if="forms.length === 0" class="mb-10">
        <v-col cols="12">
          <v-card class="form-card text-center pa-12" elevation="0">
            <v-icon size="64" color="grey-lighten-2" class="mb-4">mdi-link-plus</v-icon>
            <h3 class="text-h5 font-weight-bold mb-2">No capture forms yet</h3>
            <p class="text-medium-emphasis mb-6">Create your first lead capture form and share the link on social media to start collecting leads automatically.</p>
            <v-btn color="primary" class="premium-action-btn" prepend-icon="mdi-plus" @click="showCreate = true">Create Your First Form</v-btn>
          </v-card>
        </v-col>
      </v-row>

      <!-- Form cards -->
      <v-row v-else>
        <v-col v-for="form in forms" :key="form.id" cols="12" md="4">
          <v-card class="form-card" elevation="0">
            <v-card-text class="pa-6">
              <div class="d-flex align-center mb-4">
                <div class="icon-orb" :style="{ background: form.brandColor + '15', color: form.brandColor }">
                  <v-icon>mdi-file-document-edit</v-icon>
                </div>
                <v-spacer />
                <v-chip :color="form.status === 'active' ? 'success' : 'grey'" size="small" variant="tonal">
                  {{ form.status === 'active' ? 'Active' : 'Paused' }}
                </v-chip>
              </div>

              <h3 class="text-h6 font-weight-bold mb-1">{{ form.title }}</h3>
              <p class="text-caption text-medium-emphasis mb-4 text-truncate-2">{{ form.description || 'No description' }}</p>

              <div class="d-flex align-center mb-4">
                <v-icon size="16" class="mr-1 text-medium-emphasis">mdi-account-group</v-icon>
                <span class="text-body-2 font-weight-bold mr-4">{{ form.submissions }}</span>
                <span class="text-caption text-medium-emphasis">submissions</span>
                <v-spacer />
                <span class="text-caption text-medium-emphasis">{{ formatDate(form.createdAt) }}</span>
              </div>

              <!-- Link -->
              <div class="link-box mb-4">
                <code class="link-url">{{ getFormUrl(form.slug) }}</code>
                <v-btn icon="mdi-content-copy" size="x-small" variant="text" @click="copyLink(form.slug)" />
              </div>

              <!-- Actions -->
              <div class="d-flex ga-2">
                <v-btn size="small" variant="tonal" color="primary" prepend-icon="mdi-open-in-new" :href="getFormUrl(form.slug)" target="_blank" class="flex-grow-1">
                  Preview
                </v-btn>
                <v-btn size="small" variant="tonal" prepend-icon="mdi-pencil" @click="editForm(form)" class="flex-grow-1">
                  Edit
                </v-btn>
                <v-btn size="small" variant="text" color="error" icon="mdi-delete" @click="deleteForm(form.id)" />
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Create / Edit dialog -->
    <v-dialog v-model="showCreate" max-width="680" persistent>
      <v-card class="rounded-xl">
        <v-card-title class="d-flex align-center pt-6 px-6">
          <v-icon class="mr-2" color="primary">{{ editing ? 'mdi-pencil' : 'mdi-plus-circle' }}</v-icon>
          {{ editing ? 'Edit Form' : 'Create Lead Capture Form' }}
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="closeDialog" />
        </v-card-title>

        <v-card-text class="px-6 pb-2">
          <v-text-field v-model="formData.title" label="Form Title" variant="outlined" density="compact" placeholder="e.g. Free Home Valuation" class="mb-3" />
          <v-textarea v-model="formData.description" label="Description (shown to visitors)" variant="outlined" density="compact" rows="2" placeholder="Get a free market evaluation of your home..." class="mb-3" />

          <div class="text-overline text-medium-emphasis mb-2">Fields to Collect</div>
          <div class="d-flex flex-wrap ga-2 mb-4">
            <v-chip v-for="field in availableFields" :key="field.value" :color="isFieldSelected(field.value) ? 'primary' : 'default'" :variant="isFieldSelected(field.value) ? 'flat' : 'outlined'" @click="toggleField(field.value)" class="cursor-pointer">
              <v-icon start size="14">{{ field.icon }}</v-icon>
              {{ field.label }}
              <template v-if="field.required">
                <span class="text-caption ml-1">*</span>
              </template>
            </v-chip>
          </div>

          <v-textarea v-model="formData.disclaimerText" label="Disclaimer Text" variant="outlined" density="compact" rows="2" placeholder="By submitting this form, you consent to being contacted..." class="mb-3" />
          <v-textarea v-model="formData.privacyText" label="Privacy Notice" variant="outlined" density="compact" rows="2" placeholder="Your information is protected under PIPEDA..." class="mb-3" />
          <v-text-field v-model="formData.thankYouMessage" label="Thank You Message" variant="outlined" density="compact" placeholder="Thank you! We will be in touch shortly." class="mb-3" />

          <v-row dense>
            <v-col cols="6">
              <v-text-field v-model="formData.brandColor" label="Brand Color" variant="outlined" density="compact" prepend-inner-icon="mdi-palette">
                <template #append-inner>
                  <div :style="{ width: '20px', height: '20px', borderRadius: '4px', background: formData.brandColor }" />
                </template>
              </v-text-field>
            </v-col>
            <v-col cols="6" v-if="editing">
              <v-select v-model="formData.status" :items="['active', 'paused']" label="Status" variant="outlined" density="compact" />
            </v-col>
          </v-row>
        </v-card-text>

        <v-card-actions class="px-6 pb-6">
          <v-spacer />
          <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
          <v-btn color="primary" variant="flat" :loading="saving" @click="saveForm" class="premium-action-btn px-8">
            {{ editing ? 'Update' : 'Create Form' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Copy snackbar -->
    <v-snackbar v-model="copied" :timeout="2000" color="success">
      Link copied to clipboard!
    </v-snackbar>

    <v-snackbar v-model="feedback.show" :color="feedback.color" :timeout="4000" location="bottom right">
      <v-icon :icon="feedback.color === 'error' ? 'mdi-alert-circle' : 'mdi-check-circle'" class="mr-2" />
      {{ feedback.message }}
      <template #actions>
        <v-btn variant="text" @click="feedback.show = false">Dismiss</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'

// Snackbar feedback so form CRUD failures don't disappear into the console.
const feedback = reactive({
  show: false,
  color: 'success' as 'success' | 'error',
  message: '',
})
const notify = (message: string, color: 'success' | 'error' = 'success') => {
  feedback.message = message
  feedback.color = color
  feedback.show = true
}
const describeError = (e: any, fallback: string) =>
  e?.data?.statusMessage || e?.data?.message || e?.statusMessage || e?.message || fallback

const forms = ref<any[]>([])
const loading = ref(false)
const saving = ref(false)
const showCreate = ref(false)
const editing = ref<any>(null)
const copied = ref(false)

const formData = ref({
  title: '',
  description: '',
  fields: ['name', 'email', 'phone', 'message'],
  disclaimerText: 'By submitting this form, you consent to being contacted by our team regarding your real estate needs. Your information will be kept confidential.',
  privacyText: 'Your personal information is collected and handled in accordance with PIPEDA (Personal Information Protection and Electronic Documents Act).',
  thankYouMessage: 'Thank you! We will be in touch shortly.',
  brandColor: '#1976D2',
  status: 'active',
})

const availableFields = [
  { value: 'name', label: 'Full Name', icon: 'mdi-account', required: true },
  { value: 'email', label: 'Email', icon: 'mdi-email', required: true },
  { value: 'phone', label: 'Phone', icon: 'mdi-phone', required: false },
  { value: 'message', label: 'Message', icon: 'mdi-message-text', required: false },
  { value: 'address', label: 'Address', icon: 'mdi-map-marker', required: false },
  { value: 'budget', label: 'Budget Range', icon: 'mdi-currency-usd', required: false },
  { value: 'timeline', label: 'Timeline', icon: 'mdi-calendar', required: false },
  { value: 'propertyType', label: 'Property Type', icon: 'mdi-home', required: false },
]

function getAuthHeaders() {
  if (import.meta.client) {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }
  return {}
}

function getFormUrl(slug: string) {
  if (import.meta.client) {
    return `${window.location.origin}/lead/${slug}`
  }
  return `/lead/${slug}`
}

function isFieldSelected(field: string) {
  return formData.value.fields.includes(field)
}

function toggleField(field: string) {
  if (field === 'name' || field === 'email') return
  const idx = formData.value.fields.indexOf(field)
  if (idx >= 0) formData.value.fields.splice(idx, 1)
  else formData.value.fields.push(field)
}

async function loadForms() {
  loading.value = true
  try {
    forms.value = await $fetch('/api/admin/lead-generation/forms', { headers: getAuthHeaders() }) as any[]
  } catch (e) {
    console.error('Failed to load forms:', e)
    notify(describeError(e, 'Could not load lead-generation forms.'), 'error')
  } finally {
    loading.value = false
  }
}

async function saveForm() {
  saving.value = true
  try {
    if (editing.value) {
      await $fetch(`/api/admin/lead-generation/forms/${editing.value.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: formData.value,
      })
    } else {
      await $fetch('/api/admin/lead-generation/forms', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData.value,
      })
    }
    closeDialog()
    await loadForms()
    notify('Form saved.', 'success')
  } catch (e) {
    console.error('Failed to save form:', e)
    notify(describeError(e, 'Could not save the form.'), 'error')
  } finally {
    saving.value = false
  }
}

function editForm(form: any) {
  editing.value = form
  formData.value = {
    title: form.title,
    description: form.description || '',
    fields: Array.isArray(form.fields) ? [...form.fields] : ['name', 'email', 'phone', 'message'],
    disclaimerText: form.disclaimerText || '',
    privacyText: form.privacyText || '',
    thankYouMessage: form.thankYouMessage || '',
    brandColor: form.brandColor || '#1976D2',
    status: form.status || 'active',
  }
  showCreate.value = true
}

async function deleteForm(id: number) {
  if (!confirm('Delete this form? Existing submissions will remain in your leads.')) return
  try {
    await $fetch(`/api/admin/lead-generation/forms/${id}`, { method: 'DELETE', headers: getAuthHeaders() })
    await loadForms()
    notify('Form deleted.', 'success')
  } catch (e) {
    console.error('Failed to delete form:', e)
    notify(describeError(e, 'Could not delete this form.'), 'error')
  }
}

function closeDialog() {
  showCreate.value = false
  editing.value = null
  formData.value = {
    title: '', description: '', fields: ['name', 'email', 'phone', 'message'],
    disclaimerText: 'By submitting this form, you consent to being contacted by our team regarding your real estate needs. Your information will be kept confidential.',
    privacyText: 'Your personal information is collected and handled in accordance with PIPEDA (Personal Information Protection and Electronic Documents Act).',
    thankYouMessage: 'Thank you! We will be in touch shortly.',
    brandColor: '#1976D2', status: 'active',
  }
}

async function copyLink(slug: string) {
  try {
    await navigator.clipboard.writeText(getFormUrl(slug))
    copied.value = true
  } catch (e) {
    // Clipboard can fail in non-secure contexts (eg. http) or when the
    // browser denies the permission. Surface a hint instead of silently
    // doing nothing.
    console.warn('Clipboard write failed:', e)
    notify('Could not copy automatically — please copy the link manually.', 'error')
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
}

onMounted(loadForms)

definePageMeta({ layout: 'admin', middleware: ['admin'] })
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;600;700&display=swap');

.admin-leads { background-color: #fcfcfb; font-family: 'Inter', sans-serif; min-height: 100vh; }
.display-serif { font-family: 'Playfair Display', serif; }
.text-gold { color: #8c734b; }
.letter-spacing-2 { letter-spacing: 2px; }
.premium-accent-bar { width: 40px; height: 4px; background: #8c734b; border-radius: 2px; }
.premium-action-btn { border-radius: 12px !important; text-transform: none !important; font-weight: 700 !important; }

.form-card {
  border-radius: 20px !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
  background: white !important;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.form-card:hover { transform: translateY(-4px); border-color: #8c734b !important; }

.icon-orb { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }

.link-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f5f5f4;
  border-radius: 10px;
  padding: 8px 12px;
}
.link-url {
  flex: 1;
  font-size: 12px;
  color: #555;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: none;
}

.text-truncate-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cursor-pointer { cursor: pointer; }
</style>
