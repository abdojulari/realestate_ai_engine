<template>
  <div class="t5">
    <!-- Hero: Centered portrait on dark gradient -->
    <section class="hero">
      <div class="hero-bg"></div>
      <div class="hero-glow"></div>
      <v-container class="hero-content">
        <div class="hero-center">
          <div class="hero-portrait">
            <div class="portrait-ring">
              <img :src="profileImage" :alt="storyName" />
            </div>
            <div class="portrait-pulse"></div>
          </div>
          <span class="hero-tag">ABOUT ME</span>
          <h1 class="hero-name">{{ storyName }}</h1>
          <p class="hero-role">{{ storyRole }}</p>
          <div class="hero-divider"></div>
          <h2 class="hero-title">{{ heroTitle }}</h2>
          <p class="hero-subtitle">{{ heroSubtitle }}</p>
          <div class="hero-actions">
            <v-btn size="large" variant="flat" class="px-10 text-none font-weight-bold rounded-pill hero-btn" href="/contact">Connect With Me</v-btn>
            <v-btn v-if="contactPhone" size="large" variant="outlined" class="px-8 text-none font-weight-medium rounded-pill hero-btn-out" :href="`tel:${contactPhone.replace(/[^+\\d]/g, '')}`">
              <v-icon size="18" class="mr-2">mdi-phone</v-icon>Call
            </v-btn>
          </div>
        </div>
      </v-container>
    </section>

    <!-- Stats Strip -->
    <section class="stats-strip" v-if="stats.length">
      <v-container>
        <div class="ss-row">
          <div v-for="(stat, i) in stats" :key="stat.key" class="ss-item">
            <span class="ss-val">{{ stat.value }}</span>
            <span class="ss-lbl">{{ stat.label }}</span>
            <span v-if="i < stats.length - 1" class="ss-dot"></span>
          </div>
        </div>
      </v-container>
    </section>

    <!-- Story Section -->
    <section class="story-section">
      <v-container>
        <v-row justify="center">
          <v-col cols="12" md="10">
            <v-row>
              <v-col cols="12" md="4">
                <div class="story-side">
                  <span class="eyebrow">MY STORY</span>
                  <h2 class="story-heading">{{ storyTitle }}</h2>
                  <div class="story-badge">
                    <img :src="profileImage" :alt="storyName" class="story-badge-img" />
                    <div>
                      <strong>{{ storyName }}</strong>
                      <span>{{ storyRole }}</span>
                    </div>
                  </div>
                </div>
              </v-col>
              <v-col cols="12" md="7" offset-md="1">
                <p class="story-intro">{{ heroDescription }}</p>
                <div class="story-divider"></div>
                <div v-if="storyContent" v-html="safeStoryContent" class="story-body"></div>
                <div v-else class="story-body"><p>{{ storyContentDefault }}</p></div>
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Services Accordion -->
    <section class="services-section" v-if="coreValues.length">
      <v-container>
        <v-row justify="center">
          <v-col cols="12" md="10">
            <div class="text-center mb-14">
              <span class="eyebrow">EXPERTISE</span>
              <h2 class="section-heading">What I Offer</h2>
            </div>
            <div class="acc-list">
              <div
                v-for="(value, i) in coreValues" :key="value.key"
                class="acc-item"
                :class="{ 'acc-open': openAccordion === i }"
                @click="openAccordion = openAccordion === i ? -1 : i"
              >
                <div class="acc-row">
                  <div class="acc-left">
                    <div class="acc-num-badge">{{ String(i + 1).padStart(2, '0') }}</div>
                    <div class="acc-icon-wrap"><v-icon :icon="value.icon" size="22" color="white"></v-icon></div>
                    <h3 class="acc-title">{{ value.title }}</h3>
                  </div>
                  <div class="acc-toggle-wrap">
                    <v-icon :icon="openAccordion === i ? 'mdi-chevron-up' : 'mdi-chevron-down'" size="20" color="white"></v-icon>
                  </div>
                </div>
                <transition name="slide">
                  <div v-if="openAccordion === i" class="acc-body">
                    <p>{{ value.description }}</p>
                  </div>
                </transition>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Quote -->
    <section class="quote-section">
      <v-container>
        <v-row justify="center">
          <v-col cols="12" md="8" class="text-center">
            <div class="quote-icon"><v-icon size="32" color="white">mdi-format-quote-close</v-icon></div>
            <p class="quote-text">{{ connectDescription }}</p>
            <div class="quote-attr">
              <div class="quote-line"></div>
              <span class="quote-name">{{ storyName }}</span>
              <div class="quote-line"></div>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Connect -->
    <section class="connect-section">
      <v-container>
        <v-row align="center" justify="center">
          <v-col cols="12" md="5" class="text-center mb-8 mb-md-0">
            <div class="qr-card">
              <img :src="qrCodeUrl" alt="QR Code" />
              <span>Scan to Save Contact</span>
            </div>
          </v-col>
          <v-col cols="12" md="5" offset-md="1">
            <span class="eyebrow">LET'S CONNECT</span>
            <h2 class="section-heading mb-6">{{ connectHeading }}</h2>
            <div class="connect-rows">
              <a v-if="contactPhone" :href="`tel:${contactPhone.replace(/[^+\\d]/g, '')}`" class="connect-row">
                <div class="cr-icon"><v-icon size="18" color="white">mdi-phone-outline</v-icon></div>
                <div><strong>Phone</strong><span>{{ contactPhone }}</span></div>
              </a>
              <a v-if="contactEmail" :href="`mailto:${contactEmail}`" class="connect-row">
                <div class="cr-icon"><v-icon size="18" color="white">mdi-email-outline</v-icon></div>
                <div><strong>Email</strong><span>{{ contactEmail }}</span></div>
              </a>
            </div>
            <div v-if="socialLinks.length" class="soc-row">
              <a v-for="social in socialLinks" :key="social.name" :href="social.url" target="_blank" class="soc-item">
                <v-icon size="20">{{ getSocialIcon(social.name) }}</v-icon>
              </a>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- CTA -->
    <section class="cta-section">
      <div class="cta-bg"></div>
      <div class="cta-glow"></div>
      <v-container class="cta-content">
        <v-row justify="center">
          <v-col cols="12" md="8" class="text-center">
            <span class="cta-areas">{{ ctaAreas }}</span>
            <h2 class="cta-title">{{ ctaTitle }}</h2>
            <p class="cta-sub">{{ ctaSubtitle }}</p>
            <div class="d-flex justify-center gap-4 flex-wrap mt-8">
              <v-btn v-if="contactPhone" size="x-large" variant="flat" class="px-12 rounded-pill text-none font-weight-bold hero-btn" :href="`tel:${contactPhone.replace(/[^+\\d]/g, '')}`">Call Now</v-btn>
              <v-btn size="x-large" variant="outlined" class="px-12 rounded-pill text-none font-weight-bold hero-btn-out" href="/contact">Inquire</v-btn>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const props = defineProps<{
  heroTitle: string; heroSubtitle: string; heroDescription: string; profileImage: string
  storyTitle: string; storyName: string; storyRole: string; storyContent: string; storyContentDefault: string
  connectHeading: string; connectDescription: string; coreValues: any[]; stats: any[]
  ctaAreas: string; ctaTitle: string; ctaSubtitle: string; ctaImage: string
  contactPhone: string; contactEmail: string; qrCodeUrl: string; socialLinks: any[]
}>()
// CMS-supplied HTML — sanitize before rendering via v-html.
const safeStoryContent = useSanitizedHtml(() => props.storyContent)
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
.t5 { font-family: 'Inter', sans-serif; }

/* ── HERO ── */
.hero { position: relative; min-height: 100vh; display: flex; align-items: center; overflow: hidden; }
.hero-bg { position: absolute; inset: 0; background: linear-gradient(160deg, #0a0f1a 0%, #0f1729 20%, #131d36 40%, #0f1729 60%, #0a0f1a 100%); }
.hero-glow {
  position: absolute; top: 50%; left: 50%; width: 600px; height: 600px;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%);
  pointer-events: none;
}
.hero-content { position: relative; z-index: 2; }
.hero-center { text-align: center; max-width: 640px; margin: 0 auto; }

.hero-portrait { position: relative; display: inline-block; margin-bottom: 32px; }
.portrait-ring {
  display: inline-block; padding: 4px; border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #6366f1, #8b5cf6);
}
.portrait-ring img { width: 180px; height: 180px; border-radius: 50%; object-fit: cover; border: 4px solid #0f1729; }
.portrait-pulse {
  position: absolute; inset: -8px; border-radius: 50%;
  border: 1px solid rgba(59,130,246,0.15);
  animation: pulse-ring 3s ease-in-out infinite;
}
@keyframes pulse-ring { 0%, 100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.06); opacity: 0; } }

.hero-tag { font-size: 0.55rem; font-weight: 800; letter-spacing: 0.5em; color: #3b82f6; display: block; margin-bottom: 16px; }
.hero-name { font-size: clamp(2.4rem, 4vw, 3.2rem); font-weight: 800; color: white; letter-spacing: -0.03em; margin-bottom: 4px; }
.hero-role { font-size: 0.88rem; color: rgba(148,163,184,0.7); font-weight: 500; margin-bottom: 24px; }
.hero-divider { width: 40px; height: 2px; background: linear-gradient(90deg, #3b82f6, #8b5cf6); margin: 0 auto 24px; border-radius: 1px; }
.hero-title { font-size: clamp(1.4rem, 2.5vw, 1.8rem); font-weight: 600; color: rgba(226,232,240,0.9); line-height: 1.4; margin-bottom: 12px; }
.hero-subtitle { font-size: 0.95rem; color: rgba(148,163,184,0.5); line-height: 1.7; max-width: 500px; margin: 0 auto 36px; }
.hero-actions { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }
.hero-btn { background: linear-gradient(135deg, #3b82f6, #6366f1) !important; color: white !important; }
.hero-btn-out { border-color: rgba(148,163,184,0.2) !important; color: rgba(226,232,240,0.8) !important; }

/* ── STATS ── */
.stats-strip { padding: 40px 0; background: #0f1729; border-top: 1px solid rgba(59,130,246,0.08); border-bottom: 1px solid rgba(59,130,246,0.08); }
.ss-row { display: flex; justify-content: center; align-items: center; gap: 12px; flex-wrap: wrap; }
.ss-item { display: flex; align-items: center; gap: 12px; }
.ss-val { font-size: 2rem; font-weight: 800; color: white; letter-spacing: -0.03em; }
.ss-lbl { font-size: 0.55rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(148,163,184,0.35); }
.ss-dot { width: 4px; height: 4px; border-radius: 50%; background: rgba(59,130,246,0.3); margin-left: 24px; }

/* ── STORY ── */
.eyebrow { font-size: 0.6rem; font-weight: 800; letter-spacing: 0.4em; text-transform: uppercase; color: #3b82f6; display: block; margin-bottom: 14px; }
.section-heading { font-size: 2.2rem; font-weight: 800; color: #0f172a; letter-spacing: -0.03em; line-height: 1.2; }
.story-section { padding: 100px 0; background: white; }
.story-side { position: sticky; top: 100px; }
.story-heading { font-size: 2rem; font-weight: 800; color: #0f172a; letter-spacing: -0.03em; line-height: 1.2; margin-bottom: 24px; }
.story-badge { display: flex; align-items: center; gap: 12px; padding: 14px 18px; background: #f1f5f9; border-radius: 14px; }
.story-badge-img { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; }
.story-badge strong { display: block; font-size: 0.88rem; color: #0f172a; }
.story-badge span { font-size: 0.7rem; color: #64748b; }
.story-intro { font-size: 1.1rem; color: #475569; line-height: 1.8; margin-bottom: 24px; }
.story-divider { width: 40px; height: 3px; background: linear-gradient(90deg, #3b82f6, #6366f1); border-radius: 2px; margin-bottom: 24px; }
.story-body { font-size: 0.95rem; color: #64748b; line-height: 2.1; }
.story-body :deep(p) { margin-bottom: 1.2rem; }

/* ── SERVICES ── */
.services-section { padding: 100px 0; background: #0f172a; }
.services-section .eyebrow { color: #60a5fa; }
.services-section .section-heading { color: white; }
.acc-list { display: flex; flex-direction: column; gap: 6px; }
.acc-item {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px; overflow: hidden; cursor: pointer; transition: all 0.3s;
}
.acc-item:hover { border-color: rgba(59,130,246,0.2); background: rgba(255,255,255,0.05); }
.acc-open { border-color: rgba(59,130,246,0.3); background: rgba(59,130,246,0.05); }
.acc-row { display: flex; align-items: center; justify-content: space-between; padding: 22px 28px; }
.acc-left { display: flex; align-items: center; gap: 16px; }
.acc-num-badge { font-size: 0.55rem; font-weight: 800; letter-spacing: 0.15em; color: rgba(148,163,184,0.3); }
.acc-icon-wrap { width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, #3b82f6, #6366f1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.acc-title { font-size: 1.05rem; font-weight: 700; color: rgba(226,232,240,0.9); margin: 0; }
.acc-toggle-wrap { width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,0.04); display: flex; align-items: center; justify-content: center; }
.acc-body { padding: 0 28px 22px 100px; }
.acc-body p { font-size: 0.88rem; color: rgba(148,163,184,0.6); line-height: 1.8; margin: 0; }
.slide-enter-active, .slide-leave-active { transition: all 0.3s ease; }
.slide-enter-from, .slide-leave-to { opacity: 0; max-height: 0; }
.slide-enter-to, .slide-leave-from { opacity: 1; max-height: 200px; }

/* ── QUOTE ── */
.quote-section { padding: 100px 0; background: #f8fafc; }
.quote-icon {
  width: 56px; height: 56px; border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  display: inline-flex; align-items: center; justify-content: center; margin-bottom: 28px;
}
.quote-text { font-size: 1.4rem; font-weight: 400; font-style: italic; color: #1e293b; line-height: 1.8; margin-bottom: 28px; }
.quote-attr { display: flex; align-items: center; justify-content: center; gap: 16px; }
.quote-line { width: 32px; height: 1px; background: #cbd5e1; }
.quote-name { font-size: 0.75rem; font-weight: 800; color: #0f172a; letter-spacing: 0.2em; text-transform: uppercase; }

/* ── CONNECT ── */
.connect-section { padding: 100px 0; background: white; }
.qr-card { display: inline-flex; flex-direction: column; align-items: center; padding: 40px; background: #f8fafc; border-radius: 24px; border: 1px solid #e2e8f0; }
.qr-card img { width: 180px; height: 180px; margin-bottom: 14px; }
.qr-card span { font-size: 0.55rem; font-weight: 800; letter-spacing: 0.25em; text-transform: uppercase; color: #94a3b8; }
.connect-rows { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
.connect-row { display: flex; align-items: center; gap: 14px; text-decoration: none; color: #0f172a; padding: 16px 20px; background: #f8fafc; border-radius: 14px; border: 1px solid #e2e8f0; transition: all 0.3s; }
.connect-row:hover { border-color: #3b82f6; box-shadow: 0 4px 12px rgba(59,130,246,0.08); }
.cr-icon { width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, #3b82f6, #6366f1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.connect-row strong { display: block; font-size: 0.65rem; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #3b82f6; }
.connect-row span { font-size: 0.9rem; color: #334155; }
.soc-row { display: flex; gap: 10px; }
.soc-item {
  display: flex; align-items: center; justify-content: center; width: 44px; height: 44px;
  border-radius: 12px; background: #f1f5f9; border: 1px solid #e2e8f0;
  color: #475569; text-decoration: none; transition: all 0.3s;
}
.soc-item:hover { background: linear-gradient(135deg, #3b82f6, #6366f1); color: white; border-color: transparent; }

/* ── CTA ── */
.cta-section { position: relative; padding: 120px 0; overflow: hidden; }
.cta-bg { position: absolute; inset: 0; background: linear-gradient(160deg, #0a0f1a 0%, #0f1729 30%, #131d36 60%, #0f1729 100%); }
.cta-glow {
  position: absolute; top: 50%; left: 50%; width: 500px; height: 500px;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%);
}
.cta-content { position: relative; z-index: 2; }
.cta-areas { font-size: 0.55rem; font-weight: 800; letter-spacing: 0.4em; color: rgba(148,163,184,0.3); display: block; margin-bottom: 16px; }
.cta-title { font-size: clamp(2rem, 4vw, 3rem); font-weight: 800; color: white; letter-spacing: -0.03em; line-height: 1.15; margin-bottom: 12px; }
.cta-sub { font-size: 0.95rem; color: rgba(148,163,184,0.45); max-width: 480px; margin: 0 auto; line-height: 1.7; }

@media (max-width: 960px) {
  .hero { min-height: auto; padding: 100px 0 80px; }
  .portrait-ring img { width: 140px; height: 140px; }
  .hero-name { font-size: 2rem; }
  .story-side { position: static; margin-bottom: 24px; }
  .acc-body { padding-left: 28px; }
  .cta-title { font-size: 2rem; }
}
</style>
