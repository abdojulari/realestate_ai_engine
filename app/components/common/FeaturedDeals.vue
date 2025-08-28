<template>
  <div class="featured-deals">
    <div class="d-flex align-center mb-4">
      <h2 class="text-h5">Featured Deals</h2>
      <v-spacer />
      <div>
        <v-btn icon="mdi-chevron-left" variant="text" @click="prev" />
        <v-btn icon="mdi-chevron-right" variant="text" @click="next" />
      </div>
    </div>

    <div class="viewport">
      <div class="track transition-fast" :style="trackStyle">
        <div v-for="(chunk, idx) in chunks" :key="idx" class="slide d-flex flex-wrap">
          <div v-for="property in chunk" :key="property.id" class="pa-2 col-25">
            <PropertyCard :property="property" @click="$emit('select', property)" />
          </div>
        </div>
      </div>
    </div>

    <div class="d-flex justify-center mt-2">
      <v-btn
        v-for="i in totalSlides"
        :key="i"
        icon
        size="x-small"
        :color="i - 1 === currentSlide ? 'primary' : 'grey'"
        variant="text"
        @click="go(i - 1)"
      >
        <v-icon size="10">mdi-circle</v-icon>
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import PropertyCard from './PropertyCard.vue'

interface Property {
  id: number | string
  title: string
  price: number
  status: string
  type: string
  beds: number
  baths: number
  sqft: number
  address: string
  images: string[]
  isSaved?: boolean
}

const props = defineProps<{
  items: Property[]
  perSlide?: number
}>()

const perSlide = computed(() => props.perSlide ?? 4)

const chunks = computed(() => {
  const result: Property[][] = []
  const list = props.items.slice(0, 10)
  for (let i = 0; i < list.length; i += perSlide.value) {
    result.push(list.slice(i, i + perSlide.value))
  }
  return result
})

const totalSlides = computed(() => Math.max(1, chunks.value.length))
const currentSlide = ref(0)

function prev() { currentSlide.value = (currentSlide.value - 1 + totalSlides.value) % totalSlides.value }
function next() { currentSlide.value = (currentSlide.value + 1) % totalSlides.value }
function go(i: number) { currentSlide.value = Math.min(Math.max(0, i), totalSlides.value - 1) }

const trackStyle = computed(() => ({
  transform: `translateX(-${currentSlide.value * 100}%)`
}))
</script>

<style scoped>
.viewport { overflow: hidden; width: 100%; }
.track { display: flex; width: 100%; }
.slide { flex: 0 0 100%; width: 100%; }
.transition-fast { transition: transform 300ms ease; }
.col-25 { flex: 0 0 25%; max-width: 25%; }
@media (max-width: 960px) {
  .col-25 { flex-basis: 50%; max-width: 50%; }
}
@media (max-width: 600px) {
  .col-25 { flex-basis: 100%; max-width: 100%; }
}
</style>
