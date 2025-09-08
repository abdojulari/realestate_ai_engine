<template>
  <v-card flat color="white">
    <v-card-title class="d-flex align-center">
      {{ title }}
      <v-spacer />
      <div v-if="showControls" class="d-flex flex-column flex-sm-row gap-2">
        <!-- Zoom Controls -->
        <v-btn-group>
          <v-btn
            icon="mdi-plus"
            size="small"
            @click="adjustZoom(1)"
          />
          <v-btn
            icon="mdi-minus"
            size="small"
            @click="adjustZoom(-1)"
          />
        </v-btn-group>
        
        <!-- Map Type Controls -->
        <v-btn-group mandatory>
          <v-btn
            size="small"
            :variant="mapType === 'map' ? 'flat' : 'outlined'"
            :color="mapType === 'map' ? 'primary' : undefined"
            @click="setMapType('map')"
            class="text-xs sm:text-sm"
          >
            Map
          </v-btn>
          <v-btn
            size="small"
            :variant="mapType === 'satellite' ? 'flat' : 'outlined'"
            :color="mapType === 'satellite' ? 'primary' : undefined"
            @click="setMapType('satellite')"
            class="text-xs sm:text-sm"
          >
            Satellite
          </v-btn>
          <v-btn
            size="small"
            :variant="mapType === 'terrain' ? 'flat' : 'outlined'"
            :color="mapType === 'terrain' ? 'primary' : undefined"
            @click="setMapType('terrain')"
            class="text-xs sm:text-sm"
          >
            Terrain
          </v-btn>
        </v-btn-group>
      </div>
    </v-card-title>

    <v-card-text>
    
      <!-- Map Container -->
      <div :style="{ height: `${height}px` }" class="map-container">
        <client-only>
          <l-map
            ref="mapRef"
            v-model:zoom="zoom"
            :center="safeCenter"
            :options="mapOptions"
            @ready="onMapReady"
            @moveend="onMoveEnd"
          >
            <!-- Map Tile Layers -->
            <l-tile-layer
              v-if="mapType === 'map'"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              layer-type="base"
              name="OpenStreetMap"
              attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
            />
            
            <l-tile-layer
              v-if="mapType === 'satellite'"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              layer-type="base"
              name="Satellite"
              attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
            />
            
            <l-tile-layer
              v-if="mapType === 'terrain'"
              url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
              layer-type="base"
              name="Terrain"
              attribution="Map data: &copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors, <a href='http://viewfinderpanoramas.org'>SRTM</a> | Map style: &copy; <a href='https://opentopomap.org'>OpenTopoMap</a> (<a href='https://creativecommons.org/licenses/by-sa/3.0/'>CC-BY-SA</a>)"
            />

            <!-- Markers -->
            <template v-if="properties && properties.length">
              <template v-for="property in properties" :key="property.id">
                <l-marker
                  v-if="isValidLatLng(getLatLng(property))"
                  :lat-lng="getLatLng(property)"
                  :options="markerOptions"
                  @click="emit('marker-click', property)"
                >
                  <l-icon
                    :icon-url="getPricePin(property.price)"
                    :icon-size="[44, 34]"
                    :icon-anchor="[25, 34]"
                  />
                </l-marker>
              </template>
            </template>
            <template v-else>
              <l-marker v-if="isValidLatLng(safeCenter)" :lat-lng="safeCenter" :options="markerOptions">
                <l-icon :icon-url="getPricePin(0)" :icon-size="[44, 34]" :icon-anchor="[25, 34]" />
                <l-popup v-if="showPopup">
                  <div class="property-popup">
                    <div class="text-subtitle-1 font-weight-medium">{{ title }}</div>
                    <div class="text-caption">{{ address }}</div>
                  </div>
                </l-popup>
              </l-marker>
            </template>

            <!-- Nearby Places -->
            <template v-if="showNearbyPlaces">
              <l-marker
                v-for="place in nearbyPlaces"
                :key="place.id"
                :lat-lng="[place.latitude, place.longitude]"
              >
                <l-icon
                  :icon-url="getPlaceIcon(place.type)"
                  :icon-size="[24, 24]"
                  :icon-anchor="[12, 24]"
                />
                <l-popup>
                  <div class="place-popup">
                    <div class="text-subtitle-2">{{ place.name }}</div>
                    <div class="text-caption">{{ place.distance }} km away</div>
                  </div>
                </l-popup>
              </l-marker>
            </template>

         
          </l-map>
        </client-only>
      </div>

     
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import type { Map } from 'leaflet'
import { onUnmounted } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: 'Location'
  },
  address: {
    type: String,
    default: ''
  },
  latitude: {
    type: Number,
    default: undefined
  },
  longitude: {
    type: Number,
    default: undefined
  },
  height: {
    type: Number,
    default: 560
  },
  showControls: {
    type: Boolean,
    default: true
  },
  showAddress: {
    type: Boolean,
    default: true
  },
  showPopup: {
    type: Boolean,
    default: true
  },
  showNearbyPlaces: {
    type: Boolean,
    default: true
  },
  showRadius: {
    type: Boolean,
    default: true
  },
  radius: {
    type: Number,
    default: 1000 // meters
  },
  image: {
    type: String,
    default: ''
  },
  properties: {
    type: Array as () => Array<any>,
    default: () => []
  }
})

const map = ref<Map | null>(null)
const mapRef = ref<any>(null)
const zoom = ref(12)
const mapType = ref<'map' | 'satellite' | 'terrain'>('map')
const defaultCenter: [number, number] = [56.7268, -111.3800] // Fort McMurray
const center = computed<[number, number]>(() => {
  if (typeof props.latitude === 'number' && typeof props.longitude === 'number') {
    return [props.latitude, props.longitude]
  }
  if (props.properties && props.properties.length) {
    const [lat, lng] = getLatLng(props.properties[0])
    return [lat, lng]
  }
  return defaultCenter
})

const safeCenter = computed<[number, number]>(() => {
  const [lat, lng] = center.value
  return isValidLatLng([lat, lng]) ? [lat, lng] : defaultCenter
})
const selectedPlaceType = ref('')

const mapOptions = {
  zoomControl: false,
  scrollWheelZoom: true
}

const markerOptions = {
  draggable: false,
  autoPan: true
}

const circleOptions = {
  color: '#1976D2',
  fillColor: '#1976D2',
  fillOpacity: 0.1
}

// Mock nearby places data
const nearbyPlaces = ref([
  {
    id: 1,
    name: 'Central Park',
    type: 'park',
    latitude: (props.latitude || 56.7268) + 0.002,
    longitude: (props.longitude || -111.3800) + 0.002,
    distance: 0.3,
    address: '123 Park Ave'
  },
  {
    id: 2,
    name: 'City Mall',
    type: 'shopping',
    latitude: (props.latitude || 56.7268) - 0.002,
    longitude: (props.longitude || -111.3800) - 0.002,
    distance: 0.5,
    address: '456 Mall St'
  }
  // Add more places...
])

const placeTypes = ['school', 'shopping', 'restaurant', 'park', 'transit', 'hospital']

const filteredPlaces = computed(() => {
  if (!selectedPlaceType.value) return nearbyPlaces.value
  return nearbyPlaces.value.filter(place => place.type === selectedPlaceType.value)
})

// Red price pin similar to portals; rendered as SVG with rounded label
function formatPriceLabel(value: number): string {
  if (!value || value === 0) return 'Call'
  if (value < 1000) return `${value}`
  const k = Math.round(value / 1000)
  return `${k}K`
}

function getPricePin(price: number): string {
  const label = formatPriceLabel(price)
  const svg = `
  <svg xmlns='http://www.w3.org/2000/svg' width='108' height='68' viewBox='0 0 108 68'>
    <defs>
      <filter id='s' x='0' y='0' width='108' height='68' filterUnits='userSpaceOnUse'>
        <feOffset dy='1'/>
        <feGaussianBlur stdDeviation='1.5' result='b'/>
        <feFlood flood-opacity='0.2'/>
        <feComposite operator='in' in2='b'/>
        <feComposite in='SourceGraphic'/>
      </filter>
    </defs>
    <g filter='url(#s)'>
      <rect x='6' y='3' rx='17' ry='17' width='96' height='46' fill='#b00020' stroke='#8a0019' stroke-width='2'/>
      <path d='M54 66 L44 49 H64 Z' fill='#b00020' stroke='#8a0019' stroke-width='2'/>
      <text x='54' y='33' text-anchor='middle' font-family='Arial, Helvetica, sans-serif' font-size='22' font-weight='700' fill='#fff'>${label}</text>
    </g>
  </svg>`
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

const getPlaceIcon = (type: string) => getPricePin(0)

const getPlaceTypeIcon = (type: string) => {
  const icons: Record<string, string> = {
    school: 'mdi-school',
    shopping: 'mdi-shopping',
    restaurant: 'mdi-food',
    park: 'mdi-tree',
    transit: 'mdi-bus',
    hospital: 'mdi-hospital'
  }
  return icons[type] || 'mdi-map-marker'
}

const formatPlaceType = (type: string) => {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

const togglePlaceType = (type: string) => {
  selectedPlaceType.value = selectedPlaceType.value === type ? '' : type
}

const onMapReady = (mapInstance: any) => {
  // vue-leaflet may pass the Leaflet Map directly or via component ref
  map.value = (mapInstance?.leafletObject || mapInstance) as Map
  // Ensure tiles render when container is inside flex layouts
  setTimeout(() => {
    try { map.value?.invalidateSize?.() } catch {}
  }, 0)
}

const adjustZoom = (delta: number) => {
  zoom.value = Math.max(1, Math.min(18, zoom.value + delta))
}

const setMapType = (type: 'map' | 'satellite' | 'terrain') => {
  mapType.value = type
}

const emit = defineEmits(['bounds-updated', 'marker-click'])

const onMoveEnd = () => {
  const leafletMap: any = map.value || mapRef.value?.leafletObject
  if (!leafletMap || typeof leafletMap.getBounds !== 'function') return
  const b = leafletMap.getBounds()
  emit('bounds-updated', {
    north: b.getNorth(),
    south: b.getSouth(),
    east: b.getEast(),
    west: b.getWest()
  })
}

function getLatLng(p: any): [number, number] {
  // Accept latitude/longitude, lat/lng, or latlng: [lat, lng] / {lat,lng}
  if (Array.isArray(p?.latlng) && p.latlng.length >= 2) {
    const [lat, lng] = p.latlng
    const nlat = Number(lat)
    const nlng = Number(lng)
    return [isFinite(nlat) ? nlat : defaultCenter[0], isFinite(nlng) ? nlng : defaultCenter[1]]
  }
  if (p?.latlng && typeof p.latlng === 'object') {
    const lat = Number(p.latlng.lat)
    const lng = Number(p.latlng.lng)
    return [isFinite(lat) ? lat : defaultCenter[0], isFinite(lng) ? lng : defaultCenter[1]]
  }
  const lat = Number(p?.latitude ?? p?.lat)
  const lng = Number(p?.longitude ?? p?.lng)
  return [isFinite(lat) ? lat : defaultCenter[0], isFinite(lng) ? lng : defaultCenter[1]]
}

function isValidLatLng(val: any): val is [number, number] {
  if (!Array.isArray(val) || val.length < 2) return false
  const [lat, lng] = val
  return typeof lat === 'number' && typeof lng === 'number' && isFinite(lat) && isFinite(lng)
}

// keep map sized correctly
const onResize = () => { try { map.value?.invalidateSize?.() } catch {} }
onMounted(() => { if (typeof window !== 'undefined') window.addEventListener('resize', onResize) })
onUnmounted(() => { if (typeof window !== 'undefined') window.removeEventListener('resize', onResize) })

// Load nearby places
const loadNearbyPlaces = async () => {
  try {
    // Replace with actual API call
    // const response = await fetch(`/api/places/nearby?lat=${props.latitude}&lng=${props.longitude}&radius=${props.radius}`)
    // const data = await response.json()
    // nearbyPlaces.value = data
  } catch (error) {
    console.error('Error loading nearby places:', error)
  }
}

onMounted(() => {
  if (props.showNearbyPlaces) {
    loadNearbyPlaces()
  }
})
</script>

<style scoped>
.map-container {
  position: relative;
  border-radius: 4px;
  overflow: hidden;
}

:deep(.leaflet-container) {
  height: 100%;
  width: 100%;
}

.property-popup {
  min-width: 200px;
}

.place-popup {
  min-width: 150px;
  padding: 8px;
}
</style>
