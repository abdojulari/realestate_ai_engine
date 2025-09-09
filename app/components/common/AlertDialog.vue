<template>
  <v-dialog
    v-model="isOpen"
    max-width="500"
    persistent
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon 
          :color="alertType === 'success' ? 'success' : alertType === 'error' ? 'error' : 'info'" 
          class="mr-3"
          size="24"
        >
          {{ getAlertIcon() }}
        </v-icon>
        {{ alertTitle }}
      </v-card-title>
      
      <v-card-text>
        <v-alert
          :type="alertType"
          variant="tonal"
          :icon="getAlertIcon()"
          class="mb-0"
        >
          <div v-if="typeof alertMessage === 'string'" v-html="alertMessage.replace(/\n/g, '<br>')"></div>
          <div v-else>{{ alertMessage }}</div>
        </v-alert>
      </v-card-text>
      
      <v-card-actions>
        <v-spacer />
        <v-btn
          :color="alertType === 'error' ? 'error' : 'primary'"
          variant="elevated"
          @click="close"
        >
          {{ confirmText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean
  type?: 'success' | 'error' | 'info' | 'warning'
  title?: string
  message: string
  confirmText?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  title: 'Notification',
  confirmText: 'OK'
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'confirm': []
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const alertType = computed(() => props.type)
const alertTitle = computed(() => props.title)
const alertMessage = computed(() => props.message)
const confirmText = computed(() => props.confirmText)

const getAlertIcon = () => {
  switch (props.type) {
    case 'success': return 'mdi-check-circle'
    case 'error': return 'mdi-alert-circle'
    case 'warning': return 'mdi-alert'
    default: return 'mdi-information'
  }
}

const close = () => {
  emit('update:modelValue', false)
  emit('confirm')
}
</script>

<style scoped>
.v-card-title {
  background: rgba(0, 0, 0, 0.02);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}
</style>
