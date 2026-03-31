<template>
  <v-row class="mb-8">
    <v-col cols="12">
      <v-card class="fb-hero-card" elevation="0">
        <div class="fb-hero-bg">
          <div class="fb-hero-gradient"></div>
          <div class="fb-hero-pattern"></div>
        </div>
        <v-card-text class="pa-8 pa-md-12 position-relative" style="z-index: 2;">
          <v-row align="center">
            <v-col cols="12" md="6">
              <div class="d-flex align-center ga-3 mb-5">
                <v-avatar size="48" style="background: linear-gradient(135deg, #1877F2, #0d65d9); box-shadow: 0 4px 20px rgba(24,119,242,0.35);">
                  <v-icon size="24" color="white">mdi-facebook</v-icon>
                </v-avatar>
                <v-chip variant="flat" color="#1877F2" size="small" class="font-weight-bold">Ready to Connect</v-chip>
              </div>

              <h2 class="display-serif fb-hero-title mb-3">
                Reach Thousands<br />
                <span class="fb-hero-accent">with One Click</span>
              </h2>

              <p class="text-body-1 mb-6" style="color: rgba(0,0,0,0.55); max-width: 420px; line-height: 1.7;">
                Connect your Facebook Page to instantly share listings, run campaigns, and engage buyers directly from your dashboard.
              </p>

              <div class="fb-stats-row mb-8">
                <div class="fb-stat-pill">
                  <v-icon size="16" color="#1877F2">mdi-account-group</v-icon>
                  <span><strong>2.9B+</strong> monthly users</span>
                </div>
                <div class="fb-stat-pill">
                  <v-icon size="16" color="#27AE60">mdi-trending-up</v-icon>
                  <span><strong>10x</strong> more reach</span>
                </div>
                <div class="fb-stat-pill">
                  <v-icon size="16" color="#E67E22">mdi-lightning-bolt</v-icon>
                  <span><strong>Instant</strong> posting</span>
                </div>
              </div>

              <v-btn color="#1877F2" variant="flat" size="x-large" prepend-icon="mdi-facebook" class="fb-hero-cta" @click="scrollToConnect">
                Connect Your Page Now
              </v-btn>
            </v-col>

            <v-col cols="12" md="6" class="d-none d-md-block">
              <div class="fb-feature-grid">
                <div class="fb-feature-card fb-feature-card-1">
                  <v-img
                    src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=600&auto=format&fit=crop"
                    height="160"
                    cover
                    class="rounded-xl mb-3"
                  />
                  <div class="fb-feature-label">
                    <v-icon size="14" color="#1877F2">mdi-home-city</v-icon>
                    <span>Share Listings</span>
                  </div>
                </div>
                <div class="fb-feature-card fb-feature-card-2">
                  <v-img
                    src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=600&auto=format&fit=crop"
                    height="160"
                    cover
                    class="rounded-xl mb-3"
                  />
                  <div class="fb-feature-label">
                    <v-icon size="14" color="#27AE60">mdi-account-multiple-plus</v-icon>
                    <span>Generate Leads</span>
                  </div>
                </div>
                <div class="fb-feature-card fb-feature-card-3">
                  <v-img
                    src="https://images.unsplash.com/photo-1553877522-43269d4ea984?q=80&w=600&auto=format&fit=crop"
                    height="160"
                    cover
                    class="rounded-xl mb-3"
                  />
                  <div class="fb-feature-label">
                    <v-icon size="14" color="#E67E22">mdi-bullhorn</v-icon>
                    <span>Run Campaigns</span>
                  </div>
                </div>
                <div class="fb-feature-card fb-feature-card-4">
                  <v-img
                    src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=600&auto=format&fit=crop"
                    height="160"
                    cover
                    class="rounded-xl mb-3"
                  />
                  <div class="fb-feature-label">
                    <v-icon size="14" color="#8E44AD">mdi-earth</v-icon>
                    <span>Grow Network</span>
                  </div>
                </div>
              </div>
            </v-col>
          </v-row>

          <!-- Benefits strip -->
          <div class="fb-benefits-strip mt-10">
            <div v-for="(benefit, i) in benefits" :key="i" class="fb-benefit-item">
              <v-avatar :color="benefit.color" size="36" variant="tonal">
                <v-icon size="18">{{ benefit.icon }}</v-icon>
              </v-avatar>
              <div>
                <div class="text-body-2 font-weight-bold">{{ benefit.title }}</div>
                <div class="text-caption text-medium-emphasis">{{ benefit.subtitle }}</div>
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
const benefits = [
  { icon: 'mdi-shield-check', color: '#1877F2', title: 'Secure OAuth', subtitle: 'One-click Facebook login' },
  { icon: 'mdi-clock-fast', color: '#27AE60', title: 'Auto-Post', subtitle: 'Publish in seconds' },
  { icon: 'mdi-chart-line', color: '#E67E22', title: 'Track Results', subtitle: 'Monitor engagement' },
  { icon: 'mdi-image-multiple', color: '#8E44AD', title: 'Rich Media', subtitle: 'Photos & templates' },
]

function scrollToConnect() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<style scoped>
.fb-hero-card {
  border-radius: 28px !important;
  border: 1px solid rgba(0, 0, 0, 0.04) !important;
  background: white !important;
  overflow: hidden;
  position: relative;
}

.fb-hero-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
}

.fb-hero-gradient {
  position: absolute;
  top: -40%;
  right: -20%;
  width: 70%;
  height: 180%;
  background: radial-gradient(ellipse at center, rgba(24, 119, 242, 0.04) 0%, transparent 70%);
}

.fb-hero-pattern {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(24, 119, 242, 0.03) 1px, transparent 1px);
  background-size: 24px 24px;
}

.fb-hero-title {
  font-size: 2.4rem;
  line-height: 1.15;
  letter-spacing: -1px;
  color: #1a1a1a;
}

.fb-hero-accent {
  background: linear-gradient(135deg, #1877F2, #0d65d9);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.fb-stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.fb-stat-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 100px;
  background: rgba(0, 0, 0, 0.03);
  font-size: 0.8rem;
  color: rgba(0, 0, 0, 0.6);
}

.fb-stat-pill strong {
  color: rgba(0, 0, 0, 0.85);
}

.fb-hero-cta {
  border-radius: 16px !important;
  text-transform: none !important;
  font-weight: 800 !important;
  letter-spacing: -0.3px !important;
  padding: 0 36px !important;
  font-size: 1rem !important;
  box-shadow: 0 6px 24px rgba(24, 119, 242, 0.3) !important;
  transition: all 0.25s ease !important;
}

.fb-hero-cta:hover {
  box-shadow: 0 8px 32px rgba(24, 119, 242, 0.4) !important;
  transform: translateY(-2px);
}

.fb-feature-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  padding-left: 24px;
}

.fb-feature-card {
  border-radius: 18px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(8px);
  transition: all 0.3s ease;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.fb-feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

.fb-feature-card-1 { animation: fb-float 6s ease-in-out infinite; }
.fb-feature-card-2 { animation: fb-float 6s ease-in-out 1.5s infinite; }
.fb-feature-card-3 { animation: fb-float 6s ease-in-out 3s infinite; }
.fb-feature-card-4 { animation: fb-float 6s ease-in-out 4.5s infinite; }

@keyframes fb-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.fb-feature-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.7);
}

.fb-benefits-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 20px 24px;
  border-radius: 20px;
  background: rgba(0, 0, 0, 0.015);
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.fb-benefit-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

@media (max-width: 960px) {
  .fb-hero-title {
    font-size: 1.8rem;
  }

  .fb-benefits-strip {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .fb-benefits-strip {
    grid-template-columns: 1fr;
  }
}
</style>
