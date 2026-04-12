<template>
  <div class="t3">
    <!-- No hero. Opens with an editorial masthead -->
    <section class="masthead">
      <v-container>
        <div class="mh-inner">
          <span class="mh-tag">ABOUT</span>
          <h1 class="mh-title">{{ heroTitle }}</h1>
          <div class="mh-line"></div>
        </div>
      </v-container>
    </section>

    <!-- Profile + Story: Magazine Side-by-Side -->
    <section class="profile-editorial">
      <v-container>
        <v-row>
          <v-col cols="12" md="5">
            <div class="pe-img-wrap">
              <img :src="profileImage" :alt="storyName" class="pe-img" />
              <div class="pe-name-strip">
                <strong>{{ storyName }}</strong>
                <span>{{ storyRole }}</span>
              </div>
            </div>
            <!-- Contact aside -->
            <div class="pe-contact-card">
              <a v-if="contactPhone" :href="`tel:${contactPhone.replace(/[^+\\d]/g, '')}`" class="pec-row">
                <v-icon size="18" color="#0f172a">mdi-phone-outline</v-icon>
                <span>{{ contactPhone }}</span>
              </a>
              <a v-if="contactEmail" :href="`mailto:${contactEmail}`" class="pec-row">
                <v-icon size="18" color="#0f172a">mdi-email-outline</v-icon>
                <span>{{ contactEmail }}</span>
              </a>
              <div v-if="socialLinks.length" class="pec-social">
                <a v-for="social in socialLinks" :key="social.name" :href="social.url" target="_blank" class="pec-soc-icon">
                  <v-icon size="18">{{ getSocialIcon(social.name) }}</v-icon>
                </a>
              </div>
            </div>
          </v-col>
          <v-col cols="12" md="6" offset-md="1">
            <div class="pe-subtitle">{{ heroSubtitle }}</div>
            <p class="pe-desc">{{ heroDescription }}</p>
            <div class="pe-divider"></div>
            <h2 class="pe-story-title">{{ storyTitle }}</h2>
            <div v-if="storyContent" v-html="storyContent" class="pe-story-body"></div>
            <div v-else class="pe-story-body"><p>{{ storyContentDefault }}</p></div>
            <!-- Pull quote -->
            <blockquote class="pe-quote">
              <span class="pq-mark">&ldquo;</span>
              {{ connectDescription }}
            </blockquote>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Services / Expertise Showcase -->
    <section class="services-showcase" v-if="coreValues.length">
      <v-container>
        <div class="ss-header">
          <span class="ss-tag">EXPERTISE</span>
          <h2 class="ss-title">What I Bring to Every Client</h2>
        </div>
        <div class="ss-grid">
          <div v-for="(value, i) in coreValues" :key="value.key" class="ss-card" :class="`ss-card-${(i % 3) + 1}`">
            <div class="ss-number">{{ String(i + 1).padStart(2, '0') }}</div>
            <v-icon :icon="value.icon" size="32" class="ss-icon"></v-icon>
            <h3 class="ss-card-title">{{ value.title }}</h3>
            <p class="ss-card-desc">{{ value.description }}</p>
          </div>
        </div>
      </v-container>
    </section>

    <!-- Stats Inline Band -->
    <section class="stats-band" v-if="stats.length">
      <v-container>
        <div class="sb-row">
          <div v-for="stat in stats" :key="stat.key" class="sb-item">
            <span class="sb-val">{{ stat.value }}</span>
            <span class="sb-lbl">{{ stat.label }}</span>
          </div>
        </div>
      </v-container>
    </section>

    <!-- QR + Connect -->
    <section class="connect-editorial">
      <v-container>
        <v-row align="center">
          <v-col cols="12" md="7">
            <span class="ss-tag">LET'S CONNECT</span>
            <h2 class="ce-title">{{ connectHeading }}</h2>
            <p class="ce-desc">{{ connectDescription }}</p>
            <div class="ce-actions">
              <v-btn size="large" color="#0f172a" variant="flat" class="px-10 text-none font-weight-bold rounded-pill" href="/contact">Get in Touch</v-btn>
              <v-btn v-if="contactPhone" size="large" variant="outlined" color="#0f172a" class="px-8 text-none font-weight-medium rounded-pill" :href="`tel:${contactPhone.replace(/[^+\\d]/g, '')}`">
                <v-icon size="18" class="mr-2">mdi-phone</v-icon>Call
              </v-btn>
            </div>
          </v-col>
          <v-col cols="12" md="4" offset-md="1" class="text-center">
            <div class="ce-qr">
              <img :src="qrCodeUrl" alt="QR Code" />
              <span>Scan to save contact</span>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- CTA Banner -->
    <section class="cta-editorial">
      <v-container>
        <div class="cta-bar">
          <div>
            <span class="cta-label">{{ ctaAreas }}</span>
            <h2 class="cta-heading">{{ ctaTitle }}</h2>
            <p class="cta-sub">{{ ctaSubtitle }}</p>
          </div>
          <div class="cta-btns">
            <v-btn v-if="contactPhone" size="x-large" color="white" variant="flat" class="px-10 rounded-pill text-none font-weight-bold" style="color: #0f172a;" :href="`tel:${contactPhone.replace(/[^+\\d]/g, '')}`">Call Now</v-btn>
            <v-btn size="x-large" variant="outlined" color="white" class="px-10 rounded-pill text-none font-weight-bold" href="/contact">Inquire</v-btn>
          </div>
        </div>
      </v-container>
    </section>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  heroTitle: string; heroSubtitle: string; heroDescription: string; profileImage: string
  storyTitle: string; storyName: string; storyRole: string; storyContent: string; storyContentDefault: string
  connectHeading: string; connectDescription: string; coreValues: any[]; stats: any[]
  ctaAreas: string; ctaTitle: string; ctaSubtitle: string; ctaImage: string
  contactPhone: string; contactEmail: string; qrCodeUrl: string; socialLinks: any[]
}>()
function getSocialIcon(n: string): string {
  const l = n.toLowerCase()
  if (l.includes('facebook')) return 'mdi-facebook'; if (l.includes('instagram')) return 'mdi-instagram'
  if (l.includes('linkedin')) return 'mdi-linkedin'; if (l.includes('twitter') || l.includes('x.com') || l === 'x') return 'mdi-twitter'
  if (l.includes('youtube')) return 'mdi-youtube'; if (l.includes('tiktok')) return 'mdi-music-note'
  return 'mdi-link'
}
</script>

<style scoped>
.t3 { font-family: 'Inter', sans-serif; background: #fafaf9; }

/* ── MASTHEAD ── */
.masthead { padding: 100px 0 40px; background: white; border-bottom: 1px solid #e7e5e4; }
.mh-inner { max-width: 700px; }
.mh-tag { font-size: 0.6rem; font-weight: 800; letter-spacing: 0.4em; color: #a8a29e; display: block; margin-bottom: 20px; }
.mh-title { font-size: clamp(2.5rem, 5vw, 4rem); font-weight: 800; color: #1c1917; letter-spacing: -0.04em; line-height: 1.05; margin-bottom: 24px; }
.mh-line { width: 60px; height: 3px; background: #1c1917; }

/* ── PROFILE EDITORIAL ── */
.profile-editorial { padding: 80px 0 100px; background: white; }
.pe-img-wrap { position: relative; margin-bottom: 24px; }
.pe-img { width: 100%; aspect-ratio: 4/5; object-fit: cover; border-radius: 16px; }
.pe-name-strip { margin-top: 16px; }
.pe-name-strip strong { display: block; font-size: 1.15rem; font-weight: 700; color: #1c1917; }
.pe-name-strip span { font-size: 0.8rem; color: #78716c; }
.pe-contact-card { padding: 24px; background: #f5f5f4; border-radius: 14px; margin-top: 20px; }
.pec-row { display: flex; align-items: center; gap: 10px; text-decoration: none; color: #44403c; font-size: 0.9rem; padding: 6px 0; transition: color 0.3s; }
.pec-row:hover { color: #1c1917; }
.pec-social { display: flex; gap: 8px; margin-top: 14px; padding-top: 14px; border-top: 1px solid #e7e5e4; }
.pec-soc-icon { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 10px; background: white; border: 1px solid #e7e5e4; color: #44403c; text-decoration: none; transition: all 0.3s; }
.pec-soc-icon:hover { border-color: #1c1917; color: #1c1917; }

.pe-subtitle { font-size: 1.2rem; font-weight: 600; color: #1c1917; margin-bottom: 16px; line-height: 1.5; }
.pe-desc { font-size: 1rem; color: #78716c; line-height: 1.9; margin-bottom: 32px; }
.pe-divider { width: 40px; height: 2px; background: #d6d3d1; margin-bottom: 32px; }
.pe-story-title { font-size: 1.6rem; font-weight: 700; color: #1c1917; margin-bottom: 20px; letter-spacing: -0.02em; }
.pe-story-body { font-size: 0.95rem; color: #57534e; line-height: 2; margin-bottom: 32px; }
.pe-story-body :deep(p) { margin-bottom: 1.2rem; }
.pe-quote { position: relative; padding: 28px 32px; background: #f5f5f4; border-left: 4px solid #1c1917; border-radius: 0 12px 12px 0; font-size: 1rem; font-style: italic; color: #44403c; line-height: 1.8; }
.pq-mark { font-size: 3rem; font-weight: 700; color: #d6d3d1; position: absolute; top: 8px; left: 12px; line-height: 1; }

/* ── SERVICES ── */
.services-showcase { padding: 100px 0; background: #fafaf9; }
.ss-header { margin-bottom: 56px; }
.ss-tag { font-size: 0.6rem; font-weight: 800; letter-spacing: 0.35em; text-transform: uppercase; color: #a8a29e; display: block; margin-bottom: 10px; }
.ss-title { font-size: 2.2rem; font-weight: 800; color: #1c1917; letter-spacing: -0.03em; }
.ss-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
.ss-card { padding: 40px 32px; border-radius: 20px; position: relative; overflow: hidden; transition: all 0.4s; }
.ss-card-1 { background: #1c1917; color: white; }
.ss-card-2 { background: white; border: 1px solid #e7e5e4; }
.ss-card-3 { background: #f5f5f4; }
.ss-card:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(0,0,0,0.08); }
.ss-number { position: absolute; top: 24px; right: 28px; font-size: 0.65rem; font-weight: 800; letter-spacing: 0.2em; opacity: 0.3; }
.ss-icon { margin-bottom: 20px; }
.ss-card-1 .ss-icon { color: white; }
.ss-card-2 .ss-icon, .ss-card-3 .ss-icon { color: #1c1917; }
.ss-card-title { font-size: 1.15rem; font-weight: 700; margin-bottom: 10px; }
.ss-card-1 .ss-card-title { color: white; }
.ss-card-2 .ss-card-title, .ss-card-3 .ss-card-title { color: #1c1917; }
.ss-card-desc { font-size: 0.9rem; line-height: 1.7; }
.ss-card-1 .ss-card-desc { color: rgba(255,255,255,0.55); }
.ss-card-2 .ss-card-desc, .ss-card-3 .ss-card-desc { color: #78716c; }

/* ── STATS ── */
.stats-band { padding: 48px 0; background: #1c1917; }
.sb-row { display: flex; justify-content: center; gap: 56px; flex-wrap: wrap; }
.sb-item { text-align: center; }
.sb-val { display: block; font-size: 2.2rem; font-weight: 800; color: white; letter-spacing: -0.03em; }
.sb-lbl { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,255,255,0.35); }

/* ── CONNECT ── */
.connect-editorial { padding: 100px 0; background: white; }
.ce-title { font-size: 2.2rem; font-weight: 800; color: #1c1917; letter-spacing: -0.03em; margin-bottom: 16px; }
.ce-desc { color: #78716c; line-height: 1.8; margin-bottom: 32px; max-width: 480px; }
.ce-actions { display: flex; gap: 12px; flex-wrap: wrap; }
.ce-qr { display: inline-flex; flex-direction: column; align-items: center; padding: 32px; background: #f5f5f4; border-radius: 20px; }
.ce-qr img { width: 160px; height: 160px; margin-bottom: 10px; }
.ce-qr span { font-size: 0.6rem; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; color: #a8a29e; }

/* ── CTA ── */
.cta-editorial { padding: 0 0 0; }
.cta-bar {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 32px;
  padding: 64px 56px; background: #1c1917; border-radius: 28px 28px 0 0;
}
.cta-label { font-size: 0.6rem; font-weight: 800; letter-spacing: 0.35em; color: rgba(255,255,255,0.3); display: block; margin-bottom: 10px; }
.cta-heading { font-size: 2rem; font-weight: 800; color: white; letter-spacing: -0.03em; margin-bottom: 8px; }
.cta-sub { color: rgba(255,255,255,0.4); font-size: 0.95rem; }
.cta-btns { display: flex; gap: 12px; flex-wrap: wrap; }

@media (max-width: 960px) {
  .masthead { padding: 80px 0 32px; }
  .pe-img { max-height: 400px; }
  .cta-bar { padding: 40px 24px; border-radius: 0; }
}
</style>
