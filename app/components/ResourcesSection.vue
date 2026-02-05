<template>
  <section :class="['resources-outer-section', `template-${template}`, { 'dark-bg': template == 2 || template == 4 }]">
    <v-container class="py-16">
      <div class="text-center mb-12">
        <v-icon v-if="template == 1" color="amber-darken-2" class="mb-4">mdi-library-shelves</v-icon>
        <span v-if="template == 5" class="pre-title">Knowledge Base</span>
        <h2 class="section-title">Resources for Homebuyers & Owners</h2>
        <div class="header-line mx-auto mt-4"></div>
      </div>

      <v-row>
        <v-col 
          cols="12" 
          sm="6" 
          lg="3" 
          v-for="(resource, index) in resources" 
          :key="resource.title"
        >
          <v-card v-if="template == 1" class="res-card-t1 pa-6" flat border>
            <div class="d-flex justify-space-between align-center mb-4">
              <v-icon color="amber-darken-2">mdi-file-document-outline</v-icon>
              <span class="text-overline text-grey">{{ resource.sourceName }}</span>
            </div>
            <h3 class="res-title-serif mb-2">{{ resource.title }}</h3>
            <p class="res-desc mb-6">{{ resource.description }}</p>
            <v-btn
              block
              variant="text"
              class="border-t pt-4 text-none justify-space-between px-0"
              :href="resource.link"
              target="_blank"
            >
              Access Guide <v-icon size="small">mdi-arrow-right</v-icon>
            </v-btn>
          </v-card>

          <v-card v-if="template == 2" class="res-card-t2 pa-8" flat color="transparent">
            <div class="res-number mb-4">0{{ index + 1 }}</div>
            <h3 class="text-h6 text-white font-weight-bold mb-3">{{ resource.title }}</h3>
            <p class="text-grey-lighten-1 text-body-2 mb-6">{{ resource.description }}</p>
            <v-btn
              variant="outlined"
              color="amber-darken-2"
              rounded="0"
              size="small"
              class="text-none"
              :href="resource.link"
              target="_blank"
            >
              <v-icon start size="18">mdi-book-open-variant</v-icon>
              Read Guide
            </v-btn>
          </v-card>

          <v-card v-if="template == 3" class="res-card-t3 pa-6" flat>
            <v-avatar color="white" class="mb-4 glass-icon-box" size="48">
              <v-icon color="primary">mdi-shield-home-outline</v-icon>
            </v-avatar>
            <h3 class="text-subtitle-1 font-weight-bold mb-2">{{ resource.title }}</h3>
            <p class="text-caption text-medium-emphasis mb-4">{{ resource.description }}</p>
            <v-btn
              variant="tonal"
              color="primary"
              block
              size="small"
              class="text-none rounded-pill"
              :href="resource.link"
              target="_blank"
            >
              View Document
            </v-btn>
          </v-card>

          <v-card v-if="template == 4" class="res-card-t4 pa-0" flat overflow="hidden">
            <div class="source-tag pa-2 px-4">{{ resource.sourceName }}</div>
            <div class="pa-6 pt-10">
              <h3 class="text-h6 mb-3 text-white">{{ resource.title }}</h3>
              <p class="text-body-2 text-grey-lighten-2 mb-6">{{ resource.description }}</p>
              <v-btn
                block
                color="amber-darken-2"
                variant="flat"
                class="text-none font-weight-bold"
                :href="resource.link"
                target="_blank"
              >
                Download PDF
              </v-btn>
            </div>
          </v-card>

          <v-card v-if="template == 5" class="res-card-t5 pa-6" flat border="thin">
            <v-chip size="x-small" color="blue-darken-3" class="mb-4 font-weight-bold" variant="flat">
              {{ resource.subtitle }}
            </v-chip> 
            <h3 class="text-h6 font-weight-bold mb-2 text-blue-grey-darken-4">{{ resource.title }}</h3>
            <p class="text-body-2 text-blue-grey-lighten-1 mb-4">{{ resource.description }}</p>
            <v-divider class="mb-4"></v-divider>
            <div class="d-flex align-center justify-space-between">
              <span class="text-caption font-weight-bold">Source: {{ resource.sourceName }}</span>
              <v-btn icon="mdi-open-in-new" variant="text" size="small" :href="resource.link" target="_blank"></v-btn>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </section>
</template>

<script setup lang="ts">
interface Props {
  template?: number | string
}

const props = withDefaults(defineProps<Props>(), {
  template: 1
})

const resources = [
  {
    title: "Homebuying Step by Step",
    subtitle: "Canada Guide",
    description: "Learn about mortgages, making an offer, and closing the deal in the Canadian market.",
    link: "https://www.cmhc-schl.gc.ca/consumers/home-buying/buying-guides/home-buying",
    source: "https://www.cmhc-schl.gc.ca",
    sourceName: "CMHC"
  },
  {
    title: "Homeownership Assessment",
    subtitle: "Guide",
    description: "Evaluate your financial readiness and decide if ownership is right for you today.",
    link: "https://www.cmhc-schl.gc.ca/consumers/home-buying/buying-guides/home-buying/decide-if-homeownership-is-right-for-you",
    source: "https://www.cmhc-schl.gc.ca",
    sourceName: "CMHC"
  },
  {
    title: "First-Time Buyer Incentive",
    subtitle: "Financials",
    description: "Comprehensive breakdown of the federal incentives available for first-time purchasers.",
    link: "https://www.cmhc-schl.gc.ca/consumers/home-buying/first-time-home-buyer-incentive",
    source: "https://www.cmhc-schl.gc.ca",
    sourceName: "CMHC"
  },
  {
    title: "Home Inspection Checklist",
    subtitle: "Checklist",
    description: "A practical professional checklist to help you evaluate properties before you buy.",
    link: "https://www.cahpi.ca/en/buyers-and-sellers/homebuyer-resources",
    source: "https://www.cahpi.ca",
    sourceName: "CAHPI"
  }
]
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Plus+Jakarta+Sans:wght@300;400;600;700&display=swap');

.resources-outer-section {
  font-family: 'Plus Jakarta Sans', sans-serif;
  transition: all 0.4s ease;
}

.section-title {
  font-family: 'Playfair Display', serif;
  font-size: 2.5rem;
  font-weight: 700;
}

.header-line {
  width: 50px;
  height: 3px;
  background: #fbbf24;
}

/* Template 1: Minimalist Luxury */
.template-1 { background-color: #fff; }
.res-card-t1 { border-radius: 0; transition: 0.3s; }
.res-card-t1:hover { border-color: #fbbf24; transform: translateY(-5px); }
.res-title-serif { font-family: 'Playfair Display', serif; font-size: 1.2rem; }

/* Template 2: Dark Editorial */
.template-2 { background-color: #0f172a; }
.template-2 .section-title { color: white; }
.res-card-t2 { transition: 0.3s; }
.res-number { font-family: 'Playfair Display', serif; font-size: 1.5rem; color: #fbbf24; opacity: 0.6; }
.res-card-t2:hover { background: rgba(255, 255, 255, 0.05) !important; }

/* Template 3: Glassmorphism */
.template-3 { background: linear-gradient(135deg, #e0e7ff 0%, #f3f4f6 100%); }
.res-card-t3 {
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 24px;
}
.glass-icon-box { box-shadow: 0 8px 32px rgba(0,0,0,0.05); }

/* Template 4: Slate & Gold */
.template-4 { background: #020617; }
.template-4 .section-title { color: white; }
.res-card-t4 { background: #1e293b; border-radius: 8px; border-bottom: 4px solid #b89354; }
.source-tag { 
  background: #b89354; 
  color: white; 
  font-size: 0.65rem; 
  font-weight: 900; 
  position: absolute; 
  right: 0; 
  top: 0; 
  text-transform: uppercase;
}

/* Template 5: Corporate Clean */
.template-5 { background: #f8fafc; }
.pre-title { text-transform: uppercase; color: #2563eb; font-weight: 800; font-size: 0.7rem; letter-spacing: 2px; display: block; margin-bottom: 8px; }
.res-card-t5 { border-radius: 12px; transition: 0.3s; }
.res-card-t5:hover { box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }

/* Typography */
.res-desc { color: #64748b; font-size: 0.9rem; line-height: 1.6; }
</style>