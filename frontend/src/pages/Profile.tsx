import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import AppConfirmDialog, { type AppConfirmState } from '../components/AppConfirmDialog'
import AppNotice, { type AppNoticeState } from '../components/AppNotice'
import type { User } from '../components/AuthModal'
import RouteCard from '../components/RouteCard'
import type { RouteCollectionDTO } from '../types/collection'
import type { InvitationDTO } from '../types/collaboration'
import type { UserAchievementDTO, UserStatsDTO } from '../types/gamification'
import type { RouteResponseDTO } from '../types/route'

const rarityStyles: Record<string, string> = {
  COMMON: 'border-slate-200 bg-white text-slate-700 dark:border-white/[0.08] dark:bg-black/18 dark:text-white',
  RARE: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-300/14 dark:bg-amber-300/10 dark:text-amber-100',
  EPIC: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800 dark:border-fuchsia-300/18 dark:bg-fuchsia-300/10 dark:text-fuchsia-100',
  LEGENDARY: 'border-orange-200 bg-[linear-gradient(135deg,#fff7ed_0%,#ffedd5_100%)] text-orange-900 dark:border-orange-300/18 dark:bg-[linear-gradient(135deg,rgba(251,146,60,0.16)_0%,rgba(244,114,182,0.14)_100%)] dark:text-orange-50',
}

const PROFILE_NEXT_STEPS = [
  'Keep one route public so the profile feels alive from the outside too.',
  'Bundle good routes into collections once a theme starts to appear.',
  'Treat achievements as signals, not goals. The useful part is the travel rhythm behind them.',
]

export default function Profile({ user }: { user: User | null }) {
  const [myRoutes, setMyRoutes] = useState<RouteResponseDTO[]>([])
  const [collections, setCollections] = useState<RouteCollectionDTO[]>([])
  const [invitations, setInvitations] = useState<InvitationDTO[]>([])
  const [achievements, setAchievements] = useState<UserAchievementDTO[]>([])
  const [stats, setStats] = useState<UserStatsDTO | null>(null)
  const [toastAchievement, setToastAchievement] = useState<UserAchievementDTO | null>(null)
  const [notice, setNotice] = useState<AppNoticeState | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<AppConfirmState | null>(null)
  const [loading, setLoading] = useState(true)
  const [publicMap, setPublicMap] = useState<Record<number, boolean>>({})
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set())
  const inFlightRef = useRef<Set<number>>(new Set())
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) return
    Promise.all([
      api.get('/routes/my'),
      api.get('/collections/my'),
      api.get(`/users/${user.id}/stats`),
      api.get(`/users/${user.id}/achievements`),
      api.get('/users/me/invitations'),
    ])
      .then(([routesResponse, collectionsResponse, statsResponse, achievementsResponse, invitationsResponse]) => {
        const loadedRoutes = routesResponse.data || []
        const loadedAchievements = achievementsResponse.data || []

        setMyRoutes(loadedRoutes)
        setCollections(collectionsResponse.data || [])
        setStats(statsResponse.data)
        setAchievements(loadedAchievements)
        setInvitations(invitationsResponse.data || [])

        const map: Record<number, boolean> = {}
        loadedRoutes.forEach((route: RouteResponseDTO) => {
          map[route.id] = route.public ?? false
        })
        setPublicMap(map)

        const key = `seen_achievements_${user.id}`
        const seenIds = new Set<number>(JSON.parse(localStorage.getItem(key) || '[]'))
        const newest = loadedAchievements.find((achievement: UserAchievementDTO) => !seenIds.has(achievement.id))
        if (newest) {
          setToastAchievement(newest)
          localStorage.setItem(key, JSON.stringify(loadedAchievements.map((achievement: UserAchievementDTO) => achievement.id)))
          window.setTimeout(() => setToastAchievement(null), 3600)
        }
      })
      .finally(() => setLoading(false))
  }, [user])

  const levelProgress = useMemo(() => {
    if (!stats) return 0
    if (stats.nextLevelPoints <= 0) return 100
    const currentBandStart = stats.level > 1 ? Math.floor(stats.nextLevelPoints - 100 * stats.level) : 0
    const currentProgress = Math.max(0, stats.totalPoints - currentBandStart)
    const totalBand = Math.max(1, stats.nextLevelPoints - currentBandStart)
    return Math.min(100, (currentProgress / totalBand) * 100)
  }, [stats])

  const topBadges = achievements.slice(0, 3)

  const showNotice = (message: string, variant: AppNoticeState['variant'] = 'success') => {
    setNotice({ message, variant })
    window.setTimeout(() => setNotice(null), variant === 'error' ? 3600 : 2400)
  }

  const handleDelete = async (id: number) => {
    setConfirmDialog({
      title: 'Remove this route?',
      description: 'The route will disappear from your profile list. You can only bring it back if you create or remix it again.',
      confirmLabel: 'Remove route',
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/routes/${id}`)
          setMyRoutes((prev) => prev.filter((route) => route.id !== id))
          showNotice('Route removed from profile')
        } catch {
          showNotice('This route could not be removed right now.', 'error')
        }
      },
    })
  }

  const handleTogglePublic = async (routeId: number) => {
    if (inFlightRef.current.has(routeId)) return
    inFlightRef.current.add(routeId)

    const newStatus = !publicMap[routeId]
    setPublicMap((prev) => ({ ...prev, [routeId]: newStatus }))
    setTogglingIds((prev) => new Set(prev).add(routeId))

    try {
      await api.patch(`/routes/${routeId}/public?status=${newStatus}`)
    } catch {
      setPublicMap((prev) => ({ ...prev, [routeId]: !newStatus }))
      showNotice('The visibility change did not stick. Please try once more.', 'error')
    } finally {
      inFlightRef.current.delete(routeId)
      setTogglingIds((prev) => {
        const next = new Set(prev)
        next.delete(routeId)
        return next
      })
    }
  }

  const handleDeleteCollection = async (collectionId: number) => {
    setConfirmDialog({
      title: 'Remove this collection?',
      description: 'The collection will disappear from your profile, but the routes themselves will stay safe.',
      confirmLabel: 'Remove collection',
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/collections/${collectionId}`)
          setCollections((prev) => prev.filter((collection) => collection.id !== collectionId))
          showNotice('Collection removed from profile')
        } catch {
          showNotice('This collection could not be removed right now.', 'error')
        }
      },
    })
  }

  const handleInvitationAction = async (invite: InvitationDTO, action: 'accept' | 'decline') => {
    try {
      await api.post(`/invitations/${invite.inviteCode}/${action}`)
      setInvitations((prev) => prev.filter((item) => item.id !== invite.id))
      showNotice(action === 'accept' ? 'Invitation accepted' : 'Invitation declined')
    } catch {
      showNotice(action === 'accept' ? 'This invitation could not be accepted right now.' : 'This invitation could not be declined right now.', 'error')
    }
  }

  if (!user) {
    return (
      <div className="app-shell flex flex-1 items-center justify-center text-sm text-slate-500 dark:text-white/30">
        Sign in to open your profile.
      </div>
    )
  }

  return (
    <div className="app-shell flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        <AppNotice notice={notice} onDismiss={() => setNotice(null)} />

        <section className="glass-surface-strong rounded-[32px] p-6">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="flex h-18 w-18 items-center justify-center rounded-[24px] bg-gradient-to-br from-teal-500 to-sky-400 text-2xl font-semibold text-white shadow-[0_18px_36px_rgba(15,118,110,0.18)]">
                {user.username[0].toUpperCase()}
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.26em] text-teal-700 dark:text-cyan-100/72">Traveler profile</div>
                <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">@{user.username}</h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-cyan-100/64">{stats?.levelTitle || 'Traveler profile'}</p>
                {stats ? <p className="mt-1 text-xs text-slate-500 dark:text-white/36">Level {stats.level} / {stats.totalPoints} points</p> : null}
              </div>
            </div>

            <div className="min-w-[280px] flex-1 rounded-[24px] border border-slate-200 bg-white p-5 dark:border-white/[0.08] dark:bg-black/18">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Level progress</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                    {stats?.nextLevelPoints ? `${stats.nextLevelPoints - stats.totalPoints} points to next level` : 'Top level reached'}
                  </div>
                </div>
                {topBadges.length > 0 ? (
                  <div className="flex gap-2">
                    {topBadges.map((badge) => (
                      <div key={badge.id} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-lg dark:border-white/[0.08] dark:bg-white/[0.04]">
                        {badge.icon}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
                <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-sky-400" style={{ width: `${levelProgress}%` }} />
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { value: stats?.totalPoints ?? 0, label: 'Points' },
              { value: stats?.routesCreated ?? myRoutes.length, label: 'Routes' },
              { value: stats?.countriesVisited ?? 0, label: 'Countries' },
              { value: stats?.citiesVisited ?? 0, label: 'Cities' },
              { value: invitations.length, label: 'Invites' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-[22px] border border-slate-200 bg-white p-4 text-center dark:border-white/[0.08] dark:bg-black/18">
                <div className="text-2xl font-semibold text-slate-900 dark:text-white">{stat.value}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/28">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-3">
            {PROFILE_NEXT_STEPS.map((step, index) => (
              <div key={step} className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-black/18">
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Profile note {index + 1}</div>
                <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/48">{step}</p>
              </div>
            ))}
          </div>
        </section>

        {toastAchievement ? (
          <div className="fixed bottom-6 right-6 z-50 w-[min(380px,calc(100%-32px))]">
            <div className="rounded-[28px] border border-teal-500/18 bg-[linear-gradient(135deg,#ffffff_0%,#f0fdfa_100%)] px-5 py-5 text-slate-800 shadow-[0_26px_60px_rgba(15,23,42,0.16)] dark:border-cyan-300/20 dark:bg-[linear-gradient(135deg,rgba(34,211,238,0.18)_0%,rgba(15,17,23,0.96)_100%)] dark:text-cyan-50">
              <div className="text-xs uppercase tracking-[0.24em] text-teal-700 dark:text-cyan-100/72">Achievement unlocked</div>
              <div className="mt-3 flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-white text-3xl shadow-sm dark:bg-white/10">
                  {toastAchievement.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-semibold">{toastAchievement.name}</div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-cyan-50/72">{toastAchievement.description}</p>
                  <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-teal-700 dark:text-cyan-100/66">
                    {toastAchievement.points} points / {toastAchievement.rarity}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {invitations.length > 0 ? (
          <section className="glass-surface rounded-[30px] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.3em] text-teal-700 dark:text-cyan-100/72">Pending invitations</div>
                <p className="mt-2 text-sm text-slate-600 dark:text-white/42">Routes shared with you by other planners.</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {invitations.map((invite) => (
                <div key={invite.id} className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 dark:border-white/[0.08] dark:bg-black/18">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{invite.routeName}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-white/42">
                        invited by @{invite.invitedByUsername} / {invite.role.toLowerCase()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => void handleInvitationAction(invite, 'accept')} className="rounded-full border border-teal-500/16 bg-teal-600 px-4 py-2 text-xs font-medium text-white dark:border-cyan-300/22 dark:bg-cyan-300/10 dark:text-cyan-100">Accept</button>
                      <button onClick={() => void handleInvitationAction(invite, 'decline')} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/64">Decline</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="glass-surface rounded-[30px] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.3em] text-teal-700 dark:text-cyan-100/72">Achievements</div>
              <p className="mt-2 text-sm text-slate-600 dark:text-white/42">Badges now reflect routes, discovery, collaboration, and consistency.</p>
            </div>
            <button onClick={() => navigate('/leaderboard')} className="rounded-full border border-teal-500/16 bg-teal-600 px-4 py-2 text-xs font-medium text-white dark:border-cyan-300/22 dark:bg-cyan-300/10 dark:text-cyan-100">Open leaderboard</button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {achievements.length > 0 ? achievements.map((achievement) => (
              <div key={achievement.id} className={`rounded-[22px] border p-4 ${rarityStyles[achievement.rarity] || rarityStyles.COMMON}`}>
                <div className="text-3xl">{achievement.icon}</div>
                <h3 className="mt-3 text-sm font-semibold">{achievement.name}</h3>
                <p className="mt-2 text-xs leading-6 opacity-80">{achievement.description}</p>
                <div className="mt-3 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.18em] opacity-75">
                  <span>{achievement.rarity}</span>
                  <span>{achievement.points} pts</span>
                </div>
              </div>
            )) : (
              <div className="rounded-[22px] border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/[0.12] dark:text-white/28 sm:col-span-2 lg:col-span-4">
                No achievements unlocked yet. As you plan, remix, and finish trips, this layer will start to tell the story of how you travel.
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-white/34">My routes</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-white/42">Your private drafts, public routes, and remix-ready ideas.</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="glass-surface flex animate-pulse items-center gap-4 rounded-[24px] p-4">
                  <div className="h-12 w-12 flex-shrink-0 rounded-[16px] bg-slate-200 dark:bg-white/[0.07]" />
                  <div className="flex-grow space-y-2">
                    <div className="h-4 w-40 rounded bg-slate-200 dark:bg-white/[0.07]" />
                    <div className="h-3 w-28 rounded bg-slate-100 dark:bg-white/[0.04]" />
                  </div>
                  <div className="h-6 w-16 rounded-full bg-slate-100 dark:bg-white/[0.04]" />
                </div>
              ))}
            </div>
          ) : myRoutes.length > 0 ? (
            <div className="space-y-3">
              {myRoutes.map((route) => {
                const isPublic = publicMap[route.id] ?? false
                const isToggling = togglingIds.has(route.id)
                return (
                  <div key={route.id} className="glass-surface flex items-center gap-4 rounded-[24px] p-4">
                    <div className="flex h-12 w-12 flex-shrink-0 cursor-pointer items-center justify-center rounded-[16px] bg-gradient-to-br from-sky-100 to-teal-100 text-lg font-semibold text-slate-700 dark:from-[#1a1f35] dark:to-[#0f172a] dark:text-white/30" onClick={() => navigate(`/route/${route.id}`)}>
                      {route.name[0]}
                    </div>
                    <div className="min-w-0 flex-grow cursor-pointer" onClick={() => navigate(`/route/${route.id}`)}>
                      <p className="truncate text-sm font-medium text-slate-900 transition-colors hover:text-teal-700 dark:text-white dark:hover:text-cyan-100">{route.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-500 dark:text-white/34">
                        <span>{route.stops?.length || 0} stops</span>
                        <span>/</span>
                        <span>{route.totalDistanceKm ?? 0} km</span>
                        <span>/</span>
                        <span>{route.totalDurationMinutes ?? 0} min</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => void handleTogglePublic(route.id)}
                        disabled={isToggling}
                        className={`rounded-full border px-3 py-1.5 text-[10px] font-medium transition-all ${
                          isPublic
                            ? 'border-emerald-400/24 bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200'
                            : 'border-slate-200 bg-white text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/34'
                        }`}
                      >
                        {isToggling ? '...' : isPublic ? 'Public' : 'Private'}
                      </button>
                      <button onClick={() => void handleDelete(route.id)} className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-red-500/10 hover:text-red-500 dark:text-white/20 dark:hover:text-red-300">x</button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="glass-surface rounded-[24px] p-12 text-center">
              <p className="mb-4 text-sm text-slate-500 dark:text-white/24">No routes yet. Your first route will become the center of the profile and the rest of the workspace.</p>
              <button onClick={() => navigate('/')} className="rounded-full border border-teal-500/16 bg-teal-600 px-5 py-2 text-xs font-medium text-white dark:border-cyan-300/22 dark:bg-cyan-300/10 dark:text-cyan-100">Create your first route</button>
            </div>
          )}
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-white/34">Collections</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-white/42">Saved route bundles you want to come back to later.</p>
          </div>

          {collections.length > 0 ? (
            <div className="space-y-4">
              {collections.map((collection) => (
                <div key={collection.id} className="glass-surface rounded-[28px] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{collection.name}</h3>
                      {collection.description ? <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/46">{collection.description}</p> : null}
                      <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">{collection.routesCount} saved routes</p>
                    </div>
                    <button onClick={() => void handleDeleteCollection(collection.id)} className="rounded-full border border-slate-200 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-slate-500 transition-all hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-500 dark:border-white/[0.08] dark:text-white/35 dark:hover:text-red-300">Delete</button>
                  </div>

                  {collection.routes.length > 0 ? (
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      {collection.routes.slice(0, 4).map((route) => (
                        <RouteCard key={`${collection.id}-${route.id}`} route={route} currentUser={user} />
                      ))}
                    </div>
                  ) : (
                    <div className="mt-5 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-white/[0.12] dark:text-white/25">
                      This collection is still waiting for its first saved route.
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-surface rounded-[24px] p-8 text-center text-sm text-slate-500 dark:text-white/24">
              No collections yet. Save a route from its detail page and this space will start to feel like your travel library.
            </div>
          )}
        </section>
      </div>

      <AppConfirmDialog dialog={confirmDialog} onClose={() => setConfirmDialog(null)} />
    </div>
  )
}
