<template>
  <div class="guides-page">
    <!-- Hero Section -->
    <v-img
      class="hero-gradient"
      height="400"
      cover
      src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1920&auto=format&fit=crop"
      gradient="to bottom, rgba(0,0,0,.10), rgba(0,0,0,.70)"
      eager
    >
      <div class="d-flex flex-column align-center justify-center text-center h-100 px-4">
        <h1 class="text-h2 text-white mb-4 premium-hero-title">Your Step-by-Step Guide to Selling</h1>
        <p class="text-h6 text-white mb-0 font-weight-light opacity-90" style="max-width: 800px; line-height: 1.6;">
          Selling a home on your terms takes strategic planning and expert preparation. Follow our proven path to a successful closing.
        </p>
      </div>
    </v-img>

    <v-container class="py-16">
   
      <!-- Selling Checklist Section -->
      <v-row>
        <v-col cols="12" md="8">
          <div class="mb-8">
            <div class="section-label mb-2">THE PROCESS</div>
            <h2 class="text-h3 font-weight-bold mb-4">On Your Checklist</h2>
            <p class="text-body-1 text-medium-emphasis premium-text">
              A comprehensive roadmap designed to maximize your home's value and ensure a seamless transition.
            </p>
          </div>

          <v-expansion-panels variant="accordion" class="premium-panels mb-10">
            <v-expansion-panel
              v-for="(step, index) in sellingChecklist"
              :key="index"
              class="mb-4 border-b-0"
              elevation="0"
            >
              <v-expansion-panel-title class="py-6">
                <template v-slot:default="{ expanded }">
                  <v-row no-gutters align="center">
                    <v-col cols="auto" class="mr-4">
                      <v-avatar 
                        :color="expanded ? 'black' : 'grey-lighten-4'" 
                        :class="expanded ? 'text-white' : 'text-black'"
                        size="48"
                        class="transition-swing"
                      >
                        <v-icon size="24">{{ step.icon }}</v-icon>
                      </v-avatar>
                    </v-col>
                    <v-col>
                      <div class="text-subtitle-1 font-weight-bold">{{ step.title }}</div>
                      <div v-if="step.timeline" class="text-caption text-primary font-weight-bold text-uppercase tracking-tighter">
                        {{ step.timeline }}
                      </div>
                    </v-col>
                  </v-row>
                </template>
              </v-expansion-panel-title>
              <v-expansion-panel-text class="pt-2 pb-4">
                <div class="text-body-1 premium-text text-medium-emphasis pl-14">
                  {{ step.content }}
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>

          <div class="d-flex flex-wrap gap-4">
            <v-btn color="black" to="/seller/homeestimate" class="text-white px-8 rounded-lg" height="52" flat>
              What's My Home Worth?
            </v-btn>
            <v-btn variant="outlined" color="black" to="/contact" class="px-8 rounded-lg" height="52">
              Talk to an Agent
            </v-btn>
          </div>
        </v-col>

        <!-- Sidebar -->
        <v-col cols="12" md="4" class="pl-md-10 mt-12 mt-md-0">
          <v-card class="pa-8 bg-grey-lighten-5 rounded-xl mb-8" flat border>
            <div class="text-h5 font-weight-bold mb-6">Why List With Us</div>
            <v-list bg-color="transparent" density="comfortable">
              <v-list-item
                v-for="(b, i) in bullets"
                :key="i"
                class="px-0 mb-4"
              >
                <template v-slot:prepend>
                  <v-avatar color="white" size="40" class="mr-4 border">
                    <v-icon size="20" color="black">{{ b.icon || 'mdi-check' }}</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title class="font-weight-bold">{{ b.title }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card>

          <v-card class="rounded-xl overflow-hidden" flat border>
            <v-img 
              height="240" 
              cover 
              src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1200&auto=format&fit=crop" 
              class="align-end"
            >
              <div class="pa-6 bg-gradient-to-t from-black/80 to-transparent w-100">
                <div class="text-white text-h6 font-weight-bold">Expert Staging</div>
                <div class="text-white opacity-80 text-caption">Professional presentation matters.</div>
              </div>
            </v-img>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

definePageMeta({ layout: 'default' })

const { businessName } = useTenantSettings()
useSeoMeta({
  title: () => `Sell Your Home | ${businessName.value || 'Real Estate'}`,
  ogTitle: () => `Sell Your Home | ${businessName.value || 'Real Estate'}`,
  description: 'List your property with a trusted REALTOR. Get a free home valuation and powerful marketing to sell your home fast.',
  ogDescription: 'List your property with a trusted REALTOR. Get a free home valuation and powerful marketing to sell your home fast.',
})

const bullets = ref([
  { title: 'Powerful Marketing', icon: 'mdi-bullhorn-outline' },
  { title: 'Expert Negotiation', icon: 'mdi-handshake-outline' },
  { title: 'Transparent Process', icon: 'mdi-shield-search' }
])

const sellingChecklist = [
  {
    title: 'Research Your Market',
    icon: 'mdi-magnify-expand',
    timeline: 'Initial Phase',
    content: "Decide when you'd like to sell, explore your local market trends, and talk to potential agents about how they would position your listing to stand out online."
  },
  {
    title: 'Choose the Right Agent',
    icon: 'mdi-account-tie-outline',
    timeline: '6 Weeks Before Listing',
    content: "Review a tailored marketing plan before signing. Alignment on strategy is key—official planning starts here to ensure a competitive launch."
  },
  {
    title: 'Prepare Your Home',
    icon: 'mdi-home-sparkles-outline',
    timeline: '4 Weeks Before Listing',
    content: "Focus on cosmetic fixes and staging. De-cluttering and neutralizing spaces helps buyers envision themselves in your home. We can coordinate storage if needed."
  },
  {
    title: 'Verify Financial Picture',
    icon: 'mdi-cash-check',
    timeline: '2-3 Weeks Before Listing',
    content: "Contact your lender for current loan payout information. Understanding your net proceeds helps in planning your next purchase."
  },
  {
    title: 'Professional Media',
    icon: 'mdi-camera-outline',
    timeline: '1 Week Before Listing',
    content: "Once the home is pristine, we coordinate professional photography, video tours, and drone shots to capture your home in its best light."
  },
  {
    title: 'Go Live & Showings',
    icon: 'mdi-calendar-check-outline',
    timeline: 'Listing Active',
    content: "Maintain a showing-ready environment. We manage scheduling and provide instant feedback as offers begin to arrive."
  }
]
</script>

<style scoped>
.premium-hero-title {
  font-family: 'Playfair Display', serif;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.section-label {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.2em;
  color: #FF9800;
  text-transform: uppercase;
}

.premium-text {
  line-height: 1.8;
  letter-spacing: 0.01em;
}

.guide-card {
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
}

.guide-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.08) !important;
  border-color: #000 !important;
}

/* CUSTOM ACCORDION STYLING */
.premium-panels {
  background: transparent !important;
}

.premium-panels :deep(.v-expansion-panel) {
  background: white !important;
  border-radius: 12px !important;
  border: 1px solid #f0f0f0 !important;
  overflow: hidden;
  transition: all 0.3s ease;
  margin-bottom: 16px !important;
}

.premium-panels :deep(.v-expansion-panel--active) {
  border-color: #000 !important;
  box-shadow: 0 8px 24px rgba(0,0,0,0.05) !important;
}

.premium-panels :deep(.v-expansion-panel-title:hover) {
  background: #fafafa;
}

.custom-list {
  list-style: none;
  padding: 0;
}

.custom-list li {
  position: relative;
  padding-left: 28px;
  margin-bottom: 12px;
  font-size: 0.95rem;
  color: #555;
  line-height: 1.6;
}

.custom-list li::before {
  content: "→";
  position: absolute;
  left: 0;
  color: #000;
  font-weight: bold;
}

.tracking-widest { letter-spacing: 0.15em; }
.tracking-tighter { letter-spacing: 0.05em; }

.bg-gradient-to-t {
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
}
</style>