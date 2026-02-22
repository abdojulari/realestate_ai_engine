<template>
  <v-row class="mb-6">
    <v-col cols="12">
      <v-card class="section-card" elevation="0">
        <v-card-title class="pa-6 d-flex align-center">
          <v-icon class="mr-2">mdi-palette-swatch-variant</v-icon>
          <span class="display-serif text-h5">Choose Template</span>
        </v-card-title>
        <v-divider class="opacity-10" />
        <v-card-text class="pa-6">
          <div class="template-grid mb-6">
            <div
              v-for="t in templates"
              :key="t.id"
              class="template-thumb"
              :class="{ 'template-thumb--active': selectedTemplate === t.id }"
              @click="$emit('update:template', t.id)"
            >
              <div class="template-thumb__preview" :style="getThumbStyle(t.id)">
                <div class="template-thumb__label">{{ t.label }}</div>
              </div>
              <div class="text-caption text-center mt-1 font-weight-medium">{{ t.label }}</div>
            </div>
          </div>
          <div class="text-subtitle-2 font-weight-bold mb-3">Accent Color</div>
          <div class="color-palette">
            <button
              v-for="c in colorPalette"
              :key="c.value"
              class="color-swatch"
              :class="{ 'color-swatch--active': selectedColor === c.value }"
              :style="{ background: c.value }"
              :title="c.label"
              @click="$emit('update:color', c.value)"
            />
          </div>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
const props = defineProps<{
  templates: Array<{ id: string; label: string }>
  colorPalette: Array<{ label: string; value: string }>
  selectedTemplate: string
  selectedColor: string
}>()

defineEmits<{
  'update:template': [id: string]
  'update:color': [value: string]
}>()

function getThumbStyle(id: string) {
  const c = props.selectedColor
  switch (id) {
    case 'plain':         return { background: '#fff', border: '1px solid #ddd' }
    case 'glassmorphism': return { background: `linear-gradient(135deg, ${c}20, ${c}08)`, border: '1px solid rgba(255,255,255,0.4)' }
    case 'gradient':      return { background: `linear-gradient(135deg, ${c}, ${c}aa)`, color: '#fff' }
    case 'bold':          return { background: 'linear-gradient(155deg, #0d0d0d, #1a1a2e)', color: '#fff' }
    case 'minimal':       return { background: '#fafafa', border: `1.5px solid ${c}30` }
    case 'elegant':       return { background: 'linear-gradient(180deg, #faf8f5, #f0ebe4)', borderBottom: `3px solid ${c}` }
    case 'luxury':        return { background: 'linear-gradient(155deg, #1a1a2e, #0f3460)', color: '#d4a537', border: '1px solid rgba(212,165,55,0.3)' }
    case 'magazine':      return { background: '#fff', borderLeft: `4px solid ${c}`, border: '1px solid #e0e0e0', borderLeftWidth: '4px', borderLeftColor: c }
    default:              return {}
  }
}
</script>

<style scoped>
.template-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px; }
.template-thumb { cursor: pointer; transition: all 0.2s ease; }
.template-thumb__preview { height: 72px; border-radius: 10px; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; overflow: hidden; }
.template-thumb__label { font-size: 11px; font-weight: 600; opacity: 0.7; }
.template-thumb--active .template-thumb__preview { box-shadow: 0 0 0 3px currentColor, 0 4px 12px rgba(0,0,0,0.15); transform: translateY(-2px); }
.color-palette { display: flex; gap: 10px; flex-wrap: wrap; }
.color-swatch { width: 36px; height: 36px; border-radius: 50%; border: 3px solid transparent; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 6px rgba(0,0,0,0.12); }
.color-swatch:hover { transform: scale(1.15); }
.color-swatch--active { border-color: #333; transform: scale(1.2); box-shadow: 0 4px 12px rgba(0,0,0,0.25); }
</style>
