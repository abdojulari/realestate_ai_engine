<template>
  <div class="header-glass sticky top-0 z-50 px-8 py-4 border-b border-slate-200 backdrop-blur-md bg-white/80">
    <div class="max-w-[1600px] mx-auto d-flex align-center">
      <div>
        <div class="flex items-center space-x-2 mb-0">
          <span class="text-[10px] uppercase tracking-[0.3em] font-bold text-primary">CMS Dashboard</span>
        </div>
        <h1 class="text-h4 font-serif text-slate-900 font-weight-bold">Content Management</h1>
      </div>
      <v-spacer />
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        @click="$emit('add-content')"
        class="add-btn-premium"
        elevation="0"
      >
        Add Content
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  'add-content': []
}>()
</script>
