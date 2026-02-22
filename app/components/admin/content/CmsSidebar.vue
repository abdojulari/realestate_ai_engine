<template>
  <v-card class="premium-card sticky top-24">
    <div class="p-6 border-b border-slate-100">
      <h3 class="text-subtitle-2 font-weight-bold text-slate-400 uppercase tracking-widest">Content Sections</h3>
    </div>
    <v-list nav class="p-2">
      <v-list-item
        v-for="section in sections"
        :key="section.id"
        :value="section"
        :active="selectedSection === section.id"
        @click="$emit('select-section', section.id)"
        class="rounded-lg mb-1 premium-nav-item"
        :class="{ 'active-nav-item': selectedSection === section.id }"
      >
        <template v-slot:prepend>
          <v-icon :icon="section.icon" class="mr-3" />
        </template>
        <v-list-item-title class="font-weight-bold">{{ section.title }}</v-list-item-title>
        <template v-slot:append>
          <v-chip
            size="small"
            :color="section.hasUnpublished ? 'warning' : 'success'"
            variant="flat"
            class="premium-chip-small"
          >
            {{ section.items }}
          </v-chip>
        </template>
      </v-list-item>
    </v-list>
  </v-card>
</template>

<script setup lang="ts">
defineProps<{
  sections: any[]
  selectedSection: string | null
}>()

defineEmits<{
  'select-section': [id: string]
}>()
</script>
