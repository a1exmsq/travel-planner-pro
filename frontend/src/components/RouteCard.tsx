import { useEffect, useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import type { User } from './AuthModal'
import type { RouteResponseDTO } from '../types/route'
import { formatVibeTag } from '../utils/routeMeta'

interface RouteCardProps {
  route: RouteResponseDTO
  currentUser: User | null
  isSelected?: boolean
  mapSelectMode?: boolean
  onClick?: () => void
  onCopied?: () => void
  onLoginRequest?: () => void
}

const getPlaceholderGradient = (name: string) => {
  const gradients = [
    'linear-gradient(135deg, #bae6fd 0%, #e0f2fe 45%, #fef3c7 100%)',
    'linear-gradient(135deg, #dbeafe 0%, #ecfeff 52%, #fef3c7 100%)',
    'linear-gradient(135deg, #e0f2fe 0%, #f0fdfa 60%, #fde68a 100%)',
    'linear-gradient(135deg, #fef3c7 0%, #fde68a 35%, #bfdbfe 100%)',
  ]
  return gradients[name.charCodeAt(0) % gradients.length]
}

const ROUTE_TYPE_LABELS: Record<RouteResponseDTO['routeType'], string> = {
  CITY: 'City',
  REGION: 'Region',
  MULTI_CITY: 'Multi-city',
  ROAD_TRIP: 'Road trip',
  CUSTOM: 'Custom',
}

const getLikedKey = (userId: number) => `liked_routes_${userId}`

const isLikedLocally = (routeId: number, userId: number) => {
  try {
    const raw = localStorage.getItem(getLikedKey(userId))
    return raw ? (JSON.parse(raw) as number[]).includes(routeId) : false
  } catch {
    return false
  }
}

const saveLikeLocally = (routeId: number, userId: number) => {
  try {
    const raw = localStorage.getItem(getLikedKey(userId))
    const ids: number[] = raw ? JSON.parse(raw) : []
    if (!ids.includes(routeId)) localStorage.setItem(getLikedKey(userId), JSON.stringify([...ids, routeId]))
  } catch {
    return
  }
}

const removeLikeLocally = (routeId: number, userId: number) => {
  try {
    const raw = localStorage.getItem(getLikedKey(userId))
    if (!raw) return
    localStorage.setItem(getLikedKey(userId), JSON.stringify((JSON.parse(raw) as number[]).filter((id) => id !== routeId)))
  } catch {
    return
  }
}

export default function RouteCard({
  route,
  currentUser,
  isSelected,
  mapSelectMode = false,
  onClick,
  onLoginRequest,
}: RouteCardProps) {
  const navigate = useNavigate()
  const [likeCount, setLikeCount] = useState(route.likeCounts ?? 0)
  const [liked, setLiked] = useState(() => (currentUser ? isLikedLocally(route.id, currentUser.id) : false))
  const [likeLoading, setLikeLoading] = useState(false)

  useEffect(() => {
    if (currentUser) setLiked(isLikedLocally(route.id, currentUser.id))
  }, [currentUser, route.id])

  const handleCardClick = (event: MouseEvent) => {
    if (onClick) {
      event.preventDefault()
      onClick()
    } else if (!mapSelectMode) {
      navigate(`/route/${route.id}`)
    }
  }

  const handleLikeToggle = async (event: MouseEvent) => {
    event.stopPropagation()
    if (!currentUser) {
      onLoginRequest?.()
      return
    }
    if (likeLoading) return

    setLikeLoading(true)
    try {
      if (liked) {
        await api.delete(`/routes/${route.id}/like`)
        setLikeCount((prev) => Math.max(0, prev - 1))
        setLiked(false)
        removeLikeLocally(route.id, currentUser.id)
      } else {
        await api.post(`/routes/${route.id}/like`)
        setLikeCount((prev) => prev + 1)
        setLiked(true)
        saveLikeLocally(route.id, currentUser.id)
      }
    } catch {
      return
    } finally {
      setLikeLoading(false)
    }
  }

  const totalMin = route.totalDurationMinutes ?? 0
  const duration = totalMin >= 60 ? `${Math.floor(totalMin / 60)}h ${totalMin % 60}m` : `${totalMin}m`
  const routeTypeLabel = ROUTE_TYPE_LABELS[route.routeType || 'CUSTOM']
  const locationLabel = route.locationSummary || route.primaryCityName || route.primaryCountryName
  const stopCount = route.stops?.length || route.totalPoints || 0
  const highlightTags = route.vibeTags?.slice(0, 2) || []

  return (
    <article
      onClick={handleCardClick}
      className={`group cursor-pointer overflow-hidden rounded-[30px] border transition-all duration-300 ${
        isSelected
          ? 'border-teal-500/30 bg-white ring-2 ring-teal-500/10 dark:border-cyan-300/40 dark:bg-[#0f1117] dark:ring-cyan-300/12'
          : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_20px_45px_rgba(15,23,42,0.08)] dark:border-white/[0.08] dark:bg-[#0f1117] dark:hover:border-white/18 dark:hover:shadow-[0_18px_48px_rgba(0,0,0,0.34)]'
      }`}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {route.mainImageUrl ? (
          <img
            src={route.mainImageUrl}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            alt={route.name}
            onError={(e) => {
              const target = e.currentTarget
              target.style.display = 'none'
              const placeholder = target.nextElementSibling as HTMLElement | null
              if (placeholder) placeholder.style.display = 'flex'
            }}
          />
        ) : null}
        <div
          className="relative h-full w-full items-center justify-center"
          style={{
            background: getPlaceholderGradient(route.name),
            display: route.mainImageUrl ? 'none' : 'flex',
          }}
        >
          <span className="absolute right-5 top-3 select-none text-7xl font-bold text-slate-800/10 dark:text-white/[0.08]">
            {route.name[0]}
          </span>
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-slate-900/5 to-transparent dark:from-black/78 dark:via-black/8 dark:to-transparent" />

        <div className="absolute left-4 right-4 top-4 z-10 flex items-start justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/40 bg-white/80 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-700 backdrop-blur-md dark:border-white/12 dark:bg-black/26 dark:text-white/80">
              {routeTypeLabel}
            </span>
            {locationLabel && (
              <span className="rounded-full border border-teal-500/14 bg-teal-50/92 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-teal-700 backdrop-blur-md dark:border-cyan-300/16 dark:bg-cyan-300/10 dark:text-cyan-100/82">
                {locationLabel}
              </span>
            )}
          </div>

          <button
            onClick={handleLikeToggle}
            disabled={likeLoading}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur-md transition-all ${
              liked
                ? 'bg-rose-500 text-white'
                : 'bg-white/80 text-slate-700 hover:bg-rose-500 hover:text-white dark:bg-black/38 dark:text-white/68 dark:hover:bg-rose-500/82'
            }`}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {likeCount}
          </button>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-5">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-white/82 dark:text-white/55">
            <span>{stopCount} stops</span>
            {totalMin > 0 && <span>{duration}</span>}
          </div>

          <h3 className="mt-3 text-[25px] font-semibold leading-[1.05] text-white">{route.name}</h3>
        </div>
      </div>

      <div className="space-y-4 p-5">
        {highlightTags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {highlightTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-teal-500/12 bg-teal-50 px-3 py-1.5 text-[11px] text-teal-700 dark:border-cyan-300/16 dark:bg-cyan-300/10 dark:text-cyan-100/82"
              >
                {formatVibeTag(tag)}
              </span>
            ))}
          </div>
        ) : null}

        <p className="line-clamp-3 text-sm leading-7 text-slate-600 dark:text-white/56">
          {route.description || locationLabel || 'Open the route to inspect the map, stops, and comments.'}
        </p>

        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-white/28">Author</div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="text-sm text-slate-700 dark:text-white/78">@{route.author?.username || 'traveler'}</p>
              {route.author?.level ? (
                <span className="rounded-full border border-teal-500/14 bg-teal-50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-teal-700 dark:border-cyan-300/18 dark:bg-cyan-300/10 dark:text-cyan-100">
                  L{route.author.level}
                </span>
              ) : null}
            </div>
            {route.author?.levelTitle ? (
              <p className="mt-1 text-[11px] text-slate-500 dark:text-cyan-100/56">{route.author.levelTitle}</p>
            ) : null}
            {(route.forkedFromRouteName || route.remixCount) && (
              <p className="mt-2 text-[11px] text-slate-500 dark:text-white/40">
                {route.forkedFromRouteName
                  ? `Remix of ${route.forkedFromRouteName}`
                  : `${route.remixCount || 0} remixes`}
              </p>
            )}
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/42">
            Open route
          </div>
        </div>
      </div>
    </article>
  )
}
