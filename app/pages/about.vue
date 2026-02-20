<template>
  <div class="about-page-wrapper">
    <section class="relative min-h-[85vh] flex flex-col md:flex-row items-stretch overflow-hidden bg-[#121212]">
      
      <div class="w-full md:w-1/2 flex items-center justify-center pa-8 md:pa-16 relative z-10">
        <div class="max-w-xl">
          <div class="h-1 w-24 bg-primary mb-10"></div>
          
          <h1 class="text-display font-weight-black text-white leading-tight mb-8">
             {{ heroTitle }}
          </h1>

          <p class="text-h5 text-white font-weight-bold mb-8 leading-snug opacity-90">
            {{ heroSubtitle }}
          </p>

          <div class="editorial-text text-grey-lighten-2">
            <p>{{ heroDescription }}</p>
          </div>
        </div>
      </div>

      <div class="w-full md:w-1/2 relative min-h-[450px] md:min-h-full bg-grey-lighten-4">
        <div 
          class="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105"
          :style="{ 
            backgroundImage: `url(${profileImage})`,
            backgroundPosition: 'center 1%'
          }"
        ></div>
        <div class="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent md:hidden"></div>
      </div>
    </section>

    <section class="story-section py-24 bg-white">
      <v-container>
        <v-row justify="space-between" align="start">
          <v-col cols="12" md="5" class="mb-8 mb-md-0">
            <h2 class="text-h3 font-weight-bold text-black mb-6 leading-tight">
              {{ storyTitle }}
            </h2>
            <div class="pa-6 border-l-4 border-primary bg-grey-lighten-4">
              <p class="text-h6 mb-1 font-weight-bold">{{ storyName }}</p>
              <p class="text-subtitle-1 text-grey-darken-1">{{ storyRole }}</p>
            </div>
          </v-col>
          
          <v-col cols="12" md="6">
            <div v-if="storyContent" v-html="storyContent" class="editorial-text"></div>
            <div v-else class="editorial-text">
              <p>{{ storyContentDefault }}</p>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <section class="py-20 bg-[#121212] text-white">
      <v-container>
        <v-row align="center">
          <v-col cols="12" md="7">
            <h3 class="text-h4 font-weight-bold mb-6 tracking-tight">{{ connectHeading }}</h3>
            <p class="text-body-1 mb-10 text-grey-lighten-1 max-w-md leading-relaxed">
              {{ connectDescription }}
            </p>
            
            <div v-if="tenantSocialLinks.length" class="d-flex flex-wrap gap-4 mb-12">
              <v-btn
                v-for="social in tenantSocialLinks"
                :key="social.name"
                icon
                :href="social.url"
                target="_blank"
                class="social-btn"
                :class="getSocialClass(social.name)"
              >
                <v-icon size="28">{{ getSocialIcon(social.name) }}</v-icon>
              </v-btn>
            </div>

            <div class="d-flex flex-column gap-4">
              <a v-if="contactEmail" :href="`mailto:${contactEmail}`" class="contact-link">
                <v-icon size="20" class="mr-3 text-primary">mdi-email-outline</v-icon> 
                {{ contactEmail }}
              </a>
              <a v-if="contactPhone" :href="`tel:${contactPhone.replace(/[^+\d]/g, '')}`" class="contact-link">
                <v-icon size="20" class="mr-3 text-primary">mdi-phone-outline</v-icon> 
                {{ contactPhone }}
              </a>
            </div>
          </v-col>

          <v-col cols="12" md="5" class="text-center">
            <div class="qr-card">
              <div class="qr-bg">
                <img 
                  :src="qrCodeUrl" 
                  alt="Contact QR Code"
                />
              </div>
              <p class="text-caption text-black mt-4 font-weight-black tracking-widest">SCAN TO SAVE CONTACT</p>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <section class="values-section py-24 bg-grey-lighten-5">
      <v-container>
        <v-row>
          <v-col v-for="value in coreValues" :key="value.key" cols="12" md="4">
            <v-card class="value-card h-100 pa-10 rounded-0 border-t-4 border-primary elevation-0">
              <v-icon :icon="value.icon" size="48" class="text-primary mb-6"></v-icon>
              <h3 class="text-h5 mb-4 text-black font-weight-black tracking-tight uppercase">{{ value.title }}</h3>
              <p class="text-body-1 text-grey-darken-1 leading-loose">{{ value.description }}</p>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <section v-if="stats.length > 0" class="stats-section py-20 bg-white">
      <v-container>
        <v-row>
          <v-col v-for="stat in stats" :key="stat.key" cols="6" md="3" class="text-center">
            <div class="text-h2 text-primary mb-2 font-weight-black">{{ stat.value }}</div>
            <div class="text-overline font-weight-bold text-grey-darken-1">{{ stat.label }}</div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <section class="relative min-h-[60vh] d-flex align-center overflow-hidden">
      <v-parallax
        :src="ctaImage"
        alt="Featured Property"
        scale="0.7"
      >
        <div class="absolute inset-0 bg-black/60 d-flex align-center">
          <v-container>
            <v-row justify="center">
              <v-col cols="12" md="10" lg="8" class="text-center text-white">
                <span class="text-overline font-weight-bold tracking-[0.3em] mb-4 d-block opacity-80">
                  {{ ctaAreas }}
                </span>
                
                <h2 class="text-h3 md:text-h2 mb-6 font-weight-black leading-tight">
                  {{ ctaTitle }}
                </h2>
                
                <div class="w-16 h-1 bg-white mx-auto mb-10"></div>
                
                <p class="text-h6 mb-12 opacity-90 leading-relaxed font-weight-light max-w-2xl mx-auto">
                  {{ ctaSubtitle }}
                </p>
                
                <div class="d-flex flex-column flex-sm-row justify-center gap-6">
                  <v-btn 
                    v-if="contactPhone"
                    size="x-large" 
                    variant="flat" 
                    color="white" 
                    class="px-12 rounded-0 text-black font-weight-bold transition-all hover:scale-105" 
                    :href="`tel:${contactPhone.replace(/[^+\d]/g, '')}`"
                  >
                    CALL NOW
                  </v-btn>
                  
                  <v-btn 
                    size="x-large" 
                    variant="outlined" 
                    color="white" 
                    class="px-12 rounded-0 font-weight-bold" 
                    href="/contact"
                  >
                    INQUIRE
                  </v-btn>
                </div>
              </v-col>
            </v-row>
          </v-container>
        </div>
      </v-parallax>
    </section>
  </div>
</template>

<script setup lang="ts">
const { businessName, phone, contactEmail: tenantEmail, socialLinks: tenantSocialLinks } = useTenantSettings()

// ── Defaults (current hardcoded values preserved as fallbacks) ──
const DEFAULTS = {
  heroTitle: 'ABOUT.',
  heroSubtitle: "I'm passionate about innovation and driven by impact.",
  heroDescription: 'Providing excellence in real estate services with a personalized approach. Helping you navigate the journey home with safety and peace of mind.',
  profileImage: '/images/about/abdul.JPG',
  storyTitle: 'A Realtor with a Purpose',
  storyName: 'Abdul Ojulari',
  storyRole: 'eXp Realty | Licensed REALTOR®',
  storyContent: '',
  storyContentDefault: `With over 20 years of experience in the IT industry as a Senior Software Developer, I bring a strong analytical mindset and technology-driven approach to real estate. I hold multiple industry certifications, and have developed innovative software solutions for the real estate industry that simplify processes and enhance the client experience.

Now a licensed REALTOR® in Alberta specializing in residential real estate, I am passionate about helping clients feel confident, informed, and supported throughout every stage of their real estate journey. My background allows me to offer data-driven insights, clear guidance, and strategic advice so clients can make well-informed decisions.

Whether you are buying or selling, I go above and beyond to ensure your needs are clearly understood and fully represented. I believe no client should ever feel confused or pressured.

Approachable, responsive, and easy to work with, I value collaboration and continuously learn from my clients to deliver exceptional results while providing honest advice and meaningful market insights.`,
  connectHeading: 'Connect With Me',
  connectDescription: 'Scan the QR code to save my contact details directly to your phone or find me on your favorite platform.',
  ctaAreas: 'WINDERMERE • QUARRY RIDGE • LAKESIDE',
  ctaTitle: 'Ready to Find Your Dream Home?',
  ctaSubtitle: "Let's work together to make your real estate goals a reality in Edmonton's most prestigious communities.",
  ctaImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop',
  metaTitle: 'About | Real Estate Expert',
  metaDescription: 'Learn about your trusted real estate professional.',
  defaultValues: [
    { key: 'work-hard', title: 'Work Hard', description: 'My mission is to work hard to find you your forever home.', icon: 'mdi-hammer-wrench' },
    { key: 'live-well', title: 'Live Well', description: 'The right home is the essential ingredient needed to live well.', icon: 'mdi-home-heart' },
    { key: 'give-back', title: 'Give Back', description: 'When I find the right match, your new home will give back to your life.', icon: 'mdi-hand-heart' },
  ],
}

// ── Reactive CMS state ──
const heroTitle = ref(DEFAULTS.heroTitle)
const heroSubtitle = ref(DEFAULTS.heroSubtitle)
const heroDescription = ref(DEFAULTS.heroDescription)
const profileImage = ref(DEFAULTS.profileImage)
const storyTitle = ref(DEFAULTS.storyTitle)
const storyName = ref(DEFAULTS.storyName)
const storyRole = ref(DEFAULTS.storyRole)
const storyContent = ref(DEFAULTS.storyContent)
const storyContentDefault = ref(DEFAULTS.storyContentDefault)
const connectHeading = ref(DEFAULTS.connectHeading)
const connectDescription = ref(DEFAULTS.connectDescription)
const coreValues = ref<any[]>(DEFAULTS.defaultValues)
const stats = ref<any[]>([])
const ctaAreas = ref(DEFAULTS.ctaAreas)
const ctaTitle = ref(DEFAULTS.ctaTitle)
const ctaSubtitle = ref(DEFAULTS.ctaSubtitle)
const ctaImage = ref(DEFAULTS.ctaImage)
const metaTitle = ref(DEFAULTS.metaTitle)
const metaDescription = ref(DEFAULTS.metaDescription)

// ── Contact info from tenant settings ──
const contactPhone = computed(() => phone.value || '647-563-7235')
const contactEmail = computed(() => tenantEmail.value || 'abdul.ojulari@exprealty.com')

const qrCodeUrl = computed(() => {
  const name = encodeURIComponent(storyName.value || DEFAULTS.storyName)
  const tel = contactPhone.value.replace(/[^+\d]/g, '')
  const em = contactEmail.value
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=BEGIN:VCARD%0AVERSION:3.0%0AFN:${name}%0ATEL:${tel}%0AEMAIL:${em}%0AEND:VCARD`
})

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

function getSocialClass(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('facebook')) return 'facebook'
  if (n.includes('instagram')) return 'instagram'
  if (n.includes('linkedin')) return 'linkedin'
  if (n.includes('twitter') || n.includes('x.com') || n === 'x') return 'x-twitter'
  return ''
}

// ── Helper: pick CMS value or keep default ──
function apply(item: any, target: Ref<string>) {
  if (item?.content) target.value = item.content
}

onMounted(async () => {
  try {
    const pageData = await $fetch('/api/content/page/about') as any
    const items: any[] = pageData?.items || []

    const find = (key: string | string[]) => {
      const keys = Array.isArray(key) ? key : [key]
      return items.find(i => keys.includes(i.key))
    }

    apply(find('about.hero.title'), heroTitle)
    apply(find(['about.hero.subtitle', 'about-subtitle']), heroSubtitle)
    apply(find('about.hero.description'), heroDescription)
    apply(find(['about.hero.image', 'about-image']), profileImage)
    apply(find(['about.story.title', 'about-title']), storyTitle)
    apply(find('about.story.name'), storyName)
    apply(find('about.story.role'), storyRole)
    apply(find(['about.story.content', 'about-body']), storyContent)
    apply(find('about.connect.heading'), connectHeading)
    apply(find('about.connect.description'), connectDescription)
    apply(find('about.cta.areas'), ctaAreas)
    apply(find('about.cta.title'), ctaTitle)
    apply(find('about.cta.subtitle'), ctaSubtitle)
    apply(find('about.cta.image'), ctaImage)
    apply(find('about.meta.title'), metaTitle)
    apply(find('about.meta.description'), metaDescription)

    const valueItems = items.filter(i => i.key.startsWith('about.values.'))
    if (valueItems.length > 0) {
      coreValues.value = valueItems.map(item => ({
        key: item.key,
        title: item.title,
        description: item.content,
        icon: item.metadata?.icon || 'mdi-check-circle',
      }))
    }

    const statItems = items.filter(i => i.key.startsWith('about.stats.'))
    stats.value = statItems.map(item => ({ key: item.key, value: item.content, label: item.title }))
  } catch (error) {
    console.error('Error loading about content:', error)
  }
})

useHead({
  title: computed(() => metaTitle.value),
  meta: [{ name: 'description', content: computed(() => metaDescription.value) as any }],
})
</script>

<style scoped>
.text-display {
  font-size: clamp(2.5rem, 8vw, 5.5rem);
  letter-spacing: -0.05em;
  text-transform: uppercase;
}

.editorial-text {
  font-size: 1.15rem;
  line-height: 2.1; 
  letter-spacing: 0.015em;
  color: #333;
}
.editorial-text :deep(p) { margin-bottom: 2rem; }
.editorial-text :deep(li) { margin-bottom: 1rem; }

.social-btn { color: white !important; transition: transform 0.3s ease !important; }
.social-btn:hover { transform: translateY(-5px); }
.facebook { background-color: #1877F2 !important; }
.linkedin { background-color: #0077B5 !important; }
.x-twitter { background-color: #000000 !important; }
.instagram { 
  background: radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%) !important; 
}

.contact-link {
  text-decoration: none;
  color: #f5f5f5;
  font-size: 1.1rem;
  transition: color 0.3s;
}
.contact-link:hover { color: #1976D2; }

.qr-card {
  display: inline-block;
  background: white;
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 25px 50px rgba(0,0,0,0.5);
}
.value-card { transition: all 0.3s ease; }
.value-card:hover { transform: translateY(-10px); }

@media (max-width: 960px) {
  .text-display { font-size: 4rem !important; }
}
</style>
