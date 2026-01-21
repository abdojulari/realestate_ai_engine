<template>
  <div class="premium-help-wrapper bg-[#F8FAFC] min-h-screen">
    <!-- TOP NAVIGATION BAR (PREMIUM LOOK) -->
    <div class="header-glass sticky top-0 z-50 px-8 py-4 border-b border-slate-200 backdrop-blur-md bg-white/80">
      <div class="max-w-[1600px] mx-auto d-flex align-center">
        <div>
          <div class="flex items-center space-x-2 mb-0">
            <span class="text-[10px] uppercase tracking-[0.3em] font-bold text-primary">Documentation Center</span>
          </div>
          <h1 class="text-h4 font-serif text-slate-900 font-weight-bold">Help & Documentation</h1>
        </div>
        <v-spacer />
        <v-text-field
          v-model="searchQuery"
          append-inner-icon="mdi-magnify"
          label="Search docs..."
          single-line
          hide-details
          variant="outlined"
          rounded="lg"
          class="max-width-400 premium-input"
          density="comfortable"
        />
      </div>
    </div>

    <v-container fluid class="max-w-[1600px] px-8 pt-8 pb-16">
      <v-row>
        <!-- LEFT SIDEBAR: Categories -->
        <v-col cols="12" md="3">
          <v-card class="premium-card sticky top-24">
            <div class="p-6 border-b border-slate-100">
              <h3 class="text-subtitle-2 font-weight-bold text-slate-400 uppercase tracking-widest">Categories</h3>
            </div>
            <v-list nav class="p-2">
              <v-list-item
                v-for="category in categories"
                :key="category.id"
                :value="category"
                :active="selectedCategory === category.id"
                @click="selectedCategory = category.id"
                class="rounded-lg mb-1 premium-nav-item"
                :class="{ 'active-nav-item': selectedCategory === category.id }"
              >
                <template v-slot:prepend>
                  <v-icon :icon="category.icon" class="mr-3" />
                </template>
                <v-list-item-title class="font-weight-bold">{{ category.title }}</v-list-item-title>
                <template v-slot:append>
                  <v-chip
                    size="x-small"
                    color="primary"
                    variant="flat"
                    class="premium-chip-mini"
                  >
                    {{ category.count }}
                  </v-chip>
                </template>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>

        <!-- MAIN CONTENT AREA -->
        <v-col cols="12" md="9">
          <!-- Quick Start Guide -->
          <v-card v-if="selectedCategory === 'getting-started'" class="premium-card mb-8">
            <div class="p-8 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-purple-50">
              <div class="d-flex align-center">
                <div class="icon-orb mr-4">
                  <v-icon color="primary" size="32">mdi-rocket-launch</v-icon>
                </div>
                <div>
                  <h2 class="text-h5 font-serif font-weight-bold mb-1">Getting Started</h2>
                  <p class="text-caption text-slate-600 mb-0">Learn the basics and get up to speed quickly</p>
                </div>
              </div>
            </div>
            <v-card-text class="p-8">
              <div class="doc-content">
                <h3 class="text-h6 font-weight-bold mb-4">Welcome to the Admin Dashboard!</h3>
                
                <p class="mb-6">This comprehensive guide will help you navigate and utilize all features of the admin panel effectively.</p>
                
                <v-alert type="info" variant="tonal" class="mb-6" rounded="lg">
                  <strong>Tip:</strong> Use the search bar above to quickly find specific topics or features.
                </v-alert>

                <h4 class="text-subtitle-1 font-weight-bold mb-3">Quick Navigation</h4>
                <v-list class="mb-6 bg-slate-50 rounded-xl">
                  <v-list-item
                    v-for="item in quickStartItems"
                    :key="item.title"
                    :prepend-icon="item.icon"
                    :title="item.title"
                    :subtitle="item.description"
                    class="doc-list-item"
                  />
                </v-list>

                <h4 class="text-subtitle-1 font-weight-bold mb-3">Key Features</h4>
                <div class="features-grid mb-6">
                  <div v-for="feature in keyFeatures" :key="feature.title" class="feature-card">
                    <v-icon :icon="feature.icon" color="primary" size="32" class="mb-3" />
                    <h5 class="text-subtitle-2 font-weight-bold mb-2">{{ feature.title }}</h5>
                    <p class="text-caption text-slate-600 mb-0">{{ feature.description }}</p>
                  </div>
                </div>
              </div>
            </v-card-text>
          </v-card>

          <!-- Dashboard Guide -->
          <v-card v-if="selectedCategory === 'dashboard'" class="premium-card mb-8">
            <div class="p-8 border-b border-slate-100 d-flex align-center">
              <div class="icon-orb mr-4">
                <v-icon color="primary" size="24">mdi-view-dashboard</v-icon>
              </div>
              <h2 class="text-h6 font-weight-bold">Dashboard Overview</h2>
            </div>
            <v-card-text class="p-8">
              <div class="doc-content">
                <p class="mb-6">The dashboard provides a comprehensive overview of your system's key metrics and activities.</p>
                
                <h4 class="text-subtitle-1 font-weight-bold mb-3">Dashboard Sections</h4>
                <v-expansion-panels class="premium-expansion mb-6">
                  <v-expansion-panel
                    v-for="section in dashboardSections"
                    :key="section.title"
                    class="premium-panel"
                  >
                    <v-expansion-panel-title class="font-weight-bold">
                      <v-icon start :icon="section.icon" />
                      {{ section.title }}
                    </v-expansion-panel-title>
                    <v-expansion-panel-text class="pt-4">
                      {{ section.description }}
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                </v-expansion-panels>
              </div>
            </v-card-text>
          </v-card>

          <!-- User Management -->
          <v-card v-if="selectedCategory === 'users'" class="premium-card mb-8">
            <div class="p-8 border-b border-slate-100 d-flex align-center">
              <div class="icon-orb mr-4">
                <v-icon color="primary" size="24">mdi-account-group</v-icon>
              </div>
              <h2 class="text-h6 font-weight-bold">User Management</h2>
            </div>
            <v-card-text class="p-8">
              <div class="doc-content">
                <p class="mb-6">Manage user accounts, roles, and permissions efficiently.</p>
                
                <h4 class="text-subtitle-1 font-weight-bold mb-3">User Actions</h4>
                <v-list class="mb-6 bg-slate-50 rounded-xl">
                  <v-list-item prepend-icon="mdi-account-plus" title="Create New User" subtitle="Add new users to the system with specific roles" />
                  <v-list-item prepend-icon="mdi-pencil" title="Edit User Details" subtitle="Update user information and permissions" />
                  <v-list-item prepend-icon="mdi-lock-reset" title="Reset Password" subtitle="Send password reset links to users" />
                  <v-list-item prepend-icon="mdi-account-off" title="Deactivate Account" subtitle="Temporarily disable user access" />
                </v-list>

                <v-alert type="warning" variant="tonal" rounded="lg">
                  <strong>Important:</strong> Only administrators can manage user roles and permissions.
                </v-alert>
              </div>
            </v-card-text>
          </v-card>

          <!-- Properties Management -->
          <v-card v-if="selectedCategory === 'properties'" class="premium-card mb-8">
            <div class="p-8 border-b border-slate-100 d-flex align-center">
              <div class="icon-orb mr-4">
                <v-icon color="primary" size="24">mdi-home-group</v-icon>
              </div>
              <h2 class="text-h6 font-weight-bold">Property Management</h2>
            </div>
            <v-card-text class="p-8">
              <div class="doc-content">
                <p class="mb-6">Manage property listings, synchronization, and details.</p>
                
                <h4 class="text-subtitle-1 font-weight-bold mb-3">CREA MLS Integration</h4>
                <p class="mb-4">The system integrates with CREA DDF® to automatically sync property listings.</p>
                
                <v-stepper :items="['Connect API', 'Configure Sync', 'Monitor Status', 'Manage Listings']" class="mb-6" />
                
                <h4 class="text-subtitle-1 font-weight-bold mb-3">Property Features</h4>
                <div class="features-grid mb-6">
                  <div class="feature-card">
                    <v-icon icon="mdi-sync" color="primary" size="28" class="mb-2" />
                    <h5 class="text-caption font-weight-bold">Auto Sync</h5>
                    <p class="text-caption text-slate-600 mb-0">Automatic synchronization</p>
                  </div>
                  <div class="feature-card">
                    <v-icon icon="mdi-filter" color="primary" size="28" class="mb-2" />
                    <h5 class="text-caption font-weight-bold">Advanced Filters</h5>
                    <p class="text-caption text-slate-600 mb-0">Filter by multiple criteria</p>
                  </div>
                  <div class="feature-card">
                    <v-icon icon="mdi-image-multiple" color="primary" size="28" class="mb-2" />
                    <h5 class="text-caption font-weight-bold">Media Gallery</h5>
                    <p class="text-caption text-slate-600 mb-0">Manage property images</p>
                  </div>
                </div>
              </div>
            </v-card-text>
          </v-card>

          <!-- Content Management -->
          <v-card v-if="selectedCategory === 'content'" class="premium-card mb-8">
            <div class="p-8 border-b border-slate-100 d-flex align-center">
              <div class="icon-orb mr-4">
                <v-icon color="primary" size="24">mdi-file-document</v-icon>
              </div>
              <h2 class="text-h6 font-weight-bold">Content Management</h2>
            </div>
            <v-card-text class="p-8">
              <div class="doc-content">
                <p class="mb-6">Create and manage website content including pages, blog posts, and media.</p>
                
                <h4 class="text-subtitle-1 font-weight-bold mb-3">Content Types</h4>
                <v-list class="mb-6 bg-slate-50 rounded-xl">
                  <v-list-item prepend-icon="mdi-text" title="Text Content" subtitle="Simple text entries for headlines and descriptions" />
                  <v-list-item prepend-icon="mdi-code-tags" title="HTML Content" subtitle="Rich HTML content with full formatting" />
                  <v-list-item prepend-icon="mdi-image" title="Images" subtitle="Upload and manage images" />
                  <v-list-item prepend-icon="mdi-account-voice" title="Testimonials" subtitle="Customer testimonials and reviews" />
                </v-list>

                <v-alert type="success" variant="tonal" rounded="lg">
                  <strong>Pro Tip:</strong> Use the HTML editor for advanced formatting and styling options.
                </v-alert>
              </div>
            </v-card-text>
          </v-card>

          <!-- Settings & Configuration -->
          <v-card v-if="selectedCategory === 'settings'" class="premium-card mb-8">
            <div class="p-8 border-b border-slate-100 d-flex align-center">
              <div class="icon-orb mr-4">
                <v-icon color="primary" size="24">mdi-cog</v-icon>
              </div>
              <h2 class="text-h6 font-weight-bold">Settings & Configuration</h2>
            </div>
            <v-card-text class="p-8">
              <div class="doc-content">
                <p class="mb-6">Configure system settings, API integrations, and security options.</p>
                
                <h4 class="text-subtitle-1 font-weight-bold mb-3">Configuration Sections</h4>
                <v-expansion-panels class="premium-expansion">
                  <v-expansion-panel class="premium-panel">
                    <v-expansion-panel-title class="font-weight-bold">
                      <v-icon start icon="mdi-cog" />
                      General Settings
                    </v-expansion-panel-title>
                    <v-expansion-panel-text class="pt-4">
                      Configure site name, support email, timezone, and upload site logo.
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                  
                  <v-expansion-panel class="premium-panel">
                    <v-expansion-panel-title class="font-weight-bold">
                      <v-icon start icon="mdi-email" />
                      Email Settings
                    </v-expansion-panel-title>
                    <v-expansion-panel-text class="pt-4">
                      Set up SMTP configuration, email templates, and notification preferences.
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                  
                  <v-expansion-panel class="premium-panel">
                    <v-expansion-panel-title class="font-weight-bold">
                      <v-icon start icon="mdi-api" />
                      API Integration
                    </v-expansion-panel-title>
                    <v-expansion-panel-text class="pt-4">
                      Manage API keys for CREA DDF®, Google Maps, and other third-party services.
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                  
                  <v-expansion-panel class="premium-panel">
                    <v-expansion-panel-title class="font-weight-bold">
                      <v-icon start icon="mdi-shield" />
                      Security Settings
                    </v-expansion-panel-title>
                    <v-expansion-panel-text class="pt-4">
                      Configure session timeout, password policies, two-factor authentication, and IP whitelisting.
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                </v-expansion-panels>
              </div>
            </v-card-text>
          </v-card>

          <!-- FAQs -->
          <v-card v-if="selectedCategory === 'faq'" class="premium-card mb-8">
            <div class="p-8 border-b border-slate-100 d-flex align-center">
              <div class="icon-orb mr-4">
                <v-icon color="primary" size="24">mdi-frequently-asked-questions</v-icon>
              </div>
              <h2 class="text-h6 font-weight-bold">Frequently Asked Questions</h2>
            </div>
            <v-card-text class="p-8">
              <div class="doc-content">
                <v-expansion-panels class="premium-expansion">
                  <v-expansion-panel
                    v-for="faq in faqs"
                    :key="faq.question"
                    class="premium-panel"
                  >
                    <v-expansion-panel-title class="font-weight-bold">
                      {{ faq.question }}
                    </v-expansion-panel-title>
                    <v-expansion-panel-text class="pt-4">
                      {{ faq.answer }}
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                </v-expansion-panels>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const searchQuery = ref('')
const selectedCategory = ref('getting-started')

const categories = [
  { id: 'getting-started', title: 'Getting Started', icon: 'mdi-rocket-launch', count: 5 },
  { id: 'dashboard', title: 'Dashboard', icon: 'mdi-view-dashboard', count: 8 },
  { id: 'users', title: 'User Management', icon: 'mdi-account-group', count: 6 },
  { id: 'properties', title: 'Properties', icon: 'mdi-home-group', count: 12 },
  { id: 'content', title: 'Content', icon: 'mdi-file-document', count: 7 },
  { id: 'settings', title: 'Settings', icon: 'mdi-cog', count: 10 },
  { id: 'faq', title: 'FAQ', icon: 'mdi-frequently-asked-questions', count: 15 }
]

const quickStartItems = [
  { title: 'Dashboard Overview', description: 'Learn about key metrics and statistics', icon: 'mdi-view-dashboard' },
  { title: 'Managing Users', description: 'Add, edit, and remove user accounts', icon: 'mdi-account-group' },
  { title: 'Property Listings', description: 'Sync and manage property data', icon: 'mdi-home-group' },
  { title: 'Content Management', description: 'Create and edit website content', icon: 'mdi-file-document' },
  { title: 'System Settings', description: 'Configure system preferences', icon: 'mdi-cog' }
]

const keyFeatures = [
  { title: 'Real-time Sync', description: 'Automatic data synchronization with CREA DDF®', icon: 'mdi-sync' },
  { title: 'User Roles', description: 'Flexible permission and role management', icon: 'mdi-shield-account' },
  { title: 'Analytics', description: 'Comprehensive reports and insights', icon: 'mdi-chart-line' },
  { title: 'Security', description: 'Enterprise-grade security features', icon: 'mdi-lock' }
]

const dashboardSections = [
  { title: 'Statistics Cards', description: 'View total users, properties, and system metrics at a glance.', icon: 'mdi-chart-box' },
  { title: 'Recent Activity', description: 'Monitor latest user activities and system events in real-time.', icon: 'mdi-history' },
  { title: 'Quick Actions', description: 'Access frequently used actions directly from the dashboard.', icon: 'mdi-lightning-bolt' },
  { title: 'Charts & Graphs', description: 'Visual representations of trends and data over time.', icon: 'mdi-chart-line' }
]

const faqs = [
  { 
    question: 'How do I sync properties from CREA DDF®?', 
    answer: 'Navigate to Settings > CREA MLS Data Sync, configure your API credentials, and click "Sync Now". You can also enable automatic daily synchronization.' 
  },
  { 
    question: 'Can I customize email templates?', 
    answer: 'Yes! Go to Settings > Email Settings > Email Templates. You can edit subject lines, content, and use dynamic variables.' 
  },
  { 
    question: 'How do I reset a user\'s password?', 
    answer: 'Go to Users, find the user, click the three-dot menu, and select "Reset Password". An email will be sent to the user with reset instructions.' 
  },
  { 
    question: 'What file formats are supported for uploads?', 
    answer: 'Images: JPG, PNG, GIF, WEBP. Documents: PDF, DOC, DOCX. Maximum file size is 10MB per file.' 
  },
  { 
    question: 'How do I enable two-factor authentication?', 
    answer: 'Go to your Profile > Quick Actions > Two-Factor Auth. Follow the on-screen instructions to set up 2FA using an authenticator app.' 
  },
  { 
    question: 'Can I export user data?', 
    answer: 'Yes. Navigate to Reports > Users, select the filters you need, and click "Export to CSV" to download the data.' 
  },
  { 
    question: 'How often does the system backup data?', 
    answer: 'Automatic backups run daily at 2:00 AM server time. You can also trigger manual backups from Settings > System.' 
  },
  { 
    question: 'What browsers are supported?', 
    answer: 'Modern versions of Chrome, Firefox, Safari, and Edge are fully supported. Internet Explorer is not supported.' 
  }
]

definePageMeta({
  layout: 'admin',
  middleware: ['admin']
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@700&display=swap');

.premium-help-wrapper {
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

/* Features Grid */
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.feature-card {
  padding: 24px;
  background: #F8FAFC;
  border: 1px solid #F1F5F9;
  border-radius: 16px;
  text-align: center;
  transition: all 0.2s ease;
}

.feature-card:hover {
  background: white;
  border-color: #CBD5E1;
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

/* Documentation Content */
.doc-content {
  font-size: 0.95rem;
  line-height: 1.7;
  color: #475569;
}

.doc-content h3,
.doc-content h4,
.doc-content h5 {
  color: #1E293B;
}

.doc-content p {
  margin-bottom: 1rem;
}

.doc-list-item {
  margin-bottom: 4px;
  border-radius: 8px;
}

/* Expansion Panels */
.premium-expansion :deep(.v-expansion-panel) {
  border-radius: 12px !important;
  margin-bottom: 12px !important;
  border: 1px solid #E2E8F0 !important;
}

.premium-expansion :deep(.v-expansion-panel-title) {
  padding: 20px 24px !important;
  border-radius: 12px !important;
}

.premium-panel {
  background: white !important;
}

/* Input Styling */
.premium-input :deep(.v-field__outline) {
  --v-field-border-opacity: 0.1;
  border-radius: 12px !important;
}

.premium-input :deep(.v-field) {
  border-radius: 12px !important;
}

.premium-chip-mini {
  height: 20px !important;
  font-size: 0.65rem !important;
  font-weight: 700 !important;
  border-radius: 6px !important;
}

/* Utility Classes */
.bg-slate-50 {
  background: #F8FAFC !important;
}

.border-slate-100 {
  border-color: #F1F5F9 !important;
}

.border-slate-200 {
  border-color: #E2E8F0 !important;
}

.text-slate-600 {
  color: #475569 !important;
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

.max-width-400 {
  max-width: 400px;
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
  
  .features-grid {
    grid-template-columns: 1fr;
  }
  
  .max-width-400 {
    max-width: 100%;
  }
}
</style>

