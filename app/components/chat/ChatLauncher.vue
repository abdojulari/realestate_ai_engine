<template>
  <div v-if="isVisible" class="chat-launcher">
    <!-- Desktop Button -->
    <button class="launcher-btn desktop" @click="dialog = true">
      <span class="launcher-icon">
        <v-icon size="20">mdi-message-text-outline</v-icon>
      </span>
      <span class="launcher-text">Ask Concierge</span>
    </button>

    <!-- Mobile FAB -->
    <button class="launcher-btn mobile" @click="dialog = true">
      <v-icon size="24">mdi-message-text-outline</v-icon>
    </button>

    <!-- Dialog -->
    <v-dialog
      v-model="dialog"
      :max-width="smAndDown ? '100%' : '520'"
      :fullscreen="smAndDown"
      content-class="chat-dialog"
      transition="dialog-bottom-transition"
    >
      <div class="dialog-wrapper">
        <div class="dialog-header">
          <span class="dialog-title">AO Concierge</span>
          <button class="close-btn" @click="dialog = false">
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </div>
        <div class="dialog-body">
          <ChatWidget compact />
        </div>
      </div>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDisplay } from 'vuetify'
import { useRoute } from 'vue-router'
import ChatWidget from '~/components/chat/ChatWidget.vue'

const dialog = ref(false)
const { smAndDown } = useDisplay()
const route = useRoute()

const isVisible = computed(() => {
  const path = route.path || ''
  if (path.startsWith('/auth')) return false
  if (path.startsWith('/admin')) return false
  return true
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700&display=swap');

.chat-launcher {
  position: fixed;
  right: 24px;
  bottom: 28px;
  z-index: 1200;
  font-family: 'Inter', system-ui, sans-serif;
}

/* ===== Launcher Button ===== */
.launcher-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: none;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.launcher-btn.desktop {
  padding: 14px 22px;
  background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
  color: #ffffff;
  border-radius: 50px;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  box-shadow: 
    0 8px 24px rgba(15, 23, 42, 0.25),
    0 2px 8px rgba(15, 23, 42, 0.15);
}

.launcher-btn.desktop:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 12px 32px rgba(15, 23, 42, 0.3),
    0 4px 12px rgba(15, 23, 42, 0.2);
}

.launcher-btn.mobile {
  display: none;
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
  color: #ffffff;
  border-radius: 50%;
  box-shadow: 
    0 8px 24px rgba(15, 23, 42, 0.25),
    0 2px 8px rgba(15, 23, 42, 0.15);
}

.launcher-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 50%;
}

.launcher-text {
  white-space: nowrap;
}

/* ===== Dialog ===== */
.dialog-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 700px;
  background: #ffffff;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: #ffffff;
  border-bottom: 1px solid #f1f5f9;
  flex-shrink: 0;
}

.dialog-title {
  font-size: 1rem;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: -0.01em;
}

.close-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  border: none;
  border-radius: 10px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.dialog-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dialog-body :deep(.chat-widget) {
  flex: 1;
  max-height: none;
  min-height: 0;
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .chat-launcher {
    right: 20px;
    bottom: 24px;
  }

  .launcher-btn.desktop {
    display: none;
  }

  .launcher-btn.mobile {
    display: flex;
  }

  .dialog-wrapper {
    max-height: 100%;
    border-radius: 0;
  }

  .dialog-header {
    padding: 16px 20px;
  }
}
</style>

<style>
/* Global dialog overrides */
.chat-dialog {
  border-radius: 20px !important;
  overflow: hidden !important;
}

.chat-dialog .v-overlay__content {
  max-height: 90vh !important;
}

@media (max-width: 768px) {
  .chat-dialog {
    border-radius: 0 !important;
  }

  .chat-dialog .v-overlay__content {
    max-height: 100vh !important;
    height: 100% !important;
  }
}
</style>
