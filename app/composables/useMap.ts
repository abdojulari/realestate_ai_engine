import { ref, onMounted, onUnmounted } from 'vue'
import type { Map, Marker, LatLngBounds, LatLng } from 'leaflet'

export function useMap() {
  const map = ref<Map | null>(null)
  const markers = ref<Marker[]>([])
  const bounds = ref<LatLngBounds | null>(null)
  const center = ref<LatLng>([53.5461, -113.4937]) // Edmonton coordinates
  const zoom = ref(12)

  const initMap = (mapInstance: Map) => {
    map.value = mapInstance
  }

  const addMarker = (marker: Marker) => {
    markers.value.push(marker)
    if (map.value) {
      marker.addTo(map.value)
    }
  }

  const removeMarker = (marker: Marker) => {
    const index = markers.value.indexOf(marker)
    if (index > -1) {
      markers.value.splice(index, 1)
      if (map.value) {
        marker.removeFrom(map.value)
      }
    }
  }

  const clearMarkers = () => {
    markers.value.forEach(marker => {
      if (map.value) {
        marker.removeFrom(map.value)
      }
    })
    markers.value = []
  }

  const fitBounds = (newBounds: LatLngBounds) => {
    if (map.value) {
      map.value.fitBounds(newBounds)
      bounds.value = newBounds
    }
  }

  const fitMarkers = () => {
    if (map.value && markers.value.length > 0) {
      const group = new L.FeatureGroup(markers.value)
      map.value.fitBounds(group.getBounds())
    }
  }

  const setCenter = (newCenter: LatLng) => {
    if (map.value) {
      map.value.setView(newCenter)
      center.value = newCenter
    }
  }

  const setZoom = (newZoom: number) => {
    if (map.value) {
      map.value.setZoom(newZoom)
      zoom.value = newZoom
    }
  }

  const createPropertyMarker = (property: any) => {
    const icon = L.divIcon({
      className: 'map-marker',
      html: `<div class="marker-price">$${property.price.toLocaleString()}</div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 40]
    })

    const marker = L.marker([property.latitude, property.longitude], { icon })
    
    const popupContent = `
      <div class="map-popup">
        <img src="${property.images[0]}" alt="${property.title}" style="width: 100%; height: 120px; object-fit: cover;">
        <div style="padding: 8px;">
          <div style="font-weight: bold;">$${property.price.toLocaleString()}</div>
          <div>${property.title}</div>
          <div style="color: #666;">${property.beds} beds • ${property.baths} baths • ${property.sqft} sqft</div>
        </div>
      </div>
    `

    marker.bindPopup(popupContent)
    return marker
  }

  onMounted(() => {
    // Initialize map if needed
  })

  onUnmounted(() => {
    clearMarkers()
    if (map.value) {
      map.value.remove()
      map.value = null
    }
  })

  return {
    map,
    markers,
    bounds,
    center,
    zoom,
    initMap,
    addMarker,
    removeMarker,
    clearMarkers,
    fitBounds,
    fitMarkers,
    setCenter,
    setZoom,
    createPropertyMarker
  }
}
