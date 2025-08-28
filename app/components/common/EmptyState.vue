<template>
  <div class="empty-state" :class="{ centered }">
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
    <div v-else-if="showAction">
      <v-btn
        :color="actionColor"
        :to="actionRoute"
        @click="$emit('action')"
      >
        {{ actionText }}
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  title: {
    type: String,
    default: 'No Results Found'
  },
  message: {
    type: String,
    default: 'We couldn\'t find any items matching your criteria.'
  },
  icon: {
    type: String,
    default: 'mdi-inbox'
  },
  iconSize: {
    type: [Number, String],
    default: 64
  },
  color: {
    type: String,
    default: 'grey'
  },
  titleClass: {
    type: String,
    default: 'text-h5'
  },
  messageClass: {
    type: String,
    default: 'text-body-1'
  },
  showAction: {
    type: Boolean,
    default: false
  },
  actionText: {
    type: String,
    default: 'Get Started'
  },
  actionColor: {
    type: String,
    default: 'primary'
  },
  actionRoute: {
    type: [String, Object],
    default: ''
  },
  centered: {
    type: Boolean,
    default: true
  }
})

defineEmits(['action'])
</script>

<style scoped>
.empty-state {
  padding: 24px;
  text-align: center;
}

.empty-state.centered {
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
