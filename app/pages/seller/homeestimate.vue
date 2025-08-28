<template>
  <div class="home-estimate">
    <v-container>
      <!-- Page Header -->
      <v-row class="mb-6">
        <v-col cols="12" md="8" class="mx-auto text-center">
          <h1 class="text-h3 mb-4">What's Your Home Worth?</h1>
          <p class="text-subtitle-1">
            Get a free, instant estimate of your home's value based on recent sales in your neighborhood.
          </p>
        </v-col>
      </v-row>

      <!-- Estimate Form -->
      <v-row>
        <v-col cols="12" md="8" class="mx-auto">
          <v-card>
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
                            required
                          />
                        </v-col>

                        <v-col cols="12" md="6">
                          <v-text-field
                            v-model="forms.propertyDetails.postalCode"
                            label="Postal Code"
                            :rules="[v => !!v || 'Postal code is required']"
                            required
                          />
                        </v-col>

                        <v-col cols="12" md="6">
                          <v-select
                            v-model="forms.propertyDetails.propertyType"
                            :items="propertyTypes"
                            label="Property Type"
                            :rules="[v => !!v || 'Property type is required']"
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
                            required
                          />
                        </v-col>

                        <v-col cols="12" md="6">
                          <v-select
                            v-model="forms.propertyDetails.lotSize"
                            :items="lotSizes"
                            label="Lot Size"
                            :rules="[v => !!v || 'Lot size is required']"
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
                          />
                        </v-col>

                        <v-col cols="12">
                          <v-select
                            v-model="forms.features.renovations"
                            :items="renovationTypes"
                            label="Recent Renovations"
                            multiple
                            chips
                          />
                        </v-col>

                        <v-col cols="12">
                          <v-textarea
                            v-model="forms.features.additionalInfo"
                            label="Additional Information"
                            hint="Please provide any other details that might affect your home's value"
                            rows="3"
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
                          />
                        </v-col>

                        <v-col cols="12">
                          <v-select
                            v-model="forms.contact.timeframe"
                            :items="sellingTimeframes"
                            label="When are you planning to sell?"
                            :rules="[v => !!v || 'Timeframe is required']"
                            required
                          />
                        </v-col>

                        <v-col cols="12">
                          <v-checkbox
                            v-model="forms.contact.contactPreference"
                            label="I prefer to be contacted by email"
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
      </v-row>
    </v-container>

    <!-- Success Dialog -->
    <v-dialog
      v-model="showSuccessDialog"
      max-width="500"
    >
      <v-card>
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
