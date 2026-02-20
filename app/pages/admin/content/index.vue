<template>
  <div class="premium-content-wrapper bg-[#F8FAFC] min-h-screen">
    <!-- TOP NAVIGATION BAR (PREMIUM LOOK) -->
    <div class="header-glass sticky top-0 z-50 px-8 py-4 border-b border-slate-200 backdrop-blur-md bg-white/80">
      <div class="max-w-[1600px] mx-auto d-flex align-center">
        <div>
          <div class="flex items-center space-x-2 mb-0">
            <span class="text-[10px] uppercase tracking-[0.3em] font-bold text-primary">CMS Dashboard</span>
          </div>
          <h1 class="text-h4 font-serif text-slate-900 font-weight-bold">Content Management</h1>
        </div>
        <v-spacer />
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          @click="openAddContentDialog"
          class="add-btn-premium"
          elevation="0"
        >
          Add Content
        </v-btn>
      </div>
    </div>

    <v-container fluid class="max-w-[1600px] px-8 pt-8 pb-16">
      <!-- Content Sections -->
      <v-row>
        <v-col cols="12" md="3">
          <v-card class="premium-card sticky top-24">
            <div class="p-6 border-b border-slate-100">
              <h3 class="text-subtitle-2 font-weight-bold text-slate-400 uppercase tracking-widest">Content Sections</h3>
            </div>
            <v-list nav class="p-2">
              <v-list-item
                v-for="section in contentSections"
                :key="section.id"
                :value="section"
                :active="selectedSection === section.id"
                @click="selectSection(section.id)"
                class="rounded-lg mb-1 premium-nav-item"
                :class="{ 'active-nav-item': selectedSection === section.id }"
              >
                <template v-slot:prepend>
                  <v-icon :icon="section.icon" class="mr-3" />
                </template>
                <v-list-item-title class="font-weight-bold">{{ section.title }}</v-list-item-title>
                <template v-slot:append>
                  <v-chip
                    size="small"
                    :color="section.hasUnpublished ? 'warning' : 'success'"
                    variant="flat"
                    class="premium-chip-small"
                  >
                    {{ section.items }}
                  </v-chip>
                </template>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>

        <v-col cols="12" md="9">
          <!-- ═══════ SITE BRANDING PANEL ═══════ -->
          <v-card v-if="selectedSection === 'branding'" class="premium-card">
            <div class="p-8 border-b border-slate-100 d-flex align-center">
              <div class="icon-orb mr-4">
                <v-icon color="primary" size="24">mdi-palette-swatch</v-icon>
              </div>
              <div>
                <h2 class="text-h6 font-weight-bold">Site Branding</h2>
                <p class="text-caption text-slate-400 mb-0">Manage logos, contact info, and footer content for your Header &amp; Footer</p>
              </div>
            </div>
            <v-card-text class="p-8">
              <v-alert v-if="brandingSaved" type="success" variant="tonal" density="compact" closable class="mb-6" @click:close="brandingSaved = false">Branding saved successfully!</v-alert>
              <v-alert v-if="brandingError" type="error" variant="tonal" density="compact" closable class="mb-6" @click:close="brandingError = ''">{{ brandingError }}</v-alert>

              <!-- Header Logo -->
              <div class="text-overline font-weight-bold text-slate-400 tracking-widest mb-4">HEADER</div>
              <v-row dense class="mb-2">
                <v-col cols="12" md="6">
                  <v-text-field v-model="branding.businessName" label="Business Name" variant="outlined" density="compact" hint="Displayed as alt-text and fallback" persistent-hint />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model="branding.tagline" label="Tagline" variant="outlined" density="compact" hint="Short line below logo in footer" persistent-hint />
                </v-col>
              </v-row>
              <v-row dense class="mb-6">
                <v-col cols="12" md="6">
                  <div class="brand-upload-card">
                    <div class="brand-upload-card__label">Site Logo</div>
                    <div class="brand-upload-card__preview">
                      <img :src="siteLogoPreview" alt="Current logo" class="brand-upload-card__img brand-upload-card__img--logo" />
                      <v-btn v-if="branding.logoUrl" variant="text" color="error" size="x-small" icon="mdi-close-circle" class="brand-upload-card__remove" @click="branding.logoUrl = ''" />
                    </div>
                    <v-file-input v-model="logoFile" label="Replace logo" accept="image/*" show-size prepend-icon="" prepend-inner-icon="mdi-camera" variant="outlined" density="compact" hide-details @update:model-value="uploadLogo" />
                  </div>
                </v-col>
                <v-col cols="12" md="6">
                  <div class="brand-upload-card">
                    <div class="brand-upload-card__label">Favicon</div>
                    <div class="brand-upload-card__preview">
                      <img :src="faviconPreview" alt="Favicon" class="brand-upload-card__img brand-upload-card__img--favicon" />
                      <v-btn v-if="branding.faviconUrl" variant="text" color="error" size="x-small" icon="mdi-close-circle" class="brand-upload-card__remove" @click="branding.faviconUrl = ''" />
                    </div>
                    <v-file-input v-model="faviconFile" label="Replace favicon" accept="image/*,.ico" show-size prepend-icon="" prepend-inner-icon="mdi-star-four-points" variant="outlined" density="compact" hide-details @update:model-value="uploadFavicon" />
                  </div>
                </v-col>
              </v-row>

              <v-divider class="my-6" />

              <!-- Contact Info -->
              <div class="text-overline font-weight-bold text-slate-400 tracking-widest mb-4">CONTACT INFO</div>
              <v-row dense class="mb-2">
                <v-col cols="12" md="6">
                  <v-text-field v-model="branding.phone" label="Phone Number" variant="outlined" density="compact" prepend-inner-icon="mdi-phone" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model="branding.email" label="Contact Email" variant="outlined" density="compact" prepend-inner-icon="mdi-email" />
                </v-col>
              </v-row>
              <v-row dense class="mb-6">
                <v-col cols="12" md="6">
                  <v-text-field v-model="branding.address" label="Address" variant="outlined" density="compact" prepend-inner-icon="mdi-map-marker" />
                </v-col>
                <v-col cols="12" md="3">
                  <v-text-field v-model="branding.city" label="City" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="6" md="1.5">
                  <v-text-field v-model="branding.province" label="Province" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="6" md="1.5">
                  <v-text-field v-model="branding.postalCode" label="Postal Code" variant="outlined" density="compact" />
                </v-col>
              </v-row>

              <v-divider class="my-6" />

              <!-- Brokerage -->
              <div class="text-overline font-weight-bold text-slate-400 tracking-widest mb-4">BROKERAGE</div>
              <v-row dense class="mb-2">
                <v-col cols="12" md="6">
                  <v-text-field v-model="branding.brokerageName" label="Brokerage Name" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="6">
                  <div class="brand-upload-card">
                    <div class="brand-upload-card__label">Brokerage Logo</div>
                    <div v-if="branding.brokerageLogoUrl" class="brand-upload-card__preview">
                      <img :src="branding.brokerageLogoUrl" alt="Brokerage logo" class="brand-upload-card__img brand-upload-card__img--logo" />
                      <v-btn variant="text" color="error" size="x-small" icon="mdi-close-circle" class="brand-upload-card__remove" @click="branding.brokerageLogoUrl = ''" />
                    </div>
                    <v-file-input v-model="brokerageLogoFile" label="Upload brokerage logo" accept="image/*" show-size prepend-icon="" prepend-inner-icon="mdi-domain" variant="outlined" density="compact" hide-details @update:model-value="uploadBrokerageLogo" />
                  </div>
                </v-col>
              </v-row>

              <v-divider class="my-6" />

              <!-- Social Links -->
              <div class="text-overline font-weight-bold text-slate-400 tracking-widest mb-4">SOCIAL LINKS</div>
              <v-row v-for="(link, i) in branding.socialLinks" :key="i" dense class="mb-2">
                <v-col cols="12" md="4">
                  <v-text-field v-model="link.name" label="Name" variant="outlined" density="compact" placeholder="e.g. Instagram" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model="link.url" label="URL" variant="outlined" density="compact" placeholder="https://..." prepend-inner-icon="mdi-link" />
                </v-col>
                <v-col cols="12" md="2" class="d-flex align-center">
                  <v-btn icon="mdi-delete" variant="text" color="error" size="small" @click="branding.socialLinks.splice(i, 1)" />
                </v-col>
              </v-row>
              <v-btn variant="tonal" size="small" prepend-icon="mdi-plus" @click="branding.socialLinks.push({ icon: '', name: '', url: '' })" class="mb-6">Add Social Link</v-btn>

              <v-divider class="my-6" />

              <!-- Footer / Legal -->
              <div class="text-overline font-weight-bold text-slate-400 tracking-widest mb-4">FOOTER &amp; LEGAL</div>
              <v-row dense class="mb-2">
                <v-col cols="12" md="6">
                  <v-text-field v-model="branding.copyrightName" label="Copyright Name" variant="outlined" density="compact" hint="e.g. Alberta One Real Estate" persistent-hint />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model="branding.primaryColor" label="Primary Color" variant="outlined" density="compact" prepend-inner-icon="mdi-palette" hint="Hex color, e.g. #1976D2" persistent-hint />
                </v-col>
              </v-row>
              <v-row dense class="mb-2">
                <v-col cols="12" md="6">
                  <v-text-field v-model="branding.developerName" label="Developer Name" variant="outlined" density="compact" hint="'Developed by' credit in footer" persistent-hint />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model="branding.developerUrl" label="Developer URL" variant="outlined" density="compact" prepend-inner-icon="mdi-link" />
                </v-col>
              </v-row>
              <v-row dense>
                <v-col cols="12">
                  <v-textarea v-model="branding.footerDisclaimer" label="Footer Disclaimer" variant="outlined" density="compact" rows="3" hint="Legal disclaimer text shown at the bottom of every page" persistent-hint />
                </v-col>
              </v-row>
            </v-card-text>
            <v-divider />
            <v-card-actions class="p-6">
              <v-spacer />
              <v-btn variant="tonal" @click="loadBranding" :loading="brandingLoading">Reset</v-btn>
              <v-btn color="primary" variant="flat" prepend-icon="mdi-content-save" @click="saveBranding" :loading="brandingSaving" class="action-btn-primary px-8">Save Branding</v-btn>
            </v-card-actions>
          </v-card>

          <!-- ═══════ CONTENT TABLE (existing sections) ═══════ -->
          <v-card v-else class="premium-card">
            <div class="p-8 border-b border-slate-100 d-flex align-center">
              <div class="icon-orb mr-4">
                <v-icon color="primary" size="24">{{ getCurrentSection?.icon || 'mdi-file-document' }}</v-icon>
              </div>
              <h2 class="text-h6 font-weight-bold">{{ getCurrentSection?.title }}</h2>
              <v-spacer />
              <v-text-field
                v-model="search"
                append-inner-icon="mdi-magnify"
                label="Search"
                single-line
                hide-details
                variant="outlined"
                rounded="lg"
                class="max-width-300 premium-input"
                density="comfortable"
              />
            </div>

            <v-card-text class="p-0">
              <v-table class="premium-table">
                <thead>
                  <tr>
                    <th class="py-6 px-8 text-slate-400 uppercase tracking-widest text-caption font-weight-bold">Title</th>
                    <th class="py-6 text-slate-400 uppercase tracking-widest text-caption font-weight-bold">Key</th>
                    <th class="py-6 text-slate-400 uppercase tracking-widest text-caption font-weight-bold">Type</th>
                    <th class="py-6 text-slate-400 uppercase tracking-widest text-caption font-weight-bold">Status</th>
                    <th class="py-6 text-slate-400 uppercase tracking-widest text-caption font-weight-bold">Last Updated</th>
                    <th class="py-6 px-8 text-right text-slate-400 uppercase tracking-widest text-caption font-weight-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in filteredContent"
                    :key="item.id"
                    class="table-row-premium"
                  >
                    <td class="px-8 font-weight-bold text-slate-700">{{ item.title }}</td>
                    <td>
                      <code class="text-caption bg-slate-100 rounded px-2 py-1 font-mono">{{ item.key }}</code>
                    </td>
                    <td>
                      <v-chip
                        size="small"
                        :color="getTypeColor(item.type)"
                        variant="flat"
                        class="premium-chip-small"
                      >
                        {{ item.type }}
                      </v-chip>
                    </td>
                    <td>
                      <v-chip
                        size="small"
                        :color="item.published ? 'success' : 'warning'"
                        variant="flat"
                        class="premium-chip-small font-weight-bold"
                      >
                        {{ item.published ? 'Published' : 'Draft' }}
                      </v-chip>
                    </td>
                    <td class="text-slate-600 text-caption">{{ formatDateTime(item.updatedAt) }}</td>
                    <td class="text-right px-8">
                      <v-btn
                        icon="mdi-pencil"
                        variant="text"
                        size="small"
                        color="primary"
                        @click="editContent(item)"
                      />
                      <v-btn
                        :icon="item.published ? 'mdi-eye-off' : 'mdi-eye'"
                        variant="text"
                        size="small"
                        color="info"
                        @click="togglePublished(item)"
                      />
                      <v-btn
                        icon="mdi-content-copy"
                        variant="text"
                        size="small"
                        color="secondary"
                        @click="duplicateContent(item)"
                      />
                      <v-btn
                        icon="mdi-delete"
                        variant="text"
                        size="small"
                        color="error"
                        @click="deleteContent(item)"
                      />
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Add/Edit Content Dialog -->
    <v-dialog
      v-model="showAddContentDialog"
      max-width="900"
      scrollable
    >
      <v-card class="premium-card">
        <div class="p-8 bg-slate-900 text-white">
          <h2 class="text-h5 font-serif">{{ editingContent ? 'Edit Content' : 'Add New Content' }}</h2>
          <p class="text-caption text-slate-400 mb-0">Manage your website content and media</p>
        </div>
        <v-card-text class="p-8">
          <v-form v-model="isContentFormValid" @submit.prevent="saveContent">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field density="compact"
                  v-model="contentForm.title"
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
                  v-model="contentForm.key"
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
                  v-model="contentForm.section"
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
                  v-model="contentForm.type"
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
                <div v-if="contentForm.type === 'text'">
                  <v-textarea density="compact"
                    v-model="contentForm.content"
                    label="Content"
                    rows="5"
                    :rules="[v => !!v || 'Content is required']"
                    required
                    variant="outlined"
                    rounded="lg"
                    class="premium-input"
                  />
                </div>

                <div v-else-if="contentForm.type === 'html'">
                  <!-- Simple HTML Editor -->
                  <v-textarea density="compact"
                    v-model="contentForm.content"
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

                  <!-- Image uploader for About page content -->
                  <div v-if="contentForm.section === 'about'" class="mt-6">
                    <v-file-input
                      v-model="contentForm.uploadedImages"
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
                      @update:model-value="uploadAboutImages"
                    />
                    
                    <!-- Display uploaded image paths -->
                    <div v-if="contentForm.metadata?.imagePaths?.length > 0" class="mt-4">
                      <v-card class="premium-card-inner border border-slate-200">
                        <div class="p-4 border-b border-slate-100 d-flex align-center">
                          <v-icon class="mr-2" color="primary">mdi-image-multiple</v-icon>
                          <h4 class="text-subtitle-2 font-weight-bold">Available Images</h4>
                        </div>
                        <div class="pa-4">
                          <div class="text-caption mb-3 text-slate-600">Copy these paths to use in your HTML content:</div>
                          <v-list density="compact" class="bg-transparent">
                            <v-list-item
                              v-for="(imagePath, index) in contentForm.metadata.imagePaths"
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
                    <div v-if="contentForm.content" class="brand-upload-card__preview">
                      <img :src="contentForm.content" alt="Preview" class="brand-upload-card__img brand-upload-card__img--hero" />
                      <v-btn variant="text" color="error" size="x-small" icon="mdi-close-circle" class="brand-upload-card__remove" @click="contentForm.content = ''" />
                    </div>
                    <div v-else class="brand-upload-card__preview">
                      <v-icon size="48" color="grey-lighten-1">mdi-image-off-outline</v-icon>
                    </div>
                  </div>
                  <v-file-input
                    v-model="contentForm.file"
                    label="Upload new image"
                    accept="image/*"
                    show-size
                    prepend-icon=""
                    prepend-inner-icon="mdi-camera"
                    variant="outlined"
                    density="compact"
                    rounded="lg"
                    class="premium-input mb-3"
                    @update:model-value="handleContentImageUpload"
                  />
                  <v-text-field
                    v-model="contentForm.content"
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

                <div v-else-if="contentForm.key === 'testimonial'">
                  <v-text-field density="compact"
                    v-model="contentForm.metadata.author"
                    label="Author Name"
                    :rules="[v => !!v || 'Author name is required']"
                    required
                    variant="outlined"
                    rounded="lg"
                    class="premium-input mb-4"
                  />
                  <v-text-field density="compact"
                    v-model="contentForm.metadata.position"
                    label="Author Position/Company"
                    variant="outlined"
                    rounded="lg"
                    class="premium-input mb-4"
                  />
                  <v-textarea density="compact"
                    v-model="contentForm.content"
                    label="Testimonial"
                    rows="4"
                    :rules="[v => !!v || 'Testimonial content is required']"
                    required
                    variant="outlined"
                    rounded="lg"
                    class="premium-input mb-4"
                  />
                  <v-file-input
                    v-model="contentForm.file"
                    label="Author Photo"
                    accept="image/*"
                    show-size
                    prepend-icon="mdi-camera"
                    variant="outlined"
                    rounded="lg"
                    class="premium-input"
                  />
                </div>
                <div v-else-if="contentForm.key === 'why-choose-us-item'">
                  <v-text-field density="compact"
                    v-model="contentForm.metadata.icon"
                    label="Icon (mdi-*)"
                    hint="Example: mdi-home-search"
                    persistent-hint
                    variant="outlined"
                    rounded="lg"
                    class="premium-input mb-4"
                  />
                  <v-text-field density="compact"
                    v-model="contentForm.title"
                    label="Card Title"
                    :rules="[v => !!v || 'Card title is required']"
                    required
                    variant="outlined"
                    rounded="lg"
                    class="premium-input mb-4"
                  />
                  <v-textarea density="compact"
                    v-model="contentForm.content"
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
                    v-model="contentForm.content"
                    :label="contentForm.key?.replace(/-/g,' ') || 'Content'"
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
                    v-model="contentForm.published"
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
          <v-btn
            variant="text"
            @click="cancelForm"
            class="px-6"
          >
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            :loading="saving"
            :disabled="!isContentFormValid"
            @click="saveContent"
            class="action-btn-primary px-8"
          >
            {{ editingContent ? 'Save Changes' : 'Add Content' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Reusable Alert Dialog -->
    <AlertDialog
      v-model="showDialog"
      :type="alertType"
      :title="alertTitle"
      :message="alertMessage"
      :confirm-text="alertConfirmText"
      @confirm="closeAlert"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
// @ts-ignore
import { api } from '~/utils/api'

// Alert system
const { showDialog, alertType, alertTitle, alertMessage, alertConfirmText, showSuccess, showError, closeAlert } = useAlert()

const search = ref('')
const selectedSection = ref<string | null>(null)
const showAddContentDialog = ref(false)
const editingContent = ref(false)
const saving = ref(false)
const isContentFormValid = ref(false)

const contentSections = ref<any[]>([])

const pageSections = [
  { id: 'home', label: 'Home Page' },
  { id: 'about', label: 'About Us' },
  { id: 'testimonials', label: 'Testimonials' }
]

const contentTypes = [
  { title: 'Hero', value: 'hero' },
  { title: 'Hero Title', value: 'hero-title' },
  { title: 'Hero Subtitle', value: 'hero-subtitle' },
  { title: 'Why Choose Us Section', value: 'why-choose-us' },
  { title: 'Why Choose Us Item', value: 'why-choose-us-item' },
  { title: 'Text', value: 'text' },
  { title: 'HTML', value: 'html' },
  { title: 'Image', value: 'image' },
  { title: 'Testimonial', value: 'testimonial' }
]

const pageKeyOptions: Record<string, Array<{ title: string, value: string }>> = {
  home: [
    { title: 'Hero (image banner)', value: 'hero' },
    { title: 'Hero Title', value: 'hero-title' },
    { title: 'Hero Subtitle', value: 'hero-subtitle' },
    { title: 'Why Choose Us (section title)', value: 'why-choose-us' },
    { title: 'Why Choose Us Item', value: 'why-choose-us-item' }
  ],
  about: [
    { title: 'Hero Title', value: 'about.hero.title' },
    { title: 'Hero Subtitle', value: 'about.hero.subtitle' },
    { title: 'Hero Description', value: 'about.hero.description' },
    { title: 'Hero Image (profile photo)', value: 'about.hero.image' },
    { title: 'Story Title', value: 'about.story.title' },
    { title: 'Story Author Name', value: 'about.story.name' },
    { title: 'Story Author Role / Title', value: 'about.story.role' },
    { title: 'Story Content (HTML)', value: 'about.story.content' },
    { title: 'Core Value 1', value: 'about.values.1' },
    { title: 'Core Value 2', value: 'about.values.2' },
    { title: 'Core Value 3', value: 'about.values.3' },
    { title: 'Stat 1', value: 'about.stats.1' },
    { title: 'Stat 2', value: 'about.stats.2' },
    { title: 'Stat 3', value: 'about.stats.3' },
    { title: 'Stat 4', value: 'about.stats.4' },
    { title: 'Connect Heading', value: 'about.connect.heading' },
    { title: 'Connect Description', value: 'about.connect.description' },
    { title: 'CTA Area Names', value: 'about.cta.areas' },
    { title: 'CTA Title', value: 'about.cta.title' },
    { title: 'CTA Subtitle', value: 'about.cta.subtitle' },
    { title: 'CTA Background Image', value: 'about.cta.image' },
    { title: 'Meta Title (SEO)', value: 'about.meta.title' },
    { title: 'Meta Description (SEO)', value: 'about.meta.description' },
  ],
  testimonials: [
    { title: 'Testimonial Item', value: 'testimonial' }
  ]
}

const keyOptions = computed(() => pageKeyOptions[contentForm.section] || [])

const isImageContent = computed(() => {
  const key = contentForm.key || ''
  const type = contentForm.type || ''
  return type === 'image' || key === 'hero' || key === 'image' || key.endsWith('.image')
})

const contentForm = reactive<any>({
  title: '',
  key: '',
  section: 'home',
  type: 'text',
  content: '',
  published: true,
  file: null,
  uploadedImages: null,
  metadata: {
    author: '',
    position: '',
    icon: '',
    imagePaths: []
  }
})

const contentItems = ref<any[]>([])

// ═══════ Site Branding State ═══════
const branding = reactive({
  businessName: '',
  tagline: '',
  logoUrl: '',
  faviconUrl: '',
  primaryColor: '#1976D2',
  phone: '',
  email: '',
  address: '',
  city: '',
  province: '',
  postalCode: '',
  socialLinks: [] as Array<{ icon: string; name: string; url: string }>,
  brokerageName: '',
  brokerageLogoUrl: '',
  footerDisclaimer: '',
  copyrightName: '',
  developerName: '',
  developerUrl: '',
})
const logoFile = ref<File | null>(null)
const faviconFile = ref<File | null>(null)
const brokerageLogoFile = ref<File | null>(null)
const siteLogoPreview = computed(() => branding.logoUrl || '/images/logos/logo.png')
const faviconPreview = computed(() => branding.faviconUrl || '/favicon.ico')
const brandingLoading = ref(false)
const brandingSaving = ref(false)
const brandingSaved = ref(false)
const brandingError = ref('')

async function loadBranding() {
  brandingLoading.value = true
  try {
    const data: any = await api.get('/api/admin/tenant-settings')
    Object.assign(branding, {
      businessName: data.businessName || '',
      tagline: data.tagline || '',
      logoUrl: data.logoUrl || '',
      faviconUrl: data.faviconUrl || '',
      primaryColor: data.primaryColor || '#1976D2',
      phone: data.phone || '',
      email: data.email || '',
      address: data.address || '',
      city: data.city || '',
      province: data.province || '',
      postalCode: data.postalCode || '',
      socialLinks: Array.isArray(data.socialLinks) ? data.socialLinks : [],
      brokerageName: data.brokerageName || '',
      brokerageLogoUrl: data.brokerageLogoUrl || '',
      footerDisclaimer: data.footerDisclaimer || '',
      copyrightName: data.copyrightName || '',
      developerName: data.developerName || '',
      developerUrl: data.developerUrl || '',
    })
  } catch (e: any) {
    console.error('Failed to load branding:', e)
  } finally {
    brandingLoading.value = false
  }
}

async function saveBranding() {
  brandingSaving.value = true
  brandingSaved.value = false
  brandingError.value = ''
  try {
    await api.post('/api/admin/tenant-settings', { ...branding })
    brandingSaved.value = true
  } catch (e: any) {
    brandingError.value = e?.message || 'Failed to save branding'
  } finally {
    brandingSaving.value = false
  }
}

async function uploadLogo(file: File | File[] | null) {
  if (!file || Array.isArray(file)) return
  try {
    const formData = new FormData()
    formData.append('logo', file)
    const res: any = await api.post('/api/admin/tenant-settings/upload-logo', formData)
    if (res?.logoUrl) branding.logoUrl = res.logoUrl
  } catch (e: any) {
    brandingError.value = 'Failed to upload logo'
  } finally {
    logoFile.value = null
  }
}

async function uploadImageField(file: File, fieldName: string) {
  try {
    const formData = new FormData()
    formData.append('logo', file)
    const res: any = await api.post('/api/admin/tenant-settings/upload-logo', formData)
    if (res?.logoUrl) (branding as any)[fieldName] = res.logoUrl
  } catch (e: any) {
    brandingError.value = `Failed to upload ${fieldName}`
  }
}

async function uploadFavicon(file: File | File[] | null) {
  if (!file || Array.isArray(file)) return
  await uploadImageField(file, 'faviconUrl')
  faviconFile.value = null
}

async function uploadBrokerageLogo(file: File | File[] | null) {
  if (!file || Array.isArray(file)) return
  await uploadImageField(file, 'brokerageLogoUrl')
  brokerageLogoFile.value = null
}

async function handleContentImageUpload(file: File | File[] | null) {
  if (!file || Array.isArray(file)) return
  try {
    const formData = new FormData()
    formData.append('image', file)
    const res: any = await api.post('/api/admin/content/upload', formData)
    if (res?.url) contentForm.content = res.url
  } catch (e: any) {
    console.error('Image upload failed:', e)
  } finally {
    contentForm.file = null
  }
}

const getCurrentSection = computed(() => {
  return contentSections.value.find(s => s.id === selectedSection.value)
})

const filteredContent = computed(() => {
  let items = contentItems.value
  if (selectedSection.value) {
    items = items.filter(item => item.section === selectedSection.value)
  }
  if (search.value) {
    const s = search.value.toLowerCase()
    items = items.filter(item => item.title.toLowerCase().includes(s) || item.key.toLowerCase().includes(s))
  }
  return items
})

const getTypeColor = (type: string) => {
  const colors: Record<string, string> = { text: 'primary', html: 'secondary', image: 'success', testimonial: 'info' }
  return colors[type] || 'grey'
}

const formatDateTime = (date: Date | string) => new Date(date).toLocaleString()

const aboutDefaults: Array<{ key: string; title: string; type: string; content: string; metadata?: Record<string, any> }> = [
  { key: 'about.hero.title', title: 'Hero Title', type: 'text', content: 'ABOUT.' },
  { key: 'about.hero.subtitle', title: 'Hero Subtitle', type: 'text', content: "I'm passionate about innovation and driven by impact." },
  { key: 'about.hero.description', title: 'Hero Description', type: 'text', content: 'Providing excellence in real estate services with a personalized approach. Helping you navigate the journey home with safety and peace of mind.' },
  { key: 'about.hero.image', title: 'Hero Image (Profile Photo)', type: 'image', content: '/images/about/abdul.JPG' },
  { key: 'about.story.title', title: 'Story Title', type: 'text', content: 'A Realtor with a Purpose' },
  { key: 'about.story.name', title: 'Story Author Name', type: 'text', content: 'Abdul Ojulari' },
  { key: 'about.story.role', title: 'Story Author Role / Title', type: 'text', content: 'eXp Realty | Licensed REALTOR®' },
  { key: 'about.story.content', title: 'Story Content (HTML)', type: 'hero-title', content: `<p>With over 20 years of experience in the IT industry as a Senior Software Developer, I bring a strong analytical mindset and technology-driven approach to real estate. I hold multiple industry certifications, and have developed innovative software solutions for the real estate industry that simplify processes and enhance the client experience.</p><p>Now a licensed REALTOR® in Alberta specializing in residential real estate, I am passionate about helping clients feel confident, informed, and supported throughout every stage of their real estate journey. My background allows me to offer data-driven insights, clear guidance, and strategic advice so clients can make well-informed decisions.</p><p>Whether you are buying or selling, I go above and beyond to ensure your needs are clearly understood and fully represented. I believe no client should ever feel confused or pressured.</p><p>Approachable, responsive, and easy to work with, I value collaboration and continuously learn from my clients to deliver exceptional results while providing honest advice and meaningful market insights.</p>` },
  { key: 'about.values.1', title: 'Work Hard', type: 'text', content: 'My mission is to work hard to find you your forever home.', metadata: { icon: 'mdi-hammer-wrench' } },
  { key: 'about.values.2', title: 'Live Well', type: 'text', content: 'The right home is the essential ingredient needed to live well.', metadata: { icon: 'mdi-home-heart' } },
  { key: 'about.values.3', title: 'Give Back', type: 'text', content: 'When I find the right match, your new home will give back to your life.', metadata: { icon: 'mdi-hand-heart' } },
  { key: 'about.connect.heading', title: 'Connect Heading', type: 'text', content: 'Connect With Me' },
  { key: 'about.connect.description', title: 'Connect Description', type: 'text', content: 'Scan the QR code to save my contact details directly to your phone or find me on your favorite platform.' },
  { key: 'about.cta.areas', title: 'CTA Area Names', type: 'text', content: 'WINDERMERE • QUARRY RIDGE • LAKESIDE' },
  { key: 'about.cta.title', title: 'CTA Title', type: 'text', content: 'Ready to Find Your Dream Home?' },
  { key: 'about.cta.subtitle', title: 'CTA Subtitle', type: 'text', content: "Let's work together to make your real estate goals a reality in Edmonton's most prestigious communities." },
  { key: 'about.cta.image', title: 'CTA Background Image', type: 'image', content: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop' },
  { key: 'about.meta.title', title: 'Meta Title (SEO)', type: 'text', content: 'About | Real Estate Expert' },
  { key: 'about.meta.description', title: 'Meta Description (SEO)', type: 'text', content: 'Learn about your trusted real estate professional.' },
]

const seedAboutDefaults = async () => {
  const promises = aboutDefaults.map(item =>
    api.post('/api/admin/content', {
      key: item.key,
      title: item.title,
      type: item.type,
      section: 'about',
      content: item.content,
      published: true,
      metadata: { section: 'about', published: true, ...(item.metadata || {}) },
    })
  )
  await Promise.all(promises)
  const items = await api.get('/api/admin/content?section=about')
  contentItems.value = items as any[]
  const sec = contentSections.value.find(s => s.id === 'about')
  if (sec) sec.items = contentItems.value.length
}

const selectSection = async (sectionId: string) => {
  selectedSection.value = sectionId
  if (sectionId === 'branding') {
    await loadBranding()
    return
  }
  try {
    const items = await api.get(`/api/admin/content?section=${sectionId}`)
    contentItems.value = items as any[]
    const sec = contentSections.value.find(s => s.id === sectionId)
    if (sec) sec.items = contentItems.value.length
    if (sectionId === 'about' && contentItems.value.length === 0) {
      await seedAboutDefaults()
    }
  } catch (e) { console.error(e) }
}

const editContent = (item: any) => {
  editingContent.value = true
  const metadata = item.metadata || {}
  Object.assign(contentForm, { 
    ...item, 
    file: null,
    uploadedImages: null,
    metadata: {
      ...metadata,
      imagePaths: metadata.imagePaths || []
    }
  })
  showAddContentDialog.value = true
}

const togglePublished = async (item: any) => {
  try {
    await api.post(`/api/admin/content/${item.id}/toggle-published`, {})
    item.published = !item.published
  } catch (e) {
    console.error(e)
  }
}

const duplicateContent = async (item: any) => {
  try {
    const newItem = await api.post(`/api/admin/content/${item.id}/duplicate`, {})
    contentItems.value.push(newItem as any)
  } catch (e) {
    console.error(e)
  }
}

const deleteContent = async (item: any) => {
  if (!confirm('Are you sure you want to delete this content?')) return
  try {
    await api.delete(`/api/admin/content/${item.id}`)
    contentItems.value = contentItems.value.filter(i => i.id !== item.id)
  } catch (e) {
    console.error(e)
  }
}

const uploadAboutImages = async (files: File | File[] | null) => {
  if (!files) return
  
  // Normalize to array
  const fileArray = Array.isArray(files) ? files : [files]
  if (fileArray.length === 0) return
  
  try {
    const formData = new FormData()
    fileArray.forEach((file, index) => {
      formData.append(`image${index}`, file)
    })
    
    const response: any = await api.post('/api/admin/content/upload-about-images', formData)
    if (response?.images) {
      // Add new image paths to existing ones
      const existingPaths = contentForm.metadata?.imagePaths || []
      contentForm.metadata.imagePaths = [...existingPaths, ...response.images]
    }
  } catch (e) {
    console.error('Failed to upload images:', e)
    showError('Please check your internet connection and try again.', 'Failed to Upload Images')
  }
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    // You could add a toast notification here
  } catch (e) {
    console.error('Failed to copy to clipboard:', e)
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
  }
}


const resetForm = () => {
  Object.assign(contentForm, {
    title: '',
    key: '',
    section: 'home',
    type: 'text',
    content: '',
    published: true,
    file: null,
    uploadedImages: null,
    metadata: {
      author: '',
      position: '',
      icon: '',
      imagePaths: []
    }
  })
}

const cancelForm = () => {
  showAddContentDialog.value = false
  editingContent.value = false
  resetForm()
}

const openAddContentDialog = () => {
  resetForm()
  editingContent.value = false
  showAddContentDialog.value = true
}

const saveContent = async () => {
  saving.value = true
  try {
    const dataToSend = {
      title: contentForm.title,
      key: contentForm.key || contentForm.type,
      type: contentForm.type,
      section: contentForm.section,
      content: contentForm.content,
      published: contentForm.published,
      metadata: contentForm.metadata
    }
    
    const formData = new FormData()
    formData.append('data', JSON.stringify(dataToSend))
    // Upload image first if needed
    if (contentForm.file && ['hero', 'image'].includes(contentForm.key || contentForm.type)) {
      try {
        const imgForm = new FormData()
        imgForm.append('image', contentForm.file)
        const uploadRes: any = await api.post('/api/admin/content/upload', imgForm)
        if (uploadRes?.url) contentForm.content = uploadRes.url
      } catch (e) {
        console.error('Image upload failed:', e)
      }
    }

    const endpoint = editingContent.value ? `/api/admin/content/${contentForm.id}` : '/api/admin/content'
    const method = editingContent.value ? 'PUT' : 'POST'

    const saved = method === 'PUT'
      ? await api.put(endpoint, formData)
      : await api.post(endpoint, formData)

    if (editingContent.value) {
      const idx = contentItems.value.findIndex(i => i.id === (saved as any).id)
      if (idx !== -1) contentItems.value[idx] = saved as any
    } else {
      contentItems.value.push(saved as any)
    }

    showAddContentDialog.value = false
    editingContent.value = false
    resetForm()
    // reload items for current section to reflect any filters
    try {
      const items = await api.get(`/api/admin/content?section=${selectedSection.value}`)
      contentItems.value = items as any[]
    } catch {}
  } catch (e) {
    console.error('Save failed:', e)
    showError((e as any)?.message || 'Unknown error occurred', 'Save Failed')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const sections = await api.get('/api/admin/content/sections')
    const brandingSection = { id: 'branding', title: 'Site Branding', icon: 'mdi-palette-swatch', items: 0, hasUnpublished: false }
    const defaults = [
      brandingSection,
      { id: 'home', title: 'Home Page', icon: 'mdi-home', items: 0, hasUnpublished: false },
      { id: 'about', title: 'About Us', icon: 'mdi-information', items: 0, hasUnpublished: false },
      { id: 'testimonials', title: 'Testimonials', icon: 'mdi-account-voice', items: 0, hasUnpublished: false }
    ]
    const apiSections = (sections as any[])?.length ? (sections as any[]) : defaults
    contentSections.value = [brandingSection, ...apiSections.filter((s: any) => s.id !== 'branding')]

    if (!selectedSection.value && contentSections.value.length) {
      selectedSection.value = contentSections.value[0].id
    }

    if (selectedSection.value === 'branding') {
      await loadBranding()
    } else {
      await selectSection(selectedSection.value!)
    }
  } catch (e) {
    console.error('Error loading content data:', e)
    contentSections.value = [
      { id: 'branding', title: 'Site Branding', icon: 'mdi-palette-swatch', items: 0, hasUnpublished: false },
      { id: 'home', title: 'Home Page', icon: 'mdi-home', items: 0, hasUnpublished: false },
      { id: 'about', title: 'About Us', icon: 'mdi-information', items: 0, hasUnpublished: false },
      { id: 'testimonials', title: 'Testimonials', icon: 'mdi-account-voice', items: 0, hasUnpublished: false }
    ]
    selectedSection.value = 'branding'
  }
})

definePageMeta({ layout: 'admin', middleware: ['admin'] })
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@700&display=swap');

.premium-content-wrapper {
  font-family: 'Inter', sans-serif;
  letter-spacing: -0.01em;
  min-height: 100vh;
}

.font-serif {
  font-family: 'Playfair Display', serif;
}

.header-glass {
  backdrop-filter: blur(12px);
  background: rgba(255, 255, 255, 0.8) !important;
}

/* Card Styling */
.premium-card {
  background: white !important;
  border: 1px solid #E2E8F0 !important;
  border-radius: 20px !important;
  box-shadow: 0 4px 25px rgba(0, 0, 0, 0.03) !important;
  transition: transform 0.2s ease;
  overflow: hidden;
}

.premium-card:hover {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06) !important;
}

.premium-card-inner {
  background: white !important;
  border-radius: 12px !important;
  overflow: hidden;
}

.icon-orb {
  width: 48px;
  height: 48px;
  background: rgba(25, 118, 210, 0.08);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* Navigation Items */
.premium-nav-item {
  transition: all 0.2s ease;
}

.premium-nav-item:hover {
  background: #F1F5F9 !important;
}

.active-nav-item {
  background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%) !important;
  color: white !important;
}

.active-nav-item :deep(.v-list-item-title) {
  color: white !important;
}

.active-nav-item :deep(.v-icon) {
  color: white !important;
}

/* Table styling */
.premium-table :deep(th) {
  background: #F8FAFC !important;
  height: 60px !important;
  border-bottom: 1px solid #F1F5F9 !important;
  font-weight: 700 !important;
}

.premium-table :deep(td) {
  height: 60px !important;
  border-bottom: 1px solid #F8FAFC !important;
}

.table-row-premium {
  transition: background 0.15s ease;
}

.table-row-premium:hover {
  background: #F1F5F9 !important;
}

/* Inputs & Buttons */
.premium-input :deep(.v-field__outline) {
  --v-field-border-opacity: 0.1;
  border-radius: 12px !important;
}

.premium-input :deep(.v-field) {
  border-radius: 12px !important;
}

.action-btn-primary {
  background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%) !important;
  color: white !important;
  border-radius: 12px !important;
  height: 52px !important;
  font-weight: 700 !important;
  text-transform: none !important;
  letter-spacing: 0.02em !important;
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.2) !important;
  transition: all 0.2s ease !important;
}

.action-btn-primary:hover {
  box-shadow: 0 6px 20px rgba(25, 118, 210, 0.3) !important;
  transform: translateY(-1px);
}

.add-btn-premium {
  background: #10B981 !important;
  color: white !important;
  border-radius: 10px !important;
  text-transform: none !important;
  font-weight: 700 !important;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2) !important;
}

.add-btn-premium:hover {
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3) !important;
}

.premium-chip-small {
  height: 28px !important;
  font-size: 0.7rem !important;
  font-weight: 700 !important;
  border-radius: 8px !important;
}

.premium-switch :deep(.v-selection-control) {
  min-height: 40px !important;
}

/* HTML Editor */
.html-code-editor :deep(.v-field__input) {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace !important;
  font-size: 14px;
  line-height: 1.6;
  background: #F8FAFC !important;
  padding: 16px !important;
}

.html-code-editor :deep(.v-field) {
  background: #F8FAFC !important;
}

/* Utility Classes */
.bg-blue-50 {
  background: #EFF6FF !important;
}

.bg-slate-50 {
  background: #F8FAFC !important;
}

.border-slate-100 {
  border-color: #F1F5F9 !important;
}

.border-slate-200 {
  border-color: #E2E8F0 !important;
}

.border-blue-100 {
  border-color: #DBEAFE !important;
}

.text-slate-400 {
  color: #94A3B8 !important;
}

.text-slate-600 {
  color: #475569 !important;
}

.text-slate-700 {
  color: #334155 !important;
}

.text-slate-900 {
  color: #0F172A !important;
}

.rounded-lg {
  border-radius: 12px !important;
}

.rounded-xl {
  border-radius: 16px !important;
}

.tracking-wider {
  letter-spacing: 0.05em !important;
}

.tracking-widest {
  letter-spacing: 0.1em !important;
}

.font-mono {
  font-family: 'Courier New', monospace !important;
}

.hover-bg-slate-50:hover {
  background: #F8FAFC !important;
}

/* ── Brand Upload Cards ── */
.brand-upload-card {
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  padding: 16px;
  background: #F8FAFC;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.brand-upload-card__label {
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #64748B;
}

.brand-upload-card__preview {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid #E2E8F0;
  border-radius: 10px;
  padding: 12px;
  min-height: 64px;
}

.brand-upload-card__img {
  object-fit: contain;
  display: block;
}

.brand-upload-card__img--logo {
  max-height: 48px;
  max-width: 180px;
}

.brand-upload-card__img--favicon {
  max-height: 32px;
  max-width: 32px;
}

.brand-upload-card__img--hero {
  max-height: 180px;
  max-width: 100%;
  border-radius: 8px;
}

.brand-upload-card__remove {
  position: absolute !important;
  top: 4px;
  right: 4px;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.brand-upload-card__remove:hover {
  opacity: 1;
}

.max-width-300 {
  max-width: 300px;
}

.sticky {
  position: sticky;
}

.top-0 {
  top: 0;
}

.top-24 {
  top: 96px;
}

.z-50 {
  z-index: 50;
}

@media (max-width: 960px) {
  .header-glass {
    padding: 16px !important;
  }
  
  .premium-card .p-8 {
    padding: 24px !important;
  }
  
  .max-width-300 {
    max-width: 100%;
  }
}
</style>
