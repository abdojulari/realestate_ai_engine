<template>
  <v-row>
    <v-col
      v-for="stat in stats"
      :key="stat.title"
      cols="12"
      sm="6"
      md="3"
    >
      <v-card>
        <v-card-text class="text-center">
          <v-icon
            :icon="stat.icon"
            size="36"
            :color="stat.color"
            class="mb-2"
          />
          <div class="text-h4 mb-1">{{ formatValue(stat.value) }}</div>
          <div class="text-body-1">{{ stat.title }}</div>
          <div :class="['text-caption', getGrowthColor(stat.growth)]">
            <v-icon
              :icon="getGrowthIcon(stat.growth)"
              size="small"
              start
            />
            {{ stat.growth }}% from last period
          </div>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
const props = defineProps({
  stats: {
    type: Array as () => Array<{
      title: string
      value: number
      icon: string
      color: string
      growth: number
      format?: string
    }>,
    required: true
  }
})

const formatValue = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

const getGrowthColor = (growth: number) => {
  return growth >= 0 ? 'text-success' : 'text-error'
}

const getGrowthIcon = (growth: number) => {
  return growth >= 0 ? 'mdi-arrow-up' : 'mdi-arrow-down'
}
</script>
