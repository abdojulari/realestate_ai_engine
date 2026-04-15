<template>
  <div class="admin-flash-news px-md-8 py-md-6">
    <v-container fluid>
      <!-- Page Header -->
      <v-row class="mb-8 align-center">
        <v-col cols="12" md="6">
          <div class="d-flex align-center mb-2">
            <div class="premium-accent-bar mr-4"></div>
            <span class="text-overline letter-spacing-2 text-gold">Announcements</span>
          </div>
          <h1 class="display-serif text-h3 mb-1">Flash News</h1>
          <p class="text-subtitle-1 text-medium-emphasis font-weight-light">
            Create headlines that appear on your homepage banner
          </p>
        </v-col>
        <v-col cols="12" md="6" class="text-md-right">
          <v-btn
            color="primary"
            size="large"
            prepend-icon="mdi-plus"
            @click="openForm()"
          >
            New Flash News
          </v-btn>
        </v-col>
      </v-row>

      <!-- List -->
      <v-row>
        <v-col cols="12">
          <v-card elevation="0" rounded="lg" border>
            <v-data-table
              :headers="headers"
              :items="items"
              :loading="loading"
              :items-per-page="50"
              hover
              class="flash-news-table"
            >
              <template #item.headline="{ item }">
                <div class="d-flex align-center py-2">
                  <div>
                    <div class="font-weight-medium text-body-1">{{ item.headline }}</div>
                    <div v-if="item.ctaLabel" class="text-caption text-medium-emphasis mt-1">
                      <v-icon size="x-small" class="mr-1">mdi-link</v-icon>
                      {{ item.ctaLabel }}
                    </div>
                  </div>
                </div>
              </template>

              <template #item.published="{ item }">
                <v-chip
                  :color="item.published ? 'success' : 'default'"
                  size="small"
                  variant="tonal"
                >
                  {{ item.published ? 'Published' : 'Draft' }}
                </v-chip>
              </template>

              <template #item.schedule="{ item }">
                <div class="text-caption">
                  <div v-if="item.startsAt">
                    <v-icon size="x-small" class="mr-1">mdi-calendar-start</v-icon>
                    {{ formatDate(item.startsAt) }}
                  </div>
                  <div v-if="item.expiresAt">
                    <v-icon size="x-small" class="mr-1">mdi-calendar-end</v-icon>
                    {{ formatDate(item.expiresAt) }}
                  </div>
                  <span v-if="!item.startsAt && !item.expiresAt" class="text-medium-emphasis">Always</span>
                </div>
              </template>

              <template #item.sortOrder="{ item }">
                <v-chip size="small" variant="outlined">{{ item.sortOrder }}</v-chip>
              </template>

              <template #item.actions="{ item }">
                <div class="d-flex ga-1">
                  <v-btn
                    icon="mdi-pencil"
                    size="small"
                    variant="text"
                    @click="openForm(item)"
                  />
                  <v-btn
                    :icon="item.published ? 'mdi-eye-off' : 'mdi-eye'"
                    size="small"
                    variant="text"
                    :color="item.published ? 'warning' : 'success'"
                    @click="togglePublished(item)"
                  />
                  <v-btn
                    icon="mdi-delete"
                    size="small"
                    variant="text"
                    color="error"
                    @click="confirmDelete(item)"
                  />
                </div>
              </template>

              <template #no-data>
                <div class="text-center py-12">
                  <v-icon size="80" color="grey-lighten-2" class="mb-4">mdi-newspaper-variant-outline</v-icon>
                  <h3 class="text-h6 mb-2">No Flash News Yet</h3>
                  <p class="text-medium-emphasis mb-4">Create your first headline to display on the homepage banner</p>
                  <v-btn color="primary" prepend-icon="mdi-plus" @click="openForm()">
                    Create First Flash News
                  </v-btn>
                </div>
              </template>
            </v-data-table>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Create/Edit Dialog -->
    <v-dialog v-model="showForm" max-width="700" persistent>
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center pa-6 pb-4">
          <v-icon class="mr-3" color="primary">mdi-newspaper-variant</v-icon>
          <span class="text-h5">{{ editing ? 'Edit' : 'New' }} Flash News</span>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" @click="showForm = false" />
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-6">
          <v-form ref="formRef" @submit.prevent="save">
            <v-text-field
              v-model="form.headline"
              label="Headline *"
              variant="outlined"
              :rules="[v => !!v?.trim() || 'Headline is required']"
              counter="150"
              maxlength="150"
              class="mb-4"
              hint="Short, attention-grabbing headline shown in the banner"
              persistent-hint
            />

            <v-textarea
              v-model="form.content"
              label="Full Content *"
              variant="outlined"
              :rules="[v => !!v?.trim() || 'Content is required']"
              rows="6"
              class="mb-4"
              hint="Full article shown when visitors click to read more"
              persistent-hint
            />

            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.ctaLabel"
                  label="CTA Button Text"
                  variant="outlined"
                  placeholder="e.g. Learn More, Read Details"
                  hint="Optional button text on the banner"
                  persistent-hint
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.ctaUrl"
                  label="CTA Link (optional)"
                  variant="outlined"
                  placeholder="https://... or /page"
                  hint="External link. Leave empty to link to full content page."
                  persistent-hint
                />
              </v-col>
            </v-row>

            <v-row class="mt-2">
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model.number="form.sortOrder"
                  label="Sort Order"
                  variant="outlined"
                  type="number"
                  hint="Lower = shown first"
                  persistent-hint
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model="form.startsAt"
                  label="Starts At"
                  variant="outlined"
                  type="datetime-local"
                  hint="Optional schedule start"
                  persistent-hint
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model="form.expiresAt"
                  label="Expires At"
                  variant="outlined"
                  type="datetime-local"
                  hint="Optional expiry date"
                  persistent-hint
                />
              </v-col>
            </v-row>

            <v-switch
              v-model="form.published"
              label="Published"
              color="success"
              class="mt-4"
              hint="Only published items appear on the homepage"
              persistent-hint
            />
          </v-form>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-6 pt-4">
          <v-spacer />
          <v-btn variant="text" @click="showForm = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="saving"
            @click="save"
          >
            {{ editing ? 'Update' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation -->
    <v-dialog v-model="showDeleteConfirm" max-width="420">
      <v-card rounded="lg">
        <v-card-title class="pa-6 pb-2">
          <v-icon color="error" class="mr-2">mdi-alert-circle</v-icon>
          Delete Flash News
        </v-card-title>
        <v-card-text class="pa-6 pt-2">
          Are you sure you want to delete "<strong>{{ deleteTarget?.headline }}</strong>"?
          This action cannot be undone.
        </v-card-text>
        <v-card-actions class="pa-6 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="showDeleteConfirm = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" :loading="deleting" @click="deleteItem">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000" location="bottom right">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

const api = useApi()

const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const items = ref<any[]>([])
const showForm = ref(false)
const editing = ref(false)
const editId = ref<number | null>(null)
const formRef = ref<any>(null)
const showDeleteConfirm = ref(false)
const deleteTarget = ref<any>(null)

const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const form = ref({
  headline: '',
  content: '',
  ctaLabel: '',
  ctaUrl: '',
  sortOrder: 0,
  published: false,
  startsAt: '',
  expiresAt: '',
})

const headers = [
  { title: 'Headline', key: 'headline', sortable: true },
  { title: 'Status', key: 'published', width: '100px', sortable: true },
  { title: 'Schedule', key: 'schedule', width: '160px', sortable: false },
  { title: 'Order', key: 'sortOrder', width: '80px', sortable: true },
  { title: 'Actions', key: 'actions', width: '140px', sortable: false, align: 'end' as const },
]

function formatDate(d: string | null) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toLocalInput(d: string | null): string {
  if (!d) return ''
  const dt = new Date(d)
  const offset = dt.getTimezoneOffset()
  const local = new Date(dt.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

function notify(text: string, color = 'success') {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

async function fetchItems() {
  loading.value = true
  try {
    const data: any = await api.get('/admin/flash-news')
    items.value = data.items || []
  } catch (e) {
    console.error('Failed to fetch flash news:', e)
    notify('Failed to load flash news', 'error')
  } finally {
    loading.value = false
  }
}

function openForm(item?: any) {
  if (item) {
    editing.value = true
    editId.value = item.id
    form.value = {
      headline: item.headline,
      content: item.content,
      ctaLabel: item.ctaLabel || '',
      ctaUrl: item.ctaUrl || '',
      sortOrder: item.sortOrder,
      published: item.published,
      startsAt: toLocalInput(item.startsAt),
      expiresAt: toLocalInput(item.expiresAt),
    }
  } else {
    editing.value = false
    editId.value = null
    form.value = {
      headline: '',
      content: '',
      ctaLabel: '',
      ctaUrl: '',
      sortOrder: 0,
      published: false,
      startsAt: '',
      expiresAt: '',
    }
  }
  showForm.value = true
}

async function save() {
  const { valid } = await formRef.value?.validate()
  if (!valid) return

  saving.value = true
  try {
    const payload = {
      headline: form.value.headline,
      content: form.value.content,
      ctaLabel: form.value.ctaLabel || null,
      ctaUrl: form.value.ctaUrl || null,
      sortOrder: form.value.sortOrder,
      published: form.value.published,
      startsAt: form.value.startsAt || null,
      expiresAt: form.value.expiresAt || null,
    }

    if (editing.value && editId.value) {
      await api.put(`/admin/flash-news/${editId.value}`, payload)
      notify('Flash news updated')
    } else {
      await api.post('/admin/flash-news', payload)
      notify('Flash news created')
    }

    showForm.value = false
    await fetchItems()
  } catch (e: any) {
    notify(e?.data?.statusMessage || 'Failed to save', 'error')
  } finally {
    saving.value = false
  }
}

async function togglePublished(item: any) {
  try {
    await api.put(`/admin/flash-news/${item.id}`, { published: !item.published })
    notify(item.published ? 'Unpublished' : 'Published')
    await fetchItems()
  } catch {
    notify('Failed to update status', 'error')
  }
}

function confirmDelete(item: any) {
  deleteTarget.value = item
  showDeleteConfirm.value = true
}

async function deleteItem() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await api.del(`/admin/flash-news/${deleteTarget.value.id}`)
    notify('Flash news deleted')
    showDeleteConfirm.value = false
    await fetchItems()
  } catch {
    notify('Failed to delete', 'error')
  } finally {
    deleting.value = false
  }
}

onMounted(fetchItems)
</script>

<style scoped>
.admin-flash-news {
  min-height: 100vh;
}

.premium-accent-bar {
  width: 4px;
  height: 28px;
  background: linear-gradient(180deg, #C9A96E 0%, #8B7355 100%);
  border-radius: 2px;
}

.text-gold {
  color: #C9A96E !important;
}

.display-serif {
  font-family: 'Playfair Display', Georgia, serif;
}

.letter-spacing-2 {
  letter-spacing: 2px;
}
</style>
