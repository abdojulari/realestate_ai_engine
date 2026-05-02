<template>
  <section :class="['resources-outer-section', `template-${template}`, { 'dark-bg': template == 2 || template == 4 }]">
    <v-container class="py-16">
      <div class="text-center mb-12">
        <v-icon v-if="template == 1" color="amber-darken-2" class="mb-4">mdi-library-shelves</v-icon>
        <span v-if="template == 5" class="pre-title">Knowledge Base</span>
        <h2 class="section-title">Resources for Homebuyers &amp; Owners</h2>
        <div class="header-line mx-auto mt-4"></div>
      </div>

      <!-- Loading skeleton -->
      <v-row v-if="pending && resources.length === 0">
        <v-col v-for="n in 4" :key="n" cols="12" sm="6" lg="3">
          <v-skeleton-loader type="card" />
        </v-col>
      </v-row>

      <!-- Empty state — no published+featured resources for this tenant -->
      <div v-else-if="!pending && resources.length === 0" class="rs-empty">
        <v-icon size="48" color="grey-lighten-1">mdi-bookshelf</v-icon>
        <p class="text-body-2 text-medium-emphasis mt-3 mb-0">
          New guides &amp; resources are on the way — check back soon.
        </p>
      </div>

      <v-row v-else>
        <v-col
          cols="12"
          sm="6"
          lg="3"
          v-for="(resource, index) in resources"
          :key="resource.id"
        >
          <!-- Template 1: Minimalist Luxury -->
          <v-card v-if="template == 1" class="res-card-t1 pa-6" flat border>
            <div class="d-flex justify-space-between align-center mb-4">
              <v-icon color="amber-darken-2">mdi-file-document-outline</v-icon>
              <span v-if="resource.sourceName" class="text-overline text-grey">{{ resource.sourceName }}</span>
            </div>
            <h3 class="res-title-serif mb-2">{{ resource.title }}</h3>
            <p class="res-desc mb-6">{{ truncate(resource.excerpt, 140) }}</p>
            <v-btn
              block
              variant="text"
              class="border-t pt-4 text-none justify-space-between px-0"
              :to="`/learn/${resource.slug}`"
            >
              Read More <v-icon size="small">mdi-arrow-right</v-icon>
            </v-btn>
          </v-card>

          <!-- Template 2: Dark Editorial -->
          <v-card v-if="template == 2" class="res-card-t2 pa-8" flat color="transparent">
            <div class="res-number mb-4">0{{ index + 1 }}</div>
            <h3 class="text-h6 text-white font-weight-bold mb-3">{{ resource.title }}</h3>
            <p class="text-grey-lighten-1 text-body-2 mb-6">{{ truncate(resource.excerpt, 140) }}</p>
            <v-btn
              variant="outlined"
              color="amber-darken-2"
              rounded="0"
              size="small"
              class="text-none"
              :to="`/learn/${resource.slug}`"
            >
              <v-icon start size="18">mdi-book-open-variant</v-icon>
              Read More
            </v-btn>
          </v-card>

          <!-- Template 3: Glassmorphism -->
          <v-card v-if="template == 3" class="res-card-t3 pa-6" flat>
            <v-avatar color="white" class="mb-4 glass-icon-box" size="48">
              <v-icon color="primary">mdi-shield-home-outline</v-icon>
            </v-avatar>
            <h3 class="text-subtitle-1 font-weight-bold mb-2">{{ resource.title }}</h3>
            <p class="text-caption text-medium-emphasis mb-4">{{ truncate(resource.excerpt, 140) }}</p>
            <v-btn
              variant="tonal"
              color="primary"
              block
              size="small"
              class="text-none rounded-pill"
              :to="`/learn/${resource.slug}`"
            >
              Read More
            </v-btn>
          </v-card>

          <!-- Template 4: Slate & Gold -->
          <v-card v-if="template == 4" class="res-card-t4 pa-0" flat overflow="hidden">
            <div v-if="resource.sourceName" class="source-tag pa-2 px-4">{{ resource.sourceName }}</div>
            <div class="pa-6 pt-10">
              <h3 class="text-h6 mb-3 text-white">{{ resource.title }}</h3>
              <p class="text-body-2 text-grey-lighten-2 mb-6">{{ truncate(resource.excerpt, 140) }}</p>
              <v-btn
                block
                color="amber-darken-2"
                variant="flat"
                class="text-none font-weight-bold"
                :to="`/learn/${resource.slug}`"
              >
                Read More
              </v-btn>
            </div>
          </v-card>

          <!-- Template 5: Corporate Clean -->
          <v-card v-if="template == 5" class="res-card-t5 pa-6" flat border="thin">
            <v-chip
              v-if="resource.subtitle || resource.category"
              size="x-small"
              color="blue-darken-3"
              class="mb-4 font-weight-bold"
              variant="flat"
            >
              {{ resource.subtitle || resource.category }}
            </v-chip>
            <h3 class="text-h6 font-weight-bold mb-2 text-blue-grey-darken-4">{{ resource.title }}</h3>
            <p class="text-body-2 text-blue-grey-lighten-1 mb-4">{{ truncate(resource.excerpt, 140) }}</p>
            <v-divider class="mb-4"></v-divider>
            <div class="d-flex align-center justify-space-between">
              <span class="text-caption font-weight-bold">
                <template v-if="resource.sourceName">Source: {{ resource.sourceName }}</template>
                <template v-else>{{ resource.category || '\u00A0' }}</template>
              </span>
              <v-btn
                icon="mdi-open-in-new"
                variant="text"
                size="small"
                :to="`/learn/${resource.slug}`"
                title="Read more"
              />
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

withDefaults(defineProps<Props>(), {
  template: 1,
})

interface PublicResource {
  id: number
  slug: string
  title: string
  subtitle: string | null
  excerpt: string | null
  coverImage: string | null
  sourceName: string | null
  sourceUrl: string | null
  category: string | null
  publishedAt: string | null
}

// Tenant resolution happens server-side based on the request host, so a plain
// useFetch is safe here — each tenant's homepage hits this with their own
// Host header and gets back their own curated list.
const { data, pending } = await useFetch<{ success: boolean; resources: PublicResource[] }>(
  '/api/public/learn/featured',
  { default: () => ({ success: true, resources: [] }) },
)

const resources = computed<PublicResource[]>(() => data.value?.resources ?? [])

function truncate(s: string | null | undefined, n: number) {
  if (!s) return ''
  return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s
}
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

.rs-empty {
  text-align: center;
  padding: 32px 16px;
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
.res-card-t4 { background: #1e293b; border-radius: 8px; border-bottom: 4px solid #b89354; position: relative; overflow: hidden; }
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
