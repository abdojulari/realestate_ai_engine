<template>
  <div class="payroll-page px-md-8 py-md-6">
    <v-container fluid>
      <!-- Page Header -->
      <v-row class="mb-8 align-center">
        <v-col cols="12" md="6">
          <div class="d-flex align-center mb-2">
            <v-btn icon="mdi-arrow-left" variant="text" size="small" class="mr-2" to="/admin/bookkeeping" />
            <div class="premium-accent-bar mr-4"></div>
            <span class="text-overline letter-spacing-2 text-gold">Financial Management</span>
          </div>
          <h1 class="display-serif text-h3 mb-1">Payroll</h1>
          <p class="text-subtitle-1 text-medium-emphasis font-weight-light">
            Manage employees and payroll payments
          </p>
        </v-col>
        <v-col cols="12" md="6" class="d-flex align-center justify-md-end ga-3">
          <div class="timestamp-box d-none d-md-inline-flex">
            <v-icon icon="mdi-account-cash" size="small" class="mr-2" />
            <span class="text-caption font-weight-bold">{{ employees.length }} employees</span>
          </div>
        </v-col>
      </v-row>

      <!-- Tabs -->
      <v-card class="analytics-card mb-8" elevation="0">
        <v-tabs v-model="activeTab" color="#8c734b" class="px-4 pt-2">
          <v-tab value="employees" class="font-weight-bold text-caption premium-tab">
            <v-icon start size="small">mdi-account-group</v-icon>
            Employees
          </v-tab>
          <v-tab value="payments" class="font-weight-bold text-caption premium-tab">
            <v-icon start size="small">mdi-currency-usd</v-icon>
            Payments
          </v-tab>
        </v-tabs>
        <v-divider class="opacity-10" />

        <v-window v-model="activeTab">
          <!-- ═══════ TAB 1: EMPLOYEES ═══════ -->
          <v-window-item value="employees">
            <v-card-text class="pa-6">
              <div class="d-flex justify-end mb-4">
                <v-btn
                  color="#43a047"
                  variant="flat"
                  class="premium-btn"
                  prepend-icon="mdi-account-plus"
                  @click="showEmployeeDialog = true"
                >
                  Add Employee
                </v-btn>
              </div>

              <v-skeleton-loader v-if="loadingEmployees" type="table-row@5" class="rounded-lg" />
              <v-table v-else class="premium-table">
                <thead>
                  <tr>
                    <th class="px-6">Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Salary Type</th>
                    <th class="text-right">Rate / Salary</th>
                    <th>Province</th>
                    <th class="text-center">Status</th>
                    <th class="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="emp in employees" :key="emp._id" class="table-row-hover">
                    <td class="px-6">
                      <div class="d-flex align-center">
                        <v-avatar size="32" :color="emp.isActive ? '#8c734b' : 'grey'" class="mr-3">
                          <span class="text-caption font-weight-bold text-white">{{ getInitials(emp.name) }}</span>
                        </v-avatar>
                        <div>
                          <div class="text-body-2 font-weight-bold">{{ emp.name }}</div>
                          <v-chip v-if="emp.isSelf" size="x-small" color="info" variant="flat" class="mt-1">Self</v-chip>
                        </div>
                      </div>
                    </td>
                    <td class="text-body-2 text-medium-emphasis">{{ emp.email || '—' }}</td>
                    <td class="text-body-2 text-capitalize">{{ emp.role || '—' }}</td>
                    <td>
                      <v-chip size="x-small" :color="emp.salaryType === 'hourly' ? 'blue' : 'purple'" variant="flat" class="font-weight-bold text-capitalize">
                        {{ emp.salaryType }}
                      </v-chip>
                    </td>
                    <td class="text-right text-body-2 font-weight-bold">
                      {{ emp.salaryType === 'hourly' ? fmt(emp.hourlyRate || 0) + '/hr' : fmt(emp.fixedSalary || 0) }}
                    </td>
                    <td class="text-body-2">{{ emp.province || '—' }}</td>
                    <td class="text-center">
                      <v-chip
                        size="x-small"
                        :color="emp.isActive ? 'success' : 'grey'"
                        variant="flat"
                        class="font-weight-bold cursor-pointer"
                        @click="toggleEmployeeStatus(emp)"
                      >
                        {{ emp.isActive ? 'Active' : 'Inactive' }}
                      </v-chip>
                    </td>
                    <td class="text-center">
                      <v-btn icon="mdi-pencil-outline" size="small" variant="text" color="primary" @click="editEmployee(emp)" />
                    </td>
                  </tr>
                  <tr v-if="!employees.length">
                    <td colspan="8" class="text-center py-12">
                      <v-icon icon="mdi-account-off" size="48" class="mb-3 opacity-30" />
                      <div class="text-body-2 text-medium-emphasis">No employees yet</div>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
          </v-window-item>

          <!-- ═══════ TAB 2: PAYMENTS ═══════ -->
          <v-window-item value="payments">
            <v-card-text class="pa-6">
              <!-- Payment Summary -->
              <v-row class="mb-6">
                <v-col cols="12" sm="6" class="d-flex">
                  <v-card class="stat-card-inner w-100" elevation="0">
                    <v-card-text class="d-flex align-center pa-4">
                      <div class="icon-orb success-orb mr-3">
                        <v-icon icon="mdi-cash" size="small" />
                      </div>
                      <div>
                        <div class="text-h5 font-weight-bold letter-spacing-tight">{{ fmt(paymentSummary.totalGross) }}</div>
                        <div class="text-overline text-medium-emphasis">Total Gross</div>
                      </div>
                    </v-card-text>
                  </v-card>
                </v-col>
                <v-col cols="12" sm="6" class="d-flex">
                  <v-card class="stat-card-inner w-100" elevation="0">
                    <v-card-text class="d-flex align-center pa-4">
                      <div class="icon-orb gold-orb mr-3">
                        <v-icon icon="mdi-wallet" size="small" />
                      </div>
                      <div>
                        <div class="text-h5 font-weight-bold letter-spacing-tight">{{ fmt(paymentSummary.totalNet) }}</div>
                        <div class="text-overline text-medium-emphasis">Total Net</div>
                      </div>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>

              <div class="d-flex justify-end mb-4">
                <v-btn
                  color="#43a047"
                  variant="flat"
                  class="premium-btn"
                  prepend-icon="mdi-plus"
                  @click="openPaymentDialog"
                >
                  Add Payment
                </v-btn>
              </div>

              <v-skeleton-loader v-if="loadingPayments" type="table-row@5" class="rounded-lg" />
              <v-table v-else class="premium-table">
                <thead>
                  <tr>
                    <th class="px-6">Pay Date</th>
                    <th>Employee</th>
                    <th>Period</th>
                    <th class="text-right">Gross</th>
                    <th class="text-right">CPP</th>
                    <th class="text-right">EI</th>
                    <th class="text-right">Tax</th>
                    <th class="text-right">Other</th>
                    <th class="text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="pay in payments" :key="pay._id" class="table-row-hover">
                    <td class="px-6 text-body-2">{{ formatDate(pay.payDate) }}</td>
                    <td class="text-body-2 font-weight-medium">{{ pay.employeeName || '—' }}</td>
                    <td class="text-body-2 text-medium-emphasis">
                      {{ formatDateShort(pay.periodStart) }} — {{ formatDateShort(pay.periodEnd) }}
                    </td>
                    <td class="text-right text-body-2 font-weight-bold">{{ fmt(pay.grossAmount) }}</td>
                    <td class="text-right text-body-2 text-error">{{ fmt(pay.cppDeduction) }}</td>
                    <td class="text-right text-body-2 text-error">{{ fmt(pay.eiDeduction) }}</td>
                    <td class="text-right text-body-2 text-error">{{ fmt(pay.incomeTaxDeduction) }}</td>
                    <td class="text-right text-body-2 text-error">{{ fmt(pay.otherDeductions) }}</td>
                    <td class="text-right text-body-2 font-weight-bold text-success">{{ fmt(pay.netAmount) }}</td>
                  </tr>
                  <tr v-if="!payments.length">
                    <td colspan="9" class="text-center py-12">
                      <v-icon icon="mdi-cash-remove" size="48" class="mb-3 opacity-30" />
                      <div class="text-body-2 text-medium-emphasis">No payments recorded</div>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
          </v-window-item>
        </v-window>
      </v-card>
    </v-container>

    <!-- Add/Edit Employee Dialog -->
    <v-dialog v-model="showEmployeeDialog" max-width="640" persistent>
      <v-card class="dialog-card" rounded="xl">
        <v-card-title class="d-flex align-center pa-6">
          <v-icon icon="mdi-account-plus" class="mr-2 text-gold" />
          <span class="display-serif text-h5">{{ editingEmployee ? 'Edit' : 'Add' }} Employee</span>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="resetEmployeeForm" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-6">
          <v-form ref="empFormRef" @submit.prevent="saveEmployee">
            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="empForm.name"
                  label="Full Name *"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Required']"
                  class="premium-input"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="empForm.email"
                  label="Email"
                  type="email"
                  variant="outlined"
                  density="compact"
                  class="premium-input"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="empForm.role"
                  label="Role *"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Required']"
                  class="premium-input"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="empForm.salaryType"
                  :items="[{ title: 'Hourly', value: 'hourly' }, { title: 'Fixed', value: 'fixed' }]"
                  label="Salary Type *"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Required']"
                  class="premium-input"
                />
              </v-col>
              <v-col v-if="empForm.salaryType === 'hourly'" cols="12" sm="6">
                <v-text-field
                  v-model.number="empForm.hourlyRate"
                  type="number"
                  label="Hourly Rate ($)"
                  variant="outlined"
                  density="compact"
                  prefix="$"
                  class="premium-input"
                />
              </v-col>
              <v-col v-if="empForm.salaryType === 'fixed'" cols="12" sm="6">
                <v-text-field
                  v-model.number="empForm.fixedSalary"
                  type="number"
                  label="Fixed Salary ($)"
                  variant="outlined"
                  density="compact"
                  prefix="$"
                  class="premium-input"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="empForm.province"
                  :items="provinceOptions"
                  label="Province"
                  variant="outlined"
                  density="compact"
                  class="premium-input"
                />
              </v-col>
              <v-col cols="12">
                <v-checkbox
                  v-model="empForm.isSelf"
                  label="This is myself (owner/operator)"
                  color="#8c734b"
                  density="compact"
                  hide-details
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-6">
          <v-spacer />
          <v-btn variant="text" @click="resetEmployeeForm">Cancel</v-btn>
          <v-btn color="#43a047" variant="flat" class="premium-btn" :loading="savingEmployee" @click="saveEmployee">
            {{ editingEmployee ? 'Update' : 'Save' }} Employee
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add Payment Dialog -->
    <v-dialog v-model="showPaymentDialog" max-width="720" persistent>
      <v-card class="dialog-card" rounded="xl">
        <v-card-title class="d-flex align-center pa-6">
          <v-icon icon="mdi-cash-plus" class="mr-2 text-gold" />
          <span class="display-serif text-h5">Add Payment</span>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="resetPaymentForm" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-6">
          <v-form ref="payFormRef" @submit.prevent="savePayment">
            <v-row dense>
              <v-col cols="12">
                <v-autocomplete
                  v-model="payForm.employeeId"
                  :items="activeEmployees"
                  item-title="name"
                  item-value="_id"
                  label="Employee *"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Required']"
                  class="premium-input"
                  @update:model-value="onEmployeeSelected"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model="payForm.payDate"
                  type="date"
                  label="Pay Date *"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Required']"
                  class="premium-input"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model="payForm.periodStart"
                  type="date"
                  label="Period Start *"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Required']"
                  class="premium-input"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model="payForm.periodEnd"
                  type="date"
                  label="Period End *"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Required']"
                  class="premium-input"
                />
              </v-col>

              <!-- Hours (if hourly employee) -->
              <v-col v-if="selectedEmployeeSalaryType === 'hourly'" cols="12" sm="6">
                <v-text-field
                  v-model.number="payForm.hoursWorked"
                  type="number"
                  label="Hours Worked"
                  variant="outlined"
                  density="compact"
                  class="premium-input"
                  @update:model-value="recalcGross"
                />
              </v-col>

              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="payForm.grossAmount"
                  type="number"
                  label="Gross Amount ($) *"
                  variant="outlined"
                  density="compact"
                  prefix="$"
                  :rules="[v => v > 0 || 'Must be > 0']"
                  class="premium-input"
                  @update:model-value="recalcNet"
                />
              </v-col>

              <v-col cols="12">
                <div class="text-overline text-gold font-weight-bold mb-2">Deductions</div>
              </v-col>
              <v-col cols="12" sm="3">
                <v-text-field
                  v-model.number="payForm.cppDeduction"
                  type="number"
                  label="CPP ($)"
                  variant="outlined"
                  density="compact"
                  prefix="$"
                  class="premium-input"
                  @update:model-value="recalcNet"
                />
              </v-col>
              <v-col cols="12" sm="3">
                <v-text-field
                  v-model.number="payForm.eiDeduction"
                  type="number"
                  label="EI ($)"
                  variant="outlined"
                  density="compact"
                  prefix="$"
                  class="premium-input"
                  @update:model-value="recalcNet"
                />
              </v-col>
              <v-col cols="12" sm="3">
                <v-text-field
                  v-model.number="payForm.incomeTaxDeduction"
                  type="number"
                  label="Income Tax ($)"
                  variant="outlined"
                  density="compact"
                  prefix="$"
                  class="premium-input"
                  @update:model-value="recalcNet"
                />
              </v-col>
              <v-col cols="12" sm="3">
                <v-text-field
                  v-model.number="payForm.otherDeductions"
                  type="number"
                  label="Other ($)"
                  variant="outlined"
                  density="compact"
                  prefix="$"
                  class="premium-input"
                  @update:model-value="recalcNet"
                />
              </v-col>

              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="payForm.netAmount"
                  type="number"
                  label="Net Amount ($)"
                  variant="outlined"
                  density="compact"
                  prefix="$"
                  readonly
                  class="premium-input"
                  bg-color="#f9f9f7"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="payForm.notes"
                  label="Notes"
                  variant="outlined"
                  density="compact"
                  class="premium-input"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-6">
          <v-spacer />
          <v-btn variant="text" @click="resetPaymentForm">Cancel</v-btn>
          <v-btn color="#43a047" variant="flat" class="premium-btn" :loading="savingPayment" @click="savePayment">
            Save Payment
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackColor" location="top right" rounded="lg" :timeout="4000">
      <div class="d-flex align-center">
        <v-icon class="mr-2">{{ snackColor === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle' }}</v-icon>
        {{ snackMessage }}
      </div>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({
  layout: 'admin',
  middleware: ['admin']
})

// ─── Auth ────────────────────────────────────────────────────
const getAuthHeaders = (): Record<string, string> => {
  if (process.client) {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }
  return {}
}

// ─── Types ───────────────────────────────────────────────────
interface Employee {
  _id: string
  name: string
  email?: string
  role: string
  salaryType: 'hourly' | 'fixed'
  hourlyRate?: number
  fixedSalary?: number
  province?: string
  isSelf?: boolean
  isActive: boolean
}

interface Payment {
  _id: string
  employeeId: string
  employeeName?: string
  payDate: string
  periodStart: string
  periodEnd: string
  hoursWorked?: number
  grossAmount: number
  cppDeduction: number
  eiDeduction: number
  incomeTaxDeduction: number
  otherDeductions: number
  netAmount: number
  notes?: string
}

// ─── Helpers ─────────────────────────────────────────────────
const fmt = (n: number) => '$' + (n || 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatDate = (date: string): string => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatDateShort = (date: string): string => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

const getInitials = (name: string): string => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// ─── Province Options ────────────────────────────────────────
const provinceOptions = [
  { title: 'Alberta', value: 'AB' },
  { title: 'British Columbia', value: 'BC' },
  { title: 'Manitoba', value: 'MB' },
  { title: 'New Brunswick', value: 'NB' },
  { title: 'Newfoundland and Labrador', value: 'NL' },
  { title: 'Northwest Territories', value: 'NT' },
  { title: 'Nova Scotia', value: 'NS' },
  { title: 'Nunavut', value: 'NU' },
  { title: 'Ontario', value: 'ON' },
  { title: 'Prince Edward Island', value: 'PE' },
  { title: 'Quebec', value: 'QC' },
  { title: 'Saskatchewan', value: 'SK' },
  { title: 'Yukon', value: 'YT' }
]

// ─── State ───────────────────────────────────────────────────
const activeTab = ref('employees')
const loadingEmployees = ref(true)
const loadingPayments = ref(true)
const savingEmployee = ref(false)
const savingPayment = ref(false)
const snackbar = ref(false)
const snackMessage = ref('')
const snackColor = ref<'success' | 'error'>('success')

const employees = ref<Employee[]>([])
const payments = ref<Payment[]>([])

const showEmployeeDialog = ref(false)
const showPaymentDialog = ref(false)
const editingEmployee = ref<Employee | null>(null)
const selectedEmployeeSalaryType = ref<string>('')

const empFormRef = ref()
const payFormRef = ref()

const empForm = ref({
  name: '',
  email: '',
  role: '',
  salaryType: 'hourly' as 'hourly' | 'fixed',
  hourlyRate: 0,
  fixedSalary: 0,
  province: '',
  isSelf: false
})

const payForm = ref({
  employeeId: '',
  payDate: new Date().toISOString().split('T')[0],
  periodStart: '',
  periodEnd: '',
  hoursWorked: 0,
  grossAmount: 0,
  cppDeduction: 0,
  eiDeduction: 0,
  incomeTaxDeduction: 0,
  otherDeductions: 0,
  netAmount: 0,
  notes: ''
})

// ─── Computed ────────────────────────────────────────────────
const activeEmployees = computed(() => employees.value.filter(e => e.isActive))

const paymentSummary = computed(() => {
  const totalGross = payments.value.reduce((sum, p) => sum + (p.grossAmount || 0), 0)
  const totalNet = payments.value.reduce((sum, p) => sum + (p.netAmount || 0), 0)
  return { totalGross, totalNet }
})

// ─── Notifications ───────────────────────────────────────────
const notify = (message: string, color: 'success' | 'error' = 'success') => {
  snackMessage.value = message
  snackColor.value = color
  snackbar.value = true
}

// ─── Payment Calculations ────────────────────────────────────
const onEmployeeSelected = (empId: string) => {
  const emp = employees.value.find(e => e._id === empId)
  selectedEmployeeSalaryType.value = emp?.salaryType || ''
  if (emp?.salaryType === 'fixed' && emp.fixedSalary) {
    payForm.value.grossAmount = emp.fixedSalary
    recalcNet()
  }
}

const recalcGross = () => {
  const emp = employees.value.find(e => e._id === payForm.value.employeeId)
  if (emp?.salaryType === 'hourly' && emp.hourlyRate && payForm.value.hoursWorked) {
    payForm.value.grossAmount = Math.round(emp.hourlyRate * payForm.value.hoursWorked * 100) / 100
  }
  recalcNet()
}

const recalcNet = () => {
  const gross = payForm.value.grossAmount || 0
  const deductions = (payForm.value.cppDeduction || 0) +
    (payForm.value.eiDeduction || 0) +
    (payForm.value.incomeTaxDeduction || 0) +
    (payForm.value.otherDeductions || 0)
  payForm.value.netAmount = Math.round((gross - deductions) * 100) / 100
}

// ─── Employee API ────────────────────────────────────────────
const fetchEmployees = async () => {
  loadingEmployees.value = true
  try {
    const data = await $fetch<Employee[]>('/api/admin/bookkeeping/payroll/employees', {
      headers: getAuthHeaders()
    })
    employees.value = data || []
  } catch (err: any) {
    console.error('Error fetching employees:', err)
    notify(err?.data?.statusMessage || 'Failed to load employees', 'error')
  } finally {
    loadingEmployees.value = false
  }
}

const saveEmployee = async () => {
  const { valid } = await empFormRef.value?.validate()
  if (!valid) return
  savingEmployee.value = true
  try {
    const body = { ...empForm.value } as any
    if (editingEmployee.value) {
      body._id = editingEmployee.value._id
    }
    await $fetch('/api/admin/bookkeeping/payroll/employees', {
      method: 'POST',
      headers: getAuthHeaders(),
      body
    })
    notify(editingEmployee.value ? 'Employee updated' : 'Employee added')
    resetEmployeeForm()
    await fetchEmployees()
  } catch (err: any) {
    console.error('Error saving employee:', err)
    notify(err?.data?.statusMessage || 'Failed to save employee', 'error')
  } finally {
    savingEmployee.value = false
  }
}

const editEmployee = (emp: Employee) => {
  editingEmployee.value = emp
  empForm.value = {
    name: emp.name,
    email: emp.email || '',
    role: emp.role,
    salaryType: emp.salaryType,
    hourlyRate: emp.hourlyRate || 0,
    fixedSalary: emp.fixedSalary || 0,
    province: emp.province || '',
    isSelf: emp.isSelf || false
  }
  showEmployeeDialog.value = true
}

const toggleEmployeeStatus = async (emp: Employee) => {
  try {
    await $fetch('/api/admin/bookkeeping/payroll/employees', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: { _id: emp._id, isActive: !emp.isActive }
    })
    notify(`Employee ${emp.isActive ? 'deactivated' : 'activated'}`)
    await fetchEmployees()
  } catch (err: any) {
    notify(err?.data?.statusMessage || 'Failed to update status', 'error')
  }
}

const resetEmployeeForm = () => {
  showEmployeeDialog.value = false
  editingEmployee.value = null
  empForm.value = { name: '', email: '', role: '', salaryType: 'hourly', hourlyRate: 0, fixedSalary: 0, province: '', isSelf: false }
  empFormRef.value?.reset()
}

// ─── Payment API ─────────────────────────────────────────────
const fetchPayments = async () => {
  loadingPayments.value = true
  try {
    const data = await $fetch<Payment[]>('/api/admin/bookkeeping/payroll/payments', {
      headers: getAuthHeaders()
    })
    payments.value = data || []
  } catch (err: any) {
    console.error('Error fetching payments:', err)
    notify(err?.data?.statusMessage || 'Failed to load payments', 'error')
  } finally {
    loadingPayments.value = false
  }
}

const openPaymentDialog = () => {
  selectedEmployeeSalaryType.value = ''
  showPaymentDialog.value = true
}

const savePayment = async () => {
  const { valid } = await payFormRef.value?.validate()
  if (!valid) return
  savingPayment.value = true
  try {
    await $fetch('/api/admin/bookkeeping/payroll/payments', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: { ...payForm.value }
    })
    notify('Payment recorded')
    resetPaymentForm()
    await fetchPayments()
  } catch (err: any) {
    console.error('Error saving payment:', err)
    notify(err?.data?.statusMessage || 'Failed to save payment', 'error')
  } finally {
    savingPayment.value = false
  }
}

const resetPaymentForm = () => {
  showPaymentDialog.value = false
  selectedEmployeeSalaryType.value = ''
  payForm.value = {
    employeeId: '',
    payDate: new Date().toISOString().split('T')[0],
    periodStart: '',
    periodEnd: '',
    hoursWorked: 0,
    grossAmount: 0,
    cppDeduction: 0,
    eiDeduction: 0,
    incomeTaxDeduction: 0,
    otherDeductions: 0,
    netAmount: 0,
    notes: ''
  }
  payFormRef.value?.reset()
}

// ─── Lifecycle ───────────────────────────────────────────────
onMounted(() => {
  fetchEmployees()
  fetchPayments()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;600;700;800&display=swap');

.payroll-page {
  background-color: #fcfcfb;
  font-family: 'Inter', sans-serif;
  min-height: 100vh;
}

.display-serif {
  font-family: 'Playfair Display', serif;
}

.text-gold {
  color: #8c734b;
}

.letter-spacing-2 {
  letter-spacing: 2px;
}

.letter-spacing-tight {
  letter-spacing: -1px;
}

.premium-accent-bar {
  width: 40px;
  height: 4px;
  background: #8c734b;
  border-radius: 2px;
}

.timestamp-box {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 100px;
  color: #666;
}

/* Cards */
.analytics-card {
  border-radius: 24px !important;
  background: white !important;
  border: 1px solid rgba(0, 0, 0, 0.05) !important;
}

.stat-card-inner {
  border-radius: 16px !important;
  border: 1px solid rgba(0, 0, 0, 0.05) !important;
  background: white !important;
}

.dialog-card {
  border: 1px solid rgba(0, 0, 0, 0.05) !important;
  background: white !important;
}

/* Orbs */
.icon-orb {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.success-orb {
  background: rgba(67, 160, 71, 0.1);
  color: #43a047;
}

.gold-orb {
  background: rgba(140, 115, 75, 0.1);
  color: #8c734b;
}

/* Table */
.premium-table :deep(th) {
  background: #fafaf9 !important;
  font-size: 0.7rem !important;
  font-weight: 700 !important;
  letter-spacing: 1px !important;
  text-transform: uppercase !important;
  color: #999 !important;
}

.table-row-hover:hover {
  background: #fcfcfb !important;
}

/* Tabs */
.premium-tab {
  text-transform: none !important;
  letter-spacing: 0.5px !important;
}

/* Buttons */
.premium-btn {
  border-radius: 12px !important;
  text-transform: none !important;
  font-weight: 700 !important;
  letter-spacing: 0.3px !important;
}

/* Inputs */
.premium-input :deep(.v-field) {
  border-radius: 12px;
}

.cursor-pointer {
  cursor: pointer;
}

@media (max-width: 960px) {
  .payroll-page {
    padding: 12px !important;
  }

  .text-h3 {
    font-size: 1.6rem !important;
  }
}
</style>
