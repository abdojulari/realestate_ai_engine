<template>
  <div class="about-t4">
    <!-- Bold Split Hero -->
    <section class="hero">
      <div class="hero-left">
        <div class="hero-left-inner">
          <div class="hero-label">ABOUT</div>
          <h1 class="hero-title">{{ heroTitle }}</h1>
          <p class="hero-sub">{{ heroSubtitle }}</p>
          <div class="hero-separator"></div>
          <p class="hero-desc">{{ heroDescription }}</p>
          <div class="hero-actions">
            <v-btn size="x-large" color="white" variant="flat" class="px-10 text-none font-weight-bold rounded-0 text-black" href="/contact">
              Contact Me
            </v-btn>
            <v-btn v-if="contactPhone" size="x-large" variant="outlined" color="white" class="px-8 text-none font-weight-bold rounded-0" :href="`tel:${contactPhone.replace(/[^+\\d]/g, '')}`">
              <v-icon class="mr-2" size="20">mdi-phone</v-icon> Call
            </v-btn>
          </div>
        </div>
      </div>
      <div class="hero-right">
        <img :src="profileImage" :alt="storyName" class="hero-photo" />
      </div>
    </section>

    <!-- Bold Stats Band -->
    <section v-if="stats.length > 0" class="stats-band">
      <v-container>
        <v-row>
          <v-col v-for="stat in stats" :key="stat.key" cols="6" md="3">
            <div class="stat-block">
              <div class="stat-number">{{ stat.value }}</div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Story — Asymmetric Layout -->
    <section class="story-section">
      <v-container>
        <v-row>
          <v-col cols="12" md="4">
            <div class="story-sidebar">
              <div class="accent-bar"></div>
              <h2 class="story-heading">{{ storyTitle }}</h2>
              <div class="story-meta">
                <span class="meta-name">{{ storyName }}</span>
                <span class="meta-role">{{ storyRole }}</span>
              </div>
            </div>
          </v-col>
          <v-col cols="12" md="7" offset-md="1">
            <div v-if="storyContent" v-html="storyContent" class="story-text"></div>
            <div v-else class="story-text"><p>{{ storyContentDefault }}</p></div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Values — Dark Grid -->
    <section class="values-section">
      <v-container>
        <div class="values-header">
          <span class="sec-label">PRINCIPLES</span>
          <h2 class="sec-title">What I Believe In</h2>
        </div>
        <v-row>
          <v-col v-for="(value, i) in coreValues" :key="value.key" cols="12" md="4">
            <div class="val-block">
              <div class="val-num">0{{ i + 1 }}</div>
              <v-icon :icon="value.icon" size="32" class="val-icon"></v-icon>
              <h3 class="val-title">{{ value.title }}</h3>
              <p class="val-desc">{{ value.description }}</p>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Connect — High Contrast -->
    <section class="connect-section">
      <v-container>
        <v-row align="center">
          <v-col cols="12" md="5">
            <div class="qr-panel">
              <img :src="qrCodeUrl" alt="QR Code" class="qr-img" />
              <p class="qr-label">SCAN TO CONNECT</p>
            </div>
          </v-col>
          <v-col cols="12" md="6" offset-md="1">
            <span class="sec-label text-white">REACH OUT</span>
            <h2 class="sec-title text-white mb-6">{{ connectHeading }}</h2>
            <p class="connect-desc">{{ connectDescription }}</p>
            <div v-if="socialLinks.length" class="social-grid">
              <a v-for="social in socialLinks" :key="social.name" :href="social.url" target="_blank" class="social-block">
                <v-icon size="24">{{ getSocialIcon(social.name) }}</v-icon>
                <span>{{ social.name }}</span>
              </a>
            </div>
            <div class="contact-col">
              <a v-if="contactEmail" :href="`mailto:${contactEmail}`" class="ct-link">
                <v-icon size="18" class="mr-3">mdi-email-outline</v-icon>{{ contactEmail }}
              </a>
              <a v-if="contactPhone" :href="`tel:${contactPhone.replace(/[^+\\d]/g, '')}`" class="ct-link">
                <v-icon size="18" class="mr-3">mdi-phone-outline</v-icon>{{ contactPhone }}
              </a>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Bold CTA -->
    <section class="cta-section" :style="{ backgroundImage: `url(${ctaImage})` }">
      <div class="cta-overlay">
        <v-container>
          <v-row justify="center">
            <v-col cols="12" md="8" class="text-center">
              <span class="cta-label">{{ ctaAreas }}</span>
              <h2 class="cta-title">{{ ctaTitle }}</h2>
              <p class="cta-sub">{{ ctaSubtitle }}</p>
              <div class="d-flex justify-center gap-4 flex-wrap">
                <v-btn v-if="contactPhone" size="x-large" color="white" variant="flat" class="px-12 rounded-0 text-black font-weight-black" :href="`tel:${contactPhone.replace(/[^+\\d]/g, '')}`">
                  CALL NOW
                </v-btn>
                <v-btn size="x-large" variant="outlined" color="white" class="px-12 rounded-0 font-weight-bold" href="/contact">
                  INQUIRE
                </v-btn>
              </div>
            </v-col>
          </v-row>
        </v-container>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  heroTitle: string
  heroSubtitle: string
  heroDescription: string
  profileImage: string
  storyTitle: string
  storyName: string
  storyRole: string
  storyContent: string
  storyContentDefault: string
  connectHeading: string
  connectDescription: string
  coreValues: any[]
  stats: any[]
  ctaAreas: string
  ctaTitle: string
  ctaSubtitle: string
  ctaImage: string
  contactPhone: string
  contactEmail: string
  qrCodeUrl: string
  socialLinks: any[]
}>()

function getSocialIcon(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('facebook')) return 'mdi-facebook'
  if (n.includes('instagram')) return 'mdi-instagram'
  if (n.includes('linkedin')) return 'mdi-linkedin'
  if (n.includes('twitter') || n.includes('x.com') || n === 'x') return 'mdi-twitter'
  if (n.includes('youtube')) return 'mdi-youtube'
  if (n.includes('tiktok')) return 'mdi-music-note'
  return 'mdi-link'
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

.about-t4 { font-family: 'Inter', sans-serif; }

/* ── Hero ── */
.hero { display: flex; min-height: 100vh; }
.hero-left {
  flex: 1; background: #0a0a0a; color: white;
  display: flex; align-items: center; padding: 80px 60px;
}
.hero-left-inner { max-width: 520px; }
.hero-label {
  font-size: 0.6rem; font-weight: 900; letter-spacing: 0.4em;
  color: rgba(255,255,255,0.35); margin-bottom: 32px;
}
.hero-title {
  font-size: clamp(3rem, 5vw, 4.5rem); font-weight: 900;
  line-height: 1.0; letter-spacing: -0.06em; margin-bottom: 20px;
  text-transform: uppercase;
}
.hero-sub { font-size: 1.1rem; font-weight: 500; color: rgba(255,255,255,0.7); margin-bottom: 24px; line-height: 1.6; }
.hero-separator { width: 80px; height: 4px; background: white; margin-bottom: 24px; }
.hero-desc { font-size: 0.95rem; color: rgba(255,255,255,0.45); line-height: 1.8; margin-bottom: 40px; }
.hero-actions { display: flex; gap: 12px; flex-wrap: wrap; }
.hero-right { flex: 1; position: relative; overflow: hidden; }
.hero-photo { width: 100%; height: 100%; object-fit: cover; }

/* ── Stats ── */
.stats-band { background: #111; padding: 60px 0; }
.stat-block { text-align: center; padding: 20px; }
.stat-number { font-size: 2.8rem; font-weight: 900; color: white; letter-spacing: -0.04em; }
.stat-label { font-size: 0.6rem; font-weight: 800; letter-spacing: 0.25em; text-transform: uppercase; color: #555; margin-top: 4px; }

/* ── Story ── */
.story-section { padding: 120px 0; background: #fafafa; }
.story-sidebar { position: sticky; top: 100px; }
.accent-bar { width: 6px; height: 60px; background: #0a0a0a; margin-bottom: 24px; }
.story-heading { font-size: 2.2rem; font-weight: 800; letter-spacing: -0.03em; line-height: 1.2; margin-bottom: 24px; }
.story-meta { display: flex; flex-direction: column; gap: 2px; }
.meta-name { font-size: 0.95rem; font-weight: 700; color: #0a0a0a; }
.meta-role { font-size: 0.8rem; color: #888; }
.story-text { font-size: 1.05rem; line-height: 2; color: #444; }
.story-text :deep(p) { margin-bottom: 1.5rem; }

/* ── Values ── */
.values-section { padding: 100px 0; background: #0a0a0a; }
.sec-label { font-size: 0.6rem; font-weight: 900; letter-spacing: 0.35em; text-transform: uppercase; color: #555; display: block; margin-bottom: 12px; }
.sec-title { font-size: 2.2rem; font-weight: 800; letter-spacing: -0.03em; color: white; margin-bottom: 48px; }
.values-header { margin-bottom: 16px; }
.val-block {
  padding: 40px 32px; border: 1px solid #222; border-radius: 4px;
  height: 100%; transition: all 0.3s ease; position: relative;
}
.val-block:hover { border-color: #444; background: #111; transform: translateY(-4px); }
.val-num { position: absolute; top: 16px; right: 20px; font-size: 0.7rem; font-weight: 900; color: #333; letter-spacing: 0.1em; }
.val-icon { color: #666; margin-bottom: 20px; }
.val-title { font-size: 1.1rem; font-weight: 700; color: white; margin-bottom: 10px; }
.val-desc { font-size: 0.9rem; color: #777; line-height: 1.7; }

/* ── Connect ── */
.connect-section { padding: 100px 0; background: #141414; }
.qr-panel {
  background: white; padding: 40px; display: inline-flex; flex-direction: column;
  align-items: center; border-radius: 4px;
}
.qr-img { width: 180px; height: 180px; }
.qr-label { font-size: 0.55rem; font-weight: 900; letter-spacing: 0.3em; color: #888; margin-top: 16px; }
.connect-desc { font-size: 1rem; color: rgba(255,255,255,0.5); line-height: 1.8; margin-bottom: 32px; max-width: 420px; }
.social-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 28px; }
.social-block {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 18px; border: 1px solid #333; font-size: 0.8rem;
  font-weight: 600; color: rgba(255,255,255,0.7); text-decoration: none;
  transition: all 0.3s;
}
.social-block:hover { border-color: white; color: white; }
.contact-col { display: flex; flex-direction: column; gap: 12px; }
.ct-link { display: flex; align-items: center; color: rgba(255,255,255,0.5); text-decoration: none; font-size: 0.9rem; transition: color 0.3s; }
.ct-link:hover { color: white; }

/* ── CTA ── */
.cta-section {
  min-height: 70vh; background-size: cover; background-position: center;
  background-attachment: fixed; position: relative;
}
.cta-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.75); display: flex; align-items: center;
}
.cta-label { font-size: 0.6rem; font-weight: 900; letter-spacing: 0.35em; color: rgba(255,255,255,0.4); display: block; margin-bottom: 20px; }
.cta-title { font-size: 3.5rem; font-weight: 900; color: white; letter-spacing: -0.04em; line-height: 1.05; margin-bottom: 20px; text-transform: uppercase; }
.cta-sub { font-size: 1.1rem; color: rgba(255,255,255,0.5); max-width: 500px; margin: 0 auto 48px; line-height: 1.7; }

@supports (-webkit-overflow-scrolling: touch) {
  .cta-section { background-attachment: scroll; }
}

@media (max-width: 960px) {
  .hero { flex-direction: column; }
  .hero-left { padding: 60px 24px; }
  .hero-right { height: 50vh; }
  .hero-title { font-size: 2.8rem; }
  .cta-title { font-size: 2.2rem; }
  .story-sidebar { position: static; }
}
</style>
