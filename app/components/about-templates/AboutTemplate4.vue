<template>
  <div class="t4">
    <!-- Dramatic 50/50 Split Hero -->
    <section class="hero-split">
      <div class="hs-img" :style="{ backgroundImage: `url(${profileImage})` }"></div>
      <div class="hs-content">
        <div class="hs-inner">
          <span class="tag">ABOUT ME</span>
          <h1 class="hs-title">{{ heroTitle }}</h1>
          <p class="hs-subtitle">{{ heroSubtitle }}</p>
          <div class="hs-divider"></div>
          <p class="hs-desc">{{ heroDescription }}</p>
          <div class="hs-meta">
            <div class="hs-meta-item" v-if="contactPhone">
              <v-icon size="16">mdi-phone-outline</v-icon>
              <a :href="`tel:${contactPhone.replace(/[^+\\d]/g, '')}`">{{ contactPhone }}</a>
            </div>
            <div class="hs-meta-item" v-if="contactEmail">
              <v-icon size="16">mdi-email-outline</v-icon>
              <a :href="`mailto:${contactEmail}`">{{ contactEmail }}</a>
            </div>
          </div>
          <v-btn size="large" color="white" variant="flat" class="px-10 text-none font-weight-bold rounded-pill mt-8" style="color: #0a0a0a;" href="/contact">
            Schedule a Consultation
          </v-btn>
        </div>
      </div>
    </section>

    <!-- Marquee Stats -->
    <section class="marquee-stats" v-if="stats.length">
      <div class="ms-scroll">
        <div class="ms-track">
          <template v-for="rep in 3" :key="rep">
            <div v-for="stat in stats" :key="`${rep}-${stat.key}`" class="ms-item">
              <span class="ms-val">{{ stat.value }}</span>
              <span class="ms-lbl">{{ stat.label }}</span>
              <span class="ms-sep">/</span>
            </div>
          </template>
        </div>
      </div>
    </section>

    <!-- Story with Staggered Layout -->
    <section class="story-stagger">
      <v-container>
        <v-row>
          <v-col cols="12" md="4">
            <div class="sticky-title">
              <span class="tag">MY STORY</span>
              <h2 class="st-heading">{{ storyTitle }}</h2>
              <div class="st-name-badge">
                <strong>{{ storyName }}</strong>
                <span>{{ storyRole }}</span>
              </div>
            </div>
          </v-col>
          <v-col cols="12" md="7" offset-md="1">
            <div class="st-body">
              <div v-if="storyContent" v-html="safeStoryContent" class="st-content"></div>
              <div v-else class="st-content"><p>{{ storyContentDefault }}</p></div>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Services Slides -->
    <section class="services-slides" v-if="coreValues.length">
      <v-container fluid class="pa-0">
        <div class="sv-header">
          <v-container>
            <span class="tag">SERVICES &amp; EXPERTISE</span>
            <h2 class="sv-title">What Sets Me Apart</h2>
          </v-container>
        </div>
        <div class="sv-track-wrapper">
          <div class="sv-track" ref="slideTrack">
            <div v-for="(value, i) in coreValues" :key="value.key" class="sv-slide" :class="`sv-accent-${(i % 4) + 1}`">
              <div class="sv-slide-inner">
                <span class="sv-idx">{{ String(i + 1).padStart(2, '0') }}</span>
                <v-icon :icon="value.icon" size="40" class="sv-slide-icon"></v-icon>
                <h3 class="sv-slide-title">{{ value.title }}</h3>
                <p class="sv-slide-desc">{{ value.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </v-container>
    </section>

    <!-- Full Width Quote -->
    <section class="quote-full">
      <v-container>
        <div class="qf-inner">
          <span class="qf-mark">&ldquo;</span>
          <p class="qf-text">{{ connectDescription }}</p>
          <div class="qf-attr">
            <img :src="profileImage" :alt="storyName" class="qf-avatar" />
            <div>
              <strong>{{ storyName }}</strong>
              <span>{{ storyRole }}</span>
            </div>
          </div>
        </div>
      </v-container>
    </section>

    <!-- Connect Section -->
    <section class="connect-dark">
      <v-container>
        <v-row align="center">
          <v-col cols="12" md="6">
            <span class="tag-light">CONNECT WITH ME</span>
            <h2 class="cd-title">{{ connectHeading }}</h2>
            <div v-if="socialLinks.length" class="cd-social">
              <a v-for="social in socialLinks" :key="social.name" :href="social.url" target="_blank" class="cd-soc-pill">
                <v-icon size="18">{{ getSocialIcon(social.name) }}</v-icon>
                {{ social.name }}
              </a>
            </div>
          </v-col>
          <v-col cols="12" md="5" offset-md="1" class="text-center">
            <div class="cd-qr-wrap">
              <img :src="qrCodeUrl" alt="QR Code" class="cd-qr" />
              <span class="cd-qr-label">Scan to Save Contact</span>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- CTA Strip -->
    <section class="cta-strip">
      <div class="cta-bg" :style="{ backgroundImage: `url(${ctaImage})` }"></div>
      <div class="cta-ov"></div>
      <v-container class="cta-inner">
        <span class="tag-light">{{ ctaAreas }}</span>
        <h2 class="cta-h">{{ ctaTitle }}</h2>
        <p class="cta-p">{{ ctaSubtitle }}</p>
        <div class="d-flex justify-center gap-4 flex-wrap mt-8">
          <v-btn v-if="contactPhone" size="x-large" color="white" variant="flat" class="px-12 rounded-pill text-none font-weight-bold" style="color: #0a0a0a;" :href="`tel:${contactPhone.replace(/[^+\\d]/g, '')}`">Call Now</v-btn>
          <v-btn size="x-large" variant="outlined" color="white" class="px-12 rounded-pill text-none font-weight-bold" href="/contact">Start Inquiry</v-btn>
        </div>
      </v-container>
    </section>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  heroTitle: string; heroSubtitle: string; heroDescription: string; profileImage: string
  storyTitle: string; storyName: string; storyRole: string; storyContent: string; storyContentDefault: string
  connectHeading: string; connectDescription: string; coreValues: any[]; stats: any[]
  ctaAreas: string; ctaTitle: string; ctaSubtitle: string; ctaImage: string
  contactPhone: string; contactEmail: string; qrCodeUrl: string; socialLinks: any[]
}>()
// CMS-supplied HTML — sanitize before rendering via v-html.
const safeStoryContent = useSanitizedHtml(() => props.storyContent)
function getSocialIcon(n: string): string {
  const l = n.toLowerCase()
  if (l.includes('facebook')) return 'mdi-facebook'; if (l.includes('instagram')) return 'mdi-instagram'
  if (l.includes('linkedin')) return 'mdi-linkedin'; if (l.includes('twitter') || l.includes('x.com') || l === 'x') return 'mdi-twitter'
  if (l.includes('youtube')) return 'mdi-youtube'; if (l.includes('tiktok')) return 'mdi-music-note'
  return 'mdi-link'
}
</script>

<style scoped>
.t4 { font-family: 'Inter', sans-serif; }
.tag { font-size: 0.6rem; font-weight: 800; letter-spacing: 0.4em; color: rgba(255,255,255,0.35); display: block; margin-bottom: 16px; }

/* ── SPLIT HERO ── */
.hero-split { display: flex; min-height: 100vh; }
.hs-img { flex: 1; background-size: cover; background-position: center top; min-height: 500px; }
.hs-content { flex: 1; background: #0a0a0a; display: flex; align-items: center; padding: 80px; }
.hs-inner { max-width: 520px; }
.hs-title { font-size: clamp(2.2rem, 4vw, 3.4rem); font-weight: 800; color: white; letter-spacing: -0.04em; line-height: 1.05; margin-bottom: 16px; }
.hs-subtitle { font-size: 1.05rem; color: rgba(255,255,255,0.5); line-height: 1.6; margin-bottom: 20px; }
.hs-divider { width: 48px; height: 3px; background: linear-gradient(90deg, #f59e0b, #ef4444); border-radius: 2px; margin-bottom: 20px; }
.hs-desc { font-size: 0.9rem; color: rgba(255,255,255,0.35); line-height: 1.9; margin-bottom: 24px; }
.hs-meta { display: flex; flex-direction: column; gap: 8px; }
.hs-meta-item { display: flex; align-items: center; gap: 10px; }
.hs-meta-item a { color: rgba(255,255,255,0.6); text-decoration: none; font-size: 0.85rem; transition: color 0.3s; }
.hs-meta-item a:hover { color: white; }
.hs-meta-item .v-icon { color: rgba(255,255,255,0.3); }

/* ── MARQUEE STATS ── */
.marquee-stats { padding: 20px 0; background: #f59e0b; overflow: hidden; }
.ms-scroll { overflow: hidden; }
.ms-track { display: flex; animation: marquee 30s linear infinite; white-space: nowrap; }
@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-33.33%); } }
.ms-item { display: inline-flex; align-items: center; gap: 10px; padding: 0 28px; }
.ms-val { font-size: 1.4rem; font-weight: 800; color: #0a0a0a; }
.ms-lbl { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(10,10,10,0.5); }
.ms-sep { font-size: 1.2rem; color: rgba(10,10,10,0.15); margin-left: 14px; }

/* ── STORY ── */
.story-stagger { padding: 120px 0; background: white; }
.story-stagger .tag { color: #d97706; }
.sticky-title { position: sticky; top: 100px; }
.st-heading { font-size: 2.4rem; font-weight: 800; color: #0a0a0a; letter-spacing: -0.03em; line-height: 1.15; margin-bottom: 24px; }
.st-name-badge { display: inline-block; padding: 12px 20px; background: #fef3c7; border-radius: 12px; }
.st-name-badge strong { display: block; font-size: 0.9rem; color: #0a0a0a; }
.st-name-badge span { font-size: 0.75rem; color: #92400e; }
.st-body { padding-left: 0; }
.st-content { font-size: 1rem; color: #525252; line-height: 2; }
.st-content :deep(p) { margin-bottom: 1.5rem; }

/* ── SERVICES SLIDES ── */
.services-slides { padding: 100px 0; background: #fafafa; }
.sv-header { margin-bottom: 48px; }
.sv-header .tag { color: #d97706; }
.sv-title { font-size: 2.2rem; font-weight: 800; color: #0a0a0a; letter-spacing: -0.03em; }
.sv-track-wrapper { overflow-x: auto; scrollbar-width: thin; padding: 0 0 20px; }
.sv-track { display: flex; gap: 20px; padding: 0 24px; min-width: max-content; }
.sv-slide { min-width: 320px; max-width: 360px; border-radius: 24px; overflow: hidden; transition: transform 0.4s; }
.sv-slide:hover { transform: translateY(-8px); }
.sv-accent-1 { background: #0a0a0a; }
.sv-accent-2 { background: #1e293b; }
.sv-accent-3 { background: #292524; }
.sv-accent-4 { background: #18181b; }
.sv-slide-inner { padding: 44px 32px; }
.sv-idx { font-size: 0.55rem; font-weight: 800; letter-spacing: 0.3em; color: rgba(255,255,255,0.2); display: block; margin-bottom: 24px; }
.sv-slide-icon { color: #f59e0b; margin-bottom: 20px; }
.sv-slide-title { font-size: 1.2rem; font-weight: 700; color: white; margin-bottom: 12px; }
.sv-slide-desc { font-size: 0.88rem; color: rgba(255,255,255,0.4); line-height: 1.8; }

/* ── QUOTE ── */
.quote-full { padding: 100px 0; background: #0a0a0a; }
.qf-inner { text-align: center; max-width: 700px; margin: 0 auto; }
.qf-mark { font-size: 5rem; color: #f59e0b; line-height: 1; display: block; margin-bottom: -20px; }
.qf-text { font-size: 1.3rem; color: rgba(255,255,255,0.7); line-height: 1.9; font-style: italic; margin-bottom: 32px; }
.qf-attr { display: inline-flex; align-items: center; gap: 14px; }
.qf-avatar { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(255,255,255,0.1); }
.qf-attr strong { display: block; color: white; font-size: 0.9rem; }
.qf-attr span { font-size: 0.75rem; color: rgba(255,255,255,0.35); }

/* ── CONNECT DARK ── */
.connect-dark { padding: 100px 0; background: #171717; }
.tag-light { font-size: 0.6rem; font-weight: 800; letter-spacing: 0.4em; color: rgba(255,255,255,0.25); display: block; margin-bottom: 16px; }
.cd-title { font-size: 2.2rem; font-weight: 800; color: white; letter-spacing: -0.03em; margin-bottom: 28px; }
.cd-social { display: flex; flex-wrap: wrap; gap: 10px; }
.cd-soc-pill {
  display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px;
  border: 1px solid rgba(255,255,255,0.1); border-radius: 100px;
  color: rgba(255,255,255,0.6); text-decoration: none; font-size: 0.8rem; font-weight: 600;
  transition: all 0.3s;
}
.cd-soc-pill:hover { border-color: #f59e0b; color: #f59e0b; }
.cd-qr-wrap { display: inline-flex; flex-direction: column; align-items: center; padding: 36px; background: rgba(255,255,255,0.04); border-radius: 24px; border: 1px solid rgba(255,255,255,0.06); }
.cd-qr { width: 160px; height: 160px; border-radius: 8px; }
.cd-qr-label { font-size: 0.55rem; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,255,255,0.25); margin-top: 14px; }

/* ── CTA ── */
.cta-strip { position: relative; padding: 120px 0; text-align: center; overflow: hidden; }
.cta-bg { position: absolute; inset: 0; background-size: cover; background-position: center; }
.cta-ov { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(10,10,10,0.85), rgba(10,10,10,0.92)); }
.cta-inner { position: relative; z-index: 2; }
.cta-h { font-size: 3rem; font-weight: 800; color: white; letter-spacing: -0.04em; margin-bottom: 12px; }
.cta-p { font-size: 1rem; color: rgba(255,255,255,0.4); max-width: 500px; margin: 0 auto; line-height: 1.7; }

@media (max-width: 960px) {
  .hero-split { flex-direction: column; }
  .hs-img { min-height: 50vh; }
  .hs-content { padding: 48px 24px; }
  .sticky-title { position: static; }
  .cta-h { font-size: 2rem; }
}
</style>
