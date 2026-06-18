import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../api/axios'
import PageSkeleton from '../components/PageSkeleton'
import RouteCard from '../components/RouteCard'
import AiRouteModal from '../components/AiRouteModal'
import type { User } from '../components/AuthModal'
import type { CityDTO } from '../types/location'
import type { PoiResponseDTO, RouteResponseDTO } from '../types/route'
import type { WeatherOverviewDTO } from '../types/weather'
import { asArray } from '../utils/apiResponse'

interface CityPageProps {
  currentUser: User | null
  onLoginRequest: () => void
}

const placeholder = 'linear-gradient(135deg, #13263c 0%, #0f172a 52%, #115e59 100%)'

function formatMinutes(totalMinutes?: number) {
  if (!totalMinutes || totalMinutes <= 0) return '—'
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const LANDMARK_CATEGORIES = new Set(['Landmark', 'Museum', 'Religious'])
const SLOW_CATEGORIES = new Set(['Cafe', 'Viewpoint', 'Park'])

function truncateCopy(value: string | undefined, maxLength = 148) {
  if (!value) return null
  const normalized = value.trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength).trimEnd()}...`
}

function formatRouteTypeLabel(value: RouteResponseDTO['routeType']) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function ImageOrPlaceholder({
  src,
  alt,
  className,
}: {
  src?: string
  alt: string
  className?: string
}) {
  if (src) {
    return <img src={src} alt={alt} className={className} />
  }

  return <div className={className} style={{ background: placeholder }} />
}

function PlaceCard({
  poi,
  eyebrow,
}: {
  poi: PoiResponseDTO
  eyebrow: string
}) {
  return (
    <article className="overflow-hidden rounded-[26px] border border-slate-200 bg-white transition-all hover:border-slate-300 dark:border-white/[0.08] dark:bg-[#0f1117]/88 dark:hover:border-white/16">
      <div className="h-40 overflow-hidden bg-slate-100 dark:bg-[#0b1220]">
        <ImageOrPlaceholder
          src={poi.mainImageUrl}
          alt={poi.name}
          className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
        />
      </div>
      <div className="p-4">
        <div className="text-[10px] uppercase tracking-[0.24em] text-teal-700 dark:text-cyan-100/66">{eyebrow}</div>
        <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{poi.name}</h3>
        <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-white/42">{poi.address || poi.cityName || poi.category}</p>
        {poi.description && <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-white/52">{poi.description}</p>}
      </div>
    </article>
  )
}

function CityStat({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 dark:border-white/[0.08] dark:bg-black/18">
      <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400 dark:text-white/24">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{value}</div>
    </div>
  )
}

export default function CityPage({ currentUser, onLoginRequest }: CityPageProps) {
  const { id } = useParams<{ id: string }>()
  const [city, setCity] = useState<CityDTO | null>(null)
  const [routes, setRoutes] = useState<RouteResponseDTO[]>([])
  const [pois, setPois] = useState<PoiResponseDTO[]>([])
  const [weather, setWeather] = useState<WeatherOverviewDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [osmImporting, setOsmImporting] = useState(false)
  const [osmResult, setOsmResult] = useState<{ imported: number; total: number } | null>(null)
  const [showAiModal, setShowAiModal] = useState(false)

  const loadCity = useEffectEvent(async () => {
    if (!id) return

    const [cityResponse, routesResponse, poisResponse, weatherResponse] = await Promise.all([
      api.get(`/cities/${id}`),
      api.get(`/cities/${id}/routes`),
      api.get(`/pois/global/city/${id}`),
      api.get(`/cities/${id}/weather`).catch(() => ({ data: null })),
    ])

    setCity(cityResponse.data)
    setRoutes(asArray<RouteResponseDTO>(routesResponse.data))
    const loadedPois: PoiResponseDTO[] = poisResponse.data || []
    setPois(loadedPois)
    setWeather(weatherResponse.data)

    if (loadedPois.length === 0 && currentUser) {
      setOsmImporting(true)
      try {
        const res = await api.post(`/osm/import/city/${id}`)
        setOsmResult({ imported: res.data.imported, total: res.data.total })
        const freshPois = await api.get(`/pois/global/city/${id}`)
        setPois(freshPois.data || [])
      } catch (e) {
        console.warn('[OSM] Auto-import failed:', e)
      } finally {
        setOsmImporting(false)
      }
    }
  })

  const handleManualImport = async () => {
    if (!id || osmImporting) return
    setOsmImporting(true)
    setOsmResult(null)
    try {
      const res = await api.post(`/osm/import/city/${id}`)
      setOsmResult({ imported: res.data.imported, total: res.data.total })
      const freshPois = await api.get(`/pois/global/city/${id}`)
      setPois(freshPois.data || [])
    } catch (e) {
      console.warn('[OSM] Manual import failed:', e)
    } finally {
      setOsmImporting(false)
    }
  }

  useEffect(() => {
    if (!id) return

    void loadCity()
      .finally(() => setLoading(false))
  }, [id])

  const leadRoute = routes[0] ?? null
  const routeGrid = leadRoute ? routes.slice(1) : routes
  const rankedRoutes = useMemo(() => {
    return [...routes]
      .sort((a, b) => {
        const likeDelta = (b.likeCounts ?? 0) - (a.likeCounts ?? 0)
        if (likeDelta !== 0) return likeDelta

        const stopDelta = (b.stops?.length ?? b.totalPoints ?? 0) - (a.stops?.length ?? a.totalPoints ?? 0)
        if (stopDelta !== 0) return stopDelta

        return (a.name || '').localeCompare(b.name || '')
      })
      .slice(0, 5)
  }, [routes])

  const landmarkPois = useMemo(() => {
    const preferred = pois.filter((poi) => LANDMARK_CATEGORIES.has(poi.category))
    return (preferred.length > 0 ? preferred : pois).slice(0, 4)
  }, [pois])

  const slowPois = useMemo(() => {
    const preferred = pois.filter((poi) => SLOW_CATEGORIES.has(poi.category))
    return preferred.slice(0, 4)
  }, [pois])

  const categoryBreakdown = useMemo(() => {
    const counts = new Map<string, number>()

    for (const poi of pois) {
      const key = poi.category || 'Place'
      counts.set(key, (counts.get(key) || 0) + 1)
    }

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
  }, [pois])
  const cityBrief = truncateCopy(city?.description)

  if (loading) {
    return <PageSkeleton rows={4} hasHero />
  }

  if (!city) return null

  return (
    <div className="app-shell flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <section className="glass-surface-strong overflow-hidden rounded-[36px]">
          <div className="relative min-h-[440px] overflow-hidden">
            <ImageOrPlaceholder src={city.imageUrl} alt={city.name} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(255,255,255,0.02)_0%,_rgba(15,23,42,0.18)_24%,_rgba(15,23,42,0.78)_100%)] dark:bg-[linear-gradient(180deg,_rgba(0,0,0,0.1)_0%,_rgba(0,0,0,0.18)_24%,_rgba(0,0,0,0.88)_100%)]" />
            <div className="absolute left-0 right-0 top-0 p-6 sm:p-8">
              <div className="flex items-center gap-2 text-sm text-white/52">
                {city.countryId && (
                  <Link to={`/countries/${city.countryId}`} className="transition-colors hover:text-white">
                    {city.countryName}
                  </Link>
                )}
                <span>/</span>
                <span>{city.name}</span>
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
              <div className="max-w-4xl">
                <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-100/82">
                  {city.countryName || 'City guide'}
                </div>
                <h1 className="mt-3 font-serif text-4xl leading-none text-white sm:text-6xl">{city.name}</h1>
                <p className="mt-4 max-w-2xl text-sm leading-8 text-white/56">
                  {city.description ||
                    'This page should feel like opening the city itself: iconic anchors first, quieter local stops after that, and routes that connect both into something memorable.'}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to="/"
                    className="rounded-full border border-white/28 bg-white/84 px-5 py-3 text-sm text-slate-700 transition-all hover:border-white hover:text-slate-900 dark:border-white/[0.08] dark:bg-black/18 dark:text-white/68 dark:hover:border-white/16 dark:hover:text-white"
                  >
                    Back to explore
                  </Link>
                  <Link
                    to={`/map?city=${city.id}`}
                    className="rounded-full border border-cyan-300/26 bg-cyan-300/12 px-5 py-3 text-sm font-medium text-cyan-100 transition-all hover:border-cyan-200/40 hover:bg-cyan-300/16"
                  >
                    Open city on map
                  </Link>
                  {osmImporting ? (
                    <span className="flex items-center gap-2 rounded-full border border-cyan-300/26 bg-cyan-300/10 px-5 py-3 text-sm text-cyan-100">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                      </svg>
                      Loading places from OpenStreetMap…
                    </span>
                  ) : osmResult ? (
                    <span className="rounded-full border border-teal-400/30 bg-teal-400/10 px-5 py-3 text-sm text-teal-100">
                      ✓ {osmResult.imported} new places added · {osmResult.total} total
                    </span>
                  ) : (
                    <span className="rounded-full border border-white/28 bg-white/84 px-5 py-3 text-sm text-slate-700 dark:border-white/[0.08] dark:bg-black/18 dark:text-white/62">
                      {pois.length} places
                    </span>
                  )}
                  {currentUser && !osmImporting && (
                    <button
                      onClick={() => void handleManualImport()}
                      className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm text-white/70 transition-all hover:border-white/36 hover:bg-white/16 hover:text-white"
                    >
                      ↻ Refresh places
                    </button>
                  )}
                  {currentUser && pois.length > 0 && (
                    <button
                      onClick={() => setShowAiModal(true)}
                      className="rounded-full border border-violet-400/36 bg-violet-500/14 px-5 py-3 text-sm font-medium text-violet-200 transition-all hover:border-violet-300/50 hover:bg-violet-500/20 hover:text-white"
                    >
                      ✨ Generate with AI
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className="app-panel p-6">
            <div className="text-[11px] uppercase tracking-[0.3em] text-teal-700 dark:text-cyan-100/72">City overview</div>
            <h2 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">A calmer hub before the route even starts.</h2>
            <p className="mt-4 text-sm leading-8 text-slate-600 dark:text-white/50">
              Start with reliable landmarks, layer in slower neighborhood picks, and use routes only when the place
              already feels legible.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <CityStat label="Routes" value={city.routesCount || routes.length} />
              <CityStat label="POI" value={city.poiCount || pois.length} />
            </div>

            <div className="mt-6 rounded-[24px] border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-black/18">
              <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400 dark:text-white/24">Best next move</div>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-white/52">
                {cityBrief ||
                  `Use ${city.name} as a city-first discovery layer: understand the anchors here, then move into the map once the route starts to feel obvious.`}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to="/map"
                  className="rounded-full border border-cyan-300/24 bg-cyan-300/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-cyan-100 transition-all hover:border-cyan-200/40 hover:bg-cyan-300/14"
                >
                  Open map
                </Link>
                {city.countryId && (
                  <Link
                    to={`/countries/${city.countryId}`}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-700 transition-all hover:border-slate-300 hover:text-slate-900 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/72 dark:hover:border-white/16 dark:hover:text-white"
                  >
                    Open country
                  </Link>
                )}
              </div>
            </div>

            {categoryBreakdown.length > 0 && (
              <div className="mt-6 border-t border-slate-200 pt-5 dark:border-white/[0.06]">
                <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400 dark:text-white/28">Local mix</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {categoryBreakdown.map(([label, count]) => (
                    <span
                      key={label}
                      className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 dark:border-white/[0.08] dark:bg-black/18 dark:text-white/64"
                    >
                      {label} {count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {weather ? (
              <div className="mt-6 border-t border-slate-200 pt-5 dark:border-white/[0.06]">
                <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400 dark:text-white/28">Weather snapshot</div>
                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-white/50">{weather.summary}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {weather.days.slice(0, 2).map((day) => (
                    <div key={day.date} className="rounded-[20px] border border-slate-200 bg-white px-4 py-4 dark:border-white/[0.08] dark:bg-black/18">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">{day.date}</div>
                      <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{day.condition}</div>
                      <div className="mt-2 text-xs text-slate-500 dark:text-white/52">{day.lowTempC}C to {day.highTempC}C</div>
                      <div className="mt-1 text-[11px] text-slate-500 dark:text-white/38">Rain {day.precipitationChance}% / Wind {day.windKph} kph</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {leadRoute ? (
            <div className="app-panel p-5">
              <div className="mb-4">
                <div className="text-[11px] uppercase tracking-[0.3em] text-teal-700 dark:text-cyan-100/72">Lead route</div>
                <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">A strong first route for {city.name}.</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/42">
                  This is the route that should make the city feel instantly usable, not just beautiful.
                </p>
              </div>
              <RouteCard route={leadRoute} currentUser={currentUser} onLoginRequest={onLoginRequest} />
            </div>
          ) : (
            <div className="app-empty-state rounded-[32px] px-6 py-12 text-center text-sm">
              No public routes are linked to this city yet. The city layer is ready, but it still needs its first strong route.
            </div>
          )}
        </section>

        {rankedRoutes.length > 0 && (
          <section className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="app-panel p-6">
              <div className="text-[11px] uppercase tracking-[0.3em] text-teal-700 dark:text-cyan-100/72">City route ranking</div>
              <h2 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">The routes people should open first in {city.name}.</h2>
              <p className="mt-4 text-sm leading-8 text-slate-600 dark:text-white/50">
                This is the simpler list layer you wanted: strongest public routes first, with enough detail to compare before opening one.
              </p>
            </div>

            <div className="space-y-3">
              {rankedRoutes.map((route, index) => (
                <Link
                  key={route.id}
                  to={`/route/${route.id}`}
                  className="group grid gap-4 rounded-[28px] border border-slate-200 bg-white/86 p-4 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)] dark:border-white/[0.08] dark:bg-[#0f1117]/86 dark:hover:border-white/16"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-teal-50 text-lg font-semibold text-teal-700 dark:bg-cyan-300/10 dark:text-cyan-100">
                      {index + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{route.name}</h3>
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/42">
                          {formatRouteTypeLabel(route.routeType)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/52">
                        {truncateCopy(route.description, 170) ||
                          `${route.locationSummary || city.name} route with enough structure to use as a real starting point.`}
                      </p>
                    </div>

                    <div className="grid flex-shrink-0 grid-cols-3 gap-2 sm:w-[240px]">
                      <div className="rounded-[18px] border border-slate-200 bg-white px-3 py-3 text-center dark:border-white/[0.08] dark:bg-black/18">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Likes</div>
                        <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{route.likeCounts ?? 0}</div>
                      </div>
                      <div className="rounded-[18px] border border-slate-200 bg-white px-3 py-3 text-center dark:border-white/[0.08] dark:bg-black/18">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Stops</div>
                        <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                          {route.stops?.length ?? route.totalPoints ?? 0}
                        </div>
                      </div>
                      <div className="rounded-[18px] border border-slate-200 bg-white px-3 py-3 text-center dark:border-white/[0.08] dark:bg-black/18">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Flow</div>
                        <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{formatMinutes(route.totalDurationMinutes)}</div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {landmarkPois.length > 0 && (
          <section className="space-y-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.3em] text-teal-700 dark:text-cyan-100/72">Top landmarks</div>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">Recognizable anchors for {city.name}.</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {landmarkPois.map((poi) => (
                <PlaceCard key={poi.id} poi={poi} eyebrow={poi.category || 'Landmark'} />
              ))}
            </div>
          </section>
        )}

        {slowPois.length > 0 && (
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_320px]">
            <div className="space-y-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.3em] text-teal-700 dark:text-cyan-100/72">Slower city picks</div>
                <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">The less obvious side of {city.name}.</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {slowPois.map((poi) => (
                  <PlaceCard key={poi.id} poi={poi} eyebrow={poi.category || 'Place'} />
                ))}
              </div>
            </div>

            <div className="app-panel p-6">
              <div className="text-[11px] uppercase tracking-[0.3em] text-teal-700 dark:text-cyan-100/72">How to use it</div>
              <h3 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">Use the city page as a briefing, not the final tool.</h3>
              <p className="mt-4 text-sm leading-8 text-slate-600 dark:text-white/50">
                Browse the city here, then jump to the map builder once you know which anchors and slower stops should
                shape the route.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  to={`/map?city=${city.id}`}
                  className="rounded-full border border-cyan-300/24 bg-cyan-300/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-cyan-100 transition-all hover:border-cyan-200/40 hover:bg-cyan-300/14"
                >
                  Build on map
                </Link>
                {leadRoute && (
                  <Link
                    to={`/route/${leadRoute.id}`}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-700 transition-all hover:border-slate-300 hover:text-slate-900 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/72 dark:hover:border-white/16 dark:hover:text-white"
                  >
                    Open lead route
                  </Link>
                )}
              </div>

              <div className="mt-6 space-y-3">
                <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 dark:border-white/[0.08] dark:bg-black/18">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400 dark:text-white/24">1. Start with anchors</div>
                  <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/50">Pick landmarks that define the city immediately.</p>
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 dark:border-white/[0.08] dark:bg-black/18">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400 dark:text-white/24">2. Add slower spots</div>
                  <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/50">Cafes, parks, and viewpoints stop the route from feeling generic.</p>
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 dark:border-white/[0.08] dark:bg-black/18">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400 dark:text-white/24">3. Build your own layer</div>
                  <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/50">Secret places are what make the final route feel personal.</p>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="grid gap-4 lg:grid-cols-3">
          {[
            {
              label: '1. Read the city',
              copy: 'Use landmarks and the city overview to understand the basic shape before you start moving points on a map.',
            },
            {
              label: '2. Keep the quiet layer',
              copy: 'Viewpoints, parks, cafes, and hidden places are what stop the route from feeling like a checklist.',
            },
            {
              label: '3. Build once it feels legible',
              copy: 'The map is strongest after the city already makes sense, not before.',
            },
          ].map((item) => (
            <div key={item.label} className="app-panel p-5">
              <div className="text-[10px] uppercase tracking-[0.24em] text-teal-700 dark:text-cyan-100/72">{item.label}</div>
              <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-white/52">{item.copy}</p>
            </div>
          ))}
        </section>

        {routeGrid.length > 0 && (
          <section className="space-y-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.3em] text-teal-700 dark:text-cyan-100/72">Route ideas</div>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">Different ways to move through {city.name}.</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {routeGrid.map((route) => (
                <RouteCard key={route.id} route={route} currentUser={currentUser} onLoginRequest={onLoginRequest} />
              ))}
            </div>
          </section>
        )}
      </div>

      {showAiModal && city && (
        <AiRouteModal
          cityId={city.id}
          cityName={city.name}
          onClose={() => setShowAiModal(false)}
        />
      )}
    </div>
  )
}
