<template>
  <div class="animated-steps-container">
    <div class="steps-wrapper">
      <!-- Top Row Steps (1-4) -->
      <div class="steps-row top-row">
        <div 
          v-for="(step, index) in topSteps" 
          :key="step.id"
          class="step-item"
          :class="{ 
            'completed': currentStep > step.id, 
            'active': currentStep === step.id,
            'pending': currentStep < step.id 
          }"
          @click="showStepDetails(step)"
        >
          <div class="step-content">
            <div class="step-icon-wrapper">
              <v-avatar 
                :color="getStepColor(step.id)" 
                size="48"
                class="step-icon"
              >
                <v-icon 
                  :icon="step.icon" 
                  size="24"
                  :color="getIconColor(step.id)"
                />
              </v-avatar>
              <div class="step-number">{{ step.id }}</div>
            </div>
            <div class="step-title-compact">{{ step.title }}</div>
          </div>
          
          <!-- Horizontal Connecting Line -->
          <div 
            v-if="index < topSteps.length - 1" 
            class="connecting-line horizontal"
            :class="{ 'animated': currentStep > step.id }"
          >
            <div class="line-progress dashed-line"></div>
          </div>
        </div>
      </div>

      <!-- Vertical Connecting Line (from step 4 to step 5) -->
      <div class="vertical-connector">
        <div 
          class="connecting-line vertical"
          :class="{ 'animated': currentStep > 4 }"
        >
          <div class="line-progress dashed-line vertical-dashed"></div>
        </div>
      </div>

      <!-- Bottom Row Steps (5-8, reversed for right-to-left flow) -->
      <div class="steps-row bottom-row">
        <div 
          v-for="(step, index) in bottomSteps" 
          :key="step.id"
          class="step-item"
          :class="{ 
            'completed': currentStep > step.id, 
            'active': currentStep === step.id,
            'pending': currentStep < step.id 
          }"
          @click="showStepDetails(step)"
        >
          <!-- Horizontal Connecting Line -->
          <div 
            v-if="index > 0" 
            class="connecting-line horizontal"
            :class="{ 'animated': currentStep > (bottomSteps[index - 1]?.id ?? 0) }"
          >
            <div class="line-progress dashed-line"></div>
          </div>
          
          <div class="step-content">
            <div class="step-icon-wrapper">
              <v-avatar 
                :color="getStepColor(step.id)" 
                size="48"
                class="step-icon"
              >
                <v-icon 
                  :icon="step.icon" 
                  size="24"
                  :color="getIconColor(step.id)"
                />
              </v-avatar>
              <div class="step-number">{{ step.id }}</div>
            </div>
            <div class="step-title-compact">{{ step.title }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Elegant Step Details Panel -->
    <div v-if="selectedStep" class="step-details-panel mt-4">
      <div class="step-details-card">
        <div class="step-header">
          <div class="step-icon-small">
            <v-avatar 
              :color="getStepColor(selectedStep.id)" 
              size="32"
            >
              <v-icon 
                :icon="selectedStep.icon" 
                size="16"
                color="white"
              />
            </v-avatar>
          </div>
          <div class="step-header-text">
            <div class="step-badge">Step {{ selectedStep.id }}</div>
            <h3 class="step-title-elegant">{{ selectedStep.title }}</h3>
          </div>
        </div>
        
        <div class="step-description">
          <p>{{ selectedStep.description }}</p>
        </div>
        
        <div class="step-actions">
          <div class="navigation-buttons">
            <v-btn 
              v-if="selectedStep.id > 1"
              @click="previousStep"
              variant="text"
              size="small"
              prepend-icon="mdi-chevron-left"
            >
              Previous
            </v-btn>
            <v-btn 
              v-if="selectedStep.id < 8"
              @click="nextStep"
              color="primary"
              size="small"
              append-icon="mdi-chevron-right"
            >
              Next
            </v-btn>
          </div>
          <v-btn 
            @click="selectedStep = null"
            variant="text"
            size="small"
            icon="mdi-close"
            class="close-btn"
          />
        </div>
      </div>
    </div>

    <!-- Minimal Controls -->
    <div class="controls mt-6 text-center">
      <v-btn-group variant="outlined" density="compact">
        <v-btn 
          @click="previousStep" 
          :disabled="currentStep <= 1"
          icon="mdi-chevron-left"
          size="small"
        />
        <v-btn 
          @click="nextStep" 
          :disabled="currentStep >= 8"
          icon="mdi-chevron-right"
          size="small"
        />
        <v-btn 
          @click="resetSteps" 
          icon="mdi-refresh"
          size="small"
        />
      </v-btn-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface Step {
  id: number
  title: string
  description: string
  icon: string
}

const currentStep = ref(1)
const selectedStep = ref<Step | null>(null)

const steps: Step[] = [
  {
    id: 1,
    title: 'Initial Consult',
    description: 'Meet with your REALTOR® to discuss your needs, budget, and preferences. We\'ll explore your must-haves, nice-to-haves, and establish a realistic timeline for your home search.',
    icon: 'mdi-coffee'
  },
  {
    id: 2,
    title: 'The Search',
    description: 'Browse current MLS® listings, schedule viewings, and explore neighborhoods. I\'ll provide market insights and help you identify properties that match your criteria.',
    icon: 'mdi-home-search'
  },
  {
    id: 3,
    title: 'Find Your Home',
    description: 'Discover the perfect property that meets your needs and budget. We\'ll evaluate each option carefully, considering location, condition, and future potential.',
    icon: 'mdi-heart-outline'
  },
  {
    id: 4,
    title: 'Make an Offer',
    description: 'Submit a competitive offer with expert guidance on pricing strategy, conditions, and negotiation tactics to give you the best chance of success.',
    icon: 'mdi-cash-multiple'
  },
  {
    id: 5,
    title: 'Due Diligence',
    description: 'Complete professional inspections, review property disclosures, and verify all details to ensure you\'re making an informed decision.',
    icon: 'mdi-clipboard-check'
  },
  {
    id: 6,
    title: 'Remove Subjects',
    description: 'Finalize financing, complete final inspections, and remove conditions to move forward with confidence toward closing.',
    icon: 'mdi-handshake'
  },
  {
    id: 7,
    title: 'Closing',
    description: 'Complete all legal paperwork, coordinate with lawyers and lenders, and finalize the purchase transaction with all parties.',
    icon: 'mdi-gavel'
  },
  {
    id: 8,
    title: 'Possession',
    description: 'Receive your keys, complete the final walkthrough, and officially take possession of your new home. Welcome home!',
    icon: 'mdi-key'
  }
]

const topSteps = computed(() => steps.slice(0, 4))
const bottomSteps = computed(() => steps.slice(4).reverse())

const getStepColor = (stepId: number) => {
  if (currentStep.value > stepId) return 'success'
  if (currentStep.value === stepId) return 'primary'
  return 'grey-lighten-2'
}

const getIconColor = (stepId: number) => {
  if (currentStep.value >= stepId) return 'white'
  return 'grey-darken-1'
}

const showStepDetails = (step: Step) => {
  selectedStep.value = step
}

const nextStep = () => {
  if (currentStep.value < 8) {
    currentStep.value++
  }
  // Auto-show current step details
  const current = steps.find(s => s.id === currentStep.value)
  if (current) {
    selectedStep.value = current
  }
}

const previousStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
  // Auto-show current step details
  const current = steps.find(s => s.id === currentStep.value)
  if (current) {
    selectedStep.value = current
  }
}

const resetSteps = () => {
  currentStep.value = 1
  selectedStep.value = null
}

// Auto-advance steps for demonstration
onMounted(() => {
  const interval = setInterval(() => {
    if (currentStep.value < 8) {
      nextStep()
    } else {
      resetSteps()
    }
  }, 4000)

  // Clear interval after 40 seconds to avoid infinite loop
  setTimeout(() => {
    clearInterval(interval)
  }, 40000)
})
</script>

<style scoped>
.animated-steps-container {
  padding: 1.5rem;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 20px;
  min-height: 400px;
}

.steps-wrapper {
  position: relative;
  max-width: 1000px;
  margin: 0 auto;
}

.steps-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 1.5rem 0;
  padding: 0 1rem;
}

.top-row {
  margin-bottom: 3rem;
}

.bottom-row {
  margin-top: 3rem;
  flex-direction: row-reverse;
}

.step-item {
  display: flex;
  align-items: center;
  flex: 1;
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
  max-width: 140px;
}

.step-item:hover {
  transform: translateY(-3px);
}

.step-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  width: 100%;
  z-index: 2;
}

.step-icon-wrapper {
  position: relative;
  margin-bottom: 0.75rem;
}

.step-icon {
  transition: all 0.3s ease;
  box-shadow: 0 3px 10px rgba(0,0,0,0.12);
}

.step-number {
  position: absolute;
  top: -6px;
  right: -6px;
  background: white;
  color: #374151;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  box-shadow: 0 2px 4px rgba(0,0,0,0.15);
}

.step-title-compact {
  font-size: 0.8rem;
  font-weight: 600;
  color: #374151;
  line-height: 1.2;
  margin-top: 0.25rem;
}

/* Connecting Lines with Dashed Pattern */
.connecting-line {
  position: relative;
  overflow: hidden;
}

.connecting-line.horizontal {
  height: 3px;
  flex: 1;
  margin: 0 1.5rem;
  background: transparent;
  border-radius: 2px;
}

.connecting-line.vertical {
  position: absolute;
  width: 3px;
  height: 50px;
  background: transparent;
  border-radius: 2px;
  left: 50%;
  transform: translateX(-50%);
}

.vertical-connector {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
}

/* Dashed Line Styles */
.dashed-line {
  height: 100%;
  width: 0;
  background-image: repeating-linear-gradient(
    90deg,
    #10b981 0px,
    #10b981 8px,
    transparent 8px,
    transparent 16px
  );
  border-radius: inherit;
  transition: width 1.5s ease-in-out;
  animation: dashMove 2s linear infinite;
}

.vertical-dashed {
  background-image: repeating-linear-gradient(
    0deg,
    #10b981 0px,
    #10b981 8px,
    transparent 8px,
    transparent 16px
  );
}

/* Background dashed line (static) */
.connecting-line::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: repeating-linear-gradient(
    90deg,
    #d1d5db 0px,
    #d1d5db 8px,
    transparent 8px,
    transparent 16px
  );
  z-index: 1;
}

.connecting-line.vertical::before {
  background-image: repeating-linear-gradient(
    0deg,
    #d1d5db 0px,
    #d1d5db 8px,
    transparent 8px,
    transparent 16px
  );
}

.connecting-line.animated .dashed-line {
  width: 100%;
}

/* Dash Animation */
@keyframes dashMove {
  0% {
    background-position: 0px 0px;
  }
  100% {
    background-position: 16px 0px;
  }
}

/* Step States */
.step-item.completed .step-icon {
  transform: scale(1.05);
}

.step-item.active .step-icon {
  animation: pulse 2s infinite;
  box-shadow: 0 4px 15px rgba(25, 118, 210, 0.3);
}

.step-item.active .step-title-compact {
  color: #1976d2;
  font-weight: 700;
}

.step-item.completed .step-title-compact {
  color: #10b981;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.08); }
  100% { transform: scale(1); }
}

/* Elegant Step Details Panel */
.step-details-panel {
  animation: slideIn 0.4s ease-out;
}

.step-details-card {
  background: white;
  border-radius: 16px;
  padding: 1.25rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e7eb;
}

.step-header {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
}

.step-icon-small {
  margin-right: 0.75rem;
}

.step-header-text {
  flex: 1;
}

.step-badge {
  display: inline-block;
  background: #f3f4f6;
  color: #6b7280;
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  margin-bottom: 0.25rem;
}

.step-title-elegant {
  font-size: 1.1rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
  line-height: 1.3;
}

.step-description {
  margin-bottom: 1rem;
}

.step-description p {
  font-size: 0.85rem;
  line-height: 1.5;
  color: #6b7280;
  margin: 0;
}

.step-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.navigation-buttons {
  display: flex;
  gap: 0.5rem;
}

.close-btn {
  opacity: 0.7;
}

.close-btn:hover {
  opacity: 1;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Minimal Controls */
.controls {
  display: flex;
  justify-content: center;
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .animated-steps-container {
    padding: 1rem;
  }
  
  .steps-row {
    flex-direction: column;
    gap: 1.5rem;
    padding: 0;
  }
  
  .bottom-row {
    flex-direction: column;
  }
  
  .connecting-line.horizontal {
    display: none;
  }
  
  .vertical-connector {
    display: none;
  }
  
  .step-content {
    max-width: 100%;
  }
  
  .step-item {
    width: 100%;
    justify-content: center;
    max-width: none;
  }
  
  .step-title-compact {
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .step-icon-wrapper .v-avatar {
    width: 40px !important;
    height: 40px !important;
  }
  
  .step-title-compact {
    font-size: 0.75rem;
  }
  
  .step-details-card {
    padding: 1rem;
  }
  
  .step-title-elegant {
    font-size: 1rem;
  }
  
  .step-description p {
    font-size: 0.8rem;
  }
}
</style>
