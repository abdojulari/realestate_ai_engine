<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="600" scrollable>
    <v-card rounded="xl" class="premium-dialog">
      <v-card-title class="d-flex align-center dialog-title">
        <v-icon icon="mdi-email-send-outline" class="mr-2" />
        Email Document
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" @click="$emit('update:modelValue', false)" />
      </v-card-title>
      <v-card-text>
        <p class="text-caption text-grey mb-4">
          Send <strong>{{ doc?.originalName }}</strong> as an attachment to a CRM contact.
        </p>

        <!-- Contact Search -->
        <v-text-field
          v-model="searchQuery" label="Search contacts by name or email"
          variant="outlined" density="compact" prepend-inner-icon="mdi-magnify" clearable class="mb-2"
          @update:model-value="debouncedSearch"
        />

        <div v-if="searchLoading" class="text-center py-4">
          <v-progress-circular indeterminate size="24" color="primary" />
          <span class="ml-2 text-caption">Searching contacts...</span>
        </div>
        <v-list v-else-if="contacts.length > 0" density="compact" class="contact-results-list mb-4" max-height="240" style="overflow-y: auto;">
          <v-list-item
            v-for="c in contacts" :key="c.email"
            :class="{ 'selected-contact': selected?.email === c.email }"
            @click="selectContact(c)" class="contact-item" rounded="lg"
          >
            <template #prepend>
              <v-avatar size="36" :color="selected?.email === c.email ? 'primary' : 'grey-lighten-3'" class="mr-3">
                <v-icon :color="selected?.email === c.email ? 'white' : 'grey'" icon="mdi-account" size="20" />
              </v-avatar>
            </template>
            <v-list-item-title class="font-weight-medium">{{ c.name || c.email }}</v-list-item-title>
            <v-list-item-subtitle>
              {{ c.email }}
              <v-chip size="x-small" variant="tonal" class="ml-2">{{ c.source }}</v-chip>
            </v-list-item-subtitle>
            <template #append>
              <v-icon v-if="selected?.email === c.email" icon="mdi-check-circle" color="primary" />
            </template>
          </v-list-item>
        </v-list>
        <div v-else-if="searchQuery && !searchLoading" class="text-caption text-grey text-center py-3">
          No contacts found. You can enter an email manually below.
        </div>

        <v-divider class="my-3" />

        <v-text-field v-model="recipient" label="Recipient email *" variant="outlined" density="compact" prepend-inner-icon="mdi-email-outline"
          :rules="[v => !!v || 'Email is required', v => /.+@.+\..+/.test(v) || 'Must be a valid email']" class="mb-2" />
        <v-text-field v-model="recipientName" label="Recipient name (optional)" variant="outlined" density="compact" prepend-inner-icon="mdi-account-outline" class="mb-2" />
        <v-text-field v-model="subject" label="Subject (optional)" variant="outlined" density="compact" prepend-inner-icon="mdi-format-title" :placeholder="`Document: ${doc?.originalName || ''}`" class="mb-2" />
        <v-textarea v-model="message" label="Message (optional)" variant="outlined" rows="3" placeholder="Please find the attached document for your review." />
      </v-card-text>
      <v-card-actions class="pa-6 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)" :disabled="sending">Cancel</v-btn>
        <v-btn color="primary" variant="flat" prepend-icon="mdi-send" @click="send" :loading="sending" :disabled="!recipient || !/.+@.+\..+/.test(recipient)">
          Send Email
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: boolean; doc: any }>()
const emit = defineEmits<{
  'update:modelValue': [val: boolean]
  'sent': []
}>()

const searchQuery = ref('')
const searchLoading = ref(false)
const contacts = ref<Array<{ email: string; name: string; source: string }>>([])
const selected = ref<{ email: string; name: string; source: string } | null>(null)
const recipient = ref('')
const recipientName = ref('')
const subject = ref('')
const message = ref('')
const sending = ref(false)
let timeout: ReturnType<typeof setTimeout> | null = null

const getAuthHeaders = (): Record<string, string> => {
  try { const t = localStorage.getItem('token'); return t ? { Authorization: `Bearer ${t}` } : {} } catch { return {} }
}

watch(() => props.modelValue, (val) => {
  if (val) {
    searchQuery.value = ''; contacts.value = []; selected.value = null
    recipient.value = ''; recipientName.value = ''; subject.value = ''; message.value = ''
    fetchContacts('')
  }
})

function debouncedSearch(val: string | null) {
  if (timeout) clearTimeout(timeout)
  timeout = setTimeout(() => fetchContacts(val || ''), 300)
}

async function fetchContacts(q: string) {
  searchLoading.value = true
  try {
    const res: any = await $fetch('/api/admin/contacts/search', { headers: getAuthHeaders(), params: { q, limit: 20 } })
    contacts.value = res.contacts || []
  } catch { contacts.value = [] }
  finally { searchLoading.value = false }
}

function selectContact(c: { email: string; name: string; source: string }) {
  selected.value = c; recipient.value = c.email; recipientName.value = c.name
}

async function send() {
  if (!props.doc || !recipient.value) return
  sending.value = true
  try {
    const res: any = await $fetch(`/api/admin/documents/${props.doc.id}/email`, {
      method: 'POST', headers: getAuthHeaders(),
      body: { recipientEmail: recipient.value, recipientName: recipientName.value, subject: subject.value, message: message.value },
    })
    if (res.success) { emit('sent'); emit('update:modelValue', false) }
  } catch (e: any) {
    // Let parent handle snackbar via sent event absence
    throw e
  } finally { sending.value = false }
}
</script>

<style scoped>
.premium-dialog { background: rgba(255, 255, 255, 0.98) !important; backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.8); box-shadow: 0 20px 60px rgba(31, 38, 135, 0.3) !important; }
.dialog-title { font-weight: 700; font-size: 1.25rem; border-bottom: 1px solid rgba(0, 0, 0, 0.06); padding: 20px 24px !important; }
.contact-results-list { border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 12px; background: rgba(249, 250, 251, 0.6); }
.contact-item { transition: all 0.2s ease; margin: 2px 4px; }
.contact-item:hover { background: rgba(25, 118, 210, 0.06) !important; }
.selected-contact { background: rgba(25, 118, 210, 0.1) !important; border-left: 3px solid rgb(var(--v-theme-primary)); }
</style>
