import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../api/axios'
import PageSkeleton from '../components/PageSkeleton'
import RouteCard from '../components/RouteCard'
import type { User } from '../components/AuthModal'
import type { CityDTO, CountryDTO } from '../types/location'
import type { RouteResponseDTO } from '../types/route'

interface CountryPageProps {
  currentUser: User | null
  onLoginRequest: () => void
}

const placeholder = 'linear-gradient(135deg, #13263c 0%, #0f172a 52%, #115e59 100%)'
const COUNTRY_ROUTE_SHAPES = [
  {
    type: 'CITY',
    label: 'City routes',
    copy: 'Good for dense city days where landmarks and hidden places stay close together.',
  },
  {
    type: 'REGION',
    label: 'Regional routes',
    copy: 'Useful when the story of the country is spread across a wider local area.',
  },
  {
    type: 'ROAD_TRIP',
    label: 'Road trips',
    copy: 'The right format when movement between places matters as much as the stops themselves.',
  },
] as const

function truncateCopy(value: string | undefined, maxLength = 148) {
  if (!value) return null
  const normalized = value.trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength).trimEnd()}...`
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

export default function CountryPage({ currentUser, onLoginRequest }: CountryPageProps) {
  const { id } = useParams<{ id: string }>()
  const [country, setCountry] = useState<CountryDTO | null>(null)
  const [cities, setCities] = useState<CityDTO[]>([])
  const [routes, setRoutes] = useState<RouteResponseDTO[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    void Promise.all([
      api.get(`/countries/${id}`),
      api.get(`/countries/${id}/cities`),
      api.get(`/countries/${id}/routes`),
    ])
      .then(([countryResponse, citiesResponse, routesResponse]) => {
        setCountry(countryResponse.data)
        setCities(citiesResponse.data)
        setRoutes(routesResponse.data)
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return <PageSkeleton rows={4} hasHero />
  }

  if (!country) return null

  const spotlightCity = cities[0] ?? null
  const cityRail = spotlightCity ? cities.slice(1, 5) : cities.slice(0, 4)
  const featuredRoute = routes[0] ?? null
  const routeGrid = featuredRoute ? routes.slice(1) : routes
  const routeTypeCounts = routes.reduce<Record<string, number>>((acc, route) => {
    const key = route.routeType || 'CUSTOM'
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})
  const routeTypeSummary = [
    { label: 'City routes', value: routeTypeCounts.CITY ?? 0 },
    { label: 'Regional routes', value: routeTypeCounts.REGION ?? 0 },
    { label: 'Road trips', value: routeTypeCounts.ROAD_TRIP ?? 0 },
  ]
  const routeShapeHighlights = COUNTRY_ROUTE_SHAPES.map((shape) => ({
    ...shape,
    route: routes.find((route) => route.routeType === shape.type) ?? null,
  })).filter((item) => item.route)
  const spotlightCityBrief = truncateCopy(spotlightCity?.description)

  return (
    <div className="app-shell flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <section className="glass-surface-strong overflow-hidden rounded-[36px]">
          <div className="grid lg:grid-cols-[1.18fr_0.82fr]">
            <div className="relative min-h-[360px] overflow-hidden">
              <ImageOrPlaceholder src={country.imageUrl} alt={country.name} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(255,255,255,0.02)_0%,_rgba(15,23,42,0.18)_32%,_rgba(15,23,42,0.78)_100%)] dark:bg-[linear-gradient(180deg,_rgba(0,0,0,0.06)_0%,_rgba(0,0,0,0.18)_32%,_rgba(0,0,0,0.84)_100%)]" />
              <div className="absolute inset-x-0 top-0 p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-2 text-sm text-white/58">
                  {country.continentId && country.continentName && (
                    <>
                      <Link to={`/continents/${country.continentId}`} className="transition-colors hover:text-white">
                        {country.continentName}
                      </Link>
                      <span>/</span>
                    </>
                  )}
                  <span>{country.name}</span>
                </div>
              </div>
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-100/82">{country.flagEmoji || 'Country'}</div>
                <h1 className="mt-3 font-serif text-4xl leading-none text-white sm:text-6xl">{country.name}</h1>
                <p className="mt-4 max-w-2xl text-sm leading-8 text-white/54">
                  {country.description ||
                    'Use this page as the outer frame for the entire destination: city hubs, regional routes, and multi-city travel stories all belong here.'}
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-between border-t border-slate-200 bg-[linear-gradient(180deg,_rgba(255,255,255,0.6)_0%,_rgba(255,255,255,0.28)_100%)] p-6 dark:border-white/[0.06] dark:bg-[linear-gradient(180deg,_rgba(255,255,255,0.04)_0%,_rgba(255,255,255,0.01)_100%)] lg:border-l lg:border-t-0">
              <div>
                <div className="text-[11px] uppercase tracking-[0.3em] text-slate-400 dark:text-white/34">Country overview</div>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-[22px] border border-slate-200 bg-white px-3 py-4 dark:border-white/[0.08] dark:bg-black/18">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400 dark:text-white/24">Cities</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{country.citiesCount || cities.length}</div>
                  </div>
                  <div className="rounded-[22px] border border-slate-200 bg-white px-3 py-4 dark:border-white/[0.08] dark:bg-black/18">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400 dark:text-white/24">Routes</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{country.routesCount || routes.length}</div>
                  </div>
                  <div className="rounded-[22px] border border-slate-200 bg-white px-3 py-4 dark:border-white/[0.08] dark:bg-black/18">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400 dark:text-white/24">POI</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{country.poiCount || 0}</div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    to="/"
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-700 transition-all hover:border-slate-300 hover:text-slate-900 dark:border-white/[0.1] dark:bg-black/18 dark:text-white/78 dark:hover:border-white/18 dark:hover:text-white"
                  >
                    Back to explore
                  </Link>
                  {country.continentId && country.continentName && (
                    <Link
                      to={`/continents/${country.continentId}`}
                      className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-700 transition-all hover:border-slate-300 hover:text-slate-900 dark:border-white/[0.1] dark:bg-black/18 dark:text-white/78 dark:hover:border-white/18 dark:hover:text-white"
                    >
                      Back to {country.continentName}
                    </Link>
                  )}
                  {spotlightCity && (
                    <Link
                      to={`/cities/${spotlightCity.id}`}
                      className="inline-flex items-center rounded-full border border-cyan-300/24 bg-cyan-300/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-cyan-100"
                    >
                      Open {spotlightCity.name}
                    </Link>
                  )}
                  <Link
                    to={spotlightCity ? `/map?city=${spotlightCity.id}` : '/map'}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-700 transition-all hover:border-slate-300 hover:text-slate-900 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-white/72 dark:hover:border-white/18 dark:hover:text-white"
                  >
                    Open map
                  </Link>
                </div>
              </div>

              <div className="mt-6 rounded-[26px] border border-slate-200 bg-white p-5 dark:border-white/[0.08] dark:bg-black/18">
                <div className="text-[11px] uppercase tracking-[0.28em] text-teal-700 dark:text-cyan-100/76">Travel shape</div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                  {routeTypeSummary.map((item) => (
                    <div key={item.label} className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400 dark:text-white/24">{item.label}</div>
                      <div className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="app-panel p-6">
            <div className="text-[11px] uppercase tracking-[0.3em] text-teal-700 dark:text-cyan-100/70">How this country works</div>
            <h2 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">Think in layers, not in one big list.</h2>
            <div className="mt-6 space-y-4">
              {[
                {
                  step: '01',
                  title: 'Choose the city that sets the tone',
                  copy: 'Start with the strongest city hub first. It helps the rest of the country feel intentional instead of scattered.',
                },
                {
                  step: '02',
                  title: 'Use routes to connect the shape',
                  copy: 'Good public routes show whether this place wants to be explored slowly, regionally, or as a road trip.',
                },
                {
                  step: '03',
                  title: 'Leave room for the private layer',
                  copy: 'Hidden places are what stop the trip from feeling generic when the popular landmarks are already covered.',
                },
              ].map((item) => (
                <div key={item.step} className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-black/18">
                  <div className="text-[10px] uppercase tracking-[0.28em] text-teal-700 dark:text-cyan-100/70">{item.step}</div>
                  <h3 className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/50">{item.copy}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {spotlightCity && (
                <Link
                  to={`/cities/${spotlightCity.id}`}
                  className="rounded-full border border-cyan-300/24 bg-cyan-300/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-cyan-100 transition-all hover:border-cyan-200/40 hover:bg-cyan-300/14"
                >
                  Start with {spotlightCity.name}
                </Link>
              )}
              <Link
                to={spotlightCity ? `/map?city=${spotlightCity.id}` : '/map'}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-700 transition-all hover:border-slate-300 hover:text-slate-900 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/72 dark:hover:border-white/16 dark:hover:text-white"
              >
                Open map
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                label: 'Best starting city',
                value: spotlightCity?.name || 'None yet',
                copy: 'The clearest entry point when you want the country to feel grounded quickly.',
              },
              {
                label: 'Strongest public route',
                value: featuredRoute?.name || 'No route yet',
                copy: 'A good route can teach the pacing of the place before you build your own.',
              },
              {
                label: 'Use this page for',
                value: 'Cities + routes',
                copy: 'Treat the country as the outer shell that holds city hubs, regional routes, and multi-city movement together.',
              },
            ].map((item) => (
              <div
                key={item.label}
                className="app-panel flex flex-col justify-between p-5"
              >
                <div className="text-[10px] uppercase tracking-[0.24em] text-slate-400 dark:text-white/30">{item.label}</div>
                <div className="mt-6 text-2xl font-semibold leading-tight text-slate-900 dark:text-white">{item.value}</div>
                <p className="mt-6 text-sm leading-7 text-slate-600 dark:text-white/50">{item.copy}</p>
              </div>
            ))}
          </div>
        </section>

        {routeShapeHighlights.length > 0 && (
          <section className="space-y-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.3em] text-teal-700 dark:text-cyan-100/70">Route shapes in {country.name}</div>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">Different ways this country can be explored.</h2>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              {routeShapeHighlights.map((item) => (
                <Link
                  key={item.type}
                  to={`/route/${item.route!.id}`}
                  className="group rounded-[30px] border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-slate-300 dark:border-white/[0.08] dark:bg-[#0f1117]/88 dark:hover:border-white/16"
                >
                  <div className="text-[10px] uppercase tracking-[0.24em] text-teal-700 dark:text-cyan-100/72">{item.label}</div>
                  <h3 className="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">{item.route!.name}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-white/50">{item.copy}</p>

                  <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-600 dark:text-white/56">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-white/[0.08] dark:bg-white/[0.03]">
                      {item.route!.stops?.length ?? item.route!.totalPoints ?? 0} stops
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-white/[0.08] dark:bg-white/[0.03]">
                      {item.route!.locationSummary || item.route!.primaryCityName || country.name}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-white/[0.08] dark:bg-white/[0.03]">
                      {item.route!.likeCounts ?? 0} likes
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.3em] text-teal-700 dark:text-cyan-100/70">City hubs</div>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">Cities that carry the local route layer.</h2>
            </div>

            {spotlightCity && (
              <Link
                to={`/cities/${spotlightCity.id}`}
                className="group grid overflow-hidden rounded-[32px] border border-slate-200 bg-white md:grid-cols-[1fr_0.95fr] dark:border-white/[0.08] dark:bg-[#0f1117]"
              >
                <div className="relative min-h-[300px] overflow-hidden">
                  <ImageOrPlaceholder
                    src={spotlightCity.imageUrl}
                    alt={spotlightCity.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
                </div>
                <div className="flex flex-col justify-between p-6">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.24em] text-teal-700 dark:text-cyan-100/76">{country.name}</div>
                    <h3 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{spotlightCity.name}</h3>
                    <p className="mt-4 text-sm leading-8 text-slate-600 dark:text-white/50">
                      {spotlightCityBrief ||
                        'This is the place where official landmarks, neighborhood discoveries, and user-created hidden spots should come together naturally.'}
                    </p>
                  </div>
                  <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-white/46">
                    <span>{spotlightCity.routesCount || 0} routes</span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-slate-700 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/70">
                      Open city hub
                    </span>
                  </div>
                </div>
              </Link>
            )}
          </div>

          <div className="space-y-3">
            {cityRail.length > 0 ? cityRail.map((city) => (
              <Link
                key={city.id}
                to={`/cities/${city.id}`}
                className="group grid grid-cols-[96px_minmax(0,1fr)] items-center gap-4 rounded-[26px] border border-slate-200 bg-white p-3 transition-all hover:border-slate-300 dark:border-white/[0.08] dark:bg-[#0f1117]/86 dark:hover:border-white/16 dark:hover:bg-[#11151d]"
              >
                <div className="relative h-24 overflow-hidden rounded-[20px]">
                  <ImageOrPlaceholder
                    src={city.imageUrl}
                    alt={city.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-slate-400 dark:text-white/34">{country.name}</div>
                  <h3 className="mt-1 truncate text-xl font-semibold text-slate-900 dark:text-white">{city.name}</h3>
                  <p className="mt-2 text-xs text-slate-500 dark:text-white/46">{city.routesCount || 0} routes / {city.poiCount || 0} places</p>
                </div>
              </Link>
            )) : (
              <div className="app-empty-state rounded-[26px] px-5 py-8 text-sm">
                More city hubs will appear here once this country has a broader discovery layer.
              </div>
            )}
          </div>
        </section>

        {featuredRoute && (
          <section className="glass-surface grid gap-6 rounded-[34px] p-5 lg:grid-cols-[minmax(0,1.3fr)_380px] lg:p-6">
            <div className="overflow-hidden rounded-[28px] border border-slate-200 dark:border-white/[0.08]">
              <RouteCard route={featuredRoute} currentUser={currentUser} onLoginRequest={onLoginRequest} />
            </div>

            <div className="flex flex-col justify-between rounded-[28px] border border-slate-200 bg-white p-6 dark:border-white/[0.08] dark:bg-[linear-gradient(180deg,_rgba(255,255,255,0.04)_0%,_rgba(255,255,255,0.01)_100%)]">
              <div>
                <div className="text-[11px] uppercase tracking-[0.28em] text-teal-700 dark:text-cyan-100/78">Featured route in {country.name}</div>
                <h2 className="mt-4 text-3xl font-semibold text-slate-900 dark:text-white">{featuredRoute.name}</h2>
                <p className="mt-4 text-sm leading-8 text-slate-600 dark:text-white/52">
                  {featuredRoute.description ||
                    'Use a strong public route as the fastest way to understand how this country wants to be explored.'}
                </p>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/[0.08] dark:bg-black/20">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400 dark:text-white/25">Stops</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                    {featuredRoute.stops?.length ?? featuredRoute.totalPoints ?? 0}
                  </div>
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/[0.08] dark:bg-black/20">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400 dark:text-white/25">Type</div>
                  <div className="mt-2 truncate text-sm font-semibold text-slate-900 dark:text-white">{featuredRoute.routeType || 'CUSTOM'}</div>
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/[0.08] dark:bg-black/20">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400 dark:text-white/25">Where</div>
                  <div className="mt-2 truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {featuredRoute.locationSummary || featuredRoute.primaryCityName || country.name}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="space-y-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.3em] text-teal-700 dark:text-cyan-100/70">Routes in {country.name}</div>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">Country-wide route catalog.</h2>
            </div>

          {routes.length === 0 ? (
            <div className="app-empty-state rounded-[30px] px-6 py-12 text-center text-sm">
              No public routes are linked to this country yet. The country page is ready, but the shared route layer still needs to grow.
            </div>
          ) : routeGrid.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {routeGrid.map((route) => (
                <RouteCard key={route.id} route={route} currentUser={currentUser} onLoginRequest={onLoginRequest} />
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
