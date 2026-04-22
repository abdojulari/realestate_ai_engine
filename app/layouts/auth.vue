<template>
  <div class="auth-layout">
    <slot />
  </div>
</template>

<script setup lang="ts">
/**
 * Minimal layout for authentication flows (login, forgot-password, reset-password, verify-2fa).
 *
 * No global Header / Footer / nav: the user is intentionally locked into the auth screen
 * until they finish the action (e.g. sign in, set a new password).
 */
</script>

<style scoped>
.auth-layout {
  min-height: 100vh;
  width: 100%;
  background: #ffffff;
  display: flex;
  flex-direction: column;
}
</style>
