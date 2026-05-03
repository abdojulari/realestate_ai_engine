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
            class="gallery-single"
          >
            <v-carousel-item
              :src="(Array.isArray(property.images) && property.images.length ? property.images[0] : '/favicon.ico')"
              :alt="mainImageAlt"
              cover
            />
          </v-carousel>

          <div v-else class="image-grid">
            <v-img
              :src="(Array.isArray(property.images) && property.images.length ? property.images[0] : '/favicon.ico')"
              :alt="mainImageAlt"
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
              <div class="main-image-overlay"></div>
            </v-img>

            <div class="thumbnail-grid">
              <v-img
                v-for="(thumbnail, index) in thumbnailImages"
                :key="index"
                :src="thumbnail.url || '/favicon.ico'"
                :alt="thumbnail.alt || mainImageAlt"
                height="197"
                cover
                class="thumbnail"
                @click="openGallery(thumbnail.imageIndex)"
              />
              <v-btn
                v-if="Array.isArray(property.images) && property.images.length > 5"
                class="more-photos"
                @click="openGallery(0)"
              >
                <v-icon size="18" class="mr-2">mdi-image-multiple</v-icon>
                +{{ (Array.isArray(property.images) ? property.images.length : 0) - 4 }} photos
              </v-btn>
            </div>
          </div>
        </v-col>
      </v-row>
    </v-container>

    <v-container class="py-10">
      <!-- Premium Tabs -->
      <div class="tabs-wrapper">
        <v-tabs v-model="selectedTab" class="premium-tabs" density="comfortable">
          <v-tab value="highlights">
            <v-icon size="18" class="mr-2">mdi-star-four-points</v-icon>
            Highlights
          </v-tab>
          <v-tab value="payments">
            <v-icon size="18" class="mr-2">mdi-calculator-variant</v-icon>
            Monthly Payments
          </v-tab>
          <v-tab value="neighbourhood">
            <v-icon size="18" class="mr-2">mdi-map-marker-radius</v-icon>
            Neighbourhood
          </v-tab>
          <v-tab value="schools">
            <v-icon size="18" class="mr-2">mdi-school-outline</v-icon>
            Schools
          </v-tab>
        </v-tabs>
      </div>

      <v-row class="mt-2">
        <v-col cols="12" md="8">
          <!-- ═══ HIGHLIGHTS TAB ═══ -->
          <div v-show="selectedTab === 'highlights'">
            <!-- Property Header -->
            <div class="prop-header">
              <div class="flex-grow-1">
                <h1 class="prop-title">{{ property.title }} {{ property.city }}, {{ property.province }}, {{ property.postalCode }}</h1>
              </div>
              <div class="prop-actions">
                <v-btn icon variant="tonal" size="large" class="action-btn" @click="shareProperty">
                  <v-icon size="22">mdi-share-variant</v-icon>
                  <v-tooltip activator="parent" location="bottom">Share</v-tooltip>
                </v-btn>
                <v-btn :icon="property.isSaved ? 'mdi-heart' : 'mdi-heart-outline'" :color="property.isSaved ? 'red' : undefined" variant="tonal" size="large" class="action-btn" @click="toggleSave" />
              </div>
            </div>

            <!-- Price -->
            <div class="price-strip">
              <div class="price-label">Listing Price</div>
              <div class="price-value">${{ formatPrice(property.price) }}</div>
            </div>

            <!-- Quick Stats -->
            <div class="quick-stats">
              <div class="stat-pill">
                <v-icon size="18">mdi-home-variant-outline</v-icon>
                <span>{{ property.type }}</span>
              </div>
              <div class="stat-pill">
                <v-icon size="18">mdi-bed-outline</v-icon>
                <span>{{ property.beds }} beds</span>
              </div>
              <div class="stat-pill">
                <v-icon size="18">mdi-shower-head</v-icon>
                <span>{{ property.baths }} baths</span>
              </div>
              <div class="stat-pill">
                <v-icon size="18">mdi-ruler-square</v-icon>
                <span>{{ property.sqft }} sqft</span>
              </div>
            </div>

            <!-- Property Details Card -->
            <v-card class="content-card mb-8" flat>
              <v-card-text class="pa-7">
                <div class="card-section-header">
                  <div class="card-section-icon"><v-icon size="20">mdi-home-city-outline</v-icon></div>
                  <span>Property Details</span>
                </div>
                <v-row>
                  <v-col cols="6" sm="4">
                    <div class="detail-item">
                      <div class="detail-label">Property Type</div>
                      <div class="detail-value text-capitalize">{{ property.type }}</div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.yearBuilt">
                    <div class="detail-item">
                      <div class="detail-label">Year Built</div>
                      <div class="detail-value">{{ property.features.yearBuilt }}</div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.stories">
                    <div class="detail-item">
                      <div class="detail-label">Stories</div>
                      <div class="detail-value">{{ property.features.stories }}</div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.parking">
                    <div class="detail-item">
                      <div class="detail-label">Parking Spaces</div>
                      <div class="detail-value">{{ property.features.parking }}</div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.parkingFeatures?.length">
                    <div class="detail-item">
                      <div class="detail-label">Parking Type</div>
                      <div class="detail-value">{{ formatArray(property.features.parkingFeatures) }}</div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.heating?.length">
                    <div class="detail-item">
                      <div class="detail-label">Heating</div>
                      <div class="detail-value">{{ formatArray(property.features.heating) }}</div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.cooling?.length">
                    <div class="detail-item">
                      <div class="detail-label">Cooling</div>
                      <div class="detail-value">{{ formatArray(property.features.cooling) }}</div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.lotSizeArea">
                    <div class="detail-item">
                      <div class="detail-label">Lot Size</div>
                      <div class="detail-value">{{ property.features.lotSizeArea }} {{ property.features.lotSizeUnits || 'sqft' }}</div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.lotSizeDimensions">
                    <div class="detail-item">
                      <div class="detail-label">Lot Dimensions</div>
                      <div class="detail-value">{{ property.features.lotSizeDimensions }}</div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.basement?.length">
                    <div class="detail-item">
                      <div class="detail-label">Basement</div>
                      <div class="detail-value">{{ formatArray(property.features.basement) }}</div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.fireplacesTotal">
                    <div class="detail-item">
                      <div class="detail-label">Fireplaces</div>
                      <div class="detail-value">{{ property.features.fireplacesTotal }}</div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.bathroomsPartial">
                    <div class="detail-item">
                      <div class="detail-label">Half Baths</div>
                      <div class="detail-value">{{ property.features.bathroomsPartial }}</div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.constructionMaterials?.length">
                    <div class="detail-item">
                      <div class="detail-label">Construction</div>
                      <div class="detail-value">{{ formatArray(property.features.constructionMaterials) }}</div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.roof?.length">
                    <div class="detail-item">
                      <div class="detail-label">Roof</div>
                      <div class="detail-value">{{ formatArray(property.features.roof) }}</div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.foundationDetails?.length">
                    <div class="detail-item">
                      <div class="detail-label">Foundation</div>
                      <div class="detail-value">{{ formatArray(property.features.foundationDetails) }}</div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.taxAnnualAmount">
                    <div class="detail-item">
                      <div class="detail-label">Annual Taxes</div>
                      <div class="detail-value">${{ formatPrice(property.features.taxAnnualAmount) }} <span v-if="property.features?.taxYear" class="detail-note">({{ property.features.taxYear }})</span></div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.associationFee">
                    <div class="detail-item">
                      <div class="detail-label">HOA/Condo Fee</div>
                      <div class="detail-value">${{ formatPrice(property.features.associationFee) }}/{{ property.features.associationFeeFrequency || 'month' }}</div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.associationName">
                    <div class="detail-item">
                      <div class="detail-label">Association</div>
                      <div class="detail-value">{{ property.features.associationName }}</div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.zoning">
                    <div class="detail-item">
                      <div class="detail-label">Zoning</div>
                      <div class="detail-value">{{ property.features.zoning }}</div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.subdivisionName">
                    <div class="detail-item">
                      <div class="detail-label">Subdivision</div>
                      <div class="detail-value">{{ property.features.subdivisionName }}</div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.mlsNumber">
                    <div class="detail-item">
                      <div class="detail-label">MLS Number</div>
                      <div class="detail-value font-weight-bold" style="font-family: monospace;">{{ property.mlsNumber }}</div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="listedDateDisplay">
                    <div class="detail-item">
                      <div class="detail-label">Listed Date</div>
                      <div class="detail-value">{{ listedDateDisplay }}</div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="typeof property.daysOnMarket === 'number' && property.daysOnMarket >= 0">
                    <div class="detail-item">
                      <div class="detail-label">Days on Market</div>
                      <div class="detail-value">{{ property.daysOnMarket }}</div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="propertyConditionDisplay">
                    <div class="detail-item">
                      <div class="detail-label">Property Condition</div>
                      <div class="detail-value">{{ propertyConditionDisplay }}</div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.waterBodyName">
                    <div class="detail-item">
                      <div class="detail-label">Water Body</div>
                      <div class="detail-value">{{ property.waterBodyName }}</div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.zoningDescription">
                    <div class="detail-item">
                      <div class="detail-label">Zoning Description</div>
                      <div class="detail-value">{{ property.zoningDescription }}</div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.cityRegion">
                    <div class="detail-item">
                      <div class="detail-label">Region / Community</div>
                      <div class="detail-value">{{ property.cityRegion }}</div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.parcelNumber">
                    <div class="detail-item">
                      <div class="detail-label">Parcel Number</div>
                      <div class="detail-value" style="font-family: monospace;">{{ property.parcelNumber }}</div>
                    </div>
                  </v-col>
                  <v-col cols="12" v-if="property.features?.directions">
                    <div class="detail-item">
                      <div class="detail-label">Directions</div>
                      <div class="detail-value">{{ property.features.directions }}</div>
                    </div>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>

            <!-- Tours & Floorplans (CREA non-photo media) -->
            <v-card v-if="nonPhotoMediaItems.length" class="content-card mb-8" flat>
              <v-card-text class="pa-7">
                <div class="card-section-header">
                  <div class="card-section-icon"><v-icon size="20">mdi-rotate-3d-variant</v-icon></div>
                  <span>Tours &amp; Floorplans</span>
                </div>
                <div class="media-grid">
                  <a
                    v-for="(media, idx) in nonPhotoMediaItems"
                    :key="`media-${idx}`"
                    :href="media.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="media-tile"
                  >
                    <div class="media-tile-icon">
                      <v-icon size="32" color="#3b82f6">{{ media.icon }}</v-icon>
                    </div>
                    <div class="media-tile-body">
                      <div class="media-tile-label">{{ media.label }}</div>
                      <div class="media-tile-alt">{{ media.alt }}</div>
                    </div>
                    <v-icon size="18" class="media-tile-arrow">mdi-open-in-new</v-icon>
                  </a>
                </div>
              </v-card-text>
            </v-card>

            <!-- Description Card -->
            <v-card class="content-card mb-8" flat>
              <v-card-text class="pa-7">
                <div class="card-section-header">
                  <div class="card-section-icon"><v-icon size="20">mdi-text-box-outline</v-icon></div>
                  <span>Description</span>
                </div>
                <div class="description-text">{{ property.description }}</div>
              </v-card-text>
            </v-card>

            <!-- Features Card -->
            <v-card class="content-card mb-8" v-if="hasFeatures" flat>
              <v-card-text class="pa-7">
                <div class="card-section-header">
                  <div class="card-section-icon"><v-icon size="20">mdi-star-circle-outline</v-icon></div>
                  <span>Features &amp; Amenities</span>
                </div>

                <div v-if="property.features?.appliances?.length" class="feature-group">
                  <div class="feature-group-label"><v-icon size="16" class="mr-2">mdi-fridge-outline</v-icon>Appliances</div>
                  <div class="feature-chips">
                    <span v-for="appliance in property.features.appliances" :key="appliance" class="feature-chip chip-blue">{{ appliance }}</span>
                  </div>
                </div>

                <div v-if="property.features?.interior?.length" class="feature-group">
                  <div class="feature-group-label"><v-icon size="16" class="mr-2">mdi-sofa-outline</v-icon>Interior</div>
                  <div class="feature-chips">
                    <span v-for="feature in property.features.interior" :key="feature" class="feature-chip chip-indigo">{{ feature }}</span>
                  </div>
                </div>

                <div v-if="property.features?.exterior?.length" class="feature-group">
                  <div class="feature-group-label"><v-icon size="16" class="mr-2">mdi-home-siding</v-icon>Exterior</div>
                  <div class="feature-chips">
                    <span v-for="feature in property.features.exterior" :key="feature" class="feature-chip chip-green">{{ feature }}</span>
                  </div>
                </div>

                <div v-if="property.features?.flooring?.length" class="feature-group">
                  <div class="feature-group-label"><v-icon size="16" class="mr-2">mdi-view-grid-outline</v-icon>Flooring</div>
                  <div class="feature-chips">
                    <span v-for="floor in property.features.flooring" :key="floor" class="feature-chip chip-warm">{{ floor }}</span>
                  </div>
                </div>

                <div v-if="property.features?.poolFeatures?.length" class="feature-group">
                  <div class="feature-group-label"><v-icon size="16" class="mr-2">mdi-pool</v-icon>Pool</div>
                  <div class="feature-chips">
                    <span v-for="pool in property.features.poolFeatures" :key="pool" class="feature-chip chip-cyan">{{ pool }}</span>
                  </div>
                </div>

                <div v-if="property.features?.fireplaceFeatures?.length" class="feature-group">
                  <div class="feature-group-label"><v-icon size="16" class="mr-2">mdi-fireplace</v-icon>Fireplace</div>
                  <div class="feature-chips">
                    <span v-for="fireplace in property.features.fireplaceFeatures" :key="fireplace" class="feature-chip chip-amber">{{ fireplace }}</span>
                  </div>
                </div>

                <div v-if="property.features?.building?.length" class="feature-group">
                  <div class="feature-group-label"><v-icon size="16" class="mr-2">mdi-office-building-outline</v-icon>Building</div>
                  <div class="feature-chips">
                    <span v-for="feature in property.features.building" :key="feature" class="feature-chip chip-slate">{{ feature }}</span>
                  </div>
                </div>

                <div v-if="property.features?.lot?.length" class="feature-group">
                  <div class="feature-group-label"><v-icon size="16" class="mr-2">mdi-grass</v-icon>Lot</div>
                  <div class="feature-chips">
                    <span v-for="feature in property.features.lot" :key="feature" class="feature-chip chip-green">{{ feature }}</span>
                  </div>
                </div>

                <div v-if="property.features?.view?.length" class="feature-group">
                  <div class="feature-group-label"><v-icon size="16" class="mr-2">mdi-eye-outline</v-icon>Views</div>
                  <div class="feature-chips">
                    <span v-for="view in property.features.view" :key="view" class="feature-chip chip-cyan">{{ view }}</span>
                  </div>
                </div>

                <div v-if="property.features?.waterfrontFeatures?.length" class="feature-group">
                  <div class="feature-group-label"><v-icon size="16" class="mr-2">mdi-waves</v-icon>Waterfront</div>
                  <div class="feature-chips">
                    <span v-for="feature in property.features.waterfrontFeatures" :key="feature" class="feature-chip chip-blue">{{ feature }}</span>
                  </div>
                </div>

                <div v-if="property.features?.security?.length" class="feature-group">
                  <div class="feature-group-label"><v-icon size="16" class="mr-2">mdi-shield-home-outline</v-icon>Security</div>
                  <div class="feature-chips">
                    <span v-for="feature in property.features.security" :key="feature" class="feature-chip chip-rose">{{ feature }}</span>
                  </div>
                </div>

                <div v-if="property.features?.accessibilityFeatures?.length" class="feature-group">
                  <div class="feature-group-label"><v-icon size="16" class="mr-2">mdi-wheelchair-accessibility</v-icon>Accessibility</div>
                  <div class="feature-chips">
                    <span v-for="feature in property.features.accessibilityFeatures" :key="feature" class="feature-chip chip-indigo">{{ feature }}</span>
                  </div>
                </div>

                <div v-if="property.features?.communityFeatures?.length" class="feature-group">
                  <div class="feature-group-label"><v-icon size="16" class="mr-2">mdi-account-group-outline</v-icon>Community</div>
                  <div class="feature-chips">
                    <span v-for="feature in property.features.communityFeatures" :key="feature" class="feature-chip chip-green">{{ feature }}</span>
                  </div>
                </div>

                <div v-if="property.features?.architecturalStyle?.length" class="feature-group">
                  <div class="feature-group-label"><v-icon size="16" class="mr-2">mdi-home-modern</v-icon>Architectural Style</div>
                  <div class="feature-chips">
                    <span v-for="style in property.features.architecturalStyle" :key="style" class="feature-chip chip-indigo">{{ style }}</span>
                  </div>
                </div>
              </v-card-text>
            </v-card>

            <!-- Utilities Card -->
            <v-card class="content-card mb-8" v-if="hasUtilities" flat>
              <v-card-text class="pa-7">
                <div class="card-section-header">
                  <div class="card-section-icon"><v-icon size="20">mdi-lightning-bolt-outline</v-icon></div>
                  <span>Utilities &amp; Infrastructure</span>
                </div>
                <v-row>
                  <v-col cols="6" sm="4" v-if="property.features?.utilities?.length">
                    <div class="detail-item"><div class="detail-label">Utilities</div><div class="detail-value">{{ formatArray(property.features.utilities) }}</div></div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.waterSource?.length">
                    <div class="detail-item"><div class="detail-label">Water Source</div><div class="detail-value">{{ formatArray(property.features.waterSource) }}</div></div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.sewer?.length">
                    <div class="detail-item"><div class="detail-label">Sewer</div><div class="detail-value">{{ formatArray(property.features.sewer) }}</div></div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.electric?.length">
                    <div class="detail-item"><div class="detail-label">Electric</div><div class="detail-value">{{ formatArray(property.features.electric) }}</div></div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.irrigationSource?.length">
                    <div class="detail-item"><div class="detail-label">Irrigation</div><div class="detail-value">{{ formatArray(property.features.irrigationSource) }}</div></div>
                  </v-col>
                  <v-col cols="6" sm="4" v-if="property.features?.roadSurfaceType?.length">
                    <div class="detail-item"><div class="detail-label">Road Surface</div><div class="detail-value">{{ formatArray(property.features.roadSurfaceType) }}</div></div>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>

            <!-- Room Details Card -->
            <v-card class="content-card mb-8" v-if="property.features?.rooms?.length" flat>
              <v-card-text class="pa-7">
                <div class="card-section-header">
                  <div class="card-section-icon"><v-icon size="20">mdi-floor-plan</v-icon></div>
                  <span>Room Details</span>
                </div>
                <div class="table-wrap">
                  <v-table density="compact" class="rooms-table">
                    <thead>
                      <tr><th>Room</th><th>Level</th><th>Dimensions</th><th>Description</th></tr>
                    </thead>
                    <tbody>
                      <tr v-for="room in property.features.rooms" :key="room.RoomKey">
                        <td class="font-weight-bold">{{ room.RoomType || 'Room' }}</td>
                        <td>{{ room.RoomLevel || '—' }}</td>
                        <td>{{ room.RoomDimensions || (room.RoomLength && room.RoomWidth ? `${room.RoomLength} x ${room.RoomWidth}` : '—') }}</td>
                        <td class="text-caption" style="color: #64748b;">{{ room.RoomDescription || '—' }}</td>
                      </tr>
                    </tbody>
                  </v-table>
                </div>
              </v-card-text>
            </v-card>

            <!-- Location Card -->
            <v-card class="content-card mb-8" flat>
              <v-card-text class="pa-7">
                <div class="card-section-header">
                  <div class="card-section-icon"><v-icon size="20">mdi-map-marker-outline</v-icon></div>
                  <span>Location</span>
                </div>
                <div class="location-address">
                  <v-icon size="16" class="mr-2" style="color: #3b82f6;">mdi-home-map-marker</v-icon>
                  {{ property.address }}, {{ property.city }}, {{ property.province }}, {{ property.postalCode }}
                </div>
                <client-only>
                  <div v-if="property.latitude && property.longitude" class="map-container">
                    <l-map :zoom="15" :center="[property.latitude, property.longitude]" style="height: 400px; border-radius: 16px; overflow: hidden;">
                      <l-tile-layer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <l-marker :lat-lng="[property.latitude, property.longitude]"><l-popup>{{ property.address }}</l-popup></l-marker>
                    </l-map>
                  </div>
                  <div v-else class="map-placeholder">
                    <v-icon size="48" color="#cbd5e1">mdi-map-marker-off</v-icon>
                    <div style="color: #94a3b8; margin-top: 8px;">Location not available</div>
                  </div>
                  <template #fallback>
                    <div class="map-placeholder">
                      <v-progress-circular indeterminate color="#3b82f6" size="44" width="3" />
                      <div style="color: #94a3b8; margin-top: 12px;">Loading map&hellip;</div>
                    </div>
                  </template>
                </client-only>
              </v-card-text>
            </v-card>
          </div>

          <!-- ═══ PAYMENTS TAB ═══ -->
          <div v-show="selectedTab === 'payments'">
            <v-card class="content-card" flat>
              <v-card-text class="pa-7">
                <div class="card-section-header">
                  <div class="card-section-icon"><v-icon size="20">mdi-calculator-variant-outline</v-icon></div>
                  <span>Monthly Payment Calculator</span>
                </div>
                <v-form class="calc-form">
                  <v-text-field v-model.number="calc.price" label="Home price" prefix="$" variant="outlined" density="comfortable" class="mb-3 calc-field" />
                  <v-text-field v-model.number="calc.downPercent" label="Down payment (%)" suffix="%" variant="outlined" density="comfortable" class="mb-3 calc-field" />
                  <v-text-field v-model.number="calc.rate" label="Interest rate (APR %)" suffix="%" variant="outlined" density="comfortable" class="mb-3 calc-field" />
                  <v-text-field v-model.number="calc.years" label="Amortization (years)" variant="outlined" density="comfortable" class="calc-field" />
                </v-form>
                <div class="calc-result">
                  <div class="calc-result-label">Estimated Monthly Payment</div>
                  <div class="calc-result-value">${{ formatPrice(monthlyPayment) }}</div>
                  <div class="calc-result-detail">
                    Principal &amp; interest on a ${{ formatPrice(loanAmount) }} mortgage at {{ calc.rate }}% for {{ calc.years }} years
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </div>

          <!-- ═══ NEIGHBOURHOOD TAB ═══ -->
          <div v-show="selectedTab === 'neighbourhood'">
            <v-card class="content-card" flat>
              <v-card-text class="pa-7">
                <div class="card-section-header">
                  <div class="card-section-icon"><v-icon size="20">mdi-map-marker-radius-outline</v-icon></div>
                  <span>Nearby Points of Interest</span>
                </div>
                <div class="mb-6">
                  <v-btn-toggle v-model="transportMode" mandatory class="transport-toggle" divided>
                    <v-btn value="walk" prepend-icon="mdi-walk" class="px-5">Walking</v-btn>
                    <v-btn value="bike" prepend-icon="mdi-bike" class="px-5">Biking</v-btn>
                    <v-btn value="car" prepend-icon="mdi-car" class="px-5">Car</v-btn>
                  </v-btn-toggle>
                </div>
                <v-alert v-if="poiError" type="error" variant="tonal" density="comfortable" class="mb-4 rounded-xl">{{ poiError }}</v-alert>
                <v-skeleton-loader v-if="poiLoading" type="table-row@5" />
                <div v-else class="table-wrap">
                  <v-table class="poi-table">
                    <thead><tr><th>Category</th><th>Name</th><th>Distance</th><th>ETA</th></tr></thead>
                    <tbody>
                      <tr v-for="item in pois" :key="item.id">
                        <td><span class="table-badge">{{ item.category }}</span></td>
                        <td class="font-weight-medium" style="color: #1e293b;">{{ item.name }}</td>
                        <td style="color: #475569;">{{ (item.distance/1000).toFixed(2) }} km</td>
                        <td><span class="table-eta">{{ formatEtaMinutes(item.distance) }} min</span></td>
                      </tr>
                    </tbody>
                  </v-table>
                </div>
              </v-card-text>
            </v-card>
          </div>

          <!-- ═══ SCHOOLS TAB ═══ -->
          <div v-show="selectedTab === 'schools'">
            <v-card class="content-card" flat>
              <v-card-text class="pa-7">
                <div class="d-flex align-center justify-space-between flex-wrap gap-4 mb-8">
                  <div class="card-section-header mb-0">
                    <div class="card-section-icon"><v-icon size="20">mdi-school-outline</v-icon></div>
                    <span>Nearby Schools</span>
                  </div>
                  <v-btn-toggle v-model="schoolTransportMode" mandatory density="comfortable" divided class="transport-toggle" @update:model-value="updateSchoolETAs">
                    <v-btn value="walking" size="small" class="px-4"><v-icon size="18">mdi-walk</v-icon><span class="ml-1">Walk</span></v-btn>
                    <v-btn value="biking" size="small" class="px-4"><v-icon size="18">mdi-bike</v-icon><span class="ml-1">Bike</span></v-btn>
                    <v-btn value="car" size="small" class="px-4"><v-icon size="18">mdi-car</v-icon><span class="ml-1">Car</span></v-btn>
                  </v-btn-toggle>
                </div>
                <v-alert v-if="schoolsError" type="error" variant="tonal" density="comfortable" class="mb-4 rounded-xl">{{ schoolsError }}</v-alert>
                <v-skeleton-loader v-if="schoolsLoading" type="table-row@5" />
                <div v-else class="table-wrap">
                  <v-table class="poi-table">
                    <thead><tr><th>School Name</th><th>Distance</th><th>ETA</th></tr></thead>
                    <tbody>
                      <tr v-for="s in schools" :key="s.id">
                        <td class="font-weight-medium" style="color: #1e293b;">{{ s.name }}</td>
                        <td style="color: #475569;">{{ (s.distance/1000).toFixed(2) }} km</td>
                        <td><span class="table-eta">{{ formatEtaMinutes(s.distance, schoolTransportMode) }} min</span></td>
                      </tr>
                    </tbody>
                  </v-table>
                </div>
              </v-card-text>
            </v-card>
          </div>
        </v-col>

        <!-- ═══ SIDEBAR ═══ -->
        <v-col cols="12" md="4">
          <div class="sticky-sidebar">
            <!-- Contact Form -->
            <v-card id="property-inquiry" class="sidebar-card mb-5" flat>
              <v-card-text class="pa-7">
                <div class="card-section-header">
                  <div class="card-section-icon"><v-icon size="20">mdi-email-fast-outline</v-icon></div>
                  <span>Contact Agent</span>
                </div>
                <v-form v-model="isFormValid" @submit.prevent="handleSubmit">
                  <v-text-field v-model="contactForm.name" label="Your Name" :rules="nameRules" required variant="outlined" density="comfortable" id="property-contact-name" class="mb-3 form-field" prepend-inner-icon="mdi-account-outline" />
                  <v-text-field v-model="contactForm.email" label="Email" type="email" :rules="emailRules" required variant="outlined" density="comfortable" id="property-contact-email" class="mb-3 form-field" prepend-inner-icon="mdi-email-outline" />
                  <v-text-field v-model="contactForm.phone" label="Phone" :rules="phoneRules" variant="outlined" density="comfortable" id="property-contact-phone" class="mb-3 form-field" prepend-inner-icon="mdi-phone-outline" />
                  <v-textarea v-model="contactForm.message" label="Message" :rules="messageRules" required variant="outlined" density="comfortable" rows="4" id="property-contact-message" class="mb-5 form-field" prepend-inner-icon="mdi-message-text-outline" />
                  <v-btn type="submit" block size="large" :loading="loading" :disabled="!isFormValid" class="submit-btn mb-4">
                    <v-icon class="mr-2" size="18">mdi-send</v-icon>
                    Send Message
                  </v-btn>
                </v-form>
                <div class="sidebar-divider"></div>
                <v-btn variant="outlined" block size="large" class="mb-3 secondary-btn" @click="scheduleViewing">
                  <v-icon class="mr-2" size="18">mdi-calendar-clock-outline</v-icon>
                  Schedule Viewing
                </v-btn>
                <v-btn
                  v-if="leadPhone"
                  variant="tonal"
                  block
                  size="large"
                  prepend-icon="mdi-phone"
                  :href="`tel:${leadPhone}`"
                  class="call-btn"
                >
                  Call Now
                </v-btn>
              </v-card-text>
            </v-card>

            <!-- Agent Card -->
            <v-card flat class="sidebar-card">
              <v-card-text class="pa-7">
                <div class="card-section-header">
                  <div class="card-section-icon"><v-icon size="20">mdi-account-tie-outline</v-icon></div>
                  <span>Listing Agent</span>
                </div>

                <!-- CREA Agent Data -->
                <div v-if="property.listingAgentData" class="agent-info">
                  <div class="d-flex align-start mb-4">
                    <v-avatar size="72" class="agent-avatar mr-4" :color="property.listingAgentData.photoURL ? 'transparent' : '#e2e8f0'">
                      <v-img v-if="property.listingAgentData.photoURL" :src="property.listingAgentData.photoURL" :alt="property.listingAgentData.fullName || `${property.listingAgentData.firstName || ''} ${property.listingAgentData.lastName || ''}`.trim() || 'Agent'" cover />
                      <v-icon v-else size="36" color="#64748b">mdi-account</v-icon>
                    </v-avatar>
                    <div class="flex-grow-1">
                      <div class="agent-name">
                        {{ property.listingAgentData.fullName ||
                            (property.listingAgentData.firstName && property.listingAgentData.lastName
                              ? `${property.listingAgentData.firstName} ${property.listingAgentData.lastName}`
                              : property.listingAgentData.firstName || property.listingAgentData.lastName || 'Agent Name Not Available') }}
                      </div>
                      <div v-if="property.listingAgentData.designations?.length" class="agent-designation">{{ property.listingAgentData.designations.join(', ') }}</div>
                      <div v-if="property.listingAgentData.license" class="agent-license">License: {{ property.listingAgentData.license }}</div>
                      <!--
                        Phone numbers from CREA's MLS feed are intentionally
                        masked. Showing the listing agent's direct line lets
                        visitors call them instead of inquiring through this
                        site, which leaks the lead to a competing brokerage.
                        Email is left intact for now — flagged as a similar
                        leak that we may want to mask too.
                      -->
                      <div class="agent-courtesy-note">
                        Listing courtesy of <span v-if="property.listingOfficeData?.name">{{ property.listingOfficeData.name }}</span><span v-else>their brokerage</span>. Use the <a href="#property-inquiry" class="courtesy-link" @click.prevent="scrollToInquiry">inquiry form</a> to reach us.
                      </div>
                      <div class="agent-contact-list">
                        <a v-if="property.listingAgentData.directPhone" href="#property-inquiry" class="agent-link agent-link--masked" :aria-label="`Use the inquiry form to contact ${property.listingAgentData.fullName || 'the listing agent'}`" @click.prevent="scrollToInquiry"><v-icon size="14" class="mr-1">mdi-phone</v-icon>XXX-XXX-XXXX <span class="link-note">(Direct)</span></a>
                        <a v-if="property.listingAgentData.mobilePhone && property.listingAgentData.mobilePhone !== property.listingAgentData.directPhone" href="#property-inquiry" class="agent-link agent-link--masked" :aria-label="`Use the inquiry form to contact ${property.listingAgentData.fullName || 'the listing agent'}`" @click.prevent="scrollToInquiry"><v-icon size="14" class="mr-1">mdi-cellphone</v-icon>XXX-XXX-XXXX <span class="link-note">(Mobile)</span></a>
                        <a v-if="property.listingAgentData.officePhone && property.listingAgentData.officePhone !== property.listingAgentData.directPhone && property.listingAgentData.officePhone !== property.listingAgentData.mobilePhone" href="#property-inquiry" class="agent-link agent-link--masked" :aria-label="`Use the inquiry form to contact ${property.listingAgentData.fullName || 'the listing agent'}`" @click.prevent="scrollToInquiry"><v-icon size="14" class="mr-1">mdi-phone-classic</v-icon>XXX-XXX-XXXX <span class="link-note">(Office)</span></a>
                        <a v-if="property.listingAgentData.email" :href="`mailto:${property.listingAgentData.email}`" class="agent-link"><v-icon size="14" class="mr-1">mdi-email-outline</v-icon>{{ property.listingAgentData.email }}</a>
                      </div>
                    </div>
                  </div>
                  <div v-if="property.listingOfficeData" class="office-block">
                    <div class="office-name">{{ property.listingOfficeData.name }}</div>
                    <a v-if="property.listingOfficeData.phone" href="#property-inquiry" class="agent-link agent-link--masked" aria-label="Use the inquiry form to contact the listing office" @click.prevent="scrollToInquiry"><v-icon size="14" class="mr-1">mdi-phone-classic</v-icon>XXX-XXX-XXXX</a>
                    <a v-if="property.listingOfficeData.email" :href="`mailto:${property.listingOfficeData.email}`" class="agent-link"><v-icon size="14" class="mr-1">mdi-email-outline</v-icon>{{ property.listingOfficeData.email }}</a>
                    <div v-if="property.listingOfficeData.address" class="office-addr"><v-icon size="14" class="mr-1">mdi-map-marker-outline</v-icon>{{ property.listingOfficeData.address }}<span v-if="property.listingOfficeData.city">, {{ property.listingOfficeData.city }}</span><span v-if="property.listingOfficeData.province">, {{ property.listingOfficeData.province }}</span><span v-if="property.listingOfficeData.postalCode">, {{ property.listingOfficeData.postalCode }}</span></div>
                    <a v-if="property.listingOfficeData.website" :href="property.listingOfficeData.website" target="_blank" class="agent-link"><v-icon size="14" class="mr-1">mdi-web</v-icon>{{ property.listingOfficeData.website }}</a>
                  </div>
                </div>

                <!-- Fallback Agent -->
                <div v-else-if="property.agent || property.listingAgent" class="agent-info">
                  <div class="d-flex align-start mb-4">
                    <v-avatar size="72" class="agent-avatar mr-4" :color="property.agent?.photo ? 'transparent' : '#e2e8f0'">
                      <v-img v-if="property.agent?.photo" :src="property.agent.photo" :alt="property.agent.name || `${property.agent.firstName} ${property.agent.lastName}`" cover />
                      <v-icon v-else size="36" color="#64748b">mdi-account</v-icon>
                    </v-avatar>
                    <div class="flex-grow-1">
                      <div class="agent-name">{{ property.agent?.name || `${property.agent?.firstName || ''} ${property.agent?.lastName || ''}`.trim() || property.listingAgent }}</div>
                      <div v-if="property.agent?.agency" class="agent-designation">{{ property.agent.agency }}</div>
                      <div class="agent-courtesy-note">
                        Listing courtesy of <span v-if="property.agent?.agency || property.listingOffice">{{ property.agent?.agency || property.listingOffice }}</span><span v-else>their brokerage</span>. Use the <a href="#property-inquiry" class="courtesy-link" @click.prevent="scrollToInquiry">inquiry form</a> to reach us.
                      </div>
                      <div class="agent-contact-list">
                        <a v-if="property.agent?.phone" href="#property-inquiry" class="agent-link agent-link--masked" aria-label="Use the inquiry form to contact this agent" @click.prevent="scrollToInquiry"><v-icon size="14" class="mr-1">mdi-phone</v-icon>XXX-XXX-XXXX</a>
                        <a v-if="property.agent?.email" :href="`mailto:${property.agent.email}`" class="agent-link"><v-icon size="14" class="mr-1">mdi-email-outline</v-icon>{{ property.agent.email }}</a>
                      </div>
                    </div>
                  </div>
                  <div v-if="property.listingOffice" class="office-block">
                    <div class="office-name">{{ property.listingOffice }}</div>
                  </div>
                </div>

                <!-- No Agent -->
                <div v-else class="text-center py-6">
                  <v-icon size="40" color="#cbd5e1">mdi-account-question-outline</v-icon>
                  <div style="color: #94a3b8; margin-top: 8px; font-size: 0.85rem;">Agent information not available</div>
                </div>

                <!-- Co-listing Brokerages (offices) -->
                <div v-if="property.coListingOfficesData?.length" class="co-agents-block">
                  <div class="co-agents-title">Co-Listing Brokerages</div>
                  <div v-for="coOffice in property.coListingOfficesData" :key="coOffice.officeKey" class="office-block" style="margin-bottom: 12px;">
                    <div class="office-name">{{ coOffice.name }}</div>
                    <a v-if="coOffice.phone" href="#property-inquiry" class="agent-link agent-link--masked" aria-label="Use the inquiry form to contact the co-listing office" @click.prevent="scrollToInquiry"><v-icon size="14" class="mr-1">mdi-phone-classic</v-icon>XXX-XXX-XXXX</a>
                    <a v-if="coOffice.email" :href="`mailto:${coOffice.email}`" class="agent-link"><v-icon size="14" class="mr-1">mdi-email-outline</v-icon>{{ coOffice.email }}</a>
                    <div v-if="coOffice.address" class="office-addr"><v-icon size="14" class="mr-1">mdi-map-marker-outline</v-icon>{{ coOffice.address }}<span v-if="coOffice.city">, {{ coOffice.city }}</span><span v-if="coOffice.province">, {{ coOffice.province }}</span></div>
                    <a v-if="coOffice.website" :href="coOffice.website" target="_blank" class="agent-link"><v-icon size="14" class="mr-1">mdi-web</v-icon>{{ coOffice.website }}</a>
                  </div>
                </div>

                <!-- Co-listing Agents -->
                <div v-if="property.coListingAgentsData?.length" class="co-agents-block">
                  <div class="co-agents-title">Co-Listing Agents</div>
                  <div v-for="coAgent in property.coListingAgentsData" :key="coAgent.memberKey" class="co-agent-row">
                    <v-avatar size="48" class="agent-avatar mr-3" :color="coAgent.photoURL ? 'transparent' : '#e2e8f0'">
                      <v-img v-if="coAgent.photoURL" :src="coAgent.photoURL" :alt="coAgent.fullName || `${coAgent.firstName || ''} ${coAgent.lastName || ''}`.trim() || 'Co-Agent'" cover />
                      <v-icon v-else size="24" color="#64748b">mdi-account</v-icon>
                    </v-avatar>
                    <div class="flex-grow-1">
                      <div class="agent-name" style="font-size: 0.9rem;">{{ coAgent.fullName || (coAgent.firstName && coAgent.lastName ? `${coAgent.firstName} ${coAgent.lastName}` : coAgent.firstName || coAgent.lastName || 'Co-Agent') }}</div>
                      <div v-if="coAgent.designations?.length" class="agent-designation">{{ coAgent.designations.join(', ') }}</div>
                      <div class="agent-contact-list" style="margin-top: 4px;">
                        <a v-if="coAgent.directPhone" href="#property-inquiry" class="agent-link agent-link--masked small" :aria-label="`Use the inquiry form to contact ${coAgent.fullName || 'the co-listing agent'}`" @click.prevent="scrollToInquiry"><v-icon size="12" class="mr-1">mdi-phone</v-icon>XXX-XXX-XXXX</a>
                        <a v-if="coAgent.mobilePhone && coAgent.mobilePhone !== coAgent.directPhone" href="#property-inquiry" class="agent-link agent-link--masked small" :aria-label="`Use the inquiry form to contact ${coAgent.fullName || 'the co-listing agent'}`" @click.prevent="scrollToInquiry"><v-icon size="12" class="mr-1">mdi-cellphone</v-icon>XXX-XXX-XXXX</a>
                        <a v-if="coAgent.email" :href="`mailto:${coAgent.email}`" class="agent-link small"><v-icon size="12" class="mr-1">mdi-email-outline</v-icon>{{ coAgent.email }}</a>
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

    <!-- Gallery Dialog -->
    <v-dialog v-model="showGallery" fullscreen :scrim="true" transition="dialog-bottom-transition" class="gallery-dialog">
      <v-card flat class="gallery-card">
        <v-toolbar color="rgba(0,0,0,0.85)" class="gallery-toolbar" style="backdrop-filter: blur(12px);">
          <v-btn icon="mdi-close" size="large" variant="text" @click="showGallery = false" />
          <v-toolbar-title class="text-h6 font-weight-medium">Property Gallery</v-toolbar-title>
          <v-spacer />
          <div class="text-body-1 font-weight-medium">{{ currentImageIndex + 1 }} / {{ property.images?.length }}</div>
        </v-toolbar>
        <div class="gallery-carousel-container">
          <v-carousel v-model="currentImageIndex" height="calc(100vh - 64px)" hide-delimiters show-arrows="hover" class="gallery-carousel">
            <v-carousel-item v-for="(image, index) in property.images" :key="index" :src="image" :alt="propertyMediaItems[index]?.alt || mainImageAlt" contain>
              <template v-slot:placeholder><v-row class="fill-height ma-0" align="center" justify="center"><v-progress-circular indeterminate color="white" size="64" /></v-row></template>
            </v-carousel-item>
          </v-carousel>
        </div>
      </v-card>
    </v-dialog>

    <!-- Schedule Viewing Dialog -->
    <v-dialog v-model="showViewingDialog" max-width="600" class="viewing-dialog">
      <v-card class="dialog-card">
        <div class="dialog-header">
          <v-icon size="24" class="mr-3" style="color: #3b82f6;">mdi-calendar-clock-outline</v-icon>
          <span>Schedule a Viewing</span>
        </div>
        <v-card-text class="pa-7">
          <v-form v-model="isViewingFormValid" @submit.prevent="submitViewingRequest">
            <v-text-field v-model="viewingForm.date" label="Preferred Date" type="date" class="mb-4 form-field" variant="outlined" density="comfortable" required prepend-inner-icon="mdi-calendar" />
            <v-select v-model="viewingForm.time" :items="availableTimes" label="Preferred Time" required variant="outlined" density="comfortable" class="mb-4 form-field" prepend-inner-icon="mdi-clock-outline" />
            <v-textarea v-model="viewingForm.notes" label="Additional Notes (Optional)" variant="outlined" rows="4" density="comfortable" class="form-field" prepend-inner-icon="mdi-note-text-outline" />
            <v-card-actions class="px-0 pt-6">
              <v-btn variant="text" size="large" @click="showViewingDialog = false" class="text-none" style="color: #64748b;">Cancel</v-btn>
              <v-spacer />
              <v-btn type="submit" size="large" :loading="viewingLoading" :disabled="!isViewingFormValid" class="submit-btn px-8">
                <v-icon class="mr-2" size="18">mdi-check-circle-outline</v-icon>
                Confirm Viewing
              </v-btn>
            </v-card-actions>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="feedback.show" :color="feedback.color" :timeout="5000" location="bottom right">
      <v-icon :icon="feedback.color === 'error' ? 'mdi-alert-circle' : 'mdi-check-circle'" class="mr-2" />
      {{ feedback.message }}
      <template #actions>
        <v-btn variant="text" @click="feedback.show = false">Dismiss</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import { useRoute } from 'vue-router'
import { propertyService } from '~/services/property.service'

// Snackbar feedback so contact / viewing / save actions don't fail silently.
const feedback = reactive({
  show: false,
  color: 'success' as 'success' | 'error',
  message: '',
})
const notify = (message: string, color: 'success' | 'error' = 'success') => {
  feedback.message = message
  feedback.color = color
  feedback.show = true
}
const describeError = (e: any, fallback: string) =>
  e?.data?.statusMessage || e?.statusMessage || e?.message || fallback

const { businessName, phone: tenantPhone } = useTenantSettings()
const { public: publicConfig } = useRuntimeConfig()
const GEOAPIFY_KEY = publicConfig.geoapifyApiKey
const GEOAPIFY_URL = 'https://api.geoapify.com/v2'

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

// SSR-safe property fetch. Runs server-side so SEO meta + JSON-LD have real
// data on first render (critical for crawlers and social previews).
const { data: fetchedProperty } = await useAsyncData(
  `property-${route.params.id}`,
  async () => {
    try {
      return (await $fetch(`/api/properties/${route.params.id}`)) as any
    } catch (error) {
      console.error('Error fetching property:', error)
      return null
    }
  },
  { watch: [() => route.params.id] }
)

// Return a 404 status server-side when the property doesn't exist so
// Google won't index a soft-404 page.
if (import.meta.server && !fetchedProperty.value) {
  const evt = useRequestEvent()
  if (evt) setResponseStatus(evt, 404)
}

const buildPropertyState = (data: any) => {
  const defaults = {
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
    agent: { name: '', phone: '', email: '' },
  }
  if (!data) return defaults
  const lat = Number(data.latitude)
  const lng = Number(data.longitude)
  return {
    ...defaults,
    ...data,
    images: Array.isArray(data.images) && data.images.length ? data.images : ['/favicon.ico'],
    latitude: isFinite(lat) ? lat : defaults.latitude,
    longitude: isFinite(lng) ? lng : defaults.longitude,
  }
}

// Writable property ref hydrated from SSR data (kept writable so existing
// favorite/save/share handlers continue to work).
const property = ref<any>(buildPropertyState(fetchedProperty.value))

onMounted(async () => {
  try {
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

// Capture origin ONCE at setup. The wrapped composable form (() => useAbsoluteUrl())
// would re-enter the Nuxt scope when computeds re-evaluate during unhead's
// post-render head walk and throw "[nuxt] instance unavailable" → SSR 500.
const seoSiteUrl = useSiteUrl()
const seoAbsoluteUrl = (path: string | null | undefined) => absolutizeUrl(seoSiteUrl, path)

const propertyCanonicalUrl = computed(() =>
  seoSiteUrl ? `${seoSiteUrl}/property/${route.params.id}` : ''
)

const propertyOgImage = computed(() => {
  const imgs = property.value.images
  const first = Array.isArray(imgs) && imgs.length ? imgs[0] : property.value.coverImage || ''
  if (!first || first === '/favicon.ico') return ''
  return seoAbsoluteUrl(first)
})

const propertyDescription = computed(() => {
  const p = property.value
  const beds = p.beds ?? p.bedrooms
  const baths = p.baths ?? p.bathrooms
  const parts = [
    p.address,
    beds ? `${beds} bed` : '',
    baths ? `${baths} bath` : '',
    p.sqft ? `${Number(p.sqft).toLocaleString()} sqft` : '',
    p.price ? `$${Number(p.price).toLocaleString()}` : '',
  ].filter(Boolean)
  if (parts.length > 1) return parts.join(' · ')
  if (p.description) {
    const txt = String(p.description).replace(/<[^>]+>/g, '').trim()
    return txt.length > 200 ? txt.slice(0, 197) + '…' : txt
  }
  return 'View property details, photos, and features.'
})

const hasRealProperty = computed(
  () => !!fetchedProperty.value && (property.value.address || property.value.title)
)

useSeoMeta({
  title: () => {
    const p = property.value
    const addr = p.address || p.title || 'Property Details'
    return `${addr} | ${businessName.value || 'Real Estate'}`
  },
  description: () => propertyDescription.value,
  keywords: () => {
    const p = property.value
    return [p.city, p.province, p.type, 'real estate', 'home for sale', p.mlsNumber]
      .filter(Boolean)
      .join(', ')
  },
  ogTitle: () => property.value.address || property.value.title || 'Property Details',
  ogDescription: () => propertyDescription.value,
  ogImage: () => propertyOgImage.value || undefined,
  ogUrl: () => propertyCanonicalUrl.value || undefined,
  ogType: 'website',
  ogSiteName: () => businessName.value || 'Real Estate',
  twitterCard: 'summary_large_image',
  twitterTitle: () => property.value.address || property.value.title || 'Property Details',
  twitterDescription: () => propertyDescription.value,
  twitterImage: () => propertyOgImage.value || undefined,
  robots: () => (hasRealProperty.value ? 'index, follow' : 'noindex, nofollow'),
})

const realEstateSchema = computed(() => {
  if (!hasRealProperty.value) return null
  const p = property.value

  const photos = (Array.isArray(p.images) ? p.images : [])
    .filter((img: string) => img && img !== '/favicon.ico')
    .slice(0, 10)
    .map((img: string) => seoAbsoluteUrl(img))
    .filter(Boolean)

  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    '@id': propertyCanonicalUrl.value || undefined,
    url: propertyCanonicalUrl.value || undefined,
    name: p.address || p.title || undefined,
    description: propertyDescription.value || undefined,
    datePosted: p.publishedAt || p.createdAt || undefined,
    image: photos.length ? photos : undefined,
  }

  if (p.price && Number(p.price) > 0) {
    schema.offers = {
      '@type': 'Offer',
      price: Number(p.price),
      priceCurrency: 'CAD',
      availability:
        p.status === 'sold'
          ? 'https://schema.org/SoldOut'
          : 'https://schema.org/InStock',
      url: propertyCanonicalUrl.value || undefined,
    }
  }

  if (p.address || p.city || p.province || p.postalCode) {
    schema.address = {
      '@type': 'PostalAddress',
      streetAddress: p.address || undefined,
      addressLocality: p.city || undefined,
      addressRegion: p.province || 'AB',
      postalCode: p.postalCode || undefined,
      addressCountry: 'CA',
    }
  }

  if (Number(p.latitude) && Number(p.longitude)) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: Number(p.latitude),
      longitude: Number(p.longitude),
    }
  }

  // SingleFamilyResidence-style attributes nested on the listing.
  // Source of truth: Prisma columns (beds, baths, lotSizeArea, yearBuilt) +
  // features.* JSON. Bedrooms/bathrooms aliases retained for legacy/manual rows.
  const accommodation: Record<string, any> = {
    '@type': 'SingleFamilyResidence',
    name: p.address || p.title || undefined,
  }
  const bedCount = Number(p.beds ?? p.bedrooms) || 0
  const bathCount = Number(p.baths ?? p.bathrooms) || 0
  if (bedCount > 0) accommodation.numberOfBedrooms = bedCount
  if (bathCount > 0) accommodation.numberOfBathroomsTotal = bathCount
  if (p.sqft) {
    accommodation.floorSize = {
      '@type': 'QuantitativeValue',
      value: Number(p.sqft),
      unitCode: 'FTK', // square feet
    }
  }
  const lotArea = Number(p.lotSizeArea ?? p.features?.lotSizeArea ?? p.lotSize) || 0
  if (lotArea > 0) {
    const lotUnits = (p.lotSizeUnits || p.features?.lotSizeUnits || '').toLowerCase()
    accommodation.lotSize = {
      '@type': 'QuantitativeValue',
      value: lotArea,
      // Schema.org unit codes: FTK=sq ft, MTK=sq m, ACR=acres, HAR=hectares
      unitCode:
        lotUnits.includes('acre') ? 'ACR' :
        lotUnits.includes('hect') ? 'HAR' :
        lotUnits.includes('square m') || lotUnits === 'm2' ? 'MTK' :
        'FTK',
    }
  }
  const yearBuilt = Number(p.yearBuilt ?? p.features?.yearBuilt) || 0
  if (yearBuilt > 0) accommodation.yearBuilt = yearBuilt

  const amenities: Array<Record<string, any>> = []
  const heatingValues = p.features?.heating || (p.heating ? [p.heating] : null)
  if (Array.isArray(heatingValues) && heatingValues.length) {
    amenities.push({ '@type': 'LocationFeatureSpecification', name: 'Heating', value: heatingValues.join(', ') })
  } else if (typeof heatingValues === 'string' && heatingValues) {
    amenities.push({ '@type': 'LocationFeatureSpecification', name: 'Heating', value: heatingValues })
  }
  if (p.features?.cooling?.length) {
    amenities.push({ '@type': 'LocationFeatureSpecification', name: 'Cooling', value: p.features.cooling.join(', ') })
  }
  if (p.features?.parking) {
    amenities.push({ '@type': 'LocationFeatureSpecification', name: 'Parking Spaces', value: String(p.features.parking) })
  }
  if (p.features?.view?.length) {
    amenities.push({ '@type': 'LocationFeatureSpecification', name: 'View', value: p.features.view.join(', ') })
  }
  if (p.features?.waterfrontFeatures?.length || p.waterBodyName) {
    amenities.push({
      '@type': 'LocationFeatureSpecification',
      name: 'Waterfront',
      value: [p.waterBodyName, ...(p.features?.waterfrontFeatures || [])].filter(Boolean).join(', '),
    })
  }
  if (amenities.length) accommodation.amenityFeature = amenities

  schema.accommodationCategory = p.type || undefined
  schema.itemOffered = accommodation

  // Listing agent / brokerage (CREA listingAgentData / listingOfficeData).
  const agentData = p.listingAgentData
  const officeData = p.listingOfficeData
  if (agentData) {
    const agentName =
      agentData.fullName ||
      [agentData.firstName, agentData.lastName].filter(Boolean).join(' ').trim() ||
      undefined
    const agentNode: Record<string, any> = {
      '@type': 'RealEstateAgent',
      name: agentName,
      telephone: agentData.directPhone || agentData.mobilePhone || agentData.officePhone || undefined,
      email: agentData.email || undefined,
      image: agentData.photoURL || undefined,
    }
    if (officeData) {
      agentNode.worksFor = {
        '@type': 'RealEstateOrganization',
        name: officeData.name || undefined,
        telephone: officeData.phone || undefined,
        email: officeData.email || undefined,
        url: officeData.website || undefined,
        address: (officeData.address || officeData.city || officeData.province) ? {
          '@type': 'PostalAddress',
          streetAddress: officeData.address || undefined,
          addressLocality: officeData.city || undefined,
          addressRegion: officeData.province || undefined,
          postalCode: officeData.postalCode || undefined,
          addressCountry: officeData.country || 'CA',
        } : undefined,
      }
    }
    Object.keys(agentNode).forEach((k) => agentNode[k] === undefined && delete agentNode[k])
    if (agentNode.name || agentNode.telephone || agentNode.email) {
      schema.agent = agentNode
    }
  }

  // Days on Market (Google understands as a numeric annotation).
  if (typeof p.daysOnMarket === 'number' && p.daysOnMarket >= 0) {
    schema.numberOfRooms = bedCount || undefined
    schema.additionalProperty = [
      { '@type': 'PropertyValue', name: 'Days on Market', value: p.daysOnMarket },
    ]
  }
  if (p.propertyCondition) {
    schema.additionalProperty = [
      ...(schema.additionalProperty || []),
      { '@type': 'PropertyValue', name: 'Property Condition', value: p.propertyCondition },
    ]
  }

  // Drop undefined
  Object.keys(schema).forEach((k) => schema[k] === undefined && delete schema[k])
  return schema
})

useHead({
  link: () =>
    propertyCanonicalUrl.value
      ? [{ rel: 'canonical', href: propertyCanonicalUrl.value }]
      : [],
  script: () =>
    realEstateSchema.value
      ? [
          {
            type: 'application/ld+json',
            children: JSON.stringify(realEstateSchema.value),
          },
        ]
      : [],
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

// Rich media items: prefer the structured features.mediaItems (CREA sync now
// provides per-photo alt text, ordering, hero flag, and media category).
// Falls back to building basic items from the flat images array for legacy
// records or non-CREA properties.
//
// Photos drive the main gallery; other categories (floorplans, virtual tours,
// videos) are exposed via `nonPhotoMediaItems` for the dedicated "Tours &
// Floorplans" section.
// RESO MediaCategory in the wild has multiple variants ("Photo", "Photos",
// "PropertyPhoto", "AerialPhoto", board-specific casing, etc.). A literal
// `=== 'Photo'` check used to dump these into the Tours & Floorplans section
// even though they're regular property photos. Treat anything containing
// "photo" — except agent/office headshots and brand logos — as a property
// photo, which keeps non-photo categories (floorplan/video/virtualtour/
// document) for the dedicated tours section.
const isPhotoCategory = (cat?: string | null): boolean => {
  if (!cat) return true
  const c = String(cat).toLowerCase()
  if (c.includes('agent') || c.includes('office') || c.includes('logo')) return false
  return c.includes('photo')
}

const allMediaItems = computed(() => {
  const fromFeatures = property.value.features?.mediaItems
  if (Array.isArray(fromFeatures) && fromFeatures.length) {
    return fromFeatures
      .filter((m: any) => m?.url)
      .map((m: any, idx: number) => ({
        url: m.url,
        alt: m.alt || `${property.value.address || property.value.title} - media ${idx + 1}`,
        category: m.category || 'Photo',
        order: typeof m.order === 'number' ? m.order : idx,
      }))
  }
  const images = property.value.images || []
  return images
    .filter((url: string) => !!url)
    .map((url: string, idx: number) => ({
      url,
      alt: `${property.value.address || property.value.title} - photo ${idx + 1}`,
      category: 'Photo',
      order: idx,
    }))
})

const propertyMediaItems = computed(() =>
  allMediaItems.value.filter((m: any) => isPhotoCategory(m.category))
)

// Non-photo CREA media: floorplans, virtual tours, videos, branded virtual
// tours, etc. Surfaced beneath the gallery so buyers can explore tours
// without us forcing them into the main carousel.
const nonPhotoMediaItems = computed(() =>
  allMediaItems.value
    .filter((m: any) => !isPhotoCategory(m.category))
    .map((m: any) => {
      const cat = String(m.category || '').toLowerCase()
      let kind: 'video' | 'virtual_tour' | 'floorplan' | 'document' | 'other' = 'other'
      let icon = 'mdi-link-variant'
      let label = m.category
      if (cat.includes('video')) { kind = 'video'; icon = 'mdi-play-circle-outline'; label = 'Video Tour' }
      else if (cat.includes('virtualtour') || cat.includes('virtual_tour') || cat.includes('virtual tour')) { kind = 'virtual_tour'; icon = 'mdi-rotate-3d-variant'; label = 'Virtual Tour' }
      else if (cat.includes('floorplan') || cat.includes('floor_plan') || cat.includes('floor plan')) { kind = 'floorplan'; icon = 'mdi-floor-plan'; label = 'Floor Plan' }
      else if (cat.includes('document') || cat.includes('pdf')) { kind = 'document'; icon = 'mdi-file-document-outline'; label = 'Document' }
      return { ...m, kind, icon, label }
    })
)

const mainImageAlt = computed(() => {
  return propertyMediaItems.value[0]?.alt || property.value.address || property.value.title || 'Property photo'
})

const thumbnailImages = computed(() => {
  const items = propertyMediaItems.value
  if (items.length <= 1) return []

  const buildEntry = (idx: number) => ({
    url: items[idx]?.url || '',
    alt: items[idx]?.alt || '',
    imageIndex: idx,
  })

  // 5+ photos: take the next four after the hero
  if (items.length >= 5) {
    return [buildEntry(1), buildEntry(2), buildEntry(3), buildEntry(4)]
  }

  // Fewer photos: cycle through what we have to fill 4 slots
  const thumbnails = []
  const available = items.slice(1)
  for (let i = 0; i < 4; i++) {
    if (available.length > 0) {
      const cycleIndex = i % available.length
      const actualImageIndex = cycleIndex + 1
      thumbnails.push({
        url: available[cycleIndex].url,
        alt: available[cycleIndex].alt,
        imageIndex: actualImageIndex,
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
    notify("Message sent. We'll be in touch shortly.", 'success')
  } catch (error) {
    console.error('Submit error:', error)
    notify(describeError(error, 'Could not send your message. Please try again.'), 'error')
  } finally {
    loading.value = false
  }
}

const scheduleViewing = () => {
  showViewingDialog.value = true
}

// Masked agent phone numbers act as CTAs that bring the user back to the
// inquiry form instead of dialing a fake number. We deliberately defer the
// focus so the smooth scroll has time to start before the browser's
// scroll-to-focused-element heuristic kicks in and fights us for control.
const scrollToInquiry = () => {
  if (typeof document === 'undefined') return
  const target = document.getElementById('property-inquiry')
  if (!target) return
  target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  setTimeout(() => {
    const el = document.getElementById('property-contact-message')
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
      el.focus({ preventScroll: true })
      return
    }
    // Defensive fallback in case a future Vuetify version moves the id
    // from the textarea onto a wrapper element.
    const inner = el?.querySelector?.('textarea, input')
    if (inner instanceof HTMLElement) inner.focus({ preventScroll: true })
  }, 320)
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
    notify('Viewing request sent.', 'success')
  } catch (error) {
    console.error('Viewing request error:', error)
    notify(describeError(error, 'Could not submit the viewing request.'), 'error')
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
  const f = property.value.features
  if (!f) return false
  return (
    f.appliances?.length ||
    f.interior?.length ||
    f.exterior?.length ||
    f.flooring?.length ||
    f.poolFeatures?.length ||
    f.fireplaceFeatures?.length ||
    f.building?.length ||
    f.lot?.length ||
    f.view?.length ||
    f.waterfrontFeatures?.length ||
    f.security?.length ||
    f.accessibilityFeatures?.length ||
    f.communityFeatures?.length ||
    f.architecturalStyle?.length
  )
})

const hasUtilities = computed(() => {
  const f = property.value.features
  if (!f) return false
  return (
    f.utilities?.length ||
    f.waterSource?.length ||
    f.sewer?.length ||
    f.electric?.length ||
    f.irrigationSource?.length ||
    f.roadSurfaceType?.length
  )
})

// Listed date: prefer top-level originalEntryTimestamp (Prisma column from
// CREA OriginalEntryTimestamp), fall back to features.* mirror, then createdAt.
const listedDateDisplay = computed(() => {
  const p = property.value
  const raw =
    p.originalEntryTimestamp ||
    p.features?.originalEntryTimestamp ||
    p.publishedAt ||
    p.createdAt
  return raw ? formatListingDate(raw) : ''
})

// Property condition: top-level column is now a comma-joined string after
// the CREA fix; older rows or non-CREA listings may still have an array in
// features.propertyCondition.
const propertyConditionDisplay = computed(() => {
  const p = property.value
  if (p.propertyCondition) return p.propertyCondition
  const fc = p.features?.propertyCondition
  if (Array.isArray(fc) && fc.length) return fc.join(', ')
  if (typeof fc === 'string' && fc) return fc
  return ''
})

// Phone for the primary "Call Now" CTA on a property page.
//
// IMPORTANT: this MUST route to the tenant/plan owner — not to the CREA
// listing agent. The platform exists to capture leads for the tenant; if the
// CTA dialed the third-party MLS listing agent (often a competitor at a
// different brokerage), every lead would be handed to them. Listing agent
// contact info is still disclosed in the sidebar for transparency, but the
// primary call-to-action belongs to whoever owns the plan.
const leadPhone = computed(() => tenantPhone.value || '')

const formatListingDate = (dateStr: string) => {
  if (!dateStr) return 'N/A'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return 'N/A'
  return date.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
}

// Save functionality
const toggleSave = async () => {
  if (!property.value?.id) return

  try {
    await toggleSaveProperty(property.value.id)
    property.value.isSaved = !property.value.isSaved
    notify(property.value.isSaved ? 'Saved to your favourites.' : 'Removed from favourites.', 'success')
  } catch (error) {
    console.error('Error toggling save:', error)
    notify(describeError(error, 'Could not update your saved properties.'), 'error')
  }
}
</script>

<style scoped>
/* ═══════════════════════════════════════════
   BASE
   ═══════════════════════════════════════════ */
.property-detail {
  min-height: 100vh;
  background: #f8fafc;
}

/* ═══════════════════════════════════════════
   IMAGE GALLERY
   ═══════════════════════════════════════════ */
.gallery-single { border-radius: 0 0 24px 24px; overflow: hidden; }
.image-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 6px;
  height: 600px;
  overflow: hidden;
}
.main-image {
  grid-row: 1 / span 4;
  cursor: pointer;
  position: relative;
  transition: filter 0.3s;
}
.main-image:hover { filter: brightness(0.95); }
.main-image-overlay {
  position: absolute; bottom: 0; left: 0; right: 0; height: 120px;
  background: linear-gradient(transparent, rgba(0,0,0,0.15));
  pointer-events: none;
}
.thumbnail-grid {
  display: grid;
  grid-template-rows: repeat(4, 1fr);
  gap: 6px;
  position: relative;
}
.thumbnail-grid > * { min-height: 0; min-width: 0; }
.thumbnail {
  cursor: pointer;
  transition: filter 0.25s, transform 0.25s;
  overflow: hidden;
}
.thumbnail:hover { filter: brightness(0.92); transform: scale(1.02); }
.more-photos {
  position: absolute; bottom: 12px; right: 12px;
  background: rgba(255,255,255,0.92) !important;
  backdrop-filter: blur(12px);
  border-radius: 10px !important;
  padding: 8px 18px !important;
  font-weight: 700 !important;
  font-size: 0.82rem !important;
  color: #1e293b !important;
  text-transform: none !important;
  box-shadow: 0 2px 12px rgba(0,0,0,0.1) !important;
  letter-spacing: 0 !important;
}

/* ═══════════════════════════════════════════
   TABS
   ═══════════════════════════════════════════ */
.tabs-wrapper {
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 28px;
}
.premium-tabs :deep(.v-tab) {
  text-transform: none !important;
  font-weight: 600;
  font-size: 0.88rem;
  letter-spacing: 0;
  color: #64748b;
  border-radius: 0;
  min-width: auto;
  padding: 0 20px;
}
.premium-tabs :deep(.v-tab--selected) { color: #1e293b; }
.premium-tabs :deep(.v-tabs-slider) { color: #3b82f6; }

/* ═══════════════════════════════════════════
   PROPERTY HEADER
   ═══════════════════════════════════════════ */
.prop-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 16px; margin-bottom: 24px;
}
.prop-title {
  font-size: clamp(1.4rem, 2.5vw, 1.75rem);
  font-weight: 800; color: #0f172a;
  letter-spacing: -0.03em; line-height: 1.3;
}
.prop-actions { display: flex; gap: 8px; flex-shrink: 0; }
.action-btn {
  background: #f1f5f9 !important;
  color: #475569 !important;
  border-radius: 12px !important;
  box-shadow: none !important;
}
.action-btn:hover {
  background: #e2e8f0 !important;
  transform: none !important;
  box-shadow: none !important;
}

/* ── Price ── */
.price-strip {
  display: inline-flex; flex-direction: column;
  background: #fff;
  border: 2px solid #e2e8f0;
  border-radius: 16px;
  padding: 16px 28px;
  margin-bottom: 24px;
}
.price-label {
  font-size: 0.65rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.12em;
  color: #94a3b8; margin-bottom: 2px;
}
.price-value {
  font-size: 1.8rem; font-weight: 800;
  color: #0f172a; letter-spacing: -0.03em;
}

/* ── Quick Stats ── */
.quick-stats {
  display: flex; flex-wrap: wrap; gap: 10px;
  margin-bottom: 32px;
}
.stat-pill {
  display: inline-flex; align-items: center; gap: 7px;
  background: #fff; border: 1px solid #e2e8f0;
  border-radius: 10px; padding: 8px 16px;
  font-size: 0.85rem; font-weight: 600;
  color: #334155;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.stat-pill:hover {
  border-color: #cbd5e1;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.stat-pill .v-icon { color: #64748b; }

/* ═══════════════════════════════════════════
   CONTENT CARDS
   ═══════════════════════════════════════════ */
.content-card {
  background: #fff !important;
  border: 1px solid #e8ecf1 !important;
  border-radius: 18px !important;
  box-shadow: 0 1px 3px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.02) !important;
  transition: box-shadow 0.25s !important;
}
.content-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.04) !important;
}

.card-section-header {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 24px;
  font-size: 1.1rem; font-weight: 700;
  color: #1e293b; letter-spacing: -0.01em;
}
.card-section-icon {
  width: 36px; height: 36px;
  border-radius: 10px;
  background: #f1f5f9;
  display: flex; align-items: center; justify-content: center;
  color: #3b82f6;
  flex-shrink: 0;
}

/* ── Detail Items ── */
.detail-item {
  padding: 10px 12px;
  border-radius: 10px;
  transition: background 0.2s;
}
.detail-item:hover { background: #f8fafc; }
.detail-label {
  font-size: 0.7rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.06em;
  color: #94a3b8; margin-bottom: 4px;
}
.detail-value {
  font-size: 0.92rem; font-weight: 600;
  color: #1e293b;
}
.detail-note { color: #94a3b8; font-weight: 400; }

/* ── Description ── */
.description-text {
  font-size: 0.95rem; line-height: 1.85;
  color: #475569; text-align: justify; hyphens: auto;
}

/* ── Feature Groups ── */
.feature-group { margin-bottom: 24px; }
.feature-group:last-child { margin-bottom: 0; }
.feature-group-label {
  display: flex; align-items: center;
  font-size: 0.82rem; font-weight: 700;
  color: #475569; margin-bottom: 10px;
}
.feature-group-label .v-icon { color: #64748b; }
.feature-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.feature-chip {
  display: inline-block;
  padding: 5px 14px;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 600;
}
.chip-blue { background: #eff6ff; color: #2563eb; }
.chip-indigo { background: #eef2ff; color: #4f46e5; }
.chip-green { background: #ecfdf5; color: #059669; }
.chip-warm { background: #fef3c7; color: #92400e; }
.chip-cyan { background: #ecfeff; color: #0891b2; }
.chip-amber { background: #fffbeb; color: #b45309; }
.chip-slate { background: #f1f5f9; color: #475569; }
.chip-rose { background: #fff1f2; color: #be123c; }

/* ── Tours & Floorplans ── */
.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}
.media-tile {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  text-decoration: none;
  color: inherit;
  transition: all 0.15s ease;
}
.media-tile:hover {
  background: #eff6ff;
  border-color: #93c5fd;
  transform: translateY(-1px);
}
.media-tile-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border-radius: 10px;
}
.media-tile-body { flex: 1; min-width: 0; }
.media-tile-label {
  font-size: 0.9rem;
  font-weight: 700;
  color: #1e293b;
}
.media-tile-alt {
  font-size: 0.78rem;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.media-tile-arrow { color: #94a3b8; }

/* ── Map ── */
.location-address {
  display: flex; align-items: center;
  font-size: 0.92rem; font-weight: 500;
  color: #475569; margin-bottom: 20px;
}
.map-container { border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
.map-placeholder {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 400px; background: #f1f5f9; border-radius: 16px;
}

/* ═══════════════════════════════════════════
   CALCULATOR
   ═══════════════════════════════════════════ */
.calc-form { margin-bottom: 28px; }
.calc-field :deep(.v-field) { border-radius: 12px !important; }
.calc-result {
  background: linear-gradient(135deg, #f0f9ff, #eff6ff);
  border: 1px solid #bfdbfe;
  border-radius: 16px;
  padding: 24px 28px;
}
.calc-result-label {
  font-size: 0.72rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.1em;
  color: #3b82f6; margin-bottom: 4px;
}
.calc-result-value {
  font-size: 2rem; font-weight: 800;
  color: #1e293b; letter-spacing: -0.03em;
  margin-bottom: 8px;
}
.calc-result-detail {
  font-size: 0.82rem; color: #64748b; line-height: 1.6;
}

/* ═══════════════════════════════════════════
   TABLES
   ═══════════════════════════════════════════ */
.table-wrap {
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  overflow: hidden;
}
.poi-table :deep(thead), .rooms-table :deep(thead) {
  background: #f8fafc;
}
.poi-table :deep(thead th), .rooms-table :deep(thead th) {
  font-size: 0.68rem !important; font-weight: 700 !important;
  text-transform: uppercase; letter-spacing: 0.08em;
  color: #64748b !important;
  border-bottom: 2px solid #e2e8f0 !important;
  padding: 14px 16px !important;
}
.poi-table :deep(tbody tr), .rooms-table :deep(tbody tr) { transition: background 0.15s; }
.poi-table :deep(tbody tr:hover), .rooms-table :deep(tbody tr:hover) { background: #f8fafc !important; }
.poi-table :deep(tbody td), .rooms-table :deep(tbody td) {
  border-bottom: 1px solid #f1f5f9 !important;
  padding: 12px 16px !important;
}
.table-badge {
  display: inline-block; padding: 3px 10px; border-radius: 6px;
  background: #eff6ff; color: #2563eb;
  font-size: 0.72rem; font-weight: 700;
}
.table-eta {
  display: inline-block; padding: 3px 10px; border-radius: 6px;
  background: #ecfdf5; color: #059669;
  font-size: 0.78rem; font-weight: 600;
}
.transport-toggle {
  border-radius: 10px !important;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06) !important;
}
.transport-toggle :deep(.v-btn) {
  text-transform: none !important;
  font-weight: 600 !important;
  font-size: 0.82rem !important;
  letter-spacing: 0 !important;
  box-shadow: none !important;
}
.transport-toggle :deep(.v-btn:hover) { transform: none !important; }

/* ═══════════════════════════════════════════
   SIDEBAR
   ═══════════════════════════════════════════ */
.sticky-sidebar { position: sticky; top: 24px; }
.sidebar-card {
  background: #fff !important;
  border: 1px solid #e8ecf1 !important;
  border-radius: 18px !important;
  box-shadow: 0 1px 3px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.02) !important;
}
.sidebar-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
  margin: 20px 0;
}

/* ── Form Fields ── */
.form-field :deep(.v-field) {
  border-radius: 12px !important;
  transition: box-shadow 0.2s;
}
.form-field :deep(.v-field--focused) {
  box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
}

/* ── Buttons ── */
.submit-btn {
  background: linear-gradient(135deg, #2563eb, #3b82f6) !important;
  color: #fff !important;
  border-radius: 12px !important;
  text-transform: none !important;
  font-weight: 700 !important;
  letter-spacing: 0 !important;
  box-shadow: 0 2px 12px rgba(37,99,235,0.25) !important;
  transition: box-shadow 0.2s !important;
}
.submit-btn:hover {
  box-shadow: 0 4px 20px rgba(37,99,235,0.35) !important;
  transform: none !important;
}
.secondary-btn {
  border-color: #e2e8f0 !important;
  color: #334155 !important;
  border-radius: 12px !important;
  text-transform: none !important;
  font-weight: 600 !important;
  letter-spacing: 0 !important;
  box-shadow: none !important;
}
.secondary-btn:hover {
  background: #f8fafc !important;
  border-color: #cbd5e1 !important;
  transform: none !important;
  box-shadow: none !important;
}
.call-btn {
  background: #ecfdf5 !important;
  color: #059669 !important;
  border-radius: 12px !important;
  text-transform: none !important;
  font-weight: 600 !important;
  letter-spacing: 0 !important;
  box-shadow: none !important;
}
.call-btn:hover {
  background: #d1fae5 !important;
  transform: none !important;
  box-shadow: none !important;
}

/* ═══════════════════════════════════════════
   AGENT INFO
   ═══════════════════════════════════════════ */
.agent-avatar {
  border: 3px solid #f1f5f9 !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  flex-shrink: 0;
}
.agent-name {
  font-size: 1.05rem; font-weight: 700;
  color: #1e293b; margin-bottom: 2px;
}
.agent-designation {
  font-size: 0.78rem; color: #3b82f6;
  font-weight: 600; margin-bottom: 4px;
}
.agent-license {
  font-size: 0.72rem; color: #94a3b8;
  margin-bottom: 8px;
}
.agent-contact-list {
  display: flex; flex-direction: column; gap: 4px;
  margin-top: 8px;
}
.agent-link {
  display: flex; align-items: center;
  font-size: 0.82rem; color: #475569;
  text-decoration: none;
  transition: color 0.2s;
}
.agent-link:hover { color: #2563eb; }
.agent-link.small { font-size: 0.75rem; }
.agent-link .v-icon { color: #94a3b8; }
.link-note { color: #94a3b8; font-size: 0.72rem; margin-left: 4px; }
/*
  Masked phone rows are intentionally non-interactive: cursor stays as the
  default arrow, no user-select so the placeholder can't be copied as if it
  were a real number, and hover doesn't shift to link-blue (which would
  imply a clickable affordance that no longer exists).
*/
/* Masked phone numbers are clickable CTAs that scroll to the inquiry
   form rather than dialing a placeholder number. We keep the digits
   unselectable so nobody copies "XXX-XXX-XXXX" as text. */
.agent-link--masked {
  color: #94a3b8;
  cursor: pointer;
  user-select: none;
  text-decoration: none;
  transition: color 0.15s ease;
}
.agent-link--masked .link-note { color: inherit; }
.agent-link--masked:hover,
.agent-link--masked:focus-visible {
  color: #2563eb;
  text-decoration: underline;
}
.agent-link--masked:focus-visible {
  outline: 2px solid rgba(37, 99, 235, 0.35);
  outline-offset: 2px;
  border-radius: 4px;
}
.agent-courtesy-note {
  font-size: 0.72rem;
  color: #64748b;
  font-style: italic;
  background: #f8fafc;
  border-left: 3px solid #cbd5e1;
  padding: 6px 10px;
  margin: 6px 0 10px;
  border-radius: 0 6px 6px 0;
  line-height: 1.4;
}
.agent-courtesy-note .courtesy-link {
  color: #2563eb;
  font-style: normal;
  font-weight: 600;
  text-decoration: none;
}
.agent-courtesy-note .courtesy-link:hover,
.agent-courtesy-note .courtesy-link:focus-visible {
  text-decoration: underline;
}

.office-block {
  margin-top: 20px; padding-top: 20px;
  border-top: 1px solid #f1f5f9;
}
.office-name {
  font-size: 0.92rem; font-weight: 700;
  color: #334155; margin-bottom: 8px;
}
.office-addr {
  display: flex; align-items: flex-start;
  font-size: 0.82rem; color: #475569;
  margin-bottom: 4px;
}
.office-addr .v-icon { color: #94a3b8; margin-top: 2px; }

.co-agents-block {
  margin-top: 20px; padding-top: 20px;
  border-top: 1px solid #f1f5f9;
}
.co-agents-title {
  font-size: 0.82rem; font-weight: 700;
  color: #475569; text-transform: uppercase;
  letter-spacing: 0.05em; margin-bottom: 16px;
}
.co-agent-row {
  display: flex; align-items: flex-start;
  margin-bottom: 16px;
}
.co-agent-row:last-child { margin-bottom: 0; }

/* ═══════════════════════════════════════════
   GALLERY DIALOG
   ═══════════════════════════════════════════ */
.gallery-dialog :deep(.v-overlay__scrim) {
  background: rgba(0,0,0,0.92);
  backdrop-filter: blur(8px);
}
.gallery-card { background: #000 !important; border-radius: 0 !important; box-shadow: none !important; border: none !important; }
.gallery-toolbar {
  position: absolute; top: 0; left: 0; right: 0; z-index: 10;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.gallery-toolbar :deep(.v-btn) { color: #fff; box-shadow: none !important; }
.gallery-toolbar :deep(.v-btn:hover) { background: rgba(255,255,255,0.1); transform: none !important; box-shadow: none !important; }
.gallery-carousel-container { background: #000; height: 100vh; padding-top: 64px; }
.gallery-carousel { background: #000; }
.gallery-carousel :deep(.v-btn) { background: rgba(255,255,255,0.12); backdrop-filter: blur(8px); box-shadow: none !important; }
.gallery-carousel :deep(.v-btn:hover) { background: rgba(255,255,255,0.2); transform: none !important; box-shadow: none !important; }

/* ═══════════════════════════════════════════
   VIEWING DIALOG
   ═══════════════════════════════════════════ */
.dialog-card {
  border-radius: 20px !important;
  overflow: hidden;
  border: none !important;
  box-shadow: 0 24px 48px rgba(0,0,0,0.12) !important;
}
.dialog-header {
  display: flex; align-items: center;
  padding: 24px 28px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-size: 1.15rem; font-weight: 700;
  color: #1e293b;
}

/* ═══════════════════════════════════════════
   GLOBAL OVERRIDES (scoped)
   ═══════════════════════════════════════════ */
:deep(.v-card) {
  border-radius: 18px !important;
  box-shadow: none !important;
}
:deep(.v-btn) {
  text-transform: none;
  letter-spacing: 0;
}

/* ═══════════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════════ */
@media (max-width: 960px) {
  .image-grid { grid-template-columns: 1fr; height: auto; }
  .main-image { height: 320px; }
  .thumbnail-grid { display: none; }
  .prop-header { flex-direction: column; }
}
@media (max-width: 768px) {
  .sticky-sidebar { position: relative; top: auto; }
  .agent-info .d-flex.align-start { flex-direction: column; align-items: center; text-align: center; }
  .agent-info .agent-avatar { margin-right: 0 !important; margin-bottom: 12px; }
  .agent-contact-list { align-items: center; }
  .co-agent-row { flex-direction: column; align-items: center; text-align: center; }
  .co-agent-row .agent-avatar { margin-right: 0 !important; margin-bottom: 8px; }
}
</style>
