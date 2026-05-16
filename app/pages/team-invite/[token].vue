<template>
  <div class="team-invite-page pa-4 pa-md-10">
    <v-container class="py-md-10" style="max-width: 720px">
      <div class="text-center mb-8">
        <v-icon size="48" color="primary" class="mb-2">mdi-account-card-details-outline</v-icon>
        <h1 class="text-h4 font-weight-bold mb-2">Specialist profile</h1>
        <p class="text-body-2 text-medium-emphasis">
          Your brokerage invited you to share the details clients see on their partnership page.
          Submissions are reviewed before publishing.
        </p>
      </div>

      <v-alert v-if="metaPending" type="info" variant="tonal" rounded="lg">Checking invitation…</v-alert>

      <v-alert v-else-if="metaError || !meta" type="error" variant="tonal" rounded="lg" class="mb-6">
        This invitation link is invalid or could not be loaded.
      </v-alert>

      <v-alert v-else-if="!meta.valid" type="warning" variant="tonal" rounded="lg" class="mb-6">
        <span v-if="meta.expired">This invitation has expired. Please ask your broker to send a new link.</span>
        <span v-else-if="meta.consumed">This link has already been used.</span>
        <span v-else>This invitation is no longer valid.</span>
      </v-alert>

      <v-card v-else rounded="xl" elevation="0" border class="pa-2 pa-md-6">
        <v-chip class="mb-6" color="primary" variant="tonal" prepend-icon="mdi-shape-outline">
          {{ meta.categoryLabel }}
        </v-chip>

        <v-form @submit.prevent="submit">
          <v-row dense>
            <v-col cols="12">
              <v-text-field
                v-model="form.contactName"
                label="Contact name *"
                variant="outlined"
                density="comfortable"
                hide-details="auto"
                :rules="[rules.required]"
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="form.organization"
                label="Brokerage, bank, or firm *"
                variant="outlined"
                density="comfortable"
                hide-details="auto"
                :rules="[rules.required]"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.phone"
                label="Phone *"
                variant="outlined"
                density="comfortable"
                hide-details="auto"
                :rules="[rules.required]"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.email"
                label="Email *"
                type="email"
                variant="outlined"
                density="comfortable"
                hide-details="auto"
                :rules="[rules.required, rules.email]"
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="form.address"
                label="Business address *"
                variant="outlined"
                rows="3"
                hide-details="auto"
                :rules="[rules.required]"
              />
            </v-col>
            <v-col cols="12">
              <div class="text-caption font-weight-medium mb-2">Profile photo (optional)</div>
              <div class="d-flex align-center flex-wrap ga-4">
                <v-avatar v-if="form.photoUrl" size="88" rounded="lg">
                  <v-img :src="form.photoUrl" alt="" cover />
                </v-avatar>
                <div class="d-flex flex-column ga-2">
                  <v-btn
                    variant="outlined"
                    size="small"
                    prepend-icon="mdi-camera-plus"
                    :disabled="!meta.valid"
                    :loading="uploadingInvitePhoto"
                    @click="invitePhotoInput?.click()"
                  >
                    Upload headshot
                  </v-btn>
                  <v-btn
                    v-if="form.photoUrl"
                    variant="text"
                    size="small"
                    color="error"
                    @click="form.photoUrl = ''"
                  >
                    Remove photo
                  </v-btn>
                </div>
              </div>
              <input
                ref="invitePhotoInput"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                class="d-none"
                @change="onInvitePhoto"
              />
              <p class="text-caption text-medium-emphasis mt-2 mb-0">
                JPEG, PNG, GIF or WebP · max 8MB. Shown only after your broker approves your profile.
              </p>
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="form.bio"
                label="Short bio (optional)"
                variant="outlined"
                rows="3"
                hide-details="auto"
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="form.credentials"
                label="Certificates or degrees (optional)"
                variant="outlined"
                rows="2"
                hide-details="auto"
              />
            </v-col>
          </v-row>

          <v-alert v-if="submitError" type="error" variant="tonal" class="mt-4" rounded="lg">
            {{ submitError }}
          </v-alert>

          <div class="d-flex justify-end mt-6">
            <v-btn
              type="submit"
              color="primary"
              size="large"
              rounded="lg"
              class="text-none"
              :loading="submitting"
              prepend-icon="mdi-send"
            >
              Submit for review
            </v-btn>
          </div>
        </v-form>
      </v-card>
    </v-container>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const tokenParam = computed(() => String(route.params.token || '').trim())

const {
  data: meta,
  pending: metaPending,
  error: metaError,
} = await useFetch<{
  valid: boolean
  expired: boolean
  consumed: boolean
  categoryLabel: string
}>(
  () => `/api/public/team-invite/${encodeURIComponent(tokenParam.value)}`,
  {
    watch: [tokenParam],
  },
)

const form = reactive({
  contactName: '',
  organization: '',
  phone: '',
  email: '',
  address: '',
  bio: '',
  credentials: '',
  photoUrl: '',
})

const invitePhotoInput = ref<HTMLInputElement | null>(null)
const uploadingInvitePhoto = ref(false)

async function onInvitePhoto(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  submitError.value = ''
  if (!file) return
  if (!meta.value?.valid || !tokenParam.value) return
  if (!file.type.startsWith('image/')) {
    submitError.value = 'Please choose an image file.'
    return
  }
  if (file.size > 8 * 1024 * 1024) {
    submitError.value = 'Image must be 8MB or smaller.'
    return
  }
  uploadingInvitePhoto.value = true
  try {
    const fd = new FormData()
    fd.append('image', file)
    const res = (await $fetch(
      `/api/public/team-invite/${encodeURIComponent(tokenParam.value)}/upload`,
      {
        method: 'POST',
        body: fd,
      },
    )) as { url?: string }
    if (res?.url) form.photoUrl = res.url
  } catch (e: any) {
    submitError.value =
      e?.data?.statusMessage || e?.statusMessage || e?.message || 'Photo upload failed'
  } finally {
    uploadingInvitePhoto.value = false
  }
}

const rules = {
  required: (v: string) => !!(v && String(v).trim()) || 'Required',
  email: (v: string) => /.+@.+\..+/.test(v) || 'Enter a valid email',
}

const submitting = ref(false)
const submitError = ref('')

async function submit() {
  submitError.value = ''
  if (!meta.value?.valid) return
  submitting.value = true
  try {
    await $fetch(`/api/public/team-invite/${encodeURIComponent(tokenParam.value)}`, {
      method: 'POST',
      body: {
        ...form,
        photoUrl: form.photoUrl || undefined,
      },
    })
    await navigateTo({
      path: '/partnership-team',
      query: { submitted: '1' },
    })
  } catch (e: any) {
    submitError.value =
      e?.data?.statusMessage || e?.statusMessage || e?.message || 'Submission failed'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.team-invite-page {
  min-height: 70vh;
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 40%);
}
</style>
