<template>
  <div class="about-page-wrapper">
    <section class="relative min-h-[85vh] flex flex-col md:flex-row items-stretch overflow-hidden bg-[#121212]">
      
      <div class="w-full md:w-1/2 flex items-center justify-center pa-8 md:pa-16 relative z-10">
        <div class="max-w-xl">
          <div class="h-1 w-24 bg-primary mb-10"></div>
          
          <h1 class="text-display font-weight-black text-white leading-tight mb-8">
             {{ heroTitle || 'ABOUT.' }}
          </h1>

          <p class="text-h5 text-white font-weight-bold mb-8 leading-snug opacity-90">
            {{ heroSubtitle || "I'm passionate about innovation and driven by impact." }}
          </p>

          <div class="editorial-text text-grey-lighten-2">
            <p>
              Providing excellence in real estate services with a personalized approach. 
              Helping you navigate the journey home with safety and peace of mind.
            </p>
          </div>
        </div>
      </div>

      <div class="w-full md:w-1/2 relative min-h-[450px] md:min-h-full bg-grey-lighten-4">
        <div 
          class="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105"
          :style="{ 
            backgroundImage: `url(${profileImage || '/images/about/abdul.JPG'})`,
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
              {{ storyTitle || 'A Realtor with a Purpose' }}
            </h2>
            <div class="pa-6 border-l-4 border-primary bg-grey-lighten-4">
              <p class="text-h6 mb-1 font-weight-bold">Abdul Ojulari</p>
              <p class="text-subtitle-1 text-grey-darken-1">eXp Realty | Licensed REALTOR®</p>
            </div>
          </v-col>
          
          <v-col cols="12" md="6">
            <div v-if="storyContent" v-html="storyContent" class="editorial-text"></div>
            <div v-else class="editorial-text">
              <p>
                With over 20 years of experience in the IT industry as a Senior Software Developer, 
                I bring a strong analytical mindset and technology-driven approach to real estate. 
                I hold multiple industry certifications, and have developed innovative software 
                solutions for the real estate industry that simplify processes and enhance the client experience.
              </p>
              <p>
                Now a licensed REALTOR® in Alberta specializing in residential real estate, I am passionate about helping clients feel confident, informed, and supported throughout every stage of their real estate journey. My background allows me to offer data-driven insights, clear guidance, and strategic advice so clients can make well-informed decisions.

Whether you are buying or selling, I go above and beyond to ensure your needs are clearly understood and fully represented. I believe no client should ever feel confused or pressured.

Approachable, responsive, and easy to work with, I value collaboration and continuously learn from my clients to deliver exceptional results while providing honest advice and meaningful market insights.
              </p>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <section class="py-20 bg-[#121212] text-white">
      <v-container>
        <v-row align="center">
          <v-col cols="12" md="7">
            <h3 class="text-h4 font-weight-bold mb-6 tracking-tight">Connect With Me</h3>
            <p class="text-body-1 mb-10 text-grey-lighten-1 max-w-md leading-relaxed">
              Scan the QR code to save my contact details directly to your phone or find me on your favorite platform.
            </p>
            
            <div class="d-flex flex-wrap gap-4 mb-12">
              <v-btn icon href="https://www.facebook.com/realtorabdulojulari" target="_blank" class="social-btn facebook">
                <v-icon size="28">mdi-facebook</v-icon>
              </v-btn>

              <v-btn icon href="https://instagram.com/homesbyabdul_o" target="_blank" class="social-btn instagram">
                <v-icon size="28">mdi-instagram</v-icon>
              </v-btn>

              <v-btn icon href="https://www.linkedin.com/in/abdulojulari/" target="_blank" class="social-btn linkedin">
                <v-icon size="28">mdi-linkedin</v-icon>
              </v-btn>

              <v-btn icon href="https://x.com/OMcpayne" target="_blank" class="social-btn x-twitter">
                <v-icon size="24">mdi-twitter</v-icon>
              </v-btn>
            </div>

            <div class="d-flex flex-column gap-4">
              <a href="mailto:abdul.ojulari@exprealty.com" class="contact-link">
                <v-icon size="20" class="mr-3 text-primary">mdi-email-outline</v-icon> 
                abdul.ojulari@exprealty.com
              </a>
              <a href="tel:6475637235" class="contact-link">
                <v-icon size="20" class="mr-3 text-primary">mdi-phone-outline</v-icon> 
                647-563-7235
              </a>
            </div>
          </v-col>

          <v-col cols="12" md="5" class="text-center">
            <div class="qr-card">
              <div class="qr-bg">
                <img 
                  :src="`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=BEGIN:VCARD%0AVERSION:3.0%0AFN:Abdul+Ojulari%0ATEL:6475637235%0AEMAIL:abdul.ojulari@exprealty.com%0AEND:VCARD`" 
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
        src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop"
        alt="Luxury Property in Windermere"
        scale="0.7"
      >
        <div class="absolute inset-0 bg-black/60 d-flex align-center">
          <v-container>
            <v-row justify="center">
              <v-col cols="12" md="10" lg="8" class="text-center text-white">
                <span class="text-overline font-weight-bold tracking-[0.3em] mb-4 d-block opacity-80">
                  WINDERMERE • QUARRY RIDGE • LAKESIDE
                </span>
                
                <h2 class="text-h3 md:text-h2 mb-6 font-weight-black leading-tight">
                  {{ ctaTitle || 'Ready to Find Your Dream Home?' }}
                </h2>
                
                <div class="w-16 h-1 bg-white mx-auto mb-10"></div>
                
                <p class="text-h6 mb-12 opacity-90 leading-relaxed font-weight-light max-w-2xl mx-auto">
                  {{ ctaSubtitle || "Let's work together to make your real estate goals a reality in Edmonton's most prestigious communities." }}
                </p>
                
                <div class="d-flex flex-column flex-sm-row justify-center gap-6">
                  <v-btn 
                    size="x-large" 
                    variant="flat" 
                    color="white" 
                    class="px-12 rounded-0 text-black font-weight-bold transition-all hover:scale-105" 
                    :href="`tel:6475637235`"
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
const heroTitle = ref<string>('')
const heroSubtitle = ref<string>('')
const profileImage = ref<string>('')
const phone = ref<string>('647-563-7235')
const email = ref<string>('abdul.ojulari@exprealty.com')

const storyTitle = ref<string>('')
const storyContent = ref<string>('')
const personalQuote = ref<string>('')
const coreValues = ref<any[]>([])
const stats = ref<any[]>([])
const testimonials = ref<any[]>([])
const ctaTitle = ref<string>('')
const ctaSubtitle = ref<string>('')
const ctaButtonText = ref<string>('')
const ctaButtonLink = ref<string>('')

onMounted(async () => {
  try {
    const pageData = await $fetch('/api/content/page/about')
    const items: any[] = pageData?.items || []
    
    const heroTitleItem = items.find(i => i.key === 'about.hero.title' || i.key === 'about-title')
    const heroSubtitleItem = items.find(i => i.key === 'about.hero.subtitle' || i.key === 'about-subtitle')
    const profileImageItem = items.find(i => i.key === 'about.hero.image' || i.key === 'about-image')
    
    if (heroTitleItem?.content) heroTitle.value = heroTitleItem.content
    if (heroSubtitleItem?.content) heroSubtitle.value = heroSubtitleItem.content
    if (profileImageItem?.content) profileImage.value = profileImageItem.content
    
    const storyTitleItem = items.find(i => i.key === 'about.story.title')
    const storyContentItem = items.find(i => i.key === 'about.story.content' || i.key === 'about-body')
    if (storyTitleItem?.content) storyTitle.value = storyTitleItem.content
    if (storyContentItem?.content) storyContent.value = storyContentItem.content
    
    const valueItems = items.filter(i => i.key.startsWith('about.values.'))
    coreValues.value = valueItems.length > 0 ? valueItems.map(item => ({
      key: item.key,
      title: item.title,
      description: item.content,
      icon: 'mdi-check-circle'
    })) : [
      { key: 'work-hard', title: 'Work Hard', description: 'My mission is to work hard to find you your forever home.', icon: 'mdi-hammer-wrench' },
      { key: 'live-well', title: 'Live Well', description: 'The right home is the essential ingredient needed to live well.', icon: 'mdi-home-heart' },
      { key: 'give-back', title: 'Give Back', description: 'When I find the right match, your new home will give back to your life.', icon: 'mdi-hand-heart' }
    ]

    const statItems = items.filter(i => i.key.startsWith('about.stats.'))
    stats.value = statItems.map(item => ({ key: item.key, value: item.content, label: item.title }))

  } catch (error) {
    console.error('Error loading about content:', error)
  }
})

useHead({
  title: 'About Abdul Ojulari | Real Estate Expert',
  meta: [{ name: 'description', content: 'Learn about your trusted real estate professional.' }]
})
</script>

<style scoped>
/* High-End Hero Typography */
.text-display {
  font-size: clamp(2.5rem, 8vw, 5.5rem); /* Matches the massive header in the reference */
  letter-spacing: -0.05em;
  text-transform: uppercase;
}

/* Fix for the crowded text */
.editorial-text {
  font-size: 1.15rem;
  line-height: 2.1; 
  letter-spacing: 0.015em;
  color: #333;
}
.editorial-text :deep(p) { margin-bottom: 2rem; }
.editorial-text :deep(li) { margin-bottom: 1rem; }

/* Social Icons Brand Colors */
.social-btn { color: white !important; transition: transform 0.3s ease !important; }
.social-btn:hover { transform: translateY(-5px); }
.facebook { background-color: #1877F2 !important; }
.linkedin { background-color: #0077B5 !important; }
.x-twitter { background-color: #000000 !important; }
.instagram { 
  background: radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%) !important; 
}

/* Contact Links */
.contact-link {
  text-decoration: none;
  color: #f5f5f5;
  font-size: 1.1rem;
  transition: color 0.3s;
}
.contact-link:hover { color: #1976D2; }

/* UI Elements */
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