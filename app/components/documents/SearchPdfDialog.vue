<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="400">
    <v-card rounded="xl" class="premium-dialog">
      <v-card-title class="dialog-title">Search PDF</v-card-title>
      <v-card-text>
        <v-text-field v-model="query" label="Search text" variant="outlined" prepend-inner-icon="mdi-magnify" @keyup.enter="search" />
        <div v-if="results.length > 0" class="mt-4">
          <div class="text-caption mb-2">Found {{ results.length }} results</div>
          <v-list density="compact">
            <v-list-item v-for="(result, index) in results" :key="index" @click="$emit('go-to-result', result)">
              <v-list-item-title>Page {{ result.page }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">Close</v-btn>
        <v-btn color="primary" @click="search">Search</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean; results: any[] }>()
const emit = defineEmits<{
  'update:modelValue': [val: boolean]
  'search': [query: string]
  'go-to-result': [result: any]
}>()

const query = ref('')

function search() { emit('search', query.value) }
</script>

<style scoped>
.premium-dialog { background: rgba(255, 255, 255, 0.98) !important; backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.8); box-shadow: 0 20px 60px rgba(31, 38, 135, 0.3) !important; }
.dialog-title { font-weight: 700; font-size: 1.25rem; border-bottom: 1px solid rgba(0, 0, 0, 0.06); padding: 20px 24px !important; }
</style>
