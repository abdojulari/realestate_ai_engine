<template>
  <div class="home-estimate-page">
    <!-- Premium Cinematic Hero -->
    <section class="hero-header relative overflow-hidden">
      <v-img 
        class="hero-img"
        height="450" 
        cover 
        src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2000&auto=format&fit=crop" 
        gradient="to bottom, rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.9)"
      >
        <v-container class="fill-height">
          <v-row align="center" justify="center">
            <v-col cols="12" md="10" lg="8" class="text-center">
              <v-chip
                color="primary"
                variant="flat"
                size="small"
                class="mb-6 px-6 py-4 text-uppercase tracking-widest font-weight-black shadow-lg"
              >
                Valuation Intelligence
              </v-chip>
              <h1 class="premium-display text-h3 text-md-h2 text-white mb-6">
                Discover Your Home's <span class="text-italic font-weight-light">True Market Potential</span>
              </h1>
              <p class="text-h6 text-white opacity-80 max-w-800 mx-auto font-weight-light leading-relaxed">
                Receive a sophisticated valuation informed by real-time market dynamics and local architectural trends.
              </p>
            </v-col>
          </v-row>
        </v-container>
      </v-img>
      
      <!-- Overlapping Stats Bar -->
      <div class="stats-bar-wrapper">
        <v-container>
          <v-card class="stats-glass shadow-2xl pa-6 rounded-xl">
            <v-row>
              <v-col cols="4" class="text-center border-e">
                <div class="text-h5 font-weight-black">98%</div>
                <div class="text-caption text-uppercase text-grey">Accuracy Rate</div>
              </v-col>
              <v-col cols="4" class="text-center border-e">
                <div class="text-h5 font-weight-black">2.4k</div>
                <div class="text-caption text-uppercase text-grey">Monthly Estimates</div>
              </v-col>
              <v-col cols="4" class="text-center">
                <div class="text-h5 font-weight-black">&lt; 24h</div>
                <div class="text-caption text-uppercase text-grey">Expert Review</div>
              </v-col>
            </v-row>
          </v-card>
        </v-container>
      </div>
    </section>

    <!-- Main Experience Section -->
    <v-container class="mt-16 pb-16">
      <v-row justify="center">
        <!-- The Evaluation Form -->
        <v-col cols="12" lg="8">
          <v-card class="form-container-card" elevation="0">
            <div class="d-flex align-center justify-space-between mb-8">
              <div>
                <h2 class="text-h4 font-weight-bold tracking-tight">Step {{ currentStep }} of 3</h2>
                <div class="step-indicator-bar mt-2">
                  <div class="indicator-fill" :style="{ width: progress + '%' }"></div>
                </div>
              </div>
              <v-avatar color="grey-lighten-4" size="56">
                <v-icon color="black">{{ getStepIcon() }}</v-icon>
              </v-avatar>
            </div>

            <v-window v-model="currentStep">
              <!-- Step 1: Property Details -->
              <v-window-item :value="1">
                <div class="step-content">
                  <h3 class="text-h5 font-weight-bold mb-6">Where is your property located?</h3>
                  <v-form v-model="forms.propertyDetails.valid">
                    <v-row>
                      <v-col cols="12">
                        <v-text-field
                          v-model="forms.propertyDetails.address"
                          label="Street Address"
                          placeholder="e.g. 123 Luxury Lane"
                          variant="underlined"
                          class="premium-input"
                          :rules="[v => !!v || 'Required']"
                        />
                      </v-col>
                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model="forms.propertyDetails.postalCode"
                          label="Postal Code"
                          variant="underlined"
                          class="premium-input"
                          :rules="[v => !!v || 'Required']"
                        />
                      </v-col>
                      <v-col cols="12" md="6">
                        <v-select
                          v-model="forms.propertyDetails.propertyType"
                          :items="propertyTypes"
                          label="Residence Type"
                          variant="underlined"
                          class="premium-input"
                        />
                      </v-col>
                      <v-col cols="12" md="4">
                        <v-text-field
                          v-model.number="forms.propertyDetails.beds"
                          type="number"
                          label="Beds"
                          variant="underlined"
                          prepend-inner-icon="mdi-bed-outline"
                        />
                      </v-col>
                      <v-col cols="12" md="4">
                        <v-text-field
                          v-model.number="forms.propertyDetails.baths"
                          type="number"
                          label="Baths"
                          variant="underlined"
                          prepend-inner-icon="mdi-shower-outline"
                        />
                      </v-col>
                      <v-col cols="12" md="4">
                        <v-text-field
                          v-model.number="forms.propertyDetails.sqft"
                          type="number"
                          label="Living Area (sqft)"
                          variant="underlined"
                          prepend-inner-icon="mdi-ruler-square"
                        />
                      </v-col>
                      <v-col cols="12" md="4">
                        <v-text-field
                          v-model.number="forms.propertyDetails.yearBuilt"
                          type="number"
                          label="Year Built"
                          variant="underlined"
                          prepend-inner-icon="mdi-calendar"
                          :rules="yearBuiltRules"
                        />
                      </v-col>
                      <v-col cols="12" md="8">
                        <v-text-field
                          v-model="forms.propertyDetails.lotSize"
                          label="Lot Size"
                          variant="underlined"
                          placeholder="e.g. 40 x 120 ft"
                          :rules="lotSizeRules"
                        />
                      </v-col>
                    </v-row>
                  </v-form>
                </div>
              </v-window-item>

              <!-- Step 2: Features -->
              <v-window-item :value="2">
                <div class="step-content">
                  <h3 class="text-h5 font-weight-bold mb-6">Describe the character of your home</h3>
                  <v-form v-model="forms.features.valid">
                    <v-row>
                      <v-col cols="12">
                        <div class="text-overline mb-2">Overall Condition</div>
                        <v-chip-group v-model="forms.features.condition" mandatory color="primary" selected-class="font-weight-bold">
                          <v-chip v-for="c in propertyConditions" :key="c.value" :value="c.value" variant="outlined" filter>
                            {{ c.title }}
                          </v-chip>
                        </v-chip-group>
                      </v-col>
                      <v-col cols="12">
                        <v-select
                          v-model="forms.features.selectedFeatures"
                          :items="availableFeatures"
                          label="Highlight Features"
                          multiple
                          chips
                          variant="underlined"
                        />
                      </v-col>
                      <v-col cols="12">
                        <v-textarea
                          v-model="forms.features.additionalInfo"
                          label="Tell us what makes it unique"
                          placeholder="e.g. Recently renovated kitchen, mountain views..."
                          variant="underlined"
                          rows="3"
                        />
                      </v-col>
                    </v-row>
                  </v-form>
                </div>
              </v-window-item>

              <!-- Step 3: Contact -->
              <v-window-item :value="3">
                <div class="step-content">
                  <h3 class="text-h5 font-weight-bold mb-6">Where should we send your report?</h3>
                  <v-form v-model="forms.contact.valid">
                    <v-row>
                      <v-col cols="12" md="6">
                        <v-text-field v-model="forms.contact.firstName" label="First Name" variant="underlined" />
                      </v-col>
                      <v-col cols="12" md="6">
                        <v-text-field v-model="forms.contact.lastName" label="Last Name" variant="underlined" />
                      </v-col>
                      <v-col cols="12">
                        <v-text-field v-model="forms.contact.email" label="Professional Email" type="email" variant="underlined" />
                      </v-col>
                      <v-col cols="12">
                        <v-text-field
                          v-model="forms.contact.phone"
                          label="Phone Number"
                          variant="underlined"
                          :rules="phoneRules"
                        />
                      </v-col>
                      <v-col cols="12">
                        <v-select v-model="forms.contact.timeframe" :items="sellingTimeframes" label="Selling Intent" variant="underlined" />
                      </v-col>
                    </v-row>
                  </v-form>
                </div>
              </v-window-item>
            </v-window>

            <!-- Custom Navigation -->
            <div class="d-flex align-center mt-12 pt-6 border-t">
              <v-btn
                v-if="currentStep > 1"
                variant="text"
                color="grey-darken-2"
                size="large"
                class="text-none font-weight-bold"
                @click="currentStep--"
              >
                Back
              </v-btn>
              <v-spacer />
              <v-btn
                v-if="currentStep < 3"
                color="black"
                size="x-large"
                class="text-none px-12 font-weight-bold"
                rounded="pill"
                @click="currentStep++"
                :disabled="isStepInvalid"
              >
                Continue
                <v-icon end icon="mdi-arrow-right" size="small" class="ml-2" />
              </v-btn>
              <v-btn
                v-else
                color="primary"
                size="x-large"
                class="text-none px-12 font-weight-bold"
                rounded="pill"
                @click="submitEstimate"
                :loading="submitting"
                :disabled="!forms.contact.valid"
              >
                Generate Estimate
              </v-btn>
            </div>
          </v-card>
        </v-col>

        <!-- Sidebar Guidance -->
        <v-col cols="12" lg="4">
          <v-card class="sidebar-guide rounded-xl pa-8 mb-6" variant="tonal" color="blue-grey-lighten-5">
            <h4 class="text-h6 font-weight-black mb-4 d-flex align-center text-black">
              <v-icon icon="mdi-shield-check-outline" class="mr-2" size="24" />
              Expert Assurance
            </h4>
            <p class="text-body-2 text-medium-emphasis mb-6">
              Our algorithm provides the baseline, but our local Alberta experts provide the truth. Every request is reviewed by a human professional to ensure accuracy.
            </p>
            
            <div class="d-flex flex-column gap-4">
              <div class="guide-item d-flex gap-4">
                <v-icon icon="mdi-chart-areaspline" color="primary" />
                <div class="text-caption text-grey">Real-time local sales data integration.</div>
              </div>
              <div class="guide-item d-flex gap-4">
                <v-icon icon="mdi-camera-outline" color="primary" />
                <div class="text-caption text-grey">Virtual assessment options available.</div>
              </div>
            </div>
          </v-card>

          <v-card class="agent-card rounded-xl overflow-hidden shadow-lg">
            <v-img src="/images/about/abdul.JPG" height="200" cover />
            <v-card-text class="pa-6">
              <div class="text-overline text-primary mb-1">Local Lead Expert</div>
              <div class="text-h6 font-weight-bold mb-1">Abdul Ojulari</div>
              <p class="text-body-2 text-grey mb-4">"I'll personally review your property details to give you the most accurate valuation in today's market."</p>
              <v-btn variant="outlined" block class="text-none" @click="showProcessDialog = true">
                Learn about my process
              </v-btn>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Valuation Process Modal -->
    <v-dialog v-model="showProcessDialog" max-width="700" scrollable transition="dialog-bottom-transition">
      <v-card class="rounded-xl overflow-hidden">
        <v-toolbar color="white" flat class="border-b px-4">
          <v-toolbar-title class="font-weight-black">The Ojulari Methodology</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" @click="showProcessDialog = false"></v-btn>
        </v-toolbar>
        
        <v-card-text class="pa-8 bg-grey-lighten-5">
          <div v-for="(step, index) in valuationProcess" :key="index" class="mb-8 d-flex gap-6">
            <div class="d-flex flex-column align-center">
              <v-avatar color="primary" size="40" class="text-white font-weight-bold">
                {{ index + 1 }}
              </v-avatar>
              <div v-if="index < valuationProcess.length - 1" class="process-line mt-2"></div>
            </div>
            <div>
              <h4 class="text-h6 font-weight-bold mb-2">{{ step.title }}</h4>
              <p class="text-body-2 text-medium-emphasis">{{ step.description }}</p>
            </div>
          </div>
        </v-card-text>
        
        <v-card-actions class="pa-6 bg-white border-t">
          <v-btn block color="black" size="large" rounded="pill" class="text-none" @click="showProcessDialog = false">
            Understood
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Success Modal -->
    <v-dialog v-model="showSuccessDialog" max-width="600" transition="scale-transition">
      <v-card class="rounded-xl pa-8 text-center">
        <v-avatar color="success" size="80" class="mb-6 mx-auto elevation-10">
          <v-icon color="white" size="40">mdi-check-all</v-icon>
        </v-avatar>
        <h2 class="text-h4 font-weight-black mb-4">Request Confirmed</h2>
        <p class="text-body-1 text-medium-emphasis mb-8">
          A bespoke valuation report is being prepared for you. Abdul and the team will contact you at <strong>{{ forms.contact.email }}</strong> within one business day.
        </p>
        <v-btn color="black" block size="x-large" rounded="pill" class="text-none font-weight-bold" @click="showSuccessDialog = false">
          Back to Dashboard
        </v-btn>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'

const currentStep = ref(1)
const progress = computed(() => (currentStep.value / 3) * 100)
const submitting = ref(false)
const showSuccessDialog = ref(false)
const showProcessDialog = ref(false)

const forms = reactive({
  propertyDetails: { valid: false, address: '', postalCode: '', propertyType: 'single_family', beds: 3, baths: 2, sqft: 1500, yearBuilt: 2000, lotSize: '' },
  features: { valid: false, condition: 'good', selectedFeatures: [], additionalInfo: '' },
  contact: { valid: false, firstName: '', lastName: '', email: '', phone: '', timeframe: '3_months' }
})

const valuationProcess = [
  {
    title: 'Data Aggregation',
    description: 'We pull live transaction data from local MLS records, public land titles, and private boutique sales to build a comprehensive data foundation.'
  },
  {
    title: 'Architectural Analysis',
    description: 'Our team evaluates the specific aesthetic and functional upgrades of your home that automated algorithms often miss, such as custom millwork or smart infrastructure.'
  },
  {
    title: 'Hyper-Local Benchmarking',
    description: 'We compare your home only against properties within your specific micro-neighborhood, adjusting for street-level desirability and recent appreciation trends.'
  },
  {
    title: 'Human Calibration',
    description: 'Abdul Ojulari personally reviews every data point, applying professional intuition to account for current buyer sentiment and market momentum.'
  }
]

const isStepInvalid = computed(() => {
  if (currentStep.value === 1) return !forms.propertyDetails.valid
  if (currentStep.value === 2) return !forms.features.valid
  return false
})

const getStepIcon = () => {
  if (currentStep.value === 1) return 'mdi-map-marker-radius'
  if (currentStep.value === 2) return 'mdi-sparkles'
  return 'mdi-account-star'
}

const propertyTypes = [
  { title: 'Single Family Home', value: 'single_family' },
  { title: 'Modern Townhouse', value: 'townhouse' },
  { title: 'Luxury Condo', value: 'condo' }
]

const currentYear = new Date().getFullYear()
const yearBuiltRules = [
  (v: number) => !!v || 'Required',
  (v: number) => v >= 1800 && v <= currentYear || `Year must be between 1800 and ${currentYear}`
]
const lotSizeRules = [(v: string) => !!v || 'Required']
const phoneRules = [(v: string) => !!v || 'Required']

const propertyConditions = [
  { title: 'Pristine', value: 'excellent' },
  { title: 'Well Maintained', value: 'good' },
  { title: 'Modernized', value: 'renovated' },
  { title: 'Value Add', value: 'needs_work' }
]

const availableFeatures = ['Finished Basement', 'Double Garage', 'Smart Home', 'Gourmet Kitchen', 'City Views', 'Landscaped Garden']

const sellingTimeframes = [
  { title: 'ASAP', value: 'immediate' },
  { title: '1-3 Months', value: '3_months' },
  { title: 'Just Curious', value: 'exploring' }
]

const submitEstimate = async () => {
  submitting.value = true
  try {
    await $fetch('/api/estimates', {
      method: 'POST',
      body: {
        property: {
          address: forms.propertyDetails.address,
          postalCode: forms.propertyDetails.postalCode,
          propertyType: forms.propertyDetails.propertyType,
          beds: forms.propertyDetails.beds,
          baths: forms.propertyDetails.baths,
          sqft: forms.propertyDetails.sqft,
          yearBuilt: forms.propertyDetails.yearBuilt,
          lotSize: forms.propertyDetails.lotSize
        },
        features: {
          condition: forms.features.condition,
          selectedFeatures: forms.features.selectedFeatures,
          renovations: [],
          additionalInfo: forms.features.additionalInfo
        },
        contact: {
          firstName: forms.contact.firstName,
          lastName: forms.contact.lastName,
          email: forms.contact.email,
          phone: forms.contact.phone,
          timeframe: forms.contact.timeframe,
          contactPreference: false
        }
      }
    })
    showSuccessDialog.value = true
  } catch (error) {
    console.error('Estimate submission failed:', error)
    alert('Failed to submit estimate. Please try again.')
  } finally {
    submitting.value = false
  }
}

definePageMeta({ layout: 'default' })
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Inter:wght@300;400;600;800&display=swap');

.home-estimate-page {
  font-family: 'Inter', sans-serif;
  background-color: #ffffff;
}

.premium-display {
  font-family: 'Playfair Display', serif;
}

.hero-header {
  position: relative;
}

.hero-img {
  z-index: 0;
}

.stats-bar-wrapper {
  margin-top: -60px;
  position: relative;
  z-index: 2;
}

.stats-glass {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.5);
}

.form-container-card {
  padding: 40px;
  background: #fff;
}

.step-indicator-bar {
  width: 240px;
  height: 4px;
  background: #f1f5f9;
  border-radius: 10px;
  overflow: hidden;
}

.indicator-fill {
  height: 100%;
  background: #000;
  transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.premium-input :deep(label) {
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 0.1em;
}

.step-content {
  animation: slideIn 0.5s ease-out;
}

.text-italic {
  font-style: italic;
}

.gap-4 { gap: 16px; }
.gap-6 { gap: 24px; }

.process-line {
  flex-grow: 1;
  width: 2px;
  background: #e2e8f0;
  margin: 4px 0;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.max-w-800 { max-width: 800px; }

@media (max-width: 960px) {
  .form-container-card {
    padding: 24px;
  }
}
</style>