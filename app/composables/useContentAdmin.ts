import { ref, reactive, computed } from 'vue'
// @ts-ignore
import { api } from '~/utils/api'

export function useContentAdmin() {
  const { showError } = useAlert()

  const search = ref('')
  const selectedSection = ref<string | null>(null)
  const showAddContentDialog = ref(false)
  const editingContent = ref(false)
  const saving = ref(false)
  const contentSections = ref<any[]>([])
  const contentItems = ref<any[]>([])

  const contentForm = reactive<any>({
    title: '',
    key: '',
    section: 'home',
    type: 'text',
    content: '',
    published: true,
    file: null,
    uploadedImages: null,
    metadata: {
      author: '',
      position: '',
      icon: '',
      imagePaths: []
    }
  })

  const pageSections = [
    { id: 'home', label: 'Home Page' },
    { id: 'about', label: 'About Us' },
    { id: 'testimonials', label: 'Testimonials' }
  ]

  const contentTypes = [
    { title: 'Hero', value: 'hero' },
    { title: 'Hero Title', value: 'hero-title' },
    { title: 'Hero Subtitle', value: 'hero-subtitle' },
    { title: 'Why Choose Us Section', value: 'why-choose-us' },
    { title: 'Why Choose Us Item', value: 'why-choose-us-item' },
    { title: 'Text', value: 'text' },
    { title: 'HTML', value: 'html' },
    { title: 'Image', value: 'image' },
    { title: 'Testimonial', value: 'testimonial' }
  ]

  const pageKeyOptions: Record<string, Array<{ title: string, value: string }>> = {
    home: [
      { title: 'Hero (image banner)', value: 'hero' },
      { title: 'Hero Title', value: 'hero-title' },
      { title: 'Hero Subtitle', value: 'hero-subtitle' },
      { title: 'Why Choose Us (section title)', value: 'why-choose-us' },
      { title: 'Why Choose Us Item', value: 'why-choose-us-item' }
    ],
    about: [
      { title: 'Hero Title', value: 'about.hero.title' },
      { title: 'Hero Subtitle', value: 'about.hero.subtitle' },
      { title: 'Hero Description', value: 'about.hero.description' },
      { title: 'Hero Image (profile photo)', value: 'about.hero.image' },
      { title: 'Story Title', value: 'about.story.title' },
      { title: 'Story Author Name', value: 'about.story.name' },
      { title: 'Story Author Role / Title', value: 'about.story.role' },
      { title: 'Story Content (HTML)', value: 'about.story.content' },
      { title: 'Core Value 1', value: 'about.values.1' },
      { title: 'Core Value 2', value: 'about.values.2' },
      { title: 'Core Value 3', value: 'about.values.3' },
      { title: 'Stat 1', value: 'about.stats.1' },
      { title: 'Stat 2', value: 'about.stats.2' },
      { title: 'Stat 3', value: 'about.stats.3' },
      { title: 'Stat 4', value: 'about.stats.4' },
      { title: 'Connect Heading', value: 'about.connect.heading' },
      { title: 'Connect Description', value: 'about.connect.description' },
      { title: 'CTA Area Names', value: 'about.cta.areas' },
      { title: 'CTA Title', value: 'about.cta.title' },
      { title: 'CTA Subtitle', value: 'about.cta.subtitle' },
      { title: 'CTA Background Image', value: 'about.cta.image' },
      { title: 'Meta Title (SEO)', value: 'about.meta.title' },
      { title: 'Meta Description (SEO)', value: 'about.meta.description' },
    ],
    testimonials: [
      { title: 'Testimonial Item', value: 'testimonial' }
    ]
  }

  // Tenant-agnostic placeholder content seeded on first CMS visit. Each
  // tenant fills these in via the admin UI; nothing here may reference
  // a specific person, brokerage, neighborhood, or bio. (A previous
  // version seeded the SaaS owner's personal bio + photo into every new
  // tenant's CMS, leaking owner content cross-tenant.)
  const aboutDefaults: Array<{ key: string; title: string; type: string; content: string; metadata?: Record<string, any> }> = [
    { key: 'about.hero.title', title: 'Hero Title', type: 'text', content: 'ABOUT.' },
    { key: 'about.hero.subtitle', title: 'Hero Subtitle', type: 'text', content: 'Passionate about helping you find your perfect home.' },
    { key: 'about.hero.description', title: 'Hero Description', type: 'text', content: 'Providing excellence in real estate services with a personalized approach.' },
    { key: 'about.hero.image', title: 'Hero Image (Profile Photo)', type: 'image', content: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=800&auto=format&fit=crop' },
    { key: 'about.story.title', title: 'Story Title', type: 'text', content: 'Your Trusted Real Estate Professional' },
    { key: 'about.story.name', title: 'Story Author Name', type: 'text', content: '' },
    { key: 'about.story.role', title: 'Story Author Role / Title', type: 'text', content: '' },
    { key: 'about.story.content', title: 'Story Content (HTML)', type: 'hero-title', content: '<p>Tell visitors about yourself, your background, and what makes your real estate practice unique. Edit this section in the CMS to add your personal story.</p>' },
    { key: 'about.values.1', title: 'Work Hard', type: 'text', content: 'Dedicated to finding you your perfect home.', metadata: { icon: 'mdi-hammer-wrench' } },
    { key: 'about.values.2', title: 'Live Well', type: 'text', content: 'The right home is essential to living well.', metadata: { icon: 'mdi-home-heart' } },
    { key: 'about.values.3', title: 'Give Back', type: 'text', content: 'A great home gives back to your life every day.', metadata: { icon: 'mdi-hand-heart' } },
    { key: 'about.connect.heading', title: 'Connect Heading', type: 'text', content: 'Connect With Me' },
    { key: 'about.connect.description', title: 'Connect Description', type: 'text', content: 'Reach out through your preferred channel or scan the QR code to save my contact details.' },
    { key: 'about.cta.areas', title: 'CTA Area Names', type: 'text', content: '' },
    { key: 'about.cta.title', title: 'CTA Title', type: 'text', content: 'Ready to Find Your Dream Home?' },
    { key: 'about.cta.subtitle', title: 'CTA Subtitle', type: 'text', content: "Let's work together to make your real estate goals a reality." },
    { key: 'about.cta.image', title: 'CTA Background Image', type: 'image', content: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop' },
    { key: 'about.meta.title', title: 'Meta Title (SEO)', type: 'text', content: 'About | Real Estate Expert' },
    { key: 'about.meta.description', title: 'Meta Description (SEO)', type: 'text', content: 'Learn about your trusted real estate professional.' },
  ]

  // ── Computed ──

  const keyOptions = computed(() => pageKeyOptions[contentForm.section] || [])

  const isImageContent = computed(() => {
    const key = contentForm.key || ''
    const type = contentForm.type || ''
    return type === 'image' || key === 'hero' || key === 'image' || key.endsWith('.image')
  })

  const getCurrentSection = computed(() => {
    return contentSections.value.find(s => s.id === selectedSection.value)
  })

  const filteredContent = computed(() => {
    let items = contentItems.value
    if (selectedSection.value) {
      items = items.filter(item => item.section === selectedSection.value)
    }
    if (search.value) {
      const s = search.value.toLowerCase()
      items = items.filter(item =>
        item.title.toLowerCase().includes(s) || item.key.toLowerCase().includes(s)
      )
    }
    return items
  })

  // ── Methods ──

  function resetForm() {
    Object.assign(contentForm, {
      title: '',
      key: '',
      section: 'home',
      type: 'text',
      content: '',
      published: true,
      file: null,
      uploadedImages: null,
      metadata: { author: '', position: '', icon: '', imagePaths: [] }
    })
  }

  function openAddContentDialog() {
    resetForm()
    editingContent.value = false
    showAddContentDialog.value = true
  }

  function cancelForm() {
    showAddContentDialog.value = false
    editingContent.value = false
    resetForm()
  }

  async function selectSection(sectionId: string) {
    selectedSection.value = sectionId
    if (sectionId === 'branding') return
    try {
      const items = await api.get(`/api/admin/content?section=${sectionId}`)
      contentItems.value = items as any[]
      const sec = contentSections.value.find(s => s.id === sectionId)
      if (sec) sec.items = contentItems.value.length
      if (sectionId === 'about' && contentItems.value.length === 0) {
        await seedAboutDefaults()
      }
    } catch (e) {
      console.error(e)
    }
  }

  function editContent(item: any) {
    editingContent.value = true
    const metadata = item.metadata || {}
    Object.assign(contentForm, {
      ...item,
      file: null,
      uploadedImages: null,
      metadata: { ...metadata, imagePaths: metadata.imagePaths || [] }
    })
    showAddContentDialog.value = true
  }

  /**
   * Pull a human-readable error message out of an h3/$fetch error.
   * Without this, every backend failure surfaced as a silent console.error
   * and the user just thought "the site doesn't save my content".
   */
  function describeError(e: any, fallback: string): string {
    return (
      e?.data?.statusMessage ||
      e?.data?.message ||
      e?.statusMessage ||
      e?.message ||
      fallback
    )
  }

  async function togglePublished(item: any) {
    try {
      await api.post(`/api/admin/content/${item.id}/toggle-published`, {})
      item.published = !item.published
    } catch (e) {
      console.error(e)
      showError(describeError(e, 'Could not change the published state.'), 'Action Failed')
    }
  }

  async function duplicateContent(item: any) {
    try {
      const newItem = await api.post(`/api/admin/content/${item.id}/duplicate`, {})
      contentItems.value.push(newItem as any)
    } catch (e) {
      console.error(e)
      showError(describeError(e, 'Could not duplicate this content block.'), 'Action Failed')
    }
  }

  async function deleteContent(item: any) {
    if (!confirm('Are you sure you want to delete this content?')) return
    try {
      await api.delete(`/api/admin/content/${item.id}`)
      contentItems.value = contentItems.value.filter(i => i.id !== item.id)
    } catch (e) {
      console.error(e)
      showError(describeError(e, 'Could not delete this content block.'), 'Action Failed')
    }
  }

  async function handleContentImageUpload(file: File | File[] | null) {
    if (!file || Array.isArray(file)) return
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res: any = await api.post('/api/admin/content/upload', formData)
      if (res?.url) contentForm.content = res.url
    } catch (e: any) {
      console.error('Image upload failed:', e)
      showError(describeError(e, 'The image could not be uploaded.'), 'Upload Failed')
    } finally {
      contentForm.file = null
    }
  }

  async function uploadAboutImages(files: File | File[] | null) {
    if (!files) return
    const fileArray = Array.isArray(files) ? files : [files]
    if (fileArray.length === 0) return
    try {
      const formData = new FormData()
      fileArray.forEach((file, index) => {
        formData.append(`image${index}`, file)
      })
      const response: any = await api.post('/api/admin/content/upload-about-images', formData)
      if (response?.images) {
        const existingPaths = contentForm.metadata?.imagePaths || []
        contentForm.metadata.imagePaths = [...existingPaths, ...response.images]
      }
    } catch (e) {
      console.error('Failed to upload images:', e)
      showError('Please check your internet connection and try again.', 'Failed to Upload Images')
    }
  }

  async function saveContent() {
    saving.value = true
    try {
      const dataToSend = {
        title: contentForm.title,
        key: contentForm.key || contentForm.type,
        type: contentForm.type,
        section: contentForm.section,
        content: contentForm.content,
        published: contentForm.published,
        metadata: contentForm.metadata
      }

      const formData = new FormData()
      formData.append('data', JSON.stringify(dataToSend))

      if (contentForm.file && ['hero', 'image'].includes(contentForm.key || contentForm.type)) {
        try {
          const imgForm = new FormData()
          imgForm.append('image', contentForm.file)
          const uploadRes: any = await api.post('/api/admin/content/upload', imgForm)
          if (uploadRes?.url) contentForm.content = uploadRes.url
        } catch (e) {
          console.error('Image upload failed:', e)
        }
      }

      const endpoint = editingContent.value
        ? `/api/admin/content/${contentForm.id}`
        : '/api/admin/content'

      const saved = editingContent.value
        ? await api.put(endpoint, formData)
        : await api.post(endpoint, formData)

      if (editingContent.value) {
        const idx = contentItems.value.findIndex(i => i.id === (saved as any).id)
        if (idx !== -1) contentItems.value[idx] = saved as any
      } else {
        contentItems.value.push(saved as any)
      }

      showAddContentDialog.value = false
      editingContent.value = false
      resetForm()

      try {
        const items = await api.get(`/api/admin/content?section=${selectedSection.value}`)
        contentItems.value = items as any[]
      } catch {}
    } catch (e) {
      console.error('Save failed:', e)
      showError(describeError(e, 'Unknown error occurred'), 'Save Failed')
    } finally {
      saving.value = false
    }
  }

  async function seedAboutDefaults() {
    const promises = aboutDefaults.map(item =>
      api.post('/api/admin/content', {
        key: item.key,
        title: item.title,
        type: item.type,
        section: 'about',
        content: item.content,
        published: true,
        metadata: { section: 'about', published: true, ...(item.metadata || {}) },
      })
    )
    await Promise.all(promises)
    const items = await api.get('/api/admin/content?section=about')
    contentItems.value = items as any[]
    const sec = contentSections.value.find(s => s.id === 'about')
    if (sec) sec.items = contentItems.value.length
  }

  async function initialize() {
    try {
      const sections = await api.get('/api/admin/content/sections')
      const brandingSection = {
        id: 'branding', title: 'Site Branding', icon: 'mdi-palette-swatch',
        items: 0, hasUnpublished: false
      }
      const defaults = [
        brandingSection,
        { id: 'home', title: 'Home Page', icon: 'mdi-home', items: 0, hasUnpublished: false },
        { id: 'about', title: 'About Us', icon: 'mdi-information', items: 0, hasUnpublished: false },
        { id: 'testimonials', title: 'Testimonials', icon: 'mdi-account-voice', items: 0, hasUnpublished: false }
      ]
      const apiSections = (sections as any[])?.length ? (sections as any[]) : defaults
      contentSections.value = [brandingSection, ...apiSections.filter((s: any) => s.id !== 'branding')]

      if (!selectedSection.value && contentSections.value.length) {
        selectedSection.value = contentSections.value[0].id
      }

      if (selectedSection.value && selectedSection.value !== 'branding') {
        await selectSection(selectedSection.value)
      }
    } catch (e) {
      console.error('Error loading content data:', e)
      contentSections.value = [
        { id: 'branding', title: 'Site Branding', icon: 'mdi-palette-swatch', items: 0, hasUnpublished: false },
        { id: 'home', title: 'Home Page', icon: 'mdi-home', items: 0, hasUnpublished: false },
        { id: 'about', title: 'About Us', icon: 'mdi-information', items: 0, hasUnpublished: false },
        { id: 'testimonials', title: 'Testimonials', icon: 'mdi-account-voice', items: 0, hasUnpublished: false }
      ]
      selectedSection.value = 'branding'
    }
  }

  return {
    search,
    selectedSection,
    showAddContentDialog,
    editingContent,
    saving,
    contentSections,
    contentItems,
    contentForm,
    pageSections,
    contentTypes,
    keyOptions,
    isImageContent,
    getCurrentSection,
    filteredContent,
    openAddContentDialog,
    cancelForm,
    selectSection,
    editContent,
    togglePublished,
    duplicateContent,
    deleteContent,
    handleContentImageUpload,
    uploadAboutImages,
    saveContent,
    initialize,
  }
}
