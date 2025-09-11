<template>
  <section class="resources-section">
    <v-container class="py-6">
      <h2 class="text-h4 text-center mb-8">Resources for Homebuyers & Owners</h2>
      <v-row>
        <v-col cols="12" md="6" lg="3" v-for="resource in resources" :key="resource.title">
          <v-card class="bg-grey-lighten-4 pa-4" >
            <v-card-title>{{ resource.title }}</v-card-title>
            <v-card-subtitle>{{ resource.subtitle }}</v-card-subtitle>
            <v-card-text>
              {{ resource.description }}
            </v-card-text>
            <v-card-actions>
              <v-btn
                :href="resource.link"
                target="_blank"
                color="primary"
                prepend-icon="mdi-web"
                variant="outlined"
              >
                View Guide
              </v-btn>
            </v-card-actions>
            <v-card-subtitle class="text-caption text-body-2">
              Source: <a :href="resource.source" target="_blank">{{ resource.sourceName }}</a>
            </v-card-subtitle>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </section>
</template>

<script setup lang="ts">
const resources = [
  {
    title: "Homebuying Step by Step",
    subtitle: "Complete Guide for First-Time Buyers",
    description: "Learn about mortgages, making an offer, and closing the deal in Canada.",
    link: "https://www.cmhc-schl.gc.ca/consumers/home-buying/buying-guides/home-buying",
    source: "https://www.cmhc-schl.gc.ca",
    sourceName: "CMHC"
  },
  {
    title: "Decide if Homeownership is Right for You",
    subtitle: "Guide",
    description: "Decide if homeownership is right for you with this guide from CMHC.",
    link: "https://www.cmhc-schl.gc.ca/consumers/home-buying/buying-guides/home-buying/decide-if-homeownership-is-right-for-you",
    source: "https://www.cmhc-schl.gc.ca",
    sourceName: "CMHC"
  },
  {
    title: "First-Time Home Buyer Incentive",
    subtitle: "Guide",
    description: "Learn about the First-Time Home Buyer Incentive from CMHC.",
    link: "https://www.cmhc-schl.gc.ca/consumers/home-buying/first-time-home-buyer-incentive",
    source: "https://www.cmhc-schl.gc.ca",
    sourceName: "CMHC"
  },
  {
    title: "Home Inspection Checklist",
    subtitle: "Checklist",
    description: "A practical checklist from CAHPI to help you evaluate and inspect a home.",
    link: "https://www.cahpi.ca/en/buyers-and-sellers/homebuyer-resources",
    source: "https://www.cahpi.ca",
    sourceName: "CAHPI"
  }
]
</script>

<style scoped>
.resources-section {
  background: white;
  padding: 4rem 0;
}
</style>
