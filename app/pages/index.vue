<template>
  <div v-if="loading" class="d-flex align-center justify-center" style="min-height: 100vh;">
    <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
  </div>
  <component 
    v-else
    :key="`template-${activeTemplate}`"
    :is="activeTemplateComponent"
    :featured-properties="featuredProperties"
    :hero-image="heroImage"
    :featured-testimonials="featuredTestimonials"
    :total-users="totalUsers"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import HomeTemplate1 from '~/components/home-templates/HomeTemplate1.vue'
import HomeTemplate2 from '~/components/home-templates/HomeTemplate2.vue'

const { businessName, adminFullName } = useTenantSettings()
useSeoMeta({
  title: () => businessName.value || 'Real Estate',
  ogTitle: () => businessName.value || 'Real Estate',
  description: () => `${adminFullName.value || 'Your trusted REALTOR'} — search homes, get market insights, and find your dream property.`,
  ogDescription: () => `${adminFullName.value || 'Your trusted REALTOR'} — search homes, get market insights, and find your dream property.`,
})
import HomeTemplate3 from '~/components/home-templates/HomeTemplate3.vue'
import HomeTemplate4 from '~/components/home-templates/HomeTemplate4.vue'
import HomeTemplate5 from '~/components/home-templates/HomeTemplate5.vue'

const loading = ref(true)
const activeTemplate = ref(1)
const featuredProperties = ref<any[]>([])
const heroImage = ref<string>('')
const featuredTestimonials = ref<any[]>([])
const totalUsers = ref<number>(0)

// Template components mapping
const templateComponents: Record<number, any> = {
  1: HomeTemplate1,
  2: HomeTemplate2,
  3: HomeTemplate3,
  4: HomeTemplate4,
  5: HomeTemplate5
}

const activeTemplateComponent = computed(() => {
  const component = templateComponents[activeTemplate.value] || HomeTemplate1
  console.log(`🎨 Rendering template component: Template ${activeTemplate.value}`)
  return component
})

onMounted(async () => {
  try {
    // Load active template - add cache busting to ensure fresh data
    const templateData = await $fetch('/api/settings/home-template', {
      query: { _t: Date.now() } // Cache busting
    })
    console.log('📄 Template API response:', templateData)
    const templateNumber = templateData?.template ? Number(templateData.template) : 1
    console.log('📄 Parsed template number:', templateNumber, 'Type:', typeof templateNumber)
    activeTemplate.value = templateNumber
    console.log('📄 Set activeTemplate.value to:', activeTemplate.value)
  } catch (error) {
    console.error('❌ Failed to load template setting:', error)
    activeTemplate.value = 1
  }

  // Load Stats
  try {
    const stats = await $fetch('/api/stats')
    if (stats?.totalUsers) totalUsers.value = stats.totalUsers
  } catch {}

  // Load Properties
  try {
    const response = await $fetch('/api/properties?limit=10&status=for_sale')
    featuredProperties.value = Array.isArray(response) ? response : response?.properties || []
  } catch {}
  
  // Load Testimonials
  try {
    const testimonials = await $fetch('/api/testimonials?limit=10')
    featuredTestimonials.value = testimonials || []
  } catch {}

  loading.value = false
})
</script>