import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, type DragEndEvent, useSensor, useSensors } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import api from '../api/axios'
import AppNotice, { type AppNoticeState } from './AppNotice'
import ImageSourceField from './ImageSourceField'
import VibeTagField from './VibeTagField'
import type { RouteImportPreviewDTO } from '../types/import'
import type { CityDTO, CountryDTO } from '../types/location'

interface RouteStop {
  poiId: number | null
  name: string
  latitude: number
  longitude: number
  travelTimeMinutes: number
  category?: string
  address?: string
  description?: string
  mainImageUrl?: string
}

type RouteType = 'CITY' | 'REGION' | 'MULTI_CITY' | 'ROAD_TRIP' | 'CUSTOM'

interface Props {
  onClose: () => void
  onSuccess: () => void
  initialCoords?: { lat: number; lng: number } | null
  userId: number
  externalStops: RouteStop[]
  setExternalStops: Dispatch<SetStateAction<RouteStop[]>>
}

const ROUTE_TYPES: { value: RouteType; label: string; hint: string }[] = [
  { value: 'CITY', label: 'City route', hint: 'One city, dense sequence' },
  { value: 'REGION', label: 'Region', hint: 'Broader area or region' },
  { value: 'MULTI_CITY', label: 'Multi-city', hint: 'Moves through several cities' },
  { value: 'ROAD_TRIP', label: 'Road trip', hint: 'Longer drive-style route' },
  { value: 'CUSTOM', label: 'Custom', hint: 'Personal hidden path' },
]

const COVER_PLACEHOLDER = 'linear-gradient(135deg, rgba(34,211,238,0.18) 0%, rgba(15,23,42,0.8) 52%, rgba(139,92,246,0.45) 100%)'

function formatMinutes(minutes: number) {
  if (minutes <= 0) return '0 min'
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!hours) return `${rest} min`
  if (!rest) return `${hours}h`
  return `${hours}h ${rest}m`
}

function formatCoords(lat: number, lng: number) {
  return `${lat.toFixed(3)}, ${lng.toFixed(3)}`
}

function getRouteTypeLabel(routeType: RouteType) {
  return ROUTE_TYPES.find((item) => item.value === routeType)?.label ?? 'Route'
}

function SortableStopItem({
  stop,
  index,
  cumulativeMinutes,
  onRemove,
  onUpdateDuration,
}: {
  stop: RouteStop
  index: number
  cumulativeMinutes: number
  onRemove: (index: number) => void
  onUpdateDuration: (index: number, minutes: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: index })
  const isCustom = !stop.poiId

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.75 : 1,
      }}
      className={`rounded-[26px] border p-3 transition-all ${
        isDragging
          ? 'border-cyan-300/26 bg-cyan-300/[0.08] shadow-[0_18px_40px_rgba(0,0,0,0.3)]'
          : 'border-white/[0.08] bg-[#11151d]'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="relative flex flex-col items-center pt-0.5">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold text-white ${
              isCustom ? 'bg-[#8b5cf6]' : 'bg-[#2563eb]'
            }`}
          >
            {index + 1}
          </button>
          <div className="mt-2 h-full min-h-[44px] w-px bg-white/[0.08]" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-[18px] bg-[#0b1220]">
              {stop.mainImageUrl ? (
                <img src={stop.mainImageUrl} alt={stop.name} className="h-full w-full object-cover" />
              ) : (
                <div
                  className="h-full w-full"
                  style={{ background: isCustom ? 'linear-gradient(135deg, #7c3aed 0%, #111827 100%)' : COVER_PLACEHOLDER }}
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-white">{stop.name}</p>
                <span className="rounded-full border border-white/[0.08] bg-black/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-white/35">
                  {isCustom ? 'Hidden place' : stop.category || 'POI'}
                </span>
              </div>

              <p className="mt-1 text-[11px] text-white/34">{stop.address || formatCoords(stop.latitude, stop.longitude)}</p>

              {stop.description && (
                <p className="mt-2 text-xs leading-6 text-white/46">{stop.description}</p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-white/40">
                <span className="rounded-full border border-white/[0.08] bg-black/18 px-2.5 py-1">
                  Arrival by {formatMinutes(cumulativeMinutes)}
                </span>
                <span>Stay time</span>
                <input
                  type="number"
                  min={0}
                  value={stop.travelTimeMinutes}
                  onChange={(event) => onUpdateDuration(index, parseInt(event.target.value, 10) || 0)}
                  className="w-14 rounded-lg border border-cyan-300/15 bg-black/20 px-2 py-1 text-center text-[11px] text-cyan-100 outline-none"
                />
                <span>min</span>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onRemove(index)}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-white/22 transition-colors hover:bg-red-500/10 hover:text-red-300"
        >
          x
        </button>
      </div>
    </div>
  )
}

export default function CreateRouteForm({
  onClose,
  onSuccess,
  initialCoords,
  userId,
  externalStops,
  setExternalStops,
}: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [mainImageUrl, setMainImageUrl] = useState('')
  const [routeType, setRouteType] = useState<RouteType>('CUSTOM')
  const [locationSummary, setLocationSummary] = useState('')
  const [regionLabel, setRegionLabel] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [totalBudget, setTotalBudget] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [primaryCountryId, setPrimaryCountryId] = useState<number | ''>('')
  const [primaryCityId, setPrimaryCityId] = useState<number | ''>('')
  const [isPublic, setIsPublic] = useState(false)
  const [vibeTags, setVibeTags] = useState<string[]>([])
  const [countries, setCountries] = useState<CountryDTO[]>([])
  const [cities, setCities] = useState<CityDTO[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [importUrl, setImportUrl] = useState('')
  const [importPreview, setImportPreview] = useState<RouteImportPreviewDTO | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [notice, setNotice] = useState<AppNoticeState | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const showNotice = (message: string, variant: AppNoticeState['variant'] = 'info') => {
    setNotice({ message, variant })
  }

  useEffect(() => {
    void api
      .get('/countries/top')
      .then((response) => setCountries(response.data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!primaryCountryId) {
      setCities([])
      setPrimaryCityId('')
      return
    }

    void api
      .get(`/cities/country/${primaryCountryId}`)
      .then((response) => setCities(response.data))
      .catch(() => setCities([]))
  }, [primaryCountryId])

  useEffect(() => {
    if (!initialCoords) return

    setExternalStops((prev) => [
      ...prev,
      {
        poiId: null,
        name: `Stop ${prev.length + 1}`,
        latitude: initialCoords.lat,
        longitude: initialCoords.lng,
        travelTimeMinutes: 20,
        category: 'Custom',
      },
    ])
  }, [initialCoords, setExternalStops])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      setExternalStops((items) => arrayMove(items, active.id as number, over.id as number))
    }
  }

  const updateDuration = (index: number, minutes: number) => {
    setExternalStops((prev) => {
      const next = [...prev]
      next[index].travelTimeMinutes = minutes
      return next
    })
  }

  const removeStop = (index: number) => {
    setExternalStops((prev) => prev.filter((_, currentIndex) => currentIndex !== index))
  }

  const totalMinutes = useMemo(
    () => externalStops.reduce((sum, stop) => sum + (stop.travelTimeMinutes || 0), 0),
    [externalStops]
  )
  const customCount = useMemo(() => externalStops.filter((stop) => !stop.poiId).length, [externalStops])
  const libraryCount = externalStops.length - customCount
  const firstStop = externalStops[0] || null
  const routeProgress = useMemo(
    () =>
      externalStops.reduce<number[]>((acc, stop, index) => {
        const previous = acc[index - 1] || 0
        acc.push(previous + (stop.travelTimeMinutes || 0))
        return acc
      }, []),
    [externalStops]
  )
  const primaryCountry = countries.find((country) => country.id === primaryCountryId) || null
  const primaryCity = cities.find((city) => city.id === primaryCityId) || null
  const routeLabel =
    locationSummary ||
    regionLabel ||
    primaryCity?.name ||
    primaryCountry?.name ||
    (firstStop ? firstStop.name : 'Your route canvas')
  const suggestedTitle = useMemo(() => {
    const anchor = firstStop?.name?.trim()
    const cityAnchor = primaryCity?.name || locationSummary || regionLabel

    switch (routeType) {
      case 'CITY':
        return cityAnchor ? `${cityAnchor} in one route` : anchor ? `${anchor} and nearby highlights` : 'City highlights route'
      case 'REGION':
        return cityAnchor ? `${cityAnchor} slow route` : anchor ? `${anchor} regional route` : 'Regional highlights route'
      case 'MULTI_CITY':
        return cityAnchor ? `${cityAnchor} multi-city flow` : anchor ? `${anchor} across cities` : 'Multi-city route'
      case 'ROAD_TRIP':
        return cityAnchor ? `${cityAnchor} road trip` : anchor ? `${anchor} road trip` : 'Road trip route'
      default:
        return anchor ? `${anchor} hidden route` : 'Custom hidden route'
    }
  }, [firstStop, locationSummary, primaryCity, regionLabel, routeType])
  const suggestedSummary = useMemo(() => {
    if (locationSummary.trim()) return locationSummary
    if (primaryCity?.name && primaryCountry?.name) return `${primaryCity.name}, ${primaryCountry.name}`
    if (primaryCity?.name) return primaryCity.name
    if (primaryCountry?.name) return primaryCountry.name
    if (firstStop?.address) return firstStop.address
    return firstStop?.name || ''
  }, [firstStop, locationSummary, primaryCity, primaryCountry])
  const suggestedDescription = useMemo(() => {
    const anchor = firstStop?.name || 'the city'

    switch (routeType) {
      case 'CITY':
        return `A compact route built around ${anchor}, with a pace that works well for a single city session.`
      case 'REGION':
        return `A broader regional route that starts from ${anchor} and leaves room for slower transitions and scenic stops.`
      case 'MULTI_CITY':
        return `A route that connects multiple city stops while keeping ${anchor} as one of the key anchors.`
      case 'ROAD_TRIP':
        return `A drive-oriented route shaped around ${anchor}, with enough spacing for movement and longer transitions.`
      default:
        return `A personal route built around ${anchor}, mixing recognizable anchors with more unusual stops.`
    }
  }, [firstStop, routeType])
  const readinessChecks = useMemo(
    () => [
      { label: 'Title', done: name.trim().length > 0 },
      { label: 'Place', done: locationSummary.trim().length > 0 || Boolean(primaryCity || primaryCountry || regionLabel.trim()) },
      { label: '3+ stops', done: externalStops.length >= 3 },
      { label: 'Cover', done: mainImageUrl.trim().length > 0 || Boolean(firstStop?.mainImageUrl) },
    ],
    [externalStops.length, firstStop, locationSummary, mainImageUrl, name, primaryCity, primaryCountry, regionLabel]
  )
  const readinessCount = readinessChecks.filter((item) => item.done).length

  const applySmartBasics = () => {
    if (!name.trim()) setName(suggestedTitle)
    if (!locationSummary.trim() && suggestedSummary) setLocationSummary(suggestedSummary)
    if (!description.trim()) setDescription(suggestedDescription)
    if (!mainImageUrl.trim() && firstStop?.mainImageUrl) setMainImageUrl(firstStop.mainImageUrl)
  }

  const applyFirstStopCover = () => {
    if (firstStop?.mainImageUrl) {
      setMainImageUrl(firstStop.mainImageUrl)
    }
  }

  const previewGoogleMapsImport = async () => {
    if (!importUrl.trim()) return
    setIsImporting(true)
    try {
      const response = await api.post('/routes/import/google-maps/preview', { url: importUrl.trim() })
      setImportPreview(response.data)
    } catch (error: unknown) {
      const responseMessage = typeof error === 'object' && error !== null && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined
      showNotice(responseMessage || 'We could not read this Google Maps link yet.', 'error')
    } finally {
      setIsImporting(false)
    }
  }

  const addImportedStops = () => {
    if (!importPreview) return
    const resolved = importPreview.stops
      .filter((stop) => stop.resolved && stop.latitude != null && stop.longitude != null)
      .map((stop) => ({
        poiId: null,
        name: stop.name,
        latitude: Number(stop.latitude),
        longitude: Number(stop.longitude),
        travelTimeMinutes: 30,
        category: 'Imported',
      }))

    if (resolved.length === 0) {
      showNotice('This link does not expose importable coordinates yet.', 'error')
      return
    }

    setExternalStops((prev) => [...prev, ...resolved])
    if (!name.trim() && importPreview.suggestedTitle) {
      setName(importPreview.suggestedTitle)
    }
    setImportUrl('')
    setImportPreview(null)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    if (externalStops.length === 0) {
      showNotice('Add at least one stop before saving the route.', 'error')
      return
    }

    setIsSubmitting(true)
    try {
      const routeResponse = await api.post('/routes', {
        name,
        description,
        isPublic,
        public: isPublic,
        userId,
        routeType,
        mainImageUrl: mainImageUrl || undefined,
        locationSummary: locationSummary || undefined,
        regionLabel: regionLabel || undefined,
        primaryCountryId: primaryCountryId || undefined,
        primaryCityId: primaryCityId || undefined,
        vibeTags,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        totalBudget: totalBudget ? Number(totalBudget) : undefined,
        currency: currency || undefined,
      })

      const newRouteId = routeResponse.data.id

      for (const [index, stop] of externalStops.entries()) {
        await api.post(`/routes/${newRouteId}/poi`, {
          poiId: stop.poiId,
          orderIndex: index,
          customName: stop.name,
          customLatitude: stop.latitude,
          customLongitude: stop.longitude,
          travelTimeMinutes: stop.travelTimeMinutes,
        })
      }

      onSuccess()
    } catch (error) {
      console.error(error)
      showNotice('We could not save this route draft yet.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[linear-gradient(180deg,_#0b0f16_0%,_#0a0c12_100%)] md:w-[390px] md:border-l md:border-white/[0.06]">
      <div className="flex flex-shrink-0 flex-col border-b border-white/[0.06] bg-[#0a0c12]/96 px-5 pb-4 pt-3 backdrop-blur md:flex-row md:items-start md:justify-between md:pt-4">
        <div className="mb-3 flex justify-center md:hidden">
          <div className="h-1.5 w-14 rounded-full bg-white/12" />
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/72">Route composer</div>
          <h2 className="mt-2 text-lg font-semibold text-white">Build a route people will want to open</h2>
          <p className="mt-1 text-sm leading-7 text-white/38">Shape the flow, pacing, and place mix before you save it.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-white/30 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          x
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="route-composer-scroll flex-1 space-y-6 overflow-y-auto px-4 py-5 sm:px-5">
          <AppNotice notice={notice} onDismiss={() => setNotice(null)} />

          <section className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#10141b]">
            <div className="relative h-44 overflow-hidden">
              {mainImageUrl ? (
                <img src={mainImageUrl} alt={name || 'Route cover'} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full" style={{ background: COVER_PLACEHOLDER }} />
              )}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(0,0,0,0.05)_0%,_rgba(0,0,0,0.12)_28%,_rgba(0,0,0,0.78)_100%)]" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <div className="text-[10px] uppercase tracking-[0.24em] text-cyan-100/76">{getRouteTypeLabel(routeType)}</div>
                <h3 className="mt-2 text-2xl font-semibold text-white">{name || 'Untitled route'}</h3>
                <p className="mt-2 text-xs leading-6 text-white/56">{routeLabel}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 border-t border-white/[0.06] p-4">
              <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.03] px-3 py-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/25">Stops</div>
                <div className="mt-2 text-2xl font-semibold text-white">{externalStops.length}</div>
              </div>
              <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.03] px-3 py-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/25">Hidden</div>
                <div className="mt-2 text-2xl font-semibold text-white">{customCount}</div>
              </div>
              <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.03] px-3 py-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/25">Timing</div>
                <div className="mt-2 text-2xl font-semibold text-white">{formatMinutes(totalMinutes)}</div>
              </div>
            </div>
          </section>

          <section className="rounded-[26px] border border-white/[0.08] bg-white/[0.03] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-white/28">Smart assist</div>
                <h3 className="mt-2 text-sm font-medium text-white">Let the composer fill the boring parts.</h3>
                <p className="mt-1 text-xs leading-6 text-white/40">
                  We can generate a cleaner starting title, summary, and cover based on the stops you already picked.
                </p>
              </div>
              <span className="rounded-full border border-white/[0.08] bg-black/18 px-3 py-1.5 text-[11px] text-white/52">
                {readinessCount}/{readinessChecks.length} ready
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {readinessChecks.map((item) => (
                <span
                  key={item.label}
                  className={`rounded-full border px-3 py-2 text-[11px] ${
                    item.done
                      ? 'border-cyan-300/26 bg-cyan-300/12 text-cyan-100'
                      : 'border-white/[0.08] bg-black/18 text-white/45'
                  }`}
                >
                  {item.label}
                </span>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={applySmartBasics}
                className="rounded-full border border-cyan-300/24 bg-cyan-300/12 px-4 py-2 text-xs font-medium text-cyan-100 transition-all hover:border-cyan-200/40 hover:bg-cyan-300/16"
              >
                Auto-fill basics
              </button>
              {firstStop?.mainImageUrl && !mainImageUrl.trim() && (
                <button
                  type="button"
                  onClick={applyFirstStopCover}
                  className="rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs text-white/72 transition-all hover:border-white/16 hover:text-white"
                >
                  Use first stop photo
                </button>
              )}
            </div>

            <div className="mt-4 space-y-2 rounded-[20px] border border-white/[0.06] bg-black/18 p-3">
              <div className="text-[10px] uppercase tracking-[0.22em] text-white/28">Suggested direction</div>
              <p className="text-sm text-white/72">{suggestedTitle}</p>
              {suggestedSummary && <p className="text-xs text-white/42">{suggestedSummary}</p>}
            </div>

            <div className="mt-4 space-y-3 rounded-[20px] border border-white/[0.06] bg-black/18 p-3">
              <div className="text-[10px] uppercase tracking-[0.22em] text-white/28">Import from Google Maps</div>
              <textarea
                value={importUrl}
                onChange={(event) => setImportUrl(event.target.value)}
                rows={3}
                placeholder="Paste a Google Maps link"
                className="w-full resize-none rounded-[18px] border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-cyan-300/35"
              />
              <button
                type="button"
                onClick={() => void previewGoogleMapsImport()}
                disabled={isImporting || !importUrl.trim()}
                className="rounded-full border border-cyan-300/24 bg-cyan-300/12 px-4 py-2 text-xs font-medium text-cyan-100 transition-all hover:border-cyan-200/40 hover:bg-cyan-300/16 disabled:opacity-30"
              >
                {isImporting ? 'Parsing link...' : 'Preview link'}
              </button>

              {importPreview ? (
                <div className="space-y-2">
                  <div className="text-xs text-white/62">{importPreview.summary}</div>
                  {importPreview.warnings.map((warning) => (
                    <div key={warning} className="rounded-[16px] border border-amber-300/18 bg-amber-300/10 px-3 py-2 text-xs text-amber-100/80">
                      {warning}
                    </div>
                  ))}
                  <div className="space-y-2">
                    {importPreview.stops.map((stop, index) => (
                      <div key={`${stop.name}-${index}`} className="flex items-center justify-between gap-3 rounded-[16px] border border-white/[0.08] bg-white/[0.03] px-3 py-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm text-white">{stop.name}</div>
                          <div className="text-[11px] text-white/40">{stop.sourceLabel}{stop.note ? ` / ${stop.note}` : ''}</div>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${stop.resolved ? 'bg-emerald-300/12 text-emerald-100' : 'bg-white/[0.04] text-white/42'}`}>
                          {stop.resolved ? 'Ready' : 'Review'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addImportedStops}
                    className="w-full rounded-[18px] border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/82 transition-all hover:border-white/16 hover:text-white"
                  >
                    Add resolved stops to this draft
                  </button>
                </div>
              ) : null}
            </div>
          </section>

          <section className="space-y-3">
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Route title"
              className="w-full rounded-[24px] border border-white/[0.08] bg-white/[0.05] px-4 py-3.5 text-sm text-white outline-none transition-colors focus:border-cyan-300/35"
            />
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What kind of day or trip does this route create?"
              className="h-28 w-full resize-none rounded-[24px] border border-white/[0.08] bg-white/[0.05] px-4 py-3.5 text-sm text-white outline-none transition-colors focus:border-cyan-300/35"
            />
            <ImageSourceField
              label="Cover image"
              value={mainImageUrl}
              onChange={setMainImageUrl}
              placeholder="Cover image URL (optional)"
              helperText="Upload your own cover or keep using image links when that is easier."
              dark
            />
          </section>

          <VibeTagField tags={vibeTags} onChange={setVibeTags} />

          <section className="space-y-3">
            <div className="text-[11px] uppercase tracking-[0.24em] text-white/28">Route type</div>
            <div className="grid gap-2">
              {ROUTE_TYPES.map((option) => {
                const active = routeType === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRouteType(option.value)}
                    className={`rounded-[22px] border px-4 py-3 text-left transition-all ${
                      active
                        ? 'border-cyan-300/28 bg-cyan-300/10'
                        : 'border-white/[0.08] bg-white/[0.03] hover:border-white/16 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className={`text-sm font-medium ${active ? 'text-cyan-100' : 'text-white/86'}`}>{option.label}</div>
                    <div className="mt-1 text-xs text-white/42">{option.hint}</div>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="grid gap-3">
            <input
              value={locationSummary}
              onChange={(event) => setLocationSummary(event.target.value)}
              placeholder="Location summary, e.g. Paris, France"
              className="w-full rounded-[24px] border border-white/[0.08] bg-white/[0.05] px-4 py-3.5 text-sm text-white outline-none transition-colors focus:border-cyan-300/35"
            />

            {(routeType === 'REGION' || routeType === 'ROAD_TRIP' || routeType === 'MULTI_CITY') && (
              <input
                value={regionLabel}
                onChange={(event) => setRegionLabel(event.target.value)}
                placeholder="Region label, e.g. Tuscany or Alpine arc"
                className="w-full rounded-[24px] border border-white/[0.08] bg-white/[0.05] px-4 py-3.5 text-sm text-white outline-none transition-colors focus:border-cyan-300/35"
              />
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={primaryCountryId}
                onChange={(event) => setPrimaryCountryId(event.target.value ? Number(event.target.value) : '')}
                className="w-full rounded-[24px] border border-white/[0.08] bg-white/[0.05] px-4 py-3.5 text-sm text-white outline-none transition-colors focus:border-cyan-300/35"
              >
                <option value="" style={{ background: '#0a0c12' }}>Primary country</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.id} style={{ background: '#0a0c12' }}>
                    {country.flagEmoji ? `${country.flagEmoji} ` : ''}{country.name}
                  </option>
                ))}
              </select>

              <select
                value={primaryCityId}
                onChange={(event) => setPrimaryCityId(event.target.value ? Number(event.target.value) : '')}
                className="w-full rounded-[24px] border border-white/[0.08] bg-white/[0.05] px-4 py-3.5 text-sm text-white outline-none transition-colors focus:border-cyan-300/35"
                disabled={!primaryCountryId || cities.length === 0}
              >
                <option value="" style={{ background: '#0a0c12' }}>Primary city</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id} style={{ background: '#0a0c12' }}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full rounded-[24px] border border-white/[0.08] bg-white/[0.05] px-4 py-3.5 text-sm text-white outline-none transition-colors focus:border-cyan-300/35"
              />
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full rounded-[24px] border border-white/[0.08] bg-white/[0.05] px-4 py-3.5 text-sm text-white outline-none transition-colors focus:border-cyan-300/35"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
              <input
                type="number"
                min={0}
                step="0.01"
                value={totalBudget}
                onChange={(event) => setTotalBudget(event.target.value)}
                placeholder="Total trip budget"
                className="w-full rounded-[24px] border border-white/[0.08] bg-white/[0.05] px-4 py-3.5 text-sm text-white outline-none transition-colors focus:border-cyan-300/35"
              />
              <input
                value={currency}
                onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                maxLength={8}
                placeholder="USD"
                className="w-full rounded-[24px] border border-white/[0.08] bg-white/[0.05] px-4 py-3.5 text-sm text-white outline-none transition-colors focus:border-cyan-300/35"
              />
            </div>
          </section>

          <section className="rounded-[26px] border border-white/[0.08] bg-white/[0.03] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-white/28">Publishing</div>
                <h3 className="mt-2 text-sm font-medium text-white">{isPublic ? 'Public route' : 'Private draft'}</h3>
                <p className="mt-1 text-xs leading-6 text-white/40">
                  {isPublic
                    ? 'Anyone can discover, like, and copy this route.'
                    : 'Only you can see it until you decide to publish later.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsPublic((current) => !current)}
                className={`relative inline-flex h-8 w-14 flex-shrink-0 items-center rounded-full border transition-all ${
                  isPublic
                    ? 'border-cyan-300/34 bg-cyan-300/14'
                    : 'border-white/[0.08] bg-black/18'
                }`}
              >
                <span
                  className={`mx-1 block h-5 w-5 rounded-full bg-white transition-transform ${
                    isPublic ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-white/28">Route timeline</div>
                <p className="mt-1 text-xs text-white/38">{libraryCount} library stops and {customCount} hidden/custom stops</p>
              </div>
              <div className="text-[11px] text-white/35">{externalStops.length}</div>
            </div>

            {externalStops.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-white/[0.12] bg-white/[0.02] px-4 py-8 text-center">
                <p className="text-sm text-white/50">No stops yet.</p>
                <p className="mt-2 text-xs leading-6 text-white/34">
                  Use the map to add hidden places or tap a landmark popup to include it in the route.
                </p>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={externalStops.map((_, index) => index)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {externalStops.map((stop, index) => (
                      <SortableStopItem
                        key={`${stop.poiId ?? 'custom'}-${index}`}
                        stop={stop}
                        index={index}
                        cumulativeMinutes={routeProgress[index] || stop.travelTimeMinutes}
                        onRemove={removeStop}
                        onUpdateDuration={updateDuration}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </section>
        </div>

        <div
          className="border-t border-white/[0.06] bg-[#0a0c12]/95 px-4 py-4 backdrop-blur sm:px-5 md:pb-4"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
        >
          <div className="mb-3 flex items-center justify-between text-xs text-white/42">
            <span>{externalStops.length > 0 ? `Ready with ${externalStops.length} stops` : 'Add at least one stop'}</span>
            <span>{formatMinutes(totalMinutes)} total</span>
          </div>
          <button
            type="submit"
            disabled={isSubmitting || externalStops.length === 0}
            className="w-full rounded-[24px] bg-cyan-500 px-4 py-3 text-sm font-semibold text-[#06202a] transition-all hover:bg-cyan-400 disabled:opacity-30"
          >
            {isSubmitting ? 'Saving route...' : isPublic ? 'Publish route' : 'Save private route'}
          </button>
        </div>
      </form>
    </div>
  )
}
