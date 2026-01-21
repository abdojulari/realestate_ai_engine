<template>
  <v-container class="py-8">
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-6">Social Media Marketing</h1>
        <p class="text-subtitle-1 mb-6">
          Generate AI-powered real estate content and post to Facebook and Threads
        </p>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <SocialMediaManager />
      </v-col>
    </v-row>

    <!-- Quick Tips Section -->
    <v-row class="mt-8">
      <v-col cols="12">
        <v-card elevation="2">
          <v-card-title class="bg-grey-lighten-4">
            <v-icon icon="mdi-lightbulb-on" class="mr-2"></v-icon>
            Quick Tips
          </v-card-title>
          <v-card-text>
            <v-list>
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon color="primary">mdi-check-circle</v-icon>
                </template>
                <v-list-item-title>
                  Facebook posts can be longer (up to 63,206 characters)
                </v-list-item-title>
              </v-list-item>
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon color="primary">mdi-check-circle</v-icon>
                </template>
                <v-list-item-title>
                  Threads posts are limited to 500 characters
                </v-list-item-title>
              </v-list-item>
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon color="primary">mdi-check-circle</v-icon>
                </template>
                <v-list-item-title>
                  Use AI generation to create engaging content automatically
                </v-list-item-title>
              </v-list-item>
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon color="primary">mdi-check-circle</v-icon>
                </template>
                <v-list-item-title>
                  Add images to increase engagement by up to 150%
                </v-list-item-title>
              </v-list-item>
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon color="primary">mdi-check-circle</v-icon>
                </template>
                <v-list-item-title>
                  Post regularly (3-5 times per week) for best results
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- API Setup Instructions -->
    <v-row class="mt-6">
      <v-col cols="12">
        <v-expansion-panels>
          <v-expansion-panel>
            <v-expansion-panel-title>
              <v-icon icon="mdi-cog" class="mr-2"></v-icon>
              Setup Instructions
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <div class="pa-4">
                <h3 class="text-h6 mb-4">Required API Keys</h3>
                
                <v-alert type="info" class="mb-4">
                  All the APIs used here have FREE TIERS with generous limits
                </v-alert>

                <div class="mb-4">
                  <h4 class="font-weight-bold mb-2">1. Google Gemini API (AI Content Generation)</h4>
                  <ul>
                    <li>Visit: <a href="https://makersuite.google.com/app/apikey" target="_blank">Google AI Studio</a></li>
                    <li>Create a new API key</li>
                    <li>Add to .env: <code>GEMINI_API_KEY=your_api_key</code></li>
                    <li>Free tier: 60 requests per minute</li>
                  </ul>
                </div>

                <div class="mb-4">
                  <h4 class="font-weight-bold mb-2">2. Facebook App Setup</h4>
                  <ul>
                    <li>Visit: <a href="https://developers.facebook.com/apps" target="_blank">Facebook Developers</a></li>
                    <li>Create a new app or use existing one</li>
                    <li>Add "Facebook Login" product</li>
                    <li>Add permissions: pages_manage_posts, pages_read_engagement, pages_show_list</li>
                    <li>Add to .env: <code>FACEBOOK_APP_ID=your_app_id</code></li>
                    <li>Add to .env: <code>FACEBOOK_APP_SECRET=your_app_secret</code></li>
                  </ul>
                </div>

                <div class="mb-4">
                  <h4 class="font-weight-bold mb-2">3. Threads API (Optional)</h4>
                  <ul>
                    <li>Threads uses the same Facebook/Meta authentication</li>
                    <li>Requires Meta app verification for production use</li>
                    <li>For testing, use the same Facebook app credentials</li>
                  </ul>
                </div>

                <v-alert type="warning" class="mt-4">
                  <strong>Note:</strong> Make sure to restart your development server after updating .env file
                </v-alert>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
// Page for social media management
</script>

