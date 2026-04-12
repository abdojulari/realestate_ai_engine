<template>
  <div class="about-t2">
    <!-- Full-Width Hero -->
    <section class="hero">
      <div class="hero-bg" :style="{ backgroundImage: `url(${profileImage})` }"></div>
      <div class="hero-overlay">
        <v-container class="hero-inner">
          <div class="hero-badge">ABOUT</div>
          <h1 class="hero-title">{{ heroTitle }}</h1>
          <p class="hero-sub">{{ heroSubtitle }}</p>
          <div class="hero-divider"></div>
          <p class="hero-desc">{{ heroDescription }}</p>
        </v-container>
      </div>
    </section>

    <!-- Floating Stats Bar -->
    <section v-if="stats.length > 0" class="stats-bar">
      <v-container>
        <div class="stats-row">
          <div v-for="stat in stats" :key="stat.key" class="stat-card">
            <span class="stat-val">{{ stat.value }}</span>
            <span class="stat-lbl">{{ stat.label }}</span>
          </div>
        </div>
      </v-container>
    </section>

    <!-- Story Section — Card Style -->
    <section class="story-section">
      <v-container>
        <v-row align="center" justify="center">
          <v-col cols="12" md="5" class="mb-8 mb-md-0">
            <div class="story-photo-wrap">
              <img :src="profileImage" :alt="storyName" class="story-photo" />
              <div class="story-name-card">
                <h3>{{ storyName }}</h3>
                <p>{{ storyRole }}</p>
              </div>
            </div>
          </v-col>
          <v-col cols="12" md="6" offset-md="1">
            <span class="section-label">MY STORY</span>
            <h2 class="section-heading">{{ storyTitle }}</h2>
            <div v-if="storyContent" v-html="storyContent" class="story-body"></div>
            <div v-else class="story-body"><p>{{ storyContentDefault }}</p></div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Values — Gradient Cards -->
    <section class="values-section">
      <v-container>
        <div class="text-center mb-16">
          <span class="section-label">CORE VALUES</span>
          <h2 class="section-heading centered">What Drives Me</h2>
        </div>
        <v-row>
          <v-col v-for="(value, i) in coreValues" :key="value.key" cols="12" md="4">
            <div class="value-card" :class="`accent-${(i % 3) + 1}`">
              <div class="value-icon-wrap">
                <v-icon :icon="value.icon" size="36" color="white"></v-icon>
              </div>
              <h3 class="value-title">{{ value.title }}</h3>
              <p class="value-desc">{{ value.description }}</p>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Connect Section -->
    <section class="connect-section">
      <v-container>
        <v-row align="center">
          <v-col cols="12" md="6">
            <span class="section-label text-white">GET IN TOUCH</span>
            <h2 class="section-heading text-white">{{ connectHeading }}</h2>
            <p class="connect-desc">{{ connectDescription }}</p>
            <div v-if="socialLinks.length" class="social-row">
              <a v-for="social in socialLinks" :key="social.name" :href="social.url" target="_blank" class="social-pill">
                <v-icon size="20">{{ getSocialIcon(social.name) }}</v-icon>
                <span>{{ social.name }}</span>
              </a>
            </div>
            <div class="contact-links">
              <a v-if="contactEmail" :href="`mailto:${contactEmail}`" class="c-link">
                <v-icon size="18" class="mr-2">mdi-email-outline</v-icon>{{ contactEmail }}
              </a>
              <a v-if="contactPhone" :href="`tel:${contactPhone.replace(/[^+\\d]/g, '')}`" class="c-link">
                <v-icon size="18" class="mr-2">mdi-phone-outline</v-icon>{{ contactPhone }}
              </a>
            </div>
          </v-col>
          <v-col cols="12" md="5" offset-md="1" class="text-center">
            <div class="qr-float">
              <img :src="qrCodeUrl" alt="Contact QR Code" />
              <p>Scan to save contact</p>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Gradient CTA -->
    <section class="cta-section">
      <v-container>
        <div class="cta-card">
          <span class="cta-areas">{{ ctaAreas }}</span>
          <h2 class="cta-title">{{ ctaTitle }}</h2>
          <p class="cta-sub">{{ ctaSubtitle }}</p>
          <div class="cta-btns">
            <v-btn v-if="contactPhone" size="x-large" color="white" variant="flat" class="px-10 rounded-pill text-black font-weight-bold" :href="`tel:${contactPhone.replace(/[^+\\d]/g, '')}`">
              Call Now
            </v-btn>
            <v-btn size="x-large" variant="outlined" color="white" class="px-10 rounded-pill font-weight-bold" href="/contact">
              Get In Touch
            </v-btn>
          </div>
        </div>
      </v-container>
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
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700;800&family=Inter:wght@300;400;500;600;700&display=swap');

.about-t2 { font-family: 'Inter', sans-serif; }

/* ── Hero ── */
.hero { position: relative; min-height: 85vh; display: flex; align-items: flex-end; }
.hero-bg {
  position: absolute; inset: 0;
  background-size: cover; background-position: center top;
  filter: brightness(0.5);
}
.hero-overlay {
  position: relative; z-index: 2; width: 100%;
  background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%);
  padding: 120px 0 80px;
}
.hero-inner { max-width: 700px; }
.hero-badge {
  display: inline-block; font-size: 0.65rem; font-weight: 800;
  letter-spacing: 0.35em; color: rgba(255,255,255,0.6);
  border: 1px solid rgba(255,255,255,0.2); padding: 6px 18px;
  border-radius: 4px; margin-bottom: 24px;
}
.hero-title {
  font-family: 'Playfair Display', serif;
  font-size: clamp(2.8rem, 7vw, 4.5rem); font-weight: 700;
  color: white; line-height: 1.1; margin-bottom: 16px;
}
.hero-sub { font-size: 1.2rem; color: rgba(255,255,255,0.85); font-weight: 500; margin-bottom: 20px; }
.hero-divider { width: 60px; height: 3px; background: #3b82f6; margin-bottom: 20px; }
.hero-desc { font-size: 1rem; color: rgba(255,255,255,0.6); line-height: 1.8; max-width: 560px; }

/* ── Stats Bar ── */
.stats-bar { margin-top: -40px; position: relative; z-index: 10; padding-bottom: 40px; }
.stats-row {
  display: flex; gap: 1px; background: #e2e8f0; border-radius: 16px; overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.12);
}
.stat-card {
  flex: 1; background: white; padding: 32px 24px; text-align: center;
  display: flex; flex-direction: column; gap: 4px;
}
.stat-val { font-size: 2rem; font-weight: 800; color: #0f172a; letter-spacing: -0.03em; }
.stat-lbl { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; color: #94a3b8; }

/* ── Section Labels ── */
.section-label {
  font-size: 0.65rem; font-weight: 800; letter-spacing: 0.3em;
  text-transform: uppercase; color: #3b82f6; display: block; margin-bottom: 12px;
}
.section-heading {
  font-family: 'Playfair Display', serif;
  font-size: 2.5rem; font-weight: 700; color: #0f172a;
  line-height: 1.2; margin-bottom: 24px;
}
.section-heading.centered { margin-left: auto; margin-right: auto; }

/* ── Story ── */
.story-section { padding: 120px 0; background: #f8fafc; }
.story-photo-wrap { position: relative; }
.story-photo {
  width: 100%; aspect-ratio: 4/5; object-fit: cover; border-radius: 20px;
  box-shadow: 0 25px 50px rgba(0,0,0,0.15);
}
.story-name-card {
  position: absolute; bottom: -20px; left: 20px; right: 20px;
  background: white; padding: 20px 24px; border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
}
.story-name-card h3 { font-size: 1.1rem; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
.story-name-card p { font-size: 0.8rem; color: #64748b; margin: 0; }
.story-body { font-size: 1.05rem; line-height: 2; color: #475569; }
.story-body :deep(p) { margin-bottom: 1.5rem; }

/* ── Values ── */
.values-section { padding: 100px 0; background: white; }
.value-card {
  padding: 40px 32px; border-radius: 20px; height: 100%;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.value-card:hover { transform: translateY(-8px); box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
.value-card.accent-1 { background: linear-gradient(135deg, #eff6ff, #dbeafe); }
.value-card.accent-2 { background: linear-gradient(135deg, #f0fdf4, #dcfce7); }
.value-card.accent-3 { background: linear-gradient(135deg, #fef3c7, #fde68a33); }
.value-icon-wrap {
  width: 60px; height: 60px; border-radius: 14px; background: #0f172a;
  display: flex; align-items: center; justify-content: center; margin-bottom: 20px;
}
.value-title { font-size: 1.2rem; font-weight: 700; color: #0f172a; margin-bottom: 10px; }
.value-desc { font-size: 0.95rem; color: #475569; line-height: 1.7; }

/* ── Connect ── */
.connect-section { padding: 100px 0; background: #0f172a; }
.connect-desc { font-size: 1.05rem; color: rgba(255,255,255,0.6); line-height: 1.8; margin-bottom: 32px; max-width: 450px; }
.social-row { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 32px; }
.social-pill {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 16px; border-radius: 50px; font-size: 0.8rem; font-weight: 600;
  color: white; background: rgba(255,255,255,0.08); text-decoration: none;
  transition: background 0.3s;
}
.social-pill:hover { background: rgba(255,255,255,0.15); }
.contact-links { display: flex; flex-direction: column; gap: 12px; }
.c-link { color: rgba(255,255,255,0.7); text-decoration: none; font-size: 0.95rem; display: flex; align-items: center; transition: color 0.3s; }
.c-link:hover { color: #3b82f6; }
.qr-float {
  background: white; display: inline-block; padding: 28px; border-radius: 20px;
  box-shadow: 0 25px 60px rgba(0,0,0,0.4);
}
.qr-float p { font-size: 0.65rem; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; color: #64748b; margin-top: 12px; }

/* ── CTA ── */
.cta-section { padding: 100px 0; background: #f8fafc; }
.cta-card {
  background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
  border-radius: 28px; padding: 80px 60px; text-align: center;
}
.cta-areas { font-size: 0.65rem; font-weight: 800; letter-spacing: 0.35em; color: rgba(255,255,255,0.5); display: block; margin-bottom: 20px; }
.cta-title {
  font-family: 'Playfair Display', serif;
  font-size: 3rem; font-weight: 700; color: white; margin-bottom: 16px; line-height: 1.2;
}
.cta-sub { font-size: 1.1rem; color: rgba(255,255,255,0.6); max-width: 550px; margin: 0 auto 40px; line-height: 1.7; }
.cta-btns { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }

@media (max-width: 960px) {
  .hero-title { font-size: 2.5rem; }
  .stats-row { flex-direction: column; }
  .cta-card { padding: 50px 24px; }
  .cta-title { font-size: 2rem; }
}
</style>
