<template>
  <div class="about-t3">
    <!-- Clean Split Hero -->
    <section class="hero">
      <v-container class="hero-container">
        <v-row align="center" class="min-h-hero">
          <v-col cols="12" md="6" class="pr-md-16">
            <span class="eyebrow">About</span>
            <h1 class="hero-title">{{ heroTitle }}</h1>
            <div class="hero-line"></div>
            <p class="hero-sub">{{ heroSubtitle }}</p>
            <p class="hero-desc">{{ heroDescription }}</p>
            <div class="hero-actions">
              <v-btn size="large" color="#0f172a" variant="flat" class="px-8 text-none font-weight-bold rounded-lg" href="/contact">
                Get In Touch
              </v-btn>
              <v-btn v-if="contactPhone" size="large" variant="text" class="text-none font-weight-medium" :href="`tel:${contactPhone.replace(/[^+\\d]/g, '')}`">
                <v-icon size="18" class="mr-2">mdi-phone</v-icon> {{ contactPhone }}
              </v-btn>
            </div>
          </v-col>
          <v-col cols="12" md="6">
            <div class="hero-img-wrapper">
              <img :src="profileImage" :alt="storyName" class="hero-img" />
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Story — Centered Narrow -->
    <section class="story-section">
      <v-container>
        <v-row justify="center">
          <v-col cols="12" md="10" lg="8">
            <div class="story-header">
              <span class="eyebrow">My Story</span>
              <h2 class="section-title">{{ storyTitle }}</h2>
              <div class="name-badge">
                <span class="name">{{ storyName }}</span>
                <span class="role">{{ storyRole }}</span>
              </div>
            </div>
            <div v-if="storyContent" v-html="storyContent" class="story-body"></div>
            <div v-else class="story-body"><p>{{ storyContentDefault }}</p></div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Values — Clean Grid -->
    <section class="values-section">
      <v-container>
        <div class="text-center mb-14">
          <span class="eyebrow">Values</span>
          <h2 class="section-title">What I Stand For</h2>
        </div>
        <v-row>
          <v-col v-for="value in coreValues" :key="value.key" cols="12" md="4">
            <div class="val-card">
              <div class="val-icon">
                <v-icon :icon="value.icon" size="28" color="#0f172a"></v-icon>
              </div>
              <h3 class="val-title">{{ value.title }}</h3>
              <p class="val-desc">{{ value.description }}</p>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Stats Strip -->
    <section v-if="stats.length > 0" class="stats-strip">
      <v-container>
        <v-row>
          <v-col v-for="stat in stats" :key="stat.key" cols="6" md="3" class="text-center">
            <div class="s-val">{{ stat.value }}</div>
            <div class="s-lbl">{{ stat.label }}</div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Connect — Side by Side -->
    <section class="connect-section">
      <v-container>
        <v-row align="center">
          <v-col cols="12" md="7">
            <span class="eyebrow">Connect</span>
            <h2 class="section-title mb-4">{{ connectHeading }}</h2>
            <p class="connect-desc">{{ connectDescription }}</p>
            <div v-if="socialLinks.length" class="social-links">
              <a v-for="social in socialLinks" :key="social.name" :href="social.url" target="_blank" class="social-link-item">
                <v-icon size="20">{{ getSocialIcon(social.name) }}</v-icon>
                {{ social.name }}
              </a>
            </div>
            <div class="contact-row">
              <a v-if="contactEmail" :href="`mailto:${contactEmail}`" class="ct-link">
                <v-icon size="16" class="mr-2">mdi-email-outline</v-icon>{{ contactEmail }}
              </a>
              <a v-if="contactPhone" :href="`tel:${contactPhone.replace(/[^+\\d]/g, '')}`" class="ct-link">
                <v-icon size="16" class="mr-2">mdi-phone-outline</v-icon>{{ contactPhone }}
              </a>
            </div>
          </v-col>
          <v-col cols="12" md="4" offset-md="1" class="text-center">
            <div class="qr-minimal">
              <img :src="qrCodeUrl" alt="QR Code" />
              <span>Scan to save contact</span>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Simple CTA -->
    <section class="cta-section">
      <v-container>
        <v-row justify="center">
          <v-col cols="12" md="8" class="text-center">
            <span class="eyebrow-light">{{ ctaAreas }}</span>
            <h2 class="cta-title">{{ ctaTitle }}</h2>
            <p class="cta-sub">{{ ctaSubtitle }}</p>
            <div class="d-flex justify-center gap-4 flex-wrap">
              <v-btn v-if="contactPhone" size="x-large" color="#0f172a" variant="flat" class="px-10 text-none font-weight-bold rounded-lg" :href="`tel:${contactPhone.replace(/[^+\\d]/g, '')}`">
                Call Now
              </v-btn>
              <v-btn size="x-large" variant="outlined" color="#0f172a" class="px-10 text-none font-weight-bold rounded-lg" href="/contact">
                Inquire
              </v-btn>
            </div>
          </v-col>
        </v-row>
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
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

.about-t3 { font-family: 'Inter', sans-serif; color: #0f172a; }

.eyebrow {
  font-size: 0.65rem; font-weight: 800; letter-spacing: 0.3em;
  text-transform: uppercase; color: #94a3b8; display: block; margin-bottom: 16px;
}
.eyebrow-light {
  font-size: 0.65rem; font-weight: 800; letter-spacing: 0.3em;
  text-transform: uppercase; color: #64748b; display: block; margin-bottom: 16px;
}
.section-title {
  font-size: 2.2rem; font-weight: 800; letter-spacing: -0.03em;
  line-height: 1.2; margin-bottom: 20px;
}

/* ── Hero ── */
.hero { background: #ffffff; padding: 60px 0; }
.min-h-hero { min-height: 80vh; }
.hero-title {
  font-size: clamp(2.5rem, 6vw, 4rem); font-weight: 800;
  letter-spacing: -0.04em; line-height: 1.05; margin-bottom: 20px;
}
.hero-line { width: 40px; height: 3px; background: #0f172a; margin-bottom: 24px; }
.hero-sub { font-size: 1.15rem; font-weight: 600; color: #334155; line-height: 1.5; margin-bottom: 12px; }
.hero-desc { font-size: 1rem; color: #64748b; line-height: 1.8; margin-bottom: 32px; max-width: 440px; }
.hero-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.hero-img-wrapper {
  border-radius: 24px; overflow: hidden;
  box-shadow: 0 30px 60px rgba(0,0,0,0.08);
}
.hero-img { width: 100%; aspect-ratio: 4/5; object-fit: cover; display: block; }

/* ── Story ── */
.story-section { padding: 100px 0; background: #f8fafc; }
.story-header { text-align: center; margin-bottom: 48px; }
.name-badge {
  display: inline-flex; flex-direction: column; align-items: center;
  padding: 16px 32px; background: white; border-radius: 12px;
  border: 1px solid #e2e8f0; margin-top: 8px;
}
.name-badge .name { font-size: 1rem; font-weight: 700; }
.name-badge .role { font-size: 0.8rem; color: #64748b; }
.story-body { font-size: 1.05rem; line-height: 2; color: #475569; }
.story-body :deep(p) { margin-bottom: 1.5rem; }

/* ── Values ── */
.values-section { padding: 100px 0; background: white; }
.val-card {
  padding: 36px 28px; border: 1px solid #e2e8f0; border-radius: 16px;
  height: 100%; transition: all 0.3s ease;
}
.val-card:hover { border-color: #0f172a; transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.06); }
.val-icon {
  width: 52px; height: 52px; border-radius: 12px; background: #f1f5f9;
  display: flex; align-items: center; justify-content: center; margin-bottom: 20px;
}
.val-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 8px; }
.val-desc { font-size: 0.9rem; color: #64748b; line-height: 1.7; }

/* ── Stats ── */
.stats-strip { padding: 60px 0; background: #0f172a; }
.s-val { font-size: 2.2rem; font-weight: 800; color: white; letter-spacing: -0.03em; margin-bottom: 4px; }
.s-lbl { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #64748b; }

/* ── Connect ── */
.connect-section { padding: 100px 0; background: #f8fafc; }
.connect-desc { font-size: 1rem; color: #64748b; line-height: 1.8; margin-bottom: 28px; max-width: 480px; }
.social-links { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 28px; }
.social-link-item {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 16px; border: 1px solid #e2e8f0; border-radius: 8px;
  font-size: 0.8rem; font-weight: 600; color: #334155; text-decoration: none;
  transition: all 0.3s;
}
.social-link-item:hover { border-color: #0f172a; background: white; }
.contact-row { display: flex; flex-direction: column; gap: 10px; }
.ct-link { display: flex; align-items: center; color: #475569; text-decoration: none; font-size: 0.9rem; transition: color 0.3s; }
.ct-link:hover { color: #0f172a; }
.qr-minimal {
  display: inline-flex; flex-direction: column; align-items: center;
  padding: 28px; background: white; border-radius: 16px; border: 1px solid #e2e8f0;
}
.qr-minimal span { font-size: 0.6rem; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; color: #94a3b8; margin-top: 12px; }

/* ── CTA ── */
.cta-section { padding: 120px 0; background: white; border-top: 1px solid #f1f5f9; }
.cta-title { font-size: 2.8rem; font-weight: 800; letter-spacing: -0.04em; line-height: 1.15; margin-bottom: 16px; }
.cta-sub { font-size: 1.05rem; color: #64748b; line-height: 1.7; margin-bottom: 40px; max-width: 520px; margin-left: auto; margin-right: auto; }

@media (max-width: 960px) {
  .hero-title { font-size: 2.5rem; }
  .cta-title { font-size: 2rem; }
  .min-h-hero { min-height: auto; }
}
</style>
