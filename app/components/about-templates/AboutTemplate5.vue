<template>
  <div class="t5">
    <!-- Luxury Centered Portrait Hero -->
    <section class="hero-centered">
      <div class="hc-bg"></div>
      <v-container class="hc-content">
        <span class="hc-tag">ABOUT ME</span>
        <div class="hc-portrait-ring">
          <img :src="profileImage" :alt="storyName" />
        </div>
        <h1 class="hc-name">{{ storyName }}</h1>
        <p class="hc-role">{{ storyRole }}</p>
        <div class="hc-divider"></div>
        <h2 class="hc-title">{{ heroTitle }}</h2>
        <p class="hc-subtitle">{{ heroSubtitle }}</p>
        <div class="hc-actions">
          <v-btn size="large" variant="flat" class="px-10 text-none font-weight-bold rounded-pill hc-btn-primary" href="/contact">Connect With Me</v-btn>
          <v-btn v-if="contactPhone" size="large" variant="outlined" class="px-8 text-none font-weight-medium rounded-pill hc-btn-outline" :href="`tel:${contactPhone.replace(/[^+\\d]/g, '')}`">
            <v-icon size="18" class="mr-2">mdi-phone</v-icon>Call
          </v-btn>
        </div>
      </v-container>
    </section>

    <!-- Warm Stats Band -->
    <section class="warm-stats" v-if="stats.length">
      <v-container>
        <div class="ws-row">
          <div v-for="stat in stats" :key="stat.key" class="ws-item">
            <span class="ws-val">{{ stat.value }}</span>
            <span class="ws-lbl">{{ stat.label }}</span>
          </div>
        </div>
      </v-container>
    </section>

    <!-- Story with Large Drop Cap -->
    <section class="story-luxury">
      <v-container>
        <v-row justify="center">
          <v-col cols="12" md="8">
            <div class="sl-eyebrow-wrap">
              <div class="sl-line"></div>
              <span class="sl-eyebrow">MY STORY</span>
              <div class="sl-line"></div>
            </div>
            <h2 class="sl-title">{{ storyTitle }}</h2>
            <p class="sl-intro">{{ heroDescription }}</p>
            <div class="sl-dropcap-body">
              <div v-if="storyContent" v-html="storyContent" class="sl-content"></div>
              <div v-else class="sl-content"><p>{{ storyContentDefault }}</p></div>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Interactive Services Accordion -->
    <section class="services-accordion" v-if="coreValues.length">
      <v-container>
        <v-row justify="center">
          <v-col cols="12" md="10">
            <div class="sa-header">
              <div class="sl-eyebrow-wrap">
                <div class="sl-line"></div>
                <span class="sl-eyebrow">EXPERTISE</span>
                <div class="sl-line"></div>
              </div>
              <h2 class="sl-title">What I Offer</h2>
            </div>
            <div class="sa-list">
              <div
                v-for="(value, i) in coreValues" :key="value.key"
                class="sa-item"
                :class="{ 'sa-open': openAccordion === i }"
                @click="openAccordion = openAccordion === i ? -1 : i"
              >
                <div class="sa-header-row">
                  <div class="sa-left">
                    <span class="sa-num">{{ String(i + 1).padStart(2, '0') }}</span>
                    <v-icon :icon="value.icon" size="24" class="sa-icon"></v-icon>
                    <h3 class="sa-title">{{ value.title }}</h3>
                  </div>
                  <v-icon :icon="openAccordion === i ? 'mdi-minus' : 'mdi-plus'" size="20" class="sa-toggle"></v-icon>
                </div>
                <transition name="slide">
                  <div v-if="openAccordion === i" class="sa-body">
                    <p>{{ value.description }}</p>
                  </div>
                </transition>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Elegant Quote -->
    <section class="quote-elegant">
      <v-container>
        <v-row justify="center">
          <v-col cols="12" md="8" class="text-center">
            <div class="qe-mark">&ldquo;</div>
            <p class="qe-text">{{ connectDescription }}</p>
            <div class="qe-attr">
              <span class="qe-dash">&mdash;</span>
              <span class="qe-name">{{ storyName }}</span>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Connect Warm -->
    <section class="connect-warm">
      <v-container>
        <v-row align="center" justify="center">
          <v-col cols="12" md="5" class="text-center mb-8 mb-md-0">
            <div class="cw-qr-frame">
              <img :src="qrCodeUrl" alt="QR Code" />
              <span>Save my contact</span>
            </div>
          </v-col>
          <v-col cols="12" md="5" offset-md="1">
            <span class="cw-tag">LET'S CONNECT</span>
            <h2 class="cw-heading">{{ connectHeading }}</h2>
            <div class="cw-contact-rows">
              <a v-if="contactPhone" :href="`tel:${contactPhone.replace(/[^+\\d]/g, '')}`" class="cw-contact-row">
                <div class="cw-icon-circle"><v-icon size="18">mdi-phone-outline</v-icon></div>
                <div><strong>Phone</strong><span>{{ contactPhone }}</span></div>
              </a>
              <a v-if="contactEmail" :href="`mailto:${contactEmail}`" class="cw-contact-row">
                <div class="cw-icon-circle"><v-icon size="18">mdi-email-outline</v-icon></div>
                <div><strong>Email</strong><span>{{ contactEmail }}</span></div>
              </a>
            </div>
            <div v-if="socialLinks.length" class="cw-social-row">
              <a v-for="social in socialLinks" :key="social.name" :href="social.url" target="_blank" class="cw-soc">
                <v-icon size="20">{{ getSocialIcon(social.name) }}</v-icon>
              </a>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- CTA with Warm Gradient -->
    <section class="cta-warm">
      <v-container>
        <v-row justify="center">
          <v-col cols="12" md="10">
            <div class="cta-card-warm">
              <span class="cta-areas">{{ ctaAreas }}</span>
              <h2 class="cta-h">{{ ctaTitle }}</h2>
              <p class="cta-p">{{ ctaSubtitle }}</p>
              <div class="d-flex justify-center gap-4 flex-wrap mt-8">
                <v-btn v-if="contactPhone" size="x-large" variant="flat" class="px-12 rounded-pill text-none font-weight-bold cta-btn-warm" :href="`tel:${contactPhone.replace(/[^+\\d]/g, '')}`">Call Now</v-btn>
                <v-btn size="x-large" variant="outlined" class="px-12 rounded-pill text-none font-weight-bold cta-btn-out" href="/contact">Inquire</v-btn>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
defineProps<{
  heroTitle: string; heroSubtitle: string; heroDescription: string; profileImage: string
  storyTitle: string; storyName: string; storyRole: string; storyContent: string; storyContentDefault: string
  connectHeading: string; connectDescription: string; coreValues: any[]; stats: any[]
  ctaAreas: string; ctaTitle: string; ctaSubtitle: string; ctaImage: string
  contactPhone: string; contactEmail: string; qrCodeUrl: string; socialLinks: any[]
}>()
const openAccordion = ref(0)
function getSocialIcon(n: string): string {
  const l = n.toLowerCase()
  if (l.includes('facebook')) return 'mdi-facebook'; if (l.includes('instagram')) return 'mdi-instagram'
  if (l.includes('linkedin')) return 'mdi-linkedin'; if (l.includes('twitter') || l.includes('x.com') || l === 'x') return 'mdi-twitter'
  if (l.includes('youtube')) return 'mdi-youtube'; if (l.includes('tiktok')) return 'mdi-music-note'
  return 'mdi-link'
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&display=swap');
.t5 { font-family: 'Inter', sans-serif; }

/* ── HERO ── */
.hero-centered { position: relative; padding: 120px 0 80px; text-align: center; overflow: hidden; }
.hc-bg { position: absolute; inset: 0; background: linear-gradient(170deg, #fdf6e3 0%, #fef9ef 40%, #fff7ed 70%, #fff1e6 100%); }
.hc-content { position: relative; z-index: 2; }
.hc-tag { font-size: 0.55rem; font-weight: 800; letter-spacing: 0.45em; color: #c2956a; display: block; margin-bottom: 32px; }
.hc-portrait-ring {
  display: inline-block; padding: 6px; border-radius: 50%;
  background: linear-gradient(135deg, #c2956a, #a07850, #d4a574);
  box-shadow: 0 30px 60px rgba(162,120,80,0.2); margin-bottom: 28px;
}
.hc-portrait-ring img { width: 200px; height: 200px; border-radius: 50%; object-fit: cover; border: 4px solid white; }
.hc-name { font-family: 'Cormorant Garamond', serif; font-size: 2.8rem; font-weight: 700; color: #3c2415; letter-spacing: -0.02em; margin-bottom: 4px; }
.hc-role { font-size: 0.85rem; color: #a07850; font-weight: 500; margin-bottom: 24px; }
.hc-divider { width: 40px; height: 2px; background: linear-gradient(90deg, #c2956a, #d4a574); margin: 0 auto 28px; border-radius: 1px; }
.hc-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.8rem, 3vw, 2.6rem); font-weight: 600; color: #3c2415; line-height: 1.25; margin-bottom: 14px; }
.hc-subtitle { font-size: 1rem; color: #8b7355; line-height: 1.7; max-width: 550px; margin: 0 auto 32px; }
.hc-actions { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }
.hc-btn-primary { background: linear-gradient(135deg, #3c2415, #5c3a25) !important; color: white !important; }
.hc-btn-outline { border-color: #c2956a !important; color: #3c2415 !important; }

/* ── STATS ── */
.warm-stats { padding: 48px 0; background: #3c2415; }
.ws-row { display: flex; justify-content: center; gap: 56px; flex-wrap: wrap; }
.ws-item { text-align: center; }
.ws-val { display: block; font-family: 'Cormorant Garamond', serif; font-size: 2.6rem; font-weight: 700; color: #f5e6d3; }
.ws-lbl { font-size: 0.55rem; font-weight: 800; letter-spacing: 0.25em; text-transform: uppercase; color: rgba(245,230,211,0.35); }

/* ── STORY ── */
.story-luxury { padding: 100px 0; background: white; }
.sl-eyebrow-wrap { display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 20px; }
.sl-line { width: 40px; height: 1px; background: #d6cfc7; }
.sl-eyebrow { font-size: 0.55rem; font-weight: 800; letter-spacing: 0.4em; color: #c2956a; }
.sl-title { font-family: 'Cormorant Garamond', serif; font-size: 2.4rem; font-weight: 700; color: #3c2415; text-align: center; margin-bottom: 24px; letter-spacing: -0.02em; }
.sl-intro { font-size: 1.05rem; color: #8b7355; line-height: 1.8; text-align: center; margin-bottom: 40px; }
.sl-dropcap-body { position: relative; }
.sl-content { font-size: 0.95rem; color: #6b5c4e; line-height: 2.1; }
.sl-content :deep(p) { margin-bottom: 1.4rem; }
.sl-content :deep(p:first-child::first-letter) {
  font-family: 'Cormorant Garamond', serif; font-size: 4rem; font-weight: 700;
  color: #3c2415; float: left; line-height: 0.85; margin: 4px 12px 0 0;
}

/* ── ACCORDION ── */
.services-accordion { padding: 100px 0; background: #fdf6e3; }
.sa-header { margin-bottom: 48px; }
.sa-list { display: flex; flex-direction: column; gap: 4px; }
.sa-item { background: white; border-radius: 16px; overflow: hidden; cursor: pointer; transition: all 0.3s; border: 1px solid transparent; }
.sa-item:hover { border-color: #d4a574; }
.sa-open { border-color: #c2956a; box-shadow: 0 8px 24px rgba(162,120,80,0.1); }
.sa-header-row { display: flex; align-items: center; justify-content: space-between; padding: 24px 28px; }
.sa-left { display: flex; align-items: center; gap: 16px; }
.sa-num { font-size: 0.6rem; font-weight: 800; color: #c2956a; letter-spacing: 0.15em; }
.sa-icon { color: #3c2415; }
.sa-title { font-size: 1.05rem; font-weight: 700; color: #3c2415; margin: 0; }
.sa-toggle { color: #c2956a; }
.sa-body { padding: 0 28px 24px 80px; }
.sa-body p { font-size: 0.9rem; color: #8b7355; line-height: 1.8; margin: 0; }
.slide-enter-active, .slide-leave-active { transition: all 0.3s ease; }
.slide-enter-from, .slide-leave-to { opacity: 0; max-height: 0; padding-top: 0; padding-bottom: 0; }
.slide-enter-to, .slide-leave-from { opacity: 1; max-height: 200px; }

/* ── QUOTE ── */
.quote-elegant { padding: 100px 0; background: white; }
.qe-mark { font-family: 'Cormorant Garamond', serif; font-size: 6rem; color: #d4a574; line-height: 1; margin-bottom: -16px; }
.qe-text { font-family: 'Cormorant Garamond', serif; font-size: 1.6rem; font-weight: 400; font-style: italic; color: #5c3a25; line-height: 1.8; margin-bottom: 24px; }
.qe-attr { display: flex; align-items: center; justify-content: center; gap: 8px; }
.qe-dash { color: #d4a574; font-size: 1.2rem; }
.qe-name { font-size: 0.8rem; font-weight: 700; color: #3c2415; letter-spacing: 0.15em; text-transform: uppercase; }

/* ── CONNECT ── */
.connect-warm { padding: 100px 0; background: #fdf6e3; }
.cw-tag { font-size: 0.55rem; font-weight: 800; letter-spacing: 0.4em; color: #c2956a; display: block; margin-bottom: 14px; }
.cw-heading { font-family: 'Cormorant Garamond', serif; font-size: 2.2rem; font-weight: 700; color: #3c2415; margin-bottom: 28px; }
.cw-contact-rows { display: flex; flex-direction: column; gap: 14px; margin-bottom: 24px; }
.cw-contact-row { display: flex; align-items: center; gap: 14px; text-decoration: none; color: #3c2415; padding: 14px 18px; background: white; border-radius: 14px; border: 1px solid #e8ddd0; transition: all 0.3s; }
.cw-contact-row:hover { border-color: #c2956a; box-shadow: 0 4px 12px rgba(162,120,80,0.1); }
.cw-icon-circle { width: 40px; height: 40px; border-radius: 50%; background: #fdf6e3; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cw-contact-row strong { display: block; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #c2956a; }
.cw-contact-row span { font-size: 0.9rem; color: #5c3a25; }
.cw-social-row { display: flex; gap: 10px; }
.cw-soc {
  display: flex; align-items: center; justify-content: center; width: 42px; height: 42px;
  border-radius: 50%; background: white; border: 1px solid #e8ddd0; color: #3c2415;
  text-decoration: none; transition: all 0.3s;
}
.cw-soc:hover { background: #3c2415; color: white; border-color: #3c2415; }
.cw-qr-frame { display: inline-flex; flex-direction: column; align-items: center; padding: 36px; background: white; border-radius: 24px; border: 1px solid #e8ddd0; }
.cw-qr-frame img { width: 180px; height: 180px; margin-bottom: 12px; }
.cw-qr-frame span { font-size: 0.55rem; font-weight: 800; letter-spacing: 0.25em; text-transform: uppercase; color: #c2956a; }

/* ── CTA ── */
.cta-warm { padding: 0 0 80px; background: #fdf6e3; }
.cta-card-warm {
  background: linear-gradient(135deg, #3c2415, #5c3a25, #4a2e1a);
  border-radius: 32px; padding: 80px 60px; text-align: center;
}
.cta-areas { font-size: 0.55rem; font-weight: 800; letter-spacing: 0.4em; color: rgba(245,230,211,0.35); display: block; margin-bottom: 16px; }
.cta-h { font-family: 'Cormorant Garamond', serif; font-size: 2.8rem; font-weight: 700; color: #f5e6d3; margin-bottom: 12px; }
.cta-p { font-size: 0.95rem; color: rgba(245,230,211,0.45); max-width: 480px; margin: 0 auto; line-height: 1.7; }
.cta-btn-warm { background: linear-gradient(135deg, #c2956a, #d4a574) !important; color: #3c2415 !important; }
.cta-btn-out { border-color: rgba(245,230,211,0.3) !important; color: #f5e6d3 !important; }

@media (max-width: 960px) {
  .hc-portrait-ring img { width: 160px; height: 160px; }
  .hc-name { font-size: 2.2rem; }
  .cta-card-warm { padding: 48px 24px; }
  .cta-h { font-size: 2rem; }
}
</style>
