<template>
  <div class="chat-widget" :class="{ compact }">
    <!-- Header -->
    <div class="chat-header">
      <div class="header-left">
        <div class="avatar-ring">
          <v-icon color="white" size="22">mdi-home-city-outline</v-icon>
        </div>
        <div class="header-info">
          <div class="header-title">AO Concierge</div>
          <div class="header-subtitle">Premium real estate assistant</div>
        </div>
      </div>
      <div class="status-indicator">
        <span class="status-dot"></span>
        <span class="status-text">Online</span>
      </div>
    </div>

    <!-- Lead Capture Form -->
    <Transition name="slide-fade">
      <div v-if="showLeadForm" class="lead-form-overlay">
        <div class="lead-form">
          <button class="lead-form-close" @click="showLeadForm = false">
            <v-icon size="20">mdi-close</v-icon>
          </button>
          
          <div class="lead-form-header">
            <div class="lead-form-icon">
              <v-icon size="24" color="primary">mdi-account-tie-outline</v-icon>
            </div>
            <h3 class="lead-form-title">Talk to a Real Person</h3>
            <p class="lead-form-subtitle">Leave your details and we'll reach out shortly.</p>
          </div>

          <form @submit.prevent="submitLead" class="lead-form-fields">
            <div class="form-group">
              <label class="form-label">Name *</label>
              <input
                v-model="leadForm.name"
                type="text"
                class="form-input"
                placeholder="Your full name"
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label">Email *</label>
              <input
                v-model="leadForm.email"
                type="email"
                class="form-input"
                placeholder="you@example.com"
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label">Phone (optional)</label>
              <input
                v-model="leadForm.phone"
                type="tel"
                class="form-input"
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Message (optional)</label>
              <textarea
                v-model="leadForm.message"
                class="form-textarea"
                placeholder="How can we help you?"
                rows="2"
              ></textarea>
            </div>

            <div class="form-consent">
              <v-icon size="14" color="grey">mdi-shield-check-outline</v-icon>
              <span>Your info may be used for follow-ups and marketing. You can opt out anytime.</span>
            </div>

            <button
              type="submit"
              class="submit-btn"
              :disabled="leadSubmitting || !leadForm.name || !leadForm.email"
            >
              <v-progress-circular v-if="leadSubmitting" indeterminate size="18" width="2" color="white" />
              <template v-else>
                <v-icon size="18">mdi-send</v-icon>
                Send Request
              </template>
            </button>

            <Transition name="fade">
              <div v-if="leadMessage" :class="['form-message', leadMessageType]">
                {{ leadMessage }}
              </div>
            </Transition>
          </form>
        </div>
      </div>
    </Transition>

    <!-- Messages -->
    <div class="chat-body" ref="chatBody">
      <div v-if="messages.length === 0" class="empty-state">
        <div class="empty-icon-wrapper">
          <v-icon size="32" color="primary">mdi-chat-processing-outline</v-icon>
        </div>
        <div class="empty-title">How can I help you today?</div>
        <div class="empty-subtitle">
          Ask about buying, selling, market insights, or specific property listings.
        </div>
        <div class="starter-chips">
          <button
            v-for="(suggestion, i) in suggestions"
            :key="i"
            class="suggestion-btn"
            @click="applyFollowUp(suggestion)"
          >
            <v-icon size="16" class="suggestion-icon">mdi-arrow-top-right</v-icon>
            {{ suggestion }}
          </button>
        </div>
        
        <!-- Talk to Agent Button in Empty State -->
        <button class="agent-btn-secondary" @click="showLeadForm = true">
          <v-icon size="18">mdi-account-tie-outline</v-icon>
          Talk to a Real Person
        </button>
      </div>

      <div v-for="(m, index) in messages" :key="index" class="message-row" :class="m.role">
        <div class="message-bubble">
          <div v-if="m.role === 'assistant'" class="message-label">
            <v-icon size="14">mdi-robot-happy-outline</v-icon>
            <span>CONCIERGE</span>
          </div>
          <div class="message-content">{{ m.content }}</div>
          <div v-if="m.cta" class="message-cta">
            <v-icon size="16">mdi-shield-check-outline</v-icon>
            <span>{{ m.cta }}</span>
          </div>

          <div v-if="m.followUpQuestions?.length" class="follow-up">
            <div class="follow-up-label">Suggested replies</div>
            <div class="follow-up-list">
              <button
                v-for="(q, i) in m.followUpQuestions"
                :key="`${index}-${i}`"
                class="follow-up-btn"
                @click="applyFollowUp(q)"
              >
                <v-icon size="14">mdi-lightbulb-on-outline</v-icon>
                {{ q }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="loading" class="message-row assistant">
        <div class="message-bubble">
          <div class="message-label">
            <v-icon size="14">mdi-robot-happy-outline</v-icon>
            <span>CONCIERGE</span>
          </div>
          <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Input -->
    <div class="chat-footer">
      <div class="input-row">
        <div class="input-wrapper">
          <textarea
            v-model="draft"
            class="chat-input"
            placeholder="Type your question..."
            rows="1"
            :disabled="loading"
            @keydown.enter.exact.prevent="sendMessage"
            @input="autoResize"
            ref="inputRef"
          ></textarea>
          <button
            class="send-btn"
            :disabled="!draft.trim() || loading"
            @click="sendMessage"
          >
            <v-icon v-if="!loading" size="20">mdi-send-variant</v-icon>
            <v-progress-circular v-else indeterminate size="18" width="2" color="white" />
          </button>
        </div>
        <button class="agent-btn" @click="showLeadForm = true" title="Talk to a real person">
          <v-icon size="20">mdi-account-tie-outline</v-icon>
        </button>
      </div>
      <div class="input-hint">Press Enter to send</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick, onMounted } from 'vue'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  cta?: string
  followUpQuestions?: string[]
}

const props = defineProps<{ compact?: boolean }>()
const compact = props.compact ?? false

const draft = ref('')
const loading = ref(false)
const messages = ref<ChatMessage[]>([])
const chatBody = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLTextAreaElement | null>(null)

// Lead form state
const showLeadForm = ref(false)
const leadSubmitting = ref(false)
const leadMessage = ref('')
const leadMessageType = ref<'success' | 'error'>('success')
const leadForm = reactive({
  name: '',
  email: '',
  phone: '',
  message: ''
})

const suggestions = [
  'I am looking to get a 3-bedroom home in a family-oriented community in the city.',
  'I want to understand the process of selling a property.',
  'I am already pre-approved for a mortgage.'
]

const sendMessage = async () => {
  const text = draft.value.trim()
  if (!text || loading.value) return

  messages.value.push({ role: 'user', content: text })
  draft.value = ''
  resetInput()
  loading.value = true
  await scrollToBottom()

  try {
    const response = await $fetch<{
      answer: string
      cta?: string
      followUpQuestions?: string[]
    }>('/api/chat', {
      method: 'POST',
      body: {
        message: text,
        history: messages.value.slice(-8).map(m => ({
          role: m.role,
          content: m.content
        }))
      }
    })

    messages.value.push({
      role: 'assistant',
      content: response.answer || 'I can help with that. Could you share a few more details?',
      cta: response.cta || undefined,
      followUpQuestions: response.followUpQuestions || []
    })
  } catch (error) {
    messages.value.push({
      role: 'assistant',
      content: 'Something went wrong while fetching the answer. Please try again.'
    })
  } finally {
    loading.value = false
    await scrollToBottom()
  }
}

const submitLead = async () => {
  if (!leadForm.name || !leadForm.email || leadSubmitting.value) return

  leadSubmitting.value = true
  leadMessage.value = ''

  try {
    const response = await $fetch<{ success: boolean; message: string }>('/api/chat/lead', {
      method: 'POST',
      body: {
        name: leadForm.name,
        email: leadForm.email,
        phone: leadForm.phone || undefined,
        message: leadForm.message || undefined,
        conversationLog: messages.value.map(m => ({
          role: m.role,
          content: m.content
        }))
      }
    })

    leadMessageType.value = 'success'
    leadMessage.value = response.message || 'Thank you! An agent will contact you soon.'

    // Clear form after success
    setTimeout(() => {
      leadForm.name = ''
      leadForm.email = ''
      leadForm.phone = ''
      leadForm.message = ''
      showLeadForm.value = false
      leadMessage.value = ''
    }, 3000)
  } catch (error: any) {
    leadMessageType.value = 'error'
    leadMessage.value = error.data?.message || 'Something went wrong. Please try again.'
  } finally {
    leadSubmitting.value = false
  }
}

const applyFollowUp = (question: string) => {
  draft.value = question
  nextTick(() => {
    inputRef.value?.focus()
  })
}

const scrollToBottom = async () => {
  await nextTick()
  if (chatBody.value) {
    chatBody.value.scrollTop = chatBody.value.scrollHeight
  }
}

const autoResize = () => {
  if (inputRef.value) {
    inputRef.value.style.height = 'auto'
    inputRef.value.style.height = Math.min(inputRef.value.scrollHeight, 120) + 'px'
  }
}

const resetInput = () => {
  if (inputRef.value) {
    inputRef.value.style.height = 'auto'
  }
}

onMounted(() => {
  scrollToBottom()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

.chat-widget {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 500px;
  max-height: 680px;
  background: #ffffff;
  font-family: 'Inter', system-ui, sans-serif;
  position: relative;
}

.chat-widget.compact {
  max-height: 560px;
}

/* ===== Header ===== */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
  color: #ffffff;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.avatar-ring {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255, 255, 255, 0.25);
}

.header-info {
  display: flex;
  flex-direction: column;
}

.header-title {
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.header-subtitle {
  font-size: 0.75rem;
  opacity: 0.7;
  font-weight: 500;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.1);
  padding: 6px 12px;
  border-radius: 20px;
}

.status-dot {
  width: 8px;
  height: 8px;
  background: #22c55e;
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

.status-text {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ===== Lead Form Overlay ===== */
.lead-form-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 20px;
  overflow-y: auto;
}

.lead-form {
  background: #ffffff;
  border-radius: 20px;
  padding: 24px;
  width: 100%;
  max-width: 360px;
  position: relative;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  margin: auto 0;
}

.lead-form-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  border: none;
  border-radius: 8px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.lead-form-close:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.lead-form-header {
  text-align: center;
  margin-bottom: 18px;
}

.lead-form-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
}

.lead-form-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 4px;
}

.lead-form-subtitle {
  font-size: 0.8rem;
  color: #64748b;
  margin: 0;
}

.lead-form-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
}

.form-input,
.form-textarea {
  padding: 10px 12px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 0.9rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-input:focus,
.form-textarea:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  resize: none;
}

.form-consent {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 0.65rem;
  color: #94a3b8;
  line-height: 1.4;
}

.submit-btn {
  margin-top: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: #ffffff;
  border: none;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-message {
  text-align: center;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
}

.form-message.success {
  background: rgba(34, 197, 94, 0.1);
  color: #166534;
}

.form-message.error {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

/* ===== Chat Body ===== */
.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: #fafbfc;
}

/* ===== Empty State ===== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 20px;
  height: 100%;
}

.empty-icon-wrapper {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.empty-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 8px;
}

.empty-subtitle {
  font-size: 0.9rem;
  color: #64748b;
  max-width: 320px;
  line-height: 1.5;
}

.starter-chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 24px;
}

.suggestion-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  font-size: 0.85rem;
  font-weight: 500;
  color: #334155;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 24px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.suggestion-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  transform: translateY(-1px);
}

.suggestion-icon {
  color: #64748b;
}

.agent-btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
  padding: 12px 20px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #1e3a5f;
  background: transparent;
  border: 2px solid #1e3a5f;
  border-radius: 24px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.agent-btn-secondary:hover {
  background: #1e3a5f;
  color: #ffffff;
}

/* ===== Messages ===== */
.message-row {
  display: flex;
  margin-bottom: 16px;
}

.message-row.user {
  justify-content: flex-end;
}

.message-row.assistant {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 85%;
  border-radius: 20px;
  padding: 14px 18px;
}

.message-row.user .message-bubble {
  background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
  color: #ffffff;
  border-bottom-right-radius: 6px;
}

.message-row.assistant .message-bubble {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border-bottom-left-radius: 6px;
}

.message-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #94a3b8;
  margin-bottom: 8px;
}

.message-content {
  font-size: 0.95rem;
  line-height: 1.6;
  color: inherit;
}

.message-cta {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 14px;
  padding: 12px 14px;
  background: rgba(34, 197, 94, 0.08);
  border-radius: 12px;
  font-size: 0.8rem;
  color: #166534;
  line-height: 1.5;
}

.message-row.user .message-cta {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
}

/* ===== Follow-up ===== */
.follow-up {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid #f1f5f9;
}

.follow-up-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
  margin-bottom: 10px;
}

.follow-up-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.follow-up-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 0.8rem;
  font-weight: 500;
  color: #475569;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.follow-up-btn:hover {
  background: #f1f5f9;
  color: #1e293b;
  border-color: #cbd5e1;
}

/* ===== Typing Indicator ===== */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 0;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: #94a3b8;
  border-radius: 50%;
  animation: bounce 1.4s ease-in-out infinite;
}

.typing-indicator span:nth-child(1) { animation-delay: 0s; }
.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-6px); }
}

/* ===== Footer / Input ===== */
.chat-footer {
  padding: 16px 20px 20px;
  background: #ffffff;
  border-top: 1px solid #eef2f7;
  flex-shrink: 0;
}

.input-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.input-wrapper {
  flex: 1;
  display: flex;
  align-items: flex-end;
  gap: 12px;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 16px;
  padding: 12px 14px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.input-wrapper:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.chat-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 0.95rem;
  font-family: inherit;
  line-height: 1.5;
  resize: none;
  outline: none;
  min-height: 24px;
  max-height: 120px;
  color: #1e293b;
}

.chat-input::placeholder {
  color: #94a3b8;
}

.chat-input:disabled {
  opacity: 0.6;
}

.send-btn {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: #ffffff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.agent-btn {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.agent-btn:hover {
  background: #1e3a5f;
  border-color: #1e3a5f;
  color: #ffffff;
}

.input-hint {
  font-size: 0.7rem;
  color: #94a3b8;
  margin-top: 10px;
  text-align: center;
}

/* ===== Transitions ===== */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.2s ease-in;
}

.slide-fade-enter-from {
  opacity: 0;
}

.slide-fade-leave-to {
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ===== Responsive ===== */
@media (max-width: 600px) {
  .chat-header {
    padding: 16px 18px;
  }

  .chat-body {
    padding: 18px;
  }

  .chat-footer {
    padding: 14px 16px 18px;
  }

  .message-bubble {
    max-width: 90%;
  }

  .starter-chips {
    flex-direction: column;
    align-items: stretch;
  }

  .suggestion-btn {
    justify-content: center;
  }

  .lead-form {
    padding: 20px 16px;
  }

  .lead-form-overlay {
    padding: 16px;
  }

  .lead-form-header {
    margin-bottom: 14px;
  }

  .lead-form-icon {
    width: 42px;
    height: 42px;
    margin-bottom: 10px;
  }

  .lead-form-fields {
    gap: 10px;
  }
}
</style>
