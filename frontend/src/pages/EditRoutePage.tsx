import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/axios'
import AppConfirmDialog, { type AppConfirmState } from '../components/AppConfirmDialog'
import AppNotice, { type AppNoticeState } from '../components/AppNotice'
import PageSkeleton from '../components/PageSkeleton'
import type { User } from '../components/AuthModal'
import ImageSourceField from '../components/ImageSourceField'
import RouteWorkspaceNav from '../components/RouteWorkspaceNav'
import VibeTagField from '../components/VibeTagField'
import type { RouteImportPreviewDTO } from '../types/import'
import type { CityDTO, CountryDTO } from '../types/location'
import type { PoiResponseDTO, RouteResponseDTO } from '../types/route'

interface EditRoutePageProps {
  currentUser: User | null
}

interface EditableStop extends PoiResponseDTO {
  dirty?: boolean
}

type RouteType = 'CITY' | 'REGION' | 'MULTI_CITY' | 'ROAD_TRIP' | 'CUSTOM'

const ROUTE_TYPES: { value: RouteType; label: string; hint: string }[] = [
  { value: 'CITY', label: 'City route', hint: 'Dense route inside one city' },
  { value: 'REGION', label: 'Region', hint: 'Broader regional loop' },
  { value: 'MULTI_CITY', label: 'Multi-city', hint: 'Several cities in one trip' },
  { value: 'ROAD_TRIP', label: 'Road trip', hint: 'Longer drive-first structure' },
  { value: 'CUSTOM', label: 'Custom', hint: 'Personal hidden route' },
]

function formatMinutes(totalMinutes?: number) {
  if (!totalMinutes || totalMinutes <= 0) return '0 min'
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (!hours) return `${minutes} min`
  if (!minutes) return `${hours}h`
  return `${hours}h ${minutes}m`
}

function formatBudget(value?: number | null, currency?: string | null) {
  if (value == null) return 'No budget'
  return `${value} ${currency || 'USD'}`
}

function truncateCopy(value: string | undefined, maxLength = 150) {
  if (!value) return null
  const normalized = value.trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength).trimEnd()}...`
}

export default function EditRoutePage({ currentUser }: EditRoutePageProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [route, setRoute] = useState<RouteResponseDTO | null>(null)
  const [stops, setStops] = useState<EditableStop[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [mainImageUrl, setMainImageUrl] = useState('')
  const [routeType, setRouteType] = useState<RouteType>('CUSTOM')
  const [locationSummary, setLocationSummary] = useState('')
  const [regionLabel, setRegionLabel] = useState('')
  const [primaryCountryId, setPrimaryCountryId] = useState<number | ''>('')
  const [primaryCityId, setPrimaryCityId] = useState<number | ''>('')
  const [isPublicRoute, setIsPublicRoute] = useState(false)
  const [vibeTags, setVibeTags] = useState<string[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [totalBudget, setTotalBudget] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [countries, setCountries] = useState<CountryDTO[]>([])
  const [cities, setCities] = useState<CityDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [notice, setNotice] = useState<AppNoticeState | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<AppConfirmState | null>(null)
  const [importUrl, setImportUrl] = useState('')
  const [importPreview, setImportPreview] = useState<RouteImportPreviewDTO | null>(null)
  const [importing, setImporting] = useState(false)

  const dragIndex = useRef<number | null>(null)

  useEffect(() => {
    void api
      .get('/countries/top')
      .then((response) => setCountries(response.data || []))
      .catch(() => setCountries([]))
  }, [])

  useEffect(() => {
    if (!primaryCountryId) {
      setCities([])
      setPrimaryCityId('')
      return
    }

    void api
      .get(`/cities/country/${primaryCountryId}`)
      .then((response) => setCities(response.data || []))
      .catch(() => setCities([]))
  }, [primaryCountryId])

  useEffect(() => {
    if (!primaryCityId) return
    if (cities.length === 0) return
    if (!cities.some((city) => city.id === primaryCityId)) {
      setPrimaryCityId('')
    }
  }, [cities, primaryCityId])

  useEffect(() => {
    if (!id) return

    api.get(`/routes/${id}`)
      .then((res) => {
        const loadedRoute: RouteResponseDTO = res.data
        setRoute(loadedRoute)
        setName(loadedRoute.name)
        setDescription(loadedRoute.description ?? '')
        setMainImageUrl(loadedRoute.mainImageUrl ?? '')
        setRouteType((loadedRoute.routeType as RouteType) || 'CUSTOM')
        setLocationSummary(loadedRoute.locationSummary ?? '')
        setRegionLabel(loadedRoute.regionLabel ?? '')
        setPrimaryCountryId(loadedRoute.primaryCountryId ?? '')
        setPrimaryCityId(loadedRoute.primaryCityId ?? '')
        setIsPublicRoute(Boolean(loadedRoute.public))
        setVibeTags(loadedRoute.vibeTags ?? [])
        setStartDate(loadedRoute.startDate ?? '')
        setEndDate(loadedRoute.endDate ?? '')
        setTotalBudget(loadedRoute.totalBudget != null ? String(loadedRoute.totalBudget) : '')
        setCurrency(loadedRoute.currency ?? 'USD')
        setStops([...loadedRoute.stops].sort((a, b) => a.orderIndex - b.orderIndex))
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const canEdit = Boolean(route?.canEdit && currentUser)
  const isOwner = route?.accessRole === 'OWNER'

  const showSaved = (msg: string) => {
    setSavedMsg(msg)
    window.setTimeout(() => setSavedMsg(''), 2600)
  }

  const showNotice = (message: string, variant: AppNoticeState['variant'] = 'info') => {
    setNotice({ message, variant })
  }

  const handleDragStart = (idx: number) => {
    dragIndex.current = idx
  }

  const handleDragEnter = (idx: number) => {
    if (dragIndex.current === null || dragIndex.current === idx) return

    setStops((prev) => {
      const next = [...prev]
      const [moved] = next.splice(dragIndex.current!, 1)
      if (!moved) return prev
      next.splice(idx, 0, moved)
      dragIndex.current = idx
      return next
    })
  }

  const handleDragEnd = async () => {
    if (!id || !canEdit) return

    try {
      const orderedRoutePoiIds = stops.map((stop) => stop.routePoiId)
      await api.patch(`/routes/${id}/reorder`, { orderedRoutePoiIds })
      showSaved('Stop order saved')
    } catch {
      api.get(`/routes/${id}`).then((res) =>
        setStops([...res.data.stops].sort((a: PoiResponseDTO, b: PoiResponseDTO) => a.orderIndex - b.orderIndex))
      )
    }

    dragIndex.current = null
  }

  const handleRemoveStop = async (stop: EditableStop) => {
    setConfirmDialog({
      title: 'Remove this stop?',
      description: `We'll take "${stop.name}" out of the route, but you can still add it back later if needed.`,
      confirmLabel: 'Remove stop',
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/routes/poi-link/${stop.routePoiId}`)
          setStops((prev) => prev.filter((item) => item.routePoiId !== stop.routePoiId))
          showSaved('Stop removed')
        } catch {
          showNotice('We could not remove this stop right now.', 'error')
        }
      },
    })
  }

  const handleTimeChange = (routePoiId: number, minutes: number) => {
    setStops((prev) =>
      prev.map((stop) =>
        stop.routePoiId === routePoiId
          ? { ...stop, travelTimeMinutes: minutes, dirty: true }
          : stop
      )
    )
  }

  const handleTimeSave = async (stop: EditableStop) => {
    if (!stop.dirty) return

    try {
      await api.patch(`/routes/poi-link/${stop.routePoiId}`, {
        travelTimeMinutes: stop.travelTimeMinutes,
      })
      setStops((prev) => prev.map((item) => (
        item.routePoiId === stop.routePoiId ? { ...item, dirty: false } : item
      )))
      showSaved('Stop timing updated')
    } catch {
      showNotice('We could not update the stop timing yet.', 'error')
    }
  }

  const handleSaveMeta = async () => {
    if (!id || !canEdit) return

    setSaving(true)
    try {
      const res = await api.patch(`/routes/${id}`, {
        name,
        description,
        mainImageUrl: mainImageUrl || undefined,
        routeType,
        locationSummary: locationSummary || undefined,
        regionLabel: regionLabel || undefined,
        primaryCountryId: primaryCountryId || undefined,
        primaryCityId: primaryCityId || undefined,
        isPublic: isPublicRoute,
        public: isPublicRoute,
        vibeTags,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        totalBudget: totalBudget ? Number(totalBudget) : undefined,
        currency: currency || undefined,
      })

      const updated: RouteResponseDTO = res.data
      setRoute(updated)
      setName(updated.name)
      setDescription(updated.description ?? '')
      setMainImageUrl(updated.mainImageUrl ?? '')
      setRouteType((updated.routeType as RouteType) || 'CUSTOM')
      setLocationSummary(updated.locationSummary ?? '')
      setRegionLabel(updated.regionLabel ?? '')
      setPrimaryCountryId(updated.primaryCountryId ?? '')
      setPrimaryCityId(updated.primaryCityId ?? '')
      setIsPublicRoute(Boolean(updated.public))
      setVibeTags(updated.vibeTags ?? [])
      setStartDate(updated.startDate ?? '')
      setEndDate(updated.endDate ?? '')
      setTotalBudget(updated.totalBudget != null ? String(updated.totalBudget) : '')
      setCurrency(updated.currency ?? 'USD')
      showSaved('Route updated')
    } catch {
      showNotice('We could not save these route details yet.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleOptimize = async () => {
    if (!id || !canEdit) return

    setOptimizing(true)
    try {
      const res = await api.post(`/routes/${id}/optimize`)
      const updated: RouteResponseDTO = res.data
      setRoute(updated)
      setStops([...updated.stops].sort((a, b) => a.orderIndex - b.orderIndex))
      showSaved('Route optimized')
    } catch {
      showNotice('We could not optimize this route right now.', 'error')
    } finally {
      setOptimizing(false)
    }
  }

  const handlePreviewImport = async () => {
    if (!importUrl.trim()) return

    setImporting(true)
    try {
      const response = await api.post('/routes/import/google-maps/preview', { url: importUrl.trim() })
      setImportPreview(response.data)
    } catch (error: unknown) {
      const responseMessage = typeof error === 'object' && error !== null && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined
      showNotice(responseMessage || 'We could not read this Google Maps link yet.', 'error')
    } finally {
      setImporting(false)
    }
  }

  const handleApplyImport = async () => {
    if (!id || !importPreview) return

    const resolved = importPreview.stops.filter((stop) => stop.resolved && stop.latitude != null && stop.longitude != null)
    if (resolved.length === 0) {
      showNotice('This link does not expose importable coordinates yet.', 'error')
      return
    }

    setImporting(true)
    try {
      for (const stop of resolved) {
        await api.post(`/routes/${id}/poi`, {
          customName: stop.name,
          customLatitude: stop.latitude,
          customLongitude: stop.longitude,
          travelTimeMinutes: 30,
        })
      }

      const routeRes = await api.get(`/routes/${id}`)
      const updated: RouteResponseDTO = routeRes.data
      setRoute(updated)
      setStops([...updated.stops].sort((a, b) => a.orderIndex - b.orderIndex))
      setImportUrl('')
      setImportPreview(null)
      showSaved(`Imported ${resolved.length} stop${resolved.length === 1 ? '' : 's'}`)
    } catch {
      showNotice('We could not import these Google Maps stops yet.', 'error')
    } finally {
      setImporting(false)
    }
  }

  if (loading) {
    return <PageSkeleton rows={5} />
  }

  if (!route) return null

  if (!canEdit) {
    return (
      <div className="app-shell flex flex-1 items-center justify-center px-4">
        <div className="text-center">
          <p className="mb-4 text-sm text-slate-500 dark:text-white/30">You do not have edit access to this route.</p>
          <button onClick={() => navigate(-1)} className="app-back-link">
            Back
          </button>
        </div>
      </div>
    )
  }

  const metaChanged =
    name !== route.name ||
    description !== (route.description ?? '') ||
    mainImageUrl !== (route.mainImageUrl ?? '') ||
    routeType !== ((route.routeType as RouteType) ?? 'CUSTOM') ||
    locationSummary !== (route.locationSummary ?? '') ||
    regionLabel !== (route.regionLabel ?? '') ||
    primaryCountryId !== (route.primaryCountryId ?? '') ||
    primaryCityId !== (route.primaryCityId ?? '') ||
    isPublicRoute !== Boolean(route.public) ||
    JSON.stringify(vibeTags) !== JSON.stringify(route.vibeTags ?? []) ||
    startDate !== (route.startDate ?? '') ||
    endDate !== (route.endDate ?? '') ||
    totalBudget !== (route.totalBudget != null ? String(route.totalBudget) : '') ||
    currency !== (route.currency ?? 'USD')
  const hiddenStopCount = stops.filter((stop) => stop.isGlobal === false || stop.category === 'Custom').length
  const routeLocationLabel = locationSummary || cities.find((city) => city.id === primaryCityId)?.name || countries.find((country) => country.id === primaryCountryId)?.name || 'Route location'
  const editorReadiness = [
    { label: 'Title', done: name.trim().length > 0 },
    { label: 'Location', done: locationSummary.trim().length > 0 || Boolean(primaryCityId || primaryCountryId || regionLabel.trim()) },
    { label: 'Stops', done: stops.length >= 3 },
    { label: 'Cover', done: mainImageUrl.trim().length > 0 || Boolean(stops[0]?.mainImageUrl || stops[0]?.imageUrl) },
  ]
  const editorReadyCount = editorReadiness.filter((item) => item.done).length

  return (
    <div className="app-shell flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => navigate(`/route/${id}`)} className="app-back-link">
            <span>&lt;</span>
            Back to route
          </button>

          <span className={`app-status-text transition-opacity ${savedMsg ? 'opacity-100' : 'opacity-0'}`}>
            {savedMsg || 'saved'}
          </span>
        </div>

        <RouteWorkspaceNav routeId={id!} />

        <AppNotice notice={notice} onDismiss={() => setNotice(null)} />

        <section className="grid gap-4 md:grid-cols-5">
          <div className="app-card p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Stops</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{route.stops?.length || 0}</div>
          </div>
          <div className="app-card p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Distance</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{route.totalDistanceKm ?? 0} km</div>
          </div>
          <div className="app-card p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Duration</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{formatMinutes(route.totalDurationMinutes)}</div>
          </div>
          <div className="app-card p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Budget</div>
            <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{formatBudget(route.totalBudget, route.currency)}</div>
          </div>
          <div className="app-card p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Optimizer</div>
            <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
              {route.isOptimized ? 'Optimized' : 'Original order'}
            </div>
          </div>
        </section>

        <section className="app-panel overflow-hidden p-0">
          <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="relative min-h-[280px] overflow-hidden">
              {mainImageUrl || route.mainImageUrl || stops[0]?.mainImageUrl || stops[0]?.imageUrl ? (
                <img
                  src={mainImageUrl || route.mainImageUrl || stops[0]?.mainImageUrl || stops[0]?.imageUrl}
                  alt={name || route.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-[linear-gradient(135deg,#bae6fd_0%,#e0f2fe_42%,#fde68a_100%)] dark:bg-[linear-gradient(135deg,#12213b_0%,#0f172a_52%,#115e59_100%)]" />
              )}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(0,0,0,0.05)_0%,_rgba(15,23,42,0.68)_100%)] dark:bg-[linear-gradient(180deg,_rgba(0,0,0,0.08)_0%,_rgba(0,0,0,0.86)_100%)]" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/28 bg-white/80 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-700 dark:border-white/12 dark:bg-black/26 dark:text-cyan-100/82">
                    {ROUTE_TYPES.find((item) => item.value === routeType)?.label || 'Route'}
                  </span>
                  <span className="rounded-full border border-white/16 bg-black/18 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/78">
                    {routeLocationLabel}
                  </span>
                </div>
                <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">{name || 'Untitled route'}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/78">
                  {truncateCopy(description) || 'Shape the route so its pacing, place mix, and hidden layer all feel intentional.'}
                </p>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <div className="app-kicker">Editor status</div>
                <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">Keep the route clear before you fine-tune details.</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/46">
                  Strong routes usually need a clear title, a real place anchor, enough stops to feel complete, and one image that sets the tone.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {editorReadiness.map((item) => (
                  <span
                    key={item.label}
                    className={`rounded-full border px-3 py-2 text-[11px] ${
                      item.done
                        ? 'border-teal-500/16 bg-teal-50 text-teal-700 dark:border-cyan-300/18 dark:bg-cyan-300/10 dark:text-cyan-100'
                        : 'border-slate-200 bg-white text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/42'
                    }`}
                  >
                    {item.label}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="app-card p-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Ready</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{editorReadyCount}/4</div>
                </div>
                <div className="app-card p-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Hidden</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{hiddenStopCount}</div>
                </div>
                <div className="app-card p-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Changes</div>
                  <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{metaChanged ? 'Unsaved' : 'Up to date'}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button onClick={() => navigate(`/route/${id}`)} className="app-button app-button-secondary">
                  Open route
                </button>
                <button onClick={() => navigate(`/route/${id}/journal`)} className="app-button app-button-secondary">
                  Open journal
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="app-panel space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="app-kicker">Route setup</div>
              <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">Name, vibe, trip window, and budget</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => navigate(`/route/${id}/budget`)} className="app-button app-button-secondary">
                Open budget
              </button>
              {route.numberOfDays && route.numberOfDays > 0 ? (
                <button onClick={() => navigate(`/route/${id}/itinerary`)} className="app-button app-button-primary">
                  Open itinerary
                </button>
              ) : null}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] text-slate-500 dark:text-white/34">Route name</label>
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} className="app-input" />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] text-slate-500 dark:text-white/34">Description</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={1000}
              rows={4}
              className="app-textarea"
            />
          </div>

          <div>
            <ImageSourceField
              label="Cover image"
              value={mainImageUrl}
              onChange={setMainImageUrl}
              placeholder="Paste a cover image URL"
              helperText="Own uploads are compressed before saving, so the route can keep a strong cover without getting too heavy."
            />
          </div>

          <div>
            <label className="mb-2 block text-[11px] text-slate-500 dark:text-white/34">Route type</label>
            <div className="grid gap-2 md:grid-cols-2">
              {ROUTE_TYPES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRouteType(option.value)}
                  className={`rounded-[20px] border px-4 py-3 text-left transition-all ${
                    routeType === option.value
                      ? 'border-teal-500/24 bg-teal-50 text-teal-700 dark:border-cyan-300/24 dark:bg-cyan-300/10 dark:text-cyan-100'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/60 dark:hover:border-white/16 dark:hover:text-white'
                  }`}
                >
                  <div className="text-sm font-medium">{option.label}</div>
                  <div className="mt-1 text-xs opacity-70">{option.hint}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[11px] text-slate-500 dark:text-white/34">Country</label>
              <select
                value={primaryCountryId}
                onChange={(event) => setPrimaryCountryId(event.target.value ? Number(event.target.value) : '')}
                className="app-input"
              >
                <option value="">No primary country</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] text-slate-500 dark:text-white/34">City</label>
              <select
                value={primaryCityId}
                onChange={(event) => setPrimaryCityId(event.target.value ? Number(event.target.value) : '')}
                className="app-input"
                disabled={!primaryCountryId || cities.length === 0}
              >
                <option value="">{primaryCountryId ? 'No primary city' : 'Choose a country first'}</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[11px] text-slate-500 dark:text-white/34">Location summary</label>
              <input
                value={locationSummary}
                onChange={(event) => setLocationSummary(event.target.value)}
                maxLength={255}
                placeholder="Paris, France"
                className="app-input"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] text-slate-500 dark:text-white/34">Region label</label>
              <input
                value={regionLabel}
                onChange={(event) => setRegionLabel(event.target.value)}
                maxLength={120}
                placeholder="Left Bank highlights"
                className="app-input"
              />
            </div>
          </div>

          <label className="flex items-center justify-between gap-3 rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/72">
            <div>
              <div className="font-medium">Public route</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-white/40">Visible in discovery and shareable with other travelers.</div>
            </div>
            <button
              type="button"
              onClick={() => setIsPublicRoute((value) => !value)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all ${
                isPublicRoute ? 'bg-teal-600 dark:bg-cyan-400' : 'bg-slate-300 dark:bg-white/16'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${
                  isPublicRoute ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[11px] text-slate-500 dark:text-white/34">Start date</label>
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="app-input" />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] text-slate-500 dark:text-white/34">End date</label>
              <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="app-input" />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px]">
            <div>
              <label className="mb-1.5 block text-[11px] text-slate-500 dark:text-white/34">Total budget</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={totalBudget}
                onChange={(event) => setTotalBudget(event.target.value)}
                placeholder="2000"
                className="app-input"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] text-slate-500 dark:text-white/34">Currency</label>
              <input
                value={currency}
                onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                maxLength={8}
                placeholder="USD"
                className="app-input"
              />
            </div>
          </div>

          <VibeTagField tags={vibeTags} onChange={setVibeTags} />

          <div className="grid gap-3 md:grid-cols-2">
            <button
              onClick={handleSaveMeta}
              disabled={saving || !metaChanged}
              className="app-button app-button-primary w-full rounded-[20px]"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            <button
              onClick={handleOptimize}
              disabled={optimizing || stops.length < 2}
              className="app-button app-button-secondary w-full rounded-[20px]"
            >
              {optimizing ? 'Optimizing route...' : 'Optimize route'}
            </button>
          </div>
        </section>

        <section className="app-panel space-y-4 p-5">
          <div>
            <div className="app-kicker">Google Maps import</div>
            <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">Pull stops from a Google Maps link</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/46">
              Best results come from full `google.com/maps` direction or place links that already expose waypoints or pin coordinates.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
            <textarea
              value={importUrl}
              onChange={(event) => setImportUrl(event.target.value)}
              rows={3}
              placeholder="Paste a Google Maps link"
              className="app-textarea"
            />
            <button
              onClick={() => void handlePreviewImport()}
              disabled={importing || !importUrl.trim()}
              className="app-button app-button-primary h-full rounded-[20px]"
            >
              {importing ? 'Parsing link...' : 'Preview import'}
            </button>
          </div>

          {importPreview ? (
            <div className="space-y-3 rounded-[22px] border border-slate-200 bg-white/72 p-4 dark:border-white/[0.08] dark:bg-black/18">
              <div className="text-sm text-slate-700 dark:text-white/72">{importPreview.summary}</div>
              {importPreview.warnings.length > 0 ? (
                <div className="rounded-[18px] border border-amber-300/26 bg-amber-50 px-4 py-3 text-xs text-amber-700 dark:border-amber-300/18 dark:bg-amber-300/10 dark:text-amber-100/82">
                  {importPreview.warnings.join(' ')}
                </div>
              ) : null}

              <div className="space-y-2">
                {importPreview.stops.map((stop, index) => (
                  <div
                    key={`${stop.name}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-[18px] border border-slate-200 bg-white px-4 py-3 dark:border-white/[0.08] dark:bg-white/[0.03]"
                  >
                    <div>
                      <div className="text-sm text-slate-900 dark:text-white">{stop.name}</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-white/40">
                        {stop.sourceLabel}{stop.note ? ` / ${stop.note}` : ''}
                      </div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em] ${stop.resolved ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-300/12 dark:text-emerald-100' : 'bg-slate-100 text-slate-500 dark:bg-white/[0.04] dark:text-white/46'}`}>
                      {stop.resolved ? 'Ready' : 'Needs review'}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => void handleApplyImport()}
                disabled={importing || importPreview.stops.every((stop) => !stop.resolved)}
                className="app-button app-button-primary w-full rounded-[20px]"
              >
                {importing ? 'Importing stops...' : 'Add resolved stops to route'}
              </button>
            </div>
          ) : null}
        </section>

        <section className="app-panel p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="app-kicker">Stops</div>
              <p className="mt-1 text-xs text-slate-500 dark:text-white/40">
                Drag to reorder, adjust stay time, and remove unnecessary stops.
              </p>
            </div>
            <span className="text-xs text-slate-500 dark:text-white/34">{formatMinutes(route.totalDurationMinutes)}</span>
          </div>

          {stops.length === 0 ? (
            <div className="app-empty-state px-4 py-8 text-center text-sm">
              No stops yet.
            </div>
          ) : (
            <div className="space-y-2">
              {stops.map((stop, idx) => {
                const isCustom = stop.category === 'Custom'
                return (
                  <div
                    key={stop.routePoiId}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragEnter={() => handleDragEnter(idx)}
                    onDragEnd={() => void handleDragEnd()}
                    onDragOver={(event) => event.preventDefault()}
                    className="flex items-center gap-3 rounded-[20px] border border-slate-200 bg-white p-3 transition-all hover:border-slate-300 dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-white/14"
                  >
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white ${isCustom ? 'bg-violet-500' : 'bg-teal-600 dark:bg-cyan-500 dark:text-[#06202a]'}`}>
                      {idx + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                        {(stop.mainImageUrl || stop.imageUrl) ? (
                          <div className="h-20 w-full overflow-hidden rounded-[16px] bg-slate-100 sm:w-24 dark:bg-[#0b1220]">
                            <img src={stop.mainImageUrl || stop.imageUrl} alt={stop.name} className="h-full w-full object-cover" />
                          </div>
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{stop.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-white/38">
                            <span>{isCustom ? 'Hidden place' : stop.category}</span>
                            {stop.cityName ? <><span>/</span><span>{stop.cityName}</span></> : null}
                            {typeof stop.distanceFromPrevious === 'number' && idx > 0 ? <><span>/</span><span>{stop.distanceFromPrevious} km from previous</span></> : null}
                          </div>
                          {stop.description ? <p className="mt-2 text-xs leading-6 text-slate-600 dark:text-white/50">{truncateCopy(stop.description, 120)}</p> : null}
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-white/38">
                            <span>Stay time</span>
                            <input
                              type="number"
                              min={0}
                              max={480}
                              value={stop.travelTimeMinutes ?? 0}
                              onChange={(event) => handleTimeChange(stop.routePoiId, parseInt(event.target.value, 10) || 0)}
                              onBlur={() => void handleTimeSave(stop)}
                              className="w-14 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-center text-[11px] text-slate-700 outline-none dark:border-cyan-300/18 dark:bg-black/18 dark:text-cyan-100"
                            />
                            <span>min</span>
                            {stop.dirty ? <span className="text-amber-600 dark:text-amber-300/80">pending</span> : null}
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => void handleRemoveStop(stop)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-red-500/10 hover:text-red-500 dark:text-white/20 dark:hover:text-red-300"
                    >
                      x
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {isOwner ? (
          <button
            onClick={() => {
              setConfirmDialog({
                title: 'Delete this route?',
                description: 'This will remove the route, its structure, and the work attached to it. This action cannot be undone.',
                confirmLabel: 'Delete route',
                danger: true,
                onConfirm: async () => {
                  try {
                    await api.delete(`/routes/${id}`)
                    navigate('/profile')
                  } catch {
                    showNotice('We could not delete this route right now.', 'error')
                  }
                },
              })
            }}
            className="app-button app-button-danger w-full rounded-[20px]"
          >
            Delete route
          </button>
        ) : null}
      </div>

      <AppConfirmDialog dialog={confirmDialog} onClose={() => setConfirmDialog(null)} />
    </div>
  )
}

