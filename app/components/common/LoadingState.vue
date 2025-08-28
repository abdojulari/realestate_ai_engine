<template>
  <div class="loading-state" :class="{ overlay: overlay }">
    <div class="loading-content">
      <v-progress-circular
        :size="size"
        :width="width"
        :color="color"
        indeterminate
      />
      <div v-if="message" class="loading-message" :class="messageClass">
        {{ message }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  message: {
    type: String,
    default: ''
  },
  messageClass: {
    type: String,
    default: 'text-subtitle-1'
  },
  size: {
    type: [Number, String],
    default: 48
  },
  width: {
    type: [Number, String],
    default: 4
  },
  color: {
    type: String,
    default: 'primary'
  },
  overlay: {
    type: Boolean,
    default: false
  }
})
</script>

<style scoped>
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.loading-state.overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  z-index: 100;
  min-height: 0;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.loading-message {
  text-align: center;
  max-width: 300px;
}
</style>
