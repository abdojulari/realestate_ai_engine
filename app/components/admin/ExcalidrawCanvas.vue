<template>
  <div ref="container" class="excalidraw-host" />
</template>

<script setup lang="ts">
/**
 * Official @excalidraw/excalidraw is React-only; we mount it with react-dom/client.
 * Use only inside <ClientOnly> or pages with ssr: false.
 */
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'

export type ExcalidrawScenePayload = {
  elements: unknown[]
  appState: Record<string, unknown>
}

/**
 * JSON.stringify turns Map collaborators into `{}`, which breaks Excalidraw on reload
 * (`appState.collaborators.forEach is not a function`). Force an array for storage + restore.
 */
function sanitizeAppStateForStorage(appState: unknown): Record<string, unknown> {
  const base =
    appState !== null && typeof appState === 'object' && !Array.isArray(appState)
      ? { ...(appState as Record<string, unknown>) }
      : {}
  if (!Array.isArray(base.collaborators)) {
    base.collaborators = []
  }
  return base
}

const props = defineProps<{
  initialScene?: ExcalidrawScenePayload | null
}>()

const container = ref<HTMLElement | null>(null)
let root: Root | null = null

/** Latest scene for imperative save (no auto-upload from parent). */
let latestSnapshot: ExcalidrawScenePayload | null = null

function captureScene(elements: readonly unknown[], appState: Record<string, unknown>) {
  const safeApp = sanitizeAppStateForStorage(appState)
  latestSnapshot = {
    elements: JSON.parse(JSON.stringify(elements)),
    appState: JSON.parse(JSON.stringify(safeApp)),
  }
}

defineExpose({
  getSceneSnapshot(): ExcalidrawScenePayload | null {
    return latestSnapshot
  },
})

function mountBoard() {
  const el = container.value
  if (!el) return

  void (async () => {
    await import('@excalidraw/excalidraw/index.css')
    const { Excalidraw, restore } = await import('@excalidraw/excalidraw')

    let initialData: { elements: unknown[]; appState: Record<string, unknown> } | undefined
    if (props.initialScene?.elements && Array.isArray(props.initialScene.elements)) {
      const patched = {
        elements: props.initialScene.elements,
        appState: sanitizeAppStateForStorage(props.initialScene.appState),
      }
      const restored = restore(patched as Parameters<typeof restore>[0], null, null, {
        repairBindings: true,
      })
      initialData = {
        elements: restored.elements as unknown[],
        appState: restored.appState as Record<string, unknown>,
      }
    }

    const Board = () =>
      React.createElement(Excalidraw as any, {
        initialData,
        onChange: (elements: unknown[], appState: unknown) => {
          captureScene(elements, (appState || {}) as Record<string, unknown>)
        },
      })

    root = createRoot(el)
    root.render(React.createElement(Board))
  })()
}

onMounted(() => {
  mountBoard()
})

watch(
  () => props.initialScene,
  () => {
    /* scene is loaded on mount; parent should remount via :key when switching tools */
  }
)

onBeforeUnmount(() => {
  root?.unmount()
  root = null
  latestSnapshot = null
})
</script>

<style scoped>
.excalidraw-host {
  height: min(78vh, 900px);
  min-height: 480px;
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.excalidraw-host :deep(.excalidraw) {
  height: 100% !important;
}
</style>
