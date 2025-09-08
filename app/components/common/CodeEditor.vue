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
        :disabled="!canFormat"
      >
        Format
      </v-btn>
      <v-btn
        size="small"
        variant="text"
        prepend-icon="mdi-fullscreen"
        @click="toggleFullscreen"
      >
        Fullscreen
      </v-btn>
    </div>
    
    <div 
      ref="editorContainer" 
      class="monaco-editor-container"
      :class="{ 'fullscreen': isFullscreen }"
      :style="{ height: editorHeight }"
    />
    
    <!-- Fullscreen overlay -->
    <div v-if="isFullscreen" class="fullscreen-overlay">
      <div class="fullscreen-header d-flex align-center pa-4">
        <h3 class="text-h6">Code Editor - {{ language.toUpperCase() }}</h3>
        <v-spacer />
        <v-btn
          icon="mdi-close"
          variant="text"
          @click="toggleFullscreen"
        />
      </div>
      <div ref="fullscreenEditor" class="fullscreen-editor" />
    </div>
  </div>
</template>

<script setup lang="ts">
import * as monaco from 'monaco-editor'

interface Props {
  modelValue: string
  language?: string
  height?: string
  theme?: string
  readonly?: boolean
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  language: 'html',
  height: '300px',
  theme: 'vs',
  readonly: false,
  placeholder: 'Enter your code here...'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'change': [value: string]
  'focus': []
  'blur': []
}>()

const editorContainer = ref<HTMLElement>()
const fullscreenEditor = ref<HTMLElement>()
const isFullscreen = ref(false)
let editor: monaco.editor.IStandaloneCodeEditor | null = null
let fullscreenEditorInstance: monaco.editor.IStandaloneCodeEditor | null = null

const editorHeight = computed(() => props.height)
const canFormat = computed(() => ['html', 'css', 'javascript', 'json'].includes(props.language))

const initializeEditor = () => {
  if (!editorContainer.value) return

  // Configure Monaco Editor
  monaco.languages.html.htmlDefaults.setOptions({
    format: {
      tabSize: 2,
      insertSpaces: true,
      wrapLineLength: 120,
      unformatted: 'default"',
      contentUnformatted: 'pre,code,textarea',
      indentInnerHtml: false,
      preserveNewLines: true,
      maxPreserveNewLines: 2,
      indentHandlebars: false,
      endWithNewline: false,
      extraLiners: 'head,body,/html',
      wrapAttributes: 'auto'
    }
  })

  // Create editor instance
  editor = monaco.editor.create(editorContainer.value, {
    value: props.modelValue,
    language: props.language,
    theme: props.theme,
    readOnly: props.readonly,
    automaticLayout: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 14,
    lineNumbers: 'on',
    roundedSelection: false,
    scrollbar: {
      vertical: 'auto',
      horizontal: 'auto'
    },
    wordWrap: 'on',
    formatOnPaste: true,
    formatOnType: true
  })

  // Listen for changes
  editor.onDidChangeModelContent(() => {
    if (editor) {
      const value = editor.getValue()
      emit('update:modelValue', value)
      emit('change', value)
    }
  })

  // Focus/blur events
  editor.onDidFocusEditorText(() => emit('focus'))
  editor.onDidBlurEditorText(() => emit('blur'))
}

const formatCode = async () => {
  if (!editor) return
  
  try {
    await editor.getAction('editor.action.formatDocument')?.run()
  } catch (error) {
    console.warn('Format not available for this language')
  }
}

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
  
  if (isFullscreen.value) {
    nextTick(() => {
      if (fullscreenEditor.value) {
        fullscreenEditorInstance = monaco.editor.create(fullscreenEditor.value, {
          value: editor?.getValue() || props.modelValue,
          language: props.language,
          theme: 'vs-dark',
          automaticLayout: true,
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          fontSize: 16
        })

        fullscreenEditorInstance.onDidChangeModelContent(() => {
          if (fullscreenEditorInstance && editor) {
            const value = fullscreenEditorInstance.getValue()
            editor.setValue(value)
            emit('update:modelValue', value)
            emit('change', value)
          }
        })
      }
    })
  } else {
    if (fullscreenEditorInstance) {
      fullscreenEditorInstance.dispose()
      fullscreenEditorInstance = null
    }
  }
}

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
  if (editor && editor.getValue() !== newValue) {
    editor.setValue(newValue)
  }
})

onMounted(() => {
  initializeEditor()
})

onBeforeUnmount(() => {
  if (editor) {
    editor.dispose()
  }
  if (fullscreenEditorInstance) {
    fullscreenEditorInstance.dispose()
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

.monaco-editor-container {
  width: 100%;
}

.fullscreen-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: white;
  z-index: 9999;
  display: flex;
  flex-direction: column;
}

.fullscreen-header {
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
}

.fullscreen-editor {
  flex: 1;
}

/* Monaco editor dark theme in fullscreen */
.fullscreen-overlay .monaco-editor {
  background: #1e1e1e !important;
}
</style>
