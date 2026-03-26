<template>
  <div class="premium-page-wrapper">
    <!-- Sophisticated Hero Header -->
    <v-img
      height="320"
      cover
      src="https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?q=80&w=1920&auto=format&fit=crop"
      gradient="to bottom, rgba(18, 18, 18, 0.4), rgba(18, 18, 18, 0.9)"
      class="hero-section"
      referrerpolicy="no-referrer"
    >
      <v-container class="h-100 d-flex flex-column justify-center align-center text-center">
        <div class="premium-badge-light mb-4">PIPEDA Compliant</div>
        <h1 class="display-serif-large text-white mb-4">Privacy Policy</h1>
        <div class="elegant-divider-gold"></div>
        <p class="text-overline text-white mt-6 letter-spacing-2">DeelBot &mdash; Intelligence for Realtors</p>
      </v-container>
    </v-img>

    <!-- Main Content Interface -->
    <v-container class="py-12">
      <v-row justify="center">
        <!-- Sidebar Navigation (Desktop) -->
        <v-col cols="12" md="3" class="d-none d-md-block">
          <div class="sticky-nav">
            <NuxtLink to="/" class="back-link mb-8 d-flex align-center">
              <v-icon icon="mdi-arrow-left" size="small" class="mr-2" />
              Return to Platform
            </NuxtLink>
            
            <div class="nav-header">Document Sections</div>
            <v-list bg-color="transparent" density="compact" class="legal-nav-list">
              <v-list-item title="Introduction" @click="scrollTo('introduction')" />
              <v-list-item title="Definitions" @click="scrollTo('definitions')" />
              <v-list-item title="Accountability" @click="scrollTo('accountability')" />
              <v-list-item title="Consent" @click="scrollTo('consent')" />
              <v-list-item title="Data Collection" @click="scrollTo('collection')" />
              <v-list-item title="Use & Disclosure" @click="scrollTo('usage')" />
              <v-list-item title="Data Retention" @click="scrollTo('retention')" />
              <v-list-item title="Data Security" @click="scrollTo('security')" />
              <v-list-item title="Your Rights" @click="scrollTo('rights')" />
              <v-list-item title="Cookies & Tracking" @click="scrollTo('cookies')" />
              <v-list-item title="Third Parties" @click="scrollTo('third-parties')" />
              <v-list-item title="Children's Privacy" @click="scrollTo('children')" />
              <v-list-item title="Policy Changes" @click="scrollTo('changes')" />
              <v-list-item title="Contact" @click="scrollTo('contact')" />
            </v-list>

            <div class="update-card mt-10">
              <div class="text-caption text-uppercase font-weight-bold text-grey">Effective Date</div>
              <div class="text-body-2 font-weight-bold">February 25, 2026</div>
            </div>
          </div>
        </v-col>

        <!-- Main Editorial Content -->
        <v-col cols="12" md="8" lg="7">
          <v-card variant="flat" class="editorial-card pa-md-10 pa-6">
            
            <!-- PIPEDA Badge -->
            <v-alert type="info" variant="tonal" border="start" class="mb-10 rounded-xl" density="comfortable">
              <template v-slot:prepend>
                <v-icon icon="mdi-shield-check" size="28" />
              </template>
              <div class="font-weight-bold mb-1">PIPEDA Compliant</div>
              <div class="text-body-2">
                This privacy policy complies with Canada's Personal Information Protection and Electronic Documents Act (PIPEDA) 
                and follows the 10 Fair Information Principles outlined in Schedule 1 of the Act.
              </div>
            </v-alert>

            <!-- Introduction -->
            <section id="introduction" class="intro-text mb-12">
              <p class="text-h5 font-weight-light line-height-relaxed text-grey-darken-3">
                At DeelBot, we are committed to protecting the privacy and personal information of our users 
                in accordance with Canada's Personal Information Protection and Electronic Documents Act (PIPEDA). 
                This policy explains how we collect, use, disclose, and safeguard your personal information.
              </p>
            </section>

            <!-- Definitions -->
            <section id="definitions" class="mb-12">
              <h2 class="section-title-premium mb-6">01. Definitions</h2>
              <p class="mb-6">The following terms are used throughout this privacy policy:</p>
              
              <div class="definition-grid">
                <div class="def-item">
                  <span class="def-term">Personal Information</span>
                  <span class="def-desc">Any information about an identifiable individual, as defined under PIPEDA. This includes name, email address, phone number, IP address, and property search preferences.</span>
                </div>
                <div class="def-item">
                  <span class="def-term">Consent</span>
                  <span class="def-desc">Voluntary agreement to the collection, use, and disclosure of personal information. Under PIPEDA, consent can be express, implied, or deemed, depending on the sensitivity of the information.</span>
                </div>
                <div class="def-item">
                  <span class="def-term">Service</span>
                  <span class="def-desc">The DeelBot real estate platform, including property search, client management, AI-powered features, document management, and all related services.</span>
                </div>
                <div class="def-item">
                  <span class="def-term">Privacy Officer</span>
                  <span class="def-desc">The designated individual responsible for our organization's compliance with PIPEDA and for handling all privacy-related inquiries and complaints.</span>
                </div>
              </div>
            </section>

            <!-- Principle 1: Accountability -->
            <section id="accountability" class="mb-12">
              <h2 class="section-title-premium mb-6">02. Accountability</h2>
              <p class="mb-4">
                DeelBot is responsible for all personal information under our control. We have designated a Privacy Officer 
                who is accountable for our compliance with PIPEDA and this privacy policy.
              </p>
              <div class="purpose-card mb-4">
                <v-icon icon="mdi-account-tie" color="#8c734b" class="mr-4" />
                <div>
                  <span class="font-weight-bold text-grey-darken-4 d-block">Privacy Officer</span>
                  <span class="text-body-2 text-grey-darken-1">Abdul Ojulari &mdash; abdulkabirojulari@gmail.com</span>
                </div>
              </div>
              <p class="text-body-2 text-grey-darken-2">
                Our Privacy Officer ensures that staff are trained on privacy obligations, that appropriate procedures are in place 
                to protect personal information, and that inquiries or complaints are investigated and responded to promptly.
              </p>
            </section>

            <!-- Principle 2: Identifying Purposes & Consent -->
            <section id="consent" class="mb-12">
              <h2 class="section-title-premium mb-6">03. Consent</h2>
              <p class="mb-4">
                We obtain your meaningful consent before or at the time of collecting your personal information. 
                The form of consent we seek (express or implied) depends on the sensitivity of the information and your reasonable expectations.
              </p>
              
              <v-row class="mb-6">
                <v-col cols="12" sm="6">
                  <div class="consent-card">
                    <v-icon icon="mdi-check-decagram" color="success" size="28" class="mb-2" />
                    <div class="font-weight-bold mb-1">Express Consent</div>
                    <div class="text-body-2 text-grey-darken-1">Required for sensitive information such as financial data, personal identification, and marketing communications.</div>
                  </div>
                </v-col>
                <v-col cols="12" sm="6">
                  <div class="consent-card">
                    <v-icon icon="mdi-check-circle-outline" color="info" size="28" class="mb-2" />
                    <div class="font-weight-bold mb-1">Implied Consent</div>
                    <div class="text-body-2 text-grey-darken-1">Applied when you voluntarily provide information for an obvious purpose, such as submitting a property inquiry.</div>
                  </div>
                </v-col>
              </v-row>

              <v-alert variant="outlined" color="warning" density="compact" class="rounded-lg">
                <div class="text-body-2">
                  <strong>Right to Withdraw:</strong> You may withdraw your consent at any time, subject to legal or contractual 
                  restrictions, by contacting our Privacy Officer. We will inform you of any implications of withdrawal.
                </div>
              </v-alert>
            </section>

            <!-- Data Collection -->
            <section id="collection" class="mb-12">
              <h2 class="section-title-premium mb-6">04. Information We Collect</h2>
              <p class="mb-4">We limit collection to information that is necessary for the identified purposes. We collect personal information by fair and lawful means.</p>
              
              <h3 class="text-subtitle-1 font-weight-bold mb-4 text-uppercase letter-spacing-1">Information You Provide Directly</h3>
              <v-row class="mb-8">
                <v-col cols="12" sm="6">
                  <div class="data-pill"><v-icon icon="mdi-check" color="gold" class="mr-2"/> Full name and contact details</div>
                  <div class="data-pill"><v-icon icon="mdi-check" color="gold" class="mr-2"/> Email address and phone number</div>
                  <div class="data-pill"><v-icon icon="mdi-check" color="gold" class="mr-2"/> Property search preferences</div>
                </v-col>
                <v-col cols="12" sm="6">
                  <div class="data-pill"><v-icon icon="mdi-check" color="gold" class="mr-2"/> Account credentials</div>
                  <div class="data-pill"><v-icon icon="mdi-check" color="gold" class="mr-2"/> Testimonials and feedback</div>
                  <div class="data-pill"><v-icon icon="mdi-check" color="gold" class="mr-2"/> Inquiry and contact form data</div>
                </v-col>
              </v-row>

              <h3 class="text-subtitle-1 font-weight-bold mb-4 text-uppercase letter-spacing-1">Information Collected Automatically</h3>
              <v-row class="mb-4">
                <v-col cols="12" sm="6">
                  <div class="data-pill"><v-icon icon="mdi-check" color="gold" class="mr-2"/> IP address and browser type</div>
                  <div class="data-pill"><v-icon icon="mdi-check" color="gold" class="mr-2"/> Pages visited and time spent</div>
                </v-col>
                <v-col cols="12" sm="6">
                  <div class="data-pill"><v-icon icon="mdi-check" color="gold" class="mr-2"/> Device and operating system info</div>
                  <div class="data-pill"><v-icon icon="mdi-check" color="gold" class="mr-2"/> Cookies and tracking identifiers</div>
                </v-col>
              </v-row>
            </section>

            <!-- Use & Disclosure -->
            <section id="usage" class="mb-12">
              <h2 class="section-title-premium mb-6">05. Use &amp; Disclosure of Information</h2>
              <p class="mb-6">We use your personal information only for the purposes identified at or before the time of collection:</p>
              
              <div class="purpose-card mb-4" v-for="item in purposes" :key="item.title">
                <v-icon :icon="item.icon" color="#8c734b" class="mr-4" />
                <div>
                  <span class="font-weight-bold text-grey-darken-4 d-block">{{ item.title }}</span>
                  <span class="text-body-2 text-grey-darken-1">{{ item.desc }}</span>
                </div>
              </div>

              <v-alert variant="tonal" color="grey-darken-3" class="mt-6 rounded-lg" density="compact">
                <div class="text-body-2">
                  We do <strong>not</strong> sell, rent, or trade your personal information to third parties for marketing purposes. 
                  We may disclose information only when required by law, with your consent, or to protect our legal rights.
                </div>
              </v-alert>
            </section>

            <!-- Data Retention -->
            <section id="retention" class="mb-12">
              <h2 class="section-title-premium mb-6">06. Data Retention</h2>
              <p class="mb-4">
                We retain your personal information only as long as necessary to fulfill the purposes for which it was collected, 
                or as required by law. When information is no longer needed, we securely destroy, erase, or anonymize it.
              </p>
              <v-row>
                <v-col cols="12" sm="4">
                  <div class="retention-card">
                    <v-icon icon="mdi-account" color="#8c734b" size="28" class="mb-2" />
                    <div class="font-weight-bold text-body-2">Account Data</div>
                    <div class="text-caption text-grey">Duration of account + 30 days after deletion</div>
                  </div>
                </v-col>
                <v-col cols="12" sm="4">
                  <div class="retention-card">
                    <v-icon icon="mdi-chart-line" color="#8c734b" size="28" class="mb-2" />
                    <div class="font-weight-bold text-body-2">Analytics Data</div>
                    <div class="text-caption text-grey">Anonymized after 24 months</div>
                  </div>
                </v-col>
                <v-col cols="12" sm="4">
                  <div class="retention-card">
                    <v-icon icon="mdi-email" color="#8c734b" size="28" class="mb-2" />
                    <div class="font-weight-bold text-body-2">Communications</div>
                    <div class="text-caption text-grey">Retained for 12 months</div>
                  </div>
                </v-col>
              </v-row>
            </section>

            <!-- Security -->
            <section id="security" class="mb-12">
              <v-alert
                border="start"
                color="#121212"
                theme="dark"
                variant="flat"
                class="security-alert rounded-xl pa-8"
              >
                <template v-slot:prepend>
                  <v-icon size="48" icon="mdi-lock-outline" color="#8c734b" />
                </template>
                <h3 class="text-h5 font-weight-bold mb-2">07. Security Safeguards</h3>
                <p class="text-body-2 opacity-80 mb-4">
                  We protect your personal information with security safeguards appropriate to the sensitivity of the data, 
                  in accordance with PIPEDA Principle 7.
                </p>
                <div class="d-flex flex-wrap ga-2">
                  <v-chip variant="outlined" color="white" size="small">TLS/SSL Encryption</v-chip>
                  <v-chip variant="outlined" color="white" size="small">Access Controls</v-chip>
                  <v-chip variant="outlined" color="white" size="small">Secure Authentication</v-chip>
                  <v-chip variant="outlined" color="white" size="small">Regular Audits</v-chip>
                  <v-chip variant="outlined" color="white" size="small">Data Minimization</v-chip>
                </div>
              </v-alert>
            </section>

            <!-- Your Rights -->
            <section id="rights" class="mb-12">
              <h2 class="section-title-premium mb-6">08. Your Rights Under PIPEDA</h2>
              <p class="mb-6">As a Canadian resident, you have the following rights regarding your personal information:</p>
              
              <div class="rights-grid">
                <div class="right-item" v-for="right in userRights" :key="right.title">
                  <v-icon :icon="right.icon" color="#8c734b" size="24" class="mr-3 mt-1" />
                  <div>
                    <div class="font-weight-bold mb-1">{{ right.title }}</div>
                    <div class="text-body-2 text-grey-darken-1">{{ right.desc }}</div>
                  </div>
                </div>
              </div>

              <v-btn
                color="#8c734b"
                variant="flat"
                class="mt-8 text-none"
                prepend-icon="mdi-file-document-edit-outline"
                to="/privacy/request"
                size="large"
                rounded="lg"
              >
                Submit a Privacy Request
              </v-btn>
            </section>

            <!-- Cookies -->
            <section id="cookies" class="mb-12">
              <h2 class="section-title-premium mb-6">09. Cookies &amp; Tracking Technologies</h2>
              <p class="mb-4">We use cookies and similar technologies to improve your experience. You can manage your preferences at any time.</p>
              
              <v-table density="compact" class="rounded-lg">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Purpose</th>
                    <th>Required</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="font-weight-bold">Essential</td>
                    <td>Authentication, security, basic functionality</td>
                    <td><v-chip color="success" size="x-small" variant="flat">Required</v-chip></td>
                  </tr>
                  <tr>
                    <td class="font-weight-bold">Functional</td>
                    <td>Remember preferences, saved searches</td>
                    <td><v-chip color="grey" size="x-small" variant="flat">Optional</v-chip></td>
                  </tr>
                  <tr>
                    <td class="font-weight-bold">Analytics</td>
                    <td>Usage patterns, site performance monitoring</td>
                    <td><v-chip color="grey" size="x-small" variant="flat">Optional</v-chip></td>
                  </tr>
                  <tr>
                    <td class="font-weight-bold">Marketing</td>
                    <td>Personalized property recommendations</td>
                    <td><v-chip color="grey" size="x-small" variant="flat">Optional</v-chip></td>
                  </tr>
                </tbody>
              </v-table>
            </section>

            <!-- Third Parties -->
            <section id="third-parties" class="mb-12">
              <h2 class="section-title-premium mb-6">10. Third-Party Services</h2>
              <p class="mb-4">We may share limited personal information with the following categories of service providers, under contractual obligations to protect your data:</p>
              
              <div class="purpose-card mb-4" v-for="tp in thirdParties" :key="tp.title">
                <v-icon :icon="tp.icon" color="#8c734b" class="mr-4" />
                <div>
                  <span class="font-weight-bold text-grey-darken-4 d-block">{{ tp.title }}</span>
                  <span class="text-body-2 text-grey-darken-1">{{ tp.desc }}</span>
                </div>
              </div>
            </section>

            <!-- Children's Privacy -->
            <section id="children" class="mb-12">
              <h2 class="section-title-premium mb-6">11. Children's Privacy</h2>
              <p>
                Our Service is not directed to individuals under the age of 18. We do not knowingly collect personal information 
                from children. If we become aware that a child has provided personal information, we will take steps to delete it promptly.
              </p>
            </section>

            <!-- Policy Changes -->
            <section id="changes" class="mb-12">
              <h2 class="section-title-premium mb-6">12. Changes to This Policy</h2>
              <p>
                We may update this privacy policy from time to time to reflect changes in our practices or legal requirements. 
                We will notify you of any material changes by posting the updated policy on this page and, where appropriate, 
                by email notification. We encourage you to review this policy periodically.
              </p>
            </section>

            <!-- Contact -->
            <section id="contact" class="mt-16">
              <div class="contact-footer-card">
                <h2 class="display-serif text-h4 mb-4">Privacy Inquiries</h2>
                <p class="mb-2">If you have questions, concerns, or wish to file a complaint about our privacy practices,</p>
                <p class="mb-8">contact our Privacy Officer:</p>
                
                <v-list bg-color="transparent">
                  <v-list-item 
                    prepend-icon="mdi-email-golden" 
                    title="abdulkabirojulari@gmail.com" 
                    subtitle="Privacy Officer"
                    class="px-0"
                  />
                  <v-list-item 
                    prepend-icon="mdi-phone-golden" 
                    title="647-563-7235" 
                    subtitle="Direct Inquiries"
                    class="px-0"
                  />
                  <v-list-item 
                    prepend-icon="mdi-web-golden" 
                    title="www.deelbot.ai" 
                    subtitle="DeelBot Platform"
                    class="px-0"
                  />
                </v-list>

                <div class="mt-8 pt-6" style="border-top: 1px solid rgba(255,255,255,0.15);">
                  <p class="text-body-2 opacity-60">
                    If you are not satisfied with our response, you have the right to file a complaint with the 
                    <a href="https://www.priv.gc.ca" target="_blank" style="color: #d4af37; text-decoration: none;">Office of the Privacy Commissioner of Canada</a>.
                  </p>
                </div>
              </div>
            </section>

          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const scrollTo = (id: string) => {
  const element = document.getElementById(id)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

const purposes = [
  { icon: 'mdi-home-search', title: 'Providing Real Estate Services', desc: 'Property search, alerts, AI-powered recommendations, and CRM features.' },
  { icon: 'mdi-account-cog', title: 'Account Management', desc: 'Creating and maintaining your account, authenticating your identity.' },
  { icon: 'mdi-file-sign', title: 'Document Processing', desc: 'Managing real estate documents, e-signatures, and transaction records.' },
  { icon: 'mdi-email-newsletter', title: 'Communications', desc: 'Sending property alerts, newsletters, and service updates you have consented to.' },
  { icon: 'mdi-shield-check', title: 'Legal & Security', desc: 'Fraud prevention, compliance with legal obligations, and protecting platform integrity.' },
  { icon: 'mdi-chart-box', title: 'Platform Improvement', desc: 'Analyzing anonymized usage data to enhance features and user experience.' },
]

const userRights = [
  { icon: 'mdi-eye', title: 'Right of Access', desc: 'Request access to the personal information we hold about you and learn how it has been used or disclosed.' },
  { icon: 'mdi-pencil', title: 'Right to Correction', desc: 'Request correction of inaccurate or incomplete personal information in our records.' },
  { icon: 'mdi-hand-back-left', title: 'Right to Withdraw Consent', desc: 'Withdraw your consent for data collection, use, or disclosure at any time.' },
  { icon: 'mdi-delete', title: 'Right to Deletion', desc: 'Request deletion of your personal information, subject to legal retention requirements.' },
  { icon: 'mdi-alert-circle', title: 'Right to Complain', desc: 'Lodge a complaint with our Privacy Officer or the Office of the Privacy Commissioner of Canada.' },
]

const thirdParties = [
  { icon: 'mdi-cloud', title: 'Hosting & Infrastructure', desc: 'Cloud servers and databases that store your data with encryption at rest.' },
  { icon: 'mdi-email-fast', title: 'Email Service Providers', desc: 'For sending transactional emails, alerts, and newsletters you opted into.' },
  { icon: 'mdi-google', title: 'Authentication Providers', desc: 'Google and Facebook OAuth for secure single sign-on authentication.' },
  { icon: 'mdi-map-marker', title: 'Mapping Services', desc: 'To display property locations and neighbourhood information on maps.' },
  { icon: 'mdi-robot', title: 'AI Services', desc: 'AI-powered property analysis and search, using anonymized or consented data.' },
]
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Inter:wght@300;400;500;600;700&display=swap');

.premium-page-wrapper {
  background-color: #fcfcfb;
  font-family: 'Inter', sans-serif;
}

.display-serif-large {
  font-family: 'Playfair Display', serif;
  font-size: 4rem;
  letter-spacing: -0.03em;
}

.display-serif {
  font-family: 'Playfair Display', serif;
}

.elegant-divider-gold {
  width: 80px;
  height: 4px;
  background: linear-gradient(90deg, #8c734b, #d4af37);
  border-radius: 2px;
}

.premium-badge-light {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  color: #fff;
  padding: 8px 20px;
  border-radius: 100px;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  border: 1px solid rgba(255,255,255,0.2);
}

.sticky-nav {
  position: sticky;
  top: 100px;
}

.back-link {
  text-decoration: none;
  color: #8c734b;
  font-weight: 700;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.nav-header {
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  color: #9ca3af;
  margin-bottom: 16px;
  letter-spacing: 0.1em;
}

.legal-nav-list .v-list-item {
  border-radius: 8px;
  margin-bottom: 4px;
  font-weight: 500;
  color: #4b5563;
  transition: all 0.2s;
}

.legal-nav-list .v-list-item:hover {
  background: #f4f1ea !important;
  color: #8c734b;
}

.update-card {
  border-top: 1px solid #e5e7eb;
  padding-top: 24px;
}

.editorial-card {
  border-radius: 32px !important;
  background: transparent !important;
}

.section-title-premium {
  font-family: 'Playfair Display', serif;
  font-size: 1.75rem;
  color: #121212;
  position: relative;
  display: flex;
  align-items: center;
}

.section-title-premium::after {
  content: "";
  flex-grow: 1;
  height: 1px;
  background: #e5e7eb;
  margin-left: 24px;
}

.definition-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.def-item {
  background: #fff;
  padding: 20px;
  border-radius: 16px;
  border: 1px solid #f1f1ee;
  box-shadow: 0 4px 12px rgba(0,0,0,0.02);
}

.def-term {
  display: block;
  font-weight: 800;
  color: #8c734b;
  font-size: 0.9rem;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.def-desc {
  font-size: 1rem;
  color: #4b5563;
  line-height: 1.6;
}

.data-pill {
  background: #fff;
  padding: 12px 16px;
  border-radius: 12px;
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  border: 1px solid #e5e7eb;
  color: #1f2937;
}

.purpose-card {
  background: #fff;
  padding: 16px 24px;
  border-radius: 16px;
  display: flex;
  align-items: flex-start;
  border: 1px solid #f1f1ee;
}

.consent-card {
  background: #fff;
  padding: 24px;
  border-radius: 16px;
  border: 1px solid #f1f1ee;
  text-align: center;
  height: 100%;
}

.retention-card {
  background: #fff;
  padding: 20px;
  border-radius: 16px;
  border: 1px solid #f1f1ee;
  text-align: center;
}

.rights-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.right-item {
  background: #fff;
  padding: 20px 24px;
  border-radius: 16px;
  border: 1px solid #f1f1ee;
  display: flex;
  align-items: flex-start;
}

.contact-footer-card {
  background: #121212;
  color: white;
  padding: 60px;
  border-radius: 40px;
  text-align: center;
}

.contact-footer-card p {
  opacity: 0.7;
}

.mdi-email-golden::before { content: "\F01EE"; color: #8c734b; }
.mdi-phone-golden::before { content: "\F03F2"; color: #8c734b; }
.mdi-web-golden::before { content: "\F02FB"; color: #8c734b; }

.letter-spacing-2 { letter-spacing: 2px; }
.letter-spacing-1 { letter-spacing: 1px; }

@media (max-width: 960px) {
  .display-serif-large {
    font-size: 2.5rem;
  }
  .contact-footer-card {
    padding: 30px;
  }
}
</style>
