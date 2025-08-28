<template>
  <v-container class="py-12">
    <v-row>
      <v-col cols="12" md="8" class="mx-auto">
        <h1 class="text-h4 mb-6">Contact Us</h1>
        <v-card>
          <v-card-text>
            <v-form v-model="isValid" @submit.prevent="submit">
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field v-model="form.firstName" label="First Name" :rules="[v=>!!v||'Required']" required />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model="form.lastName" label="Last Name" :rules="[v=>!!v||'Required']" required />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model="form.email" type="email" label="Email" :rules="emailRules" required />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model="form.phone" label="Phone" />
                </v-col>
                <v-col cols="12">
                  <v-textarea v-model="form.message" label="Message" rows="5" :rules="[v=>!!v||'Required']" required />
                </v-col>
              </v-row>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn color="primary" :loading="submitting" :disabled="!isValid" @click="submit">Send</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
const isValid = ref(false)
const submitting = ref(false)
const form = ref({ firstName:'', lastName:'', email:'', phone:'', message:'' })

const emailRules = [
  (v: string) => !!v || 'Email is required',
  (v: string) => /.+@.+\..+/.test(v) || 'Email must be valid'
]

const submit = async () => {
  submitting.value = true
  try {
    await $fetch('/api/contact', { method: 'POST', body: form.value })
    form.value = { firstName:'', lastName:'', email:'', phone:'', message:'' }
    isValid.value = false
  } catch (e) {
    console.error(e)
  } finally {
    submitting.value = false
  }
}

definePageMeta({ layout: 'default' })
</script>


