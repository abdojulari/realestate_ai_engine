<template>
  <div class="property-detail">
    <!-- Image Gallery -->
    <v-container fluid class="pa-0">
      <v-row no-gutters>
        <v-col cols="12">
          <v-carousel
            v-if="Array.isArray(property.images) && property.images.length === 1"
            hide-delimiters
            height="600"
          >
            <v-carousel-item
              :src="(Array.isArray(property.images) && property.images.length ? property.images[0] : '/favicon.ico')"
              cover
            />
          </v-carousel>

          <div v-else class="image-grid">
            <v-img
              :src="(Array.isArray(property.images) && property.images.length ? property.images[0] : '/favicon.ico')"
              height="600"
              class="main-image"
              cover
              @click="openGallery(0)"
            >
              <template v-slot:placeholder>
                <v-row class="fill-height ma-0" align="center" justify="center">
                  <v-progress-circular indeterminate />
                </v-row>
              </template>
            </v-img>

            <div class="thumbnail-grid">
              <v-img
                v-for="(thumbnail, index) in thumbnailImages"
                :key="index"
                :src="thumbnail.url || '/favicon.ico'"
                height="197"
                cover
                class="thumbnail"
                @click="openGallery(thumbnail.imageIndex)"
              />
              <v-btn
                v-if="Array.isArray(property.images) && property.images.length > 5"
                color="grey-darken-3"
                class="more-photos"
                @click="openGallery(0)"
              >
                +{{ (Array.isArray(property.images) ? property.images.length : 0) - 4 }} more photos
              </v-btn>
            </div>
          </div>
        </v-col>
      </v-row>
    </v-container>

    <v-container class="py-8">
      <!-- Tabs -->
      <v-tabs v-model="selectedTab" class="mb-6" density="comfortable">
        <v-tab value="highlights">Highlights</v-tab>
        <v-tab value="payments">Monthly payments</v-tab>
        <v-tab value="neighbourhood">Neighbourhood</v-tab>
        <v-tab value="schools">Schools</v-tab>
      </v-tabs>

      <v-row>
        <v-col cols="12" md="8">
          <div v-show="selectedTab === 'highlights'">
            <div class="d-flex align-center mb-6 property-header">
              <div class="flex-grow-1">
                <h1 class="text-h4 font-weight-bold mb-2" style="color: #1a1a1a; line-height: 1.3;">{{ property.title }} {{ property.city }}, {{ property.province }}, {{ property.postalCode }}</h1>
              </div>
              <div class="d-flex align-center">
                <v-btn icon="mdi-share-variant" variant="tonal" size="large" class="mr-2" @click="shareProperty">
                  <v-icon>mdi-share-variant</v-icon>
                </v-btn>
                <v-btn :icon="property.isSaved ? 'mdi-heart' : 'mdi-heart-outline'" :color="property.isSaved ? 'red' : 'grey'" variant="tonal" size="large" @click="toggleSave" />
              </div>
            </div>
            <div class="price-badge mb-6 pa-4" style="background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%); border-radius: 16px; display: inline-block; box-shadow: 0 4px 20px rgba(25, 118, 210, 0.3);">
              <div class="text-caption" style="color: rgba(255,255,255,0.9); font-weight: 600; letter-spacing: 1px;">LISTING PRICE</div>
              <div class="text-h4 font-weight-bold" style="color: white;">${{ formatPrice(property.price) }}</div>
            </div>
            <div class="d-flex align-center mb-6 flex-wrap" style="gap: 12px;">
              <v-chip size="large" class="px-4" color="primary" variant="flat">
                <v-icon class="mr-2">mdi-home-variant</v-icon>
                {{ property.type }}
              </v-chip>
              <v-chip size="large" class="px-4" color="indigo" variant="tonal">
                <v-icon class="mr-2">mdi-bed</v-icon>
                {{ property.beds }} beds
              </v-chip>
              <v-chip size="large" class="px-4" color="teal" variant="tonal">
                <v-icon class="mr-2">mdi-shower</v-icon>
                {{ property.baths }} baths
              </v-chip>
              <v-chip size="large" class="px-4" color="purple" variant="tonal">
                <v-icon class="mr-2">mdi-ruler-square</v-icon>
                {{ property.sqft }} sqft
              </v-chip>
            </div>
            <v-card class="mb-6 property-details-card" flat elevation="2">
              <v-card-text class="pa-6">
                <div class="text-h6 mb-6 d-flex align-center">
                  <v-icon class="mr-2" color="primary">mdi-home-city</v-icon>
                  Property Details
                </div>
                <v-row>
                  <v-col cols="6" sm="4">
                    <div class="detail-item">
                      <div class="text-caption text-medium-emphasis mb-1">Property Type</div>
                      <div class="text-body-1 font-weight-medium text-capitalize">{{ property.type }}</div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.yearBuilt">
                    <div class="detail-item">
                      <div class="text-caption text-medium-emphasis mb-1">Year Built</div>
                      <div class="text-body-1 font-weight-medium">{{ property.features.yearBuilt }}</div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.garage">
                    <div class="detail-item">
                      <div class="text-caption text-medium-emphasis mb-1">Parking</div>
                      <div class="text-body-1 font-weight-medium">{{ property.features.garage }} spaces</div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.heating">
                    <div class="detail-item">
                      <div class="text-caption text-medium-emphasis mb-1">Heating</div>
                      <div class="text-body-1 font-weight-medium">{{ formatArray(property.features.heating) }}</div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.cooling">
                    <div class="detail-item">
                      <div class="text-caption text-medium-emphasis mb-1">Cooling</div>
                      <div class="text-body-1 font-weight-medium">{{ formatArray(property.features.cooling) }}</div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.lotSize">
                    <div class="detail-item">
                      <div class="text-caption text-medium-emphasis mb-1">Lot Size</div>
                      <div class="text-body-1 font-weight-medium">{{ property.features.lotSize }} {{ property.features.lotSize > 1 ? 'acres' : 'sqft' }}</div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.basement">
                    <div class="detail-item">
                      <div class="text-caption text-medium-emphasis mb-1">Basement</div>
                      <div class="text-body-1 font-weight-medium">{{ formatArray(property.features.basement) }}</div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.taxes">
                    <div class="detail-item">
                      <div class="text-caption text-medium-emphasis mb-1">Annual Taxes</div>
                      <div class="text-body-1 font-weight-medium">${{ formatPrice(property.features.taxes) }} ({{ property.features.taxYear }})</div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.hoaFee">
                    <div class="detail-item">
                      <div class="text-caption text-medium-emphasis mb-1">HOA Fee</div>
                      <div class="text-body-1 font-weight-medium">${{ formatPrice(property.features.hoaFee) }}/month</div>
                    </div>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
            <v-card class="mb-6 description-card" flat elevation="2">
              <v-card-text class="pa-6">
                <div class="text-h6 mb-4 d-flex align-center">
                  <v-icon class="mr-2" color="primary">mdi-text-box-outline</v-icon>
                  Description
                </div>
                <div class="text-body-1 description-text" style="line-height: 1.8; color: #444;">{{ property.description }}</div>
              </v-card-text>
            </v-card>
            <v-card class="mb-6 features-card" v-if="hasFeatures" flat elevation="2">
              <v-card-text class="pa-6">
                <div class="text-h6 mb-6 d-flex align-center">
                  <v-icon class="mr-2" color="primary">mdi-star-circle</v-icon>
                  Features & Amenities
                </div>
                <!-- The feature blocks remain unchanged -->
                <div v-if="property.features?.appliances?.length" class="mb-6">
                  <div class="text-subtitle-1 font-weight-semibold mb-3 d-flex align-center">
                    <v-icon class="mr-2" size="small" color="primary">mdi-fridge</v-icon>
                    Appliances
                  </div>
                  <v-chip-group>
                    <v-chip v-for="appliance in property.features.appliances" :key="appliance" variant="tonal" size="default" color="primary">{{ appliance }}</v-chip>
                  </v-chip-group>
                </div>
                <div v-if="property.features?.interiorFeatures?.length" class="mb-6">
                  <div class="text-subtitle-1 font-weight-semibold mb-3 d-flex align-center">
                    <v-icon class="mr-2" size="small" color="primary">mdi-home-outline</v-icon>
                    Interior Features
                  </div>
                  <v-chip-group>
                    <v-chip v-for="feature in property.features.interiorFeatures" :key="feature" variant="tonal" size="default" color="indigo">{{ feature }}</v-chip>
                  </v-chip-group>
                </div>
                <div v-if="property.features?.exteriorFeatures?.length" class="mb-6">
                  <div class="text-subtitle-1 font-weight-semibold mb-3 d-flex align-center">
                    <v-icon class="mr-2" size="small" color="primary">mdi-home-siding</v-icon>
                    Exterior Features
                  </div>
                  <v-chip-group>
                    <v-chip v-for="feature in property.features.exteriorFeatures" :key="feature" variant="tonal" size="default" color="green">{{ feature }}</v-chip>
                  </v-chip-group>
                </div>
                <div v-if="property.features?.flooring?.length" class="mb-6">
                  <div class="text-subtitle-1 font-weight-semibold mb-3 d-flex align-center">
                    <v-icon class="mr-2" size="small" color="primary">mdi-view-grid</v-icon>
                    Flooring
                  </div>
                  <v-chip-group>
                    <v-chip v-for="floor in property.features.flooring" :key="floor" variant="tonal" size="default" color="brown">{{ floor }}</v-chip>
                  </v-chip-group>
                </div>
                <div v-if="property.features?.poolFeatures?.length" class="mb-6">
                  <div class="text-subtitle-1 font-weight-semibold mb-3 d-flex align-center">
                    <v-icon class="mr-2" size="small" color="blue">mdi-pool</v-icon>
                    Pool Features
                  </div>
                  <v-chip-group>
                    <v-chip v-for="pool in property.features.poolFeatures" :key="pool" variant="tonal" size="default" color="blue">{{ pool }}</v-chip>
                  </v-chip-group>
                </div>
                <div v-if="property.features?.fireplaceFeatures?.length">
                  <div class="text-subtitle-1 font-weight-semibold mb-3 d-flex align-center">
                    <v-icon class="mr-2" size="small" color="orange">mdi-fireplace</v-icon>
                    Fireplace Features
                  </div>
                  <v-chip-group>
                    <v-chip v-for="fireplace in property.features.fireplaceFeatures" :key="fireplace" variant="tonal" size="default" color="orange">{{ fireplace }}</v-chip>
                  </v-chip-group>
                </div>
              </v-card-text>
            </v-card>
            <v-card class="mb-6 location-card" flat elevation="2">
              <v-card-text class="pa-6">
                <div class="text-h6 mb-4 d-flex align-center">
                  <v-icon class="mr-2" color="primary">mdi-map-marker</v-icon>
                  Location
                </div>
                <div class="mb-4 text-body-1 font-weight-medium" style="color: #555;">
                  <v-icon class="mr-1" size="small" color="primary">mdi-home-map-marker</v-icon>
                  {{ property.address }}, {{ property.city }}, {{ property.province }}, {{ property.postalCode }}
                </div>
                <client-only>
                  <div v-if="property.latitude && property.longitude" class="map-container">
                    <l-map :zoom="15" :center="[property.latitude, property.longitude]" style="height: 400px; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.1);">
                      <l-tile-layer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <l-marker :lat-lng="[property.latitude, property.longitude]"><l-popup>{{ property.address }}</l-popup></l-marker>
                    </l-map>
                  </div>
                  <div v-else class="d-flex align-center justify-center" style="height: 400px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px;">
                    <div class="text-center">
                      <v-icon size="64" class="text-grey mb-2">mdi-map-marker-off</v-icon>
                      <div class="text-grey">Location not available</div>
                    </div>
                  </div>
                  <template #fallback>
                    <div class="d-flex align-center justify-center" style="height: 400px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px;">
                      <div class="text-center">
                        <v-progress-circular indeterminate color="primary" size="48" />
                        <div class="mt-4 text-body-1 text-medium-emphasis">Loading map...</div>
                      </div>
                    </div>
                  </template>
                </client-only>
              </v-card-text>
            </v-card>
          </div>

          <div v-show="selectedTab === 'payments'">
            <v-card flat elevation="2" class="payment-card">
              <v-card-text class="pa-6">
                <div class="text-h6 mb-6 d-flex align-center">
                  <v-icon class="mr-2" color="primary">mdi-calculator</v-icon>
                  Monthly Payment Calculator
                </div>
                <v-form class="mb-6">
                  <v-text-field v-model.number="calc.price" label="Home price" prefix="$" variant="outlined" density="comfortable" class="mb-3" />
                  <v-text-field v-model.number="calc.downPercent" label="Down payment (%)" suffix="%" variant="outlined" density="comfortable" class="mb-3" />
                  <v-text-field v-model.number="calc.rate" label="Interest rate (APR %)" suffix="%" variant="outlined" density="comfortable" class="mb-3" />
                  <v-text-field v-model.number="calc.years" label="Amortization (years)" variant="outlined" density="comfortable" />
                </v-form>
                <v-divider class="my-6" />
                <div class="payment-result pa-4" style="background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%); border-radius: 12px; color: white;">
                  <div class="text-subtitle-2 mb-2 opacity-90">Estimated Monthly Payment</div>
                  <div class="text-h4 font-weight-bold mb-3">${{ formatPrice(monthlyPayment) }}</div>
                  <div class="text-caption opacity-90" style="line-height: 1.6;">
                    Principal & interest on a ${{ formatPrice(loanAmount) }} mortgage at {{ calc.rate }}% for {{ calc.years }} years
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </div>

          <div v-show="selectedTab === 'neighbourhood'">
            <v-card flat elevation="2" class="neighbourhood-card">
              <v-card-text class="pa-6">
                <div class="text-h6 mb-6 d-flex align-center">
                  <v-icon class="mr-2" color="primary">mdi-map-marker-radius</v-icon>
                  Nearby Points of Interest
                </div>
                <div class="mb-6">
                  <v-btn-toggle v-model="transportMode" mandatory class="transport-toggle" divided elevation="2">
                    <v-btn value="walk" prepend-icon="mdi-walk" class="px-6">Walking</v-btn>
                    <v-btn value="bike" prepend-icon="mdi-bike" class="px-6">Biking</v-btn>
                    <v-btn value="car" prepend-icon="mdi-car" class="px-6">Car</v-btn>
                  </v-btn-toggle>
                </div>
                <v-alert v-if="poiError" type="error" variant="tonal" density="comfortable" class="mb-4" rounded="lg">{{ poiError }}</v-alert>
                <v-skeleton-loader v-if="poiLoading" type="table-row@5" />
                <v-table v-else class="premium-table">
                  <thead>
                    <tr>
                      <th class="text-left">Category</th>
                      <th class="text-left">Name</th>
                      <th class="text-left">Distance</th>
                      <th class="text-left">ETA</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in pois" :key="item.id">
                      <td><v-chip size="small" variant="tonal" color="primary">{{ item.category }}</v-chip></td>
                      <td class="font-weight-medium">{{ item.name }}</td>
                      <td>{{ (item.distance/1000).toFixed(2) }} km</td>
                      <td>{{ formatEtaMinutes(item.distance) }} min ({{ transportMode }})</td>
                    </tr>
                  </tbody>
                </v-table>
              </v-card-text>
            </v-card>
          </div>

          <div v-show="selectedTab === 'schools'">
            <v-card flat elevation="2" class="schools-card">
              <v-card-text class="pa-6">
                <div class="d-flex align-center justify-space-between mb-6">
                  <div class="text-h6 d-flex align-center">
                    <v-icon class="mr-2" color="primary">mdi-school</v-icon>
                    Nearby Schools
                  </div>
                  
                  <!-- Transportation Mode Selector -->
                  <div class="transport-selector">
                    <v-btn-toggle
                      v-model="schoolTransportMode"
                      mandatory
                      density="comfortable"
                      divided
                      elevation="2"
                      @update:model-value="updateSchoolETAs"
                    >
                      <v-btn value="walking" size="small" class="px-4">
                        <v-icon>mdi-walk</v-icon>
                        <span class="ml-1">Walk</span>
                      </v-btn>
                      <v-btn value="biking" size="small" class="px-4">
                        <v-icon>mdi-bike</v-icon>
                        <span class="ml-1">Bike</span>
                      </v-btn>
                      <v-btn value="car" size="small" class="px-4">
                        <v-icon>mdi-car</v-icon>
                        <span class="ml-1">Car</span>
                      </v-btn>
                    </v-btn-toggle>
                  </div>
                </div>
                
                <v-alert v-if="schoolsError" type="error" variant="tonal" density="comfortable" class="mb-4" rounded="lg">{{ schoolsError }}</v-alert>
                <v-skeleton-loader v-if="schoolsLoading" type="table-row@5" />
                <v-table v-else class="premium-table">
                  <thead>
                    <tr>
                      <th class="text-left">School Name</th>
                      <th class="text-left">Distance</th>
                      <th class="text-left">ETA</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="s in schools" :key="s.id">
                      <td class="font-weight-medium">{{ s.name }}</td>
                      <td>{{ (s.distance/1000).toFixed(2) }} km</td>
                      <td><v-chip size="small" variant="tonal" color="success">{{ formatEtaMinutes(s.distance, schoolTransportMode) }} min</v-chip></td>
                    </tr>
                  </tbody>
                </v-table>
              </v-card-text>
            </v-card>
          </div>
        </v-col>

        <!-- Persistent Contact Form -->
        <v-col cols="12" md="4">
          <div class="sticky-sidebar">
            <v-card class="mb-4 contact-form-card" flat elevation="3">
              <v-card-text class="pa-6">
                <div class="text-h6 mb-6 d-flex align-center">
                  <v-icon class="mr-2" color="primary">mdi-email-outline</v-icon>
                  Contact Agent
                </div>
                <v-form v-model="isFormValid" @submit.prevent="handleSubmit">
                  <v-text-field 
                    v-model="contactForm.name" 
                    label="Your Name" 
                    :rules="nameRules" 
                    required 
                    variant="outlined" 
                    density="comfortable"
                    id="property-contact-name"
                    class="mb-3"
                    prepend-inner-icon="mdi-account"
                  />
                  <v-text-field 
                    v-model="contactForm.email" 
                    label="Email" 
                    type="email" 
                    :rules="emailRules" 
                    required 
                    variant="outlined" 
                    density="comfortable"
                    id="property-contact-email"
                    class="mb-3"
                    prepend-inner-icon="mdi-email"
                  />
                  <v-text-field 
                    v-model="contactForm.phone" 
                    label="Phone" 
                    :rules="phoneRules" 
                    variant="outlined" 
                    density="comfortable"
                    id="property-contact-phone"
                    class="mb-3"
                    prepend-inner-icon="mdi-phone"
                  />
                  <v-textarea 
                    v-model="contactForm.message" 
                    label="Message" 
                    :rules="messageRules" 
                    required 
                    variant="outlined" 
                    density="comfortable" 
                    rows="4"
                    id="property-contact-message"
                    class="mb-4"
                    prepend-inner-icon="mdi-message-text"
                  />
                  <v-btn type="submit" color="primary" block size="large" :loading="loading" :disabled="!isFormValid" class="mb-4 text-none font-weight-bold" elevation="4">
                    <v-icon class="mr-2">mdi-send</v-icon>
                    Contact Agent
                  </v-btn>
                </v-form>
                <v-divider class="my-6" />
                <div class="action-buttons">
                  <v-btn variant="outlined" color="primary" block size="large" class="mb-3 text-none font-weight-semibold" @click="scheduleViewing">
                    <v-icon class="mr-2">mdi-calendar-clock</v-icon>
                    Schedule Viewing
                  </v-btn>
                  <v-btn variant="tonal" color="success" block size="large" prepend-icon="mdi-phone" :href="`tel:${property.agent?.phone}`" class="text-none font-weight-semibold">
                    Call Agent Now
                  </v-btn>
                </div>
              </v-card-text>
            </v-card>
            
            <!-- Agent Information Card -->
            <v-card flat elevation="3" class="agent-card">
            <v-card-text>
              <div class="text-h6 mb-4">Listing Agent</div>
              
              <!-- Enhanced CREA Agent Data (if available) -->
              <div v-if="property.listingAgentData" class="agent-info">
                <div class="d-flex align-start mb-4">
                  <!-- Agent Photo -->
                  <v-avatar 
                    size="80" 
                    class="mr-4"
                    :color="property.listingAgentData.photoURL ? 'transparent' : 'primary'"
                  >
                    <v-img 
                      v-if="property.listingAgentData.photoURL"
                      :src="property.listingAgentData.photoURL"
                      :alt="property.listingAgentData.fullName || `${property.listingAgentData.firstName || ''} ${property.listingAgentData.lastName || ''}`.trim() || 'Agent Photo'"
                      cover
                    />
                    <v-icon v-else size="40" color="white">mdi-account</v-icon>
                  </v-avatar>
                  
                  <!-- Agent Details -->
                  <div class="flex-grow-1">
                    <div class="text-h6 mb-1">
                      {{ property.listingAgentData.fullName || 
                          (property.listingAgentData.firstName && property.listingAgentData.lastName 
                            ? `${property.listingAgentData.firstName} ${property.listingAgentData.lastName}` 
                            : property.listingAgentData.firstName || property.listingAgentData.lastName || 'Agent Name Not Available') }}
                    </div>
                    <div v-if="property.listingAgentData.designations?.length" class="text-caption text-primary mb-2">
                      {{ property.listingAgentData.designations.join(', ') }}
                    </div>
                    <div v-if="property.listingAgentData.license" class="text-caption text-grey mb-2">
                      License: {{ property.listingAgentData.license }}
                    </div>
                    
                    <!-- Contact Information -->
                    <div class="contact-info">
                      <!-- Direct Phone (Primary) -->
                      <div v-if="property.listingAgentData.directPhone" class="d-flex align-center mb-1">
                        <v-icon size="small" class="mr-2">mdi-phone</v-icon>
                        <a :href="`tel:${property.listingAgentData.directPhone}`" class="text-decoration-none">
                          {{ property.listingAgentData.directPhone }}
                        </a>
                        <span class="text-caption text-grey ml-2">(Direct)</span>
                      </div>
                      
                      <!-- Mobile Phone (if different from direct) -->
                      <div v-if="property.listingAgentData.mobilePhone && property.listingAgentData.mobilePhone !== property.listingAgentData.directPhone" class="d-flex align-center mb-1">
                        <v-icon size="small" class="mr-2">mdi-cellphone</v-icon>
                        <a :href="`tel:${property.listingAgentData.mobilePhone}`" class="text-decoration-none">
                          {{ property.listingAgentData.mobilePhone }}
                        </a>
                        <span class="text-caption text-grey ml-2">(Mobile)</span>
                      </div>
                      
                      <!-- Office Phone (if different from direct and mobile) -->
                      <div v-if="property.listingAgentData.officePhone && 
                                 property.listingAgentData.officePhone !== property.listingAgentData.directPhone && 
                                 property.listingAgentData.officePhone !== property.listingAgentData.mobilePhone" 
                           class="d-flex align-center mb-1">
                        <v-icon size="small" class="mr-2">mdi-phone-classic</v-icon>
                        <a :href="`tel:${property.listingAgentData.officePhone}`" class="text-decoration-none">
                          {{ property.listingAgentData.officePhone }}
                        </a>
                        <span class="text-caption text-grey ml-2">(Office)</span>
                      </div>
                      
                      <!-- Email -->
                      <div v-if="property.listingAgentData.email" class="d-flex align-center mb-1">
                        <v-icon size="small" class="mr-2">mdi-email</v-icon>
                        <a :href="`mailto:${property.listingAgentData.email}`" class="text-decoration-none">
                          {{ property.listingAgentData.email }}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Office Information -->
                <div v-if="property.listingOfficeData" class="office-info mt-4 pt-4" style="border-top: 1px solid #e0e0e0;">
                  <div class="text-subtitle-1 font-weight-medium mb-2">{{ property.listingOfficeData.name }}</div>
                  
                  <div class="office-details">
                    <div v-if="property.listingOfficeData.phone" class="d-flex align-center mb-1">
                      <v-icon size="small" class="mr-2">mdi-phone-classic</v-icon>
                      <a :href="`tel:${property.listingOfficeData.phone}`" class="text-decoration-none">
                        {{ property.listingOfficeData.phone }}
                      </a>
                    </div>
                    <div v-if="property.listingOfficeData.email" class="d-flex align-center mb-1">
                      <v-icon size="small" class="mr-2">mdi-email-outline</v-icon>
                      <a :href="`mailto:${property.listingOfficeData.email}`" class="text-decoration-none">
                        {{ property.listingOfficeData.email }}
                      </a>
                    </div>
                    <div v-if="property.listingOfficeData.address" class="d-flex align-start mb-1">
                      <v-icon size="small" class="mr-2 mt-1">mdi-map-marker</v-icon>
                      <div>
                        {{ property.listingOfficeData.address }}
                        <span v-if="property.listingOfficeData.city">, {{ property.listingOfficeData.city }}</span>
                        <span v-if="property.listingOfficeData.province">, {{ property.listingOfficeData.province }}</span>
                        <span v-if="property.listingOfficeData.postalCode">, {{ property.listingOfficeData.postalCode }}</span>
                      </div>
                    </div>
                    <div v-if="property.listingOfficeData.website" class="d-flex align-center mb-1">
                      <v-icon size="small" class="mr-2">mdi-web</v-icon>
                      <a :href="property.listingOfficeData.website" target="_blank" class="text-decoration-none">
                        {{ property.listingOfficeData.website }}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Fallback to Simple Agent Data -->
              <div v-else-if="property.agent || property.listingAgent" class="agent-info">
                <div class="d-flex align-start mb-4">
                  <!-- Agent Photo Placeholder -->
                  <v-avatar size="80" class="mr-4" color="primary">
                    <v-img 
                      v-if="property.agent?.photo"
                      :src="property.agent.photo"
                      :alt="property.agent.name || `${property.agent.firstName} ${property.agent.lastName}`"
                      cover
                    />
                    <v-icon v-else size="40" color="white">mdi-account</v-icon>
                  </v-avatar>
                  
                  <!-- Agent Details -->
                  <div class="flex-grow-1">
                    <div class="text-h6 mb-1">
                      {{ property.agent?.name || `${property.agent?.firstName || ''} ${property.agent?.lastName || ''}`.trim() || property.listingAgent }}
                    </div>
                    <div v-if="property.agent?.agency" class="text-caption text-grey mb-2">
                      {{ property.agent.agency }}
                    </div>
                    
                    <!-- Contact Information -->
                    <div class="contact-info">
                      <div v-if="property.agent?.phone" class="d-flex align-center mb-1">
                        <v-icon size="small" class="mr-2">mdi-phone</v-icon>
                        <a :href="`tel:${property.agent.phone}`" class="text-decoration-none">
                          {{ property.agent.phone }}
                        </a>
                      </div>
                      <div v-if="property.agent?.email" class="d-flex align-center mb-1">
                        <v-icon size="small" class="mr-2">mdi-email</v-icon>
                        <a :href="`mailto:${property.agent.email}`" class="text-decoration-none">
                          {{ property.agent.email }}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Office Information (Simple) -->
                <div v-if="property.listingOffice" class="office-info mt-4 pt-4" style="border-top: 1px solid #e0e0e0;">
                  <div class="text-subtitle-1 font-weight-medium">{{ property.listingOffice }}</div>
                </div>
              </div>
              
              <!-- No Agent Data Available -->
              <div v-else class="text-center py-4">
                <v-icon size="48" color="grey-lighten-1">mdi-account-question</v-icon>
                <div class="text-body-2 text-grey mt-2">Agent information not available</div>
              </div>
              
              <!-- Co-Listing Agents (if available) -->
              <div v-if="property.coListingAgentsData?.length" class="co-agents mt-4 pt-4" style="border-top: 1px solid #e0e0e0;">
                <div class="text-subtitle-1 font-weight-medium mb-3">Co-Listing Agents</div>
                <div v-for="coAgent in property.coListingAgentsData" :key="coAgent.memberKey" class="d-flex align-start mb-3">
                  <v-avatar 
                    size="60" 
                    class="mr-3"
                    :color="coAgent.photoURL ? 'transparent' : 'secondary'"
                  >
                    <v-img 
                      v-if="coAgent.photoURL"
                      :src="coAgent.photoURL"
                      :alt="coAgent.fullName || `${coAgent.firstName || ''} ${coAgent.lastName || ''}`.trim() || 'Co-Agent Photo'"
                      cover
                    />
                    <v-icon v-else size="30" color="white">mdi-account</v-icon>
                  </v-avatar>
                  
                  <div class="flex-grow-1">
                    <div class="text-body-1 font-weight-medium">
                      {{ coAgent.fullName || 
                          (coAgent.firstName && coAgent.lastName 
                            ? `${coAgent.firstName} ${coAgent.lastName}` 
                            : coAgent.firstName || coAgent.lastName || 'Co-Agent Name Not Available') }}
                    </div>
                    <div v-if="coAgent.designations?.length" class="text-caption text-secondary mb-1">
                      {{ coAgent.designations.join(', ') }}
                    </div>
                    
                    <!-- Co-Agent Contact Info -->
                    <div class="co-agent-contact">
                      <div v-if="coAgent.directPhone" class="text-caption mb-1">
                        <v-icon size="small" class="mr-1">mdi-phone</v-icon>
                        <a :href="`tel:${coAgent.directPhone}`" class="text-decoration-none">
                          {{ coAgent.directPhone }}
                        </a>
                        <span class="text-grey ml-1">(Direct)</span>
                      </div>
                      <div v-if="coAgent.mobilePhone && coAgent.mobilePhone !== coAgent.directPhone" class="text-caption mb-1">
                        <v-icon size="small" class="mr-1">mdi-cellphone</v-icon>
                        <a :href="`tel:${coAgent.mobilePhone}`" class="text-decoration-none">
                          {{ coAgent.mobilePhone }}
                        </a>
                        <span class="text-grey ml-1">(Mobile)</span>
                      </div>
                      <div v-if="coAgent.email" class="text-caption">
                        <v-icon size="small" class="mr-1">mdi-email</v-icon>
                        <a :href="`mailto:${coAgent.email}`" class="text-decoration-none">
                          {{ coAgent.email }}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </v-card-text>
          </v-card>
          </div>
        </v-col>
      </v-row>

    </v-container>

    <!-- Image Gallery Dialog -->
    <v-dialog
      v-model="showGallery"
      fullscreen
      :scrim="true"
      transition="dialog-bottom-transition"
      class="gallery-dialog"
    >
      <v-card flat class="gallery-card">
        <v-toolbar 
          color="rgba(0, 0, 0, 0.85)" 
          class="gallery-toolbar"
          style="backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);"
        >
          <v-btn
            icon="mdi-close"
            size="large"
            variant="text"
            @click="showGallery = false"
          />
          <v-toolbar-title class="text-h6 font-weight-medium">Property Gallery</v-toolbar-title>
          <v-spacer />
          <div class="text-body-1 font-weight-medium">
            {{ currentImageIndex + 1 }} / {{ property.images?.length }}
          </div>
        </v-toolbar>

        <div class="gallery-carousel-container">
          <v-carousel
            v-model="currentImageIndex"
            height="calc(100vh - 64px)"
            hide-delimiters
            show-arrows="hover"
            class="gallery-carousel"
          >
            <v-carousel-item
              v-for="(image, index) in property.images"
              :key="index"
              :src="image"
              contain
            >
              <template v-slot:placeholder>
                <v-row class="fill-height ma-0" align="center" justify="center">
                  <v-progress-circular indeterminate color="white" size="64" />
                </v-row>
              </template>
            </v-carousel-item>
          </v-carousel>
        </div>
      </v-card>
    </v-dialog>

    <!-- Schedule Viewing Dialog -->
    <v-dialog v-model="showViewingDialog" max-width="600" class="viewing-dialog">
      <v-card rounded="xl" elevation="24">
        <v-card-title class="pa-6 d-flex align-center" style="background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%); color: white;">
          <v-icon class="mr-3" size="large">mdi-calendar-clock</v-icon>
          <span class="text-h5 font-weight-bold">Schedule a Viewing</span>
        </v-card-title>
        <v-card-text class="pa-6">
          <v-form v-model="isViewingFormValid" @submit.prevent="submitViewingRequest">
            <v-text-field
              v-model="viewingForm.date"
              label="Preferred Date"
              type="date"
              class="mb-4"
              variant="outlined"
              density="comfortable"
              required
              prepend-inner-icon="mdi-calendar"
            />

            <v-select
              v-model="viewingForm.time"
              :items="availableTimes"
              label="Preferred Time"
              required
              variant="outlined"
              density="comfortable"
              class="mb-4"
              prepend-inner-icon="mdi-clock-outline"
            />

            <v-textarea
              v-model="viewingForm.notes"
              label="Additional Notes (Optional)"
              variant="outlined"
              rows="4"
              density="comfortable"
              prepend-inner-icon="mdi-note-text"
            />

            <v-card-actions class="px-0 pt-4">
              <v-btn
                variant="text"
                size="large"
                @click="showViewingDialog = false"
                class="text-none font-weight-semibold"
              >
                Cancel
              </v-btn>
              <v-spacer />
              <v-btn
                color="primary"
                type="submit"
                size="large"
                :loading="viewingLoading"
                :disabled="!isViewingFormValid"
                elevation="4"
                class="px-8 text-none font-weight-bold"
              >
                <v-icon class="mr-2">mdi-check-circle</v-icon>
                Confirm Viewing
              </v-btn>
            </v-card-actions>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { propertyService } from '~/services/property.service'
const GEOAPIFY_KEY = import.meta.env.VITE_GEOAPIFY
const GEOAPIFY_URL = import.meta.env.GEOAPIFY_API_URL || 'https://api.geoapify.com/v2'

const route = useRoute()
const loading = ref(false)

// Save functionality
const { toggleSave: toggleSaveProperty } = useProperty()
const showGallery = ref(false)
const currentImageIndex = ref(0)
const showViewingDialog = ref(false)
const viewingLoading = ref(false)
const isFormValid = ref(false)
const isViewingFormValid = ref(false)
const selectedTab = ref<'highlights' | 'payments' | 'neighbourhood' | 'schools'>('highlights')

// Mortgage calculator state
const calc = ref({
  price: 0,
  downPercent: 20,
  rate: 5.25,
  years: 25
})

const loanAmount = computed(() => {
  const price = Number(calc.value.price) || 0
  const down = Math.max(0, Math.min(100, Number(calc.value.downPercent) || 0))
  return Math.max(0, Math.round(price * (1 - down / 100)))
})

const monthlyPayment = computed(() => {
  const P = loanAmount.value
  const monthlyRate = (Number(calc.value.rate) || 0) / 100 / 12
  const n = (Number(calc.value.years) || 0) * 12
  if (P <= 0 || monthlyRate <= 0 || n <= 0) return 0
  const m = P * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1)
  return Math.round(m)
})

// Neighbourhood (Geoapify)
const transportMode = ref<'walk' | 'bike' | 'car'>('walk')
const schoolTransportMode = ref<'walking' | 'biking' | 'car'>('car')
const poiLimit = ref(2)
const pois = ref<{ id: string; category: string; name: string; distance: number }[]>([])
const poiLoading = ref(false)
const poiError = ref('')

const geoCategories = [
  { key: 'cafes', label: 'Cafes', category: 'catering.cafe' },
  { key: 'grocery', label: 'Grocery stores', category: 'commercial.supermarket' },
  { key: 'parks', label: 'Parks', category: 'leisure.park' },
  { key: 'restaurants', label: 'Restaurants', category: 'catering.restaurant' },
  { key: 'shopping', label: 'Shopping centers', category: 'commercial.shopping_mall' }
]

function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (v: number) => v * Math.PI / 180
  const R = 6371000 // meters
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function getSpeedKmh(mode: 'walk' | 'bike' | 'car' | 'walking' | 'biking') {
  if (mode === 'walk' || mode === 'walking') return 5
  if (mode === 'bike' || mode === 'biking') return 15
  return 40 // car
}

function formatEtaMinutes(distanceMeters: number, mode?: string) {
  const transportModeToUse = mode || transportMode.value
  const speedKmh = getSpeedKmh(transportModeToUse as 'walk' | 'bike' | 'car' | 'walking' | 'biking')
  const metersPerMinute = (speedKmh * 1000) / 60
  const minutes = distanceMeters / metersPerMinute
  return Math.max(1, Math.round(minutes))
}

// Update school ETAs when transport mode changes
const updateSchoolETAs = () => {
  // The ETA will automatically update since it's reactive
  console.log('🚗 School transport mode changed to:', schoolTransportMode.value)
}

async function loadPois() {
  if (!property.value?.latitude || !property.value?.longitude) return
  poiLoading.value = true
  poiError.value = ''
  pois.value = []
  try {
    const lon = property.value.longitude
    const lat = property.value.latitude
    const results: any[] = []
    for (const c of geoCategories) {
      const url = `${GEOAPIFY_URL}/places?categories=${encodeURIComponent(c.category)}&filter=circle:${lon},${lat},10000&limit=${poiLimit.value}&apiKey=${GEOAPIFY_KEY}`
      const res = await fetch(url)
      if (!res.ok) {
        let body: any = undefined
        try { body = await res.json() } catch {}
        const msg = body?.error || body?.message || body?.statusMessage || res.statusText || `HTTP ${res.status}`
        throw new Error(`Geoapify ${c.key} failed: ${msg}`)
      }
      const data = await res.json()
      const items = (data.features || []).map((f: any) => {
        const coords = Array.isArray(f.geometry?.coordinates) ? f.geometry.coordinates : [0, 0]
        const poiLon = Number(coords[0])
        const poiLat = Number(coords[1])
        const distance = isFinite(poiLon) && isFinite(poiLat)
          ? haversineDistanceMeters(lat, lon, poiLat, poiLon)
          : 0
        return {
          id: f.properties?.place_id || `${c.key}-${f.properties?.name}-${distance}`,
          category: c.label,
          name: f.properties?.name || 'Unknown',
          distance
        }
      })
      results.push(...items)
    }
    // sort by distance ascending
    pois.value = results.sort((a, b) => a.distance - b.distance)
  } catch (e: any) {
    poiError.value = e?.message || 'Failed to load nearby places'
  } finally {
    poiLoading.value = false
  }
}

// Schools via Geoapify
const schools = ref<{ id: string; name: string; distance: number }[]>([])
const schoolsLoading = ref(false)
const schoolsError = ref('')

async function loadSchools() {
  if (!property.value?.latitude || !property.value?.longitude) return
  schoolsLoading.value = true
  schoolsError.value = ''
  schools.value = []
  try {
    const lon = property.value.longitude
    const lat = property.value.latitude
    const url = `${GEOAPIFY_URL}/places?categories=education.school&filter=circle:${lon},${lat},10000&limit=10&apiKey=${GEOAPIFY_KEY}`
    const res = await fetch(url)
    if (!res.ok) {
      let body: any = undefined
      try { body = await res.json() } catch {}
      const msg = body?.error || body?.message || body?.statusMessage || res.statusText || `HTTP ${res.status}`
      throw new Error(`Geoapify schools failed: ${msg}`)
    }
    const data = await res.json()
    schools.value = (data.features || []).map((f: any) => {
      const coords = Array.isArray(f.geometry?.coordinates) ? f.geometry.coordinates : [0, 0]
      const poiLon = Number(coords[0])
      const poiLat = Number(coords[1])
      const distance = isFinite(poiLon) && isFinite(poiLat)
        ? haversineDistanceMeters(lat, lon, poiLat, poiLon)
        : 0
      return {
        id: f.properties?.place_id || `${f.properties?.name}-${distance}`,
        name: f.properties?.name || 'Unknown',
        distance
      }
    }).sort((a: any, b: any) => a.distance - b.distance)
  } catch (e: any) {
    schoolsError.value = e?.message || 'Failed to load schools'
  } finally {
    schoolsLoading.value = false
  }
}

// Property from API (DB). Start with safe defaults, then hydrate.
const property = ref<any>({
  id: route.params.id,
  title: 'Property',
  price: 0,
  type: 'house',
  beds: 0,
  baths: 0,
  sqft: 0,
  yearBuilt: '',
  parking: '',
  heating: '',
  cooling: '',
  lotSize: 0,
  address: '',
  description: '',
  features: [],
  images: ['/favicon.ico'],
  latitude: 56.7268,
  longitude: -111.3800,
  isFavorite: false,
  agent: { name: '', phone: '', email: '' }
})

onMounted(async () => {
  try {
    const data = await $fetch(`/api/properties/${route.params.id}`) as any
    // Some DBs may store latitude/longitude swapped; ensure numbers
    const d: any = data
    const lat = Number(d.latitude)
    const lng = Number(d.longitude)
    property.value = {
      ...data,
      images: Array.isArray(d.images) && d.images.length ? d.images : ['/favicon.ico'],
      latitude: isFinite(lat) ? lat : 56.7268,
      longitude: isFinite(lng) ? lng : -111.3800
    }
    
    // Debug agent data
    if (property.value.listingAgentData) {
      console.log('🏠 Enhanced Agent Data Available:', {
        fullName: property.value.listingAgentData.fullName,
        firstName: property.value.listingAgentData.firstName,
        lastName: property.value.listingAgentData.lastName,
        email: property.value.listingAgentData.email,
        directPhone: property.value.listingAgentData.directPhone,
        mobilePhone: property.value.listingAgentData.mobilePhone,
        officePhone: property.value.listingAgentData.officePhone,
        license: property.value.listingAgentData.license,
        designations: property.value.listingAgentData.designations,
        photoURL: property.value.listingAgentData.photoURL,
        memberKey: property.value.listingAgentData.memberKey,
        mlsId: property.value.listingAgentData.mlsId
      })
      
      if (property.value.listingOfficeData) {
        console.log('🏢 Office Data Available:', {
          name: property.value.listingOfficeData.name,
          phone: property.value.listingOfficeData.phone,
          email: property.value.listingOfficeData.email,
          address: property.value.listingOfficeData.address,
          city: property.value.listingOfficeData.city,
          province: property.value.listingOfficeData.province,
          postalCode: property.value.listingOfficeData.postalCode,
          website: property.value.listingOfficeData.website
        })
      }
      
      if (property.value.coListingAgentsData?.length) {
        console.log('👥 Co-Listing Agents:', property.value.coListingAgentsData.length)
      }
    } else {
      console.log('❌ No listingAgentData found')
      console.log('🔍 Available fallback fields:', {
        agent: property.value.agent,
        listingAgent: property.value.listingAgent,
        listingOffice: property.value.listingOffice,
        user: property.value.user,
        source: property.value.source,
        isMLS: property.value.isMLS
      })
    }
    // Initialize calculator price once property is loaded
    if (Number(property.value.price) > 0 && calc.value.price === 0) {
      calc.value.price = Number(property.value.price)
    }
    // Prefill contact message with rich property context
    contactForm.value.message = `Hi, I am interested in ${property.value.title} (${property.value.address}, ${property.value.city}). MLS: ${property.value.mlsNumber || 'N/A'}. Price: $${formatPrice(property.value.price)}. Please contact me.`
    // Load POIs and Schools when property is available
    await Promise.all([loadPois(), loadSchools()])
  } catch (e) {
    // keep defaults
  }
})

const contactForm = ref({
  name: '',
  email: '',
  phone: '',
  message: `Hi, I am interested in ${property.value.address}`
})

const viewingForm = ref({
  date: '',
  time: '',
  notes: ''
})

const thumbnailImages = computed(() => {
  const images = property.value.images || []
  if (images.length <= 1) return []
  
  // Always try to fill 4 thumbnail slots to avoid white space
  const thumbnails = []
  
  // If we have 5+ images, use them directly
  if (images.length >= 5) {
    return [
      { url: images[1], imageIndex: 1 },
      { url: images[2], imageIndex: 2 },
      { url: images[3], imageIndex: 3 },
      { url: images[4], imageIndex: 4 }
    ]
  }
  
  // For fewer images, cycle through available thumbnails to fill all 4 slots
  const availableForThumbs = images.slice(1) // All images except the first (main) one
  for (let i = 0; i < 4; i++) {
    if (availableForThumbs.length > 0) {
      const cycleIndex = i % availableForThumbs.length
      const actualImageIndex = cycleIndex + 1 // +1 because availableForThumbs starts at index 1
      thumbnails.push({
        url: availableForThumbs[cycleIndex],
        imageIndex: actualImageIndex
      })
    }
  }
  
  return thumbnails
})

const availableTimes = [
  '9:00 AM',
  '10:00 AM',
  '11:00 AM',
  '1:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM'
]

const nameRules = [
  (v: string) => !!v || 'Name is required',
  (v: string) => v.length >= 2 || 'Name must be at least 2 characters'
]

const emailRules = [
  (v: string) => !!v || 'Email is required',
  (v: string) => /.+@.+\..+/.test(v) || 'Email must be valid'
]

const phoneRules = [
  (v: string) => !v || /^\+?[\d\s-]{10,}$/.test(v) || 'Please enter a valid phone number'
]

const messageRules = [
  (v: string) => !!v || 'Message is required',
  (v: string) => v.length >= 10 || 'Message must be at least 10 characters'
]

const openGallery = (index: number) => {
  currentImageIndex.value = index
  showGallery.value = true
}

const toggleFavorite = () => {
  property.value.isFavorite = !property.value.isFavorite
}

const shareProperty = () => {
  if (navigator.share) {
    navigator.share({
      title: property.value.title,
      text: `Check out this property: ${property.value.address}`,
      url: window.location.href
    })
  }
}

const handleSubmit = async () => {
  loading.value = true
  try {
    const snapshot = {
      id: property.value.id,
      title: property.value.title,
      address: property.value.address,
      city: property.value.city,
      province: property.value.province,
      postalCode: property.value.postalCode,
      mlsNumber: property.value.mlsNumber,
      price: property.value.price,
      url: typeof window !== 'undefined' ? window.location.href : ''
    }
    await propertyService.createInquiry(property.value.id, {
      name: contactForm.value.name,
      email: contactForm.value.email,
      phone: contactForm.value.phone,
      message: contactForm.value.message,
      property: snapshot
    } as any)
  } catch (error) {
    console.error('Submit error:', error)
  } finally {
    loading.value = false
  }
}

const scheduleViewing = () => {
  showViewingDialog.value = true
}

const submitViewingRequest = async () => {
  viewingLoading.value = true
  try {
    const snapshot = {
      id: property.value.id,
      title: property.value.title,
      address: property.value.address,
      city: property.value.city,
      province: property.value.province,
      postalCode: property.value.postalCode,
      mlsNumber: property.value.mlsNumber,
      price: property.value.price,
      url: typeof window !== 'undefined' ? window.location.href : ''
    }
    await propertyService.requestViewing(property.value.id, {
      date: viewingForm.value.date,
      time: viewingForm.value.time,
      notes: viewingForm.value.notes,
      property: snapshot
    } as any)
    showViewingDialog.value = false
  } catch (error) {
    console.error('Viewing request error:', error)
  } finally {
    viewingLoading.value = false
  }
}

const formatPrice = (price: number) => {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const formatArray = (value: string | string[]) => {
  if (Array.isArray(value)) {
    return value.join(', ')
  }
  return value || 'N/A'
}

const hasFeatures = computed(() => {
  return property.value.features && 
    (property.value.features.appliances?.length ||
     property.value.features.interiorFeatures?.length ||
     property.value.features.exteriorFeatures?.length ||
     property.value.features.flooring?.length ||
     property.value.features.poolFeatures?.length ||
     property.value.features.fireplaceFeatures?.length)
})

// Save functionality
const toggleSave = async () => {
  if (!property.value?.id) return
  
  try {
    await toggleSaveProperty(property.value.id)
    property.value.isSaved = !property.value.isSaved
  } catch (error) {
    console.error('Error toggling save:', error)
  }
}
</script>

<style scoped>
.property-detail {
  min-height: 100vh;
  background: linear-gradient(to bottom, #fafafa 0%, #ffffff 100%);
}

.image-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 8px;
  height: 600px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

.main-image {
  grid-row: 1 / span 4;
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.main-image:hover {
  transform: scale(1.02);
}

.thumbnail-grid {
  display: grid;
  grid-template-rows: repeat(4, 1fr);
  gap: 8px;
  position: relative;
}

.thumbnail-grid > * {
  min-height: 0;
  min-width: 0;
}

.thumbnail {
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease, opacity 0.3s ease;
  border-radius: 8px;
  overflow: hidden;
}

.thumbnail:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  opacity: 0.9;
}

.more-photos {
  position: absolute;
  bottom: 16px;
  right: 16px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  background: rgba(0, 0, 0, 0.7) !important;
  border-radius: 12px;
  padding: 12px 24px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.sticky-sidebar {
  position: sticky;
  top: 24px;
}

.sticky-card {
  position: sticky;
  top: 24px;
}

/* Premium Card Styling */
:deep(.v-card) {
  border-radius: 16px !important;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.08) !important;
  border: 1px solid rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.3s ease, transform 0.3s ease;
}

:deep(.v-card:hover) {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
}

/* Premium Typography */
:deep(.text-h4) {
  font-weight: 700;
  letter-spacing: -0.5px;
  color: #1a1a1a;
}

:deep(.text-h5) {
  font-weight: 700;
  letter-spacing: -0.5px;
  color: #2c3e50;
}

:deep(.text-h6) {
  font-weight: 600;
  letter-spacing: -0.3px;
  color: #2c3e50;
}

/* Premium Chips */
:deep(.v-chip) {
  border-radius: 12px;
  font-weight: 600;
  letter-spacing: 0.3px;
  padding: 8px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* Premium Buttons */
:deep(.v-btn) {
  border-radius: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

:deep(.v-btn:hover) {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

/* Premium Form Fields */
:deep(.v-text-field), :deep(.v-textarea), :deep(.v-select) {
  border-radius: 12px;
}

:deep(.v-field) {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

/* Premium Tabs */
:deep(.v-tab) {
  font-weight: 600;
  letter-spacing: 0.3px;
  text-transform: none;
  border-radius: 12px;
  margin: 0 4px;
}

/* Agent Card Premium Styling */
.agent-info {
  padding: 8px;
}

.agent-info :deep(.v-avatar) {
  border: 4px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.agent-info a {
  color: #1976d2;
  font-weight: 500;
  transition: color 0.3s ease;
}

.agent-info a:hover {
  color: #1565c0;
  text-decoration: underline;
}

.office-info {
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  padding: 16px;
  border-radius: 12px;
}

.co-agents {
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  padding: 16px;
  border-radius: 12px;
}

/* Gallery Dialog Premium Styling */
.gallery-dialog :deep(.v-overlay__scrim) {
  background: rgba(0, 0, 0, 0.92);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.gallery-card {
  background: #000000 !important;
}

.gallery-toolbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.gallery-toolbar :deep(.v-btn) {
  color: white;
  box-shadow: none;
}

.gallery-toolbar :deep(.v-btn:hover) {
  background: rgba(255, 255, 255, 0.1);
  transform: none;
}

.gallery-carousel-container {
  background: #000000;
  height: 100vh;
  padding-top: 64px;
}

.gallery-carousel {
  background: #000000;
}

.gallery-carousel :deep(.v-carousel__controls) {
  background: transparent;
}

.gallery-carousel :deep(.v-btn) {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.gallery-carousel :deep(.v-btn:hover) {
  background: rgba(255, 255, 255, 0.25);
}

/* Premium Table Styling */
:deep(.v-table) {
  border-radius: 12px;
  overflow: hidden;
}

:deep(.v-table thead) {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

:deep(.v-table thead th) {
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  font-size: 0.75rem;
  color: #495057;
}

:deep(.v-table tbody tr) {
  transition: background-color 0.3s ease;
}

:deep(.v-table tbody tr:hover) {
  background: rgba(25, 118, 210, 0.04);
}

/* Detail Item Styling */
.detail-item {
  padding: 12px;
  border-radius: 8px;
  transition: background-color 0.3s ease, transform 0.3s ease;
}

.detail-item:hover {
  background: rgba(25, 118, 210, 0.04);
  transform: translateX(4px);
}

/* Contact Form Premium Styling */
.sticky-sidebar :deep(.v-card) {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
}

.contact-form-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%) !important;
  border: 2px solid rgba(25, 118, 210, 0.1) !important;
}

.agent-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%) !important;
}

/* Property Details Card */
.property-details-card {
  background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%) !important;
}

/* Description Card */
.description-card {
  background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%) !important;
}

.description-text {
  text-align: justify;
  hyphens: auto;
}

/* Features Card */
.features-card {
  background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%) !important;
}

/* Location Card */
.location-card {
  background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%) !important;
}

/* Payment Card */
.payment-card {
  background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%) !important;
}

.payment-result {
  box-shadow: 0 8px 32px rgba(25, 118, 210, 0.25);
}

/* Neighbourhood Card */
.neighbourhood-card {
  background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%) !important;
}

/* Schools Card */
.schools-card {
  background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%) !important;
}

/* Transport Toggle Premium Styling */
.transport-toggle :deep(.v-btn) {
  font-weight: 600;
  letter-spacing: 0.5px;
}

/* Premium Table Enhancements */
.premium-table :deep(tbody td) {
  padding: 16px;
  font-size: 0.95rem;
}

.premium-table :deep(thead th) {
  padding: 16px;
}

/* Property Header */
.property-header {
  padding: 16px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.03) 0%, rgba(255, 255, 255, 0.8) 100%);
}

.price-badge {
  animation: pulse-subtle 3s ease-in-out infinite;
}

@keyframes pulse-subtle {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
}

/* Viewing Dialog Styling */
.viewing-dialog :deep(.v-card) {
  overflow: hidden;
}

.viewing-dialog :deep(.v-overlay__scrim) {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

@media (max-width: 960px) {
  .image-grid {
    grid-template-columns: 1fr;
    height: auto;
    border-radius: 0;
  }

  .main-image {
    height: 300px;
  }

  .thumbnail-grid {
    display: none;
  }
}

/* Agent Card Mobile Responsiveness */
@media (max-width: 768px) {
  .sticky-sidebar {
    position: relative;
    top: auto;
  }
  
  .agent-info .d-flex {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .agent-info .v-avatar {
    margin-right: 0 !important;
    margin-bottom: 1rem;
  }
  
  .office-details .d-flex {
    flex-direction: row;
    align-items: center;
    text-align: left;
  }
  
  .co-agents .d-flex {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .co-agents .v-avatar {
    margin-right: 0 !important;
    margin-bottom: 0.5rem;
  }
}
</style>
