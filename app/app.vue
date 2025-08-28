<template>
  <v-app>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>

    <!-- Global Loading Overlay -->
    <v-overlay
      v-model="loading"
      class="align-center justify-center"
    >
      <v-progress-circular
        color="primary"
        indeterminate
        size="64"
      />
    </v-overlay>

    <!-- Global Snackbar -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="snackbar.timeout"
    >
      {{ snackbar.text }}

      <template v-slot:actions>
        <v-btn
          variant="text"
          @click="snackbar.show = false"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup lang="ts">
// Global state for loading and notifications
const loading = useState('loading', () => false)
const snackbar = useState('snackbar', () => ({
  show: false,
  text: '',
  color: 'success',
  timeout: 3000
}))

// Provide global methods
provide('showLoading', () => loading.value = true)
provide('hideLoading', () => loading.value = false)
provide('showMessage', (text: string, color = 'success', timeout = 3000) => {
  snackbar.value = {
    show: true,
    text,
    color,
    timeout
  }
})

// Handle route changes
const router = useRouter()
router.beforeEach(() => {
  loading.value = true
})
router.afterEach(() => {
  loading.value = false
})
</script>

<style>
html {
  overflow-y: auto !important;
}

.v-application {
  background: #f5f5f5 !important;
}

.page-enter-active,
.page-leave-active {
  transition: all 0.3s;
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
