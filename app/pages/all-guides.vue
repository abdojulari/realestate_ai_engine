<template>
    <v-container class="py-16">
      <div class="mb-12">
        <h1 class="text-h2 font-weight-bold mb-4">Real Estate Guides</h1>
        <p class="text-h6 text-medium-emphasis font-weight-light" style="max-width: 800px;">
          Empowering you with the knowledge and tools needed for a secure and informed real estate journey.
        </p>
      </div>
  
      <v-row>
        <!-- Fintracker Guide (New) -->
        <v-col cols="12" md="6">
          <v-card flat border class="guide-card h-100 pa-6 rounded-lg">
            <div class="d-flex align-center mb-6">
              <v-avatar color="blue-lighten-5" rounded size="56" class="mr-4">
                <v-icon color="blue-darken-3" size="32">mdi-shield-account-outline</v-icon>
              </v-avatar>
              <div>
                <h2 class="text-h5 font-weight-bold">Identity Verification & Anti-Money Laundering</h2>
                <span class="text-caption text-uppercase font-weight-bold text-blue-darken-2">Security & Compliance</span>
              </div>
            </div>
            
            <div class="guide-content mb-8">
              <p class="text-body-1 mb-4">
                In Canada, real estate transactions are strictly regulated to prevent financial crimes. We use <strong>Fintracker</strong> to ensure a secure, digital, and seamless verification process.
              </p>
              <h4 class="text-subtitle-1 font-weight-bold mb-2">Why this matters for you:</h4>
              <ul class="custom-list mb-6">
                <li><strong>Legal Compliance:</strong> REALTORS® are legally required to verify the identity of their clients under FINTRAC regulations.</li>
                <li><strong>Fraud Protection:</strong> Verifying identities ensures that all parties in the transaction are legitimate, protecting your investment.</li>
                <li><strong>Digital Convenience:</strong> No more scanning paper IDs. Fintracker allows you to complete verification securely from your phone.</li>
              </ul>
            </div>
  
            <v-btn 
              block 
              color="black" 
              class="text-white" 
              height="48" 
              flat 
              href="https://www.fintracker.ca/" 
              target="_blank"
            >
              Learn about Fintracker
              <v-icon end icon="mdi-open-in-new" size="small" />
            </v-btn>
          </v-card>
        </v-col>
  
        <!-- Affordability Guide (Existing Reference) -->
        <v-col cols="12" md="6">
          <v-card flat border class="guide-card h-100 pa-6 rounded-lg">
            <div class="d-flex align-center mb-6">
              <v-avatar color="orange-lighten-5" rounded size="56" class="mr-4">
                <v-icon color="orange-darken-3" size="32">mdi-calculator</v-icon>
              </v-avatar>
              <div>
                <h2 class="text-h5 font-weight-bold">Home Affordability Guide</h2>
                <span class="text-caption text-uppercase font-weight-bold text-orange-darken-2">Financial Planning</span>
              </div>
            </div>
            
            <div class="guide-content mb-8">
              <p class="text-body-1 mb-4">
                Determine your buying power before you start the search. Understand down payment requirements, mortgage types, and the true cost of ownership.
              </p>
              <h4 class="text-subtitle-1 font-weight-bold mb-2">What's inside:</h4>
              <ul class="custom-list mb-6">
                <li>Closing cost breakdown</li>
                <li>Mortgage payment calculator</li>
                <li>Pre-approval checklist</li>
              </ul>
            </div>
  
            <v-btn 
              block 
              variant="outlined" 
              color="black" 
              height="48" 
              to="/guides/affordability"
            >
              Open Guide
            </v-btn>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </template>
  
  <style scoped>
  .guide-card {
    transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
    border-color: #eee !important;
  }
  .guide-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 24px rgba(0,0,0,0.06) !important;
    border-color: #000 !important;
  }
  
  .custom-list {
    list-style: none;
    padding: 0;
  }
  .custom-list li {
    position: relative;
    padding-left: 28px;
    margin-bottom: 12px;
    font-size: 0.95rem;
    color: #444;
    line-height: 1.6;
  }
  .custom-list li::before {
    content: "•";
    position: absolute;
    left: 10px;
    color: #000;
    font-weight: bold;
  }
  </style>