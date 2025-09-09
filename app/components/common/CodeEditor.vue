<template>
  <div class="code-editor-container">
    <div class="editor-toolbar d-flex align-center mb-2">
      <v-chip size="small" color="primary" variant="outlined">{{ language.toUpperCase() }}</v-chip>
      <v-spacer />
      <v-btn
        size="small"
        variant="text"
        prepend-icon="mdi-format-align-left"
        @click="formatCode"
      >
        Format
      </v-btn>
      <v-btn
        size="small"
        variant="text"
        prepend-icon="mdi-fullscreen"
        @click="toggleFullscreen"
      >
        {{ isFullscreen ? 'Exit Fullscreen' : 'Fullscreen' }}
      </v-btn>
    </div>
    
    <div 
      ref="editorContainer" 
      class="codemirror-editor"
      :class="{ 'fullscreen': isFullscreen }"
      :style="{ height: editorHeight }"
    />
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: string
  language?: string
  height?: string
  readonly?: boolean
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  language: 'html',
  height: '300px',
  readonly: false,
  placeholder: 'Enter your code here...'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'change': [value: string]
}>()

const editorContainer = ref<HTMLElement>()
const isFullscreen = ref(false)
let editorView: any = null

const editorHeight = computed(() => isFullscreen.value ? '80vh' : props.height)

const initializeEditor = async () => {
  if (!editorContainer.value || !process.client) return

  try {
    // Dynamic imports for client-side only
    const { EditorView, basicSetup } = await import('@codemirror/view')
    const { EditorState } = await import('@codemirror/state')
    const { html } = await import('@codemirror/lang-html')
    const { css } = await import('@codemirror/lang-css')
    const { oneDark } = await import('@codemirror/theme-one-dark')

    // Choose language extension
    let languageExtension
    switch (props.language) {
      case 'css':
        languageExtension = css()
        break
      case 'html':
      default:
        languageExtension = html()
        break
    }

    // Create editor state
    const state = EditorState.create({
      doc: props.modelValue,
      extensions: [
        basicSetup,
        languageExtension,
        EditorView.theme({
          '&': {
            fontSize: '14px',
            border: '1px solid #e0e0e0',
            borderRadius: '4px'
          },
          '.cm-content': {
            padding: '12px',
            minHeight: props.height
          },
          '.cm-focused': {
            outline: '2px solid #1976d2',
            outlineOffset: '-2px'
          }
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const value = update.state.doc.toString()
            emit('update:modelValue', value)
            emit('change', value)
          }
        })
      ]
    })

    // Create editor view
    editorView = new EditorView({
      state,
      parent: editorContainer.value
    })

    console.log('✅ CodeMirror editor initialized')
  } catch (error) {
    console.error('❌ Failed to initialize CodeMirror:', error)
  }
}

const formatCode = () => {
  if (!editorView) return
  
  // Basic formatting for HTML/CSS
  try {
    const doc = editorView.state.doc.toString()
    let formatted = doc
    
    if (props.language === 'html') {
      // Basic HTML formatting
      formatted = doc
        .replace(/></g, '>\n<')
        .replace(/^\s+|\s+$/gm, '')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n')
    }
    
    if (props.language === 'css') {
      // Basic CSS formatting
      formatted = doc
        .replace(/\{/g, ' {\n  ')
        .replace(/\}/g, '\n}\n')
        .replace(/;/g, ';\n  ')
        .replace(/^\s+|\s+$/gm, '')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n')
    }
    
    // Update editor content
    editorView.dispatch({
      changes: {
        from: 0,
        to: editorView.state.doc.length,
        insert: formatted
      }
    })
  } catch (error) {
    console.warn('Formatting failed:', error)
  }
}

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
  
  // Trigger editor resize
  nextTick(() => {
    if (editorView) {
      editorView.requestMeasure()
    }
  })
}

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
  if (editorView && editorView.state.doc.toString() !== newValue) {
    editorView.dispatch({
      changes: {
        from: 0,
        to: editorView.state.doc.length,
        insert: newValue
      }
    })
  }
})

onMounted(() => {
  if (process.client) {
    initializeEditor()
  }
})

onBeforeUnmount(() => {
  if (editorView) {
    editorView.destroy()
  }
})
</script>

<style scoped>
.code-editor-container {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.editor-toolbar {
  background: #f5f5f5;
  padding: 8px 12px;
  border-bottom: 1px solid #e0e0e0;
}

.codemirror-editor {
  width: 100%;
  transition: all 0.3s ease;
}

.codemirror-editor.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: white;
  border-radius: 0;
}

/* CodeMirror styling */
:deep(.cm-editor) {
  border: none !important;
}

:deep(.cm-content) {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace !important;
}

:deep(.cm-line) {
  line-height: 1.5;
}
</style>