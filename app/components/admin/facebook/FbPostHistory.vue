<template>
  <v-row>
    <v-col cols="12">
      <v-card class="section-card" elevation="0">
        <v-card-title class="pa-6 d-flex align-center">
          <v-icon class="mr-2">mdi-history</v-icon>
          <span class="display-serif text-h5">Post History</span>
          <v-spacer />
          <v-btn v-if="posts.length" variant="tonal" color="error" size="small" prepend-icon="mdi-delete-sweep" class="mr-3" @click="showClear = true">
            Clear All
          </v-btn>
          <v-select :model-value="postFilter" :items="['all','posted','scheduled','draft','failed']" variant="outlined" density="compact" style="max-width: 150px;" @update:model-value="$emit('update:postFilter', $event)" />
        </v-card-title>
        <v-divider class="opacity-10" />
        <v-card-text v-if="!posts.length" class="pa-8 text-center">
          <v-icon size="48" class="mb-2 text-disabled">mdi-post-outline</v-icon>
          <div class="text-body-2 text-medium-emphasis">No posts yet</div>
        </v-card-text>
        <v-list v-else bg-color="transparent">
          <v-list-item v-for="post in posts" :key="post.id" class="px-6 py-4 list-item-hover">
            <template #prepend>
              <v-avatar size="36" :color="statusColor(post.status)" variant="tonal" class="mr-3">
                <v-icon size="18">{{ statusIcon(post.status) }}</v-icon>
              </v-avatar>
            </template>
            <v-list-item-title class="font-weight-bold text-body-2">
              {{ post.content?.substring(0, 100) }}{{ (post.content?.length || 0) > 100 ? '...' : '' }}
            </v-list-item-title>
            <v-list-item-subtitle class="mt-1">
              <v-chip :color="statusColor(post.status)" size="x-small" class="mr-2 text-uppercase">{{ post.status }}</v-chip>
              {{ fmtDateTime(post.postedAt || post.createdAt) }}
              <span v-if="post.errorMessage" class="text-error ml-2 text-caption">{{ post.errorMessage }}</span>
            </v-list-item-subtitle>
            <template #append>
              <v-btn icon size="small" variant="text" color="error" @click="$emit('delete', post.id)">
                <v-icon size="18">mdi-delete-outline</v-icon>
              </v-btn>
            </template>
          </v-list-item>
        </v-list>
      </v-card>
    </v-col>
  </v-row>

  <v-dialog v-model="showClear" max-width="400">
    <v-card class="rounded-xl">
      <v-card-title class="pa-6">Clear Post History?</v-card-title>
      <v-card-text class="px-6 pb-2">This will permanently delete all post records. This cannot be undone.</v-card-text>
      <v-card-actions class="pa-6 pt-2">
        <v-spacer />
        <v-btn variant="text" @click="showClear = false">Cancel</v-btn>
        <v-btn color="error" variant="flat" @click="handleClear" :loading="clearing">Clear All</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  posts: any[]
  postFilter: string
  clearing: boolean
}>()

const emit = defineEmits<{
  'update:postFilter': [value: string]
  delete: [id: number]
  'clear-all': []
}>()

const showClear = ref(false)

watch(() => props.clearing, (val, prev) => {
  if (prev && !val) showClear.value = false
})

function handleClear() {
  emit('clear-all')
}

const statusColor = (s: string) => ({ posted: 'success', scheduled: 'info', draft: 'warning', failed: 'error' } as any)[s] || 'grey'
const statusIcon = (s: string) => ({ posted: 'mdi-check', scheduled: 'mdi-clock', draft: 'mdi-pencil', failed: 'mdi-alert' } as any)[s] || 'mdi-post'
const fmtDateTime = (d: string) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
</script>

<style scoped>
.list-item-hover:hover { background: #f9f9f9; }
</style>
