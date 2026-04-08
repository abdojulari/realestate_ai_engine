<template>
  <div class="admin-resources px-md-8 py-md-6">
    <v-container fluid>
      <v-row class="mb-10 align-center">
        <v-col cols="12" md="8">
          <div class="d-flex align-center mb-2">
            <div class="premium-accent-bar mr-4"></div>
            <span class="text-overline letter-spacing-2 text-gold">Lead capture</span>
          </div>
          <h1 class="display-serif text-h3 mb-1">Resource manager</h1>
          <p class="text-subtitle-1 text-medium-emphasis font-weight-light">
            Upload guides and checklists (PDF or images). Share a unique link—visitors enter their details before viewing or downloading.
          </p>
        </v-col>
        <v-col cols="12" md="4" class="text-md-right">
          <v-btn color="primary" class="premium-action-btn" prepend-icon="mdi-plus" @click="openCreate">
            Add resource
          </v-btn>
        </v-col>
      </v-row>

      <v-row v-if="loading">
        <v-col v-for="i in 3" :key="i" cols="12" md="4">
          <v-skeleton-loader type="card" class="rounded-xl" />
        </v-col>
      </v-row>

      <v-row v-else-if="items.length === 0" class="mb-10">
        <v-col cols="12">
          <v-card class="resource-card text-center pa-12" elevation="0">
            <v-icon size="64" color="grey-lighten-2" class="mb-4">mdi-folder-download-outline</v-icon>
            <h3 class="text-h5 font-weight-bold mb-2">No resources yet</h3>
            <p class="text-medium-emphasis mb-6">
              Add your first homeowner guide or checklist. Each resource gets its own shareable URL and a lead form gate.
            </p>
            <v-btn color="primary" class="premium-action-btn" prepend-icon="mdi-plus" @click="openCreate">Add resource</v-btn>
          </v-card>
        </v-col>
      </v-row>

      <v-row v-else>
        <v-col v-for="row in items" :key="row.id" cols="12" md="4">
          <v-card class="resource-card" elevation="0">
            <v-card-text class="pa-6">
              <div class="d-flex align-center mb-4">
                <div class="icon-orb">
                  <v-icon>{{ mimeIcon(row.mimeType) }}</v-icon>
                </div>
                <v-spacer />
                <v-chip :color="row.published ? 'success' : 'grey'" size="small" variant="tonal">
                  {{ row.published ? 'Published' : 'Draft' }}
                </v-chip>
              </div>

              <h3 class="text-h6 font-weight-bold mb-1">{{ row.title }}</h3>
              <p class="text-caption text-medium-emphasis mb-2 text-truncate-2">{{ row.description || 'No description' }}</p>
              <p class="text-caption text-disabled mb-4">{{ formatBytes(row.fileSize) }} · {{ row.originalFileName }}</p>

              <div class="d-flex align-center mb-4">
                <v-icon size="16" class="mr-1 text-medium-emphasis">mdi-account-group</v-icon>
                <span class="text-body-2 font-weight-bold mr-4">{{ row.leadCount }}</span>
                <span class="text-caption text-medium-emphasis">leads</span>
              </div>

              <div class="link-box mb-4">
                <code class="link-url">{{ getResourceUrl(row.publicSlug) }}</code>
                <v-btn icon="mdi-content-copy" size="x-small" variant="text" @click="copyLink(row.publicSlug)" />
              </div>

              <div class="d-flex flex-wrap ga-2">
                <v-btn size="small" variant="tonal" color="primary" prepend-icon="mdi-open-in-new" :href="getResourceUrl(row.publicSlug)" target="_blank">
                  Open
                </v-btn>
                <v-btn size="small" variant="tonal" prepend-icon="mdi-account-multiple" @click="openLeads(row)">
                  Leads
                </v-btn>
                <v-btn size="small" variant="tonal" prepend-icon="mdi-pencil" @click="openEdit(row)">
                  Edit
                </v-btn>
                <v-btn size="small" variant="tonal" prepend-icon="mdi-refresh" @click="regenerateSlug(row)">
                  New link
                </v-btn>
                <v-btn size="small" variant="text" color="error" icon="mdi-delete" @click="remove(row)" />
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <v-dialog v-model="showCreate" max-width="560" persistent>
      <v-card class="rounded-xl">
        <v-card-title class="d-flex align-center pt-6 px-6">
          <v-icon class="mr-2" color="primary">mdi-upload</v-icon>
          Add resource
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="closeCreate" />
        </v-card-title>
        <v-card-text class="px-6 pb-2">
          <v-text-field v-model="create.title" label="Title" variant="outlined" density="compact" class="mb-3" />
          <v-textarea v-model="create.description" label="Description (public)" variant="outlined" density="compact" rows="2" class="mb-3" />
          <v-textarea v-model="create.thankYouMessage" label="Thank-you message (after form)" variant="outlined" density="compact" rows="2" class="mb-3" />
          <v-switch v-model="create.published" label="Published (visible on site & share link)" color="primary" class="mb-2" />
          <v-file-input
            v-model="create.file"
            label="File (PDF, JPG, PNG)"
            variant="outlined"
            density="compact"
            prepend-icon="mdi-paperclip"
            show-size
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          />
          <p class="text-caption text-medium-emphasis">Max 25MB. Files are stored securely and only served after the visitor submits the form.</p>
        </v-card-text>
        <v-card-actions class="px-6 pb-6">
          <v-spacer />
          <v-btn variant="text" @click="closeCreate">Cancel</v-btn>
          <v-btn color="primary" variant="flat" class="premium-action-btn px-8" :loading="saving" :disabled="!create.title.trim()" @click="submitCreate">
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showEdit" max-width="520" persistent>
      <v-card class="rounded-xl">
        <v-card-title class="d-flex align-center pt-6 px-6">
          <v-icon class="mr-2" color="primary">mdi-pencil</v-icon>
          Edit resource
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="showEdit = false" />
        </v-card-title>
        <v-card-text class="px-6 pb-2">
          <v-text-field v-model="edit.title" label="Title" variant="outlined" density="compact" class="mb-3" />
          <v-textarea v-model="edit.description" label="Description" variant="outlined" density="compact" rows="2" class="mb-3" />
          <v-textarea v-model="edit.thankYouMessage" label="Thank-you message" variant="outlined" density="compact" rows="2" class="mb-3" />
          <v-switch v-model="edit.published" label="Published" color="primary" />
        </v-card-text>
        <v-card-actions class="px-6 pb-6">
          <v-spacer />
          <v-btn variant="text" @click="showEdit = false">Cancel</v-btn>
          <v-btn color="primary" variant="flat" :loading="saving" @click="saveEdit">Update</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showLeads" max-width="720">
      <v-card>
        <v-card-title class="d-flex align-center">
          Leads — {{ leadsResource?.title }}
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" @click="showLeads = false" />
        </v-card-title>
        <v-card-text>
          <v-progress-linear v-if="leadsLoading" indeterminate class="mb-4" />
          <v-table v-else-if="leads.length" density="compact">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in leads" :key="l.id">
                <td>{{ l.firstName }} {{ l.lastName }}</td>
                <td>{{ l.email }}</td>
                <td>{{ l.phone }}</td>
                <td>{{ formatDate(l.createdAt) }}</td>
              </tr>
            </tbody>
          </v-table>
          <p v-else class="text-medium-emphasis">No leads yet for this resource.</p>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="copied" :timeout="2000" color="success">Link copied</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface ResourceRow {
  id: number
  title: string
  description: string | null
  publicSlug: string
  mimeType: string
  fileSize: number
  originalFileName: string
  published: boolean
  thankYouMessage: string | null
  leadCount?: number
}

const items = ref<ResourceRow[]>([])
const loading = ref(false)
const saving = ref(false)
const showCreate = ref(false)
const showEdit = ref(false)
const editingId = ref<number | null>(null)
const showLeads = ref(false)
const leadsResource = ref<ResourceRow | null>(null)
const leads = ref<any[]>([])
const leadsLoading = ref(false)
const copied = ref(false)

const create = ref({
  title: '',
  description: '',
  thankYouMessage: 'Thank you! Your download is ready below.',
  published: true,
  file: null as File[] | File | null,
})

const edit = ref({
  title: '',
  description: '',
  thankYouMessage: '',
  published: false,
})

function getAuthHeaders(): Record<string, string> {
  if (import.meta.client) {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }
  return {}
}

function getResourceUrl(slug: string) {
  if (import.meta.client) {
    return `${window.location.origin}/resources/r/${slug}`
  }
  return `/resources/r/${slug}`
}

function mimeIcon(mime: string) {
  if (mime?.includes('pdf')) return 'mdi-file-pdf-box'
  if (mime?.startsWith('image/')) return 'mdi-file-image-outline'
  return 'mdi-file-document-outline'
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

async function load() {
  loading.value = true
  try {
    items.value = (await $fetch('/api/admin/resources', { headers: getAuthHeaders() })) as ResourceRow[]
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  create.value = {
    title: '',
    description: '',
    thankYouMessage: 'Thank you! Your download is ready below.',
    published: true,
    file: null,
  }
  showCreate.value = true
}

function closeCreate() {
  showCreate.value = false
}

async function submitCreate() {
  const f = create.value.file
  const file = Array.isArray(f) ? f[0] : f
  if (!file) {
    alert('Please choose a file.')
    return
  }
  saving.value = true
  try {
    const fd = new FormData()
    fd.append('title', create.value.title.trim())
    fd.append('description', create.value.description.trim())
    fd.append('thankYouMessage', create.value.thankYouMessage.trim())
    fd.append('published', create.value.published ? 'true' : 'false')
    fd.append('file', file)
    await $fetch('/api/admin/resources', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: fd,
    })
    closeCreate()
    await load()
  } catch (e) {
    console.error(e)
  } finally {
    saving.value = false
  }
}

function openEdit(row: ResourceRow) {
  editingId.value = row.id
  edit.value = {
    title: row.title,
    description: row.description || '',
    thankYouMessage: row.thankYouMessage || 'Thank you! Your download is ready below.',
    published: row.published,
  }
  showEdit.value = true
}

async function saveEdit() {
  if (!editingId.value) return
  saving.value = true
  try {
    await $fetch(`/api/admin/resources/${editingId.value}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: {
        title: edit.value.title,
        description: edit.value.description,
        thankYouMessage: edit.value.thankYouMessage,
        published: edit.value.published,
      },
    })
    showEdit.value = false
    await load()
  } catch (e) {
    console.error(e)
  } finally {
    saving.value = false
  }
}

async function openLeads(row: ResourceRow) {
  leadsResource.value = row
  showLeads.value = true
  leadsLoading.value = true
  leads.value = []
  try {
    leads.value = await $fetch(`/api/admin/resources/${row.id}/leads`, { headers: getAuthHeaders() })
  } catch (e) {
    console.error(e)
  } finally {
    leadsLoading.value = false
  }
}

async function regenerateSlug(row: ResourceRow) {
  if (!confirm('Generate a new public URL? Old shared links will stop working.')) return
  try {
    await $fetch(`/api/admin/resources/${row.id}/regenerate-slug`, {
      method: 'POST',
      headers: getAuthHeaders(),
    })
    await load()
  } catch (e) {
    console.error(e)
  }
}

async function remove(row: ResourceRow) {
  if (!confirm(`Delete “${row.title}”? Leads captured for this resource will be removed.`)) return
  try {
    await $fetch(`/api/admin/resources/${row.id}`, { method: 'DELETE', headers: getAuthHeaders() })
    await load()
  } catch (e) {
    console.error(e)
  }
}

async function copyLink(slug: string) {
  try {
    await navigator.clipboard.writeText(getResourceUrl(slug))
    copied.value = true
  } catch {
    /* ignore */
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleString()
}

onMounted(load)

definePageMeta({ layout: 'admin', middleware: ['admin'] })
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;600;700&display=swap');

.admin-resources {
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
.letter-spacing-2 {
  letter-spacing: 2px;
}
.premium-accent-bar {
  width: 40px;
  height: 4px;
  background: #8c734b;
  border-radius: 2px;
}
.premium-action-btn {
  border-radius: 12px !important;
  text-transform: none !important;
  font-weight: 700 !important;
}

.resource-card {
  border-radius: 20px !important;
  border: 1px solid rgba(0, 0, 0, 0.05) !important;
  background: white !important;
  transition: transform 0.25s ease;
}
.resource-card:hover {
  transform: translateY(-3px);
  border-color: #8c734b !important;
}

.icon-orb {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(140, 115, 75, 0.12);
  color: #8c734b;
}

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
  font-size: 11px;
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
</style>
