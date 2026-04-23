<template>
  <div class="t2">
    <!-- Immersive Full-Bleed Hero with Glassmorphism Card -->
    <section class="hero">
      <div class="hero-bg" :style="{ backgroundImage: `url(${ctaImage})` }"></div>
      <div class="hero-gradient"></div>
      <v-container class="hero-content">
        <v-row align="center" class="hero-row">
          <v-col cols="12" md="6">
            <div class="glass-card">
              <span class="glass-tag">ABOUT ME</span>
              <h1 class="glass-title">{{ heroTitle }}</h1>
              <p class="glass-sub">{{ heroSubtitle }}</p>
              <div class="glass-divider"></div>
              <p class="glass-desc">{{ heroDescription }}</p>
              <div class="glass-actions">
                <v-btn size="large" color="white" variant="flat" class="px-8 text-none font-weight-bold rounded-pill" style="color: #0f172a;" href="/contact">
                  Let's Talk
                </v-btn>
                <v-btn v-if="contactPhone" size="large" variant="outlined" color="white" class="px-6 text-none font-weight-medium rounded-pill" :href="`tel:${contactPhone.replace(/[^+\\d]/g, '')}`">
                  <v-icon size="18" class="mr-2">mdi-phone</v-icon> Call Me
                </v-btn>
              </div>
            </div>
          </v-col>
          <v-col cols="12" md="5" offset-md="1" class="text-center">
            <div class="hero-portrait-frame">
              <img :src="profileImage" :alt="storyName" />
              <div class="portrait-glass-label">
                <strong>{{ storyName }}</strong>
                <span>{{ storyRole }}</span>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Floating Stats Ribbon -->
    <section class="stats-ribbon" v-if="stats.length > 0">
      <v-container>
        <div class="ribbon-inner">
          <div v-for="stat in stats" :key="stat.key" class="ribbon-stat">
            <span class="rs-val">{{ stat.value }}</span>
            <span class="rs-lbl">{{ stat.label }}</span>
          </div>
        </div>
      </v-container>
    </section>

    <!-- Story as Horizontal Timeline -->
    <section class="timeline-section">
      <v-container>
        <div class="text-center mb-16">
          <span class="sec-eyebrow">MY JOURNEY</span>
          <h2 class="sec-heading">{{ storyTitle }}</h2>
        </div>
        <div class="timeline-content">
          <div class="timeline-line"></div>
          <v-row>
            <v-col cols="12" md="5">
              <div class="timeline-card tl-left">
                <div class="tl-dot"></div>
                <div class="tl-inner">
                  <h3>Background</h3>
                  <div v-if="storyContent" v-html="safeStoryContent" class="tl-text"></div>
                  <div v-else class="tl-text"><p>{{ storyContentDefault }}</p></div>
                </div>
              </div>
            </v-col>
            <v-col cols="12" md="5" offset-md="2">
              <div class="timeline-card tl-right">
                <div class="tl-dot"></div>
                <div class="tl-inner">
                  <h3>My Approach</h3>
                  <p>{{ connectDescription }}</p>
                </div>
              </div>
            </v-col>
          </v-row>
        </div>
      </v-container>
    </section>

    <!-- Values with Glassmorphism -->
    <section class="values-glass">
      <div class="values-bg" :style="{ backgroundImage: `url(${ctaImage})` }"></div>
      <div class="values-overlay"></div>
      <v-container class="values-inner">
        <div class="text-center mb-14">
          <span class="sec-eyebrow text-white">WHAT DRIVES ME</span>
          <h2 class="sec-heading text-white">Core Values</h2>
        </div>
        <v-row justify="center">
          <v-col v-for="value in coreValues" :key="value.key" cols="12" md="4">
            <div class="value-glass-card">
              <v-icon :icon="value.icon" size="36" color="white" class="mb-5"></v-icon>
              <h3>{{ value.title }}</h3>
              <p>{{ value.description }}</p>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Connect with Social Grid -->
    <section class="connect-grid-section">
      <v-container>
        <v-row align="center">
          <v-col cols="12" md="5" class="text-center mb-8 mb-md-0">
            <div class="qr-glass">
              <img :src="qrCodeUrl" alt="QR Code" />
              <span>Scan to Save Contact</span>
            </div>
          </v-col>
          <v-col cols="12" md="6" offset-md="1">
            <span class="sec-eyebrow">CONNECT</span>
            <h2 class="sec-heading mb-4">{{ connectHeading }}</h2>
            <p class="connect-text">{{ connectDescription }}</p>
            <div v-if="socialLinks.length" class="social-glass-grid">
              <a v-for="social in socialLinks" :key="social.name" :href="social.url" target="_blank" class="social-glass-item">
                <v-icon size="22">{{ getSocialIcon(social.name) }}</v-icon>
                <span>{{ social.name }}</span>
              </a>
            </div>
            <div class="ct-col">
              <a v-if="contactEmail" :href="`mailto:${contactEmail}`" class="ct-link"><v-icon size="16" class="mr-2">mdi-email-outline</v-icon>{{ contactEmail }}</a>
              <a v-if="contactPhone" :href="`tel:${contactPhone.replace(/[^+\\d]/g, '')}`" class="ct-link"><v-icon size="16" class="mr-2">mdi-phone-outline</v-icon>{{ contactPhone }}</a>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- CTA with Glassmorphism -->
    <section class="cta-glass">
      <div class="cta-bg" :style="{ backgroundImage: `url(${ctaImage})` }"></div>
      <div class="cta-overlay"></div>
      <v-container class="cta-inner">
        <div class="cta-glass-card">
          <span class="cta-tag">{{ ctaAreas }}</span>
          <h2 class="cta-title">{{ ctaTitle }}</h2>
          <p class="cta-sub">{{ ctaSubtitle }}</p>
          <div class="d-flex justify-center gap-4 flex-wrap">
            <v-btn v-if="contactPhone" size="x-large" color="white" variant="flat" class="px-10 rounded-pill text-none font-weight-bold" style="color: #0f172a;" :href="`tel:${contactPhone.replace(/[^+\\d]/g, '')}`">Call Now</v-btn>
            <v-btn size="x-large" variant="outlined" color="white" class="px-10 rounded-pill text-none font-weight-bold" href="/contact">Inquire</v-btn>
          </div>
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
.t2 { font-family: 'Inter', sans-serif; }

/* ── HERO ── */
.hero { position: relative; min-height: 100vh; display: flex; align-items: center; overflow: hidden; }
.hero-bg { position: absolute; inset: 0; background-size: cover; background-position: center; transform: scale(1.05); }
.hero-gradient { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(15,23,42,0.92) 0%, rgba(30,58,95,0.85) 50%, rgba(15,23,42,0.9) 100%); }
.hero-content { position: relative; z-index: 2; }
.hero-row { min-height: 85vh; }

.glass-card {
  background: rgba(255,255,255,0.06); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255,255,255,0.1); border-radius: 28px; padding: 52px 44px;
}
.glass-tag { font-size: 0.6rem; font-weight: 800; letter-spacing: 0.4em; color: rgba(255,255,255,0.4); display: block; margin-bottom: 20px; }
.glass-title { font-size: clamp(2.5rem, 5vw, 3.8rem); font-weight: 800; color: white; line-height: 1.05; letter-spacing: -0.04em; margin-bottom: 16px; }
.glass-sub { font-size: 1.1rem; color: rgba(255,255,255,0.7); font-weight: 500; margin-bottom: 20px; line-height: 1.6; }
.glass-divider { width: 50px; height: 3px; background: linear-gradient(90deg, #60a5fa, #a78bfa); border-radius: 2px; margin-bottom: 20px; }
.glass-desc { font-size: 0.95rem; color: rgba(255,255,255,0.45); line-height: 1.8; margin-bottom: 32px; }
.glass-actions { display: flex; gap: 12px; flex-wrap: wrap; }

.hero-portrait-frame { position: relative; display: inline-block; }
.hero-portrait-frame img {
  width: 320px; height: 400px; object-fit: cover; border-radius: 24px;
  border: 3px solid rgba(255,255,255,0.15); box-shadow: 0 40px 80px rgba(0,0,0,0.4);
}
.portrait-glass-label {
  position: absolute; bottom: -16px; left: 50%; transform: translateX(-50%);
  background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.15); border-radius: 16px; padding: 14px 28px;
  text-align: center; white-space: nowrap;
}
.portrait-glass-label strong { display: block; color: white; font-size: 0.95rem; }
.portrait-glass-label span { color: rgba(255,255,255,0.5); font-size: 0.75rem; }

/* ── STATS ── */
.stats-ribbon { padding: 48px 0; background: #f8fafc; }
.ribbon-inner { display: flex; justify-content: center; gap: 48px; flex-wrap: wrap; }
.ribbon-stat { text-align: center; }
.rs-val { display: block; font-size: 2.2rem; font-weight: 800; color: #0f172a; letter-spacing: -0.03em; }
.rs-lbl { font-size: 0.6rem; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; color: #94a3b8; }

/* ── TIMELINE ── */
.sec-eyebrow { font-size: 0.6rem; font-weight: 800; letter-spacing: 0.35em; text-transform: uppercase; color: #60a5fa; display: block; margin-bottom: 12px; }
.sec-heading { font-size: 2.5rem; font-weight: 800; color: #0f172a; letter-spacing: -0.03em; line-height: 1.2; }
.timeline-section { padding: 120px 0; background: white; }
.timeline-content { position: relative; }
.timeline-line { position: absolute; left: 50%; top: 0; bottom: 0; width: 2px; background: linear-gradient(to bottom, #e2e8f0, #60a5fa, #e2e8f0); transform: translateX(-50%); }
.timeline-card { position: relative; padding: 40px; background: #f8fafc; border-radius: 20px; border: 1px solid #e2e8f0; }
.tl-right { margin-top: 80px; }
.tl-dot { position: absolute; width: 16px; height: 16px; border-radius: 50%; background: #60a5fa; border: 3px solid white; box-shadow: 0 0 0 3px #60a5fa33; }
.tl-left .tl-dot { right: -52px; top: 48px; }
.tl-right .tl-dot { left: -52px; top: 48px; }
.tl-inner h3 { font-size: 1.1rem; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
.tl-text { font-size: 0.95rem; color: #64748b; line-height: 1.9; }
.tl-text :deep(p) { margin-bottom: 1rem; }

/* ── VALUES GLASS ── */
.values-glass { position: relative; padding: 120px 0; overflow: hidden; }
.values-bg { position: absolute; inset: 0; background-size: cover; background-position: center; filter: brightness(0.3); }
.values-overlay { position: absolute; inset: 0; background: rgba(15,23,42,0.7); }
.values-inner { position: relative; z-index: 2; }
.value-glass-card {
  background: rgba(255,255,255,0.06); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 40px 32px;
  text-align: center; height: 100%; transition: all 0.4s ease;
}
.value-glass-card:hover { background: rgba(255,255,255,0.1); transform: translateY(-8px); border-color: rgba(255,255,255,0.2); }
.value-glass-card h3 { color: white; font-size: 1.15rem; font-weight: 700; margin-bottom: 10px; }
.value-glass-card p { color: rgba(255,255,255,0.55); font-size: 0.9rem; line-height: 1.7; }

/* ── CONNECT ── */
.connect-grid-section { padding: 100px 0; background: #f8fafc; }
.connect-text { color: #64748b; line-height: 1.8; margin-bottom: 28px; max-width: 440px; }
.social-glass-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 24px; }
.social-glass-item {
  display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px;
  background: white; border: 1px solid #e2e8f0; border-radius: 12px;
  font-size: 0.8rem; font-weight: 600; color: #334155; text-decoration: none; transition: all 0.3s;
}
.social-glass-item:hover { border-color: #60a5fa; color: #1e40af; box-shadow: 0 4px 12px rgba(96,165,250,0.15); }
.ct-col { display: flex; flex-direction: column; gap: 10px; }
.ct-link { display: flex; align-items: center; color: #64748b; text-decoration: none; font-size: 0.9rem; transition: color 0.3s; }
.ct-link:hover { color: #1e40af; }
.qr-glass {
  display: inline-flex; flex-direction: column; align-items: center; padding: 36px;
  background: white; border-radius: 24px; border: 1px solid #e2e8f0;
  box-shadow: 0 20px 50px rgba(0,0,0,0.06);
}
.qr-glass span { font-size: 0.6rem; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; color: #94a3b8; margin-top: 14px; }

/* ── CTA GLASS ── */
.cta-glass { position: relative; min-height: 60vh; display: flex; align-items: center; overflow: hidden; }
.cta-bg { position: absolute; inset: 0; background-size: cover; background-position: center; }
.cta-overlay { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,58,95,0.85)); }
.cta-inner { position: relative; z-index: 2; }
.cta-glass-card {
  background: rgba(255,255,255,0.06); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255,255,255,0.1); border-radius: 32px; padding: 80px 60px; text-align: center;
  max-width: 800px; margin: 0 auto;
}
.cta-tag { font-size: 0.6rem; font-weight: 800; letter-spacing: 0.35em; color: rgba(255,255,255,0.35); display: block; margin-bottom: 20px; }
.cta-title { font-size: 2.8rem; font-weight: 800; color: white; letter-spacing: -0.03em; line-height: 1.15; margin-bottom: 16px; }
.cta-sub { font-size: 1rem; color: rgba(255,255,255,0.5); max-width: 480px; margin: 0 auto 40px; line-height: 1.7; }

@media (max-width: 960px) {
  .glass-card { padding: 36px 24px; }
  .glass-title { font-size: 2.2rem; }
  .hero-portrait-frame img { width: 240px; height: 300px; }
  .timeline-line { display: none; }
  .tl-dot { display: none; }
  .tl-right { margin-top: 24px; }
  .cta-glass-card { padding: 48px 24px; }
  .cta-title { font-size: 2rem; }
}
</style>
