import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import type { ContinentDTO, CountryDTO, CityDTO } from '../types/location'
import type { RouteResponseDTO } from '../types/route'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ROUTE_TYPE_LABELS: Record<string, string> = {
  CITY: 'City walk',
  REGION: 'Regional',
  MULTI_CITY: 'Multi-city',
  ROAD_TRIP: 'Road trip',
  CUSTOM: 'Custom',
}

const TYPE_PILL: Record<string, string> = {
  CITY: 'border-sky-300/60 bg-sky-50 text-sky-700 dark:border-sky-400/25 dark:bg-sky-400/12 dark:text-sky-300',
  REGION: 'border-teal-300/60 bg-teal-50 text-teal-700 dark:border-teal-400/25 dark:bg-teal-400/12 dark:text-teal-300',
  MULTI_CITY: 'border-violet-300/60 bg-violet-50 text-violet-700 dark:border-violet-400/25 dark:bg-violet-400/12 dark:text-violet-300',
  ROAD_TRIP: 'border-amber-300/60 bg-amber-50 text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/12 dark:text-amber-300',
  CUSTOM: 'border-stone-200 bg-stone-50 text-stone-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/50',
}

// Each continent gets a distinct look as a fallback if no image
const CONTINENT_GRADIENTS: Record<string, string> = {
  EU: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 50%, #0f766e 100%)',
  AS: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 50%, #ca8a04 100%)',
  NA: 'linear-gradient(135deg, #14532d 0%, #16a34a 50%, #0e7490 100%)',
  SA: 'linear-gradient(135deg, #4a044e 0%, #9333ea 50%, #0f766e 100%)',
  AF: 'linear-gradient(135deg, #78350f 0%, #d97706 50%, #dc2626 100%)',
  OC: 'linear-gradient(135deg, #0c4a6e 0%, #0ea5e9 50%, #14b8a6 100%)',
  AN: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #64748b 100%)',
}
const FALLBACK_GRADIENT = 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #0f766e 100%)'

function getCardGradient(nameOrCode: string) {
  const code = nameOrCode.toUpperCase().slice(0, 2)
  return CONTINENT_GRADIENTS[code] ?? FALLBACK_GRADIENT
}

function getRouteGradient(name: string) {
  const gs = [
    'linear-gradient(135deg,#bae6fd 0%,#e0f2fe 45%,#fef3c7 100%)',
    'linear-gradient(135deg,#dbeafe 0%,#ecfeff 52%,#fde68a 100%)',
    'linear-gradient(135deg,#e0f2fe 0%,#f0fdfa 60%,#fde68a 100%)',
    'linear-gradient(135deg,#fef3c7 0%,#fde68a 35%,#bfdbfe 100%)',
    'linear-gradient(135deg,#f0fdf4 0%,#dcfce7 40%,#bfdbfe 100%)',
  ]
  return gs[name.charCodeAt(0) % gs.length]
}

// ─────────────────────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────────────────────

function HeartIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function ChevronRight({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

function MapPinIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// RankBadge
// ─────────────────────────────────────────────────────────────────────────────

function RankBadge({ rank, large = false }: { rank: number; large?: boolean }) {
  const size = large ? 'h-8 w-8 text-sm' : 'h-6 w-6 text-[11px]'
  if (rank === 1)
    return <span className={`flex flex-shrink-0 items-center justify-center rounded-full bg-amber-400 font-bold text-amber-900 shadow-[0_0_0_2px_rgba(251,191,36,0.28)] ${size}`}>1</span>
  if (rank === 2)
    return <span className={`flex flex-shrink-0 items-center justify-center rounded-full bg-slate-300 font-bold text-slate-700 dark:bg-slate-500 dark:text-slate-100 ${size}`}>2</span>
  if (rank === 3)
    return <span className={`flex flex-shrink-0 items-center justify-center rounded-full bg-orange-400/80 font-bold text-white ${size}`}>3</span>
  return (
    <span className={`flex flex-shrink-0 items-center justify-center rounded-full bg-stone-100 font-medium text-stone-400 dark:bg-white/[0.06] dark:text-white/36 ${size}`}>
      {rank}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// RouteRow — compact ranked list item
// ─────────────────────────────────────────────────────────────────────────────

function RouteRow({ route, rank }: { route: RouteResponseDTO; rank: number }) {
  const typeClass = TYPE_PILL[route.routeType] ?? TYPE_PILL.CUSTOM
  const location = route.locationSummary || route.primaryCityName || route.primaryCountryName || '—'

  return (
    <Link
      to={`/route/${route.id}`}
      className="group flex items-center gap-3 rounded-[20px] border border-stone-200 bg-white/85 p-3 transition-all hover:-translate-y-px hover:border-stone-300 hover:shadow-[0_4px_18px_rgba(15,23,42,0.07)] dark:border-white/[0.07] dark:bg-white/[0.03] dark:hover:border-white/14"
    >
      <RankBadge rank={rank} />

      <div className="relative h-11 w-14 flex-shrink-0 overflow-hidden rounded-[12px]">
        {route.mainImageUrl ? (
          <img src={route.mainImageUrl} alt={route.name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={{ background: getRouteGradient(route.name) }} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-1.5">
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] ${typeClass}`}>
            {ROUTE_TYPE_LABELS[route.routeType] ?? route.routeType}
          </span>
        </div>
        <div className="truncate text-sm font-semibold leading-tight text-stone-900 dark:text-white">{route.name}</div>
        <div className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-stone-400 dark:text-white/34">
          <MapPinIcon />
          {location}
        </div>
      </div>

      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        <div className="flex items-center gap-1 font-semibold text-rose-500 dark:text-rose-400">
          <HeartIcon />
          <span className="text-xs">{route.likeCounts ?? 0}</span>
        </div>
        <div className="text-[11px] text-stone-300 dark:text-white/22">{route.totalPoints ?? 0} stops</div>
      </div>

      <div className="flex-shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5 dark:text-white/20">
        <ChevronRight />
      </div>
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// RouteCard — big photo card for featured rows
// ─────────────────────────────────────────────────────────────────────────────

function RouteCard({ route, rank }: { route: RouteResponseDTO; rank: number }) {
  const typeClass = TYPE_PILL[route.routeType] ?? TYPE_PILL.CUSTOM
  const location = route.locationSummary || route.primaryCityName || route.primaryCountryName || '—'

  return (
    <Link
      to={`/route/${route.id}`}
      className="group relative flex w-[230px] flex-shrink-0 flex-col overflow-hidden rounded-[26px] border border-stone-200 bg-white transition-all hover:-translate-y-1.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.14)] dark:border-white/[0.08] dark:bg-[#0f1117]/90 dark:hover:border-white/16"
    >
      <div className="relative h-[150px] overflow-hidden">
        {route.mainImageUrl ? (
          <img
            src={route.mainImageUrl}
            alt={route.name}
            className="h-full w-full object-cover transition-transform duration-600 group-hover:scale-[1.06]"
          />
        ) : (
          <div className="h-full w-full" style={{ background: FALLBACK_GRADIENT }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/8 to-transparent" />
        <div className="absolute left-3 top-3">
          <RankBadge rank={rank} large />
        </div>
        <div className="absolute bottom-3 left-3">
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${typeClass}`}>
            {ROUTE_TYPE_LABELS[route.routeType] ?? route.routeType}
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="truncate text-sm font-semibold text-stone-900 dark:text-white">{route.name}</div>
        <div className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-stone-400 dark:text-white/38">
          <MapPinIcon />
          {location}
        </div>
        <div className="mt-auto flex items-center justify-between pt-3 text-xs">
          <span className="text-stone-400 dark:text-white/34">{route.totalPoints ?? 0} stops</span>
          <span className="flex items-center gap-1 font-bold text-rose-500 dark:text-rose-400">
            <HeartIcon size={12} />
            {route.likeCounts ?? 0}
          </span>
        </div>
      </div>
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ContinentCard — large visual card
// ─────────────────────────────────────────────────────────────────────────────

function ContinentCard({
  continent,
  selected,
  onClick,
}: {
  continent: ContinentDTO
  selected: boolean
  onClick: () => void
}) {
  const bg = continent.imageUrl ? undefined : getCardGradient(continent.code ?? continent.name)

  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-[26px] transition-all ${
        selected
          ? 'ring-2 ring-teal-500 ring-offset-2 dark:ring-cyan-400 dark:ring-offset-[#090b11]'
          : 'hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(15,23,42,0.18)]'
      }`}
    >
      <div className="relative h-[130px] w-full">
        {continent.imageUrl ? (
          <img
            src={continent.imageUrl}
            alt={continent.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="h-full w-full transition-transform duration-500 group-hover:scale-[1.04]" style={{ background: bg }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />

        {selected && (
          <div className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-teal-500 text-white dark:bg-cyan-400">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 p-3 text-left">
          <div className="text-base leading-none">{continent.emoji || '🌍'}</div>
          <div className="mt-1.5 text-sm font-semibold text-white">{continent.name}</div>
          {continent.routesCount ? (
            <div className="mt-0.5 text-[11px] text-white/60">{continent.routesCount} routes</div>
          ) : null}
        </div>
      </div>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CountryCard — photo card with flag overlay
// ─────────────────────────────────────────────────────────────────────────────

function CountryCard({
  country,
  selected,
  onClick,
}: {
  country: CountryDTO
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-[22px] text-left transition-all ${
        selected
          ? 'ring-2 ring-teal-500 ring-offset-2 dark:ring-cyan-400 dark:ring-offset-[#090b11]'
          : 'hover:-translate-y-1 hover:shadow-[0_10px_28px_rgba(15,23,42,0.16)]'
      }`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        {country.imageUrl ? (
          <img
            src={country.imageUrl}
            alt={country.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          />
        ) : (
          <div
            className="h-full w-full transition-transform duration-500 group-hover:scale-[1.05]"
            style={{ background: getCardGradient(country.code ?? country.name) }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/18 to-transparent" />

        {selected && (
          <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-teal-500 text-white dark:bg-cyan-400">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 p-3">
          <div className="flex items-end justify-between gap-1">
            <div>
              <div className="text-lg leading-none">{country.flagEmoji || '🌍'}</div>
              <div className="mt-1 text-sm font-semibold text-white">{country.name}</div>
              <div className="mt-0.5 text-[11px] text-white/58">
                {country.routesCount ?? 0} routes · {country.citiesCount ?? 0} cities
              </div>
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CityChip — compact photo chip for city selection
// ─────────────────────────────────────────────────────────────────────────────

function CityChip({
  city,
  selected,
  onClick,
}: {
  city: CityDTO
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex-shrink-0 overflow-hidden rounded-[18px] transition-all ${
        selected
          ? 'ring-2 ring-teal-500 ring-offset-1 dark:ring-cyan-400 dark:ring-offset-[#090b11]'
          : 'hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(15,23,42,0.14)]'
      }`}
    >
      <div className="relative h-[80px] w-[120px]">
        {city.imageUrl ? (
          <img
            src={city.imageUrl}
            alt={city.name}
            className="h-full w-full object-cover transition-transform duration-400 group-hover:scale-[1.06]"
          />
        ) : (
          <div className="h-full w-full" style={{ background: FALLBACK_GRADIENT }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-2 px-2.5 text-left">
          <div className="truncate text-xs font-semibold text-white">{city.name}</div>
          {city.routesCount ? (
            <div className="text-[10px] text-white/58">{city.routesCount}</div>
          ) : null}
        </div>
      </div>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton loaders
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 rounded-[20px] border border-stone-200 bg-white/85 p-3 dark:border-white/[0.07] dark:bg-white/[0.03]">
      <div className="h-6 w-6 animate-pulse rounded-full bg-stone-200 dark:bg-white/[0.08]" />
      <div className="h-11 w-14 animate-pulse rounded-[12px] bg-stone-200 dark:bg-white/[0.08]" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-20 animate-pulse rounded bg-stone-200 dark:bg-white/[0.08]" />
        <div className="h-4 w-44 animate-pulse rounded bg-stone-200 dark:bg-white/[0.08]" />
        <div className="h-3 w-28 animate-pulse rounded bg-stone-200 dark:bg-white/[0.08]" />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'global' | 'latest' | 'destination' | 'tours'

export default function RankingsPage() {
  const [tab, setTab] = useState<Tab>('global')

  // Global data
  const [allRoutes, setAllRoutes] = useState<RouteResponseDTO[]>([])
  const [continents, setContinents] = useState<ContinentDTO[]>([])
  const [loading, setLoading] = useState(true)

  // Latest feed pagination
  const [latestPage, setLatestPage] = useState(0)
  const [latestRoutes, setLatestRoutes] = useState<RouteResponseDTO[]>([])
  const [latestHasMore, setLatestHasMore] = useState(true)
  const [latestLoading, setLatestLoading] = useState(false)

  // Destination drill-down
  const [selectedContinentId, setSelectedContinentId] = useState<number | null>(null)
  const [countries, setCountries] = useState<CountryDTO[]>([])
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null)
  const [cities, setCities] = useState<CityDTO[]>([])
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null)
  const [destinationRoutes, setDestinationRoutes] = useState<RouteResponseDTO[]>([])
  const [destLoading, setDestLoading] = useState(false)

  // ── Load routes (independent of continents) ──────────────────────────────

  useEffect(() => {
    let cancelled = false
    api.get('/routes', { params: { size: 60 } })
      .then((res) => {
        if (cancelled) return
        const data = res.data
        const routeList: RouteResponseDTO[] = Array.isArray(data) ? data : (data?.content ?? [])
        setAllRoutes(routeList)
        const byNewest = routeList.slice().sort((a, b) => b.id - a.id)
        setLatestRoutes(byNewest.slice(0, 20))
        setLatestHasMore(byNewest.length > 20)
      })
      .catch((err) => console.error('[Rankings] routes error:', err))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // ── Load continents (independent — never blocked by routes) ──────────────

  useEffect(() => {
    let cancelled = false
    api.get('/locations/continents')
      .then((res) => {
        if (cancelled) return
        const list = Array.isArray(res.data) ? res.data : []
        setContinents(list)
      })
      .catch((err) => {
        const msg = err?.response?.data?.message ?? err?.message ?? 'unknown error'
        console.error('[Rankings] continents error:', err.response?.status, msg, err)
      })
    return () => { cancelled = true }
  }, [])

  // ── Load more for latest feed ─────────────────────────────────────────────

  const loadMoreLatest = async () => {
    if (latestLoading || !latestHasMore) return
    setLatestLoading(true)
    try {
      const nextPage = latestPage + 1
      const res = await api.get('/routes', { params: { size: 20, page: nextPage } })
      const data = res.data
      const batch: RouteResponseDTO[] = Array.isArray(data) ? data : (data?.content ?? [])
      const sorted = batch.slice().sort((a, b) => b.id - a.id)
      setLatestRoutes((prev) => [...prev, ...sorted])
      setLatestHasMore(sorted.length === 20)
      setLatestPage(nextPage)
    } finally {
      setLatestLoading(false)
    }
  }

  // ── Load countries when continent selected ────────────────────────────────

  useEffect(() => {
    if (!selectedContinentId) {
      setCountries([])
      setSelectedCountryId(null)
      setCities([])
      setSelectedCityId(null)
      setDestinationRoutes([])
      return
    }
    api.get(`/locations/continents/${selectedContinentId}/countries`)
      .then((res) => setCountries(res.data ?? []))
      .catch(() => setCountries([]))
  }, [selectedContinentId])

  // ── Load cities + country routes when country selected ────────────────────

  useEffect(() => {
    if (!selectedCountryId) {
      setCities([])
      setSelectedCityId(null)
      setDestinationRoutes([])
      return
    }
    setDestLoading(true)
    setSelectedCityId(null)
    Promise.all([
      api.get(`/locations/countries/${selectedCountryId}/cities`),
      api.get(`/countries/${selectedCountryId}/routes`),
    ])
      .then(([citiesRes, routesRes]) => {
        setCities(citiesRes.data ?? [])
        const sorted = ((routesRes.data as RouteResponseDTO[]) ?? [])
          .slice()
          .sort((a, b) => (b.likeCounts ?? 0) - (a.likeCounts ?? 0))
          .slice(0, 12)
        setDestinationRoutes(sorted)
      })
      .catch(() => { setCities([]); setDestinationRoutes([]) })
      .finally(() => setDestLoading(false))
  }, [selectedCountryId])

  // ── Load city routes when city selected ───────────────────────────────────

  useEffect(() => {
    if (!selectedCityId) return
    setDestLoading(true)
    api.get(`/cities/${selectedCityId}/routes`)
      .then((res) => {
        const sorted = ((res.data as RouteResponseDTO[]) ?? [])
          .slice()
          .sort((a, b) => (b.likeCounts ?? 0) - (a.likeCounts ?? 0))
          .slice(0, 12)
        setDestinationRoutes(sorted)
      })
      .catch(() => setDestinationRoutes([]))
      .finally(() => setDestLoading(false))
  }, [selectedCityId])

  // ── Derived ───────────────────────────────────────────────────────────────

  const globalTop = useMemo(
    () => allRoutes.slice().sort((a, b) => (b.likeCounts ?? 0) - (a.likeCounts ?? 0)).slice(0, 20),
    [allRoutes],
  )

  const tourRoutes = useMemo(
    () =>
      allRoutes
        .filter((r) => r.routeType === 'MULTI_CITY' || r.routeType === 'ROAD_TRIP')
        .slice()
        .sort((a, b) => (b.likeCounts ?? 0) - (a.likeCounts ?? 0)),
    [allRoutes],
  )

  const selectedContinent = continents.find((c) => c.id === selectedContinentId) ?? null
  const selectedCountry = countries.find((c) => c.id === selectedCountryId) ?? null
  const selectedCity = cities.find((c) => c.id === selectedCityId) ?? null

  const TABS: { id: Tab; label: string; hint: string }[] = [
    { id: 'global', label: 'Top by likes', hint: 'Best rated routes worldwide' },
    { id: 'latest', label: 'New routes', hint: 'Fresh routes just added' },
    { id: 'destination', label: 'By Destination', hint: 'Browse continent → country → city' },
    { id: 'tours', label: 'Multi-city Tours', hint: 'Cross-country & road trips' },
  ]

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="app-shell flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="h-[220px] animate-pulse rounded-[34px] border border-stone-200 bg-white dark:border-white/[0.06] dark:bg-white/[0.02]" />
          <div className="grid gap-3 lg:grid-cols-2">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        </div>
      </div>
    )
  }

  // ── Page ──────────────────────────────────────────────────────────────────

  return (
    <div className="app-shell flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

        {/* ── Hero header ─────────────────────────────────────────────────── */}
        <section className="glass-surface-strong overflow-hidden rounded-[34px]">
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.3em] text-teal-700 dark:text-cyan-100/70">Route Rankings</div>
                <h1 className="mt-2 font-serif text-4xl text-stone-900 dark:text-white sm:text-5xl">World's Best Routes.</h1>
                <p className="mt-3 max-w-xl text-sm leading-8 text-stone-500 dark:text-white/50">
                  Ranked by community likes. Browse globally, dive into destinations, or find your next cross-country adventure.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {[
                  { label: `${allRoutes.length} routes` },
                  { label: `${continents.length} continents` },
                  { label: `${tourRoutes.length} tours` },
                ].map((item) => (
                  <span key={item.label} className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-stone-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/38">
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`rounded-full border px-5 py-2.5 text-sm font-medium transition-all ${
                    tab === t.id
                      ? 'border-teal-500/20 bg-teal-500/10 text-teal-700 dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-100'
                      : 'border-stone-200 bg-white/60 text-stone-600 hover:border-stone-300 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/52 dark:hover:border-white/20 dark:hover:text-white/80'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Podium top-3 strip */}
          {globalTop.length >= 3 && (
            <div className="border-t border-stone-100 px-6 py-4 dark:border-white/[0.06] sm:px-8">
              <div className="mb-3 text-[10px] uppercase tracking-[0.28em] text-stone-400 dark:text-white/30">
                Global podium
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {globalTop.slice(0, 3).map((route, i) => (
                  <Link
                    key={route.id}
                    to={`/route/${route.id}`}
                    className="group flex items-center gap-3 rounded-[18px] border border-stone-200 bg-white/70 p-3 transition-all hover:border-stone-300 dark:border-white/[0.07] dark:bg-white/[0.04] dark:hover:border-white/14"
                  >
                    <RankBadge rank={i + 1} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-stone-900 dark:text-white">{route.name}</div>
                      <div className="mt-0.5 truncate text-[11px] text-stone-400 dark:text-white/36">
                        {route.locationSummary || route.primaryCityName || route.primaryCountryName || '—'}
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1 font-bold text-rose-500 dark:text-rose-400">
                      <HeartIcon />
                      <span className="text-xs">{route.likeCounts ?? 0}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB: GLOBAL TOP 20
        ═══════════════════════════════════════════════════════════════════ */}
        {tab === 'global' && (
          <section className="space-y-5">
            <div>
              <div className="text-[11px] uppercase tracking-[0.3em] text-teal-700 dark:text-cyan-100/70">Global ranking</div>
              <h2 className="mt-1 text-2xl font-semibold text-stone-900 dark:text-white">Top {globalTop.length} by community likes</h2>
            </div>

            {globalTop.length > 0 && (
              <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
                {globalTop.slice(0, 5).map((route, i) => (
                  <RouteCard key={route.id} route={route} rank={i + 1} />
                ))}
              </div>
            )}

            {globalTop.length > 5 && (
              <div className="grid gap-2 lg:grid-cols-2">
                {globalTop.slice(5).map((route, i) => (
                  <RouteRow key={route.id} route={route} rank={i + 6} />
                ))}
              </div>
            )}

            {globalTop.length === 0 && (
              <div className="rounded-[28px] border border-stone-200 bg-white/60 px-6 py-14 text-center text-sm text-stone-400 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-white/30">
                No public routes yet — create one and share it with the community!
              </div>
            )}
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB: LATEST — new routes feed
        ═══════════════════════════════════════════════════════════════════ */}
        {tab === 'latest' && (
          <section className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.3em] text-teal-700 dark:text-cyan-100/70">New routes</div>
                <h2 className="mt-1 text-2xl font-semibold text-stone-900 dark:text-white">Recently added</h2>
                <p className="mt-1.5 text-sm text-stone-400 dark:text-white/40">
                  Every public route, newest first — so fresh routes always get a chance to be discovered.
                </p>
              </div>
              <span className="text-sm text-stone-400 dark:text-white/34">{latestRoutes.length} loaded</span>
            </div>

            {latestRoutes.length > 0 ? (
              <>
                {/* First 4 as cards */}
                <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
                  {latestRoutes.slice(0, 4).map((route) => (
                    <Link
                      key={route.id}
                      to={`/route/${route.id}`}
                      className="group relative flex w-[230px] flex-shrink-0 flex-col overflow-hidden rounded-[26px] border border-stone-200 bg-white transition-all hover:-translate-y-1.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.14)] dark:border-white/[0.08] dark:bg-[#0f1117]/90 dark:hover:border-white/16"
                    >
                      <div className="relative h-[150px] overflow-hidden">
                        {route.mainImageUrl ? (
                          <img src={route.mainImageUrl} alt={route.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]" />
                        ) : (
                          <div className="h-full w-full" style={{ background: getRouteGradient(route.name) }} />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/8 to-transparent" />
                        <div className="absolute left-3 top-3">
                          <span className="rounded-full border border-emerald-300/60 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/12 dark:text-emerald-300">
                            New
                          </span>
                        </div>
                        <div className="absolute bottom-3 left-3">
                          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${TYPE_PILL[route.routeType] ?? TYPE_PILL.CUSTOM}`}>
                            {ROUTE_TYPE_LABELS[route.routeType] ?? route.routeType}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col p-4">
                        <div className="truncate text-sm font-semibold text-stone-900 dark:text-white">{route.name}</div>
                        <div className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-stone-400 dark:text-white/38">
                          <MapPinIcon />
                          {route.locationSummary || route.primaryCityName || route.primaryCountryName || '—'}
                        </div>
                        <div className="mt-auto flex items-center justify-between pt-3 text-xs">
                          <span className="text-stone-400 dark:text-white/34">{route.totalPoints ?? 0} stops</span>
                          <span className="flex items-center gap-1 font-bold text-rose-500 dark:text-rose-400">
                            <HeartIcon size={12} />
                            {route.likeCounts ?? 0}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Rest as list */}
                <div className="grid gap-2 lg:grid-cols-2">
                  {latestRoutes.slice(4).map((route) => (
                    <Link
                      key={route.id}
                      to={`/route/${route.id}`}
                      className="group flex items-center gap-3 rounded-[20px] border border-stone-200 bg-white/85 p-3 transition-all hover:-translate-y-px hover:border-stone-300 hover:shadow-[0_4px_18px_rgba(15,23,42,0.07)] dark:border-white/[0.07] dark:bg-white/[0.03] dark:hover:border-white/14"
                    >
                      <div className="relative h-11 w-14 flex-shrink-0 overflow-hidden rounded-[12px]">
                        {route.mainImageUrl ? (
                          <img src={route.mainImageUrl} alt={route.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full" style={{ background: getRouteGradient(route.name) }} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-center gap-1.5">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] ${TYPE_PILL[route.routeType] ?? TYPE_PILL.CUSTOM}`}>
                            {ROUTE_TYPE_LABELS[route.routeType] ?? route.routeType}
                          </span>
                        </div>
                        <div className="truncate text-sm font-semibold leading-tight text-stone-900 dark:text-white">{route.name}</div>
                        <div className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-stone-400 dark:text-white/34">
                          <MapPinIcon />
                          {route.locationSummary || route.primaryCityName || route.primaryCountryName || '—'}
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-1 font-semibold text-rose-500 dark:text-rose-400">
                        <HeartIcon />
                        <span className="text-xs">{route.likeCounts ?? 0}</span>
                      </div>
                      <div className="flex-shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5 dark:text-white/20">
                        <ChevronRight />
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Load more */}
                {latestHasMore && (
                  <div className="flex justify-center pt-2">
                    <button
                      onClick={() => void loadMoreLatest()}
                      disabled={latestLoading}
                      className="rounded-full border border-stone-200 bg-white/80 px-6 py-3 text-sm font-medium text-stone-600 transition-all hover:border-stone-300 hover:text-stone-900 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/60 dark:hover:border-white/18 dark:hover:text-white/80"
                    >
                      {latestLoading ? 'Loading…' : 'Load more routes'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-[28px] border border-stone-200 bg-white/60 px-6 py-14 text-center text-sm text-stone-400 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-white/30">
                No public routes yet.
              </div>
            )}
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB: BY DESTINATION  (GetYourGuide-style visual drill-down)
        ═══════════════════════════════════════════════════════════════════ */}
        {tab === 'destination' && (
          <section className="space-y-6">

            {/* ── Step 1: Choose a continent ── */}
            <div>
              <div className="mb-1 text-[11px] uppercase tracking-[0.3em] text-teal-700 dark:text-cyan-100/70">
                Step 1 — Choose a continent
              </div>
              <h2 className="text-2xl font-semibold text-stone-900 dark:text-white">Where are you going?</h2>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
              {continents.map((cont) => (
                <ContinentCard
                  key={cont.id}
                  continent={cont}
                  selected={selectedContinentId === cont.id}
                  onClick={() => {
                    setSelectedContinentId(cont.id === selectedContinentId ? null : cont.id)
                    setSelectedCountryId(null)
                    setSelectedCityId(null)
                  }}
                />
              ))}
            </div>

            {/* ── Step 2: Choose a country ── */}
            {selectedContinentId && countries.length > 0 && (
              <div className="space-y-4">
                <div>
                  <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-teal-700 dark:text-cyan-100/70">
                    <span>{selectedContinent?.emoji}</span>
                    <span>Step 2 — Pick a country in {selectedContinent?.name}</span>
                  </div>
                  <h2 className="text-xl font-semibold text-stone-900 dark:text-white">Choose your destination</h2>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {countries.map((country) => (
                    <CountryCard
                      key={country.id}
                      country={country}
                      selected={selectedCountryId === country.id}
                      onClick={() => {
                        setSelectedCountryId(country.id === selectedCountryId ? null : country.id)
                        setSelectedCityId(null)
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── Step 3: Choose a city ── */}
            {selectedCountryId && (
              <div className="space-y-4">
                {cities.length > 0 && (
                  <div>
                    <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-teal-700 dark:text-cyan-100/70">
                      <span>{selectedCountry?.flagEmoji}</span>
                      <span>Step 3 — Pick a city (optional)</span>
                    </div>
                    <h2 className="mb-4 text-xl font-semibold text-stone-900 dark:text-white">
                      Cities in {selectedCountry?.name}
                    </h2>

                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {/* "All country" chip */}
                      <button
                        onClick={() => setSelectedCityId(null)}
                        className={`group relative flex-shrink-0 overflow-hidden rounded-[18px] transition-all ${
                          !selectedCityId
                            ? 'ring-2 ring-teal-500 ring-offset-1 dark:ring-cyan-400 dark:ring-offset-[#090b11]'
                            : 'hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(15,23,42,0.14)]'
                        }`}
                      >
                        <div
                          className="relative flex h-[80px] w-[120px] items-center justify-center"
                          style={{ background: getCardGradient(selectedCountry?.code ?? selectedCountry?.name ?? 'x') }}
                        >
                          <div className="text-center">
                            <div className="text-xl">{selectedCountry?.flagEmoji || '🌍'}</div>
                            <div className="mt-1 text-xs font-semibold text-white">All cities</div>
                          </div>
                        </div>
                      </button>

                      {cities.map((city) => (
                        <CityChip
                          key={city.id}
                          city={city}
                          selected={selectedCityId === city.id}
                          onClick={() => setSelectedCityId(city.id === selectedCityId ? null : city.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Breadcrumb */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-400 dark:text-white/36">
                  <button onClick={() => setSelectedContinentId(null)} className="hover:text-teal-600 hover:underline dark:hover:text-cyan-300">All continents</button>
                  <ChevronRight size={11} />
                  <button onClick={() => { setSelectedCountryId(null); setSelectedCityId(null) }} className="hover:text-teal-600 hover:underline dark:hover:text-cyan-300">{selectedContinent?.name}</button>
                  <ChevronRight size={11} />
                  <button
                    onClick={() => setSelectedCityId(null)}
                    className={selectedCityId ? 'hover:text-teal-600 hover:underline dark:hover:text-cyan-300' : 'font-medium text-stone-700 dark:text-white/72'}
                  >
                    {selectedCountry?.flagEmoji} {selectedCountry?.name}
                  </button>
                  {selectedCity && (
                    <>
                      <ChevronRight size={11} />
                      <span className="font-medium text-stone-700 dark:text-white/72">{selectedCity.name}</span>
                    </>
                  )}
                </div>

                {/* Route list */}
                <div>
                  <div className="mb-3 text-[10px] uppercase tracking-[0.26em] text-stone-400 dark:text-white/30">
                    {selectedCity
                      ? `Top routes in ${selectedCity.name} — sorted by likes`
                      : `Top routes in ${selectedCountry?.name} — sorted by likes`}
                  </div>

                  {destLoading ? (
                    <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}</div>
                  ) : destinationRoutes.length > 0 ? (
                    <div className="grid gap-2 xl:grid-cols-2">
                      {destinationRoutes.map((route, i) => (
                        <RouteRow key={route.id} route={route} rank={i + 1} />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[24px] border border-stone-200 bg-white/60 px-6 py-10 text-center dark:border-white/[0.08] dark:bg-white/[0.02]">
                      <div className="text-2xl">{selectedCountry?.flagEmoji || '📍'}</div>
                      <div className="mt-3 text-sm font-medium text-stone-700 dark:text-white/70">No public routes yet</div>
                      <p className="mt-1 text-xs text-stone-400 dark:text-white/34">Be the first to create a route here.</p>
                      <Link to="/map" className="mt-4 inline-flex rounded-full border border-teal-500/20 bg-teal-50 px-4 py-2 text-xs font-medium text-teal-700 hover:bg-teal-100 dark:border-cyan-400/24 dark:bg-cyan-400/8 dark:text-cyan-200">
                        Create a route
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Placeholder when nothing selected */}
            {!selectedContinentId && (
              <div className="rounded-[28px] border border-stone-200/80 bg-white/50 px-6 py-12 text-center dark:border-white/[0.07] dark:bg-white/[0.015]">
                <div className="text-3xl">🌍</div>
                <div className="mt-3 text-base font-semibold text-stone-800 dark:text-white">Pick a continent above</div>
                <p className="mt-2 text-sm text-stone-400 dark:text-white/36">Then choose a country and city to see ranked routes.</p>
              </div>
            )}
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB: MULTI-CITY TOURS
        ═══════════════════════════════════════════════════════════════════ */}
        {tab === 'tours' && (
          <section className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.3em] text-teal-700 dark:text-cyan-100/70">Multi-city &amp; road trips</div>
                <h2 className="mt-1 text-2xl font-semibold text-stone-900 dark:text-white">Cross-country routes</h2>
                <p className="mt-2 max-w-xl text-sm leading-7 text-stone-400 dark:text-white/40">
                  Routes that span multiple cities or countries — Euro tours, road trips, regional odysseys. Ranked by likes.
                </p>
              </div>
              <span className="text-sm text-stone-400 dark:text-white/34">{tourRoutes.length} tours</span>
            </div>

            {tourRoutes.length > 0 ? (
              <>
                <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
                  {tourRoutes.slice(0, 6).map((route, i) => (
                    <RouteCard key={route.id} route={route} rank={i + 1} />
                  ))}
                </div>
                {tourRoutes.length > 6 && (
                  <div className="grid gap-2 lg:grid-cols-2">
                    {tourRoutes.slice(6).map((route, i) => (
                      <RouteRow key={route.id} route={route} rank={i + 7} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="glass-surface rounded-[28px] px-6 py-16 text-center">
                <div className="text-3xl">🗺️</div>
                <div className="mt-4 text-base font-semibold text-stone-900 dark:text-white">No multi-city tours yet</div>
                <p className="mt-2 text-sm text-stone-500 dark:text-white/42">
                  Create a route with type "Multi-city" or "Road trip" and make it public.
                </p>
                <Link to="/map" className="mt-5 inline-flex rounded-full border border-teal-500/20 bg-teal-500/10 px-5 py-2.5 text-sm font-medium text-teal-700 transition-all hover:bg-teal-500/16 dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-100">
                  Plan a tour
                </Link>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {(['MULTI_CITY', 'ROAD_TRIP'] as const).map((type) => {
                const count = tourRoutes.filter((r) => r.routeType === type).length
                return (
                  <div key={type} className="rounded-[22px] border border-stone-200 bg-white/80 px-5 py-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${TYPE_PILL[type]}`}>
                      {ROUTE_TYPE_LABELS[type]}
                    </span>
                    <div className="mt-3 text-3xl font-semibold text-stone-900 dark:text-white">{count}</div>
                    <div className="mt-0.5 text-xs text-stone-400 dark:text-white/34">public routes</div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
