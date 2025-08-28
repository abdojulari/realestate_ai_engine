<template>
  <v-container class="py-12">
    <h1 class="text-h4 mb-6">{{ title || 'Sell Your Home' }}</h1>
    <p class="mb-6" v-html="intro || defaultIntro"></p>
    <v-row>
      <v-col cols="12" md="8">
        <v-card class="mb-6">
          <v-card-text>
            <h2 class="text-h6 mb-3">{{ processTitle || 'Our Process' }}</h2>
            <ol class="pl-6">
              <li v-for="(step, idx) in processSteps" :key="idx" class="mb-2" v-text="step"></li>
            </ol>
          </v-card-text>
        </v-card>
        <v-btn color="primary" to="/seller/homeestimate" class="mr-2">What's My Home Worth?</v-btn>
        <v-btn variant="outlined" to="/contact">Talk to an Agent</v-btn>
      </v-col>
      <v-col cols="12" md="4">
        <v-card>
          <v-card-text>
            <div class="text-h6 mb-3">{{ sidebarTitle || 'Why List With Us' }}</div>
            <v-list density="compact">
              <v-list-item
                v-for="(b, i) in bullets"
                :key="i"
                :prepend-icon="b.icon || 'mdi-check'"
                :title="b.title"
              />
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const title = ref('')
const intro = ref('')
const defaultIntro = 'Learn about our selling process, marketing plan, and request your free home valuation.'
const processTitle = ref('')
const processSteps = ref<string[]>([ 'Consultation and pricing strategy', 'Staging and professional photography', 'Launch marketing campaign across web and social', 'Showings and feedback', 'Offers, negotiation, and closing' ])
const sidebarTitle = ref('')
const bullets = ref<any[]>([ { title: 'Powerful marketing', icon: 'mdi-bullhorn' }, { title: 'Experienced negotiators', icon: 'mdi-handshake' }, { title: 'Fast, transparent process', icon: 'mdi-speedometer' } ])

onMounted(async () => {
  try {
    const page = await $fetch('/api/content/page/selling')
    const items: any[] = page.items || []
    title.value = items.find(i => i.type === 'selling-title')?.content || ''
    intro.value = items.find(i => i.type === 'selling-intro')?.content || ''
    processTitle.value = items.find(i => i.type === 'selling-process-title')?.content || ''
    const steps = items.filter(i => i.type === 'selling-process-step').map(i => i.content).filter(Boolean)
    if (steps.length) processSteps.value = steps
    sidebarTitle.value = items.find(i => i.type === 'selling-sidebar-title')?.content || ''
    const bs = items.filter(i => i.type === 'selling-sidebar-item').map(i => ({ title: i.title || i.content, icon: i.metadata?.icon }))
    if (bs.length) bullets.value = bs
  } catch {}
})
</script>


