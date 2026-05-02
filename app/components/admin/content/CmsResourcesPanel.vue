<template>
  <v-card class="premium-card">
    <!-- Header -->
    <div class="p-8 border-b border-slate-100 d-flex align-center flex-wrap ga-3">
      <div class="icon-orb mr-4">
        <v-icon color="primary" size="24">mdi-bookshelf</v-icon>
      </div>
      <div class="flex-grow-1">
        <h2 class="text-h6 font-weight-bold mb-0">Homepage Resources</h2>
        <p class="text-caption text-slate-400 mb-0">
          WYSIWYG articles surfaced in your homepage carousel and at /learn/&lt;slug&gt;.
          The public site shows your top
          <strong>{{ summary.featuredCap }}</strong>
          featured + published resources.
        </p>
      </div>
      <v-chip
        v-if="resources.length > 0"
        :color="liveBadgeColor"
        variant="flat"
        size="small"
        class="font-weight-bold"
      >
        <v-icon size="14" start>mdi-eye-outline</v-icon>
        {{ summary.featuredLive }} / {{ summary.featuredCap }} live
      </v-chip>
      <v-btn
        color="primary"
        variant="flat"
        prepend-icon="mdi-plus"
        class="text-none"
        @click="openCreate"
      >
        New Resource
      </v-btn>
    </div>

    <v-card-text class="p-8">
      <v-alert
        v-if="liveError"
        type="error"
        variant="tonal"
        density="compact"
        closable
        class="mb-4"
        @click:close="liveError = ''"
      >
        {{ liveError }}
      </v-alert>

      <!-- Loading skeleton -->
      <div v-if="loading" class="text-center py-12">
        <v-progress-circular indeterminate color="primary" />
        <div class="text-caption text-medium-emphasis mt-3">Loading your resources…</div>
      </div>

      <!-- Empty state -->
      <div v-else-if="resources.length === 0" class="rp-empty">
        <v-icon size="48" color="grey-lighten-1">mdi-bookshelf</v-icon>
        <h3 class="text-h6 font-weight-bold mt-3 mb-2">No resources yet</h3>
        <p class="text-body-2 text-medium-emphasis mb-4">
          Create your first article — homebuying guides, mortgage tips, neighborhood
          deep-dives. Visitors give you their email to read the full piece.
        </p>
        <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" class="text-none" @click="openCreate">
          New Resource
        </v-btn>
      </div>

      <!-- List -->
      <div v-else class="rp-list">
        <article
          v-for="(item, index) in resources"
          :key="item.id"
          class="rp-item"
          :class="{ 'rp-item--draft': !item.published }"
          draggable="true"
          @dragstart="onDragStart(index, $event)"
          @dragover.prevent="onDragOver(index)"
          @dragleave="onDragLeave"
          @drop.prevent="onDrop(index)"
          @dragend="onDragEnd"
        >
          <!-- Drag handle -->
          <button
            type="button"
            class="rp-handle"
            title="Drag to reorder"
            aria-label="Drag to reorder"
          >
            <v-icon size="18" color="grey">mdi-drag-vertical</v-icon>
          </button>

          <!-- Cover thumb -->
          <div class="rp-thumb">
            <img v-if="item.coverImage" :src="item.coverImage" :alt="item.title" />
            <div v-else class="rp-thumb__placeholder">
              <v-icon color="grey-lighten-1">mdi-image-outline</v-icon>
            </div>
          </div>

          <!-- Body -->
          <div class="rp-body">
            <div class="d-flex align-center flex-wrap ga-2">
              <h3 class="rp-title">{{ item.title }}</h3>
              <v-chip
                v-if="item.category"
                size="x-small"
                color="grey-lighten-3"
                variant="flat"
                class="font-weight-bold"
              >
                {{ item.category }}
              </v-chip>
              <v-chip v-if="!item.published" size="x-small" color="warning" variant="tonal">
                Draft
              </v-chip>
              <v-chip v-if="item.featured && item.published" size="x-small" color="primary" variant="tonal">
                <v-icon size="12" start>mdi-star</v-icon>Featured
              </v-chip>
            </div>
            <div v-if="item.subtitle" class="rp-subtitle">{{ item.subtitle }}</div>
            <div v-if="item.excerpt" class="rp-excerpt">{{ truncate(item.excerpt, 160) }}</div>
            <div class="rp-meta">
              <span><v-icon size="12">mdi-link-variant</v-icon> /learn/{{ item.slug }}</span>
              <span><v-icon size="12">mdi-eye-outline</v-icon> {{ item.viewCount || 0 }} view{{ item.viewCount === 1 ? '' : 's' }}</span>
              <span><v-icon size="12">mdi-account-multiple-outline</v-icon> {{ item.leadCount || 0 }} lead{{ item.leadCount === 1 ? '' : 's' }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="rp-actions">
            <div class="rp-toggle" title="Featured on homepage">
              <span class="text-caption text-medium-emphasis mr-2">Featured</span>
              <v-switch
                :model-value="item.featured"
                color="primary"
                density="compact"
                hide-details
                inset
                @update:model-value="(v: any) => toggleFeatured(item, !!v)"
              />
            </div>
            <div class="rp-toggle" title="Published">
              <span class="text-caption text-medium-emphasis mr-2">Live</span>
              <v-switch
                :model-value="item.published"
                color="success"
                density="compact"
                hide-details
                inset
                @update:model-value="(v: any) => togglePublished(item, !!v)"
              />
            </div>
            <v-menu location="bottom end">
              <template #activator="{ props: a }">
                <v-btn icon="mdi-dots-vertical" variant="text" size="small" v-bind="a" />
              </template>
              <v-list density="compact">
                <v-list-item prepend-icon="mdi-pencil-outline" title="Edit" @click="openEdit(item)" />
                <v-list-item
                  prepend-icon="mdi-open-in-new"
                  title="Open public page"
                  :href="`/learn/${item.slug}`"
                  target="_blank"
                />
                <v-divider />
                <v-list-item
                  prepend-icon="mdi-delete-outline"
                  title="Delete"
                  base-color="error"
                  @click="confirmDelete(item)"
                />
              </v-list>
            </v-menu>
          </div>
        </article>
      </div>
    </v-card-text>

    <!-- Form dialog -->
    <CmsResourceFormDialog
      v-model="dialogOpen"
      :editing="!!editingItem"
      :saving="saving"
      :initial="editingItem"
      @cancel="onCancel"
      @save="onSave"
    />

    <!-- Delete confirm -->
    <v-dialog v-model="deleteDialog" max-width="420">
      <v-card rounded="xl">
        <v-card-title class="text-h6 font-weight-bold">Delete this resource?</v-card-title>
        <v-card-text>
          <strong>{{ pendingDelete?.title }}</strong> will be removed from your homepage and
          its detail page. Captured leads for this resource will also be deleted.
          This cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" class="text-none" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" class="text-none" :loading="deleting" @click="doDelete">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3500" location="top right">
      {{ snackbarText }}
      <template #actions>
        <v-btn icon="mdi-close" variant="text" @click="snackbar = false" />
      </template>
    </v-snackbar>
  </v-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
// @ts-ignore — auto-imported by Nuxt
import { api } from '~/utils/api'

interface ExternalLink { label: string; url: string }
interface Resource {
  id: number
  slug: string
  title: string
  subtitle: string | null
  excerpt: string | null
  body?: string
  coverImage: string | null
  sourceName: string | null
  sourceUrl: string | null
  externalLinks: ExternalLink[] | null
  category: string | null
  featured: boolean
  sortOrder: number
  published: boolean
  publishedAt: string | null
  viewCount: number
  unlockCount: number
  leadCount: number
  createdAt: string
  updatedAt: string
}

const resources = ref<Resource[]>([])
const summary = ref<{ total: number; featuredLive: number; featuredCap: number }>({
  total: 0,
  featuredLive: 0,
  featuredCap: 4,
})
const loading = ref(true)
const liveError = ref('')

const dialogOpen = ref(false)
const editingItem = ref<Partial<Resource> | null>(null)
const saving = ref(false)

const deleteDialog = ref(false)
const pendingDelete = ref<Resource | null>(null)
const deleting = ref(false)

const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref<'success' | 'error' | 'warning' | 'info'>('success')
function showSnackbar(text: string, color: 'success' | 'error' | 'warning' | 'info' = 'success') {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

// ── Load ───────────────────────────────────────────────────────────────
async function load() {
  loading.value = true
  liveError.value = ''
  try {
    const res: any = await api.get('/api/admin/resources-cms')
    resources.value = (res?.resources || []) as Resource[]
    summary.value = res?.summary || { total: resources.value.length, featuredLive: 0, featuredCap: 4 }
  } catch (e: any) {
    liveError.value = e?.data?.statusMessage || e?.statusMessage || 'Could not load resources.'
  } finally {
    loading.value = false
  }
}

const liveBadgeColor = computed(() => {
  return summary.value.featuredLive >= summary.value.featuredCap ? 'success' : 'warning'
})

// ── CRUD ───────────────────────────────────────────────────────────────
function openCreate() {
  editingItem.value = null
  dialogOpen.value = true
}
async function openEdit(item: Resource) {
  // Open immediately with what we have (better UX than a blocking spinner),
  // then fetch the full row in the background and merge `body` in. The
  // list endpoint deliberately omits `body` to keep the listing payload small.
  editingItem.value = { ...item, body: item.body || '' }
  dialogOpen.value = true
  try {
    const res: any = await api.get(`/api/admin/resources-cms/${item.id}`)
    if (res?.resource) {
      // Only update if the user hasn't already closed the dialog.
      if (dialogOpen.value && editingItem.value?.id === item.id) {
        editingItem.value = { ...editingItem.value, ...res.resource }
      }
    }
  } catch (e: any) {
    showSnackbar(
      e?.data?.statusMessage || 'Could not load the full resource. Some fields may be empty.',
      'warning',
    )
  }
}
function onCancel() {
  dialogOpen.value = false
  editingItem.value = null
}

async function onSave(payload: any) {
  saving.value = true
  try {
    if (editingItem.value && editingItem.value.id) {
      const res: any = await api.put(`/api/admin/resources-cms/${editingItem.value.id}`, payload)
      const updated = res?.resource as Resource | undefined
      if (updated) {
        const idx = resources.value.findIndex((r) => r.id === updated.id)
        if (idx !== -1) resources.value[idx] = { ...resources.value[idx], ...updated, leadCount: resources.value[idx]!.leadCount }
      }
      showSnackbar('Resource saved.')
    } else {
      const res: any = await api.post('/api/admin/resources-cms', payload)
      const created = res?.resource as Resource | undefined
      if (created) {
        resources.value.push({ ...created, leadCount: 0 })
      }
      showSnackbar('Resource created.')
    }
    dialogOpen.value = false
    editingItem.value = null
    recomputeSummary()
  } catch (e: any) {
    showSnackbar(e?.data?.statusMessage || e?.statusMessage || 'Could not save the resource.', 'error')
  } finally {
    saving.value = false
  }
}

function confirmDelete(item: Resource) {
  pendingDelete.value = item
  deleteDialog.value = true
}
async function doDelete() {
  if (!pendingDelete.value) return
  deleting.value = true
  try {
    await api.delete(`/api/admin/resources-cms/${pendingDelete.value.id}`)
    resources.value = resources.value.filter((r) => r.id !== pendingDelete.value!.id)
    showSnackbar('Resource deleted.')
    recomputeSummary()
  } catch (e: any) {
    showSnackbar(e?.data?.statusMessage || 'Could not delete the resource.', 'error')
  } finally {
    deleting.value = false
    deleteDialog.value = false
    pendingDelete.value = null
  }
}

async function toggleFeatured(item: Resource, next: boolean) {
  // Optimistic toggle — reverts on failure so the UI stays trustworthy.
  const prev = item.featured
  item.featured = next
  recomputeSummary()
  try {
    await api.put(`/api/admin/resources-cms/${item.id}`, { featured: next })
  } catch (e: any) {
    item.featured = prev
    recomputeSummary()
    showSnackbar(e?.data?.statusMessage || 'Could not update featured state.', 'error')
  }
}
async function togglePublished(item: Resource, next: boolean) {
  const prev = item.published
  item.published = next
  if (next && !item.publishedAt) item.publishedAt = new Date().toISOString()
  recomputeSummary()
  try {
    await api.put(`/api/admin/resources-cms/${item.id}`, { published: next })
  } catch (e: any) {
    item.published = prev
    recomputeSummary()
    showSnackbar(e?.data?.statusMessage || 'Could not update published state.', 'error')
  }
}

function recomputeSummary() {
  summary.value = {
    total: resources.value.length,
    featuredLive: resources.value.filter((r) => r.featured && r.published).length,
    featuredCap: summary.value.featuredCap || 4,
  }
}

// ── Drag & drop reorder ────────────────────────────────────────────────
const draggingIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

function onDragStart(index: number, e: DragEvent) {
  draggingIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    // Required for Firefox to actually start the drag.
    e.dataTransfer.setData('text/plain', String(index))
  }
}
function onDragOver(index: number) {
  if (draggingIndex.value === null) return
  dragOverIndex.value = index
}
function onDragLeave() {
  dragOverIndex.value = null
}
async function onDrop(targetIndex: number) {
  const from = draggingIndex.value
  draggingIndex.value = null
  dragOverIndex.value = null
  if (from === null || from === targetIndex) return
  const next = [...resources.value]
  const [moved] = next.splice(from, 1)
  if (!moved) return
  next.splice(targetIndex, 0, moved)
  resources.value = next
  // Persist the new order.
  try {
    await api.post('/api/admin/resources-cms/reorder', { ids: next.map((r) => r.id) })
  } catch (e: any) {
    showSnackbar(e?.data?.statusMessage || 'Could not save the new order.', 'error')
    // Reload to recover the source-of-truth order on failure.
    await load()
  }
}
function onDragEnd() {
  draggingIndex.value = null
  dragOverIndex.value = null
}

// ── Helpers ────────────────────────────────────────────────────────────
function truncate(s: string, n: number) {
  if (!s) return ''
  return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s
}

onMounted(load)
</script>

<style scoped>
.rp-empty {
  text-align: center;
  padding: 48px 16px;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  background: #f8fafc;
}
.rp-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.rp-item {
  display: grid;
  grid-template-columns: 28px 96px 1fr auto;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}
.rp-item:hover {
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
}
.rp-item--draft {
  background: #fffaf0;
  border-color: #fde68a;
}
.rp-handle {
  background: transparent;
  border: 0;
  cursor: grab;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
}
.rp-handle:active {
  cursor: grabbing;
}
.rp-thumb {
  width: 96px;
  height: 64px;
  border-radius: 8px;
  overflow: hidden;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rp-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.rp-thumb__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
.rp-body {
  min-width: 0;
}
.rp-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}
.rp-subtitle {
  font-size: 0.8rem;
  color: #475569;
  margin-top: 2px;
}
.rp-excerpt {
  font-size: 0.8rem;
  color: #64748b;
  margin-top: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.rp-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 6px;
  font-size: 0.7rem;
  color: #94a3b8;
}
.rp-meta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.rp-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.rp-toggle {
  display: flex;
  align-items: center;
}

@media (max-width: 768px) {
  .rp-item {
    grid-template-columns: 28px 1fr;
    grid-template-areas:
      'handle thumb'
      'body body'
      'actions actions';
    gap: 10px;
  }
  .rp-handle { grid-area: handle; }
  .rp-thumb { grid-area: thumb; width: 100%; height: 96px; }
  .rp-body { grid-area: body; }
  .rp-actions { grid-area: actions; justify-content: space-between; flex-wrap: wrap; }
}
</style>
