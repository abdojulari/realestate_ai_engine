<template>
  <v-dialog
    :model-value="modelValue"
    max-width="900"
    scrollable
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="rf-dialog" rounded="xl">
      <v-card-title class="d-flex align-center px-6 py-4">
        <v-icon icon="mdi-text-box-edit-outline" class="mr-2" color="primary" />
        <span class="text-h6 font-weight-bold">
          {{ editing ? 'Edit Resource' : 'New Resource' }}
        </span>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" @click="$emit('cancel')" />
      </v-card-title>

      <v-divider />

      <v-card-text class="px-6 py-4 rf-body">
        <!-- Cover image -->
        <div class="text-overline font-weight-bold text-medium-emphasis mb-2">Cover image</div>
        <div class="rf-cover">
          <div v-if="form.coverImage" class="rf-cover__preview">
            <img :src="form.coverImage" alt="Cover preview" class="rf-cover__img" />
            <v-btn
              size="x-small"
              variant="text"
              color="error"
              icon="mdi-close-circle"
              class="rf-cover__remove"
              title="Remove cover image"
              @click="form.coverImage = ''"
            />
          </div>
          <div v-else class="rf-cover__empty">
            <v-icon size="32" color="grey">mdi-image-outline</v-icon>
            <div class="text-caption text-medium-emphasis">No cover image — optional but recommended for the carousel.</div>
          </div>
          <v-file-input
            v-model="coverFile"
            label="Upload cover image"
            accept="image/*"
            prepend-icon=""
            prepend-inner-icon="mdi-cloud-upload-outline"
            density="compact"
            variant="outlined"
            hide-details
            :loading="uploadingCover"
            class="mt-3"
            @update:model-value="onCoverPicked"
          />
        </div>

        <v-divider class="my-5" />

        <!-- Basics -->
        <v-row dense>
          <v-col cols="12" md="8">
            <v-text-field
              v-model="form.title"
              label="Title *"
              variant="outlined"
              density="compact"
              :error-messages="titleError"
              hide-details="auto"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="form.category"
              label="Category"
              hint="e.g. 'Buyer Guide', 'Mortgage'"
              persistent-hint
              variant="outlined"
              density="compact"
              hide-details="auto"
            />
          </v-col>
        </v-row>

        <v-row dense class="mt-3">
          <v-col cols="12">
            <v-text-field
              v-model="form.subtitle"
              label="Subtitle / tagline"
              variant="outlined"
              density="compact"
              hide-details
              counter="200"
              maxlength="200"
            />
          </v-col>
        </v-row>

        <v-row dense class="mt-3">
          <v-col cols="12">
            <v-textarea
              v-model="form.excerpt"
              label="Card teaser (shown on the homepage carousel)"
              variant="outlined"
              density="compact"
              rows="2"
              auto-grow
              counter="500"
              maxlength="500"
              hide-details="auto"
            />
          </v-col>
        </v-row>

        <v-divider class="my-5" />

        <!-- Body — WYSIWYG -->
        <div class="text-overline font-weight-bold text-medium-emphasis mb-2">
          Body (full article)
        </div>
        <p class="text-caption text-medium-emphasis mb-2">
          What visitors read after they unlock the resource. HTML is sanitized server-side
          before storage — scripts and unsafe tags are stripped automatically.
        </p>
        <ListingTemplatesRichTextDescriptionEditor v-model="form.body" />

        <v-divider class="my-5" />

        <!-- Source attribution -->
        <div class="text-overline font-weight-bold text-medium-emphasis mb-2">
          Source attribution (optional)
        </div>
        <v-row dense>
          <v-col cols="12" md="5">
            <v-text-field
              v-model="form.sourceName"
              label="Source name"
              hint="e.g. 'CMHC', 'Bank of Canada'"
              persistent-hint
              variant="outlined"
              density="compact"
              hide-details="auto"
            />
          </v-col>
          <v-col cols="12" md="7">
            <v-text-field
              v-model="form.sourceUrl"
              label="Source URL"
              placeholder="https://..."
              variant="outlined"
              density="compact"
              hide-details="auto"
              prepend-inner-icon="mdi-link-variant"
            />
          </v-col>
        </v-row>

        <v-divider class="my-5" />

        <!-- Related external links -->
        <div class="d-flex align-center mb-2">
          <div class="text-overline font-weight-bold text-medium-emphasis flex-grow-1">
            Related external links (optional)
          </div>
          <v-btn
            size="small"
            variant="text"
            prepend-icon="mdi-plus"
            class="text-none"
            @click="addLink"
          >
            Add link
          </v-btn>
        </div>
        <p class="text-caption text-medium-emphasis mb-3">
          Shown in a sidebar on the detail page. Use these for "further reading" or
          official resources you want to point visitors to.
        </p>
        <div v-if="form.externalLinks.length === 0" class="rf-empty-links">
          <v-icon color="grey">mdi-link-off</v-icon>
          <span class="text-caption text-medium-emphasis ml-2">No links yet.</span>
        </div>
        <div v-for="(link, i) in form.externalLinks" :key="i" class="rf-link-row">
          <v-text-field
            v-model="link.label"
            placeholder="Label (e.g. 'CMHC mortgage calculator')"
            density="compact"
            variant="outlined"
            hide-details
            class="flex-grow-1"
            counter="120"
            maxlength="120"
          />
          <v-text-field
            v-model="link.url"
            placeholder="https://..."
            density="compact"
            variant="outlined"
            hide-details
            class="flex-grow-1"
            prepend-inner-icon="mdi-link-variant"
          />
          <v-btn
            icon="mdi-delete-outline"
            size="small"
            variant="text"
            color="error"
            @click="removeLink(i)"
          />
        </div>

        <v-divider class="my-5" />

        <!-- Visibility / featured -->
        <v-row dense>
          <v-col cols="12" md="6">
            <v-card variant="outlined" class="pa-4 d-flex align-center">
              <div class="flex-grow-1">
                <div class="font-weight-bold">Featured on homepage</div>
                <div class="text-caption text-medium-emphasis">
                  Up to 4 featured + published resources show in the carousel,
                  ordered by your drag-to-reorder ranking.
                </div>
              </div>
              <v-switch v-model="form.featured" color="primary" hide-details inset density="compact" />
            </v-card>
          </v-col>
          <v-col cols="12" md="6">
            <v-card variant="outlined" class="pa-4 d-flex align-center">
              <div class="flex-grow-1">
                <div class="font-weight-bold">Published</div>
                <div class="text-caption text-medium-emphasis">
                  Drafts are visible only here. Visitors only see published resources.
                </div>
              </div>
              <v-switch v-model="form.published" color="success" hide-details inset density="compact" />
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>

      <v-divider />

      <v-card-actions class="px-6 py-3">
        <v-spacer />
        <v-btn variant="text" class="text-none" :disabled="saving" @click="$emit('cancel')">
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          class="text-none"
          :loading="saving"
          :disabled="!canSave"
          prepend-icon="mdi-content-save-outline"
          @click="onSave"
        >
          {{ editing ? 'Save changes' : 'Create resource' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
// @ts-ignore — auto-imported by Nuxt
import { api } from '~/utils/api'

interface ExternalLink {
  label: string
  url: string
}

interface ResourceForm {
  id?: number
  title: string
  subtitle: string
  excerpt: string
  body: string
  coverImage: string
  sourceName: string
  sourceUrl: string
  externalLinks: ExternalLink[]
  category: string
  featured: boolean
  published: boolean
}

const props = defineProps<{
  modelValue: boolean
  editing: boolean
  saving: boolean
  initial: Partial<ResourceForm> | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  cancel: []
  save: [payload: ResourceForm]
}>()

function blankForm(): ResourceForm {
  return {
    title: '',
    subtitle: '',
    excerpt: '',
    body: '',
    coverImage: '',
    sourceName: '',
    sourceUrl: '',
    externalLinks: [],
    category: '',
    featured: false,
    published: false,
  }
}

const form = ref<ResourceForm>(blankForm())
const coverFile = ref<File | File[] | null>(null)
const uploadingCover = ref(false)

// When the dialog is opened (or `initial` swaps to a different row), hydrate
// the local form. Doing this in a watch lets the parent reuse the same dialog
// for both create-from-blank and edit-row-N without re-mounting.
watch(
  () => [props.modelValue, props.initial] as const,
  ([open, initial]) => {
    if (!open) return
    if (initial) {
      form.value = {
        ...blankForm(),
        ...initial,
        externalLinks: Array.isArray((initial as any).externalLinks)
          ? (initial as any).externalLinks.map((l: any) => ({
              label: String(l?.label || ''),
              url: String(l?.url || ''),
            }))
          : [],
      } as ResourceForm
    } else {
      form.value = blankForm()
    }
  },
  { immediate: true },
)

const titleError = computed(() => {
  if (!form.value.title?.trim()) return ''
  return form.value.title.trim().length < 3 ? 'Title is too short.' : ''
})

const canSave = computed(() => {
  return !!form.value.title?.trim() && !titleError.value
})

function addLink() {
  if (form.value.externalLinks.length >= 12) return
  form.value.externalLinks.push({ label: '', url: '' })
}
function removeLink(index: number) {
  form.value.externalLinks.splice(index, 1)
}

async function onCoverPicked(file: File | File[] | null) {
  if (!file || Array.isArray(file)) return
  uploadingCover.value = true
  try {
    const fd = new FormData()
    fd.append('image', file)
    const res: any = await api.post('/api/admin/content/upload', fd)
    if (res?.url) form.value.coverImage = String(res.url)
  } catch (e: any) {
    // Surface a snackbar via the parent? Easier: just clear the picker so
    // the user can retry. The catch keeps the dialog usable on bad uploads.
    console.warn('Cover upload failed', e?.statusMessage || e?.message || e)
  } finally {
    uploadingCover.value = false
    coverFile.value = null
  }
}

function onSave() {
  if (!canSave.value) return
  // Drop empty link rows so we don't persist noise.
  const cleaned: ResourceForm = {
    ...form.value,
    title: form.value.title.trim(),
    subtitle: form.value.subtitle?.trim() || '',
    excerpt: form.value.excerpt?.trim() || '',
    sourceName: form.value.sourceName?.trim() || '',
    sourceUrl: form.value.sourceUrl?.trim() || '',
    category: form.value.category?.trim() || '',
    coverImage: form.value.coverImage?.trim() || '',
    externalLinks: form.value.externalLinks.filter((l) => l.url?.trim()),
  }
  emit('save', cleaned)
}
</script>

<style scoped>
.rf-dialog {
  background: #fff;
}
.rf-body {
  background: #fafbfc;
}
.rf-cover {
  background: #fff;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  padding: 16px;
}
.rf-cover__preview {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  background: #f1f5f9;
  border-radius: 8px;
  overflow: hidden;
}
.rf-cover__img {
  max-height: 220px;
  max-width: 100%;
  object-fit: contain;
}
.rf-cover__remove {
  position: absolute !important;
  top: 8px;
  right: 8px;
}
.rf-cover__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 8px;
  text-align: center;
}
.rf-link-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.rf-empty-links {
  display: flex;
  align-items: center;
  background: #f1f5f9;
  border-radius: 8px;
  padding: 10px 14px;
}
</style>
