<template>
  <FeatureGate :feature="FEATURES.WORKSPACE_TOOLS" :show-upgrade-prompt="true">
  <div class="admin-tool-board px-md-6 py-md-4">
    <v-container fluid>
      <v-row class="align-center mb-4">
        <v-col cols="12" md="8">
          <div class="d-flex align-center flex-wrap ga-2">
            <v-btn to="/admin/tools" variant="text" prepend-icon="mdi-arrow-left">Tools</v-btn>
            <v-divider vertical class="mx-2 d-none d-sm-block" />
            <v-icon :icon="tool?.icon || 'mdi-draw'" class="text-gold" />
            <span class="text-h5 font-weight-bold">{{ tool?.name || '…' }}</span>
            <v-chip v-if="tool" size="small" variant="tonal">{{ tool.kind }}</v-chip>
          </div>
          <p v-if="tool?.description" class="text-body-2 text-medium-emphasis mt-2 mb-0">{{ tool.description }}</p>
        </v-col>
        <v-col cols="12" md="4" class="text-md-right">
          <div class="d-flex flex-wrap justify-md-end ga-2 mb-1">
            <v-btn variant="tonal" color="primary" :loading="saving" @click="saveNow">
              Save now
            </v-btn>
            <v-btn variant="text" color="error" @click="confirmDelete = true">Delete</v-btn>
          </div>
          <p class="text-caption text-medium-emphasis mb-0 text-md-end">
            Nothing is auto-saved—click Save when you want to persist the canvas.
          </p>
        </v-col>
      </v-row>

      <v-alert v-if="saveError" type="error" variant="tonal" density="compact" class="mb-4" rounded="lg">
        {{ saveError }}
      </v-alert>
      <v-alert v-if="savedHint" type="success" variant="tonal" density="compact" class="mb-4" rounded="lg">
        {{ savedHint }}
      </v-alert>

      <client-only>
        <ExcalidrawCanvas
          v-if="tool && tool.kind === 'whiteboard'"
          ref="canvasRef"
          :key="tool.id"
          :initial-scene="initialScene"
        />
        <template #fallback>
          <v-skeleton-loader type="image" height="480" class="rounded-xl" />
        </template>
      </client-only>

      <v-dialog v-model="confirmDelete" max-width="400">
        <v-card rounded="xl">
          <v-card-title>Delete this tool?</v-card-title>
          <v-card-text>This removes the whiteboard and saved drawing data.</v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="confirmDelete = false">Cancel</v-btn>
            <v-btn color="error" :loading="deleting" @click="removeTool">Delete</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-container>
  </div>
  </FeatureGate>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import FeatureGate from '~/components/FeatureGate.vue'
import { FEATURES } from '~/composables/useLicense'
import ExcalidrawCanvas from '~/components/admin/ExcalidrawCanvas.vue'

type CanvasExpose = { getSceneSnapshot: () => { elements: unknown[]; appState: Record<string, unknown> } | null }

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

const route = useRoute()
const router = useRouter()

const getAuthHeaders = (): Record<string, string> => {
  if (process.client) {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }
  return {}
}

const tool = ref<any>(null)
const canvasRef = ref<CanvasExpose | null>(null)
const saving = ref(false)
const deleting = ref(false)
const saveError = ref('')
const savedHint = ref('')
const confirmDelete = ref(false)

const initialScene = computed(() => {
  const sd = tool.value?.sceneData
  if (!sd || typeof sd !== 'object') return null
  const o = sd as Record<string, unknown>
  if (!Array.isArray(o.elements)) return null
  return {
    elements: o.elements,
    appState: (o.appState && typeof o.appState === 'object' ? o.appState : {}) as Record<string, unknown>,
  }
})

async function load() {
  const id = route.params.id as string
  try {
    const res = await $fetch<{ tool: any }>(`/api/admin/workspace-tools/${id}`, { headers: getAuthHeaders() })
    tool.value = res.tool
  } catch {
    tool.value = null
    await router.replace('/admin/tools')
  }
}

/** Live canvas from Excalidraw, last loaded server scene, or empty board once the canvas is mounted. */
function getSceneForSave(): { elements: unknown[]; appState: Record<string, unknown> } | null {
  const live = canvasRef.value?.getSceneSnapshot?.()
  if (live) return live
  const sd = tool.value?.sceneData
  if (sd && typeof sd === 'object' && Array.isArray((sd as Record<string, unknown>).elements)) {
    const o = sd as Record<string, unknown>
    return {
      elements: JSON.parse(JSON.stringify(o.elements)),
      appState:
        o.appState && typeof o.appState === 'object'
          ? (JSON.parse(JSON.stringify(o.appState)) as Record<string, unknown>)
          : {},
    }
  }
  if (canvasRef.value) {
    return { elements: [], appState: {} }
  }
  return null
}

async function persistScene() {
  if (!tool.value) return
  const scene = getSceneForSave()
  if (!scene) {
    saveError.value = 'Canvas is not ready yet. Try again in a moment.'
    return
  }
  saving.value = true
  saveError.value = ''
  savedHint.value = ''
  try {
    await $fetch(`/api/admin/workspace-tools/${tool.value.id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: {
        sceneData: {
          elements: scene.elements,
          appState: scene.appState,
        },
      },
    })
    savedHint.value = 'Saved'
    setTimeout(() => {
      savedHint.value = ''
    }, 2000)
  } catch (e: any) {
    saveError.value = e?.data?.statusMessage || e?.message || 'Save failed'
  } finally {
    saving.value = false
  }
}

async function saveNow() {
  await persistScene()
}

async function removeTool() {
  if (!tool.value) return
  deleting.value = true
  try {
    await $fetch(`/api/admin/workspace-tools/${tool.value.id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
    await router.push('/admin/tools')
  } finally {
    deleting.value = false
    confirmDelete.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.admin-tool-board {
  min-height: 100vh;
  background: #f7f6f3;
}
.text-gold {
  color: #8c734b;
}
</style>
