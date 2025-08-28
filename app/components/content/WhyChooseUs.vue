<template>
  <section class="py-12 bg-grey-lighten-4">
    <v-container>
      <h2 class="text-h4 text-center mb-8">{{ sectionTitle }}</h2>

      <v-row v-if="cards.length">
        <v-col
          v-for="card in cards"
          :key="card.title + card.icon"
          cols="12"
          sm="6"
          md="3"
        >
          <v-card class="feature-card text-center pa-4" flat>
            <v-icon :icon="card.icon" size="48" color="primary" class="mb-4" />
            <h3 class="text-h6 mb-2">{{ card.title }}</h3>
            <p class="text-body-2">{{ card.description }}</p>
          </v-card>
        </v-col>
      </v-row>

      <div v-else class="text-center text-grey">
        No items yet. Add “Why Choose Us Item” entries in Admin → Content → Home Page.
      </div>
    </v-container>
  </section>
</template>

<script setup lang="ts">
const sectionTitle = ref<string>('Why Choose Us')
const cards = ref<Array<{ icon: string, title: string, description: string }>>([])

onMounted(async () => {
  try {
    const page = await $fetch('/api/content/page/home')
    const items: any[] = page?.items || []
    const why = items.find(i => i.key === 'why-choose-us')
    const whyItems = items.filter(i => i.key === 'why-choose-us-item' || i.key?.startsWith('why-choose-us-item'))
    if (why?.title) sectionTitle.value = why.title
    if (whyItems?.length) {
      cards.value = whyItems.map(i => ({
        icon: i.metadata?.icon || 'mdi-check',
        title: i.title,
        description: i.content
      }))
    }
  } catch (e) {
    console.error('Failed to load home content:', e)
  }
})
</script>

<style scoped>
.feature-card {
  height: 100%;
  transition: transform 0.2s;
}
.feature-card:hover { transform: translateY(-4px); }
</style>


