import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../api/axios'
import type { ContinentDTO, CountryDTO } from '../types/location'

const placeholder = 'linear-gradient(135deg, #12304a 0%, #0f172a 52%, #0f766e 100%)'

function truncateCopy(value: string | undefined, maxLength = 150) {
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

export default function ContinentPage() {
  const { id } = useParams<{ id: string }>()
  const [continent, setContinent] = useState<ContinentDTO | null>(null)
  const [countries, setCountries] = useState<CountryDTO[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    let cancelled = false

    void Promise.all([
      api.get(`/locations/continents/${id}`),
      api.get(`/locations/continents/${id}/countries`),
    ])
      .then(([continentResponse, countriesResponse]) => {
        if (cancelled) return
        setContinent(continentResponse.data)
        setCountries(countriesResponse.data || [])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  const heroCountry = countries[0] ?? null
  const countryGrid = heroCountry ? countries.slice(1, 9) : countries.slice(0, 8)
  const heroCountryBrief = truncateCopy(heroCountry?.description)

  const totals = useMemo(() => {
    const totalCities = countries.reduce((sum, country) => sum + (country.citiesCount || 0), 0)
    const totalPois = countries.reduce((sum, country) => sum + (country.poiCount || 0), 0)

    return {
      countries: continent?.countriesCount || countries.length,
      routes: continent?.routesCount || countries.reduce((sum, country) => sum + (country.routesCount || 0), 0),
      cities: totalCities,
      pois: totalPois,
    }
  }, [continent, countries])

  if (loading) {
    return (
      <div className="app-shell flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="h-[340px] animate-pulse rounded-[34px] border border-slate-200 bg-white dark:border-white/[0.06] dark:bg-white/[0.02]" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-52 animate-pulse rounded-[28px] border border-slate-200 bg-white dark:border-white/[0.06] dark:bg-white/[0.02]" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!continent) {
    return (
      <div className="app-shell flex flex-1 items-center justify-center px-6 text-center text-sm text-slate-500 dark:text-white/30">
        This continent is not available yet.
      </div>
    )
  }

  return (
    <div className="app-shell flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="glass-surface-strong overflow-hidden rounded-[34px]">
          <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.12fr)_380px] lg:p-8">
            <div className="relative overflow-hidden rounded-[30px] border border-white/[0.08] bg-[#0f1117] min-h-[360px]">
              <ImageOrPlaceholder
                src={continent.imageUrl}
                alt={continent.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(0,0,0,0.08)_0%,_rgba(0,0,0,0.18)_26%,_rgba(0,0,0,0.88)_100%)]" />
              <div className="absolute inset-x-0 top-0 p-6">
                <div className="flex flex-wrap gap-2">
                  <Link to="/" className="app-back-link border-white/12 bg-black/20 text-white/74 hover:text-white">
                    Back to explore
                  </Link>
                  <Link
                    to="/map"
                    className="rounded-full border border-white/[0.1] bg-white/[0.06] px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-white/78 transition-all hover:border-white/18 hover:text-white"
                  >
                    Open map
                  </Link>
                </div>
              </div>
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-100/82">
                  {continent.emoji || 'Continent guide'}
                </div>
                <h1 className="mt-3 font-serif text-4xl leading-none text-white sm:text-6xl">{continent.name}</h1>
                <p className="mt-4 max-w-2xl text-sm leading-8 text-white/56">
                  {continent.description ||
                    'Use the continent page as the widest browse layer: compare countries, notice scale, and then move into the destination that feels right.'}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to="/map"
                    className="inline-flex items-center rounded-full border border-cyan-300/26 bg-cyan-300/12 px-5 py-3 text-sm font-medium text-cyan-100 transition-all hover:border-cyan-200/40 hover:bg-cyan-300/16"
                  >
                    Build on map
                  </Link>
                  {heroCountry && (
                    <Link
                      to={`/countries/${heroCountry.id}`}
                      className="inline-flex items-center rounded-full border border-white/[0.1] bg-white/[0.05] px-5 py-3 text-sm font-medium text-white/78 transition-all hover:border-white/18 hover:text-white"
                    >
                      Open {heroCountry.name}
                    </Link>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="glass-surface rounded-[30px] p-6">
                <div className="text-[11px] uppercase tracking-[0.28em] text-teal-700 dark:text-cyan-100/72">
                  Continent overview
                </div>
                <h2 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">
                  A better way to compare destinations.
                </h2>
                <p className="mt-4 text-sm leading-8 text-slate-600 dark:text-white/50">
                  When the trip is still fuzzy, this layer is more useful than jumping straight into one route.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
                {[
                  { label: 'Countries', value: totals.countries },
                  { label: 'Routes', value: totals.routes },
                  { label: 'Cities', value: totals.cities },
                  { label: 'POI', value: totals.pois },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[24px] border border-slate-200 bg-white/88 px-4 py-4 dark:border-white/[0.08] dark:bg-[#0f1117]/86"
                  >
                    <div className="text-[10px] uppercase tracking-[0.24em] text-slate-400 dark:text-white/28">
                      {item.label}
                    </div>
                    <div className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="glass-surface rounded-[30px] p-6">
                <div className="text-[11px] uppercase tracking-[0.28em] text-teal-700 dark:text-cyan-100/72">
                  How to browse
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    'Use the continent page to compare the shape of the trip before you commit to one country.',
                    'Open a country next when you want city hubs, route ideas, and stronger local context.',
                    'Jump into the map only after the destination already feels legible.',
                  ].map((copy) => (
                    <div
                      key={copy}
                      className="rounded-[22px] border border-slate-200 bg-white/72 px-4 py-4 text-sm leading-7 text-slate-600 dark:border-white/[0.08] dark:bg-black/18 dark:text-white/52"
                    >
                      {copy}
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {heroCountry && (
                    <Link
                      to={`/countries/${heroCountry.id}`}
                      className="rounded-full border border-cyan-300/24 bg-cyan-300/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-cyan-100 transition-all hover:border-cyan-200/40 hover:bg-cyan-300/14"
                    >
                      Start with {heroCountry.name}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {heroCountry && (
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_340px]">
            <Link
              to={`/countries/${heroCountry.id}`}
              className="group relative overflow-hidden rounded-[32px] border border-slate-200 bg-white/90 transition-all hover:-translate-y-0.5 hover:border-slate-300 dark:border-white/[0.08] dark:bg-[#0f1117]/88 dark:hover:border-white/16"
            >
              <div className="absolute inset-0">
                <ImageOrPlaceholder
                  src={heroCountry.imageUrl}
                  alt={heroCountry.name}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                />
              </div>
              <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(0,0,0,0.08)_0%,_rgba(0,0,0,0.18)_30%,_rgba(0,0,0,0.84)_100%)]" />
              <div className="relative flex min-h-[340px] flex-col justify-end p-6">
                <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/80">
                  {heroCountry.flagEmoji || continent.emoji || 'Country'}
                </div>
                <h2 className="mt-3 text-4xl font-semibold text-white">{heroCountry.name}</h2>
                <p className="mt-4 max-w-xl text-sm leading-8 text-white/56">
                  {heroCountryBrief ||
                    'A strong next step when you want the continent to narrow into concrete city hubs and route ideas.'}
                </p>
                <div className="mt-5 flex flex-wrap gap-2 text-xs text-white/72">
                  <span className="rounded-full border border-white/[0.1] bg-white/[0.06] px-3 py-1.5">
                    {heroCountry.routesCount || 0} routes
                  </span>
                  <span className="rounded-full border border-white/[0.1] bg-white/[0.06] px-3 py-1.5">
                    {heroCountry.citiesCount || 0} cities
                  </span>
                  <span className="rounded-full border border-white/[0.1] bg-white/[0.06] px-3 py-1.5">
                    {heroCountry.poiCount || 0} places
                  </span>
                </div>
              </div>
            </Link>

            <div className="glass-surface rounded-[32px] p-6">
              <div className="text-[11px] uppercase tracking-[0.3em] text-teal-700 dark:text-cyan-100/70">
                First country to open
              </div>
              <h3 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{heroCountry.name}</h3>
              <p className="mt-4 text-sm leading-8 text-slate-600 dark:text-white/50">
                Use the strongest country page first when you want the browse experience to turn into an actual planning flow.
              </p>

              <div className="mt-6 grid gap-3">
                {[
                  `${heroCountry.routesCount || 0} public routes to inspect`,
                  `${heroCountry.citiesCount || 0} city hubs to compare`,
                  `${heroCountry.poiCount || 0} places already linked`,
                ].map((copy) => (
                  <div
                    key={copy}
                    className="rounded-[22px] border border-slate-200 bg-white/72 px-4 py-4 text-sm text-slate-600 dark:border-white/[0.08] dark:bg-black/18 dark:text-white/52"
                  >
                    {copy}
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  to={`/countries/${heroCountry.id}`}
                  className="rounded-full border border-cyan-300/24 bg-cyan-300/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-cyan-100 transition-all hover:border-cyan-200/40 hover:bg-cyan-300/14"
                >
                  Open country
                </Link>
                <Link
                  to="/map"
                  className="rounded-full border border-slate-200 bg-white/72 px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-700 transition-all hover:border-slate-300 hover:text-slate-900 dark:border-white/[0.08] dark:bg-black/18 dark:text-white/72 dark:hover:border-white/18 dark:hover:text-white"
                >
                  Open map
                </Link>
              </div>
            </div>
          </section>
        )}

        <section className="space-y-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-teal-700 dark:text-cyan-100/70">
              Countries in {continent.name}
            </div>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
              Browse the next layer without losing the bigger picture.
            </h2>
          </div>

          {countries.length === 0 ? (
            <div className="app-empty-state px-6 py-12 text-center text-sm">
              No countries have been connected to this continent yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {(heroCountry ? countryGrid : countries).map((country) => (
                <Link
                  key={country.id}
                  to={`/countries/${country.id}`}
                  className="group overflow-hidden rounded-[30px] border border-slate-200 bg-white/90 transition-all hover:-translate-y-0.5 hover:border-slate-300 dark:border-white/[0.08] dark:bg-[#0f1117]/88 dark:hover:border-white/16"
                >
                  <div className="relative aspect-[16/11] overflow-hidden">
                    <ImageOrPlaceholder
                      src={country.imageUrl}
                      alt={country.name}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/84 via-black/12 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-100/80">
                        {country.flagEmoji || continent.emoji || 'Country'}
                      </div>
                      <h3 className="mt-2 text-2xl font-semibold text-white">{country.name}</h3>
                      <p className="mt-3 text-sm leading-7 text-white/56">
                        {country.routesCount || 0} routes / {country.citiesCount || 0} cities / {country.poiCount || 0} places
                      </p>
                      {country.description && (
                        <p className="mt-2 line-clamp-2 text-xs leading-6 text-white/48">
                          {truncateCopy(country.description, 104)}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
