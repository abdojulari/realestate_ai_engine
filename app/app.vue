<template>
  <v-app>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </v-app>
</template>

<script setup lang="ts">
// Minimal setup without layout-shifting features
</script>

<style>
html {
  overflow-y: auto !important;
}

.v-application {
  background: #f8fafc !important;
}

/* Prevent any default page transitions that could cause layout shifts */
.page-enter-active,
.page-leave-active,
.layout-enter-active,
.layout-leave-active {
  transition: none !important;
}
</style>
