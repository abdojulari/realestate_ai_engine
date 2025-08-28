<template>
  <v-container class="py-8">
    <div class="d-flex align-center mb-6">
      <h1 class="text-h5">All Properties</h1>
      <v-spacer />
      <v-text-field
        v-model="q"
        prepend-inner-icon="mdi-magnify"
        placeholder="Search address or city"
        hide-details
        density="compact"
        style="max-width: 360px"
      />
    </div>

    <v-row>
      <v-col
        v-for="property in filtered"
        :key="property.id"
        cols="12"
        sm="6"
        md="4"
      >
        <PropertyCard :property="property" @click="open(property)" />
        <div class="text-right mt-1">
          <v-btn variant="text" color="primary" @click="open(property)">View Details</v-btn>
        </div>
      </v-col>
    </v-row>

    <EmptyState v-if="!loading && filtered.length === 0" title="No properties found" />

    <LoadingState v-if="loading" message="Loading properties..." />
  </v-container>
  
</template>

<script setup lang="ts">
import PropertyCard from '~/components/common/PropertyCard.vue'
import EmptyState from '~/components/common/EmptyState.vue'
import LoadingState from '~/components/common/LoadingState.vue'

const loading = ref(false)
const items = ref<any[]>([])
const q = ref('')

onMounted(async () => {
  loading.value = true
  try {
    items.value = await $fetch('/api/properties')
  } finally {
    loading.value = false
  }
})

const filtered = computed(() => {
  const term = q.value.trim().toLowerCase()
  if (!term) return items.value
  return items.value.filter((p) =>
    `${p.title} ${p.address} ${p.city}`.toLowerCase().includes(term)
  )
})

function open(p: any) {
  navigateTo(`/property/${p.id}`)
}
</script>


