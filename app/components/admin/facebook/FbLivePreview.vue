<template>
  <v-card class="section-card sticky-preview" elevation="0">
    <v-card-title class="pa-4 d-flex align-center">
      <v-icon size="small" class="mr-2">mdi-eye</v-icon>
      <span class="text-subtitle-1 font-weight-bold">Live Preview</span>
    </v-card-title>
    <v-divider class="opacity-10" />
    <v-card-text class="pa-4">
      <div class="fb-frame">
        <div class="d-flex align-center mb-3">
          <v-avatar size="36" color="#1877F2" class="mr-2">
            <v-icon size="18" color="white">mdi-facebook</v-icon>
          </v-avatar>
          <div>
            <div class="text-body-2 font-weight-bold">{{ pageName || 'Your Page' }}</div>
            <div class="text-caption text-medium-emphasis">Just now · <v-icon size="12">mdi-earth</v-icon></div>
          </div>
        </div>

        <!-- Template Render Area -->
        <div ref="templateRef" class="tpl" :class="'tpl--' + selectedTemplate" :style="getTemplateStyle()">
          <div v-if="logoPreview" class="tpl__logo-wrap">
            <img :src="logoPreview" class="tpl__logo" />
          </div>
          <div v-if="form.listingPrice" class="tpl__price" :style="{ color: headerColor }">{{ form.listingPrice }}</div>
          <div v-if="form.header" class="tpl__header" :style="{ color: headerColor }">{{ form.header }}</div>
          <div v-if="form.header || form.listingPrice" class="tpl__rule" :style="{ background: selectedColor }"></div>
          <div v-if="form.tagline" class="tpl__tagline" :style="{ color: taglineColor }">{{ form.tagline }}</div>

          <div v-if="imagePreviews.length" class="tpl__images">
            <div class="tpl__hero"><img :src="imagePreviews[activeImageIndex] || imagePreviews[0]" /></div>
            <div v-if="imagePreviews.length > 1" class="tpl__thumbstrip">
              <div
                v-for="(img, i) in imagePreviews.slice(0, 4)"
                :key="i"
                class="tpl__thumb"
                :class="{ 'tpl__thumb--active': i === activeImageIndex }"
                @click="$emit('update:activeImageIndex', i)"
              ><img :src="img" /></div>
            </div>
          </div>

          <div v-if="form.content" class="tpl__body" :style="{ color: bodyColor }">{{ form.content }}</div>
          <div v-if="form.ctaText" class="tpl__cta" :style="{ color: ctaColor }">{{ form.ctaText }}</div>
          <div v-if="form.contactInfo" class="tpl__contact" :style="contactStyle">&#9743;&ensp;{{ form.contactInfo }}</div>
          <div v-if="form.header || form.content" class="tpl__foot" :style="{ background: selectedColor }"></div>

          <div v-if="!form.header && !form.content && !imagePreviews.length" class="text-center py-8 text-medium-emphasis">
            <v-icon size="48" class="mb-2">mdi-image-text</v-icon>
            <div class="text-body-2">Start composing to see preview</div>
          </div>
        </div>

        <div v-if="form.link" class="fb-link-bar mt-2">
          <v-icon size="14" class="mr-1">mdi-link</v-icon>
          <span class="text-caption text-truncate">{{ form.link }}</span>
        </div>

        <div class="fb-reactions mt-3">
          <div class="d-flex ga-1">
            <span>👍</span><span>❤️</span><span>😮</span>
            <span class="text-caption text-medium-emphasis ml-1">0</span>
          </div>
          <div class="text-caption text-medium-emphasis">0 Comments · 0 Shares</div>
        </div>
        <v-divider class="my-2" />
        <div class="d-flex justify-space-around">
          <v-btn variant="text" size="small" prepend-icon="mdi-thumb-up-outline" class="text-medium-emphasis">Like</v-btn>
          <v-btn variant="text" size="small" prepend-icon="mdi-comment-outline" class="text-medium-emphasis">Comment</v-btn>
          <v-btn variant="text" size="small" prepend-icon="mdi-share-outline" class="text-medium-emphasis">Share</v-btn>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import html2canvas from 'html2canvas'

const props = defineProps<{
  form: any
  pageName: string
  selectedTemplate: string
  selectedColor: string
  logoPreview: string
  imagePreviews: string[]
  activeImageIndex: number
}>()

defineEmits<{ 'update:activeImageIndex': [i: number] }>()

const templateRef = ref<HTMLElement | null>(null)

async function captureTemplate(): Promise<string | null> {
  const el = templateRef.value
  if (!el) return null
  try {
    const canvas = await html2canvas(el, { scale: 3, useCORS: true, allowTaint: true, backgroundColor: null, logging: false })
    return canvas.toDataURL('image/jpeg', 0.92)
  } catch (e) {
    console.error('Failed to capture template:', e)
    return null
  }
}

defineExpose({ captureTemplate })

// ── Template style helpers ──
const t = computed(() => props.selectedTemplate)
const c = computed(() => props.selectedColor)

function getTemplateStyle() {
  switch (t.value) {
    case 'plain':
      return { background: '#ffffff', padding: '28px', borderRadius: '12px', border: '1px solid #e8e8e8' }
    case 'glassmorphism':
      return { background: `linear-gradient(135deg, ${c.value}15, ${c.value}08)`, backdropFilter: 'blur(20px)', padding: '28px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.4)', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }
    case 'gradient':
      return { background: `linear-gradient(135deg, ${c.value}ee, ${c.value}aa, ${c.value}88)`, padding: '32px', borderRadius: '18px', color: '#fff', boxShadow: `0 8px 32px ${c.value}44` }
    case 'bold':
      return { background: 'linear-gradient(155deg, #0d0d0d 0%, #1a1a2e 50%, #0d0d0d 100%)', padding: '32px', borderRadius: '14px', color: '#fff' }
    case 'minimal':
      return { background: '#fafafa', padding: '32px', borderRadius: '6px', border: `1.5px solid ${c.value}30` }
    case 'elegant':
      return { background: 'linear-gradient(180deg, #faf8f5, #f5f0ea)', padding: '32px', borderRadius: '12px', borderBottom: `4px solid ${c.value}` }
    case 'luxury':
      return { background: 'linear-gradient(155deg, #1a1a2e 0%, #16213e 35%, #0f3460 70%, #1a1a2e 100%)', padding: '32px', borderRadius: '16px', color: '#f0e6d3', boxShadow: '0 12px 40px rgba(0,0,0,0.35)', border: '1px solid rgba(212,165,55,0.2)' }
    case 'magazine':
      return { background: '#ffffff', padding: '28px 28px 28px 36px', borderRadius: '8px', borderLeft: `6px solid ${c.value}`, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }
    default:
      return {}
  }
}

const headerColor = computed(() => {
  if (t.value === 'gradient' || t.value === 'bold') return '#fff'
  if (t.value === 'elegant') return '#2c2c2c'
  if (t.value === 'luxury') return '#d4a537'
  return c.value
})

const taglineColor = computed(() => {
  if (t.value === 'gradient' || t.value === 'bold') return 'rgba(255,255,255,0.8)'
  if (t.value === 'luxury') return 'rgba(212,165,55,0.7)'
  return '#666'
})

const bodyColor = computed(() => {
  if (t.value === 'gradient' || t.value === 'bold') return 'rgba(255,255,255,0.9)'
  if (t.value === 'luxury') return '#f0e6d3cc'
  return '#444'
})

const ctaColor = computed(() => {
  if (t.value === 'gradient' || t.value === 'bold') return '#fff'
  if (t.value === 'luxury') return '#d4a537'
  return c.value
})

const contactStyle = computed((): Record<string, string> => {
  const base: Record<string, string> = { padding: '10px 16px', marginTop: '14px', fontSize: '13px', fontWeight: '500', textAlign: 'center' }
  switch (t.value) {
    case 'gradient':      return { ...base, background: 'rgba(255,255,255,0.18)', color: '#fff', borderRadius: '8px' }
    case 'bold':          return { ...base, background: c.value, color: '#fff', borderRadius: '8px', fontWeight: '600' }
    case 'luxury':        return { ...base, background: 'rgba(212,165,55,0.12)', color: '#d4a537', borderRadius: '8px', border: '1px solid rgba(212,165,55,0.3)', letterSpacing: '0.5px' }
    case 'glassmorphism': return { ...base, background: 'rgba(255,255,255,0.2)', color: '#333', borderRadius: '8px', backdropFilter: 'blur(4px)' }
    case 'magazine':      return { ...base, background: c.value + '0d', color: c.value, borderRadius: '0', borderLeft: `3px solid ${c.value}`, fontWeight: '600', textAlign: 'left' }
    case 'elegant':       return { ...base, background: '#f5f0ea', color: '#5a4a3a', borderRadius: '8px' }
    default:              return { ...base, background: c.value + '0d', color: c.value, borderRadius: '8px' }
  }
})
</script>

<style scoped>
.sticky-preview { position: sticky; top: 80px; }

.fb-frame {
  background: #fff; border-radius: 12px; padding: 16px;
  border: 1px solid #ddd; box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.fb-link-bar {
  background: #f0f2f5; border-radius: 6px; padding: 8px 12px;
  display: flex; align-items: center;
}
.fb-reactions { display: flex; justify-content: space-between; align-items: center; }

/* ═══ TEMPLATE RENDER ═══ */
.tpl { transition: all 0.35s ease; min-height: 140px; position: relative; overflow: hidden; }

/* Logo */
.tpl__logo-wrap { margin-bottom: 16px; }
.tpl__logo { width: 80px; height: 80px; object-fit: contain; border-radius: 14px; display: block; }
.tpl--bold .tpl__logo,
.tpl--gradient .tpl__logo,
.tpl--luxury .tpl__logo { background: rgba(255,255,255,0.15); padding: 8px; border-radius: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.25); }
.tpl--elegant .tpl__logo { border-radius: 50%; border: 2px solid rgba(140,115,75,0.3); }
.tpl--magazine .tpl__logo-wrap { margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid rgba(0,0,0,0.06); }

/* Listing Price */
.tpl__price { font-family: 'Inter', sans-serif; font-size: 32px; font-weight: 900; line-height: 1.1; margin-bottom: 4px; letter-spacing: -0.5px; }
.tpl--luxury .tpl__price { font-family: 'Playfair Display', serif; font-size: 30px; letter-spacing: 1px; color: #d4a537 !important; }
.tpl--bold .tpl__price { font-size: 34px; letter-spacing: 1px; }
.tpl--elegant .tpl__price { font-family: 'Playfair Display', serif; font-size: 30px; }
.tpl--minimal .tpl__price { font-size: 28px; font-weight: 700; }
.tpl--magazine .tpl__price { font-size: 34px; font-weight: 900; letter-spacing: -1px; }

/* Header */
.tpl__header { font-family: 'Inter', sans-serif; font-size: 22px; font-weight: 700; line-height: 1.2; margin-bottom: 0; }
.tpl--bold .tpl__header { font-weight: 900; text-transform: uppercase; font-size: 26px; letter-spacing: 1px; }
.tpl--luxury .tpl__header { font-family: 'Playfair Display', serif; text-transform: uppercase; letter-spacing: 3px; font-size: 20px; font-weight: 700; }
.tpl--elegant .tpl__header { font-family: 'Playfair Display', serif; font-size: 26px; font-weight: 700; }
.tpl--magazine .tpl__header { font-weight: 900; font-size: 26px; line-height: 1.1; letter-spacing: -0.5px; }
.tpl--minimal .tpl__header { font-weight: 600; font-size: 20px; }
.tpl--gradient .tpl__header { font-weight: 800; font-size: 24px; }

/* Accent rule */
.tpl__rule { width: 50px; height: 3px; border-radius: 2px; margin: 10px 0 12px; }
.tpl--luxury .tpl__rule { background: #d4a537 !important; width: 70px; height: 2px; }
.tpl--bold .tpl__rule { width: 80px; height: 4px; border-radius: 0; }
.tpl--magazine .tpl__rule { height: 4px; width: 60px; border-radius: 0; }
.tpl--minimal .tpl__rule { height: 1px; width: 36px; opacity: 0.4; }
.tpl--elegant .tpl__rule { width: 60px; height: 2px; }
.tpl--gradient .tpl__rule { background: rgba(255,255,255,0.5) !important; width: 60px; }

/* Tagline */
.tpl__tagline { font-size: 14px; line-height: 1.4; margin-bottom: 14px; }
.tpl--bold .tpl__tagline { text-transform: uppercase; letter-spacing: 2px; font-size: 11px; font-weight: 600; }
.tpl--luxury .tpl__tagline { letter-spacing: 2px; font-size: 11px; font-weight: 400; text-transform: uppercase; }
.tpl--elegant .tpl__tagline { font-style: italic; font-family: 'Playfair Display', serif; font-size: 15px; }
.tpl--magazine .tpl__tagline { font-style: italic; font-size: 14px; opacity: 0.7; }

/* Images */
.tpl__images { margin: 14px 0; }
.tpl__hero { width: 100%; aspect-ratio: 4 / 3; overflow: hidden; border-radius: 10px; background: #e8e8e8; }
.tpl__hero img { width: 100%; height: 100%; object-fit: cover; display: block; }
.tpl--bold .tpl__hero { border-radius: 4px; border: 2px solid rgba(255,255,255,0.1); }
.tpl--luxury .tpl__hero { border-radius: 10px; border: 2px solid rgba(212,165,55,0.3); box-shadow: 0 6px 24px rgba(0,0,0,0.35); }
.tpl--elegant .tpl__hero { border-radius: 8px; border: 1px solid rgba(0,0,0,0.06); box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
.tpl--gradient .tpl__hero { border-radius: 14px; box-shadow: 0 6px 20px rgba(0,0,0,0.25); }
.tpl--glassmorphism .tpl__hero { border-radius: 14px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
.tpl--minimal .tpl__hero { border-radius: 4px; border: 1px solid rgba(0,0,0,0.06); }
.tpl--magazine .tpl__hero { border-radius: 3px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }

/* Thumbnail strip */
.tpl__thumbstrip { display: flex; gap: 8px; margin-top: 10px; }
.tpl__thumb {
  width: 52px; height: 52px; border-radius: 8px; overflow: hidden;
  cursor: pointer; opacity: 0.45; transition: all 0.2s; border: 2px solid transparent; flex-shrink: 0;
}
.tpl__thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.tpl__thumb--active { opacity: 1; border-color: #1877F2; box-shadow: 0 2px 10px rgba(0,0,0,0.15); transform: translateY(-1px); }
.tpl--bold .tpl__thumb--active,
.tpl--gradient .tpl__thumb--active { border-color: rgba(255,255,255,0.7); }
.tpl--luxury .tpl__thumb--active { border-color: #d4a537; }
.tpl--luxury .tpl__thumb { border-radius: 6px; }
.tpl--bold .tpl__thumb { border-radius: 3px; }
.tpl--magazine .tpl__thumb { border-radius: 3px; }
.tpl--minimal .tpl__thumb { border-radius: 3px; }

/* Body */
.tpl__body { font-size: 14px; line-height: 1.65; white-space: pre-wrap; margin-bottom: 8px; }
.tpl--luxury .tpl__body,
.tpl--elegant .tpl__body { font-weight: 300; }

/* CTA */
.tpl__cta { font-size: 16px; font-weight: 700; margin: 12px 0 8px; line-height: 1.4; }
.tpl--bold .tpl__cta {
  display: inline-block; padding: 10px 24px; border-radius: 4px; font-size: 12px;
  text-transform: uppercase; letter-spacing: 2px; font-weight: 800;
  background: rgba(255,255,255,0.12); color: #fff !important; border: 2px solid rgba(255,255,255,0.3);
}
.tpl--luxury .tpl__cta {
  display: inline-block; padding: 10px 24px; border-radius: 6px; font-size: 12px;
  text-transform: uppercase; letter-spacing: 2px; font-weight: 600;
  background: rgba(212,165,55,0.12); border: 1px solid rgba(212,165,55,0.4); color: #d4a537 !important;
}
.tpl--gradient .tpl__cta {
  display: inline-block; padding: 10px 24px; border-radius: 24px; font-size: 13px; font-weight: 700;
  background: rgba(255,255,255,0.2); color: #fff !important; backdrop-filter: blur(4px);
}
.tpl--magazine .tpl__cta { font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; font-size: 15px; }

/* Contact bar */
.tpl__contact { display: flex; align-items: center; justify-content: center; letter-spacing: 0.3px; font-size: 13px; }
.tpl--magazine .tpl__contact { justify-content: flex-start; }

/* Bottom foot accent */
.tpl__foot { height: 3px; width: 40px; border-radius: 2px; margin-top: 16px; opacity: 0.5; }
.tpl--luxury .tpl__foot { background: #d4a537 !important; width: 70px; }
.tpl--bold .tpl__foot { width: 60px; height: 4px; border-radius: 0; }
.tpl--magazine .tpl__foot { display: none; }
.tpl--minimal .tpl__foot { width: 30px; height: 1px; opacity: 0.3; }
</style>
