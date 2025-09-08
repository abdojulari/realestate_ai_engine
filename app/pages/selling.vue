<template>
  <!-- Hero -->
  <v-img
    class="mb-10"
    height="320"
    cover
    src="https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?q=80&w=1920&auto=format&fit=crop"
    gradient="to bottom, rgba(0,0,0,.20), rgba(0,0,0,.60)"
    eager
    lazy-src="/favicon.ico"
    referrerpolicy="no-referrer"
  >
    <div class="d-flex flex-column align-center justify-center text-center h-100 px-4">
      <h1 class="text-h4 text-white mb-2">Your step-by-step guide to selling</h1>
      <p class="text-body-1 text-white mb-0" style="max-width: 920px;">
        Selling a home on your terms takes planning and preparation. Take these steps to get your home sale across the finish line.
      </p>
    </div>
  </v-img>

  <v-container class="py-12">
    <v-row>
      <v-col cols="12" md="8">
        <v-card class="mb-6" flat>
          <v-card-text>
            <h2 class="text-h6 mb-4">On your checklist</h2>
            <v-expansion-panels variant="accordion" class="elevation-0" flat>
              <v-expansion-panel>
                <v-expansion-panel-title>Research your market</v-expansion-panel-title>
                <v-expansion-panel-text>
                  Decide when you'd like to sell, explore your market, and talk to potential agents about how they would market your listing, including online.
                </v-expansion-panel-text>
              </v-expansion-panel>
              <v-expansion-panel>
                <v-expansion-panel-title>Choose an agent</v-expansion-panel-title>
                <v-expansion-panel-text>
                  Six weeks before listing: Before signing a listing agreement with an agent, discuss your marketing plan. If you're aligned, make it official and start planning — the earlier the better.
                </v-expansion-panel-text>
              </v-expansion-panel>
              <v-expansion-panel>
                <v-expansion-panel-title>Get your home ready</v-expansion-panel-title>
                <v-expansion-panel-text>
                  One month before listing: Start sprucing the place up. Your agent can help determine cosmetic fixes to make and items that will turn off buyers. If you can, get a storage pod or unit and start packing up, a little at a time.
                </v-expansion-panel-text>
              </v-expansion-panel>
              <v-expansion-panel>
                <v-expansion-panel-title>Check your financial picture</v-expansion-panel-title>
                <v-expansion-panel-text>
                  Two to three weeks before listing: Contact your lender and ask for the loan payout information for your mortgage.
                </v-expansion-panel-text>
              </v-expansion-panel>
              <v-expansion-panel>
                <v-expansion-panel-title>Find a photographer</v-expansion-panel-title>
                <v-expansion-panel-text>
                  One week before listing: Once you’ve got the house looking its best, your agent can help you coordinate photography.
                </v-expansion-panel-text>
              </v-expansion-panel>
              <v-expansion-panel>
                <v-expansion-panel-title>Prepare for showings</v-expansion-panel-title>
                <v-expansion-panel-text>
                  When your listing is live: Keep your home clean and clutter-free so your agent is ready to show it at a moment's notice — and watch the offers roll in.
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-card-text>
        </v-card>
        <v-btn color="primary" to="/seller/homeestimate" class="mr-2">What's My Home Worth?</v-btn>
        <v-btn variant="outlined" to="/contact">Talk to an Agent</v-btn>
      </v-col>
      <v-col cols="12" md="4">
        <v-card class="mb-6" flat>
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

        <!-- Themed images -->
        <v-card class="mb-4" flat>
          <v-img height="180" cover src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop" eager lazy-src="/favicon.ico" referrerpolicy="no-referrer" />
          
        </v-card>
     
      </v-col>
    </v-row>

    <v-divider class="my-12" />

    <!-- Resources -->
    <section>
      <h2 class="text-h5 mb-4">Resources for sellers</h2>
      <v-row>
        <v-col cols="12" md="6">
          <v-card 
            :to="{ path: '/guides/affordability' }" 
            class="hover:shadow-lg transition-shadow" flat
          >
            <v-card-title>How much home can you afford?</v-card-title>
            <v-card-subtitle>Guide + quick calculator</v-card-subtitle>
            <v-card-text>
              Plan your next purchase with budgeting rules, down payment tiers, and an affordability calculator.
            </v-card-text>
            <v-card-actions>
              <v-btn color="primary" variant="text">Open</v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card 
            :to="{ path: '/map-search' }" 
            class="hover:shadow-lg transition-shadow" flat
          >
            <v-card-title>Explore recent listings</v-card-title>
            <v-card-subtitle>Understand your market</v-card-subtitle>
            <v-card-text>
              Browse similar homes to gauge pricing and demand before you list.
            </v-card-text>
            <v-card-actions>
              <v-btn color="primary" variant="text">Browse</v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </section>
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
    const page: any = await $fetch('/api/content/page/selling')
    const items: any[] = (page && (page as any).items) ? (page as any).items : []
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


