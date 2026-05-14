import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import RouteCard from '../components/RouteCard'
import type { User } from '../components/AuthModal'
import type { CityDTO, ContinentDTO, CountryDTO } from '../types/location'
import type { RouteResponseDTO } from '../types/route'
import { formatVibeTag } from '../utils/routeMeta'

interface ExploreProps {
  currentUser: User | null
  onLoginRequest: () => void
}

type ExploreFeed = 'trending' | 'popular' | 'latest'

const FEED_META: Record<ExploreFeed, { label: string; hint: string }> = {
  trending: { label: 'Trending', hint: 'Routes people react to the most right now.' },
  popular: { label: 'Popular', hint: 'Strong public routes ranked by engagement.' },
  latest: { label: 'Latest', hint: 'Fresh public routes ready to inspect and copy.' },
}

const ROUTE_SHAPES = [
  {
    type: 'CITY',
    label: 'City rhythm',
    copy: 'Dense routes for walkable days: landmarks, coffee stops, and hidden corners held close together.',
  },
  {
    type: 'REGION',
    label: 'Regional flow',
    copy: 'Slower routes that spread out across an area when one city is not enough to explain the place.',
  },
  {
    type: 'ROAD_TRIP',
    label: 'Road trip energy',
    copy: 'Longer movement, wider spacing, and routes that feel more like a journey than a loop.',
  },
] as const

const locationPlaceholder = 'linear-gradient(135deg, #13263c 0%, #0f172a 52%, #115e59 100%)'

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

  return <div className={className} style={{ background: locationPlaceholder }} />
}

const PAGE_SIZE = 12

export default function Explore({ currentUser, onLoginRequest }: ExploreProps) {
  const [feed, setFeed] = useState<ExploreFeed>('trending')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [routes, setRoutes] = useState<RouteResponseDTO[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [countries, setCountries] = useState<CountryDTO[]>([])
  const [cities, setCities] = useState<CityDTO[]>([])
  const [continents, setContinents] = useState<ContinentDTO[]>([])
  const [continentCountries, setContinentCountries] = useState<CountryDTO[]>([])
  const [selectedContinentId, setSelectedContinentId] = useState<number | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [selectedTag, setSelectedTag] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, 300)
    return () => window.clearTimeout(timer)
  }, [query])

  const buildRoutesEndpoint = (feedKey: ExploreFeed, pageNum: number) => {
    if (feedKey === 'trending') return { url: '/routes/trending', params: { page: pageNum, size: PAGE_SIZE } }
    if (feedKey === 'popular') return { url: '/routes/popular', params: { page: pageNum, size: PAGE_SIZE } }
    return { url: '/routes', params: { page: pageNum, size: PAGE_SIZE } }
  }

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      setLoading(true)
      setError('')
      setPage(0)
      setHasMore(true)

      try {
        const { url, params } = buildRoutesEndpoint(feed, 0)
        const routesPromise = debouncedQuery
          ? api.get('/routes/search', { params: { name: debouncedQuery, tag: selectedTag || undefined } })
          : api.get(url, { params: { ...params, tag: selectedTag || undefined } })

        const [routesResponse, countriesResponse, citiesResponse, tagsResponse] = await Promise.all([
          routesPromise,
          api.get('/countries/top'),
          api.get('/cities/top'),
          api.get('/routes/tags'),
        ])

        if (!cancelled) {
          const loaded: RouteResponseDTO[] = routesResponse.data || []
          setRoutes(loaded)
          setHasMore(!debouncedQuery && loaded.length === PAGE_SIZE)
          setCountries(countriesResponse.data)
          setCities(citiesResponse.data)
          setTags(tagsResponse.data || [])
        }
      } catch {
        if (!cancelled) {
          setRoutes([])
          setCountries([])
          setCities([])
          setTags([])
          setError('Failed to load the travel catalog.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadData()

    return () => {
      cancelled = true
    }
  }, [feed, debouncedQuery, selectedTag])

  const loadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const nextPage = page + 1
    try {
      const { url, params } = buildRoutesEndpoint(feed, nextPage)
      const response = await api.get(url, { params: { ...params, tag: selectedTag || undefined } })
      const loaded: RouteResponseDTO[] = response.data || []
      setRoutes((prev) => [...prev, ...loaded])
      setPage(nextPage)
      setHasMore(loaded.length === PAGE_SIZE)
    } catch {
      // silently fail, user can retry
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    api.get('/locations/continents')
      .then((response) => {
        if (cancelled) return
        const loadedContinents = response.data || []
        setContinents(loadedContinents)
        if (loadedContinents.length > 0) {
          setSelectedContinentId((current) => current ?? loadedContinents[0].id)
        }
      })
      .catch(() => {
        if (!cancelled) setContinents([])
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedContinentId) {
      setContinentCountries([])
      return
    }

    let cancelled = false
    api.get(`/locations/continents/${selectedContinentId}/countries`)
      .then((response) => {
        if (!cancelled) setContinentCountries(response.data || [])
      })
      .catch(() => {
        if (!cancelled) setContinentCountries([])
      })

    return () => {
      cancelled = true
    }
  }, [selectedContinentId])

  const featuredRoute = routes[0] ?? null
  const routeGrid = featuredRoute ? routes.slice(1) : routes
  const featuredCountry = countries[0] ?? null
  const countryRail = featuredCountry ? countries.slice(1, 5) : countries.slice(0, 4)
  const featuredCity = cities[0] ?? null
  const cityGrid = featuredCity ? cities.slice(1, 5) : cities.slice(0, 4)
  const entryPaths = [
    {
      label: 'Start with a country',
      title: featuredCountry?.name || 'Open a country hub',
      copy:
        featuredCountry?.description ||
        'Use countries as the outer frame: city hubs, regional context, and route ecosystems meet there.',
      to: featuredCountry ? `/countries/${featuredCountry.id}` : '/',
      meta: featuredCountry ? `${featuredCountry.routesCount || 0} routes ready` : 'Country-first discovery',
      accent: 'from-cyan-400/24 via-sky-400/10 to-transparent',
    },
    {
      label: 'Drop into a city',
      title: featuredCity?.name || 'Browse a city hub',
      copy:
        'City pages should feel like compact travel guides: top landmarks, slower picks, and route ideas in one place.',
      to: featuredCity ? `/cities/${featuredCity.id}` : '/',
      meta: featuredCity ? `${featuredCity.routesCount || 0} routes in view` : 'City-first route browsing',
      accent: 'from-amber-300/18 via-orange-300/8 to-transparent',
    },
    {
      label: 'Build on the map',
      title: 'Open the route builder',
      copy:
        'Jump straight into the map when you already know the city and want to shape landmarks plus hidden places into your own path.',
      to: '/map',
      meta: 'Route-first creation flow',
      accent: 'from-emerald-300/18 via-cyan-300/10 to-transparent',
    },
  ]
  const browseLayers = [
    {
      label: 'Continents',
      href: '#continents-layer',
      copy: 'Start with the widest frame when you are still choosing the part of the world.',
    },
    {
      label: 'Countries',
      href: '#countries-layer',
      copy: 'Open the national layer when you want a travel system, not just one route.',
    },
    {
      label: 'Cities',
      href: '#cities-layer',
      copy: 'Use city pages as compact travel briefings before opening the map.',
    },
    {
      label: 'Routes',
      href: '#routes-layer',
      copy: 'Browse public routes once the destination already feels clear.',
    },
  ]

  const stats = useMemo(() => {
    const totalStops = routes.reduce((sum, route) => sum + (route.stops?.length ?? route.totalPoints ?? 0), 0)
    const totalLikes = routes.reduce((sum, route) => sum + (route.likeCounts ?? 0), 0)
    const avgStops = routes.length > 0 ? Math.round(totalStops / routes.length) : 0

    return [
      { label: 'Routes', value: routes.length },
      { label: 'Cities', value: cities.length },
      { label: 'Avg stops', value: avgStops },
      { label: 'Likes', value: totalLikes },
    ]
  }, [cities.length, routes])
  const routeHighlights = ROUTE_SHAPES.map((shape) => ({
    ...shape,
    route: routes.find((route) => route.routeType === shape.type) ?? null,
  })).filter((item) => item.route)
  const selectedContinent = continents.find((continent) => continent.id === selectedContinentId) || null
  const continentHeroCountry = continentCountries[0] ?? null
  const continentCountryRail = continentHeroCountry ? continentCountries.slice(1, 7) : continentCountries.slice(0, 6)
  const foundationCards = [
    {
      label: 'Country hubs',
      value: countries.length,
      kicker: 'Step 1',
      copy: 'Use them as the wider frame around multi-city ideas, route ecosystems, and regional context.',
    },
    {
      label: 'City pages',
      value: cities.length,
      kicker: 'Step 2',
      copy: 'Each city page should surface atmosphere, top places, calmer picks, and route ideas together.',
    },
    {
      label: 'Public routes',
      value: routes.length,
      kicker: 'Step 3',
      copy: 'Open routes after the place already makes sense, then copy and reshape what feels close.',
    },
  ]

  return (
    <div className="app-shell flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="glass-surface-strong overflow-hidden rounded-[34px]">
          <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.08fr)_420px] lg:p-8">
            <div className="space-y-6">
              <div className="inline-flex items-center rounded-full border border-teal-500/14 bg-teal-50 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-teal-700 dark:border-cyan-300/20 dark:bg-cyan-300/10 dark:text-cyan-100">
                Travel planning made simple
              </div>

              <div className="max-w-3xl space-y-4">
                <h1 className="max-w-3xl font-serif text-4xl leading-[1.02] text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
                  Start with a place, save what looks fun, and turn it into your own trip.
                </h1>
                <p className="max-w-2xl text-[15px] leading-8 text-slate-600 dark:text-white/54">
                  Browse countries, open city pages, remix routes you like, and add your own hidden spots along the way.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <label className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-white px-4 py-3.5 backdrop-blur dark:border-white/[0.1] dark:bg-black/22">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400 dark:text-white/35">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </svg>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search routes, cities, or a travel vibe"
                    className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-white/25"
                  />
                </label>

                <div className="flex flex-wrap gap-2">
                  <Link
                    to="/map"
                    className="inline-flex items-center rounded-[22px] border border-teal-500/18 bg-teal-600 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-teal-500 dark:border-cyan-300/28 dark:bg-cyan-300/12 dark:text-cyan-100 dark:hover:border-cyan-200/40 dark:hover:bg-cyan-300/18"
                  >
                    Start planning
                  </Link>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {(Object.keys(FEED_META) as ExploreFeed[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFeed(key)}
                    className={`rounded-full border px-4 py-2 text-xs font-medium transition-all ${
                      feed === key && !debouncedQuery
                        ? 'border-teal-500/20 bg-teal-50 text-teal-700 dark:border-cyan-300/32 dark:bg-cyan-300/12 dark:text-cyan-100'
                        : 'border-slate-200 bg-white/70 text-slate-500 hover:border-slate-300 hover:text-slate-900 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/52 dark:hover:border-white/18 dark:hover:text-white/82'
                    }`}
                  >
                    {FEED_META[key].label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {browseLayers.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-xs font-medium text-slate-600 transition-all hover:border-slate-300 hover:text-slate-900 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/58 dark:hover:border-white/18 dark:hover:text-white/82"
                  >
                    {item.label}
                  </a>
                ))}
              </div>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTag('')}
                    className={`rounded-full border px-4 py-2 text-xs transition-all ${
                      !selectedTag
                        ? 'border-teal-500/20 bg-teal-50 text-teal-700 dark:border-cyan-300/32 dark:bg-cyan-300/12 dark:text-cyan-100'
                        : 'border-slate-200 bg-white/70 text-slate-500 hover:border-slate-300 hover:text-slate-900 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/52 dark:hover:border-white/18 dark:hover:text-white/82'
                    }`}
                  >
                    All vibes
                  </button>
                  {tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSelectedTag(tag)}
                      className={`rounded-full border px-4 py-2 text-xs transition-all ${
                        selectedTag === tag
                          ? 'border-teal-500/20 bg-teal-50 text-teal-700 dark:border-cyan-300/32 dark:bg-cyan-300/12 dark:text-cyan-100'
                          : 'border-slate-200 bg-white/70 text-slate-500 hover:border-slate-300 hover:text-slate-900 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/52 dark:hover:border-white/18 dark:hover:text-white/82'
                      }`}
                    >
                      {formatVibeTag(tag)}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-4">
                {stats.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] dark:border-white/[0.08] dark:bg-white/[0.03] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                  >
                    <div className="text-[10px] uppercase tracking-[0.24em] text-slate-400 dark:text-white/28">{item.label}</div>
                    <div className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{item.value}</div>
                  </div>
                ))}
              </div>

              <p className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-white/32">
                {debouncedQuery
                  ? `Search results for ${debouncedQuery}${selectedTag ? ` in ${formatVibeTag(selectedTag)}` : ''}`
                  : selectedTag
                    ? `${FEED_META[feed].hint} Filtered by ${formatVibeTag(selectedTag)}.`
                    : FEED_META[feed].hint}
              </p>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[26px] border border-slate-200 bg-white/86 p-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-slate-400 dark:text-white/30">Discovery path</div>
                  <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-white/70">
                    This page already holds the full browse flow: continents first, then countries, then cities, then public routes.
                  </p>
                </div>
                <div className="rounded-[26px] border border-slate-200 bg-white/86 p-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-slate-400 dark:text-white/30">Best use</div>
                  <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-white/70">
                    Use Explore as the calmer browse layer, then open the map only when the destination already feels obvious.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              {featuredCountry && (
                <Link
                  to={`/countries/${featuredCountry.id}`}
                  className="group relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#0f1117] min-h-[260px]"
                >
                  <ImageOrPlaceholder
                    src={featuredCountry.imageUrl}
                    alt={featuredCountry.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(0,0,0,0.12)_0%,_rgba(0,0,0,0.18)_30%,_rgba(0,0,0,0.82)_100%)]" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/85">Country spotlight</div>
                    <h2 className="mt-2 text-3xl font-semibold text-white">{featuredCountry.name}</h2>
                    <div className="mt-3 flex items-center gap-3 text-xs text-white/58">
                      <span>{featuredCountry.flagEmoji || 'Country'}</span>
                      <span>{featuredCountry.routesCount || 0} routes</span>
                      <span>{featuredCountry.citiesCount || 0} cities</span>
                    </div>
                  </div>
                </Link>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {featuredCity && (
                  <Link
                    to={`/cities/${featuredCity.id}`}
                    className="group relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#0f1117] min-h-[220px]"
                  >
                    <ImageOrPlaceholder
                      src={featuredCity.imageUrl}
                      alt={featuredCity.name}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <div className="text-[10px] uppercase tracking-[0.24em] text-cyan-100/80">
                        {featuredCity.countryName || 'City hub'}
                      </div>
                      <h3 className="mt-2 text-2xl font-semibold text-white">{featuredCity.name}</h3>
                    </div>
                  </Link>
                )}

                <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,_rgba(255,255,255,0.96)_0%,_rgba(255,255,255,0.82)_100%)] p-5 dark:border-white/[0.08] dark:bg-[linear-gradient(180deg,_rgba(255,255,255,0.05)_0%,_rgba(255,255,255,0.02)_100%)]">
                  <div className="text-[11px] uppercase tracking-[0.26em] text-slate-400 dark:text-white/34">Why it feels easier</div>
                  <p className="mt-4 text-lg leading-8 text-slate-800 dark:text-white/82">
                    You can ease into planning instead of building everything from scratch.
                  </p>
                  <div className="mt-5 space-y-2 text-sm leading-7 text-slate-600 dark:text-white/46">
                    <p>Browse first.</p>
                    <p>Save what looks good.</p>
                    <p>Then shape it into your own route.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-[270px] animate-pulse rounded-3xl border border-white/[0.06] bg-white/[0.03]" />
            ))}
          </section>
        ) : error ? (
          <section className="rounded-[30px] border border-red-400/20 bg-red-500/10 px-6 py-6">
            <div className="text-[11px] uppercase tracking-[0.24em] text-red-200/82">Explore unavailable</div>
            <h2 className="mt-3 text-2xl font-semibold text-white">The travel catalog did not load cleanly.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-red-50/88">
              {error} Try again in a moment, or open the map directly if you already know where you want to plan.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to="/map"
                className="rounded-full border border-white/16 bg-white/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-white transition-all hover:border-white/26 hover:bg-white/14"
              >
                Open map instead
              </Link>
            </div>
          </section>
        ) : (
          <>
            {continents.length > 0 && (
              <section id="continents-layer" className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
                <div className="glass-surface rounded-[32px] p-6">
                  <div className="text-[11px] uppercase tracking-[0.3em] text-teal-700 dark:text-cyan-100/70">Browse by continent</div>
                  <h2 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">Start from the biggest frame.</h2>
                  <p className="mt-4 text-sm leading-8 text-slate-600 dark:text-white/50">
                    This works better when you are still picking the destination itself, not just the route inside it.
                  </p>

                  <div className="mt-6 space-y-2">
                    {continents.map((continent) => (
                      <button
                        key={continent.id}
                        type="button"
                        onClick={() => setSelectedContinentId(continent.id)}
                        className={`flex w-full items-center justify-between rounded-[22px] border px-4 py-3 text-left transition-all ${
                          selectedContinentId === continent.id
                            ? 'border-teal-500/20 bg-teal-50 text-teal-700 dark:border-cyan-300/28 dark:bg-cyan-300/12 dark:text-cyan-100'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/72 dark:hover:border-white/18 dark:hover:text-white'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span className="text-xl">{continent.emoji || '•'}</span>
                          <span>
                            <span className="block text-sm font-medium">{continent.name}</span>
                            <span className="block text-[11px] opacity-70">{continent.countriesCount || 0} countries</span>
                          </span>
                        </span>
                        <span className="text-[11px] uppercase tracking-[0.18em] opacity-70">{continent.routesCount || 0} routes</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.3em] text-teal-700 dark:text-cyan-100/70">
                        {selectedContinent?.name || 'Continent'} guide
                      </div>
                      <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
                        Countries worth opening next.
                      </h2>
                    </div>
                    {selectedContinent && (
                      <Link to={`/continents/${selectedContinent.id}`} className="app-button app-button-secondary">
                        Open continent
                      </Link>
                    )}
                  </div>

                  {continentHeroCountry ? (
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                      <Link
                        to={`/countries/${continentHeroCountry.id}`}
                        className="group relative overflow-hidden rounded-[32px] border border-slate-200 bg-white/90 p-0 transition-all hover:-translate-y-0.5 hover:border-slate-300 dark:border-white/[0.08] dark:bg-[#0f1117]/88 dark:hover:border-white/16"
                      >
                        <div className="absolute inset-0">
                          <ImageOrPlaceholder
                            src={continentHeroCountry.imageUrl}
                            alt={continentHeroCountry.name}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                          />
                        </div>
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(0,0,0,0.12)_0%,_rgba(0,0,0,0.2)_30%,_rgba(0,0,0,0.84)_100%)]" />
                        <div className="relative flex min-h-[340px] flex-col justify-end p-6">
                          <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/78">
                            {continentHeroCountry.flagEmoji || selectedContinent?.emoji || 'Country'}
                          </div>
                          <h3 className="mt-3 text-4xl font-semibold text-white">{continentHeroCountry.name}</h3>
                          <p className="mt-4 max-w-xl text-sm leading-8 text-white/56">
                            {continentHeroCountry.description || 'Use the country page as the next layer: city hubs, route ideas, and a stronger sense of scale.'}
                          </p>
                          <div className="mt-5 flex flex-wrap gap-2 text-xs text-white/72">
                            <span className="rounded-full border border-white/[0.1] bg-white/[0.06] px-3 py-1.5">
                              {continentHeroCountry.routesCount || 0} routes
                            </span>
                            <span className="rounded-full border border-white/[0.1] bg-white/[0.06] px-3 py-1.5">
                              {continentHeroCountry.citiesCount || 0} cities
                            </span>
                            <span className="rounded-full border border-white/[0.1] bg-white/[0.06] px-3 py-1.5">
                              {continentHeroCountry.poiCount || 0} places
                            </span>
                          </div>
                        </div>
                      </Link>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {continentCountryRail.map((country) => (
                          <Link
                            key={country.id}
                            to={`/countries/${country.id}`}
                            className="group rounded-[26px] border border-slate-200 bg-white/88 p-4 transition-all hover:-translate-y-0.5 hover:border-slate-300 dark:border-white/[0.08] dark:bg-[#0f1117]/86 dark:hover:border-white/16"
                          >
                            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400 dark:text-white/34">
                              {country.flagEmoji || selectedContinent?.emoji || 'Country'}
                            </div>
                            <h3 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{country.name}</h3>
                            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-white/50">
                              {country.routesCount || 0} routes · {country.citiesCount || 0} cities
                            </p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="app-empty-state px-6 py-12 text-center text-sm">
                      No countries loaded for this continent yet.
                    </div>
                  )}
                </div>
              </section>
            )}

            <section className="grid gap-4 xl:grid-cols-3">
              {entryPaths.map((path) => (
              <Link
                key={path.label}
                to={path.to}
                className="group relative overflow-hidden rounded-[30px] border border-slate-200 bg-white/88 p-6 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)] dark:border-white/[0.08] dark:bg-[#0f1117]/88 dark:hover:border-white/16"
              >
                  <div className={`absolute inset-0 bg-gradient-to-br ${path.accent} opacity-90`} />
                  <div className="relative flex h-full flex-col justify-between gap-6">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.28em] text-slate-400 dark:text-white/34">{path.label}</div>
                      <h2 className="mt-4 text-[28px] font-semibold leading-tight text-slate-900 dark:text-white">{path.title}</h2>
                      <p className="mt-4 text-sm leading-8 text-slate-600 dark:text-white/52">{path.copy}</p>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-white/38">{path.meta}</span>
                      <span className="text-sm font-medium text-slate-800 transition-transform duration-300 group-hover:translate-x-1 dark:text-white/78">
                        Open
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </section>

            <section id="countries-layer" className="grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_360px]">
              <div className="space-y-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.3em] text-teal-700 dark:text-cyan-100/70">Start with a country</div>
                  <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">Places that can hold entire route ecosystems.</h2>
                </div>

                {featuredCountry && (
                  <Link
                    to={`/countries/${featuredCountry.id}`}
                    className="group grid overflow-hidden rounded-[32px] border border-white/[0.08] bg-[#0f1117] md:grid-cols-[1.1fr_0.9fr]"
                  >
                    <div className="relative min-h-[320px] overflow-hidden">
                      <ImageOrPlaceholder
                        src={featuredCountry.imageUrl}
                        alt={featuredCountry.name}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
                    </div>
                    <div className="flex flex-col justify-between p-6">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/78">
                          {featuredCountry.flagEmoji || 'Country'}
                        </div>
                        <h3 className="mt-3 text-3xl font-semibold text-white">{featuredCountry.name}</h3>
                        <p className="mt-4 text-sm leading-8 text-white/50">
                          {featuredCountry.description ||
                            'Use the country page as the outer frame: city hubs, multi-city routes, and regional discoveries all meet there.'}
                        </p>
                      </div>

                      <div className="mt-6 grid grid-cols-3 gap-3">
                        <div className="rounded-[22px] border border-white/[0.08] bg-black/18 px-3 py-3">
                          <div className="text-[10px] uppercase tracking-[0.22em] text-white/25">Cities</div>
                          <div className="mt-2 text-xl font-semibold text-white">{featuredCountry.citiesCount || 0}</div>
                        </div>
                        <div className="rounded-[22px] border border-white/[0.08] bg-black/18 px-3 py-3">
                          <div className="text-[10px] uppercase tracking-[0.22em] text-white/25">Routes</div>
                          <div className="mt-2 text-xl font-semibold text-white">{featuredCountry.routesCount || 0}</div>
                        </div>
                        <div className="rounded-[22px] border border-white/[0.08] bg-black/18 px-3 py-3">
                          <div className="text-[10px] uppercase tracking-[0.22em] text-white/25">POI</div>
                          <div className="mt-2 text-xl font-semibold text-white">{featuredCountry.poiCount || 0}</div>
                        </div>
                      </div>
                    </div>
                  </Link>
                )}
              </div>

              <div className="space-y-3">
                {countryRail.map((country) => (
                  <Link
                    key={country.id}
                    to={`/countries/${country.id}`}
                    className="group grid grid-cols-[92px_minmax(0,1fr)] items-center gap-4 rounded-[26px] border border-stone-200 bg-white/85 p-3 transition-all hover:border-stone-300 hover:bg-white dark:border-white/[0.08] dark:bg-[#0f1117]/86 dark:hover:border-white/16 dark:hover:bg-[#11151d]"
                  >
                    <div className="relative h-[92px] overflow-hidden rounded-[20px]">
                      <ImageOrPlaceholder
                        src={country.imageUrl}
                        alt={country.name}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-[0.24em] text-stone-400 dark:text-white/34">
                        {country.flagEmoji || 'Country'}
                      </div>
                      <h3 className="mt-1 truncate text-xl font-semibold text-stone-900 dark:text-white">{country.name}</h3>
                      <p className="mt-2 text-xs text-stone-400 dark:text-white/46">
                        {country.routesCount || 0} routes · {country.citiesCount || 0} cities
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
              <div className="glass-surface rounded-[32px] p-6">
                <div className="text-[11px] uppercase tracking-[0.3em] text-teal-700 dark:text-cyan-100/70">How to use planner</div>
                <h2 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">A calmer way into the product.</h2>
                <div className="mt-6 space-y-4">
                  {[
                    {
                      step: '01',
                      title: 'Read the place first',
                      copy: 'Open a country or city hub to understand the shape of the destination before you start plotting stops.',
                    },
                    {
                      step: '02',
                      title: 'Borrow what is already good',
                      copy: 'Use public routes as starting points, then fork them into your own version when the skeleton is close.',
                    },
                    {
                      step: '03',
                      title: 'Add the hidden layer',
                      copy: 'The magic comes from mixing well-known landmarks with spots that only make sense to you or to locals.',
                    },
                  ].map((item) => (
                    <div key={item.step} className="rounded-[24px] border border-stone-200/70 bg-amber-50/60 p-4 dark:border-white/[0.08] dark:bg-black/18">
                      <div className="text-[10px] uppercase tracking-[0.28em] text-teal-600 dark:text-cyan-100/70">{item.step}</div>
                      <h3 className="mt-3 text-lg font-semibold text-stone-900 dark:text-white">{item.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-stone-500 dark:text-white/50">{item.copy}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {foundationCards.map((item) => (
                  <div
                    key={item.label}
                    className="flex min-h-[240px] flex-col rounded-[30px] border border-stone-200 bg-white/85 p-5 dark:border-white/[0.08] dark:bg-[#0f1117]/86"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-[10px] uppercase tracking-[0.24em] text-stone-400 dark:text-white/30">{item.label}</div>
                      <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-stone-400 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/42">
                        {item.kicker}
                      </span>
                    </div>
                    <div className="flex-1" />
                    <div className="flex items-end gap-3">
                      <div className="text-5xl font-semibold leading-none text-stone-900 dark:text-white">{item.value}</div>
                      <div className="pb-1 text-[11px] uppercase tracking-[0.2em] text-teal-600 dark:text-cyan-100/60">live now</div>
                    </div>
                    <p className="mt-5 text-sm leading-7 text-stone-500 dark:text-white/50">{item.copy}</p>
                  </div>
                ))}
              </div>
            </section>

            {routeHighlights.length > 0 && (
              <section className="space-y-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.3em] text-teal-700 dark:text-cyan-100/70">Trip shapes</div>
                  <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">Different ways to use the same product.</h2>
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                  {routeHighlights.map((item) => (
                    <Link
                      key={item.type}
                      to={`/route/${item.route!.id}`}
                      className="group rounded-[30px] border border-stone-200 bg-white/85 p-5 transition-all hover:-translate-y-0.5 hover:border-stone-300 dark:border-white/[0.08] dark:bg-[#0f1117]/88 dark:hover:border-white/16"
                    >
                      <div className="text-[10px] uppercase tracking-[0.24em] text-teal-600 dark:text-cyan-100/72">{item.label}</div>
                      <h3 className="mt-4 text-2xl font-semibold text-stone-900 dark:text-white">{item.route!.name}</h3>
                      <p className="mt-3 text-sm leading-7 text-stone-500 dark:text-white/50">{item.copy}</p>

                      <div className="mt-6 flex flex-wrap gap-2 text-xs text-stone-500 dark:text-white/56">
                        <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 dark:border-white/[0.08] dark:bg-white/[0.03]">
                          {item.route!.stops?.length ?? item.route!.totalPoints ?? 0} stops
                        </span>
                        <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 dark:border-white/[0.08] dark:bg-white/[0.03]">
                          {item.route!.locationSummary || item.route!.primaryCityName || item.route!.primaryCountryName || 'Custom'}
                        </span>
                        <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 dark:border-white/[0.08] dark:bg-white/[0.03]">
                          {item.route!.likeCounts ?? 0} likes
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <section id="cities-layer" className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
              <div className="glass-surface rounded-[32px] p-6">
                <div className="text-[11px] uppercase tracking-[0.3em] text-teal-700 dark:text-cyan-100/70">City hubs</div>
                <h2 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">Cities should feel like little editorial worlds.</h2>
                <p className="mt-4 text-sm leading-8 text-slate-600 dark:text-white/50">
                  Each city page can be more than a list of routes. It can hold atmosphere, official landmarks, local
                  favorites, and the hidden places that make a route feel personal.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {featuredCity && (
                  <Link
                    to={`/cities/${featuredCity.id}`}
                    className="group relative overflow-hidden rounded-[30px] border border-white/[0.08] bg-[#0f1117] md:row-span-2"
                  >
                    <div className="absolute inset-0">
                      <ImageOrPlaceholder
                        src={featuredCity.imageUrl}
                        alt={featuredCity.name}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      />
                    </div>
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(0,0,0,0.08)_0%,_rgba(0,0,0,0.18)_26%,_rgba(0,0,0,0.88)_100%)]" />
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <div className="text-[10px] uppercase tracking-[0.24em] text-cyan-100/82">
                        {featuredCity.countryName || 'City guide'}
                      </div>
                      <h3 className="mt-2 text-3xl font-semibold text-white">{featuredCity.name}</h3>
                      <p className="mt-3 text-sm leading-7 text-white/52">
                        A city hub should show the shape of a place before the user even opens a route.
                      </p>
                    </div>
                  </Link>
                )}

                {cityGrid.map((city) => (
                  <Link
                    key={city.id}
                    to={`/cities/${city.id}`}
                    className="group overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#0f1117] transition-all hover:-translate-y-0.5 hover:border-white/16"
                  >
                    <div className="relative aspect-[16/11] overflow-hidden">
                      <ImageOrPlaceholder
                        src={city.imageUrl}
                        alt={city.name}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/12 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-4">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-100/78">
                          {city.countryName || 'City hub'}
                        </div>
                        <h3 className="mt-2 text-2xl font-semibold text-white">{city.name}</h3>
                        <p className="mt-1 text-xs text-white/48">{city.routesCount || 0} routes</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {featuredRoute && (
              <section id="routes-layer" className="grid gap-6 rounded-[34px] border border-white/[0.08] bg-[#0f1117]/88 p-5 lg:grid-cols-[minmax(0,1.3fr)_380px] lg:p-6">
                <div className="overflow-hidden rounded-[28px] border border-white/[0.08]">
                  <RouteCard route={featuredRoute} currentUser={currentUser} onLoginRequest={onLoginRequest} />
                </div>

                <div className="flex flex-col justify-between rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,_rgba(255,255,255,0.04)_0%,_rgba(255,255,255,0.01)_100%)] p-6">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/78">Featured route</div>
                    <h2 className="mt-4 text-3xl font-semibold text-white">{featuredRoute.name}</h2>
                    <p className="mt-4 text-sm leading-8 text-white/52">
                      {featuredRoute.description ||
                        'A public route worth opening, studying on the map, and adapting into your own version.'}
                    </p>
                  </div>

                  <div className="mt-6 grid grid-cols-3 gap-3">
                    <div className="rounded-[22px] border border-white/[0.08] bg-black/20 px-3 py-3">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-white/25">Stops</div>
                      <div className="mt-2 text-lg font-semibold text-white">
                        {featuredRoute.stops?.length ?? featuredRoute.totalPoints ?? 0}
                      </div>
                    </div>
                    <div className="rounded-[22px] border border-white/[0.08] bg-black/20 px-3 py-3">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-white/25">Likes</div>
                      <div className="mt-2 text-lg font-semibold text-white">{featuredRoute.likeCounts ?? 0}</div>
                    </div>
                    <div className="rounded-[22px] border border-white/[0.08] bg-black/20 px-3 py-3">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-white/25">Where</div>
                      <div className="mt-2 truncate text-sm font-semibold text-white">
                        {featuredRoute.locationSummary ||
                          featuredRoute.primaryCityName ||
                          featuredRoute.primaryCountryName ||
                          'Custom route'}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {routeGrid.length > 0 && (
              <section id={featuredRoute ? undefined : 'routes-layer'} className="space-y-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.3em] text-teal-700 dark:text-cyan-100/70">Public route picks</div>
                  <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">Routes that already feel like a trip taking shape.</h2>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {routeGrid.map((route) => (
                    <RouteCard key={route.id} route={route} currentUser={currentUser} onLoginRequest={onLoginRequest} />
                  ))}
                </div>

                {hasMore && (
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => void loadMore()}
                      disabled={loadingMore}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition-all hover:border-slate-300 hover:shadow-sm disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/72 dark:hover:border-white/16"
                    >
                      {loadingMore ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-teal-600 dark:border-white/20 dark:border-t-cyan-400" />
                          Loading...
                        </>
                      ) : (
                        'Load more routes'
                      )}
                    </button>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
