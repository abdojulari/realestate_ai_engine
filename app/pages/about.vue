<template>
  <div v-if="loading" class="d-flex align-center justify-center" style="min-height: 100vh;">
    <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
  </div>
  <component
    v-else
    :key="`about-template-${activeTemplate}`"
    :is="activeTemplateComponent"
    :hero-title="heroTitle"
    :hero-subtitle="heroSubtitle"
    :hero-description="heroDescription"
    :profile-image="profileImage"
    :story-title="storyTitle"
    :story-name="storyName"
    :story-role="storyRole"
    :story-content="storyContent"
    :story-content-default="storyContentDefault"
    :connect-heading="connectHeading"
    :connect-description="connectDescription"
    :core-values="coreValues"
    :stats="stats"
    :cta-areas="ctaAreas"
    :cta-title="ctaTitle"
    :cta-subtitle="ctaSubtitle"
    :cta-image="ctaImage"
    :contact-phone="contactPhone"
    :contact-email="contactEmailDisplay"
    :qr-code-url="qrCodeUrl"
    :social-links="tenantSocialLinks"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AboutTemplate1 from '~/components/about-templates/AboutTemplate1.vue'
import AboutTemplate2 from '~/components/about-templates/AboutTemplate2.vue'
import AboutTemplate3 from '~/components/about-templates/AboutTemplate3.vue'
import AboutTemplate4 from '~/components/about-templates/AboutTemplate4.vue'
import AboutTemplate5 from '~/components/about-templates/AboutTemplate5.vue'

const { phone, contactEmail: tenantEmail, socialLinks: tenantSocialLinks } = useTenantSettings()

// Generic, tenant-agnostic defaults. Per-tenant personalization (agent
// bio, photo, target neighborhoods, etc.) MUST come from the CMS via
// /api/content/page/about — never from hardcoded owner-email gates.
// A previous version branched on `OWNER_EMAILS` to inject a personal
// bio when the tenant's adminEmail matched the SaaS owner's, but that
// also fires on any tenant the SaaS owner provisions, leaking owner
// content to other tenants (e.g. tonahomes showing aohomes's bio).
const GENERIC_DEFAULTS = {
  heroTitle: 'ABOUT.',
  heroSubtitle: 'Passionate about helping you find your perfect home.',
  heroDescription: 'Providing excellence in real estate services with a personalized approach.',
  profileImage: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=800&auto=format&fit=crop',
  storyTitle: 'Your Trusted Real Estate Professional',
  storyName: '',
  storyRole: '',
  storyContent: '',
  storyContentDefault: '',
  connectHeading: 'Connect With Me',
  connectDescription: 'Reach out through your preferred channel or scan the QR code to save my contact details.',
  ctaAreas: '',
  ctaTitle: 'Ready to Find Your Dream Home?',
  ctaSubtitle: "Let's work together to make your real estate goals a reality.",
  ctaImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop',
  metaTitle: 'About | Real Estate Expert',
  metaDescription: 'Learn about your trusted real estate professional.',
  defaultValues: [
    { key: 'work-hard', title: 'Work Hard', description: 'Dedicated to finding you your perfect home.', icon: 'mdi-hammer-wrench' },
    { key: 'live-well', title: 'Live Well', description: 'The right home is essential to living well.', icon: 'mdi-home-heart' },
    { key: 'give-back', title: 'Give Back', description: 'A great home gives back to your life every day.', icon: 'mdi-hand-heart' },
  ],
}

// ── Template switching ──
const loading = ref(true)
const activeTemplate = ref(1)

const templateComponents: Record<number, any> = {
  1: AboutTemplate1,
  2: AboutTemplate2,
  3: AboutTemplate3,
  4: AboutTemplate4,
  5: AboutTemplate5,
}

const activeTemplateComponent = computed(() => templateComponents[activeTemplate.value] || AboutTemplate1)

// ── Reactive CMS state (initialised with generic defaults) ──
const heroTitle = ref('')
const heroSubtitle = ref('')
const heroDescription = ref('')
const profileImage = ref('')
const storyTitle = ref('')
const storyName = ref('')
const storyRole = ref('')
const storyContent = ref('')
const storyContentDefault = ref('')
const connectHeading = ref('')
const connectDescription = ref('')
const coreValues = ref<any[]>([])
const stats = ref<any[]>([])
const ctaAreas = ref('')
const ctaTitle = ref('')
const ctaSubtitle = ref('')
const ctaImage = ref('')
const metaTitle = ref('About | Real Estate Expert')
const metaDescription = ref('Learn about your trusted real estate professional.')

const contactPhone = computed(() => phone.value || '')
const contactEmailDisplay = computed(() => tenantEmail.value || '')

const qrCodeUrl = computed(() => {
  const name = encodeURIComponent(storyName.value || 'Agent')
  const tel = contactPhone.value.replace(/[^+\d]/g, '')
  const em = contactEmailDisplay.value
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=BEGIN:VCARD%0AVERSION:3.0%0AFN:${name}%0ATEL:${tel}%0AEMAIL:${em}%0AEND:VCARD`
})

function apply(item: any, target: Ref<string>) {
  if (item?.content) target.value = item.content
}

function applyDefaults(defaults: typeof GENERIC_DEFAULTS) {
  heroTitle.value = defaults.heroTitle
  heroSubtitle.value = defaults.heroSubtitle
  heroDescription.value = defaults.heroDescription
  profileImage.value = defaults.profileImage
  storyTitle.value = defaults.storyTitle
  storyName.value = defaults.storyName
  storyRole.value = defaults.storyRole
  storyContent.value = defaults.storyContent
  storyContentDefault.value = defaults.storyContentDefault
  connectHeading.value = defaults.connectHeading
  connectDescription.value = defaults.connectDescription
  ctaAreas.value = defaults.ctaAreas
  ctaTitle.value = defaults.ctaTitle
  ctaSubtitle.value = defaults.ctaSubtitle
  ctaImage.value = defaults.ctaImage
  metaTitle.value = defaults.metaTitle
  metaDescription.value = defaults.metaDescription
  coreValues.value = [...defaults.defaultValues]
}

onMounted(async () => {
  applyDefaults(GENERIC_DEFAULTS)

  // Load active template
  try {
    const templateData = await $fetch('/api/settings/about-template', { query: { _t: Date.now() } }) as any
    activeTemplate.value = templateData?.template ? Number(templateData.template) : 1
  } catch {
    activeTemplate.value = 1
  }

  // Load CMS content (overrides defaults)
  try {
    const pageData = await $fetch('/api/content/page/about') as any
    const items: any[] = pageData?.items || []

    const find = (key: string | string[]) => {
      const keys = Array.isArray(key) ? key : [key]
      return items.find(i => keys.includes(i.key))
    }

    apply(find('about.hero.title'), heroTitle)
    apply(find(['about.hero.subtitle', 'about-subtitle']), heroSubtitle)
    apply(find('about.hero.description'), heroDescription)
    apply(find(['about.hero.image', 'about-image']), profileImage)
    apply(find(['about.story.title', 'about-title']), storyTitle)
    apply(find('about.story.name'), storyName)
    apply(find('about.story.role'), storyRole)
    apply(find(['about.story.content', 'about-body']), storyContent)
    apply(find('about.connect.heading'), connectHeading)
    apply(find('about.connect.description'), connectDescription)
    apply(find('about.cta.areas'), ctaAreas)
    apply(find('about.cta.title'), ctaTitle)
    apply(find('about.cta.subtitle'), ctaSubtitle)
    apply(find('about.cta.image'), ctaImage)
    apply(find('about.meta.title'), metaTitle)
    apply(find('about.meta.description'), metaDescription)

    const valueItems = items.filter(i => i.key.startsWith('about.values.'))
    if (valueItems.length > 0) {
      coreValues.value = valueItems.map(item => ({
        key: item.key,
        title: item.title,
        description: item.content,
        icon: item.metadata?.icon || 'mdi-check-circle',
      }))
    }

    const statItems = items.filter(i => i.key.startsWith('about.stats.'))
    stats.value = statItems.map(item => ({ key: item.key, value: item.content, label: item.title }))
  } catch (error) {
    console.error('Error loading about content:', error)
  }

  loading.value = false
})

useSeoMeta({
  title: () => metaTitle.value || 'About',
  description: () => metaDescription.value || 'Learn about our team, values, and approach to real estate.',
  ogTitle: () => metaTitle.value || 'About',
  ogDescription: () => metaDescription.value || 'Learn about our team, values, and approach to real estate.',
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: () => metaTitle.value || 'About',
  twitterDescription: () => metaDescription.value || 'Learn about our team, values, and approach to real estate.',
  robots: 'index, follow',
})
</script>
