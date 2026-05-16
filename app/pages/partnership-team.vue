<template>
  <div class="partnership-page">
    <v-alert
      v-if="thanksOpen"
      type="success"
      variant="tonal"
      rounded="lg"
      class="mx-4 mt-4"
      closable
      @click:close="thanksOpen = false"
    >
      Thank you — your profile was sent for review and will appear after approval.
    </v-alert>
    <section class="hero-gradient">
      <v-container class="py-12 py-md-16">
        <v-row justify="center">
          <v-col cols="12" md="10" lg="9" class="text-center">
            <div class="d-flex justify-center mb-6">
              <div class="hero-pill">
                <v-icon size="18" class="mr-2 text-primary">mdi-handshake-outline</v-icon>
                <span class="text-caption font-weight-bold text-medium-emphasis letter-spacing-1">
                  YOUR NETWORK &amp; PREFERRED PARTNERS
                </span>
              </div>
            </div>
            <h1 class="display-serif text-h3 text-md-h2 font-weight-bold mb-4">
              Partnership &amp; Team
            </h1>
            <p class="text-body-1 text-medium-emphasis mx-auto hero-lead">
              A curated circle of mortgage specialists, legal counsel, and inspectors — plus local
              businesses offering meaningful perks for our clients.
            </p>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <section class="py-10 py-md-14 section-muted">
      <v-container>
        <header class="section-header mb-10">
          <div class="premium-accent-bar mb-4" />
          <h2 class="text-h4 font-weight-bold mb-2">Trusted professionals</h2>
          <p class="text-body-1 text-medium-emphasis max-w-680">
            Hand-selected partners we coordinate with on your behalf. Tap any card for full contact
            details and credentials.
          </p>
        </header>

        <v-alert v-if="error" type="error" variant="tonal" class="mb-8" rounded="lg">
          We couldn’t load this section. Please refresh or try again shortly.
        </v-alert>

        <template v-for="cat in categories" :key="cat.value">
          <div class="category-block mb-12">
            <div class="d-flex align-center mb-6 gap-3">
              <v-avatar color="primary" variant="tonal" size="44">
                <v-icon :icon="cat.icon" />
              </v-avatar>
              <div>
                <h3 class="text-h5 font-weight-bold">{{ cat.title }}</h3>
                <p class="text-body-2 text-medium-emphasis mb-0">{{ cat.subtitle }}</p>
              </div>
            </div>

            <v-row v-if="pending">
              <v-col v-for="n in 3" :key="n" cols="12" md="4">
                <v-skeleton-loader type="card" class="rounded-xl" />
              </v-col>
            </v-row>

            <v-row v-else-if="(teamList[cat.value] || []).length === 0">
              <v-col cols="12">
                <v-sheet rounded="xl" border class="pa-8 text-center text-medium-emphasis">
                  Profiles for this category will appear here when published by your advisor.
                </v-sheet>
              </v-col>
            </v-row>

            <v-row v-else>
              <v-col
                v-for="member in teamList[cat.value]"
                :key="member.id"
                cols="12"
                md="4"
              >
                <v-sheet
                  class="member-card h-100 d-flex flex-column overflow-hidden"
                  rounded="xl"
                  elevation="0"
                  border
                  @click="openMember(member)"
                  role="button"
                  tabindex="0"
                  @keydown.enter="openMember(member)"
                >
                  <div v-if="member.photoUrl" class="member-photo-wrap">
                    <v-img
                      :src="member.photoUrl"
                      height="176"
                      cover
                      alt=""
                    >
                      <template #placeholder>
                        <v-sheet class="d-flex align-center justify-center fill-height" color="grey-lighten-3">
                          <v-progress-circular indeterminate color="primary" size="32" />
                        </v-sheet>
                      </template>
                    </v-img>
                  </div>
                  <div v-else class="member-photo-placeholder d-flex align-center justify-center">
                    <v-avatar color="primary" variant="tonal" size="72">
                      <v-icon size="36" color="primary">mdi-account-tie</v-icon>
                    </v-avatar>
                  </div>
                  <div class="pa-6 d-flex flex-column flex-grow-1">
                    <div class="d-flex justify-space-between align-start mb-4">
                      <v-chip size="small" variant="tonal" color="primary">{{ cat.title }}</v-chip>
                      <v-icon size="20" class="text-medium-emphasis">mdi-arrow-top-right</v-icon>
                    </div>
                    <h4 class="text-h6 font-weight-bold mb-1">{{ member.contactName }}</h4>
                    <p class="text-body-2 text-primary mb-4">{{ member.organization }}</p>
                    <v-spacer />
                    <div class="text-caption text-medium-emphasis">
                      Tap for phone, email &amp; bio
                    </div>
                  </div>
                </v-sheet>
              </v-col>
            </v-row>
          </div>
        </template>
      </v-container>
    </section>

    <section class="py-10 py-md-16">
      <v-container>
        <header class="section-header mb-10">
          <div class="premium-accent-bar mb-4" />
          <h2 class="text-h4 font-weight-bold mb-2">Partner perks &amp; promotions</h2>
          <p class="text-body-1 text-medium-emphasis max-w-680">
            Exclusive savings and introductions from businesses we trust — staging, furnishings,
            window treatments, and more.
          </p>
        </header>

        <v-row v-if="pending">
          <v-col v-for="n in 3" :key="'p-' + n" cols="12" md="4">
            <v-skeleton-loader type="article" class="rounded-xl" />
          </v-col>
        </v-row>

        <v-row v-else-if="!partners.length">
          <v-col cols="12">
            <v-sheet rounded="xl" border class="pa-8 text-center text-medium-emphasis">
              Partner offers curated for this brokerage will be listed here soon.
            </v-sheet>
          </v-col>
        </v-row>

        <v-row v-else>
          <v-col v-for="p in partners" :key="p.id" cols="12" md="6" lg="4">
            <v-sheet class="partner-card h-100 overflow-hidden d-flex flex-column" rounded="xl" elevation="0" border>
              <div v-if="p.coverImageUrl" class="partner-cover">
                <v-img :src="p.coverImageUrl" height="168" cover alt="">
                  <template #placeholder>
                    <v-sheet class="d-flex align-center justify-center fill-height" color="grey-lighten-3">
                      <v-progress-circular indeterminate color="primary" size="28" />
                    </v-sheet>
                  </template>
                </v-img>
              </div>
              <div class="partner-card-inner pa-6 flex-grow-1 d-flex flex-column">
                <div class="d-flex align-start gap-3 mb-3">
                  <v-avatar v-if="p.logoUrl" size="52" rounded="lg" class="partner-logo flex-shrink-0">
                    <v-img :src="p.logoUrl" cover alt="" />
                  </v-avatar>
                  <div class="flex-grow-1 min-w-0">
                    <div class="d-flex justify-space-between align-start gap-2">
                      <v-chip size="small" variant="outlined">{{ p.categoryTag }}</v-chip>
                      <v-icon color="primary" class="flex-shrink-0">mdi-tag-heart-outline</v-icon>
                    </div>
                    <h3 class="text-h6 font-weight-bold mt-2 mb-0">{{ p.companyName }}</h3>
                  </div>
                </div>
                <p v-if="p.offerSummary" class="text-subtitle-2 text-primary mb-3">{{ p.offerSummary }}</p>
                <p class="text-body-2 text-medium-emphasis mb-4">{{ p.description }}</p>
                <v-spacer />
                <v-btn
                  v-if="p.websiteUrl"
                  :href="p.websiteUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="text"
                  color="primary"
                  class="px-0 align-self-start"
                  append-icon="mdi-open-in-new"
                >
                  Visit website
                </v-btn>
              </div>
            </v-sheet>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <v-dialog v-model="detailOpen" max-width="560" scrollable>
      <v-card v-if="selected" rounded="xl">
        <div v-if="selected.photoUrl" class="detail-photo">
          <v-img :src="selected.photoUrl" height="220" cover alt="" />
        </div>
        <v-card-title class="text-h6 font-weight-bold pt-6 px-6">
          {{ selected.contactName }}
        </v-card-title>
        <v-card-subtitle class="px-6 pb-2 text-primary">{{ selected.organization }}</v-card-subtitle>
        <v-divider class="mx-4" />
        <v-card-text class="px-6 py-6">
          <dl class="detail-grid">
            <dt><v-icon size="18" class="mr-1">mdi-phone</v-icon> Phone</dt>
            <dd>
              <a :href="'tel:' + telHref(selected.phone)" class="text-decoration-none">{{ selected.phone }}</a>
            </dd>
            <dt><v-icon size="18" class="mr-1">mdi-email-outline</v-icon> Email</dt>
            <dd>
              <a :href="'mailto:' + selected.email" class="text-decoration-none">{{ selected.email }}</a>
            </dd>
            <dt><v-icon size="18" class="mr-1">mdi-map-marker-outline</v-icon> Address</dt>
            <dd>{{ selected.address }}</dd>
          </dl>
          <template v-if="selected.bio">
            <h4 class="text-subtitle-1 font-weight-bold mt-6 mb-2">Bio</h4>
            <p class="text-body-2 text-medium-emphasis">{{ selected.bio }}</p>
          </template>
          <template v-if="selected.credentials">
            <h4 class="text-subtitle-1 font-weight-bold mt-6 mb-2">Credentials</h4>
            <p class="text-body-2 text-medium-emphasis">{{ selected.credentials }}</p>
          </template>
        </v-card-text>
        <v-card-actions class="px-6 pb-6">
          <v-spacer />
          <v-btn variant="text" @click="detailOpen = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { TEAM_CATEGORY_OPTIONS } from '~/utils/partnershipsUi'

const route = useRoute()
const thanksOpen = ref(route.query.submitted === '1')

interface TeamMemberPublic {
  id: number
  category: string
  categoryLabel?: string
  contactName: string
  organization: string
  phone: string
  email: string
  address: string
  bio: string | null
  credentials: string | null
  photoUrl: string | null
}

interface PartnerPublic {
  id: number
  companyName: string
  categoryTag: string
  description: string
  offerSummary: string | null
  websiteUrl: string | null
  logoUrl: string | null
  coverImageUrl: string | null
}

const categories = TEAM_CATEGORY_OPTIONS

const { data, pending, error } = await useFetch<{
  team: Record<string, TeamMemberPublic[]>
  partners: PartnerPublic[]
}>('/api/public/partnerships')

const teamList = computed(() => data.value?.team ?? {})
const partners = computed(() => data.value?.partners ?? [])

const detailOpen = ref(false)
const selected = ref<TeamMemberPublic | null>(null)

function openMember(m: TeamMemberPublic) {
  selected.value = m
  detailOpen.value = true
}

function telHref(phone: string) {
  return phone.replace(/[^\d+]/g, '')
}
</script>

<style scoped>
.partnership-page {
  background: #fafafa;
}
.hero-gradient {
  background: linear-gradient(180deg, #ffffff 0%, #f6f7fb 100%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
.hero-pill {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: 999px;
  background: rgba(25, 118, 210, 0.06);
  border: 1px solid rgba(25, 118, 210, 0.12);
}
.hero-lead {
  max-width: 640px;
}
.section-muted {
  background: #fff;
}
.section-header .premium-accent-bar {
  width: 48px;
  height: 4px;
  border-radius: 4px;
  background: linear-gradient(90deg, #c9a227, #1976d2);
}
.max-w-680 {
  max-width: 680px;
}
.member-card {
  cursor: pointer;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}
.member-card:hover {
  box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08) !important;
  transform: translateY(-2px);
}
.member-photo-placeholder {
  height: 176px;
  background: linear-gradient(145deg, #eef4fc 0%, #f7f9fc 100%);
}
.partner-card {
  background: linear-gradient(145deg, #ffffff 0%, #fafbff 100%);
}
.detail-photo :deep(.v-img__img) {
  object-position: center top;
}
.detail-grid {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 12px 16px;
  align-items: start;
}
.detail-grid dt {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(0, 0, 0, 0.55);
  font-weight: 600;
}
.detail-grid dd {
  margin: 0;
  font-size: 0.9375rem;
}
.display-serif {
  font-family: 'Georgia', 'Times New Roman', serif;
  letter-spacing: -0.02em;
}
</style>
