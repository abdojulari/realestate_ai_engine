<template>
  <div class="admin-partners px-md-8 py-md-6">
    <v-container fluid>
      <v-row class="mb-6 align-center">
        <v-col cols="12" md="8">
          <div class="d-flex align-center mb-2">
            <v-btn icon="mdi-arrow-left" variant="text" size="small" class="mr-2" to="/admin" />
            <div class="premium-accent-bar mr-4" />
            <span class="text-overline letter-spacing-2 text-primary">Partnership &amp; Team</span>
          </div>
          <h1 class="display-serif text-h4 mb-1">Partner perks</h1>
          <p class="text-body-2 text-medium-emphasis mb-0">
            Spotlight trusted vendors — furniture, blinds, staging, and more — with clear descriptions of what clients receive.
          </p>
        </v-col>
        <v-col cols="12" md="4" class="text-md-right">
          <v-btn color="primary" rounded="lg" class="text-none" prepend-icon="mdi-plus" @click="openCreate">
            Add partner offer
          </v-btn>
        </v-col>
      </v-row>

      <v-card elevation="0" border rounded="xl">
        <v-data-table :headers="headers" :items="promotions" :loading="loading" item-value="id">
          <template #item.companyName="{ item }">
            <div class="d-flex align-center ga-3 py-1">
              <v-avatar v-if="item.logoUrl" size="40" rounded="lg">
                <v-img :src="item.logoUrl" alt="" cover />
              </v-avatar>
              <v-avatar v-else size="40" rounded="lg" color="grey-lighten-3">
                <v-icon color="grey">mdi-storefront-outline</v-icon>
              </v-avatar>
              <span class="font-weight-medium">{{ item.companyName }}</span>
            </div>
          </template>
          <template #item.approved="{ item }">
            <v-chip size="small" :color="item.approved ? 'success' : 'grey'" variant="tonal">
              {{ item.approved ? 'Live' : 'Draft' }}
            </v-chip>
          </template>
          <template #item.description="{ item }">
            <span class="text-body-2 text-medium-emphasis">{{ truncate(item.description, 96) }}</span>
          </template>
          <template #item.actions="{ item }">
            <v-btn icon="mdi-pencil" variant="text" size="small" @click="openEdit(item)" />
            <v-btn icon="mdi-delete-outline" variant="text" size="small" color="error" @click="confirmDelete(item)" />
          </template>
        </v-data-table>
      </v-card>
    </v-container>

    <v-dialog v-model="wizardOpen" max-width="560" scrollable persistent>
      <v-card rounded="xl">
        <v-card-title class="text-h6 font-weight-bold">New partner offer</v-card-title>
        <v-card-text>
          <v-stepper v-model="step" class="elevation-0 bg-transparent" alt-labels>
            <v-stepper-header class="elevation-0 flex-wrap">
              <v-stepper-item value="1" title="Business" />
              <v-divider />
              <v-stepper-item value="2" title="Offer copy" />
              <v-divider />
              <v-stepper-item value="3" title="Review" />
            </v-stepper-header>
            <v-stepper-window>
              <v-stepper-window-item value="1">
                <v-text-field
                  v-model="draft.companyName"
                  label="Company name *"
                  variant="outlined"
                  class="mb-3"
                  hide-details="auto"
                />
                <v-text-field
                  v-model="draft.categoryTag"
                  label="Category * e.g. Furniture, Window coverings"
                  variant="outlined"
                  class="mb-3"
                  hide-details="auto"
                />
                <v-text-field
                  v-model="draft.offerSummary"
                  label="Promo headline (optional)"
                  variant="outlined"
                  hint="e.g. 15% off installation"
                  persistent-hint
                />
                <v-text-field
                  v-model="draft.websiteUrl"
                  label="Website (optional)"
                  variant="outlined"
                  class="mt-5 mb-2"
                  hide-details="auto"
                />
                <v-divider class="my-4" />
                <div class="text-subtitle-2 font-weight-bold mb-3">Brand imagery (optional)</div>
                <div class="d-flex flex-column ga-4">
                  <div>
                    <div class="text-caption text-medium-emphasis mb-2">Storefront or hero photo</div>
                    <div class="d-flex align-center flex-wrap ga-3">
                      <v-sheet v-if="draft.coverImageUrl" width="120" height="72" rounded="lg" border class="overflow-hidden">
                        <v-img :src="draft.coverImageUrl" height="72" cover alt="" />
                      </v-sheet>
                      <div class="d-flex flex-column ga-2">
                        <v-btn
                          size="small"
                          variant="outlined"
                          prepend-icon="mdi-image-area"
                          :loading="uploadingPartner === 'cover-draft'"
                          @click="partnerDraftCoverInput?.click()"
                        >
                          Upload cover
                        </v-btn>
                        <v-btn v-if="draft.coverImageUrl" size="small" variant="text" color="error" @click="draft.coverImageUrl = ''">
                          Remove
                        </v-btn>
                      </div>
                    </div>
                    <input
                      ref="partnerDraftCoverInput"
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      class="d-none"
                      @change="(e) => onPartnerAsset(e, 'cover', 'draft')"
                    />
                  </div>
                  <div>
                    <div class="text-caption text-medium-emphasis mb-2">Business logo</div>
                    <div class="d-flex align-center flex-wrap ga-3">
                      <v-avatar v-if="draft.logoUrl" size="56" rounded="lg">
                        <v-img :src="draft.logoUrl" alt="" cover />
                      </v-avatar>
                      <div class="d-flex flex-column ga-2">
                        <v-btn
                          size="small"
                          variant="outlined"
                          prepend-icon="mdi-vector-square"
                          :loading="uploadingPartner === 'logo-draft'"
                          @click="partnerDraftLogoInput?.click()"
                        >
                          Upload logo
                        </v-btn>
                        <v-btn v-if="draft.logoUrl" size="small" variant="text" color="error" @click="draft.logoUrl = ''">
                          Remove
                        </v-btn>
                      </div>
                    </div>
                    <input
                      ref="partnerDraftLogoInput"
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      class="d-none"
                      @change="(e) => onPartnerAsset(e, 'logo', 'draft')"
                    />
                  </div>
                </div>
              </v-stepper-window-item>
              <v-stepper-window-item value="2">
                <v-textarea
                  v-model="draft.description"
                  label="Full description *"
                  variant="outlined"
                  rows="8"
                  auto-grow
                  hint="Explain what clients receive, how to redeem, and any timing restrictions."
                  persistent-hint
                />
              </v-stepper-window-item>
              <v-stepper-window-item value="3">
                <v-sheet border rounded="lg" class="pa-4 mb-4 overflow-hidden">
                  <v-img v-if="draft.coverImageUrl" :src="draft.coverImageUrl" height="140" cover class="mb-4 rounded-lg" alt="" />
                  <div class="d-flex align-start ga-3">
                    <v-avatar v-if="draft.logoUrl" size="48" rounded="lg">
                      <v-img :src="draft.logoUrl" alt="" cover />
                    </v-avatar>
                    <div>
                      <div class="text-overline text-medium-emphasis">{{ draft.categoryTag }}</div>
                      <div class="text-h6 font-weight-bold">{{ draft.companyName }}</div>
                      <div v-if="draft.offerSummary" class="text-primary mt-2">{{ draft.offerSummary }}</div>
                      <p class="text-body-2 mt-4 mb-0">{{ draft.description }}</p>
                      <div v-if="draft.websiteUrl" class="text-caption mt-3">{{ draft.websiteUrl }}</div>
                    </div>
                  </div>
                </v-sheet>
                <v-checkbox v-model="draft.publishNow" hide-details color="primary">
                  <template #label>
                    <span class="text-body-2">Publish immediately on the public partnership page</span>
                  </template>
                </v-checkbox>
              </v-stepper-window-item>
            </v-stepper-window>
          </v-stepper>
        </v-card-text>
        <v-card-actions class="px-6 pb-6">
          <v-btn variant="text" @click="wizardOpen = false">Cancel</v-btn>
          <v-spacer />
          <v-btn v-if="Number(step) > 1" variant="text" @click="bump(-1)">Back</v-btn>
          <v-btn v-if="Number(step) < 3" color="primary" rounded="lg" class="text-none" @click="advance">
            Continue
          </v-btn>
          <v-btn v-else color="primary" rounded="lg" class="text-none" :loading="saving" @click="submitWizard">
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="editOpen" max-width="540" scrollable>
      <v-card rounded="xl" v-if="editTarget">
        <v-card-title class="text-h6 font-weight-bold">Edit partner offer</v-card-title>
        <v-card-text>
          <v-text-field v-model="editDraft.companyName" label="Company *" variant="outlined" class="mb-3" />
          <v-text-field v-model="editDraft.categoryTag" label="Category *" variant="outlined" class="mb-3" />
          <v-text-field v-model="editDraft.offerSummary" label="Promo headline" variant="outlined" class="mb-3" />
          <v-text-field v-model="editDraft.websiteUrl" label="Website" variant="outlined" class="mb-3" />
          <v-divider class="my-4" />
          <div class="text-subtitle-2 font-weight-bold mb-3">Imagery</div>
          <div class="mb-4">
            <div class="text-caption text-medium-emphasis mb-2">Cover / storefront</div>
            <div class="d-flex align-center flex-wrap ga-3">
              <v-sheet v-if="editDraft.coverImageUrl" width="140" height="84" rounded="lg" border class="overflow-hidden">
                <v-img :src="editDraft.coverImageUrl" height="84" cover alt="" />
              </v-sheet>
              <v-btn size="small" variant="outlined" :loading="uploadingPartner === 'cover-edit'" @click="partnerEditCoverInput?.click()">
                Upload
              </v-btn>
              <v-btn v-if="editDraft.coverImageUrl" size="small" variant="text" color="error" @click="editDraft.coverImageUrl = ''">
                Remove
              </v-btn>
            </div>
            <input
              ref="partnerEditCoverInput"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              class="d-none"
              @change="(e) => onPartnerAsset(e, 'cover', 'edit')"
            />
          </div>
          <div class="mb-4">
            <div class="text-caption text-medium-emphasis mb-2">Logo</div>
            <div class="d-flex align-center flex-wrap ga-3">
              <v-avatar v-if="editDraft.logoUrl" size="56" rounded="lg">
                <v-img :src="editDraft.logoUrl" alt="" cover />
              </v-avatar>
              <v-btn size="small" variant="outlined" :loading="uploadingPartner === 'logo-edit'" @click="partnerEditLogoInput?.click()">
                Upload
              </v-btn>
              <v-btn v-if="editDraft.logoUrl" size="small" variant="text" color="error" @click="editDraft.logoUrl = ''">
                Remove
              </v-btn>
            </div>
            <input
              ref="partnerEditLogoInput"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              class="d-none"
              @change="(e) => onPartnerAsset(e, 'logo', 'edit')"
            />
          </div>
          <v-textarea v-model="editDraft.description" label="Description *" variant="outlined" rows="6" class="mb-3" />
          <v-switch v-model="editDraft.approved" inset color="success" hide-details label="Published on website" />
        </v-card-text>
        <v-card-actions class="px-6 pb-6">
          <v-btn variant="text" @click="editOpen = false">Close</v-btn>
          <v-spacer />
          <v-btn color="primary" rounded="lg" :loading="saving" @click="saveEdit">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteOpen" max-width="420">
      <v-card rounded="xl">
        <v-card-title>Delete partner offer?</v-card-title>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteOpen = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" :loading="deleting" @click="runDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['admin', 'delegate-feature'],
  delegateFeature: 'partnerships',
})

const { get, post, put, del } = useApi()
const { showSuccess, showError } = useAlert()

interface PromoRow {
  id: number
  companyName: string
  categoryTag: string
  description: string
  offerSummary: string | null
  websiteUrl: string | null
  logoUrl: string | null
  coverImageUrl: string | null
  approved: boolean
  sortOrder: number
}

const loading = ref(false)
const promotions = ref<PromoRow[]>([])
const headers = [
  { title: 'Company', key: 'companyName' },
  { title: 'Category', key: 'categoryTag' },
  { title: 'Offer', key: 'offerSummary' },
  { title: 'Description', key: 'description' },
  { title: 'Status', key: 'approved' },
  { title: '', key: 'actions', sortable: false, align: 'end' as const },
]

async function load() {
  loading.value = true
  try {
    const res = await get<{ promotions: PromoRow[] }>('/admin/partnerships/promotions')
    promotions.value = res.promotions || []
  } catch (e: any) {
    showError(e?.statusMessage || 'Could not load partners')
  } finally {
    loading.value = false
  }
}

onMounted(load)

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  if (process.client) {
    const token = localStorage.getItem('token')
    if (token) headers.Authorization = `Bearer ${token}`
  }
  return headers
}

const partnerDraftLogoInput = ref<HTMLInputElement | null>(null)
const partnerDraftCoverInput = ref<HTMLInputElement | null>(null)
const partnerEditLogoInput = ref<HTMLInputElement | null>(null)
const partnerEditCoverInput = ref<HTMLInputElement | null>(null)
const uploadingPartner = ref<'logo-draft' | 'cover-draft' | 'logo-edit' | 'cover-edit' | null>(null)

async function onPartnerAsset(ev: Event, kind: 'logo' | 'cover', target: 'draft' | 'edit') {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file?.type.startsWith('image/')) {
    showError('Choose an image file.')
    return
  }
  if (file.size > 8 * 1024 * 1024) {
    showError('Image must be 8MB or smaller.')
    return
  }
  const slot =
    kind === 'logo' ? (target === 'draft' ? 'logo-draft' : 'logo-edit') : target === 'draft' ? 'cover-draft' : 'cover-edit'
  uploadingPartner.value = slot
  try {
    const fd = new FormData()
    fd.append('image', file)
    const res = (await $fetch('/api/admin/partnerships/upload-image', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: fd,
    })) as { url?: string }
    if (!res?.url) return
    if (target === 'draft') {
      if (kind === 'logo') draft.logoUrl = res.url
      else draft.coverImageUrl = res.url
    } else {
      if (kind === 'logo') editDraft.logoUrl = res.url
      else editDraft.coverImageUrl = res.url
    }
    showSuccess('Image uploaded')
  } catch (e: any) {
    showError(e?.data?.statusMessage || e?.statusMessage || 'Upload failed')
  } finally {
    uploadingPartner.value = null
  }
}

function truncate(s: string, n: number) {
  if (!s) return ''
  return s.length <= n ? s : `${s.slice(0, n)}…`
}

/** Wizard */
const wizardOpen = ref(false)
const step = ref('1')
const saving = ref(false)
const draft = reactive({
  companyName: '',
  categoryTag: '',
  offerSummary: '',
  websiteUrl: '',
  logoUrl: '',
  coverImageUrl: '',
  description: '',
  publishNow: true,
})

function bump(delta: number) {
  const n = Number(step.value)
  step.value = String(Math.min(3, Math.max(1, n + delta)))
}

function openCreate() {
  step.value = '1'
  draft.companyName = ''
  draft.categoryTag = ''
  draft.offerSummary = ''
  draft.websiteUrl = ''
  draft.logoUrl = ''
  draft.coverImageUrl = ''
  draft.description = ''
  draft.publishNow = true
  wizardOpen.value = true
}

function advance() {
  if (step.value === '1') {
    if (!draft.companyName.trim() || !draft.categoryTag.trim()) {
      showError('Company name and category are required.')
      return
    }
  }
  if (step.value === '2') {
    if (!draft.description.trim()) {
      showError('Description is required.')
      return
    }
  }
  bump(1)
}

async function submitWizard() {
  saving.value = true
  try {
    await post('/admin/partnerships/promotions', {
      companyName: draft.companyName,
      categoryTag: draft.categoryTag,
      description: draft.description,
      offerSummary: draft.offerSummary || null,
      websiteUrl: draft.websiteUrl || null,
      logoUrl: draft.logoUrl || null,
      coverImageUrl: draft.coverImageUrl || null,
      approved: draft.publishNow,
    })
    showSuccess('Partner offer saved')
    wizardOpen.value = false
    await load()
  } catch (e: any) {
    showError(e?.statusMessage || 'Save failed')
  } finally {
    saving.value = false
  }
}

/** Edit */
const editOpen = ref(false)
const editTarget = ref<PromoRow | null>(null)
const editDraft = reactive({
  companyName: '',
  categoryTag: '',
  description: '',
  offerSummary: '',
  websiteUrl: '',
  logoUrl: '',
  coverImageUrl: '',
  approved: true,
})

function openEdit(row: PromoRow) {
  editTarget.value = row
  editDraft.companyName = row.companyName
  editDraft.categoryTag = row.categoryTag
  editDraft.description = row.description
  editDraft.offerSummary = row.offerSummary || ''
  editDraft.websiteUrl = row.websiteUrl || ''
  editDraft.logoUrl = row.logoUrl || ''
  editDraft.coverImageUrl = row.coverImageUrl || ''
  editDraft.approved = row.approved
  editOpen.value = true
}

async function saveEdit() {
  if (!editTarget.value) return
  saving.value = true
  try {
    await put(`/admin/partnerships/promotions/${editTarget.value.id}`, { ...editDraft })
    showSuccess('Updated')
    editOpen.value = false
    await load()
  } catch (e: any) {
    showError(e?.statusMessage || 'Update failed')
  } finally {
    saving.value = false
  }
}

/** Delete */
const deleteOpen = ref(false)
const pendingDelete = ref<PromoRow | null>(null)
const deleting = ref(false)

function confirmDelete(row: PromoRow) {
  pendingDelete.value = row
  deleteOpen.value = true
}

async function runDelete() {
  if (!pendingDelete.value) return
  deleting.value = true
  try {
    await del(`/admin/partnerships/promotions/${pendingDelete.value.id}`)
    showSuccess('Removed')
    deleteOpen.value = false
    pendingDelete.value = null
    await load()
  } catch (e: any) {
    showError(e?.statusMessage || 'Delete failed')
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.premium-accent-bar {
  width: 4px;
  height: 28px;
  border-radius: 4px;
  background: linear-gradient(180deg, #1976d2, #c9a227);
}
.display-serif {
  font-family: Georgia, 'Times New Roman', serif;
}
</style>
