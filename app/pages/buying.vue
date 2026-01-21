<template>
  <!-- Hero Section -->
  <v-img
    class="hero-section mb-10"
    height="480"
    cover
    src="https://images.unsplash.com/photo-1494526585095-c41746248156?q=80&w=1920&auto=format&fit=crop"
    gradient="to bottom, rgba(0,0,0,.1), rgba(0,0,0,.6)"
    eager
  >
    <div class="d-flex flex-column align-center justify-center text-center h-100 px-4">
      <h1 class="text-h2 text-white mb-4 hero-title">Buy a Home with Confidence</h1>
      <p class="text-h6 text-white mb-8 hero-subtitle" style="max-width: 800px; font-weight: 300; opacity: 0.9;">
        Expert guidance from search to closing. Access current MLS® listings, negotiate with leverage, and move forward with clarity and protection.
      </p>
      <div class="hero-actions">
        <v-btn 
          color="white" 
          class="mr-4 px-8 text-black font-weight-bold" 
          height="50"
          flat
          to="/map-search"
        >
          Browse Listings
        </v-btn>
        <v-btn 
          variant="outlined" 
          color="white" 
          class="px-8 font-weight-bold" 
          height="50"
          to="/guides/affordability"
        >
          Affordability Guide
        </v-btn>
      </div>
    </div>
  </v-img>

  <v-container class="py-16">
    <!-- Intro Section with Animation -->
    <v-row class="mb-16 align-center">
      <v-col cols="12" md="6">
        <h2 class="premium-title text-h3 mb-8">
          Partner with a REALTOR® <br/>
          <span class="text-primary-accent">Who Puts You First</span>
        </h2>
        <div class="premium-body text-body-1 text-medium-emphasis">
          <p class="mb-6">
            Working with me as your dedicated and exclusive REALTOR® doesn't cost you a thing — all I ask in return is your commitment. With your trust, I'll guide you every step of the way as we work toward achieving your real estate goals together.
          </p>
          <p class="mb-6">
            Whether you're a first-time buyer or seasoned investor, the home-buying process can feel overwhelming. With years of experience and in-depth market knowledge, I make it my mission to simplify the journey — making it smooth, successful, and even enjoyable.
          </p>
          <p class="mb-8 italic-quote">
            "I represent your interests above all else, committed to helping you find not just any home — but the right one."
          </p>
        </div>
        <v-btn 
          color="black" 
          class="text-white px-8" 
          rounded="0" 
          height="48"
          flat
        >
          LET'S GET STARTED
        </v-btn>
      </v-col>
      
      <v-col cols="12" md="6" class="pl-md-12">
        <!-- Re-designed Animated Steps Component with Broken Lines -->
        <div class="steps-container">
          <div v-for="(step, index) in buyingSteps" :key="index" class="step-wrapper">
            <!-- The connecting broken line -->
            <div 
              v-if="index < buyingSteps.length - 1" 
              class="broken-line"
              :class="{ 'active-line': currentStep > index }"
            ></div>
            
            <div 
              class="step-node" 
              :class="{ 'active-node': currentStep >= index }"
              @mouseenter="currentStep = index"
            >
              <div class="node-icon">
                <v-icon size="small">{{ step.icon }}</v-icon>
              </div>
              <div class="node-content">
                <h4 class="text-subtitle-1 font-weight-bold mb-0">{{ step.title }}</h4>
                <p class="text-caption text-medium-emphasis mb-0">{{ step.desc }}</p>
              </div>
            </div>
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- Detailed Info Cards -->
    <v-row class="mb-12">
      <v-col cols="12" md="6" lg="3" v-for="(card, i) in infoCards" :key="i">
        <v-card flat border class="premium-card h-100 rounded-lg">
          <v-img :src="card.image" height="180" cover class="card-image-tint" />
          <v-card-text class="pa-6">
            <div class="d-flex align-center mb-4">
              <v-icon :color="card.color" class="mr-3">{{ card.icon }}</v-icon>
              <h3 class="text-h6 font-weight-bold">{{ card.title }}</h3>
            </div>
            <ul class="premium-list">
              <li v-for="(item, j) in card.items" :key="j">{{ item }}</li>
            </ul>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Resources Section -->
    <v-divider class="mb-16" />
    <section>
      <div class="d-flex align-center mb-8">
        <h2 class="text-h4 font-weight-light">Tools & Resources</h2>
        <v-spacer />
        <v-btn variant="text" color="primary" to="/all-guides">View All Guides</v-btn>
      </div>
      <v-row>
        <v-col cols="12" md="6">
          <v-card to="/guides/affordability" flat border class="resource-card pa-4">
            <v-row no-gutters align="center">
              <v-col cols="3" class="text-center">
                <v-icon size="48" color="grey-lighten-1">mdi-calculator-variant</v-icon>
              </v-col>
              <v-col cols="9">
                <h3 class="text-h6 mb-1">Mortgage & Affordability</h3>
                <p class="text-body-2 text-medium-emphasis">
                  Calculate tiers, closing costs, and purchase estimates.
                </p>
              </v-col>
            </v-row>
          </v-card>
        </v-col>
      </v-row>
    </section>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({ layout: 'default' })

const currentStep = ref(0)

const buyingSteps = [
  { title: 'Initial Consultation', icon: 'mdi-chat-processing-outline', desc: 'Defining your needs and goals.' },
  { title: 'Pre-Approval', icon: 'mdi-currency-usd', desc: 'Securing your financial leverage.' },
  { title: 'Property Search', icon: 'mdi-home-search-outline', desc: 'Curated viewings based on criteria.' },
  { title: 'Offer & Negotiation', icon: 'mdi-file-sign', desc: 'Protecting your interests at the table.' },
  { title: 'Closing', icon: 'mdi-key-variant', desc: 'Finalizing paperwork and moving in.' }
]

const infoCards = [
  {
    title: 'Expert Guidance',
    icon: 'mdi-school-outline',
    color: 'primary',
    image: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?q=80&w=600',
    items: ['MLS® market access', 'Price evaluation', 'Neighborhood trends']
  },
  {
    title: 'Fiduciary Duty',
    icon: 'mdi-shield-check-outline',
    color: 'orange-darken-2',
    image: 'https://images.unsplash.com/photo-1573167243872-43c6433b9d40?q=80&w=600',
    items: ['Absolute loyalty', 'Full confidentiality', 'Total disclosure']
  },
  {
    title: 'Safety First',
    icon: 'mdi-lock-check-outline',
    color: 'green-darken-2',
    image: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?q=80&w=600',
    items: ['Verified disclosures', 'Contract reviews', 'Coordination of inspections']
  },
  {
    title: 'Exclusive Perks',
    icon: 'mdi-star-face',
    color: 'purple-darken-2',
    image: 'https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=600',
    items: ['Early listing access', 'Lender network', 'Step-by-step concierge']
  }
]

onMounted(() => {
  // Simple auto-iterator for the steps animation
  setInterval(() => {
    currentStep.value = (currentStep.value + 1) % buyingSteps.length
  }, 3500)
})
</script>

<style scoped>
/* PREMIUM TYPOGRAPHY & SPACING */
.hero-title {
  font-family: 'Playfair Display', serif; /* Or system equivalent */
  letter-spacing: -0.02em;
  line-height: 1.1;
  font-weight: 700;
}

.premium-title {
  line-height: 1.2;
  letter-spacing: -0.01em;
  font-weight: 800;
}

.text-primary-accent {
  color: #1a1a1a;
  border-bottom: 3px solid #FF9800;
}

.premium-body p {
  line-height: 1.8;
  font-size: 1.05rem;
  letter-spacing: 0.01em;
}

.italic-quote {
  font-style: italic;
  border-left: 3px solid #e0e0e0;
  padding-left: 20px;
  color: #616161;
}

/* ANIMATED STEPS WITH BROKEN LINES */
.steps-container {
  display: flex;
  flex-direction: column;
  gap: 40px;
  position: relative;
  padding: 20px 0;
}

.step-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.step-node {
  display: flex;
  align-items: center;
  gap: 20px;
  cursor: pointer;
  transition: all 0.4s ease;
  opacity: 0.5;
  transform: translateX(0);
}

.step-node.active-node {
  opacity: 1;
  transform: translateX(10px);
}

.node-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.4s ease;
  z-index: 2;
}

.active-node .node-icon {
  background: #000;
  color: #fff;
  box-shadow: 0 0 0 6px rgba(0,0,0,0.05);
  border-color: #000;
}

.broken-line {
  position: absolute;
  left: 21px;
  top: 44px;
  height: 40px;
  width: 2px;
  border-left: 2px dashed #e0e0e0; /* The broken line effect */
  z-index: 1;
}

.active-line {
  border-left-style: solid;
  border-left-color: #000;
  transition: all 0.6s ease;
}

/* CARD ENHANCEMENTS */
.premium-card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  border: 1px solid #f0f0f0 !important;
}

.premium-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 30px rgba(0,0,0,0.08) !important;
}

.card-image-tint {
  filter: grayscale(20%) contrast(110%);
}

.premium-list {
  list-style: none;
  padding: 0;
}

.premium-list li {
  position: relative;
  padding-left: 24px;
  margin-bottom: 12px;
  font-size: 0.95rem;
  line-height: 1.5;
  color: #424242;
}

.premium-list li::before {
  content: "→";
  position: absolute;
  left: 0;
  color: #FF9800;
  font-weight: bold;
}

.resource-card {
  transition: all 0.3s ease;
}
.resource-card:hover {
  background-color: #fafafa;
  border-color: #111 !important;
}
</style>