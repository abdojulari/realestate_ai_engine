<template>
  <div class="resources-index py-10 py-md-14">
    <v-container>
      <v-row class="mb-8">
        <v-col cols="12" md="8">
          <h1 class="text-h4 text-md-h3 font-weight-bold mb-2">Resources</h1>
          <p class="text-body-1 text-medium-emphasis">
            Helpful guides and materials. You’ll be asked for your contact details before opening each resource.
          </p>
        </v-col>
      </v-row>

      <v-row v-if="pending">
        <v-col v-for="i in 6" :key="i" cols="12" sm="6" md="4">
          <v-skeleton-loader type="card" class="rounded-lg" />
        </v-col>
      </v-row>

      <v-row v-else-if="!list.length">
        <v-col cols="12">
          <v-alert type="info" variant="tonal" rounded="lg">
            No published resources are available yet. Check back soon.
          </v-alert>
        </v-col>
      </v-row>

      <v-row v-else>
        <v-col v-for="item in list" :key="item.id" cols="12" sm="6" md="4">
          <v-card :to="`/resources/r/${item.publicSlug}`" class="resource-tile rounded-xl" elevation="0" hover>
            <v-card-text class="pa-6">
              <v-icon size="40" color="primary" class="mb-3">{{ typeIcon(item.mimeType) }}</v-icon>
              <h2 class="text-h6 font-weight-bold mb-2">{{ item.title }}</h2>
              <p v-if="item.description" class="text-body-2 text-medium-emphasis text-truncate-3">{{ item.description }}</p>
              <div class="mt-4 text-caption text-primary font-weight-bold">View resource →</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup lang="ts">
const { data: list, pending } = await useAsyncData(
  'public-resources',
  () =>
    $fetch<
      {
        id: number
        title: string
        description: string | null
        publicSlug: string
        mimeType: string
        createdAt: string
      }[]
    >('/api/public/resources'),
  { default: () => [] }
)

function typeIcon(mime: string) {
  if (mime?.includes('pdf')) return 'mdi-file-pdf-box'
  if (mime?.startsWith('image/')) return 'mdi-file-image-outline'
  return 'mdi-file-document-outline'
}

useHead({
  title: 'Resources',
})
</script>

<style scoped>
.resources-index {
  min-height: 60vh;
  background: linear-gradient(180deg, #fafafa 0%, #fff 40%);
}

.resource-tile {
  border: 1px solid rgba(0, 0, 0, 0.06);
  height: 100%;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.resource-tile:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08) !important;
}

.text-truncate-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
