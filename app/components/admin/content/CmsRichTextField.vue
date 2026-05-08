<template>
  <div class="cms-rich-editor rounded-lg">
    <div v-if="editor" class="cms-rich-editor__toolbar d-flex flex-wrap align-center ga-1 pa-2">
      <v-btn
        icon="mdi-format-bold"
        size="x-small"
        variant="text"
        :class="{ 'bg-grey-lighten-3': editor.isActive('bold') }"
        @click="editor.chain().focus().toggleBold().run()"
      />
      <v-btn
        icon="mdi-format-italic"
        size="x-small"
        variant="text"
        :class="{ 'bg-grey-lighten-3': editor.isActive('italic') }"
        @click="editor.chain().focus().toggleItalic().run()"
      />
      <v-btn
        icon="mdi-format-underline"
        size="x-small"
        variant="text"
        :class="{ 'bg-grey-lighten-3': editor.isActive('underline') }"
        @click="editor.chain().focus().toggleUnderline().run()"
      />
      <v-divider vertical class="mx-1" inset />
      <v-btn
        icon="mdi-format-header-2"
        size="x-small"
        variant="text"
        :class="{ 'bg-grey-lighten-3': editor.isActive('heading', { level: 2 }) }"
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
      />
      <v-btn
        icon="mdi-format-header-3"
        size="x-small"
        variant="text"
        :class="{ 'bg-grey-lighten-3': editor.isActive('heading', { level: 3 }) }"
        @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
      />
      <v-divider vertical class="mx-1" inset />
      <v-btn
        icon="mdi-format-list-bulleted"
        size="x-small"
        variant="text"
        :class="{ 'bg-grey-lighten-3': editor.isActive('bulletList') }"
        @click="editor.chain().focus().toggleBulletList().run()"
      />
      <v-btn
        icon="mdi-format-list-numbered"
        size="x-small"
        variant="text"
        :class="{ 'bg-grey-lighten-3': editor.isActive('orderedList') }"
        @click="editor.chain().focus().toggleOrderedList().run()"
      />
      <v-btn
        icon="mdi-format-quote-close"
        size="x-small"
        variant="text"
        :class="{ 'bg-grey-lighten-3': editor.isActive('blockquote') }"
        @click="editor.chain().focus().toggleBlockquote().run()"
      />
      <v-divider vertical class="mx-1" inset />
      <v-btn icon="mdi-link-variant" size="x-small" variant="text" @click="setLink" />
      <v-btn icon="mdi-link-variant-off" size="x-small" variant="text" @click="editor.chain().focus().unsetLink().run()" />
    </div>
    <editor-content :editor="editor" class="cms-rich-editor__content pa-3" />
    <div class="text-caption text-medium-emphasis px-3 pb-2">
      Rich text — unsafe markup is stripped when you save.
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'

const props = defineProps<{
  modelValue: string
  placeholder?: string
  /** Minimum height of the editable area (px). */
  minHeight?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editor = useEditor({
  content: props.modelValue || '',
  extensions: [
    StarterKit.configure({
      heading: { levels: [2, 3] },
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        rel: 'noopener noreferrer',
        target: '_blank',
      },
    }),
    Placeholder.configure({
      placeholder: props.placeholder || 'Write content…',
    }),
  ],
  editorProps: {
    attributes: {
      class: 'cms-rich-editor-prose',
      style: `min-height:${props.minHeight ?? 160}px`,
    },
  },
  onUpdate: ({ editor: ed }) => {
    emit('update:modelValue', ed.getHTML())
  },
})

function setLink() {
  const ed = editor.value
  if (!ed) return
  const prev = ed.getAttributes('link').href
  const next = window.prompt('URL (https://…)', prev || 'https://')
  if (next === null) return
  const t = next.trim()
  if (!t) {
    ed.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }
  if (!/^https?:\/\//i.test(t) && !/^mailto:/i.test(t)) {
    ed.chain().focus().extendMarkRange('link').setLink({ href: `https://${t}` }).run()
    return
  }
  ed.chain().focus().extendMarkRange('link').setLink({ href: t }).run()
}

watch(
  () => props.modelValue,
  (html) => {
    const ed = editor.value
    if (!ed) return
    const cur = ed.getHTML()
    if ((html || '') === cur) return
    ed.commands.setContent(html || '', false)
  },
)

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<style scoped>
.cms-rich-editor {
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: #fff;
}

.cms-rich-editor__toolbar {
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  background: #fafafa;
}

.cms-rich-editor__content :deep(.ProseMirror) {
  outline: none;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 0.9rem;
  line-height: 1.55;
}

.cms-rich-editor__content :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  color: rgba(0, 0, 0, 0.38);
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

.cms-rich-editor__content :deep(.ProseMirror h2) {
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0.65rem 0 0.3rem;
}

.cms-rich-editor__content :deep(.ProseMirror h3) {
  font-size: 1rem;
  font-weight: 700;
  margin: 0.55rem 0 0.25rem;
}

.cms-rich-editor__content :deep(.ProseMirror ul),
.cms-rich-editor__content :deep(.ProseMirror ol) {
  padding-left: 1.25rem;
  margin: 0.35rem 0;
}

.cms-rich-editor__content :deep(.ProseMirror a) {
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
}
</style>
