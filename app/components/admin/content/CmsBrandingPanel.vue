<template>
  <v-card class="premium-card">
    <div class="p-8 border-b border-slate-100 d-flex align-center">
      <div class="icon-orb mr-4">
        <v-icon color="primary" size="24">mdi-palette-swatch</v-icon>
      </div>
      <div>
        <h2 class="text-h6 font-weight-bold">Site Branding</h2>
        <p class="text-caption text-slate-400 mb-0">Manage logos, contact info, and footer content for your Header &amp; Footer</p>
      </div>
    </div>
    <v-card-text class="p-8">
      <v-alert v-if="saved" type="success" variant="tonal" density="compact" closable class="mb-6" @click:close="saved = false">Branding saved successfully!</v-alert>
      <v-alert v-if="error" type="error" variant="tonal" density="compact" closable class="mb-6" @click:close="error = ''">{{ error }}</v-alert>

      <!-- Header Logo -->
      <div class="text-overline font-weight-bold text-slate-400 tracking-widest mb-4">HEADER</div>
      <v-row dense class="mb-2">
        <v-col cols="12" md="6">
          <v-text-field v-model="branding.businessName" label="Business Name" variant="outlined" density="compact" hint="Displayed as alt-text and fallback" persistent-hint />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field v-model="branding.tagline" label="Tagline" variant="outlined" density="compact" hint="Short line below logo in footer" persistent-hint />
        </v-col>
      </v-row>
      <v-row dense class="mb-6">
        <v-col cols="12" md="6">
          <div class="brand-upload-card">
            <div class="brand-upload-card__label">Site Logo</div>
            <p class="text-caption text-slate-500 mb-2">
              Change the logo by choosing a file below — it uploads to your site automatically. You do not need to copy files onto the server by hand.
            </p>
            <div class="brand-upload-card__preview">
              <img
                :src="siteLogoDisplay"
                alt="Current logo"
                class="brand-upload-card__img brand-upload-card__img--logo"
                @error="onSiteLogoImgError"
              />
              <v-btn
                v-if="branding.logoUrl"
                variant="text"
                color="error"
                size="x-small"
                icon="mdi-close-circle"
                class="brand-upload-card__remove"
                title="Remove logo from site"
                @click="removeSiteLogo"
              />
            </div>
            <v-alert v-if="siteLogoMissingFile" type="warning" variant="tonal" density="compact" class="mb-2">
              The saved logo file is missing (404). Upload a new image below, or remove the logo to use the default.
              <v-btn size="small" variant="text" class="ml-1" @click="removeSiteLogo">Remove saved URL</v-btn>
            </v-alert>
            <v-file-input v-model="logoFile" label="Upload or replace logo" accept="image/*" show-size prepend-icon="" prepend-inner-icon="mdi-camera" variant="outlined" density="compact" hide-details @update:model-value="uploadLogo" />
          </div>
        </v-col>
        <v-col cols="12" md="6">
          <div class="brand-upload-card">
            <div class="brand-upload-card__label">Favicon</div>
            <div class="brand-upload-card__preview">
              <img :src="faviconPreview" alt="Favicon" class="brand-upload-card__img brand-upload-card__img--favicon" />
              <v-btn v-if="branding.faviconUrl" variant="text" color="error" size="x-small" icon="mdi-close-circle" class="brand-upload-card__remove" @click="branding.faviconUrl = ''" />
            </div>
            <v-file-input v-model="faviconFile" label="Replace favicon" accept="image/*,.ico" show-size prepend-icon="" prepend-inner-icon="mdi-star-four-points" variant="outlined" density="compact" hide-details @update:model-value="uploadFavicon" />
          </div>
        </v-col>
      </v-row>

      <v-divider class="my-6" />

      <!-- Contact Info -->
      <div class="text-overline font-weight-bold text-slate-400 tracking-widest mb-4">CONTACT INFO</div>
      <v-row dense class="mb-2">
        <v-col cols="12" md="6">
          <v-text-field v-model="branding.phone" label="Phone Number" variant="outlined" density="compact" prepend-inner-icon="mdi-phone" />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field v-model="branding.email" label="Contact Email" variant="outlined" density="compact" prepend-inner-icon="mdi-email" />
        </v-col>
      </v-row>
      <v-row dense class="mb-6">
        <v-col cols="12" md="6">
          <v-text-field v-model="branding.address" label="Address" variant="outlined" density="compact" prepend-inner-icon="mdi-map-marker" />
        </v-col>
        <v-col cols="12" md="3">
          <v-text-field v-model="branding.city" label="City" variant="outlined" density="compact" />
        </v-col>
        <v-col cols="6" md="1.5">
          <v-text-field v-model="branding.province" label="Province" variant="outlined" density="compact" />
        </v-col>
        <v-col cols="6" md="1.5">
          <v-text-field v-model="branding.postalCode" label="Postal Code" variant="outlined" density="compact" />
        </v-col>
      </v-row>

      <v-divider class="my-6" />

      <!-- Brokerage -->
      <div class="text-overline font-weight-bold text-slate-400 tracking-widest mb-4">BROKERAGE</div>
      <v-row dense class="mb-2">
        <v-col cols="12" md="6">
          <v-text-field v-model="branding.brokerageName" label="Brokerage Name" variant="outlined" density="compact" />
        </v-col>
        <v-col cols="12" md="6">
          <div class="brand-upload-card">
            <div class="brand-upload-card__label">Brokerage Logo</div>
            <div v-if="branding.brokerageLogoUrl" class="brand-upload-card__preview">
              <img :src="branding.brokerageLogoUrl" alt="Brokerage logo" class="brand-upload-card__img brand-upload-card__img--logo" />
              <v-btn variant="text" color="error" size="x-small" icon="mdi-close-circle" class="brand-upload-card__remove" @click="branding.brokerageLogoUrl = ''" />
            </div>
            <v-file-input v-model="brokerageLogoFile" label="Upload brokerage logo" accept="image/*" show-size prepend-icon="" prepend-inner-icon="mdi-domain" variant="outlined" density="compact" hide-details @update:model-value="uploadBrokerageLogo" />
          </div>
        </v-col>
      </v-row>

      <v-divider class="my-6" />

      <!-- Social Links -->
      <div class="text-overline font-weight-bold text-slate-400 tracking-widest mb-4">SOCIAL LINKS</div>
      <v-row v-for="(link, i) in branding.socialLinks" :key="i" dense class="mb-2">
        <v-col cols="12" md="4">
          <v-text-field v-model="link.name" label="Name" variant="outlined" density="compact" placeholder="e.g. Instagram" />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field v-model="link.url" label="URL" variant="outlined" density="compact" placeholder="https://..." prepend-inner-icon="mdi-link" />
        </v-col>
        <v-col cols="12" md="2" class="d-flex align-center">
          <v-btn icon="mdi-delete" variant="text" color="error" size="small" @click="branding.socialLinks.splice(i, 1)" />
        </v-col>
      </v-row>
      <v-btn variant="tonal" size="small" prepend-icon="mdi-plus" @click="branding.socialLinks.push({ icon: '', name: '', url: '' })" class="mb-6">Add Social Link</v-btn>

      <v-divider class="my-6" />

      <!-- Homepage Hero Stats -->
      <div class="text-overline font-weight-bold text-slate-400 tracking-widest mb-4">HOMEPAGE STATS</div>
      <v-row dense class="mb-6">
        <v-col cols="12" md="4">
          <v-text-field
            v-model.number="branding.awardsCount"
            type="number"
            min="0"
            label="Awards Won"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-trophy-variant-outline"
            hint="Shown on the homepage hero (e.g. 100 → '100+'). Properties &amp; Clients are computed automatically."
            persistent-hint
          />
        </v-col>
      </v-row>

      <v-divider class="my-6" />

      <!-- Footer / Legal -->
      <div class="text-overline font-weight-bold text-slate-400 tracking-widest mb-4">FOOTER &amp; LEGAL</div>
      <v-row dense class="mb-2">
        <v-col cols="12" md="6">
          <v-text-field v-model="branding.copyrightName" label="Copyright Name" variant="outlined" density="compact" hint="e.g. DeelBot" persistent-hint />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field v-model="branding.primaryColor" label="Primary Color" variant="outlined" density="compact" prepend-inner-icon="mdi-palette" hint="Hex color, e.g. #1976D2" persistent-hint />
        </v-col>
      </v-row>
      <v-row dense class="mb-2">
        <v-col cols="12" md="6">
          <v-text-field v-model="branding.developerName" label="Developer Name" variant="outlined" density="compact" hint="'Developed by' credit in footer" persistent-hint />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field v-model="branding.developerUrl" label="Developer URL" variant="outlined" density="compact" prepend-inner-icon="mdi-link" />
        </v-col>
      </v-row>
      <v-row dense>
        <v-col cols="12">
          <v-textarea v-model="branding.footerDisclaimer" label="Footer Disclaimer" variant="outlined" density="compact" rows="3" hint="Legal disclaimer text shown at the bottom of every page" persistent-hint />
        </v-col>
      </v-row>
    </v-card-text>
    <v-divider />
    <v-card-actions class="p-6">
      <v-spacer />
      <v-btn variant="tonal" @click="loadBranding" :loading="loading">Reset</v-btn>
      <v-btn color="primary" variant="flat" prepend-icon="mdi-content-save" @click="saveBranding" :loading="brandingSaving" class="action-btn-primary px-8">Save Branding</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
// @ts-ignore
import { api } from '~/utils/api'
import { useTenantSettings } from '~/composables/useTenantSettings'

const { refresh: refreshTenantSettings } = useTenantSettings()

const branding = reactive({
  businessName: '',
  tagline: '',
  logoUrl: '',
  faviconUrl: '',
  primaryColor: '#1976D2',
  phone: '',
  email: '',
  address: '',
  city: '',
  province: '',
  postalCode: '',
  socialLinks: [] as Array<{ icon: string; name: string; url: string }>,
  brokerageName: '',
  brokerageLogoUrl: '',
  footerDisclaimer: '',
  copyrightName: '',
  developerName: '',
  developerUrl: '',
  awardsCount: null as number | null,
})

const logoFile = ref<File | null>(null)
const faviconFile = ref<File | null>(null)
const brokerageLogoFile = ref<File | null>(null)
/** True when the saved logoUrl failed to load (e.g. file missing on server after redeploy). */
const siteLogoMissingFile = ref(false)

const siteLogoDisplay = computed(() => {
  if (siteLogoMissingFile.value) return '/images/logos/deelbot.png'
  return branding.logoUrl || '/images/logos/deelbot.png'
})
const faviconPreview = computed(() => branding.faviconUrl || '/favicon.ico')
const loading = ref(false)
const brandingSaving = ref(false)
const saved = ref(false)
const error = ref('')

watch(
  () => branding.logoUrl,
  () => {
    siteLogoMissingFile.value = false
  },
)

function onSiteLogoImgError() {
  if (!branding.logoUrl) return
  siteLogoMissingFile.value = true
  error.value =
    'The logo file stored for this site could not be loaded. Upload a new logo below, or remove the saved URL to use the default.'
}

async function removeSiteLogo() {
  branding.logoUrl = ''
  siteLogoMissingFile.value = false
  error.value = ''
  await saveBranding()
  await refreshTenantSettings()
}

async function loadBranding() {
  loading.value = true
  siteLogoMissingFile.value = false
  try {
    const data: any = await api.get('/api/admin/tenant-settings')
    Object.assign(branding, {
      businessName: data.businessName || '',
      tagline: data.tagline || '',
      logoUrl: data.logoUrl || '',
      faviconUrl: data.faviconUrl || '',
      primaryColor: data.primaryColor || '#1976D2',
      phone: data.phone || '',
      email: data.email || '',
      address: data.address || '',
      city: data.city || '',
      province: data.province || '',
      postalCode: data.postalCode || '',
      socialLinks: Array.isArray(data.socialLinks) ? data.socialLinks : [],
      brokerageName: data.brokerageName || '',
      brokerageLogoUrl: data.brokerageLogoUrl || '',
      footerDisclaimer: data.footerDisclaimer || '',
      copyrightName: data.copyrightName || '',
      developerName: data.developerName || '',
      developerUrl: data.developerUrl || '',
      awardsCount: data.awardsCount ?? null,
    })
  } catch (e: any) {
    console.error('Failed to load branding:', e)
  } finally {
    loading.value = false
  }
}

async function saveBranding() {
  brandingSaving.value = true
  saved.value = false
  error.value = ''
  try {
    await api.post('/api/admin/tenant-settings', { ...branding })
    saved.value = true
    await refreshTenantSettings()
  } catch (e: any) {
    error.value = e?.message || 'Failed to save branding'
  } finally {
    brandingSaving.value = false
  }
}

async function uploadImageField(file: File, asset: 'favicon' | 'brokerage') {
  try {
    const formData = new FormData()
    formData.append('logo', file)
    formData.append('asset', asset)
    const res: any = await api.post('/api/admin/tenant-settings/upload-logo', formData)
    if (asset === 'favicon' && res?.faviconUrl) {
      branding.faviconUrl = res.faviconUrl
      await saveBranding()
    } else if (asset === 'brokerage' && res?.brokerageLogoUrl) {
      branding.brokerageLogoUrl = res.brokerageLogoUrl
      await saveBranding()
    }
  } catch (e: any) {
    error.value = `Failed to upload ${asset}`
  }
}

async function uploadLogo(file: File | File[] | null) {
  if (!file || Array.isArray(file)) return
  try {
    const formData = new FormData()
    formData.append('logo', file)
    formData.append('asset', 'logo')
    const res: any = await api.post('/api/admin/tenant-settings/upload-logo', formData)
    if (res?.logoUrl) {
      branding.logoUrl = res.logoUrl
      siteLogoMissingFile.value = false
      await saveBranding()
    }
  } catch (e: any) {
    error.value = 'Failed to upload logo'
  } finally {
    logoFile.value = null
  }
}

async function uploadFavicon(file: File | File[] | null) {
  if (!file || Array.isArray(file)) return
  await uploadImageField(file, 'favicon')
  faviconFile.value = null
}

async function uploadBrokerageLogo(file: File | File[] | null) {
  if (!file || Array.isArray(file)) return
  await uploadImageField(file, 'brokerage')
  brokerageLogoFile.value = null
}

onMounted(() => loadBranding())
</script>
