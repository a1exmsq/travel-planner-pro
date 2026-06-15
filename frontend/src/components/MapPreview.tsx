import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Popup, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import type { PoiResponseDTO, RouteResponseDTO } from '../types/route'

type PoiLayer = 'all' | 'landmarks' | 'hidden'

type MapStopLike = Partial<PoiResponseDTO> & {
  lat?: number | string
  lng?: number | string
  customName?: string
  customLatitude?: number | string
  customLongitude?: number | string
}

interface MapViewportState {
  east: number
  north: number
  south: number
  west: number
  zoom: number
}

interface MarkerStyle {
  color: string
  glyph: string
  shadow: string
}

const CATEGORY_STYLES: Record<string, MarkerStyle> = {
  'Secret Place': { color: '#8b5cf6', glyph: 'S', shadow: 'rgba(139,92,246,0.34)' },
  Cafe:          { color: '#f97316', glyph: 'C', shadow: 'rgba(249,115,22,0.34)' },
  Viewpoint:     { color: '#0ea5e9', glyph: 'V', shadow: 'rgba(14,165,233,0.34)' },
  'Street Art':  { color: '#ec4899', glyph: 'A', shadow: 'rgba(236,72,153,0.34)' },
  Landmark:      { color: '#eab308', glyph: 'L', shadow: 'rgba(234,179,8,0.34)' },
  Museum:        { color: '#14b8a6', glyph: 'M', shadow: 'rgba(20,184,166,0.34)' },
  Park:          { color: '#22c55e', glyph: 'P', shadow: 'rgba(34,197,94,0.34)' },
  Religious:     { color: '#a78bfa', glyph: 'R', shadow: 'rgba(167,139,250,0.34)' },
  default:       { color: '#3b82f6', glyph: '·', shadow: 'rgba(59,130,246,0.34)' },
}

// SVG icons per category (14×14 viewBox)
const CATEGORY_SVG: Record<string, string> = {
  Landmark: `<svg viewBox="0 0 14 14" width="13" height="13" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M1 13h12M7 1 2 5v8h3V9h4v4h3V5Z"/></svg>`,
  Museum: `<svg viewBox="0 0 14 14" width="13" height="13" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M1 13h12M7 1 1 5h12ZM3 6v7M5.5 6v7M8.5 6v7M11 6v7"/></svg>`,
  Park: `<svg viewBox="0 0 14 14" width="13" height="13" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M7 1C4.8 1 3 3 3 5c0 1.6 1 3 2.5 3.7V13h3V8.7C10 8 11 6.6 11 5c0-2-1.8-4-4-4z"/></svg>`,
  Cafe: `<svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" xmlns="http://www.w3.org/2000/svg"><path d="M2 5h8l-1 7H3L2 5z"/><path d="M10 6.5h1.5a1.5 1.5 0 0 1 0 3H10"/></svg>`,
  Viewpoint: `<svg viewBox="0 0 14 14" width="13" height="13" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M7 4C4 4 1 7 1 7s3 3 6 3 6-3 6-3-3-3-6-3zm0 5a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/><circle cx="7" cy="7" r="1.1"/></svg>`,
  'Street Art': `<svg viewBox="0 0 14 14" width="13" height="13" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M7 1 8.8 5.2H13L9.6 7.8l1.3 4L7 9.5l-3.9 2.3 1.3-4L1 5.2h4.2Z"/></svg>`,
  Religious: `<svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" xmlns="http://www.w3.org/2000/svg"><line x1="7" y1="1" x2="7" y2="13"/><line x1="3.5" y1="4.5" x2="10.5" y2="4.5"/></svg>`,
  'Secret Place': `<svg viewBox="0 0 14 14" width="13" height="13" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M7 1a4 4 0 0 0-4 4c0 3 4 8 4 8s4-5 4-8a4 4 0 0 0-4-4zm0 5.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg>`,
  default: `<svg viewBox="0 0 14 14" width="13" height="13" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="7" cy="7" r="3.5"/></svg>`,
}

// Module-level caches persist across re-renders, preventing redundant
// icon object creation and duplicate OSRM network requests
const poiIconCache = new Map<string, L.DivIcon>()
const stopIconCache = new Map<string, L.DivIcon>()
const routePathCache = new Map<string, [number, number][]>()

// ── Routing profiles ──────────────────────────────────────────────────────
type TransportMode = 'foot' | 'bike' | 'driving'

// Public OSRM servers — foot/bike use openstreetmap.de, driving uses project-osrm.org
// because openstreetmap.de does not expose a driving profile publicly
const OSRM_URLS: Record<TransportMode, string> = {
  foot:    'https://routing.openstreetmap.de/routed-foot/route/v1/foot',
  bike:    'https://routing.openstreetmap.de/routed-bike/route/v1/bike',
  driving: 'https://router.project-osrm.org/route/v1/driving',
}

const TRANSPORT_LABELS: Record<TransportMode, { icon: string; label: string }> = {
  foot:    { icon: '🚶', label: 'Walk' },
  bike:    { icon: '🚴', label: 'Bike' },
  driving: { icon: '🚗', label: 'Drive' },
}

function defaultTransportMode(routeType?: string): TransportMode {
  if (routeType === 'ROAD_TRIP' || routeType === 'MULTI_CITY') return 'driving'
  return 'foot' // CITY, REGION, CUSTOM and unknown → walking by default
}

function createPoiIcon(style: MarkerStyle, category: string, isHidden: boolean, highlighted: boolean) {
  const cacheKey = `${style.color}-${category}-${isHidden ? 'hidden' : 'global'}-${highlighted ? 'highlighted' : 'base'}`
  const cached = poiIconCache.get(cacheKey)
  if (cached) return cached

  const svgIcon = CATEGORY_SVG[category] ?? CATEGORY_SVG.default

  const icon = L.divIcon({
    html: `
      <div
        class="map-pin map-poi-pin ${isHidden ? 'is-hidden' : 'is-global'} ${highlighted ? 'is-highlighted' : ''}"
        style="--pin-bg:${style.color};--pin-shadow:${style.shadow};"
      >${svgIcon}</div>
    `,
    className: '',
    iconSize: highlighted ? [38, 46] : [32, 40],
    iconAnchor: highlighted ? [19, 42] : [16, 36],
    popupAnchor: [0, -32],
  })

  poiIconCache.set(cacheKey, icon)
  return icon
}

function createStopIcon(index: number, accent: string, isCustom: boolean, isActive: boolean) {
  const cacheKey = `${index}-${accent}-${isCustom ? 'custom' : 'library'}-${isActive ? 'active' : 'base'}`
  const cached = stopIconCache.get(cacheKey)
  if (cached) return cached

  const icon = L.divIcon({
    html: `
      <div
        class="map-pin map-stop-pin ${isCustom ? 'is-custom' : 'is-route'} ${isActive ? 'is-active' : ''}"
        style="--stop-bg:${accent};"
      >
        <span>${index}</span>
      </div>
    `,
    className: '',
    iconSize: isActive ? [40, 40] : [36, 36],
    iconAnchor: isActive ? [20, 20] : [18, 18],
    popupAnchor: [0, -20],
  })

  stopIconCache.set(cacheKey, icon)
  return icon
}

const pendingIcon = L.divIcon({
  html: `
    <div class="map-pin map-pending-pin">
      <span>+</span>
    </div>
  `,
  className: '',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

function parseCoordinate(value: number | string | undefined): number | null {
  if (typeof value === 'number') {
    return Number.isNaN(value) ? null : value
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    return Number.isNaN(parsed) ? null : parsed
  }

  return null
}

function getStopCoordinates(stop: MapStopLike): [number, number] | null {
  const lat = parseCoordinate(stop.latitude ?? stop.lat ?? stop.customLatitude)
  const lng = parseCoordinate(stop.longitude ?? stop.lng ?? stop.customLongitude)

  if (lat === null || lng === null) {
    return null
  }

  return [lat, lng]
}

function getStopLabel(stop: MapStopLike): string {
  return stop.name || stop.customName || 'Stop'
}

function resolveMarkerStyle(poi: PoiResponseDTO): MarkerStyle {
  if (poi.isGlobal === false) {
    return CATEGORY_STYLES['Secret Place']
  }

  return CATEGORY_STYLES[poi.category || 'default'] ?? CATEGORY_STYLES.default
}

function getPoiCap(zoom: number, constructorMode: boolean) {
  const baseCap =
    zoom <= 5 ? 10 :
      zoom <= 7 ? 18 :
        zoom <= 9 ? 28 :
          zoom <= 11 ? 42 : 60

  return constructorMode ? Math.round(baseCap * 1.25) : baseCap
}

function useDarkMode() {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    const root = document.documentElement
    const observer = new MutationObserver(() => {
      setIsDark(root.classList.contains('dark'))
    })

    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return isDark
}

function MapViewportController({
  coords,
  hasActiveRoute,
  focusCoords,
}: {
  coords: [number, number][]
  hasActiveRoute: boolean
  focusCoords: [number, number] | null
}) {
  const map = useMap()

  useEffect(() => {
    if (!hasActiveRoute && focusCoords) {
      map.flyTo(focusCoords, 13, { duration: 0.75, easeLinearity: 0.22 })
      return
    }

    if (coords.length === 0) return

    if (coords.length === 1) {
      map.flyTo(coords[0], hasActiveRoute ? 13 : 6, { duration: 0.85, easeLinearity: 0.22 })
      return
    }

    map.flyToBounds(coords, {
      padding: [72, 72],
      duration: 0.85,
      maxZoom: hasActiveRoute ? 14 : 8,
    })
  }, [coords, focusCoords, hasActiveRoute, map])

  return null
}

function MapViewStateReporter({
  onChange,
}: {
  onChange: (state: MapViewportState) => void
}) {
  const map = useMapEvents({
    moveend: reportViewport,
    zoomend: reportViewport,
    resize: reportViewport,
  })

  function reportViewport() {
    const bounds = map.getBounds()
    onChange({
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
      zoom: map.getZoom(),
    })
  }

  useEffect(() => {
    const bounds = map.getBounds()
    onChange({
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
      zoom: map.getZoom(),
    })
  }, [map, onChange])

  return null
}

function MapClickHandler({
  onMapClick,
}: {
  onMapClick?: (lat: number, lng: number, screenX: number, screenY: number) => void
}) {
  useMapEvents({
    click: (event) => {
      if (event.latlng) {
        onMapClick?.(event.latlng.lat, event.latlng.lng, event.originalEvent.clientX, event.originalEvent.clientY)
      }
    },
  })

  return null
}

function renderPopupImage(imageUrl?: string, name?: string) {
  if (!imageUrl) return null

  return (
    <div className="map-popup-media">
      <img src={imageUrl} alt={name || 'Preview'} />
    </div>
  )
}

function PoiPopup({
  poi,
  isConstructorMode,
  onAddPoiToRoute,
}: {
  poi: PoiResponseDTO
  isConstructorMode?: boolean
  onAddPoiToRoute?: (poiId: number) => void
}) {
  return (
    <div className="map-popup-card">
      {renderPopupImage(poi.mainImageUrl || poi.imageUrl, poi.name)}
      <div className="map-popup-body">
        <div className="map-popup-kicker">{poi.isGlobal === false ? 'Hidden place' : poi.category || 'Place'}</div>
        <div className="map-popup-title">{poi.name}</div>
        {(poi.cityName || poi.address) && (
          <div className="map-popup-meta">{poi.cityName || poi.address}</div>
        )}
        {poi.description && <div className="map-popup-copy">{poi.description}</div>}

        <div className="map-popup-badges">
          {typeof poi.visitMinutes === 'number' && poi.visitMinutes > 0 ? (
            <span className="map-popup-badge">Typical stop {poi.visitMinutes} min</span>
          ) : null}
          {poi.featured ? <span className="map-popup-badge">Curated pick</span> : null}
          {typeof poi.usageCount === 'number' && poi.usageCount > 0 ? (
            <span className="map-popup-badge">Saved {poi.usageCount} times</span>
          ) : null}
        </div>

        {isConstructorMode && typeof poi.id === 'number' ? (
          <div className="map-popup-actions">
            <button
              type="button"
              onClick={() => onAddPoiToRoute?.(poi.id!)}
              className="map-popup-action"
            >
              {poi.isGlobal === false ? 'Add hidden place to route' : 'Add landmark to route'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function StopPopup({
  stop,
  isCustom,
}: {
  stop: MapStopLike
  isCustom: boolean
}) {
  return (
    <div className="map-popup-card">
      {renderPopupImage(stop.mainImageUrl, getStopLabel(stop))}
      <div className="map-popup-body">
        <div className="map-popup-kicker">{isCustom ? 'Hidden route stop' : stop.category || 'Route stop'}</div>
        <div className="map-popup-title">{getStopLabel(stop)}</div>
        {(stop.cityName || stop.address) && (
          <div className="map-popup-meta">{stop.cityName || stop.address}</div>
        )}
        {stop.description && <div className="map-popup-copy">{stop.description}</div>}

        <div className="map-popup-badges">
          {typeof stop.travelTimeMinutes === 'number' && stop.travelTimeMinutes > 0 ? (
            <span className="map-popup-badge">Planned stay {stop.travelTimeMinutes} min</span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function isPoiInViewport(poi: PoiResponseDTO, viewport: MapViewportState | null) {
  if (!viewport) return true

  const lat = parseCoordinate(poi.latitude)
  const lng = parseCoordinate(poi.longitude)
  if (lat === null || lng === null) return false

  const latPad = Math.max((viewport.north - viewport.south) * 0.18, 0.45)
  const lngPad = Math.max((viewport.east - viewport.west) * 0.18, 0.45)

  return (
    lat <= viewport.north + latPad &&
    lat >= viewport.south - latPad &&
    lng <= viewport.east + lngPad &&
    lng >= viewport.west - lngPad
  )
}

interface MapProps {
  stops: MapStopLike[]
  activeRoute: RouteResponseDTO | null
  allPois: PoiResponseDTO[]
  poiLayer?: PoiLayer
  focusCoords?: [number, number] | null
  highlightedPoiId?: number | null
  onMapClick?: (lat: number, lng: number, screenX: number, screenY: number) => void
  onAddPoiToRoute?: (poiId: number) => void
  pendingCoords?: { lat: number; lng: number } | null
  isConstructorMode?: boolean
}

export default function MapPreview({
  stops,
  activeRoute,
  allPois,
  poiLayer = 'all',
  focusCoords = null,
  highlightedPoiId = null,
  onMapClick,
  onAddPoiToRoute,
  pendingCoords,
  isConstructorMode,
}: MapProps) {
  const isDark = useDarkMode()
  const [roadPaths, setRoadPaths] = useState<[number, number][][]>([])
  const [viewport, setViewport] = useState<MapViewportState | null>(null)
  const [transportMode, setTransportMode] = useState<TransportMode>(
    () => defaultTransportMode(activeRoute?.routeType)
  )

  // Sync transport mode when a different route is opened
  useEffect(() => {
    setTransportMode(defaultTransportMode(activeRoute?.routeType))
  }, [activeRoute?.id, activeRoute?.routeType])

  const currentStops = useMemo<MapStopLike[]>(() => stops || activeRoute?.stops || [], [stops, activeRoute])
  const deferredPois = useDeferredValue(allPois)

  const markerPositions = useMemo(() => {
    return currentStops
      .map((item) => getStopCoordinates(item))
      .filter((item): item is [number, number] => item !== null)
  }, [currentStops])
  const initialCenter = useMemo<[number, number]>(() => {
    if (focusCoords) return focusCoords
    if (markerPositions[0]) return markerPositions[0]
    return [48.5, 15]
  }, [focusCoords, markerPositions])
  const initialZoom = focusCoords ? 11 : markerPositions.length === 1 ? 11 : markerPositions.length > 1 ? 8 : 4

  const rankedPois = useMemo(() => {
    if (activeRoute) return []

    const globalPois = deferredPois.filter((poi) => poi?.isGlobal !== false)
    const hiddenPois = deferredPois.filter((poi) => poi?.isGlobal === false)

    const sortByRelevance = (left: PoiResponseDTO, right: PoiResponseDTO) => {
      const leftScore =
        (left.featured ? 180 : 0) +
        (left.editorialScore || 0) * 4 +
        (left.qualityScore || 0) * 2 +
        (left.usageCount || 0)
      const rightScore =
        (right.featured ? 180 : 0) +
        (right.editorialScore || 0) * 4 +
        (right.qualityScore || 0) * 2 +
        (right.usageCount || 0)
      return rightScore - leftScore
    }

    const rankedGlobal = [...globalPois].sort(sortByRelevance)
    const rankedHidden = [...hiddenPois].sort(sortByRelevance)

    if (poiLayer === 'landmarks') return rankedGlobal
    if (poiLayer === 'hidden') return rankedHidden

    return [...rankedHidden, ...rankedGlobal]
  }, [activeRoute, deferredPois, poiLayer])

  const renderedPois = useMemo(() => {
    const inViewport = rankedPois.filter((poi) => isPoiInViewport(poi, viewport))
    const cap = getPoiCap(viewport?.zoom ?? 8, Boolean(isConstructorMode))
    const limited = inViewport.slice(0, cap)

    if (!highlightedPoiId) {
      return limited
    }

    if (limited.some((poi) => poi.id === highlightedPoiId)) {
      return limited
    }

    const highlightedPoi = rankedPois.find((poi) => poi.id === highlightedPoiId)
    return highlightedPoi ? [highlightedPoi, ...limited] : limited
  }, [highlightedPoiId, isConstructorMode, rankedPois, viewport])

  useEffect(() => {
    if (markerPositions.length < 2) {
      setRoadPaths(markerPositions.length === 1 ? [markerPositions] : [])
      return
    }

    if (markerPositions.length > 12) {
      setRoadPaths([markerPositions])
      return
    }

    const posKey  = markerPositions.map(([lat, lng]) => `${lat.toFixed(5)},${lng.toFixed(5)}`).join('|')
    const cacheKey = `${transportMode}|${posKey}`
    const cached  = routePathCache.get(cacheKey)
    if (cached) {
      setRoadPaths([cached])
      return
    }

    const abortController = new AbortController()

    const fetchRoads = async () => {
      try {
        // OSRM expects coordinates as lng,lat (GeoJSON order), not the lat,lng used by Leaflet
        const coordsString = markerPositions.map(([lat, lng]) => `${lng},${lat}`).join(';')
        const url = `${OSRM_URLS[transportMode]}/${coordsString}?overview=full&geometries=geojson`
        const response = await fetch(url, { signal: abortController.signal })
        if (!response.ok) throw new Error('OSRM error')

        const data = await response.json()
        if (data.code === 'Ok' && data.routes?.[0]) {
          const fullPath = data.routes[0].geometry.coordinates.map(
            (item: number[]) => [item[1], item[0]] as [number, number]
          )
          routePathCache.set(cacheKey, fullPath)
          setRoadPaths([fullPath])
          return
        }

        setRoadPaths([markerPositions])
      } catch (error) {
        if (abortController.signal.aborted) return
        console.error('Failed to fetch road path:', error)
        setRoadPaths([markerPositions])
      }
    }

    void fetchRoads()

    return () => abortController.abort()
  }, [markerPositions, transportMode])

  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

  const routeLineOutline = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.18)'
  const routeLineMain = isDark ? '#67e8f9' : '#0284c7'

  return (
    <div className="relative z-0 h-full w-full">
      {/* Transport mode toggle — shown when there are stops to route between */}
      {markerPositions.length >= 2 && (
        <div className="absolute right-3 top-3 z-[1000] flex items-center gap-0.5 rounded-full border border-white/20 bg-black/52 p-1 backdrop-blur-md">
          {(Object.keys(TRANSPORT_LABELS) as TransportMode[]).map((mode) => (
            <button
              key={mode}
              title={TRANSPORT_LABELS[mode].label}
              onClick={() => setTransportMode(mode)}
              className={`flex h-7 w-7 items-center justify-center rounded-full text-sm transition-all ${
                transportMode === mode
                  ? 'bg-white/90 text-slate-900 shadow-sm'
                  : 'text-white/70 hover:bg-white/14 hover:text-white'
              }`}
            >
              {TRANSPORT_LABELS[mode].icon}
            </button>
          ))}
        </div>
      )}

      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        className="travel-map h-full w-full"
        scrollWheelZoom
        preferCanvas
        worldCopyJump
        zoomAnimation={false}
        fadeAnimation={false}
        markerZoomAnimation={false}
        zoomSnap={0.5}
        zoomDelta={0.5}
      >
        <TileLayer
          key={isDark ? 'dark-map' : 'light-map'}
          url={tileUrl}
          attribution="&copy; OpenStreetMap &copy; CARTO"
          subdomains="abcd"
          maxZoom={20}
          updateWhenIdle
          keepBuffer={3}
        />

        <MapViewportController coords={markerPositions} hasActiveRoute={Boolean(activeRoute)} focusCoords={focusCoords} />
        <MapViewStateReporter onChange={setViewport} />
        <MapClickHandler onMapClick={onMapClick} />

        {roadPaths.map((path, index) => (
          <Polyline
            key={`road-outline-${index}`}
            positions={path}
            pathOptions={{ color: routeLineOutline, weight: 10, opacity: 1, lineCap: 'round', lineJoin: 'round' }}
          />
        ))}
        {roadPaths.map((path, index) => (
          <Polyline
            key={`road-main-${index}`}
            positions={path}
            pathOptions={{ color: routeLineMain, weight: 5, opacity: 0.94, lineCap: 'round', lineJoin: 'round' }}
          />
        ))}

        {currentStops.map((stop, index) => {
          const coords = getStopCoordinates(stop)
          if (!coords) return null

          const isCustom = !stop?.id || stop?.isGlobal === false
          const accent = isCustom ? '#8b5cf6' : routeLineMain

          return (
            <Marker
              key={`stop-${index}`}
              position={coords}
              icon={createStopIcon(index + 1, accent, isCustom, Boolean(activeRoute))}
            >
              <Popup>
                <StopPopup stop={stop} isCustom={isCustom} />
              </Popup>
            </Marker>
          )
        })}

        {(isConstructorMode || !activeRoute) &&
          renderedPois.map((poi) => {
            const lat = parseCoordinate(poi.latitude)
            const lng = parseCoordinate(poi.longitude)
            if (lat === null || lng === null || typeof poi.id !== 'number') return null

            const style = resolveMarkerStyle(poi)
            const isHighlighted = highlightedPoiId === poi.id

            return (
              <Marker
                key={`poi-${poi.id}`}
                position={[lat, lng]}
                icon={createPoiIcon(style, poi.category ?? 'default', poi.isGlobal === false, isHighlighted)}
              >
                <Popup>
                  <PoiPopup
                    poi={poi}
                    isConstructorMode={isConstructorMode}
                    onAddPoiToRoute={onAddPoiToRoute}
                  />
                </Popup>
              </Marker>
            )
          })}

        {pendingCoords && !Number.isNaN(pendingCoords.lat) && !Number.isNaN(pendingCoords.lng) && (
          <Marker position={[pendingCoords.lat, pendingCoords.lng]} icon={pendingIcon} />
        )}
      </MapContainer>
    </div>
  )
}
