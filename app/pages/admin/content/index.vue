<template>
  <div class="premium-content-wrapper bg-[#F8FAFC] min-h-screen">
    <CmsHeader @add-content="openAddContentDialog" />

    <v-container fluid class="max-w-[1600px] px-8 pt-8 pb-16">
      <v-row>
        <v-col cols="12" md="3">
          <CmsSidebar
            :sections="contentSections"
            :selected-section="selectedSection"
            @select-section="selectSection"
          />
        </v-col>

        <v-col cols="12" md="9">
          <CmsBrandingPanel v-if="selectedSection === 'branding'" />
          <CmsContentTable
            v-else
            :items="filteredContent"
            :current-section="getCurrentSection"
            :search="search"
            @update:search="search = $event"
            @edit="editContent"
            @toggle-published="togglePublished"
            @duplicate="duplicateContent"
            @delete="deleteContent"
          />
        </v-col>
      </v-row>
    </v-container>

    <CmsFormDialog
      v-model="showAddContentDialog"
      :editing="editingContent"
      :saving="saving"
      :form="contentForm"
      :page-sections="pageSections"
      :content-types="contentTypes"
      :key-options="keyOptions"
      :is-image-content="isImageContent"
      @save="saveContent"
      @cancel="cancelForm"
      @upload-image="handleContentImageUpload"
      @upload-about-images="uploadAboutImages"
    />

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
import { onMounted } from 'vue'

const { showDialog, alertType, alertTitle, alertMessage, alertConfirmText, closeAlert } = useAlert()

const {
  search,
  selectedSection,
  showAddContentDialog,
  editingContent,
  saving,
  contentSections,
  contentForm,
  pageSections,
  contentTypes,
  keyOptions,
  isImageContent,
  getCurrentSection,
  filteredContent,
  openAddContentDialog,
  cancelForm,
  selectSection,
  editContent,
  togglePublished,
  duplicateContent,
  deleteContent,
  handleContentImageUpload,
  uploadAboutImages,
  saveContent,
  initialize,
} = useContentAdmin()

onMounted(() => initialize())

definePageMeta({ layout: 'admin', middleware: ['admin'] })
</script>

<style>
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

.active-nav-item .v-list-item-title {
  color: white !important;
}

.active-nav-item .v-icon {
  color: white !important;
}

/* Table styling */
.premium-table th {
  background: #F8FAFC !important;
  height: 60px !important;
  border-bottom: 1px solid #F1F5F9 !important;
  font-weight: 700 !important;
}

.premium-table td {
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
.premium-input .v-field__outline {
  --v-field-border-opacity: 0.1;
  border-radius: 12px !important;
}

.premium-input .v-field {
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

.premium-switch .v-selection-control {
  min-height: 40px !important;
}

/* HTML Editor */
.html-code-editor .v-field__input {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace !important;
  font-size: 14px;
  line-height: 1.6;
  background: #F8FAFC !important;
  padding: 16px !important;
}

.html-code-editor .v-field {
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
