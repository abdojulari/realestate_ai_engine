<template>
  <section :class="['why-us-section', `template-${template}`]">
    <v-container>
      <div v-if="sectionTitle" class="header-wrapper mb-12" :class="template === 2 ? 'text-left' : 'text-center'">
        <span v-if="template === 5" class="pre-title">Our Values</span>
        <h2 class="section-display-title">{{ sectionTitle }}</h2>
        <div v-if="template === 1 || template === 3" class="gold-divider mx-auto"></div>
      </div>

      <v-row v-if="cards.length" class="card-grid">
        <v-col
          v-for="(card, index) in cards"
          :key="card.title + index"
          cols="12"
          sm="6"
          :md="template === 2 ? '4' : '3'"
          class="d-flex"
        >
          <v-card v-if="template === 1" class="t1-card pa-8" flat>
            <div class="icon-circle mb-6">
              <v-icon :icon="card.icon" size="32" color="amber-darken-3" />
            </div>
            <h3 class="card-title-serif mb-4">{{ card.title }}</h3>
            <p class="card-desc">{{ card.description }}</p>
          </v-card>

          <v-card v-if="template === 2" class="t2-card pa-6" flat color="transparent">
            <div class="d-flex align-start">
              <span class="index-number mr-4">0{{ index + 1 }}</span>
              <div>
                <v-icon :icon="card.icon" size="24" color="white" class="mb-4" />
                <h3 class="text-h6 text-white font-weight-bold mb-2">{{ card.title }}</h3>
                <p class="text-grey-lighten-1 text-body-2">{{ card.description }}</p>
              </div>
            </div>
          </v-card>

          <v-card v-if="template === 3" class="t3-card pa-8 text-center" flat>
            <v-icon :icon="card.icon" size="40" class="glass-icon mb-4" />
            <h3 class="text-subtitle-1 font-weight-black mb-2">{{ card.title }}</h3>
            <p class="text-caption text-medium-emphasis">{{ card.description }}</p>
          </v-card>

          <v-card v-if="template === 4" class="t4-card pa-0" flat overflow="hidden">
            <div class="accent-bar"></div>
            <div class="pa-8">
              <v-icon :icon="card.icon" size="32" color="primary" class="mb-6" />
              <h3 class="text-h6 mb-3">{{ card.title }}</h3>
              <p class="text-body-2 text-grey-darken-1">{{ card.description }}</p>
            </div>
          </v-card>

          <v-card v-if="template === 5" class="t5-card pa-6" border="thin" flat>
            <v-avatar color="blue-lighten-5" rounded="lg" size="56" class="mb-6">
              <v-icon :icon="card.icon" color="blue-darken-3" />
            </v-avatar>
            <h3 class="text-h6 font-weight-bold mb-2">{{ card.title }}</h3>
            <p class="text-body-2 text-blue-grey-lighten-1">{{ card.description }}</p>
            <v-btn variant="text" color="blue-darken-3" class="px-0 mt-4 text-none" size="small">
              Learn more <v-icon end>mdi-chevron-right</v-icon>
            </v-btn>
          </v-card>
        </v-col>
      </v-row>

      <div v-else class="text-center py-12">
        <v-icon size="64" color="grey-lighten-2">mdi-database-off-outline</v-icon>
        <div class="text-grey mt-4">No content items found.</div>
      </div>
    </v-container>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{
  template?: number | string
}>()

const sectionTitle = ref<string>('Why Choose Us')
const cards = ref<Array<{ icon: string, title: string, description: string }>>([])

// Mock or Fetch Logic
onMounted(async () => {
  try {
    const page: any = await $fetch('/api/content/page/home')
    const items: any[] = page?.items || []
    const why = items.find(i => i.key === 'why-choose-us')
    const whyItems = items.filter(i => i.key === 'why-choose-us-item' || i.key?.startsWith('why-choose-us-item'))
    
    if (why?.title) sectionTitle.value = why.title
    if (whyItems?.length) {
      cards.value = whyItems.map(i => ({
        icon: i.metadata?.icon || 'mdi-check-decagram-outline',
        title: i.title,
        description: i.content
      }))
    } else {
      // Fallback for demo purposes if API is empty
      cards.value = [
        { icon: 'mdi-shield-check-outline', title: 'Secure Assets', description: 'Your investments are protected by industry-leading security protocols.' },
        { icon: 'mdi- medals-outline', title: 'Award Winning', description: 'Recognized globally for excellence in luxury architectural services.' },
        { icon: 'mdi-clover', title: 'Sustainable', description: 'Commitment to eco-friendly building materials and green energy.' },
        { icon: 'mdi-handshake-outline', title: 'Personalized', description: 'A dedicated concierge for every client, ensuring total satisfaction.' }
      ]
    }
  } catch (e) {
    console.error('Failed to load home content:', e)
  }
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Plus+Jakarta+Sans:wght@300;400;600&display=swap');

.why-us-section {
  padding: 100px 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  transition: all 0.5s ease;
}

.section-display-title {
  font-family: 'Playfair Display', serif;
  font-size: 3rem;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.2;
}

/* Template 1: Minimalist Luxury */
.template-1 { background-color: #fcfbf7; }
.t1-card {
  border: 1px solid #e5e0d5;
  background: transparent;
  border-radius: 0;
  transition: all 0.4s ease;
}
.t1-card:hover {
  background: white;
  border-color: #d97706;
  box-shadow: 0 20px 40px rgba(0,0,0,0.05);
}
.gold-divider {
  width: 60px;
  height: 2px;
  background: #d97706;
  margin-top: 20px;
}
.card-title-serif { font-family: 'Playfair Display', serif; font-size: 1.25rem; }

/* Template 2: Dark Editorial */
.template-2 { background-color: #0f172a; color: white; }
.template-2 .section-display-title { color: white; }
.index-number {
  font-family: 'Playfair Display', serif;
  font-size: 1.5rem;
  color: #fbbf24;
  opacity: 0.5;
}
.t2-card { transition: transform 0.3s ease; }
.t2-card:hover { transform: translateX(10px); }

/* Template 3: Glassmorphism */
.template-3 { 
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); 
}
.t3-card {
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 24px;
}
.glass-icon { color: #5c6bc0; }

/* Template 4: The Boutique */
.template-4 { background: #fff; }
.t4-card {
  background: #f8fafc;
  border-radius: 12px;
  position: relative;
  transition: all 0.3s ease;
}
.accent-bar {
  height: 4px;
  width: 100%;
  background: #0ea5e9;
  position: absolute;
  top: 0;
  left: 0;
  opacity: 0;
  transition: opacity 0.3s;
}
.t4-card:hover { transform: translateY(-10px); background: white; box-shadow: 0 15px 30px rgba(0,0,0,0.1); }
.t4-card:hover .accent-bar { opacity: 1; }

/* Template 5: Corporate Sharp */
.template-5 { background: #ffffff; border-top: 1px solid #edf2f7; }
.pre-title {
  text-transform: uppercase;
  letter-spacing: 2px;
  font-size: 0.75rem;
  color: #3b82f6;
  font-weight: 800;
  margin-bottom: 8px;
  display: block;
}
.t5-card {
  border-radius: 12px;
  transition: border-color 0.3s;
}
.t5-card:hover { border-color: #3b82f6; }

/* Mobile optimization */
@media (max-width: 600px) {
  .section-display-title { font-size: 2rem; }
  .why-us-section { padding: 60px 0; }
}
</style>