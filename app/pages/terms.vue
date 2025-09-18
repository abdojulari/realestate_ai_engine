<template>
  <v-container class="py-12">
    <v-row justify="center">
      <v-col cols="12" md="8" lg="6">
        <v-card class="elevation-8">
          <v-card-title class="text-h4 text-center py-6 bg-primary text-white">
            <v-icon left size="large" class="mr-2">mdi-file-document-outline</v-icon>
            Terms and Conditions
          </v-card-title>
          
          <v-card-text class="pa-6">
            <div class="text-center mb-6">
              <v-btn 
                color="primary" 
                size="large" 
                @click="dialog = true"
                class="text-h6"
              >
                <v-icon left>mdi-eye</v-icon>
                View Terms & Conditions
              </v-btn>
            </div>
            
            <v-alert type="info" variant="tonal" class="mb-4">
              <template v-slot:prepend>
                <v-icon>mdi-information</v-icon>
              </template>
              <strong>Important:</strong> By using our services, you agree to these terms and conditions. 
              Please read them carefully before proceeding.
            </v-alert>

            <div class="text-body-1 text-center">
              <p class="mb-2"><strong>Last Updated:</strong> September 18, 2025</p>
              <p class="mb-2"><strong>Effective Date:</strong> September 18, 2025</p>
              <p><strong>Jurisdiction:</strong> Edmonton, Alberta, Canada</p>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Terms Dialog -->
    <v-dialog v-model="dialog" max-width="900px" scrollable>
      <v-card>
        <v-card-title class="text-h5 bg-primary text-white pa-4 d-flex align-center">
          <v-icon left class="mr-2">mdi-file-document-outline</v-icon>
          Terms and Conditions - Homes By Abdul Ojulari
          <v-spacer></v-spacer>
          <v-btn icon @click="dialog = false" color="white" variant="text">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-card-text class="pa-0">
          <div class="pa-6" style="max-height: 70vh; overflow-y: auto;">
            
            <!-- Header Info -->
            <div class="text-center mb-6 pa-4 bg-grey-lighten-5 rounded">
              <p class="text-h6 mb-2">Homes By Abdul Ojulari</p>
              <p class="text-body-2 mb-1"><strong>Effective Date:</strong> September 18, 2025</p>
              <p class="text-body-2"><strong>Last Updated:</strong> September 18, 2025</p>
            </div>

            <div class="terms-content">
              <p class="text-body-1 mb-4">
                Welcome to <strong>Homes By Abdul Ojulari</strong> ("we", "us", "our"). By accessing or using our mobile application or website (the "App"), you agree to be bound by the following Terms and Conditions ("Terms").
              </p>
              
              <p class="text-body-1 mb-6">
                <strong>Please read them carefully. If you do not agree, do not use our App.</strong>
              </p>

              <!-- Section 1 -->
              <div class="mb-6">
                <h3 class="text-h6 mb-3 text-primary d-flex align-center">
                  <v-icon left size="small" class="mr-2">mdi-check-circle</v-icon>
                  1. Acceptance of Terms
                </h3>
                <p class="text-body-1 ml-6">
                  By using this App, you agree to these Terms. These Terms apply to all users, including real estate agents, property seekers, and general visitors.
                </p>
              </div>

              <!-- Section 2 -->
              <div class="mb-6">
                <h3 class="text-h6 mb-3 text-primary d-flex align-center">
                  <v-icon left size="small" class="mr-2">mdi-account-check</v-icon>
                  2. Eligibility
                </h3>
                <p class="text-body-1 ml-6">
                  You must be at least 18 years old to use this App. By using the App, you confirm that you meet this requirement.
                </p>
              </div>

              <!-- Section 3 -->
              <div class="mb-6">
                <h3 class="text-h6 mb-3 text-primary d-flex align-center">
                  <v-icon left size="small" class="mr-2">mdi-account-plus</v-icon>
                  3. User Registration & Account
                </h3>
                <p class="text-body-1 ml-6">
                  To access certain features, you may be required to create an account. You agree to provide accurate information, including your full name, email address, and phone number. You are responsible for maintaining the confidentiality of your account credentials.
                </p>
              </div>

              <!-- Section 4 -->
              <div class="mb-6">
                <h3 class="text-h6 mb-3 text-primary d-flex align-center">
                  <v-icon left size="small" class="mr-2">mdi-shield-account</v-icon>
                  4. Collection and Use of Personal Information
                </h3>
                <p class="text-body-1 ml-6 mb-3">
                  By using the App, you consent to the collection and use of your personal information, including but not limited to:
                </p>
                <v-list class="ml-6 mb-3" density="compact">
                  <v-list-item class="d-flex align-center">
                    <v-icon left size="small" class="mr-2">mdi-circle-small</v-icon>
                    Name
                  </v-list-item>
                  <v-list-item class="d-flex align-center">
                    <v-icon left size="small" class="mr-2">mdi-circle-small</v-icon>
                    Email address
                  </v-list-item>
                  <v-list-item class="d-flex align-center">
                    <v-icon left size="small" class="mr-2">mdi-circle-small</v-icon>
                    Phone number
                  </v-list-item>
                  <v-list-item class="d-flex align-center">
                    <v-icon left size="small" class="mr-2">mdi-circle-small</v-icon>
                    Property preferences
                  </v-list-item>
                  <v-list-item class="d-flex align-center">
                    <v-icon left size="small" class="mr-2">mdi-circle-small</v-icon>
                    Location data (optional)
                  </v-list-item>
                </v-list>
                <p class="text-body-1 ml-6 mb-3">We may use this information for:</p>
                <v-list class="ml-6 mb-3" density="compact">
                  <v-list-item class="d-flex align-center">
                    <v-icon left size="small" class="mr-2">mdi-circle-small</v-icon>
                    Marketing and promotional communications
                  </v-list-item>
                  <v-list-item class="d-flex align-center">
                    <v-icon left size="small" class="mr-2">mdi-circle-small</v-icon>
                    Service improvement and user analysis
                  </v-list-item>
                  <v-list-item class="d-flex align-center">
                    <v-icon left size="small" class="mr-2">mdi-circle-small</v-icon>
                    Sharing with trusted third-party partners for relevant offers
                  </v-list-item>
                </v-list>
                <p class="text-body-1 ml-6">
                  You may opt out of marketing communications by following the unsubscribe instructions in emails or contacting us directly. Please refer to our Privacy Policy for more details on data use and protection.
                </p>
              </div>

              <!-- Contact Section -->
              <div class="mb-6">
                <h3 class="text-h6 mb-3 text-primary d-flex align-center">
                  <v-icon left size="small" class="mr-2">mdi-phone</v-icon>
                  13. Contact Us
                </h3>
                <p class="text-body-1 ml-6 mb-3">
                  If you have any questions or concerns about these Terms, please contact us at:
                </p>
                <v-card class="ml-6 pa-4 bg-grey-lighten-5">
                  <v-list density="compact">
                    <v-list-item class="d-flex align-center">
                      <v-icon left class="mr-2">mdi-email</v-icon>
                      <strong>Email:</strong> info@homesbyabdulojulari.ca
                    </v-list-item>
                    <v-list-item class="d-flex align-center">
                      <v-icon left class="mr-2">mdi-phone</v-icon>
                      <strong>Phone:</strong> 647-563-7235
                    </v-list-item>
                    <v-list-item class="d-flex align-center">
                      <v-icon left class="mr-2">mdi-office-building</v-icon>
                      <strong>Company:</strong> Homes By Abdul Ojulari
                    </v-list-item>
                    <v-list-item class="d-flex align-center">
                      <v-icon left class="mr-2">mdi-map-marker</v-icon>
                      <strong>Location:</strong> Edmonton, Alberta, Canada
                    </v-list-item>
                  </v-list>
                </v-card>
              </div>

            </div>
          </div>
        </v-card-text>

        <v-card-actions class="pa-4 bg-grey-lighten-5">
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="dialog = false" size="large">
            <v-icon left>mdi-check</v-icon>
            I Understand
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'

const dialog = ref(false)

// SEO
useHead({
  title: 'Terms and Conditions - Homes By Abdul Ojulari',
  meta: [
    { name: 'description', content: 'Terms and Conditions for Homes By Abdul Ojulari real estate services in Edmonton, Alberta, Canada.' },
    { name: 'keywords', content: 'terms, conditions, real estate, Edmonton, Alberta, Canada, legal' }
  ]
})
</script>

<style scoped>
.terms-content {
  line-height: 1.6;
}

.terms-content h3 {
  border-bottom: 2px solid #1976D2;
  padding-bottom: 8px;
}

.v-list-item {
  padding-left: 0;
  min-height: 32px;
}

.v-card {
  box-shadow: 0 8px 32px rgba(0,0,0,0.1) !important;
}
</style>
