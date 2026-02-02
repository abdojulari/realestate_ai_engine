<template>
  <div class="chat-page">
    <!-- Hero -->
    <section class="chat-hero">
      <v-container class="py-12">
        <v-row align="center">
          <v-col cols="12" md="7">
            <div class="hero-badge mb-6">
              <v-icon size="16" class="mr-2">mdi-chat-processing-outline</v-icon>
              AI REAL ESTATE CONCIERGE
            </div>
            <h1 class="hero-title mb-4">Ask anything about buying, selling, or listings</h1>
            <p class="hero-subtitle">
              Get instant answers from curated FAQ knowledge and relevant listing data. When you show intent,
              we will invite you to connect with a licensed advisor.
            </p>
          </v-col>
          <v-col cols="12" md="5">
            <div class="hero-card">
              <div class="hero-card-icon">
                <v-icon size="32">mdi-home-city-outline</v-icon>
              </div>
              <div class="hero-card-title">What you can ask</div>
              <ul class="hero-list">
                <li>How much can I afford monthly?</li>
                <li>Show me 3-bed homes in Edmonton</li>
                <li>What is the selling process?</li>
              </ul>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Chat Interface -->
    <v-container class="py-10">
      <v-row>
        <v-col cols="12" lg="8">
          <ChatWidget />
        </v-col>

        <v-col cols="12" lg="4">
          <v-card class="side-card mb-6">
            <div class="side-card-title">
              <v-icon size="18" class="mr-2">mdi-compass-outline</v-icon>
              How it works
            </div>
            <ol class="side-list">
              <li>We detect intent (FAQ, property, or general).</li>
              <li>We pull relevant FAQ and listing data.</li>
              <li>We respond with a tailored answer and next steps.</li>
            </ol>
          </v-card>

          <v-card class="side-card">
            <div class="side-card-title">
              <v-icon size="18" class="mr-2">mdi-lock-outline</v-icon>
              Privacy note
            </div>
            <p class="text-body-2 text-medium-emphasis">
              If you ask to buy, sell, or schedule a viewing, we may request your contact details
              and clearly explain how they will be used.
            </p>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
 </template>

<script setup lang="ts">
import ChatWidget from '~/components/chat/ChatWidget.vue'

useHead({
  title: 'AI Concierge Chat - Real Estate',
  meta: [
    { name: 'description', content: 'Ask anything about buying, selling, or listings with our AI real estate concierge.' }
  ]
})
</script>

<style scoped>
.chat-page {
  background: #f8fafc;
  min-height: 100vh;
}

.chat-hero {
  background: linear-gradient(135deg, #0f172a 0%, #1f2937 100%);
  color: white;
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
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.hero-card-title {
  font-weight: 700;
  margin-bottom: 12px;
}

.hero-list {
  padding-left: 20px;
  margin: 0;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.8;
}

.side-card {
  padding: 20px;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
}

.side-card-title {
  font-weight: 700;
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.side-list {
  padding-left: 20px;
  margin: 0;
  line-height: 1.8;
  color: #475569;
}

@media (max-width: 960px) {
  .input-actions {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>
