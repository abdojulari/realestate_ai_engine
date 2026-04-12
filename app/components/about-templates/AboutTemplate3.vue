<template>
  <div class="t3">
    <!-- Gradient Masthead with Faded Edge -->
    <section class="masthead">
      <div class="mh-gradient"></div>
      <div class="mh-fade"></div>
      <v-container class="mh-content">
        <v-row align="center" class="mh-row">
          <v-col cols="12" md="7">
            <span class="mh-tag">ABOUT</span>
            <h1 class="mh-title">{{ heroTitle }}</h1>
            <p class="mh-subtitle">{{ heroSubtitle }}</p>
            <div class="mh-actions">
              <v-btn size="large" variant="flat" class="px-10 text-none font-weight-bold rounded-pill mh-btn-primary" href="/contact">Get in Touch</v-btn>
              <v-btn v-if="contactPhone" size="large" variant="outlined" class="px-8 text-none font-weight-medium rounded-pill mh-btn-outline" :href="`tel:${contactPhone.replace(/[^+\\d]/g, '')}`">
                <v-icon size="18" class="mr-2">mdi-phone</v-icon>Call Me
              </v-btn>
            </div>
          </v-col>
          <v-col cols="12" md="4" offset-md="1" class="text-center">
            <div class="mh-portrait">
              <img :src="profileImage" :alt="storyName" />
              <div class="mh-portrait-label">
                <strong>{{ storyName }}</strong>
                <span>{{ storyRole }}</span>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Stats Ribbon -->
    <section class="stats-ribbon" v-if="stats.length">
      <v-container>
        <div class="sr-row">
          <div v-for="stat in stats" :key="stat.key" class="sr-item">
            <span class="sr-val">{{ stat.value }}</span>
            <span class="sr-lbl">{{ stat.label }}</span>
          </div>
        </div>
      </v-container>
    </section>

    <!-- Profile + Story: Magazine Side-by-Side -->
    <section class="profile-editorial">
      <v-container>
        <v-row>
          <v-col cols="12" md="5">
            <div class="pe-sticky">
              <div class="pe-card">
                <div class="pe-card-header">
                  <img :src="profileImage" :alt="storyName" class="pe-avatar" />
                  <div>
                    <strong class="pe-card-name">{{ storyName }}</strong>
                    <span class="pe-card-role">{{ storyRole }}</span>
                  </div>
                </div>
                <div class="pe-card-divider"></div>
                <a v-if="contactPhone" :href="`tel:${contactPhone.replace(/[^+\\d]/g, '')}`" class="pe-contact-row">
                  <div class="pe-icon-wrap"><v-icon size="16" color="white">mdi-phone-outline</v-icon></div>
                  <span>{{ contactPhone }}</span>
                </a>
                <a v-if="contactEmail" :href="`mailto:${contactEmail}`" class="pe-contact-row">
                  <div class="pe-icon-wrap"><v-icon size="16" color="white">mdi-email-outline</v-icon></div>
                  <span>{{ contactEmail }}</span>
                </a>
                <div v-if="socialLinks.length" class="pe-social-row">
                  <a v-for="social in socialLinks" :key="social.name" :href="social.url" target="_blank" class="pe-soc-icon">
                    <v-icon size="18">{{ getSocialIcon(social.name) }}</v-icon>
                  </a>
                </div>
              </div>
            </div>
          </v-col>
          <v-col cols="12" md="6" offset-md="1">
            <span class="sec-tag">MY STORY</span>
            <h2 class="sec-title">{{ storyTitle }}</h2>
            <p class="pe-intro">{{ heroDescription }}</p>
            <div class="pe-divider"></div>
            <div v-if="storyContent" v-html="storyContent" class="pe-story-body"></div>
            <div v-else class="pe-story-body"><p>{{ storyContentDefault }}</p></div>
            <blockquote class="pe-quote">
              <div class="pq-icon"><v-icon size="20" color="white">mdi-format-quote-close</v-icon></div>
              {{ connectDescription }}
            </blockquote>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Services / Expertise Showcase -->
    <section class="services-showcase" v-if="coreValues.length">
      <v-container>
        <div class="text-center mb-14">
          <span class="sec-tag">EXPERTISE</span>
          <h2 class="sec-title">What I Bring to Every Client</h2>
        </div>
        <v-row>
          <v-col v-for="(value, i) in coreValues" :key="value.key" cols="12" md="4">
            <div class="sv-card" :class="i === 0 ? 'sv-card-accent' : ''">
              <div class="sv-num">{{ String(i + 1).padStart(2, '0') }}</div>
              <div class="sv-icon-circle" :class="i === 0 ? 'sv-icon-accent' : ''">
                <v-icon :icon="value.icon" size="24" :color="i === 0 ? 'white' : '#0c2d57'"></v-icon>
              </div>
              <h3 class="sv-card-title">{{ value.title }}</h3>
              <p class="sv-card-desc">{{ value.description }}</p>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- QR + Connect -->
    <section class="connect-editorial">
      <v-container>
        <v-row align="center">
          <v-col cols="12" md="7">
            <span class="sec-tag">LET'S CONNECT</span>
            <h2 class="ce-title">{{ connectHeading }}</h2>
            <p class="ce-desc">{{ connectDescription }}</p>
            <div class="ce-actions">
              <v-btn size="large" variant="flat" class="px-10 text-none font-weight-bold rounded-pill mh-btn-primary" href="/contact">Get in Touch</v-btn>
              <v-btn v-if="contactPhone" size="large" variant="outlined" color="#0c2d57" class="px-8 text-none font-weight-medium rounded-pill" :href="`tel:${contactPhone.replace(/[^+\\d]/g, '')}`">
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
          <div class="cta-bar-bg"></div>
          <div class="cta-bar-content">
            <div>
              <span class="cta-label">{{ ctaAreas }}</span>
              <h2 class="cta-heading">{{ ctaTitle }}</h2>
              <p class="cta-sub">{{ ctaSubtitle }}</p>
            </div>
            <div class="cta-btns">
              <v-btn v-if="contactPhone" size="x-large" variant="flat" class="px-10 rounded-pill text-none font-weight-bold cta-btn-orange" :href="`tel:${contactPhone.replace(/[^+\\d]/g, '')}`">Call Now</v-btn>
              <v-btn size="x-large" variant="outlined" color="white" class="px-10 rounded-pill text-none font-weight-bold" href="/contact">Inquire</v-btn>
            </div>
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
.t3 { font-family: 'Inter', sans-serif; background: #f8fafc; }

/* ── SHARED ── */
.sec-tag { font-size: 0.6rem; font-weight: 800; letter-spacing: 0.4em; text-transform: uppercase; color: #e97520; display: block; margin-bottom: 12px; }
.sec-title { font-size: 2.2rem; font-weight: 800; color: #0c2d57; letter-spacing: -0.03em; line-height: 1.2; margin-bottom: 20px; }

/* ── MASTHEAD ── */
.masthead { position: relative; min-height: 90vh; display: flex; align-items: center; overflow: hidden; }
.mh-gradient { position: absolute; inset: 0; background: linear-gradient(135deg, #0c2d57 0%, #143d6e 30%, #1a4f8a 55%, #2563a8 75%, #3b82c4 100%); }
.mh-fade {
  position: absolute; bottom: 0; left: 0; right: 0; height: 200px;
  background: linear-gradient(to bottom, transparent, #f8fafc);
  z-index: 1;
}
.mh-content { position: relative; z-index: 2; }
.mh-row { min-height: 80vh; }
.mh-tag { font-size: 0.6rem; font-weight: 800; letter-spacing: 0.45em; color: rgba(255,255,255,0.35); display: block; margin-bottom: 20px; }
.mh-title { font-size: clamp(2.6rem, 5vw, 4rem); font-weight: 800; color: white; letter-spacing: -0.04em; line-height: 1.05; margin-bottom: 18px; }
.mh-subtitle { font-size: 1.05rem; color: rgba(255,255,255,0.6); line-height: 1.7; max-width: 480px; margin-bottom: 32px; }
.mh-actions { display: flex; gap: 12px; flex-wrap: wrap; }
.mh-btn-primary { background: linear-gradient(135deg, #e97520, #f59e0b) !important; color: white !important; }
.mh-btn-outline { border-color: rgba(255,255,255,0.3) !important; color: white !important; }

.mh-portrait { position: relative; display: inline-block; }
.mh-portrait img {
  width: 300px; height: 380px; object-fit: cover; border-radius: 24px;
  border: 4px solid rgba(255,255,255,0.15); box-shadow: 0 40px 80px rgba(0,0,0,0.3);
}
.mh-portrait-label {
  position: absolute; bottom: -14px; left: 50%; transform: translateX(-50%);
  background: white; border-radius: 14px; padding: 12px 24px; text-align: center;
  box-shadow: 0 8px 24px rgba(12,45,87,0.12); white-space: nowrap;
}
.mh-portrait-label strong { display: block; font-size: 0.9rem; color: #0c2d57; }
.mh-portrait-label span { font-size: 0.7rem; color: #64748b; }

/* ── STATS ── */
.stats-ribbon { padding: 48px 0; background: white; border-bottom: 1px solid #e2e8f0; }
.sr-row { display: flex; justify-content: center; gap: 56px; flex-wrap: wrap; }
.sr-item { text-align: center; }
.sr-val { display: block; font-size: 2.4rem; font-weight: 800; color: #0c2d57; letter-spacing: -0.03em; }
.sr-lbl { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #94a3b8; }

/* ── PROFILE EDITORIAL ── */
.profile-editorial { padding: 100px 0; background: #f8fafc; }
.pe-sticky { position: sticky; top: 100px; }
.pe-card { background: white; border-radius: 20px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 16px rgba(12,45,87,0.04); }
.pe-card-header { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
.pe-avatar { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 2px solid #e2e8f0; }
.pe-card-name { display: block; font-size: 1rem; font-weight: 700; color: #0c2d57; }
.pe-card-role { font-size: 0.75rem; color: #64748b; }
.pe-card-divider { height: 1px; background: #e2e8f0; margin-bottom: 16px; }
.pe-contact-row { display: flex; align-items: center; gap: 12px; text-decoration: none; color: #334155; font-size: 0.88rem; padding: 8px 0; transition: color 0.3s; }
.pe-contact-row:hover { color: #0c2d57; }
.pe-icon-wrap { width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg, #0c2d57, #1a4f8a); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pe-social-row { display: flex; gap: 8px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
.pe-soc-icon {
  display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;
  border-radius: 10px; background: #f1f5f9; color: #334155; text-decoration: none; transition: all 0.3s;
}
.pe-soc-icon:hover { background: #0c2d57; color: white; }

.pe-intro { font-size: 1.05rem; color: #64748b; line-height: 1.8; margin-bottom: 28px; }
.pe-divider { width: 40px; height: 3px; background: linear-gradient(90deg, #e97520, #f59e0b); border-radius: 2px; margin-bottom: 28px; }
.pe-story-body { font-size: 0.95rem; color: #475569; line-height: 2.1; margin-bottom: 32px; }
.pe-story-body :deep(p) { margin-bottom: 1.2rem; }
.pe-quote {
  position: relative; padding: 24px 24px 24px 56px; background: linear-gradient(135deg, #0c2d57, #143d6e);
  border-radius: 16px; font-size: 0.95rem; font-style: italic; color: rgba(255,255,255,0.8); line-height: 1.8;
}
.pq-icon { position: absolute; top: 24px; left: 16px; width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; }

/* ── SERVICES ── */
.services-showcase { padding: 100px 0; background: white; }
.sv-card {
  padding: 40px 32px; border-radius: 20px; background: #f8fafc; border: 1px solid #e2e8f0;
  height: 100%; transition: all 0.4s; position: relative; overflow: hidden;
}
.sv-card:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(12,45,87,0.08); border-color: #cbd5e1; }
.sv-card-accent { background: linear-gradient(135deg, #0c2d57, #143d6e); border-color: transparent; }
.sv-card-accent:hover { box-shadow: 0 20px 40px rgba(12,45,87,0.25); }
.sv-num { font-size: 0.55rem; font-weight: 800; letter-spacing: 0.2em; color: #94a3b8; margin-bottom: 20px; }
.sv-card-accent .sv-num { color: rgba(255,255,255,0.2); }
.sv-icon-circle { width: 48px; height: 48px; border-radius: 14px; background: white; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; border: 1px solid #e2e8f0; }
.sv-icon-accent { background: rgba(255,255,255,0.1) !important; border-color: rgba(255,255,255,0.1) !important; }
.sv-card-title { font-size: 1.15rem; font-weight: 700; color: #0c2d57; margin-bottom: 10px; }
.sv-card-accent .sv-card-title { color: white; }
.sv-card-desc { font-size: 0.88rem; line-height: 1.7; color: #64748b; }
.sv-card-accent .sv-card-desc { color: rgba(255,255,255,0.5); }

/* ── CONNECT ── */
.connect-editorial { padding: 100px 0; background: #f8fafc; }
.ce-title { font-size: 2.2rem; font-weight: 800; color: #0c2d57; letter-spacing: -0.03em; margin-bottom: 16px; }
.ce-desc { color: #64748b; line-height: 1.8; margin-bottom: 32px; max-width: 480px; }
.ce-actions { display: flex; gap: 12px; flex-wrap: wrap; }
.ce-qr { display: inline-flex; flex-direction: column; align-items: center; padding: 36px; background: white; border-radius: 24px; border: 1px solid #e2e8f0; box-shadow: 0 8px 24px rgba(12,45,87,0.04); }
.ce-qr img { width: 160px; height: 160px; margin-bottom: 12px; }
.ce-qr span { font-size: 0.55rem; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; color: #94a3b8; }

/* ── CTA ── */
.cta-editorial { padding: 0 0 0; }
.cta-bar { position: relative; border-radius: 28px 28px 0 0; overflow: hidden; }
.cta-bar-bg { position: absolute; inset: 0; background: linear-gradient(135deg, #0c2d57 0%, #143d6e 40%, #1a4f8a 70%, #2563a8 100%); }
.cta-bar-content {
  position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 32px; padding: 64px 56px;
}
.cta-label { font-size: 0.6rem; font-weight: 800; letter-spacing: 0.35em; color: rgba(255,255,255,0.25); display: block; margin-bottom: 10px; }
.cta-heading { font-size: 2rem; font-weight: 800; color: white; letter-spacing: -0.03em; margin-bottom: 8px; }
.cta-sub { color: rgba(255,255,255,0.4); font-size: 0.95rem; }
.cta-btns { display: flex; gap: 12px; flex-wrap: wrap; }
.cta-btn-orange { background: linear-gradient(135deg, #e97520, #f59e0b) !important; color: white !important; }

@media (max-width: 960px) {
  .masthead { min-height: auto; padding: 100px 0 80px; }
  .mh-row { min-height: auto; }
  .mh-portrait img { width: 220px; height: 280px; }
  .pe-sticky { position: static; }
  .cta-bar-content { padding: 40px 24px; }
  .cta-bar { border-radius: 0; }
}
</style>
