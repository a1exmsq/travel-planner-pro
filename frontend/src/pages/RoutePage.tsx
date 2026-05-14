import { useEffect, useEffectEvent, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/axios'
import AppConfirmDialog, { type AppConfirmState } from '../components/AppConfirmDialog'
import AppNotice, { type AppNoticeState } from '../components/AppNotice'
import type { User } from '../components/AuthModal'
import CollectionPicker from '../components/CollectionPicker'
import MapPreview from '../components/MapPreview'
import RouteComments from '../components/RouteComments'
import RouteWorkspaceNav from '../components/RouteWorkspaceNav'
import type { CollaboratorDTO, UserSearchResultDTO } from '../types/collaboration'
import type { JournalEntryDTO } from '../types/journal'
import type { RouteResponseDTO } from '../types/route'
import type { WeatherOverviewDTO } from '../types/weather'
import { formatVibeTag } from '../utils/routeMeta'

const ROUTE_TYPE_LABELS: Record<RouteResponseDTO['routeType'], string> = {
  CITY: 'City',
  REGION: 'Region',
  MULTI_CITY: 'Multi-city',
  ROAD_TRIP: 'Road trip',
  CUSTOM: 'Custom',
}

const ROLE_COPY: Record<string, string> = {
  OWNER: 'Full control',
  EDITOR: 'Can edit route details',
  VIEWER: 'Can follow along',
}

const fmtMinutes = (minutes?: number) => {
  if (!minutes || minutes <= 0) return 'Flexible'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h ? `${h}h ${m}m` : `${m} min`
}

const money = (route: RouteResponseDTO) => (
  route.totalBudget != null ? `${route.budgetSpent ?? 0} / ${route.totalBudget} ${route.currency || 'USD'}` : 'Not set yet'
)

const truncateCopy = (value: string | undefined, maxLength = 160) => {
  if (!value) return null
  const normalized = value.trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength).trimEnd()}...`
}

export default function RoutePage({
  currentUser,
  onLoginRequest,
}: {
  currentUser: User | null
  onLoginRequest: () => void
}) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [route, setRoute] = useState<RouteResponseDTO | null>(null)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [collectionsOpen, setCollectionsOpen] = useState(false)
  const [collaborators, setCollaborators] = useState<CollaboratorDTO[]>([])
  const [showInvite, setShowInvite] = useState(false)
  const [inviteQuery, setInviteQuery] = useState('')
  const [inviteRole, setInviteRole] = useState<'EDITOR' | 'VIEWER'>('EDITOR')
  const [results, setResults] = useState<UserSearchResultDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<AppNoticeState | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<AppConfirmState | null>(null)
  const [weather, setWeather] = useState<WeatherOverviewDTO | null>(null)
  const [highlights, setHighlights] = useState<JournalEntryDTO[]>([])

  const loadRoute = useEffectEvent(async () => {
    if (!id) return
    const [routeRes, likeRes, collabRes, weatherRes, highlightsRes] = await Promise.all([
      api.get(`/routes/${id}`),
      currentUser ? api.get(`/routes/${id}/like`) : Promise.resolve({ data: { liked: false } }),
      currentUser ? api.get(`/routes/${id}/collaborators`) : Promise.resolve({ data: [] }),
      api.get(`/routes/${id}/weather`).catch(() => ({ data: null })),
      api.get(`/routes/${id}/journal/highlights`).catch(() => ({ data: [] })),
    ])
    setRoute(routeRes.data)
    setLikeCount(routeRes.data.likeCounts ?? 0)
    setLiked(Boolean(likeRes.data?.liked))
    setCollaborators(collabRes.data || [])
    setWeather(weatherRes.data)
    setHighlights(highlightsRes.data || [])
  })

  useEffect(() => {
    if (!id) return
    void loadRoute()
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))
  }, [id, currentUser, navigate])

  useEffect(() => {
    if (!showInvite || inviteQuery.trim().length < 2) {
      window.setTimeout(() => setResults([]), 0)
      return
    }
    const timer = window.setTimeout(() => {
      api.get(`/users/search?username=${encodeURIComponent(inviteQuery.trim())}`)
        .then((res) => setResults(res.data || []))
        .catch(() => setResults([]))
    }, 250)
    return () => window.clearTimeout(timer)
  }, [showInvite, inviteQuery])

  const showNotice = (message: string, variant: AppNoticeState['variant'] = 'success') => {
    setNotice({ message, variant })
    window.setTimeout(() => {
      setNotice((current) => (current?.message === message ? null : current))
    }, 2600)
  }

  const handleLike = async () => {
    if (!currentUser) return onLoginRequest()
    if (!route) return
    if (liked) {
      await api.delete(`/routes/${route.id}/like`)
      setLiked(false)
      setLikeCount((prev) => Math.max(0, prev - 1))
      showNotice('Removed from likes')
      return
    }
    await api.post(`/routes/${route.id}/like`)
    setLiked(true)
    setLikeCount((prev) => prev + 1)
    showNotice('Added to likes')
  }

  const handleCopy = async () => {
    if (!currentUser) return onLoginRequest()
    if (!route) return
    try {
      await api.post(`/routes/${route.id}/copy`)
      showNotice('Route remixed into your profile')
    } catch (error: unknown) {
      const responseMessage = typeof error === 'object' && error !== null && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined
      showNotice(responseMessage || 'We could not remix this route right now.', 'error')
    }
  }

  const handleInvite = async (username: string) => {
    if (!id) return
    try {
      await api.post(`/routes/${id}/invite`, { username, role: inviteRole })
      const response = await api.get(`/routes/${id}/collaborators`)
      setCollaborators(response.data || [])
      setShowInvite(false)
      setInviteQuery('')
      setResults([])
      showNotice(`Invitation sent to @${username}`)
    } catch {
      showNotice('We could not send this invitation right now.', 'error')
    }
  }

  const handleRemoveCollaborator = async (userId: number) => {
    if (!id) return
    const collaborator = collaborators.find((item) => item.userId === userId)
    setConfirmDialog({
      title: 'Remove collaborator?',
      description: collaborator
        ? `@${collaborator.username} will lose access to this route and its shared planning spaces.`
        : 'This person will lose access to the route and its shared planning spaces.',
      confirmLabel: 'Remove access',
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/routes/${id}/collaborators/${userId}`)
          setCollaborators((prev) => prev.filter((item) => item.userId !== userId))
          showNotice('Collaborator removed')
        } catch {
          showNotice('We could not remove this collaborator right now.', 'error')
        }
      },
    })
  }

  if (loading) {
    return (
      <div className="app-shell flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="h-8 w-24 animate-pulse rounded-full bg-slate-200 dark:bg-white/[0.06]" />
          <div className="animate-pulse overflow-hidden rounded-[34px] border border-slate-200 bg-white dark:border-white/[0.06] dark:bg-white/[0.02]">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
              <div className="min-h-[360px] bg-slate-100 dark:bg-white/[0.04]" />
              <div className="space-y-4 p-6">
                <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-white/[0.06]" />
                <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-white/[0.06]" />
                <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-white/[0.06]" />
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-20 rounded-[18px] bg-slate-100 dark:bg-white/[0.04]" />
                  ))}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-12 rounded-[18px] bg-slate-100 dark:bg-white/[0.04]" />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-[28px] border border-slate-200 bg-white dark:border-white/[0.06] dark:bg-white/[0.02]" />
            ))}
          </div>
        </div>
      </div>
    )
  }
  if (!route) return null

  const isOwner = route.accessRole === 'OWNER'
  const canEdit = Boolean(route.canEdit && currentUser)
  const canManageCollaborators = Boolean(route.canManageCollaborators && currentUser)
  const heroImage = route.mainImageUrl || route.primaryCityImageUrl || route.primaryCountryImageUrl
  const hiddenStopCount = (route.stops || []).filter((stop) => stop.isGlobal === false || !stop.id).length
  const landmarkStopCount = Math.max(0, (route.stops?.length || 0) - hiddenStopCount)
  const routeLocationLabel = route.locationSummary || route.primaryCityName || route.primaryCountryName || 'Discovery route'
  const routeModeCopy = hiddenStopCount > landmarkStopCount
    ? 'This route leans into the hidden layer first, then uses landmarks as orientation.'
    : 'This route starts from strong anchors, then softens the day with more personal stops.'
  const routeWindowLabel = route.startDate && route.endDate
    ? `${route.startDate} to ${route.endDate}`
    : route.numberOfDays
      ? `${route.numberOfDays} day route`
      : 'Flexible timing'
  const routeNextStep = canEdit
    ? 'Tighten pacing, then move into itinerary and budget once the stop order feels right.'
    : isOwner
      ? 'Keep refining the flow or share it once the route feels stable.'
      : 'Open itinerary, budget, or journal once you know whether you want to follow, remix, or adapt it.'

  return (
    <div className="app-shell flex-1 overflow-y-auto">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 print:hidden">
          <button onClick={() => navigate(-1)} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600 transition-all hover:border-slate-300 hover:text-slate-900 dark:border-white/12 dark:bg-black/26 dark:text-white/76">
            Back
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600 transition-all hover:border-slate-300 hover:text-slate-900 dark:border-white/12 dark:bg-black/26 dark:text-white/76"
            title="Save as PDF or print this route"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Export PDF
          </button>
        </div>

        <RouteWorkspaceNav routeId={id!} />
        <AppNotice notice={notice} onDismiss={() => setNotice(null)} />

        <section className="glass-surface-strong overflow-hidden rounded-[34px]">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
            <div className="relative min-h-[360px] overflow-hidden">
              {heroImage ? (
                <img
                  src={heroImage}
                  alt={route.name}
                  className="h-full w-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
              ) : null}
              <div className="h-full w-full bg-[linear-gradient(135deg,#bae6fd_0%,#e0f2fe_42%,#fde68a_100%)] dark:bg-[linear-gradient(135deg,#12213b_0%,#0f172a_52%,#115e59_100%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(0,0,0,0.02)_0%,_rgba(15,23,42,0.66)_100%)] dark:bg-[linear-gradient(180deg,_rgba(0,0,0,0.1)_0%,_rgba(0,0,0,0.86)_100%)]" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/40 bg-white/80 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-700 dark:border-white/12 dark:bg-black/26 dark:text-cyan-100/82">{ROUTE_TYPE_LABELS[route.routeType || 'CUSTOM']}</span>
                  <span className="rounded-full border border-white/16 bg-black/18 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/78">
                    {routeLocationLabel}
                  </span>
                  {(route.vibeTags || []).slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded-full border border-teal-500/16 bg-teal-50 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-teal-700 dark:border-cyan-300/18 dark:bg-cyan-300/10 dark:text-cyan-100/82">
                      {formatVibeTag(tag)}
                    </span>
                  ))}
                </div>
                <h1 className="mt-4 text-4xl font-serif text-white sm:text-6xl">{route.name}</h1>
                <p className="mt-3 max-w-2xl text-sm leading-8 text-white/82 dark:text-white/54">{route.description || 'A route shaped from landmarks, pacing, and hidden places.'}</p>
              </div>
            </div>

            <div className="p-6">
              <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 dark:border-white/[0.08] dark:bg-black/18">
                <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400 dark:text-white/24">Route briefing</div>
                <div className="mt-2 text-base font-semibold text-slate-900 dark:text-white">{routeLocationLabel}</div>
                <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/50">
                  {truncateCopy(route.description) || routeModeCopy}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/58">
                    {routeWindowLabel}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/58">
                    {hiddenStopCount} hidden / {landmarkStopCount} landmark
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 dark:border-white/[0.08] dark:bg-black/18"><div className="text-[10px] uppercase tracking-[0.22em] text-slate-400 dark:text-white/24">Stops</div><div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{route.stops?.length || 0}</div></div>
                <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 dark:border-white/[0.08] dark:bg-black/18"><div className="text-[10px] uppercase tracking-[0.22em] text-slate-400 dark:text-white/24">Likes</div><div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{likeCount}</div></div>
                <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 dark:border-white/[0.08] dark:bg-black/18"><div className="text-[10px] uppercase tracking-[0.22em] text-slate-400 dark:text-white/24">Distance</div><div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{route.totalDistanceKm ?? 0} km</div></div>
                <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 dark:border-white/[0.08] dark:bg-black/18"><div className="text-[10px] uppercase tracking-[0.22em] text-slate-400 dark:text-white/24">Duration</div><div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{fmtMinutes(route.totalDurationMinutes)}</div></div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 dark:border-white/[0.08] dark:bg-black/18"><div className="text-[10px] uppercase tracking-[0.22em] text-slate-400 dark:text-white/24">Packing</div><div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{route.packedItemCount ?? 0}/{route.packingItemCount ?? 0}</div></div>
                <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 dark:border-white/[0.08] dark:bg-black/18"><div className="text-[10px] uppercase tracking-[0.22em] text-slate-400 dark:text-white/24">Journal</div><div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{route.journalEntryCount ?? 0}</div></div>
              </div>

              <div className="mt-4 rounded-[22px] border border-slate-200 bg-white px-4 py-4 dark:border-white/[0.08] dark:bg-black/18">
                <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400 dark:text-white/24">Trip window</div>
                <div className="mt-2 text-sm text-slate-700 dark:text-white/70">{route.startDate && route.endDate ? `${route.startDate} to ${route.endDate}` : 'Dates not set yet'}</div>
                <div className="mt-2 text-xs text-teal-700 dark:text-cyan-100/58">{route.numberOfDays ? `${route.numberOfDays} days` : route.isOptimized ? 'Optimized route' : 'Manual stop order'}</div>
              </div>

              <div className="mt-4 rounded-[22px] border border-slate-200 bg-white px-4 py-4 dark:border-white/[0.08] dark:bg-black/18">
                <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400 dark:text-white/24">Budget</div>
                <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{money(route)}</div>
              </div>

              <div className="mt-4 rounded-[22px] border border-teal-500/14 bg-teal-50 px-4 py-4 dark:border-cyan-300/16 dark:bg-cyan-300/10">
                <div className="text-[10px] uppercase tracking-[0.22em] text-teal-700 dark:text-cyan-100/72">Best next step</div>
                <p className="mt-2 text-sm leading-7 text-teal-800 dark:text-cyan-50/88">{routeNextStep}</p>
              </div>

              <div className="mt-6 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <button onClick={handleLike} className={`w-full rounded-[22px] border py-3 text-sm font-medium transition-all ${liked ? 'border-red-500/24 bg-red-50 text-red-700 dark:bg-red-500/14 dark:text-red-200' : 'border-slate-200 bg-white text-slate-700 hover:border-red-300 hover:text-red-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/70 dark:hover:border-red-400/20 dark:hover:text-red-300'}`}>{liked ? 'Liked route' : 'Like route'}</button>
                  <button onClick={() => currentUser ? setCollectionsOpen(true) : onLoginRequest()} className="w-full rounded-[22px] border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/72 dark:hover:border-white/16 dark:hover:bg-white/[0.06]">Save to collection</button>
                  {!isOwner ? <button onClick={handleCopy} className="w-full rounded-[22px] border border-teal-500/16 bg-teal-600 py-3 text-sm font-medium text-white transition-all hover:bg-teal-500 dark:border-cyan-300/18 dark:bg-cyan-300/10 dark:text-cyan-100 dark:hover:border-cyan-200/30 dark:hover:bg-cyan-300/14">Remix this route</button> : null}
                  {canEdit ? <button onClick={() => navigate(`/route/${id}/edit`)} className="w-full rounded-[22px] border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/72 dark:hover:border-white/16 dark:hover:bg-white/[0.06]">Edit route</button> : null}
                  <button onClick={() => navigate(`/route/${id}/itinerary`)} className="w-full rounded-[22px] border border-teal-500/16 bg-teal-600 py-3 text-sm font-medium text-white transition-all hover:bg-teal-500 dark:border-cyan-300/18 dark:bg-cyan-300/10 dark:text-cyan-100 dark:hover:border-cyan-200/30 dark:hover:bg-cyan-300/14">Open itinerary</button>
                  <button onClick={() => navigate(`/route/${id}/budget`)} className="w-full rounded-[22px] border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/72 dark:hover:border-white/16 dark:hover:bg-white/[0.06]">Budget tracker</button>
                  <button onClick={() => navigate(`/route/${id}/packing`)} className="w-full rounded-[22px] border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/72 dark:hover:border-white/16 dark:hover:bg-white/[0.06]">Packing checklist</button>
                  <button onClick={() => navigate(`/route/${id}/journal`)} className="w-full rounded-[22px] border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/72 dark:hover:border-white/16 dark:hover:bg-white/[0.06]">Travel journal</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="space-y-6">
            <section className="glass-surface rounded-[28px] p-5">
              <div className="text-[11px] uppercase tracking-[0.3em] text-teal-700 dark:text-cyan-100/72">Route timeline</div>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/46">
                {landmarkStopCount} landmark stop{landmarkStopCount === 1 ? '' : 's'} and {hiddenStopCount} hidden stop{hiddenStopCount === 1 ? '' : 's'} currently shape this route.
              </p>
              <div className="mt-4 space-y-3">
                {(route.stops || []).map((stop, index) => (
                  <article key={stop.routePoiId} className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-black/16">
                    <div className="flex items-start gap-4">
                      <div className={`mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${stop.isGlobal === false ? 'bg-violet-500' : 'bg-teal-600 dark:bg-cyan-500 dark:text-[#06202a]'}`}>{index + 1}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                          {(stop.mainImageUrl || stop.imageUrl) ? (
                            <div className="h-24 w-full overflow-hidden rounded-[18px] bg-slate-100 sm:h-20 sm:w-28 dark:bg-[#0b1220]">
                              <img
                                src={stop.mainImageUrl || stop.imageUrl}
                                alt={stop.name}
                                className="h-full w-full object-cover"
                                onError={(e) => { e.currentTarget.parentElement!.style.display = 'none' }}
                              />
                            </div>
                          ) : null}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{stop.name}</h3>
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:border-white/[0.08] dark:bg-black/18 dark:text-white/42">{stop.isGlobal === false ? 'Hidden place' : stop.category}</span>
                              {stop.featured ? <span className="rounded-full border border-teal-500/14 bg-teal-50 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-teal-700 dark:border-cyan-300/16 dark:bg-cyan-300/10 dark:text-cyan-100">Curated</span> : null}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-white/42">
                              {stop.travelTimeMinutes > 0 ? <span>{stop.travelTimeMinutes} min planned</span> : null}
                              {stop.cityName ? <span>{stop.cityName}</span> : null}
                              {stop.countryName ? <span>{stop.countryName}</span> : null}
                              {typeof stop.distanceFromPrevious === 'number' && index > 0 ? <span>{stop.distanceFromPrevious} km from previous</span> : null}
                              {typeof stop.durationFromPrevious === 'number' && index > 0 ? <span>{stop.durationFromPrevious} min between stops</span> : null}
                            </div>
                            {stop.description ? <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-white/50">{stop.description}</p> : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {currentUser ? (
              <section className="glass-surface rounded-[28px] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.3em] text-teal-700 dark:text-cyan-100/72">Collaborators</div>
                    <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/46">Invite one person to help edit, or keep someone in the loop as a viewer.</p>
                  </div>
                  {canManageCollaborators ? <button onClick={() => setShowInvite((value) => !value)} className="rounded-full border border-teal-500/16 bg-teal-600 px-4 py-2 text-xs font-medium text-white dark:border-cyan-300/20 dark:bg-cyan-300/10 dark:text-cyan-100">{showInvite ? 'Close' : 'Invite friend'}</button> : null}
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {[
                    { role: 'OWNER', copy: ROLE_COPY.OWNER },
                    { role: 'EDITOR', copy: ROLE_COPY.EDITOR },
                    { role: 'VIEWER', copy: ROLE_COPY.VIEWER },
                  ].map((item) => (
                    <div key={item.role} className="rounded-[18px] border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-black/18">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-teal-700 dark:text-cyan-100/70">{item.role}</div>
                      <div className="mt-2 text-sm text-slate-600 dark:text-white/52">{item.copy}</div>
                    </div>
                  ))}
                </div>

                {showInvite ? (
                  <div className="mt-4 rounded-[22px] border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-black/18">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px]">
                      <input value={inviteQuery} onChange={(e) => setInviteQuery(e.target.value)} placeholder="Search username" className="w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white" />
                      <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'EDITOR' | 'VIEWER')} className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white">
                        <option value="EDITOR" style={{ background: '#ffffff' }}>Editor</option>
                        <option value="VIEWER" style={{ background: '#ffffff' }}>Viewer</option>
                      </select>
                    </div>

                    <div className="mt-3 text-xs text-slate-500 dark:text-white/44">
                      {inviteRole === 'EDITOR' ? 'Editors can update the route, itinerary, and budget.' : 'Viewers can open the route but cannot change it.'}
                    </div>

                    <div className="mt-4 space-y-2">
                      {results.length > 0 ? results.map((result) => (
                        <button key={result.id} onClick={() => void handleInvite(result.username)} className="flex w-full items-center justify-between rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 transition-all hover:border-teal-500/20 hover:bg-teal-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/78 dark:hover:border-cyan-300/20 dark:hover:bg-cyan-300/10">
                          <span>@{result.username}</span>
                          <span className="text-xs text-teal-700 dark:text-cyan-100/66">Invite as {inviteRole.toLowerCase()}</span>
                        </button>
                      )) : (
                        <div className="rounded-[18px] border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 dark:border-white/[0.12] dark:text-white/30">
                          Start typing a username to find someone.
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 space-y-2">
                  {collaborators.length > 0 ? collaborators.map((item) => (
                    <div key={item.userId} className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-slate-200 bg-white px-4 py-3 dark:border-white/[0.08] dark:bg-black/18">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">@{item.username}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-white/42">{item.owner ? 'Owner' : item.role.toLowerCase()} / {item.status.toLowerCase()}</p>
                      </div>
                      {canManageCollaborators && !item.owner ? <button onClick={() => void handleRemoveCollaborator(item.userId)} className="rounded-full border border-red-500/14 bg-red-50 px-3 py-1.5 text-[11px] text-red-600 dark:bg-red-500/8 dark:text-red-200/70">Remove</button> : null}
                    </div>
                  )) : (
                    <div className="rounded-[18px] border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 dark:border-white/[0.12] dark:text-white/30">
                      No collaborators yet.
                    </div>
                  )}
                </div>
              </section>
            ) : null}

            <section className="glass-surface rounded-[28px] p-5">
              <div className="text-[11px] uppercase tracking-[0.3em] text-teal-700 dark:text-cyan-100/72">Discussion</div>
              <RouteComments routeId={route.id} currentUser={currentUser} routeAuthorUsername={route.author?.username ?? ''} onLoginRequest={onLoginRequest} />
            </section>
          </div>

          <div className="space-y-6">
            <section className="glass-surface rounded-[28px] p-3">
              <div className="mb-4 px-2 pt-2">
                <div className="text-[11px] uppercase tracking-[0.3em] text-teal-700 dark:text-cyan-100/72">Route map</div>
                <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/46">
                  The route line stays focused on pacing and legibility, while hidden places remain visually distinct from landmark anchors.
                </p>
              </div>
              <div className="overflow-hidden rounded-[22px] border border-slate-200 dark:border-white/[0.08]">
                <div className="h-[320px] sm:h-[420px]">
                  <MapPreview
                    stops={route.stops || []}
                    activeRoute={route}
                    allPois={[]}
                  />
                </div>
              </div>
            </section>

            <section className="glass-surface rounded-[28px] p-5">
              <div className="text-[11px] uppercase tracking-[0.3em] text-teal-700 dark:text-cyan-100/72">Route feel</div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(route.vibeTags || []).map((tag) => (
                  <span key={tag} className="rounded-full border border-teal-500/14 bg-teal-50 px-3 py-2 text-xs text-teal-700 dark:border-cyan-300/18 dark:bg-cyan-300/10 dark:text-cyan-100">{formatVibeTag(tag)}</span>
                ))}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-4 dark:border-white/[0.08] dark:bg-black/18"><div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Remixes</div><div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{route.remixCount ?? 0}</div></div>
                <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-4 dark:border-white/[0.08] dark:bg-black/18"><div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">Optimizer</div><div className="mt-2 text-sm text-slate-600 dark:text-white/60">{route.isOptimized ? 'Shortest-path draft applied.' : 'Still on manual stop order.'}</div></div>
              </div>
            </section>

            <section className="glass-surface rounded-[28px] p-5">
              <div className="text-[11px] uppercase tracking-[0.3em] text-teal-700 dark:text-cyan-100/72">Weather window</div>
              {weather ? (
                <>
                  <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-white/50">{weather.summary}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {weather.days.slice(0, 4).map((day) => (
                      <div key={day.date} className="rounded-[18px] border border-slate-200 bg-white px-4 py-4 dark:border-white/[0.08] dark:bg-black/18">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/24">{day.date}</div>
                        <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{day.condition}</div>
                        <div className="mt-2 text-sm text-slate-600 dark:text-white/58">{day.lowTempC}C to {day.highTempC}C</div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-white/42">Rain {day.precipitationChance}% / Wind {day.windKph} kph</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="mt-4 rounded-[18px] border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 dark:border-white/[0.12] dark:text-white/30">
                  Weather is not ready for this route yet.
                </div>
              )}
            </section>

            <section className="glass-surface rounded-[28px] p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] uppercase tracking-[0.3em] text-teal-700 dark:text-cyan-100/72">Memory highlights</div>
                <button onClick={() => navigate(`/route/${id}/journal`)} className="text-xs text-teal-700 dark:text-cyan-100/70">Open journal</button>
              </div>
              <div className="mt-4 space-y-3">
                {highlights.length > 0 ? highlights.map((entry) => (
                  <article key={entry.id} className="rounded-[18px] border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-black/18">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/42">{entry.entryDate}</span>
                      {entry.mood ? <span className="rounded-full border border-teal-500/14 bg-teal-50 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-teal-700 dark:border-cyan-300/16 dark:bg-cyan-300/10 dark:text-cyan-100">{entry.mood}</span> : null}
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">{entry.title}</h3>
                    {entry.highlight ? <p className="mt-2 text-sm text-teal-700 dark:text-cyan-100/82">{entry.highlight}</p> : null}
                    {entry.story ? <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/50">{entry.story}</p> : null}
                  </article>
                )) : (
                  <div className="rounded-[18px] border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 dark:border-white/[0.12] dark:text-white/30">
                    No journal moments saved yet.
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>
      </div>

      <CollectionPicker isOpen={collectionsOpen} onClose={() => setCollectionsOpen(false)} routeId={route.id} currentUser={currentUser} />
      <AppConfirmDialog dialog={confirmDialog} onClose={() => setConfirmDialog(null)} />
    </div>
  )
}
