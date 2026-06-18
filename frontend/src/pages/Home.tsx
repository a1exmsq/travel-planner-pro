import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api/axios'
import type { User } from '../components/AuthModal'
import CreatePOIForm from '../components/CreatePOIForm'
import CreateRouteForm from '../components/CreateRouteForm'
import MapPreview from '../components/MapPreview'
import MapStopPopup from '../components/MapStopPopup'
import RouteCard from '../components/RouteCard'
import type { CityDTO } from '../types/location'
import type { PoiCatalogResponseDTO } from '../types/poi'
import type { PoiResponseDTO, RouteResponseDTO } from '../types/route'
import { asArray } from '../utils/apiResponse'

interface HomeProps {
  user: User | null
  setIsAuthOpen: (open: boolean) => void
}

type FeedTab = 'trending' | 'all'
type PoiLayer = 'all' | 'landmarks' | 'hidden'

interface PendingStop {
  lat: number
  lng: number
  screenX: number
  screenY: number
}

interface PendingCoords {
  lat: number
  lng: number
}

type MapPoi = PoiResponseDTO

interface SelectedStop {
  poiId: number | null
  name: string
  latitude: number
  longitude: number
  category?: string
  address?: string
  description?: string
  mainImageUrl?: string
  travelTimeMinutes: number
  orderIndex?: number
}

const GLOBAL_DISCOVERY_LIMIT = 72
const PRIVATE_DISCOVERY_LIMIT = 42

function hasCoords(city: CityDTO) {
  return typeof city.latitude === 'number' && typeof city.longitude === 'number'
}

function getCityDiscoveryWeight(city: CityDTO) {
  return (city.poiCount || 0) * 3 + (city.routesCount || 0)
}

function sortCitiesByDiscoveryWeight(cities: CityDTO[]) {
  return [...cities].sort((left, right) => {
    const rightWeight = getCityDiscoveryWeight(right)
    const leftWeight = getCityDiscoveryWeight(left)
    if (rightWeight !== leftWeight) return rightWeight - leftWeight
    return left.name.localeCompare(right.name)
  })
}

function truncateCopy(value: string | undefined, maxLength = 132) {
  if (!value) return null
  const normalized = value.trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength).trimEnd()}...`
}

function getDefaultCity(cities: CityDTO[]) {
  const candidates = cities.filter(hasCoords)
  if (!candidates.length) return cities[0] ?? null

  const top = sortCitiesByDiscoveryWeight(candidates).slice(0, 5)
  return top[Math.floor(Math.random() * top.length)]
}

function getNextCity(cities: CityDTO[], currentId: number | null) {
  const candidates = sortCitiesByDiscoveryWeight(cities.filter(hasCoords))

  if (!candidates.length) return cities[0] ?? null
  if (candidates.length === 1) return candidates[0]

  const index = candidates.findIndex((city) => city.id === currentId)
  const safeIndex = index >= 0 ? index : 0
  return candidates[(safeIndex + 1) % candidates.length]
}

export default function Home({ user, setIsAuthOpen }: HomeProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [routes, setRoutes] = useState<RouteResponseDTO[]>([])
  const [globalCatalog, setGlobalCatalog] = useState<PoiCatalogResponseDTO | null>(null)
  const [privatePois, setPrivatePois] = useState<MapPoi[]>([])
  const [cities, setCities] = useState<CityDTO[]>([])
  const [selectedRoute, setSelectedRoute] = useState<RouteResponseDTO | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isPOIFormOpen, setIsPOIFormOpen] = useState(false)
  const [pendingCoords, setPendingCoords] = useState<PendingCoords | null>(null)
  const [poiCoords, setPoiCoords] = useState<PendingCoords | null>(null)
  const [selectedStops, setSelectedStops] = useState<SelectedStop[]>([])
  const [feedTab, setFeedTab] = useState<FeedTab>('trending')
  const [poiLayer, setPoiLayer] = useState<PoiLayer>('all')
  const [isMapPanelOpen, setIsMapPanelOpen] = useState(true)
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null)
  const [mapQuery, setMapQuery] = useState('')
  const [debouncedMapQuery, setDebouncedMapQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [pendingStop, setPendingStop] = useState<PendingStop | null>(null)
  const [focusedPoiId, setFocusedPoiId] = useState<number | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [routesRefreshKey, setRoutesRefreshKey] = useState(0)
  const [discoveryRefreshKey, setDiscoveryRefreshKey] = useState(0)
  const [isRoutesLoading, setIsRoutesLoading] = useState(true)
  const [isCitiesLoading, setIsCitiesLoading] = useState(true)
  const [isDiscoveryLoading, setIsDiscoveryLoading] = useState(false)
  const [autoShiftedFromEmptyCity, setAutoShiftedFromEmptyCity] = useState(false)
  const requestedCityId = Number(searchParams.get('city') || '') || null
  const mountedCityIdRef = useRef(requestedCityId)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedMapQuery(mapQuery.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [mapQuery])

  useEffect(() => {
    let cancelled = false
    const loadRoutes = async () => {
      setIsRoutesLoading(true)
      try {
        const response = await api.get(feedTab === 'trending' ? '/routes/trending' : '/routes')
        if (!cancelled) setRoutes(asArray<RouteResponseDTO>(response.data))
      } catch (error) {
        console.error('Failed to load route feed:', error)
        if (!cancelled) setRoutes([])
      } finally {
        if (!cancelled) setIsRoutesLoading(false)
      }
    }
    void loadRoutes()
    return () => {
      cancelled = true
    }
  }, [feedTab, routesRefreshKey])

  useEffect(() => {
    let cancelled = false
    const initialCityId = mountedCityIdRef.current
    const loadCities = async () => {
      setIsCitiesLoading(true)
      try {
        const [topResult, specificResult] = await Promise.allSettled([
          api.get<CityDTO[]>('/cities/top'),
          initialCityId ? api.get<CityDTO>(`/cities/${initialCityId}`) : Promise.resolve(null),
        ])
        if (cancelled) return
        const topCities: CityDTO[] = topResult.status === 'fulfilled' ? (topResult.value.data ?? []) : []
        const specificCity: CityDTO | null =
          specificResult.status === 'fulfilled' && specificResult.value?.data
            ? specificResult.value.data
            : null
        const merged =
          specificCity && !topCities.some((c) => c.id === specificCity.id)
            ? [...topCities, specificCity]
            : topCities
        setCities(merged)
      } catch (error) {
        console.error('Failed to load cities:', error)
        if (!cancelled) setCities([])
      } finally {
        if (!cancelled) setIsCitiesLoading(false)
      }
    }
    void loadCities()
    return () => {
      cancelled = true
    }
  }, [])

  const defaultCity = useMemo(() => getDefaultCity(cities), [cities])

  const cityInitialized = useRef(false)

  useEffect(() => {
    if (!cities.length) return
    if (cityInitialized.current) return

    if (requestedCityId !== null && cities.some((city) => city.id === requestedCityId)) {
      setSelectedCityId(requestedCityId)
      cityInitialized.current = true
      return
    }
    if (defaultCity) {
      setSelectedCityId(defaultCity.id)
      cityInitialized.current = true
    }
  }, [cities, defaultCity, requestedCityId])

  useEffect(() => {
    if (!selectedCityId) return
    if (requestedCityId === selectedCityId) return
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('city', String(selectedCityId))
      return next
    }, { replace: true })
  }, [requestedCityId, selectedCityId, setSearchParams])

  useEffect(() => {
    if (!selectedCityId) {
      setGlobalCatalog(null)
      setPrivatePois([])
      return
    }

    let cancelled = false

    const loadDiscovery = async () => {
      setIsDiscoveryLoading(true)
      try {
        const category = selectedCategory !== 'all' && selectedCategory !== 'Hidden place' ? selectedCategory : undefined
        const shouldLoadGlobal = poiLayer !== 'hidden' && selectedCategory !== 'Hidden place'
        const shouldLoadPrivate = Boolean(user) && poiLayer !== 'landmarks'
        const [globalResult, privateResult] = await Promise.allSettled([
          shouldLoadGlobal
            ? api.get('/pois/global/catalog', {
                params: { cityId: selectedCityId, category, q: debouncedMapQuery || undefined, limit: GLOBAL_DISCOVERY_LIMIT },
              })
            : Promise.resolve({
                data: {
                  items: [],
                  categories: [],
                  total: 0,
                  featuredCount: 0,
                  cityId: selectedCityId,
                  countryId: null,
                } satisfies PoiCatalogResponseDTO,
              }),
          shouldLoadPrivate
            ? api.get(`/pois/user/${user!.id}/private`, {
                params: { cityId: selectedCityId, category, q: debouncedMapQuery || undefined, limit: PRIVATE_DISCOVERY_LIMIT },
              })
            : Promise.resolve({ data: [] }),
        ])

        const globalResponse =
          globalResult.status === 'fulfilled'
            ? globalResult.value
            : {
                data: {
                  items: [],
                  categories: [],
                  total: 0,
                  featuredCount: 0,
                  cityId: selectedCityId,
                  countryId: null,
                } satisfies PoiCatalogResponseDTO,
              }

        const privateResponse =
          privateResult.status === 'fulfilled'
            ? privateResult.value
            : { data: [] }

        if (globalResult.status === 'rejected') {
          throw globalResult.reason
        }

        if (privateResult.status === 'rejected') {
          console.warn('Failed to load private hidden places for discovery:', privateResult.reason)
        }

        if (!cancelled) {
          setGlobalCatalog(globalResponse.data)
          setPrivatePois(privateResponse.data || [])
        }
      } catch (error) {
        console.error('Failed to load city discovery:', error)
        if (!cancelled) {
          setGlobalCatalog(null)
          setPrivatePois([])
        }
      } finally {
        if (!cancelled) setIsDiscoveryLoading(false)
      }
    }

    void loadDiscovery()
    return () => {
      cancelled = true
    }
  }, [user, selectedCityId, selectedCategory, debouncedMapQuery, poiLayer, discoveryRefreshKey])

  useEffect(() => {
    if (!feedbackMessage) return
    const timer = window.setTimeout(() => setFeedbackMessage(null), 2200)
    return () => window.clearTimeout(timer)
  }, [feedbackMessage])

  const selectedCity = cities.find((city) => city.id === selectedCityId) || null
  const rankedCities = useMemo(() => sortCitiesByDiscoveryWeight(cities.filter(hasCoords)), [cities])
  const filteredPrivatePois = useMemo(() => {
    return privatePois.filter((poi) => {
      const query = debouncedMapQuery.toLowerCase()
      const haystack = `${poi.name || ''} ${poi.description || ''} ${poi.cityName || ''} ${poi.address || ''}`.toLowerCase()
      const matchesCategory = selectedCategory === 'all' || selectedCategory === 'Hidden place' || poi.category === selectedCategory
      const matchesQuery = !query || haystack.includes(query)
      const matchesCity = !selectedCityId || poi.cityId === selectedCityId
      return matchesCategory && matchesQuery && matchesCity
    })
  }, [privatePois, selectedCategory, debouncedMapQuery, selectedCityId])
  const allPois = useMemo(() => [...filteredPrivatePois, ...(globalCatalog?.items || [])], [filteredPrivatePois, globalCatalog])
  const layerMatchedPois = useMemo(() => {
    if (poiLayer === 'landmarks') return allPois.filter((poi) => poi.isGlobal !== false)
    if (poiLayer === 'hidden') return allPois.filter((poi) => poi.isGlobal === false)
    return allPois
  }, [allPois, poiLayer])
  const focusedPoi = allPois.find((poi) => poi.id === focusedPoiId) || null
  const focusCoords =
    focusedPoi && typeof focusedPoi.latitude === 'number' && typeof focusedPoi.longitude === 'number'
      ? ([focusedPoi.latitude, focusedPoi.longitude] as [number, number])
      : selectedCity && typeof selectedCity.latitude === 'number' && typeof selectedCity.longitude === 'number'
        ? ([selectedCity.latitude, selectedCity.longitude] as [number, number])
        : null
  const totalComposerMinutes = useMemo(() => selectedStops.reduce((sum, stop) => sum + (stop.travelTimeMinutes || 0), 0), [selectedStops])
  const hiddenStopsCount = useMemo(() => selectedStops.filter((stop) => !stop.poiId).length, [selectedStops])
  const featuredPlacesCount = (globalCatalog?.items || []).filter((poi) => poi.featured).length
  const privatePoisCount = filteredPrivatePois.length
  const globalPoisCount = (globalCatalog?.items || []).length
  const totalDiscoveryPlaces = globalPoisCount + privatePoisCount
  const hiddenShare = totalDiscoveryPlaces > 0 ? Math.round((privatePoisCount / totalDiscoveryPlaces) * 100) : 0
  const cityShortlist = useMemo(() => {
    if (!rankedCities.length) return [] as CityDTO[]
    if (!selectedCityId) return rankedCities.slice(0, 4)

    const selected = rankedCities.find((city) => city.id === selectedCityId) ?? null
    const rest = rankedCities.filter((city) => city.id !== selectedCityId).slice(0, 3)
    return selected ? [selected, ...rest] : rankedCities.slice(0, 4)
  }, [rankedCities, selectedCityId])
  const selectedCityBrief = truncateCopy(selectedCity?.description)
  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const poi of allPois) {
      const key = poi.isGlobal === false ? 'Hidden place' : poi.category || 'Other'
      counts.set(key, (counts.get(key) || 0) + 1)
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, count]) => ({ label, count }))
  }, [allPois])
  const topPlaces = useMemo(() => {
    return [...layerMatchedPois]
      .sort((a, b) => {
        const aScore = (a.isGlobal === false ? 250 : 180) + (a.featured ? 140 : 0) + (a.editorialScore || 0) * 4 + (a.qualityScore || 0) * 2 + (a.usageCount || 0)
        const bScore = (b.isGlobal === false ? 250 : 180) + (b.featured ? 140 : 0) + (b.editorialScore || 0) * 4 + (b.qualityScore || 0) * 2 + (b.usageCount || 0)
        return bScore - aScore
      })
      .slice(0, 6)
  }, [layerMatchedPois])

  useEffect(() => {
    const isDefaultDiscoveryState =
      !selectedRoute &&
      !isFormOpen &&
      selectedCategory === 'all' &&
      !debouncedMapQuery &&
      poiLayer === 'all'

    if (!isDefaultDiscoveryState) return
    if (!selectedCityId || isDiscoveryLoading || autoShiftedFromEmptyCity) return
    // Don't auto-shift if the user explicitly navigated to this city via URL
    if (requestedCityId !== null && requestedCityId === selectedCityId) return
    if (globalPoisCount > 0 || privatePoisCount > 0) return

    const nextCity = getNextCity(cities, selectedCityId)
    if (!nextCity || nextCity.id === selectedCityId) return

    setAutoShiftedFromEmptyCity(true)
    setSelectedCityId(nextCity.id)
  }, [
    autoShiftedFromEmptyCity,
    cities,
    debouncedMapQuery,
    globalPoisCount,
    isDiscoveryLoading,
    isFormOpen,
    poiLayer,
    privatePoisCount,
    selectedCategory,
    selectedCityId,
    selectedRoute,
  ])

  const discoveryMessage = selectedRoute
    ? 'The map is centered on this route right now. Close it to jump back into local discovery.'
    : !selectedCity
      ? 'Preparing a city-based discovery view instead of loading the whole map at once.'
      : isDiscoveryLoading
        ? `Refreshing discoveries inside ${selectedCity.name}.`
        : debouncedMapQuery
          ? `Searching inside the places already loaded for ${selectedCity.name}.`
          : selectedCategory !== 'all'
            ? `Filtered to ${selectedCategory.toLowerCase()} in ${selectedCity.name}.`
            : poiLayer === 'landmarks'
              ? `Showing the landmark layer for ${selectedCity.name}.`
              : poiLayer === 'hidden'
                ? user
                  ? `Showing only your hidden places in ${selectedCity.name}.`
                  : `Sign in to unlock your hidden places in ${selectedCity.name}.`
                : autoShiftedFromEmptyCity
                  ? `Started in ${selectedCity.name} because it has more usable discovery right now.`
                : `The map opens directly in ${selectedCity.name}, so discovery feels lighter and more curated.`

  const resetDiscovery = () => {
    setAutoShiftedFromEmptyCity(false)
    setSelectedCityId((current) => current ?? defaultCity?.id ?? cities[0]?.id ?? null)
    setSelectedCategory('all')
    setMapQuery('')
    setPoiLayer('all')
    setFocusedPoiId(null)
  }

  const jumpToNextCity = () => {
    const nextCity = getNextCity(cities, selectedCityId)
    if (!nextCity) return
    setAutoShiftedFromEmptyCity(false)
    setSelectedRoute(null)
    setSelectedCityId(nextCity.id)
    setSelectedCategory('all')
    setMapQuery('')
    setPoiLayer('all')
    setFocusedPoiId(null)
  }

  const handleOnAddPoi = (poiId: number) => {
    const poi = allPois.find((item) => item.id === poiId)
    if (!poi || typeof poi.latitude !== 'number' || typeof poi.longitude !== 'number') return
    setSelectedStops((prev) => [...prev, {
      poiId: poi.id,
      name: poi.name,
      latitude: poi.latitude,
      longitude: poi.longitude,
      category: poi.category,
      address: poi.address,
      description: poi.description,
      mainImageUrl: poi.mainImageUrl || poi.imageUrl,
      travelTimeMinutes: 30,
      orderIndex: prev.length,
    }])
    setFeedbackMessage(`Added "${poi.name}" to the route`)
  }

  const handleFocusPoi = (poi: MapPoi) => {
    if (typeof poi.latitude !== 'number' || typeof poi.longitude !== 'number') return
    setSelectedRoute(null)
    setFocusedPoiId(poi.id)
  }

  const handleStartRouteFromPoi = (poi: MapPoi) => {
    if (!user) {
      setIsAuthOpen(true)
      return
    }
    if (typeof poi.latitude !== 'number' || typeof poi.longitude !== 'number') return
    handleFocusPoi(poi)
    setSelectedRoute(null)
    setSelectedStops([{
      poiId: poi.id,
      name: poi.name,
      latitude: poi.latitude,
      longitude: poi.longitude,
      category: poi.category || 'Landmark',
      address: poi.address,
      description: poi.description,
      mainImageUrl: poi.mainImageUrl || poi.imageUrl,
      travelTimeMinutes: 30,
      orderIndex: 0,
    }])
    setPendingCoords(null)
    setPendingStop(null)
    setIsFormOpen(true)
  }

  const handleMapClick = (lat: number, lng: number, screenX: number, screenY: number) => {
    if (isFormOpen) return setPendingStop({ lat, lng, screenX, screenY })
    if (user) {
      setPoiCoords({ lat, lng })
      setIsPOIFormOpen(true)
    } else {
      setIsAuthOpen(true)
    }
  }

  const handleStopConfirm = (name: string) => {
    if (!pendingStop) return
    setSelectedStops((prev) => [...prev, {
      poiId: null,
      name,
      latitude: pendingStop.lat,
      longitude: pendingStop.lng,
      category: 'Custom',
      travelTimeMinutes: 20,
      orderIndex: prev.length,
    }])
    setPendingCoords({ lat: pendingStop.lat, lng: pendingStop.lng })
    setPendingStop(null)
    setFeedbackMessage(`Added "${name.trim()}" as a custom stop`)
  }

  const closeConstructor = () => {
    setIsFormOpen(false)
    setSelectedStops([])
    setPendingCoords(null)
    setPendingStop(null)
    setFocusedPoiId(null)
  }

  const handleSelectRoute = async (route: RouteResponseDTO) => {
    if (selectedRoute?.id === route.id) return setSelectedRoute(null)
    setIsFormOpen(false)
    setFocusedPoiId(null)
    try {
      const response = await api.get(`/routes/${route.id}`)
      setSelectedRoute(response.data)
    } catch (error) {
      console.error('Failed to load route details:', error)
      setSelectedRoute(route)
    }
  }

  return (
    <div className="app-shell flex min-h-0 flex-1 flex-col overflow-y-auto">
      <section className="relative h-[74vh] min-h-[560px] w-full border-b border-white/[0.06]">
        <div className="absolute inset-0">
          <MapPreview
            stops={isFormOpen ? selectedStops : selectedRoute?.stops || []}
            activeRoute={selectedRoute}
            allPois={allPois}
            poiLayer={poiLayer}
            focusCoords={selectedRoute || isFormOpen ? null : focusCoords}
            highlightedPoiId={focusedPoiId}
            pendingCoords={pendingCoords}
            onMapClick={handleMapClick}
            onAddPoiToRoute={handleOnAddPoi}
            isConstructorMode={isFormOpen}
          />
        </div>

        {!selectedRoute && !isFormOpen && !selectedCity && isCitiesLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[linear-gradient(180deg,_rgba(255,255,255,0.68)_0%,_rgba(255,255,255,0.42)_100%)] px-6 text-center backdrop-blur-sm dark:bg-[linear-gradient(180deg,_rgba(8,10,15,0.7)_0%,_rgba(8,10,15,0.54)_100%)]">
            <div className="max-w-md rounded-[30px] border border-slate-200 bg-white/90 px-6 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.14)] dark:border-white/[0.08] dark:bg-[#0f1117]/88 dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
              <div className="text-[11px] uppercase tracking-[0.28em] text-teal-700 dark:text-cyan-100/78">Preparing discovery</div>
              <h2 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">Opening one city first, not the whole map.</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-white/52">
                We are picking the strongest city layer so hidden places feel curated instead of overwhelming.
              </p>
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,_rgba(255,248,240,0.12)_0%,_rgba(255,248,240,0.04)_36%,_rgba(15,23,42,0.32)_100%)] dark:bg-[linear-gradient(180deg,_rgba(8,10,15,0.08)_0%,_rgba(8,10,15,0.02)_36%,_rgba(8,10,15,0.72)_100%)]" />

        <div className="absolute left-3 right-3 top-3 z-20 flex flex-wrap items-center gap-2 sm:left-4 sm:right-auto sm:top-4">
          {!isFormOpen && user && (
            <button
              onClick={() => { setSelectedRoute(null); setIsFormOpen(true) }}
              className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/92 px-4 py-2.5 text-xs font-medium text-slate-800 shadow-lg backdrop-blur-md transition-all hover:border-slate-300 dark:border-white/[0.12] dark:bg-[#0f1117]/90 dark:text-white"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Build route
            </button>
          )}
          {!isFormOpen && (
            <button
              onClick={() => setIsMapPanelOpen((value) => !value)}
              className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-medium shadow-lg backdrop-blur-md transition-all ${isMapPanelOpen ? 'border-teal-500/20 bg-teal-50 text-teal-700 dark:border-cyan-300/26 dark:bg-cyan-300/12 dark:text-cyan-100' : 'border-slate-200 bg-white/92 text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-white/[0.12] dark:bg-[#0f1117]/90 dark:text-white/72 dark:hover:border-white/25 dark:hover:text-white'}`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></svg>
              {isMapPanelOpen ? 'Hide panel' : 'Show panel'}
            </button>
          )}
          {(selectedRoute || isFormOpen) && (
            <button
              onClick={() => { setSelectedRoute(null); closeConstructor() }}
              className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/92 px-4 py-2.5 text-xs font-medium text-slate-600 shadow-lg backdrop-blur-md transition-all hover:border-slate-300 hover:text-slate-900 dark:border-white/[0.12] dark:bg-[#0f1117]/90 dark:text-white/70 dark:hover:border-white/25 dark:hover:text-white"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
              Back to discovery
            </button>
          )}
        </div>

        {!selectedRoute && !isFormOpen && isMapPanelOpen && (
          <aside className="absolute left-3 top-20 bottom-4 z-20 w-[320px] max-w-[calc(100%-24px)] overflow-hidden rounded-[28px] border border-slate-200 bg-white/88 shadow-[0_18px_50px_rgba(15,23,42,0.14)] backdrop-blur-md dark:border-white/[0.08] dark:bg-[#0f1117]/86 dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)] sm:left-4 sm:bottom-5 sm:w-[340px]">
            <div className="panel-scroll h-full overflow-y-auto p-4 sm:p-5">
              <div className="text-[11px] uppercase tracking-[0.28em] text-teal-700 dark:text-cyan-200/80">City discovery</div>
              <h1 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">Open a city, find hidden gems, then build the route.</h1>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/52">{discoveryMessage}</p>

              <div className="mt-5 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Curated', value: featuredPlacesCount, tone: 'text-teal-700 dark:text-cyan-100' },
                    { label: 'Hidden', value: privatePoisCount, tone: 'text-violet-600 dark:text-violet-200' },
                    { label: 'Visible', value: layerMatchedPois.length, tone: 'text-slate-800 dark:text-white' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[20px] border border-slate-200 bg-white px-3 py-3 dark:border-white/[0.08] dark:bg-black/20">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-white/28">{item.label}</div>
                      <div className={`mt-2 text-xl font-semibold ${item.tone}`}>{item.value}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400 dark:text-white/30">Now exploring</div>
                      <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{selectedCity ? [selectedCity.name, selectedCity.countryName].filter(Boolean).join(', ') : 'Choosing a city'}</div>
                      <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-white/44">
                        The map stays centered on one city first, so hidden places feel curated instead of overwhelming.
                      </p>
                    </div>
                    <button
                      onClick={jumpToNextCity}
                      className="rounded-full border border-teal-500/16 bg-teal-50 px-3 py-2 text-[11px] text-teal-700 transition-all hover:border-teal-500/28 hover:bg-teal-100 dark:border-cyan-300/22 dark:bg-cyan-300/10 dark:text-cyan-100 dark:hover:border-cyan-200/40 dark:hover:bg-cyan-300/14"
                    >
                      Next city
                    </button>
                  </div>
                </div>

                {selectedCity && (
                  <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400 dark:text-white/30">City briefing</div>
                        <div className="mt-2 text-base font-semibold text-slate-900 dark:text-white">A calmer starting point before route building.</div>
                      </div>
                      {selectedCity.flagEmoji && (
                        <div className="text-lg" aria-hidden="true">{selectedCity.flagEmoji}</div>
                      )}
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/[0.08] dark:bg-black/18">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/28">Routes</div>
                        <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{selectedCity.routesCount || 0}</div>
                      </div>
                      <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/[0.08] dark:bg-black/18">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/28">Loaded</div>
                        <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{totalDiscoveryPlaces}</div>
                      </div>
                      <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/[0.08] dark:bg-black/18">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/28">Hidden share</div>
                        <div className="mt-2 text-lg font-semibold text-violet-600 dark:text-violet-200">{hiddenShare}%</div>
                      </div>
                    </div>
                    <p className="mt-4 text-xs leading-6 text-slate-600 dark:text-white/46">
                      {selectedCityBrief ||
                        `${selectedCity.name} is a good discovery hub because it already has enough visible anchors and space for hidden places to matter.`}
                    </p>
                  </div>
                )}

                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/72">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400 dark:text-white/34">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </svg>
                  <input
                    value={mapQuery}
                    onChange={(event) => setMapQuery(event.target.value)}
                    placeholder={selectedCity ? `Search hidden gems in ${selectedCity.name}` : 'Search places in this city'}
                    className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-white/24"
                  />
                </label>

                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400 dark:text-white/30">Layer</div>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { value: 'all', label: 'All places' },
                      { value: 'landmarks', label: 'Landmarks' },
                      { value: 'hidden', label: 'Hidden places' },
                    ] as { value: PoiLayer; label: string }[]).map((item) => (
                      <button
                        key={item.value}
                        onClick={() => setPoiLayer(item.value)}
                        className={`rounded-full border px-3 py-2 text-xs transition-all ${poiLayer === item.value ? 'border-teal-500/20 bg-teal-50 text-teal-700 dark:border-cyan-300/30 dark:bg-cyan-300/12 dark:text-cyan-100' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/50 dark:hover:border-white/18 dark:hover:text-white/76'}`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400 dark:text-white/30">City shortlist</div>
                    <span className="text-[11px] text-slate-500 dark:text-white/38">Ranked for discovery</span>
                  </div>
                  <div className="space-y-2">
                    {cityShortlist.map((city) => {
                      const isActive = selectedCityId === city.id
                      return (
                        <button
                          key={city.id}
                          onClick={() => {
                            setAutoShiftedFromEmptyCity(false)
                            setMapQuery('')
                            setFocusedPoiId(null)
                            setSelectedCategory('all')
                            setPoiLayer('all')
                            setSelectedCityId(city.id)
                          }}
                          className={`flex w-full items-center justify-between gap-3 rounded-[18px] border px-3 py-3 text-left transition-all ${isActive ? 'border-teal-500/20 bg-teal-50 dark:border-cyan-300/30 dark:bg-cyan-300/12' : 'border-slate-200 bg-white hover:border-slate-300 dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-white/18'}`}
                        >
                          <div>
                            <div className={`text-sm font-semibold ${isActive ? 'text-teal-700 dark:text-cyan-100' : 'text-slate-900 dark:text-white'}`}>{city.name}</div>
                            <div className="mt-1 text-[11px] text-slate-500 dark:text-white/40">
                              {[city.countryName, city.poiCount ? `${city.poiCount} places` : null].filter(Boolean).join(' / ')}
                            </div>
                          </div>
                          <div className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${isActive ? 'bg-white/80 text-teal-700 dark:bg-black/20 dark:text-cyan-100' : 'bg-slate-100 text-slate-500 dark:bg-black/18 dark:text-white/42'}`}>
                            #{rankedCities.findIndex((entry) => entry.id === city.id) + 1}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400 dark:text-white/30">Categories</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className={`rounded-full border px-3 py-2 text-xs transition-all ${selectedCategory === 'all' ? 'border-teal-500/20 bg-teal-50 text-teal-700 dark:border-cyan-300/30 dark:bg-cyan-300/12 dark:text-cyan-100' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/50 dark:hover:border-white/18 dark:hover:text-white/76'}`}
                    >
                      All categories
                    </button>
                    {categoryOptions.map((item) => (
                      <button
                        key={item.label}
                        onClick={() => setSelectedCategory((current) => (current === item.label ? 'all' : item.label))}
                        className={`rounded-full border px-3 py-2 text-xs transition-all ${selectedCategory === item.label ? 'border-teal-500/20 bg-teal-50 text-teal-700 dark:border-cyan-300/30 dark:bg-cyan-300/12 dark:text-cyan-100' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/50 dark:hover:border-white/18 dark:hover:text-white/76'}`}
                      >
                        {item.label} {item.count}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 border-t border-white/[0.06] pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400 dark:text-white/30">Visible now</div>
                    {isDiscoveryLoading && (
                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] text-slate-500 dark:border-white/[0.08] dark:bg-black/18 dark:text-white/44">Updating</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:border-white/[0.08] dark:bg-black/20 dark:text-white/78"><span className="h-2.5 w-2.5 rounded-full bg-[#eab308]" />Landmarks: {globalPoisCount}</span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:border-white/[0.08] dark:bg-black/20 dark:text-white/78"><span className="h-2.5 w-2.5 rounded-full bg-[#8b5cf6]" />Hidden: {privatePoisCount}</span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:border-white/[0.08] dark:bg-black/20 dark:text-white/78"><span className="h-2.5 w-2.5 rounded-full bg-[#06b6d4]" />Matching: {layerMatchedPois.length}</span>
                  </div>
                </div>

                <div className="space-y-3 border-t border-white/[0.06] pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400 dark:text-white/30">Top places</div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-white/38">{selectedCity ? `Best matches currently loaded for ${selectedCity.name}.` : 'Best matches from this discovery layer.'}</p>
                    </div>
                    {(selectedCity || debouncedMapQuery || selectedCategory !== 'all' || poiLayer !== 'all') && (
                      <button
                        onClick={resetDiscovery}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-600 transition-all hover:border-slate-300 hover:text-slate-900 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/60 dark:hover:border-white/18 dark:hover:text-white/82"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  {topPlaces.length === 0 ? (
                    <div className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
                      <div className="text-sm font-medium text-slate-800 dark:text-white">
                        {user || poiLayer !== 'hidden' ? 'This city is quiet with the current filters.' : 'Sign in to unlock your hidden places here.'}
                      </div>
                      <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-white/42">
                        {user || poiLayer !== 'hidden'
                          ? 'Try the next city, widen the layer, or reset the filters to bring the map back to a fuller discovery state.'
                          : 'The public landmark layer can still help you start a route, but the hidden layer is personal to your account.'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {user || poiLayer !== 'hidden' ? (
                          <>
                            <button
                              onClick={jumpToNextCity}
                              className="rounded-xl border border-teal-500/16 bg-teal-50 px-3 py-2 text-xs text-teal-700 transition-all hover:border-teal-500/28 hover:bg-teal-100 dark:border-cyan-300/24 dark:bg-cyan-300/10 dark:text-cyan-100 dark:hover:border-cyan-200/40 dark:hover:bg-cyan-300/14"
                            >
                              Open next city
                            </button>
                            <button
                              onClick={resetDiscovery}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 transition-all hover:border-slate-300 hover:text-slate-900 dark:border-white/[0.08] dark:bg-black/18 dark:text-white/60 dark:hover:border-white/18 dark:hover:text-white/82"
                            >
                              Reset filters
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setIsAuthOpen(true)}
                            className="rounded-xl border border-teal-500/16 bg-teal-50 px-3 py-2 text-xs text-teal-700 transition-all hover:border-teal-500/28 hover:bg-teal-100 dark:border-cyan-300/24 dark:bg-cyan-300/10 dark:text-cyan-100 dark:hover:border-cyan-200/40 dark:hover:bg-cyan-300/14"
                          >
                            Sign in for hidden places
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {topPlaces.map((poi) => (
                        <article
                          key={poi.id}
                          className={`overflow-hidden rounded-[22px] border transition-all ${focusedPoiId === poi.id ? 'border-teal-500/20 bg-teal-50 dark:border-cyan-300/24 dark:bg-cyan-300/[0.08]' : 'border-slate-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03]'}`}
                        >
                          {(poi.mainImageUrl || poi.imageUrl) && <div className="h-24 w-full overflow-hidden bg-[#0b1220]"><img src={poi.mainImageUrl || poi.imageUrl} alt={poi.name} className="h-full w-full object-cover" /></div>}
                          <div className="p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-white/32">{poi.isGlobal === false ? 'Hidden place' : poi.category || 'Place'}</div>
                                <h3 className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{poi.name}</h3>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                {poi.featured && <span className="rounded-full border border-teal-500/16 bg-teal-50 px-2.5 py-1 text-[10px] text-teal-700 dark:border-cyan-300/18 dark:bg-cyan-300/10 dark:text-cyan-100">Curated</span>}
                                {typeof poi.usageCount === 'number' && poi.usageCount > 0 && <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] text-slate-500 dark:border-white/[0.08] dark:bg-black/18 dark:text-white/52">saved {poi.usageCount}</span>}
                              </div>
                            </div>
                            {(poi.cityName || poi.address) && <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-white/42">{poi.cityName || poi.address}</p>}
                            {poi.description && <p className="mt-2 text-xs leading-6 text-slate-600 dark:text-white/50">{poi.description}</p>}
                            <div className="mt-3 flex flex-wrap gap-2">
                              {typeof poi.visitMinutes === 'number' && poi.visitMinutes > 0 && <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] text-slate-500 dark:border-white/[0.08] dark:bg-black/18 dark:text-white/52">{poi.visitMinutes} min stop</span>}
                              {typeof poi.editorialScore === 'number' && poi.editorialScore > 0 && <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] text-slate-500 dark:border-white/[0.08] dark:bg-black/18 dark:text-white/52">Score {poi.editorialScore}</span>}
                            </div>
                            <div className="mt-3 flex gap-2">
                              <button
                                onClick={() => handleFocusPoi(poi)}
                                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 transition-all hover:border-slate-300 hover:text-slate-900 dark:border-white/[0.08] dark:bg-black/18 dark:text-white/78 dark:hover:border-white/18 dark:hover:text-white"
                              >
                                Focus on map
                              </button>
                              <button
                                onClick={() => handleStartRouteFromPoi(poi)}
                                className="flex-1 rounded-xl border border-teal-500/16 bg-teal-600 px-3 py-2 text-xs text-white transition-all hover:bg-teal-500 dark:border-cyan-300/24 dark:bg-cyan-300/12 dark:text-cyan-100 dark:hover:border-cyan-200/40 dark:hover:bg-cyan-300/16"
                              >
                                Build from here
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>
        )}
        {isFormOpen && (
          <>
            <div className="pointer-events-none absolute left-3 right-3 top-[76px] z-20 sm:hidden">
              <div className="pointer-events-auto rounded-[22px] border border-slate-200 bg-white/92 px-4 py-3 shadow-[0_18px_50px_rgba(15,23,42,0.14)] backdrop-blur-md dark:border-white/[0.08] dark:bg-[#0f1117]/88 dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.24em] text-teal-700 dark:text-cyan-100/76">Builder mode</div>
                    <p className="mt-1 text-xs leading-6 text-slate-600 dark:text-white/46">
                      Tap the map, add stops, then finish inside the route sheet.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-700 dark:border-white/[0.08] dark:bg-black/18 dark:text-white/76">
                      {selectedStops.length} stops
                    </span>
                    <span className="rounded-full border border-violet-400/18 bg-violet-50 px-3 py-1.5 text-[11px] text-violet-700 dark:border-violet-300/18 dark:bg-violet-300/10 dark:text-violet-200">
                      {hiddenStopsCount} hidden
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pointer-events-none absolute bottom-4 left-4 z-20 hidden max-w-[340px] sm:left-6 sm:block">
              <div className="pointer-events-auto rounded-[26px] border border-slate-200 bg-white/88 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.14)] backdrop-blur-md dark:border-white/[0.08] dark:bg-[#0f1117]/86 dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
                <div className="text-[11px] uppercase tracking-[0.28em] text-teal-700 dark:text-cyan-100/76">Builder mode</div>
                <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/48">Tap the map to add a hidden place, or open a popup and add it to the route.</p>
              </div>
            </div>

            <div className="pointer-events-none absolute bottom-4 right-4 z-20 hidden w-full max-w-[360px] sm:right-6 sm:block">
              <div className="pointer-events-auto rounded-[26px] border border-slate-200 bg-white/88 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.14)] backdrop-blur-md dark:border-white/[0.08] dark:bg-[#0f1117]/86 dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
                <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500 dark:text-white/34">Current route</div>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div className="rounded-[20px] border border-white/[0.08] bg-black/18 px-3 py-3"><div className="text-[10px] uppercase tracking-[0.2em] text-white/22">Stops</div><div className="mt-2 text-xl font-semibold text-white">{selectedStops.length}</div></div>
                  <div className="rounded-[20px] border border-white/[0.08] bg-black/18 px-3 py-3"><div className="text-[10px] uppercase tracking-[0.2em] text-white/22">Hidden</div><div className="mt-2 text-xl font-semibold text-white">{hiddenStopsCount}</div></div>
                  <div className="rounded-[20px] border border-white/[0.08] bg-black/18 px-3 py-3"><div className="text-[10px] uppercase tracking-[0.2em] text-white/22">Minutes</div><div className="mt-2 text-xl font-semibold text-white">{totalComposerMinutes}</div></div>
                </div>
              </div>
            </div>
          </>
        )}

        {pendingStop && (
          <MapStopPopup
            screenX={pendingStop.screenX}
            screenY={pendingStop.screenY}
            onConfirm={handleStopConfirm}
            onCancel={() => setPendingStop(null)}
          />
        )}

        {feedbackMessage && (
          <div
            className={`pointer-events-none absolute left-1/2 z-30 w-[min(520px,calc(100%-24px))] -translate-x-1/2 ${isFormOpen ? 'bottom-4 sm:bottom-4' : 'bottom-4'}`}
            style={isFormOpen ? { bottom: 'max(1rem, env(safe-area-inset-bottom))' } : undefined}
          >
            <div className="app-toast px-4 py-3 text-center text-sm text-slate-700 dark:text-cyan-50">{feedbackMessage}</div>
          </div>
        )}
      </section>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-[30px] border border-slate-200 bg-white/88 p-4 shadow-[0_22px_60px_rgba(15,23,42,0.08)] dark:border-white/[0.08] dark:bg-[#0f1117]/85 dark:shadow-[0_22px_60px_rgba(0,0,0,0.24)] sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Routes for the map</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-white/40">Pick a route and the map will focus on it. Leave it unselected to keep exploring your current city.</p>
            </div>
            <div className="flex gap-1">
              {(['trending', 'all'] as FeedTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFeedTab(tab)}
                  className={`rounded-lg px-3 py-1.5 text-xs transition-all ${feedTab === tab ? 'border border-teal-500/20 bg-teal-50 text-teal-700 dark:border-white/[0.1] dark:bg-white/[0.08] dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-white/30 dark:hover:text-white/55'}`}
                >
                  {tab === 'trending' ? 'Trending' : 'Latest'}
                </button>
              ))}
            </div>
          </div>

          {(isRoutesLoading || isCitiesLoading) && routes.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500 dark:text-white/36">Loading route ideas...</div>
          ) : routes.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500 dark:text-white/36">No public routes yet.</div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-1">
              {routes.map((route) => (
                <div key={route.id} className="w-[280px] flex-shrink-0 sm:w-[320px]">
                  <RouteCard
                    route={route}
                    currentUser={user}
                    isSelected={selectedRoute?.id === route.id}
                    onClick={() => { void handleSelectRoute(route) }}
                    onCopied={() => setRoutesRefreshKey((value) => value + 1)}
                    onLoginRequest={() => setIsAuthOpen(true)}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {isFormOpen && <div className="fixed inset-0 z-[90] bg-black/45 backdrop-blur-[2px] md:hidden" onClick={closeConstructor} />}

      <aside className={`fixed inset-x-0 bottom-0 z-[100] h-[88dvh] max-h-[88dvh] transform-gpu transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] md:inset-x-auto md:right-0 md:top-[81px] md:h-[calc(100vh-81px)] md:max-h-none md:w-[390px] ${isFormOpen ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-x-full'}`}>
        <div className="h-full overflow-hidden rounded-t-[30px] border border-white/[0.08] bg-[#0a0c12] shadow-[0_-20px_60px_rgba(0,0,0,0.45)] md:rounded-none md:border-y-0 md:border-l">
          <CreateRouteForm
            onClose={closeConstructor}
            onSuccess={() => {
              setRoutesRefreshKey((value) => value + 1)
              setDiscoveryRefreshKey((value) => value + 1)
              closeConstructor()
            }}
            initialCoords={null}
            userId={user?.id || 0}
            externalStops={selectedStops}
            setExternalStops={setSelectedStops}
          />
        </div>
      </aside>

      {isPOIFormOpen && poiCoords && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center p-3 sm:items-center sm:p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsPOIFormOpen(false)} />
          <div className="relative w-full max-w-[440px]">
            <CreatePOIForm
              coords={poiCoords}
              userId={user?.id || 0}
              onClose={() => setIsPOIFormOpen(false)}
              onSuccess={(savedName) => {
                setIsPOIFormOpen(false)
                setFeedbackMessage(`Saved "${savedName}" to your hidden layer`)
                setDiscoveryRefreshKey((value) => value + 1)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
