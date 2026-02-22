<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="900"
    scrollable
  >
    <v-card class="premium-card">
      <div class="p-8 bg-slate-900 text-white">
        <h2 class="text-h5 font-serif">{{ editing ? 'Edit Content' : 'Add New Content' }}</h2>
        <p class="text-caption text-slate-400 mb-0">Manage your website content and media</p>
      </div>
      <v-card-text class="p-8">
        <v-form v-model="isValid" @submit.prevent="$emit('save')">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field density="compact"
                v-model="form.title"
                label="Title"
                :rules="[v => !!v || 'Title is required']"
                required
                variant="outlined"
                rounded="lg"
                class="premium-input"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-select density="compact"
                v-model="form.key"
                :items="keyOptions"
                item-title="title"
                item-value="value"
                label="Key"
                :rules="[v => !!v || 'Key is required']"
                required
                variant="outlined"
                rounded="lg"
                class="premium-input"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-select density="compact"
                v-model="form.section"
                :items="pageSections"
                item-title="label"
                item-value="id"
                label="Page"
                required
                :rules="[v => !!v || 'Page is required']"
                variant="outlined"
                rounded="lg"
                class="premium-input"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-select density="compact"
                v-model="form.type"
                :items="contentTypes"
                label="Section"
                required
                :rules="[v => !!v || 'Section is required']"
                variant="outlined"
                rounded="lg"
                class="premium-input"
              />
            </v-col>

            <v-col cols="12">
              <div v-if="form.type === 'text'">
                <v-textarea density="compact"
                  v-model="form.content"
                  label="Content"
                  rows="5"
                  :rules="[v => !!v || 'Content is required']"
                  required
                  variant="outlined"
                  rounded="lg"
                  class="premium-input"
                />
              </div>

              <div v-else-if="form.type === 'html'">
                <v-textarea density="compact"
                  v-model="form.content"
                  label="HTML Content"
                  rows="12"
                  variant="outlined"
                  :rules="[v => !!v || 'Content is required']"
                  required
                  class="html-code-editor premium-input"
                  rounded="lg"
                  spellcheck="false"
                  auto-grow
                  hint="Enter your HTML content. Use Tab for indentation."
                  persistent-hint
                />

                <div v-if="form.section === 'about'" class="mt-6">
                  <v-file-input
                    v-model="form.uploadedImages"
                    label="Upload Images for About Page"
                    accept="image/*"
                    multiple
                    show-size
                    prepend-icon="mdi-camera-plus"
                    hint="Upload up to multiple images (jpg, png, gif, webp)"
                    persistent-hint
                    variant="outlined"
                    rounded="lg"
                    class="premium-input"
                    @update:model-value="(files: any) => $emit('upload-about-images', files)"
                  />

                  <div v-if="form.metadata?.imagePaths?.length > 0" class="mt-4">
                    <v-card class="premium-card-inner border border-slate-200">
                      <div class="p-4 border-b border-slate-100 d-flex align-center">
                        <v-icon class="mr-2" color="primary">mdi-image-multiple</v-icon>
                        <h4 class="text-subtitle-2 font-weight-bold">Available Images</h4>
                      </div>
                      <div class="pa-4">
                        <div class="text-caption mb-3 text-slate-600">Copy these paths to use in your HTML content:</div>
                        <v-list density="compact" class="bg-transparent">
                          <v-list-item
                            v-for="(imagePath, index) in form.metadata.imagePaths"
                            :key="index"
                            class="pa-2 mb-1 rounded-lg hover-bg-slate-50"
                          >
                            <template v-slot:prepend>
                              <v-icon size="small" color="primary">mdi-file-image</v-icon>
                            </template>
                            <v-list-item-title>
                              <code class="text-caption bg-slate-100 px-2 py-1 rounded font-mono">{{ imagePath }}</code>
                            </v-list-item-title>
                            <template v-slot:append>
                              <v-btn
                                icon="mdi-content-copy"
                                variant="text"
                                size="small"
                                color="primary"
                                @click="copyToClipboard(imagePath)"
                              />
                            </template>
                          </v-list-item>
                        </v-list>
                      </div>
                    </v-card>
                  </div>
                </div>
              </div>

              <div v-else-if="isImageContent">
                <div class="brand-upload-card mb-4">
                  <div class="brand-upload-card__label">Current Image</div>
                  <div v-if="form.content" class="brand-upload-card__preview">
                    <img :src="form.content" alt="Preview" class="brand-upload-card__img brand-upload-card__img--hero" />
                    <v-btn variant="text" color="error" size="x-small" icon="mdi-close-circle" class="brand-upload-card__remove" @click="form.content = ''" />
                  </div>
                  <div v-else class="brand-upload-card__preview">
                    <v-icon size="48" color="grey-lighten-1">mdi-image-off-outline</v-icon>
                  </div>
                </div>
                <v-file-input
                  v-model="form.file"
                  label="Upload new image"
                  accept="image/*"
                  show-size
                  prepend-icon=""
                  prepend-inner-icon="mdi-camera"
                  variant="outlined"
                  density="compact"
                  rounded="lg"
                  class="premium-input mb-3"
                  @update:model-value="(file: any) => $emit('upload-image', file)"
                />
                <v-text-field
                  v-model="form.content"
                  label="Or enter image URL"
                  variant="outlined"
                  density="compact"
                  rounded="lg"
                  class="premium-input"
                  prepend-inner-icon="mdi-link"
                  hint="Upload above or paste a URL here"
                  persistent-hint
                />
              </div>

              <div v-else-if="form.key === 'testimonial'">
                <v-text-field density="compact"
                  v-model="form.metadata.author"
                  label="Author Name"
                  :rules="[v => !!v || 'Author name is required']"
                  required
                  variant="outlined"
                  rounded="lg"
                  class="premium-input mb-4"
                />
                <v-text-field density="compact"
                  v-model="form.metadata.position"
                  label="Author Position/Company"
                  variant="outlined"
                  rounded="lg"
                  class="premium-input mb-4"
                />
                <v-textarea density="compact"
                  v-model="form.content"
                  label="Testimonial"
                  rows="4"
                  :rules="[v => !!v || 'Testimonial content is required']"
                  required
                  variant="outlined"
                  rounded="lg"
                  class="premium-input mb-4"
                />
                <v-file-input
                  v-model="form.file"
                  label="Author Photo"
                  accept="image/*"
                  show-size
                  prepend-icon="mdi-camera"
                  variant="outlined"
                  rounded="lg"
                  class="premium-input"
                />
              </div>

              <div v-else-if="form.key === 'why-choose-us-item'">
                <v-text-field density="compact"
                  v-model="form.metadata.icon"
                  label="Icon (mdi-*)"
                  hint="Example: mdi-home-search"
                  persistent-hint
                  variant="outlined"
                  rounded="lg"
                  class="premium-input mb-4"
                />
                <v-text-field density="compact"
                  v-model="form.title"
                  label="Card Title"
                  :rules="[v => !!v || 'Card title is required']"
                  required
                  variant="outlined"
                  rounded="lg"
                  class="premium-input mb-4"
                />
                <v-textarea density="compact"
                  v-model="form.content"
                  label="Card Description"
                  rows="4"
                  :rules="[v => !!v || 'Description is required']"
                  required
                  variant="outlined"
                  rounded="lg"
                  class="premium-input"
                />
              </div>

              <div v-else>
                <v-text-field density="compact"
                  v-model="form.content"
                  :label="form.key?.replace(/-/g,' ') || 'Content'"
                  :rules="[v => !!v || 'Content is required']"
                  required
                  variant="outlined"
                  rounded="lg"
                  class="premium-input"
                />
              </div>
            </v-col>

            <v-col cols="12">
              <div class="p-6 bg-blue-50 rounded-xl border border-blue-100">
                <v-switch
                  v-model="form.published"
                  label="Publish immediately"
                  color="primary"
                  class="premium-switch mb-0"
                  hide-details
                />
              </div>
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>
      <v-card-actions class="p-8 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="$emit('cancel')" class="px-6">Cancel</v-btn>
        <v-btn
          color="primary"
          :loading="saving"
          :disabled="!isValid"
          @click="$emit('save')"
          class="action-btn-primary px-8"
        >
          {{ editing ? 'Save Changes' : 'Add Content' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  modelValue: boolean
  editing: boolean
  saving: boolean
  form: any
  pageSections: any[]
  contentTypes: any[]
  keyOptions: any[]
  isImageContent: boolean
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
  save: []
  cancel: []
  'upload-image': [file: File | File[] | null]
  'upload-about-images': [files: File | File[] | null]
}>()

const isValid = ref(false)

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
  }
}
</script>
