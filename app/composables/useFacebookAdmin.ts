import { ref } from 'vue'

export function getAuthHeaders(): Record<string, string> {
  if (process.client) {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }
  return {}
}

export function useFacebookAdmin() {
  const fbStatus = ref<any>({ connected: false, postStats: {} })
  const posts = ref<any[]>([])
  const availableProperties = ref<any[]>([])
  const publishing = ref(false)
  const savingDraft = ref(false)
  const postFilter = ref('all')
  const activeImageIndex = ref(0)
  const postError = ref('')
  const postSuccess = ref('')
  const clearing = ref(false)

  const templates = [
    { id: 'plain', label: 'Clean' },
    { id: 'glassmorphism', label: 'Frost' },
    { id: 'gradient', label: 'Vibrant' },
    { id: 'bold', label: 'Dark' },
    { id: 'minimal', label: 'Minimal' },
    { id: 'elegant', label: 'Classic' },
    { id: 'luxury', label: 'Luxury' },
    { id: 'magazine', label: 'Magazine' },
  ]
  const selectedTemplate = ref('plain')

  const colorPalette = [
    { label: 'Blue', value: '#1877F2' },
    { label: 'Orange', value: '#FF6B35' },
    { label: 'Red', value: '#E74C3C' },
    { label: 'Green', value: '#27AE60' },
    { label: 'Purple', value: '#8E44AD' },
    { label: 'Teal', value: '#1ABC9C' },
    { label: 'Gold', value: '#D4A537' },
    { label: 'Dark', value: '#2C3E50' },
  ]
  const selectedColor = ref('#1877F2')

  const postForm = ref({
    content: '', header: '', tagline: '', listingPrice: '',
    ctaText: '', contactInfo: '', link: '',
    propertyId: null as number | null, scheduledFor: '', postType: 'listing',
  })

  const postTypes = [
    { label: 'Property Listing', value: 'listing' },
    { label: 'Campaign / Promo', value: 'campaign' },
    { label: 'Custom Post', value: 'custom' },
  ]

  // ── Media ──
  const logoFile = ref<File | null>(null)
  const logoPreview = ref('')
  const imageFiles = ref<File[]>([])
  const imagePreviews = ref<string[]>([])
  const videoFile = ref<File | null>(null)
  const videoPreview = ref('')

  function onLogoChange(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0]
    if (!f) return
    logoFile.value = f
    logoPreview.value = URL.createObjectURL(f)
  }
  function removeLogo() { logoFile.value = null; logoPreview.value = '' }

  function onImagesChange(e: Event) {
    const files = (e.target as HTMLInputElement).files
    if (!files) return
    const remaining = 10 - imagePreviews.value.length
    for (let i = 0; i < Math.min(files.length, remaining); i++) {
      imageFiles.value.push(files[i]!)
      imagePreviews.value.push(URL.createObjectURL(files[i]!))
    }
    ;(e.target as HTMLInputElement).value = ''
  }
  function removeImage(idx: number) {
    imageFiles.value.splice(idx, 1)
    imagePreviews.value.splice(idx, 1)
    if (activeImageIndex.value >= imagePreviews.value.length)
      activeImageIndex.value = Math.max(0, imagePreviews.value.length - 1)
  }

  function onVideoChange(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0]
    if (!f) return
    videoFile.value = f
    videoPreview.value = URL.createObjectURL(f)
  }
  function removeVideo() { videoFile.value = null; videoPreview.value = '' }

  function populateFromProperty(prop: any) {
    postForm.value.propertyId = prop.id
    postForm.value.link = `${window.location.origin}/property/${prop.id}`

    const price = prop.price || 0
    const originalPrice = prop.firstEntryPrice || prop.priceDrop?.originalPrice
    const hasDeal = originalPrice && price && originalPrice > price
    const saved = hasDeal ? originalPrice - price : 0
    const dropPct = hasDeal ? ((saved / originalPrice) * 100).toFixed(1) : '0'
    const fmt = (n: number) => Math.round(n).toLocaleString()

    if (hasDeal) {
      postForm.value.header = `\u{1F525} PRICE REDUCED ${dropPct}% \u2014 ${prop.address || prop.title}`
      postForm.value.listingPrice = `$${fmt(price)}`
      postForm.value.tagline = `Was $${fmt(originalPrice)} \u2192 Now $${fmt(price)} | Save $${fmt(saved)}!`
      postForm.value.content = [
        `${prop.beds} bed \u00B7 ${prop.baths} bath \u00B7 ${prop.sqft?.toLocaleString() || ''} sqft`,
        `${prop.city ? prop.city + ', ' : ''}${prop.province || 'AB'}`,
        '',
        prop.description?.substring(0, 200) || '',
        '',
        `This property just dropped $${fmt(saved)} (${dropPct}%). Don\u2019t miss this opportunity!`,
      ].filter(Boolean).join('\n')
      postForm.value.ctaText = `Interested? Reach out before it\u2019s gone!`
    } else {
      postForm.value.header = prop.title || prop.address || ''
      postForm.value.listingPrice = price ? `$${fmt(price)}` : ''
      postForm.value.tagline = `${prop.beds} bed \u00B7 ${prop.baths} bath \u00B7 ${prop.sqft?.toLocaleString() || ''} sqft`
      postForm.value.content = prop.description?.substring(0, 300) || ''
    }

    const imgs = prop.images
    if (Array.isArray(imgs) && imgs.length > 0) {
      imagePreviews.value = imgs
        .map((img: any) => (typeof img === 'string' ? img : img.url || img.Uri))
        .filter(Boolean)
        .slice(0, 10)
    }
  }

  function onPropertySelected(id: number) {
    const prop = availableProperties.value.find((p: any) => p.id === id)
    if (prop) populateFromProperty(prop)
  }

  async function prefillProperty(propertyId: number) {
    try {
      const res = await $fetch(`/api/admin/properties/${propertyId}`, { headers: getAuthHeaders() }) as any
      const prop = res.property || res
      if (prop && prop.id) populateFromProperty(prop)
    } catch (e) {
      console.error('Failed to prefill property:', e)
    }
  }

  function buildFullContent(): string {
    const parts: string[] = []
    if (postForm.value.listingPrice) parts.push(postForm.value.listingPrice)
    if (postForm.value.header) parts.push(postForm.value.header)
    if (postForm.value.tagline) parts.push(postForm.value.tagline)
    if (postForm.value.content) parts.push(postForm.value.content)
    if (postForm.value.ctaText) parts.push(postForm.value.ctaText)
    if (postForm.value.contactInfo) parts.push(postForm.value.contactInfo)
    return parts.join('\n\n')
  }

  function resetForm() {
    Object.assign(postForm.value, {
      content: '', header: '', tagline: '', listingPrice: '',
      ctaText: '', contactInfo: '', link: '',
      propertyId: null, scheduledFor: '', postType: 'listing',
    })
    imagePreviews.value = []; imageFiles.value = []
    removeLogo(); removeVideo()
  }

  async function publishPost(templateImage: string | null = null) {
    if (!postForm.value.content && !postForm.value.header) return
    publishing.value = true
    postError.value = ''; postSuccess.value = ''
    try {
      const fullContent = buildFullContent()
      const res = await $fetch('/api/admin/facebook/posts', {
        method: 'POST', headers: getAuthHeaders(),
        body: {
          ...postForm.value,
          content: fullContent,
          templateImage,
          imageUrls: imagePreviews.value.filter(u => u.startsWith('http')),
        }
      }) as any
      if (res.success) {
        postSuccess.value = res.message || 'Posted successfully!'
        resetForm()
      } else {
        postError.value = res.message || 'Failed to post'
      }
      await loadPosts(); await loadStatus()
    } catch (e: any) {
      postError.value = e.data?.message || e.message || 'Failed to post'
    } finally {
      publishing.value = false
    }
  }

  async function saveDraft() {
    savingDraft.value = true
    try {
      const fullContent = buildFullContent()
      await $fetch('/api/admin/facebook/posts', {
        method: 'POST', headers: getAuthHeaders(),
        body: { ...postForm.value, content: fullContent, scheduledFor: undefined }
      })
      await loadPosts()
    } finally {
      savingDraft.value = false
    }
  }

  async function deletePost(id: number) {
    try {
      await $fetch(`/api/admin/facebook/posts?id=${id}`, { method: 'DELETE', headers: getAuthHeaders() })
      await loadPosts(); await loadStatus()
    } catch (e) { console.error('Delete failed:', e) }
  }

  async function clearAllPosts(): Promise<boolean> {
    clearing.value = true
    try {
      await $fetch('/api/admin/facebook/posts', { method: 'DELETE', headers: getAuthHeaders() })
      await loadPosts(); await loadStatus()
      return true
    } catch {
      return false
    } finally {
      clearing.value = false
    }
  }

  async function loadStatus() {
    try { fbStatus.value = await $fetch('/api/admin/facebook/status', { headers: getAuthHeaders() }) as any }
    catch (e) { console.error('Error loading FB status:', e) }
  }

  async function loadPosts() {
    try {
      const params = postFilter.value !== 'all' ? `?status=${postFilter.value}` : ''
      const res = await $fetch(`/api/admin/facebook/posts${params}`, { headers: getAuthHeaders() }) as any
      posts.value = res.posts || []
    } catch (e) { console.error('Error loading posts:', e) }
  }

  async function loadProperties() {
    try {
      const res = await $fetch('/api/admin/properties?limit=100', { headers: getAuthHeaders() }) as any
      availableProperties.value = (res.properties || []).map((p: any) => ({
        ...p, displayName: `${p.address}, ${p.city} - $${p.price?.toLocaleString()}`
      }))
    } catch (e) { console.error('Error loading properties:', e) }
  }

  async function initialize() {
    await Promise.all([loadStatus(), loadPosts(), loadProperties()])
  }

  return {
    fbStatus, posts, availableProperties, publishing, savingDraft,
    postFilter, activeImageIndex, postError, postSuccess, clearing,
    templates, selectedTemplate, colorPalette, selectedColor,
    postForm, postTypes,
    logoPreview, imagePreviews, videoPreview,
    onLogoChange, removeLogo, onImagesChange, removeImage, onVideoChange, removeVideo,
    onPropertySelected, prefillProperty, publishPost, saveDraft, deletePost, clearAllPosts,
    loadStatus, loadPosts, initialize,
  }
}
