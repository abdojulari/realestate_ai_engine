<template>
  <div class="home-estimate">
    <!-- Hero -->
    <v-img class="mb-8" height="280" cover src="https://www.needtosellmyhouse.com/assets/library/house-value-calculator-800x534.jpg" gradient="to bottom, rgba(0,0,0,.15), rgba(0,0,0,.55)" referrerpolicy="no-referrer">
      <div class="d-flex flex-column align-center justify-center text-center h-100 px-4">
        <h1 class="text-h4 text-white mb-2">What's Your Home Worth?</h1>
        <p class="text-body-2 text-white" style="max-width: 900px;">Get a quick estimate informed by recent nearby sales. A local expert can fine-tune it for accuracy.</p>
      </div>
    </v-img>

    <!-- Estimate Form -->
    <v-container>
      <v-row>
        <v-col cols="12" md="8">
          <v-card flat>
            <v-progress-linear :model-value="progress" height="6" color="primary" />
            <v-stepper v-model="currentStep">
              <!-- Stepper Header -->
              <v-stepper-header>
                <v-stepper-item
                  value="1"
                  title="Property Details"
                />
                <v-divider />
                <v-stepper-item
                  value="2"
                  title="Features"
                />
                <v-divider />
                <v-stepper-item
                  value="3"
                  title="Contact Info"
                />
              </v-stepper-header>

              <v-stepper-window>
                <!-- Step 1: Property Details -->
                <v-stepper-window-item value="1">
                  <v-card-text>
                    <v-form v-model="forms.propertyDetails.valid" @submit.prevent>
                      <v-row>
                        <v-col cols="12">
                          <v-text-field
                            v-model="forms.propertyDetails.address"
                            label="Property Address"
                            :rules="[v => !!v || 'Address is required']"
                            variant="outlined"
                            density="compact"
                            required
                          />
                        </v-col>

                        <v-col cols="12" md="6">
                          <v-text-field
                            v-model="forms.propertyDetails.postalCode"
                            label="Postal Code"
                            :rules="[v => !!v || 'Postal code is required']"
                            variant="outlined"
                            density="compact"
                            required
                          />
                        </v-col>

                        <v-col cols="12" md="6">
                          <v-select
                            v-model="forms.propertyDetails.propertyType"
                            :items="propertyTypes"
                            label="Property Type"
                            :rules="[v => !!v || 'Property type is required']"
                            variant="outlined"
                            density="compact"
                            required
                          />
                        </v-col>

                        <v-col cols="12" md="4">
                          <v-text-field
                            v-model.number="forms.propertyDetails.beds"
                            type="number"
                            label="Bedrooms"
                            min="0"
                            :rules="[v => v >= 0 || 'Must be 0 or greater']"
                            variant="outlined"
                            density="compact"
                            required
                          />
                        </v-col>

                        <v-col cols="12" md="4">
                          <v-text-field
                            v-model.number="forms.propertyDetails.baths"
                            type="number"
                            label="Bathrooms"
                            min="0"
                            step="0.5"
                            :rules="[v => v >= 0 || 'Must be 0 or greater']"
                            variant="outlined"
                            density="compact"
                            required
                          />
                        </v-col>

                        <v-col cols="12" md="4">
                          <v-text-field
                            v-model.number="forms.propertyDetails.sqft"
                            type="number"
                            label="Square Feet"
                            min="0"
                            :rules="[v => v > 0 || 'Must be greater than 0']"
                            variant="outlined"
                            density="compact"
                            required
                          />
                        </v-col>

                        <v-col cols="12" md="6">
                          <v-text-field
                            v-model.number="forms.propertyDetails.yearBuilt"
                            type="number"
                            label="Year Built"
                            :rules="[
                              v => !!v || 'Year is required',
                              v => v > 1800 || 'Invalid year',
                              v => v <= new Date().getFullYear() || 'Year cannot be in the future'
                            ]"
                            variant="outlined"
                            density="compact"
                            required
                          />
                        </v-col>

                        <v-col cols="12" md="6">
                          <v-select
                            v-model="forms.propertyDetails.lotSize"
                            :items="lotSizes"
                            label="Lot Size"
                            :rules="[v => !!v || 'Lot size is required']"
                            variant="outlined"
                            density="compact"
                            required
                          />
                        </v-col>
                      </v-row>
                    </v-form>
                  </v-card-text>

                  <v-card-actions>
                    <v-spacer />
                    <v-btn
                      color="primary"
                      variant="outlined"
                      @click="nextStep"
                      :disabled="!forms.propertyDetails.valid"
                    >
                      Continue
                    </v-btn>
                  </v-card-actions>
                </v-stepper-window-item>

                <!-- Step 2: Features -->
                <v-stepper-window-item value="2">
                  <v-card-text>
                    <v-form v-model="forms.features.valid" @submit.prevent>
                      <v-row>
                        <v-col cols="12">
                          <v-select
                            v-model="forms.features.condition"
                            :items="propertyConditions"
                            label="Property Condition"
                            :rules="[v => !!v || 'Condition is required']"
                            variant="outlined"
                            density="compact"
                            required
                          />
                        </v-col>

                        <v-col cols="12">
                          <v-select
                            v-model="forms.features.selectedFeatures"
                            :items="availableFeatures"
                            label="Property Features"
                            multiple
                            chips
                            variant="outlined"
                            density="compact"
                          />
                        </v-col>

                        <v-col cols="12">
                          <v-select
                            v-model="forms.features.renovations"
                            :items="renovationTypes"
                            label="Recent Renovations"
                            multiple
                            chips
                            variant="outlined"
                            density="compact"
                            />
                        </v-col>

                        <v-col cols="12">
                          <v-textarea
                            v-model="forms.features.additionalInfo"
                            label="Additional Information"
                            hint="Please provide any other details that might affect your home's value"
                            rows="4"
                            variant="outlined"
                            density="compact"
                          />
                        </v-col>
                      </v-row>
                    </v-form>
                  </v-card-text>

                  <v-card-actions>
                    <v-btn
                      variant="text"
                      @click="currentStep = '1'"
                    >
                      Back
                    </v-btn>
                    <v-spacer />
                    <v-btn
                      color="primary"
                      @click="nextStep"
                      :disabled="!forms.features.valid"
                    >
                      Continue
                    </v-btn>
                  </v-card-actions>
                </v-stepper-window-item>

                <!-- Step 3: Contact Info -->
                <v-stepper-window-item value="3">
                  <v-card-text>
                    <v-form v-model="forms.contact.valid" @submit.prevent="submitEstimate">
                      <v-row>
                        <v-col cols="12" md="6">
                          <v-text-field
                            v-model="forms.contact.firstName"
                            label="First Name"
                            :rules="[v => !!v || 'First name is required']"
                            required
                            variant="outlined"
                            density="compact"
                          />
                        </v-col>

                        <v-col cols="12" md="6">
                          <v-text-field
                            v-model="forms.contact.lastName"
                            label="Last Name"
                            :rules="[v => !!v || 'Last name is required']"
                            required
                          />
                        </v-col>

                        <v-col cols="12">
                          <v-text-field
                            v-model="forms.contact.email"
                            label="Email"
                            type="email"
                            :rules="[
                              v => !!v || 'Email is required',
                              v => /.+@.+\..+/.test(v) || 'Email must be valid'
                            ]"
                            required
                          />
                        </v-col>

                        <v-col cols="12">
                          <v-text-field
                            v-model="forms.contact.phone"
                            label="Phone"
                            :rules="[v => !!v || 'Phone is required']"
                            required
                            variant="outlined"
                            density="compact"
                          />
                        </v-col>

                        <v-col cols="12">
                          <v-select
                            v-model="forms.contact.timeframe"
                            :items="sellingTimeframes"
                            label="When are you planning to sell?"
                            :rules="[v => !!v || 'Timeframe is required']"
                            required
                            variant="outlined"
                            density="compact"
                          />
                        </v-col>

                        <v-col cols="12">
                          <v-checkbox
                            v-model="forms.contact.contactPreference"
                            label="I prefer to be contacted by email"
                            variant="outlined"
                            density="compact"
                          />
                        </v-col>
                      </v-row>
                    </v-form>
                  </v-card-text>

                  <v-card-actions>
                    <v-btn
                      variant="text"
                      @click="currentStep = '2'"
                    >
                      Back
                    </v-btn>
                    <v-spacer />
                    <v-btn
                      color="primary"
                      @click="submitEstimate"
                      :loading="submitting"
                      :disabled="!forms.contact.valid"
                    >
                      Get Estimate
                    </v-btn>
                  </v-card-actions>
                </v-stepper-window-item>
              </v-stepper-window>
            </v-stepper>
          </v-card>
        </v-col>
        <v-col cols="12" md="4">
          <v-card elevation="1" class="mb-4" flat>
            <v-card-title>Tips</v-card-title>
            <v-divider />
            <v-list density="comfortable">
              <v-list-item prepend-icon="mdi-image-filter-center-focus" title="Great photos sell faster" subtitle="Tidy spaces, good lighting, and wide angles help." />
              <v-list-item prepend-icon="mdi-currency-usd" title="Price with the market" subtitle="Use recent local sales as your anchor." />
              <v-list-item prepend-icon="mdi-clock-outline" title="Timing matters" subtitle="List mid-week for weekend momentum." />
            </v-list>
          </v-card>
          <v-card elevation="1" flat>
            <v-img height="160" cover src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1200&auto=format&fit=crop" referrerpolicy="no-referrer" />
            <v-card-text>
              Work with a trusted pro to validate your estimate and craft a winning listing plan.
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Success Dialog -->
    <v-dialog
      v-model="showSuccessDialog"
      max-width="500"
    >
      <v-card flat>
        <v-card-title class="text-h5">Thank You!</v-card-title>
        <v-card-text>
          <p class="mb-4">
            We've received your request for a home value estimate. One of our experienced agents will review your information and contact you shortly with a detailed analysis of your home's value.
          </p>
          <p>
            In the meantime, you can:
          </p>
          <v-list>
            <v-list-item
              prepend-icon="mdi-home-search"
              title="Browse Similar Properties"
              to="/map-search"
            />
            <v-list-item
              prepend-icon="mdi-account-plus"
              title="Create an Account"
              to="/auth/register"
            />
            <v-list-item
              prepend-icon="mdi-information"
              title="Learn About Our Services"
              to="/selling"
            />
          </v-list>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="primary"
            @click="showSuccessDialog = false"
          >
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

// Form state
const currentStep = ref('1')
const progress = computed(() => {
  const n = parseInt(currentStep.value)
  if (n <= 1) return 33
  if (n === 2) return 66
  return 100
})
const submitting = ref(false)
const showSuccessDialog = ref(false)

const forms = reactive({
  propertyDetails: {
    valid: false,
    address: '',
    postalCode: '',
    propertyType: '',
    beds: null,
    baths: null,
    sqft: null,
    yearBuilt: null,
    lotSize: ''
  },
  features: {
    valid: false,
    condition: '',
    selectedFeatures: [],
    renovations: [],
    additionalInfo: ''
  },
  contact: {
    valid: false,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    timeframe: '',
    contactPreference: false
  }
})

// Form options
const propertyTypes = [
  { title: 'Single Family Home', value: 'single_family' },
  { title: 'Townhouse', value: 'townhouse' },
  { title: 'Condo', value: 'condo' },
  { title: 'Multi-Family', value: 'multi_family' },
  { title: 'Land', value: 'land' }
]

const lotSizes = [
  { title: 'Under 1/4 Acre', value: 'under_quarter' },
  { title: '1/4 to 1/2 Acre', value: 'quarter_to_half' },
  { title: '1/2 to 1 Acre', value: 'half_to_one' },
  { title: '1 to 2 Acres', value: 'one_to_two' },
  { title: 'Over 2 Acres', value: 'over_two' }
]

const propertyConditions = [
  { title: 'Excellent', value: 'excellent' },
  { title: 'Good', value: 'good' },
  { title: 'Fair', value: 'fair' },
  { title: 'Needs Work', value: 'needs_work' },
  { title: 'Fixer Upper', value: 'fixer_upper' }
]

const availableFeatures = [
  'Garage',
  'Pool',
  'Central Air',
  'Fireplace',
  'Basement',
  'Solar Panels',
  'Smart Home Features',
  'Security System',
  'Deck/Patio',
  'Fenced Yard'
]

const renovationTypes = [
  'Kitchen',
  'Bathroom(s)',
  'Flooring',
  'Windows',
  'Roof',
  'HVAC',
  'Electrical',
  'Plumbing',
  'Exterior',
  'Landscaping'
]

const sellingTimeframes = [
  { title: 'Immediately', value: 'immediate' },
  { title: 'Within 3 months', value: '3_months' },
  { title: '3-6 months', value: '6_months' },
  { title: '6-12 months', value: '12_months' },
  { title: 'Just exploring', value: 'exploring' }
]

// Methods
const nextStep = () => {
  const nextStepNumber = parseInt(currentStep.value) + 1
  currentStep.value = nextStepNumber.toString()
}

const submitEstimate = async () => {
  if (!forms.contact.valid) return

  submitting.value = true
  try {
    // Combine all form data
    const formData = {
      property: forms.propertyDetails,
      features: forms.features,
      contact: forms.contact
    }

    // Submit to API
    // await api.post('/estimates', formData)

    // Show success dialog
    showSuccessDialog.value = true

    // Reset form
    forms.propertyDetails = {
      valid: false,
      address: '',
      postalCode: '',
      propertyType: '',
      beds: null,
      baths: null,
      sqft: null,
      yearBuilt: null,
      lotSize: ''
    }
    forms.features = {
      valid: false,
      condition: '',
      selectedFeatures: [],
      renovations: [],
      additionalInfo: ''
    }
    forms.contact = {
      valid: false,
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      timeframe: '',
      contactPreference: false
    }
    currentStep.value = '1'
  } catch (error) {
    console.error('Error submitting estimate:', error)
    // Show error message
  } finally {
    submitting.value = false
  }
}

// Define page meta
definePageMeta({
  layout: 'default'
})
</script>

<style scoped>
.home-estimate {
  min-height: calc(100vh - 64px);
  padding: 40px 0;
  background-color: #f5f5f5;
}
</style>
