<template>
  <FeatureGate :feature="FEATURES.WORKSPACE_TOOLS" :show-upgrade-prompt="true">
  <div class="admin-tools px-md-8 py-md-6">
    <v-container fluid>
      <v-row class="mb-8 align-center">
        <v-col cols="12" md="8">
          <div class="d-flex align-center mb-2">
            <v-btn icon="mdi-arrow-left" variant="text" size="small" class="mr-2" to="/admin" />
            <div class="premium-accent-bar mr-4" />
            <span class="text-overline letter-spacing-2 text-gold">Workspace</span>
          </div>
          <h1 class="display-serif text-h3 mb-1">Tools</h1>
          <p class="text-subtitle-1 text-medium-emphasis font-weight-light">
            Create whiteboards and brainstorming spaces powered by Excalidraw.
          </p>
        </v-col>
        <v-col cols="12" md="4" class="text-md-right">
          <v-btn color="primary" size="large" prepend-icon="mdi-plus" class="premium-btn" @click="openCreate">
            Create tool
          </v-btn>
        </v-col>
      </v-row>

      <v-row v-if="loading">
        <v-col cols="12"><v-skeleton-loader type="card@3" /></v-col>
      </v-row>

      <v-row v-else>
        <v-col v-for="tool in tools" :key="tool.id" cols="12" sm="6" lg="4">
          <v-card class="tool-card pa-6" elevation="0" :to="`/admin/tools/${tool.id}`">
            <div class="d-flex align-start mb-4">
              <v-avatar :icon="tool.icon" color="primary" variant="tonal" size="56" class="mr-4" />
              <div>
                <div class="text-h6 font-weight-bold">{{ tool.name }}</div>
                <v-chip size="x-small" variant="tonal" class="mt-1 text-uppercase">{{ tool.kind }}</v-chip>
              </div>
            </div>
            <p class="text-body-2 text-medium-emphasis mb-0 tool-desc">{{ tool.description || 'Open to sketch and collaborate.' }}</p>
            <div class="text-caption text-medium-emphasis mt-4">Updated {{ formatRelative(tool.updatedAt) }}</div>
          </v-card>
        </v-col>

        <v-col v-if="tools.length === 0" cols="12">
          <v-card class="empty-card text-center pa-12" elevation="0">
            <v-icon size="72" color="grey-lighten-1" class="mb-4">mdi-draw</v-icon>
            <div class="text-h6 font-weight-bold mb-2">No tools yet</div>
            <p class="text-body-2 text-medium-emphasis mb-6">
              Add a whiteboard for listing brainstorms, buyer journeys, or team notes.
            </p>
            <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">Create your first tool</v-btn>
          </v-card>
        </v-col>
      </v-row>

      <v-dialog v-model="dialog" max-width="520" persistent>
        <v-card rounded="xl" class="pa-2">
          <v-card-title class="text-h6">New workspace tool</v-card-title>
          <v-card-text>
            <v-text-field
              v-model="form.name"
              label="Name"
              variant="outlined"
              density="comfortable"
              class="mb-3"
              hint="e.g. Listing brainstorm — Oak Ave"
              persistent-hint
            />
            <v-textarea
              v-model="form.description"
              label="Description"
              variant="outlined"
              rows="3"
              hint="Shown on the card before opening"
              persistent-hint
            />
            <v-select
              v-model="form.icon"
              :items="iconOptions"
              item-title="title"
              item-value="value"
              label="Icon"
              variant="outlined"
              density="comfortable"
              class="mt-4"
            >
              <template #item="{ props: p, item }">
                <v-list-item v-bind="p">
                  <template #prepend>
                    <v-icon :icon="item.value" class="mr-2" />
                  </template>
                </v-list-item>
              </template>
              <template #selection="{ item }">
                <v-icon :icon="item.value" class="mr-2" size="small" />
                {{ item.title }}
              </template>
            </v-select>
            <input type="hidden" value="whiteboard" />
            <p class="text-caption text-medium-emphasis mt-4 mb-0">
              Opens the Excalidraw whiteboard. Drawings auto-save while you work.
            </p>
          </v-card-text>
          <v-card-actions class="px-4 pb-4">
            <v-btn variant="text" @click="dialog = false">Cancel</v-btn>
            <v-spacer />
            <v-btn color="primary" :loading="saving" :disabled="!form.name.trim() || form.name.trim().length < 2" @click="createTool">
              Create
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-container>
  </div>
  </FeatureGate>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import FeatureGate from '~/components/FeatureGate.vue'
import { FEATURES } from '~/composables/useLicense'

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

const getAuthHeaders = (): Record<string, string> => {
  if (process.client) {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }
  return {}
}

const tools = ref<any[]>([])
const loading = ref(true)
const dialog = ref(false)
const saving = ref(false)
const form = ref({ name: '', description: '', icon: 'mdi-draw' })

const iconOptions = [
  { title: 'Draw / whiteboard', value: 'mdi-draw' },
  { title: 'Brainstorm', value: 'mdi-human-male-board' },
  { title: 'Lightbulb', value: 'mdi-lightbulb-on-outline' },
  { title: 'Flow', value: 'mdi-sitemap' },
  { title: 'Chart', value: 'mdi-chart-timeline-variant' },
  { title: 'Notes', value: 'mdi-note-text-outline' },
]

function formatRelative(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return iso
  }
}

async function load() {
  loading.value = true
  try {
    const res = await $fetch<{ tools: any[] }>('/api/admin/workspace-tools', { headers: getAuthHeaders() })
    tools.value = res.tools || []
  } catch (e) {
    console.error(e)
    tools.value = []
  } finally {
    loading.value = false
  }
}

function openCreate() {
  form.value = { name: '', description: '', icon: 'mdi-draw' }
  dialog.value = true
}

async function createTool() {
  saving.value = true
  try {
    await $fetch('/api/admin/workspace-tools', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: {
        name: form.value.name.trim(),
        description: form.value.description.trim(),
        icon: form.value.icon,
        kind: 'whiteboard',
      },
    })
    dialog.value = false
    await load()
  } catch (e) {
    console.error(e)
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;600&display=swap');

.admin-tools {
  min-height: 100vh;
  background: #fcfcfb;
  font-family: Inter, sans-serif;
}
.display-serif {
  font-family: 'Playfair Display', serif;
}
.text-gold {
  color: #8c734b;
}
.letter-spacing-2 {
  letter-spacing: 2px;
}
.premium-accent-bar {
  width: 40px;
  height: 4px;
  background: #8c734b;
  border-radius: 2px;
}
.premium-btn {
  border-radius: 12px !important;
  text-transform: none !important;
  font-weight: 700 !important;
}
.tool-card {
  border-radius: 20px !important;
  border: 1px solid rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.tool-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08) !important;
}
.tool-desc {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.empty-card {
  border: 2px dashed rgba(0, 0, 0, 0.1);
  border-radius: 24px;
}
</style>
