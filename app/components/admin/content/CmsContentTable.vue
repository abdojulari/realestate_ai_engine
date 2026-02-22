<template>
  <v-card class="premium-card">
    <div class="p-8 border-b border-slate-100 d-flex align-center">
      <div class="icon-orb mr-4">
        <v-icon color="primary" size="24">{{ currentSection?.icon || 'mdi-file-document' }}</v-icon>
      </div>
      <h2 class="text-h6 font-weight-bold">{{ currentSection?.title }}</h2>
      <v-spacer />
      <v-text-field
        :model-value="search"
        @update:model-value="$emit('update:search', $event)"
        append-inner-icon="mdi-magnify"
        label="Search"
        single-line
        hide-details
        variant="outlined"
        rounded="lg"
        class="max-width-300 premium-input"
        density="comfortable"
      />
    </div>

    <v-card-text class="p-0">
      <v-table class="premium-table">
        <thead>
          <tr>
            <th class="py-6 px-8 text-slate-400 uppercase tracking-widest text-caption font-weight-bold">Title</th>
            <th class="py-6 text-slate-400 uppercase tracking-widest text-caption font-weight-bold">Key</th>
            <th class="py-6 text-slate-400 uppercase tracking-widest text-caption font-weight-bold">Type</th>
            <th class="py-6 text-slate-400 uppercase tracking-widest text-caption font-weight-bold">Status</th>
            <th class="py-6 text-slate-400 uppercase tracking-widest text-caption font-weight-bold">Last Updated</th>
            <th class="py-6 px-8 text-right text-slate-400 uppercase tracking-widest text-caption font-weight-bold">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in items"
            :key="item.id"
            class="table-row-premium"
          >
            <td class="px-8 font-weight-bold text-slate-700">{{ item.title }}</td>
            <td>
              <code class="text-caption bg-slate-100 rounded px-2 py-1 font-mono">{{ item.key }}</code>
            </td>
            <td>
              <v-chip size="small" :color="getTypeColor(item.type)" variant="flat" class="premium-chip-small">
                {{ item.type }}
              </v-chip>
            </td>
            <td>
              <v-chip
                size="small"
                :color="item.published ? 'success' : 'warning'"
                variant="flat"
                class="premium-chip-small font-weight-bold"
              >
                {{ item.published ? 'Published' : 'Draft' }}
              </v-chip>
            </td>
            <td class="text-slate-600 text-caption">{{ formatDateTime(item.updatedAt) }}</td>
            <td class="text-right px-8">
              <v-btn icon="mdi-pencil" variant="text" size="small" color="primary" @click="$emit('edit', item)" />
              <v-btn :icon="item.published ? 'mdi-eye-off' : 'mdi-eye'" variant="text" size="small" color="info" @click="$emit('toggle-published', item)" />
              <v-btn icon="mdi-content-copy" variant="text" size="small" color="secondary" @click="$emit('duplicate', item)" />
              <v-btn icon="mdi-delete" variant="text" size="small" color="error" @click="$emit('delete', item)" />
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
defineProps<{
  items: any[]
  currentSection: any
  search: string
}>()

defineEmits<{
  edit: [item: any]
  'toggle-published': [item: any]
  duplicate: [item: any]
  delete: [item: any]
  'update:search': [value: string]
}>()

const getTypeColor = (type: string) => {
  const colors: Record<string, string> = { text: 'primary', html: 'secondary', image: 'success', testimonial: 'info' }
  return colors[type] || 'grey'
}

const formatDateTime = (date: Date | string) => new Date(date).toLocaleString()
</script>
