<template>
  <v-row class="mb-8">
    <v-col cols="12">
      <v-card class="section-card" elevation="0">
        <v-card-title class="pa-6"><span class="display-serif text-h5">Setup Guide</span></v-card-title>
        <v-divider class="opacity-10" />
        <v-card-text class="pa-6">
          <v-timeline density="compact" side="end">
            <v-timeline-item dot-color="#1877F2" size="small">
              <div class="mb-2"><strong>1. Create a Facebook App</strong></div>
              <div class="text-body-2 text-medium-emphasis">Go to <a href="https://developers.facebook.com/" target="_blank">developers.facebook.com</a> and create a new app (Business type).</div>
            </v-timeline-item>
            <v-timeline-item dot-color="#1877F2" size="small">
              <div class="mb-2"><strong>2. Add "Facebook Login for Business"</strong></div>
              <div class="text-body-2 text-medium-emphasis">In your app dashboard, add the product and configure it.</div>
            </v-timeline-item>
            <v-timeline-item dot-color="#1877F2" size="small">
              <div class="mb-2"><strong>3. Generate an Access Token</strong></div>
              <div class="text-body-2 text-medium-emphasis">Go to the <a href="https://developers.facebook.com/tools/explorer/" target="_blank">Graph API Explorer</a>, select your app, grant <code>pages_manage_posts</code> + <code>pages_read_engagement</code>, then generate.</div>
            </v-timeline-item>
            <v-timeline-item dot-color="success" size="small">
              <div class="mb-2"><strong>4. Connect Here</strong></div>
              <div class="text-body-2 text-medium-emphasis">Paste the token and we'll find your page automatically.</div>
            </v-timeline-item>
          </v-timeline>
          <v-alert type="info" variant="tonal" class="mt-4" density="compact">
            <strong>Tip:</strong> Use a <strong>User Access Token</strong> from the Graph API Explorer, not the Client Token from App Settings.
          </v-alert>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>
