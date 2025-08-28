<template>
  <div class="error-state" :class="{ centered }">
    <v-icon
      :icon="icon"
      :size="iconSize"
      :color="color"
      class="mb-4"
    />
    
    <div :class="titleClass" class="mb-2">
      {{ title }}
    </div>

    <div :class="messageClass" class="mb-6" v-html="message" />

    <div v-if="$slots.actions" class="actions">
      <slot name="actions" />
    </div>
    <div v-else>
      <v-btn
        v-if="showRetry"
        color="primary"
        class="mr-2"
        @click="$emit('retry')"
      >
        {{ retryText }}
      </v-btn>

      <v-btn
        v-if="showHome"
        variant="text"
        to="/"
      >
        {{ homeText }}
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  title: {
    type: String,
    default: 'Something went wrong'
  },
  message: {
    type: String,
    default: 'An error occurred while processing your request. Please try again.'
  },
  icon: {
    type: String,
    default: 'mdi-alert-circle'
  },
  iconSize: {
    type: [Number, String],
    default: 64
  },
  color: {
    type: String,
    default: 'error'
  },
  titleClass: {
    type: String,
    default: 'text-h5'
  },
  messageClass: {
    type: String,
    default: 'text-body-1'
  },
  showRetry: {
    type: Boolean,
    default: true
  },
  retryText: {
    type: String,
    default: 'Try Again'
  },
  showHome: {
    type: Boolean,
    default: true
  },
  homeText: {
    type: String,
    default: 'Go Home'
  },
  centered: {
    type: Boolean,
    default: true
  }
})

defineEmits(['retry'])
</script>

<style scoped>
.error-state {
  padding: 24px;
  text-align: center;
}

.error-state.centered {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}
</style>
