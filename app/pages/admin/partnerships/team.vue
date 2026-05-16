<template>
  <div class="admin-partnership-team px-md-8 py-md-6">
    <v-container fluid>
      <v-row class="mb-6 align-center">
        <v-col cols="12" md="8">
          <div class="d-flex align-center mb-2">
            <v-btn icon="mdi-arrow-left" variant="text" size="small" class="mr-2" to="/admin" />
            <div class="premium-accent-bar mr-4" />
            <span class="text-overline letter-spacing-2 text-primary">Partnership &amp; Team</span>
          </div>
          <h1 class="display-serif text-h4 mb-1">Trusted specialists</h1>
          <p class="text-body-2 text-medium-emphasis mb-0">
            Publish up to three approved profiles per category. Invite specialists to submit their
            own details — every submission stays pending until you approve it.
          </p>
        </v-col>
        <v-col cols="12" md="4" class="text-md-right">
          <v-btn color="primary" class="text-none" prepend-icon="mdi-plus" rounded="lg" @click="openCreate">
            Add specialist
          </v-btn>
        </v-col>
      </v-row>

      <v-card class="mb-8 pa-6 rounded-xl" elevation="0" border>
        <div class="d-flex flex-column flex-md-row align-start align-md-center justify-space-between gap-4">
          <div>
            <h3 class="text-h6 font-weight-bold mb-1">
              <v-icon class="mr-2" color="primary">mdi-link-variant</v-icon>
              Invite link for specialists
            </h3>
            <p class="text-body-2 text-medium-emphasis mb-0">
              Generates a secure single-use URL scoped to your brokerage. Share it only with the person
              you expect — each link expires automatically.
            </p>
          </div>
          <div class="invite-controls d-flex flex-column flex-sm-row ga-3 align-stretch">
            <v-select
              v-model="inviteCategory"
              :items="categorySelectItems"
              item-title="title"
              item-value="value"
              label="Category"
              variant="outlined"
              density="compact"
              hide-details
              style="min-width: 220px"
            />
            <v-select
              v-model="inviteExpiryDays"
              :items="expiryItems"
              label="Expires in"
              variant="outlined"
              density="compact"
              hide-details
              style="min-width: 140px"
            />
            <v-btn
              color="primary"
              variant="tonal"
              class="text-none"
              rounded="lg"
              prepend-icon="mdi-creation"
              :loading="inviteLoading"
              @click="generateInvite"
            >
              Generate link
            </v-btn>
          </div>
        </div>
        <v-expand-transition>
          <div v-if="lastInviteUrl" class="mt-4">
            <v-text-field
              :model-value="lastInviteUrl"
              readonly
              variant="outlined"
              density="compact"
              label="Shareable URL"
              append-inner-icon="mdi-content-copy"
              @click:append-inner="copyText(lastInviteUrl)"
            />
          </div>
        </v-expand-transition>
      </v-card>

      <v-card elevation="0" border rounded="xl">
        <v-tabs v-model="statusTab" color="primary" class="px-4 pt-2">
          <v-tab value="all">All</v-tab>
          <v-tab value="approved">Published</v-tab>
          <v-tab value="pending">Pending approval</v-tab>
        </v-tabs>
        <v-divider />
        <v-data-table
          :headers="headers"
          :items="filteredMembers"
          :loading="loading"
          item-value="id"
          class="rounded-b-xl"
        >
          <template #item.contactName="{ item }">
            <div class="d-flex align-center ga-3 py-1">
              <v-avatar size="40" rounded="lg">
                <v-img v-if="item.photoUrl" :src="item.photoUrl" alt="" cover />
                <v-icon v-else color="grey">mdi-account-tie</v-icon>
              </v-avatar>
              <span class="font-weight-medium">{{ item.contactName }}</span>
            </div>
          </template>
          <template #item.approved="{ item }">
            <v-chip size="small" :color="item.approved ? 'success' : 'warning'" variant="tonal">
              {{ item.approved ? 'Published' : 'Pending' }}
            </v-chip>
          </template>
          <template #item.actions="{ item }">
            <v-btn icon="mdi-pencil" variant="text" size="small" @click="openEdit(item)" />
            <v-btn
              v-if="!item.approved"
              icon="mdi-check-decagram"
              variant="text"
              size="small"
              color="success"
              @click="approveOne(item)"
            />
            <v-btn icon="mdi-delete-outline" variant="text" size="small" color="error" @click="confirmDelete(item)" />
          </template>
        </v-data-table>
      </v-card>
    </v-container>

    <!-- Multi-step create -->
    <v-dialog v-model="createOpen" max-width="560" scrollable persistent>
      <v-card rounded="xl">
        <v-card-title class="text-h6 font-weight-bold">Add specialist</v-card-title>
        <v-card-text>
          <v-stepper v-model="createStep" alt-labels class="elevation-0 bg-transparent">
            <v-stepper-header class="elevation-0 flex-wrap">
              <v-stepper-item value="1" title="Category" />
              <v-divider />
              <v-stepper-item value="2" title="Contact" />
              <v-divider />
              <v-stepper-item value="3" title="Profile" />
              <v-divider />
              <v-stepper-item value="4" title="Review" />
            </v-stepper-header>
            <v-stepper-window>
              <v-stepper-window-item value="1">
                <p class="text-body-2 text-medium-emphasis mb-4">Choose how this professional appears on your site.</p>
                <v-radio-group v-model="draft.category" hide-details>
                  <v-radio
                    v-for="opt in TEAM_CATEGORY_OPTIONS"
                    :key="opt.value"
                    :label="opt.title"
                    :value="opt.value"
                  />
                </v-radio-group>
              </v-stepper-window-item>
              <v-stepper-window-item value="2">
                <v-text-field v-model="draft.contactName" label="Contact name *" variant="outlined" class="mb-3" />
                <v-text-field v-model="draft.organization" label="Brokerage, bank, or firm *" variant="outlined" class="mb-3" />
                <v-text-field v-model="draft.phone" label="Phone *" variant="outlined" class="mb-3" />
                <v-text-field v-model="draft.email" label="Email *" type="email" variant="outlined" class="mb-3" />
                <v-textarea v-model="draft.address" label="Address *" variant="outlined" rows="3" />
              </v-stepper-window-item>
              <v-stepper-window-item value="3">
                <div class="mb-4">
                  <div class="text-caption text-medium-emphasis mb-2">Profile photo (optional)</div>
                  <div class="d-flex align-center flex-wrap ga-3">
                    <v-avatar v-if="draft.photoUrl" size="88" rounded="lg">
                      <v-img :src="draft.photoUrl" alt="" cover />
                    </v-avatar>
                    <div class="d-flex flex-column ga-2">
                      <v-btn
                        size="small"
                        variant="outlined"
                        prepend-icon="mdi-camera-plus"
                        :loading="uploadingPhoto"
                        @click="teamPhotoCreateInput?.click()"
                      >
                        Upload photo
                      </v-btn>
                      <v-btn v-if="draft.photoUrl" size="small" variant="text" color="error" @click="draft.photoUrl = ''">
                        Remove
                      </v-btn>
                    </div>
                  </div>
                  <input
                    ref="teamPhotoCreateInput"
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    class="d-none"
                    @change="onTeamPhotoCreate"
                  />
                </div>
                <v-textarea v-model="draft.bio" label="Bio (optional)" variant="outlined" rows="4" class="mb-4" />
                <v-textarea v-model="draft.credentials" label="Certificates / degrees (optional)" variant="outlined" rows="3" />
              </v-stepper-window-item>
              <v-stepper-window-item value="4">
                <v-sheet rounded="lg" border class="pa-4 mb-4">
                  <div class="d-flex align-start ga-4 mb-3">
                    <v-avatar v-if="draft.photoUrl" size="72" rounded="lg">
                      <v-img :src="draft.photoUrl" alt="" cover />
                    </v-avatar>
                    <div>
                      <div class="text-subtitle-2 text-medium-emphasis mb-2">{{ categoryLabel(draft.category) }}</div>
                      <div class="text-h6 font-weight-bold">{{ draft.contactName || '—' }}</div>
                      <div class="text-primary mb-2">{{ draft.organization || '—' }}</div>
                      <div class="text-body-2 mb-1">{{ draft.phone }}</div>
                      <div class="text-body-2 mb-1">{{ draft.email }}</div>
                      <div class="text-body-2">{{ draft.address }}</div>
                    </div>
                  </div>
                </v-sheet>
                <v-checkbox v-model="draft.publishNow" hide-details color="primary" density="compact">
                  <template #label>
                    <span class="text-body-2">Publish immediately (respects 3-per-category limit)</span>
                  </template>
                </v-checkbox>
              </v-stepper-window-item>
            </v-stepper-window>
          </v-stepper>
        </v-card-text>
        <v-card-actions class="px-6 pb-6">
          <v-btn variant="text" @click="closeCreate">Cancel</v-btn>
          <v-spacer />
          <v-btn v-if="Number(createStep) > 1" variant="text" class="text-none" @click="bumpStep(-1)">Back</v-btn>
          <v-btn
            v-if="Number(createStep) < 4"
            color="primary"
            class="text-none"
            rounded="lg"
            @click="advanceCreate"
          >
            Continue
          </v-btn>
          <v-btn
            v-else
            color="primary"
            class="text-none"
            rounded="lg"
            :loading="saving"
            @click="submitCreate"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit -->
    <v-dialog v-model="editOpen" max-width="520" scrollable>
      <v-card rounded="xl" v-if="editTarget">
        <v-card-title class="text-h6 font-weight-bold">Edit specialist</v-card-title>
        <v-card-text>
          <v-select
            v-model="editDraft.category"
            :items="categorySelectItems"
            item-title="title"
            item-value="value"
            label="Category"
            variant="outlined"
            class="mb-3"
          />
          <v-text-field v-model="editDraft.contactName" label="Contact name *" variant="outlined" class="mb-3" />
          <v-text-field v-model="editDraft.organization" label="Brokerage / firm *" variant="outlined" class="mb-3" />
          <v-text-field v-model="editDraft.phone" label="Phone *" variant="outlined" class="mb-3" />
          <v-text-field v-model="editDraft.email" label="Email *" variant="outlined" class="mb-3" />
          <v-textarea v-model="editDraft.address" label="Address *" variant="outlined" rows="3" class="mb-3" />
          <div class="mb-4">
            <div class="text-caption text-medium-emphasis mb-2">Profile photo</div>
            <div class="d-flex align-center flex-wrap ga-3">
              <v-avatar v-if="editDraft.photoUrl" size="72" rounded="lg">
                <v-img :src="editDraft.photoUrl" alt="" cover />
              </v-avatar>
              <v-btn size="small" variant="outlined" prepend-icon="mdi-camera-plus" :loading="uploadingPhoto" @click="teamPhotoEditInput?.click()">
                Upload
              </v-btn>
              <v-btn v-if="editDraft.photoUrl" size="small" variant="text" color="error" @click="editDraft.photoUrl = ''">
                Remove
              </v-btn>
            </div>
            <input
              ref="teamPhotoEditInput"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              class="d-none"
              @change="onTeamPhotoEdit"
            />
          </div>
          <v-textarea v-model="editDraft.bio" label="Bio" variant="outlined" rows="3" class="mb-3" />
          <v-textarea v-model="editDraft.credentials" label="Credentials" variant="outlined" rows="2" class="mb-3" />
          <v-switch v-model="editDraft.approved" color="success" hide-details inset label="Published on website" />
        </v-card-text>
        <v-card-actions class="px-6 pb-6">
          <v-btn variant="text" @click="editOpen = false">Close</v-btn>
          <v-spacer />
          <v-btn color="primary" class="text-none" rounded="lg" :loading="saving" @click="saveEdit">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteOpen" max-width="420">
      <v-card rounded="xl">
        <v-card-title>Remove specialist?</v-card-title>
        <v-card-text>This cannot be undone.</v-card-text>
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
import { TEAM_CATEGORY_OPTIONS } from '~/utils/partnershipsUi'

definePageMeta({
  layout: 'admin',
  middleware: ['admin', 'delegate-feature'],
  delegateFeature: 'partnerships',
})

const { get, post, put, del } = useApi()
const { showSuccess, showError } = useAlert()

interface MemberRow {
  id: number
  category: string
  categoryLabel: string
  contactName: string
  organization: string
  phone: string
  email: string
  address: string
  bio: string | null
  credentials: string | null
  photoUrl: string | null
  approved: boolean
  sortOrder: number
}

const loading = ref(false)
const members = ref<MemberRow[]>([])
const statusTab = ref<'all' | 'approved' | 'pending'>('all')

const headers = [
  { title: 'Contact', key: 'contactName' },
  { title: 'Category', key: 'categoryLabel' },
  { title: 'Organization', key: 'organization' },
  { title: 'Status', key: 'approved' },
  { title: '', key: 'actions', sortable: false, align: 'end' as const },
]

const filteredMembers = computed(() => {
  if (statusTab.value === 'approved') return members.value.filter((m) => m.approved)
  if (statusTab.value === 'pending') return members.value.filter((m) => !m.approved)
  return members.value
})

async function load() {
  loading.value = true
  try {
    const res = await get<{ members: MemberRow[] }>('/admin/partnerships/team?status=all')
    members.value = res.members || []
  } catch (e: any) {
    showError(e?.statusMessage || 'Could not load team profiles')
  } finally {
    loading.value = false
  }
}

onMounted(load)

const categorySelectItems = TEAM_CATEGORY_OPTIONS.map((o) => ({
  title: o.title,
  value: o.value,
}))

function categoryLabel(v: string) {
  return TEAM_CATEGORY_OPTIONS.find((o) => o.value === v)?.title ?? v
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  if (process.client) {
    const token = localStorage.getItem('token')
    if (token) headers.Authorization = `Bearer ${token}`
  }
  return headers
}

const teamPhotoCreateInput = ref<HTMLInputElement | null>(null)
const teamPhotoEditInput = ref<HTMLInputElement | null>(null)
const uploadingPhoto = ref(false)

async function uploadTeamPhoto(file: File | undefined, target: 'draft' | 'edit') {
  if (!file || !file.type.startsWith('image/')) {
    showError('Choose a JPEG, PNG, GIF, or WebP image.')
    return
  }
  if (file.size > 8 * 1024 * 1024) {
    showError('Image must be 8MB or smaller.')
    return
  }
  uploadingPhoto.value = true
  try {
    const fd = new FormData()
    fd.append('image', file)
    const res = (await $fetch('/api/admin/partnerships/upload-image', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: fd,
    })) as { url?: string }
    if (res?.url) {
      if (target === 'draft') draft.photoUrl = res.url
      else editDraft.photoUrl = res.url
      showSuccess('Photo uploaded')
    }
  } catch (e: any) {
    showError(e?.data?.statusMessage || e?.statusMessage || 'Upload failed')
  } finally {
    uploadingPhoto.value = false
  }
}

function onTeamPhotoCreate(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  uploadTeamPhoto(file, 'draft')
}

function onTeamPhotoEdit(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  uploadTeamPhoto(file, 'edit')
}

/** Invite */
const inviteCategory = ref<string>(TEAM_CATEGORY_OPTIONS[0].value)
const inviteExpiryDays = ref(14)
const expiryItems = [7, 14, 30, 90].map((d) => ({ title: `${d} days`, value: d }))
const inviteLoading = ref(false)
const lastInviteUrl = ref('')

async function generateInvite() {
  inviteLoading.value = true
  lastInviteUrl.value = ''
  try {
    const res = await post<{ inviteUrl: string }>('/admin/partnerships/team/invite', {
      category: inviteCategory.value,
      expiresInDays: inviteExpiryDays.value,
    })
    lastInviteUrl.value = res.inviteUrl
    showSuccess('Invitation link created. Copy and send it securely.')
  } catch (e: any) {
    showError(e?.statusMessage || 'Could not create invite')
  } finally {
    inviteLoading.value = false
  }
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    showSuccess('Copied to clipboard')
  } catch {
    showError('Unable to copy — select and copy manually.')
  }
}

/** Create flow */
const createOpen = ref(false)
const createStep = ref('1')
const saving = ref(false)
const draft = reactive({
  category: TEAM_CATEGORY_OPTIONS[0].value as string,
  contactName: '',
  organization: '',
  phone: '',
  email: '',
  address: '',
  bio: '',
  credentials: '',
  photoUrl: '',
  publishNow: false,
})

function bumpStep(delta: number) {
  const n = Number(createStep.value)
  createStep.value = String(Math.min(4, Math.max(1, n + delta)))
}

function openCreate() {
  createStep.value = '1'
  draft.category = TEAM_CATEGORY_OPTIONS[0].value
  draft.contactName = ''
  draft.organization = ''
  draft.phone = ''
  draft.email = ''
  draft.address = ''
  draft.bio = ''
  draft.credentials = ''
  draft.photoUrl = ''
  draft.publishNow = false
  createOpen.value = true
}

function closeCreate() {
  createOpen.value = false
}

function advanceCreate() {
  if (createStep.value === '2') {
    if (!draft.contactName.trim() || !draft.organization.trim() || !draft.phone.trim() || !draft.email.trim() || !draft.address.trim()) {
      showError('Complete all required contact fields.')
      return
    }
  }
  bumpStep(1)
}

async function submitCreate() {
  saving.value = true
  try {
    await post('/admin/partnerships/team', {
      category: draft.category,
      contactName: draft.contactName,
      organization: draft.organization,
      phone: draft.phone,
      email: draft.email,
      address: draft.address,
      bio: draft.bio || null,
      credentials: draft.credentials || null,
      photoUrl: draft.photoUrl || null,
      approved: draft.publishNow,
    })
    showSuccess('Specialist saved')
    createOpen.value = false
    await load()
  } catch (e: any) {
    showError(e?.statusMessage || 'Save failed')
  } finally {
    saving.value = false
  }
}

/** Edit */
const editOpen = ref(false)
const editTarget = ref<MemberRow | null>(null)
const editDraft = reactive({
  category: '',
  contactName: '',
  organization: '',
  phone: '',
  email: '',
  address: '',
  bio: '',
  credentials: '',
  photoUrl: '',
  approved: false,
})

function openEdit(item: MemberRow) {
  editTarget.value = item
  editDraft.category = item.category
  editDraft.contactName = item.contactName
  editDraft.organization = item.organization
  editDraft.phone = item.phone
  editDraft.email = item.email
  editDraft.address = item.address
  editDraft.bio = item.bio || ''
  editDraft.credentials = item.credentials || ''
  editDraft.photoUrl = item.photoUrl || ''
  editDraft.approved = item.approved
  editOpen.value = true
}

async function saveEdit() {
  if (!editTarget.value) return
  saving.value = true
  try {
    await put(`/admin/partnerships/team/${editTarget.value.id}`, { ...editDraft })
    showSuccess('Updated')
    editOpen.value = false
    await load()
  } catch (e: any) {
    showError(e?.statusMessage || 'Update failed')
  } finally {
    saving.value = false
  }
}

async function approveOne(item: MemberRow) {
  try {
    await put(`/admin/partnerships/team/${item.id}`, { approved: true })
    showSuccess('Published')
    await load()
  } catch (e: any) {
    showError(e?.statusMessage || 'Approve failed')
  }
}

/** Delete */
const deleteOpen = ref(false)
const pendingDelete = ref<MemberRow | null>(null)
const deleting = ref(false)

function confirmDelete(item: MemberRow) {
  pendingDelete.value = item
  deleteOpen.value = true
}

async function runDelete() {
  if (!pendingDelete.value) return
  deleting.value = true
  try {
    await del(`/admin/partnerships/team/${pendingDelete.value.id}`)
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
