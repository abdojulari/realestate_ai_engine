<template>
  <div class="about-t5">
    <!-- Centered Elegant Hero -->
    <section class="hero">
      <v-container>
        <div class="hero-center">
          <span class="hero-tag">ABOUT</span>
          <h1 class="hero-title">{{ heroTitle }}</h1>
          <p class="hero-sub">{{ heroSubtitle }}</p>
        </div>
      </v-container>
      <div class="hero-portrait-wrap">
        <div class="hero-portrait">
          <img :src="profileImage" :alt="storyName" />
        </div>
        <div class="portrait-label">
          <h3>{{ storyName }}</h3>
          <p>{{ storyRole }}</p>
        </div>
      </div>
    </section>

    <!-- Elegant Description Bar -->
    <section class="desc-bar">
      <v-container>
        <v-row justify="center">
          <v-col cols="12" md="8" class="text-center">
            <p class="desc-text">{{ heroDescription }}</p>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Floating Stats Cards -->
    <section v-if="stats.length > 0" class="stats-section">
      <v-container>
        <div class="stats-flex">
          <div v-for="stat in stats" :key="stat.key" class="stat-float-card">
            <div class="sf-val">{{ stat.value }}</div>
            <div class="sf-lbl">{{ stat.label }}</div>
          </div>
        </div>
      </v-container>
    </section>

    <!-- Story — Centered Column with Side Accent -->
    <section class="story-section">
      <v-container>
        <v-row justify="center">
          <v-col cols="12" md="3" class="mb-8 mb-md-0">
            <div class="story-side">
              <span class="side-label">MY JOURNEY</span>
              <h2 class="side-heading">{{ storyTitle }}</h2>
            </div>
          </v-col>
          <v-col cols="12" md="7">
            <div v-if="storyContent" v-html="storyContent" class="story-prose"></div>
            <div v-else class="story-prose"><p>{{ storyContentDefault }}</p></div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Values — Elegant Cards with Gradient Border -->
    <section class="values-section">
      <v-container>
        <div class="text-center mb-16">
          <span class="side-label centered">CORE VALUES</span>
          <h2 class="values-heading">The Pillars of My Practice</h2>
        </div>
        <v-row justify="center">
          <v-col v-for="value in coreValues" :key="value.key" cols="12" md="4">
            <div class="elegant-card">
              <div class="ec-icon">
                <v-icon :icon="value.icon" size="28"></v-icon>
              </div>
              <h3 class="ec-title">{{ value.title }}</h3>
              <p class="ec-desc">{{ value.description }}</p>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Connect — Warm Tone -->
    <section class="connect-section">
      <v-container>
        <v-row align="center" justify="center">
          <v-col cols="12" md="5" class="text-center mb-8 mb-md-0">
            <div class="qr-elegant">
              <img :src="qrCodeUrl" alt="Contact QR Code" />
              <span>Save My Contact</span>
            </div>
          </v-col>
          <v-col cols="12" md="5" offset-md="1">
            <span class="side-label">LET'S CONNECT</span>
            <h2 class="connect-heading">{{ connectHeading }}</h2>
            <p class="connect-text">{{ connectDescription }}</p>

            <div v-if="socialLinks.length" class="social-elegant">
              <a v-for="social in socialLinks" :key="social.name" :href="social.url" target="_blank" class="se-link">
                <v-icon size="18" class="mr-2">{{ getSocialIcon(social.name) }}</v-icon>
                {{ social.name }}
              </a>
            </div>

            <div class="contact-elegant">
              <a v-if="contactEmail" :href="`mailto:${contactEmail}`">
                <v-icon size="16" class="mr-2">mdi-email-outline</v-icon>{{ contactEmail }}
              </a>
              <a v-if="contactPhone" :href="`tel:${contactPhone.replace(/[^+\\d]/g, '')}`">
                <v-icon size="16" class="mr-2">mdi-phone-outline</v-icon>{{ contactPhone }}
              </a>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Premium Gradient CTA -->
    <section class="cta-section">
      <div class="cta-inner">
        <span class="cta-tag">{{ ctaAreas }}</span>
        <h2 class="cta-title">{{ ctaTitle }}</h2>
        <p class="cta-sub">{{ ctaSubtitle }}</p>
        <div class="d-flex justify-center gap-4 flex-wrap">
          <v-btn v-if="contactPhone" size="x-large" color="white" variant="flat" class="px-10 rounded-pill text-none font-weight-bold" style="color: #1e3a5f;" :href="`tel:${contactPhone.replace(/[^+\\d]/g, '')}`">
            Call Now
          </v-btn>
          <v-btn size="x-large" variant="outlined" color="white" class="px-10 rounded-pill text-none font-weight-bold" href="/contact">
            Get In Touch
          </v-btn>
        </div>
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
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700;800&display=swap');

.about-t5 { font-family: 'Inter', sans-serif; }

/* ── Hero ── */
.hero { background: linear-gradient(180deg, #f8f6f3 0%, #ede9e3 100%); padding: 100px 0 0; text-align: center; }
.hero-center { max-width: 700px; margin: 0 auto; }
.hero-tag {
  font-size: 0.6rem; font-weight: 800; letter-spacing: 0.4em;
  color: #a08b6e; display: block; margin-bottom: 24px;
}
.hero-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: clamp(3rem, 7vw, 5rem); font-weight: 600;
  color: #1a1a1a; line-height: 1.1; letter-spacing: -0.03em; margin-bottom: 20px;
}
.hero-sub { font-size: 1.15rem; color: #666; line-height: 1.7; max-width: 500px; margin: 0 auto 60px; }

.hero-portrait-wrap { display: flex; flex-direction: column; align-items: center; padding-bottom: 60px; }
.hero-portrait {
  width: 280px; height: 340px; border-radius: 200px 200px 24px 24px; overflow: hidden;
  box-shadow: 0 30px 60px rgba(0,0,0,0.12); border: 6px solid white;
}
.hero-portrait img { width: 100%; height: 100%; object-fit: cover; }
.portrait-label { text-align: center; margin-top: 20px; }
.portrait-label h3 { font-size: 1.1rem; font-weight: 700; color: #1a1a1a; margin-bottom: 2px; }
.portrait-label p { font-size: 0.8rem; color: #888; margin: 0; }

/* ── Description ── */
.desc-bar { padding: 60px 0; background: white; border-bottom: 1px solid #f0ece6; }
.desc-text {
  font-family: 'Cormorant Garamond', serif;
  font-size: 1.5rem; font-weight: 500; color: #444; line-height: 1.8;
  font-style: italic;
}

/* ── Stats ── */
.stats-section { padding: 60px 0; background: white; }
.stats-flex { display: flex; justify-content: center; gap: 16px; flex-wrap: wrap; }
.stat-float-card {
  background: #f8f6f3; padding: 32px 40px; border-radius: 16px; text-align: center;
  min-width: 160px; transition: transform 0.3s;
}
.stat-float-card:hover { transform: translateY(-4px); }
.sf-val { font-family: 'Cormorant Garamond', serif; font-size: 2.5rem; font-weight: 700; color: #1a1a1a; }
.sf-lbl { font-size: 0.6rem; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; color: #a08b6e; margin-top: 4px; }

/* ── Story ── */
.story-section { padding: 100px 0; background: #faf9f7; }
.story-side { position: sticky; top: 100px; }
.side-label {
  font-size: 0.6rem; font-weight: 800; letter-spacing: 0.3em;
  text-transform: uppercase; color: #a08b6e; display: block; margin-bottom: 16px;
}
.side-label.centered { text-align: center; }
.side-heading {
  font-family: 'Cormorant Garamond', serif;
  font-size: 2rem; font-weight: 600; color: #1a1a1a; line-height: 1.3;
}
.story-prose { font-size: 1.05rem; line-height: 2; color: #555; }
.story-prose :deep(p) { margin-bottom: 1.5rem; }

/* ── Values ── */
.values-section { padding: 100px 0; background: white; }
.values-heading {
  font-family: 'Cormorant Garamond', serif;
  font-size: 2.2rem; font-weight: 600; color: #1a1a1a; margin-bottom: 12px;
}
.elegant-card {
  padding: 40px 32px; border-radius: 20px; height: 100%;
  background: linear-gradient(145deg, #faf9f7, #f0ece6);
  border: 1px solid #e8e2d9; text-align: center;
  transition: all 0.3s ease;
}
.elegant-card:hover { transform: translateY(-6px); box-shadow: 0 16px 40px rgba(0,0,0,0.06); }
.ec-icon {
  width: 56px; height: 56px; border-radius: 50%; margin: 0 auto 20px;
  background: white; display: flex; align-items: center; justify-content: center;
  color: #a08b6e; border: 1px solid #e8e2d9;
}
.ec-title { font-size: 1.1rem; font-weight: 700; color: #1a1a1a; margin-bottom: 10px; }
.ec-desc { font-size: 0.9rem; color: #777; line-height: 1.7; }

/* ── Connect ── */
.connect-section { padding: 100px 0; background: #f8f6f3; }
.connect-heading {
  font-family: 'Cormorant Garamond', serif;
  font-size: 2rem; font-weight: 600; color: #1a1a1a; margin-bottom: 12px;
}
.connect-text { font-size: 0.95rem; color: #777; line-height: 1.8; margin-bottom: 28px; }
.qr-elegant {
  display: inline-flex; flex-direction: column; align-items: center;
  padding: 36px; background: white; border-radius: 24px;
  border: 1px solid #e8e2d9; box-shadow: 0 16px 40px rgba(0,0,0,0.05);
}
.qr-elegant span { font-size: 0.55rem; font-weight: 800; letter-spacing: 0.25em; text-transform: uppercase; color: #a08b6e; margin-top: 14px; }
.social-elegant { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 24px; }
.se-link {
  display: inline-flex; align-items: center; padding: 8px 14px;
  border: 1px solid #d8d0c4; border-radius: 8px; font-size: 0.8rem;
  font-weight: 600; color: #555; text-decoration: none; transition: all 0.3s;
}
.se-link:hover { border-color: #a08b6e; color: #1a1a1a; }
.contact-elegant { display: flex; flex-direction: column; gap: 10px; }
.contact-elegant a { display: flex; align-items: center; color: #777; text-decoration: none; font-size: 0.9rem; transition: color 0.3s; }
.contact-elegant a:hover { color: #1a1a1a; }

/* ── CTA ── */
.cta-section { padding: 120px 24px; }
.cta-inner {
  max-width: 900px; margin: 0 auto; text-align: center;
  background: linear-gradient(135deg, #1e3a5f, #0f172a, #1e3a5f);
  border-radius: 32px; padding: 80px 60px;
  box-shadow: 0 30px 60px rgba(15,23,42,0.2);
}
.cta-tag { font-size: 0.6rem; font-weight: 800; letter-spacing: 0.35em; color: rgba(255,255,255,0.35); display: block; margin-bottom: 20px; }
.cta-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 2.8rem; font-weight: 600; color: white; margin-bottom: 16px; line-height: 1.2;
}
.cta-sub { font-size: 1rem; color: rgba(255,255,255,0.5); max-width: 480px; margin: 0 auto 40px; line-height: 1.7; }

@media (max-width: 960px) {
  .hero-title { font-size: 3rem; }
  .hero-portrait { width: 220px; height: 280px; }
  .cta-inner { padding: 50px 24px; }
  .cta-title { font-size: 2rem; }
  .story-side { position: static; }
}
</style>
