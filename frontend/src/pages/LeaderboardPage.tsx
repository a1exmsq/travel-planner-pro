import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import type { User } from '../components/AuthModal'
import type { UserStatsDTO } from '../types/gamification'

export default function LeaderboardPage({ currentUser }: { currentUser: User | null }) {
  const navigate = useNavigate()
  const [entries, setEntries] = useState<UserStatsDTO[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/leaderboard?limit=100')
      .then((response) => setEntries(response.data || []))
      .finally(() => setLoading(false))
  }, [])

  const myIndex = currentUser ? entries.findIndex((entry) => entry.userId === currentUser.id) : -1
  const topThree = entries.slice(0, 3)
  const restEntries = entries.slice(3)

  const leaderboardStats = useMemo(() => {
    const totalPoints = entries.reduce((sum, entry) => sum + (entry.totalPoints || 0), 0)
    const totalRoutes = entries.reduce((sum, entry) => sum + (entry.routesCreated || 0), 0)
    const totalCountries = entries.reduce((sum, entry) => sum + (entry.countriesVisited || 0), 0)

    return [
      { label: 'Travelers', value: entries.length },
      { label: 'Points earned', value: totalPoints },
      { label: 'Routes built', value: totalRoutes },
      { label: 'Countries tracked', value: totalCountries },
    ]
  }, [entries])

  return (
    <div className="app-shell flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <button onClick={() => navigate(-1)} className="app-back-link">
          <span>&lt;</span>
          Back
        </button>

        <section className="app-panel-strong overflow-hidden">
          <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.05fr)_360px]">
            <div>
              <div className="app-kicker">Leaderboard</div>
              <h1 className="mt-3 text-4xl font-semibold text-slate-900 dark:text-white">Top travelers this season.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-8 text-slate-600 dark:text-white/50">
                Levels and points come from achievements, route activity, collaborative planning, and consistency over time.
              </p>

              {myIndex >= 0 ? (
                <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-teal-500/16 bg-teal-50 px-4 py-2 text-sm text-teal-700 dark:border-cyan-300/20 dark:bg-cyan-300/10 dark:text-cyan-100">
                  Your current rank: #{myIndex + 1}
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {leaderboardStats.map((item) => (
                <div key={item.label} className="app-card p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-white/24">{item.label}</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {loading ? (
          <>
            <section className="grid gap-4 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="app-panel animate-pulse p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="h-6 w-12 rounded-full bg-slate-200 dark:bg-white/[0.07]" />
                    <div className="h-5 w-8 rounded-full bg-slate-200 dark:bg-white/[0.07]" />
                  </div>
                  <div className="mt-5 h-7 w-32 rounded-lg bg-slate-200 dark:bg-white/[0.07]" />
                  <div className="mt-2 h-4 w-24 rounded bg-slate-100 dark:bg-white/[0.04]" />
                  <div className="mt-6 grid grid-cols-3 gap-3">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className="app-card px-3 py-3">
                        <div className="mx-auto h-6 w-10 rounded bg-slate-200 dark:bg-white/[0.07]" />
                        <div className="mx-auto mt-1 h-3 w-12 rounded bg-slate-100 dark:bg-white/[0.04]" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>
            <div className="app-panel animate-pulse overflow-hidden">
              <div className="border-b border-slate-200 px-6 py-4 dark:border-white/[0.08]">
                <div className="h-3 w-24 rounded bg-slate-200 dark:bg-white/[0.07]" />
              </div>
              <div className="divide-y divide-slate-200 dark:divide-white/[0.06]">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="grid gap-3 px-6 py-4 md:grid-cols-[72px_minmax(0,1fr)_140px_180px] md:items-center">
                    <div className="h-4 w-8 rounded bg-slate-200 dark:bg-white/[0.07]" />
                    <div className="space-y-1">
                      <div className="h-4 w-28 rounded bg-slate-200 dark:bg-white/[0.07]" />
                      <div className="h-3 w-20 rounded bg-slate-100 dark:bg-white/[0.04]" />
                    </div>
                    <div className="h-4 w-16 rounded bg-slate-100 dark:bg-white/[0.04]" />
                    <div className="h-3 w-32 rounded bg-slate-100 dark:bg-white/[0.04]" />
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : entries.length === 0 ? (
          <div className="app-empty-state px-6 py-12 text-center text-sm">No leaderboard activity yet.</div>
        ) : (
          <>
            <section className="grid gap-4 lg:grid-cols-3">
              {topThree.map((entry, index) => {
                const isCurrentUser = currentUser?.id === entry.userId
                return (
                  <article
                    key={entry.userId}
                    className={`app-panel p-5 ${index === 0 ? 'lg:-translate-y-1' : ''} ${isCurrentUser ? 'ring-2 ring-teal-500/10 dark:ring-cyan-300/14' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full border border-teal-500/14 bg-teal-50 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-teal-700 dark:border-cyan-300/18 dark:bg-cyan-300/10 dark:text-cyan-100">
                        #{index + 1}
                      </span>
                      <span className="app-pill app-pill-accent">L{entry.level}</span>
                    </div>
                    <h2 className="mt-5 text-2xl font-semibold text-slate-900 dark:text-white">@{entry.username}</h2>
                    <p className="mt-2 text-sm text-slate-500 dark:text-white/46">{entry.levelTitle || 'Traveler'}</p>
                    <div className="mt-6 grid grid-cols-3 gap-3">
                      <div className="app-card px-3 py-3 text-center">
                        <div className="text-lg font-semibold text-slate-900 dark:text-white">{entry.totalPoints}</div>
                        <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-400 dark:text-white/28">Points</div>
                      </div>
                      <div className="app-card px-3 py-3 text-center">
                        <div className="text-lg font-semibold text-slate-900 dark:text-white">{entry.routesCreated}</div>
                        <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-400 dark:text-white/28">Routes</div>
                      </div>
                      <div className="app-card px-3 py-3 text-center">
                        <div className="text-lg font-semibold text-slate-900 dark:text-white">{entry.countriesVisited}</div>
                        <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-400 dark:text-white/28">Countries</div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </section>

            <section className="app-panel overflow-hidden">
              <div className="border-b border-slate-200 px-6 py-4 dark:border-white/[0.08]">
                <div className="app-kicker">Full ranking</div>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-white/[0.06]">
                {restEntries.map((entry, index) => {
                  const rank = index + 4
                  const isCurrentUser = currentUser?.id === entry.userId
                  return (
                    <div
                      key={entry.userId}
                      className={`grid gap-3 px-6 py-4 md:grid-cols-[72px_minmax(0,1fr)_140px_180px] md:items-center ${isCurrentUser ? 'bg-teal-50 dark:bg-cyan-300/[0.06]' : ''}`}
                    >
                      <div className="text-sm font-semibold text-slate-700 dark:text-white/74">#{rank}</div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">@{entry.username}</p>
                          <span className="app-pill app-pill-accent">L{entry.level}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500 dark:text-white/42">{entry.levelTitle}</p>
                      </div>
                      <div className="text-sm text-slate-600 dark:text-white/62">{entry.totalPoints} pts</div>
                      <div className="text-xs text-slate-500 dark:text-white/40">
                        {entry.routesCreated} routes · {entry.countriesVisited} countries
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
