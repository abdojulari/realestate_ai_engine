import { ref, onMounted, onUnmounted } from 'vue'
import * as L from 'leaflet'
import type { Map, Marker, LatLngBounds, LatLng } from 'leaflet'

export function useMap() {
  const map = ref<Map | null>(null)
  const markers = ref<Marker[]>([])
  const bounds = ref<LatLngBounds | null>(null)
  const center = ref<LatLng>([53.5461, -113.4937] as L.LatLngExpression as LatLng) // Edmonton coordinates
  const zoom = ref(12)

  const initMap = (mapInstance: Map) => {
    map.value = mapInstance
  }

  const addMarker = (marker: Marker) => {
    markers.value.push(marker)
    if (map.value) {
      marker.addTo(map.value as any)
    }
  }

  const removeMarker = (marker: Marker) => {
    const index = markers.value.indexOf(marker)
    if (index > -1) {
      markers.value.splice(index, 1)
      if (map.value) {
        marker.removeFrom(map.value as any)
      }
    }
  }

  const clearMarkers = () => {
    markers.value.forEach(marker => {
      if (map.value) {
        marker.removeFrom(map.value as any)
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
      const group = new L.FeatureGroup(markers.value as any)
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
    const price = Number(property.price) || 0
    const icon = L.divIcon({
      className: 'map-marker',
      html: `<div class="marker-price">$${price.toLocaleString()}</div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 40]
    })

    const marker = L.marker([property.latitude, property.longitude], { icon })

    // Defensive image source: don't render `<img src="undefined">` when a
    // listing has no photos. Falls back to a 1x1 transparent GIF.
    const firstImage = Array.isArray(property.images) && property.images.length > 0
      ? property.images[0]
      : ''
    const safeAlt = String(property.title || property.address || 'Property')
      .replace(/[<>"]/g, '')
    const titleText = String(property.title || property.address || '').replace(/[<>]/g, '')
    const cityText = String(property.city || '').replace(/[<>]/g, '')
    const mlsText = property.mlsNumber ? String(property.mlsNumber).replace(/[<>]/g, '') : ''
    const beds = property.beds ?? ''
    const baths = property.baths ?? ''
    const sqft = property.sqft ? `${Number(property.sqft).toLocaleString()} sqft` : ''
    const dimensions = [
      beds !== '' ? `${beds} beds` : '',
      baths !== '' ? `${baths} baths` : '',
      sqft,
    ].filter(Boolean).join(' • ')
    const detailUrl = property.id ? `/property/${property.id}` : ''

    const imgHtml = firstImage
      ? `<img src="${firstImage}" alt="${safeAlt}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 6px 6px 0 0;" onerror="this.style.display='none'">`
      : ''

    const popupContent = `
      <div class="map-popup" style="min-width: 220px;">
        ${imgHtml}
        <div style="padding: 10px;">
          <div style="font-weight: 700; font-size: 1.05rem; color: #0f172a;">$${price.toLocaleString()}</div>
          <div style="color: #1e293b; font-size: 0.9rem; margin-top: 2px;">${titleText}</div>
          ${cityText ? `<div style="color: #64748b; font-size: 0.78rem;">${cityText}</div>` : ''}
          ${dimensions ? `<div style="color: #475569; font-size: 0.82rem; margin-top: 6px;">${dimensions}</div>` : ''}
          ${mlsText ? `<div style="color: #94a3b8; font-size: 0.72rem; margin-top: 4px; font-family: monospace;">MLS: ${mlsText}</div>` : ''}
          ${detailUrl ? `<a href="${detailUrl}" style="display:inline-block; margin-top:8px; color:#3b82f6; font-size:0.82rem; font-weight:600; text-decoration:none;">View details →</a>` : ''}
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
