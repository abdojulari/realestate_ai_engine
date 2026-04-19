<template>
  <div class="faq-page">
    <section class="faq-hero">
      <v-container class="py-12">
        <v-row align="center">
          <v-col cols="12" md="7">
            <div class="hero-badge mb-6">
              <v-icon size="16" class="mr-2">mdi-frequently-asked-questions</v-icon>
              CLIENT KNOWLEDGE BASE
            </div>
            <h1 class="hero-title mb-4">Frequently Asked Questions</h1>
            <p class="hero-subtitle">
              Clear, professional answers to the most common buying, selling, and market questions.
            </p>
          </v-col>
          <v-col cols="12" md="5">
            <div class="hero-card">
              <div class="hero-card-icon">
                <v-icon size="28">mdi-shield-check-outline</v-icon>
              </div>
              <div class="hero-card-title">Need personalized guidance?</div>
              <p class="hero-card-text">
                Use the AI Concierge to get tailored advice based on your situation.
              </p>
              <v-btn to="/chat" color="primary" class="text-none">
                <v-icon start>mdi-chat-processing-outline</v-icon>
                Ask Concierge
              </v-btn>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <v-container class="py-12">
      <v-card class="faq-card">
        <v-card-text class="pa-8">
          <div class="section-title mb-6">Top Questions</div>
          <v-expansion-panels class="faq-panels" variant="accordion">
            <v-expansion-panel v-for="faq in faqs" :key="faq.id" class="faq-panel">
              <v-expansion-panel-title class="font-weight-bold">
                <v-icon size="18" class="mr-3" color="primary">mdi-help-circle-outline</v-icon>
                {{ faq.question }}
              </v-expansion-panel-title>
              <v-expansion-panel-text class="pt-4">
                <div class="answer-text">{{ faq.answer }}</div>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card-text>
      </v-card>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { realEstateFaqs } from '~/data/realEstateFaqs'

const faqs = realEstateFaqs

const { businessName } = useTenantSettings()
const config = useRuntimeConfig()
const siteUrl = ((config.public.siteUrl as string) || '').replace(/\/$/, '')
const canonicalUrl = siteUrl ? `${siteUrl}/faq` : undefined

const faqDescription = 'Frequently asked questions about buying, selling, mortgages, closing costs, and real estate listings in Alberta.'

useSeoMeta({
  title: () => `FAQs | ${businessName.value || 'Real Estate'}`,
  description: faqDescription,
  ogTitle: () => `FAQs | ${businessName.value || 'Real Estate'}`,
  ogDescription: faqDescription,
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: () => `FAQs | ${businessName.value || 'Real Estate'}`,
  twitterDescription: faqDescription,
  robots: 'index, follow',
})

useHead({
  link: canonicalUrl ? [{ rel: 'canonical', href: canonicalUrl }] : [],
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: f.answer,
          },
        })),
      }),
    },
  ],
})
</script>

<style scoped>
.faq-page {
  background: #f8fafc;
  min-height: 100vh;
}

.faq-hero {
  background: linear-gradient(135deg, #0f172a 0%, #1f2937 100%);
  color: #ffffff;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  font-size: 0.7rem;
  letter-spacing: 0.2em;
  font-weight: 800;
}

.hero-title {
  font-size: clamp(2rem, 4vw, 3.2rem);
  font-weight: 800;
  letter-spacing: -0.02em;
}

.hero-subtitle {
  color: rgba(255, 255, 255, 0.85);
  max-width: 600px;
}

.hero-card {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  padding: 24px;
}

.hero-card-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.hero-card-title {
  font-weight: 700;
  margin-bottom: 8px;
}

.hero-card-text {
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 16px;
}

.faq-card {
  border-radius: 24px;
  border: 1px solid #e2e8f0;
}

.section-title {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: #94a3b8;
}

.faq-panels :deep(.v-expansion-panel) {
  border-radius: 14px !important;
  border: 1px solid #e2e8f0 !important;
  margin-bottom: 12px !important;
  background: #ffffff !important;
}

.faq-panels :deep(.v-expansion-panel-title) {
  padding: 18px 20px !important;
}

.answer-text {
  color: #475569;
  line-height: 1.7;
}
</style>
