<template>
  <!-- Hero -->
  <v-img
    class="mb-10"
    height="360"
    cover
    src="https://images.unsplash.com/photo-1494526585095-c41746248156?q=80&w=1920&auto=format&fit=crop"
    gradient="to bottom, rgba(0,0,0,.25), rgba(0,0,0,.55)"
    eager
    lazy-src="/favicon.ico"
    referrerpolicy="no-referrer"
  >
    <div class="d-flex flex-column align-center justify-center text-center h-100 px-4">
      <h1 class="text-h3 text-white mb-2">Buy a Home with Confidence</h1>
      <p class="text-body-1 text-white mb-5" style="max-width: 900px;">
        Expert guidance from search to closing. Access current MLS® listings, negotiate with leverage, and move forward with clarity and protection.
      </p>
      <div>
        <v-btn color="orange-darken-2" class="mr-2" to="/map-search">Browse Listings</v-btn>
        <v-btn variant="outlined" color="white" to="/guides/affordability">Affordability Guide</v-btn>
      </div>
    </div>
  </v-img>

  <v-container class="py-12">
    <h1 class="text-h4 mb-6">Buy a Home</h1>
    <p class="mb-6">
      Whether you are a first-time homebuyer or looking to upgrade, purchasing a home is one of the biggest financial and emotional decisions you’ll ever make. 
      Working with a certified and licensed REALTOR® ensures that you are represented by a professional who has your best interests at heart every step of the way.
    </p>

    <v-row class="mb-8">
      <v-col cols="12" md="6">
        <v-card class="h-100">
          <v-img height="160" cover src="https://images.unsplash.com/photo-1554995207-c18c203602cb?q=80&w=1600&auto=format&fit=crop" eager lazy-src="/favicon.ico" referrerpolicy="no-referrer" />
          <v-card-text>
            <div class="d-flex align-center">
              <v-avatar color="primary" size="36" class="mr-2"><v-icon>mdi-account-group</v-icon></v-avatar>
              <h2 class="text-h5 mb-0">Why Work With a REALTOR®</h2>
            </div>
            <ul class="pl-5 mt-4">
              <li>Access to the most up-to-date MLS® listings across Canada</li>
              <li>Expert guidance on market conditions, pricing, and neighborhood trends</li>
              <li>Skilled negotiation to help you get the best deal</li>
              <li>Professional connections with mortgage brokers, inspectors, and lawyers</li>
            </ul>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="h-100">
          <v-img height="160" cover src="https://images.unsplash.com/photo-1573167243872-43c6433b9d40?q=80&w=1600&auto=format&fit=crop" eager lazy-src="/favicon.ico" referrerpolicy="no-referrer" />
          <v-card-text>
            <div class="d-flex align-center">
              <v-avatar color="orange-darken-2" size="36" class="mr-2"><v-icon class="text-white">mdi-shield-check</v-icon></v-avatar>
              <h2 class="text-h5 mb-0">Fiduciary Duties You Can Trust</h2>
            </div>
            <p class="mt-4">
              As your REALTOR®, I have a legal and ethical obligation to always act in your best interest. This includes:
            </p>
            <ul class="pl-5">
              <li><strong>Loyalty:</strong> Putting your goals first</li>
              <li><strong>Confidentiality:</strong> Protecting your private information</li>
              <li><strong>Disclosure:</strong> Sharing all relevant facts about a property</li>
              <li><strong>Diligence:</strong> Working tirelessly to secure the right home for you</li>
              <li><strong>Accountability:</strong> Keeping all transactions transparent</li>
            </ul>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mb-8">
      <v-col cols="12" md="6">
        <v-card class="h-100">
          <v-img height="160" cover src="https://images.unsplash.com/photo-1582407947304-fd86f028f716?q=80&w=1600&auto=format&fit=crop" eager lazy-src="/favicon.ico" referrerpolicy="no-referrer" />
          <v-card-text>
            <div class="d-flex align-center">
              <v-avatar color="green-darken-2" size="36" class="mr-2"><v-icon class="text-white">mdi-security</v-icon></v-avatar>
              <h2 class="text-h5 mb-0">Safety & Precautions</h2>
            </div>
            <p class="mt-4">
              Buying a home involves more than finding the right property — it’s about ensuring your safety and peace of mind. I help protect you by:
            </p>
            <ul class="pl-5">
              <li>Verifying property details and disclosures</li>
              <li>Coordinating professional inspections to avoid hidden issues</li>
              <li>Reviewing contracts to safeguard your rights</li>
              <li>Ensuring compliance with local laws and regulations</li>
            </ul>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="h-100">
          <v-img height="160" cover src="https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=1600&auto=format&fit=crop" eager lazy-src="/favicon.ico" referrerpolicy="no-referrer" />
          <v-card-text>
            <div class="d-flex align-center">
              <v-avatar color="purple-darken-2" size="36" class="mr-2"><v-icon class="text-white">mdi-cash-multiple</v-icon></v-avatar>
              <h2 class="text-h5 mb-0">Benefits to You as a Buyer</h2>
            </div>
            <p class="mt-4">
              Partnering with me means more than just finding a home — it means having an advocate who makes the process smooth and stress-free. Here’s what you gain:
            </p>
            <ul class="pl-5">
              <li>Early access to new and exclusive listings</li>
              <li>Customized home searches that fit your lifestyle</li>
              <li>Step-by-step support from search to closing</li>
              <li>Peace of mind knowing your best interests are protected</li>
            </ul>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <div class="text-center mt-10">
      <v-btn color="primary" variant="outlined" size="large" to="/map-search">
        Start Your Home Search
      </v-btn>
    </div>

    <v-divider class="my-12" />

    <section>
      <h2 class="text-h5 mb-4">Resources</h2>
      <v-row>
        <v-col cols="12" md="6">
          <v-card :to="{ path: '/guides/affordability' }" class="hover:shadow-lg transition-shadow">
            <v-card-title>How much home can you afford?</v-card-title>
            <v-card-subtitle>Guide + quick calculator</v-card-subtitle>
            <v-card-text>
              Learn budgeting rules, down payment tiers, closing costs, and estimate your purchase price with a built-in calculator.
            </v-card-text>
            <v-card-actions>
              <v-btn color="primary" variant="text">Read guide</v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </section>
  </v-container>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })
</script>
